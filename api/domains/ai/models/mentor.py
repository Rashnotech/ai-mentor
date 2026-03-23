#!/usr/bin/python3
"""a module that handles mentor-related database models"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from api.db.base import Base


class AIPrompt(Base):
    __tablename__ = "ai_prompts"
    prompt_id = Column(Integer, primary_key=True, autoincrement=True)
    prompt_type = Column(String(50))  # 'hint', 'explanation', 'debugging', 'motivation'
    content = Column(Text, nullable=False)
    difficulty_level = Column(String(20))
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.lesson_id", ondelete="CASCADE"), index=True, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    course = relationship("Course")
    lesson = relationship("Lesson", back_populates="prompts")
    project = relationship("Project", back_populates="prompts")
    interactions = relationship("UserAIInteraction", back_populates="prompt")

class UserAIInteraction(Base):
    __tablename__ = "user_ai_interactions"
    interaction_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    prompt_id = Column(Integer, ForeignKey("ai_prompts.prompt_id", ondelete="SET NULL"))
    interaction_type = Column(String(50))  # 'request', 'response', 'feedback'
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    prompt = relationship("AIPrompt", back_populates="interactions")
