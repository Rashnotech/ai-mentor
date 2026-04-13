#!/usr/bin/python3
"""
Payment service — orchestrates enrollment lifecycle and Nomba payment gateway.

Responsibilities:
  • Create pending enrollments for paid courses
  • Initiate Nomba checkout orders
  • Verify payments server-side (never trust the frontend)
  • Activate enrollments only after verified payment
  • Handle retries without duplicate enrollments
  • Process Nomba webhooks
  • Enforce idempotency via order reference + payment status checks
"""
import json
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy import and_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.errors import AppError
from domains.courses.models.course import Course, LearningPath
from domains.courses.models.progress import UserCourseEnrollment
from domains.payments.models import EnrollmentStatus, Payment, PaymentStatus
from domains.payments.schemas import CheckoutOrderRequest
from gateways.nomba_service import NombaService

logger = logging.getLogger(__name__)


def _generate_reference() -> str:
    """Generate a unique payment reference."""
    return f"PAY-{uuid.uuid4().hex[:24].upper()}"


class PaymentService:
    """Handles the full payment lifecycle for paid course enrollments."""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self._nomba: Optional[NombaService] = None
        self._enrollment_status_checked = False

    @property
    def nomba(self) -> NombaService:
        if self._nomba is None:
            self._nomba = NombaService()
        return self._nomba

    # ─── Initiate Payment ──────────────────────────────────────────

    async def initiate_payment(
        self,
        user_id: str,
        user_email: str,
        course_id: int,
        user_name: Optional[str] = None,
        path_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create a pending enrollment (if not exists) and a new Nomba checkout order.
        Returns the checkout link for the frontend to redirect the user.
        """
        await self._ensure_enrollment_status_column()

        # 1. Validate course & determine price
        course = await self._get_course(course_id)
        if not course:
            raise AppError(
                status_code=404,
                detail="Course not found",
                error_code="COURSE_NOT_FOUND",
            )
        if not course.is_active:
            raise AppError(
                status_code=400,
                detail="Course is not currently active",
                error_code="COURSE_INACTIVE",
            )

        path, price = await self._resolve_path_and_price(course_id, path_id)
        if price <= 0:
            raise AppError(
                status_code=400,
                detail="This course is free. Use the enrollment endpoint directly.",
                error_code="COURSE_IS_FREE",
            )

        # 2. Find or create pending enrollment (avoids duplicates) and lock it.
        enrollment = await self._get_or_create_pending_enrollment(
            user_id=user_id,
            course_id=course_id,
            path_id=path.path_id if path else None,
            lock_row=True,
        )

        # 2b. If enrollment is already active, reject
        if enrollment.enrollment_status == EnrollmentStatus.ACTIVE:
            raise AppError(
                status_code=409,
                detail="You are already enrolled in this course",
                error_code="ALREADY_ENROLLED",
            )

        # 2c. If a successful payment already exists, activate/enforce idempotency.
        existing_success = await self._get_latest_payment(
            enrollment_id=enrollment.enrollment_id,
            status=PaymentStatus.SUCCESSFUL,
        )
        if existing_success:
            await self._activate_enrollment(existing_success, enrollment)
            await self.db.commit()
            raise AppError(
                status_code=409,
                detail="A successful payment already exists. Enrollment activated.",
                error_code="ALREADY_PAID",
            )

        # 2d. Return an existing pending payment to prevent duplicate in-flight transactions.
        existing_pending = await self._get_latest_payment(
            enrollment_id=enrollment.enrollment_id,
            status=PaymentStatus.PENDING,
        )
        if existing_pending and existing_pending.nomba_checkout_link:
            return {
                "enrollment_id": enrollment.enrollment_id,
                "payment_id": existing_pending.id,
                "reference": existing_pending.reference,
                "amount": float(existing_pending.amount),
                "currency": existing_pending.currency,
                "checkout_link": existing_pending.nomba_checkout_link,
                "status": "pending",
                "message": "Existing pending payment found. Continue checkout.",
            }

        # 3. Create payment record with unique reference
        reference = _generate_reference()
        payment = Payment(
            enrollment_id=enrollment.enrollment_id,
            user_id=user_id,
            course_id=course_id,
            reference=reference,
            amount=Decimal(str(price)),
            currency=settings.NOMBA_DEFAULT_CURRENCY,
            status=PaymentStatus.PENDING,
            customer_email=user_email,
        )
        self.db.add(payment)
        await self.db.flush()  # get payment.id

        # 4. Build callback URL
        callback_url = (
            settings.NOMBA_DEFAULT_CALLBACK_URL
            or f"{settings.FRONTEND_URL}/payment/callback"
        )
        callback_url_with_ref = f"{callback_url}?reference={reference}"

        # 5. Call Nomba to create checkout order
        try:
            checkout_request = CheckoutOrderRequest(
                orderReference=reference,
                customerEmail=user_email,
                customerName=user_name,
                callbackUrl=callback_url_with_ref,
                amount=float(price),
                currency=settings.NOMBA_DEFAULT_CURRENCY,
                description=f"Enrollment: {course.title}",
                metadata={
                    "enrollment_id": enrollment.enrollment_id,
                    "course_id": course_id,
                    "user_id": user_id,
                },
            )
            checkout_response = await self.nomba.checkout(checkout_request)
        except Exception as e:
            # Mark payment as failed if Nomba call fails
            payment.status = PaymentStatus.FAILED
            payment.gateway_response = json.dumps({"error": str(e)})
            await self.db.commit()
            logger.error("Nomba checkout failed for ref=%s: %s", reference, str(e))
            raise AppError(
                status_code=502,
                detail="Payment gateway error. Please try again.",
                error_code="GATEWAY_ERROR",
            )

        # 6. Store checkout link (commit transaction on success)
        payment.nomba_checkout_link = checkout_response.checkoutLink
        await self.db.commit()

        logger.info(
            "Payment initiated: ref=%s enrollment=%s course=%s user=%s",
            reference,
            enrollment.enrollment_id,
            course_id,
            user_id,
        )

        return {
            "enrollment_id": enrollment.enrollment_id,
            "payment_id": payment.id,
            "reference": reference,
            "amount": float(price),
            "currency": settings.NOMBA_DEFAULT_CURRENCY,
            "checkout_link": checkout_response.checkoutLink,
            "status": "pending",
            "message": "Payment initiated successfully. Redirect to checkout.",
        }

    # ─── Verify Payment ────────────────────────────────────────────

    async def verify_payment(self, reference: str) -> Dict[str, Any]:
        """
        Server-side verification of a payment using the Nomba API.
        Only activates enrollment after confirmed successful payment.
        """
        await self._ensure_enrollment_status_column()

        payment = await self._get_payment_by_reference(reference)
        if not payment:
            raise AppError(
                status_code=404,
                detail="Payment not found",
                error_code="PAYMENT_NOT_FOUND",
            )

        enrollment = await self._get_enrollment_by_id(payment.enrollment_id)
        if not enrollment:
            raise AppError(
                status_code=404,
                detail="Enrollment not found",
                error_code="ENROLLMENT_NOT_FOUND",
            )

        # Idempotency: if already verified successfully, return cached result
        if payment.status == PaymentStatus.SUCCESSFUL:
            return self._build_verification_response(
                payment, enrollment, "Payment already verified and successful"
            )

        # Call Nomba to verify
        try:
            verification = await self.nomba.verify_payment(reference)
        except Exception as e:
            logger.error("Nomba verification error for ref=%s: %s", reference, str(e))
            raise AppError(
                status_code=502,
                detail="Unable to verify payment with gateway. Please try again.",
                error_code="VERIFICATION_ERROR",
            )

        if not verification:
            # Gateway returned no data — payment not found or still processing
            return self._build_verification_response(
                payment, enrollment, "Payment verification pending — not yet confirmed"
            )

        nomba_status = (verification.get("status") or "").upper()
        payment.gateway_response = json.dumps(verification)
        payment.transaction_reference = verification.get("transactionReference")
        payment.payment_method = verification.get("paymentMethod")

        if nomba_status in ("SUCCESSFUL", "SUCCESS", "COMPLETED", "APPROVED"):
            await self._activate_enrollment(payment, enrollment)
            message = "Payment verified successfully. Enrollment activated."
        elif nomba_status in ("FAILED", "DECLINED", "REJECTED", "CANCELLED"):
            payment.status = PaymentStatus.FAILED
            payment.verified_at = datetime.now(timezone.utc)
            message = "Payment failed. You can retry the payment."
        else:
            # Still pending or unknown status
            message = f"Payment status: {nomba_status}. Please wait or retry."

        await self.db.commit()

        return self._build_verification_response(payment, enrollment, message)

    # ─── Retry Payment ─────────────────────────────────────────────

    async def retry_payment(
        self,
        enrollment_id: int,
        user_id: str,
        user_email: str,
        user_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new payment attempt for an existing pending enrollment.
        Does NOT create duplicate enrollments.
        """
        await self._ensure_enrollment_status_column()

        enrollment = await self._get_enrollment_by_id(enrollment_id)
        if not enrollment:
            raise AppError(
                status_code=404,
                detail="Enrollment not found",
                error_code="ENROLLMENT_NOT_FOUND",
            )
        if enrollment.user_id != user_id:
            raise AppError(
                status_code=403,
                detail="Not authorized for this enrollment",
                error_code="UNAUTHORIZED",
            )
        if enrollment.enrollment_status == EnrollmentStatus.ACTIVE:
            raise AppError(
                status_code=409,
                detail="Enrollment is already active",
                error_code="ALREADY_ACTIVE",
            )

        # Prevent duplicate successful payments
        existing_success = await self._has_successful_payment(enrollment_id)
        if existing_success:
            # Auto-activate if somehow missed
            enrollment.enrollment_status = EnrollmentStatus.ACTIVE
            enrollment.enrolled_at = datetime.now(timezone.utc)
            enrollment.is_active = True
            await self.db.commit()
            raise AppError(
                status_code=409,
                detail="A successful payment already exists. Enrollment activated.",
                error_code="ALREADY_PAID",
            )

        # If a pending payment already exists, reuse it to avoid parallel retries.
        existing_pending = await self._get_latest_payment(
            enrollment_id=enrollment_id,
            status=PaymentStatus.PENDING,
        )
        if existing_pending and existing_pending.nomba_checkout_link:
            return {
                "enrollment_id": enrollment_id,
                "payment_id": existing_pending.id,
                "reference": existing_pending.reference,
                "amount": float(existing_pending.amount),
                "currency": existing_pending.currency,
                "checkout_link": existing_pending.nomba_checkout_link,
                "status": "pending",
                "message": "Existing pending payment found. Continue checkout.",
            }

        # Get course for checkout description
        course = await self._get_course(enrollment.course_id)

        # Determine amount from learning path
        _, price = await self._resolve_path_and_price(
            enrollment.course_id, enrollment.path_id
        )

        # Create new payment with new reference
        reference = _generate_reference()
        payment = Payment(
            enrollment_id=enrollment_id,
            user_id=user_id,
            course_id=enrollment.course_id,
            reference=reference,
            amount=Decimal(str(price)),
            currency=settings.NOMBA_DEFAULT_CURRENCY,
            status=PaymentStatus.PENDING,
            customer_email=user_email,
        )
        self.db.add(payment)
        await self.db.flush()

        callback_url = (
            settings.NOMBA_DEFAULT_CALLBACK_URL
            or f"{settings.FRONTEND_URL}/payment/callback"
        )
        callback_url_with_ref = f"{callback_url}?reference={reference}"

        try:
            checkout_request = CheckoutOrderRequest(
                orderReference=reference,
                customerEmail=user_email,
                customerName=user_name,
                callbackUrl=callback_url_with_ref,
                amount=float(price),
                currency=settings.NOMBA_DEFAULT_CURRENCY,
                description=f"Enrollment: {course.title}" if course else "Course enrollment",
                metadata={
                    "enrollment_id": enrollment_id,
                    "course_id": enrollment.course_id,
                    "user_id": user_id,
                    "is_retry": True,
                },
            )
            checkout_response = await self.nomba.checkout(checkout_request)
        except Exception as e:
            payment.status = PaymentStatus.FAILED
            payment.gateway_response = json.dumps({"error": str(e)})
            await self.db.commit()
            raise AppError(
                status_code=502,
                detail="Payment gateway error. Please try again.",
                error_code="GATEWAY_ERROR",
            )

        payment.nomba_checkout_link = checkout_response.checkoutLink
        await self.db.commit()

        logger.info("Payment retry initiated: ref=%s enrollment=%s", reference, enrollment_id)

        return {
            "enrollment_id": enrollment_id,
            "payment_id": payment.id,
            "reference": reference,
            "amount": float(price),
            "currency": settings.NOMBA_DEFAULT_CURRENCY,
            "checkout_link": checkout_response.checkoutLink,
            "status": "pending",
            "message": "Retry payment initiated. Redirect to checkout.",
        }

    # ─── Webhook Handler ───────────────────────────────────────────

    async def process_webhook(
        self, payload: bytes, signature: str
    ) -> Dict[str, Any]:
        """
        Process Nomba webhook — verify signature, parse event, update payment.
        Handles duplicate webhook calls idempotently.
        """
        await self._ensure_enrollment_status_column()

        webhook_data = await self.nomba.handle_webhook(payload, signature)
        event = webhook_data.get("event", "")
        data = webhook_data.get("data", {})

        order_reference = data.get("orderReference") or data.get("order_reference")
        if not order_reference:
            logger.warning("Webhook missing order reference: %s", webhook_data)
            return {"status": "ignored", "reason": "no order reference"}

        payment = await self._get_payment_by_reference(order_reference)
        if not payment:
            logger.warning("Webhook for unknown reference: %s", order_reference)
            return {"status": "ignored", "reason": "unknown reference"}

        # Idempotency: skip if already successfully processed
        if payment.status == PaymentStatus.SUCCESSFUL:
            logger.info("Webhook for already-successful payment: %s", order_reference)
            return {"status": "already_processed"}

        enrollment = await self._get_enrollment_by_id(payment.enrollment_id)

        nomba_status = (data.get("status") or "").upper()
        payment.gateway_response = json.dumps(data)
        payment.transaction_reference = data.get("transactionReference") or data.get("id")
        payment.payment_method = data.get("paymentMethod")

        if nomba_status in ("SUCCESSFUL", "SUCCESS", "COMPLETED", "APPROVED"):
            if enrollment:
                await self._activate_enrollment(payment, enrollment)
            else:
                payment.status = PaymentStatus.SUCCESSFUL
                payment.verified_at = datetime.now(timezone.utc)
            status_msg = "payment_activated"
        elif nomba_status in ("FAILED", "DECLINED", "REJECTED", "CANCELLED"):
            payment.status = PaymentStatus.FAILED
            payment.verified_at = datetime.now(timezone.utc)
            status_msg = "payment_failed"
        else:
            status_msg = f"status_{nomba_status.lower()}"

        await self.db.commit()
        logger.info(
            "Webhook processed: event=%s ref=%s result=%s",
            event,
            order_reference,
            status_msg,
        )
        return {"status": status_msg, "reference": order_reference}

    # ─── Status & History ──────────────────────────────────────────

    async def get_payment_status(self, reference: str, user_id: str) -> Dict[str, Any]:
        """Get current payment status for the user."""
        await self._ensure_enrollment_status_column()

        payment = await self._get_payment_by_reference(reference)
        if not payment:
            raise AppError(status_code=404, detail="Payment not found", error_code="PAYMENT_NOT_FOUND")
        if payment.user_id != user_id:
            raise AppError(status_code=403, detail="Not authorized", error_code="UNAUTHORIZED")

        enrollment = await self._get_enrollment_by_id(payment.enrollment_id)

        return {
            "reference": payment.reference,
            "payment_status": payment.status.value,
            "enrollment_status": (
                enrollment.enrollment_status.value
                if enrollment
                else "unknown"
            ),
            "enrollment_id": payment.enrollment_id,
            "course_id": payment.course_id,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "checkout_link": payment.nomba_checkout_link,
            "created_at": payment.created_at.isoformat(),
        }

    async def get_enrollment_payments(
        self, enrollment_id: int, user_id: str
    ) -> Dict[str, Any]:
        """Get all payment attempts for an enrollment (audit trail)."""
        await self._ensure_enrollment_status_column()

        enrollment = await self._get_enrollment_by_id(enrollment_id)
        if not enrollment:
            raise AppError(status_code=404, detail="Enrollment not found", error_code="ENROLLMENT_NOT_FOUND")
        if enrollment.user_id != user_id:
            raise AppError(status_code=403, detail="Not authorized", error_code="UNAUTHORIZED")

        stmt = (
            select(Payment)
            .where(Payment.enrollment_id == enrollment_id)
            .order_by(Payment.created_at.desc())
        )
        result = await self.db.execute(stmt)
        payments = result.scalars().all()

        latest_link = None
        for p in payments:
            if p.status == PaymentStatus.PENDING and p.nomba_checkout_link:
                latest_link = p.nomba_checkout_link
                break

        return {
            "enrollment_id": enrollment_id,
            "course_id": enrollment.course_id,
            "enrollment_status": enrollment.enrollment_status.value,
            "payments": [
                {
                    "payment_id": p.id,
                    "reference": p.reference,
                    "amount": float(p.amount),
                    "currency": p.currency,
                    "status": p.status.value,
                    "payment_method": p.payment_method,
                    "created_at": p.created_at.isoformat(),
                    "verified_at": p.verified_at.isoformat() if p.verified_at else None,
                }
                for p in payments
            ],
            "latest_checkout_link": latest_link,
            "total_attempts": len(payments),
        }

    async def get_pending_enrollment(
        self, user_id: str, course_id: int
    ) -> Optional[Dict[str, Any]]:
        """Check if user has a pending-payment enrollment for a course."""
        await self._ensure_enrollment_status_column()

        stmt = select(UserCourseEnrollment).where(
            and_(
                UserCourseEnrollment.user_id == user_id,
                UserCourseEnrollment.course_id == course_id,
                UserCourseEnrollment.enrollment_status == EnrollmentStatus.PENDING_PAYMENT,
            )
        )
        result = await self.db.execute(stmt)
        enrollment = result.scalar_one_or_none()
        if not enrollment:
            return None

        # Get latest payment
        pay_stmt = (
            select(Payment)
            .where(Payment.enrollment_id == enrollment.enrollment_id)
            .order_by(Payment.created_at.desc())
        )
        pay_result = await self.db.execute(pay_stmt)
        latest_payment = pay_result.scalars().first()

        return {
            "enrollment_id": enrollment.enrollment_id,
            "course_id": enrollment.course_id,
            "status": enrollment.enrollment_status.value,
            "latest_reference": latest_payment.reference if latest_payment else None,
            "latest_checkout_link": (
                latest_payment.nomba_checkout_link
                if latest_payment and latest_payment.status == PaymentStatus.PENDING
                else None
            ),
        }

    # ─── Private Helpers ───────────────────────────────────────────

    async def _ensure_enrollment_status_column(self) -> None:
        """Hotfix for environments where enrollment_status was not migrated."""
        if self._enrollment_status_checked:
            return

        # First do a quick existence check.
        check_stmt = text(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'user_course_enrollments'
              AND column_name = 'enrollment_status'
            LIMIT 1
            """
        )
        exists_result = await self.db.execute(check_stmt)
        if exists_result.scalar_one_or_none():
            self._enrollment_status_checked = True
            return

        logger.warning(
            "Missing column user_course_enrollments.enrollment_status detected. Applying automatic schema repair."
        )

        # Ensure enum type exists before adding the column.
        await self.db.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_type
                        WHERE typname = 'enrollmentstatus'
                    ) THEN
                        CREATE TYPE enrollmentstatus AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'CANCELLED');
                    END IF;
                END
                $$;
                """
            )
        )

        # Determine which enum labels this environment uses.
        labels_stmt = text(
            """
            SELECT enumlabel
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'enrollmentstatus'
            """
        )
        labels_result = await self.db.execute(labels_stmt)
        labels = {row[0] for row in labels_result.fetchall()}
        use_upper_labels = "ACTIVE" in labels
        active_literal = "ACTIVE" if use_upper_labels else "active"
        pending_literal = (
            "PENDING_PAYMENT" if use_upper_labels else "pending_payment"
        )

        # Add and backfill the status column using existing is_active data.
        await self.db.execute(
            text(
                """
                ALTER TABLE user_course_enrollments
                ADD COLUMN IF NOT EXISTS enrollment_status enrollmentstatus
                """
            )
        )
        await self.db.execute(
            text(
                f"""
                UPDATE user_course_enrollments
                SET enrollment_status = CASE
                    WHEN COALESCE(is_active, FALSE) THEN '{active_literal}'::enrollmentstatus
                    ELSE '{pending_literal}'::enrollmentstatus
                END
                WHERE enrollment_status IS NULL
                """
            )
        )
        await self.db.execute(
            text(
                f"""
                ALTER TABLE user_course_enrollments
                ALTER COLUMN enrollment_status SET DEFAULT '{active_literal}'::enrollmentstatus,
                ALTER COLUMN enrollment_status SET NOT NULL
                """
            )
        )

        await self.db.commit()
        self._enrollment_status_checked = True
        logger.info("Applied schema repair for user_course_enrollments.enrollment_status")

    async def _get_course(self, course_id: int) -> Optional[Course]:
        stmt = select(Course).where(Course.course_id == course_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _resolve_path_and_price(
        self, course_id: int, path_id: Optional[int] = None
    ) -> tuple:
        """Resolve the learning path and its price for a course."""
        if path_id:
            stmt = select(LearningPath).where(LearningPath.path_id == path_id)
        else:
            # Get default path
            stmt = select(LearningPath).where(
                and_(
                    LearningPath.course_id == course_id,
                    LearningPath.is_default == True,
                )
            )
        result = await self.db.execute(stmt)
        path = result.scalar_one_or_none()

        if not path:
            # Fallback: any path for this course
            stmt = select(LearningPath).where(LearningPath.course_id == course_id)
            result = await self.db.execute(stmt)
            path = result.scalars().first()

        price = float(path.price) if path and path.price else 0.0
        return path, price

    async def _get_or_create_pending_enrollment(
        self,
        user_id: str,
        course_id: int,
        path_id: Optional[int] = None,
        lock_row: bool = False,
    ) -> UserCourseEnrollment:
        """
        Find existing enrollment or create a new one with pending_payment status.
        This prevents duplicate enrollments on retry.
        """
        stmt = select(UserCourseEnrollment).where(
            and_(
                UserCourseEnrollment.user_id == user_id,
                UserCourseEnrollment.course_id == course_id,
            )
        )
        if lock_row:
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        enrollment = result.scalar_one_or_none()

        if enrollment:
            return enrollment

        enrollment = UserCourseEnrollment(
            user_id=user_id,
            course_id=course_id,
            path_id=path_id,
            enrollment_status=EnrollmentStatus.PENDING_PAYMENT,
            is_active=False,
        )
        self.db.add(enrollment)
        try:
            await self.db.flush()
        except IntegrityError:
            # Another concurrent request created it first. Re-read the row.
            await self.db.rollback()
            retry_stmt = select(UserCourseEnrollment).where(
                and_(
                    UserCourseEnrollment.user_id == user_id,
                    UserCourseEnrollment.course_id == course_id,
                )
            )
            if lock_row:
                retry_stmt = retry_stmt.with_for_update()
            retry_result = await self.db.execute(retry_stmt)
            enrollment = retry_result.scalar_one_or_none()
            if enrollment:
                return enrollment
            raise

        logger.info(
            "Created pending enrollment: id=%s user=%s course=%s",
            enrollment.enrollment_id,
            user_id,
            course_id,
        )
        return enrollment

    async def _get_payment_by_reference(self, reference: str) -> Optional[Payment]:
        stmt = select(Payment).where(Payment.reference == reference)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_enrollment_by_id(
        self, enrollment_id: int
    ) -> Optional[UserCourseEnrollment]:
        stmt = select(UserCourseEnrollment).where(
            UserCourseEnrollment.enrollment_id == enrollment_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _has_successful_payment(self, enrollment_id: int) -> bool:
        """Check if enrollment already has a successful payment (prevent duplicates)."""
        stmt = select(Payment).where(
            and_(
                Payment.enrollment_id == enrollment_id,
                Payment.status == PaymentStatus.SUCCESSFUL,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def _get_latest_payment(
        self, enrollment_id: int, status: Optional[PaymentStatus] = None
    ) -> Optional[Payment]:
        stmt = select(Payment).where(Payment.enrollment_id == enrollment_id)
        if status is not None:
            stmt = stmt.where(Payment.status == status)
        stmt = stmt.order_by(Payment.created_at.desc())
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def _activate_enrollment(
        self, payment: Payment, enrollment: UserCourseEnrollment
    ) -> None:
        """Mark payment as successful and activate enrollment."""
        # Prevent duplicate activations
        if payment.status == PaymentStatus.SUCCESSFUL:
            return

        payment.status = PaymentStatus.SUCCESSFUL
        payment.verified_at = datetime.now(timezone.utc)

        enrollment.enrollment_status = EnrollmentStatus.ACTIVE
        enrollment.is_active = True
        enrollment.enrolled_at = datetime.now(timezone.utc)

        logger.info(
            "Enrollment activated: enrollment=%s payment_ref=%s",
            enrollment.enrollment_id,
            payment.reference,
        )

    def _build_verification_response(
        self,
        payment: Payment,
        enrollment: UserCourseEnrollment,
        message: str,
    ) -> Dict[str, Any]:
        return {
            "reference": payment.reference,
            "payment_status": payment.status.value,
            "enrollment_status": enrollment.enrollment_status.value,
            "enrollment_id": enrollment.enrollment_id,
            "course_id": payment.course_id,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "message": message,
            "verified_at": (
                payment.verified_at.isoformat() if payment.verified_at else None
            ),
            "payment_method": payment.payment_method,
            "transaction_reference": payment.transaction_reference,
        }
