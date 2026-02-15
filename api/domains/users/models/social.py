#!/usr/bin/python3
"""a module that handles social and community-related database models"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, Index, Boolean
from sqlalchemy.orm import relationship
from db.base import Base


# CommunityChannel has been moved to domains.community.models
# Import from there instead: from domains.community.models import CommunityChannel


class UserConnection(Base):
    __tablename__ = "user_connections"
    connection_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    connected_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    connection_type = Column(String(20))  # 'mentor', 'peer', 'friend'
    created_at = Column(DateTime, default=datetime.utcnow)

    # NOTE: Removed relationships to avoid circular imports
    # user = relationship("UserProfile", back_populates="connections", foreign_keys=[user_id])
    # connected_user = relationship("UserProfile", back_populates="connected_to", foreign_keys=[connected_user_id])

    __table_args__ = (
        CheckConstraint("user_id != connected_user_id", name="check_not_self_connection"),
    )

class UserContent(Base):
    __tablename__ = "user_content"
    content_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), index=True, nullable=True)
    lesson_id = Column(Integer, ForeignKey("lessons.lesson_id", ondelete="CASCADE"), index=True, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), index=True, nullable=True)
    content_type = Column(String(20))  # 'question', 'note', 'solution', 'feedback'
    title = Column(String(255))
    body = Column(Text)
    visibility = Column(String(20))  # 'private', 'public', 'course_only'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # NOTE: Removed relationships to avoid circular imports
    # author = relationship("UserProfile", back_populates="content")
    # course = relationship("Course", back_populates="content")
    # lesson = relationship("Lesson")
    project = relationship("Project")
    reactions = relationship("ContentReaction", back_populates="content")

    __table_args__ = (
        Index("idx_user_content_public", "user_id", "visibility", postgresql_where=(visibility == "public")),
    )

class ContentReaction(Base):
    __tablename__ = "content_reactions"
    reaction_id = Column(Integer, primary_key=True, autoincrement=True)
    content_id = Column(Integer, ForeignKey("user_content.content_id", ondelete="CASCADE"), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    reaction_type = Column(String(20))  # 'like', 'upvote', 'bookmark'
    created_at = Column(DateTime, default=datetime.utcnow)

    content = relationship("UserContent", back_populates="reactions")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("content_id", "user_id", name="uq_content_reaction"),
    )
