#!/usr/bin/python3
"""
Routes for JSON-based course import (create / update via uploaded JSON file).

POST /courses/json-import
    Accepts a JSON file upload (multipart/form-data) containing the full
    course hierarchy and performs an idempotent create-or-update for each
    entity in the hierarchy.
"""
import json

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user, get_db_session
from domains.courses.schemas.json_course_schema import CourseJsonInput, JsonImportResponse
from domains.courses.services.json_course_service import JsonCourseService
from domains.users.models.user import User
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post(
    "/json-import",
    response_model=JsonImportResponse,
    status_code=status.HTTP_200_OK,
    summary="Create or update a course via JSON file",
    description=(
        "Upload a JSON file to create a new course or update an existing one. "
        "The JSON must follow the documented schema. "
        "If a course with the same **course_name** already exists it will be "
        "updated; otherwise a new course is created. "
        "The same upsert logic applies to the nested learning path, modules, lessons, "
        "projects, and quizzes."
    ),
)
async def import_course_from_json(
    file: UploadFile = File(..., description="JSON file containing the course data"),
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    **Import or update a course from a JSON file.**

    ### Accepted content types
    - `application/json`
    - `text/plain` (plain-text JSON)
    - Any other type is rejected with HTTP 400.

    ### File size
    Files are read entirely into memory; keep them under a few MB.

    ### Errors
    - **400** – Invalid JSON format, missing required fields, or slug conflict.
    - **403** – Caller is not an admin or mentor.
    - **500** – Unexpected server-side error.
    """
    # Validate content type
    if file.content_type not in ("application/json", "text/plain", "text/json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a JSON file (application/json or text/plain)",
        )

    # Read and parse JSON
    raw = await file.read()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON format: {exc.msg}",
        )

    # Validate against Pydantic schema
    try:
        course_data = CourseJsonInput.model_validate(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON structure: {exc}",
        )

    # Delegate to service
    try:
        service = JsonCourseService(db_session, current_user)
        result = await service.import_course(course_data)
        return result
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)
    except Exception as exc:
        logger.error("Unexpected error in json-import endpoint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing course JSON import",
        )
