#!/usr/bin/python3
"""
Student enrollment and progress routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List

from auth.dependencies import get_current_user, get_db_session
from domains.courses.services.enrollment_service import EnrollmentService
from domains.courses.services.progress_service import ProgressService
from domains.courses.schemas.course_schema import (
    LessonCompletionRequest,
    AssessmentSubmissionRequest,
    AssessmentSubmissionResponse,
    ProjectSubmissionRequest,
    ProjectSubmissionResponse,
    ModuleProgressResponse,
    StudentCoursesListResponse,
    StudentProjectsListResponse,
    CourseReviewCreateRequest,
    CourseReviewUpdateRequest,
    CourseReviewResponse,
    CourseReviewsListResponse,
)
from domains.users.models.user import User, UserRole
from domains.courses.models.progress import ProjectSubmission
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enrollments", tags=["student-enrollment"])


@router.get(
    "/my-courses",
    response_model=StudentCoursesListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get my enrolled courses",
    description="Get courses the current student is enrolled in with progress, plus available courses",
)
async def get_my_courses(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get courses the current student is enrolled in (from onboarding) plus available courses.

    **Returns:**
    - enrolled: List of enrolled courses with progress information
    - available: List of courses available to enroll in
    """
    try:
        service = EnrollmentService(db_session)
        courses = await service.get_student_courses(current_user.get("user_id"))
        return courses

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting student courses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching courses",
        )


