"""Regression tests for login-safe onboarding profile initialization."""
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.constant import LearningMode  # noqa: E402
from domains.payments.models import EnrollmentStatus  # noqa: E402
from domains.users.services.onboarding_service import OnboardingService  # noqa: E402


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class OnboardingProfileLifecycleTests(IsolatedAsyncioTestCase):
    async def test_start_onboarding_creates_a_missing_profile(self):
        profile = SimpleNamespace(user_id="student-1")
        service = OnboardingService(SimpleNamespace())
        service.get_user_profile = AsyncMock(return_value=None)
        service.create_user_profile = AsyncMock(return_value=profile)
        service.reconcile_completed_profile = AsyncMock(return_value=profile)

        result = await service.start_onboarding("student-1")

        self.assertIs(result, profile)
        service.create_user_profile.assert_awaited_once_with("student-1")

    async def test_start_onboarding_reuses_an_existing_profile(self):
        profile = SimpleNamespace(user_id="student-1")
        service = OnboardingService(SimpleNamespace())
        service.get_user_profile = AsyncMock(return_value=profile)
        service.create_user_profile = AsyncMock()
        service.reconcile_completed_profile = AsyncMock(return_value=profile)

        result = await service.start_onboarding("student-1")

        self.assertIs(result, profile)
        service.create_user_profile.assert_not_awaited()

    async def test_update_self_heals_before_writing_onboarding_state(self):
        profile = SimpleNamespace(
            skill_level=None,
            learning_mode=None,
            learning_style=None,
            primary_goal=None,
            selected_course_id=None,
            current_path_id=None,
            preferred_language="en",
            timezone="UTC",
            notification_preferences={},
            updated_at=None,
        )
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), refresh=AsyncMock())
        service = OnboardingService(db)
        service.start_onboarding = AsyncMock(return_value=profile)

        result = await service.update_onboarding_step(
            user_id="student-1",
            learning_mode=LearningMode.SELF_PACED,
        )

        self.assertIs(result, profile)
        self.assertEqual(profile.learning_mode, LearningMode.SELF_PACED)
        service.start_onboarding.assert_awaited_once_with("student-1")
        db.commit.assert_awaited_once()

    async def test_active_selected_course_backfills_legacy_completion(self):
        profile = SimpleNamespace(
            user_id="student-1",
            onboarding_completed=False,
            onboarding_completed_at=None,
            learning_mode=LearningMode.SELF_PACED,
            primary_goal="Get a job",
            selected_course_id="42",
            updated_at=None,
        )
        active_enrollment = SimpleNamespace(
            enrollment_status=EnrollmentStatus.ACTIVE,
            is_active=True,
        )
        db = SimpleNamespace(
            execute=AsyncMock(return_value=ScalarResult(active_enrollment)),
            add=Mock(),
            commit=AsyncMock(),
            refresh=AsyncMock(),
        )
        service = OnboardingService(db)

        result = await service.reconcile_completed_profile(profile)

        self.assertIs(result, profile)
        self.assertTrue(profile.onboarding_completed)
        self.assertIsNotNone(profile.onboarding_completed_at)
        db.add.assert_called_once_with(profile)
        db.commit.assert_awaited_once()

    async def test_incomplete_profile_without_enrollment_is_not_backfilled(self):
        profile = SimpleNamespace(
            user_id="student-1",
            onboarding_completed=False,
            onboarding_completed_at=None,
            learning_mode=LearningMode.SELF_PACED,
            primary_goal="Get a job",
            selected_course_id="42",
        )
        db = SimpleNamespace(
            execute=AsyncMock(return_value=ScalarResult(None)),
            add=Mock(),
            commit=AsyncMock(),
            refresh=AsyncMock(),
        )
        service = OnboardingService(db)

        result = await service.reconcile_completed_profile(profile)

        self.assertIs(result, profile)
        self.assertFalse(profile.onboarding_completed)
        db.add.assert_not_called()
        db.commit.assert_not_awaited()

    async def test_complete_onboarding_persists_canonical_flag(self):
        profile = SimpleNamespace(
            user_id="student-1",
            onboarding_completed=False,
            onboarding_completed_at=None,
            learning_mode=LearningMode.BOOTCAMP,
            primary_goal="Get a job",
            selected_course_id=None,
            updated_at=None,
        )
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), refresh=AsyncMock())
        service = OnboardingService(db)
        service.start_onboarding = AsyncMock(return_value=profile)

        result = await service.complete_onboarding("student-1")

        self.assertIs(result, profile)
        self.assertTrue(profile.onboarding_completed)
        self.assertIsNotNone(profile.onboarding_completed_at)
        db.add.assert_called_once_with(profile)
        db.commit.assert_awaited_once()
        db.refresh.assert_awaited_once_with(profile)


if __name__ == "__main__":
    import unittest

    unittest.main()
