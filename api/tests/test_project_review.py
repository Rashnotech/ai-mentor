"""Regression tests for mentor project review: approve-only scoring workflow.

Covers the two halves of the mentor "Approve Project" feature:
1. ProgressService.approve_project_submission accepts an optional mentor-entered
   score (0-100) that overrides the auto-calculated deadline points.
2. EnrollmentService.get_student_projects exposes project_title/points_earned/
   deadline_status/reviewed_at so the mentor review UI has real data to show
   and to prefill the score input with.
"""
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from domains.courses.models.progress import DeadlineStatus  # noqa: E402
from domains.courses.services.progress_service import ProgressService  # noqa: E402
from domains.courses.services.enrollment_service import EnrollmentService  # noqa: E402


class ScalarResult:
    """Mimics an SQLAlchemy Result whose query returns a single row/None."""

    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class ScalarsListResult:
    """Mimics an SQLAlchemy Result whose query returns a list of rows."""

    def __init__(self, values):
        self.values = values

    def scalars(self):
        return SimpleNamespace(all=lambda: self.values)


class ApproveProjectSubmissionScoreTests(IsolatedAsyncioTestCase):
    async def test_approve_with_explicit_score_overrides_auto_calculated_points(self):
        submission = SimpleNamespace(
            submission_id=1,
            user_id="student-1",
            module_id=5,
            is_approved=False,
            status="submitted",
            reviewed_at=None,
            reviewer_feedback=None,
            points_earned=50.0,  # auto-calculated second-deadline points from submission time
        )
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), refresh=AsyncMock())
        service = ProgressService(db)
        service._get_project_submission_by_id = AsyncMock(return_value=submission)
        service._update_module_progress = AsyncMock()

        result = await service.approve_project_submission(
            submission_id=1, feedback="Great work", points=92
        )

        self.assertTrue(result.is_approved)
        self.assertEqual(result.status, "approved")
        self.assertEqual(result.points_earned, 92)
        self.assertEqual(result.reviewer_feedback, "Great work")
        self.assertIsNotNone(result.reviewed_at)
        service._update_module_progress.assert_awaited_once_with("student-1", 5)
        db.commit.assert_awaited_once()

    async def test_approve_without_score_keeps_auto_calculated_points(self):
        submission = SimpleNamespace(
            submission_id=2,
            user_id="student-2",
            module_id=6,
            is_approved=False,
            status="submitted",
            reviewed_at=None,
            reviewer_feedback=None,
            points_earned=100.0,
        )
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), refresh=AsyncMock())
        service = ProgressService(db)
        service._get_project_submission_by_id = AsyncMock(return_value=submission)
        service._update_module_progress = AsyncMock()

        result = await service.approve_project_submission(submission_id=2)

        self.assertEqual(result.points_earned, 100.0)
        self.assertTrue(result.is_approved)

    async def test_approve_with_zero_score_is_applied_not_ignored(self):
        # 0 is falsy in Python, so the override must be checked with `is not None`,
        # not truthiness, or a mentor awarding a 0 score would silently keep the
        # auto-calculated points instead.
        submission = SimpleNamespace(
            submission_id=3,
            user_id="student-3",
            module_id=7,
            is_approved=False,
            status="submitted",
            reviewed_at=None,
            reviewer_feedback=None,
            points_earned=100.0,
        )
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), refresh=AsyncMock())
        service = ProgressService(db)
        service._get_project_submission_by_id = AsyncMock(return_value=submission)
        service._update_module_progress = AsyncMock()

        result = await service.approve_project_submission(submission_id=3, points=0)

        self.assertEqual(result.points_earned, 0)

    async def test_approve_raises_when_submission_not_found(self):
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), refresh=AsyncMock())
        service = ProgressService(db)
        service._get_project_submission_by_id = AsyncMock(return_value=None)

        with self.assertRaises(Exception):
            await service.approve_project_submission(submission_id=999, points=80)


class GetStudentProjectsMentorFieldsTests(IsolatedAsyncioTestCase):
    async def test_submission_exposes_score_title_and_deadline_status_for_mentor_review(self):
        profile = SimpleNamespace(current_path_id=7, selected_course_id=None)
        path = SimpleNamespace(path_id=7, course_id=42)
        course = SimpleNamespace(course_id=42, title="Python Bootcamp", slug="python-bootcamp")
        module = SimpleNamespace(module_id=1, title="Intro", path_id=7, order=1)
        project = SimpleNamespace(
            project_id=10,
            module_id=1,
            title="Build a CLI",
            description="desc",
            order=1,
            estimated_hours=5,
            starter_repo_url=None,
            solution_repo_url=None,
            required_skills=None,
        )
        submission = SimpleNamespace(
            submission_id=99,
            project_id=10,
            is_approved=True,
            status="approved",
            solution_url="https://github.com/x",
            submitted_at=datetime(2026, 7, 1, tzinfo=timezone.utc),
            reviewer_feedback="Nice job",
            points_earned=92.0,
            deadline_status=DeadlineStatus.SECOND_DEADLINE,
            reviewed_at=datetime(2026, 7, 2, tzinfo=timezone.utc),
        )

        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=[
                    ScalarResult(profile),  # profile lookup
                    ScalarResult(path),  # path lookup (via current_path_id)
                    ScalarsListResult([module]),  # modules for path
                    ScalarsListResult([project]),  # projects for modules
                    ScalarsListResult([submission]),  # this student's submissions
                    ScalarsListResult([]),  # user progress fallback
                ]
            )
        )
        service = EnrollmentService(db)
        service._get_course = AsyncMock(return_value=course)

        result = await service.get_student_projects("student-1")

        self.assertEqual(result["total_count"], 1)
        entry = result["projects"][0]
        self.assertEqual(entry["project_title"], "Build a CLI")
        self.assertEqual(entry["points_earned"], 92.0)
        self.assertEqual(entry["deadline_status"], "late_50")
        self.assertEqual(entry["reviewed_at"], "2026-07-02T00:00:00+00:00")

    async def test_project_without_submission_has_null_score_fields(self):
        profile = SimpleNamespace(current_path_id=7, selected_course_id=None)
        path = SimpleNamespace(path_id=7, course_id=42)
        course = SimpleNamespace(course_id=42, title="Python Bootcamp", slug="python-bootcamp")
        module = SimpleNamespace(module_id=1, title="Intro", path_id=7, order=1)
        project = SimpleNamespace(
            project_id=11,
            module_id=1,
            title="Unsubmitted project",
            description="desc",
            order=2,
            estimated_hours=5,
            starter_repo_url=None,
            solution_repo_url=None,
            required_skills=None,
        )

        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=[
                    ScalarResult(profile),
                    ScalarResult(path),
                    ScalarsListResult([module]),
                    ScalarsListResult([project]),
                    ScalarsListResult([]),  # no submissions
                    ScalarsListResult([]),  # no progress
                ]
            )
        )
        service = EnrollmentService(db)
        service._get_course = AsyncMock(return_value=course)

        result = await service.get_student_projects("student-1")

        entry = result["projects"][0]
        self.assertIsNone(entry["points_earned"])
        self.assertIsNone(entry["deadline_status"])
        self.assertIsNone(entry["reviewed_at"])
        self.assertEqual(entry["project_title"], "Unsubmitted project")


if __name__ == "__main__":
    import unittest

    unittest.main()
