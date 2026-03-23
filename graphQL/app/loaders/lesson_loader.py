#!/usr/bin/python3
"""a module for lesson loader"""

from strawberry.dataloader import DataLoader
from sqlalchemy import select
from app.db.models import Lesson


async def batch_load_lessons(module_ids, session):
    result = await session.execute(
        select(Lesson).where(Lesson.module_id.in_(module_ids))
    )

    lessons = result.scalars().all()

    mapping = {mid: [] for mid in module_ids}
    for l in lessons:
        mapping[l.module_id].append(l)

    return [mapping[mid] for mid in module_ids]


def get_lesson_loader(session):
    return DataLoader(
        load_fn=lambda ids: batch_load_lessons(ids, session)
    )