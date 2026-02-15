#!/usr/bin/python3
"""
Bootcamp database models.
Handles bootcamp programs and their enrollments.
"""
from datetime import datetime, timezone
from db.base import Base
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
    Numeric,
    Index,
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
import enum


class BootcampFormat(str, enum.Enum):
    """Bootcamp delivery format."""
    ONLINE = "online"
    IN_PERSON = "in-person"
    HYBRID = "hybrid"


class BootcampStatus(str, enum.Enum):
    """
    Bootcamp lifecycle status.
    
    Lifecycle flow:
    draft → published → in_progress → completed
                    ↘ cancelled
    
    Visibility rules:
    - draft: Admin/Mentor only (not visible to students)
    - published: Visible to everyone (open for enrollment if start_date > now)
    - in_progress: Visible to everyone (no new enrollment)
    - completed: Visible to everyone (archived)
    - cancelled: Admin only (hidden from students)
    """
    draft = "draft"           # Not visible to students, cannot enroll
    published = "published"   # Visible, can enroll if start_date > now
    in_progress = "in_progress"  # Started, no new enrollment
    completed = "completed"   # Finished
    cancelled = "cancelled"   # Cancelled, hidden from students


class EnrollmentPaymentStatus(str, enum.Enum):
    """Payment status for bootcamp enrollment."""
    pending = "pending"
    partial = "partial"
    paid = "paid"
    refunded = "refunded"


class Bootcamp(Base):
    """
    Bootcamp model representing an intensive training program.
    
    Bootcamps are structured, time-bound learning programs with
    scheduled start/end dates, capacity limits, and enrollment fees.
    """
    __tablename__ = "bootcamps"

    bootcamp_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Scheduling
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    duration = Column(String(50), nullable=True)  # e.g., "12 weeks"
    schedule = Column(String(255), nullable=True)  # e.g., "Mon-Fri, 9:00 AM - 5:00 PM"
    timezone = Column(String(50), default="UTC")
    
    # Format and location
    format = Column(SQLEnum(BootcampFormat), default=BootcampFormat.ONLINE)
    location = Column(String(255), nullable=True)  # Physical location if applicable
    
    # Pricing
    fee = Column(Numeric(10, 2), nullable=False)
    early_bird_fee = Column(Numeric(10, 2), nullable=True)
    early_bird_deadline = Column(DateTime(timezone=True), nullable=True)
    currency = Column(String(3), default="USD")
    
    # Capacity
    max_capacity = Column(Integer, default=25)
    
    # Status
    status = Column(SQLEnum(BootcampStatus), default=BootcampStatus.draft)
    is_active = Column(Boolean, default=True)
    
    # Instructor/Mentor
    instructor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    instructor_name = Column(String(255), nullable=True)  # Denormalized for display
    
    # Curriculum - list of topics/skills covered
    curriculum = Column(ARRAY(String(100)), nullable=True)
    
    # Optional: Link to a course for curriculum content
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="SET NULL"), nullable=True)
    
    # Cover image
    cover_image_url = Column(String(500), nullable=True)
    
    # Metadata
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Indexes
    __table_args__ = (
        Index("idx_bootcamp_status", "status"),
        Index("idx_bootcamp_start_date", "start_date"),
        Index("idx_bootcamp_is_active", "is_active"),
    )


class BootcampEnrollment(Base):
    """
    Bootcamp enrollment model tracking student registrations.
    
    Links users to bootcamps with payment and enrollment status tracking.
    """
    __tablename__ = "bootcamp_enrollments"

    enrollment_id = Column(Integer, primary_key=True, autoincrement=True)
    bootcamp_id = Column(
        Integer,
        ForeignKey("bootcamps.bootcamp_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Payment info
    payment_status = Column(
        SQLEnum(EnrollmentPaymentStatus),
        default=EnrollmentPaymentStatus.pending,
    )
    amount_paid = Column(Numeric(10, 2), default=0)
    payment_date = Column(DateTime(timezone=True), nullable=True)
    
    # Enrollment dates
    enrolled_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Completion tracking
    completed_at = Column(DateTime(timezone=True), nullable=True)
    certificate_issued = Column(Boolean, default=False)
    certificate_url = Column(String(500), nullable=True)
    
    # Additional info
    notes = Column(Text, nullable=True)  # Admin notes about this enrollment
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Unique constraint: one enrollment per user per bootcamp
    __table_args__ = (
        Index("idx_enrollment_bootcamp", "bootcamp_id"),
        Index("idx_enrollment_user", "user_id"),
        Index("idx_enrollment_payment_status", "payment_status"),
    )
