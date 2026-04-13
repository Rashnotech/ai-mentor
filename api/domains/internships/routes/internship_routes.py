#!/usr/bin/python3
"""
Internship application API routes.
Public endpoints for creating and managing internship applications.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging

from auth.dependencies import get_db_session
from domains.internships.schemas.internship_schema import (
    CreateProfileRequest,
    UpdateProfileRequest,
    UploadDocumentsRequest,
    SelectTrackRequest,
    InternshipApplicationResponse,
    InternshipTrackResponse,
    InternshipTrackCoursesResponse,
)
from domains.internships.services.internship_service import InternshipService
from core.errors import AppError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internships", tags=["internships"])


@router.post(
    "/applications",
    response_model=InternshipApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create internship application profile",
    description="Step 1: Create a new internship application with personal information and institution details",
)
async def create_application(
    request: CreateProfileRequest,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Create a new internship application profile.
    
    **Request Body:**
    - email: Valid email address (required)
    - first_name: First name (required, 2-100 chars)
    - last_name: Last name (required, 2-100 chars)
    - telephone: Phone number with country code (required, 10-50 chars)
    - hear_about_us: How applicant heard about us (optional)
    - country: Country (required)
    - state: State or territory (required)
    - institution_type: university, polytechnic, or college (required)
    
    **Returns:**
    - Created application with status "draft"
    
    **Errors:**
    - 409: Email already exists
    - 422: Validation error (invalid email, phone, etc.)
    - 500: Server error
    """
    try:
        service = InternshipService(db_session)
        application = await service.create_application(request)
        return application

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating application: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create application",
        )


@router.patch(
    "/applications/{application_id}",
    response_model=InternshipApplicationResponse,
    status_code=status.HTTP_200_OK,
    summary="Update application profile",
    description="Update personal information and institution details of an existing application",
)
async def update_application(
    application_id: int,
    request: UpdateProfileRequest,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Update an existing application profile.
    
    **Path Parameters:**
    - application_id: Application ID
    
    **Request Body:**
    All fields are optional:
    - first_name, last_name, telephone, hear_about_us
    - country, state, institution_type
    
    **Returns:**
    - Updated application
    
    **Errors:**
    - 404: Application not found
    - 422: Validation error
    - 500: Server error
    """
    try:
        service = InternshipService(db_session)
        application = await service.update_application(application_id, request)
        return application

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update application",
        )


@router.post(
    "/applications/{application_id}/documents",
    response_model=InternshipApplicationResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload verification documents",
    description="Step 2: Upload IT letter, admission letter, and ID verification documents",
)
async def upload_documents(
    application_id: int,
    request: UploadDocumentsRequest,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Upload verification documents for an application.
    
    **Path Parameters:**
    - application_id: Application ID
    
    **Request Body:**
    All fields are optional (upload as available):
    - it_letter_url: URL of uploaded IT letter
    - admission_letter_url: URL of uploaded admission letter
    - id_card_url: URL of uploaded ID card
    - id_type: school-id, voters-card, or nin-slip
    
    **Returns:**
    - Updated application with document URLs
    
    **Errors:**
    - 404: Application not found
    - 422: Validation error (invalid ID type)
    - 500: Server error
    
    **Note:** This endpoint expects document URLs. File upload handling
    should be done separately (e.g., to S3, Cloudinary) and URLs provided here.
    """
    try:
        service = InternshipService(db_session)
        application = await service.upload_documents(application_id, request)
        return application

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error uploading documents for application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload documents",
        )


@router.post(
    "/applications/{application_id}/track",
    response_model=InternshipApplicationResponse,
    status_code=status.HTTP_200_OK,
    summary="Select learning track and submit",
    description="Step 3: Select learning track, optionally link a course, and submit application. Sends acknowledgment email.",
)
async def select_track(
    application_id: int,
    request: SelectTrackRequest,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Select learning track and submit the application.
    
    **Path Parameters:**
    - application_id: Application ID
    
    **Request Body:**
    - selected_track: frontend, backend, fullstack, ai-engineering, product-design, or data-analytics (required)
    - course_id: Associated course ID from backend (optional)
    
    **Returns:**
    - Updated application with status "submitted"
    - acknowledgment_sent will be true if email was sent successfully
    
    **Side Effects:**
    - Changes application status to "submitted"
    - Sets submitted_at timestamp
    - Sends acknowledgment email to applicant
    
    **Errors:**
    - 404: Application or course not found
    - 422: Validation error (invalid track)
    - 500: Server error
    """
    try:
        service = InternshipService(db_session)
        application = await service.select_track(application_id, request)
        return application

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error selecting track for application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit application",
        )


@router.get(
    "/applications/{application_id}",
    response_model=InternshipApplicationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get application by ID",
    description="Retrieve an internship application by its ID",
)
async def get_application(
    application_id: int,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get application details by ID.
    
    **Path Parameters:**
    - application_id: Application ID
    
    **Returns:**
    - Application details
    
    **Errors:**
    - 404: Application not found
    - 500: Server error
    """
    try:
        service = InternshipService(db_session)
        application = await service.get_application(application_id)
        return application

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve application",
        )


@router.get(
    "/tracks",
    response_model=List[InternshipTrackResponse],
    status_code=status.HTTP_200_OK,
    summary="Get available internship tracks",
    description="Get all available internship tracks with associated courses from the backend",
)
async def get_tracks(
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Get all available internship tracks with courses.
    
    **Returns:**
    - List of tracks with:
      - track_id, track_name, description, level
      - courses: List of available courses for each track
    
    **Example Response:**
    ```json
    [
        {
            "track_id": "frontend",
            "track_name": "Frontend Development",
            "description": "Build responsive web interfaces...",
            "level": "Beginner to Intermediate",
            "courses": [
                {
                    "course_id": 1,
                    "title": "React Fundamentals",
                    "description": "Learn React from scratch"
                }
            ]
        }
    ]
    ```
    """
    try:
        service = InternshipService(db_session)
        tracks = await service.get_available_tracks()
        return tracks

    except Exception as e:
        logger.error(f"Error getting tracks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tracks",
        )


@router.get(
    "/tracks/{track_id}/courses",
    response_model=InternshipTrackCoursesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get paginated courses for internship track",
    description="Get paginated courses from the database for the selected internship track",
)
async def get_track_courses(
    track_id: str,
    limit: int = Query(12, ge=1, le=100, description="Page size"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    search: str | None = Query(None, description="Optional text search on course title/description"),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Get paginated courses for a selected track."""
    try:
        service = InternshipService(db_session)
        data = await service.get_track_courses(
            track_id=track_id,
            limit=limit,
            offset=offset,
            search=search,
        )
        return data

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting track courses for {track_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve track courses",
        )
