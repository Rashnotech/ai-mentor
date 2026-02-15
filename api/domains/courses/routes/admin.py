#!/usr/bin/python3
"""
Admin/Mentor course management routes.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from auth.dependencies import get_current_user, get_db_session
from domains.courses.services.course_service import CourseService
from domains.courses.models.course import Course, LearningPath, Module, Lesson, Project
from domains.courses.models.assessment import AssessmentQuestion
from domains.courses.schemas.course_schema import (
    CourseCreateRequest,
    CourseResponse,
    CourseUpdateRequest,
    CourseListResponse,
    LearningPathCreateRequest,
    LearningPathUpdateRequest,
    LearningPathResponse,
    ModuleCreateRequest,
    ModuleUpdateRequest,
    ModuleResponse,
    LessonCreateRequest,
    LessonUpdateRequest,
    LessonResponse,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectResponse,
    AssessmentQuestionCreateRequest,
    AssessmentQuestionUpdateRequest,
    AssessmentQuestionResponse,
)
from domains.users.models.user import User, UserRole
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post(
    "",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new course",
    description="Create a new course (admin/mentor only)",
)
async def create_course(
    request: CourseCreateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Create a new course.

    **Required:**
    - Admin or Mentor role
    - Unique slug

    **Request Body:**
    - title: Course title (3-255 chars)
    - description: Detailed description (10+ chars)
    - slug: URL-friendly ID (3-100 chars, must be unique)
    - estimated_hours: Expected completion time
    - difficulty_level: BEGINNER, INTERMEDIATE, or ADVANCED
    - cover_image_url: Optional image

    **Returns:**
    - Created course details
    """
    try:
        service = CourseService(db_session, current_user)
        course = await service.create_course(
            title=request.title,
            description=request.description,
            slug=request.slug,
            estimated_hours=request.estimated_hours,
            difficulty_level=request.difficulty_level,
            cover_image_url=request.cover_image_url,
            prerequisites=request.prerequisites,
            what_youll_learn=request.what_youll_learn,
            certificate_on_completion=request.certificate_on_completion or False,
        )

        return CourseResponse(
            course_id=course.course_id,
            title=course.title,
            slug=course.slug,
            description=course.description,
            estimated_hours=course.estimated_hours,
            difficulty_level=course.difficulty_level,
            is_active=course.is_active,
            prerequisites=course.prerequisites or [],
            what_youll_learn=course.what_youll_learn or [],
            certificate_on_completion=course.certificate_on_completion or False,
            average_rating=course.average_rating or 0,
            total_reviews=course.total_reviews or 0,
            created_by=course.created_by,
            created_at=course.created_at.isoformat(),
            updated_at=course.updated_at.isoformat(),
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating course: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating course",
        )


