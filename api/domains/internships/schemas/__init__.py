#!/usr/bin/python3
"""Internship schemas package."""
from .internship_schema import (
    CreateProfileRequest,
    UpdateProfileRequest,
    UploadDocumentsRequest,
    SelectTrackRequest,
    InternshipApplicationResponse,
    InternshipTrackResponse,
)

__all__ = [
    "CreateProfileRequest",
    "UpdateProfileRequest",
    "UploadDocumentsRequest",
    "SelectTrackRequest",
    "InternshipApplicationResponse",
    "InternshipTrackResponse",
]
