#!/usr/bin/python3
"""
Rewards and gamification routes for students and mentors.
Endpoints for viewing badges, certificates, points, XP, and streaks.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from auth.dependencies import get_current_user, get_db_session
from domains.courses.services.reward_service import RewardService, BadgeType
from domains.courses.services.gamification_service import GamificationService
from domains.courses.schemas.course_schema import (
    BadgeResponse,
    CertificateResponse,
    UserRewardsSummaryResponse,
)
from domains.users.models.user import User
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rewards", tags=["rewards"])


# ===== GAMIFICATION RESPONSE MODELS =====

class GamificationResponse(BaseModel):
    """Response model for gamification data (XP and streak)."""
    total_xp: int
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[str] = None
    total_questions_answered: int
    total_correct_answers: int
    accuracy_percentage: float
    timezone: str


class GamificationUpdateResponse(BaseModel):
    """Response after XP/streak update."""
    total_xp: int
    current_streak: int
    xp_earned_now: int
    streak_updated: bool


# ===== GAMIFICATION ENDPOINTS =====

@router.get(
    "/me/gamification",
    response_model=GamificationResponse,
    summary="Get my XP and streak",
    description="Get gamification data including total XP and current streak for the student settings page",
)
async def get_my_gamification(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get XP and streak data for current user.
    
    **XP Rules:**
    - XP earned ONLY from quiz questions
    - Cumulative across all courses
    - First correct answer per question only
    
    **Streak Rules:**
    - Consecutive calendar days with quiz activity
    - Day counts if at least 1 XP earned
    - Uses user's configured timezone
    - Missing a day resets streak to 0
    
    **Returns:**
    - total_xp: Cumulative XP from all quizzes
    - current_streak: Consecutive days of activity
    - longest_streak: Best streak ever achieved
    - last_activity_date: Date of last XP-earning activity
    - accuracy_percentage: Correct answers / total answers
    """
    try:
        service = GamificationService(db_session)
        data = await service.get_user_gamification(current_user.get("user_id"))
        return GamificationResponse(**data)
    except Exception as e:
        logger.error(f"Error fetching gamification data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching gamification data",
        )