@router.get(
    "",
    response_model=List[CourseListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all courses",
    description="Get all courses with optional filtering (admin/mentor only)",
)
async def list_courses(
    status_filter: Optional[str] = Query(None, description="Filter by status: published, draft"),
    search: Optional[str] = Query(None, description="Search in title or description"),
    created_by: Optional[str] = Query(None, description="Filter by creator user ID (for mentors to see only their courses)"),
    limit: int = Query(50, ge=1, le=100, description="Max results"),
    offset: int = Query(0, ge=0, description="Skip results"),
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    List all courses with optional filtering.

    **Query Parameters:**
    - status_filter: Filter by 'published' or 'draft'
    - search: Search term for title/description
    - created_by: Filter by creator user ID
    - limit: Maximum results (1-100)
    - offset: Pagination offset

    **Returns:**
    - List of courses with module counts and stats
    """
    try:
        # Check admin/mentor access
        if current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can list courses",
            )
        
        # Build query
        stmt = select(Course)
        
        # Filter by creator if specified
        if created_by:
            stmt = stmt.where(Course.created_by == created_by)
        
        if status_filter:
            if status_filter == "published":
                stmt = stmt.where(Course.is_active == True)
            elif status_filter == "draft":
                stmt = stmt.where(Course.is_active == False)
        
        if search:
            search_term = f"%{search}%"
            stmt = stmt.where(
                (Course.title.ilike(search_term)) | 
                (Course.description.ilike(search_term))
            )
        
        stmt = stmt.order_by(Course.created_at.desc()).offset(offset).limit(limit)
        
        result = await db_session.execute(stmt)
        courses = result.scalars().all()

        
        # Get module counts for each course
        course_responses = []
        for course in courses:
            # Get paths count
            paths_stmt = select(LearningPath).where(LearningPath.course_id == course.course_id)
            paths_result = await db_session.execute(paths_stmt)
            paths = paths_result.scalars().all()
            
            # Get total modules across all paths
            total_modules = 0
            for path in paths:
                modules_stmt = select(Module).where(Module.path_id == path.path_id)
                modules_result = await db_session.execute(modules_stmt)
                total_modules += len(modules_result.scalars().all())
            
            course_responses.append(CourseListResponse(
                course_id=course.course_id,
                title=course.title,
                slug=course.slug,
                description=course.description,
                estimated_hours=course.estimated_hours,
                difficulty_level=course.difficulty_level,
                is_active=course.is_active,
                prerequisites=course.prerequisites or [],
                what_youll_learn=course.what_youll_learn or [],
                certificate_on_completion=course.certificate_on_completion or False,
                average_rating=course.average_rating or 0,
                total_reviews=course.total_reviews or 0,
                paths_count=len(paths),
                modules_count=total_modules,
                created_by=course.created_by,
                created_at=course.created_at.isoformat(),
                updated_at=course.updated_at.isoformat(),
            ))
        
        return course_responses
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing courses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing courses",
        )


# ===== MENTOR STUDENTS MANAGEMENT =====
# NOTE: This must be defined BEFORE /{course_id} to avoid route matching issues

@router.get(
    "/my-students",
    summary="Get students enrolled in mentor's courses",
    description="Get all students enrolled in courses created by a specific mentor",
)
async def get_mentor_students(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
    search: Optional[str] = Query(None, description="Search by name or email"),
    course_id: Optional[int] = Query(None, description="Filter by specific course"),
    mentor_id: Optional[str] = Query(None, description="Filter by mentor who created the courses"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Get all students enrolled in courses created by a specific mentor.
    
    This endpoint:
    1. Gets all courses where created_by matches the mentor_id
    2. Gets all students enrolled in those courses (via UserProfile.selected_course_id or UserCourseEnrollment)
    3. Returns student info with enrollment details

    **Query Parameters:**
    - search: Optional search filter for name/email
    - course_id: Optional filter for specific course
    - mentor_id: Optional mentor ID to filter courses by creator (defaults to current user)
    - limit: Max results (default 100)
    - offset: Pagination offset

    **Returns:**
    - List of students with their enrollment info
    """
    try:
        # Only mentors and admins can access
        if current_user.get('role') not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors and admins can access student data",
            )

        from domains.users.models.onboarding import UserProfile
        from domains.users.models.user import User as UserModel
        from domains.courses.models.progress import UserCourseEnrollment
        from sqlalchemy import or_, func
        from sqlalchemy.orm import joinedload

        # Use provided mentor_id or fall back to current user's ID
        # Mentors can only see their own students, admins can see any mentor's students
        current_user_id = str(current_user.get('user_id'))
        target_mentor_id = str(mentor_id) if mentor_id else current_user_id

        # Security check: Mentors can only query their own students
        # For mentors querying their own students, just proceed (even if no students exist)
        if current_user.get('role') == UserRole.MENTOR and target_mentor_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Mentors can only view students enrolled in their own courses",
            )
        
        # Get all courses created by the target mentor (filter by created_by = mentor_id)
        courses_stmt = select(Course).where(Course.created_by == target_mentor_id)
        courses_result = await db_session.execute(courses_stmt)
        mentor_courses = courses_result.scalars().all()
        
        if not mentor_courses:
            return {
                "students": [],
                "total": 0,
                "courses": []
            }
        
        course_ids = [c.course_id for c in mentor_courses]
        course_slugs = [c.slug for c in mentor_courses]
        
        # Filter by specific course if provided
        if course_id and course_id in course_ids:
            course_ids = [course_id]
            course_slugs = [c.slug for c in mentor_courses if c.course_id == course_id]
        
        # Build student query - get students enrolled via UserProfile
        # Students can be enrolled via:
        # 1. UserProfile.selected_course_id (course ID as string or slug)
        # 2. UserCourseEnrollment table
        
        students_data = []
        seen_user_ids = set()
        
        # Method 1: Get students from UserProfile.selected_course_id
        for course in mentor_courses:
            if course_id and course.course_id != course_id:
                continue
                
            # Match by course_id or slug
            profile_stmt = select(UserProfile, UserModel).join(
                UserModel, UserProfile.user_id == UserModel.id
            ).where(
                or_(
                    UserProfile.selected_course_id == str(course.course_id),
                    UserProfile.selected_course_id == course.slug
                )
            )
            
            if search:
                profile_stmt = profile_stmt.where(
                    or_(
                        UserModel.full_name.ilike(f"%{search}%"),
                        UserModel.email.ilike(f"%{search}%")
                    )
                )
            
            profile_result = await db_session.execute(profile_stmt)
            for profile, user in profile_result.fetchall():
                if user.id not in seen_user_ids:
                    seen_user_ids.add(user.id)
                    students_data.append({
                        "id": user.id,
                        "name": user.full_name,
                        "email": user.email,
                        "avatar_url": user.avatar_url,
                        "course_id": course.course_id,
                        "course_title": course.title,
                        "enrolled_at": profile.created_at.isoformat() if profile.created_at else None,
                        "skill_level": profile.skill_level.value if profile.skill_level else None,
                        "learning_mode": profile.learning_mode.value if profile.learning_mode else None,
                        "last_active_at": profile.last_active_at.isoformat() if profile.last_active_at else None,
                        "path_id": profile.current_path_id,
                    })
        
        # Method 2: Get students from UserCourseEnrollment table
        enrollment_stmt = select(UserCourseEnrollment, UserModel).join(
            UserModel, UserCourseEnrollment.user_id == UserModel.id
        ).where(
            UserCourseEnrollment.course_id.in_(course_ids),
            UserCourseEnrollment.is_active == True
        )
        
        if search:
            enrollment_stmt = enrollment_stmt.where(
                or_(
                    UserModel.full_name.ilike(f"%{search}%"),
                    UserModel.email.ilike(f"%{search}%")
                )
            )
        
        try:
            enrollment_result = await db_session.execute(enrollment_stmt)
            for enrollment, user in enrollment_result.fetchall():
                if user.id not in seen_user_ids:
                    seen_user_ids.add(user.id)
                    # Find the course
                    course = next((c for c in mentor_courses if c.course_id == enrollment.course_id), None)
                    students_data.append({
                        "id": user.id,
                        "name": user.full_name,
                        "email": user.email,
                        "avatar_url": user.avatar_url,
                        "course_id": enrollment.course_id,
                        "course_title": course.title if course else "Unknown",
                        "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
                        "skill_level": None,
                        "learning_mode": None,
                        "last_active_at": None,
                        "path_id": enrollment.path_id,
                    })
        except Exception as e:
            # UserCourseEnrollment table might not exist yet
            logger.debug(f"UserCourseEnrollment query failed (table may not exist): {str(e)}")
        
        # Sort by enrolled_at descending (most recent first)
        students_data.sort(key=lambda x: x.get('enrolled_at') or '', reverse=True)
        
        # Apply pagination
        total = len(students_data)
        students_data = students_data[offset:offset + limit]
        
        # Build courses summary
        courses_summary = [
            {
                "course_id": c.course_id,
                "title": c.title,
                "slug": c.slug,
            }
            for c in mentor_courses
        ]
        
        return {
            "students": students_data,
            "total": total,
            "courses": courses_summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting mentor students: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting mentor students",
        )


