"""Student and administrator HTTP endpoints for learning surveys."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user, get_db_session
from domains.surveys.schemas import (
    AdminSurveyResponsesPage,
    DismissSurveyRequest,
    EligibleSurveyResponse,
    SubmitSurveyResponseRequest,
    SurveyAnalyticsResponse,
    SurveyCreate,
    SurveyDismissedResponse,
    SurveyQuestionCreate,
    SurveyQuestionResponse,
    SurveyQuestionUpdate,
    SurveyResponseModel,
    SurveySubmissionResponse,
    SurveyUpdate,
)
from domains.surveys.service import SurveyService


router = APIRouter(tags=["Learning Surveys"])


def _require_admin(current_user: dict) -> None:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def _service_error(exc: Exception) -> HTTPException:
    if isinstance(exc, LookupError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/surveys/eligible", response_model=EligibleSurveyResponse)
async def get_eligible_survey(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    survey = await SurveyService(session).get_eligible_survey(
        current_user.get("user_id"), current_user.get("role", "")
    )
    return EligibleSurveyResponse(survey=survey)


@router.post(
    "/surveys/{survey_id}/responses",
    response_model=SurveySubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_survey_response(
    survey_id: int,
    payload: SubmitSurveyResponseRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    try:
        saved = await SurveyService(session).submit_response(
            current_user.get("user_id"), survey_id, payload.cycle_key, payload.responses
        )
    except (LookupError, ValueError) as exc:
        raise _service_error(exc) from exc
    return SurveySubmissionResponse(
        message="Thank you. Your feedback was saved.",
        response_id=saved.id,
        completed_at=saved.submitted_at,
    )


@router.post("/surveys/{survey_id}/dismiss", response_model=SurveyDismissedResponse)
async def dismiss_survey(
    survey_id: int,
    payload: DismissSurveyRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    try:
        event = await SurveyService(session).dismiss(
            current_user.get("user_id"), survey_id, payload.status
        )
    except (LookupError, ValueError) as exc:
        raise _service_error(exc) from exc
    return SurveyDismissedResponse(
        status=payload.status,
        next_eligible_at=event.next_eligible_at,
    )


@router.get("/admin/surveys", response_model=list[SurveyResponseModel])
async def list_surveys(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    _require_admin(current_user)
    return await SurveyService(session).list_surveys()


@router.post(
    "/admin/surveys",
    response_model=SurveyResponseModel,
    status_code=status.HTTP_201_CREATED,
)
async def create_survey(
    payload: SurveyCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    _require_admin(current_user)
    try:
        return await SurveyService(session).create_survey(payload, current_user.get("user_id"))
    except ValueError as exc:
        raise _service_error(exc) from exc


@router.get("/admin/surveys/responses", response_model=AdminSurveyResponsesPage)
async def list_survey_responses(
    course_id: Optional[int] = Query(default=None),
    path_id: Optional[int] = Query(default=None),
    month: Optional[str] = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    survey_type: Optional[str] = Query(default=None),
    needs_support: Optional[bool] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    _require_admin(current_user)
    try:
        return await SurveyService(session).list_responses(
            course_id=course_id,
            path_id=path_id,
            month=month,
            survey_type=survey_type,
            needs_support=needs_support,
            limit=limit,
            offset=offset,
        )
    except ValueError as exc:
        raise _service_error(exc) from exc


@router.get("/admin/surveys/analytics", response_model=SurveyAnalyticsResponse)
async def get_survey_analytics(
    course_id: Optional[int] = Query(default=None),
    path_id: Optional[int] = Query(default=None),
    month: Optional[str] = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    survey_type: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    _require_admin(current_user)
    try:
        return await SurveyService(session).analytics(
            course_id=course_id, path_id=path_id, month=month, survey_type=survey_type
        )
    except ValueError as exc:
        raise _service_error(exc) from exc


@router.patch("/admin/surveys/{survey_id}", response_model=SurveyResponseModel)
async def update_survey(
    survey_id: int,
    payload: SurveyUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    _require_admin(current_user)
    try:
        return await SurveyService(session).update_survey(survey_id, payload)
    except (LookupError, ValueError) as exc:
        raise _service_error(exc) from exc


@router.post(
    "/admin/surveys/{survey_id}/questions",
    response_model=SurveyQuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_survey_question(
    survey_id: int,
    payload: SurveyQuestionCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    _require_admin(current_user)
    try:
        return await SurveyService(session).add_question(survey_id, payload)
    except (LookupError, ValueError) as exc:
        raise _service_error(exc) from exc


@router.patch("/admin/surveys/questions/{question_id}", response_model=SurveyQuestionResponse)
async def update_survey_question(
    question_id: int,
    payload: SurveyQuestionUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    _require_admin(current_user)
    try:
        return await SurveyService(session).update_question(
            question_id, payload.model_dump(exclude_unset=True)
        )
    except (LookupError, ValueError) as exc:
        raise _service_error(exc) from exc


@router.delete("/admin/surveys/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_survey_question(
    question_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    _require_admin(current_user)
    try:
        await SurveyService(session).delete_question(question_id)
    except (LookupError, ValueError) as exc:
        raise _service_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
