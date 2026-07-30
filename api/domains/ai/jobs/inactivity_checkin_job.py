#!/usr/bin/python3
"""
Inactivity Check-in Job - Runs daily.
AI mentor trigger: student inactive for 3+ days -> generate a check-in message
and email it. Sends once per inactivity episode (not repeated daily) — a
student who comes back and goes inactive again is eligible for a new one.

Safety features (mirrors module_availability_job.py):
- PostgreSQL advisory lock prevents concurrent job execution
- Retry with exponential backoff handles transient DB/network failures
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import db_session
from domains.users.models.onboarding import UserProfile
from domains.users.models.user import User as UserModel
from domains.ai.models.feedback import AIMentorFeedback
from domains.ai.services import mentor_feedback_service
from domains.mailings.services.email_service import email_service

logger = logging.getLogger(__name__)

INACTIVITY_THRESHOLD_DAYS = 3
INACTIVITY_CHECKIN_LOCK_ID = 839_201_002

MAX_RETRIES = 3
RETRY_BASE_DELAY_SECONDS = 5


class InactivityCheckinService:
    """Finds students inactive for 3+ days and sends a one-time AI check-in email."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def send_checkins(self) -> dict:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=INACTIVITY_THRESHOLD_DAYS)

        sent = 0
        skipped_already_notified = 0
        errors = []

        try:
            stmt = select(UserProfile).where(
                and_(
                    UserProfile.last_active_at.isnot(None),
                    UserProfile.last_active_at <= cutoff,
                )
            )
            result = await self.session.execute(stmt)
            candidates = result.scalars().all()

            logger.info(f"Found {len(candidates)} inactivity candidates")

            for profile in candidates:
                try:
                    if await self._already_notified_for_this_episode(profile):
                        skipped_already_notified += 1
                        continue

                    user_result = await self.session.execute(
                        select(UserModel).where(UserModel.id == profile.user_id)
                    )
                    user = user_result.scalar_one_or_none()
                    if not user or not user.email:
                        continue

                    user_name = user.full_name if hasattr(user, "full_name") else None

                    feedback = await mentor_feedback_service.generate_checkin_message(
                        db_session=self.session,
                        user_id=profile.user_id,
                        user_name=user_name,
                    )
                    email_sent = await email_service.send_inactivity_checkin(
                        user_email=user.email,
                        user_name=user_name,
                        message=feedback.message,
                    )
                    if email_sent:
                        sent += 1
                    logger.info(f"Inactivity check-in generated for user {profile.user_id} (email_sent={email_sent})")

                except Exception as e:
                    error_msg = f"Error sending check-in to user {profile.user_id}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)

            result = {
                "status": "success",
                "checkins_sent": sent,
                "skipped_already_notified": skipped_already_notified,
                "errors": errors,
                "executed_at": now.isoformat(),
            }
            logger.info(f"Inactivity check-in job completed: {result}")
            return result

        except Exception as e:
            logger.error(f"Error in inactivity check-in job: {str(e)}")
            raise

    async def _already_notified_for_this_episode(self, profile: UserProfile) -> bool:
        """True if a check-in was already generated after this inactivity episode began."""
        stmt = select(AIMentorFeedback.feedback_id).where(
            AIMentorFeedback.user_id == profile.user_id,
            AIMentorFeedback.category == "inactivity_checkin",
            AIMentorFeedback.created_at > profile.last_active_at,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None


async def _acquire_advisory_lock(session: AsyncSession) -> bool:
    result = await session.execute(
        text("SELECT pg_try_advisory_lock(:lock_id)"),
        {"lock_id": INACTIVITY_CHECKIN_LOCK_ID},
    )
    return result.scalar()


async def _release_advisory_lock(session: AsyncSession) -> None:
    await session.execute(
        text("SELECT pg_advisory_unlock(:lock_id)"),
        {"lock_id": INACTIVITY_CHECKIN_LOCK_ID},
    )


async def run_inactivity_checkin_job():
    """Run the inactivity check-in job with advisory locking and retry.

    Should be scheduled to run once daily.
    """
    logger.info("Starting inactivity check-in job...")

    last_exc: Optional[Exception] = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with db_session.get_async_session_context() as session:
                acquired = await _acquire_advisory_lock(session)
                if not acquired:
                    logger.warning("Inactivity check-in job skipped – another instance holds the lock.")
                    return {"status": "skipped", "reason": "lock_held"}

                try:
                    service = InactivityCheckinService(session)
                    result = await service.send_checkins()
                    return result
                finally:
                    try:
                        await _release_advisory_lock(session)
                    except Exception as unlock_err:
                        logger.error(f"Failed to release advisory lock: {unlock_err}")

        except Exception as e:
            last_exc = e
            if attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
                logger.warning(
                    f"Inactivity check-in job attempt {attempt}/{MAX_RETRIES} failed: {e}. Retrying in {delay}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(f"Inactivity check-in job failed after {MAX_RETRIES} attempts: {e}")

    raise last_exc  # type: ignore[misc]


if __name__ == "__main__":
    asyncio.run(run_inactivity_checkin_job())