@router.get(
    "/{course_id}",
    response_model=CourseListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get course details",
    description="Get detailed information about a specific course",
)
async def get_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get course details by ID.

    **Path Parameters:**
    - course_id: Course ID

    **Returns:**
    - Course details with paths and module counts
    """
    try:
        if current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can view course details",
            )

        stmt = select(Course).where(Course.course_id == course_id)
        result = await db_session.execute(stmt)
        course = result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        # Get paths and modules count
        paths_stmt = select(LearningPath).where(LearningPath.course_id == course.course_id)
        paths_result = await db_session.execute(paths_stmt)
        paths = paths_result.scalars().all()
        
        total_modules = 0
        for path in paths:
            modules_stmt = select(Module).where(Module.path_id == path.path_id)
            modules_result = await db_session.execute(modules_stmt)
            total_modules += len(modules_result.scalars().all())
        
        return CourseListResponse(
            course_id=course.course_id,
            title=course.title,
            slug=course.slug,
            description=course.description,
            estimated_hours=course.estimated_hours,
            difficulty_level=course.difficulty_level,
            is_active=course.is_active,
            prerequisites=course.prerequisites or [],
            what_youll_learn=course.what_youll_learn or [],
            certificate_on_completion=course.certificate_on_completion or False,
            average_rating=course.average_rating or 0,
            total_reviews=course.total_reviews or 0,
            paths_count=len(paths),
            modules_count=total_modules,
            created_by=course.created_by,
            created_at=course.created_at.isoformat(),
            updated_at=course.updated_at.isoformat(),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting course: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting course details",
        )


@router.put(
    "/{course_id}",
    response_model=CourseResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a course",
    description="Update course details (admin/mentor only)",
)
async def update_course(
    course_id: int,
    request: CourseUpdateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Update course details.

    **Path Parameters:**
    - course_id: Course ID

    **Request Body:**
    - All fields are optional
    - title, description, slug, estimated_hours, difficulty_level, is_active

    **Returns:**
    - Updated course details
    """
    try:
        if current_user.role not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can update courses",
            )

        stmt = select(Course).where(Course.course_id == course_id)
        result = await db_session.execute(stmt)
        course = result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        # Check slug uniqueness if changing
        if request.slug and request.slug != course.slug:
            slug_stmt = select(Course).where(Course.slug == request.slug)
            slug_result = await db_session.execute(slug_stmt)
            if slug_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Slug '{request.slug}' is already in use",
                )
        
        # Update fields
        if request.title is not None:
            course.title = request.title
        if request.description is not None:
            course.description = request.description
        if request.slug is not None:
            course.slug = request.slug
        if request.estimated_hours is not None:
            course.estimated_hours = request.estimated_hours
        if request.difficulty_level is not None:
            course.difficulty_level = request.difficulty_level
        if request.is_active is not None:
            course.is_active = request.is_active
        if request.cover_image_url is not None:
            course.cover_image_url = request.cover_image_url
        if request.prerequisites is not None:
            course.prerequisites = request.prerequisites
        if request.what_youll_learn is not None:
            course.what_youll_learn = request.what_youll_learn
        if request.certificate_on_completion is not None:
            course.certificate_on_completion = request.certificate_on_completion
        
        await db_session.commit()
        await db_session.refresh(course)
        
        logger.info(f"Course {course_id} updated by {current_user.email}")
        
        return CourseResponse(
            course_id=course.course_id,
            title=course.title,
            slug=course.slug,
            description=course.description,
            estimated_hours=course.estimated_hours,
            difficulty_level=course.difficulty_level,
            is_active=course.is_active,
            prerequisites=course.prerequisites or [],
            what_youll_learn=course.what_youll_learn or [],
            certificate_on_completion=course.certificate_on_completion or False,
            average_rating=course.average_rating or 0,
            total_reviews=course.total_reviews or 0,
            created_by=course.created_by,
            created_at=course.created_at.isoformat(),
            updated_at=course.updated_at.isoformat(),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating course: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating course",
        )


@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a course",
    description="Delete a course and all its content (admin only)",
)
async def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Delete a course.

    **Path Parameters:**
    - course_id: Course ID

    **Note:** This will cascade delete all paths, modules, lessons, and projects.
    """
    try:
        # Only admins can delete courses
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete courses",
            )

        stmt = select(Course).where(Course.course_id == course_id)
        result = await db_session.execute(stmt)
        course = result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        await db_session.delete(course)
        await db_session.commit()
        
        logger.info(f"Course {course_id} deleted by {current_user.email}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting course: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting course",
        )


@router.get(
    "/{course_id}/paths",
    response_model=List[LearningPathResponse],
    status_code=status.HTTP_200_OK,
    summary="List learning paths for a course",
    description="Get all learning paths for a specific course",
)
async def list_learning_paths(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    List all learning paths for a course.

    **Path Parameters:**
    - course_id: ID of the course

    **Returns:**
    - List of learning paths with their details
    """
    try:
        if current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can view learning paths",
            )

        # Verify course exists
        course_stmt = select(Course).where(Course.course_id == course_id)
        course_result = await db_session.execute(course_stmt)
        if not course_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )

        # Get all learning paths for this course
        stmt = select(LearningPath).where(LearningPath.course_id == course_id).order_by(LearningPath.created_at)
        result = await db_session.execute(stmt)
        paths = result.scalars().all()

        return [
            LearningPathResponse(
                path_id=path.path_id,
                course_id=path.course_id,
                title=path.title,
                description=path.description,
                is_default=path.is_default,
                is_custom=path.is_custom,
                min_skill_level=path.min_skill_level.value if path.min_skill_level else None,
                max_skill_level=path.max_skill_level.value if path.max_skill_level else None,
                tags=path.tags or [],
                created_by=path.created_by,
                created_at=path.created_at.isoformat(),
                updated_at=path.updated_at.isoformat(),
            )
            for path in paths
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing learning paths: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing learning paths",
        )


