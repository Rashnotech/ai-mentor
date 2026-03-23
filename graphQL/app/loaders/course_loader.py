#!/usr/bin/python3
"""a module for course loader"""

from strawberry.dataloader import DataLoader
from sqlalchemy import select
from app.db.models import Course


async def batch_load_courses(user_ids: list[int], session):
    result = await session.execute(
        select(Course).where(Course.user_id.in_(user_ids))
    )
    courses = result.scalars().all()

    course_map = {uid: [] for uid in user_ids}
    for course in courses:
        course_map[course.user_id].append(course)

    return [course_map[uid] for uid in user_ids]


def get_course_loader(session):
    return DataLoader(
        load_fn=lambda user_ids: batch_load_courses(user_ids, session)
    )