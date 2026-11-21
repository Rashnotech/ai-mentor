#!/usr/bin/python3
"""In-app notification routes (/api/v1/notifications)."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user, get_db_session
from domains.users.services.notification_service import (
    list_user_notifications,
    mark_all_notifications_read,
    mark_notification_read,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def get_my_notifications(
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List recent notifications and unread count for the authenticated user."""
    user_id = current_user.get("user_id")
    return await list_user_notifications(db, user_id, limit=limit)


@router.patch("/{notification_id}/read")
async def read_one_notification(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Mark one notification as read."""
    user_id = current_user.get("user_id")
    updated = await mark_notification_read(db, user_id, notification_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return updated


@router.post("/read-all")
async def read_all_notifications(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Mark all notifications as read for the authenticated user."""
    user_id = current_user.get("user_id")
    marked_count = await mark_all_notifications_read(db, user_id)
    return {"marked_count": marked_count}
