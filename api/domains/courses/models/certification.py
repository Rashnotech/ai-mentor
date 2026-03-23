#!/usr/bin/python3
"""a module that handles certification model"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from db.base import Base


class Certificate(Base):
    __tablename__ = "certificates"
    certificate_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), index=True)
    path_id = Column(Integer, ForeignKey("learning_paths.path_id", ondelete="CASCADE"), index=True)
    issued_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    certificate_url = Column(String(255))
    is_public = Column(Boolean, default=True)

    # NOTE: Relationships commented to prevent circular imports
    # user = relationship("UserProfile", back_populates="certificates")
    # course = relationship("Course")
    # path = relationship("LearningPath")

class Badge(Base):
    __tablename__ = "badges"
    badge_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    badge_type = Column(String(50))  # 'speedrun', 'perfectionist', 'helper'
    awarded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    description = Column(Text)

    # NOTE: Relationships commented to prevent circular imports
    # user = relationship("UserProfile", back_populates="badges")