@router.get(
    "/my-projects",
    response_model=StudentProjectsListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get my projects",
    description="Get all projects from courses the student is enrolled in",
)
async def get_my_projects(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get all projects from the student's enrolled courses.

    **Returns:**
    - projects: List of projects with status and submission info
    - total_count: Total number of projects
    - completed_count: Number of approved/completed projects
    - in_progress_count: Number of projects in progress
    """
    try:
        service = EnrollmentService(db_session)
        projects = await service.get_student_projects(current_user.get("user_id"))
        return projects

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting student projects: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching projects",
        )


@router.get(
    "/courses/{course_id}/enrollment-status",
    status_code=status.HTTP_200_OK,
    summary="Check enrollment status",
    description="Check if current user is enrolled in a course",
)
async def check_enrollment_status(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Check if the current user is enrolled in a specific course.

    **Path Parameters:**
    - course_id: Course ID to check

    **Returns:**
    - is_enrolled: Boolean indicating enrollment status
    - path_id: Assigned learning path ID if enrolled
    - course_slug: Course slug for routing
    """
    try:
        from domains.users.models.onboarding import UserProfile
        from domains.courses.models.course import Course
        
        user_id = current_user.get("user_id")
        
        # Get course info
        course_stmt = select(Course).where(Course.course_id == course_id)
        course_result = await db_session.execute(course_stmt)
        course = course_result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        # Check user's profile for enrollment
        profile_stmt = select(UserProfile).where(UserProfile.user_id == user_id)
        profile_result = await db_session.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()
        
        is_enrolled = False
        path_id = None
        
        if profile:
            # Check if this course is the enrolled course
            if profile.selected_course_id:
                try:
                    enrolled_course_id = int(profile.selected_course_id)
                    if enrolled_course_id == course_id:
                        is_enrolled = True
                        path_id = profile.current_path_id
                except (ValueError, TypeError):
                    # Check if it's a slug match
                    if profile.selected_course_id == course.slug:
                        is_enrolled = True
                        path_id = profile.current_path_id
        
        return {
            "is_enrolled": is_enrolled,
            "course_id": course_id,
            "course_slug": course.slug,
            "path_id": path_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking enrollment status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking enrollment status",
        )


@router.get(
    "/courses/by-slug/{slug}/enrollment-status",
    status_code=status.HTTP_200_OK,
    summary="Check enrollment status by slug",
    description="Check if current user is enrolled in a course by slug",
)
async def check_enrollment_status_by_slug(
    slug: str,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Check if the current user is enrolled in a specific course by slug.
    """
    try:
        from domains.users.models.onboarding import UserProfile
        from domains.courses.models.course import Course
        
        user_id = current_user.get("user_id")
        
        # Get course by slug
        course_stmt = select(Course).where(Course.slug == slug)
        course_result = await db_session.execute(course_stmt)
        course = course_result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        # Check user's profile for enrollment
        profile_stmt = select(UserProfile).where(UserProfile.user_id == user_id)
        profile_result = await db_session.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()
        
        is_enrolled = False
        path_id = None
        
        if profile:
            if profile.selected_course_id:
                try:
                    enrolled_course_id = int(profile.selected_course_id)
                    if enrolled_course_id == course.course_id:
                        is_enrolled = True
                        path_id = profile.current_path_id
                except (ValueError, TypeError):
                    if profile.selected_course_id == slug:
                        is_enrolled = True
                        path_id = profile.current_path_id
        
        return {
            "is_enrolled": is_enrolled,
            "course_id": course.course_id,
            "course_slug": course.slug,
            "path_id": path_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking enrollment status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking enrollment status",
        )


@router.get(
    "/courses/by-slug/{slug}/learning-content",
    status_code=status.HTTP_200_OK,
    summary="Get learning content for enrolled course",
    description="Get full learning content (modules, lessons, projects) for a course the student is enrolled in",
)
async def get_learning_content_by_slug(
    slug: str,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get full learning content for an enrolled course by slug.
    
    **Path Parameters:**
    - slug: Course slug
    
    **Returns:**
    - Course info with title, description
    - Modules with lessons and projects
    - Progress info for each item
    
    **Requires:**
    - User must be enrolled in the course
    """
    try:
        from domains.users.models.onboarding import UserProfile
        from domains.courses.models.course import Course, LearningPath, Module, Lesson, Project
        from domains.courses.models.assessment import AssessmentQuestion, AssessmentResponse
        from domains.courses.models.progress import LessonProgress, ProjectSubmission  # Use correct tables
        from core.constant import SkillLevel, LearningMode
        
        user_id = current_user.get("user_id")
        
        # Get course by slug
        course_stmt = select(Course).where(Course.slug == slug, Course.is_active == True)
        course_result = await db_session.execute(course_stmt)
        course = course_result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        # Check enrollment and get user profile
        profile_stmt = select(UserProfile).where(UserProfile.user_id == user_id)
        profile_result = await db_session.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()
        
        is_enrolled = False
        path_id = None
        user_skill_level = None
        user_learning_mode = None
        
        if profile:
            user_skill_level = profile.skill_level
            user_learning_mode = profile.learning_mode
            
            if profile.selected_course_id:
                try:
                    enrolled_course_id = int(profile.selected_course_id)
                    if enrolled_course_id == course.course_id:
                        is_enrolled = True
                        path_id = profile.current_path_id
                except (ValueError, TypeError):
                    if profile.selected_course_id == slug:
                        is_enrolled = True
                        path_id = profile.current_path_id
        
        if not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this course",
            )
        
        # Determine the appropriate learning path
        path = None
        
        # For bootcamp mode, always use default path
        if user_learning_mode == LearningMode.BOOTCAMP:
            path_stmt = select(LearningPath).where(
                LearningPath.course_id == course.course_id,
                LearningPath.is_default == True
            )
            path_result = await db_session.execute(path_stmt)
            path = path_result.scalar_one_or_none()
        
        # If user has a saved path_id, try to use it
        elif path_id:
            path_stmt = select(LearningPath).where(LearningPath.path_id == path_id)
            path_result = await db_session.execute(path_stmt)
            path = path_result.scalar_one_or_none()
        
        # Check if user's skill level matches course difficulty - use default
        if not path and user_skill_level:
            # Map skill level to difficulty level for comparison
            skill_to_difficulty = {
                SkillLevel.BEGINNER: "BEGINNER",
                SkillLevel.LOWER_INTERMEDIATE: "BEGINNER",
                SkillLevel.INTERMEDIATE: "INTERMEDIATE",
                SkillLevel.ADVANCED: "ADVANCED",
            }
            user_difficulty = skill_to_difficulty.get(user_skill_level)
            
            if user_difficulty and course.difficulty_level and user_difficulty.upper() == course.difficulty_level.upper():
                # Skill matches difficulty, use default path
                path_stmt = select(LearningPath).where(
                    LearningPath.course_id == course.course_id,
                    LearningPath.is_default == True
                )
                path_result = await db_session.execute(path_stmt)
                path = path_result.scalar_one_or_none()
            else:
                # Try to find a path matching user's skill level
                all_paths_stmt = select(LearningPath).where(
                    LearningPath.course_id == course.course_id
                )
                all_paths_result = await db_session.execute(all_paths_stmt)
                all_paths = all_paths_result.scalars().all()
                
                for p in all_paths:
                    # Check if user's skill level falls within path's range
                    if p.min_skill_level and p.max_skill_level:
                        skill_order = [SkillLevel.BEGINNER, SkillLevel.LOWER_INTERMEDIATE, 
                                       SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED]
                        try:
                            user_idx = skill_order.index(user_skill_level)
                            min_idx = skill_order.index(p.min_skill_level)
                            max_idx = skill_order.index(p.max_skill_level)
                            if min_idx <= user_idx <= max_idx:
                                path = p
                                break
                        except ValueError:
                            continue
                    elif p.min_skill_level and p.min_skill_level == user_skill_level:
                        path = p
                        break
        
        # Fallback to default path
        if not path:
            path_stmt = select(LearningPath).where(
                LearningPath.course_id == course.course_id,
                LearningPath.is_default == True
            )
            path_result = await db_session.execute(path_stmt)
            path = path_result.scalar_one_or_none()
        
        # If still no path, try any path for this course
        if not path:
            path_stmt = select(LearningPath).where(LearningPath.course_id == course.course_id)
            path_result = await db_session.execute(path_stmt)
            path = path_result.scalars().first()
        
        if not path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No learning path found for this course",
            )
        
        # Update user's current_path_id if it changed
        if profile and profile.current_path_id != path.path_id:
            profile.current_path_id = path.path_id
            await db_session.commit()
        
        # Get modules for this path
        modules_stmt = select(Module).where(Module.path_id == path.path_id).order_by(Module.order)
        modules_result = await db_session.execute(modules_stmt)
        modules = modules_result.scalars().all()
        
        # Get lesson progress for the user (from lesson_progress table)
        lesson_progress_stmt = select(LessonProgress).where(
            LessonProgress.user_id == user_id,
            LessonProgress.completed == True
        )
        lesson_progress_result = await db_session.execute(lesson_progress_stmt)
        lesson_progress_records = lesson_progress_result.scalars().all()
        
        # Get project submissions for the user (to get solution_url and completion status)
        # Order by submitted_at descending so the dictionary keeps the most recent submission
        submissions_stmt = select(ProjectSubmission).where(
            ProjectSubmission.user_id == user_id
        ).order_by(ProjectSubmission.submitted_at.desc())
        submissions_result = await db_session.execute(submissions_stmt)
        submissions_records = submissions_result.scalars().all()
        # Build dict with most recent submission per project (first one in desc order)
        project_submissions = {}
        for sub in submissions_records:
            if sub.project_id not in project_submissions:
                project_submissions[sub.project_id] = sub
        
        # Create lookup for completed items from the correct tables
        completed_lessons = {p.lesson_id for p in lesson_progress_records}
        # Project is completed if it has a submission with status 'approved' or 'in_review' or 'submitted'
        completed_projects = {
            sub.project_id for sub in submissions_records 
            if sub.status in ['approved', 'submitted', 'in_review']
        }
        
        # Build modules with content
        modules_data = []
        total_lessons = 0
        completed_lessons_count = 0
        total_projects = 0
        completed_projects_count = 0
        
        for module in modules:
            # Get lessons
            lessons_stmt = select(Lesson).where(Lesson.module_id == module.module_id).order_by(Lesson.order)
            lessons_result = await db_session.execute(lessons_stmt)
            lessons = lessons_result.scalars().all()
            
            # Get projects
            projects_stmt = select(Project).where(Project.module_id == module.module_id).order_by(Project.order)
            projects_result = await db_session.execute(projects_stmt)
            projects = projects_result.scalars().all()
            
            # Get assessment questions (quiz)
            questions_stmt = select(AssessmentQuestion).where(AssessmentQuestion.module_id == module.module_id).order_by(AssessmentQuestion.order)
            questions_result = await db_session.execute(questions_stmt)
            questions = questions_result.scalars().all()
            
            # Get user's quiz responses for this module
            question_ids = [q.question_id for q in questions]
            user_responses = {}
            if question_ids:
                responses_stmt = select(AssessmentResponse).where(
                    AssessmentResponse.user_id == user_id,
                    AssessmentResponse.question_id.in_(question_ids)
                )
                responses_result = await db_session.execute(responses_stmt)
                for resp in responses_result.scalars().all():
                    user_responses[resp.question_id] = resp
            
            lessons_data = []
            for lesson in lessons:
                total_lessons += 1
                is_completed = lesson.lesson_id in completed_lessons
                if is_completed:
                    completed_lessons_count += 1
                lessons_data.append({
                    "lesson_id": lesson.lesson_id,
                    "title": lesson.title,
                    "description": lesson.description,
                    "content": lesson.content,
                    "order": lesson.order,
                    "content_type": lesson.content_type.value if lesson.content_type else None,
                    "content_url": lesson.youtube_video_url,
                    "youtube_video_url": lesson.youtube_video_url,
                    "external_resources": lesson.external_resources or [],
                    "expected_outcomes": lesson.expected_outcomes or [],
                    "estimated_minutes": lesson.estimated_minutes,
                    "is_completed": is_completed,
                })
            
            projects_data = []
            for project in projects:
                total_projects += 1
                is_completed = project.project_id in completed_projects
                if is_completed:
                    completed_projects_count += 1
                # Get submission data if project was submitted
                submission = project_submissions.get(project.project_id)
                submission_url = submission.solution_url if submission else None
                submission_status = submission.status if submission else None
                is_submitted = submission is not None
                projects_data.append({
                    "project_id": project.project_id,
                    "title": project.title,
                    "description": project.description,
                    "order": project.order,
                    "estimated_hours": project.estimated_hours,
                    "starter_repo_url": project.starter_repo_url,
                    "required_skills": project.required_skills or [],
                    "is_completed": is_completed,
                    "is_submitted": is_submitted,
                    "submission_url": submission_url,
                    "submission_status": submission_status,  # submitted, in_review, approved, rejected
                    "submitted_at": submission.submitted_at.isoformat() if submission and submission.submitted_at else None,
                    # Mentor review data
                    "reviewer_feedback": submission.reviewer_feedback if submission else None,
                    "reviewed_at": submission.reviewed_at.isoformat() if submission and submission.reviewed_at else None,
                    "points_earned": float(submission.points_earned) if submission and submission.points_earned else None,
                })
            
            # Build quiz data
            quiz_data = None
            if questions:
                quiz_questions = []
                answered_count = 0
                correct_count = 0
                for q in questions:
                    user_resp = user_responses.get(q.question_id)
                    is_answered = user_resp is not None
                    is_correct = user_resp.is_correct if user_resp else None
                    if is_answered:
                        answered_count += 1
                        if is_correct:
                            correct_count += 1
                    quiz_questions.append({
                        "question_id": q.question_id,
                        "question_text": q.question_text,
                        "question_type": q.question_type,
                        "difficulty_level": q.difficulty_level,
                        "order": q.order,
                        "options": q.options or [],
                        "points": q.points,
                        "user_answer": user_resp.response_text if user_resp else None,
                        "is_answered": is_answered,
                        "is_correct": is_correct,
                        # Include correct_answer and explanation after user has answered
                        "correct_answer": q.correct_answer if is_answered else None,
                        "explanation": q.explanation if is_answered else None,
                    })
                
                quiz_completed = answered_count == len(questions) and len(questions) > 0
                quiz_data = {
                    "total_questions": len(questions),
                    "answered_count": answered_count,
                    "correct_count": correct_count,
                    "is_completed": quiz_completed,
                    "score_percent": round((correct_count / len(questions) * 100)) if len(questions) > 0 else 0,
                    "questions": quiz_questions,
                }
            
            # Calculate module progress
            module_items = len(lessons_data) + len(projects_data)
            module_completed = sum(1 for l in lessons_data if l["is_completed"]) + sum(1 for p in projects_data if p["is_completed"])
            module_progress = round((module_completed / module_items * 100)) if module_items > 0 else 0
            
            modules_data.append({
                "module_id": module.module_id,
                "title": module.title,
                "description": module.description,
                "order": module.order,
                "estimated_hours": module.estimated_hours,
                "progress_percent": module_progress,
                "lessons": lessons_data,
                "projects": projects_data,
                "quiz": quiz_data,
            })
        
        # Calculate overall progress
        total_items = total_lessons + total_projects
        completed_items = completed_lessons_count + completed_projects_count
        overall_progress = round((completed_items / total_items * 100)) if total_items > 0 else 0
        
        return {
            "course": {
                "course_id": course.course_id,
                "title": course.title,
                "slug": course.slug,
                "description": course.description,
                "difficulty_level": course.difficulty_level,
                "estimated_hours": course.estimated_hours,
                "cover_image_url": course.cover_image_url,
            },
            "path": {
                "path_id": path.path_id,
                "title": path.title,
                "description": path.description,
            },
            "progress": {
                "total_lessons": total_lessons,
                "completed_lessons": completed_lessons_count,
                "total_projects": total_projects,
                "completed_projects": completed_projects_count,
                "overall_percent": overall_progress,
            },
            "modules": modules_data,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting learning content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching learning content",
        )


