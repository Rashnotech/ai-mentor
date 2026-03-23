#!/usr/bin/python3
"""a module that calculate progres"""
from sqlalchemy import select, func
from app.db.models import LessonProgress, ModuleProgress, CourseProgress, Lesson, Module, Course


class ProgressRepository:
    async def mark_lesson_complete(self, session, user_id, lesson_id, score, time_spent):
        lp = LessonProgress(
            user_id=user_id,
            lesson_id=lesson_id,
            completed=True,
            score=score,
            time_spend=time_spent
        )
        session.add(lp)
        await session.flush()

        # update module progress
        module_id = (await session.execute(
            select(Lesson.module_id).where(Lesson.id == lesson_id)
        )).scalar_one()

        total_lessons = (await session.execute(
            select(func.count(Lesson.id)).where(Lesson.module_id == module_id)
        )).scalar_one()

        completed_lessons = (await session.execute(
            select(func.count(LessonProgress.id)).where(
                LessonProgress.user_id == user_id,
                LessonProgress.lesson_id == lesson_id,
                LessonProgress.completed == True,
                LessonProgress.lesson_id.in_(select(Lesson.id).where(Lesson.module_id==module_id))
            )
        )).scalar_one()

        progress_percent = int(completed_lessons / total_lessons * 100)
        mp = ModuleProgress(
            user_id=user_id,
            module_id=module_id,
            completed=(progress_percent == 100),
            progress_percent=progress_percent
        )
        session.add(mp)
        await session.flush()

        # update course progress
        course_id = (await session.execute(
            select(Module.course_id).where(Module.id == module_id)
        )).scalar_one()

        total_modules = (await session.execute(
            select(func.count(Module.id)).where(Module.course_id == course_id)
        )).scalar_one()

        completed_modules = (await session.execute(
            select(func.count(ModuleProgress.id)).where(
                ModuleProgress.user_id == user_id,
                ModuleProgress.module_id.in_(select(Module.id).where(Module.course_id==course_id))
        ))).scalar_one()

        cp = CourseProgress(
            user_id=user_id,
            course_id=course_id,
            completed=(completed_modules == total_modules),
            progress_percent=int(completed_modules / total_modules * 100)
        )
        session.add(cp)
        await session.commit()