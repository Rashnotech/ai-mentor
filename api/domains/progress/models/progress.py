#!/usr/bin/python3
"""a module that handles progress tracking"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, CheckConstraint, Index
from sqlalchemy.sql.sqltypes import Text
from sqlalchemy.orm import relationship
from db.base import Base
from core.constant import ProgressStatus


class UserProgress(Base):
    __tablename__ = "user_progress"
    progress_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.lesson_id", ondelete="CASCADE"), index=True, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), index=True, nullable=True)
    status = Column(Enum(ProgressStatus), index=True)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    time_spent_seconds = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # NOTE: Removed relationship to avoid circular imports
    # Uncomment after UserProgress is properly configured
    # user = relationship("User", back_populates="progress")
    # lesson = relationship("Lesson", back_populates="progress")
    # project = relationship("Project", back_populates="progress")

    __table_args__ = (
        CheckConstraint("lesson_id IS NOT NULL OR project_id IS NOT NULL", name="check_lesson_or_project"),
        Index("idx_user_progress_status", "user_id", "status"),
    )

class PathAdjustment(Base):
    __tablename__ = "path_adjustments"
    adjustment_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    path_id = Column(Integer, ForeignKey("learning_paths.path_id", ondelete="CASCADE"), index=True)
    adjustment_type = Column(String(50))  # 'skip', 'add', 'reorder', 'custom_goal'
    target_module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="SET NULL"))
    target_lesson_id = Column(Integer, ForeignKey("lessons.lesson_id", ondelete="SET NULL"))
    target_project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="SET NULL"))
    reason = Column(Text)
    ai_reason = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    # NOTE: Removed relationships to avoid circular imports
    # user = relationship("User")
    # path = relationship("LearningPath", back_populates="adjustments")
    # target_module = relationship("Module")
    # target_lesson = relationship("Lesson")
    # target_project = relationship("Project")
