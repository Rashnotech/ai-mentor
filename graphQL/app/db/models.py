#!/usr/bin/python3
"""a model for the user table"""
from sqlalchemy import String, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.auth.roles import Role
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    email: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str]
    role: Mapped[str] = mapped_column(default=Role.STUDENT.value)
    courses = relationship("Course")



class Course(Base):
    __tablename__ = "courses"


    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    description: Mapped[str]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    
    modules = relationship("Module", back_populates="course")



class Module(Base):

    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    order: Mapped[int]
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"))

    course = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    content: Mapped[str]
    order: Mapped[int]
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id"))

    module = relationship("Module", back_populates="lessons")


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True)

    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    answer: Mapped[str]

    feedback = relationship("AIFeedback", uselist=False)


class AIFeedback(Base):
    __tablename__ = "ai_feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"))
    score: Mapped[int]
    feedback: Mapped[str]


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"))
    completed: Mapped[bool] = mapped_column(default=False)
    score: Mapped[int] = mapped_column(default=0)
    time_spend: Mapped[int] = mapped_column(default=0)  # in seconds
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())


class ModuleProgress(Base):
    __tablename__ = "module_progress"


    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id"))
    completed: Mapped[bool] = mapped_column(default=False)
    progress_percent: Mapped[int] = mapped_column(default=0)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())


class CourseProgress(Base):
    __tablename__ = "course_progress"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"))
    completed: Mapped[bool] = mapped_column(default=False)
    progress_percent: Mapped[int] = mapped_column(default=0)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())