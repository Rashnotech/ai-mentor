#!/usr/bin/python3
"""
Pydantic schemas for course management endpoints.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from core.constant import SkillLevel, ContentType


# Course Schemas
class CourseCreateRequest(BaseModel):
    """Request to create a new course."""

    title: str = Field(..., min_length=3, max_length=255, description="Course title")
    description: str = Field(..., min_length=10, description="Course description")
    slug: str = Field(..., min_length=3, max_length=100, description="URL-friendly identifier")
    estimated_hours: int = Field(..., ge=1, description="Estimated completion hours")
    difficulty_level: str = Field(
        ..., description="BEGINNER, INTERMEDIATE, or ADVANCED"
    )
    cover_image_url: Optional[str] = Field(None, description="Cover image URL")
    prerequisites: Optional[List[str]] = Field(None, description="List of prerequisite topics/courses")
    what_youll_learn: Optional[List[str]] = Field(None, description="Learning outcomes - what students will learn")
    certificate_on_completion: bool = Field(False, description="Whether a certificate is awarded on completion")

    class Config:
        from_attributes = True


class CourseResponse(BaseModel):
    """Response schema for course."""

    course_id: int = Field(description="Course ID")
    title: str = Field(description="Course title")
    slug: str = Field(description="URL-friendly identifier")
    description: str = Field(description="Course description")
    estimated_hours: int = Field(description="Estimated completion hours")
    difficulty_level: str = Field(description="Difficulty level")
    is_active: bool = Field(description="Whether course is active")
    prerequisites: Optional[List[str]] = Field(None, description="List of prerequisites")
    what_youll_learn: Optional[List[str]] = Field(None, description="Learning outcomes")
    certificate_on_completion: bool = Field(False, description="Whether certificate is awarded")
    average_rating: Optional[float] = Field(None, description="Average rating (0-5)")
    total_reviews: int = Field(0, description="Total number of reviews")
    created_by: Optional[str] = Field(description="Creator user ID")
    created_at: str = Field(description="Creation timestamp")
    updated_at: str = Field(description="Last update timestamp")

    class Config:
        from_attributes = True


class CourseUpdateRequest(BaseModel):
    """Request to update a course."""

    title: Optional[str] = Field(None, min_length=3, max_length=255, description="Course title")
    description: Optional[str] = Field(None, min_length=10, description="Course description")
    slug: Optional[str] = Field(None, min_length=3, max_length=100, description="URL-friendly identifier")
    estimated_hours: Optional[int] = Field(None, ge=1, description="Estimated completion hours")
    difficulty_level: Optional[str] = Field(None, description="BEGINNER, INTERMEDIATE, or ADVANCED")
    cover_image_url: Optional[str] = Field(None, description="Cover image URL")
    is_active: Optional[bool] = Field(None, description="Whether course is active/published")
    prerequisites: Optional[List[str]] = Field(None, description="List of prerequisites")
    what_youll_learn: Optional[List[str]] = Field(None, description="Learning outcomes")
    certificate_on_completion: Optional[bool] = Field(None, description="Whether certificate is awarded")

    class Config:
        from_attributes = True


class CourseListResponse(BaseModel):
    """Response schema for course list with counts."""

    course_id: int = Field(description="Course ID")
    title: str = Field(description="Course title")
    slug: str = Field(description="URL-friendly identifier")
    description: str = Field(description="Course description")
    estimated_hours: int = Field(description="Estimated completion hours")
    difficulty_level: str = Field(description="Difficulty level")
    is_active: bool = Field(description="Whether course is active")
    paths_count: int = Field(description="Number of learning paths")
    modules_count: int = Field(description="Total number of modules")
    min_price: Optional[float] = Field(0.0, description="Minimum price across all learning paths (0 = free)")
    prerequisites: Optional[List[str]] = Field(None, description="List of prerequisites")
    what_youll_learn: Optional[List[str]] = Field(None, description="Learning outcomes")
    certificate_on_completion: bool = Field(False, description="Whether certificate is awarded")
    average_rating: Optional[float] = Field(None, description="Average rating (0-5)")
    total_reviews: int = Field(0, description="Total number of reviews")
    created_by: Optional[str] = Field(description="Creator user ID")
    created_at: str = Field(description="Creation timestamp")
    updated_at: str = Field(description="Last update timestamp")

    class Config:
        from_attributes = True


# Learning Path Schemas
class LearningPathCreateRequest(BaseModel):
    """Request to create a learning path."""

    course_id: int = Field(..., description="Parent course ID")
    title: str = Field(..., min_length=3, max_length=255, description="Path title")
    description: str = Field(..., min_length=10, description="Path description")
    price: Optional[float] = Field(0.00, ge=0, description="Price for this learning path")
    min_skill_level: Optional[SkillLevel] = Field(None, description="Minimum skill level")
    max_skill_level: Optional[SkillLevel] = Field(None, description="Maximum skill level")
    tags: Optional[List[str]] = Field(None, description="Descriptive tags")
    is_default: bool = Field(False, description="Set as default path for course")

    class Config:
        from_attributes = True


class LearningPathUpdateRequest(BaseModel):
    """Request to update a learning path."""

    title: Optional[str] = Field(None, min_length=3, max_length=255, description="Path title")
    description: Optional[str] = Field(None, min_length=10, description="Path description")
    price: Optional[float] = Field(None, ge=0, description="Price for this learning path")
    min_skill_level: Optional[SkillLevel] = Field(None, description="Minimum skill level")
    max_skill_level: Optional[SkillLevel] = Field(None, description="Maximum skill level")
    tags: Optional[List[str]] = Field(None, description="Descriptive tags")
    is_default: Optional[bool] = Field(None, description="Set as default path for course")

    class Config:
        from_attributes = True


class LearningPathResponse(BaseModel):
    """Response schema for learning path."""

    path_id: int = Field(description="Path ID")
    course_id: int = Field(description="Parent course ID")
    title: str = Field(description="Path title")
    description: str = Field(description="Path description")
    price: float = Field(default=0.00, description="Price for this learning path")
    is_default: bool = Field(description="Is default path")
    is_custom: bool = Field(description="Is custom user path")
    min_skill_level: Optional[str] = Field(None, description="Minimum skill level")
    max_skill_level: Optional[str] = Field(None, description="Maximum skill level")
    tags: List[str] = Field(description="Tags")
    created_by: Optional[str] = Field(description="Creator user ID")
    created_at: str = Field(description="Creation timestamp")
    updated_at: str = Field(description="Last update timestamp")

    class Config:
        from_attributes = True


# Module Schemas
class ModuleCreateRequest(BaseModel):
    """Request to create a module."""

    path_id: int = Field(..., description="Parent learning path ID")
    title: str = Field(..., min_length=3, max_length=255, description="Module title")
    description: str = Field(..., min_length=10, description="Module description")
    order: int = Field(..., ge=1, description="Display order")
    estimated_hours: Optional[int] = Field(None, ge=1, description="Estimated hours")
    
    # Module availability settings
    unlock_after_days: int = Field(0, ge=0, description="Days from registration to unlock this module")
    is_available_by_default: bool = Field(True, description="If True, module is immediately available")
    
    # Deadline configuration (days from module unlock)
    first_deadline_days: Optional[int] = Field(None, ge=1, description="Days to first deadline (100% points)")
    second_deadline_days: Optional[int] = Field(None, ge=1, description="Days to second deadline (50% points)")
    third_deadline_days: Optional[int] = Field(None, ge=1, description="Days to third deadline (25% points)")

    class Config:
        from_attributes = True


class ModuleUpdateRequest(BaseModel):
    """Request to update a module."""

    title: Optional[str] = Field(None, min_length=3, max_length=255, description="Module title")
    description: Optional[str] = Field(None, min_length=10, description="Module description")
    order: Optional[int] = Field(None, ge=1, description="Display order")
    estimated_hours: Optional[int] = Field(None, ge=1, description="Estimated hours")
    
    # Module availability settings
    unlock_after_days: Optional[int] = Field(None, ge=0, description="Days from registration to unlock this module")
    is_available_by_default: Optional[bool] = Field(None, description="If True, module is immediately available")
    
    # Deadline configuration (days from module unlock)
    first_deadline_days: Optional[int] = Field(None, ge=1, description="Days to first deadline (100% points)")
    second_deadline_days: Optional[int] = Field(None, ge=1, description="Days to second deadline (50% points)")
    third_deadline_days: Optional[int] = Field(None, ge=1, description="Days to third deadline (25% points)")

    class Config:
        from_attributes = True


class ModuleResponse(BaseModel):
    """Response schema for module."""

    module_id: int = Field(description="Module ID")
    path_id: int = Field(description="Parent path ID")
    title: str = Field(description="Module title")
    description: str = Field(description="Module description")
    order: int = Field(description="Display order")
    estimated_hours: Optional[int] = Field(None, description="Estimated hours")
    
    # Module availability settings
    unlock_after_days: int = Field(0, description="Days from registration to unlock this module")
    is_available_by_default: bool = Field(True, description="If True, module is immediately available")
    
    # Deadline configuration (days from module unlock)
    first_deadline_days: Optional[int] = Field(None, description="Days to first deadline (100% points)")
    second_deadline_days: Optional[int] = Field(None, description="Days to second deadline (50% points)")
    third_deadline_days: Optional[int] = Field(None, description="Days to third deadline (25% points)")
    
    created_at: str = Field(description="Creation timestamp")
    updated_at: str = Field(description="Last update timestamp")

    class Config:
        from_attributes = True


# Lesson Schemas
class LessonCreateRequest(BaseModel):
    """Request to create a lesson."""

    module_id: int = Field(..., description="Parent module ID")
    title: str = Field(..., min_length=3, max_length=255, description="Lesson title")
    description: str = Field(..., min_length=10, description="Lesson description")
    content: Optional[str] = Field(None, description="Main lesson content/material")
    order: int = Field(..., ge=1, description="Display order")
    content_type: Optional[ContentType] = Field(None, description="Content type")
    estimated_minutes: Optional[int] = Field(None, ge=1, description="Estimated minutes")
    youtube_video_url: Optional[str] = Field(None, description="YouTube video URL")
    external_resources: Optional[List[str]] = Field(None, description="External resource links")
    expected_outcomes: Optional[List[str]] = Field(None, description="What's expected at end of lesson")
    starter_file_url: Optional[str] = Field(None, description="Starter file URL")
    solution_file_url: Optional[str] = Field(None, description="Solution file URL")

    class Config:
        from_attributes = True


class LessonUpdateRequest(BaseModel):
    """Request to update a lesson."""

    title: Optional[str] = Field(None, min_length=3, max_length=255, description="Lesson title")
    description: Optional[str] = Field(None, min_length=10, description="Lesson description")
    content: Optional[str] = Field(None, description="Main lesson content/material")
    order: Optional[int] = Field(None, ge=1, description="Display order")
    content_type: Optional[ContentType] = Field(None, description="Content type")
    estimated_minutes: Optional[int] = Field(None, ge=1, description="Estimated minutes")
    youtube_video_url: Optional[str] = Field(None, description="YouTube video URL")
    external_resources: Optional[List[str]] = Field(None, description="External resource links")
    expected_outcomes: Optional[List[str]] = Field(None, description="What's expected at end of lesson")
    starter_file_url: Optional[str] = Field(None, description="Starter file URL")
    solution_file_url: Optional[str] = Field(None, description="Solution file URL")

    class Config:
        from_attributes = True


class LessonResponse(BaseModel):
    """Response schema for lesson."""

    lesson_id: int = Field(description="Lesson ID")
    module_id: int = Field(description="Parent module ID")
    title: str = Field(description="Lesson title")
    description: str = Field(description="Lesson description")
    content: Optional[str] = Field(None, description="Main lesson content/material")
    order: int = Field(description="Display order")
    content_type: Optional[str] = Field(None, description="Content type")
    estimated_minutes: Optional[int] = Field(None, description="Estimated minutes")
    youtube_video_url: Optional[str] = Field(None, description="YouTube video URL")
    external_resources: Optional[List[str]] = Field(None, description="External resource links")
    expected_outcomes: Optional[List[str]] = Field(None, description="What's expected at end of lesson")
    starter_file_url: Optional[str] = Field(None, description="Starter file URL")
    solution_file_url: Optional[str] = Field(None, description="Solution file URL")
    created_at: str = Field(description="Creation timestamp")
    updated_at: str = Field(description="Last update timestamp")

    class Config:
        from_attributes = True


# Project Schemas
class ProjectCreateRequest(BaseModel):
    """Request to create a project."""

    module_id: int = Field(..., description="Parent module ID")
    title: str = Field(..., min_length=3, max_length=255, description="Project title")
    description: str = Field(..., min_length=10, description="Project description")
    order: int = Field(..., ge=1, description="Display order")
    estimated_hours: Optional[int] = Field(None, ge=1, description="Estimated hours")
    starter_repo_url: Optional[str] = Field(None, description="Starter repo URL")
    solution_repo_url: Optional[str] = Field(None, description="Solution repo URL")
    required_skills: Optional[List[str]] = Field(None, description="Required skills")
    
    # Deadline configuration (days from project assignment)
    first_deadline_days: Optional[int] = Field(None, ge=1, description="Days to first deadline (100% points)")
    second_deadline_days: Optional[int] = Field(None, ge=1, description="Days to second deadline (50% points)")
    third_deadline_days: Optional[int] = Field(None, ge=1, description="Days to third deadline (25% points)")

    class Config:
        from_attributes = True


class ProjectUpdateRequest(BaseModel):
    """Request to update a project."""

    title: Optional[str] = Field(None, min_length=3, max_length=255, description="Project title")
    description: Optional[str] = Field(None, min_length=10, description="Project description")
    order: Optional[int] = Field(None, ge=1, description="Display order")
    estimated_hours: Optional[int] = Field(None, ge=1, description="Estimated hours")
    starter_repo_url: Optional[str] = Field(None, description="Starter repo URL")
    solution_repo_url: Optional[str] = Field(None, description="Solution repo URL")
    required_skills: Optional[List[str]] = Field(None, description="Required skills")
    
    # Deadline configuration (days from project assignment)
    first_deadline_days: Optional[int] = Field(None, ge=1, description="Days to first deadline (100% points)")
    second_deadline_days: Optional[int] = Field(None, ge=1, description="Days to second deadline (50% points)")
    third_deadline_days: Optional[int] = Field(None, ge=1, description="Days to third deadline (25% points)")

    class Config:
        from_attributes = True


class ProjectResponse(BaseModel):
    """Response schema for project."""

    project_id: int = Field(description="Project ID")
    module_id: int = Field(description="Parent module ID")
    title: str = Field(description="Project title")
    description: str = Field(description="Project description")
    order: int = Field(description="Display order")
    estimated_hours: Optional[int] = Field(None, description="Estimated hours")
    starter_repo_url: Optional[str] = Field(None, description="Starter repo URL")
    solution_repo_url: Optional[str] = Field(None, description="Solution repo URL")
    required_skills: List[str] = Field(default=[], description="Required skills")
    
    # Deadline configuration (days from project assignment)
    first_deadline_days: Optional[int] = Field(None, description="Days to first deadline (100% points)")
    second_deadline_days: Optional[int] = Field(None, description="Days to second deadline (50% points)")
    third_deadline_days: Optional[int] = Field(None, description="Days to third deadline (25% points)")
    
    created_at: str = Field(description="Creation timestamp")
    updated_at: str = Field(description="Last update timestamp")

    class Config:
        from_attributes = True


# Composite Schemas
class PathStructureResponse(BaseModel):
    """Complete course structure with modules, lessons, and projects."""

    path: LearningPathResponse = Field(description="Learning path")
    modules_count: int = Field(description="Total modules")
    lessons_count: int = Field(description="Total lessons")
    projects_count: int = Field(description="Total projects")

    class Config:
        from_attributes = True


# Submission Schemas
class LessonCompletionRequest(BaseModel):
    """Request to mark lesson as completed."""

    time_spent_minutes: int = Field(..., ge=0, description="Time spent on lesson")
    notes: Optional[str] = Field(None, description="Optional student notes")

    class Config:
        from_attributes = True


class AssessmentSubmissionRequest(BaseModel):
    """Request to submit assessment response."""

    module_id: int = Field(..., description="Module ID")
    response_text: str = Field(..., min_length=1, description="Student's response")
    time_taken_seconds: int = Field(..., ge=0, description="Time taken to answer")
    confidence_level: Optional[int] = Field(None, ge=1, le=10, description="Confidence level 1-10")

    class Config:
        from_attributes = True


class AssessmentSubmissionResponse(BaseModel):
    """Response for assessment submission."""

    submission_id: int = Field(description="Submission ID")
    question_id: int = Field(description="Question ID")
    module_id: int = Field(description="Module ID")
    is_correct: Optional[bool] = Field(None, description="Whether answer is correct")
    deadline_status: str = Field(description="first_deadline, second_deadline, or late")
    points_earned: float = Field(description="Points awarded")
    submitted_at: str = Field(description="Submission timestamp")

    class Config:
        from_attributes = True


class ProjectSubmissionRequest(BaseModel):
    """Request to submit project solution."""

    module_id: int = Field(..., description="Module ID")
    solution_url: str = Field(..., min_length=5, description="URL to project solution")
    description: Optional[str] = Field(None, description="Description of solution")

    class Config:
        from_attributes = True


class ProjectSubmissionResponse(BaseModel):
    """Response for project submission."""

    submission_id: int = Field(description="Submission ID")
    project_id: int = Field(description="Project ID")
    module_id: int = Field(description="Module ID")
    solution_url: str = Field(description="Solution URL")
    status: str = Field(description="submitted, in_review, approved, or rejected")
    is_approved: bool = Field(description="Whether approved")
    deadline_status: str = Field(description="first_deadline, second_deadline, or late")
    points_earned: float = Field(description="Points awarded/pending")
    submitted_at: str = Field(description="Submission timestamp")
    reviewed_at: Optional[str] = Field(None, description="Review timestamp if reviewed")

    class Config:
        from_attributes = True


class ModuleProgressResponse(BaseModel):
    """Response for module progress."""

    module_id: int = Field(description="Module ID")
    lessons: dict = Field(description="Lessons completed/total")
    assessments: dict = Field(description="Assessments passed/total")
    projects: dict = Field(description="Projects approved/total")
    total_points: float = Field(description="Total points earned")
    module_completed: bool = Field(description="Whether module is completed")

    class Config:
        from_attributes = True


# Assessment Schemas
class AssessmentQuestionCreateRequest(BaseModel):
    """Request to create an assessment question in a module."""

    module_id: int = Field(..., description="Module ID")
    question_text: str = Field(..., min_length=5, description="Question text/prompt")
    question_type: str = Field(
        ..., description="multiple_choice, debugging, coding, or short_answer"
    )
    difficulty_level: str = Field(
        "INTERMEDIATE", description="BEGINNER, INTERMEDIATE, or ADVANCED"
    )
    order: int = Field(..., ge=1, description="Display order in module")
    options: Optional[List[str]] = Field(None, description="Answer options for multiple choice")
    correct_answer: str = Field(..., description="Correct answer or correct option")
    explanation: Optional[str] = Field(None, description="Explanation for the answer")
    points: int = Field(10, ge=1, le=100, description="Points awarded for correct answer")

    class Config:
        json_schema_extra = {
            "example": {
                "module_id": 1,
                "question_text": "What is the capital of France?",
                "question_type": "multiple_choice",
                "difficulty_level": "BEGINNER",
                "order": 1,
                "options": ["Paris", "London", "Berlin", "Madrid"],
                "correct_answer": "Paris",
                "explanation": "Paris is the capital and largest city of France.",
                "points": 10,
            }
        }


class AssessmentQuestionUpdateRequest(BaseModel):
    """Request to update an assessment question."""

    question_text: Optional[str] = Field(None, min_length=5, description="Question text/prompt")
    question_type: Optional[str] = Field(
        None, description="multiple_choice, debugging, coding, or short_answer"
    )
    difficulty_level: Optional[str] = Field(
        None, description="BEGINNER, INTERMEDIATE, or ADVANCED"
    )
    order: Optional[int] = Field(None, ge=1, description="Display order in module")
    options: Optional[List[str]] = Field(None, description="Answer options for multiple choice")
    correct_answer: Optional[str] = Field(None, description="Correct answer or correct option")
    explanation: Optional[str] = Field(None, description="Explanation for the answer")
    points: Optional[int] = Field(None, ge=1, le=100, description="Points awarded for correct answer")

    class Config:
        json_schema_extra = {
            "example": {
                "question_text": "What is the capital of Germany?",
                "correct_answer": "Berlin",
                "points": 15,
            }
        }


class AssessmentQuestionResponse(BaseModel):
    """Response for assessment question."""

    question_id: int = Field(description="Question ID")
    module_id: int = Field(description="Module ID")
    question_text: str = Field(description="Question text")
    question_type: str = Field(description="Question type")
    difficulty_level: str = Field(description="Difficulty level")
    order: int = Field(description="Display order")
    options: Optional[List[str]] = Field(None, description="Answer options")
    correct_answer: str = Field(description="Correct answer")
    explanation: Optional[str] = Field(None, description="Answer explanation")
    points: int = Field(description="Points available")
    created_at: str = Field(description="Creation timestamp")
    updated_at: str = Field(description="Last update timestamp")

    class Config:
        from_attributes = True


# Badge and Certificate Schemas
class BadgeResponse(BaseModel):
    """Response for badge."""

    badge_id: int = Field(description="Badge ID")
    badge_type: str = Field(description="Badge type (speedrun, perfectionist, etc)")
    description: str = Field(description="Badge description")
    awarded_at: str = Field(description="Award timestamp")

    class Config:
        from_attributes = True


class CertificateResponse(BaseModel):
    """Response for certificate."""

    certificate_id: int = Field(description="Certificate ID")
    course_id: int = Field(description="Course ID")
    path_id: int = Field(description="Path ID")
    issued_at: str = Field(description="Issue timestamp")
    certificate_url: str = Field(description="Certificate URL")
    is_public: bool = Field(description="Whether certificate is publicly visible")

    class Config:
        from_attributes = True


class UserRewardsSummaryResponse(BaseModel):
    """Response for user rewards summary."""

    total_points: float = Field(description="Total points earned")
    badge_count: int = Field(description="Number of badges")
    certificate_count: int = Field(description="Number of certificates")
    badges: List[BadgeResponse] = Field(description="List of badges")
    certificates: List[CertificateResponse] = Field(description="List of certificates")

    class Config:
        from_attributes = True


# Student Course Schemas
class StudentCourseResponse(BaseModel):
    """Response schema for student's enrolled course with progress."""

    course_id: int = Field(description="Course ID")
    title: str = Field(description="Course title")
    slug: str = Field(description="URL-friendly identifier")
    description: str = Field(description="Course description")
    cover_image_url: Optional[str] = Field(None, description="Cover image URL")
    difficulty_level: str = Field(description="Difficulty level")
    estimated_hours: int = Field(description="Estimated completion hours")
    progress_percent: int = Field(description="Progress percentage (0-100)")
    total_modules: int = Field(description="Total number of modules")
    completed_modules: int = Field(description="Number of completed modules")
    total_lessons: int = Field(description="Total number of lessons")
    completed_lessons: int = Field(description="Number of completed lessons")
    path_id: Optional[int] = Field(None, description="Assigned learning path ID")
    path_title: Optional[str] = Field(None, description="Learning path title")
    enrolled_at: Optional[str] = Field(None, description="Enrollment timestamp")
    last_accessed_at: Optional[str] = Field(None, description="Last access timestamp")

    class Config:
        from_attributes = True


