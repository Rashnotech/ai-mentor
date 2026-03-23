#!/usr/bin/python3
"""a module for lesson and module loaders"""

from strawberry.dataloader import DataLoader
from sqlalchemy import select
from app.db.models import Module


async def batch_load_modules(course_ids, session):
    result = await session.execute(
        select(Module).where(Module.course_id.in_(course_ids))
    )
    modules = result.scalars().all()
    mapping = {cid: [] for cid in course_ids}
    for m in modules:
        mapping[m.course_id].append(m)

    return [mapping[cid] for cid in course_ids]

def get_module_loader(session):
    return DataLoader(
        load_fn=lambda ids: batch_load_modules(ids, session)
    )