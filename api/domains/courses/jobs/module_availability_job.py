#!/usr/bin/python3
"""
Module Availability Job - Runs daily at 6:00 AM
Automatically unlocks modules based on user registration date and module unlock_after_days configuration.
Sends email notifications for newly unlocked modules.

Safety features:
- PostgreSQL advisory lock prevents concurrent job execution
- FOR UPDATE SKIP LOCKED prevents double-processing of individual rows
- Retry with exponential backoff handles transient DB/network failures
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy import select, update, and_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.session import db_session
from domains.courses.models.course import Module, LearningPath, Course
from domains.courses.models.progress import UserModuleAvailability, UserCourseEnrollment
from domains.users.models.user import User as UserModel
from domains.mailings.services.email_service import email_service

logger = logging.getLogger(__name__)

# Advisory lock ID – unique per job type (arbitrary 64-bit int)
MODULE_AVAILABILITY_LOCK_ID = 839_201_001

# Retry configuration
MAX_RETRIES = 3
RETRY_BASE_DELAY_SECONDS = 5


class ModuleAvailabilityService:
    """Service to manage module availability based on user registration and schedule."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def unlock_scheduled_modules(self) -> dict:
        """
        Unlock all modules that are scheduled to be unlocked today.
        Sends email notifications for each newly unlocked module.
        
        This should run daily at 6:00 AM.
        
        Idempotency guarantees:
        - is_unlocked == False filter: Already unlocked modules are skipped
        - email_sent_at check: Prevents duplicate email notifications
        - scheduled_unlock_date <= now: Catches any missed runs (recovery)
        - FOR UPDATE SKIP LOCKED: Prevents double-processing if two instances overlap
        
        Returns:
            Summary of unlocked modules and emails sent
        """
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        unlocked_count = 0
        emails_sent = 0
        errors = []
        
        try:
            # Find all module availability records that are scheduled to unlock today or earlier
            # Using <= now to catch any modules from missed job runs (recovery scenario)
            # FOR UPDATE SKIP LOCKED: if another process already locked a row, skip it
            stmt = (
                select(UserModuleAvailability)
                .where(
                    and_(
                        UserModuleAvailability.is_unlocked == False,
                        UserModuleAvailability.scheduled_unlock_date <= now
                    )
                )
                .with_for_update(skip_locked=True)
            )
            result = await self.session.execute(stmt)
            modules_to_unlock = result.scalars().all()
            
            logger.info(f"Found {len(modules_to_unlock)} modules to unlock")

            for availability in modules_to_unlock:
                try:
                    # Get the module to calculate deadlines and get metadata
                    module = await self._get_module(availability.module_id)
                    if not module:
                        logger.warning(f"Module {availability.module_id} not found, skipping")
                        continue

                    # Unlock the module
                    availability.is_unlocked = True
                    availability.unlocked_at = now
                    
                    # Calculate user-specific deadlines based on unlock date
                    if module.first_deadline_days:
                        availability.first_deadline = now + timedelta(days=module.first_deadline_days)
                    if module.second_deadline_days:
                        availability.second_deadline = now + timedelta(days=module.second_deadline_days)
                    if module.third_deadline_days:
                        availability.third_deadline = now + timedelta(days=module.third_deadline_days)
                    
                    availability.updated_at = now
                    
                    # Send email notification (only if not already sent - idempotency check)
                    if availability.email_sent_at is None:
                        email_result = await self._send_unlock_notification(
                            availability.user_id, 
                            module, 
                            availability.path_id
                        )
                        if email_result:
                            availability.email_sent_at = now
                            emails_sent += 1
                    
                    self.session.add(availability)
                    unlocked_count += 1
                    
                    logger.info(
                        f"Unlocked module {module.module_id} ({module.title}) for user {availability.user_id}"
                    )
                    
                except Exception as e:
                    error_msg = f"Error unlocking module {availability.module_id} for user {availability.user_id}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    # Continue processing other modules

            await self.session.commit()

            result = {
                "status": "success",
                "unlocked_count": unlocked_count,
                "emails_sent": emails_sent,
                "errors": errors,
                "executed_at": now.isoformat(),
            }
            logger.info(f"Module availability job completed: {result}")
            return result

        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error in module availability job: {str(e)}")
            raise

    async def _send_unlock_notification(
        self,
        user_id: str,
        module: Module,
        path_id: int,
    ) -> bool:
        """
        Send email notification for module unlock.
        
        Args:
            user_id: The user to notify
            module: The unlocked module
            path_id: Learning path ID (to get course info)
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Get user details
            user_stmt = select(UserModel).where(UserModel.id == user_id)
            user_result = await self.session.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            
            if not user or not user.email:
                logger.warning(f"User {user_id} not found or has no email")
                return False
            
            # Get course title via learning path
            path_stmt = select(LearningPath).where(LearningPath.path_id == path_id)
            path_result = await self.session.execute(path_stmt)
            path = path_result.scalar_one_or_none()
            
            course_title = "Your Course"
            if path:
                course_stmt = select(Course).where(Course.course_id == path.course_id)
                course_result = await self.session.execute(course_stmt)
                course = course_result.scalar_one_or_none()
                if course:
                    course_title = course.title
            
            # Send the email
            return await email_service.send_module_unlock_notification(
                user_email=user.email,
                user_name=user.full_name if hasattr(user, 'full_name') else None,
                module_title=module.title,
                course_title=course_title,
                module_description=module.description,
            )
            
        except Exception as e:
            logger.error(f"Error sending notification to user {user_id}: {str(e)}")
            return False

    async def schedule_modules_for_user(
        self,
        user_id: str,
        course_id: int,
        path_id: int,
        registration_date: datetime,
    ) -> List[UserModuleAvailability]:
        """
        Create module availability schedule for a user when they enroll in a course.
        
        Args:
            user_id: The user's ID
            course_id: The course ID
            path_id: The learning path ID
            registration_date: When the user registered/enrolled
            
        Returns:
            List of created UserModuleAvailability records
        """
        try:
            # Get all modules for the learning path
            stmt = select(Module).where(Module.path_id == path_id).order_by(Module.order)
            result = await self.session.execute(stmt)
            modules = result.scalars().all()

            availability_records = []
            for module in modules:
                # Check if availability record already exists
                existing_stmt = select(UserModuleAvailability).where(
                    and_(
                        UserModuleAvailability.user_id == user_id,
                        UserModuleAvailability.module_id == module.module_id,
                    )
                )
                existing_result = await self.session.execute(existing_stmt)
                if existing_result.scalar_one_or_none():
                    continue

                # Calculate scheduled unlock date
                scheduled_unlock = registration_date + timedelta(days=module.unlock_after_days)
                
                # Determine if module should be immediately available
                now = datetime.now(timezone.utc)
                is_unlocked = module.is_available_by_default or scheduled_unlock <= now
                unlocked_at = now if is_unlocked else None
                
                # Calculate deadlines if module is unlocked
                first_deadline = None
                second_deadline = None
                third_deadline = None
                
                if is_unlocked and unlocked_at:
                    if module.first_deadline_days:
                        first_deadline = unlocked_at + timedelta(days=module.first_deadline_days)
                    if module.second_deadline_days:
                        second_deadline = unlocked_at + timedelta(days=module.second_deadline_days)
                    if module.third_deadline_days:
                        third_deadline = unlocked_at + timedelta(days=module.third_deadline_days)

                availability = UserModuleAvailability(
                    user_id=user_id,
                    module_id=module.module_id,
                    path_id=path_id,
                    is_unlocked=is_unlocked,
                    unlocked_at=unlocked_at,
                    scheduled_unlock_date=scheduled_unlock,
                    first_deadline=first_deadline,
                    second_deadline=second_deadline,
                    third_deadline=third_deadline,
                )
                self.session.add(availability)
                availability_records.append(availability)

            await self.session.commit()
            
            logger.info(f"Scheduled {len(availability_records)} modules for user {user_id} in course {course_id}")
            return availability_records

        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error scheduling modules for user: {str(e)}")
            raise

    async def get_user_module_availability(
        self,
        user_id: str,
        module_id: int,
    ) -> Optional[UserModuleAvailability]:
        """Get a user's module availability record."""
        stmt = select(UserModuleAvailability).where(
            and_(
                UserModuleAvailability.user_id == user_id,
                UserModuleAvailability.module_id == module_id,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_path_modules_availability(
        self,
        user_id: str,
        path_id: int,
    ) -> List[UserModuleAvailability]:
        """Get all module availability records for a user's learning path."""
        stmt = select(UserModuleAvailability).where(
            and_(
                UserModuleAvailability.user_id == user_id,
                UserModuleAvailability.path_id == path_id,
            )
        ).order_by(UserModuleAvailability.module_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def _get_module(self, module_id: int) -> Optional[Module]:
        """Get a module by ID."""
        stmt = select(Module).where(Module.module_id == module_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


async def _acquire_advisory_lock(session: AsyncSession) -> bool:
    """
    Try to acquire a PostgreSQL session-level advisory lock.
    Returns True if acquired, False if another process already holds it.
    """
    result = await session.execute(
        text("SELECT pg_try_advisory_lock(:lock_id)"),
        {"lock_id": MODULE_AVAILABILITY_LOCK_ID},
    )
    return result.scalar()


async def _release_advisory_lock(session: AsyncSession) -> None:
    """Release the PostgreSQL session-level advisory lock."""
    await session.execute(
        text("SELECT pg_advisory_unlock(:lock_id)"),
        {"lock_id": MODULE_AVAILABILITY_LOCK_ID},
    )


async def run_module_availability_job():
    """
    Run the module availability job with advisory locking and retry.

    Safety:
    - pg_try_advisory_lock prevents concurrent execution across processes.
    - Retries up to MAX_RETRIES times with exponential back-off on transient errors.
    - This should be scheduled to run daily at 6:00 AM.
    """
    logger.info("Starting module availability job...")

    last_exc: Optional[Exception] = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with db_session.get_async_session_context() as session:
                # ---- acquire advisory lock ----
                acquired = await _acquire_advisory_lock(session)
                if not acquired:
                    logger.warning(
                        "Module availability job skipped – another instance holds the lock."
                    )
                    return {"status": "skipped", "reason": "lock_held"}

                try:
                    service = ModuleAvailabilityService(session)
                    result = await service.unlock_scheduled_modules()
                    logger.info(f"Module availability job result: {result}")
                    return result
                finally:
                    # Always release the advisory lock, even on error
                    try:
                        await _release_advisory_lock(session)
                    except Exception as unlock_err:
                        logger.error(
                            f"Failed to release advisory lock: {unlock_err}"
                        )

        except Exception as e:
            last_exc = e
            if attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
                logger.warning(
                    f"Module availability job attempt {attempt}/{MAX_RETRIES} failed: {e}. "
                    f"Retrying in {delay}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    f"Module availability job failed after {MAX_RETRIES} attempts: {e}"
                )

    raise last_exc  # type: ignore[misc]


# Entry point for cron/scheduler
if __name__ == "__main__":
    asyncio.run(run_module_availability_job())
