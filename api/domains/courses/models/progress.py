#!/usr/bin/python3
"""Progress and submission tracking models"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Float, Enum, Index
from sqlalchemy.orm import relationship
from db.base import Base
import enum

# Import shared enum for enrollment payment status
from domains.payments.models import EnrollmentStatus


class DeadlineStatus(str, enum.Enum):
    """Deadline achievement status"""
    FIRST_DEADLINE = "first_deadline"  # Submitted before first deadline
    SECOND_DEADLINE = "second_deadline"  # Submitted before second deadline
    LATE = "late"  # Submitted after deadlines
    NOT_SUBMITTED = "not_submitted"


class LessonProgress(Base):
    """Track lesson completion by students"""
    __tablename__ = "lesson_progress"
    progress_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.lesson_id", ondelete="CASCADE"), index=True)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    time_spent_minutes = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_lesson_progress_user_lesson", "user_id", "lesson_id"),
    )


class AssessmentSubmission(Base):
    """Student assessment submissions with deadline tracking"""
    __tablename__ = "assessment_submissions"
    submission_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question_id = Column(Integer, ForeignKey("assessment_questions.question_id", ondelete="CASCADE"), index=True)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="CASCADE"), index=True)
    response_text = Column(Text)
    is_correct = Column(Boolean, nullable=True)  # Null if not yet graded
    time_taken_seconds = Column(Integer)
    attempts = Column(Integer, default=1)
    confidence_level = Column(Integer, nullable=True)
    deadline_status = Column(Enum(DeadlineStatus), default=DeadlineStatus.NOT_SUBMITTED)
    points_earned = Column(Float, default=0)  # Based on deadline
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_assessment_submissions_user_question", "user_id", "question_id"),
        Index("idx_assessment_submissions_module", "module_id"),
    )


class ProjectSubmission(Base):
    """Student project submissions with deadline tracking and rewards"""
    __tablename__ = "project_submissions"
    submission_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), index=True)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="CASCADE"), index=True)
    solution_url = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="submitted")  # submitted, in_review, approved, rejected
    is_approved = Column(Boolean, default=False)
    deadline_status = Column(Enum(DeadlineStatus), default=DeadlineStatus.NOT_SUBMITTED)
    points_earned = Column(Float, default=0)  # Based on deadline
    reviewer_feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_project_submissions_user_project", "user_id", "project_id"),
        Index("idx_project_submissions_module", "module_id"),
        Index("idx_project_submissions_status", "status"),
    )


class ModuleProgress(Base):
    """Track overall module completion and rewards"""
    __tablename__ = "module_progress"
    progress_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="CASCADE"), index=True)
    lessons_completed = Column(Integer, default=0)
    total_lessons = Column(Integer, default=0)
    assessments_passed = Column(Integer, default=0)
    total_assessments = Column(Integer, default=0)
    projects_approved = Column(Integer, default=0)
    total_projects = Column(Integer, default=0)
    total_points_earned = Column(Float, default=0)
    module_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_updated = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_module_progress_user_module", "user_id", "module_id"),
    )


class UserModuleAvailability(Base):
    """Track which modules are unlocked for each user based on their registration date."""
    __tablename__ = "user_module_availability"
    
    availability_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="CASCADE"), index=True)
    path_id = Column(Integer, ForeignKey("learning_paths.path_id", ondelete="CASCADE"), index=True)
    
    # Availability status
    is_unlocked = Column(Boolean, default=False, index=True)
    unlocked_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_unlock_date = Column(DateTime(timezone=True), nullable=True)  # Calculated from registration + unlock_after_days
    
    # Email notification tracking (prevents duplicate emails per module per enrollment)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Deadline calculations (calculated from unlocked_at + deadline_days)
    first_deadline = Column(DateTime(timezone=True), nullable=True)
    second_deadline = Column(DateTime(timezone=True), nullable=True)
    third_deadline = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_user_module_availability_user_module", "user_id", "module_id", unique=True),
        Index("idx_user_module_availability_scheduled", "scheduled_unlock_date", "is_unlocked"),
    )


class UserCourseEnrollment(Base):
    """Track user course enrollments with start date for deadline calculations."""
    __tablename__ = "user_course_enrollments"
    
    enrollment_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), index=True)
    path_id = Column(Integer, ForeignKey("learning_paths.path_id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Enrollment timeline
    enrolled_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    started_learning_at = Column(DateTime(timezone=True), nullable=True)  # When user starts first module
    
    # Status
    is_active = Column(Boolean, default=True)
    enrollment_status = Column(
        Enum(EnrollmentStatus),
        default=EnrollmentStatus.ACTIVE,
        nullable=False,
        server_default="active",
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Expected completion (calculated from course duration)
    expected_completion_date = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_user_course_enrollment_user_course", "user_id", "course_id", unique=True),
    )


# Import at end to avoid circular imports
from sqlalchemy import Index
