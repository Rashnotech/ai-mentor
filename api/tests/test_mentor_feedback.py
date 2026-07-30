"""Regression tests for the smart-trigger AI mentor agent.

Covers the three triggers end to end at the unit level:
  1. Quiz score reviewed -> encourage (>=50%) or correct (<50%)
  2. Project started -> one-time guidance (idempotent)
  3. 3-day inactivity -> one check-in per inactivity episode (dedup)

Every Groq call is mocked so these tests are free, fast, and deterministic —
the paid quality check lives in evals/mentor_feedback_eval.py instead.
"""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from domains.ai.services import mentor_feedback_service  # noqa: E402
from domains.ai.jobs.inactivity_checkin_job import InactivityCheckinService  # noqa: E402
from domains.courses.routes.student import _maybe_trigger_quiz_feedback  # noqa: E402
from domains.users.services.activity_service import touch_last_active  # noqa: E402


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class ScalarsListResult:
    def __init__(self, values):
        self.values = values

    def scalars(self):
        return SimpleNamespace(all=lambda: self.values)


class QuizCategoryTests(IsolatedAsyncioTestCase):
    def test_below_fifty_is_correction(self):
        self.assertEqual(mentor_feedback_service.quiz_category(49.9), "quiz_correction")
        self.assertEqual(mentor_feedback_service.quiz_category(0), "quiz_correction")

    def test_fifty_and_above_is_encouragement(self):
        self.assertEqual(mentor_feedback_service.quiz_category(50.0), "quiz_encouragement")
        self.assertEqual(mentor_feedback_service.quiz_category(100.0), "quiz_encouragement")


class GenerateQuizFeedbackTests(IsolatedAsyncioTestCase):
    async def test_falls_back_to_template_when_groq_fails(self):
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), refresh=AsyncMock())
        with patch.object(mentor_feedback_service.groq_client, "generate_text", AsyncMock(return_value=None)):
            feedback = await mentor_feedback_service.generate_quiz_feedback(
                db_session=db,
                user_id="student-1",
                module_id=5,
                module_title="Python Basics",
                score_percent=30.0,
                correct_count=3,
                total_count=10,
            )
        self.assertEqual(feedback.category, "quiz_correction")
        self.assertIn("Python Basics", feedback.message)
        self.assertIn("30", feedback.message)
        db.commit.assert_awaited_once()

    async def test_uses_groq_message_when_available(self):
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), refresh=AsyncMock())
        with patch.object(
            mentor_feedback_service.groq_client, "generate_text", AsyncMock(return_value="Great job, keep going!")
        ):
            feedback = await mentor_feedback_service.generate_quiz_feedback(
                db_session=db,
                user_id="student-1",
                module_id=5,
                module_title="Python Basics",
                score_percent=90.0,
                correct_count=9,
                total_count=10,
            )
        self.assertEqual(feedback.category, "quiz_encouragement")
        self.assertEqual(feedback.message, "Great job, keep going!")

    async def test_persisted_row_captures_score_and_module_context(self):
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), refresh=AsyncMock())
        with patch.object(mentor_feedback_service.groq_client, "generate_text", AsyncMock(return_value="msg")):
            feedback = await mentor_feedback_service.generate_quiz_feedback(
                db_session=db,
                user_id="student-1",
                module_id=5,
                module_title="Python Basics",
                score_percent=60.0,
                correct_count=6,
                total_count=10,
            )
        self.assertEqual(feedback.module_id, 5)
        self.assertEqual(feedback.context_title, "Python Basics")
        self.assertEqual(feedback.score_percent, 60.0)
        db.add.assert_called_once_with(feedback)


