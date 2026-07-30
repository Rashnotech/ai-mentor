#!/usr/bin/python3
"""Tracks when a student was last active, for the inactivity check-in trigger."""
from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from domains.users.models.onboarding import UserProfile


async def touch_last_active(db_session: AsyncSession, user_id: str) -> None:
    """Stamp the student's UserProfile.last_active_at as now and commit.

    Best-effort: a missing profile row is a no-op (nothing to update), and
    callers should not let this fail a student-facing request.
    """
    await db_session.execute(
        update(UserProfile)
        .where(UserProfile.user_id == user_id)
        .values(last_active_at=datetime.now(timezone.utc))
    )
    await db_session.commit()
