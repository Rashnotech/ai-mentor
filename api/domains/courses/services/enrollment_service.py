#!/usr/bin/python3
"""
Student enrollment service.
Handles course enrollment and personalized path assignment after onboarding.
"""
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from domains.courses.models.course import Course, LearningPath
from domains.courses.services.path_assignment_service import PathAssignmentService
from domains.users.models.user import User, UserRole
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)


class EnrollmentService:
    """Service for managing student enrollment and path assignment."""

    def __init__(self, db_session: AsyncSession):
        """
        Initialize EnrollmentService.

        Args:
            db_session: Async database session
        """
        self.db_session = db_session

    async def check_already_enrolled(self, student_id: str, course_id: int) -> dict | None:
        """
        Check if student is already enrolled in a course.

        Args:
            student_id: Student user ID
            course_id: Course ID

        Returns:
            Enrollment info if enrolled, None otherwise
        """
        from domains.users.models.onboarding import UserProfile
        
        try:
            # Get student's profile
            profile_stmt = select(UserProfile).where(UserProfile.user_id == student_id)
            profile_result = await self.db_session.execute(profile_stmt)
            profile = profile_result.scalar_one_or_none()
            
            if not profile:
                return None
            
            # Check if enrolled in this course
            if profile.current_path_id:
                # Get the path to check course_id
                path_stmt = select(LearningPath).where(LearningPath.path_id == profile.current_path_id)
                path_result = await self.db_session.execute(path_stmt)
                path = path_result.scalar_one_or_none()
                if path and path.course_id == course_id:
                    return {
                        "already_enrolled": True,
                        "path_id": path.path_id,
                        "path_title": path.title,
                    }
            
            # Also check selected_course_id
            if profile.selected_course_id:
                try:
                    selected_id = int(profile.selected_course_id)
                    if selected_id == course_id:
                        return {
                            "already_enrolled": True,
                            "path_id": profile.current_path_id,
                            "path_title": None,
                        }
                except (ValueError, TypeError):
                    pass
            
            return None
        except Exception as e:
            logger.error(f"Error checking enrollment: {str(e)}")
            return None

    async def enroll_student_in_course(
        self,
        student_id: str,
        course_id: int,
    ) -> dict:
        """
        Enroll a student in a course and assign learning path.

        Process:
        1. Check if already enrolled
        2. Verify course exists
        3. Get or create student's custom path based on onboarding
        4. Return enrollment details with assigned path

        Args:
            student_id: Student user ID
            course_id: Course to enroll in

        Returns:
            Dictionary with enrollment details and assigned path

        Raises:
            AppError: If course not found or enrollment fails
        """
        try:
            # Check if already enrolled
            existing_enrollment = await self.check_already_enrolled(student_id, course_id)
            if existing_enrollment:
                course = await self._get_course(course_id)
                return {
                    "enrollment": {
                        "student_id": student_id,
                        "course_id": course_id,
                        "already_enrolled": True,
                    },
                    "course": {
                        "course_id": course.course_id,
                        "title": course.title,
                        "description": course.description,
                        "difficulty_level": course.difficulty_level,
                        "estimated_hours": course.estimated_hours,
                    } if course else None,
                    "assigned_path": {
                        "path_id": existing_enrollment.get("path_id"),
                        "title": existing_enrollment.get("path_title"),
                        "already_assigned": True,
                    },
                }
            
            # Verify course exists
            course = await self._get_course(course_id)
            if not course:
                raise AppError(
                    status_code=404,
                    detail=f"Course {course_id} not found",
                    error_code="COURSE_NOT_FOUND",
                )

            if not course.is_active:
                raise AppError(
                    status_code=400,
                    detail="Course is not currently active",
                    error_code="COURSE_INACTIVE",
                )

            # Assign personalized or default path
            path_service = PathAssignmentService(self.db_session)
            assigned_path = await path_service.assign_path_for_student(
                user_id=student_id,
                course_id=course_id,
            )

            logger.info(f"Student {student_id} enrolled in course {course_id} with path {assigned_path.path_id}")

            # Create enrollment record
            enrollment_date = datetime.now(timezone.utc)
            await self._create_enrollment_record(
                user_id=student_id,
                course_id=course_id,
                path_id=assigned_path.path_id,
                enrolled_at=enrollment_date,
            )

            # Schedule module availability for the student
            await self._schedule_module_availability(
                user_id=student_id,
                course_id=course_id,
                path_id=assigned_path.path_id,
                registration_date=enrollment_date,
            )

            return {
                "enrollment": {
                    "student_id": student_id,
                    "course_id": course_id,
                    "enrolled_at": enrollment_date.isoformat(),
                },
                "course": {
                    "course_id": course.course_id,
                    "title": course.title,
                    "description": course.description,
                    "difficulty_level": course.difficulty_level,
                    "estimated_hours": course.estimated_hours,
                },
                "assigned_path": {
                    "path_id": assigned_path.path_id,
                    "title": assigned_path.title,
                    "description": assigned_path.description,
                    "is_default": assigned_path.is_default,
                    "is_custom": assigned_path.is_custom,
                    "min_skill_level": assigned_path.min_skill_level.value
                    if assigned_path.min_skill_level
                    else None,
                    "tags": assigned_path.tags or [],
                },
            }

        except AppError:
            raise
        except Exception as e:
            logger.error(f"Error enrolling student: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error enrolling in course",
                error_code="ENROLLMENT_ERROR",
            )

    async def get_student_course_path(
        self,
        student_id: str,
        course_id: int,
    ) -> dict:
        """
        Get the learning path assigned to a student for a course.

        Args:
            student_id: Student user ID
            course_id: Course ID

        Returns:
            Dictionary with path and structure details

        Raises:
            AppError: If path not found
        """
        try:
            path_service = PathAssignmentService(self.db_session)
            path = await path_service.get_student_path(student_id, course_id)

            if not path:
                raise AppError(
                    status_code=404,
                    detail="No learning path assigned for this course",
                    error_code="NO_PATH_ASSIGNED",
                )

            # Get path structure with modules, lessons, projects
            structure = await path_service.get_path_structure(path.path_id)

            return {
                "path": {
                    "path_id": path.path_id,
                    "title": path.title,
                    "description": path.description,
                    "is_default": path.is_default,
                    "is_custom": path.is_custom,
                    "min_skill_level": path.min_skill_level.value if path.min_skill_level else None,
                    "tags": path.tags or [],
                },
                "modules": [
                    {
                        "module": {
                            "module_id": mod["module"].module_id,
                            "title": mod["module"].title,
                            "description": mod["module"].description,
                            "order": mod["module"].order,
                            "estimated_hours": mod["module"].estimated_hours,
                        },
                        "lessons": [
                            {
                                "lesson_id": lesson.lesson_id,
                                "title": lesson.title,
                                "description": lesson.description,
                                "order": lesson.order,
                                "content_type": lesson.content_type.value if lesson.content_type else None,
                                "estimated_minutes": lesson.estimated_minutes,
                                "starter_file_url": lesson.starter_file_url,
                                "solution_file_url": lesson.solution_file_url,
                            }
                            for lesson in mod["lessons"]
                        ],
                        "projects": [
                            {
                                "project_id": project.project_id,
                                "title": project.title,
                                "description": project.description,
                                "order": project.order,
                                "estimated_hours": project.estimated_hours,
                                "starter_repo_url": project.starter_repo_url,
                                "solution_repo_url": project.solution_repo_url,
                                "required_skills": project.required_skills or [],
                            }
                            for project in mod["projects"]
                        ],
                    }
                    for mod in structure["modules"]
                ],
            }

        except AppError:
            raise
        except Exception as e:
            logger.error(f"Error getting student course path: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching learning path",
                error_code="PATH_FETCH_ERROR",
            )

    async def _get_course(self, course_id: int) -> Optional[Course]:
        """Get course by ID."""
        try:
            stmt = select(Course).where(Course.course_id == course_id)
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching course: {str(e)}")
            return None

    async def _create_enrollment_record(
        self,
        user_id: str,
        course_id: int,
        path_id: int,
        enrolled_at: datetime,
    ) -> None:
        """Create a course enrollment record for tracking purposes."""
        from domains.courses.models.progress import UserCourseEnrollment
        
        try:
            # Check if enrollment already exists
            stmt = select(UserCourseEnrollment).where(
                and_(
                    UserCourseEnrollment.user_id == user_id,
                    UserCourseEnrollment.course_id == course_id,
                )
            )
            result = await self.db_session.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if existing:
                logger.info(f"Enrollment record already exists for user {user_id} in course {course_id}")
                return
            
            enrollment = UserCourseEnrollment(
                user_id=user_id,
                course_id=course_id,
                path_id=path_id,
                enrolled_at=enrolled_at,
                is_active=True,
            )
            self.db_session.add(enrollment)
            await self.db_session.commit()
            logger.info(f"Created enrollment record for user {user_id} in course {course_id}")
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating enrollment record: {str(e)}")
            # Don't raise - enrollment record is supplementary

    async def _schedule_module_availability(
        self,
        user_id: str,
        course_id: int,
        path_id: int,
        registration_date: datetime,
    ) -> None:
        """Schedule module availability for a user based on their registration date."""
        from domains.courses.jobs.module_availability_job import ModuleAvailabilityService
        
        try:
            availability_service = ModuleAvailabilityService(self.db_session)
            await availability_service.schedule_modules_for_user(
                user_id=user_id,
                course_id=course_id,
                path_id=path_id,
                registration_date=registration_date,
            )
            logger.info(f"Scheduled module availability for user {user_id} in course {course_id}")
        except Exception as e:
            logger.error(f"Error scheduling module availability: {str(e)}")
            # Don't raise - module scheduling is supplementary

    async def get_student_courses(self, student_id: str) -> dict:
        """
        Get courses a student is enrolled in (picked during onboarding) with progress.

        Args:
            student_id: Student user ID

        Returns:
            Dictionary with 'enrolled' courses and 'available' courses
        """
        from domains.users.models.onboarding import UserProfile
        from domains.courses.models.course import Module, Lesson
        from domains.progress.models.progress import UserProgress
        from sqlalchemy import func, or_
        from core.constant import ProgressStatus

        try:
            # Get student's profile to find their selected course and assigned path
            profile_stmt = select(UserProfile).where(UserProfile.user_id == student_id)
            profile_result = await self.db_session.execute(profile_stmt)
            profile = profile_result.scalar_one_or_none()

            enrolled_courses = []
            enrolled_course_ids = set()

            if profile:
                # Get the course selected during onboarding
                course = None
                path = None

                # First, try to get course from current_path_id
                if profile.current_path_id:
                    path_stmt = select(LearningPath).where(LearningPath.path_id == profile.current_path_id)
                    path_result = await self.db_session.execute(path_stmt)
                    path = path_result.scalar_one_or_none()
                    if path:
                        course = await self._get_course(path.course_id)

                # If no course from path, try selected_course_id (could be ID or slug)
                if not course and profile.selected_course_id:
                    # Try as integer course_id first
                    try:
                        course_id = int(profile.selected_course_id)
                        course = await self._get_course(course_id)
                    except (ValueError, TypeError):
                        pass

                    # If not found, try as slug
                    if not course:
                        slug_stmt = select(Course).where(Course.slug == profile.selected_course_id)
                        slug_result = await self.db_session.execute(slug_stmt)
                        course = slug_result.scalar_one_or_none()

                    # Get the path for this course if we don't have one
                    if course and not path:
                        path_stmt = select(LearningPath).where(
                            and_(
                                LearningPath.course_id == course.course_id,
                                LearningPath.is_default == True
                            )
                        )
                        path_result = await self.db_session.execute(path_stmt)
                        path = path_result.scalar_one_or_none()

                # Build course data with progress
                if course:
                    enrolled_course_ids.add(course.course_id)
                    course_data = await self._build_course_data(
                        course=course,
                        path=path,
                        student_id=student_id,
                        profile=profile
                    )
                    enrolled_courses.append(course_data)

            # Get available courses (not enrolled)
            available_courses = []
            all_courses_stmt = select(Course).where(Course.is_active == True)
            all_courses_result = await self.db_session.execute(all_courses_stmt)
            all_courses = all_courses_result.scalars().all()

            for course in all_courses:
                if course.course_id not in enrolled_course_ids:
                    # Get default path for this course
                    default_path_stmt = select(LearningPath).where(
                        and_(
                            LearningPath.course_id == course.course_id,
                            LearningPath.is_default == True
                        )
                    )
                    default_path_result = await self.db_session.execute(default_path_stmt)
                    default_path = default_path_result.scalar_one_or_none()

                    available_courses.append({
                        "course_id": course.course_id,
                        "title": course.title,
                        "slug": course.slug,
                        "description": course.description,
                        "cover_image_url": course.cover_image_url,
                        "difficulty_level": course.difficulty_level,
                        "estimated_hours": course.estimated_hours or 0,
                        "path_id": default_path.path_id if default_path else None,
                        "path_title": default_path.title if default_path else None,
                    })

            return {
                "enrolled": enrolled_courses,
                "available": available_courses
            }

        except Exception as e:
            logger.error(f"Error getting student courses: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching courses",
                error_code="COURSES_FETCH_ERROR",
            )

    async def _build_course_data(
        self,
        course: Course,
        path: Optional[LearningPath],
        student_id: str,
        profile
    ) -> dict:
        """Build course data with progress information."""
        from domains.courses.models.course import Module, Lesson
        from domains.courses.models.progress import LessonProgress  # FIX: Use correct table
        from sqlalchemy import func

        total_modules = 0
        total_lessons = 0
        completed_lessons = 0
        completed_modules = 0

        if path:
            # Get modules for this path
            modules_stmt = select(Module).where(Module.path_id == path.path_id)
            modules_result = await self.db_session.execute(modules_stmt)
            modules = modules_result.scalars().all()
            total_modules = len(modules)

            # Get lessons for all modules
            if total_modules > 0:
                module_ids = [m.module_id for m in modules]
                lessons_stmt = select(Lesson).where(Lesson.module_id.in_(module_ids))
                lessons_result = await self.db_session.execute(lessons_stmt)
                lessons = lessons_result.scalars().all()
                total_lessons = len(lessons)

                # Get completed lessons from LessonProgress (correct table)
                lesson_ids = [l.lesson_id for l in lessons]
                if lesson_ids:
                    completed_stmt = select(func.count(LessonProgress.progress_id)).where(
                        and_(
                            LessonProgress.user_id == student_id,
                            LessonProgress.lesson_id.in_(lesson_ids),
                            LessonProgress.completed == True  # Use completed boolean
                        )
                    )
                    completed_result = await self.db_session.execute(completed_stmt)
                    completed_lessons = completed_result.scalar() or 0

                # Calculate completed modules (module completed when ALL lessons completed)
                for module in modules:
                    mod_lessons_stmt = select(Lesson.lesson_id).where(Lesson.module_id == module.module_id)
                    mod_lessons_result = await self.db_session.execute(mod_lessons_stmt)
                    mod_lesson_ids = [r for r in mod_lessons_result.scalars().all()]
                    
                    # Module with no lessons is considered complete
                    if not mod_lesson_ids:
                        completed_modules += 1
                        continue
                    
                    # Count completed lessons in this module
                    mod_completed_stmt = select(func.count(LessonProgress.progress_id)).where(
                        and_(
                            LessonProgress.user_id == student_id,
                            LessonProgress.lesson_id.in_(mod_lesson_ids),
                            LessonProgress.completed == True
                        )
                    )
                    mod_completed_result = await self.db_session.execute(mod_completed_stmt)
                    mod_completed = mod_completed_result.scalar() or 0
                    
                    # Module is complete when ALL lessons are completed
                    if mod_completed >= len(mod_lesson_ids):
                        completed_modules += 1

        # Calculate progress percentage
        progress_percent = int((completed_lessons / total_lessons * 100) if total_lessons > 0 else 0)

        return {
            "course_id": course.course_id,
            "title": course.title,
            "slug": course.slug,
            "description": course.description,
            "cover_image_url": course.cover_image_url,
            "difficulty_level": course.difficulty_level,
            "estimated_hours": course.estimated_hours or 0,
            "progress_percent": progress_percent,
            "total_modules": total_modules,
            "completed_modules": completed_modules,
            "total_lessons": total_lessons,
            "completed_lessons": completed_lessons,
            "path_id": path.path_id if path else None,
            "path_title": path.title if path else None,
            "enrolled_at": profile.created_at.isoformat() if profile and profile.created_at else None,
            "last_accessed_at": profile.last_active_at.isoformat() if profile and profile.last_active_at else None,
        }

    async def get_student_projects(self, student_id: str) -> dict:
        """
        Get all projects from courses the student is enrolled in.

        Args:
            student_id: Student user ID

        Returns:
            Dictionary with projects list and counts
        """
        from domains.users.models.onboarding import UserProfile
        from domains.courses.models.course import Module, Project
        from domains.courses.models.progress import ProjectSubmission
        from domains.progress.models.progress import UserProgress
        from core.constant import ProgressStatus

        try:
            # Get student's profile to find their enrolled course
            profile_stmt = select(UserProfile).where(UserProfile.user_id == student_id)
            profile_result = await self.db_session.execute(profile_stmt)
            profile = profile_result.scalar_one_or_none()

            projects_data = []
            
            if not profile:
                return {
                    "projects": [],
                    "total_count": 0,
                    "completed_count": 0,
                    "in_progress_count": 0
                }

            # Get the enrolled course and path
            course = None
            path = None

            if profile.current_path_id:
                path_stmt = select(LearningPath).where(LearningPath.path_id == profile.current_path_id)
                path_result = await self.db_session.execute(path_stmt)
                path = path_result.scalar_one_or_none()
                if path:
                    course = await self._get_course(path.course_id)

            if not course and profile.selected_course_id:
                try:
                    course_id = int(profile.selected_course_id)
                    course = await self._get_course(course_id)
                except (ValueError, TypeError):
                    pass
                
                if not course:
                    slug_stmt = select(Course).where(Course.slug == profile.selected_course_id)
                    slug_result = await self.db_session.execute(slug_stmt)
                    course = slug_result.scalar_one_or_none()

                if course and not path:
                    path_stmt = select(LearningPath).where(
                        and_(
                            LearningPath.course_id == course.course_id,
                            LearningPath.is_default == True
                        )
                    )
                    path_result = await self.db_session.execute(path_stmt)
                    path = path_result.scalar_one_or_none()

            if not course or not path:
                return {
                    "projects": [],
                    "total_count": 0,
                    "completed_count": 0,
                    "in_progress_count": 0
                }

            # Get all modules for the path
            modules_stmt = select(Module).where(Module.path_id == path.path_id).order_by(Module.order)
            modules_result = await self.db_session.execute(modules_stmt)
            modules = modules_result.scalars().all()

            module_map = {m.module_id: m for m in modules}
            module_ids = list(module_map.keys())

            if not module_ids:
                return {
                    "projects": [],
                    "total_count": 0,
                    "completed_count": 0,
                    "in_progress_count": 0
                }

            # Get all projects for these modules
            projects_stmt = select(Project).where(Project.module_id.in_(module_ids)).order_by(Project.order)
            projects_result = await self.db_session.execute(projects_stmt)
            projects = projects_result.scalars().all()

            # Get project submissions for this student
            project_ids = [p.project_id for p in projects]
            submissions_map = {}
            
            if project_ids:
                submissions_stmt = select(ProjectSubmission).where(
                    and_(
                        ProjectSubmission.user_id == student_id,
                        ProjectSubmission.project_id.in_(project_ids)
                    )
                )
                submissions_result = await self.db_session.execute(submissions_stmt)
                submissions = submissions_result.scalars().all()
                submissions_map = {s.project_id: s for s in submissions}

            # Also check UserProgress for in-progress status
            progress_map = {}
            if project_ids:
                progress_stmt = select(UserProgress).where(
                    and_(
                        UserProgress.user_id == student_id,
                        UserProgress.project_id.in_(project_ids)
                    )
                )
                progress_result = await self.db_session.execute(progress_stmt)
                progress_records = progress_result.scalars().all()
                progress_map = {p.project_id: p for p in progress_records}

            completed_count = 0
            in_progress_count = 0

            for project in projects:
                module = module_map.get(project.module_id)
                submission = submissions_map.get(project.project_id)
                progress = progress_map.get(project.project_id)

                # Determine status
                if submission:
                    if submission.is_approved:
                        status = "approved"
                        completed_count += 1
                    elif submission.status == "rejected":
                        status = "rejected"
                    else:
                        status = "submitted"
                        in_progress_count += 1
                elif progress:
                    if progress.status == ProgressStatus.COMPLETED:
                        status = "approved"
                        completed_count += 1
                    elif progress.status == ProgressStatus.IN_PROGRESS:
                        status = "in_progress"
                        in_progress_count += 1
                    else:
                        status = "not_started"
                else:
                    status = "not_started"

                projects_data.append({
                    "project_id": project.project_id,
                    "title": project.title,
                    "description": project.description or "",
                    "order": project.order,
                    "estimated_hours": project.estimated_hours,
                    "starter_repo_url": project.starter_repo_url,
                    "solution_repo_url": project.solution_repo_url,
                    "required_skills": project.required_skills or [],
                    "module_id": project.module_id,
                    "module_title": module.title if module else "Unknown Module",
                    "course_id": course.course_id,
                    "course_title": course.title,
                    "course_slug": course.slug,
                    "status": status,
                    "submission_url": submission.solution_url if submission else None,
                    "submitted_at": submission.submitted_at.isoformat() if submission and submission.submitted_at else None,
                    "reviewer_feedback": submission.reviewer_feedback if submission else None,
                })

            return {
                "projects": projects_data,
                "total_count": len(projects_data),
                "completed_count": completed_count,
                "in_progress_count": in_progress_count
            }

        except Exception as e:
            logger.error(f"Error getting student projects: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching projects",
                error_code="PROJECTS_FETCH_ERROR",
            )
