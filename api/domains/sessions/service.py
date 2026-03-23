#!/usr/bin/python3
"""
Service layer for mentoring session management.
"""
from typing import Optional, List, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, and_
from sqlalchemy.orm import selectinload

from domains.sessions.models import (
    MentoringSession,
    SessionAttendance,
    SessionPlatform,
    SessionStatus,
)
from domains.users.models.user import User, UserRole
from domains.bootcamps.models import BootcampEnrollment
from core.errors import AppError
import logging
import uuid

logger = logging.getLogger(__name__)


class SessionService:
    """Business logic for mentoring sessions and attendance."""

    def __init__(self, db_session: AsyncSession, current_user: dict):
        self.db = db_session
        self.user = current_user

    # ------------------------------------------------------------------ #
    #  Authorisation helpers
    # ------------------------------------------------------------------ #

    def _require_mentor_or_admin(self) -> None:
        role = self.user.get("role")
        if isinstance(role, UserRole):
            role = role.value
        if role not in ("mentor", "admin"):
            raise AppError(status_code=403, detail="Only mentors or admins can perform this action", error_code="FORBIDDEN")

    def _require_session_owner(self, session: MentoringSession) -> None:
        uid = self.user.get("user_id")
        role = self.user.get("role")
        if isinstance(role, UserRole):
            role = role.value
        if session.mentor_id != uid and role != "admin":
            raise AppError(status_code=403, detail="You do not own this session", error_code="FORBIDDEN")

    # ------------------------------------------------------------------ #
    #  CREATE
    # ------------------------------------------------------------------ #

    async def create_session(
        self,
        title: str,
        session_link: str,
        platform: SessionPlatform,
        scheduled_date: datetime,
        start_time: datetime,
        end_time: datetime,
        timezone_str: str = "UTC",
        description: Optional[str] = None,
        bootcamp_id: Optional[int] = None,
        course_id: Optional[int] = None,
    ) -> MentoringSession:
        self._require_mentor_or_admin()

        now = datetime.now(timezone.utc)

        # Validation: end after start
        if end_time <= start_time:
            raise AppError(status_code=400, detail="End time must be after start time", error_code="INVALID_TIME")
        # Validation: not in the past
        if start_time < now:
            raise AppError(status_code=400, detail="Session cannot be scheduled in the past", error_code="PAST_DATE")

        session = MentoringSession(
            mentor_id=self.user.get("user_id"),
            title=title,
            description=description,
            platform=platform,
            session_link=session_link,
            scheduled_date=scheduled_date,
            start_time=start_time,
            end_time=end_time,
            timezone=timezone_str,
            bootcamp_id=bootcamp_id,
            course_id=course_id,
            attendance_token=uuid.uuid4().hex,
            status=SessionStatus.scheduled,
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        logger.info(f"Session {session.session_id} created by {self.user.get('user_id')}")
        return session

    # ------------------------------------------------------------------ #
    #  UPDATE
    # ------------------------------------------------------------------ #

    async def update_session(self, session_id: int, **kwargs) -> MentoringSession:
        self._require_mentor_or_admin()
        session = await self._get_session_or_404(session_id)
        self._require_session_owner(session)

        # If dates are being updated, re-validate
        new_start = kwargs.get("start_time", session.start_time)
        new_end = kwargs.get("end_time", session.end_time)
        if new_end <= new_start:
            raise AppError(status_code=400, detail="End time must be after start time", error_code="INVALID_TIME")

        for key, value in kwargs.items():
            if value is not None and hasattr(session, key):
                setattr(session, key, value)

        session.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(session)
        logger.info(f"Session {session_id} updated")
        return session

    # ------------------------------------------------------------------ #
    #  DELETE
    # ------------------------------------------------------------------ #

    async def delete_session(self, session_id: int) -> None:
        self._require_mentor_or_admin()
        session = await self._get_session_or_404(session_id)
        self._require_session_owner(session)

        await self.db.delete(session)
        await self.db.commit()
        logger.info(f"Session {session_id} deleted")

    # ------------------------------------------------------------------ #
    #  QUERIES — mentor
    # ------------------------------------------------------------------ #

    async def list_mentor_sessions(
        self,
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[MentoringSession], int]:
        """Return sessions owned by the current mentor with optional status filter."""
        self._require_mentor_or_admin()
        mentor_id = self.user.get("user_id")

        base = select(MentoringSession).where(MentoringSession.mentor_id == mentor_id)

        now = datetime.now(timezone.utc)
        if status_filter == "upcoming":
            base = base.where(MentoringSession.start_time > now, MentoringSession.status == SessionStatus.scheduled)
        elif status_filter == "ongoing":
            base = base.where(MentoringSession.start_time <= now, MentoringSession.end_time >= now, MentoringSession.status == SessionStatus.scheduled)
        elif status_filter == "completed":
            base = base.where(MentoringSession.end_time < now, MentoringSession.status == SessionStatus.scheduled)
        elif status_filter == "cancelled":
            base = base.where(MentoringSession.status == SessionStatus.cancelled)

        # Total count
        count_stmt = select(func.count()).select_from(base.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Paginated results
        stmt = (
            base
            .options(selectinload(MentoringSession.attendances))
            .order_by(MentoringSession.start_time.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all(), total

    async def get_session_detail(self, session_id: int) -> MentoringSession:
        """Get a single session with its attendance records (mentor view)."""
        session = await self._get_session_or_404(session_id, load_attendances=True)
        # Allow mentor owner or admin
        uid = self.user.get("user_id")
        role = self.user.get("role")
        if isinstance(role, UserRole):
            role = role.value
        if session.mentor_id != uid and role != "admin":
            raise AppError(status_code=403, detail="Access denied", error_code="FORBIDDEN")
        return session

    # ------------------------------------------------------------------ #
    #  QUERIES — student
    # ------------------------------------------------------------------ #

    async def list_student_sessions(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[MentoringSession], int]:
        """
        Return sessions visible to the current student.  A session is visible
        if the student is enrolled in the session's bootcamp or course.
        """
        student_id = self.user.get("user_id")

        # Find bootcamp IDs this student is enrolled in
        enrolled_bootcamp_stmt = select(BootcampEnrollment.bootcamp_id).where(
            BootcampEnrollment.user_id == student_id
        )
        enrolled_bootcamps = (await self.db.execute(enrolled_bootcamp_stmt)).scalars().all()

        if not enrolled_bootcamps:
            return [], 0

        base = select(MentoringSession).where(
            and_(
                MentoringSession.bootcamp_id.in_(enrolled_bootcamps),
                MentoringSession.status == SessionStatus.scheduled,
            )
        )

        count_stmt = select(func.count()).select_from(base.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        stmt = (
            base
            .options(selectinload(MentoringSession.attendances))
            .order_by(MentoringSession.start_time.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all(), total

    # ------------------------------------------------------------------ #
    #  ATTENDANCE
    # ------------------------------------------------------------------ #

    async def mark_attendance(self, attendance_token: str) -> SessionAttendance:
        """
        Mark current user's attendance via the unique attendance token.
        Idempotent — returns existing record if already marked.
        """
        student_id = self.user.get("user_id")

        # Find session by token
        stmt = select(MentoringSession).where(MentoringSession.attendance_token == attendance_token)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise AppError(status_code=404, detail="Invalid attendance link", error_code="SESSION_NOT_FOUND")

        if session.status == SessionStatus.cancelled:
            raise AppError(status_code=400, detail="This session has been cancelled", error_code="SESSION_CANCELLED")

        # Idempotent check
        existing_stmt = select(SessionAttendance).where(
            SessionAttendance.session_id == session.session_id,
            SessionAttendance.student_id == student_id,
        )
        existing = (await self.db.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            return existing

        attendance = SessionAttendance(
            session_id=session.session_id,
            student_id=student_id,
            marked_at=datetime.now(timezone.utc),
        )
        self.db.add(attendance)
        await self.db.commit()
        await self.db.refresh(attendance)
        logger.info(f"Attendance marked: student={student_id} session={session.session_id}")
        return attendance

    async def get_attendance_list(self, session_id: int) -> List[dict]:
        """Return all attendance records for a session, enriched with user info."""
        session = await self._get_session_or_404(session_id)
        self._require_session_owner(session)

        stmt = (
            select(SessionAttendance, User)
            .join(User, User.id == SessionAttendance.student_id)
            .where(SessionAttendance.session_id == session_id)
            .order_by(SessionAttendance.marked_at.asc())
        )
        rows = (await self.db.execute(stmt)).all()

        return [
            {
                "attendance_id": att.attendance_id,
                "session_id": att.session_id,
                "student_id": att.student_id,
                "student_name": user.full_name,
                "student_email": user.email,
                "marked_at": att.marked_at.isoformat() if att.marked_at else None,
            }
            for att, user in rows
        ]

    # ------------------------------------------------------------------ #
    #  HELPERS
    # ------------------------------------------------------------------ #

    async def _get_session_or_404(
        self, session_id: int, load_attendances: bool = False
    ) -> MentoringSession:
        stmt = select(MentoringSession).where(MentoringSession.session_id == session_id)
        if load_attendances:
            stmt = stmt.options(selectinload(MentoringSession.attendances))
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()
        if not session:
            raise AppError(status_code=404, detail="Session not found", error_code="SESSION_NOT_FOUND")
        return session
