#!/usr/bin/python3
"""
Database models for community channels.
"""
from datetime import datetime, timezone
from db.base import Base
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    Index,
)
import enum
import re


class ChannelType(str, enum.Enum):
    """Channel visibility type."""
    PUBLIC = "public"
    PRIVATE = "private"


class ChannelCategory(str, enum.Enum):
    """Channel category / purpose."""
    DISCUSSION = "discussion"
    STUDY_GROUP = "study-group"
    LEADERSHIP = "leadership"


class ChannelStatus(str, enum.Enum):
    """Channel lifecycle status."""
    ACTIVE = "active"
    ARCHIVED = "archived"


def _slugify(text: str) -> str:
    """Convert a string to a URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


class CommunityChannel(Base):
    """A community channel / group where users can gather."""

    __tablename__ = "community_channels"

    id = Column(Integer, primary_key=True, autoincrement=True)

    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)

    type = Column(
        String(20),
        nullable=False,
        default=ChannelType.PUBLIC.value,
    )
    category = Column(
        String(50),
        nullable=False,
        default=ChannelCategory.DISCUSSION.value,
    )
    status = Column(
        String(20),
        nullable=False,
        default=ChannelStatus.ACTIVE.value,
    )

    join_link = Column(String(500), nullable=True)
    members_count = Column(Integer, nullable=False, default=0)
    posts_count = Column(Integer, nullable=False, default=0)

    # Who created it (user id)
    created_by = Column(String(36), nullable=True)

    # Optional associations – a channel may be linked to a bootcamp or course
    bootcamp_id = Column(Integer, nullable=True, index=True)
    course_id = Column(Integer, nullable=True, index=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("idx_channel_status_type", "status", "type"),
        Index("idx_channel_category", "category"),
    )

    def __repr__(self) -> str:
        return f"<CommunityChannel id={self.id} name={self.name!r} status={self.status}>"