@router.post(
    "/{course_id}/paths",
    response_model=LearningPathResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a learning path",
    description="Create a new learning path for a course",
)
async def create_learning_path(
    course_id: int,
    request: LearningPathCreateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Create a learning path for a course.

    **Path Parameters:**
    - course_id: ID of the course

    **Request Body:**
    - title: Path title (3-255 chars)
    - description: Detailed description (10+ chars)
    - min_skill_level: Optional minimum skill level
    - max_skill_level: Optional maximum skill level
    - tags: Optional list of tags
    - is_default: Set as default path for course

    **Returns:**
    - Created learning path details
    """
    try:
        if request.course_id != course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Course ID mismatch",
            )

        service = CourseService(db_session, current_user)
        path = await service.create_learning_path(
            course_id=course_id,
            title=request.title,
            description=request.description,
            min_skill_level=request.min_skill_level,
            max_skill_level=request.max_skill_level,
            tags=request.tags,
            is_default=request.is_default,
        )

        return LearningPathResponse(
            path_id=path.path_id,
            course_id=path.course_id,
            title=path.title,
            description=path.description,
            is_default=path.is_default,
            is_custom=path.is_custom,
            min_skill_level=path.min_skill_level.value if path.min_skill_level else None,
            max_skill_level=path.max_skill_level.value if path.max_skill_level else None,
            tags=path.tags or [],
            created_by=path.created_by,
            created_at=path.created_at.isoformat(),
            updated_at=path.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating learning path: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating learning path",
        )


@router.get(
    "/paths/{path_id}/modules",
    response_model=List[ModuleResponse],
    status_code=status.HTTP_200_OK,
    summary="List modules for a learning path",
    description="Get all modules in a learning path",
)
async def list_modules(
    path_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    List all modules in a learning path.

    **Path Parameters:**
    - path_id: ID of the learning path

    **Returns:**
    - List of modules with their details
    """
    try:
        if current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can view modules",
            )

        # Verify path exists
        path_stmt = select(LearningPath).where(LearningPath.path_id == path_id)
        path_result = await db_session.execute(path_stmt)
        if not path_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Learning path not found",
            )

        # Get all modules for this path
        stmt = select(Module).where(Module.path_id == path_id).order_by(Module.order)
        result = await db_session.execute(stmt)
        modules = result.scalars().all()

        return [
            ModuleResponse(
                module_id=module.module_id,
                path_id=module.path_id,
                title=module.title,
                description=module.description,
                order=module.order,
                estimated_hours=module.estimated_hours,
                created_at=module.created_at.isoformat(),
                updated_at=module.updated_at.isoformat(),
            )
            for module in modules
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing modules: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing modules",
        )


@router.post(
    "/paths/{path_id}/modules",
    response_model=ModuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a module",
    description="Create a new module in a learning path",
)
async def create_module(
    path_id: int,
    request: ModuleCreateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Create a module in a learning path.

    **Path Parameters:**
    - path_id: ID of the learning path

    **Request Body:**
    - title: Module title (3-255 chars)
    - description: Detailed description (10+ chars)
    - order: Display order (1+)
    - estimated_hours: Optional completion time

    **Returns:**
    - Created module details
    """
    try:
        if request.path_id != path_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Path ID mismatch",
            )

        service = CourseService(db_session, current_user)
        module = await service.create_module(
            path_id=path_id,
            title=request.title,
            description=request.description,
            order=request.order,
            estimated_hours=request.estimated_hours,
        )

        return ModuleResponse(
            module_id=module.module_id,
            path_id=module.path_id,
            title=module.title,
            description=module.description,
            order=module.order,
            estimated_hours=module.estimated_hours,
            created_at=module.created_at.isoformat(),
            updated_at=module.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating module: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating module",
        )


@router.put(
    "/modules/{module_id}",
    response_model=ModuleResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a module",
    description="Update an existing module",
)
async def update_module(
    module_id: int,
    request: ModuleUpdateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Update a module.

    **Path Parameters:**
    - module_id: ID of the module to update

    **Request Body (all optional):**
    - title: Module title (3-255 chars)
    - description: Detailed description (10+ chars)
    - order: Display order (1+)
    - estimated_hours: Completion time estimate

    **Returns:**
    - Updated module details
    """
    try:
        if current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can update modules",
            )

        # Get the module
        stmt = select(Module).where(Module.module_id == module_id)
        result = await db_session.execute(stmt)
        module = result.scalar_one_or_none()

        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found",
            )

        # Update fields if provided
        if request.title is not None:
            module.title = request.title
        if request.description is not None:
            module.description = request.description
        if request.order is not None:
            module.order = request.order
        if request.estimated_hours is not None:
            module.estimated_hours = request.estimated_hours

        await db_session.commit()
        await db_session.refresh(module)

        logger.info(f"Module {module_id} updated by {current_user.get('email')}")

        return ModuleResponse(
            module_id=module.module_id,
            path_id=module.path_id,
            title=module.title,
            description=module.description,
            order=module.order,
            estimated_hours=module.estimated_hours,
            created_at=module.created_at.isoformat(),
            updated_at=module.updated_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating module: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating module",
        )


