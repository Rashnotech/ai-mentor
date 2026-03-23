#!/usr/bin/python3
"""
Gamification models for XP and Streak tracking.

Design Decisions:
-----------------
1. STORED SUMMARY (not computed dynamically):
   - total_xp and current_streak are stored and incrementally updated
   - Reason: Avoids expensive aggregation queries on every dashboard load
   - Trade-off: Requires careful update triggers to maintain consistency

2. Why NOT computed dynamically:
   - Dynamic: SELECT SUM(points_earned) FROM assessment_submissions WHERE user_id = X
   - Problem: O(n) query where n = all submissions ever made
   - With 10K users × 100 questions = 1M rows to aggregate per request
   - Stored approach: O(1) read, O(1) write on each submission

3. Streak is stored because:
   - Detecting "consecutive days" requires sorting all activity dates
   - Dynamic streak calculation is O(n log n) vs O(1) stored lookup
   - last_activity_date enables efficient streak continuation check
"""
from datetime import datetime, timezone, date
from sqlalchemy import Column, Integer, String, DateTime, Date, Index, ForeignKey
from db.base import Base


class UserGamification(Base):
    """
    User XP and streak summary table.
    
    Updated incrementally on each quiz submission.
    This is the source of truth for gamification data.
    """
    __tablename__ = "user_gamification"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    
    # XP Summary
    # - Cumulative across ALL courses
    # - Only from quiz questions (AssessmentSubmission.points_earned)
    # - Updated on each correct quiz answer
    total_xp = Column(Integer, default=0, nullable=False)
    
    # Streak Tracking
    # - current_streak: Number of consecutive days with quiz activity
    # - last_activity_date: Calendar date (in user's timezone) of last XP-earning activity
    # - longest_streak: Historical best (optional, for badges)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_activity_date = Column(Date, nullable=True)  # Uses user's timezone
    
    # Activity counters (for analytics/badges)
    total_questions_answered = Column(Integer, default=0, nullable=False)
    total_correct_answers = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        # Index for leaderboard queries (ORDER BY total_xp DESC)
        Index("idx_user_gamification_xp", "total_xp"),
        # Index for streak-based queries
        Index("idx_user_gamification_streak", "current_streak"),
    )


class DailyXPLog(Base):
    """
    Daily XP activity log for streak verification and audit.
    
    One row per user per calendar day where XP was earned.
    Used for:
    - Verifying streak calculations
    - Preventing duplicate streak increments on same day
    - Historical activity analysis
    """
    __tablename__ = "daily_xp_logs"
    
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    # Calendar date in user's timezone when XP was earned
    activity_date = Column(Date, nullable=False)
    
    # XP earned on this specific day
    xp_earned = Column(Integer, default=0, nullable=False)
    
    # Number of questions answered on this day
    questions_answered = Column(Integer, default=0, nullable=False)
    correct_answers = Column(Integer, default=0, nullable=False)
    
    # Timestamp of first and last activity on this day
    first_activity_at = Column(DateTime(timezone=True), nullable=False)
    last_activity_at = Column(DateTime(timezone=True), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        # Unique constraint: one row per user per day
        Index("idx_daily_xp_log_user_date", "user_id", "activity_date", unique=True),
        # For streak calculation: find recent activity days
        Index("idx_daily_xp_log_date", "activity_date"),
    )
