#!/usr/bin/python3
"""
Bootcamp management API routes.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user, get_db_session
from domains.bootcamps.service import BootcampService
from domains.bootcamps.models import BootcampFormat, BootcampStatus, EnrollmentPaymentStatus
from domains.bootcamps.schemas import (
    BootcampCreateRequest,
    BootcampUpdateRequest,
    BootcampResponse,
    BootcampListResponse,
    EnrollmentCreateRequest,
    EnrollmentUpdateRequest,
    EnrollmentResponse,
)
from domains.users.models.user import User, UserRole
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bootcamps", tags=["bootcamps"])


def parse_datetime(date_str: str) -> datetime:
    """Parse ISO datetime string."""
    try:
        # Handle various ISO formats
        if date_str.endswith("Z"):
            date_str = date_str[:-1] + "+00:00"
        return datetime.fromisoformat(date_str)
    except ValueError:
        # Try parsing date only
        return datetime.strptime(date_str, "%Y-%m-%d")


# =============================================================================
# BOOTCAMP CRUD ENDPOINTS
# =============================================================================

@router.post(
    "",
    response_model=BootcampResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new bootcamp",
    description="Create a new bootcamp program (admin/mentor only)",
)
async def create_bootcamp(
    request: BootcampCreateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Create a new bootcamp program.

    **Required:**
    - Admin or Mentor role
    - Unique slug

    **Request Body:**
    - name: Bootcamp name
    - slug: URL-friendly identifier (unique)
    - start_date: Start date (ISO format)
    - end_date: End date (ISO format)
    - fee: Bootcamp fee
    - ... (see schema for all fields)

    **Returns:**
    - Created bootcamp details
    """
    try:
        service = BootcampService(db_session, current_user)
        
        # Parse dates
        start_date = parse_datetime(request.start_date)
        end_date = parse_datetime(request.end_date)
        early_bird_deadline = (
            parse_datetime(request.early_bird_deadline)
            if request.early_bird_deadline
            else None
        )

        bootcamp = await service.create_bootcamp(
            name=request.name,
            slug=request.slug,
            description=request.description,
            start_date=start_date,
            end_date=end_date,
            duration=request.duration,
            schedule=request.schedule,
            timezone_str=request.timezone or "UTC",
            format=BootcampFormat(request.format) if request.format else BootcampFormat.ONLINE,
            location=request.location,
            fee=request.fee,
            early_bird_fee=request.early_bird_fee,
            early_bird_deadline=early_bird_deadline,
            currency=request.currency or "USD",
            max_capacity=request.max_capacity,
            instructor_id=request.instructor_id,
            instructor_name=request.instructor_name,
            curriculum=request.curriculum,
            course_id=request.course_id,
            cover_image_url=request.cover_image_url,
        )

        return BootcampResponse(
            bootcamp_id=bootcamp.bootcamp_id,
            name=bootcamp.name,
            slug=bootcamp.slug,
            description=bootcamp.description,
            start_date=bootcamp.start_date.isoformat(),
            end_date=bootcamp.end_date.isoformat(),
            duration=bootcamp.duration,
            schedule=bootcamp.schedule,
            timezone=bootcamp.timezone,
            format=bootcamp.format.value if bootcamp.format else "online",
            location=bootcamp.location,
            fee=float(bootcamp.fee),
            early_bird_fee=float(bootcamp.early_bird_fee) if bootcamp.early_bird_fee else None,
            early_bird_deadline=bootcamp.early_bird_deadline.isoformat() if bootcamp.early_bird_deadline else None,
            currency=bootcamp.currency,
            max_capacity=bootcamp.max_capacity,
            enrolled_count=0,
            status=bootcamp.status.value if bootcamp.status else "draft",
            is_active=bootcamp.is_active,
            instructor_id=bootcamp.instructor_id,
            instructor_name=bootcamp.instructor_name,
            curriculum=bootcamp.curriculum,
            course_id=bootcamp.course_id,
            cover_image_url=bootcamp.cover_image_url,
            created_by=bootcamp.created_by,
            created_at=bootcamp.created_at.isoformat(),
            updated_at=bootcamp.updated_at.isoformat(),
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating bootcamp: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating bootcamp",
        )


