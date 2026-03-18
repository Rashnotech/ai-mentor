#!/usr/bin/python3
"""
Pydantic schemas for JSON-based course import (create/update via JSON file).

Hierarchy:
    Course
    └── LearningPath
        └── Modules[]
            ├── Lessons[]
            ├── Projects[]
            └── Quizzes[]
"""
from typing import Optional, List
from pydantic import BaseModel, Field

from domains.courses.schemas.course_schema import (
    LessonCreateRequest,
    ProjectCreateRequest,
    AssessmentQuestionCreateRequest,
)


class QuizInput(AssessmentQuestionCreateRequest):
    """Schema for a quiz question within a module."""

    module_id: Optional[int] = None
    difficulty_level: Optional[str] = Field(
        None, description="BEGINNER | INTERMEDIATE | ADVANCED"
    )
    points: Optional[int] = Field(None, ge=1, le=100, description="Points awarded for correct answer")


class LessonInput(LessonCreateRequest):
    """Schema for a lesson within a module."""

    module_id: Optional[int] = None


class ProjectInput(ProjectCreateRequest):
    """Schema for a project within a module."""

    module_id: Optional[int] = None


class ModuleInput(BaseModel):
    """Schema for a module within a learning path."""

    module_name: str = Field(
        ..., min_length=3, max_length=255, description="Module name (unique within learning path)"
    )
    description: str = Field(..., min_length=10, description="Module description")
    order: int = Field(..., ge=1, description="Display order within learning path")
    estimated_hours: Optional[int] = Field(None, ge=1, description="Estimated hours")
    unlock_after_days: Optional[int] = Field(
        None, ge=0, description="Days from registration before module unlocks"
    )
    is_available_by_default: Optional[bool] = Field(
        None, description="True = immediately available; False = requires unlock"
    )
    first_deadline_days: Optional[int] = Field(
        None, ge=1, description="Days to first deadline (100% points)"
    )
    second_deadline_days: Optional[int] = Field(
        None, ge=1, description="Days to second deadline (50% points)"
    )
    third_deadline_days: Optional[int] = Field(
        None, ge=1, description="Days to third deadline (25% points)"
    )
    lessons: Optional[List[LessonInput]] = Field(
        default_factory=list, description="Lessons in this module"
    )
    projects: Optional[List[ProjectInput]] = Field(
        default_factory=list, description="Projects in this module"
    )
    quizzes: Optional[List[QuizInput]] = Field(
        default_factory=list, description="Quiz questions in this module"
    )


class LearningPathInput(BaseModel):
    """Schema for a learning path within a course."""

    learning_path_name: str = Field(
        ..., min_length=3, max_length=255, description="Learning path name (unique within course)"
    )
    description: str = Field(..., min_length=10, description="Learning path description")
    price: Optional[float] = Field(0.00, ge=0, description="Price for this learning path (0 = free)")
    is_default: Optional[bool] = Field(None, description="Whether this is the default learning path")
    min_skill_level: Optional[str] = Field(
        None, description="Minimum skill level (Beginner | Lower-Intermediate | Intermediate | Advanced)"
    )
    max_skill_level: Optional[str] = Field(
        None, description="Maximum skill level"
    )
    tags: Optional[List[str]] = Field(None, description="Descriptive tags")
    modules: List[ModuleInput] = Field(
        default_factory=list, description="Modules in this learning path"
    )


class CourseJsonInput(BaseModel):
    """
    Top-level schema for JSON-based course create/update.

    If a course with the given ``course_name`` (title) does not exist it will
    be created.  If it already exists its fields will be updated using the
    supplied values.
    """

    course_name: str = Field(
        ..., min_length=3, max_length=255, description="Course title (used as unique identifier)"
    )
    slug: str = Field(
        ..., min_length=3, max_length=100,
        description="URL-friendly slug (required for new courses; must be unique)"
    )
    description: str = Field(..., min_length=10, description="Course description")
    estimated_hours: int = Field(..., ge=1, description="Estimated completion hours")
    difficulty_level: str = Field(
        ..., description="BEGINNER | INTERMEDIATE | ADVANCED"
    )
    cover_image_url: Optional[str] = Field(None, description="Cover image URL")
    prerequisites: Optional[List[str]] = Field(
        None, description="Prerequisite topics or courses"
    )
    what_youll_learn: Optional[List[str]] = Field(
        None, description="Learning outcomes"
    )
    certificate_on_completion: Optional[bool] = Field(
        None, description="Whether a certificate is awarded on completion"
    )
    learning_path: LearningPathInput = Field(..., description="The learning path for this course")


class ItemCounts(BaseModel):
    """Counts of created vs updated items."""

    created: int = 0
    updated: int = 0


class JsonImportResponse(BaseModel):
    """Summary response returned after a JSON import operation."""

    action: str = Field(description="'created' or 'updated' for the course")
    course_id: int = Field(description="ID of the created/updated course")
    course_name: str = Field(description="Title of the course")
    learning_path_action: str = Field(description="'created' or 'updated' for the learning path")
    learning_path_id: int = Field(description="ID of the created/updated learning path")
    learning_path_name: str = Field(description="Name of the learning path")
    modules: ItemCounts = Field(description="Module create/update counts")
    lessons: ItemCounts = Field(description="Lesson create/update counts")
    projects: ItemCounts = Field(description="Project create/update counts")
    quizzes: ItemCounts = Field(description="Quiz create/update counts")
