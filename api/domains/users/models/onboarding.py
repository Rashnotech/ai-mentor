#!/usr/bin/python3
"""a module that handles onboarding-related user models"""
from datetime import datetime, timezone
from core.constant import SkillLevel, LearningStyle, LearningMode, UserGoal
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum, JSON, Index, Text, Numeric
from sqlalchemy.orm import relationship
from db.base import Base


class MentorAvailability(str, Enum):
    """Mentor availability status"""
    AVAILABLE = "available"
    BUSY = "busy"
    UNAVAILABLE = "unavailable"


class MentorProfile(Base):
    """Mentor-specific profile information"""
    __tablename__ = "mentor_profiles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    title = Column(String(255), nullable=True)  # e.g., "Senior Data Scientist"
    company = Column(String(255), nullable=True)  # e.g., "Google"
    expertise = Column(JSON, default=list)  # ["Python", "Machine Learning", "TensorFlow"]
    languages = Column(JSON, default=list)  # ["English", "Mandarin"]
    hourly_rate = Column(Numeric(10, 2), nullable=True)  # e.g., 150.00
    availability = Column(String(20), default="available")  # available, busy, unavailable
    timezone = Column(String(50), default="UTC")
    years_experience = Column(Integer, nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    github_url = Column(String(255), nullable=True)
    website_url = Column(String(255), nullable=True)
    
    # Stats (can be computed but cached here for performance)
    total_sessions = Column(Integer, default=0)
    total_students = Column(Integer, default=0)
    rating = Column(Numeric(3, 2), default=0.00)  # e.g., 4.85
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_mentor_availability", "availability"),
    )


class UserProfile(Base):
    __tablename__ = "user_profiles"
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    onboarding_completed = Column(Boolean, default=False)
    onboarding_completed_at = Column(DateTime(timezone=True), nullable=True)
    skill_level = Column(Enum(SkillLevel), nullable=True, index=True)
    learning_mode = Column(Enum(LearningMode), nullable=True, index=True)
    learning_style = Column(Enum(LearningStyle), nullable=True, index=True)
    primary_goal = Column(Enum(UserGoal), nullable=True, index=True)
    selected_course_id = Column(String(100), nullable=True)
    behavioral_signals = Column(JSON, default=dict)
    current_path_id = Column(Integer, ForeignKey("learning_paths.path_id", ondelete="SET NULL"), nullable=True)
    preferred_language = Column(String(10), default="en")
    timezone = Column(String(50), default="UTC")
    notification_preferences = Column(JSON, default=dict)
    last_active_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # NOTE: Relationships commented to prevent circular imports
    # user = relationship("User", back_populates="profile")
    # current_path = relationship("LearningPath", back_populates="users")
    # connections = relationship("UserConnection", back_populates="user", foreign_keys="UserConnection.user_id")
    # connected_to = relationship("UserConnection", back_populates="connected_user", foreign_keys="UserConnection.connected_user_id")
    # content = relationship("UserContent", back_populates="author")
    # certificates = relationship("Certificate", back_populates="user")
    # badges = relationship("Badge", back_populates="user")

    __table_args__ = (
        Index("idx_user_profiles_skill_goal", "skill_level", "primary_goal"),
    )
