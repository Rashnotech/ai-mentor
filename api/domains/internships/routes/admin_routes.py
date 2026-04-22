#!/usr/bin/python3
"""
Admin routes for managing internship applications.
Protected endpoints requiring admin authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import List, Optional
from datetime import datetime
import logging

from auth.dependencies import get_db_session, get_current_user
from domains.users.models.user import User
from domains.internships.models.internship import (
    InternshipApplication,
    ApplicationStatus,
    VerificationStatus,
)
from domains.internships.schemas.internship_schema import InternshipApplicationResponse
from domains.mailings.services.email_service import EmailService
from core.errors import AppError
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/internships", tags=["admin-internships"])


# Request/Response Schemas
class ApproveApplicationRequest(BaseModel):
    """Request to approve an application."""
    admin_notes: Optional[str] = Field(None, description="Optional admin notes")


class RejectApplicationRequest(BaseModel):
    """Request to reject an application."""
    rejection_reason: str = Field(..., min_length=10, description="Reason for rejection (required)")
    admin_notes: Optional[str] = Field(None, description="Optional internal admin notes")


class InternshipApplicationAdminResponse(InternshipApplicationResponse):
    """Extended response with admin fields."""
    verification_notes: Optional[str]
    admin_notes: Optional[str]
    reviewed_by: Optional[str]
    reviewed_at: Optional[str]


class InternshipApplicationsListResponse(BaseModel):
    """Paginated list of applications."""
    applications: List[InternshipApplicationAdminResponse]
    total: int
    limit: int
    offset: int


# Dependency: Require admin role
async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is an admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.get(
    "/applications",
    response_model=InternshipApplicationsListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all internship applications (Admin)",
    description="Get paginated list of internship applications with search and filtering",
)
async def list_applications(
    search: Optional[str] = Query(None, description="Search by name, email, or track"),
    status_filter: Optional[str] = Query(None, description="Filter by status: submitted, approved, rejected, etc."),
    verification_status: Optional[str] = Query(None, description="Filter by verification: pending, verified, rejected"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_admin),
):
    """
    List all internship applications with filtering and search.
    
    **Query Parameters:**
    - search: Search in name, email, or selected track
    - status_filter: Filter by application status (submitted, approved, rejected, etc.)
    - verification_status: Filter by document verification status
    - limit: Results per page (1-100, default 20)
    - offset: Pagination offset
    
    **Returns:**
    - Paginated list of applications with admin details
    
    **Admin Only:** Requires admin role
    """
    try:
        # Build base query
        stmt = select(InternshipApplication)
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            stmt = stmt.where(
                or_(
                    InternshipApplication.email.ilike(search_term),
                    InternshipApplication.first_name.ilike(search_term),
                    InternshipApplication.last_name.ilike(search_term),
                    InternshipApplication.selected_track.ilike(search_term),
                )
            )
        
        # Apply status filter
        if status_filter:
            try:
                status_enum = ApplicationStatus(status_filter.lower())
                stmt = stmt.where(InternshipApplication.status == status_enum)
            except ValueError:
                pass  # Invalid status, ignore filter
        
        # Apply verification status filter
        if verification_status:
            try:
                ver_status_enum = VerificationStatus(verification_status.lower())
                stmt = stmt.where(InternshipApplication.verification_status == ver_status_enum)
            except ValueError:
                pass  # Invalid status, ignore filter
        
        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db_session.execute(count_stmt)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering
        stmt = stmt.order_by(InternshipApplication.created_at.desc()).offset(offset).limit(limit)
        
        # Execute query
        result = await db_session.execute(stmt)
        applications = result.scalars().all()
        
        # Convert to response format
        response_apps = [
            InternshipApplicationAdminResponse(
                application_id=app.application_id,
                email=app.email,
                first_name=app.first_name,
                last_name=app.last_name,
                telephone=app.telephone,
                hear_about_us=app.hear_about_us,
                country=app.country,
                state=app.state,
                institution_type=app.institution_type,
                it_letter_url=app.it_letter_url,
                admission_letter_url=app.admission_letter_url,
                id_card_url=app.id_card_url,
                id_type=app.id_type.value if app.id_type else None,
                verification_status=app.verification_status.value,
                verification_notes=app.verification_notes,
                selected_track=app.selected_track,
                course_id=app.course_id,
                status=app.status.value,
                acknowledgment_sent=app.acknowledgment_sent,
                admin_notes=app.admin_notes,
                reviewed_by=app.reviewed_by,
                reviewed_at=app.reviewed_at.isoformat() if app.reviewed_at else None,
                created_at=app.created_at.isoformat(),
                updated_at=app.updated_at.isoformat(),
                submitted_at=app.submitted_at.isoformat() if app.submitted_at else None,
            )
            for app in applications
        ]
        
        return InternshipApplicationsListResponse(
            applications=response_apps,
            total=total,
            limit=limit,
            offset=offset,
        )
        
    except Exception as e:
        logger.error(f"Error listing applications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list applications",
        )


@router.post(
    "/applications/{application_id}/approve",
    response_model=InternshipApplicationAdminResponse,
    status_code=status.HTTP_200_OK,
    summary="Approve internship application (Admin)",
    description="Approve an application and send approval email to candidate",
)
async def approve_application(
    application_id: int,
    request: ApproveApplicationRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_admin),
):
    """
    Approve an internship application.
    
    **Path Parameters:**
    - application_id: Application ID
    
    **Request Body:**
    - admin_notes: Optional internal notes (optional)
    
    **Side Effects:**
    - Changes status to "approved"
    - Sets reviewed_by to current admin's user_id
    - Sets reviewed_at timestamp
    - Sends approval email to candidate
    - Sets acceptance_sent flag
    
    **Returns:**
    - Updated application with approval details
    
    **Admin Only:** Requires admin role
    """
    try:
        current_admin_id = current_user.get("user_id")

        # Get application
        stmt = select(InternshipApplication).where(
            InternshipApplication.application_id == application_id
        )
        result = await db_session.execute(stmt)
        application = result.scalar_one_or_none()
        
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Application {application_id} not found",
            )
        
        # Update application
        application.status = ApplicationStatus.APPROVED
        application.verification_status = VerificationStatus.VERIFIED
        application.reviewed_by = current_admin_id
        application.reviewed_at = datetime.utcnow()
        if request.admin_notes:
            application.admin_notes = request.admin_notes
        
        await db_session.commit()
        await db_session.refresh(application)
        
        # Send approval email
        email_service = EmailService()
        email_sent = await _send_approval_email(
            email_service,
            application,
            feedback=request.admin_notes,
        )
        
        if email_sent:
            application.acceptance_sent = True
            await db_session.commit()
            await db_session.refresh(application)
        
        logger.info(
            f"Application {application_id} approved by admin {current_admin_id}, "
            f"email sent: {email_sent}"
        )
        
        return _to_admin_response(application)
        
    except HTTPException:
        await db_session.rollback()
        raise
    except Exception as e:
        await db_session.rollback()
        logger.error(f"Error approving application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve application",
        )


@router.post(
    "/applications/{application_id}/reject",
    response_model=InternshipApplicationAdminResponse,
    status_code=status.HTTP_200_OK,
    summary="Reject internship application (Admin)",
    description="Reject an application with reason and send rejection email",
)
async def reject_application(
    application_id: int,
    request: RejectApplicationRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_admin),
):
    """
    Reject an internship application.
    
    **Path Parameters:**
    - application_id: Application ID
    
    **Request Body:**
    - rejection_reason: Reason for rejection (required, min 10 chars)
    - admin_notes: Optional internal notes
    
    **Side Effects:**
    - Changes status to "rejected"
    - Stores rejection reason in verification_notes
    - Sets reviewed_by to current admin's user_id
    - Sets reviewed_at timestamp
    - Sends rejection email to candidate with reason
    
    **Returns:**
    - Updated application with rejection details
    
    **Admin Only:** Requires admin role
    """
    try:
        current_admin_id = current_user.get("user_id")

        # Get application
        stmt = select(InternshipApplication).where(
            InternshipApplication.application_id == application_id
        )
        result = await db_session.execute(stmt)
        application = result.scalar_one_or_none()
        
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Application {application_id} not found",
            )
        
        # Update application
        application.status = ApplicationStatus.REJECTED
        application.verification_status = VerificationStatus.REJECTED
        application.verification_notes = request.rejection_reason
        application.reviewed_by = current_admin_id
        application.reviewed_at = datetime.utcnow()
        if request.admin_notes:
            application.admin_notes = request.admin_notes
        
        await db_session.commit()
        await db_session.refresh(application)
        
        # Send rejection email
        email_service = EmailService()
        email_sent = await _send_rejection_email(
            email_service,
            application,
            rejection_reason=request.rejection_reason,
            feedback=request.admin_notes,
        )
        
        logger.info(
            f"Application {application_id} rejected by admin {current_admin_id}, "
            f"email sent: {email_sent}"
        )
        
        return _to_admin_response(application)
        
    except HTTPException:
        await db_session.rollback()
        raise
    except Exception as e:
        await db_session.rollback()
        logger.error(f"Error rejecting application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject application",
        )


@router.delete(
    "/applications/{application_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete internship application (Admin)",
    description="Permanently delete an internship application",
)
async def delete_application(
    application_id: int,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_admin),
):
    """
    Delete an internship application.

    **Path Parameters:**
    - application_id: Application ID

    **Side Effects:**
    - Permanently removes the application record from the database

    **Returns:**
    - 204 No Content on successful deletion

    **Admin Only:** Requires admin role
    """
    try:
        current_admin_id = current_user.get("user_id")

        stmt = select(InternshipApplication).where(
            InternshipApplication.application_id == application_id
        )
        result = await db_session.execute(stmt)
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Application {application_id} not found",
            )

        await db_session.delete(application)
        await db_session.commit()

        logger.info(
            f"Application {application_id} deleted by admin {current_admin_id}"
        )

        return None

    except HTTPException:
        await db_session.rollback()
        raise
    except Exception as e:
        await db_session.rollback()
        logger.error(f"Error deleting application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete application",
        )


# ====================================================================
# Helper Functions
# ====================================================================

async def _send_approval_email(
    email_service: EmailService,
    application: InternshipApplication,
    feedback: Optional[str] = None,
) -> bool:
    """Send approval email to candidate."""
    try:
        subject = "Congratulations! Your Internship Application Has Been Approved 🎉"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px; line-height: 1.6;">Dear {application.first_name} {application.last_name},</p>
                
                <p style="font-size: 16px; line-height: 1.6;">
                    We are thrilled to inform you that your application for the <strong style="color: #2563eb;">{application.selected_track.replace('-', ' ').title()} Internship</strong> 
                    has been <strong style="color: #16a34a;">APPROVED</strong>! 
                </p>
                
                <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 25px 0; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #16a34a;">Application Details:</h3>
                    <p style="margin: 8px 0;"><strong>Application ID:</strong> #{application.application_id}</p>
                    <p style="margin: 8px 0;"><strong>Track:</strong> {application.selected_track.replace('-', ' ').title()}</p>
                    <p style="margin: 8px 0;"><strong>Approval Date:</strong> {application.reviewed_at.strftime('%B %d, %Y') if application.reviewed_at else 'N/A'}</p>
                </div>
                
                <h3 style="color: #1f2937; font-size: 20px;">What's Next?</h3>
                <ol style="font-size: 15px; line-height: 1.8; color: #4b5563;">
                    <li>Check your email for your internship onboarding package</li>
                    <li>Complete the required onboarding forms within 3 days</li>
                    <li>Join our intern orientation session (details coming soon)</li>
                    <li>Get access to your learning materials and mentorship program</li>
                </ol>

                {f'''
                <div style="background-color: #ecfeff; border-left: 4px solid #0891b2; padding: 20px; margin-top: 20px; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #0e7490;">Feedback from Review Team</h3>
                    <p style="margin: 0; font-size: 15px; color: #155e75; line-height: 1.6;">{feedback}</p>
                </div>
                ''' if feedback else ''}
                
                <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-top: 25px;">
                    <p style="margin: 0; font-size: 14px; color: #1e40af;">
                        <strong>Important:</strong> Please respond to this email within 48 hours to confirm your acceptance. 
                        If we don't hear from you, we may need to offer your spot to another candidate.
                    </p>
                </div>
                
                <p style="font-size: 15px; line-height: 1.6; margin-top: 25px;">
                    We're excited to have you join our internship program and look forward to supporting your professional growth!
                </p>
                
                <p style="font-size: 15px; line-height: 1.6;">
                    If you have any questions, please don't hesitate to reach out.
                </p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 15px;">Best regards,</p>
                    <p style="margin: 5px 0; font-size: 15px; font-weight: bold; color: #2563eb;">The AI Mentor Team</p>
                </div>
            </div>
        </div>
        """
        feedback_text = ""
        if feedback:
            feedback_text = f"Feedback from Review Team:\n{feedback}\n"
        
        text_content = f"""
        Congratulations!
        
        Dear {application.first_name} {application.last_name},
        
        We are thrilled to inform you that your application for the {application.selected_track.replace('-', ' ').title()} Internship has been APPROVED!
        
        Application Details:
        - Application ID: #{application.application_id}
        - Track: {application.selected_track.replace('-', ' ').title()}
        - Approval Date: {application.reviewed_at.strftime('%B %d, %Y') if application.reviewed_at else 'N/A'}
        
        What's Next?
        1. Check your email for your internship onboarding package
        2. Complete the required onboarding forms within 3 days
        3. Join our intern orientation session (details coming soon)
        4. Get access to your learning materials and mentorship program

        {feedback_text}
        
        IMPORTANT: Please respond to this email within 48 hours to confirm your acceptance.
        
        We're excited to have you join our internship program and look forward to supporting your professional growth!
        
        Best regards,
        The AI Mentor Team
        """
        
        success = await email_service._send_email(
            to_email=application.email,
            to_name=f"{application.first_name} {application.last_name}",
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )
        
        return success
        
    except Exception as e:
        logger.error(f"Error sending approval email to {application.email}: {str(e)}")
        return False