@router.delete(
    "/modules/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a module",
    description="Delete a module and all its content (lessons, projects, assessments)",
)
async def delete_module(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Delete a module.

    **Path Parameters:**
    - module_id: ID of the module to delete

    **Note:** This will cascade delete all lessons, projects, and assessments in the module.
    """
    try:
        if current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can delete modules",
            )

        # Get the module
        stmt = select(Module).where(Module.module_id == module_id)
        result = await db_session.execute(stmt)
        module = result.scalar_one_or_none()

        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found",
            )

        await db_session.delete(module)
        await db_session.commit()

        logger.info(f"Module {module_id} deleted by {current_user.get('email')}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting module: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting module",
        )


@router.post(
    "/modules/{module_id}/lessons",
    response_model=LessonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a lesson",
    description="Create a new lesson in a module",
)
async def create_lesson(
    module_id: int,
    request: LessonCreateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Create a lesson in a module.

    **Path Parameters:**
    - module_id: ID of the module

    **Request Body:**
    - title: Lesson title (3-255 chars)
    - description: Detailed description (10+ chars)
    - content: Main lesson content/material
    - order: Display order (1+)
    - content_type: VIDEO, TEXT, INTERACTIVE, or ASSIGNMENT
    - estimated_minutes: Optional completion time
    - youtube_video_url: YouTube video URL
    - external_resources: List of external resource links
    - expected_outcomes: What's expected at end of lesson
    - starter_file_url: Optional starter files
    - solution_file_url: Optional solution files

    **Returns:**
    - Created lesson details
    """
    try:
        if request.module_id != module_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Module ID mismatch",
            )

        service = CourseService(db_session, current_user)
        lesson = await service.create_lesson(
            module_id=module_id,
            title=request.title,
            description=request.description,
            content=request.content,
            order=request.order,
            content_type=request.content_type,
            estimated_minutes=request.estimated_minutes,
            youtube_video_url=request.youtube_video_url,
            external_resources=request.external_resources,
            expected_outcomes=request.expected_outcomes,
            starter_file_url=request.starter_file_url,
            solution_file_url=request.solution_file_url,
        )

        return LessonResponse(
            lesson_id=lesson.lesson_id,
            module_id=lesson.module_id,
            title=lesson.title,
            description=lesson.description,
            content=lesson.content,
            order=lesson.order,
            content_type=lesson.content_type.value if lesson.content_type else None,
            estimated_minutes=lesson.estimated_minutes,
            youtube_video_url=lesson.youtube_video_url,
            external_resources=lesson.external_resources or [],
            expected_outcomes=lesson.expected_outcomes or [],
            starter_file_url=lesson.starter_file_url,
            solution_file_url=lesson.solution_file_url,
            created_at=lesson.created_at.isoformat(),
            updated_at=lesson.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating lesson: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating lesson",
        )


@router.get(
    "/modules/{module_id}/lessons",
    response_model=List[LessonResponse],
    status_code=status.HTTP_200_OK,
    summary="List lessons for a module",
    description="Get all lessons in a module",
)
async def list_lessons(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    List all lessons in a module.

    **Path Parameters:**
    - module_id: ID of the module

    **Returns:**
    - List of lessons with their details
    """
    try:
        if current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can view lessons",
            )

        service = CourseService(db_session, current_user)
        lessons = await service.list_lessons(module_id)

        return [
            LessonResponse(
                lesson_id=lesson.lesson_id,
                module_id=lesson.module_id,
                title=lesson.title,
                description=lesson.description,
                content=lesson.content,
                order=lesson.order,
                content_type=lesson.content_type.value if lesson.content_type else None,
                estimated_minutes=lesson.estimated_minutes,
                youtube_video_url=lesson.youtube_video_url,
                external_resources=lesson.external_resources or [],
                expected_outcomes=lesson.expected_outcomes or [],
                starter_file_url=lesson.starter_file_url,
                solution_file_url=lesson.solution_file_url,
                created_at=lesson.created_at.isoformat(),
                updated_at=lesson.updated_at.isoformat(),
            )
            for lesson in lessons
        ]
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error listing lessons: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing lessons",
        )


@router.put(
    "/lessons/{lesson_id}",
    response_model=LessonResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a lesson",
    description="Update a lesson's details",
)
async def update_lesson(
    lesson_id: int,
    request: LessonUpdateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Update a lesson.

    **Path Parameters:**
    - lesson_id: ID of the lesson

    **Request Body:**
    - title: New lesson title (optional)
    - description: New description (optional)
    - content: New content (optional)
    - order: New order (optional)
    - content_type: New content type (optional)
    - estimated_minutes: New estimated minutes (optional)
    - youtube_video_url: New YouTube video URL (optional)
    - external_resources: New external resources (optional)
    - expected_outcomes: New expected outcomes (optional)
    - starter_file_url: New starter file URL (optional)
    - solution_file_url: New solution file URL (optional)

    **Returns:**
    - Updated lesson details
    """
    try:
        service = CourseService(db_session, current_user)
        lesson = await service.update_lesson(
            lesson_id=lesson_id,
            title=request.title,
            description=request.description,
            content=request.content,
            order=request.order,
            content_type=request.content_type,
            estimated_minutes=request.estimated_minutes,
            youtube_video_url=request.youtube_video_url,
            external_resources=request.external_resources,
            expected_outcomes=request.expected_outcomes,
            starter_file_url=request.starter_file_url,
            solution_file_url=request.solution_file_url,
        )

        return LessonResponse(
            lesson_id=lesson.lesson_id,
            module_id=lesson.module_id,
            title=lesson.title,
            description=lesson.description,
            content=lesson.content,
            order=lesson.order,
            content_type=lesson.content_type.value if lesson.content_type else None,
            estimated_minutes=lesson.estimated_minutes,
            youtube_video_url=lesson.youtube_video_url,
            external_resources=lesson.external_resources or [],
            expected_outcomes=lesson.expected_outcomes or [],
            starter_file_url=lesson.starter_file_url,
            solution_file_url=lesson.solution_file_url,
            created_at=lesson.created_at.isoformat(),
            updated_at=lesson.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating lesson: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating lesson",
        )


@router.delete(
    "/lessons/{lesson_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a lesson",
    description="Delete a lesson",
)
async def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Delete a lesson.

    **Path Parameters:**
    - lesson_id: ID of the lesson

    **Returns:**
    - No content on success
    """
    try:
        service = CourseService(db_session, current_user)
        await service.delete_lesson(lesson_id)
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error deleting lesson: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting lesson",
        )


@router.get(
    "/modules/{module_id}/projects",
    response_model=List[ProjectResponse],
    status_code=status.HTTP_200_OK,
    summary="List projects for a module",
    description="Get all projects in a module",
)
async def list_projects(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    List all projects in a module.

    **Path Parameters:**
    - module_id: ID of the module

    **Returns:**
    - List of projects with their details
    """
    try:
        if current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can view projects",
            )

        # Verify module exists
        module_stmt = select(Module).where(Module.module_id == module_id)
        module_result = await db_session.execute(module_stmt)
        if not module_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found",
            )

        # Get all projects for this module
        stmt = select(Project).where(Project.module_id == module_id).order_by(Project.order)
        result = await db_session.execute(stmt)
        projects = result.scalars().all()

        return [
            ProjectResponse(
                project_id=project.project_id,
                module_id=project.module_id,
                title=project.title,
                description=project.description,
                order=project.order,
                estimated_hours=project.estimated_hours,
                starter_repo_url=project.starter_repo_url,
                solution_repo_url=project.solution_repo_url,
                required_skills=project.required_skills or [],
                created_at=project.created_at.isoformat(),
                updated_at=project.updated_at.isoformat(),
            )
            for project in projects
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing projects: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing projects",
        )


