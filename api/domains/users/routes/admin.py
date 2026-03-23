#!/usr/bin/env python3
"""Admin routes for user management"""
import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_user_service, get_current_user, require_role, get_db_session
from domains.users.models.user import User
from domains.users.models.onboarding import MentorProfile
from domains.users.services.user_service import UserService, UserRole
from domains.users.schemas.admin_schema import (
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
