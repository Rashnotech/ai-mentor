#!/usr/bin/python3
"""
Learning path assignment service for students.
Creates personalized or default paths based on onboarding profile.
"""
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
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
        1. Reuse existing student custom path if valid
        2. Select best existing path for profile (AI-like heuristic score)
        3. Create custom path only when profile strongly benefits from tailoring
        4. Fallback to default path with required lesson structure

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

            # Reuse existing custom path first (if it still has lessons)
            existing_path = await self._get_student_custom_path(user_id, course_id)
            if existing_path and await self._path_has_required_lessons(existing_path.path_id):
                logger.info(f"Student {user_id} already has custom path {existing_path.path_id}")
                await self._update_user_enrollment(user_id, course_id, existing_path.path_id, profile)
                return self._attach_assignment_metadata(
                    existing_path,
                    reason="reused_existing_custom",
                    source_path_id=existing_path.path_id,
                    score=100,
                )

            # Choose the best existing path for this profile (or default fallback)
            best_path = await self._select_best_path_for_profile(course_id, profile)
            best_path = await self._ensure_path_has_lessons(course_id, best_path)

            if not best_path:
                raise AppError(
                    status_code=404,
                    detail="No valid learning path found for course",
                    error_code="NO_VALID_PATH",
                )

            # Custom path creation disabled - always use default or existing set path
            best_path_score = self._score_path_for_profile(best_path, profile)
            # if self._should_create_custom_path(profile, best_path):
            #     custom_path = await self._create_personalized_path(
            #         user_id=user_id,
            #         course_id=course_id,
            #         profile=profile,
            #         template_path=best_path,
            #     )
            #
            #     if custom_path and await self._path_has_required_lessons(custom_path.path_id):
            #         logger.info(f"Created personalized path {custom_path.path_id} for student {user_id}")
            #         await self._update_user_enrollment(user_id, course_id, custom_path.path_id, profile)
            #         return self._attach_assignment_metadata(
            #             custom_path,
            #             reason="created_profile_custom",
            #             source_path_id=best_path.path_id,
            #             score=best_path_score,
            #         )
            #
            #     logger.warning(
            #         "Custom path creation skipped or incomplete for user %s, falling back to best/default path %s",
            #         user_id,
            #         best_path.path_id,
            #     )

            # Reuse best available path (existing curated or default)
            await self._update_user_enrollment(user_id, course_id, best_path.path_id, profile)
            return self._attach_assignment_metadata(
                best_path,
                reason="default_path_fallback" if best_path.is_default else "best_existing_match",
                source_path_id=best_path.path_id,
                score=best_path_score,
            )

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
        template_path: Optional[LearningPath] = None,
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
            skill_level_str = profile.skill_level.value if profile and profile.skill_level else "general"
            path_title = f"Custom Path - {skill_level_str.title()}"

            # Build tags from profile + template metadata
            tags = self._build_profile_tags(profile)
            if template_path and template_path.tags:
                tags.extend(template_path.tags)
            tags = sorted(set(tags)) if tags else []

            source_path = template_path or await self._get_default_path(course_id)
            if not source_path:
                logger.warning("No source path available for personalized path creation")
                return None

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
            await self.db_session.flush()

            # Clone modules/lessons/projects from a proven source path so the custom path is usable.
            await self._clone_path_structure(source_path.path_id, custom_path.path_id)

            await self.db_session.commit()
            await self.db_session.refresh(custom_path)

            logger.info(f"Created personalized path for {user_id}: {custom_path.path_id}")
            return custom_path

        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating personalized path: {str(e)}")
            return None

    async def _clone_path_structure(self, source_path_id: int, target_path_id: int) -> None:
        """Clone modules, lessons, and projects from source path into target path."""
        modules_stmt = select(Module).where(Module.path_id == source_path_id).order_by(Module.order)
        modules_result = await self.db_session.execute(modules_stmt)
        source_modules = modules_result.scalars().all()

        for source_module in source_modules:
            cloned_module = Module(
                path_id=target_path_id,
                title=source_module.title,
                description=source_module.description,
                order=source_module.order,
                estimated_hours=source_module.estimated_hours,
                unlock_after_days=source_module.unlock_after_days,
                is_available_by_default=source_module.is_available_by_default,
                first_deadline_days=source_module.first_deadline_days,
                second_deadline_days=source_module.second_deadline_days,
                third_deadline_days=source_module.third_deadline_days,
                first_deadline=source_module.first_deadline,
                second_deadline=source_module.second_deadline,
            )
            self.db_session.add(cloned_module)
            await self.db_session.flush()

            lessons_stmt = (
                select(Lesson)
                .where(Lesson.module_id == source_module.module_id)
                .order_by(Lesson.order)
            )
            lessons_result = await self.db_session.execute(lessons_stmt)
            source_lessons = lessons_result.scalars().all()

            for source_lesson in source_lessons:
                self.db_session.add(
                    Lesson(
                        module_id=cloned_module.module_id,
                        title=source_lesson.title,
                        description=source_lesson.description,
                        content=source_lesson.content,
                        content_type=source_lesson.content_type,
                        order=source_lesson.order,
                        estimated_minutes=source_lesson.estimated_minutes,
                        youtube_video_url=source_lesson.youtube_video_url,
                        external_resources=source_lesson.external_resources,
                        expected_outcomes=source_lesson.expected_outcomes,
                        starter_file_url=source_lesson.starter_file_url,
                        solution_file_url=source_lesson.solution_file_url,
                    )
                )

            projects_stmt = (
                select(Project)
                .where(Project.module_id == source_module.module_id)
                .order_by(Project.order)
            )
            projects_result = await self.db_session.execute(projects_stmt)
            source_projects = projects_result.scalars().all()

            for source_project in source_projects:
                self.db_session.add(
                    Project(
                        module_id=cloned_module.module_id,
                        title=source_project.title,
                        description=source_project.description,
                        order=source_project.order,
                        estimated_hours=source_project.estimated_hours,
                        starter_repo_url=source_project.starter_repo_url,
                        solution_repo_url=source_project.solution_repo_url,
                        required_skills=source_project.required_skills,
                        first_deadline_days=source_project.first_deadline_days,
                        second_deadline_days=source_project.second_deadline_days,
                        third_deadline_days=source_project.third_deadline_days,
                    )
                )

    async def _path_has_required_lessons(self, path_id: int, min_lessons: int = 1) -> bool:
        """Validate that a path contains at least a minimum number of lessons."""
        lesson_count_stmt = (
            select(func.count(Lesson.lesson_id))
            .select_from(Lesson)
            .join(Module, Lesson.module_id == Module.module_id)
            .where(Module.path_id == path_id)
        )
        lesson_count_result = await self.db_session.execute(lesson_count_stmt)
        lesson_count = lesson_count_result.scalar() or 0
        return lesson_count >= min_lessons

    async def _get_course_paths(self, course_id: int) -> list[LearningPath]:
        """Get all paths for a course."""
        stmt = select(LearningPath).where(LearningPath.course_id == course_id)
        result = await self.db_session.execute(stmt)
        return result.scalars().all()

    async def _select_best_path_for_profile(
        self,
        course_id: int,
        profile: Optional[UserProfile],
    ) -> Optional[LearningPath]:
        """Choose the best available path using profile-aware heuristic scoring."""
        candidate_paths = await self._get_course_paths(course_id)
        if not candidate_paths:
            return None

        # Prefer curated paths for assignment; student-specific custom paths are handled separately.
        curated_candidates = [p for p in candidate_paths if not p.is_custom]
        if not curated_candidates:
            curated_candidates = candidate_paths

        best_path = None
        best_score = -10_000

        for path in curated_candidates:
            score = self._score_path_for_profile(path, profile)
            if score > best_score:
                best_score = score
                best_path = path

        return best_path

    async def _ensure_path_has_lessons(
        self,
        course_id: int,
        candidate_path: Optional[LearningPath],
    ) -> Optional[LearningPath]:
        """Ensure selected path has lesson structure; fallback to best valid/default path."""
        if candidate_path and await self._path_has_required_lessons(candidate_path.path_id):
            return candidate_path

        default_path = await self._get_default_path(course_id)
        if default_path and await self._path_has_required_lessons(default_path.path_id):
            return default_path

        course_paths = await self._get_course_paths(course_id)
        for path in course_paths:
            if await self._path_has_required_lessons(path.path_id):
                return path

        return None

    def _score_path_for_profile(
        self,
        path: LearningPath,
        profile: Optional[UserProfile],
    ) -> int:
        """Profile-aware scoring for existing path selection."""
        score = 0

        if path.is_default:
            score += 15

        if not profile:
            return score

        if profile.skill_level:
            if path.min_skill_level == profile.skill_level:
                score += 45
            elif not path.min_skill_level:
                score += 10

            if path.max_skill_level == profile.skill_level:
                score += 20
            elif not path.max_skill_level:
                score += 5

        path_tags = {t.lower() for t in (path.tags or [])}
        profile_tags = {t.lower() for t in self._build_profile_tags(profile)}
        score += len(path_tags.intersection(profile_tags)) * 25

        return score

    def _build_profile_tags(self, profile: Optional[UserProfile]) -> list[str]:
        """Build canonical tags from profile for matching and path metadata."""
        if not profile:
            return []

        tags: list[str] = []
        if profile.learning_style:
            tags.append(f"style-{profile.learning_style.value.lower()}")
        if profile.primary_goal:
            tags.append(f"goal-{profile.primary_goal.value.lower()}")

        return tags

    def _should_create_custom_path(
        self,
        profile: Optional[UserProfile],
        best_path: Optional[LearningPath],
    ) -> bool:
        """Create custom path only when profile needs aren't well captured by existing paths."""
        if not profile:
            return False
        if not best_path:
            return False

        # If no meaningful profile info, default/curated is usually enough.
        if not any([profile.skill_level, profile.learning_style, profile.primary_goal]):
            return False

        # If path already aligns well with profile, avoid unnecessary custom path churn.
        match_score = self._score_path_for_profile(best_path, profile)
        if match_score >= 70:
            return False

        # Create custom only for stronger personalization intent.
        return bool(profile.learning_style or profile.primary_goal)

    def _attach_assignment_metadata(
        self,
        path: LearningPath,
        reason: str,
        source_path_id: Optional[int] = None,
        score: Optional[int] = None,
    ) -> LearningPath:
        """Attach transient assignment metadata used by enrollment responses."""
        setattr(path, "assignment_reason", reason)
        setattr(path, "assignment_source_path_id", source_path_id)
        setattr(path, "assignment_score", score)
        return path

    async def get_student_path(
        self, user_id: str, course_id: int
    ) -> Optional[LearningPath]:
        """
        Get the assigned learning path for a student in a course.

        First checks for custom path, then default.
        """
        try:
            profile = await self._get_user_profile(user_id)
            if profile and profile.current_path_id:
                current_path_stmt = select(LearningPath).where(
                    LearningPath.path_id == profile.current_path_id,
                    LearningPath.course_id == course_id,
                )
                current_path_result = await self.db_session.execute(current_path_stmt)
                current_path = current_path_result.scalar_one_or_none()
                if current_path:
                    return current_path

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
