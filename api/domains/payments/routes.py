#!/usr/bin/python3
"""
Payment routes — REST endpoints for the Nomba payment flow.

Endpoints:
  POST /payments/initiate           — Start a payment for course enrollment
  POST /payments/verify             — Server-side verification after redirect
  POST /payments/retry              — Retry a failed payment
  POST /payments/webhook            — Nomba webhook receiver (no auth)
  GET  /payments/status/{reference} — Check payment status
  GET  /payments/enrollment/{id}    — Get all payments for an enrollment
  GET  /payments/pending/{course_id}— Check for pending enrollment
"""
import logging
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user, get_db_session
from domains.payments.schemas import (
    InitiatePaymentRequest,
    VerifyPaymentRequest,
    RetryPaymentRequest,
    PaymentInitiatedResponse,
    PaymentVerificationResponse,
    PaymentStatusResponse,
    EnrollmentPaymentInfo,
    WebhookResponse,
)
from domains.payments.service import PaymentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


# ─── Initiate Payment ─────────────────────────────────────────

@router.post("/initiate", response_model=PaymentInitiatedResponse)
async def initiate_payment(
    body: InitiatePaymentRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Initiate a Nomba payment for a paid course enrollment.
    Creates a pending enrollment + payment record, returns checkout link.
    """
    service = PaymentService(db)
    result = await service.initiate_payment(
        user_id=current_user["user_id"],
        user_email=current_user["email"],
        user_name=current_user.get("full_name"),
        course_id=body.course_id,
        path_id=body.path_id,
    )
    return result


# ─── Verify Payment ───────────────────────────────────────────

@router.post("/verify", response_model=PaymentVerificationResponse)
async def verify_payment(
    body: VerifyPaymentRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Verify a payment server-side after the user returns from Nomba checkout.
    Never trust the frontend — always verify with Nomba API.
    """
    service = PaymentService(db)
    result = await service.verify_payment(reference=body.reference)
    return result


# ─── Retry Payment ────────────────────────────────────────────

@router.post("/retry", response_model=PaymentInitiatedResponse)
async def retry_payment(
    body: RetryPaymentRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Retry a failed payment for an existing pending enrollment.
    Creates a new payment reference linked to the same enrollment.
    """
    service = PaymentService(db)
    result = await service.retry_payment(
        enrollment_id=body.enrollment_id,
        user_id=current_user["user_id"],
        user_email=current_user["email"],
        user_name=current_user.get("full_name"),
    )
    return result


# ─── Nomba Webhook ────────────────────────────────────────────

@router.post("/webhook", response_model=WebhookResponse)
async def payment_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Receive and process Nomba payment webhooks.
    No authentication — signature verification is done in the service.
    """
    try:
        payload = await request.body()
        signature = request.headers.get("x-nomba-signature", "")

        service = PaymentService(db)
        result = await service.process_webhook(payload=payload, signature=signature)

        logger.info("Webhook processed: %s", result)
        return WebhookResponse(
            status="received",
            message=f"Webhook processed: {result.get('status', 'ok')}",
        )
    except Exception as e:
        logger.error("Webhook processing error: %s", str(e))
        # Always return 200 to Nomba to prevent retries for invalid payloads
        return WebhookResponse(
            status="error",
            message="Webhook received but processing failed",
        )


# ─── Payment Status ───────────────────────────────────────────

@router.get("/status/{reference}")
async def get_payment_status(
    reference: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get the current status of a payment by reference."""
    service = PaymentService(db)
    return await service.get_payment_status(
        reference=reference, user_id=current_user["user_id"]
    )


# ─── Enrollment Payment History ────────────────────────────────

@router.get("/enrollment/{enrollment_id}")
async def get_enrollment_payments(
    enrollment_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get all payment attempts for an enrollment (audit trail)."""
    service = PaymentService(db)
    return await service.get_enrollment_payments(
        enrollment_id=enrollment_id, user_id=current_user["user_id"]
    )


# ─── Check Pending Enrollment ─────────────────────────────────

@router.get("/pending/{course_id}")
async def get_pending_enrollment(
    course_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Check if the user has a pending-payment enrollment for a course."""
    service = PaymentService(db)
    result = await service.get_pending_enrollment(
        user_id=current_user["user_id"], course_id=course_id
    )
    if not result:
        return {"pending": False}
    return {"pending": True, **result}