class GenerateProjectGuidanceTests(IsolatedAsyncioTestCase):
    async def test_falls_back_to_template_when_groq_fails(self):
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), refresh=AsyncMock())
        with patch.object(mentor_feedback_service.groq_client, "generate_text", AsyncMock(return_value=None)):
            feedback = await mentor_feedback_service.generate_project_guidance(
                db_session=db,
                user_id="student-1",
                project_id=7,
                project_title="Build a CLI Tool",
                project_description="A command line tool.",
                required_skills=["Python", "argparse"],
            )
        self.assertEqual(feedback.category, "project_guidance")
        self.assertIn("Build a CLI Tool", feedback.message)
        self.assertEqual(feedback.project_id, 7)


class GenerateCheckinMessageTests(IsolatedAsyncioTestCase):
    async def test_falls_back_to_template_and_uses_first_name(self):
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), refresh=AsyncMock())
        with patch.object(mentor_feedback_service.groq_client, "generate_text", AsyncMock(return_value=None)):
            feedback = await mentor_feedback_service.generate_checkin_message(
                db_session=db, user_id="student-1", user_name="Ada Lovelace"
            )
        self.assertEqual(feedback.category, "inactivity_checkin")
        self.assertIn("Ada", feedback.message)
        self.assertNotIn("Lovelace", feedback.message)


class DedupHelperTests(IsolatedAsyncioTestCase):
    async def test_has_quiz_feedback_true_when_row_exists(self):
        db = SimpleNamespace(execute=AsyncMock(return_value=ScalarResult(1)))
        self.assertTrue(await mentor_feedback_service.has_quiz_feedback(db, "student-1", 5))

    async def test_has_quiz_feedback_false_when_no_row(self):
        db = SimpleNamespace(execute=AsyncMock(return_value=ScalarResult(None)))
        self.assertFalse(await mentor_feedback_service.has_quiz_feedback(db, "student-1", 5))

    async def test_get_existing_project_guidance_returns_row(self):
        existing = SimpleNamespace(feedback_id=42)
        db = SimpleNamespace(execute=AsyncMock(return_value=ScalarResult(existing)))
        result = await mentor_feedback_service.get_existing_project_guidance(db, "student-1", 7)
        self.assertIs(result, existing)


class QuizCompletionTriggerTests(IsolatedAsyncioTestCase):
    """Tests _maybe_trigger_quiz_feedback: the server-side detection of "quiz just
    completed", which must fire exactly once per module and only once fully answered."""

    async def test_does_not_generate_feedback_when_quiz_not_fully_answered(self):
        questions = [SimpleNamespace(question_id=1, points=10), SimpleNamespace(question_id=2, points=10)]
        responses = [SimpleNamespace(question_id=1, is_correct=True)]  # only 1 of 2 answered
        db = SimpleNamespace(
            execute=AsyncMock(side_effect=[ScalarsListResult(questions), ScalarsListResult(responses)])
        )
        with patch.object(
            mentor_feedback_service, "generate_quiz_feedback", AsyncMock()
        ) as mock_generate:
            await _maybe_trigger_quiz_feedback(db, "student-1", module_id=5)
        mock_generate.assert_not_awaited()

    async def test_does_not_regenerate_feedback_already_given_for_module(self):
        questions = [SimpleNamespace(question_id=1, points=10)]
        responses = [SimpleNamespace(question_id=1, is_correct=True)]
        db = SimpleNamespace(
            execute=AsyncMock(side_effect=[ScalarsListResult(questions), ScalarsListResult(responses)])
        )
        with patch.object(
            mentor_feedback_service, "has_quiz_feedback", AsyncMock(return_value=True)
        ), patch.object(mentor_feedback_service, "generate_quiz_feedback", AsyncMock()) as mock_generate:
            await _maybe_trigger_quiz_feedback(db, "student-1", module_id=5)
        mock_generate.assert_not_awaited()

    async def test_generates_correction_feedback_for_low_score_on_completion(self):
        questions = [
            SimpleNamespace(question_id=1, points=10),
            SimpleNamespace(question_id=2, points=10),
        ]
        responses = [
            SimpleNamespace(question_id=1, is_correct=False),
            SimpleNamespace(question_id=2, is_correct=False),
        ]
        module = SimpleNamespace(title="Python Basics")
        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=[
                    ScalarsListResult(questions),
                    ScalarsListResult(responses),
                    ScalarResult(module),
                ]
            )
        )
        with patch.object(
            mentor_feedback_service, "has_quiz_feedback", AsyncMock(return_value=False)
        ), patch.object(mentor_feedback_service, "generate_quiz_feedback", AsyncMock()) as mock_generate:
            await _maybe_trigger_quiz_feedback(db, "student-1", module_id=5)

        mock_generate.assert_awaited_once()
        _, kwargs = mock_generate.call_args
        self.assertEqual(kwargs["score_percent"], 0.0)
        self.assertEqual(kwargs["correct_count"], 0)
        self.assertEqual(kwargs["total_count"], 2)
        self.assertEqual(kwargs["module_title"], "Python Basics")

    async def test_computes_partial_score_correctly_on_completion(self):
        questions = [
            SimpleNamespace(question_id=1, points=10),
            SimpleNamespace(question_id=2, points=30),
        ]
        responses = [
            SimpleNamespace(question_id=1, is_correct=True),   # earns 10
            SimpleNamespace(question_id=2, is_correct=False),  # earns 0
        ]
        module = SimpleNamespace(title="Loops")
        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=[
                    ScalarsListResult(questions),
                    ScalarsListResult(responses),
                    ScalarResult(module),
                ]
            )
        )
        with patch.object(
            mentor_feedback_service, "has_quiz_feedback", AsyncMock(return_value=False)
        ), patch.object(mentor_feedback_service, "generate_quiz_feedback", AsyncMock()) as mock_generate:
            await _maybe_trigger_quiz_feedback(db, "student-1", module_id=9)

        _, kwargs = mock_generate.call_args
        # 10 out of 40 total points = 25%
        self.assertEqual(kwargs["score_percent"], 25.0)
        self.assertEqual(kwargs["correct_count"], 1)


