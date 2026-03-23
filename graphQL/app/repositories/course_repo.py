#!/usr/bin/python3
"""a module that handles course repository"""

from sqlalchemy import select
from app.db.models import Course



class CourseRepository:

    async def create(self, session, title: str, user_id: int):
        course = await session.execute(
            select(Course).where(Course.title == title and Course.user_id == user_id)
        )
        if course:
            return course.scalar_one_or_none()
        else:
            course = Course(
                title=title,
                user_id=user_id
            )
            session.add(course)
            await session.commit()
            await session.refresh(course)
            return course

    async def list_by_user(self, session, user_id: int):
        result = await session.execute(
            select(Course).where(Course.user_id == user_id)
        )
        return result.scalars().all()