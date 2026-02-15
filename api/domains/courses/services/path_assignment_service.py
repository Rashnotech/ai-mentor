#!/usr/bin/python3
"""
Learning path assignment service for students.
Creates personalized or default paths based on onboarding profile.
"""
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from domains.courses.models.course import Course, LearningPath, Module, Lesson, Project
from domains.users.models.onboarding import UserProfile
from domains.users.models.user import User
from core.constant import SkillLevel, LearningStyle, UserGoal
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)


class PathAssignmentService:
    """Service for assigning and creating personalized learning paths."""

    def __init__(self, db_session: AsyncSession):
        """
        Initialize PathAssignmentService.

        Args:
            db_session: Async database session
        """
        self.db_session = db_session

    async def assign_path_for_student(
        self,
        user_id: str,
        course_id: int,
    ) -> LearningPath:
        """
        Assign or create a learning path for a student based on their onboarding profile.

        Strategy:
        1. Try to find existing custom path matching student's profile
        2. If not found, create new custom path tailored to student
        3. Fallback to default path if creation fails

        Args:
            user_id: Student user ID
            course_id: Course to assign path for

        Returns:
            Assigned LearningPath (custom or default)

        Raises:
            AppError: If course not found or assignment fails
        """
        try:
            # Get student's onboarding profile
            profile = await self._get_user_profile(user_id)
            if not profile:
                logger.warning(f"Profile not found for user {user_id}, assigning default path")
                default_path = await self._get_default_path(course_id)
                # Create a basic profile for enrollment tracking
                await self._update_user_enrollment(user_id, course_id, default_path.path_id if default_path else None)
                return default_path

            # Check if student already has a custom path for this course
            existing_path = await self._get_student_custom_path(user_id, course_id)
            if existing_path:
                logger.info(f"Student {user_id} already has custom path {existing_path.path_id}")
                # Update profile with this enrollment
                await self._update_user_enrollment(user_id, course_id, existing_path.path_id, profile)
                return existing_path

            # Try to create personalized path
            custom_path = await self._create_personalized_path(
                user_id=user_id,
                course_id=course_id,
                profile=profile,
            )

            if custom_path:
                logger.info(f"Created personalized path {custom_path.path_id} for student {user_id}")
                # Update profile with new enrollment
                await self._update_user_enrollment(user_id, course_id, custom_path.path_id, profile)
                return custom_path

            # Fallback to default path
            logger.info(f"No personalized path created, assigning default path to {user_id}")
            default_path = await self._get_default_path(course_id)
            if not default_path:
                raise AppError(
                    status_code=404,
                    detail="No default path found for course",
                    error_code="NO_DEFAULT_PATH",
                )

            # Update profile with default path enrollment
            await self._update_user_enrollment(user_id, course_id, default_path.path_id, profile)
            return default_path

        except AppError:
            raise
        except Exception as e:
            logger.error(f"Error assigning path for student {user_id}: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error assigning learning path",
                error_code="PATH_ASSIGNMENT_ERROR",
            )

    async def _update_user_enrollment(
        self, 
        user_id: str, 
        course_id: int, 
        path_id: Optional[int],
        profile: Optional[UserProfile] = None
    ) -> None:
        """Update user profile with enrollment information."""
        from datetime import datetime, timezone
        
        try:
            if profile:
                # Update existing profile
                profile.selected_course_id = str(course_id)
                profile.current_path_id = path_id
                profile.updated_at = datetime.now(timezone.utc)
                await self.db_session.commit()
                logger.info(f"Updated enrollment for user {user_id}: course={course_id}, path={path_id}")
            else:
                # Create a new profile for the user with enrollment info
                new_profile = UserProfile(
                    user_id=user_id,
                    selected_course_id=str(course_id),
                    current_path_id=path_id,
                    onboarding_completed=False,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                self.db_session.add(new_profile)
                await self.db_session.commit()
                logger.info(f"Created profile with enrollment for user {user_id}: course={course_id}, path={path_id}")
        except Exception as e:
            logger.error(f"Error updating user enrollment: {str(e)}")
            await self.db_session.rollback()
            # Don't raise - enrollment should still proceed

    async def _get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user's onboarding profile."""
        try:
            stmt = select(UserProfile).where(UserProfile.user_id == user_id)
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching user profile: {str(e)}")
            return None

    async def _get_default_path(self, course_id: int) -> Optional[LearningPath]:
        """Get the default learning path for a course."""
        try:
            stmt = select(LearningPath).where(
                and_(
                    LearningPath.course_id == course_id,
                    LearningPath.is_default == True,
                )
            )
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching default path: {str(e)}")
            return None

    async def _get_student_custom_path(
        self, user_id: str, course_id: int
    ) -> Optional[LearningPath]:
        """Get student's existing custom path for a course."""
        try:
            stmt = select(LearningPath).where(
                and_(
                    LearningPath.course_id == course_id,
                    LearningPath.created_by == user_id,
                    LearningPath.is_custom == True,
                )
            )
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching student custom path: {str(e)}")
            return None

    async def _create_personalized_path(
        self,
        user_id: str,
        course_id: int,
        profile: UserProfile,
    ) -> Optional[LearningPath]:
        """
        Create a personalized learning path based on student profile.

        Personalization factors:
        - Skill level: Match min_skill_level to student's level
        - Learning style: Add tag for their learning style
        - Primary goal: Add tag for their goal
        """
        try:
            # Generate path title based on profile
            skill_level_str = profile.skill_level.value if profile.skill_level else "general"
            path_title = f"Custom Path - {skill_level_str.title()}"

            # Build tags from profile
            tags = []
            if profile.learning_style:
                tags.append(f"style-{profile.learning_style.value.lower()}")
            if profile.primary_goal:
                tags.append(f"goal-{profile.primary_goal.value.lower()}")

            # Create custom path
            custom_path = LearningPath(
                course_id=course_id,
                title=path_title,
                description=f"Personalized learning path for {profile.learning_style.value if profile.learning_style else 'self-paced'} learner targeting {profile.primary_goal.value if profile.primary_goal else 'general'} goals.",
                is_default=False,
                is_custom=True,
                created_by=user_id,
                min_skill_level=profile.skill_level,
                max_skill_level=profile.skill_level,
                tags=tags,
            )

            self.db_session.add(custom_path)
            await self.db_session.commit()
            await self.db_session.refresh(custom_path)

            logger.info(f"Created personalized path for {user_id}: {custom_path.path_id}")
            return custom_path

        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating personalized path: {str(e)}")
            return None

    async def get_student_path(
        self, user_id: str, course_id: int
    ) -> Optional[LearningPath]:
        """
        Get the assigned learning path for a student in a course.

        First checks for custom path, then default.
        """
        try:
            custom_path = await self._get_student_custom_path(user_id, course_id)
            if custom_path:
                return custom_path

            return await self._get_default_path(course_id)
        except Exception as e:
            logger.error(f"Error getting student path: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching learning path",
                error_code="PATH_FETCH_ERROR",
            )

    async def get_path_structure(self, path_id: int) -> dict:
        """
        Get complete path structure with all modules, lessons, and projects.

        Returns:
            Dictionary with path details and nested content structure
        """
        try:
            path = await self._get_path_by_id(path_id)
            if not path:
                raise AppError(
                    status_code=404,
                    detail="Learning path not found",
                    error_code="PATH_NOT_FOUND",
                )

            # Fetch modules
            modules_stmt = select(Module).where(Module.path_id == path_id).order_by(Module.order)
            modules_result = await self.db_session.execute(modules_stmt)
            modules = modules_result.scalars().all()

            # Build structure
            structure = {
                "path": path,
                "modules": [],
            }

            for module in modules:
                # Get lessons
                lessons_stmt = (
                    select(Lesson)
                    .where(Lesson.module_id == module.module_id)
                    .order_by(Lesson.order)
                )
                lessons_result = await self.db_session.execute(lessons_stmt)
                lessons = lessons_result.scalars().all()

                # Get projects
                projects_stmt = (
                    select(Project)
                    .where(Project.module_id == module.module_id)
                    .order_by(Project.order)
                )
                projects_result = await self.db_session.execute(projects_stmt)
                projects = projects_result.scalars().all()

                module_data = {
                    "module": module,
                    "lessons": lessons,
                    "projects": projects,
                }
                structure["modules"].append(module_data)

            return structure

        except AppError:
            raise
        except Exception as e:
            logger.error(f"Error getting path structure: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching path structure",
                error_code="PATH_STRUCTURE_ERROR",
            )

    async def _get_path_by_id(self, path_id: int) -> Optional[LearningPath]:
        """Get learning path by ID."""
        try:
            stmt = select(LearningPath).where(LearningPath.path_id == path_id)
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching path: {str(e)}")
            return None
