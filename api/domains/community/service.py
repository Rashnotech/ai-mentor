#!/usr/bin/python3
"""
Service layer for community channel management.
"""
from typing import Optional, List, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from domains.community.models import (
    CommunityChannel,
    ChannelType,
    ChannelCategory,
    ChannelStatus,
    _slugify,
)
from domains.users.models.user import UserRole
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)


class CommunityService:
    """Business logic for community channels."""

    def __init__(self, db_session: AsyncSession, current_user: dict):
        self.db = db_session
        self.user = current_user

    # ------------------------------------------------------------------ #
    #  Authorisation helpers
    # ------------------------------------------------------------------ #

    def _require_admin(self) -> None:
        role = self.user.get("role")
        if isinstance(role, UserRole):
            role = role.value
        if role != "admin":
            raise AppError(
                status_code=403,
                detail="Only admins can perform this action",
                error_code="FORBIDDEN",
            )

    # ------------------------------------------------------------------ #
    #  CREATE
    # ------------------------------------------------------------------ #

    async def create_channel(
        self,
        name: str,
        type_: ChannelType = ChannelType.PUBLIC,
        category: ChannelCategory = ChannelCategory.DISCUSSION,
        description: Optional[str] = None,
        join_link: Optional[str] = None,
        bootcamp_id: Optional[int] = None,
        course_id: Optional[int] = None,
    ) -> CommunityChannel:
        """Create a new community channel (admin only)."""
        self._require_admin()

        slug = _slugify(name)

        # Ensure slug uniqueness
        existing = await self.db.execute(
            select(CommunityChannel).where(CommunityChannel.slug == slug)
        )
        if existing.scalar_one_or_none():
            # Append a short numeric suffix
            import time
            slug = f"{slug}-{int(time.time()) % 100000}"

        channel = CommunityChannel(
            name=name,
            slug=slug,
            description=description,
            type=type_,
            category=category,
            join_link=join_link,
            members_count=0,
            posts_count=0,
            created_by=self.user.get("user_id"),
            bootcamp_id=bootcamp_id,
            course_id=course_id,
        )
        self.db.add(channel)
        await self.db.commit()
        await self.db.refresh(channel)
        logger.info(f"Community channel created: id={channel.id} name={name}")
        return channel

    # ------------------------------------------------------------------ #
    #  UPDATE
    # ------------------------------------------------------------------ #

    async def update_channel(self, channel_id: int, **kwargs) -> CommunityChannel:
        """Update an existing channel (admin only)."""
        self._require_admin()

        result = await self.db.execute(
            select(CommunityChannel).where(CommunityChannel.id == channel_id)
        )
        channel = result.scalar_one_or_none()
        if not channel:
            raise AppError(status_code=404, detail="Channel not found", error_code="NOT_FOUND")

        for key, value in kwargs.items():
            if value is not None and hasattr(channel, key):
                setattr(channel, key, value)

        # Re-derive slug if name changed
        if "name" in kwargs and kwargs["name"]:
            new_slug = _slugify(kwargs["name"])
            if new_slug != channel.slug:
                dup = await self.db.execute(
                    select(CommunityChannel).where(
                        CommunityChannel.slug == new_slug,
                        CommunityChannel.id != channel_id,
                    )
                )
                if dup.scalar_one_or_none():
                    import time
                    new_slug = f"{new_slug}-{int(time.time()) % 100000}"
                channel.slug = new_slug

        await self.db.commit()
        await self.db.refresh(channel)
        logger.info(f"Community channel updated: id={channel.id}")
        return channel

    # ------------------------------------------------------------------ #
    #  DELETE
    # ------------------------------------------------------------------ #

    async def delete_channel(self, channel_id: int) -> None:
        """Delete a channel permanently (admin only)."""
        self._require_admin()

        result = await self.db.execute(
            select(CommunityChannel).where(CommunityChannel.id == channel_id)
        )
        channel = result.scalar_one_or_none()
        if not channel:
            raise AppError(status_code=404, detail="Channel not found", error_code="NOT_FOUND")

        await self.db.delete(channel)
        await self.db.commit()
        logger.info(f"Community channel deleted: id={channel_id}")

    # ------------------------------------------------------------------ #
    #  GET (single)
    # ------------------------------------------------------------------ #

    async def get_channel(self, channel_id: int) -> CommunityChannel:
        """Get a single channel by ID."""
        result = await self.db.execute(
            select(CommunityChannel).where(CommunityChannel.id == channel_id)
        )
        channel = result.scalar_one_or_none()
        if not channel:
            raise AppError(status_code=404, detail="Channel not found", error_code="NOT_FOUND")
        return channel

    # ------------------------------------------------------------------ #
    #  LIST (admin — all channels)
    # ------------------------------------------------------------------ #

    async def list_channels(
        self,
        search: Optional[str] = None,
        category: Optional[str] = None,
        type_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CommunityChannel], int]:
        """
        List channels with filters (admin endpoint — returns all channels).
        """
        stmt = select(CommunityChannel)
        count_stmt = select(func.count(CommunityChannel.id))

        # Filters
        if search:
            like_val = f"%{search}%"
            search_filter = or_(
                CommunityChannel.name.ilike(like_val),
                CommunityChannel.description.ilike(like_val),
            )
            stmt = stmt.where(search_filter)
            count_stmt = count_stmt.where(search_filter)

        if category:
            stmt = stmt.where(CommunityChannel.category == category)
            count_stmt = count_stmt.where(CommunityChannel.category == category)

        if type_filter:
            stmt = stmt.where(CommunityChannel.type == type_filter)
            count_stmt = count_stmt.where(CommunityChannel.type == type_filter)

        if status_filter:
            stmt = stmt.where(CommunityChannel.status == status_filter)
            count_stmt = count_stmt.where(CommunityChannel.status == status_filter)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        stmt = stmt.order_by(CommunityChannel.created_at.desc())
        stmt = stmt.offset(offset).limit(limit)

        result = await self.db.execute(stmt)
        channels = list(result.scalars().all())

        return channels, total

    # ------------------------------------------------------------------ #
    #  LIST (student — accessible channels only)
    # ------------------------------------------------------------------ #

    async def list_accessible_channels(
        self,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CommunityChannel], int]:
        """
        List channels accessible to the current user:
        - All public + active channels
        - Private channels linked to bootcamps/courses the user is enrolled in
        """
        user_id = self.user.get("user_id")
        role = self.user.get("role")
        if isinstance(role, UserRole):
            role = role.value

        # Admins / mentors see everything active
        if role in ("admin", "mentor"):
            return await self.list_channels(status_filter="active", limit=limit, offset=offset)

        # Gather the user's enrolled bootcamp & course IDs
        from domains.bootcamps.models import BootcampEnrollment

        enrolled_stmt = select(BootcampEnrollment.bootcamp_id).where(
            BootcampEnrollment.student_id == user_id
        )
        enrolled_result = await self.db.execute(enrolled_stmt)
        enrolled_bootcamp_ids = [row[0] for row in enrolled_result.all()]

        # Build filter: public-active OR private-active linked to enrolled bootcamp/course
        base_active = CommunityChannel.status == ChannelStatus.ACTIVE.value

        public_filter = (
            base_active
            & (CommunityChannel.type == ChannelType.PUBLIC.value)
        )

        private_filter = None
        if enrolled_bootcamp_ids:
            private_filter = (
                base_active
                & (CommunityChannel.type == ChannelType.PRIVATE.value)
                & (CommunityChannel.bootcamp_id.in_(enrolled_bootcamp_ids))
            )

        if private_filter is not None:
            combined = or_(public_filter, private_filter)
        else:
            combined = public_filter

        count_stmt = select(func.count(CommunityChannel.id)).where(combined)
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        stmt = (
            select(CommunityChannel)
            .where(combined)
            .order_by(CommunityChannel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        channels = list(result.scalars().all())

        return channels, total
