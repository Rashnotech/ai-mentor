#!/usr/bin/python3
"""
Pydantic schemas for onboarding endpoints.
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from core.constant import SkillLevel, LearningStyle, LearningMode, UserGoal


class OnboardingStepRequest(BaseModel):
    """Request schema for onboarding step updates."""

    skill_level: Optional[SkillLevel] = Field(None, description="User's skill level")
    learning_mode: Optional[LearningMode] = Field(None, description="User's learning mode (bootcamp or self-paced)")
    learning_style: Optional[LearningStyle] = Field(None, description="User's preferred learning style")
    primary_goal: Optional[UserGoal] = Field(None, description="User's primary learning goal")
    selected_course_id: Optional[str] = Field(None, description="Selected course ID")
    preferred_language: Optional[str] = Field("en", description="Preferred language code (e.g., 'en', 'es')")
    timezone: Optional[str] = Field("UTC", description="User's timezone")
    notification_preferences: Optional[Dict[str, Any]] = Field(
        None, description="User's notification preferences"
    )

    class Config:
        from_attributes = True


class OnboardingProfileResponse(BaseModel):
    """Response schema for user onboarding profile."""

    user_id: str = Field(description="User ID")
    onboarding_completed: bool = Field(description="Whether onboarding is completed")
    onboarding_completed_at: Optional[str] = Field(None, description="Onboarding completion timestamp")
    skill_level: Optional[str] = Field(None, description="User's skill level")
    learning_mode: Optional[str] = Field(None, description="User's learning mode")
    learning_style: Optional[str] = Field(None, description="User's learning style")
    primary_goal: Optional[str] = Field(None, description="User's primary goal")
    selected_course_id: Optional[str] = Field(None, description="Selected course ID")
    preferred_language: str = Field(description="Preferred language")
    timezone: str = Field(description="User's timezone")
    notification_preferences: Dict[str, Any] = Field(description="Notification preferences")

    class Config:
        from_attributes = True


class OnboardingProgressResponse(BaseModel):
    """Response schema for onboarding progress."""

    user_id: str = Field(description="User ID")
    completed: bool = Field(description="Whether onboarding is completed")
    steps_completed: Dict[str, bool] = Field(description="Status of each onboarding step")
    next_step: Optional[str] = Field(None, description="Next step to complete")

    class Config:
        from_attributes = True


class CompleteOnboardingRequest(BaseModel):
    """Request schema to complete onboarding."""

    confirm: bool = Field(True, description="Confirm completion of onboarding")

    class Config:
        from_attributes = True
