#!/usr/bin/python3
"""
Pydantic schemas for JSON-based course import (create/update via JSON file).

Hierarchy:
    Course
    └── Track (LearningPath)
        └── Modules[]
            ├── Lessons[]
            ├── Projects[]
            └── Quizzes[]
"""
from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Quiz / Assessment schemas
# ---------------------------------------------------------------------------

class QuizInput(BaseModel):
    """Schema for a quiz question within a module."""

    question_text: str = Field(..., min_length=5, description="Question text/prompt")
    question_type: str = Field(
        ..., description="multiple_choice | debugging | coding | short_answer"
    )
    difficulty_level: str = Field(
        "INTERMEDIATE", description="BEGINNER | INTERMEDIATE | ADVANCED"
    )
    order: int = Field(..., ge=1, description="Display order in module")
    options: Optional[List[str]] = Field(
        None, description="Answer options for multiple_choice questions"
    )
    correct_answer: str = Field(..., description="Correct answer text; for multiple_choice, the text of the correct option")
    explanation: Optional[str] = Field(None, description="Explanation for the answer")
    points: int = Field(10, ge=1, le=100, description="Points awarded for correct answer")


# ---------------------------------------------------------------------------
# Lesson schemas
# ---------------------------------------------------------------------------

class LessonInput(BaseModel):
    """Schema for a lesson within a module."""

    title: str = Field(..., min_length=3, max_length=255, description="Lesson title")
    description: str = Field(..., min_length=10, description="Lesson description")
    content: Optional[str] = Field(None, description="Main lesson content/material")
    order: int = Field(..., ge=1, description="Display order in module")
    content_type: Optional[str] = Field(
        None, description="theory | coding | debugging | quiz"
    )
    estimated_minutes: Optional[int] = Field(None, ge=1, description="Estimated minutes")
    youtube_video_url: Optional[str] = Field(None, description="YouTube video URL")
    external_resources: Optional[List[str]] = Field(
        None, description="External resource links"
    )
    expected_outcomes: Optional[List[str]] = Field(
        None, description="What students will achieve by the end of this lesson"
    )
    starter_file_url: Optional[str] = Field(None, description="Starter file URL")
    solution_file_url: Optional[str] = Field(None, description="Solution file URL")


# ---------------------------------------------------------------------------
# Project schemas
# ---------------------------------------------------------------------------

class ProjectInput(BaseModel):
    """Schema for a project within a module."""

    title: str = Field(..., min_length=3, max_length=255, description="Project title")
    description: str = Field(..., min_length=10, description="Project description")
    order: int = Field(..., ge=1, description="Display order in module")
    estimated_hours: Optional[int] = Field(None, ge=1, description="Estimated hours")
    starter_repo_url: Optional[str] = Field(None, description="Starter repository URL")
    solution_repo_url: Optional[str] = Field(None, description="Solution repository URL")
    required_skills: Optional[List[str]] = Field(None, description="Required skills list")
    first_deadline_days: Optional[int] = Field(
        None, ge=1, description="Days to first deadline (100% points)"
    )
    second_deadline_days: Optional[int] = Field(
        None, ge=1, description="Days to second deadline (50% points)"
    )
    third_deadline_days: Optional[int] = Field(
        None, ge=1, description="Days to third deadline (25% points)"
    )


# ---------------------------------------------------------------------------
# Module schemas
# ---------------------------------------------------------------------------

class ModuleInput(BaseModel):
    """Schema for a module within a track."""

    module_name: str = Field(
        ..., min_length=3, max_length=255, description="Module name (unique within track)"
    )
    description: str = Field(..., min_length=10, description="Module description")
    order: int = Field(..., ge=1, description="Display order within track")
    estimated_hours: Optional[int] = Field(None, ge=1, description="Estimated hours")
    unlock_after_days: int = Field(
        0, ge=0, description="Days from registration before module unlocks"
    )
    is_available_by_default: bool = Field(
        True, description="True = immediately available; False = requires unlock"
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


# ---------------------------------------------------------------------------
# Track (LearningPath) schemas
# ---------------------------------------------------------------------------

class TrackInput(BaseModel):
    """Schema for a track (learning path) within a course."""

    track_name: str = Field(
        ..., min_length=3, max_length=255, description="Track name (unique within course)"
    )
    description: str = Field(..., min_length=10, description="Track description")
    price: Optional[float] = Field(0.00, ge=0, description="Price for this track (0 = free)")
    is_default: bool = Field(False, description="Whether this is the default track")
    min_skill_level: Optional[str] = Field(
        None, description="Minimum skill level (Beginner | Lower-Intermediate | Intermediate | Advanced)"
    )
    max_skill_level: Optional[str] = Field(
        None, description="Maximum skill level"
    )
    tags: Optional[List[str]] = Field(None, description="Descriptive tags")
    modules: List[ModuleInput] = Field(
        default_factory=list, description="Modules in this track"
    )


# ---------------------------------------------------------------------------
# Top-level Course input
# ---------------------------------------------------------------------------

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
    certificate_on_completion: bool = Field(
        False, description="Whether a certificate is awarded on completion"
    )
    track: TrackInput = Field(..., description="The track (learning path) for this course")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ItemCounts(BaseModel):
    """Counts of created vs updated items."""

    created: int = 0
    updated: int = 0


class JsonImportResponse(BaseModel):
    """Summary response returned after a JSON import operation."""

    action: str = Field(description="'created' or 'updated' for the course")
    course_id: int = Field(description="ID of the created/updated course")
    course_name: str = Field(description="Title of the course")
    track_action: str = Field(description="'created' or 'updated' for the track")
    track_id: int = Field(description="ID of the created/updated track")
    track_name: str = Field(description="Name of the track")
    modules: ItemCounts = Field(description="Module create/update counts")
    lessons: ItemCounts = Field(description="Lesson create/update counts")
    projects: ItemCounts = Field(description="Project create/update counts")
    quizzes: ItemCounts = Field(description="Quiz create/update counts")