class AvailableCourseResponse(BaseModel):
    """Response schema for available courses (not enrolled)."""

    course_id: int = Field(description="Course ID")
    title: str = Field(description="Course title")
    slug: str = Field(description="URL-friendly identifier")
    description: str = Field(description="Course description")
    cover_image_url: Optional[str] = Field(None, description="Cover image URL")
    difficulty_level: str = Field(description="Difficulty level")
    estimated_hours: int = Field(description="Estimated completion hours")
    path_id: Optional[int] = Field(None, description="Default learning path ID")
    path_title: Optional[str] = Field(None, description="Default learning path title")

    class Config:
        from_attributes = True


class StudentCoursesListResponse(BaseModel):
    """Response schema for student's courses list."""

    enrolled: List[StudentCourseResponse] = Field(description="Enrolled courses with progress")
    available: List[AvailableCourseResponse] = Field(description="Available courses to explore")

    class Config:
        from_attributes = True


# Student Project Schemas
class StudentProjectResponse(BaseModel):
    """Response schema for a project in the student's enrolled course."""

    project_id: int = Field(description="Project ID")
    title: str = Field(description="Project title")
    description: str = Field(description="Project description")
    order: int = Field(description="Display order in module")
    estimated_hours: Optional[int] = Field(None, description="Estimated hours to complete")
    starter_repo_url: Optional[str] = Field(None, description="Starter repository URL")
    solution_repo_url: Optional[str] = Field(None, description="Solution repository URL")
    required_skills: List[str] = Field(default=[], description="Required skills/technologies")
    
    # Module info
    module_id: int = Field(description="Parent module ID")
    module_title: str = Field(description="Parent module title")
    
    # Course info
    course_id: int = Field(description="Course ID")
    course_title: str = Field(description="Course title")
    course_slug: str = Field(description="Course slug for URL routing")
    
    # Progress info
    status: str = Field(description="Project status: not_started, in_progress, submitted, approved, rejected")
    submission_url: Optional[str] = Field(None, description="Student's submission URL if submitted")
    submitted_at: Optional[str] = Field(None, description="Submission timestamp")
    reviewer_feedback: Optional[str] = Field(None, description="Reviewer feedback if reviewed")

    class Config:
        from_attributes = True


