#!/usr/bin/env python3
"""Admin routes for user management"""
import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_user_service, get_current_user, require_role, get_db_session
from domains.courses.models.certification import Certificate
from domains.courses.models.course import Course, LearningPath
from domains.courses.models.progress import UserCourseEnrollment
from domains.users.models.user import User
from domains.users.models.onboarding import MentorProfile
from domains.users.services.user_service import UserService, UserRole
from domains.users.schemas.admin_schema import (
    AdminCertificateUploadRequest,
    AdminUserCertificateResponse,
    AdminUserEnrollmentResponse,
    AdminUserLearningResponse,
    UserAdminResponse,
    UserListResponse,
    UserCreateRequest,
    UserUpdateRequest,
    UserStatsResponse,
    MentorProfileResponse,
    MentorProfileUpdate,
)
from auth.password import hash_password


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/users", tags=["Admin - Users"])


def _enum_value(value) -> str:
    """Return a frontend-safe string for SQLAlchemy enum values."""
    if hasattr(value, "value"):
        return value.value
    return str(value) if value is not None else "unknown"


def _serialize_admin_certificate(
    certificate: Certificate,
    course: Optional[Course] = None,
    path: Optional[LearningPath] = None,
) -> AdminUserCertificateResponse:
    """Convert a Certificate row to the admin API response shape."""
    return AdminUserCertificateResponse(
        certificate_id=certificate.certificate_id,
        course_id=certificate.course_id,
        path_id=certificate.path_id,
        course_title=course.title if course else None,
        path_title=path.title if path else None,
        issued_at=certificate.issued_at,
        certificate_url=certificate.certificate_url or "",
        is_public=bool(certificate.is_public),
    )


async def _get_user_learning_response(
    user_id: str,
    session: AsyncSession,
) -> AdminUserLearningResponse:
    """Build the enrolled courses and certificates summary for an admin modal."""
    enrollment_stmt = (
        select(UserCourseEnrollment, Course, LearningPath)
        .join(Course, Course.course_id == UserCourseEnrollment.course_id)
        .outerjoin(LearningPath, LearningPath.path_id == UserCourseEnrollment.path_id)
        .where(UserCourseEnrollment.user_id == user_id)
        .order_by(UserCourseEnrollment.enrolled_at.desc())
    )
    enrollment_result = await session.execute(enrollment_stmt)
    enrollment_rows = enrollment_result.all()

    certificate_stmt = (
        select(Certificate, Course, LearningPath)
        .join(Course, Course.course_id == Certificate.course_id)
        .outerjoin(LearningPath, LearningPath.path_id == Certificate.path_id)
        .where(Certificate.user_id == user_id)
        .order_by(Certificate.issued_at.desc())
    )
    certificate_result = await session.execute(certificate_stmt)
    certificate_rows = certificate_result.all()

    certificates = [
        _serialize_admin_certificate(certificate, course, path)
        for certificate, course, path in certificate_rows
    ]

    certificates_by_exact_key = {
        (certificate.course_id, certificate.path_id): _serialize_admin_certificate(certificate, course, path)
        for certificate, course, path in certificate_rows
    }
    certificates_by_course = {}
    for certificate, course, path in certificate_rows:
        certificates_by_course.setdefault(
            certificate.course_id,
            _serialize_admin_certificate(certificate, course, path),
        )

    enrolled_courses = []
    for enrollment, course, path in enrollment_rows:
        certificate = certificates_by_exact_key.get(
            (enrollment.course_id, enrollment.path_id)
        ) or certificates_by_course.get(enrollment.course_id)
        enrolled_courses.append(
            AdminUserEnrollmentResponse(
                enrollment_id=enrollment.enrollment_id,
                course_id=enrollment.course_id,
                course_title=course.title,
                course_slug=course.slug,
                path_id=enrollment.path_id,
                path_title=path.title if path else None,
                enrollment_status=_enum_value(enrollment.enrollment_status),
                is_active=bool(enrollment.is_active),
                enrolled_at=enrollment.enrolled_at,
                certificate=certificate,
            )
        )

    return AdminUserLearningResponse(
        user_id=user_id,
        enrolled_courses=enrolled_courses,
        certificates=certificates,
    )


