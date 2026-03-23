#!/usr/bin/python3
"""
Public course routes - no authentication required.
These routes allow anyone to view course information.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from auth.dependencies import get_db_session
from domains.courses.models.course import (
    Course, 
    LearningPath, 
    Module, 
    Lesson, 
    Project, 
    CourseReview
)
from domains.courses.schemas.course_schema import (
    CourseListResponse,
    CourseReviewsListResponse,
    CourseReviewResponse,
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public/courses", tags=["public-courses"])


@router.get(
    "",
    response_model=List[CourseListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all active courses",
    description="Get all active (published) courses - no authentication required",
)
async def list_public_courses(
    search: Optional[str] = Query(None, description="Search in title or description"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty level"),
    limit: int = Query(50, ge=1, le=100, description="Max results"),
    offset: int = Query(0, ge=0, description="Skip results"),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    List all active/published courses.
    
    **Query Parameters:**
    - search: Search term for title/description
    - difficulty: Filter by difficulty level (BEGINNER, INTERMEDIATE, ADVANCED)
    - limit: Maximum results (1-100)
    - offset: Pagination offset
    
    **Returns:**
    - List of active courses
    """
    try:
        stmt = select(Course).where(Course.is_active == True)
        
        if search:
            search_term = f"%{search}%"
            stmt = stmt.where(
                (Course.title.ilike(search_term)) | 
                (Course.description.ilike(search_term))
            )
        
        if difficulty:
            stmt = stmt.where(Course.difficulty_level == difficulty.upper())
        
        stmt = stmt.order_by(Course.created_at.desc()).offset(offset).limit(limit)
        
        result = await db_session.execute(stmt)
        courses = result.scalars().all()
        
        course_responses = []
        for course in courses:
            # Get paths count
            paths_stmt = select(func.count(LearningPath.path_id)).where(
                LearningPath.course_id == course.course_id
            )
            paths_result = await db_session.execute(paths_stmt)
            paths_count = paths_result.scalar() or 0
            
            # Get total modules
            modules_stmt = select(func.count(Module.module_id)).join(
                LearningPath, Module.path_id == LearningPath.path_id
            ).where(LearningPath.course_id == course.course_id)
            modules_result = await db_session.execute(modules_stmt)
            modules_count = modules_result.scalar() or 0
            
            # Get minimum price from learning paths
            min_price_stmt = select(func.min(LearningPath.price)).where(
                LearningPath.course_id == course.course_id
            )
            min_price_result = await db_session.execute(min_price_stmt)
            min_price = min_price_result.scalar() or 0.0
            
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
                average_rating=float(course.average_rating) if course.average_rating else 0.0,
                total_reviews=course.total_reviews or 0,
                paths_count=paths_count,
                modules_count=modules_count,
                min_price=float(min_price) if min_price else 0.0,
                created_by=course.created_by,
                created_at=course.created_at.isoformat(),
                updated_at=course.updated_at.isoformat(),
            ))
        
        return course_responses
        
    except Exception as e:
        logger.error(f"Error listing public courses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching courses",
        )


