"""Regression tests for paid self-paced enrollment and onboarding consistency."""
import sys
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.constant import LearningMode  # noqa: E402
from domains.payments.models import EnrollmentStatus, PaymentStatus  # noqa: E402
from domains.payments.service import PaymentService  # noqa: E402


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class EnrollmentPaymentConsistencyTests(IsolatedAsyncioTestCase):
    async def test_verified_selected_course_completes_self_paced_onboarding(self):
        profile = SimpleNamespace(
            onboarding_completed=False,
            learning_mode=LearningMode.SELF_PACED,
            primary_goal="Get a job",
            selected_course_id="42",
            onboarding_completed_at=None,
            updated_at=None,
        )
        db = SimpleNamespace(execute=AsyncMock(return_value=ScalarResult(profile)), add=Mock())
        service = PaymentService(db)
        completed_at = datetime(2026, 7, 1, tzinfo=timezone.utc)

        changed = await service._complete_self_paced_onboarding("student-1", 42, completed_at)

        self.assertTrue(changed)
        self.assertTrue(profile.onboarding_completed)
        self.assertEqual(profile.onboarding_completed_at, completed_at)
        db.add.assert_called_once_with(profile)

    async def test_payment_for_different_course_does_not_complete_onboarding(self):
        profile = SimpleNamespace(
            onboarding_completed=False,
            learning_mode=LearningMode.SELF_PACED,
            primary_goal="Get a job",
            selected_course_id="9",
        )
        db = SimpleNamespace(execute=AsyncMock(return_value=ScalarResult(profile)), add=Mock())
        service = PaymentService(db)

        changed = await service._complete_self_paced_onboarding("student-1", 42)

        self.assertFalse(changed)
        self.assertFalse(profile.onboarding_completed)
        db.add.assert_not_called()

    async def test_existing_successful_payment_repairs_inactive_enrollment(self):
        db = SimpleNamespace()
        service = PaymentService(db)
        service._complete_self_paced_onboarding = AsyncMock(return_value=True)
        payment = SimpleNamespace(
            status=PaymentStatus.SUCCESSFUL,
            verified_at=datetime(2026, 6, 30, tzinfo=timezone.utc),
            reference="PAY-EXISTING",
        )
        enrollment = SimpleNamespace(
            enrollment_id=3,
            user_id="student-1",
            course_id=42,
            enrollment_status=EnrollmentStatus.PENDING_PAYMENT,
            is_active=False,
            enrolled_at=None,
        )

        await service._activate_enrollment(payment, enrollment)

        self.assertEqual(enrollment.enrollment_status, EnrollmentStatus.ACTIVE)
        self.assertTrue(enrollment.is_active)
        self.assertIsNotNone(enrollment.enrolled_at)
        service._complete_self_paced_onboarding.assert_awaited_once()

    async def test_initiate_reuses_successful_payment_instead_of_raising(self):
        db = SimpleNamespace(commit=AsyncMock())
        service = PaymentService(db)
        service._ensure_enrollment_status_column = AsyncMock()
        service._get_course = AsyncMock(
            return_value=SimpleNamespace(course_id=42, title="Python", is_active=True)
        )
        service._resolve_path_and_price = AsyncMock(
            return_value=(SimpleNamespace(path_id=7), 5000.0)
        )
        enrollment = SimpleNamespace(
            enrollment_id=3,
            user_id="student-1",
            course_id=42,
            path_id=7,
            enrollment_status=EnrollmentStatus.PENDING_PAYMENT,
            is_active=False,
            enrolled_at=None,
        )
        payment = SimpleNamespace(
            id=9,
            reference="PAY-EXISTING",
            amount=Decimal("5000.00"),
            currency="NGN",
            status=PaymentStatus.SUCCESSFUL,
            verified_at=datetime(2026, 7, 16, tzinfo=timezone.utc),
        )
        service._get_or_create_pending_enrollment = AsyncMock(return_value=enrollment)
        service._get_latest_payment = AsyncMock(return_value=payment)
        service._activate_enrollment = AsyncMock()

        result = await service.initiate_payment(
            user_id="student-1",
            user_email="student@example.com",
            course_id=42,
            path_id=7,
        )

        self.assertEqual(result["status"], "active")
        self.assertIsNone(result["checkout_link"])
        self.assertEqual(result["payment_id"], 9)
        self.assertIn("Course access granted", result["message"])
        service._activate_enrollment.assert_awaited_once_with(payment, enrollment)
        db.commit.assert_awaited_once()


if __name__ == "__main__":
    import unittest

    unittest.main()
