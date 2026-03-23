#!/usr/bin/python3
"""
Pydantic schemas for bootcamp management.
"""
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from enum import Enum


class BootcampFormat(str, Enum):
    """Bootcamp delivery format."""
    ONLINE = "online"
    IN_PERSON = "in-person"
    HYBRID = "hybrid"


class BootcampStatus(str, Enum):
    """
    Bootcamp lifecycle status.
    
    Note: "upcoming" is NOT a status - it's a computed filter meaning:
    status == "published" AND start_date > now
    """
    draft = "draft"           # Admin only, cannot enroll
    published = "published"   # Visible, can enroll if start_date > now
    in_progress = "in_progress"  # Started, no new enrollment
    completed = "completed"   # Finished
    cancelled = "cancelled"   # Cancelled, admin only


class EnrollmentPaymentStatus(str, Enum):
    """Payment status for bootcamp enrollment."""
    pending = "pending"
    partial = "partial"
    paid = "paid"
    refunded = "refunded"


# ============================================================================
# BOOTCAMP SCHEMAS
# ============================================================================

class BootcampCreateRequest(BaseModel):
    """Request schema for creating a bootcamp."""
    
    name: str = Field(..., min_length=3, max_length=255, description="Bootcamp name")
    slug: str = Field(..., min_length=3, max_length=100, description="URL-friendly identifier")
    description: Optional[str] = Field(None, description="Bootcamp description")
    
    # Scheduling
    start_date: str = Field(..., description="Start date (ISO format)")
    end_date: str = Field(..., description="End date (ISO format)")
    duration: Optional[str] = Field(None, max_length=50, description="Duration (e.g., '12 weeks')")
    schedule: Optional[str] = Field(None, max_length=255, description="Schedule (e.g., 'Mon-Fri, 9 AM - 5 PM')")
    timezone: Optional[str] = Field("UTC", max_length=50, description="Timezone")
    
    # Format and location
    format: BootcampFormat = Field(BootcampFormat.ONLINE, description="Delivery format")
    location: Optional[str] = Field(None, max_length=255, description="Physical location")
    
    # Pricing
    fee: float = Field(..., ge=0, description="Bootcamp fee")
    early_bird_fee: Optional[float] = Field(None, ge=0, description="Early bird fee")
    early_bird_deadline: Optional[str] = Field(None, description="Early bird deadline (ISO format)")
    currency: Optional[str] = Field("USD", max_length=3, description="Currency code")
    
    # Capacity
    max_capacity: int = Field(25, ge=1, le=500, description="Maximum number of students")
    
    # Instructor
    instructor_id: Optional[str] = Field(None, description="Instructor user ID")
    instructor_name: Optional[str] = Field(None, max_length=255, description="Instructor name")
    
    # Curriculum
    curriculum: Optional[List[str]] = Field(None, description="List of topics/skills")
    
    # Optional link to course
    course_id: Optional[int] = Field(None, description="Linked course ID")
    
    # Cover image
    cover_image_url: Optional[str] = Field(None, max_length=500, description="Cover image URL")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Full Stack Web Development Bootcamp",
                "slug": "fullstack-web-dev-2024",
                "description": "Intensive 12-week program covering React, Node.js, and more",
                "start_date": "2024-02-15T00:00:00Z",
                "end_date": "2024-05-10T00:00:00Z",
                "duration": "12 weeks",
                "schedule": "Mon-Fri, 9:00 AM - 5:00 PM",
                "format": "hybrid",
                "location": "San Francisco, CA",
                "fee": 8999.00,
                "early_bird_fee": 7999.00,
                "early_bird_deadline": "2024-01-31T23:59:59Z",
                "max_capacity": 30,
                "instructor_name": "John Smith",
                "curriculum": ["HTML/CSS", "JavaScript", "React", "Node.js", "PostgreSQL"],
            }
        }


class BootcampUpdateRequest(BaseModel):
    """Request schema for updating a bootcamp."""
    
    name: Optional[str] = Field(None, min_length=3, max_length=255)
    slug: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None)
    
    start_date: Optional[str] = Field(None)
    end_date: Optional[str] = Field(None)
    duration: Optional[str] = Field(None, max_length=50)
    schedule: Optional[str] = Field(None, max_length=255)
    timezone: Optional[str] = Field(None, max_length=50)
    
    format: Optional[BootcampFormat] = Field(None)
    location: Optional[str] = Field(None, max_length=255)
    
    fee: Optional[float] = Field(None, ge=0)
    early_bird_fee: Optional[float] = Field(None, ge=0)
    early_bird_deadline: Optional[str] = Field(None)
    currency: Optional[str] = Field(None, max_length=3)
    
    max_capacity: Optional[int] = Field(None, ge=1, le=500)
    status: Optional[BootcampStatus] = Field(None)
    is_active: Optional[bool] = Field(None)
    
    instructor_id: Optional[str] = Field(None)
    instructor_name: Optional[str] = Field(None, max_length=255)
    
    curriculum: Optional[List[str]] = Field(None)
    course_id: Optional[int] = Field(None)
    cover_image_url: Optional[str] = Field(None, max_length=500)


