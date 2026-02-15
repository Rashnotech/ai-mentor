#!/usr/bin/python3
"""
Course management service for admins and mentors.
Handles creation, modification, and publishing of courses, learning paths, and projects.
"""
from typing import Optional, List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from domains.courses.models.course import Course, LearningPath, Module, Lesson, Project
from domains.courses.models.assessment import AssessmentQuestion
from domains.users.models.user import User, UserRole
from core.errors import AppError
from core.constant import SkillLevel, ContentType
import logging

logger = logging.getLogger(__name__)


class CourseService:
    """Service for managing courses with admin/mentor authorization."""

    def __init__(self, db_session: AsyncSession, current_user: User):
        """
        Initialize CourseService.

        Args:
            db_session: Async database session
            current_user: Currently authenticated user
        """
        self.db_session = db_session
        self.current_user = current_user

    async def _check_admin_mentor(self) -> None:
        """Check if current user is admin or mentor."""
        if self.current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise AppError(
                status_code=403,
                detail="Only admins and mentors can manage courses",
                error_code="FORBIDDEN",
            )

    async def create_course(
        self,
        title: str,
        description: str,
        slug: str,
        estimated_hours: int,
        difficulty_level: str,
        cover_image_url: Optional[str] = None,
        prerequisites: Optional[List[str]] = None,
        what_youll_learn: Optional[List[str]] = None,
        certificate_on_completion: bool = False,
    ) -> Course:
        """
        Create a new course.

        Args:
            title: Course title
            description: Course description
            slug: URL-friendly course identifier (must be unique)
            estimated_hours: Estimated completion time
            difficulty_level: Difficulty level (BEGINNER, INTERMEDIATE, ADVANCED)
            cover_image_url: Optional cover image URL
            prerequisites: Optional list of prerequisites
            what_youll_learn: Optional list of learning outcomes
            certificate_on_completion: Whether to award certificate on completion

        Returns:
            Created Course

        Raises:
            AppError: If user not authorized or slug already exists
        """
        try:
            await self._check_admin_mentor()

            # Check for duplicate slug
            stmt = select(Course).where(Course.slug == slug)
            result = await self.db_session.execute(stmt)
            if result.scalar_one_or_none():
                raise AppError(
                    status_code=400,
                    detail=f"Slug '{slug}' is already in use",
                    error_code="SLUG_EXISTS",
                )

            course = Course(
                title=title,
                description=description,
                slug=slug,
                estimated_hours=estimated_hours,
                difficulty_level=difficulty_level,
                cover_image_url=cover_image_url,
                prerequisites=prerequisites,
                what_youll_learn=what_youll_learn,
                certificate_on_completion=certificate_on_completion,
                created_by=self.current_user.get("user_id"),
            )

            self.db_session.add(course)
            await self.db_session.commit()
            await self.db_session.refresh(course)

            logger.info(f"Course '{title}' created by {self.current_user.get('email')}")
            return course
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating course: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error creating course",
                error_code="COURSE_CREATE_ERROR",
            )

    async def create_learning_path(
        self,
        course_id: int,
        title: str,
        description: str,
        min_skill_level: Optional[SkillLevel] = None,
        max_skill_level: Optional[SkillLevel] = None,
        tags: Optional[List[str]] = None,
        is_default: bool = False,
    ) -> LearningPath:
        """
        Create a learning path for a course.

        Args:
            course_id: Parent course ID
            title: Learning path title
            description: Learning path description
            min_skill_level: Minimum required skill level
            max_skill_level: Maximum skill level this path targets
            tags: List of tags (e.g., ['python', 'beginner'])
            is_default: Whether this is the default path for the course

        Returns:
            Created LearningPath

        Raises:
            AppError: If user not authorized or course not found
        """
        try:
            await self._check_admin_mentor()

            # Verify course exists
            stmt = select(Course).where(Course.course_id == course_id)
            result = await self.db_session.execute(stmt)
            course = result.scalar_one_or_none()
            if not course:
                raise AppError(
                    status_code=404,
                    detail=f"Course {course_id} not found",
                    error_code="COURSE_NOT_FOUND",
                )

            path = LearningPath(
                course_id=course_id,
                title=title,
                description=description,
                min_skill_level=min_skill_level,
                max_skill_level=max_skill_level,
                tags=tags or [],
                is_default=is_default,
                created_by=self.current_user.get("user_id"),
            )

            self.db_session.add(path)
            await self.db_session.commit()
            await self.db_session.refresh(path)

            logger.info(f"Learning path '{title}' created for course {course_id}")
            return path
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating learning path: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error creating learning path",
                error_code="PATH_CREATE_ERROR",
            )

    async def create_module(
        self,
        path_id: int,
        title: str,
        description: str,
        order: int,
        estimated_hours: Optional[int] = None,
    ) -> Module:
        """
        Create a module in a learning path.

        Args:
            path_id: Parent learning path ID
            title: Module title
            description: Module description
            order: Display order in path
            estimated_hours: Estimated completion time

        Returns:
            Created Module
        """
        try:
            await self._check_admin_mentor()

            # Verify path exists
            stmt = select(LearningPath).where(LearningPath.path_id == path_id)
            result = await self.db_session.execute(stmt)
            if not result.scalar_one_or_none():
                raise AppError(
                    status_code=404,
                    detail=f"Learning path {path_id} not found",
                    error_code="PATH_NOT_FOUND",
                )

            module = Module(
                path_id=path_id,
                title=title,
                description=description,
                order=order,
                estimated_hours=estimated_hours,
            )

            self.db_session.add(module)
            await self.db_session.commit()
            await self.db_session.refresh(module)

            logger.info(f"Module '{title}' created in path {path_id}")
            return module
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating module: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error creating module",
                error_code="MODULE_CREATE_ERROR",
            )

    async def create_lesson(
        self,
        module_id: int,
        title: str,
        description: str,
        order: int,
        content: Optional[str] = None,
        content_type: Optional[ContentType] = None,
        estimated_minutes: Optional[int] = None,
        youtube_video_url: Optional[str] = None,
        external_resources: Optional[List[str]] = None,
        expected_outcomes: Optional[List[str]] = None,
        starter_file_url: Optional[str] = None,
        solution_file_url: Optional[str] = None,
    ) -> Lesson:
        """
        Create a lesson in a module.

        Args:
            module_id: Parent module ID
            title: Lesson title
            description: Lesson description
            order: Display order in module
            content: Main lesson content/material
            content_type: Type of content (VIDEO, TEXT, INTERACTIVE, ASSIGNMENT)
            estimated_minutes: Estimated completion time
            youtube_video_url: YouTube video URL
            external_resources: List of external resource links
            expected_outcomes: What's expected at end of lesson
            starter_file_url: URL to starter files
            solution_file_url: URL to solution files

        Returns:
            Created Lesson
        """
        try:
            await self._check_admin_mentor()

            # Verify module exists
            stmt = select(Module).where(Module.module_id == module_id)
            result = await self.db_session.execute(stmt)
            if not result.scalar_one_or_none():
                raise AppError(
                    status_code=404,
                    detail=f"Module {module_id} not found",
                    error_code="MODULE_NOT_FOUND",
                )

            lesson = Lesson(
                module_id=module_id,
                title=title,
                description=description,
                content=content,
                order=order,
                content_type=content_type,
                estimated_minutes=estimated_minutes,
                youtube_video_url=youtube_video_url,
                external_resources=external_resources,
                expected_outcomes=expected_outcomes,
                starter_file_url=starter_file_url,
                solution_file_url=solution_file_url,
            )

            self.db_session.add(lesson)
            await self.db_session.commit()
            await self.db_session.refresh(lesson)

            logger.info(f"Lesson '{title}' created in module {module_id}")
            return lesson
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating lesson: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error creating lesson",
                error_code="LESSON_CREATE_ERROR",
            )

    async def list_lessons(self, module_id: int) -> List[Lesson]:
        """
        List all lessons in a module.

        Args:
            module_id: Parent module ID

        Returns:
            List of lessons
        """
        try:
            await self._check_admin_mentor()

            # Verify module exists
            stmt = select(Module).where(Module.module_id == module_id)
            result = await self.db_session.execute(stmt)
            if not result.scalar_one_or_none():
                raise AppError(
                    status_code=404,
                    detail=f"Module {module_id} not found",
                    error_code="MODULE_NOT_FOUND",
                )

            stmt = select(Lesson).where(Lesson.module_id == module_id).order_by(Lesson.order)
            result = await self.db_session.execute(stmt)
            return result.scalars().all()
        except AppError:
            raise
        except Exception as e:
            logger.error(f"Error listing lessons: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error listing lessons",
                error_code="LESSON_LIST_ERROR",
            )

    async def update_lesson(
        self,
        lesson_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        content: Optional[str] = None,
        order: Optional[int] = None,
        content_type: Optional[ContentType] = None,
        estimated_minutes: Optional[int] = None,
        youtube_video_url: Optional[str] = None,
        external_resources: Optional[List[str]] = None,
        expected_outcomes: Optional[List[str]] = None,
        starter_file_url: Optional[str] = None,
        solution_file_url: Optional[str] = None,
    ) -> Lesson:
        """
        Update a lesson.

        Args:
            lesson_id: Lesson ID
            title: New title (optional)
            description: New description (optional)
            content: New content (optional)
            order: New order (optional)
            content_type: New content type (optional)
            estimated_minutes: New estimated minutes (optional)
            youtube_video_url: New YouTube video URL (optional)
            external_resources: New external resources (optional)
            expected_outcomes: New expected outcomes (optional)
            starter_file_url: New starter file URL (optional)
            solution_file_url: New solution file URL (optional)

        Returns:
            Updated Lesson
        """
        try:
            await self._check_admin_mentor()

            stmt = select(Lesson).where(Lesson.lesson_id == lesson_id)
            result = await self.db_session.execute(stmt)
            lesson = result.scalar_one_or_none()
            if not lesson:
                raise AppError(
                    status_code=404,
                    detail=f"Lesson {lesson_id} not found",
                    error_code="LESSON_NOT_FOUND",
                )

            # Update fields if provided
            if title is not None:
                lesson.title = title
            if description is not None:
                lesson.description = description
            if content is not None:
                lesson.content = content
            if order is not None:
                lesson.order = order
            if content_type is not None:
                lesson.content_type = content_type
            if estimated_minutes is not None:
                lesson.estimated_minutes = estimated_minutes
            if youtube_video_url is not None:
                lesson.youtube_video_url = youtube_video_url
            if external_resources is not None:
                lesson.external_resources = external_resources
            if expected_outcomes is not None:
                lesson.expected_outcomes = expected_outcomes
            if starter_file_url is not None:
                lesson.starter_file_url = starter_file_url
            if solution_file_url is not None:
                lesson.solution_file_url = solution_file_url

            await self.db_session.commit()
            await self.db_session.refresh(lesson)

            logger.info(f"Lesson {lesson_id} updated")
            return lesson
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error updating lesson: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error updating lesson",
                error_code="LESSON_UPDATE_ERROR",
            )

    async def delete_lesson(self, lesson_id: int) -> None:
        """
        Delete a lesson.

        Args:
            lesson_id: Lesson ID
        """
        try:
            await self._check_admin_mentor()

            stmt = select(Lesson).where(Lesson.lesson_id == lesson_id)
            result = await self.db_session.execute(stmt)
            lesson = result.scalar_one_or_none()
            if not lesson:
                raise AppError(
                    status_code=404,
                    detail=f"Lesson {lesson_id} not found",
                    error_code="LESSON_NOT_FOUND",
                )

            await self.db_session.delete(lesson)
            await self.db_session.commit()

            logger.info(f"Lesson {lesson_id} deleted")
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error deleting lesson: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error deleting lesson",
                error_code="LESSON_DELETE_ERROR",
            )

    async def create_project(
        self,
        module_id: int,
        title: str,
        description: str,
        order: int,
        estimated_hours: Optional[int] = None,
        starter_repo_url: Optional[str] = None,
        solution_repo_url: Optional[str] = None,
        required_skills: Optional[List[str]] = None,
    ) -> Project:
        """
        Create a project in a module.

        Args:
            module_id: Parent module ID
            title: Project title
            description: Project description
            order: Display order in module
            estimated_hours: Estimated completion time
            starter_repo_url: URL to starter repository
            solution_repo_url: URL to solution repository
            required_skills: List of required skills

        Returns:
            Created Project
        """
        try:
            await self._check_admin_mentor()

            # Verify module exists
            stmt = select(Module).where(Module.module_id == module_id)
            result = await self.db_session.execute(stmt)
            if not result.scalar_one_or_none():
                raise AppError(
                    status_code=404,
                    detail=f"Module {module_id} not found",
                    error_code="MODULE_NOT_FOUND",
                )

            project = Project(
                module_id=module_id,
                title=title,
                description=description,
                order=order,
                estimated_hours=estimated_hours,
                starter_repo_url=starter_repo_url,
                solution_repo_url=solution_repo_url,
                required_skills=required_skills or [],
            )

            self.db_session.add(project)
            await self.db_session.commit()
            await self.db_session.refresh(project)

            logger.info(f"Project '{title}' created in module {module_id}")
            return project
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating project: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error creating project",
                error_code="PROJECT_CREATE_ERROR",
            )

    async def update_project(
        self,
        project_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        order: Optional[int] = None,
        estimated_hours: Optional[int] = None,
        starter_repo_url: Optional[str] = None,
        solution_repo_url: Optional[str] = None,
        required_skills: Optional[List[str]] = None,
        first_deadline_days: Optional[int] = None,
        second_deadline_days: Optional[int] = None,
        third_deadline_days: Optional[int] = None,
    ) -> Project:
        """
        Update a project.

        Args:
            project_id: Project ID
            title: Optional new title
            description: Optional new description
            order: Optional new display order
            estimated_hours: Optional new estimated hours
            starter_repo_url: Optional new starter repo URL
            solution_repo_url: Optional new solution repo URL
            required_skills: Optional new required skills list
            first_deadline_days: Days to first deadline
            second_deadline_days: Days to second deadline
            third_deadline_days: Days to third deadline

        Returns:
            Updated Project
        """
        try:
            await self._check_admin_mentor()

            # Fetch the project
            stmt = select(Project).where(Project.project_id == project_id)
            result = await self.db_session.execute(stmt)
            project = result.scalar_one_or_none()
            if not project:
                raise AppError(
                    status_code=404,
                    detail=f"Project {project_id} not found",
                    error_code="PROJECT_NOT_FOUND",
                )

            # Update fields if provided
            if title is not None:
                project.title = title
            if description is not None:
                project.description = description
            if order is not None:
                project.order = order
            if estimated_hours is not None:
                project.estimated_hours = estimated_hours
            if starter_repo_url is not None:
                project.starter_repo_url = starter_repo_url
            if solution_repo_url is not None:
                project.solution_repo_url = solution_repo_url
            if required_skills is not None:
                project.required_skills = required_skills
            if first_deadline_days is not None:
                project.first_deadline_days = first_deadline_days
            if second_deadline_days is not None:
                project.second_deadline_days = second_deadline_days
            if third_deadline_days is not None:
                project.third_deadline_days = third_deadline_days

            project.updated_at = datetime.now(timezone.utc)
            self.db_session.add(project)
            await self.db_session.commit()
            await self.db_session.refresh(project)

            logger.info(f"Project {project_id} updated")
            return project
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error updating project: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error updating project",
                error_code="PROJECT_UPDATE_ERROR",
            )

    async def delete_project(self, project_id: int) -> None:
        """
        Delete a project.

        Args:
            project_id: Project ID to delete
        """
        try:
            await self._check_admin_mentor()

            # Fetch the project
            stmt = select(Project).where(Project.project_id == project_id)
            result = await self.db_session.execute(stmt)
            project = result.scalar_one_or_none()
            if not project:
                raise AppError(
                    status_code=404,
                    detail=f"Project {project_id} not found",
                    error_code="PROJECT_NOT_FOUND",
                )

            await self.db_session.delete(project)
            await self.db_session.commit()

            logger.info(f"Project {project_id} deleted")
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error deleting project: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error deleting project",
                error_code="PROJECT_DELETE_ERROR",
            )

    async def set_default_path(self, course_id: int, path_id: int) -> LearningPath:
        """
        Set a learning path as the default for a course.

        Args:
            course_id: Course ID
            path_id: Learning path ID to set as default

        Returns:
            Updated LearningPath
        """
        try:
            await self._check_admin_mentor()

            # Verify path exists and belongs to course
            stmt = select(LearningPath).where(
                (LearningPath.path_id == path_id) & (LearningPath.course_id == course_id)
            )
            result = await self.db_session.execute(stmt)
            path = result.scalar_one_or_none()
            if not path:
                raise AppError(
                    status_code=404,
                    detail="Learning path not found or does not belong to this course",
                    error_code="PATH_NOT_FOUND",
                )

            # Unset other default paths for this course
            stmt = update(LearningPath).where(
                (LearningPath.course_id == course_id) & (LearningPath.path_id != path_id)
            ).values(is_default=False)
            await self.db_session.execute(stmt)

            # Set this path as default
            path.is_default = True
            path.updated_at = datetime.now(timezone.utc)
            self.db_session.add(path)
            await self.db_session.commit()
            await self.db_session.refresh(path)

            logger.info(f"Learning path {path_id} set as default for course {course_id}")
            return path
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error setting default path: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error setting default path",
                error_code="PATH_UPDATE_ERROR",
            )

    async def unset_default_path(self, course_id: int, path_id: int) -> LearningPath:
        """
        Unset a learning path as the default for a course.

        Args:
            course_id: Course ID
            path_id: Learning path ID to unset as default

        Returns:
            Updated LearningPath
        """
        try:
            await self._check_admin_mentor()

            # Verify path exists and belongs to course
            stmt = select(LearningPath).where(
                (LearningPath.path_id == path_id) & (LearningPath.course_id == course_id)
            )
            result = await self.db_session.execute(stmt)
            path = result.scalar_one_or_none()
            if not path:
                raise AppError(
                    status_code=404,
                    detail="Learning path not found or does not belong to this course",
                    error_code="PATH_NOT_FOUND",
                )

            # Unset this path as default
            path.is_default = False
            path.updated_at = datetime.now(timezone.utc)
            self.db_session.add(path)
            await self.db_session.commit()
            await self.db_session.refresh(path)

            logger.info(f"Learning path {path_id} unset as default for course {course_id}")
            return path
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error unsetting default path: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error unsetting default path",
                error_code="PATH_UPDATE_ERROR",
            )

    async def update_learning_path(
        self,
        path_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        min_skill_level: Optional[SkillLevel] = None,
        max_skill_level: Optional[SkillLevel] = None,
        tags: Optional[List[str]] = None,
        is_default: Optional[bool] = None,
    ) -> LearningPath:
        """
        Update an existing learning path.

        Args:
            path_id: Learning path ID
            title: New title
            description: New description
            min_skill_level: New minimum skill level
            max_skill_level: New maximum skill level
            tags: New tags list
            is_default: Set as default

        Returns:
            Updated LearningPath
        """
        try:
            await self._check_admin_mentor()

            # Fetch the path
            stmt = select(LearningPath).where(LearningPath.path_id == path_id)
            result = await self.db_session.execute(stmt)
            path = result.scalar_one_or_none()

            if not path:
                raise AppError(
                    status_code=404,
                    detail="Learning path not found",
                    error_code="PATH_NOT_FOUND",
                )

            # Update fields if provided
            if title is not None:
                path.title = title
            if description is not None:
                path.description = description
            if min_skill_level is not None:
                path.min_skill_level = min_skill_level
            if max_skill_level is not None:
                path.max_skill_level = max_skill_level
            if tags is not None:
                path.tags = tags
            if is_default is not None:
                if is_default:
                    # Unset other default paths for this course
                    unset_stmt = update(LearningPath).where(
                        (LearningPath.course_id == path.course_id) & (LearningPath.path_id != path_id)
                    ).values(is_default=False)
                    await self.db_session.execute(unset_stmt)
                path.is_default = is_default

            path.updated_at = datetime.now(timezone.utc)
            self.db_session.add(path)
            await self.db_session.commit()
            await self.db_session.refresh(path)

            logger.info(f"Learning path {path_id} updated by {self.current_user.get('email')}")
            return path
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error updating learning path: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error updating learning path",
                error_code="PATH_UPDATE_ERROR",
            )

    async def delete_learning_path(self, path_id: int) -> None:
        """
        Delete a learning path and all its modules, lessons, projects, and assessments.

        Args:
            path_id: Learning path ID to delete

        Raises:
            AppError: If path not found or deletion fails
        """
        try:
            await self._check_admin_mentor()

            # Fetch the path
            stmt = select(LearningPath).where(LearningPath.path_id == path_id)
            result = await self.db_session.execute(stmt)
            path = result.scalar_one_or_none()

            if not path:
                raise AppError(
                    status_code=404,
                    detail="Learning path not found",
                    error_code="PATH_NOT_FOUND",
                )

            # Delete the path (cascade will handle modules, lessons, projects, assessments)
            await self.db_session.delete(path)
            await self.db_session.commit()

            logger.info(f"Learning path {path_id} deleted by {self.current_user.get('email')}")

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error deleting learning path: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error deleting learning path",
                error_code="PATH_DELETE_ERROR",
            )

    async def get_course(self, course_id: int) -> Optional[Course]:
        """Get a course by ID."""
        try:
            stmt = select(Course).where(Course.course_id == course_id)
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching course: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching course",
                error_code="COURSE_FETCH_ERROR",
            )

    async def get_learning_path(self, path_id: int) -> Optional[LearningPath]:
        """Get a learning path by ID."""
        try:
            stmt = select(LearningPath).where(LearningPath.path_id == path_id)
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching learning path: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching learning path",
                error_code="PATH_FETCH_ERROR",
            )

    async def create_assessment_question(
        self,
        module_id: int,
        question_text: str,
        question_type: str,
        difficulty_level: str,
        order: int,
        correct_answer: str,
        options: Optional[List[str]] = None,
        explanation: Optional[str] = None,
        points: int = 10,
    ) -> AssessmentQuestion:
        """
        Create a new assessment question for a module.

        Args:
            module_id: ID of the module
            question_text: The question text
            question_type: Type of question (multiple_choice, coding, debugging, short_answer)
            difficulty_level: BEGINNER, INTERMEDIATE, or ADVANCED
            order: Display order in module
            correct_answer: The correct answer
            options: Optional list of answer options for multiple choice
            explanation: Optional explanation of the correct answer
            points: Points awarded for correct answer (default 10)

        Returns:
            Created AssessmentQuestion object

        Raises:
            AppError: If module not found or validation fails
        """
        try:
            await self._check_admin_mentor()

            # Verify module exists
            module = await self.get_module(module_id)
            if not module:
                raise AppError(
                    status_code=404,
                    detail="Module not found",
                    error_code="MODULE_NOT_FOUND",
                )

            # Create assessment question
            question = AssessmentQuestion(
                module_id=module_id,
                question_text=question_text,
                question_type=question_type,
                difficulty_level=difficulty_level,
                order=order,
                options=options,
                correct_answer=correct_answer,
                explanation=explanation,
                points=points,
            )

            self.db_session.add(question)
            await self.db_session.commit()
            await self.db_session.refresh(question)

            logger.info(
                f"Assessment question created: {question.question_id} by {self.current_user.get('user_id')}"
            )
            return question

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating assessment question: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error creating assessment question",
                error_code="ASSESSMENT_CREATION_ERROR",
            )

    async def update_assessment_question(
        self,
        question_id: int,
        question_text: Optional[str] = None,
        question_type: Optional[str] = None,
        difficulty_level: Optional[str] = None,
        order: Optional[int] = None,
        options: Optional[List[str]] = None,
        correct_answer: Optional[str] = None,
        explanation: Optional[str] = None,
        points: Optional[int] = None,
    ) -> AssessmentQuestion:
        """
        Update an existing assessment question.

        Args:
            question_id: ID of the question to update
            question_text: Updated question text
            question_type: Updated question type
            difficulty_level: Updated difficulty level
            order: Updated display order
            options: Updated answer options
            correct_answer: Updated correct answer
            explanation: Updated explanation
            points: Updated points

        Returns:
            Updated AssessmentQuestion object

        Raises:
            AppError: If question not found or validation fails
        """
        try:
            await self._check_admin_mentor()

            # Fetch the question
            stmt = select(AssessmentQuestion).where(AssessmentQuestion.question_id == question_id)
            result = await self.db_session.execute(stmt)
            question = result.scalar_one_or_none()

            if not question:
                raise AppError(
                    status_code=404,
                    detail="Assessment question not found",
                    error_code="ASSESSMENT_NOT_FOUND",
                )

            # Update fields if provided
            if question_text is not None:
                question.question_text = question_text
            if question_type is not None:
                question.question_type = question_type
            if difficulty_level is not None:
                question.difficulty_level = difficulty_level
            if order is not None:
                question.order = order
            if options is not None:
                question.options = options
            if correct_answer is not None:
                question.correct_answer = correct_answer
            if explanation is not None:
                question.explanation = explanation
            if points is not None:
                question.points = points

            question.updated_at = datetime.now(timezone.utc)
            self.db_session.add(question)
            await self.db_session.commit()
            await self.db_session.refresh(question)

            logger.info(
                f"Assessment question updated: {question.question_id} by {self.current_user.get('user_id')}"
            )
            return question

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error updating assessment question: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error updating assessment question",
                error_code="ASSESSMENT_UPDATE_ERROR",
            )

    async def delete_assessment_question(self, question_id: int) -> None:
        """
        Delete an assessment question.

        Args:
            question_id: ID of the question to delete

        Raises:
            AppError: If question not found or deletion fails
        """
        try:
            await self._check_admin_mentor()

            # Fetch the question
            stmt = select(AssessmentQuestion).where(AssessmentQuestion.question_id == question_id)
            result = await self.db_session.execute(stmt)
            question = result.scalar_one_or_none()

            if not question:
                raise AppError(
                    status_code=404,
                    detail="Assessment question not found",
                    error_code="ASSESSMENT_NOT_FOUND",
                )

            await self.db_session.delete(question)
            await self.db_session.commit()

            logger.info(
                f"Assessment question deleted: {question_id} by {self.current_user.get('user_id')}"
            )

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error deleting assessment question: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error deleting assessment question",
                error_code="ASSESSMENT_DELETE_ERROR",
            )

    async def get_module(self, module_id: int) -> Optional[Module]:
        """Get a module by ID."""
        try:
            stmt = select(Module).where(Module.module_id == module_id)
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching module: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching module",
                error_code="MODULE_FETCH_ERROR",
            )
