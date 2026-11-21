#!/usr/bin/python3
"""Service for creating, listing, and marking in-app notifications as read."""
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from domains.users.models.notification import UserNotification

logger = logging.getLogger(__name__)


def serialize_notification(n: UserNotification) -> Dict[str, Any]:
    return {
        "notification_id": n.notification_id,
        "category": n.category,
        "title": n.title,
        "message": n.message,
        "link_url": n.link_url,
        "is_read": bool(n.is_read),
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


async def create_notification(
    db: AsyncSession,
    user_id: str,
    category: str,
    title: str,
    message: str,
    link_url: Optional[str] = None,
    commit: bool = False,
) -> UserNotification:
    """Create a new in-app notification row for a user."""
    notif = UserNotification(
        user_id=user_id,
        category=category,
        title=title[:200],
        message=message,
        link_url=link_url[:300] if link_url else None,
        is_read=False,
    )
    db.add(notif)
    if commit:
        await db.commit()
        await db.refresh(notif)
    return notif


async def list_user_notifications(
    db: AsyncSession,
    user_id: str,
    limit: int = 20,
) -> Dict[str, Any]:
    """Fetch recent notifications and unread count for a user."""
    items_stmt = (
        select(UserNotification)
        .where(UserNotification.user_id == user_id)
        .order_by(UserNotification.created_at.desc(), UserNotification.notification_id.desc())
        .limit(limit)
    )
    rows = (await db.execute(items_stmt)).scalars().all()

    unread_stmt = select(func.count(UserNotification.notification_id)).where(
        UserNotification.user_id == user_id,
        UserNotification.is_read == False,
    )
    unread_count = int((await db.execute(unread_stmt)).scalar() or 0)

    return {
        "items": [serialize_notification(r) for r in rows],
        "unread_count": unread_count,
    }


async def mark_notification_read(
    db: AsyncSession,
    user_id: str,
    notification_id: int,
) -> Optional[Dict[str, Any]]:
    """Mark a single notification as read for the owning user."""
    stmt = select(UserNotification).where(
        UserNotification.notification_id == notification_id,
        UserNotification.user_id == user_id,
    )
    notif = (await db.execute(stmt)).scalar_one_or_none()
    if not notif:
        return None
    if not notif.is_read:
        notif.is_read = True
        db.add(notif)
        await db.commit()
        await db.refresh(notif)
    return serialize_notification(notif)


async def mark_all_notifications_read(db: AsyncSession, user_id: str) -> int:
    """Mark all unread notifications as read for a user and return updated count."""
    stmt = (
        update(UserNotification)
        .where(
            UserNotification.user_id == user_id,
            UserNotification.is_read == False,
        )
        .values(is_read=True)
    )
    res = await db.execute(stmt)
    await db.commit()
    return int(res.rowcount or 0)