@router.post(
    "/courses/{course_id}",
    status_code=status.HTTP_200_OK,
    summary="Enroll in a course",
    description="Enroll a student in a course and assign personalized learning path based on onboarding profile",
)
async def enroll_in_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Enroll a student in a course.

    **Path Parameters:**
    - course_id: ID of the course to enroll in

    **Required:**
    - Student role (non-admin/mentor)
    - Completed onboarding (to get custom path)

    **Returns:**
    - Enrollment details
    - Course information
    - Assigned learning path with skill level matching

    **Process:**
    1. Verify course is active
    2. Match student's skill level/learning style to paths
    3. Assign custom path or default path
    4. Return path structure with modules, lessons, projects
    """
    try:
        # Ensure user is a student (not admin/mentor)
        if current_user.get('role') in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only students can enroll in courses",
            )

        service = EnrollmentService(db_session)
        enrollment = await service.enroll_student_in_course(
            student_id=current_user.get("user_id"),
            course_id=course_id,
        )

        return enrollment

    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error enrolling in course: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error enrolling in course",
        )


@router.get(
    "/courses/{course_id}",
    status_code=status.HTTP_200_OK,
    summary="Get learning path for course",
    description="Get the personalized learning path assigned to the student for a course",
)
async def get_course_path(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get the learning path assigned to the current student for a course.

    **Path Parameters:**
    - course_id: ID of the course

    **Returns:**
    - Learning path details
    - Modules with lessons and projects ordered
    - Content types and requirements
    - File/repo URLs

    **Path Structure:**
    ```
    Course
    └── Learning Path (custom or default)
        ├── Module 1
        │   ├── Lesson 1
        │   ├── Lesson 2
        │   └── Project 1
        └── Module 2
            ├── Lesson 3
            └── Project 2
    ```
    """
    try:
        service = EnrollmentService(db_session)
        path_info = await service.get_student_course_path(
            student_id=current_user.get("user_id"),
            course_id=course_id,
        )

        return path_info

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting course path: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching learning path",
        )


