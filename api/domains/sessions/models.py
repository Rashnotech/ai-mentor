#!/usr/bin/python3
"""
Database models for mentoring sessions and attendance tracking.
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
    Index,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
import enum
import uuid


class SessionPlatform(str, enum.Enum):
    """Supported meeting platforms."""
    ZOOM = "zoom"
    GOOGLE_MEET = "google_meet"
    MICROSOFT_TEAMS = "microsoft_teams"
    CUSTOM = "custom"


class SessionStatus(str, enum.Enum):
    """
    Session lifecycle status.

    Computed helpers (upcoming / ongoing / completed) are derived from
    date/time, but the mentor can also explicitly cancel.
    """
    scheduled = "scheduled"
    cancelled = "cancelled"


class MentoringSession(Base):
    """A live mentoring/teaching session created by a mentor."""

    __tablename__ = "mentoring_sessions"

    session_id = Column(Integer, primary_key=True, autoincrement=True)

    # Ownership
    mentor_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Optional association to bootcamp / course
    bootcamp_id = Column(
        Integer,
        ForeignKey("bootcamps.bootcamp_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    course_id = Column(
        Integer,
        ForeignKey("courses.course_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Session details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    platform = Column(
        SQLEnum(SessionPlatform, name="session_platform"),
        nullable=False,
        default=SessionPlatform.ZOOM,
    )
    session_link = Column(String(500), nullable=False)

    # Scheduling (stored in UTC)
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    timezone = Column(String(50), nullable=False, default="UTC")

    # Unique shareable attendance link token
    attendance_token = Column(
        String(64), unique=True, nullable=False, index=True,
        default=lambda: uuid.uuid4().hex,
    )

    status = Column(
        SQLEnum(SessionStatus, name="session_status"),
        nullable=False,
        default=SessionStatus.scheduled,
    )

    # Audit
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    attendances = relationship(
        "SessionAttendance", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_session_mentor_date", "mentor_id", "scheduled_date"),
        Index("idx_session_bootcamp", "bootcamp_id"),
        Index("idx_session_course", "course_id"),
    )

    # ---------- helpers ----------
    @property
    def computed_status(self) -> str:
        """Return a display-friendly status that accounts for time."""
        if self.status == SessionStatus.cancelled:
            return "cancelled"
        now = datetime.now(timezone.utc)
        if now < self.start_time:
            return "upcoming"
        if now <= self.end_time:
            return "ongoing"
        return "completed"

    @property
    def attendee_count(self) -> int:
        return len(self.attendances) if self.attendances else 0


class SessionAttendance(Base):
    """Records a student's attendance for a specific session."""

    __tablename__ = "session_attendances"

    attendance_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(
        Integer,
        ForeignKey("mentoring_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    marked_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    session = relationship("MentoringSession", back_populates="attendances")

    __table_args__ = (
        # One attendance record per student per session (idempotent)
        Index(
            "uq_session_student",
            "session_id",
            "student_id",
            unique=True,
        ),
        Index("idx_attendance_student", "student_id"),
    )
