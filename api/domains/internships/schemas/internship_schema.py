#!/usr/bin/python3
"""
Pydantic schemas for internship application endpoints.
"""
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, field_validator
import re


class CreateProfileRequest(BaseModel):
    """Request schema for creating internship profile (Step 1)."""
    
    email: EmailStr = Field(..., description="Valid email address")
    first_name: str = Field(..., min_length=2, max_length=100, description="First name")
    last_name: str = Field(..., min_length=2, max_length=100, description="Last name")
    telephone: str = Field(..., min_length=10, max_length=50, description="Phone number with country code")
    hear_about_us: Optional[str] = Field(None, max_length=100, description="How applicant heard about us")
    country: str = Field(..., min_length=2, max_length=100, description="Country")
    state: str = Field(..., min_length=2, max_length=100, description="State or territory")
    institution_type: str = Field(..., description="university, polytechnic, or college")

    @field_validator('telephone')
    @classmethod
    def validate_telephone(cls, v: str) -> str:
        """Validate telephone format."""
        # Remove spaces and common separators
        cleaned = re.sub(r'[\s\-\(\)]', '', v)
        
        # Check if it contains only digits and optionally starts with +
        if not re.match(r'^\+?\d{10,15}$', cleaned):
            raise ValueError('Telephone must be a valid phone number with 10-15 digits, optionally starting with +')
        
        return v

    @field_validator('institution_type')
    @classmethod
    def validate_institution_type(cls, v: str) -> str:
        """Validate institution type."""
        valid_types = {'university', 'polytechnic', 'college'}
        if v.lower() not in valid_types:
            raise ValueError(f'Institution type must be one of: {", ".join(valid_types)}')
        return v.lower()

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    """Request schema for updating internship profile."""
    
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    telephone: Optional[str] = Field(None, min_length=10, max_length=50)
    hear_about_us: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    institution_type: Optional[str] = None

    @field_validator('telephone')
    @classmethod
    def validate_telephone(cls, v: Optional[str]) -> Optional[str]:
        """Validate telephone format if provided."""
        if v is None:
            return v
        cleaned = re.sub(r'[\s\-\(\)]', '', v)
        if not re.match(r'^\+?\d{10,15}$', cleaned):
            raise ValueError('Telephone must be a valid phone number with 10-15 digits')
        return v

    @field_validator('institution_type')
    @classmethod
    def validate_institution_type(cls, v: Optional[str]) -> Optional[str]:
        """Validate institution type if provided."""
        if v is None:
            return v
        valid_types = {'university', 'polytechnic', 'college'}
        if v.lower() not in valid_types:
            raise ValueError(f'Institution type must be one of: {", ".join(valid_types)}')
        return v.lower()

    class Config:
        from_attributes = True


class UploadDocumentsRequest(BaseModel):
    """Request schema for uploading verification documents (Step 2)."""
    
    it_letter_url: Optional[str] = Field(None, description="URL of uploaded IT letter")
    admission_letter_url: Optional[str] = Field(None, description="URL of uploaded admission letter")
    id_card_url: Optional[str] = Field(None, description="URL of uploaded ID card")
    id_type: Optional[str] = Field(None, description="school-id, voters-card, or nin-slip")

    @field_validator('id_type')
    @classmethod
    def validate_id_type(cls, v: Optional[str]) -> Optional[str]:
        """Validate ID type if provided."""
        if v is None:
            return v
        valid_types = {'school-id', 'voters-card', 'nin-slip'}
        if v not in valid_types:
            raise ValueError(f'ID type must be one of: {", ".join(valid_types)}')
        return v

    class Config:
        from_attributes = True


class SelectTrackRequest(BaseModel):
    """Request schema for selecting learning track (Step 3)."""
    
    selected_track: str = Field(..., description="Learning track ID")
    course_id: Optional[int] = Field(None, description="Associated course ID from backend")

    @field_validator('selected_track')
    @classmethod
    def validate_track(cls, v: str) -> str:
        """Validate track selection."""
        valid_tracks = {
            'frontend', 'backend', 'fullstack', 
            'ai-engineering', 'product-design', 'data-analytics'
        }
        if v not in valid_tracks:
            raise ValueError(f'Track must be one of: {", ".join(valid_tracks)}')
        return v

    class Config:
        from_attributes = True


class InternshipApplicationResponse(BaseModel):
    """Response schema for internship application."""
    
    application_id: int
    email: str
    first_name: str
    last_name: str
    telephone: str
    hear_about_us: Optional[str]
    country: str
    state: str
    institution_type: str
    
    it_letter_url: Optional[str]
    admission_letter_url: Optional[str]
    id_card_url: Optional[str]
    id_type: Optional[str]
    
    verification_status: str
    selected_track: Optional[str]
    course_id: Optional[int]
    
    status: str
    acknowledgment_sent: bool
    
    created_at: str
    updated_at: str
    submitted_at: Optional[str]

    class Config:
        from_attributes = True


class InternshipTrackResponse(BaseModel):
    """Response schema for available internship tracks with associated courses."""
    
    track_id: str
    track_name: str
    description: str
    level: str
    courses: list = Field(default_factory=list, description="Available courses for this track")

    class Config:
        from_attributes = True