# Progress and Submission Routes
progress_router = APIRouter(prefix="/progress", tags=["student-progress"])


@progress_router.post(
    "/lessons/{lesson_id}/complete",
    status_code=status.HTTP_200_OK,
    summary="Mark lesson as completed",
    description="Mark a lesson as completed by the student",
)
async def complete_lesson(
    lesson_id: int,
    request: LessonCompletionRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Mark a lesson as completed.

    **Path Parameters:**
    - lesson_id: ID of the lesson

    **Request Body:**
    - time_spent_minutes: Time spent on lesson
    - notes: Optional student notes

    **Returns:**
    - Lesson progress record with updated course progress summary
    """
    try:
        from domains.courses.models.course import Lesson, Module, LearningPath
        from domains.courses.models.progress import LessonProgress
        
        user_id = current_user.get("user_id")
        
        service = ProgressService(db_session)
        progress = await service.mark_lesson_completed(
            user_id=user_id,
            lesson_id=lesson_id,
            time_spent_minutes=request.time_spent_minutes,
            notes=request.notes,
        )

        # Get lesson details to return module/path context
        lesson_stmt = select(Lesson).where(Lesson.lesson_id == lesson_id)
        lesson_result = await db_session.execute(lesson_stmt)
        lesson = lesson_result.scalar_one_or_none()
        
        # Calculate updated progress summary for the module
        module_progress = None
        if lesson and lesson.module_id:
            # Get total lessons in module
            total_lessons_stmt = select(func.count(Lesson.lesson_id)).where(Lesson.module_id == lesson.module_id)
            total_result = await db_session.execute(total_lessons_stmt)
            total_lessons = total_result.scalar() or 0
            
            # Get completed lessons in module for this user
            completed_stmt = select(func.count(LessonProgress.lesson_id)).join(
                Lesson, LessonProgress.lesson_id == Lesson.lesson_id
            ).where(
                LessonProgress.user_id == user_id,
                LessonProgress.completed == True,
                Lesson.module_id == lesson.module_id
            )
            completed_result = await db_session.execute(completed_stmt)
            completed_lessons = completed_result.scalar() or 0
            
            module_progress = {
                "module_id": lesson.module_id,
                "completed_lessons": completed_lessons,
                "total_lessons": total_lessons,
                "progress_percent": round((completed_lessons / total_lessons * 100)) if total_lessons > 0 else 0
            }

        return {
            "progress_id": progress.progress_id,
            "lesson_id": progress.lesson_id,
            "completed": progress.completed,
            "is_completed": progress.completed,  # Consistent naming
            "time_spent_minutes": progress.time_spent_minutes,
            "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
            "module_progress": module_progress,
        }

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error completing lesson: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error completing lesson",
        )


@progress_router.post(
    "/quiz/{question_id}/answer",
    status_code=status.HTTP_200_OK,
    summary="Submit quiz answer",
    description="Submit answer to a quiz question and verify against correct answer",
)
async def submit_quiz_answer(
    question_id: int,
    answer: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Submit a quiz answer and verify if it's correct.

    **Path Parameters:**
    - question_id: ID of the assessment question

    **Request Body:**
    - answer: The student's answer

    **Returns:**
    - is_correct: Whether the answer is correct
    - correct_answer: The correct answer (revealed after submission)
    - explanation: Explanation for the answer
    - points_earned: Points awarded for correct answer
    """
    try:
        from domains.courses.models.assessment import AssessmentQuestion, AssessmentResponse
        
        # Get the question from database
        result = await db_session.execute(
            select(AssessmentQuestion).where(AssessmentQuestion.question_id == question_id)
        )
        question = result.scalar_one_or_none()
        
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found",
            )
        
        # Check if answer is correct (case-insensitive comparison)
        is_correct = False
        correct_index = int(question.correct_answer)
        if question.correct_answer:
            # For multiple choice, compare exactly
            is_correct = answer.strip().lower() == question.options[correct_index].strip().lower()
        
        # Save the response
        user_id = current_user.get("user_id")
        
        # Check if response already exists
        existing_result = await db_session.execute(
            select(AssessmentResponse).where(
                AssessmentResponse.user_id == user_id,
                AssessmentResponse.question_id == question_id
            )
        )
        existing_response = existing_result.scalar_one_or_none()
        
        if existing_response:
            # Update existing response
            existing_response.response_text = answer
            existing_response.is_correct = is_correct
            existing_response.attempts = (existing_response.attempts or 0) + 1
        else:
            # Create new response
            new_response = AssessmentResponse(
                user_id=user_id,
                question_id=question_id,
                response_text=answer,
                is_correct=is_correct,
                time_taken_seconds=0,
                attempts=1,
            )
            db_session.add(new_response)
        
        await db_session.commit()
        
        return {
            "question_id": question_id,
            "is_correct": is_correct,
            "correct_answer": question.options[correct_index],
            "explanation": question.explanation,
            "points_earned": question.points if is_correct else 0,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting quiz answer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error submitting quiz answer",
        )


