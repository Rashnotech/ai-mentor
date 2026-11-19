#!/usr/bin/python3
"""Mode 1: Project Defense Interview routes."""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user, get_db_session
from domains.ai.services.project_interview_service import run_project_defense_turn
from domains.users.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/project-interview", tags=["AI"])


class InterviewMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class ProjectInterviewTurnRequest(BaseModel):
    project_id: int = Field(..., ge=1)
    transcript: List[InterviewMessage] = Field(default=[], max_length=30)
    screenshot_data_url: Optional[str] = Field(
        default=None,
        description="Optional base64 image data URL captured from student's shared screen",
    )
    repo_url: Optional[str] = Field(default=None, max_length=500)


class ProjectInterviewEvaluationSchema(BaseModel):
    score_percent: int
    passed: bool
    strengths: List[str]
    gaps: List[str]
    mentor_note: str
    xp_awarded: int = 0


class ProjectInterviewTurnResponse(BaseModel):
    message: str
    question_number: int
    max_questions: int
    is_complete: bool
    used_vision: bool
    model: str
    evaluation: Optional[ProjectInterviewEvaluationSchema] = None


@router.post(
    "/turn",
    response_model=ProjectInterviewTurnResponse,
    status_code=status.HTTP_200_OK,
    summary="Run a turn of Mode 1 Project Defense Interview",
    description="Sends transcript, optional screen snapshot, and project rubric to Groq Vision LLM (llama-4-scout-17b-16e-instruct).",
)
async def project_defense_turn(
    body: ProjectInterviewTurnRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Conduct one turn of the Project Defense Interview."""
    try:
        user_id = current_user.get("user_id")
        result = await run_project_defense_turn(
            db_session=db_session,
            user_id=user_id,
            project_id=body.project_id,
            transcript=[{"role": m.role, "content": m.content} for m in body.transcript],
            screenshot_data_url=body.screenshot_data_url,
            repo_url=body.repo_url,
        )
        return ProjectInterviewTurnResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Project defense interview turn error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process project defense interview turn",
        )