class StudentProjectsListResponse(BaseModel):
    """Response schema for student's projects list."""

    projects: List[StudentProjectResponse] = Field(description="All projects from enrolled courses")
    total_count: int = Field(description="Total number of projects")
    completed_count: int = Field(description="Number of completed/approved projects")
    in_progress_count: int = Field(description="Number of projects in progress")

    class Config:
        from_attributes = True


# Course Review Schemas
class CourseReviewCreateRequest(BaseModel):
    """Request to create a course review."""

    course_id: int = Field(..., description="Course ID to review")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    review_text: Optional[str] = Field(None, max_length=2000, description="Optional review text")
    is_anonymous: bool = Field(False, description="Whether to hide reviewer name")

    class Config:
        from_attributes = True


class CourseReviewUpdateRequest(BaseModel):
    """Request to update a course review."""

    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating from 1 to 5 stars")
    review_text: Optional[str] = Field(None, max_length=2000, description="Optional review text")
    is_anonymous: Optional[bool] = Field(None, description="Whether to hide reviewer name")

    class Config:
        from_attributes = True


class CourseReviewResponse(BaseModel):
    """Response schema for a course review."""

    review_id: int = Field(description="Review ID")
    course_id: int = Field(description="Course ID")
    user_id: Optional[str] = Field(None, description="Reviewer user ID (null if anonymous)")
    user_name: Optional[str] = Field(None, description="Reviewer name (null if anonymous)")
    rating: int = Field(description="Rating from 1 to 5")
    review_text: Optional[str] = Field(None, description="Review text")
    is_anonymous: bool = Field(description="Whether reviewer is anonymous")
    created_at: str = Field(description="Creation timestamp")
    updated_at: str = Field(description="Last update timestamp")

    class Config:
        from_attributes = True


