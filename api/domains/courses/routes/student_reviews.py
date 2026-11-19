#!/usr/bin/python3
"""
Student course review, module availability, and enrollment timeline routes.
"""
from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from auth.dependencies import get_current_user, get_db_session
from domains.courses.schemas.course_schema import (
    CourseReviewCreateRequest,
    CourseReviewUpdateRequest,
    CourseReviewResponse,
    CourseReviewsListResponse,
)
from domains.users.models.user import User
from core.errors import AppError

logger = logging.getLogger(__name__)

reviews_router = APIRouter(tags=["student-reviews"])


@reviews_router.post(
    "/reviews",
    response_model=CourseReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a course review",
    description="Submit a review and rating for an enrolled course",
)
async def create_course_review(
    request: CourseReviewCreateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Create a review for a course you're enrolled in."""
    from domains.courses.services.review_service import ReviewService

    try:
        service = ReviewService(db_session)
        review = await service.create_review(
            user_id=current_user.get("user_id"),
            user_name=current_user.get("full_name", "Anonymous"),
            course_id=request.course_id,
            rating=request.rating,
            review_text=request.review_text,
            is_anonymous=request.is_anonymous,
        )
        return review

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating review",
        )


@reviews_router.get(
    "/reviews/course/{course_id}",
    response_model=CourseReviewsListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get course reviews",
    description="Get all reviews for a course",
)
async def get_course_reviews(
    course_id: int,
    db_session: AsyncSession = Depends(get_db_session),
):
    """Get all reviews for a course."""
    from domains.courses.services.review_service import ReviewService

    try:
        service = ReviewService(db_session)
        return await service.get_course_reviews(course_id)

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting reviews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching reviews",
        )


@reviews_router.get(
    "/reviews/my-review/{course_id}",
    response_model=CourseReviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get my review for a course",
    description="Get the current user's review for a specific course",
)
async def get_my_course_review(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Get your review for a specific course."""
    from domains.courses.services.review_service import ReviewService

    try:
        service = ReviewService(db_session)
        return await service.get_user_review(
            user_id=current_user.get("user_id"),
            course_id=course_id,
        )

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching review",
        )


@reviews_router.put(
    "/reviews/{review_id}",
    response_model=CourseReviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Update my review",
    description="Update your own course review",
)
async def update_course_review(
    review_id: int,
    request: CourseReviewUpdateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Update your own review."""
    from domains.courses.services.review_service import ReviewService

    try:
        service = ReviewService(db_session)
        return await service.update_review(
            review_id=review_id,
            user_id=current_user.get("user_id"),
            rating=request.rating,
            review_text=request.review_text,
            is_anonymous=request.is_anonymous,
        )

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating review",
        )


