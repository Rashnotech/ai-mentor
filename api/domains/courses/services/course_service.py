#!/usr/bin/python3
"""Core course domain service used by admin routes."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, List, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppError
from domains.courses.models.course import Course, LearningPath, Module, Lesson, Project
from domains.courses.models.assessment import AssessmentQuestion


class CourseService:
    """Service layer for course, path, module, lesson, project and assessment operations."""

    def __init__(self, db_session: AsyncSession, current_user: Any):
        self.db_session = db_session
        self.current_user = current_user

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
        existing_stmt = select(Course).where(Course.slug == slug)
        existing = (await self.db_session.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            raise AppError(400, f"Slug '{slug}' is already in use", "COURSE_SLUG_EXISTS")

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
            created_by=str(self.current_user.get("user_id")) if self.current_user else None,
        )
        self.db_session.add(course)
        await self.db_session.commit()
        await self.db_session.refresh(course)
        return course

    async def create_learning_path(
        self,
        course_id: int,
        title: str,
        description: str,
        price: Optional[float] = 0.00,
        min_skill_level=None,
        max_skill_level=None,
        tags: Optional[List[str]] = None,
        is_default: bool = False,
    ) -> LearningPath:
        course = await self._get_course(course_id)

        if is_default:
            await self._unset_default_paths(course.course_id)

        path = LearningPath(
            course_id=course.course_id,
            title=title,
            description=description,
            price=price,
            min_skill_level=min_skill_level,
            max_skill_level=max_skill_level,
            tags=tags,
            is_default=is_default,
            created_by=str(self.current_user.get("user_id")) if self.current_user else None,
        )
        self.db_session.add(path)
        await self.db_session.commit()
        await self.db_session.refresh(path)
        return path

    async def update_learning_path(
        self,
        path_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        price: Optional[float] = None,
        min_skill_level=None,
        max_skill_level=None,
        tags: Optional[List[str]] = None,
        is_default: Optional[bool] = None,
    ) -> LearningPath:
        path = await self._get_path(path_id)

        if is_default is True:
            await self._unset_default_paths(path.course_id)
            path.is_default = True
        elif is_default is False:
            path.is_default = False

        if title is not None:
            path.title = title
        if description is not None:
            path.description = description
        if price is not None:
            path.price = price
        if min_skill_level is not None:
            path.min_skill_level = min_skill_level
        if max_skill_level is not None:
            path.max_skill_level = max_skill_level
        if tags is not None:
            path.tags = tags

        await self.db_session.commit()
        await self.db_session.refresh(path)
        return path

    async def delete_learning_path(self, path_id: int) -> None:
        path = await self._get_path(path_id)
        await self.db_session.delete(path)
        await self.db_session.commit()

    async def set_default_path(self, course_id: int, path_id: int) -> LearningPath:
        path = await self._get_path(path_id)
        if path.course_id != course_id:
            raise AppError(400, "Path does not belong to the specified course", "PATH_COURSE_MISMATCH")

        await self._unset_default_paths(course_id)
        path.is_default = True
        await self.db_session.commit()
        await self.db_session.refresh(path)
        return path

    async def unset_default_path(self, course_id: int, path_id: int) -> LearningPath:
        path = await self._get_path(path_id)
        if path.course_id != course_id:
            raise AppError(400, "Path does not belong to the specified course", "PATH_COURSE_MISMATCH")

        path.is_default = False
        await self.db_session.commit()
        await self.db_session.refresh(path)
        return path

    async def create_module(
        self,
        path_id: int,
        title: str,
        description: str,
        order: int,
        estimated_hours: Optional[int] = None,
        unlock_after_days: int = 0,
        is_available_by_default: bool = True,
        first_deadline_days: Optional[int] = None,
        second_deadline_days: Optional[int] = None,
        third_deadline_days: Optional[int] = None,
    ) -> Module:
        await self._get_path(path_id)

        module = Module(
            path_id=path_id,
            title=title,
            description=description,
            order=order,
            estimated_hours=estimated_hours,
            unlock_after_days=unlock_after_days,
            is_available_by_default=is_available_by_default,
            first_deadline_days=first_deadline_days,
            second_deadline_days=second_deadline_days,
            third_deadline_days=third_deadline_days,
        )
        self.db_session.add(module)
        await self.db_session.commit()
        await self.db_session.refresh(module)
        return module

    async def create_lesson(
        self,
        module_id: int,
        title: str,
        description: str,
        content: Optional[str],
        order: int,
        content_type=None,
        estimated_minutes: Optional[int] = None,
        youtube_video_url: Optional[str] = None,
        external_resources: Optional[List[str]] = None,
        expected_outcomes: Optional[List[str]] = None,
        starter_file_url: Optional[str] = None,
        solution_file_url: Optional[str] = None,
    ) -> Lesson:
        await self._get_module(module_id)

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
        return lesson

    async def list_lessons(self, module_id: int) -> List[Lesson]:
        await self._get_module(module_id)
        stmt = select(Lesson).where(Lesson.module_id == module_id).order_by(Lesson.order)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def update_lesson(
        self,
        lesson_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        content: Optional[str] = None,
        order: Optional[int] = None,
        content_type=None,
        estimated_minutes: Optional[int] = None,
        youtube_video_url: Optional[str] = None,
        external_resources: Optional[List[str]] = None,
        expected_outcomes: Optional[List[str]] = None,
        starter_file_url: Optional[str] = None,
        solution_file_url: Optional[str] = None,
    ) -> Lesson:
        lesson = await self._get_lesson(lesson_id)

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
        return lesson

    async def delete_lesson(self, lesson_id: int) -> None:
        lesson = await self._get_lesson(lesson_id)
        await self.db_session.delete(lesson)
        await self.db_session.commit()

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
        await self._get_module(module_id)

        project = Project(
            module_id=module_id,
            title=title,
            description=description,
            order=order,
            estimated_hours=estimated_hours,
            starter_repo_url=starter_repo_url,
            solution_repo_url=solution_repo_url,
            required_skills=required_skills,
        )
        self.db_session.add(project)
        await self.db_session.commit()
        await self.db_session.refresh(project)
        return project

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
        project = await self._get_project(project_id)

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

        await self.db_session.commit()
        await self.db_session.refresh(project)
        return project

    async def delete_project(self, project_id: int) -> None:
        project = await self._get_project(project_id)
        await self.db_session.delete(project)
        await self.db_session.commit()

    async def create_assessment_question(
        self,
        module_id: int,
        question_text: str,
        question_type: str,
        difficulty_level: Optional[str],
        order: int,
        options: Optional[List[str]],
        correct_answer: Optional[str],
        explanation: Optional[str],
        points: Optional[int] = 10,
    ) -> AssessmentQuestion:
        await self._get_module(module_id)

        question = AssessmentQuestion(
            module_id=module_id,
            question_text=question_text,
            question_type=question_type,
            difficulty_level=difficulty_level,
            order=order,
            options=options,
            correct_answer=correct_answer,
            explanation=explanation,
            points=points or 10,
        )
        self.db_session.add(question)
        await self.db_session.commit()
        await self.db_session.refresh(question)
        return question

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
        question = await self._get_assessment_question(question_id)

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

        await self.db_session.commit()
        await self.db_session.refresh(question)
        return question

    async def delete_assessment_question(self, question_id: int) -> None:
        question = await self._get_assessment_question(question_id)
        await self.db_session.delete(question)
        await self.db_session.commit()

    async def _unset_default_paths(self, course_id: int) -> None:
        stmt = select(LearningPath).where(
            LearningPath.course_id == course_id,
            LearningPath.is_default == True,
        )
        result = await self.db_session.execute(stmt)
        current_defaults = result.scalars().all()
        for path in current_defaults:
            path.is_default = False

    async def _get_course(self, course_id: int) -> Course:
        stmt = select(Course).where(Course.course_id == course_id)
        course = (await self.db_session.execute(stmt)).scalar_one_or_none()
        if not course:
            raise AppError(404, "Course not found", "COURSE_NOT_FOUND")
        return course

    async def _get_path(self, path_id: int) -> LearningPath:
        stmt = select(LearningPath).where(LearningPath.path_id == path_id)
        path = (await self.db_session.execute(stmt)).scalar_one_or_none()
        if not path:
            raise AppError(404, "Learning path not found", "LEARNING_PATH_NOT_FOUND")
        return path

    async def _get_module(self, module_id: int) -> Module:
        stmt = select(Module).where(Module.module_id == module_id)
        module = (await self.db_session.execute(stmt)).scalar_one_or_none()
        if not module:
            raise AppError(404, "Module not found", "MODULE_NOT_FOUND")
        return module

    async def _get_lesson(self, lesson_id: int) -> Lesson:
        stmt = select(Lesson).where(Lesson.lesson_id == lesson_id)
        lesson = (await self.db_session.execute(stmt)).scalar_one_or_none()
        if not lesson:
            raise AppError(404, "Lesson not found", "LESSON_NOT_FOUND")
        return lesson

    async def _get_project(self, project_id: int) -> Project:
        stmt = select(Project).where(Project.project_id == project_id)
        project = (await self.db_session.execute(stmt)).scalar_one_or_none()
        if not project:
            raise AppError(404, "Project not found", "PROJECT_NOT_FOUND")
        return project

    async def _get_assessment_question(self, question_id: int) -> AssessmentQuestion:
        stmt = select(AssessmentQuestion).where(AssessmentQuestion.question_id == question_id)
        question = (await self.db_session.execute(stmt)).scalar_one_or_none()
        if not question:
            raise AppError(404, "Assessment question not found", "ASSESSMENT_NOT_FOUND")
        return question
