"""Schemas for public contact form submissions."""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class ContactSubmissionRequest(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=80)
    last_name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=40)
    interest: str = Field(..., min_length=2, max_length=120)
    learner_type: str = Field(..., min_length=2, max_length=120)
    message: str = Field(..., min_length=10, max_length=3000)

    @field_validator("first_name", "last_name", "phone", "interest", "learner_type", "message", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        if value is None:
            return value
        return value.strip()


class ContactSubmissionResponse(BaseModel):
    success: bool
    message: str