class CourseReviewsListResponse(BaseModel):
    """Response schema for course reviews list."""

    reviews: List[CourseReviewResponse] = Field(description="List of reviews")
    total_count: int = Field(description="Total number of reviews")
    average_rating: float = Field(description="Average rating for the course")
    rating_breakdown: Optional[dict] = Field(description="Count of each rating (1-5)")

    class Config:
        from_attributes = True


# User Module Availability Schemas
class UserModuleAvailabilityResponse(BaseModel):
    """Response schema for user's module availability with computed deadlines."""

    module_id: int = Field(description="Module ID")
    module_title: str = Field(description="Module title")
    module_order: int = Field(description="Module display order")
    path_id: int = Field(description="Learning path ID")
    
    # Availability status
    is_unlocked: bool = Field(description="Whether the module is currently unlocked")
    unlocked_at: Optional[str] = Field(None, description="When the module was unlocked")
    scheduled_unlock_date: Optional[str] = Field(None, description="When the module will be unlocked")
    days_until_unlock: Optional[int] = Field(None, description="Days until module unlocks (if locked)")
    
    # User-specific deadlines (calculated from unlock date)
    first_deadline: Optional[str] = Field(None, description="First deadline timestamp (100% points)")
    second_deadline: Optional[str] = Field(None, description="Second deadline timestamp (50% points)")
    third_deadline: Optional[str] = Field(None, description="Third deadline timestamp (25% points)")
    
    # Deadline days (from module config, for display)
    first_deadline_days: Optional[int] = Field(None, description="Days to first deadline from unlock")
    second_deadline_days: Optional[int] = Field(None, description="Days to second deadline from unlock")
    third_deadline_days: Optional[int] = Field(None, description="Days to third deadline from unlock")

    class Config:
        from_attributes = True