@progress_router.post(
    "/assessments/{question_id}/submit",
    response_model=AssessmentSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit assessment response",
    description="Submit answer to assessment question with deadline-based points",
)
async def submit_assessment(
    question_id: int,
    request: AssessmentSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Submit an assessment response.

    **Path Parameters:**
    - question_id: ID of the assessment question

    **Request Body:**
    - module_id: Module containing this assessment
    - response_text: Your answer
    - time_taken_seconds: Time spent answering
    - confidence_level: How confident you are (1-10)

    **Rewards (based on module deadlines):**
    - First deadline: 100 points
    - Second deadline: 50 points
    - Late submission: 0 points

    **Returns:**
    - Submission details with deadline status and points earned
    """
    try:
        service = ProgressService(db_session)
        submission = await service.submit_assessment(
            user_id=current_user.get("user_id"),
            question_id=question_id,
            module_id=request.module_id,
            response_text=request.response_text,
            time_taken_seconds=request.time_taken_seconds,
            confidence_level=request.confidence_level,
        )

        return AssessmentSubmissionResponse(
            submission_id=submission.submission_id,
            question_id=submission.question_id,
            module_id=submission.module_id,
            is_correct=submission.is_correct,
            deadline_status=submission.deadline_status.value,
            points_earned=submission.points_earned,
            submitted_at=submission.submitted_at.isoformat(),
        )

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error submitting assessment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error submitting assessment",
        )


@progress_router.post(
    "/projects/{project_id}/submit",
    response_model=ProjectSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit project solution",
    description="Submit solution URL for a project with deadline-based points",
)
async def submit_project(
    project_id: int,
    request: ProjectSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Submit a project solution.

    **Path Parameters:**
    - project_id: ID of the project

    **Request Body:**
    - module_id: Module containing this project
    - solution_url: URL to your solution (GitHub, Google Drive, etc.)
    - description: Optional description of your solution

    **Rewards (based on module deadlines, pending approval):**
    - First deadline: 100 points
    - Second deadline: 50 points
    - Late submission: 0 points

    **Note:** Points are provisional until mentor approves your submission.

    **Returns:**
    - Submission details with deadline status and points (pending approval)
    """
    try:
        service = ProgressService(db_session)
        submission = await service.submit_project(
            user_id=current_user.get("user_id"),
            project_id=project_id,
            module_id=request.module_id,
            solution_url=request.solution_url,
            description=request.description,
        )

        return ProjectSubmissionResponse(
            submission_id=submission.submission_id,
            project_id=submission.project_id,
            module_id=submission.module_id,
            solution_url=submission.solution_url,
            status=submission.status,
            is_approved=submission.is_approved,
            deadline_status=submission.deadline_status.value,
            points_earned=submission.points_earned,
            submitted_at=submission.submitted_at.isoformat(),
            reviewed_at=submission.reviewed_at.isoformat() if submission.reviewed_at else None,
        )

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error submitting project: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error submitting project",
        )