@router.get(
    "/by-slug/{slug}",
    response_model=CourseListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get course details by slug",
    description="Get detailed information about a specific active course by slug - no authentication required",
)
async def get_public_course_by_slug(
    slug: str,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get course details by slug.
    
    **Path Parameters:**
    - slug: Course slug (URL-friendly identifier)
    
    **Returns:**
    - Course details with paths, modules, and curriculum info
    """
    try:
        stmt = select(Course).where(
            Course.slug == slug,
            Course.is_active == True
        )
        result = await db_session.execute(stmt)
        course = result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        # Get paths count
        paths_stmt = select(func.count(LearningPath.path_id)).where(
            LearningPath.course_id == course.course_id
        )
        paths_result = await db_session.execute(paths_stmt)
        paths_count = paths_result.scalar() or 0
        
        # Get total modules
        modules_stmt = select(func.count(Module.module_id)).join(
            LearningPath, Module.path_id == LearningPath.path_id
        ).where(LearningPath.course_id == course.course_id)
        modules_result = await db_session.execute(modules_stmt)
        modules_count = modules_result.scalar() or 0
        
        # Get minimum price from learning paths
        min_price_stmt = select(func.min(LearningPath.price)).where(
            LearningPath.course_id == course.course_id
        )
        min_price_result = await db_session.execute(min_price_stmt)
        min_price = min_price_result.scalar() or 0.0
        
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
            average_rating=float(course.average_rating) if course.average_rating else 0.0,
            total_reviews=course.total_reviews or 0,
            paths_count=paths_count,
            modules_count=modules_count,
            min_price=float(min_price) if min_price else 0.0,
            created_by=course.created_by,
            created_at=course.created_at.isoformat(),
            updated_at=course.updated_at.isoformat(),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting public course by slug: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching course",
        )


@router.get(
    "/by-slug/{slug}/curriculum",
    status_code=status.HTTP_200_OK,
    summary="Get course curriculum by slug",
    description="Get the curriculum (modules, lessons) of a course by slug - no authentication required",
)
async def get_course_curriculum_by_slug(
    slug: str,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get course curriculum including modules and lessons by slug.
    
    **Path Parameters:**
    - slug: Course slug
    
    **Returns:**
    - Course curriculum with modules and lessons
    """
    try:
        # Verify course exists and is active
        stmt = select(Course).where(
            Course.slug == slug,
            Course.is_active == True
        )
        result = await db_session.execute(stmt)
        course = result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        course_id = course.course_id
        
        # Get the default learning path or first path
        paths_stmt = select(LearningPath).where(
            LearningPath.course_id == course_id
        ).order_by(LearningPath.is_default.desc())
        paths_result = await db_session.execute(paths_stmt)
        path = paths_result.scalars().first()
        
        if not path:
            return {
                "course_id": course_id,
                "course_title": course.title,
                "path_id": None,
                "path_title": None,
                "modules": []
            }
        
        # Get modules for this path
        modules_stmt = select(Module).where(
            Module.path_id == path.path_id
        ).order_by(Module.order)
        modules_result = await db_session.execute(modules_stmt)
        modules = modules_result.scalars().all()
        
        curriculum_modules = []
        for module in modules:
            # Get lessons for this module
            lessons_stmt = select(Lesson).where(
                Lesson.module_id == module.module_id
            ).order_by(Lesson.order)
            lessons_result = await db_session.execute(lessons_stmt)
            lessons = lessons_result.scalars().all()
            
            # Get projects for this module
            projects_stmt = select(Project).where(
                Project.module_id == module.module_id
            ).order_by(Project.order)
            projects_result = await db_session.execute(projects_stmt)
            projects = projects_result.scalars().all()
            
            # Calculate total duration
            total_minutes = sum(l.estimated_minutes or 0 for l in lessons)
            hours = total_minutes // 60
            minutes = total_minutes % 60
            duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
            
            curriculum_modules.append({
                "module_id": module.module_id,
                "title": module.title,
                "description": module.description,
                "order": module.order,
                "lessons_count": len(lessons),
                "projects_count": len(projects),
                "duration": duration_str,
                "items": [
                    {
                        "id": f"lesson-{l.lesson_id}",
                        "title": l.title,
                        "type": "lesson",
                        "content_type": l.content_type,
                        "duration": f"{l.estimated_minutes or 15}m",
                        "has_video": bool(l.youtube_video_url),
                    }
                    for l in lessons
                ] + [
                    {
                        "id": f"project-{p.project_id}",
                        "title": p.title,
                        "type": "project",
                        "duration": f"{p.estimated_hours or 1}h",
                    }
                    for p in projects
                ]
            })
        
        return {
            "course_id": course_id,
            "course_title": course.title,
            "path_id": path.path_id,
            "path_title": path.title,
            "modules": curriculum_modules
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting course curriculum by slug: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching curriculum",
        )


@router.get(
    "/by-slug/{slug}/reviews",
    response_model=CourseReviewsListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get course reviews by slug",
    description="Get all approved reviews for a course by slug - no authentication required",
)
async def get_course_reviews_by_slug(
    slug: str,
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    offset: int = Query(0, ge=0, description="Skip results"),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get all approved reviews for a course by slug.
    
    **Path Parameters:**
    - slug: Course slug
    
    **Query Parameters:**
    - limit: Maximum results (1-100)
    - offset: Pagination offset
    
    **Returns:**
    - List of approved reviews with average rating
    """
    try:
        # Verify course exists and is active
        course_stmt = select(Course).where(
            Course.slug == slug,
            Course.is_active == True
        )
        course_result = await db_session.execute(course_stmt)
        course = course_result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        course_id = course.course_id
        
        # Get reviews with user info
        from domains.users.models.user import User
        
        reviews_stmt = (
            select(CourseReview, User.full_name)
            .join(User, CourseReview.user_id == User.id)
            .where(
                CourseReview.course_id == course_id,
                CourseReview.is_approved == True
            )
            .order_by(CourseReview.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        reviews_result = await db_session.execute(reviews_stmt)
        reviews_with_names = reviews_result.all()
        
        # Get total count
        count_stmt = select(func.count(CourseReview.review_id)).where(
            CourseReview.course_id == course_id,
            CourseReview.is_approved == True
        )
        count_result = await db_session.execute(count_stmt)
        total_count = count_result.scalar() or 0
        
        reviews = []
        for review, user_name in reviews_with_names:
            reviews.append(CourseReviewResponse(
                review_id=review.review_id,
                course_id=review.course_id,
                user_id=review.user_id if not review.is_anonymous else "anonymous",
                user_name=user_name if not review.is_anonymous else "Anonymous",
                rating=review.rating,
                review_text=review.review_text,
                is_anonymous=review.is_anonymous,
                is_approved=review.is_approved,
                created_at=review.created_at.isoformat(),
                updated_at=review.updated_at.isoformat(),
            ))
        
        return CourseReviewsListResponse(
            reviews=reviews,
            total_count=total_count,
            average_rating=float(course.average_rating) if course.average_rating else 0.0,
            rating_breakdown={},  # Could be implemented to provide counts per rating
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting course reviews by slug: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching reviews",
        )


@router.get(
    "/{course_id}",
    response_model=CourseListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get course details",
    description="Get detailed information about a specific active course - no authentication required",
)
async def get_public_course(
    course_id: int,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get course details by ID.
    
    **Path Parameters:**
    - course_id: Course ID
    
    **Returns:**
    - Course details with paths, modules, and curriculum info
    """
    try:
        stmt = select(Course).where(
            Course.course_id == course_id,
            Course.is_active == True
        )
        result = await db_session.execute(stmt)
        course = result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        # Get paths count
        paths_stmt = select(func.count(LearningPath.path_id)).where(
            LearningPath.course_id == course.course_id
        )
        paths_result = await db_session.execute(paths_stmt)
        paths_count = paths_result.scalar() or 0
        
        # Get total modules
        modules_stmt = select(func.count(Module.module_id)).join(
            LearningPath, Module.path_id == LearningPath.path_id
        ).where(LearningPath.course_id == course.course_id)
        modules_result = await db_session.execute(modules_stmt)
        modules_count = modules_result.scalar() or 0
        
        # Get minimum price from learning paths
        min_price_stmt = select(func.min(LearningPath.price)).where(
            LearningPath.course_id == course.course_id
        )
        min_price_result = await db_session.execute(min_price_stmt)
        min_price = min_price_result.scalar() or 0.0
        
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
            average_rating=float(course.average_rating) if course.average_rating else 0.0,
            total_reviews=course.total_reviews or 0,
            paths_count=paths_count,
            modules_count=modules_count,
            min_price=float(min_price),
            created_by=course.created_by,
            created_at=course.created_at.isoformat(),
            updated_at=course.updated_at.isoformat(),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting public course: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching course",
        )


@router.get(
    "/{course_id}/curriculum",
    status_code=status.HTTP_200_OK,
    summary="Get course curriculum",
    description="Get the curriculum (modules, lessons) of a course - no authentication required",
)
async def get_course_curriculum(
    course_id: int,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get course curriculum including modules and lessons.
    
    **Path Parameters:**
    - course_id: Course ID
    
    **Returns:**
    - Course curriculum with modules and lessons
    """
    try:
        # Verify course exists and is active
        stmt = select(Course).where(
            Course.course_id == course_id,
            Course.is_active == True
        )
        result = await db_session.execute(stmt)
        course = result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        # Get the default learning path or first path
        paths_stmt = select(LearningPath).where(
            LearningPath.course_id == course_id
        ).order_by(LearningPath.is_default.desc())
        paths_result = await db_session.execute(paths_stmt)
        path = paths_result.scalars().first()
        
        if not path:
            return {
                "course_id": course_id,
                "course_title": course.title,
                "path_id": None,
                "path_title": None,
                "modules": []
            }
        
        # Get modules for this path
        modules_stmt = select(Module).where(
            Module.path_id == path.path_id
        ).order_by(Module.order)
        modules_result = await db_session.execute(modules_stmt)
        modules = modules_result.scalars().all()
        
        curriculum_modules = []
        for module in modules:
            # Get lessons for this module
            lessons_stmt = select(Lesson).where(
                Lesson.module_id == module.module_id
            ).order_by(Lesson.order)
            lessons_result = await db_session.execute(lessons_stmt)
            lessons = lessons_result.scalars().all()
            
            # Get projects for this module
            projects_stmt = select(Project).where(
                Project.module_id == module.module_id
            ).order_by(Project.order)
            projects_result = await db_session.execute(projects_stmt)
            projects = projects_result.scalars().all()
            
            # Calculate total duration
            total_minutes = sum(l.estimated_minutes or 0 for l in lessons)
            hours = total_minutes // 60
            minutes = total_minutes % 60
            duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
            
            curriculum_modules.append({
                "module_id": module.module_id,
                "title": module.title,
                "description": module.description,
                "order": module.order,
                "lessons_count": len(lessons),
                "projects_count": len(projects),
                "duration": duration_str,
                "items": [
                    {
                        "id": f"lesson-{l.lesson_id}",
                        "title": l.title,
                        "type": "lesson",
                        "content_type": l.content_type,
                        "duration": f"{l.estimated_minutes or 15}m",
                        "has_video": bool(l.youtube_video_url),
                    }
                    for l in lessons
                ] + [
                    {
                        "id": f"project-{p.project_id}",
                        "title": p.title,
                        "type": "project",
                        "duration": f"{p.estimated_hours or 1}h",
                    }
                    for p in projects
                ]
            })
        
        return {
            "course_id": course_id,
            "course_title": course.title,
            "path_id": path.path_id,
            "path_title": path.title,
            "modules": curriculum_modules
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting course curriculum: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching curriculum",
        )


@router.get(
    "/{course_id}/reviews",
    response_model=CourseReviewsListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get course reviews",
    description="Get all approved reviews for a course - no authentication required",
)
async def get_course_reviews(
    course_id: int,
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    offset: int = Query(0, ge=0, description="Skip results"),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get all approved reviews for a course.
    
    **Path Parameters:**
    - course_id: Course ID
    
    **Query Parameters:**
    - limit: Maximum results (1-100)
    - offset: Pagination offset
    
    **Returns:**
    - List of approved reviews with average rating
    """
    try:
        # Verify course exists and is active
        course_stmt = select(Course).where(
            Course.course_id == course_id,
            Course.is_active == True
        )
        course_result = await db_session.execute(course_stmt)
        course = course_result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        
        # Get reviews with user info
        from domains.users.models.user import User
        
        reviews_stmt = (
            select(CourseReview, User.full_name)
            .join(User, CourseReview.user_id == User.user_id)
            .where(
                CourseReview.course_id == course_id,
                CourseReview.is_approved == True
            )
            .order_by(CourseReview.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        reviews_result = await db_session.execute(reviews_stmt)
        reviews_with_names = reviews_result.all()
        
        # Get total count
        count_stmt = select(func.count(CourseReview.review_id)).where(
            CourseReview.course_id == course_id,
            CourseReview.is_approved == True
        )
        count_result = await db_session.execute(count_stmt)
        total_count = count_result.scalar() or 0
        
        reviews = []
        for review, user_name in reviews_with_names:
            reviews.append(CourseReviewResponse(
                review_id=review.review_id,
                course_id=review.course_id,
                user_id=review.user_id if not review.is_anonymous else "anonymous",
                user_name=user_name if not review.is_anonymous else "Anonymous",
                rating=review.rating,
                review_text=review.review_text,
                is_anonymous=review.is_anonymous,
                is_approved=review.is_approved,
                created_at=review.created_at.isoformat(),
                updated_at=review.updated_at.isoformat(),
            ))
        
        return CourseReviewsListResponse(
            reviews=reviews,
            total_count=total_count,
            average_rating=float(course.average_rating) if course.average_rating else 0.0,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting course reviews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching reviews",
        )
