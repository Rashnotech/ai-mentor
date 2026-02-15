#!/usr/bin/python3
"""
API routes for mentoring sessions.
Prefix: /sessions
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user, get_db_session
from domains.sessions.service import SessionService
from domains.sessions.models import SessionPlatform, SessionStatus
from domains.sessions.schemas import (
    SessionCreateRequest,
    SessionUpdateRequest,
    SessionResponse,
    SessionListResponse,
    AttendanceResponse,
    AttendanceMarkResponse,
)
from domains.users.models.user import User, UserRole
from core.config import settings
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ---------- helpers ----------

def _parse_dt(s: str) -> datetime:
    """Parse ISO-8601 datetime string."""
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s)


def _serialize_session(session, include_attendances: bool = False) -> dict:
    """Convert ORM session to a response dict."""
    base_url = settings.FRONTEND_URL
    data = {
        "session_id": session.session_id,
        "mentor_id": session.mentor_id,
        "bootcamp_id": session.bootcamp_id,
        "course_id": session.course_id,
        "title": session.title,
        "description": session.description,
        "platform": session.platform.value if hasattr(session.platform, "value") else str(session.platform),
        "session_link": session.session_link,
        "scheduled_date": session.scheduled_date.isoformat() if session.scheduled_date else None,
        "start_time": session.start_time.isoformat() if session.start_time else None,
        "end_time": session.end_time.isoformat() if session.end_time else None,
        "timezone": session.timezone,
        "attendance_token": session.attendance_token,
        "attendance_link": f"{base_url}/dashboard/sessions/attend?token={session.attendance_token}",
        "status": session.status.value if hasattr(session.status, "value") else str(session.status),
        "computed_status": session.computed_status,
        "attendee_count": session.attendee_count,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
    }
    if include_attendances and session.attendances:
        data["attendances"] = [
            {
                "attendance_id": a.attendance_id,
                "session_id": a.session_id,
                "student_id": a.student_id,
                "marked_at": a.marked_at.isoformat() if a.marked_at else None,
            }
            for a in session.attendances
        ]
    return data


# =============================================================================
# MENTOR / ADMIN ENDPOINTS
# =============================================================================

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(
    request: SessionCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new mentoring session (mentor/admin)."""
    try:
        svc = SessionService(db, current_user)
        session = await svc.create_session(
            title=request.title,
            description=request.description,
            platform=SessionPlatform(request.platform.value),
            session_link=request.session_link,
            scheduled_date=_parse_dt(request.scheduled_date),
            start_time=_parse_dt(request.start_time),
            end_time=_parse_dt(request.end_time),
            timezone_str=request.timezone,
            bootcamp_id=request.bootcamp_id,
            course_id=request.course_id,
        )
        return _serialize_session(session)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"create_session error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")


@router.put("/{session_id}")
async def update_session(
    session_id: int,
    request: SessionUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Update a session (owner or admin)."""
    try:
        svc = SessionService(db, current_user)
        kwargs = {}
        if request.title is not None:
            kwargs["title"] = request.title
        if request.description is not None:
            kwargs["description"] = request.description
        if request.platform is not None:
            kwargs["platform"] = SessionPlatform(request.platform.value)
        if request.session_link is not None:
            kwargs["session_link"] = request.session_link
        if request.scheduled_date is not None:
            kwargs["scheduled_date"] = _parse_dt(request.scheduled_date)
        if request.start_time is not None:
            kwargs["start_time"] = _parse_dt(request.start_time)
        if request.end_time is not None:
            kwargs["end_time"] = _parse_dt(request.end_time)
        if request.timezone is not None:
            kwargs["timezone"] = request.timezone
        if request.bootcamp_id is not None:
            kwargs["bootcamp_id"] = request.bootcamp_id
        if request.course_id is not None:
            kwargs["course_id"] = request.course_id
        if request.status is not None:
            kwargs["status"] = SessionStatus(request.status.value)

        session = await svc.update_session(session_id, **kwargs)
        return _serialize_session(session)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"update_session error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update session")


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a session (owner or admin)."""
    try:
        svc = SessionService(db, current_user)
        await svc.delete_session(session_id)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"delete_session error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")


@router.get("/mentor")
async def list_mentor_sessions(
    status_filter: Optional[str] = Query(None, alias="status", description="upcoming|ongoing|completed|cancelled"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List current mentor's sessions with optional status filter."""
    try:
        svc = SessionService(db, current_user)
        sessions, total = await svc.list_mentor_sessions(status_filter, page, page_size)
        return {
            "sessions": [_serialize_session(s) for s in sessions],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"list_mentor_sessions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sessions")


@router.get("/mentor/{session_id}")
async def get_session_detail(
    session_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get full session detail with attendance (mentor/admin)."""
    try:
        svc = SessionService(db, current_user)
        session = await svc.get_session_detail(session_id)
        data = _serialize_session(session, include_attendances=True)

        # Enrich attendance with student info
        enriched_attendances = await svc.get_attendance_list(session_id)
        data["attendances"] = enriched_attendances
        return data
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"get_session_detail error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch session")


# =============================================================================
# STUDENT ENDPOINTS
# =============================================================================

@router.get("/student")
async def list_student_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List sessions visible to the current student (via bootcamp enrollment)."""
    try:
        svc = SessionService(db, current_user)
        sessions, total = await svc.list_student_sessions(page, page_size)
        return {
            "sessions": [_serialize_session(s) for s in sessions],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"list_student_sessions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sessions")


@router.post("/attend/{attendance_token}")
async def mark_attendance(
    attendance_token: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Mark attendance for the authenticated student using the unique token.
    Idempotent — re-calling returns the existing record.
    """
    try:
        svc = SessionService(db, current_user)
        att = await svc.mark_attendance(attendance_token)
        return {
            "message": "Attendance marked successfully",
            "attendance_id": att.attendance_id,
            "session_id": att.session_id,
            "student_id": att.student_id,
            "marked_at": att.marked_at.isoformat() if att.marked_at else None,
        }
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"mark_attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark attendance")


@router.get("/attend/{attendance_token}/info")
async def get_session_by_token(
    attendance_token: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get session info by attendance token (for the student attend page)."""
    try:
        from sqlalchemy import select as _select
        from domains.sessions.models import MentoringSession as _MS
        stmt = _select(_MS).where(_MS.attendance_token == attendance_token)
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return _serialize_session(session)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_session_by_token error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch session info")
