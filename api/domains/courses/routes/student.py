#!/usr/bin/python3
"""
Student enrollment and progress routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
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
    EnrollInCourseRequest,
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
        from domains.courses.models.course import Course
        from domains.courses.models.progress import UserCourseEnrollment
        from domains.payments.models import EnrollmentStatus
        from domains.users.models.onboarding import UserProfile
        
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
        
        is_enrolled = False
        path_id = None

        enrollment_stmt = select(UserCourseEnrollment).where(
            UserCourseEnrollment.user_id == user_id,
            UserCourseEnrollment.course_id == course_id,
            UserCourseEnrollment.enrollment_status == EnrollmentStatus.ACTIVE,
            UserCourseEnrollment.is_active == True,
        )
        enrollment_result = await db_session.execute(enrollment_stmt)
        enrollment = enrollment_result.scalar_one_or_none()

        if enrollment:
            is_enrolled = True
            path_id = enrollment.path_id
        
        if not is_enrolled:
            # Legacy fallback for older accounts that predate enrollment rows.
            profile_stmt = select(UserProfile).where(UserProfile.user_id == user_id)
            profile_result = await db_session.execute(profile_stmt)
            profile = profile_result.scalar_one_or_none()

        if not is_enrolled and profile:
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
        from domains.courses.models.course import Course
        from domains.courses.models.progress import UserCourseEnrollment
        from domains.payments.models import EnrollmentStatus
        from domains.users.models.onboarding import UserProfile
        
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
        
        is_enrolled = False
        path_id = None

        enrollment_stmt = select(UserCourseEnrollment).where(
            UserCourseEnrollment.user_id == user_id,
            UserCourseEnrollment.course_id == course.course_id,
            UserCourseEnrollment.enrollment_status == EnrollmentStatus.ACTIVE,
            UserCourseEnrollment.is_active == True,
        )
        enrollment_result = await db_session.execute(enrollment_stmt)
        enrollment = enrollment_result.scalar_one_or_none()

        if enrollment:
            is_enrolled = True
            path_id = enrollment.path_id
        
        if not is_enrolled:
            # Legacy fallback for older accounts that predate enrollment rows.
            profile_stmt = select(UserProfile).where(UserProfile.user_id == user_id)
            profile_result = await db_session.execute(profile_stmt)
            profile = profile_result.scalar_one_or_none()

        if not is_enrolled and profile:
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
    preview: bool = Query(False, description="Allow mentors and admins to preview course content without enrollment"),
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
        from domains.courses.models.progress import LessonProgress, ProjectSubmission, UserCourseEnrollment  # Use correct tables
        from core.constant import SkillLevel, LearningMode
        from domains.payments.models import EnrollmentStatus
        
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
        is_preview_mode = preview and current_user.get("role") in [UserRole.ADMIN, UserRole.MENTOR]

        enrollment_stmt = select(UserCourseEnrollment).where(
            UserCourseEnrollment.user_id == user_id,
            UserCourseEnrollment.course_id == course.course_id,
            UserCourseEnrollment.enrollment_status == EnrollmentStatus.ACTIVE,
            UserCourseEnrollment.is_active == True,
        )
        enrollment_result = await db_session.execute(enrollment_stmt)
        enrollment = enrollment_result.scalar_one_or_none()

        if enrollment:
            is_enrolled = True
            path_id = enrollment.path_id
        
        if profile:
            user_skill_level = profile.skill_level
            user_learning_mode = profile.learning_mode
            
            if not is_enrolled and profile.selected_course_id:
                try:
                    enrolled_course_id = int(profile.selected_course_id)
                    if enrolled_course_id == course.course_id:
                        is_enrolled = True
                        path_id = profile.current_path_id
                except (ValueError, TypeError):
                    if profile.selected_course_id == slug:
                        is_enrolled = True
                        path_id = profile.current_path_id
        
        if not is_enrolled and not is_preview_mode:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this course",
            )

        if not is_preview_mode:
            from domains.users.services.activity_service import touch_last_active
            await touch_last_active(db_session, user_id)

        # Determine the appropriate learning path
        path = None

        # Always prioritize the user-selected/saved path when available.
        if path_id:
            path_stmt = select(LearningPath).where(
                LearningPath.path_id == path_id,
                LearningPath.course_id == course.course_id,
            )
            path_result = await db_session.execute(path_stmt)
            path = path_result.scalar_one_or_none()

        # If no saved path exists, use default for bootcamp mode.
        if not path and user_learning_mode == LearningMode.BOOTCAMP:
            path_stmt = select(LearningPath).where(
                LearningPath.course_id == course.course_id,
                LearningPath.is_default == True
            )
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
        if profile and profile.current_path_id != path.path_id and not is_preview_mode:
            profile.current_path_id = path.path_id
            await db_session.commit()
        
        # Get modules for this path
        modules_stmt = select(Module).where(Module.path_id == path.path_id).order_by(Module.order)
        modules_result = await db_session.execute(modules_stmt)
        modules = modules_result.scalars().all()
        
        # Get lesson progress for the user (from lesson_progress table)
        if is_preview_mode:
            lesson_progress_records = []
        else:
            lesson_progress_stmt = select(LessonProgress).where(
                LessonProgress.user_id == user_id,
                LessonProgress.completed == True
            )
            lesson_progress_result = await db_session.execute(lesson_progress_stmt)
            lesson_progress_records = lesson_progress_result.scalars().all()
        
        # Get project submissions for the user (to get solution_url and completion status)
        # Order by submitted_at descending so the dictionary keeps the most recent submission
        if is_preview_mode:
            submissions_records = []
        else:
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
            if question_ids and not is_preview_mode:
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
            
            from domains.courses.services.project_milestone_service import (
                build_project_milestones,
                get_completed_milestones_map,
            )

            milestones_map = await get_completed_milestones_map(
                db_session,
                user_id,
                [p.project_id for p in projects],
            )
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
                milestones = build_project_milestones(project)
                valid_milestone_ids = {m["id"] for m in milestones}
                completed_milestone_ids = [
                    m for m in milestones_map.get(project.project_id, []) if m in valid_milestone_ids
                ]
                projects_data.append({
                    "project_id": project.project_id,
                    "submission_id": submission.submission_id if submission else None,  # Add submission_id for updates
                    "module_id": module.module_id,
                    "title": project.title,
                    "description": project.description,
                    "order": project.order,
                    "estimated_hours": project.estimated_hours,
                    "starter_repo_url": project.starter_repo_url,
                    "required_skills": project.required_skills or [],
                    "milestones": milestones,
                    "completed_milestones": completed_milestone_ids,
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
    request: EnrollInCourseRequest | None = None,
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

        min_price = await service.get_course_min_price(course_id)
        if min_price > 0:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="This is a paid course. Complete payment before enrollment.",
            )

        enrollment = await service.enroll_student_in_course(
            student_id=current_user.get("user_id"),
            course_id=course_id,
            preferred_path_id=request.preferred_path_id if request else None,
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


from domains.courses.routes.student_progress import progress_router
from domains.courses.routes.student_reviews import reviews_router

router.include_router(progress_router)
router.include_router(reviews_router)