class InactivityDedupTests(IsolatedAsyncioTestCase):
    async def test_already_notified_true_when_checkin_after_inactivity_start(self):
        db = SimpleNamespace(execute=AsyncMock(return_value=ScalarResult(1)))
        service = InactivityCheckinService(db)
        profile = SimpleNamespace(user_id="student-1", last_active_at=datetime.now(timezone.utc) - timedelta(days=4))
        self.assertTrue(await service._already_notified_for_this_episode(profile))

    async def test_already_notified_false_when_no_prior_checkin(self):
        db = SimpleNamespace(execute=AsyncMock(return_value=ScalarResult(None)))
        service = InactivityCheckinService(db)
        profile = SimpleNamespace(user_id="student-1", last_active_at=datetime.now(timezone.utc) - timedelta(days=4))
        self.assertFalse(await service._already_notified_for_this_episode(profile))

    async def test_send_checkins_skips_already_notified_students(self):
        profile = SimpleNamespace(user_id="student-1", last_active_at=datetime.now(timezone.utc) - timedelta(days=4))
        db = SimpleNamespace(execute=AsyncMock(side_effect=[ScalarsListResult([profile]), ScalarResult(1)]))
        service = InactivityCheckinService(db)
        with patch.object(
            mentor_feedback_service, "generate_checkin_message", AsyncMock()
        ) as mock_generate:
            result = await service.send_checkins()
        mock_generate.assert_not_awaited()
        self.assertEqual(result["skipped_already_notified"], 1)
        self.assertEqual(result["checkins_sent"], 0)


class TouchLastActiveTests(IsolatedAsyncioTestCase):
    async def test_touch_last_active_executes_update_and_commits(self):
        db = SimpleNamespace(execute=AsyncMock(), commit=AsyncMock())
        await touch_last_active(db, "student-1")
        db.execute.assert_awaited_once()
        db.commit.assert_awaited_once()


if __name__ == "__main__":
    import unittest

    unittest.main()
