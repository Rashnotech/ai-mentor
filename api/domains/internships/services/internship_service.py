#!/usr/bin/python3
"""
Internship application service.
Business logic for managing internship applications, validation, and email notifications.
"""
import logging
from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from domains.internships.models.internship import (
    InternshipApplication,
    ApplicationStatus,
    VerificationStatus,
    IDType,
)
from domains.internships.schemas.internship_schema import (
    CreateProfileRequest,
    UpdateProfileRequest,
    UploadDocumentsRequest,
    SelectTrackRequest,
    InternshipApplicationResponse,
    InternshipTrackResponse,
)
from domains.courses.models.course import Course
from domains.mailings.services.email_service import EmailService
from core.errors import AppError

logger = logging.getLogger(__name__)


class InternshipService:
    """Service for managing internship applications."""

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.email_service = EmailService()

    async def create_application(
        self, request: CreateProfileRequest
    ) -> InternshipApplicationResponse:
        """
        Create a new internship application profile (Step 1).
        
        Args:
            request: Profile creation request with validated data
            
        Returns:
            Created application response
            
        Raises:
            AppError: If email already exists or creation fails
        """
        try:
            # Check if email already exists
            stmt = select(InternshipApplication).where(
                InternshipApplication.email == request.email
            )
            result = await self.db_session.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                raise AppError(
                    status_code=409,
                    detail=f"An application with email {request.email} already exists",
                    error_code="EMAIL_EXISTS",
                )

            # Create new application
            application = InternshipApplication(
                email=request.email,
                first_name=request.first_name,
                last_name=request.last_name,
                telephone=request.telephone,
                hear_about_us=request.hear_about_us,
                country=request.country,
                state=request.state,
                institution_type=request.institution_type,
                status=ApplicationStatus.DRAFT,
            )

            self.db_session.add(application)
            await self.db_session.commit()
            await self.db_session.refresh(application)

            logger.info(f"Created internship application {application.application_id} for {request.email}")

            return self._to_response(application)

        except IntegrityError:
            await self.db_session.rollback()
            raise AppError(
                status_code=409,
                detail="An application with this email already exists",
                error_code="EMAIL_EXISTS",
            )
        except AppError:
            await self.db_session.rollback()
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating application: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Failed to create application",
                error_code="APPLICATION_CREATION_ERROR",
            )

    async def update_application(
        self, application_id: int, request: UpdateProfileRequest
    ) -> InternshipApplicationResponse:
        """
        Update an existing internship application profile.
        
        Args:
            application_id: Application ID
            request: Update request with optional fields
            
        Returns:
            Updated application response
            
        Raises:
            AppError: If application not found or update fails
        """
        try:
            application = await self._get_application_by_id(application_id)

            # Update only provided fields
            update_data = request.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(application, field, value)

            await self.db_session.commit()
            await self.db_session.refresh(application)

            logger.info(f"Updated internship application {application_id}")

            return self._to_response(application)

        except AppError:
            await self.db_session.rollback()
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error updating application {application_id}: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Failed to update application",
                error_code="APPLICATION_UPDATE_ERROR",
            )

    async def upload_documents(
        self, application_id: int, request: UploadDocumentsRequest
    ) -> InternshipApplicationResponse:
        """
        Upload verification documents (Step 2).
        
        Args:
            application_id: Application ID
            request: Document URLs and metadata
            
        Returns:
            Updated application response
            
        Raises:
            AppError: If application not found or upload fails
        """
        try:
            application = await self._get_application_by_id(application_id)

            # Update document URLs
            if request.it_letter_url:
                application.it_letter_url = request.it_letter_url
            if request.admission_letter_url:
                application.admission_letter_url = request.admission_letter_url
            if request.id_card_url:
                application.id_card_url = request.id_card_url
            if request.id_type:
                application.id_type = IDType(request.id_type)

            await self.db_session.commit()
            await self.db_session.refresh(application)

            logger.info(f"Updated documents for application {application_id}")

            return self._to_response(application)

        except AppError:
            await self.db_session.rollback()
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error uploading documents for application {application_id}: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Failed to upload documents",
                error_code="DOCUMENT_UPLOAD_ERROR",
            )

    async def select_track(
        self, application_id: int, request: SelectTrackRequest
    ) -> InternshipApplicationResponse:
        """
        Select learning track and submit application (Step 3).
        Automatically sends acknowledgment email.
        
        Args:
            application_id: Application ID
            request: Track selection request
            
        Returns:
            Updated application response with submitted status
            
        Raises:
            AppError: If application not found, course invalid, or submission fails
        """
        try:
            application = await self._get_application_by_id(application_id)

            # Validate course if provided
            if request.course_id:
                course = await self._get_course_by_id(request.course_id)
                if not course:
                    raise AppError(
                        status_code=404,
                        detail=f"Course {request.course_id} not found",
                        error_code="COURSE_NOT_FOUND",
                    )

            # Update track and course
            application.selected_track = request.selected_track
            application.course_id = request.course_id
            
            # Mark as submitted
            application.status = ApplicationStatus.SUBMITTED
            application.submitted_at = datetime.utcnow()

            await self.db_session.commit()
            await self.db_session.refresh(application)

            # Send acknowledgment email
            email_sent = await self._send_acknowledgment_email(application)
            if email_sent:
                application.acknowledgment_sent = True
                await self.db_session.commit()
                await self.db_session.refresh(application)

            logger.info(
                f"Application {application_id} submitted with track {request.selected_track}, "
                f"email sent: {email_sent}"
            )

            return self._to_response(application)

        except AppError:
            await self.db_session.rollback()
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error selecting track for application {application_id}: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Failed to submit application",
                error_code="APPLICATION_SUBMISSION_ERROR",
            )

    async def get_application(self, application_id: int) -> InternshipApplicationResponse:
        """
        Get application by ID.
        
        Args:
            application_id: Application ID
            
        Returns:
            Application response
            
        Raises:
            AppError: If application not found
        """
        application = await self._get_application_by_id(application_id)
        return self._to_response(application)

    async def get_application_by_email(self, email: str) -> Optional[InternshipApplicationResponse]:
        """
        Get application by email.
        
        Args:
            email: Applicant email
            
        Returns:
            Application response or None if not found
        """
        stmt = select(InternshipApplication).where(InternshipApplication.email == email)
        result = await self.db_session.execute(stmt)
        application = result.scalar_one_or_none()

        if not application:
            return None

        return self._to_response(application)

    async def get_available_tracks(self) -> List[InternshipTrackResponse]:
        """
        Get available internship tracks with associated courses from backend.
        
        Returns:
            List of tracks with courses
        """
        # Get all active courses
        stmt = select(Course).where(Course.is_active == True)
        result = await self.db_session.execute(stmt)
        courses = result.scalars().all()

        # Define tracks with their metadata
        tracks_metadata = [
            {
                "track_id": "frontend",
                "track_name": "Frontend Development",
                "description": "Build responsive web interfaces with modern UI patterns.",
                "level": "Beginner to Intermediate",
            },
            {
                "track_id": "backend",
                "track_name": "Backend Development",
                "description": "Design APIs, authentication, and reliable server workflows.",
                "level": "Intermediate",
            },
            {
                "track_id": "fullstack",
                "track_name": "Fullstack Engineering",
                "description": "Combine frontend and backend skills to ship end-to-end products.",
                "level": "Intermediate",
            },
            {
                "track_id": "ai-engineering",
                "track_name": "AI Engineering",
                "description": "Work on AI-powered features, prompting, and model integration.",
                "level": "Intermediate to Advanced",
            },
            {
                "track_id": "product-design",
                "track_name": "Product Design",
                "description": "Design usable flows, wireframes, and polished product interfaces.",
                "level": "Beginner to Intermediate",
            },
            {
                "track_id": "data-analytics",
                "track_name": "Data Analytics",
                "description": "Analyze data, build dashboards, and generate practical insights.",
                "level": "Beginner to Intermediate",
            },
        ]

        # Convert courses to simple dict format
        course_list = [
            {
                "course_id": course.course_id,
                "title": course.title,
                "description": course.description,
            }
            for course in courses
        ]

        # Build track responses
        tracks = []
        for track_meta in tracks_metadata:
            tracks.append(
                InternshipTrackResponse(
                    track_id=track_meta["track_id"],
                    track_name=track_meta["track_name"],
                    description=track_meta["description"],
                    level=track_meta["level"],
                    courses=course_list,  # All tracks get same course list for now
                )
            )

        return tracks

    # ====================================================================
    # Private helper methods
    # ====================================================================

    async def _get_application_by_id(self, application_id: int) -> InternshipApplication:
        """Get application by ID or raise error."""
        stmt = select(InternshipApplication).where(
            InternshipApplication.application_id == application_id
        )
        result = await self.db_session.execute(stmt)
        application = result.scalar_one_or_none()

        if not application:
            raise AppError(
                status_code=404,
                detail=f"Application {application_id} not found",
                error_code="APPLICATION_NOT_FOUND",
            )

        return application

    async def _get_course_by_id(self, course_id: int) -> Optional[Course]:
        """Get course by ID."""
        stmt = select(Course).where(Course.course_id == course_id, Course.is_active == True)
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def _send_acknowledgment_email(self, application: InternshipApplication) -> bool:
        """Send acknowledgment email to applicant."""
        try:
            subject = "Application Received - AI Mentor Internship Program"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Thank You for Applying!</h2>
                
                <p>Dear {application.first_name} {application.last_name},</p>
                
                <p>We have successfully received your internship application for the <strong>{application.selected_track.replace('-', ' ').title()}</strong> track.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Application Details:</h3>
                    <p><strong>Application ID:</strong> {application.application_id}</p>
                    <p><strong>Email:</strong> {application.email}</p>
                    <p><strong>Selected Track:</strong> {application.selected_track.replace('-', ' ').title()}</p>
                    <p><strong>Submitted:</strong> {application.submitted_at.strftime('%B %d, %Y at %I:%M %p UTC') if application.submitted_at else 'N/A'}</p>
                </div>
                
                <h3>What's Next?</h3>
                <ol>
                    <li>Our team will review your submitted documents</li>
                    <li>We'll verify your student status and eligibility</li>
                    <li>You'll receive an email with the acceptance decision within 3-5 business days</li>
                </ol>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    If you have any questions, feel free to reply to this email.
                </p>
                
                <p>Best regards,<br>
                <strong>The AI Mentor Team</strong></p>
            </div>
            """
            
            text_content = f"""
            Thank You for Applying!
            
            Dear {application.first_name} {application.last_name},
            
            We have successfully received your internship application for the {application.selected_track.replace('-', ' ').title()} track.
            
            Application Details:
            - Application ID: {application.application_id}
            - Email: {application.email}
            - Selected Track: {application.selected_track.replace('-', ' ').title()}
            - Submitted: {application.submitted_at.strftime('%B %d, %Y at %I:%M %p UTC') if application.submitted_at else 'N/A'}
            
            What's Next?
            1. Our team will review your submitted documents
            2. We'll verify your student status and eligibility
            3. You'll receive an email with the acceptance decision within 3-5 business days
            
            If you have any questions, feel free to reply to this email.
            
            Best regards,
            The AI Mentor Team
            """

            success = await self.email_service._send_email(
                to_email=application.email,
                to_name=f"{application.first_name} {application.last_name}",
                subject=subject,
                html_content=html_content,
                text_content=text_content,
            )

            return success

        except Exception as e:
            logger.error(f"Error sending acknowledgment email to {application.email}: {str(e)}")
            return False

    def _to_response(self, application: InternshipApplication) -> InternshipApplicationResponse:
        """Convert application model to response schema."""
        return InternshipApplicationResponse(
            application_id=application.application_id,
            email=application.email,
            first_name=application.first_name,
            last_name=application.last_name,
            telephone=application.telephone,
            hear_about_us=application.hear_about_us,
            country=application.country,
            state=application.state,
            institution_type=application.institution_type,
            it_letter_url=application.it_letter_url,
            admission_letter_url=application.admission_letter_url,
            id_card_url=application.id_card_url,
            id_type=application.id_type.value if application.id_type else None,
            verification_status=application.verification_status.value,
            selected_track=application.selected_track,
            course_id=application.course_id,
            status=application.status.value,
            acknowledgment_sent=application.acknowledgment_sent,
            created_at=application.created_at.isoformat(),
            updated_at=application.updated_at.isoformat(),
            submitted_at=application.submitted_at.isoformat() if application.submitted_at else None,
        )
