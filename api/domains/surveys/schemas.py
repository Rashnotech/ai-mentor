"""Typed API contracts for the learning survey domain."""
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


QuestionType = Literal["single_choice", "multiple_choice", "rating", "short_text", "long_text"]
DismissStatus = Literal["dismissed", "skipped"]
TriggerType = Literal["learning_timeline", "module_completion", "learning_inactivity"]


class SurveyQuestionCreate(BaseModel):
    question_key: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9_]+$")
    question_text: str = Field(min_length=3, max_length=1000)
    question_type: QuestionType
    options: list[str] = Field(default_factory=list, max_length=10)
    is_required: bool = True
    order: int = Field(default=0, ge=0, le=100)

    @field_validator("options")
    @classmethod
    def validate_options(cls, options: list[str]) -> list[str]:
        cleaned = [option.strip() for option in options if option.strip()]
        if len(cleaned) != len(set(cleaned)):
            raise ValueError("Question options must be unique")
        return cleaned


class SurveyQuestionUpdate(BaseModel):
    question_text: Optional[str] = Field(default=None, min_length=3, max_length=1000)
    question_type: Optional[QuestionType] = None
    options: Optional[list[str]] = Field(default=None, max_length=10)
    is_required: Optional[bool] = None
    order: Optional[int] = Field(default=None, ge=0, le=100)

    @field_validator("options")
    @classmethod
    def validate_options(cls, options: Optional[list[str]]) -> Optional[list[str]]:
        if options is None:
            return None
        cleaned = [option.strip() for option in options if option.strip()]
        if len(cleaned) != len(set(cleaned)):
            raise ValueError("Question options must be unique")
        return cleaned


class SurveyQuestionResponse(BaseModel):
    id: int
    question_key: str
    question_text: str
    question_type: QuestionType
    options: list[str]
    is_required: bool
    order: int

    model_config = {"from_attributes": True}


class SurveyCreate(BaseModel):
    slug: str = Field(min_length=3, max_length=100, pattern=r"^[a-z0-9-]+$")
    title: str = Field(min_length=3, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    survey_type: str = Field(min_length=3, max_length=50)
    trigger_type: TriggerType
    is_active: bool = True
    priority: int = Field(default=0, ge=0, le=100)
    questions: list[SurveyQuestionCreate] = Field(min_length=1, max_length=5)


class SurveyUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    survey_type: Optional[str] = Field(default=None, min_length=3, max_length=50)
    trigger_type: Optional[TriggerType] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = Field(default=None, ge=0, le=100)


class SurveyResponseModel(BaseModel):
    id: int
    slug: str
    title: str
    description: Optional[str]
    survey_type: str
    trigger_type: str
    is_active: bool
    priority: int
    questions: list[SurveyQuestionResponse]
    created_at: datetime
    updated_at: datetime


class EligibleSurveyContext(BaseModel):
    enrollment_id: int
    course_id: int
    path_id: Optional[int]
    module_id: Optional[int]
    module_title: Optional[str]
    reason: str


class EligibleSurvey(BaseModel):
    id: int
    title: str
    description: Optional[str]
    type: str
    cycle_key: str
    questions: list[SurveyQuestionResponse]
    context: EligibleSurveyContext


class EligibleSurveyResponse(BaseModel):
    survey: Optional[EligibleSurvey]


class SubmitSurveyResponseRequest(BaseModel):
    cycle_key: str = Field(min_length=3, max_length=150)
    responses: dict[str, Any]


class SurveySubmissionResponse(BaseModel):
    success: bool = True
    message: str
    response_id: int
    completed_at: datetime


class DismissSurveyRequest(BaseModel):
    status: DismissStatus = "dismissed"


class SurveyDismissedResponse(BaseModel):
    success: bool = True
    status: DismissStatus
    next_eligible_at: datetime


class AdminSurveyResponseItem(BaseModel):
    id: int
    survey_id: int
    survey_title: str
    survey_type: str
    user_id: str
    student_name: str
    student_email: str
    course_id: Optional[int]
    course_title: Optional[str]
    path_id: Optional[int]
    enrollment_id: Optional[int]
    module_id: Optional[int]
    responses: dict[str, Any]
    needs_support: bool
    submitted_at: datetime


class AdminSurveyResponsesPage(BaseModel):
    responses: list[AdminSurveyResponseItem]
    total: int
    limit: int
    offset: int


class SurveyAnalyticsResponse(BaseModel):
    total_responses: int
    active_surveys: int
    average_learning_rating: Optional[float]
    satisfaction_breakdown: dict[str, int]
    difficulty_breakdown: dict[str, int]
    common_issues: list[dict[str, Any]]
    support_requests: int
    courses_with_most_complaints: list[dict[str, Any]]
    modules_with_most_complaints: list[dict[str, Any]]
    monthly_satisfaction: list[dict[str, Any]]