@progress_router.get(
    "/modules/{module_id}",
    response_model=ModuleProgressResponse,
    status_code=status.HTTP_200_OK,
    summary="Get module progress",
    description="View your progress in a module",
)
async def get_module_progress(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get your progress in a module.

    **Path Parameters:**
    - module_id: ID of the module

    **Returns:**
    - Lessons completed/total
    - Assessments passed/total
    - Projects approved/total
    - Total points earned
    """
    try:
        service = ProgressService(db_session)
        progress = await service.get_user_progress(
            user_id=current_user.get("user_id"),
            module_id=module_id,
        )

        return ModuleProgressResponse(**progress)

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting module progress: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching module progress",
        )


# ============================================================================
# COURSE REVIEWS
# ============================================================================

@router.post(
    "/reviews",
    response_model=CourseReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a course review",
    description="Submit a review and rating for an enrolled course",
)
async def create_course_review(
    request: CourseReviewCreateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Create a review for a course you're enrolled in.

    **Request Body:**
    - course_id: The course to review
    - rating: 1-5 stars
    - review_text: Optional review text
    - is_anonymous: Hide your name

    **Returns:**
    - Created review details
    """
    from domains.courses.services.review_service import ReviewService
    
    try:
        service = ReviewService(db_session)
        review = await service.create_review(
            user_id=current_user.get("user_id"),
            user_name=current_user.get("full_name", "Anonymous"),
            course_id=request.course_id,
            rating=request.rating,
            review_text=request.review_text,
            is_anonymous=request.is_anonymous,
        )
        return review

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating review",
        )


