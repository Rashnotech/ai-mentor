#!/usr/bin/python3
"""
API routes for community channels.
Prefix: /community
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user, get_db_session
from domains.community.service import CommunityService
from domains.community.models import ChannelType, ChannelCategory, ChannelStatus
from domains.community.schemas import (
    ChannelCreateRequest,
    ChannelUpdateRequest,
)
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community", tags=["community"])


# ---------- helpers ----------

def _serialize_channel(channel) -> dict:
    """Convert ORM channel to a response dict."""
    return {
        "id": channel.id,
        "name": channel.name,
        "slug": channel.slug,
        "description": channel.description,
        "type": channel.type.value if hasattr(channel.type, "value") else str(channel.type),
        "category": channel.category.value if hasattr(channel.category, "value") else str(channel.category),
        "status": channel.status.value if hasattr(channel.status, "value") else str(channel.status),
        "join_link": channel.join_link,
        "members_count": channel.members_count or 0,
        "posts_count": channel.posts_count or 0,
        "created_by": channel.created_by,
        "bootcamp_id": channel.bootcamp_id,
        "course_id": channel.course_id,
        "created_at": channel.created_at.isoformat() if channel.created_at else None,
        "updated_at": channel.updated_at.isoformat() if channel.updated_at else None,
    }


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@router.get("/channels")
async def list_channels(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    List community channels.
    - Admins / mentors: see all channels matching filters.
    - Students: see only active public channels + private channels they have access to.
    """
    try:
        svc = CommunityService(db, current_user)
        role = current_user.get("role")
        if hasattr(role, "value"):
            role = role.value

        if role == "admin":
            channels, total = await svc.list_channels(
                search=search,
                category=category,
                type_filter=type,
                status_filter=status,
                limit=limit,
                offset=offset,
            )
        else:
            # Students / mentors get only accessible channels
            channels, total = await svc.list_accessible_channels(limit=limit, offset=offset)

        return {
            "channels": [_serialize_channel(c) for c in channels],
            "total": total,
        }
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"list_channels error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch channels")


@router.post("/channels", status_code=status.HTTP_201_CREATED)
async def create_channel(
    request: ChannelCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new community channel (admin only)."""
    try:
        svc = CommunityService(db, current_user)
        channel = await svc.create_channel(
            name=request.name,
            description=request.description,
            type_=ChannelType(request.type.value),
            category=ChannelCategory(request.category.value),
            join_link=request.join_link,
            bootcamp_id=request.bootcamp_id,
            course_id=request.course_id,
        )
        return _serialize_channel(channel)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"create_channel error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create channel")


@router.get("/channels/{channel_id}")
async def get_channel(
    channel_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get a single channel by ID."""
    try:
        svc = CommunityService(db, current_user)
        channel = await svc.get_channel(channel_id)
        return _serialize_channel(channel)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"get_channel error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch channel")


@router.put("/channels/{channel_id}")
async def update_channel(
    channel_id: int,
    request: ChannelUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Update a community channel (admin only)."""
    try:
        svc = CommunityService(db, current_user)
        kwargs = {}
        if request.name is not None:
            kwargs["name"] = request.name
        if request.description is not None:
            kwargs["description"] = request.description
        if request.type is not None:
            kwargs["type"] = ChannelType(request.type.value)
        if request.category is not None:
            kwargs["category"] = ChannelCategory(request.category.value)
        if request.join_link is not None:
            kwargs["join_link"] = request.join_link
        if request.status is not None:
            kwargs["status"] = ChannelStatus(request.status.value)
        if request.bootcamp_id is not None:
            kwargs["bootcamp_id"] = request.bootcamp_id
        if request.course_id is not None:
            kwargs["course_id"] = request.course_id

        channel = await svc.update_channel(channel_id, **kwargs)
        return _serialize_channel(channel)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"update_channel error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update channel")


@router.delete("/channels/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a community channel (admin only)."""
    try:
        svc = CommunityService(db, current_user)
        await svc.delete_channel(channel_id)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"delete_channel error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete channel")
