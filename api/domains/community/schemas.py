#!/usr/bin/python3
"""
Pydantic request/response schemas for community channels.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


# ---------- Enums ----------

class ChannelType(str, Enum):
    public = "public"
    private = "private"


class ChannelCategory(str, Enum):
    discussion = "discussion"
    study_group = "study-group"
    leadership = "leadership"


class ChannelStatus(str, Enum):
    active = "active"
    archived = "archived"


# ---------- Request Schemas ----------

class ChannelCreateRequest(BaseModel):
    """Create a new community channel."""
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    type: ChannelType = Field(ChannelType.public)
    category: ChannelCategory = Field(ChannelCategory.discussion)
    join_link: Optional[str] = Field(None, max_length=500)
    bootcamp_id: Optional[int] = None
    course_id: Optional[int] = None


class ChannelUpdateRequest(BaseModel):
    """Update an existing channel (partial)."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    type: Optional[ChannelType] = None
    category: Optional[ChannelCategory] = None
    join_link: Optional[str] = Field(None, max_length=500)
    status: Optional[ChannelStatus] = None
    bootcamp_id: Optional[int] = None
    course_id: Optional[int] = None


# ---------- Response Schemas ----------

class ChannelResponse(BaseModel):
    """Full channel response returned to clients."""
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    type: str
    category: str
    status: str
    join_link: Optional[str] = None
    members_count: int = 0
    posts_count: int = 0
    created_by: Optional[str] = None
    bootcamp_id: Optional[int] = None
    course_id: Optional[int] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class ChannelListResponse(BaseModel):
    """Paginated list of channels."""
    channels: List[ChannelResponse]
    total: int