@router.get(
    "/reviews/course/{course_id}",
    response_model=CourseReviewsListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get course reviews",
    description="Get all reviews for a course",
)
async def get_course_reviews(
    course_id: int,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get all reviews for a course.

    **Path Parameters:**
    - course_id: The course ID

    **Returns:**
    - List of reviews
    - Average rating
    - Rating breakdown (count per star)
    """
    from domains.courses.services.review_service import ReviewService
    
    try:
        service = ReviewService(db_session)
        reviews = await service.get_course_reviews(course_id)
        return reviews

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting reviews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching reviews",
        )


@router.get(
    "/reviews/my-review/{course_id}",
    response_model=CourseReviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get my review for a course",
    description="Get the current user's review for a specific course",
)
async def get_my_course_review(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get your review for a specific course.

    **Path Parameters:**
    - course_id: The course ID

    **Returns:**
    - Your review if exists, or 404
    """
    from domains.courses.services.review_service import ReviewService
    
    try:
        service = ReviewService(db_session)
        review = await service.get_user_review(
            user_id=current_user.get("user_id"),
            course_id=course_id,
        )
        return review

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching review",
        )


@router.put(
    "/reviews/{review_id}",
    response_model=CourseReviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Update my review",
    description="Update your own course review",
)
async def update_course_review(
    review_id: int,
    request: CourseReviewUpdateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Update your own review.

    **Path Parameters:**
    - review_id: The review ID

    **Request Body:**
    - rating: Optional new rating
    - review_text: Optional new text
    - is_anonymous: Optional anonymity change

    **Returns:**
    - Updated review
    """
    from domains.courses.services.review_service import ReviewService
    
    try:
        service = ReviewService(db_session)
        review = await service.update_review(
            review_id=review_id,
            user_id=current_user.get("user_id"),
            rating=request.rating,
            review_text=request.review_text,
            is_anonymous=request.is_anonymous,
        )
        return review

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating review",
        )


@router.delete(
    "/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete my review",
    description="Delete your own course review",
)
async def delete_course_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Delete your own review.

    **Path Parameters:**
    - review_id: The review ID
    """
    from domains.courses.services.review_service import ReviewService
    
    try:
        service = ReviewService(db_session)
        await service.delete_review(
            review_id=review_id,
            user_id=current_user.get("user_id"),
        )

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error deleting review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting review",
        )


# ===== MODULE AVAILABILITY AND DEADLINE ENDPOINTS =====

