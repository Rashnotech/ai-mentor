"""Regression tests for survey timing, validation, cooldowns, and persistence."""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from domains.surveys.models import SurveyQuestion  # noqa: E402
from domains.surveys.service import (  # noqa: E402
    DISMISSED_COOLDOWN_DAYS,
    SurveyService,
)


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class LearningSurveyTests(IsolatedAsyncioTestCase):
    def setUp(self):
        self.now = datetime(2026, 7, 2, tzinfo=timezone.utc)
        self.survey = SimpleNamespace(id=1, priority=10)
        self.enrollment = SimpleNamespace(
            enrollment_id=7,
            user_id="student-1",
            course_id=3,
            path_id=4,
            enrolled_at=self.now - timedelta(days=7),
            started_learning_at=None,
        )

    async def test_first_checkin_is_due_after_seven_days(self):
        service = SurveyService(SimpleNamespace())
        service._completed_lesson_count = AsyncMock(return_value=0)
        service._cycle_completed = AsyncMock(return_value=False)

        candidate = await service._learning_candidate(
            "student-1", self.enrollment, self.survey, self.now
        )

        self.assertEqual(candidate.reason, "first_learning_checkin")
        self.assertEqual(candidate.cycle_key, "first:7")

    async def test_monthly_cycle_is_unique_to_enrollment_period(self):
        self.enrollment.enrolled_at = self.now - timedelta(days=65)
        service = SurveyService(SimpleNamespace())
        service._completed_lesson_count = AsyncMock(return_value=10)
        service._cycle_completed = AsyncMock(return_value=True)

        candidate = await service._learning_candidate(
            "student-1", self.enrollment, self.survey, self.now
        )

        self.assertEqual(candidate.reason, "monthly_learning_feedback")
        self.assertEqual(candidate.cycle_key, "monthly:7:2")

    def test_required_choice_answers_are_validated_against_options(self):
        question = SimpleNamespace(
            question_key="course_pace",
            question_text="Is the pace okay?",
            question_type="single_choice",
            options=["Too fast", "Just right", "Too slow"],
            is_required=True,
        )
        service = SurveyService(SimpleNamespace())

        normalized = service._validate_answers([question], {"course_pace": "Just right"})
        self.assertEqual(normalized, {"course_pace": "Just right"})

        with self.assertRaisesRegex(ValueError, "Invalid answer"):
            service._validate_answers([question], {"course_pace": "Anything"})

    def test_unknown_answers_are_rejected(self):
        service = SurveyService(SimpleNamespace())
        with self.assertRaisesRegex(ValueError, "Unknown survey answers"):
            service._validate_answers([], {"made_up_question": "yes"})

    async def test_dismissal_persists_five_day_cooldown(self):
        event = SimpleNamespace(
            status="shown",
            dismissed_at=None,
            skipped_at=None,
            next_eligible_at=None,
        )
        db = SimpleNamespace(commit=AsyncMock(), refresh=AsyncMock())
        service = SurveyService(db)
        service._active_survey = AsyncMock(return_value=self.survey)
        service._latest_open_event = AsyncMock(
            return_value=service.OpenEvent(record=event, enrollment=self.enrollment)
        )

        before = datetime.now(timezone.utc)
        result = await service.dismiss("student-1", 1, "dismissed")

        self.assertEqual(result.status, "dismissed")
        self.assertGreaterEqual(result.next_eligible_at, before + timedelta(days=DISMISSED_COOLDOWN_DAYS))
        db.commit.assert_awaited_once()

    def test_support_request_is_identified_for_admin_follow_up(self):
        service = SurveyService(SimpleNamespace())
        self.assertTrue(service._needs_support({"mentor_support": "Yes"}))
        self.assertTrue(service._needs_support({"currently_stuck": "A little"}))
        self.assertFalse(service._needs_support({"mentor_support": "Not now", "currently_stuck": "No"}))


if __name__ == "__main__":
    import unittest

    unittest.main()
