#!/usr/bin/python3
"""a module that handles assessment-related database models"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from db.base import Base


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"
    question_id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="CASCADE"), index=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(20))  # 'multiple_choice', 'debugging', 'coding', 'short_answer'
    difficulty_level = Column(String(20))
    order = Column(Integer, nullable=False)
    options = Column(ARRAY(String(500)), nullable=True)  # For multiple choice
    correct_answer = Column(String(500), nullable=True)  # Correct answer or option index
    explanation = Column(Text, nullable=True)  # Explanation for the correct answer
    points = Column(Integer, default=10)  # Points awarded for correct answer
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # NOTE: Relationships commented to prevent circular imports
    # module = relationship("Module", back_populates="assessment_questions")
    # responses = relationship("AssessmentResponse", back_populates="question")

class AssessmentResponse(Base):
    __tablename__ = "assessment_responses"
    response_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question_id = Column(Integer, ForeignKey("assessment_questions.question_id", ondelete="CASCADE"), index=True)
    response_text = Column(Text)
    is_correct = Column(Boolean)
    time_taken_seconds = Column(Integer)
    attempts = Column(Integer, default=1)
    confidence_level = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # NOTE: Relationships commented to prevent circular imports
    # user = relationship("User")
    # question = relationship("AssessmentQuestion", back_populates="responses")

class BehavioralSignal(Base):
    __tablename__ = "behavioral_signals"
    signal_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    signal_type = Column(String(50), index=True)  # 'typing_speed', 'errors_before_run', etc.
    signal_value = Column(String(100))
    device_type = Column(String(20))
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_behavioral_signals_user", "user_id"),
        Index("idx_behavioral_signals_type", "signal_type"),
    )