@router.get(
    "/courses/{course_id}/module-availability",
    summary="Get my module availability",
    description="Get availability and deadlines for all modules in a course",
)
async def get_module_availability(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get the current user's module availability for a course.
    
    Shows which modules are unlocked, when locked modules will unlock,
    and user-specific deadlines for each module.

    **Path Parameters:**
    - course_id: The course ID

    **Returns:**
    - modules: List of modules with availability and deadline info
    - total_modules: Total module count
    - unlocked_count: Number of unlocked modules
    - locked_count: Number of locked modules
    """
    from domains.courses.jobs.module_availability_job import ModuleAvailabilityService
    from domains.courses.models.course import Module, LearningPath
    from domains.users.models.onboarding import UserProfile
    from datetime import datetime, timezone
    
    try:
        user_id = current_user.get("user_id")
        
        # Get user's assigned path for this course
        profile_stmt = select(UserProfile).where(UserProfile.user_id == user_id)
        profile_result = await db_session.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()
        
        if not profile or not profile.current_path_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No learning path assigned for this course",
            )
        
        # Verify path belongs to this course
        path_stmt = select(LearningPath).where(LearningPath.path_id == profile.current_path_id)
        path_result = await db_session.execute(path_stmt)
        path = path_result.scalar_one_or_none()
        
        if not path or path.course_id != course_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Not enrolled in this course",
            )
        
        # Get module availability service
        availability_service = ModuleAvailabilityService(db_session)
        availability_records = await availability_service.get_user_path_modules_availability(
            user_id=user_id,
            path_id=profile.current_path_id,
        )
        
        # Get all modules for the path
        modules_stmt = select(Module).where(Module.path_id == profile.current_path_id).order_by(Module.order)
        modules_result = await db_session.execute(modules_stmt)
        modules = modules_result.scalars().all()
        
        # Create availability map
        availability_map = {a.module_id: a for a in availability_records}
        
        now = datetime.now(timezone.utc)
        response_modules = []
        unlocked_count = 0
        
        for module in modules:
            avail = availability_map.get(module.module_id)
            
            is_unlocked = avail.is_unlocked if avail else module.is_available_by_default
            if is_unlocked:
                unlocked_count += 1
            
            days_until_unlock = None
            if avail and avail.scheduled_unlock_date and not avail.is_unlocked:
                delta = avail.scheduled_unlock_date - now
                days_until_unlock = max(0, delta.days)
            
            response_modules.append({
                "module_id": module.module_id,
                "module_title": module.title,
                "module_order": module.order,
                "path_id": module.path_id,
                "estimated_hours": module.estimated_hours,
                "is_unlocked": is_unlocked,
                "unlocked_at": avail.unlocked_at.isoformat() if avail and avail.unlocked_at else None,
                "scheduled_unlock_date": avail.scheduled_unlock_date.isoformat() if avail and avail.scheduled_unlock_date else None,
                "days_until_unlock": days_until_unlock,
                "first_deadline": avail.first_deadline.isoformat() if avail and avail.first_deadline else None,
                "second_deadline": avail.second_deadline.isoformat() if avail and avail.second_deadline else None,
                "third_deadline": avail.third_deadline.isoformat() if avail and avail.third_deadline else None,
                "first_deadline_days": module.first_deadline_days,
                "second_deadline_days": module.second_deadline_days,
                "third_deadline_days": module.third_deadline_days,
            })
        
        return {
            "modules": response_modules,
            "total_modules": len(modules),
            "unlocked_count": unlocked_count,
            "locked_count": len(modules) - unlocked_count,
        }

    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting module availability: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching module availability",
        )


@router.get(
    "/courses/{course_id}/enrollment-info",
    summary="Get my enrollment info",
    description="Get detailed enrollment information including timeline and expected completion",
)
async def get_enrollment_info(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get detailed enrollment information for a course.

    **Path Parameters:**
    - course_id: The course ID

    **Returns:**
    - Enrollment details with timeline and completion info
    """
    from domains.courses.models.progress import UserCourseEnrollment
    from domains.courses.models.course import Course
    from datetime import datetime, timezone
    
    try:
        user_id = current_user.get("user_id")
        
        # Get enrollment record
        stmt = select(UserCourseEnrollment).where(
            UserCourseEnrollment.user_id == user_id,
            UserCourseEnrollment.course_id == course_id,
        )
        result = await db_session.execute(stmt)
        enrollment = result.scalar_one_or_none()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Not enrolled in this course",
            )
        
        # Get course info
        course_stmt = select(Course).where(Course.course_id == course_id)
        course_result = await db_session.execute(course_stmt)
        course = course_result.scalar_one_or_none()
        
        now = datetime.now(timezone.utc)
        days_since_enrollment = (now - enrollment.enrolled_at).days if enrollment.enrolled_at else 0
        
        return {
            "enrollment_id": enrollment.enrollment_id,
            "course_id": enrollment.course_id,
            "course_title": course.title if course else None,
            "path_id": enrollment.path_id,
            "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            "started_learning_at": enrollment.started_learning_at.isoformat() if enrollment.started_learning_at else None,
            "expected_completion_date": enrollment.expected_completion_date.isoformat() if enrollment.expected_completion_date else None,
            "days_since_enrollment": days_since_enrollment,
            "is_active": enrollment.is_active,
            "completed_at": enrollment.completed_at.isoformat() if enrollment.completed_at else None,
        }

    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting enrollment info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching enrollment info",
        )


# Include progress routes
router.include_router(progress_router)
