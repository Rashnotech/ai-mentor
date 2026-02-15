#!/usr/bin/python3
"""
Mentor/reviewer project approval routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user, get_db_session
from domains.courses.services.progress_service import ProgressService
from domains.users.models.user import User, UserRole
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reviews", tags=["mentor-reviews"])


@router.post(
    "/projects/{submission_id}/approve",
    status_code=status.HTTP_200_OK,
    summary="Approve project submission",
    description="Approve a student's project submission (mentor/admin only)",
)
async def approve_project(
    submission_id: int,
    feedback: str = "",
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Approve a student's project submission.

    **Path Parameters:**
    - submission_id: ID of the submission to approve

    **Query Parameters:**
    - feedback: Optional feedback for student

    **Required:**
    - Mentor or Admin role

    **Returns:**
    - Updated submission with approval status and finalized points
    """
    try:
        if current_user.role not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors and admins can approve submissions",
            )

        service = ProgressService(db_session)
        submission = await service.approve_project_submission(
            submission_id=submission_id,
            feedback=feedback if feedback else None,
        )

        return {
            "submission_id": submission.submission_id,
            "project_id": submission.project_id,
            "status": submission.status,
            "is_approved": submission.is_approved,
            "points_earned": submission.points_earned,
            "deadline_status": submission.deadline_status.value,
            "approved_by": current_user.email,
            "reviewed_at": submission.reviewed_at.isoformat(),
        }

    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error approving submission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error approving submission",
        )


@router.post(
    "/projects/{submission_id}/reject",
    status_code=status.HTTP_200_OK,
    summary="Reject project submission",
    description="Reject a student's project submission with feedback (mentor/admin only)",
)
async def reject_project(
    submission_id: int,
    feedback: str,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Reject a student's project submission with feedback.

    **Path Parameters:**
    - submission_id: ID of the submission to reject

    **Query Parameters:**
    - feedback: Feedback/reasons for rejection (required)

    **Required:**
    - Mentor or Admin role

    **Returns:**
    - Updated submission with rejection status and feedback
    """
    try:
        if current_user.role not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors and admins can reject submissions",
            )

        if not feedback:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Feedback is required for rejection",
            )

        service = ProgressService(db_session)
        submission = await service.reject_project_submission(
            submission_id=submission_id,
            feedback=feedback,
        )

        return {
            "submission_id": submission.submission_id,
            "project_id": submission.project_id,
            "status": submission.status,
            "is_approved": submission.is_approved,
            "points_earned": submission.points_earned,
            "reviewer_feedback": submission.reviewer_feedback,
            "rejected_by": current_user.email,
            "reviewed_at": submission.reviewed_at.isoformat(),
        }

    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error rejecting submission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error rejecting submission",
        )