@router.get(
    "",
    response_model=List[BootcampListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all bootcamps",
    description="Get all bootcamps with optional filtering",
)
async def list_bootcamps(
    status_filter: Optional[str] = Query(
        None, 
        description="Filter by status: 'upcoming' (published + future), 'active', or literal status"
    ),
    search: Optional[str] = Query(None, description="Search in name/description"),
    include_inactive: bool = Query(False, description="Include inactive bootcamps (is_active=False)"),
    include_drafts: bool = Query(False, description="Include draft/cancelled bootcamps (admin only)"),
    limit: int = Query(50, ge=1, le=100, description="Max results"),
    offset: int = Query(0, ge=0, description="Skip results"),
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    List all bootcamps.

    **Query Parameters:**
    - status_filter: Filter bootcamps by:
        - "upcoming": Published bootcamps with start_date in the future (for cohort selection)
        - "active": Published or in-progress bootcamps
        - Or literal status: draft, published, in_progress, completed, cancelled
    - search: Search term for name/description
    - include_inactive: Include deactivated bootcamps
    - include_drafts: Include draft/cancelled bootcamps (requires admin/mentor role)
    - limit: Maximum results (1-100)
    - offset: Pagination offset

    **Default behavior (no filters):**
    - Returns only published, in_progress, and completed bootcamps
    - Drafts and cancelled are hidden unless include_drafts=True

    **Returns:**
    - List of bootcamps with enrollment counts
    """
    try:
        # Only admin/mentor can see drafts
        user_role = current_user.get("role")
        can_see_drafts = user_role in [UserRole.ADMIN.value, UserRole.ADMIN, UserRole.MENTOR.value, UserRole.MENTOR]
        
        if include_drafts and not can_see_drafts:
            include_drafts = False  # Silently ignore for non-admin
        
        service = BootcampService(db_session, current_user)
        results = await service.list_bootcamps(
            status_filter=status_filter,
            search=search,
            include_inactive=include_inactive,
            include_drafts=include_drafts,
            limit=limit,
            offset=offset,
        )
        
        # Current time for enrollment_open calculation
        from datetime import timezone as tz
        now = datetime.now(tz.utc)

        return [
            BootcampListResponse(
                bootcamp_id=bootcamp.bootcamp_id,
                name=bootcamp.name,
                slug=bootcamp.slug,
                description=bootcamp.description,
                start_date=bootcamp.start_date.isoformat(),
                end_date=bootcamp.end_date.isoformat(),
                duration=bootcamp.duration,
                schedule=bootcamp.schedule,
                format=bootcamp.format.value if bootcamp.format else "online",
                location=bootcamp.location,
                fee=float(bootcamp.fee),
                early_bird_fee=float(bootcamp.early_bird_fee) if bootcamp.early_bird_fee else None,
                early_bird_deadline=bootcamp.early_bird_deadline.isoformat() if bootcamp.early_bird_deadline else None,
                max_capacity=bootcamp.max_capacity,
                enrolled_count=enrolled_count,
                spots_remaining=max(0, bootcamp.max_capacity - enrolled_count),
                status=bootcamp.status.value if bootcamp.status else "draft",
                enrollment_open=(
                    bootcamp.status == BootcampStatus.published and
                    bootcamp.start_date > now and
                    enrolled_count < bootcamp.max_capacity
                ),
                instructor_name=bootcamp.instructor_name,
                curriculum=bootcamp.curriculum,
                course_id=bootcamp.course_id,
            )
            for bootcamp, enrolled_count in results
        ]
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error listing bootcamps: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing bootcamps",
        )


@router.get(
    "/{bootcamp_id}",
    response_model=BootcampResponse,
    status_code=status.HTTP_200_OK,
    summary="Get bootcamp details",
    description="Get detailed information about a bootcamp",
)
async def get_bootcamp(
    bootcamp_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Get bootcamp details by ID."""
    try:
        service = BootcampService(db_session, current_user)
        result = await service.get_bootcamp(bootcamp_id)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bootcamp not found",
            )

        bootcamp, enrolled_count = result

        return BootcampResponse(
            bootcamp_id=bootcamp.bootcamp_id,
            name=bootcamp.name,
            slug=bootcamp.slug,
            description=bootcamp.description,
            start_date=bootcamp.start_date.isoformat(),
            end_date=bootcamp.end_date.isoformat(),
            duration=bootcamp.duration,
            schedule=bootcamp.schedule,
            timezone=bootcamp.timezone,
            format=bootcamp.format.value if bootcamp.format else "online",
            location=bootcamp.location,
            fee=float(bootcamp.fee),
            early_bird_fee=float(bootcamp.early_bird_fee) if bootcamp.early_bird_fee else None,
            early_bird_deadline=bootcamp.early_bird_deadline.isoformat() if bootcamp.early_bird_deadline else None,
            currency=bootcamp.currency,
            max_capacity=bootcamp.max_capacity,
            enrolled_count=enrolled_count,
            status=bootcamp.status.value if bootcamp.status else "draft",
            is_active=bootcamp.is_active,
            instructor_id=bootcamp.instructor_id,
            instructor_name=bootcamp.instructor_name,
            curriculum=bootcamp.curriculum,
            course_id=bootcamp.course_id,
            cover_image_url=bootcamp.cover_image_url,
            created_by=bootcamp.created_by,
            created_at=bootcamp.created_at.isoformat(),
            updated_at=bootcamp.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error fetching bootcamp: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching bootcamp",
        )


@router.put(
    "/{bootcamp_id}",
    response_model=BootcampResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a bootcamp",
    description="Update bootcamp details (admin/mentor only)",
)
async def update_bootcamp(
    bootcamp_id: int,
    request: BootcampUpdateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Update bootcamp details."""
    try:
        service = BootcampService(db_session, current_user)

        update_data = {}
        for field, value in request.model_dump(exclude_unset=True).items():
            if value is not None:
                if field in ["start_date", "end_date", "early_bird_deadline"]:
                    update_data[field] = parse_datetime(value)
                elif field == "format":
                    update_data[field] = BootcampFormat(value)
                elif field == "status":
                    update_data[field] = BootcampStatus(value)
                else:
                    update_data[field] = value

        bootcamp = await service.update_bootcamp(bootcamp_id, **update_data)
        
        # Get updated enrollment count
        result = await service.get_bootcamp(bootcamp_id)
        _, enrolled_count = result

        return BootcampResponse(
            bootcamp_id=bootcamp.bootcamp_id,
            name=bootcamp.name,
            slug=bootcamp.slug,
            description=bootcamp.description,
            start_date=bootcamp.start_date.isoformat(),
            end_date=bootcamp.end_date.isoformat(),
            duration=bootcamp.duration,
            schedule=bootcamp.schedule,
            timezone=bootcamp.timezone,
            format=bootcamp.format.value if bootcamp.format else "online",
            location=bootcamp.location,
            fee=float(bootcamp.fee),
            early_bird_fee=float(bootcamp.early_bird_fee) if bootcamp.early_bird_fee else None,
            early_bird_deadline=bootcamp.early_bird_deadline.isoformat() if bootcamp.early_bird_deadline else None,
            currency=bootcamp.currency,
            max_capacity=bootcamp.max_capacity,
            enrolled_count=enrolled_count,
            status=bootcamp.status.value if bootcamp.status else "draft",
            is_active=bootcamp.is_active,
            instructor_id=bootcamp.instructor_id,
            instructor_name=bootcamp.instructor_name,
            curriculum=bootcamp.curriculum,
            course_id=bootcamp.course_id,
            cover_image_url=bootcamp.cover_image_url,
            created_by=bootcamp.created_by,
            created_at=bootcamp.created_at.isoformat(),
            updated_at=bootcamp.updated_at.isoformat(),
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating bootcamp: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating bootcamp",
        )


@router.post(
    "/{bootcamp_id}/publish",
    response_model=BootcampResponse,
    status_code=status.HTTP_200_OK,
    summary="Publish a bootcamp",
    description="Change bootcamp status from draft to published (admin/mentor only)",
)
async def publish_bootcamp(
    bootcamp_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Publish a bootcamp to make it visible to students.
    
    **Requirements:**
    - Bootcamp must be in "draft" status
    - Required fields must be filled (name, dates, fee)
    - start_date must be in the future
    
    **After publishing:**
    - Bootcamp becomes visible to students
    - Students can enroll if start_date > now
    """
    try:
        service = BootcampService(db_session, current_user)
        bootcamp = await service.publish_bootcamp(bootcamp_id)
        
        # Get enrollment count
        result = await service.get_bootcamp(bootcamp_id)
        _, enrolled_count = result

        return BootcampResponse(
            bootcamp_id=bootcamp.bootcamp_id,
            name=bootcamp.name,
            slug=bootcamp.slug,
            description=bootcamp.description,
            start_date=bootcamp.start_date.isoformat(),
            end_date=bootcamp.end_date.isoformat(),
            duration=bootcamp.duration,
            schedule=bootcamp.schedule,
            timezone=bootcamp.timezone,
            format=bootcamp.format.value if bootcamp.format else "online",
            location=bootcamp.location,
            fee=float(bootcamp.fee),
            early_bird_fee=float(bootcamp.early_bird_fee) if bootcamp.early_bird_fee else None,
            early_bird_deadline=bootcamp.early_bird_deadline.isoformat() if bootcamp.early_bird_deadline else None,
            currency=bootcamp.currency,
            max_capacity=bootcamp.max_capacity,
            enrolled_count=enrolled_count,
            status=bootcamp.status.value,
            is_active=bootcamp.is_active,
            instructor_id=bootcamp.instructor_id,
            instructor_name=bootcamp.instructor_name,
            curriculum=bootcamp.curriculum,
            course_id=bootcamp.course_id,
            cover_image_url=bootcamp.cover_image_url,
            created_by=bootcamp.created_by,
            created_at=bootcamp.created_at.isoformat(),
            updated_at=bootcamp.updated_at.isoformat(),
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error publishing bootcamp: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error publishing bootcamp",
        )


@router.post(
    "/{bootcamp_id}/status",
    response_model=BootcampResponse,
    status_code=status.HTTP_200_OK,
    summary="Change bootcamp status",
    description="Transition bootcamp status with validation (admin/mentor only)",
)
async def change_bootcamp_status(
    bootcamp_id: int,
    new_status: BootcampStatus = Query(..., description="New status to transition to"),
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Change bootcamp status with validation.
    
    **Valid transitions:**
    - draft → published (use /publish endpoint for validation)
    - published → in_progress (when bootcamp starts)
    - published → cancelled
    - in_progress → completed (when bootcamp ends)
    - in_progress → cancelled
    
    **Invalid transitions (blocked):**
    - Any status → draft (cannot unpublish)
    - completed → any status
    - cancelled → any status (except admins)
    """
    try:
        service = BootcampService(db_session, current_user)
        bootcamp = await service.change_status(bootcamp_id, BootcampStatus(new_status))
        
        result = await service.get_bootcamp(bootcamp_id)
        _, enrolled_count = result

        return BootcampResponse(
            bootcamp_id=bootcamp.bootcamp_id,
            name=bootcamp.name,
            slug=bootcamp.slug,
            description=bootcamp.description,
            start_date=bootcamp.start_date.isoformat(),
            end_date=bootcamp.end_date.isoformat(),
            duration=bootcamp.duration,
            schedule=bootcamp.schedule,
            timezone=bootcamp.timezone,
            format=bootcamp.format.value if bootcamp.format else "online",
            location=bootcamp.location,
            fee=float(bootcamp.fee),
            early_bird_fee=float(bootcamp.early_bird_fee) if bootcamp.early_bird_fee else None,
            early_bird_deadline=bootcamp.early_bird_deadline.isoformat() if bootcamp.early_bird_deadline else None,
            currency=bootcamp.currency,
            max_capacity=bootcamp.max_capacity,
            enrolled_count=enrolled_count,
            status=bootcamp.status.value,
            is_active=bootcamp.is_active,
            instructor_id=bootcamp.instructor_id,
            instructor_name=bootcamp.instructor_name,
            curriculum=bootcamp.curriculum,
            course_id=bootcamp.course_id,
            cover_image_url=bootcamp.cover_image_url,
            created_by=bootcamp.created_by,
            created_at=bootcamp.created_at.isoformat(),
            updated_at=bootcamp.updated_at.isoformat(),
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error changing bootcamp status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error changing bootcamp status",
        )


@router.delete(
    "/{bootcamp_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a bootcamp",
    description="Delete a bootcamp (admin/mentor only)",
)
async def delete_bootcamp(
    bootcamp_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Delete a bootcamp."""
    try:
        service = BootcampService(db_session, current_user)
        await service.delete_bootcamp(bootcamp_id)
        return None
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error deleting bootcamp: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting bootcamp",
        )


# =============================================================================
# ENROLLMENT ENDPOINTS
# =============================================================================

@router.post(
    "/{bootcamp_id}/enrollments",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll a user in a bootcamp",
    description="Create a new enrollment (admin/mentor only)",
)
async def create_enrollment(
    bootcamp_id: int,
    request: EnrollmentCreateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Enroll a user in a bootcamp."""
    try:
        service = BootcampService(db_session, current_user)
        
        enrollment = await service.enroll_user(
            bootcamp_id=bootcamp_id,
            user_id=request.user_id,
            email=request.email,
            payment_status=EnrollmentPaymentStatus(request.payment_status),
            amount_paid=request.amount_paid,
            notes=request.notes,
        )

        return EnrollmentResponse(
            enrollment_id=enrollment.enrollment_id,
            bootcamp_id=enrollment.bootcamp_id,
            user_id=enrollment.user_id,
            user_name=None,  # Would need to join with user table
            user_email=None,
            payment_status=enrollment.payment_status.value,
            amount_paid=float(enrollment.amount_paid),
            payment_date=enrollment.payment_date.isoformat() if enrollment.payment_date else None,
            enrolled_at=enrollment.enrolled_at.isoformat(),
            completed_at=enrollment.completed_at.isoformat() if enrollment.completed_at else None,
            certificate_issued=enrollment.certificate_issued,
            certificate_url=enrollment.certificate_url,
            notes=enrollment.notes,
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating enrollment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating enrollment",
        )


@router.get(
    "/{bootcamp_id}/enrollments",
    response_model=List[EnrollmentResponse],
    status_code=status.HTTP_200_OK,
    summary="List enrollments for a bootcamp",
    description="Get all enrollments for a bootcamp",
)
async def list_enrollments(
    bootcamp_id: int,
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """List all enrollments for a bootcamp."""
    try:
        service = BootcampService(db_session, current_user)
        results = await service.list_enrollments(
            bootcamp_id=bootcamp_id,
            payment_status=payment_status,
        )

        return [
            EnrollmentResponse(
                enrollment_id=enrollment.enrollment_id,
                bootcamp_id=enrollment.bootcamp_id,
                user_id=enrollment.user_id,
                user_name=user.full_name if user else None,
                user_email=user.email if user else None,
                payment_status=enrollment.payment_status.value,
                amount_paid=float(enrollment.amount_paid),
                payment_date=enrollment.payment_date.isoformat() if enrollment.payment_date else None,
                enrolled_at=enrollment.enrolled_at.isoformat(),
                completed_at=enrollment.completed_at.isoformat() if enrollment.completed_at else None,
                certificate_issued=enrollment.certificate_issued,
                certificate_url=enrollment.certificate_url,
                notes=enrollment.notes,
            )
            for enrollment, user in results
        ]
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error listing enrollments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing enrollments",
        )


@router.put(
    "/enrollments/{enrollment_id}",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update an enrollment",
    description="Update enrollment details (admin/mentor only)",
)
async def update_enrollment(
    enrollment_id: int,
    request: EnrollmentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Update an enrollment."""
    try:
        service = BootcampService(db_session, current_user)
        
        enrollment = await service.update_enrollment(
            enrollment_id=enrollment_id,
            payment_status=EnrollmentPaymentStatus(request.payment_status) if request.payment_status else None,
            amount_paid=request.amount_paid,
            notes=request.notes,
            certificate_issued=request.certificate_issued,
            certificate_url=request.certificate_url,
        )

        return EnrollmentResponse(
            enrollment_id=enrollment.enrollment_id,
            bootcamp_id=enrollment.bootcamp_id,
            user_id=enrollment.user_id,
            user_name=None,
            user_email=None,
            payment_status=enrollment.payment_status.value,
            amount_paid=float(enrollment.amount_paid),
            payment_date=enrollment.payment_date.isoformat() if enrollment.payment_date else None,
            enrolled_at=enrollment.enrolled_at.isoformat(),
            completed_at=enrollment.completed_at.isoformat() if enrollment.completed_at else None,
            certificate_issued=enrollment.certificate_issued,
            certificate_url=enrollment.certificate_url,
            notes=enrollment.notes,
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating enrollment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating enrollment",
        )


@router.delete(
    "/enrollments/{enrollment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove an enrollment",
    description="Remove a user's enrollment (admin/mentor only)",
)
async def delete_enrollment(
    enrollment_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Remove an enrollment."""
    try:
        service = BootcampService(db_session, current_user)
        await service.remove_enrollment(enrollment_id)
        return None
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error removing enrollment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error removing enrollment",
        )