class UserModuleAvailabilityListResponse(BaseModel):
    """Response schema for user's module availability list."""

    modules: List[UserModuleAvailabilityResponse] = Field(description="List of module availability info")
    total_modules: int = Field(description="Total number of modules")
    unlocked_count: int = Field(description="Number of unlocked modules")
    locked_count: int = Field(description="Number of locked modules")

    class Config:
        from_attributes = True


class UserCourseEnrollmentResponse(BaseModel):
    """Response schema for user's course enrollment with timeline info."""

    enrollment_id: int = Field(description="Enrollment ID")
    course_id: int = Field(description="Course ID")
    course_title: str = Field(description="Course title")
    path_id: Optional[int] = Field(None, description="Learning path ID")
    
    # Timeline
    enrolled_at: str = Field(description="Enrollment timestamp")
    started_learning_at: Optional[str] = Field(None, description="When user started first module")
    expected_completion_date: Optional[str] = Field(None, description="Expected completion date")
    days_since_enrollment: int = Field(description="Days since enrollment")
    
    # Status
    is_active: bool = Field(description="Whether enrollment is active")
    completed_at: Optional[str] = Field(None, description="Completion timestamp if completed")

    class Config:
        from_attributes = True


class ModuleWithAvailabilityResponse(BaseModel):
    """Module response with user-specific availability and deadline info."""

    # Module details
    module_id: int = Field(description="Module ID")
    path_id: int = Field(description="Parent path ID")
    title: str = Field(description="Module title")
    description: str = Field(description="Module description")
    order: int = Field(description="Display order")
    estimated_hours: Optional[int] = Field(None, description="Estimated hours")
    
    # Availability info (user-specific)
    is_unlocked: bool = Field(description="Whether module is unlocked for this user")
    unlocked_at: Optional[str] = Field(None, description="When unlocked for this user")
    scheduled_unlock_date: Optional[str] = Field(None, description="When it will unlock")
    
    # User-specific deadlines
    first_deadline: Optional[str] = Field(None, description="User's first deadline")
    second_deadline: Optional[str] = Field(None, description="User's second deadline")
    third_deadline: Optional[str] = Field(None, description="User's third deadline")
    
    # Deadline config (for display purposes)
    first_deadline_days: Optional[int] = Field(None, description="Days to first deadline")
    second_deadline_days: Optional[int] = Field(None, description="Days to second deadline")
    third_deadline_days: Optional[int] = Field(None, description="Days to third deadline")

    class Config:
        from_attributes = True


