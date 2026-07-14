"""Public contact form endpoint."""

import html
import logging

from fastapi import APIRouter, HTTPException, status

from core.config import settings
from domains.contact.schemas import ContactSubmissionRequest, ContactSubmissionResponse
from domains.mailings.services.email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["contact"])


def _escape(value: str | None) -> str:
    return html.escape(value or "Not provided")


def _format_full_name(payload: ContactSubmissionRequest) -> str:
    return f"{payload.first_name.strip()} {payload.last_name.strip()}".strip()


@router.post("", response_model=ContactSubmissionResponse, status_code=status.HTTP_200_OK)
async def submit_contact_form(payload: ContactSubmissionRequest) -> ContactSubmissionResponse:
    """Send a public contact form submission to Rashnotech."""

    full_name = _format_full_name(payload)
    subject = f"New Rashnotech contact enquiry from {full_name}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin: 0 0 16px;">New Rashnotech contact enquiry</h2>
      <p><strong>Name:</strong> {_escape(full_name)}</p>
      <p><strong>Email:</strong> {_escape(str(payload.email))}</p>
      <p><strong>Phone:</strong> {_escape(payload.phone)}</p>
      <p><strong>Interest:</strong> {_escape(payload.interest)}</p>
      <p><strong>Audience:</strong> {_escape(payload.learner_type)}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">{_escape(payload.message)}</p>
    </div>
    """
    text_content = "\n".join(
        [
            "New Rashnotech contact enquiry",
            f"Name: {full_name}",
            f"Email: {payload.email}",
            f"Phone: {payload.phone or 'Not provided'}",
            f"Interest: {payload.interest}",
            f"Audience: {payload.learner_type}",
            "",
            "Message:",
            payload.message,
        ]
    )

    sent = await email_service._send_email(
        to_email=settings.CONTACT_TO_EMAIL,
        to_name="Rashnotech",
        subject=subject,
        html_content=html_content,
        text_content=text_content,
    )

    if not sent:
        logger.error("Contact form email failed for %s", payload.email)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We could not send your message right now. Please email rashnotech@gmail.com directly.",
        )

    return ContactSubmissionResponse(
        success=True,
        message="Email sent successfully. We will contact you in a few hours.",
    )