@router.get(
    "/modules/{module_id}/assessments",
    response_model=List[AssessmentQuestionResponse],
    status_code=status.HTTP_200_OK,
    summary="List assessment questions for a module",
    description="Get all assessment questions in a module",
)
async def list_assessments(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    List all assessment questions in a module.

    **Path Parameters:**
    - module_id: ID of the module

    **Returns:**
    - List of assessment questions with their details
    """
    try:
        if current_user.get("role") not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can view assessments",
            )

        # Verify module exists
        module_stmt = select(Module).where(Module.module_id == module_id)
        module_result = await db_session.execute(module_stmt)
        if not module_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found",
            )

        # Get all assessments for this module
        stmt = select(AssessmentQuestion).where(AssessmentQuestion.module_id == module_id).order_by(AssessmentQuestion.order)
        result = await db_session.execute(stmt)
        questions = result.scalars().all()

        return [
            AssessmentQuestionResponse(
                question_id=q.question_id,
                module_id=q.module_id,
                question_text=q.question_text,
                question_type=q.question_type,
                difficulty_level=q.difficulty_level,
                order=q.order,
                options=q.options or [],
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                points=q.points,
                created_at=q.created_at.isoformat(),
                updated_at=q.updated_at.isoformat(),
            )
            for q in questions
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing assessments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing assessments",
        )


@router.post(
    "/modules/{module_id}/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project",
    description="Create a new project in a module",
)
async def create_project(
    module_id: int,
    request: ProjectCreateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Create a project in a module.

    **Path Parameters:**
    - module_id: ID of the module

    **Request Body:**
    - title: Project title (3-255 chars)
    - description: Detailed description (10+ chars)
    - order: Display order (1+)
    - estimated_hours: Optional completion time
    - starter_repo_url: Optional starter repository
    - solution_repo_url: Optional solution repository
    - required_skills: Optional list of required skills

    **Returns:**
    - Created project details
    """
    try:
        if request.module_id != module_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Module ID mismatch",
            )

        service = CourseService(db_session, current_user)
        project = await service.create_project(
            module_id=module_id,
            title=request.title,
            description=request.description,
            order=request.order,
            estimated_hours=request.estimated_hours,
            starter_repo_url=request.starter_repo_url,
            solution_repo_url=request.solution_repo_url,
            required_skills=request.required_skills,
        )

        return ProjectResponse(
            project_id=project.project_id,
            module_id=project.module_id,
            title=project.title,
            description=project.description,
            order=project.order,
            estimated_hours=project.estimated_hours,
            starter_repo_url=project.starter_repo_url,
            solution_repo_url=project.solution_repo_url,
            required_skills=project.required_skills or [],
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating project: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating project",
        )