@router.get("", response_model=UserListResponse)
async def list_users(
    search: Optional[str] = Query(None, description="Search by name or email"),
    role: Optional[str] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_verified: Optional[bool] = Query(None, description="Filter by verified status"),
    limit: int = Query(50, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    List all users with filtering and pagination.
    Requires ADMIN role.
    """
    # Check admin role
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Build base query
    stmt = select(User)
    count_stmt = select(func.count(User.id))
    
    # Apply filters
    if search:
        search_term = f"%{search.lower()}%"
        search_filter = or_(
            func.lower(User.email).like(search_term),
            func.lower(User.full_name).like(search_term)
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)
    
    if role:
        stmt = stmt.where(User.role == role)
        count_stmt = count_stmt.where(User.role == role)
    
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
        count_stmt = count_stmt.where(User.is_active == is_active)
    
    if is_verified is not None:
        stmt = stmt.where(User.is_verified == is_verified)
        count_stmt = count_stmt.where(User.is_verified == is_verified)
    
    # Get total count
    count_result = await session.execute(count_stmt)
    total = count_result.scalar() or 0
    
    # Apply pagination and ordering
    stmt = stmt.order_by(User.created_at.desc()).offset(offset).limit(limit)
    
    result = await session.execute(stmt)
    users = result.scalars().all()
    
    return UserListResponse(
        users=[
            UserAdminResponse(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                avatar_url=user.avatar_url,
                bio=user.bio,
                role=user.role.value if hasattr(user.role, 'value') else user.role,
                is_active=user.is_active,
                is_verified=user.is_verified,
                last_login=user.last_login,
                created_at=user.created_at,
                updated_at=user.updated_at,
            )
            for user in users
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Get user statistics.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Get total users
    total_result = await session.execute(select(func.count(User.id)))
    total_users = total_result.scalar() or 0
    
    # Get active users
    active_result = await session.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    active_users = active_result.scalar() or 0
    
    # Get verified users
    verified_result = await session.execute(
        select(func.count(User.id)).where(User.is_verified == True)
    )
    verified_users = verified_result.scalar() or 0
    
    # Get users by role
    students_result = await session.execute(
        select(func.count(User.id)).where(User.role == UserRole.STUDENT.value)
    )
    students = students_result.scalar() or 0
    
    mentors_result = await session.execute(
        select(func.count(User.id)).where(User.role == UserRole.MENTOR.value)
    )
    mentors = mentors_result.scalar() or 0
    
    admins_result = await session.execute(
        select(func.count(User.id)).where(User.role == UserRole.ADMIN.value)
    )
    admins = admins_result.scalar() or 0
    
    return UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        verified_users=verified_users,
        students=students,
        mentors=mentors,
        admins=admins,
    )


@router.get("/mentors", response_model=UserListResponse)
async def list_mentors(
    search: Optional[str] = Query(None, description="Search by name or email"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    limit: int = Query(50, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    List all mentors with filtering and pagination.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Build base query - only mentors
    stmt = select(User).where(User.role == UserRole.MENTOR)
    count_stmt = select(func.count(User.id)).where(User.role == UserRole.MENTOR)
    
    # Apply filters
    if search:
        search_term = f"%{search.lower()}%"
        search_filter = or_(
            func.lower(User.email).like(search_term),
            func.lower(User.full_name).like(search_term)
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)
    
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
        count_stmt = count_stmt.where(User.is_active == is_active)
    
    # Get total count
    count_result = await session.execute(count_stmt)
    total = count_result.scalar() or 0
    
    # Apply pagination and ordering
    stmt = stmt.order_by(User.created_at.desc()).offset(offset).limit(limit)
    
    result = await session.execute(stmt)
    users = result.scalars().all()
    
    return UserListResponse(
        users=[
            UserAdminResponse(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                avatar_url=user.avatar_url,
                bio=user.bio,
                role=user.role.value if hasattr(user.role, 'value') else user.role,
                is_active=user.is_active,
                is_verified=user.is_verified,
                last_login=user.last_login,
                created_at=user.created_at,
                updated_at=user.updated_at,
            )
            for user in users
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.delete("/mentors/{user_id}/demote", response_model=UserAdminResponse)
async def demote_mentor(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Demote a mentor back to student role.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.role != UserRole.MENTOR and user.role != UserRole.MENTOR.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a mentor"
        )
    
    user.role = UserRole.STUDENT
    user.updated_at = datetime.now(timezone.utc)
    
    await session.commit()
    await session.refresh(user)
    
    logger.info(f"Admin demoted mentor to student: {user.email}")
    
    return UserAdminResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/mentors/{user_id}/profile", response_model=MentorProfileResponse)
async def get_mentor_profile(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Get mentor profile for a specific user.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Check if user exists and is a mentor
    user_stmt = select(User).where(User.id == user_id)
    user_result = await session.execute(user_stmt)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.role != UserRole.MENTOR and user.role != UserRole.MENTOR.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a mentor"
        )
    
    # Get mentor profile
    stmt = select(MentorProfile).where(MentorProfile.user_id == user_id)
    result = await session.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        # Create empty profile if it doesn't exist
        profile = MentorProfile(user_id=user_id)
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
    
    return MentorProfileResponse(
        user_id=str(profile.user_id),
        title=profile.title,
        company=profile.company,
        expertise=profile.expertise or [],
        languages=profile.languages or [],
        hourly_rate=float(profile.hourly_rate) if profile.hourly_rate else None,
        availability=profile.availability or "available",
        timezone=profile.timezone or "UTC",
        years_experience=profile.years_experience,
        linkedin_url=profile.linkedin_url,
        github_url=profile.github_url,
        website_url=profile.website_url,
        total_sessions=profile.total_sessions or 0,
        total_students=profile.total_students or 0,
        rating=float(profile.rating) if profile.rating else 0.0,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.put("/mentors/{user_id}/profile", response_model=MentorProfileResponse)
async def update_mentor_profile(
    user_id: str,
    update_data: MentorProfileUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Update mentor profile for a specific user.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Check if user exists and is a mentor
    user_stmt = select(User).where(User.id == user_id)
    user_result = await session.execute(user_stmt)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.role != UserRole.MENTOR and user.role != UserRole.MENTOR.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a mentor"
        )
    
    # Get or create mentor profile
    stmt = select(MentorProfile).where(MentorProfile.user_id == user_id)
    result = await session.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        profile = MentorProfile(user_id=user_id)
        session.add(profile)
    
    # Update profile fields
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Handle bio separately - it updates User.bio
    if "bio" in update_dict:
        user.bio = update_dict.pop("bio")
        user.updated_at = datetime.now(timezone.utc)
    
    for field, value in update_dict.items():
        if hasattr(profile, field):
            setattr(profile, field, value)
    
    profile.updated_at = datetime.now(timezone.utc)
    
    await session.commit()
    await session.refresh(profile)
    
    logger.info(f"Admin updated mentor profile for: {user.email}")
    
    return MentorProfileResponse(
        user_id=str(profile.user_id),
        title=profile.title,
        company=profile.company,
        expertise=profile.expertise or [],
        languages=profile.languages or [],
        hourly_rate=float(profile.hourly_rate) if profile.hourly_rate else None,
        availability=profile.availability or "available",
        timezone=profile.timezone or "UTC",
        years_experience=profile.years_experience,
        linkedin_url=profile.linkedin_url,
        github_url=profile.github_url,
        website_url=profile.website_url,
        total_sessions=profile.total_sessions or 0,
        total_students=profile.total_students or 0,
        rating=float(profile.rating) if profile.rating else 0.0,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("/{user_id}", response_model=UserAdminResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Get a specific user by ID.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserAdminResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/{user_id}/learning", response_model=AdminUserLearningResponse)
async def get_user_learning(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Get a student's enrolled courses and certificates for the admin user detail modal.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    user_result = await session.execute(select(User).where(User.id == user_id))
    if not user_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return await _get_user_learning_response(user_id, session)


@router.post("/{user_id}/certificates", response_model=AdminUserCertificateResponse)
async def upload_user_certificate(
    user_id: str,
    request: AdminCertificateUploadRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Assign or update a certificate URL for one of the student's enrolled courses.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    user_result = await session.execute(select(User).where(User.id == user_id))
    if not user_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    enrollment_stmt = (
        select(UserCourseEnrollment, Course, LearningPath)
        .join(Course, Course.course_id == UserCourseEnrollment.course_id)
        .outerjoin(LearningPath, LearningPath.path_id == UserCourseEnrollment.path_id)
        .where(
            UserCourseEnrollment.user_id == user_id,
            UserCourseEnrollment.course_id == request.course_id,
        )
    )
    if request.path_id is not None:
        enrollment_stmt = enrollment_stmt.where(UserCourseEnrollment.path_id == request.path_id)

    enrollment_result = await session.execute(enrollment_stmt)
    enrollment_row = enrollment_result.first()
    if not enrollment_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not enrolled in this course"
        )

    enrollment, course, path = enrollment_row
    resolved_path_id = request.path_id if request.path_id is not None else enrollment.path_id
    resolved_path = path

    if resolved_path_id is None:
        default_path_result = await session.execute(
            select(LearningPath)
            .where(
                LearningPath.course_id == request.course_id,
                LearningPath.is_default == True,
            )
            .limit(1)
        )
        resolved_path = default_path_result.scalar_one_or_none()
        resolved_path_id = resolved_path.path_id if resolved_path else None

    certificate_stmt = select(Certificate).where(
        Certificate.user_id == user_id,
        Certificate.course_id == request.course_id,
    )
    if resolved_path_id is None:
        certificate_stmt = certificate_stmt.where(Certificate.path_id.is_(None))
    else:
        certificate_stmt = certificate_stmt.where(Certificate.path_id == resolved_path_id)

    certificate_result = await session.execute(certificate_stmt)
    certificate = certificate_result.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if certificate:
        certificate.certificate_url = request.certificate_url.strip()
        certificate.is_public = request.is_public
        certificate.issued_at = now
    else:
        certificate = Certificate(
            user_id=user_id,
            course_id=request.course_id,
            path_id=resolved_path_id,
            certificate_url=request.certificate_url.strip(),
            is_public=request.is_public,
            issued_at=now,
        )
        session.add(certificate)

    await session.commit()
    await session.refresh(certificate)

    logger.info(
        "Admin %s assigned certificate %s to user %s for course %s",
        current_user.get("user_id"),
        certificate.certificate_id,
        user_id,
        request.course_id,
    )

    return _serialize_admin_certificate(certificate, course, resolved_path)


@router.post("", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreateRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Create a new user.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Check for existing user with email
    stmt = select(User).where(User.email == request.email)
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        email=request.email,
        password=hash_password(request.password),
        full_name=request.full_name,
        role=request.role,
        is_active=request.is_active,
        is_verified=request.is_verified,
        bio=request.bio,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        last_password_change=datetime.now(timezone.utc),
    )
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    logger.info(f"Admin created user: {request.email}")
    
    return UserAdminResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.put("/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: str,
    request: UserUpdateRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Update a user.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check for email conflict
    if request.email and request.email != user.email:
        email_stmt = select(User).where(User.email == request.email)
        email_result = await session.execute(email_stmt)
        if email_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        user.email = request.email
    
    # Update fields
    if request.full_name is not None:
        user.full_name = request.full_name
    if request.role is not None:
        user.role = request.role
    if request.is_active is not None:
        user.is_active = request.is_active
    if request.is_verified is not None:
        user.is_verified = request.is_verified
    if request.bio is not None:
        user.bio = request.bio
    
    user.updated_at = datetime.now(timezone.utc)
    
    await session.commit()
    await session.refresh(user)
    
    logger.info(f"Admin updated user: {user.email}")
    
    return UserAdminResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Delete a user.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Prevent self-deletion
    if current_user.get("user_id") == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await session.delete(user)
    await session.commit()
    
    logger.info(f"Admin deleted user: {user.email}")


@router.post("/{user_id}/reset-password", response_model=dict)
async def reset_user_password(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Reset a user's password and send them a reset email.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # In a real implementation, send password reset email
    # For now, just return success
    logger.info(f"Admin initiated password reset for user: {user.email}")
    
    return {"message": "Password reset email sent", "email": user.email}


@router.post("/{user_id}/toggle-status", response_model=UserAdminResponse)
async def toggle_user_status(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Toggle a user's active status.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Prevent self-deactivation
    if current_user.get("user_id") == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own status"
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = not user.is_active
    user.updated_at = datetime.now(timezone.utc)
    
    await session.commit()
    await session.refresh(user)
    
    logger.info(f"Admin toggled user status: {user.email} -> is_active={user.is_active}")
    
    return UserAdminResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/lookup/email/{email}", response_model=UserAdminResponse)
async def lookup_user_by_email(
    email: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Look up a user by email address.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with this email"
        )
    
    return UserAdminResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post("/{user_id}/promote-to-mentor", response_model=UserAdminResponse)
async def promote_to_mentor(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Promote a user to mentor role.
    Requires ADMIN role.
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.role == UserRole.MENTOR.value or user.role == UserRole.MENTOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a mentor"
        )
    
    user.role = UserRole.MENTOR
    user.updated_at = datetime.now(timezone.utc)
    
    await session.commit()
    await session.refresh(user)
    
    logger.info(f"Admin promoted user to mentor: {user.email}")
    
    return UserAdminResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