class ProjectWithDeadlineResponse(BaseModel):
    """Project response with user-specific deadline info."""

    # Project details
    project_id: int = Field(description="Project ID")
    module_id: int = Field(description="Parent module ID")
    title: str = Field(description="Project title")
    description: str = Field(description="Project description")
    order: int = Field(description="Display order")
    estimated_hours: Optional[int] = Field(None, description="Estimated hours")
    starter_repo_url: Optional[str] = Field(None, description="Starter repo URL")
    solution_repo_url: Optional[str] = Field(None, description="Solution repo URL")
    required_skills: List[str] = Field(default=[], description="Required skills")
    
    # Deadline config
    first_deadline_days: Optional[int] = Field(None, description="Days to first deadline")
    second_deadline_days: Optional[int] = Field(None, description="Days to second deadline")
    third_deadline_days: Optional[int] = Field(None, description="Days to third deadline")
    
    # User-specific deadlines (calculated from module unlock)
    first_deadline: Optional[str] = Field(None, description="User's first deadline")
    second_deadline: Optional[str] = Field(None, description="User's second deadline")
    third_deadline: Optional[str] = Field(None, description="User's third deadline")
    
    # Status
    is_module_unlocked: bool = Field(description="Whether parent module is unlocked")

    class Config:
        from_attributes = True