async def _send_rejection_email(
    email_service: EmailService,
    application: InternshipApplication,
    rejection_reason: str,
    feedback: Optional[str] = None,
) -> bool:
    """Send rejection email to candidate with reason."""
    try:
        subject = "Update on Your Internship Application"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f3f4f6; padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: #1f2937; margin: 0; font-size: 26px;">Application Status Update</h1>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px; line-height: 1.6;">Dear {application.first_name} {application.last_name},</p>
                
                <p style="font-size: 16px; line-height: 1.6;">
                    Thank you for your interest in the <strong>{application.selected_track.replace('-', ' ').title()} Internship</strong> at AI Mentor. 
                    We appreciate the time and effort you put into your application.
                </p>
                
                <p style="font-size: 16px; line-height: 1.6;">
                    After careful review, we regret to inform you that we are unable to move forward with your application at this time.
                </p>
                
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #991b1b;">Feedback:</h3>
                    <p style="margin: 0; font-size: 15px; color: #7f1d1d; line-height: 1.6;">{rejection_reason}</p>
                </div>

                {f'''
                <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #1d4ed8;">Additional Feedback</h3>
                    <p style="margin: 0; font-size: 15px; color: #1e3a8a; line-height: 1.6;">{feedback}</p>
                </div>
                ''' if feedback else ''}
                
                <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-top: 25px;">
                    <h3 style="margin-top: 0; color: #1e40af; font-size: 18px;">Don't Give Up!</h3>
                    <p style="margin: 0; font-size: 15px; color: #1e40af; line-height: 1.6;">
                        We encourage you to:
                    </p>
                    <ul style="font-size: 15px; color: #1e40af; line-height: 1.6; margin-top: 10px;">
                        <li>Address the feedback provided above</li>
                        <li>Consider applying again in the future</li>
                        <li>Explore our free learning resources and courses</li>
                        <li>Connect with us on social media for updates</li>
                    </ul>
                </div>
                
                <p style="font-size: 15px; line-height: 1.6; margin-top: 25px;">
                    We wish you the best in your learning journey and future endeavors. Thank you again for your interest in AI Mentor.
                </p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 15px;">Best regards,</p>
                    <p style="margin: 5px 0; font-size: 15px; font-weight: bold; color: #2563eb;">The AI Mentor Team</p>
                </div>
            </div>
        </div>
        """
        feedback_text = ""

        if feedback:
            feedback_text = f"Additional Feedback:\n{feedback}\n"
        
        text_content = f"""
        Application Status Update
        
        Dear {application.first_name} {application.last_name},
        
        Thank you for your interest in the {application.selected_track.replace('-', ' ').title()} Internship at AI Mentor. 
        We appreciate the time and effort you put into your application.
        
        After careful review, we regret to inform you that we are unable to move forward with your application at this time.
        
        Feedback:
        {rejection_reason}

        {feedback_text}
        
        Don't Give Up!
        We encourage you to:
        - Address the feedback provided above
        - Consider applying again in the future
        - Explore our free learning resources and courses
        - Connect with us on social media for updates
        
        We wish you the best in your learning journey and future endeavors. Thank you again for your interest in AI Mentor.
        
        Best regards,
        The AI Mentor Team
        """
        
        success = await email_service._send_email(
            to_email=application.email,
            to_name=f"{application.first_name} {application.last_name}",
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )
        
        return success
        
    except Exception as e:
        logger.error(f"Error sending rejection email to {application.email}: {str(e)}")
        return False


def _to_admin_response(application: InternshipApplication) -> InternshipApplicationAdminResponse:
    """Convert application to admin response format."""
    return InternshipApplicationAdminResponse(
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
        verification_notes=application.verification_notes,
        selected_track=application.selected_track,
        course_id=application.course_id,
        status=application.status.value,
        acknowledgment_sent=application.acknowledgment_sent,
        admin_notes=application.admin_notes,
        reviewed_by=application.reviewed_by,
        reviewed_at=application.reviewed_at.isoformat() if application.reviewed_at else None,
        created_at=application.created_at.isoformat(),
        updated_at=application.updated_at.isoformat(),
        submitted_at=application.submitted_at.isoformat() if application.submitted_at else None,
    )