@router.put(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a project",
    description="Update an existing project (admin/mentor only)",
)
async def update_project(
    project_id: int,
    request: ProjectUpdateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Update a project.

    **Path Parameters:**
    - project_id: ID of the project to update

    **Request Body:**
    - title: Optional new title (3-255 chars)
    - description: Optional new description (10+ chars)
    - order: Optional new display order (1+)
    - estimated_hours: Optional new completion time
    - starter_repo_url: Optional new starter repository
    - solution_repo_url: Optional new solution repository
    - required_skills: Optional new list of required skills

    **Returns:**
    - Updated project details
    """
    try:
        service = CourseService(db_session, current_user)
        project = await service.update_project(
            project_id=project_id,
            title=request.title,
            description=request.description,
            order=request.order,
            estimated_hours=request.estimated_hours,
            starter_repo_url=request.starter_repo_url,
            solution_repo_url=request.solution_repo_url,
            required_skills=request.required_skills,
            first_deadline_days=request.first_deadline_days,
            second_deadline_days=request.second_deadline_days,
            third_deadline_days=request.third_deadline_days,
        )

        return ProjectResponse(
            project_id=project.project_id,
            module_id=project.module_id,
            title=project.title,
            description=project.description,
            order=project.order,
            estimated_hours=project.estimated_hours,
            starter_repo_url=project.starter_repo_url,
            solution_repo_url=project.solution_repo_url,
            required_skills=project.required_skills or [],
            first_deadline_days=project.first_deadline_days,
            second_deadline_days=project.second_deadline_days,
            third_deadline_days=project.third_deadline_days,
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating project: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating project",
        )


@router.delete(
    "/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project",
    description="Delete a project (admin/mentor only)",
)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Delete a project.

    **Path Parameters:**
    - project_id: ID of the project to delete

    **Warning:** This action is irreversible.
    """
    try:
        service = CourseService(db_session, current_user)
        await service.delete_project(project_id)
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error deleting project: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting project",
        )


@router.post(
    "/{course_id}/paths/{path_id}/set-default",
    response_model=LearningPathResponse,
    status_code=status.HTTP_200_OK,
    summary="Set default learning path",
    description="Set a learning path as the default for a course",
)
async def set_default_path(
    course_id: int,
    path_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Set a learning path as the default for a course.

    When a user enrolls without selecting a path, they'll be assigned to the default path.

    **Path Parameters:**
    - course_id: ID of the course
    - path_id: ID of the learning path to set as default

    **Returns:**
    - Updated learning path with is_default=true
    """
    try:
        service = CourseService(db_session, current_user)
        path = await service.set_default_path(course_id, path_id)

        return LearningPathResponse(
            path_id=path.path_id,
            course_id=path.course_id,
            title=path.title,
            description=path.description,
            is_default=path.is_default,
            is_custom=path.is_custom,
            min_skill_level=path.min_skill_level.value if path.min_skill_level else None,
            max_skill_level=path.max_skill_level.value if path.max_skill_level else None,
            tags=path.tags or [],
            created_by=path.created_by,
            created_at=path.created_at.isoformat(),
            updated_at=path.updated_at.isoformat(),
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error setting default path: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error setting default path",
        )


@router.post(
    "/{course_id}/paths/{path_id}/unset-default",
    response_model=LearningPathResponse,
    status_code=status.HTTP_200_OK,
    summary="Unset default learning path",
    description="Unset a learning path as the default for a course",
)
async def unset_default_path(
    course_id: int,
    path_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Unset a learning path as the default for a course.

    **Path Parameters:**
    - course_id: ID of the course
    - path_id: ID of the learning path to unset as default

    **Returns:**
    - Updated learning path with is_default=false
    """
    try:
        service = CourseService(db_session, current_user)
        path = await service.unset_default_path(course_id, path_id)

        return LearningPathResponse(
            path_id=path.path_id,
            course_id=path.course_id,
            title=path.title,
            description=path.description,
            is_default=path.is_default,
            is_custom=path.is_custom,
            min_skill_level=path.min_skill_level.value if path.min_skill_level else None,
            max_skill_level=path.max_skill_level.value if path.max_skill_level else None,
            tags=path.tags or [],
            created_by=path.created_by,
            created_at=path.created_at.isoformat(),
            updated_at=path.updated_at.isoformat(),
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error unsetting default path: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error unsetting default path",
        )


@router.put(
    "/paths/{path_id}",
    response_model=LearningPathResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a learning path",
    description="Update an existing learning path",
)
async def update_learning_path(
    path_id: int,
    request: LearningPathUpdateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Update a learning path.

    **Path Parameters:**
    - path_id: ID of the learning path to update

    **Request Body (all optional):**
    - title: Path title (3-255 chars)
    - description: Detailed description (10+ chars)
    - min_skill_level: Minimum skill level
    - max_skill_level: Maximum skill level
    - tags: List of tags
    - is_default: Set as default path

    **Returns:**
    - Updated learning path details
    """
    try:
        service = CourseService(db_session, current_user)
        path = await service.update_learning_path(
            path_id=path_id,
            title=request.title,
            description=request.description,
            min_skill_level=request.min_skill_level,
            max_skill_level=request.max_skill_level,
            tags=request.tags,
            is_default=request.is_default,
        )

        return LearningPathResponse(
            path_id=path.path_id,
            course_id=path.course_id,
            title=path.title,
            description=path.description,
            is_default=path.is_default,
            is_custom=path.is_custom,
            min_skill_level=path.min_skill_level.value if path.min_skill_level else None,
            max_skill_level=path.max_skill_level.value if path.max_skill_level else None,
            tags=path.tags or [],
            created_by=path.created_by,
            created_at=path.created_at.isoformat(),
            updated_at=path.updated_at.isoformat(),
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating learning path: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating learning path",
        )


@router.delete(
    "/paths/{path_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a learning path",
    description="Delete a learning path and all its modules, lessons, projects, and assessments",
)
async def delete_learning_path(
    path_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Delete a learning path.

    **Path Parameters:**
    - path_id: ID of the learning path to delete

    **Note:** This will cascade delete all modules, lessons, projects, and assessments in the path.
    """
    try:
        service = CourseService(db_session, current_user)
        await service.delete_learning_path(path_id)
        return None
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error deleting learning path: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting learning path",
        )


@router.post(
    "/modules/{module_id}/assessments",
    response_model=AssessmentQuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an assessment question",
    description="Create a new assessment question in a module",
)
async def create_assessment_question(
    module_id: int,
    request: AssessmentQuestionCreateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Create an assessment question in a module.

    Assessment questions appear at the end of each module and test student knowledge.

    **Path Parameters:**
    - module_id: ID of the module

    **Request Body:**
    - question_text: The question or prompt (5+ chars)
    - question_type: Type of question (multiple_choice, coding, debugging, short_answer)
    - difficulty_level: BEGINNER, INTERMEDIATE, or ADVANCED
    - order: Display order in module (1+)
    - options: Array of answer options (for multiple_choice only)
    - correct_answer: The correct answer or option
    - explanation: Optional explanation of the correct answer
    - points: Points awarded for correct answer (1-100, default 10)

    **Returns:**
    - Created assessment question details
    """
    try:
        if request.module_id != module_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Module ID mismatch",
            )

        # Check if user is admin or mentor
        if current_user.get('role') not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can create assessments",
            )

        service = CourseService(db_session, current_user)
        question = await service.create_assessment_question(
            module_id=module_id,
            question_text=request.question_text,
            question_type=request.question_type,
            difficulty_level=request.difficulty_level,
            order=request.order,
            options=request.options,
            correct_answer=request.correct_answer,
            explanation=request.explanation,
            points=request.points,
        )

        return AssessmentQuestionResponse(
            question_id=question.question_id,
            module_id=question.module_id,
            question_text=question.question_text,
            question_type=question.question_type,
            difficulty_level=question.difficulty_level,
            order=question.order,
            options=question.options,
            correct_answer=question.correct_answer,
            explanation=question.explanation,
            points=question.points,
            created_at=question.created_at.isoformat(),
            updated_at=question.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating assessment question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating assessment question",
        )


@router.put(
    "/assessments/{question_id}",
    response_model=AssessmentQuestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update an assessment question",
    description="Update an existing assessment question",
)
async def update_assessment_question(
    question_id: int,
    request: AssessmentQuestionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Update an assessment question.

    **Path Parameters:**
    - question_id: ID of the question to update

    **Request Body (all optional):**
    - question_text: Updated question text
    - question_type: Updated type (multiple_choice, coding, debugging, short_answer)
    - difficulty_level: Updated difficulty
    - order: Updated display order
    - options: Updated answer options
    - correct_answer: Updated correct answer
    - explanation: Updated explanation
    - points: Updated points

    **Returns:**
    - Updated assessment question details
    """
    try:
        # Check if user is admin or mentor
        if current_user.get('role') not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can update assessments",
            )

        service = CourseService(db_session, current_user)
        question = await service.update_assessment_question(
            question_id=question_id,
            question_text=request.question_text,
            question_type=request.question_type,
            difficulty_level=request.difficulty_level,
            order=request.order,
            options=request.options,
            correct_answer=request.correct_answer,
            explanation=request.explanation,
            points=request.points,
        )

        return AssessmentQuestionResponse(
            question_id=question.question_id,
            module_id=question.module_id,
            question_text=question.question_text,
            question_type=question.question_type,
            difficulty_level=question.difficulty_level,
            order=question.order,
            options=question.options,
            correct_answer=question.correct_answer,
            explanation=question.explanation,
            points=question.points,
            created_at=question.created_at.isoformat(),
            updated_at=question.updated_at.isoformat(),
        )
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating assessment question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating assessment question",
        )


