#!/usr/bin/python3
"""Payment database models for enrollment payment tracking."""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Text,
    Numeric, Enum, Index, Boolean
)
from db.base import Base
import enum


class PaymentStatus(str, enum.Enum):
    """Payment transaction status."""
    PENDING = "pending"
    SUCCESSFUL = "successful"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PARTIAL = "partial"


class EnrollmentStatus(str, enum.Enum):
    """Enrollment payment status."""
    PENDING_PAYMENT = "pending_payment"
    ACTIVE = "active"
    CANCELLED = "cancelled"


class Payment(Base):
    """Payment transaction records linked to enrollments.

    Each enrollment may have multiple payment attempts (retries or splits).
    Only one payment per enrollment should ever reach 'successful' status,
    unless split payment mode is active in which case multiple 'successful'
    payments accumulate towards the total.
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    enrollment_id = Column(
        Integer,
        ForeignKey("user_course_enrollments.enrollment_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id = Column(
        Integer,
        ForeignKey("courses.course_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reference = Column(String(100), unique=True, nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="NGN", nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)

    # Nomba gateway data
    nomba_checkout_link = Column(String(1000), nullable=True)
    gateway_response = Column(Text, nullable=True)
    customer_email = Column(String(255), nullable=True)
    payment_method = Column(String(50), nullable=True)
    transaction_reference = Column(String(255), nullable=True)

    # Split / partial payment support
    is_split_payment = Column(Boolean, default=False, nullable=False)

    # Admin override
    admin_override_note = Column(Text, nullable=True)
    overridden_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("idx_payment_enrollment", "enrollment_id"),
        Index("idx_payment_user_course", "user_id", "course_id"),
        Index("idx_payment_status", "status"),
        Index("idx_payment_reference", "reference", unique=True),
    )


class PaymentAuditLog(Base):
    """Audit trail for every admin action on payments."""
    __tablename__ = "payment_audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    payment_id = Column(
        Integer,
        ForeignKey("payments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    admin_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True,
    )
    action = Column(String(50), nullable=False)       # e.g. mark_completed, retry, cancel, manual_cash
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    note = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)        # any extra context as JSON
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("idx_audit_payment", "payment_id"),
        Index("idx_audit_admin", "admin_id"),
    )
