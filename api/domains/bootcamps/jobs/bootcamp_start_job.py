#!/usr/bin/python3
"""
Bootcamp Start Job - Runs daily at 0:05 AM UTC
Automatically enrolls users in the linked course when their bootcamp starts.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import db_session
from domains.bootcamps.models import Bootcamp, BootcampEnrollment, BootcampStatus
from domains.courses.models.progress import UserCourseEnrollment
from domains.users.models.user import User as UserModel

logger = logging.getLogger(__name__)


class BootcampStartService:
    """Service to handle bootcamp start events and auto-enroll users in linked courses."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def process_bootcamp_starts(self) -> dict:
        """
        Process all bootcamps that are starting today.
        For each starting bootcamp:
        1. Update status from PUBLISHED → IN_PROGRESS
        2. Auto-enroll all bootcamp enrollees in the linked course (if any)
        
        Idempotency guarantees:
        - Only processes bootcamps with status PUBLISHED (skips already started)
        - Checks existing course enrollments before creating
        
        Returns:
            Summary of processed bootcamps and enrollments
        """
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        bootcamps_started = 0
        course_enrollments_created = 0
        errors = []
        
        try:
            # Find all bootcamps that:
            # 1. Are published (ready to start)
            # 2. Have start_date today or earlier (handles missed runs)
            # 3. Have not already transitioned to in_progress
            stmt = select(Bootcamp).where(
                and_(
                    Bootcamp.status == BootcampStatus.PUBLISHED,
                    Bootcamp.start_date <= today_end,
                    Bootcamp.is_active == True,
                )
            )
            result = await self.session.execute(stmt)
            bootcamps_to_start = result.scalars().all()
            
            logger.info(f"Found {len(bootcamps_to_start)} bootcamps starting today or earlier")

            for bootcamp in bootcamps_to_start:
                try:
                    # Update bootcamp status to IN_PROGRESS
                    bootcamp.status = BootcampStatus.IN_PROGRESS
                    bootcamp.updated_at = now
                    self.session.add(bootcamp)
                    bootcamps_started += 1
                    
                    logger.info(
                        f"Bootcamp {bootcamp.bootcamp_id} ({bootcamp.name}) started"
                    )
                    
                    # If bootcamp has linked course, enroll all participants
                    if bootcamp.course_id:
                        enrollments_count = await self._enroll_participants_in_course(
                            bootcamp.bootcamp_id,
                            bootcamp.course_id,
                            now,
                        )
                        course_enrollments_created += enrollments_count
                        
                except Exception as e:
                    error_msg = f"Error starting bootcamp {bootcamp.bootcamp_id}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    # Continue processing other bootcamps

            await self.session.commit()

            result = {
                "status": "success",
                "bootcamps_started": bootcamps_started,
                "course_enrollments_created": course_enrollments_created,
                "errors": errors,
                "executed_at": now.isoformat(),
            }
            logger.info(f"Bootcamp start job completed: {result}")
            return result

        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error in bootcamp start job: {str(e)}")
            raise

    async def _enroll_participants_in_course(
        self,
        bootcamp_id: int,
        course_id: int,
        now: datetime,
    ) -> int:
        """
        Enroll all bootcamp participants in the linked course.
        
        Args:
            bootcamp_id: The bootcamp ID
            course_id: The linked course ID
            now: Current timestamp
            
        Returns:
            Number of new enrollments created
        """
        enrollments_created = 0
        
        try:
            # Get all bootcamp enrollments
            enrollment_stmt = select(BootcampEnrollment).where(
                BootcampEnrollment.bootcamp_id == bootcamp_id
            )
            enrollment_result = await self.session.execute(enrollment_stmt)
            bootcamp_enrollments = enrollment_result.scalars().all()
            
            logger.info(
                f"Processing {len(bootcamp_enrollments)} enrollments for bootcamp {bootcamp_id}"
            )

            for enrollment in bootcamp_enrollments:
                user_id = enrollment.user_id
                
                # Check if user is already enrolled in the course
                existing_stmt = select(UserCourseEnrollment).where(
                    and_(
                        UserCourseEnrollment.user_id == user_id,
                        UserCourseEnrollment.course_id == course_id,
                    )
                )
                existing_result = await self.session.execute(existing_stmt)
                existing_enrollment = existing_result.scalar_one_or_none()
                
                if existing_enrollment:
                    logger.debug(
                        f"User {user_id} already enrolled in course {course_id}"
                    )
                    continue
                
                # Create new course enrollment
                course_enrollment = UserCourseEnrollment(
                    user_id=user_id,
                    course_id=course_id,
                    enrolled_at=now,
                    is_active=True,
                    # Note: enrollment_type="bootcamp" could be added with migration
                )
                self.session.add(course_enrollment)
                enrollments_created += 1
                
                logger.info(
                    f"Enrolled user {user_id} in course {course_id} via bootcamp {bootcamp_id}"
                )
                
        except Exception as e:
            logger.error(
                f"Error enrolling participants from bootcamp {bootcamp_id} in course {course_id}: {str(e)}"
            )
            raise
            
        return enrollments_created


async def run_bootcamp_start_job():
    """
    Entry point for the scheduled job.
    Creates a new database session and runs the bootcamp start checks.
    """
    logger.info("Starting bootcamp start job...")
    
    async with db_session.get_async_session_context() as session:
        service = BootcampStartService(session)
        result = await service.process_bootcamp_starts()
        
    logger.info(f"Bootcamp start job finished: {result}")
    return result