@reviews_router.delete(
    "/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete my review",
    description="Delete your own course review",
)
async def delete_course_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Delete your own review."""
    from domains.courses.services.review_service import ReviewService

    try:
        service = ReviewService(db_session)
        await service.delete_review(
            review_id=review_id,
            user_id=current_user.get("user_id"),
        )

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error deleting review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting review",
        )


@reviews_router.get(
    "/courses/{course_id}/module-availability",
    summary="Get my module availability",
    description="Get availability and deadlines for all modules in a course",
)
async def get_module_availability(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Get the current user's module availability for a course."""
    from domains.courses.jobs.module_availability_job import ModuleAvailabilityService
    from domains.courses.models.course import Module, LearningPath
    from domains.courses.models.progress import UserCourseEnrollment
    from domains.payments.models import EnrollmentStatus
    from domains.users.models.onboarding import UserProfile

    try:
        user_id = current_user.get("user_id")

        enrollment_stmt = select(UserCourseEnrollment).where(
            UserCourseEnrollment.user_id == user_id,
            UserCourseEnrollment.course_id == course_id,
            UserCourseEnrollment.enrollment_status == EnrollmentStatus.ACTIVE,
            UserCourseEnrollment.is_active == True,
        )
        enrollment_result = await db_session.execute(enrollment_stmt)
        enrollment = enrollment_result.scalar_one_or_none()
        path_id = enrollment.path_id if enrollment else None

        profile_stmt = select(UserProfile).where(UserProfile.user_id == user_id)
        profile_result = await db_session.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()

        if not path_id and profile:
            path_id = profile.current_path_id

        if not path_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No learning path assigned for this course",
            )

        path_stmt = select(LearningPath).where(LearningPath.path_id == path_id)
        path_result = await db_session.execute(path_stmt)
        path = path_result.scalar_one_or_none()

        if not path or path.course_id != course_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Not enrolled in this course",
            )

        availability_service = ModuleAvailabilityService(db_session)
        availability_records = await availability_service.get_user_path_modules_availability(
            user_id=user_id,
            path_id=path_id,
        )

        modules_stmt = select(Module).where(Module.path_id == path_id).order_by(Module.order)
        modules_result = await db_session.execute(modules_stmt)
        modules = modules_result.scalars().all()

        availability_map = {a.module_id: a for a in availability_records}
        now = datetime.now(timezone.utc)
        response_modules = []
        unlocked_count = 0

        for module in modules:
            avail = availability_map.get(module.module_id)
            is_unlocked = avail.is_unlocked if avail else module.is_available_by_default
            if is_unlocked:
                unlocked_count += 1

            days_until_unlock = None
            if avail and avail.scheduled_unlock_date and not avail.is_unlocked:
                delta = avail.scheduled_unlock_date - now
                days_until_unlock = max(0, delta.days)

            response_modules.append(
                {
                    "module_id": module.module_id,
                    "module_title": module.title,
                    "module_order": module.order,
                    "path_id": module.path_id,
                    "estimated_hours": module.estimated_hours,
                    "is_unlocked": is_unlocked,
                    "unlocked_at": avail.unlocked_at.isoformat() if avail and avail.unlocked_at else None,
                    "scheduled_unlock_date": (
                        avail.scheduled_unlock_date.isoformat()
                        if avail and avail.scheduled_unlock_date
                        else None
                    ),
                    "days_until_unlock": days_until_unlock,
                    "first_deadline": avail.first_deadline.isoformat() if avail and avail.first_deadline else None,
                    "second_deadline": avail.second_deadline.isoformat() if avail and avail.second_deadline else None,
                    "third_deadline": avail.third_deadline.isoformat() if avail and avail.third_deadline else None,
                    "first_deadline_days": module.first_deadline_days,
                    "second_deadline_days": module.second_deadline_days,
                    "third_deadline_days": module.third_deadline_days,
                }
            )

        return {
            "modules": response_modules,
            "total_modules": len(modules),
            "unlocked_count": unlocked_count,
            "locked_count": len(modules) - unlocked_count,
        }

    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting module availability: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching module availability",
        )


@reviews_router.get(
    "/courses/{course_id}/enrollment-info",
    summary="Get my enrollment info",
    description="Get detailed enrollment information including timeline and expected completion",
)
async def get_enrollment_info(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Get detailed enrollment information for a course."""
    from domains.courses.models.progress import UserCourseEnrollment
    from domains.courses.models.course import Course

    try:
        user_id = current_user.get("user_id")

        stmt = select(UserCourseEnrollment).where(
            UserCourseEnrollment.user_id == user_id,
            UserCourseEnrollment.course_id == course_id,
        )
        result = await db_session.execute(stmt)
        enrollment = result.scalar_one_or_none()

        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Not enrolled in this course",
            )

        course_stmt = select(Course).where(Course.course_id == course_id)
        course_result = await db_session.execute(course_stmt)
        course = course_result.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        days_since_enrollment = (now - enrollment.enrolled_at).days if enrollment.enrolled_at else 0

        return {
            "enrollment_id": enrollment.enrollment_id,
            "course_id": enrollment.course_id,
            "course_title": course.title if course else None,
            "path_id": enrollment.path_id,
            "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            "started_learning_at": (
                enrollment.started_learning_at.isoformat() if enrollment.started_learning_at else None
            ),
            "expected_completion_date": (
                enrollment.expected_completion_date.isoformat()
                if enrollment.expected_completion_date
                else None
            ),
            "days_since_enrollment": days_since_enrollment,
            "is_active": enrollment.is_active,
            "completed_at": enrollment.completed_at.isoformat() if enrollment.completed_at else None,
        }

    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting enrollment info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching enrollment info",
        )
