#!/usr/bin/env python3
"""Community routes for managing community channels"""
import logging
import re
from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user, get_db_session
from domains.community.models import CommunityChannel
from domains.users.services.user_service import UserRole


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/community", tags=["Community"])


# ============== Schemas ==============

class ChannelCreateRequest(BaseModel):
    """Schema for creating a community channel"""
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    type: str = Field("public", pattern="^(public|private)$")
    category: str = Field("discussion", pattern="^(discussion|study-group|leadership)$")
    join_link: Optional[str] = Field(None, max_length=500)


class ChannelUpdateRequest(BaseModel):
    """Schema for updating a community channel"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    type: Optional[str] = Field(None, pattern="^(public|private)$")
    category: Optional[str] = Field(None, pattern="^(discussion|study-group|leadership)$")
    join_link: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = Field(None, pattern="^(active|archived)$")


class ChannelResponse(BaseModel):
    """Schema for channel response"""
    id: int
    name: str
    slug: str
    description: Optional[str]
    type: str
    category: str
    join_link: Optional[str]
    status: str
    members_count: int
    posts_count: int
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChannelListResponse(BaseModel):
    """Schema for channel list response"""
    channels: List[ChannelResponse]
    total: int


# ============== Helper Functions ==============

def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from the channel name"""
    # Convert to lowercase and replace spaces with hyphens
    slug = name.lower().strip()
    # Remove special characters except hyphens
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    # Replace spaces with hyphens
    slug = re.sub(r'[\s]+', '-', slug)
    # Remove multiple consecutive hyphens
    slug = re.sub(r'-+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    return slug


# ============== Routes ==============

@router.get("/channels", response_model=ChannelListResponse)
async def list_channels(
    search: Optional[str] = Query(None, description="Search by name"),
    category: Optional[str] = Query(None, description="Filter by category"),
    type: Optional[str] = Query(None, description="Filter by type (public/private)"),
    status: Optional[str] = Query(None, description="Filter by status (active/archived)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    List all community channels with filtering and pagination.
    """
    # Build base query
    stmt = select(CommunityChannel)
    count_stmt = select(func.count(CommunityChannel.id))
    
    # Apply filters
    if search:
        search_term = f"%{search.lower()}%"
        search_filter = func.lower(CommunityChannel.name).like(search_term)
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)
    
    if category:
        stmt = stmt.where(CommunityChannel.category == category)
        count_stmt = count_stmt.where(CommunityChannel.category == category)
    
    if type:
        stmt = stmt.where(CommunityChannel.type == type)
        count_stmt = count_stmt.where(CommunityChannel.type == type)
    
    if status:
        stmt = stmt.where(CommunityChannel.status == status)
        count_stmt = count_stmt.where(CommunityChannel.status == status)
    
    # Get total count
    total_result = await session.execute(count_stmt)
    total = total_result.scalar() or 0
    
    # Apply pagination and ordering
    stmt = stmt.order_by(CommunityChannel.created_at.desc())
    stmt = stmt.offset(offset).limit(limit)
    
    # Execute query
    result = await session.execute(stmt)
    channels = result.scalars().all()
    
    return ChannelListResponse(
        channels=[ChannelResponse.model_validate(ch) for ch in channels],
        total=total
    )


@router.post("/channels", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_channel(
    data: ChannelCreateRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Create a new community channel.
    Requires ADMIN role.
    """
    # Check admin role
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Generate slug from name
    base_slug = generate_slug(data.name)
    slug = base_slug
    
    # Check for duplicate slug and generate unique one if needed
    counter = 1
    while True:
        existing = await session.execute(
            select(CommunityChannel).where(CommunityChannel.slug == slug)
        )
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Check for duplicate name (case-insensitive)
    existing_name = await session.execute(
        select(CommunityChannel).where(
            func.lower(CommunityChannel.name) == data.name.lower().strip()
        )
    )
    if existing_name.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A channel with this name already exists"
        )
    
    # Create channel
    channel = CommunityChannel(
        name=data.name.strip(),
        slug=slug,
        description=data.description,
        type=data.type,
        category=data.category,
        join_link=data.join_link,
        status="active",
        members_count=0,
        posts_count=0,
        created_by=current_user.get("id"),
    )
    
    session.add(channel)
    await session.commit()
    await session.refresh(channel)
    
    logger.info(f"Channel '{channel.name}' created by admin {current_user.get('id')}")
    
    return ChannelResponse.model_validate(channel)


@router.get("/channels/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Get a specific community channel by ID.
    """
    result = await session.execute(
        select(CommunityChannel).where(CommunityChannel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    return ChannelResponse.model_validate(channel)


@router.put("/channels/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: int,
    data: ChannelUpdateRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Update a community channel.
    Requires ADMIN role.
    """
    # Check admin role
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    result = await session.execute(
        select(CommunityChannel).where(CommunityChannel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Check for duplicate name if name is being updated
    if data.name and data.name.lower().strip() != channel.name.lower():
        existing_name = await session.execute(
            select(CommunityChannel).where(
                func.lower(CommunityChannel.name) == data.name.lower().strip(),
                CommunityChannel.id != channel_id
            )
        )
        if existing_name.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A channel with this name already exists"
            )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(channel, key, value.strip() if isinstance(value, str) else value)
    
    # Update slug if name changed
    if data.name:
        base_slug = generate_slug(data.name)
        slug = base_slug
        counter = 1
        while True:
            existing = await session.execute(
                select(CommunityChannel).where(
                    CommunityChannel.slug == slug,
                    CommunityChannel.id != channel_id
                )
            )
            if not existing.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        channel.slug = slug
    
    await session.commit()
    await session.refresh(channel)
    
    logger.info(f"Channel '{channel.name}' updated by admin {current_user.get('id')}")
    
    return ChannelResponse.model_validate(channel)


@router.delete("/channels/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Delete a community channel.
    Requires ADMIN role.
    """
    # Check admin role
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    result = await session.execute(
        select(CommunityChannel).where(CommunityChannel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    await session.delete(channel)
    await session.commit()
    
    logger.info(f"Channel '{channel.name}' deleted by admin {current_user.get('id')}")
