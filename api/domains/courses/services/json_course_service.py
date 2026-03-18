#!/usr/bin/python3
"""
Service for creating and updating courses via a JSON payload.

Implements upsert (create-or-update) semantics for the full hierarchy:
    Course → Track (LearningPath) → Modules → Lessons / Projects / Quizzes
"""
from typing import Tuple
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domains.courses.models.course import Course, LearningPath, Module, Lesson, Project
from domains.courses.models.assessment import AssessmentQuestion
from domains.courses.schemas.json_course_schema import (
    CourseJsonInput,
    TrackInput,
    ModuleInput,
    LessonInput,
    ProjectInput,
    QuizInput,
    ItemCounts,
    JsonImportResponse,
)
from domains.users.models.user import User, UserRole
from core.errors import AppError
from core.constant import SkillLevel, ContentType
import logging

logger = logging.getLogger(__name__)


class JsonCourseService:
    """
    Service that accepts a parsed :class:`CourseJsonInput` and performs
    idempotent create-or-update operations for the entire course hierarchy.
    """

    def __init__(self, db_session: AsyncSession, current_user: dict):
        self.db_session = db_session
        self.current_user = current_user

    # ------------------------------------------------------------------
    # Auth helpers
    # ------------------------------------------------------------------

    def _check_admin_mentor(self) -> None:
        """Raise 403 if the caller is neither admin nor mentor."""
        if self.current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise AppError(
                status_code=403,
                detail="Only admins and mentors can import courses",
                error_code="FORBIDDEN",
            )

    # ------------------------------------------------------------------
    # Skill-level coercion helper
    # ------------------------------------------------------------------

    @staticmethod
    def _to_skill_level(value: str | None) -> SkillLevel | None:
        """Convert a string to :class:`SkillLevel` enum, or return *None*."""
        if value is None:
            return None
        for member in SkillLevel:
            if member.value.lower() == value.lower() or member.name.lower() == value.lower():
                return member
        return None

    # ------------------------------------------------------------------
    # Content-type coercion helper
    # ------------------------------------------------------------------

    @staticmethod
    def _to_content_type(value: str | None) -> ContentType | None:
        """Convert a string to :class:`ContentType` enum, or return *None*."""
        if value is None:
            return None
        for member in ContentType:
            if member.value.lower() == value.lower() or member.name.lower() == value.lower():
                return member
        return None

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def import_course(self, data: CourseJsonInput) -> JsonImportResponse:
        """
        Create or update a course (and its full hierarchy) from the supplied
        :class:`CourseJsonInput`.

        Returns:
            :class:`JsonImportResponse` summarising what was created/updated.

        Raises:
            :class:`AppError`: on permission, validation, or database errors.
        """
        self._check_admin_mentor()

        try:
            course, course_action = await self._upsert_course(data)
            track, track_action = await self._upsert_track(course, data.track)

            module_counts = ItemCounts()
            lesson_counts = ItemCounts()
            project_counts = ItemCounts()
            quiz_counts = ItemCounts()

            for module_data in (data.track.modules or []):
                module, m_action = await self._upsert_module(track, module_data)
                if m_action == "created":
                    module_counts.created += 1
                else:
                    module_counts.updated += 1

                for lesson_data in (module_data.lessons or []):
                    _, l_action = await self._upsert_lesson(module, lesson_data)
                    if l_action == "created":
                        lesson_counts.created += 1
                    else:
                        lesson_counts.updated += 1

                for project_data in (module_data.projects or []):
                    _, p_action = await self._upsert_project(module, project_data)
                    if p_action == "created":
                        project_counts.created += 1
                    else:
                        project_counts.updated += 1

                for quiz_data in (module_data.quizzes or []):
                    _, q_action = await self._upsert_quiz(module, quiz_data)
                    if q_action == "created":
                        quiz_counts.created += 1
                    else:
                        quiz_counts.updated += 1

            await self.db_session.commit()

            logger.info(
                "JSON import completed for course '%s' (%s) by %s",
                data.course_name,
                course_action,
                self.current_user.get("email"),
            )

            return JsonImportResponse(
                action=course_action,
                course_id=course.course_id,
                course_name=course.title,
                track_action=track_action,
                track_id=track.path_id,
                track_name=track.title,
                modules=module_counts,
                lessons=lesson_counts,
                projects=project_counts,
                quizzes=quiz_counts,
            )

        except AppError:
            await self.db_session.rollback()
            raise
        except Exception as exc:
            await self.db_session.rollback()
            logger.exception("Unexpected error during JSON course import: %s", exc)
            raise AppError(
                status_code=500,
                detail="Error processing course JSON import",
                error_code="JSON_IMPORT_ERROR",
            )

    # ------------------------------------------------------------------
    # Course upsert
    # ------------------------------------------------------------------

    async def _upsert_course(self, data: CourseJsonInput) -> Tuple[Course, str]:
        """
        Find an existing course by *title* and update it, or create a new one.

        Returns ``(course, action)`` where *action* is ``"created"`` or
        ``"updated"``.
        """
        stmt = select(Course).where(Course.title == data.course_name)
        result = await self.db_session.execute(stmt)
        course = result.scalar_one_or_none()

        if course is None:
            # Ensure the slug is not already taken by a different course
            slug_stmt = select(Course).where(Course.slug == data.slug)
            slug_result = await self.db_session.execute(slug_stmt)
            if slug_result.scalar_one_or_none():
                raise AppError(
                    status_code=400,
                    detail=f"Slug '{data.slug}' is already in use by another course",
                    error_code="SLUG_EXISTS",
                )

            course = Course(
                title=data.course_name,
                slug=data.slug,
                description=data.description,
                estimated_hours=data.estimated_hours,
                difficulty_level=data.difficulty_level,
                cover_image_url=data.cover_image_url,
                prerequisites=data.prerequisites or [],
                what_youll_learn=data.what_youll_learn or [],
                certificate_on_completion=data.certificate_on_completion,
                created_by=self.current_user.get("user_id"),
            )
            self.db_session.add(course)
            await self.db_session.flush()  # populate course_id without full commit
            return course, "created"

        # Update existing course
        course.description = data.description
        course.estimated_hours = data.estimated_hours
        course.difficulty_level = data.difficulty_level
        if data.cover_image_url is not None:
            course.cover_image_url = data.cover_image_url
        if data.prerequisites is not None:
            course.prerequisites = data.prerequisites
        if data.what_youll_learn is not None:
            course.what_youll_learn = data.what_youll_learn
        course.certificate_on_completion = data.certificate_on_completion
        course.updated_at = datetime.now(timezone.utc)

        # If the slug changed and the new slug is free, apply it
        if data.slug != course.slug:
            slug_stmt = select(Course).where(Course.slug == data.slug)
            slug_result = await self.db_session.execute(slug_stmt)
            if slug_result.scalar_one_or_none():
                raise AppError(
                    status_code=400,
                    detail=f"Slug '{data.slug}' is already in use by another course",
                    error_code="SLUG_EXISTS",
                )
            course.slug = data.slug

        self.db_session.add(course)
        await self.db_session.flush()
        return course, "updated"

    # ------------------------------------------------------------------
    # Track (LearningPath) upsert
    # ------------------------------------------------------------------

    async def _upsert_track(
        self, course: Course, data: TrackInput
    ) -> Tuple[LearningPath, str]:
        """
        Find an existing track by *title* within the given *course* and update
        it, or create a new one.
        """
        stmt = select(LearningPath).where(
            LearningPath.course_id == course.course_id,
            LearningPath.title == data.track_name,
        )
        result = await self.db_session.execute(stmt)
        track = result.scalar_one_or_none()

        min_level = self._to_skill_level(data.min_skill_level)
        max_level = self._to_skill_level(data.max_skill_level)

        if track is None:
            track = LearningPath(
                course_id=course.course_id,
                title=data.track_name,
                description=data.description,
                price=data.price or 0.00,
                is_default=data.is_default,
                min_skill_level=min_level,
                max_skill_level=max_level,
                tags=data.tags or [],
                created_by=self.current_user.get("user_id"),
            )
            self.db_session.add(track)
            await self.db_session.flush()
            return track, "created"

        # Update existing track
        track.description = data.description
        if data.price is not None:
            track.price = data.price
        track.is_default = data.is_default
        if min_level is not None:
            track.min_skill_level = min_level
        if max_level is not None:
            track.max_skill_level = max_level
        if data.tags is not None:
            track.tags = data.tags
        track.updated_at = datetime.now(timezone.utc)

        self.db_session.add(track)
        await self.db_session.flush()
        return track, "updated"

    # ------------------------------------------------------------------
    # Module upsert
    # ------------------------------------------------------------------

    async def _upsert_module(
        self, track: LearningPath, data: ModuleInput
    ) -> Tuple[Module, str]:
        """
        Find an existing module by *title* within the given *track* and update
        it, or create a new one.
        """
        stmt = select(Module).where(
            Module.path_id == track.path_id,
            Module.title == data.module_name,
        )
        result = await self.db_session.execute(stmt)
        module = result.scalar_one_or_none()

        if module is None:
            module = Module(
                path_id=track.path_id,
                title=data.module_name,
                description=data.description,
                order=data.order,
                estimated_hours=data.estimated_hours,
                unlock_after_days=data.unlock_after_days,
                is_available_by_default=data.is_available_by_default,
                first_deadline_days=data.first_deadline_days,
                second_deadline_days=data.second_deadline_days,
                third_deadline_days=data.third_deadline_days,
            )
            self.db_session.add(module)
            await self.db_session.flush()
            return module, "created"

        # Update existing module
        module.description = data.description
        module.order = data.order
        if data.estimated_hours is not None:
            module.estimated_hours = data.estimated_hours
        module.unlock_after_days = data.unlock_after_days
        module.is_available_by_default = data.is_available_by_default
        if data.first_deadline_days is not None:
            module.first_deadline_days = data.first_deadline_days
        if data.second_deadline_days is not None:
            module.second_deadline_days = data.second_deadline_days
        if data.third_deadline_days is not None:
            module.third_deadline_days = data.third_deadline_days
        module.updated_at = datetime.now(timezone.utc)

        self.db_session.add(module)
        await self.db_session.flush()
        return module, "updated"

    # ------------------------------------------------------------------
    # Lesson upsert
    # ------------------------------------------------------------------

    async def _upsert_lesson(
        self, module: Module, data: LessonInput
    ) -> Tuple[Lesson, str]:
        """
        Find an existing lesson by *title* within the given *module* and
        update it, or create a new one.
        """
        stmt = select(Lesson).where(
            Lesson.module_id == module.module_id,
            Lesson.title == data.title,
        )
        result = await self.db_session.execute(stmt)
        lesson = result.scalar_one_or_none()

        content_type = self._to_content_type(data.content_type)

        if lesson is None:
            lesson = Lesson(
                module_id=module.module_id,
                title=data.title,
                description=data.description,
                content=data.content,
                order=data.order,
                content_type=content_type,
                estimated_minutes=data.estimated_minutes,
                youtube_video_url=data.youtube_video_url,
                external_resources=data.external_resources or [],
                expected_outcomes=data.expected_outcomes or [],
                starter_file_url=data.starter_file_url,
                solution_file_url=data.solution_file_url,
            )
            self.db_session.add(lesson)
            await self.db_session.flush()
            return lesson, "created"

        # Update existing lesson
        lesson.description = data.description
        if data.content is not None:
            lesson.content = data.content
        lesson.order = data.order
        if content_type is not None:
            lesson.content_type = content_type
        if data.estimated_minutes is not None:
            lesson.estimated_minutes = data.estimated_minutes
        if data.youtube_video_url is not None:
            lesson.youtube_video_url = data.youtube_video_url
        if data.external_resources is not None:
            lesson.external_resources = data.external_resources
        if data.expected_outcomes is not None:
            lesson.expected_outcomes = data.expected_outcomes
        if data.starter_file_url is not None:
            lesson.starter_file_url = data.starter_file_url
        if data.solution_file_url is not None:
            lesson.solution_file_url = data.solution_file_url
        lesson.updated_at = datetime.now(timezone.utc)

        self.db_session.add(lesson)
        await self.db_session.flush()
        return lesson, "updated"

    # ------------------------------------------------------------------
    # Project upsert
    # ------------------------------------------------------------------

    async def _upsert_project(
        self, module: Module, data: ProjectInput
    ) -> Tuple[Project, str]:
        """
        Find an existing project by *title* within the given *module* and
        update it, or create a new one.
        """
        stmt = select(Project).where(
            Project.module_id == module.module_id,
            Project.title == data.title,
        )
        result = await self.db_session.execute(stmt)
        project = result.scalar_one_or_none()

        if project is None:
            project = Project(
                module_id=module.module_id,
                title=data.title,
                description=data.description,
                order=data.order,
                estimated_hours=data.estimated_hours,
                starter_repo_url=data.starter_repo_url,
                solution_repo_url=data.solution_repo_url,
                required_skills=data.required_skills or [],
                first_deadline_days=data.first_deadline_days,
                second_deadline_days=data.second_deadline_days,
                third_deadline_days=data.third_deadline_days,
            )
            self.db_session.add(project)
            await self.db_session.flush()
            return project, "created"

        # Update existing project
        project.description = data.description
        project.order = data.order
        if data.estimated_hours is not None:
            project.estimated_hours = data.estimated_hours
        if data.starter_repo_url is not None:
            project.starter_repo_url = data.starter_repo_url
        if data.solution_repo_url is not None:
            project.solution_repo_url = data.solution_repo_url
        if data.required_skills is not None:
            project.required_skills = data.required_skills
        if data.first_deadline_days is not None:
            project.first_deadline_days = data.first_deadline_days
        if data.second_deadline_days is not None:
            project.second_deadline_days = data.second_deadline_days
        if data.third_deadline_days is not None:
            project.third_deadline_days = data.third_deadline_days
        project.updated_at = datetime.now(timezone.utc)

        self.db_session.add(project)
        await self.db_session.flush()
        return project, "updated"

    # ------------------------------------------------------------------
    # Quiz (AssessmentQuestion) upsert
    # ------------------------------------------------------------------

    async def _upsert_quiz(
        self, module: Module, data: QuizInput
    ) -> Tuple[AssessmentQuestion, str]:
        """
        Find an existing quiz question by *question_text* within the given
        *module* and update it, or create a new one.
        """
        stmt = select(AssessmentQuestion).where(
            AssessmentQuestion.module_id == module.module_id,
            AssessmentQuestion.question_text == data.question_text,
        )
        result = await self.db_session.execute(stmt)
        question = result.scalar_one_or_none()

        if question is None:
            question = AssessmentQuestion(
                module_id=module.module_id,
                question_text=data.question_text,
                question_type=data.question_type,
                difficulty_level=data.difficulty_level,
                order=data.order,
                options=data.options,
                correct_answer=data.correct_answer,
                explanation=data.explanation,
                points=data.points,
            )
            self.db_session.add(question)
            await self.db_session.flush()
            return question, "created"

        # Update existing question
        question.question_type = data.question_type
        question.difficulty_level = data.difficulty_level
        question.order = data.order
        if data.options is not None:
            question.options = data.options
        question.correct_answer = data.correct_answer
        if data.explanation is not None:
            question.explanation = data.explanation
        question.points = data.points
        question.updated_at = datetime.now(timezone.utc)

        self.db_session.add(question)
        await self.db_session.flush()
        return question, "updated"
