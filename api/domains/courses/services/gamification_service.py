#!/usr/bin/python3
"""
Gamification Service - XP and Streak Management

Business Rules Implemented:
---------------------------
1. XP System:
   - XP earned ONLY from quiz questions (AssessmentSubmission)
   - XP = points_earned for correctly answered questions
   - Cumulative across ALL courses
   - Computed server-side only

2. Streak System:
   - Consecutive DAYS of quiz activity
   - Day counts if student earns at least 1 XP that day
   - Increments once per calendar day (not per question)
   - Missing a day resets streak to 0
   - Uses user's configured timezone

3. XP Per Question Policy:
   - XP awarded only on FIRST correct answer
   - Reattempts/retries do NOT award additional XP
   - This prevents farming XP by re-answering questions
"""
import logging
from datetime import datetime, timezone, date, timedelta
from typing import Optional, Dict, Any
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from domains.courses.models.gamification import UserGamification, DailyXPLog
from domains.courses.models.progress import AssessmentSubmission
from domains.users.models.onboarding import UserProfile

logger = logging.getLogger(__name__)


class GamificationService:
    """
    Service for managing XP and streak calculations.
    
    Thread-safe: All operations use database transactions.
    Idempotent: Duplicate calls produce same result.
    """

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_user_gamification(self, user_id: str) -> Dict[str, Any]:
        """
        Get gamification data for a user.
        
        This is the API endpoint data source.
        
        Args:
            user_id: User ID
            
        Returns:
            Dict with total_xp, current_streak, last_activity_date, etc.
        """
        # Get or create gamification record
        gamification = await self._get_or_create_gamification(user_id)
        
        # Get user timezone for display
        user_timezone = await self._get_user_timezone(user_id)
        
        return {
            "total_xp": gamification.total_xp,
            "current_streak": gamification.current_streak,
            "longest_streak": gamification.longest_streak,
            "last_activity_date": gamification.last_activity_date.isoformat() if gamification.last_activity_date else None,
            "total_questions_answered": gamification.total_questions_answered,
            "total_correct_answers": gamification.total_correct_answers,
            "accuracy_percentage": round(
                (gamification.total_correct_answers / gamification.total_questions_answered * 100)
                if gamification.total_questions_answered > 0 else 0, 1
            ),
            "timezone": user_timezone,
        }

    async def record_quiz_activity(
        self,
        user_id: str,
        question_id: int,
        is_correct: bool,
        points_earned: int,
        submitted_at: datetime,
    ) -> Dict[str, Any]:
        """
        Record quiz activity and update XP/streak.
        
        Called after each quiz question submission.
        
        Args:
            user_id: User ID
            question_id: Question that was answered
            is_correct: Whether answer was correct
            points_earned: Points from this submission (0 if incorrect)
            submitted_at: Timestamp of submission (UTC)
            
        Returns:
            Updated gamification summary
            
        Business Rules:
        - XP only awarded for correct answers
        - XP only awarded ONCE per question (first correct attempt)
        - Streak updates once per calendar day
        """
        try:
            # Check if this question was already answered correctly before
            if is_correct and points_earned > 0:
                already_earned = await self._check_already_earned_xp(user_id, question_id)
                if already_earned:
                    logger.info(f"User {user_id} already earned XP for question {question_id}, skipping XP update")
                    points_earned = 0  # Don't double-award

            # Get user timezone for date calculations
            user_timezone = await self._get_user_timezone(user_id)
            activity_date = self._get_user_local_date(submitted_at, user_timezone)
            
            # Get or create gamification record
            gamification = await self._get_or_create_gamification(user_id)
            
            # Update totals
            gamification.total_questions_answered += 1
            if is_correct:
                gamification.total_correct_answers += 1
                if points_earned > 0:
                    gamification.total_xp += points_earned
            
            # Update streak (only if XP was earned)
            if is_correct and points_earned > 0:
                await self._update_streak(gamification, activity_date)
            
            gamification.updated_at = datetime.now(timezone.utc)
            self.db_session.add(gamification)
            
            # Log daily activity
            await self._log_daily_activity(
                user_id=user_id,
                activity_date=activity_date,
                xp_earned=points_earned if is_correct else 0,
                is_correct=is_correct,
                submitted_at=submitted_at,
            )
            
            await self.db_session.commit()
            await self.db_session.refresh(gamification)
            
            logger.info(
                f"Gamification updated for user {user_id}: "
                f"XP={gamification.total_xp}, Streak={gamification.current_streak}"
            )
            
            return {
                "total_xp": gamification.total_xp,
                "current_streak": gamification.current_streak,
                "xp_earned_now": points_earned if is_correct else 0,
                "streak_updated": is_correct and points_earned > 0,
            }

        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error recording quiz activity: {str(e)}")
            raise

    async def _update_streak(self, gamification: UserGamification, activity_date: date) -> None:
        """
        Update streak based on activity date.
        
        Streak Logic:
        -------------
        1. First activity ever: streak = 1
        2. Same day as last activity: no change (already counted)
        3. Consecutive day (yesterday): streak += 1
        4. Skipped days: streak = 1 (reset)
        
        Args:
            gamification: User's gamification record
            activity_date: Calendar date of this activity (in user's timezone)
        """
        last_date = gamification.last_activity_date
        
        if last_date is None:
            # First-ever activity
            gamification.current_streak = 1
            gamification.last_activity_date = activity_date
            logger.debug(f"First activity for user, streak set to 1")
            
        elif last_date == activity_date:
            # Same day - streak already counted, just update last_activity_date
            # No change to streak count
            logger.debug(f"Same day activity, streak unchanged at {gamification.current_streak}")
            
        elif last_date == activity_date - timedelta(days=1):
            # Consecutive day - increment streak
            gamification.current_streak += 1
            gamification.last_activity_date = activity_date
            logger.debug(f"Consecutive day, streak incremented to {gamification.current_streak}")
            
        else:
            # Skipped one or more days - reset streak
            gamification.current_streak = 1
            gamification.last_activity_date = activity_date
            logger.debug(f"Streak broken (last: {last_date}, now: {activity_date}), reset to 1")
        
        # Update longest streak if current exceeds it
        if gamification.current_streak > gamification.longest_streak:
            gamification.longest_streak = gamification.current_streak

    async def _check_already_earned_xp(self, user_id: str, question_id: int) -> bool:
        """
        Check if user has already earned XP for this question.
        
        Prevents duplicate XP from reattempts.
        
        Returns:
            True if XP was already awarded for this question
        """
        stmt = select(AssessmentSubmission).where(
            and_(
                AssessmentSubmission.user_id == user_id,
                AssessmentSubmission.question_id == question_id,
                AssessmentSubmission.is_correct == True,
                AssessmentSubmission.points_earned > 0,
            )
        ).limit(1)
        
        result = await self.db_session.execute(stmt)
        existing = result.scalar_one_or_none()
        return existing is not None

    async def _get_or_create_gamification(self, user_id: str) -> UserGamification:
        """Get or create gamification record for user."""
        stmt = select(UserGamification).where(UserGamification.user_id == user_id)
        result = await self.db_session.execute(stmt)
        gamification = result.scalar_one_or_none()
        
        if gamification is None:
            gamification = UserGamification(
                user_id=user_id,
                total_xp=0,
                current_streak=0,
                longest_streak=0,
                total_questions_answered=0,
                total_correct_answers=0,
            )
            self.db_session.add(gamification)
            await self.db_session.flush()
        
        return gamification

    async def _get_user_timezone(self, user_id: str) -> str:
        """Get user's configured timezone from profile."""
        stmt = select(UserProfile.timezone).where(UserProfile.user_id == user_id)
        result = await self.db_session.execute(stmt)
        tz = result.scalar_one_or_none()
        return tz or "UTC"

    def _get_user_local_date(self, utc_datetime: datetime, user_timezone: str) -> date:
        """
        Convert UTC datetime to user's local calendar date.
        
        This is critical for streak calculation - we need to know
        what calendar day it is IN THE USER'S TIMEZONE.
        
        Args:
            utc_datetime: Datetime in UTC
            user_timezone: User's timezone string (e.g., "America/New_York")
            
        Returns:
            Calendar date in user's timezone
        """
        try:
            import pytz
            user_tz = pytz.timezone(user_timezone)
            local_dt = utc_datetime.astimezone(user_tz)
            return local_dt.date()
        except Exception as e:
            # Fallback to UTC if timezone is invalid
            logger.warning(f"Invalid timezone '{user_timezone}', using UTC: {e}")
            return utc_datetime.date()

    async def _log_daily_activity(
        self,
        user_id: str,
        activity_date: date,
        xp_earned: int,
        is_correct: bool,
        submitted_at: datetime,
    ) -> None:
        """
        Log or update daily activity record.
        
        Uses upsert to handle multiple submissions on same day.
        """
        # Check if record exists for this user + date
        stmt = select(DailyXPLog).where(
            and_(
                DailyXPLog.user_id == user_id,
                DailyXPLog.activity_date == activity_date,
            )
        )
        result = await self.db_session.execute(stmt)
        daily_log = result.scalar_one_or_none()
        
        if daily_log is None:
            # Create new daily log
            daily_log = DailyXPLog(
                user_id=user_id,
                activity_date=activity_date,
                xp_earned=xp_earned,
                questions_answered=1,
                correct_answers=1 if is_correct else 0,
                first_activity_at=submitted_at,
                last_activity_at=submitted_at,
            )
            self.db_session.add(daily_log)
        else:
            # Update existing log
            daily_log.xp_earned += xp_earned
            daily_log.questions_answered += 1
            if is_correct:
                daily_log.correct_answers += 1
            daily_log.last_activity_at = submitted_at
            daily_log.updated_at = datetime.now(timezone.utc)

    async def recalculate_user_xp(self, user_id: str) -> int:
        """
        Recalculate total XP from source data.
        
        Used for:
        - Data recovery
        - Fixing inconsistencies
        - Admin operations
        
        This is the authoritative XP calculation.
        
        Returns:
            Recalculated total XP
        """
        # Sum all points from correct assessment submissions
        # Only count first correct submission per question
        stmt = select(
            func.sum(AssessmentSubmission.points_earned)
        ).where(
            and_(
                AssessmentSubmission.user_id == user_id,
                AssessmentSubmission.is_correct == True,
                AssessmentSubmission.points_earned > 0,
            )
        ).distinct(AssessmentSubmission.question_id)
        
        # More robust: use subquery to get first correct per question
        subquery = select(
            AssessmentSubmission.question_id,
            func.min(AssessmentSubmission.submission_id).label("first_submission_id")
        ).where(
            and_(
                AssessmentSubmission.user_id == user_id,
                AssessmentSubmission.is_correct == True,
                AssessmentSubmission.points_earned > 0,
            )
        ).group_by(AssessmentSubmission.question_id).subquery()
        
        stmt = select(func.sum(AssessmentSubmission.points_earned)).where(
            AssessmentSubmission.submission_id.in_(
                select(subquery.c.first_submission_id)
            )
        )
        
        result = await self.db_session.execute(stmt)
        total_xp = result.scalar() or 0
        
        # Update the stored value
        gamification = await self._get_or_create_gamification(user_id)
        gamification.total_xp = total_xp
        gamification.updated_at = datetime.now(timezone.utc)
        
        await self.db_session.commit()
        
        logger.info(f"Recalculated XP for user {user_id}: {total_xp}")
        return total_xp

    async def check_and_fix_streak(self, user_id: str) -> Dict[str, Any]:
        """
        Verify and fix streak calculation based on daily logs.
        
        Used for:
        - Recovery after system issues
        - Fixing incorrect streaks
        - Admin verification
        
        Returns:
            Corrected streak data
        """
        # Get all activity dates for user, ordered descending
        stmt = select(DailyXPLog.activity_date).where(
            and_(
                DailyXPLog.user_id == user_id,
                DailyXPLog.xp_earned > 0,  # Only days with XP earned count
            )
        ).order_by(DailyXPLog.activity_date.desc())
        
        result = await self.db_session.execute(stmt)
        activity_dates = [row[0] for row in result.fetchall()]
        
        if not activity_dates:
            # No activity
            gamification = await self._get_or_create_gamification(user_id)
            gamification.current_streak = 0
            gamification.last_activity_date = None
            await self.db_session.commit()
            return {"current_streak": 0, "last_activity_date": None}
        
        # Calculate current streak
        user_timezone = await self._get_user_timezone(user_id)
        today = self._get_user_local_date(datetime.now(timezone.utc), user_timezone)
        
        current_streak = 0
        expected_date = today
        
        for activity_date in activity_dates:
            if activity_date == expected_date:
                current_streak += 1
                expected_date = activity_date - timedelta(days=1)
            elif activity_date == expected_date - timedelta(days=1):
                # Yesterday was expected, but we found day before
                # This means streak was broken
                break
            else:
                # Found older date, streak broken
                break
        
        # If first activity wasn't today, check if it was yesterday
        if activity_dates[0] != today and activity_dates[0] != today - timedelta(days=1):
            # Most recent activity was more than 1 day ago - streak is 0
            current_streak = 0
        
        # Update gamification record
        gamification = await self._get_or_create_gamification(user_id)
        gamification.current_streak = current_streak
        gamification.last_activity_date = activity_dates[0] if activity_dates else None
        gamification.updated_at = datetime.now(timezone.utc)
        
        await self.db_session.commit()
        
        logger.info(f"Fixed streak for user {user_id}: {current_streak}")
        return {
            "current_streak": current_streak,
            "last_activity_date": activity_dates[0].isoformat() if activity_dates else None,
        }
