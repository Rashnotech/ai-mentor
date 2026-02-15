#!/usr/bin/env python3
"""Admin user management schemas"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr

from domains.users.services.user_service import UserRole


class UserListParams(BaseModel):
    """Parameters for listing users"""
    search: Optional[str] = Field(None, description="Search by name or email")
    role: Optional[UserRole] = Field(None, description="Filter by role")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    is_verified: Optional[bool] = Field(None, description="Filter by verified status")
    limit: int = Field(50, ge=1, le=100, description="Number of results to return")
    offset: int = Field(0, ge=0, description="Offset for pagination")


class UserAdminResponse(BaseModel):
    """User response for admin panel"""
    id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Paginated list of users"""
    users: List[UserAdminResponse]
    total: int
    limit: int
    offset: int


class UserCreateRequest(BaseModel):
    """Request to create a new user (admin)"""
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=8, description="User password")
    full_name: str = Field(..., min_length=2, description="Full name")
    role: UserRole = Field(UserRole.STUDENT, description="User role")
    is_active: bool = Field(True, description="Is user active")
    is_verified: bool = Field(False, description="Is user verified")
    bio: Optional[str] = Field(None, description="User bio")


class UserUpdateRequest(BaseModel):
    """Request to update a user (admin)"""
    email: Optional[EmailStr] = Field(None, description="New email")
    full_name: Optional[str] = Field(None, min_length=2, description="Full name")
    role: Optional[UserRole] = Field(None, description="User role")
    is_active: Optional[bool] = Field(None, description="Is user active")
    is_verified: Optional[bool] = Field(None, description="Is user verified")
    bio: Optional[str] = Field(None, description="User bio")


class UserStatsResponse(BaseModel):
    """User statistics"""
    total_users: int
    active_users: int
    verified_users: int
    students: int
    mentors: int
    admins: int


class MentorProfileResponse(BaseModel):
    """Mentor profile response"""
    user_id: str
    title: Optional[str] = None
    company: Optional[str] = None
    expertise: List[str] = []
    languages: List[str] = []
    hourly_rate: Optional[float] = None
    availability: str = "available"
    timezone: str = "UTC"
    years_experience: Optional[int] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    website_url: Optional[str] = None
    total_sessions: int = 0
    total_students: int = 0
    rating: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MentorProfileUpdate(BaseModel):
    """Request to update mentor profile"""
    title: Optional[str] = Field(None, max_length=255, description="Professional title")
    company: Optional[str] = Field(None, max_length=255, description="Company name")
    expertise: Optional[List[str]] = Field(None, description="List of skills/expertise")
    languages: Optional[List[str]] = Field(None, description="Languages spoken")
    hourly_rate: Optional[float] = Field(None, ge=0, description="Hourly rate in USD")
    availability: Optional[str] = Field(None, description="Availability status")
    timezone: Optional[str] = Field(None, max_length=50, description="Timezone")
    years_experience: Optional[int] = Field(None, ge=0, description="Years of experience")
    linkedin_url: Optional[str] = Field(None, max_length=255, description="LinkedIn profile URL")
    github_url: Optional[str] = Field(None, max_length=255, description="GitHub profile URL")
    website_url: Optional[str] = Field(None, max_length=255, description="Personal website URL")
    bio: Optional[str] = Field(None, description="User bio (updates User.bio)")
