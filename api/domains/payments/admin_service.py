#!/usr/bin/python3
"""
Admin payment / transaction service.

Provides admin-only operations:
  • List / filter / search all transactions
  • View full transaction details + audit trail
  • Resolve payments (mark completed, retry, cancel, mark failed)
  • Record manual / cash payments
  • Configure and track split payments
  • Generate receipt data
  • Send email receipts & payment reminders
"""
import json
import logging
import math
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, or_, select, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.errors import AppError
from domains.courses.models.course import Course, LearningPath
from domains.courses.models.progress import UserCourseEnrollment
from domains.payments.models import (
    EnrollmentStatus,
    Payment,
    PaymentAuditLog,
    PaymentStatus,
)
from domains.users.models.user import User

logger = logging.getLogger(__name__)


def _gen_ref(prefix: str = "PAY") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:24].upper()}"


class AdminPaymentService:
    """Admin-only payment management operations."""

    def __init__(self, db: AsyncSession, admin_user: dict):
        self.db = db
        self.admin = admin_user

    # ── helpers ──────────────────────────────────────────────────

    async def _get_user(self, user_id: str) -> Optional[User]:
        r = await self.db.execute(select(User).where(User.id == user_id))
        return r.scalar_one_or_none()

    async def _get_course(self, course_id: int) -> Optional[Course]:
        r = await self.db.execute(select(Course).where(Course.course_id == course_id))
        return r.scalar_one_or_none()

    async def _get_payment(self, payment_id: int) -> Optional[Payment]:
        r = await self.db.execute(select(Payment).where(Payment.id == payment_id))
        return r.scalar_one_or_none()

    async def _get_enrollment(self, eid: int) -> Optional[UserCourseEnrollment]:
        r = await self.db.execute(
            select(UserCourseEnrollment).where(
                UserCourseEnrollment.enrollment_id == eid
            )
        )
        return r.scalar_one_or_none()

    async def _log_action(
        self,
        payment_id: int,
        action: str,
        prev_status: Optional[str],
        new_status: Optional[str],
        note: str = "",
        meta: Optional[dict] = None,
    ) -> None:
        log = PaymentAuditLog(
            payment_id=payment_id,
            admin_id=self.admin["user_id"],
            action=action,
            previous_status=prev_status,
            new_status=new_status,
            note=note,
            metadata_json=json.dumps(meta) if meta else None,
        )
        self.db.add(log)

    # ── Lookups ──────────────────────────────────────────────────

    async def lookup_user_by_email(self, email: str) -> Dict[str, Any]:
        """Find a user by email address (exact match, case-insensitive)."""
        r = await self.db.execute(
            select(User).where(func.lower(User.email) == email.strip().lower())
        )
        user = r.scalar_one_or_none()
        if not user:
            raise AppError(404, "No user found with that email", "USER_NOT_FOUND")
        return {
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name or "",
        }

    async def lookup_enrollments_by_email(self, email: str) -> Dict[str, Any]:
        """Find all enrollments for a user identified by email."""
        # Resolve user first
        r = await self.db.execute(
            select(User).where(func.lower(User.email) == email.strip().lower())
        )
        user = r.scalar_one_or_none()
        if not user:
            raise AppError(404, "No user found with that email", "USER_NOT_FOUND")

        # Get enrollments with course info
        rows = await self.db.execute(
            select(
                UserCourseEnrollment.enrollment_id,
                UserCourseEnrollment.course_id,
                UserCourseEnrollment.path_id,
                UserCourseEnrollment.enrollment_status,
                UserCourseEnrollment.is_active,
                Course.title.label("course_title"),
            )
            .join(Course, Course.course_id == UserCourseEnrollment.course_id)
            .where(UserCourseEnrollment.user_id == user.id)
            .order_by(UserCourseEnrollment.enrollment_id.desc())
        )
        enrollments = [
            {
                "enrollment_id": row.enrollment_id,
                "course_id": row.course_id,
                "course_title": row.course_title,
                "path_id": row.path_id,
                "enrollment_status": row.enrollment_status.value if hasattr(row.enrollment_status, "value") else str(row.enrollment_status),
                "is_active": row.is_active,
            }
            for row in rows.all()
        ]

        return {
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name or "",
            "enrollments": enrollments,
        }

    # ── List / search ────────────────────────────────────────────

    async def list_transactions(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        course_id: Optional[int] = None,
        payment_method: Optional[str] = None,
        search: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Dict[str, Any]:
        base = select(Payment)
        count_q = select(func.count(Payment.id))
        filters = []

        if status and status != "all":
            try:
                ps = PaymentStatus(status)
                filters.append(Payment.status == ps)
            except ValueError:
                pass

        if course_id:
            filters.append(Payment.course_id == course_id)

        if payment_method:
            filters.append(Payment.payment_method == payment_method)

        if date_from:
            try:
                dt = datetime.fromisoformat(date_from)
                filters.append(Payment.created_at >= dt)
            except ValueError:
                pass
        if date_to:
            try:
                dt = datetime.fromisoformat(date_to)
                filters.append(Payment.created_at <= dt)
            except ValueError:
                pass

        if search:
            term = f"%{search}%"
            # subquery for user lookup
            user_ids_q = select(User.id).where(
                or_(
                    User.full_name.ilike(term),
                    User.email.ilike(term),
                )
            )
            filters.append(
                or_(
                    Payment.reference.ilike(term),
                    Payment.customer_email.ilike(term),
                    Payment.user_id.in_(user_ids_q),
                )
            )

        if filters:
            base = base.where(and_(*filters))
            count_q = count_q.where(and_(*filters))

        # total count
        total_r = await self.db.execute(count_q)
        total = total_r.scalar() or 0
        total_pages = max(1, math.ceil(total / page_size))

        # sorting
        sort_col = getattr(Payment, sort_by, Payment.created_at)
        order_fn = desc if sort_order == "desc" else asc
        base = base.order_by(order_fn(sort_col))

        # pagination
        base = base.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(base)
        payments = result.scalars().all()

        # hydrate user / course names
        user_ids = list({p.user_id for p in payments})
        course_ids = list({p.course_id for p in payments})

        users_map: Dict[str, User] = {}
        if user_ids:
            ur = await self.db.execute(select(User).where(User.id.in_(user_ids)))
            for u in ur.scalars().all():
                users_map[u.id] = u

        courses_map: Dict[int, Course] = {}
        if course_ids:
            cr = await self.db.execute(
                select(Course).where(Course.course_id.in_(course_ids))
            )
            for c in cr.scalars().all():
                courses_map[c.course_id] = c

        items = []
        for p in payments:
            u = users_map.get(p.user_id)
            c = courses_map.get(p.course_id)
            items.append(self._payment_to_dict(p, u, c))

        # stats (global, not filtered)
        stats = await self._compute_stats()

        return {
            "transactions": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "stats": stats,
        }

    async def _compute_stats(self) -> Dict[str, Any]:
        all_q = select(
            Payment.status,
            func.count(Payment.id).label("cnt"),
            func.coalesce(func.sum(Payment.amount), 0).label("total_amount"),
        ).group_by(Payment.status)
        r = await self.db.execute(all_q)
        rows = r.all()

        stats: Dict[str, Any] = {
            "total": 0,
            "pending": 0,
            "successful": 0,
            "failed": 0,
            "cancelled": 0,
            "partial": 0,
            "total_revenue": 0.0,
        }
        for row in rows:
            status_val = row.status.value if hasattr(row.status, "value") else str(row.status)
            count = row.cnt
            amount = float(row.total_amount)
            stats["total"] += count
            stats[status_val] = count
            if status_val == "successful":
                stats["total_revenue"] += amount
        return stats

    # ── Detail view ──────────────────────────────────────────────

    async def get_transaction_detail(self, payment_id: int) -> Dict[str, Any]:
        payment = await self._get_payment(payment_id)
        if not payment:
            raise AppError(404, "Payment not found", "PAYMENT_NOT_FOUND")

        user = await self._get_user(payment.user_id)
        course = await self._get_course(payment.course_id)
        enrollment = await self._get_enrollment(payment.enrollment_id)

        # Payment history for this enrollment
        hist_r = await self.db.execute(
            select(Payment)
            .where(Payment.enrollment_id == payment.enrollment_id)
            .order_by(desc(Payment.created_at))
        )
        history = hist_r.scalars().all()

        # Audit trail
        audit_r = await self.db.execute(
            select(PaymentAuditLog)
            .where(PaymentAuditLog.payment_id == payment.id)
            .order_by(desc(PaymentAuditLog.created_at))
        )
        audit_logs = audit_r.all()

        # Hydrate admin names for audit
        admin_ids = list({a.admin_id for a in audit_logs})
        admins_map: Dict[str, str] = {}
        if admin_ids:
            ar = await self.db.execute(select(User).where(User.id.in_(admin_ids)))
            for adm in ar.scalars().all():
                admins_map[adm.id] = adm.full_name or adm.email

        # Split payment info
        split_info = None
        if payment.is_split_payment or any(p.is_split_payment for p in history):
            successful_total = sum(
                float(p.amount) for p in history if p.status == PaymentStatus.SUCCESSFUL
            )
            # figure out the course price
            _, price = await self._resolve_price(payment.course_id, enrollment.path_id if enrollment else None)
            split_info = {
                "total_amount": price,
                "amount_paid": successful_total,
                "outstanding_balance": max(0, price - successful_total),
                "payment_count": len([p for p in history if p.status == PaymentStatus.SUCCESSFUL]),
            }

        gw_response = None
        if payment.gateway_response:
            try:
                gw_response = json.loads(payment.gateway_response)
            except (json.JSONDecodeError, TypeError):
                gw_response = {"raw": payment.gateway_response}

        return {
            "payment": self._payment_to_dict(payment, user, course),
            "enrollment_status": (
                enrollment.enrollment_status.value if enrollment and hasattr(enrollment, "enrollment_status") else
                ("active" if enrollment and enrollment.is_active else "unknown")
            ),
            "gateway_response": gw_response,
            "payment_history": [
                self._payment_to_dict(p, user, course) for p in history
            ],
            "audit_trail": [
                {
                    "id": a.id,
                    "action": a.action,
                    "previous_status": a.previous_status,
                    "new_status": a.new_status,
                    "note": a.note,
                    "admin_name": admins_map.get(a.admin_id, a.admin_id),
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in audit_logs
            ],
            "split_info": split_info,
        }

    # ── Resolution actions ───────────────────────────────────────

    async def resolve_payment(
        self, payment_id: int, action: str, note: str
    ) -> Dict[str, Any]:
        payment = await self._get_payment(payment_id)
        if not payment:
            raise AppError(404, "Payment not found", "PAYMENT_NOT_FOUND")

        enrollment = await self._get_enrollment(payment.enrollment_id)
        prev_status = payment.status.value

        if action == "mark_completed":
            if payment.status == PaymentStatus.SUCCESSFUL:
                raise AppError(409, "Payment is already successful", "ALREADY_SUCCESSFUL")
            if not note:
                raise AppError(400, "A note is required to mark as completed", "NOTE_REQUIRED")

            payment.status = PaymentStatus.SUCCESSFUL
            payment.verified_at = datetime.now(timezone.utc)
            payment.admin_override_note = note
            payment.overridden_by = self.admin["user_id"]

            if enrollment:
                enrollment.enrollment_status = EnrollmentStatus.ACTIVE
                enrollment.is_active = True
                enrollment.enrolled_at = datetime.now(timezone.utc)

        elif action == "mark_failed":
            if payment.status == PaymentStatus.SUCCESSFUL:
                raise AppError(409, "Cannot mark a successful payment as failed", "INVALID_TRANSITION")
            payment.status = PaymentStatus.FAILED
            payment.admin_override_note = note
            payment.overridden_by = self.admin["user_id"]

        elif action == "cancel":
            if payment.status == PaymentStatus.SUCCESSFUL:
                raise AppError(409, "Cannot cancel a successful payment", "INVALID_TRANSITION")
            payment.status = PaymentStatus.CANCELLED
            payment.admin_override_note = note
            payment.overridden_by = self.admin["user_id"]
            if enrollment:
                enrollment.enrollment_status = EnrollmentStatus.CANCELLED
                enrollment.is_active = False

        elif action == "retry":
            # admin-triggered retry — create new pending payment
            from gateways.nomba_service import NombaService
            from domains.payments.schemas import CheckoutOrderRequest

            user = await self._get_user(payment.user_id)
            course = await self._get_course(payment.course_id)
            _, price = await self._resolve_price(payment.course_id, enrollment.path_id if enrollment else None)
            ref = _gen_ref()
            new_payment = Payment(
                enrollment_id=payment.enrollment_id,
                user_id=payment.user_id,
                course_id=payment.course_id,
                reference=ref,
                amount=Decimal(str(price)),
                currency=settings.NOMBA_DEFAULT_CURRENCY,
                status=PaymentStatus.PENDING,
                customer_email=user.email if user else payment.customer_email,
            )
            self.db.add(new_payment)
            await self.db.flush()

            callback_url = settings.NOMBA_DEFAULT_CALLBACK_URL or f"{settings.FRONTEND_URL}/payment/callback"
            try:
                nomba = NombaService()
                checkout_req = CheckoutOrderRequest(
                    orderReference=ref,
                    customerEmail=user.email if user else payment.customer_email or "",
                    customerName=user.full_name if user else None,
                    callbackUrl=f"{callback_url}?reference={ref}",
                    amount=float(price),
                    currency=settings.NOMBA_DEFAULT_CURRENCY,
                    description=f"Enrollment: {course.title}" if course else "Course enrollment",
                )
                checkout_resp = await nomba.checkout(checkout_req)
                new_payment.nomba_checkout_link = checkout_resp.checkoutLink
            except Exception as e:
                new_payment.status = PaymentStatus.FAILED
                new_payment.gateway_response = json.dumps({"error": str(e)})
                logger.error("Admin retry Nomba error: %s", str(e))

            await self._log_action(
                new_payment.id, "retry", prev_status, new_payment.status.value, note,
                {"original_payment_id": payment_id},
            )
            await self.db.commit()
            return {
                "message": "Retry payment created",
                "new_payment_id": new_payment.id,
                "new_reference": ref,
                "checkout_link": new_payment.nomba_checkout_link,
            }

        else:
            raise AppError(400, f"Unknown action: {action}", "INVALID_ACTION")

        await self._log_action(payment.id, action, prev_status, payment.status.value, note)
        await self.db.commit()

        return {
            "message": f"Payment {action} applied successfully",
            "payment_id": payment.id,
            "new_status": payment.status.value,
        }

    # ── Manual / cash payment ────────────────────────────────────

    async def record_manual_payment(
        self,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        course_id: int = 0,
        amount: float = 0,
        payment_method: str = "cash",
        note: str = "",
        path_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        # Resolve user by email if user_id not provided
        if not user_id and user_email:
            r = await self.db.execute(
                select(User).where(func.lower(User.email) == user_email.strip().lower())
            )
            user = r.scalar_one_or_none()
            if not user:
                raise AppError(404, "No user found with that email", "USER_NOT_FOUND")
            user_id = user.id
        elif user_id:
            user = await self._get_user(user_id)
            if not user:
                raise AppError(404, "User not found", "USER_NOT_FOUND")
        else:
            raise AppError(400, "Either user_id or user_email is required", "MISSING_USER")

        course = await self._get_course(course_id)
        if not course:
            raise AppError(404, "Course not found", "COURSE_NOT_FOUND")

        # Check existing active enrollment
        existing = await self.db.execute(
            select(UserCourseEnrollment).where(
                and_(
                    UserCourseEnrollment.user_id == user_id,
                    UserCourseEnrollment.course_id == course_id,
                )
            )
        )
        enrollment = existing.scalar_one_or_none()

        if enrollment and enrollment.enrollment_status == EnrollmentStatus.ACTIVE:
            raise AppError(409, "User is already enrolled in this course", "ALREADY_ENROLLED")

        if not enrollment:
            enrollment = UserCourseEnrollment(
                user_id=user_id,
                course_id=course_id,
                path_id=path_id,
                enrollment_status=EnrollmentStatus.ACTIVE,
                is_active=True,
                enrolled_at=datetime.now(timezone.utc),
            )
            self.db.add(enrollment)
            await self.db.flush()
        else:
            enrollment.enrollment_status = EnrollmentStatus.ACTIVE
            enrollment.is_active = True
            enrollment.enrolled_at = datetime.now(timezone.utc)

        ref = _gen_ref("MANUAL")
        payment = Payment(
            enrollment_id=enrollment.enrollment_id,
            user_id=user_id,
            course_id=course_id,
            reference=ref,
            amount=Decimal(str(amount)),
            currency=settings.NOMBA_DEFAULT_CURRENCY,
            status=PaymentStatus.SUCCESSFUL,
            payment_method=payment_method,
            customer_email=user.email,
            admin_override_note=note,
            overridden_by=self.admin["user_id"],
            verified_at=datetime.now(timezone.utc),
        )
        self.db.add(payment)
        await self.db.flush()

        await self._log_action(
            payment.id, "manual_payment", None, "successful", note,
            {"payment_method": payment_method, "amount": amount},
        )
        await self.db.commit()

        logger.info(
            "Manual payment recorded: admin=%s user=%s course=%s amount=%s method=%s",
            self.admin["user_id"], user_id, course_id, amount, payment_method,
        )

        return {
            "message": "Manual payment recorded and enrollment activated",
            "payment_id": payment.id,
            "reference": ref,
            "enrollment_id": enrollment.enrollment_id,
        }

    # ── Split payment config ─────────────────────────────────────

    async def configure_split_payment(
        self,
        enrollment_id: int,
        total_amount: float,
        initial_amount: float,
        note: str = "",
    ) -> Dict[str, Any]:
        enrollment = await self._get_enrollment(enrollment_id)
        if not enrollment:
            raise AppError(404, "Enrollment not found", "ENROLLMENT_NOT_FOUND")

        if initial_amount >= total_amount:
            raise AppError(400, "Initial amount must be less than total", "INVALID_SPLIT")

        user = await self._get_user(enrollment.user_id)

        # Record first split payment
        ref = _gen_ref("SPLIT")
        payment = Payment(
            enrollment_id=enrollment_id,
            user_id=enrollment.user_id,
            course_id=enrollment.course_id,
            reference=ref,
            amount=Decimal(str(initial_amount)),
            currency=settings.NOMBA_DEFAULT_CURRENCY,
            status=PaymentStatus.SUCCESSFUL,
            payment_method="split",
            is_split_payment=True,
            customer_email=user.email if user else None,
            admin_override_note=note,
            overridden_by=self.admin["user_id"],
            verified_at=datetime.now(timezone.utc),
        )
        self.db.add(payment)
        await self.db.flush()

        # Mark enrollment as active but track partial
        enrollment.enrollment_status = EnrollmentStatus.ACTIVE
        enrollment.is_active = True
        enrollment.enrolled_at = datetime.now(timezone.utc)

        await self._log_action(
            payment.id, "split_payment_configured", None, "successful", note,
            {"total_amount": total_amount, "initial_amount": initial_amount},
        )
        await self.db.commit()

        return {
            "message": "Split payment configured",
            "payment_id": payment.id,
            "reference": ref,
            "total_amount": total_amount,
            "amount_paid": initial_amount,
            "outstanding_balance": total_amount - initial_amount,
        }

    async def record_split_payment(
        self,
        enrollment_id: int,
        amount: float,
        payment_method: str = "cash",
        note: str = "",
    ) -> Dict[str, Any]:
        enrollment = await self._get_enrollment(enrollment_id)
        if not enrollment:
            raise AppError(404, "Enrollment not found", "ENROLLMENT_NOT_FOUND")

        user = await self._get_user(enrollment.user_id)
        _, total_price = await self._resolve_price(
            enrollment.course_id, enrollment.path_id
        )

        # Sum existing successful payments
        existing_r = await self.db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                and_(
                    Payment.enrollment_id == enrollment_id,
                    Payment.status == PaymentStatus.SUCCESSFUL,
                )
            )
        )
        paid = float(existing_r.scalar() or 0)

        ref = _gen_ref("SPLIT")
        payment = Payment(
            enrollment_id=enrollment_id,
            user_id=enrollment.user_id,
            course_id=enrollment.course_id,
            reference=ref,
            amount=Decimal(str(amount)),
            currency=settings.NOMBA_DEFAULT_CURRENCY,
            status=PaymentStatus.SUCCESSFUL,
            payment_method=payment_method,
            is_split_payment=True,
            customer_email=user.email if user else None,
            admin_override_note=note,
            overridden_by=self.admin["user_id"],
            verified_at=datetime.now(timezone.utc),
        )
        self.db.add(payment)
        await self.db.flush()

        new_total_paid = paid + amount
        outstanding = max(0, total_price - new_total_paid)

        await self._log_action(
            payment.id, "split_payment_recorded", None, "successful", note,
            {"amount": amount, "total_paid": new_total_paid, "outstanding": outstanding},
        )
        await self.db.commit()

        return {
            "message": "Split payment recorded",
            "payment_id": payment.id,
            "reference": ref,
            "total_amount": total_price,
            "amount_paid": new_total_paid,
            "outstanding_balance": outstanding,
            "fully_paid": outstanding <= 0,
        }

    # ── Send payment reminder ────────────────────────────────────

    async def send_payment_reminder(
        self,
        enrollment_id: int,
        custom_message: Optional[str] = None,
        deadline: Optional[str] = None,
    ) -> Dict[str, Any]:
        enrollment = await self._get_enrollment(enrollment_id)
        if not enrollment:
            raise AppError(404, "Enrollment not found", "ENROLLMENT_NOT_FOUND")

        user = await self._get_user(enrollment.user_id)
        if not user:
            raise AppError(404, "User not found", "USER_NOT_FOUND")

        course = await self._get_course(enrollment.course_id)
        _, total_price = await self._resolve_price(
            enrollment.course_id, enrollment.path_id
        )

        paid_r = await self.db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                and_(
                    Payment.enrollment_id == enrollment_id,
                    Payment.status == PaymentStatus.SUCCESSFUL,
                )
            )
        )
        paid = float(paid_r.scalar() or 0)
        outstanding = max(0, total_price - paid)

        if outstanding <= 0:
            raise AppError(400, "No outstanding balance", "NO_BALANCE")

        # Send email via existing email service
        from domains.mailings.services.email_service import email_service

        payment_link = f"{settings.FRONTEND_URL}/courses/{course.slug}" if course else settings.FRONTEND_URL
        deadline_text = f"Please complete your payment by {deadline}." if deadline else ""
        custom_text = custom_message or ""

        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Payment Reminder</h1>
            </div>
            <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p>Hi {user.full_name or 'there'},</p>
                <p>You have an outstanding balance for your course enrollment:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px 0; color: #6b7280;">Course</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">{course.title if course else 'N/A'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px 0; color: #6b7280;">Total Amount</td>
                        <td style="padding: 8px 0; text-align: right;">₦{total_price:,.2f}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px 0; color: #6b7280;">Amount Paid</td>
                        <td style="padding: 8px 0; text-align: right; color: #16a34a;">₦{paid:,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Outstanding Balance</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #dc2626;">₦{outstanding:,.2f}</td>
                    </tr>
                </table>
                {f'<p>{deadline_text}</p>' if deadline_text else ''}
                {f'<p>{custom_text}</p>' if custom_text else ''}
                <div style="text-align: center; margin-top: 24px;">
                    <a href="{payment_link}" style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; display: inline-block;">Complete Payment</a>
                </div>
                <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">AI Mentor — Your learning platform</p>
            </div>
        </div>
        """
        text = f"Payment Reminder: You have an outstanding balance of NGN {outstanding:,.2f} for {course.title if course else 'your course'}."

        sent = await email_service._send_email(
            to_email=user.email,
            to_name=user.full_name or "",
            subject=f"Payment Reminder — ₦{outstanding:,.2f} outstanding balance",
            html_content=html,
            text_content=text,
        )

        return {
            "message": "Reminder sent" if sent else "Failed to send reminder",
            "sent": sent,
            "outstanding_balance": outstanding,
        }

    # ── Receipt data ─────────────────────────────────────────────

    async def get_receipt_data(self, payment_id: int) -> Dict[str, Any]:
        payment = await self._get_payment(payment_id)
        if not payment:
            raise AppError(404, "Payment not found", "PAYMENT_NOT_FOUND")

        user = await self._get_user(payment.user_id)
        course = await self._get_course(payment.course_id)

        return {
            "transaction_id": payment.reference,
            "payment_id": payment.id,
            "user_name": user.full_name if user else "N/A",
            "user_email": user.email if user else payment.customer_email or "N/A",
            "course_title": course.title if course else "N/A",
            "amount": float(payment.amount),
            "currency": payment.currency,
            "payment_method": payment.payment_method or "Nomba",
            "payment_date": payment.created_at.isoformat() if payment.created_at else "",
            "status": payment.status.value,
            "admin_override_note": payment.admin_override_note,
            "is_split_payment": payment.is_split_payment,
            "verified_at": payment.verified_at.isoformat() if payment.verified_at else None,
        }

    async def send_receipt_email(self, payment_id: int) -> Dict[str, Any]:
        data = await self.get_receipt_data(payment_id)
        from domains.mailings.services.email_service import email_service

        status_text = "Successful" if data["status"] == "successful" else data["status"].title()
        status_color = "#16a34a" if data["status"] == "successful" else "#eab308"

        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e293b; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Payment Receipt</h1>
                <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 13px;">AI Mentor</p>
            </div>
            <div style="padding: 24px; background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Transaction ID</td>
                        <td style="padding: 10px 0; text-align: right; font-family: monospace; font-size: 13px;">{data['transaction_id']}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Date</td>
                        <td style="padding: 10px 0; text-align: right; font-size: 14px;">{data['payment_date'][:19] if data['payment_date'] else 'N/A'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Customer</td>
                        <td style="padding: 10px 0; text-align: right; font-size: 14px;">{data['user_name']}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Course</td>
                        <td style="padding: 10px 0; text-align: right; font-size: 14px;">{data['course_title']}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Payment Method</td>
                        <td style="padding: 10px 0; text-align: right; font-size: 14px;">{data['payment_method']}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Status</td>
                        <td style="padding: 10px 0; text-align: right; font-size: 14px; color: {status_color}; font-weight: 600;">{status_text}</td>
                    </tr>
                </table>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 16px; font-weight: 600;">Total</span>
                    <span style="font-size: 20px; font-weight: 700;">₦{data['amount']:,.2f} {data['currency']}</span>
                </div>
                {f'<p style="margin-top: 12px; font-size: 12px; color: #9ca3af;">Admin note: {data["admin_override_note"]}</p>' if data.get('admin_override_note') else ''}
                <p style="margin-top: 24px; font-size: 11px; color: #9ca3af; text-align: center;">Thank you for choosing AI Mentor.</p>
            </div>
        </div>
        """
        text = f"Payment Receipt: {data['transaction_id']} — ₦{data['amount']:,.2f} — {status_text}"

        sent = await email_service._send_email(
            to_email=data["user_email"],
            to_name=data["user_name"],
            subject=f"Payment Receipt — {data['transaction_id']}",
            html_content=html,
            text_content=text,
        )

        return {"message": "Receipt sent" if sent else "Failed to send receipt", "sent": sent}

    # ── Export CSV ────────────────────────────────────────────────

    async def export_transactions_csv(
        self, status: Optional[str] = None
    ) -> str:
        """Return CSV string of all transactions."""
        q = select(Payment).order_by(desc(Payment.created_at))
        if status and status != "all":
            try:
                q = q.where(Payment.status == PaymentStatus(status))
            except ValueError:
                pass
        r = await self.db.execute(q)
        payments = r.scalars().all()

        user_ids = list({p.user_id for p in payments})
        course_ids = list({p.course_id for p in payments})
        users_map: Dict[str, User] = {}
        courses_map: Dict[int, Course] = {}
        if user_ids:
            ur = await self.db.execute(select(User).where(User.id.in_(user_ids)))
            for u in ur.scalars().all():
                users_map[u.id] = u
        if course_ids:
            cr = await self.db.execute(select(Course).where(Course.course_id.in_(course_ids)))
            for c in cr.scalars().all():
                courses_map[c.course_id] = c

        import csv
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Reference", "User Name", "User Email", "Course", "Amount",
            "Currency", "Status", "Payment Method", "Date", "Admin Note",
        ])
        for p in payments:
            u = users_map.get(p.user_id)
            c = courses_map.get(p.course_id)
            writer.writerow([
                p.reference,
                u.full_name if u else "",
                u.email if u else p.customer_email or "",
                c.title if c else "",
                float(p.amount),
                p.currency,
                p.status.value,
                p.payment_method or "",
                p.created_at.isoformat() if p.created_at else "",
                p.admin_override_note or "",
            ])
        return output.getvalue()

    # ── Private ──────────────────────────────────────────────────

    async def _resolve_price(
        self, course_id: int, path_id: Optional[int] = None
    ) -> tuple:
        if path_id:
            stmt = select(LearningPath).where(LearningPath.path_id == path_id)
        else:
            stmt = select(LearningPath).where(
                and_(LearningPath.course_id == course_id, LearningPath.is_default == True)
            )
        result = await self.db.execute(stmt)
        path = result.scalar_one_or_none()
        if not path:
            result = await self.db.execute(
                select(LearningPath).where(LearningPath.course_id == course_id)
            )
            path = result.scalars().first()
        price = float(path.price) if path and path.price else 0.0
        return path, price

    def _payment_to_dict(
        self, p: Payment, user: Optional[User] = None, course: Optional[Course] = None
    ) -> dict:
        return {
            "id": p.id,
            "reference": p.reference,
            "enrollment_id": p.enrollment_id,
            "user_id": p.user_id,
            "user_name": user.full_name if user else None,
            "user_email": user.email if user else p.customer_email,
            "course_id": p.course_id,
            "course_title": course.title if course else None,
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status.value,
            "payment_method": p.payment_method,
            "is_split_payment": p.is_split_payment,
            "admin_override_note": p.admin_override_note,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "verified_at": p.verified_at.isoformat() if p.verified_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