@router.post(
    "/me/gamification/recalculate",
    response_model=GamificationResponse,
    summary="Recalculate XP and streak (admin/recovery)",
    description="Recalculate gamification data from source records. Use for data recovery.",
)
async def recalculate_my_gamification(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Recalculate XP and streak from source data.
    
    This is a recovery/debug endpoint that:
    1. Recalculates total XP from AssessmentSubmission records
    2. Recalculates streak from DailyXPLog records
    3. Updates the stored values
    
    **Use cases:**
    - Data recovery after system issues
    - Fixing discrepancies
    - Admin verification
    """
    try:
        service = GamificationService(db_session)
        user_id = current_user.get("user_id")
        
        # Recalculate XP
        await service.recalculate_user_xp(user_id)
        
        # Recalculate streak
        await service.check_and_fix_streak(user_id)
        
        # Return updated data
        data = await service.get_user_gamification(user_id)
        return GamificationResponse(**data)
    except Exception as e:
        logger.error(f"Error recalculating gamification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error recalculating gamification data",
        )


# ===== EXISTING REWARD ENDPOINTS =====


@router.get(
    "/me",
    response_model=UserRewardsSummaryResponse,
    summary="Get my rewards summary",
    description="Get badges, certificates, and total points for current user",
)
async def get_my_rewards_summary(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get comprehensive rewards summary for the current user.

    Returns:
    - Total points earned across all courses
    - List of badges with timestamps
    - List of certificates with URLs
    - Badge and certificate counts
    """
    try:
        service = RewardService(db_session)
        summary = await service.get_user_rewards_summary(current_user.get("user_id"))

        # Convert to response format
        return UserRewardsSummaryResponse(
            total_points=summary["total_points"],
            badge_count=summary["badge_count"],
            certificate_count=summary["certificate_count"],
            badges=[BadgeResponse(**b) for b in summary["badges"]],
            certificates=[CertificateResponse(**c) for c in summary["certificates"]],
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error fetching rewards summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching rewards summary",
        )


@router.get(
    "/me/badges",
    response_model=list[BadgeResponse],
    summary="Get my badges",
    description="Get all badges earned by current user",
)
async def get_my_badges(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get all badges earned by the current user.

    **Badge Types:**
    - speedrun: Completed a course in record time
    - perfectionist: 100% score on all assessments in a module
    - helper: Helped other students (future feature)
    - early_bird: All assignments submitted before first deadline
    - overachiever: Earned 150+ points on a course
    - consistent: Completed all modules without skipping

    Returns:
    - List of earned badges with timestamps
    """
    try:
        service = RewardService(db_session)
        badges = await service.get_user_badges(current_user.get("user_id"))

        return [
            BadgeResponse(
                badge_id=b.badge_id,
                badge_type=b.badge_type,
                description=b.description,
                awarded_at=b.awarded_at.isoformat(),
            )
            for b in badges
        ]
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error fetching badges: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching badges",
        )


@router.get(
    "/me/certificates",
    response_model=list[CertificateResponse],
    summary="Get my certificates",
    description="Get all certificates earned by current user",
)
async def get_my_certificates(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get all certificates earned by the current user.

    Certificates are issued when a user completes all modules in a learning path.

    Returns:
    - List of certificates with URLs and visibility settings
    """
    try:
        service = RewardService(db_session)
        certificates = await service.get_user_certificates(current_user.get("user_id"))

        return [
            CertificateResponse(
                certificate_id=c.certificate_id,
                course_id=c.course_id,
                path_id=c.path_id,
                issued_at=c.issued_at.isoformat(),
                certificate_url=c.certificate_url,
                is_public=c.is_public,
            )
            for c in certificates
        ]
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error fetching certificates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching certificates",
        )


@router.get(
    "/me/points",
    summary="Get my total points",
    description="Get total points earned by current user",
)
async def get_my_total_points(
    course_id: int = None,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get total points earned by the current user.

    **Points Source:**
    - Assessment submissions: Points based on correctness and deadline
    - Project submissions: Points based on approval and deadline

    **Deadline Points:**
    - Before first deadline: 100 points
    - Before second deadline: 50 points
    - After second deadline: 0 points

    **Query Parameters:**
    - course_id: Optional course ID to filter by (if not provided, returns all)

    Returns:
    - Total points earned
    """
    try:
        service = RewardService(db_session)
        total_points = await service.get_user_total_points(current_user.get("user_id"), course_id)

        return {
            "user_id": current_user.get("user_id"),
            "total_points": total_points,
            "course_id": course_id,
        }
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error fetching total points: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching total points",
        )


@router.get(
    "/me/points/modules/{module_id}",
    summary="Get my points in module",
    description="Get points earned by current user in a specific module",
)
async def get_my_module_points(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get points earned in a specific module.

    **Path Parameters:**
    - module_id: Module ID

    Returns:
    - Points earned in the module from assessments and approved projects
    """
    try:
        service = RewardService(db_session)
        module_points = await service.get_module_points(current_user.get("user_id"), module_id)

        return {
            "user_id": current_user.get("user_id"),
            "module_id": module_id,
            "total_points": module_points,
        }
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error fetching module points: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching module points",
        )


@router.get(
    "/me/badge-eligibility/speedrun",
    summary="Check speedrun badge eligibility",
    description="Check if user qualifies for speedrun badge",
)
async def check_speedrun_badge(
    path_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Check if current user qualifies for speedrun badge.

    **Query Parameters:**
    - path_id: Learning path ID to check

    Returns:
    - Eligibility status and reason
    """
    try:
        service = RewardService(db_session)
        eligible, reason = await service.check_speedrun_badge(current_user.get("user_id"), path_id)

        return {
            "badge_type": "speedrun",
            "eligible": eligible,
            "reason": reason,
        }
    except Exception as e:
        logger.error(f"Error checking badge eligibility: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking badge eligibility",
        )


@router.get(
    "/me/badge-eligibility/perfectionist",
    summary="Check perfectionist badge eligibility",
    description="Check if user qualifies for perfectionist badge",
)
async def check_perfectionist_badge(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Check if current user qualifies for perfectionist badge (100% on all assessments).

    **Query Parameters:**
    - module_id: Module ID to check

    Returns:
    - Eligibility status and reason
    """
    try:
        service = RewardService(db_session)
        eligible, reason = await service.check_perfectionist_badge(current_user.get("user_id"), module_id)

        return {
            "badge_type": "perfectionist",
            "eligible": eligible,
            "reason": reason,
        }
    except Exception as e:
        logger.error(f"Error checking badge eligibility: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking badge eligibility",
        )


@router.get(
    "/me/badge-eligibility/early-bird",
    summary="Check early bird badge eligibility",
    description="Check if user qualifies for early bird badge",
)
async def check_early_bird_badge(
    path_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Check if current user qualifies for early bird badge (all assignments before first deadline).

    **Query Parameters:**
    - path_id: Learning path ID to check

    Returns:
    - Eligibility status and reason
    """
    try:
        service = RewardService(db_session)
        eligible, reason = await service.check_early_bird_badge(current_user.get("user_id"), path_id)

        return {
            "badge_type": "early_bird",
            "eligible": eligible,
            "reason": reason,
        }
    except Exception as e:
        logger.error(f"Error checking badge eligibility: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking badge eligibility",
        )


@router.get(
    "/me/badge-eligibility/overachiever",
    summary="Check overachiever badge eligibility",
    description="Check if user qualifies for overachiever badge",
)
async def check_overachiever_badge(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Check if current user qualifies for overachiever badge (150+ points on course).

    **Query Parameters:**
    - course_id: Course ID to check

    Returns:
    - Eligibility status and reason
    """
    try:
        service = RewardService(db_session)
        eligible, reason = await service.check_overachiever_badge(current_user.get("user_id"), course_id)

        return {
            "badge_type": "overachiever",
            "eligible": eligible,
            "reason": reason,
        }
    except Exception as e:
        logger.error(f"Error checking badge eligibility: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking badge eligibility",
        )


@router.get(
    "/me/badge-eligibility/consistent",
    summary="Check consistent badge eligibility",
    description="Check if user qualifies for consistent badge",
)
async def check_consistent_badge(
    path_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Check if current user qualifies for consistent badge (all modules completed in order).

    **Query Parameters:**
    - path_id: Learning path ID to check

    Returns:
    - Eligibility status and reason
    """
    try:
        service = RewardService(db_session)
        eligible, reason = await service.check_consistent_badge(current_user.get("user_id"), path_id)

        return {
            "badge_type": "consistent",
            "eligible": eligible,
            "reason": reason,
        }
    except Exception as e:
        logger.error(f"Error checking badge eligibility: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking badge eligibility",
        )


@router.get(
    "/me/certificate-eligibility",
    summary="Check certificate eligibility",
    description="Check if user qualifies for certificate",
)
async def check_certificate_eligibility(
    path_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Check if current user qualifies for certificate (completed all modules in path).

    **Query Parameters:**
    - path_id: Learning path ID to check

    Returns:
    - Eligibility status and reason
    """
    try:
        service = RewardService(db_session)
        eligible, reason = await service.check_certificate_eligibility(
            current_user.get("user_id"), path_id
        )

        return {
            "path_id": path_id,
            "certificate_eligible": eligible,
            "reason": reason,
        }
    except Exception as e:
        logger.error(f"Error checking certificate eligibility: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking certificate eligibility",
        )
