#!/usr/bin/python3
"""
Bootcamp management service.
Handles CRUD operations for bootcamps and enrollments.
"""
from typing import Optional, List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import selectinload

from domains.bootcamps.models import (
    Bootcamp,
    BootcampEnrollment,
    BootcampFormat,
    BootcampStatus,
    EnrollmentPaymentStatus,
)
from domains.users.models.user import User, UserRole
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)


class BootcampService:
    """Service for managing bootcamps and enrollments."""

    def __init__(self, db_session: AsyncSession, current_user: dict):
        """
        Initialize BootcampService.

        Args:
            db_session: Async database session
            current_user: Currently authenticated user dict
        """
        self.db_session = db_session
        self.current_user = current_user

    async def _check_admin_mentor(self) -> None:
        """Check if current user is admin or mentor."""
        if self.current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise AppError(
                status_code=403,
                detail="Only admins and mentors can manage bootcamps",
                error_code="FORBIDDEN",
            )

    # =========================================================================
    # BOOTCAMP CRUD
    # =========================================================================

    async def create_bootcamp(
        self,
        name: str,
        slug: str,
        start_date: datetime,
        end_date: datetime,
        fee: float,
        description: Optional[str] = None,
        duration: Optional[str] = None,
        schedule: Optional[str] = None,
        timezone_str: str = "UTC",
        format: BootcampFormat = BootcampFormat.ONLINE,
        location: Optional[str] = None,
        early_bird_fee: Optional[float] = None,
        early_bird_deadline: Optional[datetime] = None,
        currency: str = "USD",
        max_capacity: int = 25,
        instructor_id: Optional[str] = None,
        instructor_name: Optional[str] = None,
        curriculum: Optional[List[str]] = None,
        course_id: Optional[int] = None,
        cover_image_url: Optional[str] = None,
    ) -> Bootcamp:
        """
        Create a new bootcamp.

        Args:
            name: Bootcamp name
            slug: URL-friendly slug (must be unique)
            start_date: Bootcamp start date
            end_date: Bootcamp end date
            fee: Bootcamp fee
            description: Optional description
            duration: Duration string (e.g., "12 weeks")
            schedule: Schedule string
            timezone_str: Timezone
            format: Delivery format
            location: Physical location
            early_bird_fee: Early bird pricing
            early_bird_deadline: Early bird deadline
            currency: Currency code
            max_capacity: Maximum students
            instructor_id: Instructor user ID
            instructor_name: Instructor name
            curriculum: List of topics
            course_id: Linked course ID
            cover_image_url: Cover image URL

        Returns:
            Created Bootcamp

        Raises:
            AppError: If validation fails
        """
        try:
            await self._check_admin_mentor()

            # Check for duplicate slug
            stmt = select(Bootcamp).where(Bootcamp.slug == slug)
            result = await self.db_session.execute(stmt)
            if result.scalar_one_or_none():
                raise AppError(
                    status_code=400,
                    detail=f"Slug '{slug}' is already in use",
                    error_code="SLUG_EXISTS",
                )

            # Validate dates
            if end_date <= start_date:
                raise AppError(
                    status_code=400,
                    detail="End date must be after start date",
                    error_code="INVALID_DATES",
                )

            bootcamp = Bootcamp(
                name=name,
                slug=slug,
                description=description,
                start_date=start_date,
                end_date=end_date,
                duration=duration,
                schedule=schedule,
                timezone=timezone_str,
                format=format,
                location=location,
                fee=fee,
                early_bird_fee=early_bird_fee,
                early_bird_deadline=early_bird_deadline,
                currency=currency,
                max_capacity=max_capacity,
                status=BootcampStatus.draft,
                instructor_id=instructor_id,
                instructor_name=instructor_name,
                curriculum=curriculum,
                course_id=course_id,
                cover_image_url=cover_image_url,
                created_by=self.current_user.get("user_id"),
            )

            self.db_session.add(bootcamp)
            await self.db_session.commit()
            await self.db_session.refresh(bootcamp)

            logger.info(f"Bootcamp '{name}' created by {self.current_user.get('email')}")
            return bootcamp

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating bootcamp: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error creating bootcamp",
                error_code="BOOTCAMP_CREATE_ERROR",
            )

    async def list_bootcamps(
        self,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        include_inactive: bool = False,
        include_drafts: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> List[tuple]:
        """
        List bootcamps with optional filtering.

        Args:
            status_filter: Filter by status or special filter:
                - "upcoming": published bootcamps with start_date > now
                - "active": published or in_progress bootcamps
                - Or literal status: draft, published, in_progress, completed, cancelled
            search: Search in name/description
            include_inactive: Include inactive bootcamps (is_active=False)
            include_drafts: Include draft bootcamps (admin only)
            limit: Max results
            offset: Pagination offset

        Returns:
            List of (Bootcamp, enrolled_count) tuples
            
        Note:
            - By default, only "published" and "in_progress" bootcamps are shown
            - "draft" and "cancelled" require explicit include_drafts=True or admin access
        """
        try:
            # Subquery for enrollment count
            enrollment_count = (
                select(
                    BootcampEnrollment.bootcamp_id,
                    func.count(BootcampEnrollment.enrollment_id).label("enrolled_count"),
                )
                .group_by(BootcampEnrollment.bootcamp_id)
                .subquery()
            )

            # Main query
            stmt = (
                select(
                    Bootcamp,
                    func.coalesce(enrollment_count.c.enrolled_count, 0).label("enrolled_count"),
                )
                .outerjoin(
                    enrollment_count,
                    Bootcamp.bootcamp_id == enrollment_count.c.bootcamp_id,
                )
            )

            # Apply is_active filter
            if not include_inactive:
                stmt = stmt.where(Bootcamp.is_active == True)

            # Handle status_filter with special computed filters
            now = datetime.now(timezone.utc)
            
            if status_filter == "upcoming":
                # "upcoming" = published AND start_date > now (open for enrollment)
                stmt = stmt.where(
                    (Bootcamp.status == BootcampStatus.published) &
                    (Bootcamp.start_date > now)
                )
            elif status_filter == "active":
                # "active" = published OR in_progress
                stmt = stmt.where(
                    Bootcamp.status.in_([BootcampStatus.published, BootcampStatus.in_progress])
                )
            elif status_filter:
                # Literal status match
                stmt = stmt.where(Bootcamp.status == status_filter)
            else:
                # Default: show only student-visible statuses (unless include_drafts)
                if not include_drafts:
                    stmt = stmt.where(
                        Bootcamp.status.in_([
                            BootcampStatus.published,
                            BootcampStatus.in_progress,
                            BootcampStatus.completed,
                        ])
                    )

            if search:
                search_term = f"%{search}%"
                stmt = stmt.where(
                    (Bootcamp.name.ilike(search_term))
                    | (Bootcamp.description.ilike(search_term))
                )

            stmt = stmt.order_by(Bootcamp.start_date.desc()).limit(limit).offset(offset)

            result = await self.db_session.execute(stmt)
            return result.all()

        except Exception as e:
            logger.error(f"Error listing bootcamps: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error listing bootcamps",
                error_code="BOOTCAMP_LIST_ERROR",
            )

    async def get_bootcamp(self, bootcamp_id: int) -> Optional[tuple]:
        """
        Get a bootcamp by ID with enrollment count.

        Args:
            bootcamp_id: Bootcamp ID

        Returns:
            Tuple of (Bootcamp, enrolled_count) or None
        """
        try:
            enrollment_count = (
                select(func.count(BootcampEnrollment.enrollment_id))
                .where(BootcampEnrollment.bootcamp_id == bootcamp_id)
                .scalar_subquery()
            )

            stmt = select(
                Bootcamp,
                enrollment_count.label("enrolled_count"),
            ).where(Bootcamp.bootcamp_id == bootcamp_id)

            result = await self.db_session.execute(stmt)
            return result.one_or_none()

        except Exception as e:
            logger.error(f"Error fetching bootcamp: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching bootcamp",
                error_code="BOOTCAMP_FETCH_ERROR",
            )

    async def update_bootcamp(
        self,
        bootcamp_id: int,
        **kwargs,
    ) -> Bootcamp:
        """
        Update a bootcamp.

        Args:
            bootcamp_id: Bootcamp ID
            **kwargs: Fields to update

        Returns:
            Updated Bootcamp
        """
        try:
            await self._check_admin_mentor()

            stmt = select(Bootcamp).where(Bootcamp.bootcamp_id == bootcamp_id)
            result = await self.db_session.execute(stmt)
            bootcamp = result.scalar_one_or_none()

            if not bootcamp:
                raise AppError(
                    status_code=404,
                    detail="Bootcamp not found",
                    error_code="BOOTCAMP_NOT_FOUND",
                )

            # Check slug uniqueness if updating
            if "slug" in kwargs and kwargs["slug"] != bootcamp.slug:
                slug_check = select(Bootcamp).where(
                    (Bootcamp.slug == kwargs["slug"])
                    & (Bootcamp.bootcamp_id != bootcamp_id)
                )
                existing = await self.db_session.execute(slug_check)
                if existing.scalar_one_or_none():
                    raise AppError(
                        status_code=400,
                        detail=f"Slug '{kwargs['slug']}' is already in use",
                        error_code="SLUG_EXISTS",
                    )

            # Update fields
            for key, value in kwargs.items():
                if value is not None and hasattr(bootcamp, key):
                    setattr(bootcamp, key, value)

            bootcamp.updated_at = datetime.now(timezone.utc)
            self.db_session.add(bootcamp)
            await self.db_session.commit()
            await self.db_session.refresh(bootcamp)

            logger.info(f"Bootcamp {bootcamp_id} updated by {self.current_user.get('email')}")
            return bootcamp

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error updating bootcamp: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error updating bootcamp",
                error_code="BOOTCAMP_UPDATE_ERROR",
            )

    async def delete_bootcamp(self, bootcamp_id: int) -> None:
        """
        Delete a bootcamp.

        Args:
            bootcamp_id: Bootcamp ID
        """
        try:
            await self._check_admin_mentor()

            stmt = select(Bootcamp).where(Bootcamp.bootcamp_id == bootcamp_id)
            result = await self.db_session.execute(stmt)
            bootcamp = result.scalar_one_or_none()

            if not bootcamp:
                raise AppError(
                    status_code=404,
                    detail="Bootcamp not found",
                    error_code="BOOTCAMP_NOT_FOUND",
                )

            await self.db_session.delete(bootcamp)
            await self.db_session.commit()

            logger.info(f"Bootcamp {bootcamp_id} deleted by {self.current_user.get('email')}")

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error deleting bootcamp: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error deleting bootcamp",
                error_code="BOOTCAMP_DELETE_ERROR",
            )

    async def publish_bootcamp(self, bootcamp_id: int) -> Bootcamp:
        """
        Publish a bootcamp (draft → published).
        
        Validates that:
        - Bootcamp is in draft status
        - Required fields are filled
        - start_date is in the future
        
        Args:
            bootcamp_id: Bootcamp ID
            
        Returns:
            Updated Bootcamp with status = published
            
        Raises:
            AppError: If validation fails or bootcamp not found
        """
        try:
            await self._check_admin_mentor()

            stmt = select(Bootcamp).where(Bootcamp.bootcamp_id == bootcamp_id)
            result = await self.db_session.execute(stmt)
            bootcamp = result.scalar_one_or_none()

            if not bootcamp:
                raise AppError(
                    status_code=404,
                    detail="Bootcamp not found",
                    error_code="BOOTCAMP_NOT_FOUND",
                )

            # Validate current status
            if bootcamp.status != BootcampStatus.draft:
                raise AppError(
                    status_code=400,
                    detail=f"Cannot publish bootcamp in '{bootcamp.status.value}' status. Only draft bootcamps can be published.",
                    error_code="INVALID_STATUS_TRANSITION",
                )

            # Validate required fields
            errors = []
            if not bootcamp.name:
                errors.append("name is required")
            if not bootcamp.start_date:
                errors.append("start_date is required")
            if not bootcamp.end_date:
                errors.append("end_date is required")
            if bootcamp.fee is None:
                errors.append("fee is required")
            
            if errors:
                raise AppError(
                    status_code=400,
                    detail=f"Cannot publish bootcamp: {', '.join(errors)}",
                    error_code="VALIDATION_ERROR",
                )

            # Validate start_date in future
            now = datetime.now(timezone.utc)
            if bootcamp.start_date <= now:
                raise AppError(
                    status_code=400,
                    detail="Cannot publish bootcamp with start_date in the past",
                    error_code="INVALID_START_DATE",
                )

            # Publish the bootcamp
            bootcamp.status = BootcampStatus.published.value
            bootcamp.updated_at = now
            self.db_session.add(bootcamp)
            await self.db_session.commit()
            await self.db_session.refresh(bootcamp)

            logger.info(f"Bootcamp {bootcamp_id} published by {self.current_user.get('email')}")
            return bootcamp

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error publishing bootcamp: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error publishing bootcamp",
                error_code="BOOTCAMP_PUBLISH_ERROR",
            )

    async def change_status(self, bootcamp_id: int, new_status: BootcampStatus) -> Bootcamp:
        """
        Change bootcamp status with validation.
        
        Valid transitions:
        - draft → published (via publish_bootcamp() for validation)
        - published → in_progress
        - published → cancelled
        - in_progress → completed
        - in_progress → cancelled
        
        Invalid transitions:
        - Any → draft (cannot unpublish)
        - completed → any
        - cancelled → any
        
        Args:
            bootcamp_id: Bootcamp ID
            new_status: Target status
            
        Returns:
            Updated Bootcamp
            
        Raises:
            AppError: If transition is invalid
        """
        try:
            await self._check_admin_mentor()

            stmt = select(Bootcamp).where(Bootcamp.bootcamp_id == bootcamp_id)
            result = await self.db_session.execute(stmt)
            bootcamp = result.scalar_one_or_none()

            if not bootcamp:
                raise AppError(
                    status_code=404,
                    detail="Bootcamp not found",
                    error_code="BOOTCAMP_NOT_FOUND",
                )

            current = bootcamp.status
            
            # Define valid transitions
            valid_transitions = {
                BootcampStatus.draft: [BootcampStatus.published, BootcampStatus.cancelled],
                BootcampStatus.published: [BootcampStatus.in_progress, BootcampStatus.cancelled],
                BootcampStatus.in_progress: [BootcampStatus.completed, BootcampStatus.cancelled],
                BootcampStatus.completed: [],  # Terminal state
                BootcampStatus.cancelled: [],  # Terminal state
            }
            
            allowed = valid_transitions.get(current, [])
            
            if new_status not in allowed:
                raise AppError(
                    status_code=400,
                    detail=f"Cannot transition from '{current.value}' to '{new_status.value}'. "
                           f"Allowed transitions: {[s.value for s in allowed] or 'none'}",
                    error_code="INVALID_STATUS_TRANSITION",
                )

            # For draft → published, use publish_bootcamp() for full validation
            if current == BootcampStatus.draft and new_status == BootcampStatus.published:
                return await self.publish_bootcamp(bootcamp_id)

            # Apply status change
            bootcamp.status = new_status
            bootcamp.updated_at = datetime.now(timezone.utc)
            self.db_session.add(bootcamp)
            await self.db_session.commit()
            await self.db_session.refresh(bootcamp)

            logger.info(f"Bootcamp {bootcamp_id} status changed to {new_status.value} by {self.current_user.get('email')}")
            return bootcamp

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error changing bootcamp status: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error changing bootcamp status",
                error_code="BOOTCAMP_STATUS_CHANGE_ERROR",
            )

    # =========================================================================
    # ENROLLMENT MANAGEMENT
    # =========================================================================

    async def enroll_user(
        self,
        bootcamp_id: int,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        payment_status: EnrollmentPaymentStatus = EnrollmentPaymentStatus.pending,
        amount_paid: float = 0,
        notes: Optional[str] = None,
    ) -> BootcampEnrollment:
        """
        Enroll a user in a bootcamp.

        Args:
            bootcamp_id: Bootcamp ID
            user_id: User ID to enroll (provide either user_id or email)
            email: User email to enroll (provide either user_id or email)
            payment_status: Payment status
            amount_paid: Amount paid
            notes: Admin notes

        Returns:
            Created enrollment
        """
        from domains.users.models.user import User
        
        try:
            await self._check_admin_mentor()

            # Resolve user_id from email if not provided
            if not user_id and email:
                user_stmt = select(User).where(User.email == email)
                user_result = await self.db_session.execute(user_stmt)
                user = user_result.scalar_one_or_none()
                if not user:
                    raise AppError(
                        status_code=404,
                        detail=f"User with email '{email}' not found",
                        error_code="USER_NOT_FOUND",
                    )
                user_id = user.id
            elif not user_id:
                raise AppError(
                    status_code=400,
                    detail="Either user_id or email must be provided",
                    error_code="MISSING_USER_IDENTIFIER",
                )

            # Check bootcamp exists and has capacity
            bootcamp_data = await self.get_bootcamp(bootcamp_id)
            if not bootcamp_data:
                raise AppError(
                    status_code=404,
                    detail="Bootcamp not found",
                    error_code="BOOTCAMP_NOT_FOUND",
                )

            bootcamp, enrolled_count = bootcamp_data
            
            # Validate bootcamp allows enrollment
            if bootcamp.status != BootcampStatus.PUBLISHED:
                raise AppError(
                    status_code=400,
                    detail=f"Cannot enroll in bootcamp with status '{bootcamp.status.value}'. "
                           "Only published bootcamps accept enrollment.",
                    error_code="ENROLLMENT_NOT_ALLOWED",
                )
            
            # Validate bootcamp hasn't started yet
            now = datetime.now(timezone.utc)
            if bootcamp.start_date <= now:
                raise AppError(
                    status_code=400,
                    detail="Cannot enroll in bootcamp that has already started",
                    error_code="BOOTCAMP_ALREADY_STARTED",
                )
            
            if enrolled_count >= bootcamp.max_capacity:
                raise AppError(
                    status_code=400,
                    detail="Bootcamp is at full capacity",
                    error_code="BOOTCAMP_FULL",
                )

            # Check if user already enrolled
            existing = await self.db_session.execute(
                select(BootcampEnrollment).where(
                    (BootcampEnrollment.bootcamp_id == bootcamp_id)
                    & (BootcampEnrollment.user_id == user_id)
                )
            )
            if existing.scalar_one_or_none():
                raise AppError(
                    status_code=400,
                    detail="User is already enrolled in this bootcamp",
                    error_code="ALREADY_ENROLLED",
                )

            enrollment = BootcampEnrollment(
                bootcamp_id=bootcamp_id,
                user_id=user_id,
                payment_status=payment_status,
                amount_paid=amount_paid,
                payment_date=datetime.now(timezone.utc) if payment_status == EnrollmentPaymentStatus.paid else None,
                notes=notes,
            )

            self.db_session.add(enrollment)
            await self.db_session.commit()
            await self.db_session.refresh(enrollment)

            logger.info(f"User {user_id} enrolled in bootcamp {bootcamp_id}")
            return enrollment

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error enrolling user: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error enrolling user",
                error_code="ENROLLMENT_ERROR",
            )

    async def list_enrollments(
        self,
        bootcamp_id: int,
        payment_status: Optional[str] = None,
    ) -> List[tuple]:
        """
        List enrollments for a bootcamp with user info.

        Args:
            bootcamp_id: Bootcamp ID
            payment_status: Optional filter by payment status

        Returns:
            List of (BootcampEnrollment, User) tuples
        """
        try:
            stmt = (
                select(BootcampEnrollment, User)
                .join(User, BootcampEnrollment.user_id == User.id)
                .where(BootcampEnrollment.bootcamp_id == bootcamp_id)
            )

            if payment_status:
                stmt = stmt.where(BootcampEnrollment.payment_status == payment_status)

            stmt = stmt.order_by(BootcampEnrollment.enrolled_at.desc())

            result = await self.db_session.execute(stmt)
            return result.all()

        except Exception as e:
            logger.error(f"Error listing enrollments: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error listing enrollments",
                error_code="ENROLLMENT_LIST_ERROR",
            )

    async def update_enrollment(
        self,
        enrollment_id: int,
        payment_status: Optional[EnrollmentPaymentStatus] = None,
        amount_paid: Optional[float] = None,
        notes: Optional[str] = None,
        certificate_issued: Optional[bool] = None,
        certificate_url: Optional[str] = None,
    ) -> BootcampEnrollment:
        """
        Update an enrollment.

        Args:
            enrollment_id: Enrollment ID
            payment_status: New payment status
            amount_paid: New amount paid
            notes: Updated notes
            certificate_issued: Certificate issued flag
            certificate_url: Certificate URL

        Returns:
            Updated enrollment
        """
        try:
            await self._check_admin_mentor()

            stmt = select(BootcampEnrollment).where(
                BootcampEnrollment.enrollment_id == enrollment_id
            )
            result = await self.db_session.execute(stmt)
            enrollment = result.scalar_one_or_none()

            if not enrollment:
                raise AppError(
                    status_code=404,
                    detail="Enrollment not found",
                    error_code="ENROLLMENT_NOT_FOUND",
                )

            if payment_status is not None:
                enrollment.payment_status = payment_status
                if payment_status == EnrollmentPaymentStatus.paid and not enrollment.payment_date:
                    enrollment.payment_date = datetime.now(timezone.utc)

            if amount_paid is not None:
                enrollment.amount_paid = amount_paid

            if notes is not None:
                enrollment.notes = notes

            if certificate_issued is not None:
                enrollment.certificate_issued = certificate_issued

            if certificate_url is not None:
                enrollment.certificate_url = certificate_url

            enrollment.updated_at = datetime.now(timezone.utc)
            self.db_session.add(enrollment)
            await self.db_session.commit()
            await self.db_session.refresh(enrollment)

            logger.info(f"Enrollment {enrollment_id} updated")
            return enrollment

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error updating enrollment: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error updating enrollment",
                error_code="ENROLLMENT_UPDATE_ERROR",
            )

    async def remove_enrollment(self, enrollment_id: int) -> None:
        """
        Remove an enrollment.

        Args:
            enrollment_id: Enrollment ID
        """
        try:
            await self._check_admin_mentor()

            stmt = select(BootcampEnrollment).where(
                BootcampEnrollment.enrollment_id == enrollment_id
            )
            result = await self.db_session.execute(stmt)
            enrollment = result.scalar_one_or_none()

            if not enrollment:
                raise AppError(
                    status_code=404,
                    detail="Enrollment not found",
                    error_code="ENROLLMENT_NOT_FOUND",
                )

            await self.db_session.delete(enrollment)
            await self.db_session.commit()

            logger.info(f"Enrollment {enrollment_id} removed")

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error removing enrollment: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error removing enrollment",
                error_code="ENROLLMENT_DELETE_ERROR",
            )
