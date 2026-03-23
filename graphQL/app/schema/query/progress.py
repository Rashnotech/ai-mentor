#!/usr/bin/python3
"""a module graphql progress"""

import strawberry
from app.db.models import LessonProgress, ModuleProgress, CourseProgress
from typing import Optional
from app.schema.types.types import LessonType, ModuleType, CourseType


@strawberry.type
class ProgressQueries:

    @strawberry.field
    async def lesson_progress(self, info, lesson_id: int) -> Optional[LessonType]:
        session = info.context["db"]
        user_id = info.context["user"]["sub"]
        return await session.get(LessonProgress, {"user_id": user_id, "lesson_id": lesson_id})
    
    @strawberry.field
    async def module_progress(self, info, module_id: int) -> Optional[ModuleType]:
        session = info.context["db"]
        user_id = info.context["user"]["sub"]
        return await session.get(ModuleProgress, {"user_id": user_id, "module_id": module_id})
    
    @strawberry.field
    async def course_progress(self, info, course_id: int) -> Optional[CourseType]:
        session = info.context["db"]
        user_id = info.context["user"]["sub"]
        return await session.get(CourseProgress, {"user_id": user_id, "course_id": course_id})