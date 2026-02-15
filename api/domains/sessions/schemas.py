#!/usr/bin/python3
"""
Pydantic request/response schemas for mentoring sessions.
"""
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum
import re


# ---------- Enums ----------

class SessionPlatform(str, Enum):
    zoom = "zoom"
    google_meet = "google_meet"
    microsoft_teams = "microsoft_teams"
    custom = "custom"


class SessionStatus(str, Enum):
    scheduled = "scheduled"
    cancelled = "cancelled"


# ---------- Request Schemas ----------

class SessionCreateRequest(BaseModel):
    """Create a new mentoring session."""

    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    platform: SessionPlatform = Field(SessionPlatform.zoom)
    session_link: str = Field(..., max_length=500, description="Meeting URL")

    # ISO-8601 strings accepted from frontend
    scheduled_date: str = Field(..., description="Session date (ISO format)")
    start_time: str = Field(..., description="Start datetime (ISO format)")
    end_time: str = Field(..., description="End datetime (ISO format)")
    timezone: str = Field("UTC", max_length=50)

    # Optional associations
    bootcamp_id: Optional[int] = Field(None)
    course_id: Optional[int] = Field(None)

    @field_validator("session_link")
    @classmethod
    def validate_url(cls, v: str) -> str:
        pattern = re.compile(
            r"^https?://"
            r"(?:[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+)$"
        )
        if not pattern.match(v):
            raise ValueError("session_link must be a valid HTTP/HTTPS URL")
        return v


class SessionUpdateRequest(BaseModel):
    """Update an existing session (partial)."""

    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    platform: Optional[SessionPlatform] = None
    session_link: Optional[str] = Field(None, max_length=500)

    scheduled_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    timezone: Optional[str] = Field(None, max_length=50)

    bootcamp_id: Optional[int] = None
    course_id: Optional[int] = None

    status: Optional[SessionStatus] = None

    @field_validator("session_link")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        pattern = re.compile(
            r"^https?://"
            r"(?:[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+)$"
        )
        if not pattern.match(v):
            raise ValueError("session_link must be a valid HTTP/HTTPS URL")
        return v


# ---------- Response Schemas ----------

class AttendanceResponse(BaseModel):
    """Single attendance record."""
    attendance_id: int
    session_id: int
    student_id: str
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    marked_at: str

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    """Full session response returned to clients."""
    session_id: int
    mentor_id: str
    mentor_name: Optional[str] = None
    bootcamp_id: Optional[int] = None
    course_id: Optional[int] = None

    title: str
    description: Optional[str] = None
    platform: str
    session_link: str

    scheduled_date: str
    start_time: str
    end_time: str
    timezone: str

    attendance_token: str
    attendance_link: Optional[str] = None

    status: str
    computed_status: str

    attendee_count: int = 0
    attendances: Optional[List[AttendanceResponse]] = None

    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class SessionListResponse(BaseModel):
    """Paginated list of sessions."""
    sessions: List[SessionResponse]
    total: int
    page: int
    page_size: int


class AttendanceMarkResponse(BaseModel):
    """Response after marking attendance."""
    message: str
    attendance_id: int
    session_id: int
    student_id: str
    marked_at: str