class BootcampResponse(BaseModel):
    """Response schema for bootcamp details."""
    
    bootcamp_id: int = Field(description="Bootcamp ID")
    name: str = Field(description="Bootcamp name")
    slug: str = Field(description="URL slug")
    description: Optional[str] = Field(None, description="Description")
    
    start_date: str = Field(description="Start date")
    end_date: str = Field(description="End date")
    duration: Optional[str] = Field(None, description="Duration")
    schedule: Optional[str] = Field(None, description="Schedule")
    timezone: str = Field(description="Timezone")
    
    format: str = Field(description="Delivery format")
    location: Optional[str] = Field(None, description="Location")
    
    fee: float = Field(description="Fee")
    early_bird_fee: Optional[float] = Field(None, description="Early bird fee")
    early_bird_deadline: Optional[str] = Field(None, description="Early bird deadline")
    currency: str = Field(description="Currency")
    
    max_capacity: int = Field(description="Max capacity")
    enrolled_count: int = Field(0, description="Current enrollment count")
    
    status: str = Field(description="Bootcamp status")
    is_active: bool = Field(description="Is active")
    
    instructor_id: Optional[str] = Field(None, description="Instructor ID")
    instructor_name: Optional[str] = Field(None, description="Instructor name")
    
    curriculum: Optional[List[str]] = Field(None, description="Curriculum topics")
    course_id: Optional[int] = Field(None, description="Linked course ID")
    cover_image_url: Optional[str] = Field(None, description="Cover image URL")
    
    created_by: Optional[str] = Field(None, description="Creator ID")
    created_at: str = Field(description="Created timestamp")
    updated_at: str = Field(description="Updated timestamp")
    
    class Config:
        from_attributes = True


class BootcampListResponse(BaseModel):
    """Simplified response for bootcamp lists."""
    
    bootcamp_id: int
    name: str
    slug: str
    description: Optional[str] = None
    start_date: str
    end_date: str
    duration: Optional[str] = None
    schedule: Optional[str] = None
    format: str
    location: Optional[str] = None
    fee: float
    early_bird_fee: Optional[float] = None
    early_bird_deadline: Optional[str] = None
    max_capacity: int
    enrolled_count: int = 0
    spots_remaining: int = 0  # Computed: max_capacity - enrolled_count
    status: str
    enrollment_open: bool = False  # True if status=published AND start_date > now AND spots available
    instructor_name: Optional[str] = None
    curriculum: Optional[List[str]] = None
    course_id: Optional[int] = None  # Linked course ID
    
    class Config:
        from_attributes = True


# ============================================================================
# ENROLLMENT SCHEMAS
# ============================================================================

class EnrollmentCreateRequest(BaseModel):
    """Request to enroll a user in a bootcamp."""
    
    user_id: Optional[str] = Field(None, description="User ID to enroll (provide either user_id or email)")
    email: Optional[str] = Field(None, description="User email to enroll (provide either user_id or email)")
    payment_status: EnrollmentPaymentStatus = Field(
        EnrollmentPaymentStatus.pending,
        description="Payment status"
    )
    amount_paid: float = Field(0, ge=0, description="Amount paid")
    notes: Optional[str] = Field(None, description="Admin notes")
    
    @model_validator(mode='after')
    def validate_user_identifier(self):
        if not self.user_id and not self.email:
            raise ValueError("Either user_id or email must be provided")
        return self
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user-uuid-123",
                "email": "user@example.com",
                "payment_status": "paid",
                "amount_paid": 7999.00,
                "notes": "Early bird registration"
            }
        }


class EnrollmentUpdateRequest(BaseModel):
    """Request to update an enrollment."""
    
    payment_status: Optional[EnrollmentPaymentStatus] = Field(None)
    amount_paid: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None)
    certificate_issued: Optional[bool] = Field(None)
    certificate_url: Optional[str] = Field(None)


class EnrollmentResponse(BaseModel):
    """Response for enrollment details."""
    
    enrollment_id: int = Field(description="Enrollment ID")
    bootcamp_id: int = Field(description="Bootcamp ID")
    user_id: str = Field(description="User ID")
    
    # User info (denormalized for convenience)
    user_name: Optional[str] = Field(None, description="User name")
    user_email: Optional[str] = Field(None, description="User email")
    
    payment_status: str = Field(description="Payment status")
    amount_paid: float = Field(description="Amount paid")
    payment_date: Optional[str] = Field(None, description="Payment date")
    
    enrolled_at: str = Field(description="Enrollment date")
    completed_at: Optional[str] = Field(None, description="Completion date")
    certificate_issued: bool = Field(description="Certificate issued")
    certificate_url: Optional[str] = Field(None, description="Certificate URL")
    
    notes: Optional[str] = Field(None, description="Notes")
    
    class Config:
        from_attributes = True
