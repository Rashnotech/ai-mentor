"""Database models for learning surveys and student feedback."""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)

from db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    survey_type = Column(String(50), nullable=False, index=True)
    trigger_type = Column(String(50), nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default="true", index=True)
    priority = Column(Integer, nullable=False, default=0, server_default="0")
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class SurveyQuestion(Base):
    __tablename__ = "survey_questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)
    question_key = Column(String(100), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(30), nullable=False)
    options = Column(JSON, nullable=False, default=list)
    is_required = Column(Boolean, nullable=False, default=True, server_default="true")
    order = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        UniqueConstraint("survey_id", "question_key", name="uq_survey_question_key"),
        Index("idx_survey_questions_order", "survey_id", "order"),
    )


class SurveyResponse(Base):
    __tablename__ = "survey_responses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="SET NULL"), nullable=True, index=True)
    path_id = Column(Integer, ForeignKey("learning_paths.path_id", ondelete="SET NULL"), nullable=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("user_course_enrollments.enrollment_id", ondelete="SET NULL"), nullable=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="SET NULL"), nullable=True, index=True)
    cycle_key = Column(String(150), nullable=False)
    responses_json = Column(JSON, nullable=False, default=dict)
    submitted_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        UniqueConstraint(
            "user_id", "survey_id", "enrollment_id", "cycle_key",
            name="uq_survey_response_cycle",
        ),
        Index("idx_survey_responses_filters", "survey_id", "course_id", "submitted_at"),
    )


class UserSurveyEvent(Base):
    __tablename__ = "user_survey_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)
    enrollment_id = Column(Integer, ForeignKey("user_course_enrollments.enrollment_id", ondelete="SET NULL"), nullable=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="SET NULL"), nullable=True)
    cycle_key = Column(String(150), nullable=False)
    status = Column(String(20), nullable=False, default="shown", server_default="shown", index=True)
    shown_at = Column(DateTime(timezone=True), nullable=True, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    skipped_at = Column(DateTime(timezone=True), nullable=True)
    dismissed_at = Column(DateTime(timezone=True), nullable=True)
    next_eligible_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        UniqueConstraint(
            "user_id", "survey_id", "enrollment_id", "cycle_key",
            name="uq_user_survey_event_cycle",
        ),
        Index("idx_user_survey_events_cooldown", "user_id", "shown_at", "next_eligible_at"),
    )