@router.delete(
    "/assessments/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an assessment question",
    description="Delete an assessment question permanently",
)
async def delete_assessment_question(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Delete an assessment question.

    **Path Parameters:**
    - question_id: ID of the question to delete

    **Returns:**
    - No content on success
    """
    try:
        # Check if user is admin or mentor
        if current_user.get('role') not in [UserRole.ADMIN, UserRole.MENTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and mentors can delete assessments",
            )

        service = CourseService(db_session, current_user)
        await service.delete_assessment_question(question_id=question_id)

        return None
    except HTTPException:
        raise
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error deleting assessment question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting assessment question",
        )


# ===== SCHEDULED JOBS MANAGEMENT =====

@router.post(
    "/jobs/module-availability/run",
    summary="Manually run module availability job",
    description="Trigger the module availability job to unlock scheduled modules (admin only)",
)
async def run_module_availability_job(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Manually trigger the module availability job.
    
    This job normally runs daily at 6:00 AM UTC to unlock modules
    based on user registration dates. Admins can run it manually.

    **Returns:**
    - Job execution result with count of unlocked modules
    """
    try:
        # Admin only
        if current_user.get('role') != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can manually run scheduled jobs",
            )

        from domains.courses.jobs.module_availability_job import ModuleAvailabilityService
        
        service = ModuleAvailabilityService(db_session)
        result = await service.unlock_scheduled_modules()
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running module availability job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error running module availability job",
        )


@router.get(
    "/jobs/status",
    summary="Get scheduled jobs status",
    description="Get information about all scheduled background jobs (admin only)",
)
async def get_scheduled_jobs_status(
    current_user: User = Depends(get_current_user),
):
    """
    Get status and next run times of all scheduled jobs.

    **Returns:**
    - List of scheduled jobs with next run times
    """
    try:
        # Admin only
        if current_user.get('role') != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can view scheduled jobs",
            )

        from domains.courses.jobs.scheduler import get_scheduled_jobs
        
        jobs = get_scheduled_jobs()
        return {"jobs": jobs}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting scheduled jobs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting scheduled jobs status",
        )
