#!/usr/bin/python3
"""
Internship application database models.
"""
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    Enum as SQLEnum,
)
from sqlalchemy.sql import func
from db.base import Base
import enum


class ApplicationStatus(str, enum.Enum):
    """Status of internship application."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    DOCUMENTS_PENDING = "documents_pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class VerificationStatus(str, enum.Enum):
    """Status of document verification."""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class IDType(str, enum.Enum):
    """Type of identification document."""
    SCHOOL_ID = "school-id"
    VOTERS_CARD = "voters-card"
    NIN_SLIP = "nin-slip"


class InternshipApplication(Base):
    """
    Internship application model.
    Stores complete internship application data including profile, documents, and track selection.
    """

    __tablename__ = "internship_applications"

    # Primary key
    application_id = Column(Integer, primary_key=True, autoincrement=True)

    # Personal Information (Step 1: Create Profile)
    email = Column(String(255), nullable=False, unique=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    telephone = Column(String(50), nullable=False)
    
    # Optional referral source
    hear_about_us = Column(String(100), nullable=True)
    
    # Location
    country = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    
    # Institution
    institution_type = Column(String(50), nullable=False)  # university, polytechnic, college
    
    # Document URLs (Step 2: Verification)
    it_letter_url = Column(Text, nullable=True)
    admission_letter_url = Column(Text, nullable=True)
    id_card_url = Column(Text, nullable=True)
    id_type = Column(SQLEnum(IDType), nullable=True)
    
    # Verification status
    verification_status = Column(
        SQLEnum(VerificationStatus),
        default=VerificationStatus.PENDING,
        nullable=False
    )
    verification_notes = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # Track Selection (Step 3: Choose Track)
    selected_track = Column(String(50), nullable=True)  # frontend, backend, fullstack, etc.
    course_id = Column(Integer, nullable=True)  # Reference to selected course from our backend
    
    # Application Status
    status = Column(
        SQLEnum(ApplicationStatus),
        default=ApplicationStatus.DRAFT,
        nullable=False,
        index=True
    )
    
    # Email notifications
    acknowledgment_sent = Column(Boolean, default=False)
    acceptance_sent = Column(Boolean, default=False)
    
    # Admin notes
    admin_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(50), nullable=True)  # Admin user ID
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<InternshipApplication(id={self.application_id}, email='{self.email}', status='{self.status}')>"
