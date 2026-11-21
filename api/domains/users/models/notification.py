#!/usr/bin/python3
"""Database model for real-time in-app student/mentor notifications."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from db.base import Base


class UserNotification(Base):
    """Persisted in-app notification shown in the dashboard notification bell."""

    __tablename__ = "user_notifications"

    notification_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category = Column(String(40), nullable=False, default="general", index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    link_url = Column(String(300), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_user_notifications_user_read_created", "user_id", "is_read", "created_at"),
    )
