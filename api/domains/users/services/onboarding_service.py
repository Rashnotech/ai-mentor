#!/usr/bin/python3
"""
Onboarding service for managing user profile setup after signup.
"""
from typing import Optional
from datetime import datetime, timezone as tz
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from domains.users.models.onboarding import UserProfile
from domains.bootcamps.models import Bootcamp, BootcampEnrollment, BootcampStatus, EnrollmentPaymentStatus
from domains.courses.models.course import LearningPath
from domains.courses.models.progress import UserCourseEnrollment
from domains.payments.models import EnrollmentStatus
from domains.courses.services.enrollment_service import EnrollmentService
from core.constant import SkillLevel, LearningStyle, LearningMode, UserGoal
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)


class OnboardingService:
    """Service for managing user onboarding process."""

    def __init__(self, db_session: AsyncSession):
        """
        Initialize OnboardingService.

        Args:
            db_session: Async database session
        """
        self.db_session = db_session

    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """
        Get user profile by user_id.

        Args:
            user_id: The user's ID

        Returns:
            UserProfile if found, None otherwise
        """
        try:
            stmt = select(UserProfile).where(UserProfile.user_id == user_id)
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching user profile for {user_id}: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching user profile",
                error_code="PROFILE_FETCH_ERROR",
            )

    async def create_user_profile(self, user_id: str) -> UserProfile:
        """
        Create a new user profile for a newly registered user.

        Args:
            user_id: The user's ID

        Returns:
            Created UserProfile
        """
        try:
            profile = UserProfile(user_id=user_id)
            self.db_session.add(profile)
            await self.db_session.commit()
            logger.info(f"User profile created for {user_id}")
            return profile
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating user profile for {user_id}: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error creating user profile",
                error_code="PROFILE_CREATE_ERROR",
            )

    async def start_onboarding(self, user_id: str) -> UserProfile:
        """
        Start onboarding process for a user (create profile if doesn't exist).

        Args:
            user_id: The user's ID

        Returns:
            UserProfile
        """
        profile = await self.get_user_profile(user_id)
        if not profile:
            profile = await self.create_user_profile(user_id)
        return profile

    async def update_onboarding_step(
        self,
        user_id: str,
        skill_level: Optional[SkillLevel] = None,
        learning_mode: Optional[LearningMode] = None,
        learning_style: Optional[LearningStyle] = None,
        primary_goal: Optional[UserGoal] = None,
        selected_course_id: Optional[str] = None,
        selected_path_id: Optional[int] = None,
        preferred_language: Optional[str] = None,
        timezone: Optional[str] = None,
        notification_preferences: Optional[dict] = None,
    ) -> UserProfile:
        """
        Update user profile with onboarding step data.

        Args:
            user_id: The user's ID
            skill_level: User's skill level (BEGINNER, INTERMEDIATE, ADVANCED)
            learning_mode: User's learning mode (BOOTCAMP, SELF_PACED)
            learning_style: User's learning style (PROJECT_FIRST, INSTRUCTION_FIRST, etc.)
            primary_goal: User's primary goal (GET_A_JOB, BUILD_A_STARTUP, etc.)
            selected_course_id: ID of the selected course
            selected_path_id: ID of the selected learning path
            preferred_language: Preferred language code (e.g., 'en', 'es', 'fr')
            timezone: User's timezone
            notification_preferences: User's notification preferences

        Returns:
            Updated UserProfile

        Raises:
            AppError: If user profile not found or update fails
        """
        try:
            profile = await self.get_user_profile(user_id)
            if not profile:
                raise AppError(
                    status_code=404,
                    detail="User profile not found",
                    error_code="PROFILE_NOT_FOUND",
                )

            # Update provided fields
            if skill_level:
                profile.skill_level = skill_level
            if learning_mode:
                profile.learning_mode = learning_mode
            if learning_style:
                profile.learning_style = learning_style
            if primary_goal:
                profile.primary_goal = primary_goal
            if selected_course_id:
                if profile.selected_course_id != selected_course_id and selected_path_id is None:
                    profile.current_path_id = None
                profile.selected_course_id = selected_course_id
            if selected_path_id is not None:
                resolved_course_id = self._parse_course_id(selected_course_id or profile.selected_course_id)
                if resolved_course_id is None:
                    raise AppError(
                        status_code=400,
                        detail="Please select a valid course before selecting a learning path.",
                        error_code="COURSE_REQUIRED_FOR_PATH",
                    )

                path = await self._get_learning_path(selected_path_id, resolved_course_id)
                if not path:
                    raise AppError(
                        status_code=404,
                        detail="Selected learning path was not found for the chosen course.",
                        error_code="LEARNING_PATH_NOT_FOUND",
                    )
                profile.current_path_id = path.path_id
            if preferred_language:
                profile.preferred_language = preferred_language
            if timezone:
                profile.timezone = timezone
            if notification_preferences:
                profile.notification_preferences = notification_preferences

            profile.updated_at = datetime.now(tz.utc)

            self.db_session.add(profile)
            await self.db_session.commit()
            await self.db_session.refresh(profile)

            logger.info(f"User profile updated for {user_id}")
            return profile
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error updating user profile for {user_id}: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error updating user profile",
                error_code="PROFILE_UPDATE_ERROR",
            )

    async def complete_onboarding(self, user_id: str) -> UserProfile:
        """
        Mark onboarding as complete for a user.
        
        If user selected bootcamp mode with a cohort, also creates bootcamp enrollment.

        Args:
            user_id: The user's ID

        Returns:
            Updated UserProfile

        Raises:
            AppError: If user profile not found or update fails
        """
        try:
            profile = await self.get_user_profile(user_id)
            if not profile:
                raise AppError(
                    status_code=404,
                    detail="User profile not found",
                    error_code="PROFILE_NOT_FOUND",
                )

            # Validate required fields for onboarding completion
            # Learning mode and primary goal are the minimum required
            if not all([profile.learning_mode, profile.primary_goal]):
                raise AppError(
                    status_code=400,
                    detail="Please complete all onboarding steps before finishing",
                    error_code="INCOMPLETE_ONBOARDING",
                )

            # Handle bootcamp enrollment if user chose bootcamp mode
            if profile.learning_mode == LearningMode.BOOTCAMP and profile.selected_course_id:
                await self._enroll_user_in_bootcamp(user_id, profile.selected_course_id)

            # Handle self-paced course enrollment/payment checks
            if profile.learning_mode == LearningMode.SELF_PACED and profile.selected_course_id:
                course_id = self._parse_course_id(profile.selected_course_id)
                if course_id is None:
                    raise AppError(
                        status_code=400,
                        detail="Invalid selected course. Please reselect a course.",
                        error_code="INVALID_SELECTED_COURSE",
                    )

                min_price = await self._get_course_min_price(course_id)
                if min_price > 0:
                    # Paid course: must already have active enrollment from verified payment.
                    active_stmt = select(UserCourseEnrollment).where(
                        UserCourseEnrollment.user_id == user_id,
                        UserCourseEnrollment.course_id == course_id,
                        UserCourseEnrollment.enrollment_status == EnrollmentStatus.ACTIVE,
                    )
                    active_result = await self.db_session.execute(active_stmt)
                    active_enrollment = active_result.scalar_one_or_none()
                    if not active_enrollment:
                        raise AppError(
                            status_code=400,
                            detail="Please complete payment for your selected course before finishing onboarding.",
                            error_code="PAYMENT_REQUIRED",
                        )
                else:
                    # Free course: auto-enroll if needed.
                    enrollment_service = EnrollmentService(self.db_session)
                    await enrollment_service.enroll_student_in_course(
                        student_id=user_id,
                        course_id=course_id,
                        preferred_path_id=profile.current_path_id,
                    )

            profile.onboarding_completed = True
            profile.onboarding_completed_at = datetime.now(tz.utc)
            profile.updated_at = datetime.now(tz.utc)

            self.db_session.add(profile)
            await self.db_session.commit()
            await self.db_session.refresh(profile)

            logger.info(f"Onboarding completed for {user_id}")
            return profile
        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error completing onboarding for {user_id}: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error completing onboarding",
                error_code="ONBOARDING_COMPLETION_ERROR",
            )

    async def _enroll_user_in_bootcamp(self, user_id: str, bootcamp_id_str: str) -> Optional[BootcampEnrollment]:
        """
        Create bootcamp enrollment during onboarding.
        
        This is a self-enrollment flow that:
        - Validates the bootcamp exists and is published
        - Validates bootcamp has capacity
        - Creates pending enrollment (payment handled separately)
        
        Args:
            user_id: The user's ID
            bootcamp_id_str: Bootcamp ID as string (from selected_course_id)
            
        Returns:
            Created BootcampEnrollment or None if not applicable
        """
        try:
            # Parse bootcamp ID
            try:
                bootcamp_id = int(bootcamp_id_str)
            except ValueError:
                logger.warning(f"Invalid bootcamp_id format: {bootcamp_id_str}")
                return None
            
            # Get bootcamp with enrollment count
            from sqlalchemy import func
            bootcamp_stmt = select(
                Bootcamp,
                func.count(BootcampEnrollment.enrollment_id).label("enrolled_count")
            ).outerjoin(
                BootcampEnrollment,
                Bootcamp.bootcamp_id == BootcampEnrollment.bootcamp_id
            ).where(
                Bootcamp.bootcamp_id == bootcamp_id
            ).group_by(Bootcamp.bootcamp_id)
            
            result = await self.db_session.execute(bootcamp_stmt)
            row = result.first()
            
            if not row:
                logger.warning(f"Bootcamp {bootcamp_id} not found during onboarding enrollment")
                raise AppError(
                    status_code=404,
                    detail="Selected bootcamp not found",
                    error_code="BOOTCAMP_NOT_FOUND",
                )
            
            bootcamp, enrolled_count = row
            
            # Validate bootcamp status - must be published (enrolling)
            if bootcamp.status != BootcampStatus.published:
                raise AppError(
                    status_code=400,
                    detail=f"Bootcamp is not accepting enrollments (status: {bootcamp.status.value})",
                    error_code="BOOTCAMP_NOT_ENROLLING",
                )
            
            # Check capacity
            if enrolled_count >= bootcamp.max_capacity:
                raise AppError(
                    status_code=400,
                    detail="This bootcamp cohort is full. Please select another cohort.",
                    error_code="BOOTCAMP_FULL",
                )
            
            # Check for existing enrollment (idempotent)
            existing_stmt = select(BootcampEnrollment).where(
                (BootcampEnrollment.bootcamp_id == bootcamp_id) &
                (BootcampEnrollment.user_id == user_id)
            )
            existing = await self.db_session.execute(existing_stmt)
            if existing.scalar_one_or_none():
                logger.info(f"User {user_id} already enrolled in bootcamp {bootcamp_id}")
                return None  # Already enrolled, no error
            
            # Create enrollment with pending payment status
            enrollment = BootcampEnrollment(
                bootcamp_id=bootcamp_id,
                user_id=user_id,
                payment_status=EnrollmentPaymentStatus.pending,
                amount_paid=0,
                notes="Self-enrolled during onboarding",
            )
            
            self.db_session.add(enrollment)
            # Note: Commit happens in complete_onboarding to keep atomic
            
            logger.info(f"User {user_id} enrolled in bootcamp {bootcamp_id} during onboarding")
            return enrollment
            
        except AppError:
            raise
        except Exception as e:
            logger.error(f"Error enrolling user {user_id} in bootcamp: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error enrolling in bootcamp",
                error_code="BOOTCAMP_ENROLLMENT_ERROR",
            )

    def _parse_course_id(self, selected_course_id: str) -> Optional[int]:
        try:
            return int(selected_course_id)
        except (TypeError, ValueError):
            return None

    async def _get_course_min_price(self, course_id: int) -> float:
        stmt = select(func.min(LearningPath.price)).where(LearningPath.course_id == course_id)
        result = await self.db_session.execute(stmt)
        min_price = result.scalar()
        if min_price is None:
            return 0.0
        return float(min_price)

    async def _get_learning_path(self, path_id: int, course_id: int) -> Optional[LearningPath]:
        stmt = select(LearningPath).where(
            LearningPath.path_id == path_id,
            LearningPath.course_id == course_id,
        )
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()
