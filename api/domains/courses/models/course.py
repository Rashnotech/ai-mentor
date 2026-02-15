#!/usr/bin/python3
"""a module that handles course and learning path models"""
from datetime import datetime, timezone
from db.base import Base
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum, Index, Numeric
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from core.constant import SkillLevel, ContentType


class Course(Base):
    __tablename__ = "courses"
    course_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    cover_image_url = Column(String(255))
    estimated_hours = Column(Integer)
    difficulty_level = Column(String(20))
    is_active = Column(Boolean, default=True)
    
    # New fields
    prerequisites = Column(ARRAY(String(255)), nullable=True)  # List of prerequisite topics/courses
    what_youll_learn = Column(ARRAY(String(255)), nullable=True)  # Learning outcomes
    certificate_on_completion = Column(Boolean, default=False)  # Whether a certificate is awarded
    
    # Rating aggregates (cached for performance)
    average_rating = Column(Integer, default=0)  # Average rating * 10 (e.g., 45 = 4.5 stars)
    total_reviews = Column(Integer, default=0)  # Total number of reviews
    
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # NOTE: Relationships commented to prevent circular imports
    # paths = relationship("LearningPath", back_populates="course", cascade="all, delete-orphan")
    # questions = relationship("AssessmentQuestion", back_populates="course", cascade="all, delete-orphan")
    # content = relationship("UserContent", back_populates="course")
    # reviews = relationship("CourseReview", back_populates="course", cascade="all, delete-orphan")


class CourseReview(Base):
    """Student reviews and ratings for courses"""
    __tablename__ = "course_reviews"
    review_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    review_text = Column(Text, nullable=True)
    is_anonymous = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=True)  # For moderation
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # NOTE: Relationships commented to prevent circular imports
    # course = relationship("Course", back_populates="reviews")
    # user = relationship("User")

    __table_args__ = (
        Index("idx_course_reviews_course", "course_id"),
        Index("idx_course_reviews_user", "user_id"),
        Index("idx_course_reviews_course_user", "course_id", "user_id", unique=True),  # One review per user per course
    )

class LearningPath(Base):
    __tablename__ = "learning_paths"
    path_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=True, default=0.00)
    is_default = Column(Boolean, default=False, index=True)
    is_custom = Column(Boolean, default=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    min_skill_level = Column(Enum(SkillLevel), nullable=True)
    max_skill_level = Column(Enum(SkillLevel), nullable=True)
    tags = Column(ARRAY(String(50)), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # NOTE: Relationships commented to prevent circular imports
    # course = relationship("Course", back_populates="paths")
    # modules = relationship("Module", back_populates="path", cascade="all, delete-orphan", order_by="Module.order")
    # users = relationship("UserProfile", back_populates="current_path")
    # adjustments = relationship("PathAdjustment", back_populates="path")

    __table_args__ = (
        Index("idx_learning_paths_course", "course_id"),
        Index("idx_learning_paths_is_default", "is_default", postgresql_where=(is_default == True)),
    )

class Module(Base):
    __tablename__ = "modules"
    module_id = Column(Integer, primary_key=True, autoincrement=True)
    path_id = Column(Integer, ForeignKey("learning_paths.path_id", ondelete="CASCADE"), index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    order = Column(Integer, nullable=False)
    estimated_hours = Column(Integer)
    
    # Module availability settings (days from course start/registration)
    unlock_after_days = Column(Integer, default=0, nullable=False)  # Days from registration to unlock this module
    is_available_by_default = Column(Boolean, default=True)  # If True, available immediately; if False, requires unlock job
    
    # Deadline configuration (days from module unlock/start)
    first_deadline_days = Column(Integer, nullable=True)  # Days to first deadline (100% points)
    second_deadline_days = Column(Integer, nullable=True)  # Days to second deadline (50% points)
    third_deadline_days = Column(Integer, nullable=True)  # Days to third deadline (25% points)
    
    # Legacy datetime fields (now computed per user)
    first_deadline = Column(DateTime(timezone=True), nullable=True)
    second_deadline = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # NOTE: Relationships commented to prevent circular imports
    # path = relationship("LearningPath", back_populates="modules")
    # lessons = relationship("Lesson", back_populates="module", cascade="all, delete-orphan", order_by="Lesson.order")
    # projects = relationship("Project", back_populates="module", cascade="all, delete-orphan", order_by="Project.order")

    __table_args__ = (
        Index("idx_modules_path", "path_id"),
    )

class Lesson(Base):
    __tablename__ = "lessons"
    lesson_id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="CASCADE"), index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    content = Column(Text, nullable=True)  # Main lesson content/material
    content_type = Column(Enum(ContentType), nullable=True)
    order = Column(Integer, nullable=False)
    estimated_minutes = Column(Integer)
    youtube_video_url = Column(String(500), nullable=True)  # YouTube video link
    external_resources = Column(ARRAY(String(500)), nullable=True)  # External resource links
    expected_outcomes = Column(ARRAY(String(500)), nullable=True)  # What's expected at end of lesson
    starter_file_url = Column(String(255))
    solution_file_url = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # NOTE: Relationships commented to prevent circular imports
    # module = relationship("Module", back_populates="lessons")
    # progress = relationship("UserProgress", back_populates="lesson")
    # prompts = relationship("AIPrompt", back_populates="lesson")

    __table_args__ = (
        Index("idx_lessons_module_order", "module_id", "order"),
    )

class Project(Base):
    __tablename__ = "projects"
    project_id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="CASCADE"), index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    order = Column(Integer, nullable=False)
    estimated_hours = Column(Integer)
    starter_repo_url = Column(String(255))
    solution_repo_url = Column(String(255))
    required_skills = Column(ARRAY(String(50)), nullable=True)
    
    # Project-specific deadline configuration (days from project assignment)
    first_deadline_days = Column(Integer, nullable=True)  # Days to first deadline (100% points)
    second_deadline_days = Column(Integer, nullable=True)  # Days to second deadline (50% points)
    third_deadline_days = Column(Integer, nullable=True)  # Days to third deadline (25% points)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # NOTE: Relationships commented to prevent circular imports
    # module = relationship("Module", back_populates="projects")
    # progress = relationship("UserProgress", back_populates="project")
    # prompts = relationship("AIPrompt", back_populates="project")

    __table_args__ = (
        Index("idx_projects_module_order", "module_id", "order"),
        Index("idx_projects_required_skills", "required_skills", postgresql_using="gin"),
    )
