#!/usr/bin/env python3
"""PostgreSQL ORM models for authentication and security"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, Index, ForeignKey, Enum
from sqlalchemy.orm import relationship
from db.base import Base
import enum
import uuid


class UserRole(str, enum.Enum):
    """User roles"""
    STUDENT = "student"
    MENTOR = "mentor"
    ADMIN = "admin"


class User(Base):
    """User account model"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=True)  # Nullable for OAuth users
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    github_username = Column(String(100), nullable=True)
    linkedin_username = Column(String(100), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False)

    # OAuth fields
    auth_provider = Column(String(20), nullable=True, index=True)   # "google", "github", or None (local)
    provider_id = Column(String(255), nullable=True)                # Provider-specific user ID
    
    # Security fields
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_password_change = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reset_token = Column(String(255), nullable=True, unique=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)

    # Email verification fields
    email_verification_token = Column(String(255), nullable=True, index=True)
    email_verification_token_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships - Security related
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    password_history = relationship("PasswordHistory", back_populates="user", cascade="all, delete-orphan")
    failed_login_attempts = relationship("FailedLoginAttempt", back_populates="user", cascade="all, delete-orphan")
    devices = relationship("UserDevice", back_populates="user", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_user_email_active', 'email', 'is_active'),
        Index('idx_user_provider', 'auth_provider', 'provider_id'),
    )


class RefreshToken(Base):
    """Refresh token storage model"""
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token_jti = Column(String(255), unique=True, nullable=False, index=True)
    access_token_jti = Column(String(255), nullable=True)
    device_fingerprint = Column(String(255), nullable=True)
    
    # Token status
    is_revoked = Column(Boolean, default=False, nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    
    # Security metadata
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Lifecycle
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="refresh_tokens")
    
    __table_args__ = (
        Index('idx_token_user_revoked', 'user_id', 'is_revoked'),
        Index('idx_token_expiry', 'expires_at'),
    )


class RevokedToken(Base):
    """Blacklisted tokens model"""
    __tablename__ = "revoked_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    jti = Column(String(255), unique=True, nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    reason = Column(String(255), nullable=True)


class PasswordHistory(Base):
    """Password change history model"""
    __tablename__ = "password_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    changed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="password_history")
    
    __table_args__ = (
        Index('idx_password_user_date', 'user_id', 'changed_at'),
    )


class FailedLoginAttempt(Base):
    """Failed login attempts tracking model"""
    __tablename__ = "failed_login_attempts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    attempt_count = Column(Integer, default=1, nullable=False)
    last_attempt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="failed_login_attempts")
    
    __table_args__ = (
        Index('idx_failed_attempt_email', 'email'),
        Index('idx_failed_attempt_locked', 'email', 'locked_until'),
    )


class UserDevice(Base):
    """Trusted device tracking model"""
    __tablename__ = "user_devices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_fingerprint = Column(String(255), nullable=False)
    
    # Device information
    device_name = Column(String(255), nullable=True)
    browser = Column(String(255), nullable=True)
    browser_version = Column(String(50), nullable=True)
    os = Column(String(255), nullable=True)
    os_version = Column(String(50), nullable=True)
    device_type = Column(String(50), nullable=True)
    
    # Location
    ip_address = Column(String(45), nullable=True)
    location_data = Column(JSON, nullable=True)
    
    # Trust status
    is_trusted = Column(Boolean, default=False, nullable=False, index=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # Activity
    last_used = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    user_agent = Column(Text, nullable=True)
    
    # Lifecycle
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="devices")
    
    __table_args__ = (
        Index('idx_device_user_fingerprint', 'user_id', 'device_fingerprint'),
        Index('idx_device_trusted', 'user_id', 'is_trusted'),
    )


class RateLimit(Base):
    """Rate limiting tracking model"""
    __tablename__ = "rate_limits"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    identifier = Column(String(255), nullable=False, index=True)
    endpoint = Column(String(255), nullable=False)
    request_count = Column(Integer, default=1, nullable=False)
    first_request = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_request = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    __table_args__ = (
        Index('idx_ratelimit_identifier_endpoint', 'identifier', 'endpoint'),
    )


class CSRFToken(Base):
    """CSRF token storage model"""
    __tablename__ = "csrf_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(255), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    
    # Lifecycle
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_csrf_session', 'session_id'),
    )

