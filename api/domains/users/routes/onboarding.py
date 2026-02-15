#!/usr/bin/python3
"""
Onboarding routes for user profile setup after signup.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user, get_db_session
from domains.users.services.onboarding_service import OnboardingService
from domains.users.schemas.onboarding_schema import (
    OnboardingStepRequest,
    OnboardingProfileResponse,
    CompleteOnboardingRequest,
)
from domains.users.models.user import User
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post(
    "/start",
    response_model=OnboardingProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Start onboarding process",
    description="Initialize onboarding for a newly signed up user",
)
async def start_onboarding(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Start the onboarding process for a user.

    Returns the user's profile, creating it if it doesn't exist.

    **Path Parameters:**
    - None

    **Required:**
    - Authentication token (Bearer token in Authorization header)

    **Returns:**
    - User's onboarding profile with initial settings
    """
    try:
        service = OnboardingService(db_session)
        profile = await service.start_onboarding(current_user.get("user_id"))

        return OnboardingProfileResponse(
            user_id=profile.user_id,
            onboarding_completed=profile.onboarding_completed,
            onboarding_completed_at=profile.onboarding_completed_at.isoformat()
            if profile.onboarding_completed_at
            else None,
            skill_level=profile.skill_level.value if profile.skill_level else None,
            learning_mode=profile.learning_mode.value if profile.learning_mode else None,
            learning_style=profile.learning_style.value if profile.learning_style else None,
            primary_goal=profile.primary_goal.value if profile.primary_goal else None,
            selected_course_id=profile.selected_course_id,
            preferred_language=profile.preferred_language,
            timezone=profile.timezone,
            notification_preferences=profile.notification_preferences or {},
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error starting onboarding: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error starting onboarding",
        )


@router.get(
    "/profile",
    response_model=OnboardingProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current onboarding profile",
    description="Retrieve the user's current onboarding profile and progress",
)
async def get_onboarding_profile(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get the user's current onboarding profile.

    **Returns:**
    - User's complete onboarding profile with all settings
    """
    try:
        service = OnboardingService(db_session)
        profile = await service.get_user_profile(current_user.get("user_id"))

        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found",
            )

        return OnboardingProfileResponse(
            user_id=profile.user_id,
            onboarding_completed=profile.onboarding_completed,
            onboarding_completed_at=profile.onboarding_completed_at.isoformat()
            if profile.onboarding_completed_at
            else None,
            skill_level=profile.skill_level.value if profile.skill_level else None,
            learning_mode=profile.learning_mode.value if profile.learning_mode else None,
            learning_style=profile.learning_style.value if profile.learning_style else None,
            primary_goal=profile.primary_goal.value if profile.primary_goal else None,
            selected_course_id=profile.selected_course_id,
            preferred_language=profile.preferred_language,
            timezone=profile.timezone,
            notification_preferences=profile.notification_preferences or {},
        )
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error fetching onboarding profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching onboarding profile",
        )


@router.post(
    "/update",
    response_model=OnboardingProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update onboarding information",
    description="Update user's skill level, learning style, goals, and preferences",
)
async def update_onboarding(
    request: OnboardingStepRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Update user onboarding information.

    **Request Body:**
    - skill_level: BEGINNER, INTERMEDIATE, or ADVANCED
    - learning_style: VISUAL, AUDITORY, KINESTHETIC, or READING_WRITING
    - primary_goal: CAREER_CHANGE, SKILL_UPGRADE, HOBBY, or CERTIFICATION
    - preferred_language: Language code (e.g., 'en', 'es')
    - timezone: User's timezone
    - notification_preferences: JSON object with notification settings

    **Returns:**
    - Updated user onboarding profile
    """
    try:
        service = OnboardingService(db_session)
        profile = await service.update_onboarding_step(
            user_id=current_user.get("user_id"),
            skill_level=request.skill_level,
            learning_mode=request.learning_mode,
            learning_style=request.learning_style,
            primary_goal=request.primary_goal,
            selected_course_id=request.selected_course_id,
            preferred_language=request.preferred_language,
            timezone=request.timezone,
            notification_preferences=request.notification_preferences,
        )

        return OnboardingProfileResponse(
            user_id=profile.user_id,
            onboarding_completed=profile.onboarding_completed,
            onboarding_completed_at=profile.onboarding_completed_at.isoformat()
            if profile.onboarding_completed_at
            else None,
            skill_level=profile.skill_level.value if profile.skill_level else None,
            learning_mode=profile.learning_mode.value if profile.learning_mode else None,
            learning_style=profile.learning_style.value if profile.learning_style else None,
            primary_goal=profile.primary_goal.value if profile.primary_goal else None,
            selected_course_id=profile.selected_course_id,
            preferred_language=profile.preferred_language,
            timezone=profile.timezone,
            notification_preferences=profile.notification_preferences or {},
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating onboarding: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating onboarding information",
        )


@router.post(
    "/complete",
    response_model=OnboardingProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Complete onboarding",
    description="Mark onboarding as complete after all steps are finished",
)
async def complete_onboarding(
    request: CompleteOnboardingRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Complete the onboarding process.

    All required fields (learning_mode, primary_goal) must be set.

    **Request Body:**
    - confirm: Set to true to confirm completion

    **Returns:**
    - Updated user profile with onboarding_completed = true
    """
    try:
        if not request.confirm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must confirm completion",
            )

        service = OnboardingService(db_session)
        profile = await service.complete_onboarding(current_user.get("user_id"))

        return OnboardingProfileResponse(
            user_id=profile.user_id,
            onboarding_completed=profile.onboarding_completed,
            onboarding_completed_at=profile.onboarding_completed_at.isoformat()
            if profile.onboarding_completed_at
            else None,
            skill_level=profile.skill_level.value if profile.skill_level else None,
            learning_mode=profile.learning_mode.value if profile.learning_mode else None,
            learning_style=profile.learning_style.value if profile.learning_style else None,
            primary_goal=profile.primary_goal.value if profile.primary_goal else None,
            selected_course_id=profile.selected_course_id,
            preferred_language=profile.preferred_language,
            timezone=profile.timezone,
            notification_preferences=profile.notification_preferences or {},
        )
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error completing onboarding: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error completing onboarding",
        )
