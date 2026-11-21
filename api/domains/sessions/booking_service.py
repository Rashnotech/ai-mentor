#!/usr/bin/python3
"""Service for listing available mentors and managing 1-on-1 student bookings."""
from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppError
from domains.sessions.models import MentorBooking, SessionPlatform
from domains.users.models.user import User, UserRole

logger = logging.getLogger(__name__)


async def list_available_mentors(db: AsyncSession) -> List[Dict[str, Any]]:
    """Return active mentors enriched with mentor_profiles metadata when available."""
    users_stmt = (
        select(User)
        .where(User.role == UserRole.MENTOR, User.is_active == True)
        .order_by(User.full_name.asc())
    )
    mentors = (await db.execute(users_stmt)).scalars().all()
    if not mentors:
        return []

    mentor_ids = [m.id for m in mentors]
    profiles_by_id: Dict[str, Dict[str, Any]] = {}
    try:
        prof_result = await db.execute(
            text(
                "SELECT user_id, title, company, expertise, languages, availability, "
                "timezone, years_experience, total_sessions, rating "
                "FROM mentor_profiles WHERE user_id = ANY(:ids)"
            ),
            {"ids": mentor_ids},
        )
        for row in prof_result.mappings().all():
            profiles_by_id[str(row["user_id"])] = dict(row)
    except Exception as exc:
        logger.warning(f"Could not read mentor_profiles (falling back to user fields): {exc}")

    items: List[Dict[str, Any]] = []
    for m in mentors:
        prof = profiles_by_id.get(m.id, {})
        availability = str(prof.get("availability") or "available").lower()
        if availability == "unavailable":
            continue
        expertise = prof.get("expertise") if isinstance(prof.get("expertise"), list) else []
        languages = prof.get("languages") if isinstance(prof.get("languages"), list) else []
        items.append(
            {
                "mentor_id": m.id,
                "full_name": m.full_name,
                "avatar_url": m.avatar_url,
                "bio": m.bio,
                "title": prof.get("title") or "Technical Mentor",
                "company": prof.get("company"),
                "expertise": expertise,
                "languages": languages,
                "availability": availability,
                "timezone": prof.get("timezone") or "UTC",
                "years_experience": prof.get("years_experience"),
                "total_sessions": int(prof.get("total_sessions") or 0),
                "rating": float(prof.get("rating") or 0.0),
            }
        )
    return items


async def create_mentor_booking(
    db: AsyncSession,
    student_id: str,
    mentor_id: str,
    topic: str,
    scheduled_start: datetime,
    duration_minutes: int = 30,
    platform: SessionPlatform = SessionPlatform.GOOGLE_MEET,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a 1-on-1 booking with an available mentor after validating slot conflicts."""
    if student_id == mentor_id:
        raise AppError(status_code=400, detail="You cannot book a session with yourself", error_code="SELF_BOOKING")

    mentor = (
        await db.execute(
            select(User).where(
                User.id == mentor_id,
                User.role == UserRole.MENTOR,
                User.is_active == True,
            )
        )
    ).scalar_one_or_none()
    if not mentor:
        raise AppError(status_code=404, detail="Mentor not found or unavailable", error_code="MENTOR_NOT_FOUND")

    start_utc = scheduled_start if scheduled_start.tzinfo else scheduled_start.replace(tzinfo=timezone.utc)
    start_utc = start_utc.astimezone(timezone.utc)
    now_utc = datetime.now(timezone.utc)
    if start_utc <= now_utc:
        raise AppError(status_code=400, detail="Please choose a future date and time", error_code="PAST_BOOKING_TIME")

    duration = int(duration_minutes)
    if duration not in (15, 30, 45, 60):
        raise AppError(status_code=400, detail="Duration must be 15, 30, 45, or 60 minutes", error_code="INVALID_DURATION")

    end_utc = start_utc + timedelta(minutes=duration)

    conflict_stmt = select(MentorBooking).where(
        and_(
            MentorBooking.mentor_id == mentor_id,
            MentorBooking.status != "cancelled",
            MentorBooking.scheduled_start < end_utc,
            MentorBooking.scheduled_end > start_utc,
        )
    )
    existing_conflict = (await db.execute(conflict_stmt)).scalar_one_or_none()
    if existing_conflict:
        raise AppError(
            status_code=409,
            detail="This mentor already has a session booked during that time slot. Please pick another time.",
            error_code="SLOT_CONFLICT",
        )

    booking = MentorBooking(
        student_id=student_id,
        mentor_id=mentor_id,
        topic=topic.strip(),
        notes=notes.strip() if notes else None,
        scheduled_start=start_utc,
        scheduled_end=end_utc,
        duration_minutes=duration,
        platform=platform,
        status="confirmed",
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    return _serialize_booking(booking, mentor_name=mentor.full_name, mentor_avatar=mentor.avatar_url)


async def list_student_bookings(db: AsyncSession, student_id: str) -> List[Dict[str, Any]]:
    """List all 1-on-1 mentor bookings for a student, newest upcoming first."""
    stmt = (
        select(MentorBooking, User.full_name, User.avatar_url)
        .join(User, User.id == MentorBooking.mentor_id)
        .where(MentorBooking.student_id == student_id)
        .order_by(MentorBooking.scheduled_start.desc())
    )
    rows = (await db.execute(stmt)).all()
    return [
        _serialize_booking(booking, mentor_name=full_name, mentor_avatar=avatar_url)
        for booking, full_name, avatar_url in rows
    ]


async def cancel_student_booking(db: AsyncSession, student_id: str, booking_id: int) -> Dict[str, Any]:
    """Cancel a student's own mentor booking."""
    stmt = select(MentorBooking).where(
        MentorBooking.booking_id == booking_id,
        MentorBooking.student_id == student_id,
    )
    booking = (await db.execute(stmt)).scalar_one_or_none()
    if not booking:
        raise AppError(status_code=404, detail="Booking not found", error_code="BOOKING_NOT_FOUND")
    if booking.status == "cancelled":
        return _serialize_booking(booking)

    booking.status = "cancelled"
    booking.updated_at = datetime.now(timezone.utc)
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return _serialize_booking(booking)


def _serialize_booking(
    booking: MentorBooking,
    mentor_name: Optional[str] = None,
    mentor_avatar: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "booking_id": booking.booking_id,
        "student_id": booking.student_id,
        "mentor_id": booking.mentor_id,
        "mentor_name": mentor_name,
        "mentor_avatar_url": mentor_avatar,
        "topic": booking.topic,
        "notes": booking.notes,
        "scheduled_start": booking.scheduled_start.isoformat() if booking.scheduled_start else None,
        "scheduled_end": booking.scheduled_end.isoformat() if booking.scheduled_end else None,
        "duration_minutes": booking.duration_minutes,
        "platform": booking.platform.value if hasattr(booking.platform, "value") else str(booking.platform),
        "meeting_link": booking.meeting_link,
        "status": booking.status,
        "created_at": booking.created_at.isoformat() if booking.created_at else None,
    }
