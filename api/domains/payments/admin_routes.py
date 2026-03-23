#!/usr/bin/python3
"""
Admin payment routes — REST endpoints for transaction management.

All endpoints require ADMIN role.

Endpoints:
  GET    /admin/payments/transactions             — List / filter / search transactions
  GET    /admin/payments/transactions/{id}         — Transaction detail + audit trail
  POST   /admin/payments/transactions/{id}/resolve — Resolve (mark_completed, retry, cancel, mark_failed)
  POST   /admin/payments/manual                    — Record cash / manual payment
  POST   /admin/payments/split/configure           — Configure a split payment plan
  POST   /admin/payments/split/record              — Record a split instalment
  POST   /admin/payments/transactions/{id}/receipt  — Email receipt to customer
  GET    /admin/payments/transactions/{id}/receipt  — Get receipt data (JSON)
  POST   /admin/payments/reminder                  — Send payment reminder email
  GET    /admin/payments/export                    — Export CSV of transactions
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user, get_db_session
from domains.payments.admin_service import AdminPaymentService
from domains.users.models.user import UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/payments", tags=["admin-payments"])


# ── Shared ───────────────────────────────────────────────────────

def _require_admin(user: dict):
    if user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )


def _service(db: AsyncSession, user: dict) -> AdminPaymentService:
    return AdminPaymentService(db, user)


# ── Lookups (user by email, enrollments by email) ────────────

@router.get("/lookup/user")
async def lookup_user_by_email(
    email: str = Query(..., description="User email to look up"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Look up a user by email address. Returns user_id, email, full_name."""
    _require_admin(current_user)
    svc = _service(db, current_user)
    try:
        return await svc.lookup_user_by_email(email)
    except Exception as e:
        if hasattr(e, "status_code"):
            raise HTTPException(status_code=e.status_code, detail=str(e))
        logger.error("Error looking up user: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/lookup/enrollments")
async def lookup_enrollments_by_email(
    email: str = Query(..., description="User email to look up enrollments for"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Look up all enrollments for a user by email. Returns user info + enrollments list."""
    _require_admin(current_user)
    svc = _service(db, current_user)
    try:
        return await svc.lookup_enrollments_by_email(email)
    except Exception as e:
        if hasattr(e, "status_code"):
            raise HTTPException(status_code=e.status_code, detail=str(e))
        logger.error("Error looking up enrollments: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


# ── List transactions ────────────────────────────────────────────

@router.get("/transactions")
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    course_id: Optional[int] = Query(None),
    payment_method: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List all transactions with optional filtering, search, and pagination."""
    _require_admin(current_user)
    svc = _service(db, current_user)
    return await svc.list_transactions(
        page=page,
        page_size=page_size,
        status=status_filter,
        course_id=course_id,
        payment_method=payment_method,
        search=search,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order,
    )


# ── Transaction detail ──────────────────────────────────────────

@router.get("/transactions/{payment_id}")
async def get_transaction_detail(
    payment_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get full transaction details with audit trail and payment history."""
    _require_admin(current_user)
    svc = _service(db, current_user)
    try:
        return await svc.get_transaction_detail(payment_id)
    except Exception as e:
        if hasattr(e, "status_code"):
            raise HTTPException(status_code=e.status_code, detail=str(e))
        logger.error("Error getting transaction detail: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


# ── Resolve payment ──────────────────────────────────────────────

@router.post("/transactions/{payment_id}/resolve")
async def resolve_payment(
    payment_id: int,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Resolve a payment status. Body must include:
      - action: one of "mark_completed", "retry", "cancel", "mark_failed"
      - note: admin note (required for mark_completed)
    """
    _require_admin(current_user)
    action = body.get("action")
    note = body.get("note", "")
    if not action:
        raise HTTPException(status_code=400, detail="action is required")
    svc = _service(db, current_user)
    try:
        return await svc.resolve_payment(payment_id, action, note)
    except Exception as e:
        if hasattr(e, "status_code"):
            raise HTTPException(status_code=e.status_code, detail=str(e))
        logger.error("Error resolving payment: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


# ── Manual / cash payment ────────────────────────────────────────

@router.post("/manual")
async def record_manual_payment(
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Record a manual / cash payment and activate enrollment. Body:
      - user_email OR user_id (one required), course_id (required), amount (required)
      - payment_method, note, path_id (optional)
    """
    _require_admin(current_user)
    if "user_email" not in body and "user_id" not in body:
        raise HTTPException(status_code=400, detail="user_email or user_id is required")
    for field in ["course_id", "amount"]:
        if field not in body:
            raise HTTPException(status_code=400, detail=f"{field} is required")
    svc = _service(db, current_user)
    try:
        return await svc.record_manual_payment(
            user_id=body.get("user_id"),
            user_email=body.get("user_email"),
            course_id=body["course_id"],
            amount=body["amount"],
            payment_method=body.get("payment_method", "cash"),
            note=body.get("note", ""),
            path_id=body.get("path_id"),
        )
    except Exception as e:
        if hasattr(e, "status_code"):
            raise HTTPException(status_code=e.status_code, detail=str(e))
        logger.error("Error recording manual payment: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


# ── Split payment configuration ─────────────────────────────────

@router.post("/split/configure")
async def configure_split_payment(
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Configure a split payment plan. Body:
      - enrollment_id, total_amount, initial_amount (required)
      - note (optional)
    """
    _require_admin(current_user)
    for field in ["enrollment_id", "total_amount", "initial_amount"]:
        if field not in body:
            raise HTTPException(status_code=400, detail=f"{field} is required")
    svc = _service(db, current_user)
    try:
        return await svc.configure_split_payment(
            enrollment_id=body["enrollment_id"],
            total_amount=body["total_amount"],
            initial_amount=body["initial_amount"],
            note=body.get("note", ""),
        )
    except Exception as e:
        if hasattr(e, "status_code"):
            raise HTTPException(status_code=e.status_code, detail=str(e))
        logger.error("Error configuring split payment: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/split/record")
async def record_split_payment(
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Record a split instalment payment. Body:
      - enrollment_id, amount (required)
      - payment_method, note (optional)
    """
    _require_admin(current_user)
    for field in ["enrollment_id", "amount"]:
        if field not in body:
            raise HTTPException(status_code=400, detail=f"{field} is required")
    svc = _service(db, current_user)
    try:
        return await svc.record_split_payment(
            enrollment_id=body["enrollment_id"],
            amount=body["amount"],
            payment_method=body.get("payment_method", "cash"),
            note=body.get("note", ""),
        )
    except Exception as e:
        if hasattr(e, "status_code"):
            raise HTTPException(status_code=e.status_code, detail=str(e))
        logger.error("Error recording split payment: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


# ── Receipt ──────────────────────────────────────────────────────

@router.get("/transactions/{payment_id}/receipt")
async def get_receipt_data(
    payment_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get receipt data for a specific transaction (JSON)."""
    _require_admin(current_user)
    svc = _service(db, current_user)
    try:
        return await svc.get_receipt_data(payment_id)
    except Exception as e:
        if hasattr(e, "status_code"):
            raise HTTPException(status_code=e.status_code, detail=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/transactions/{payment_id}/receipt")
async def send_receipt_email(
    payment_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Send the receipt as an email to the customer."""
    _require_admin(current_user)
    svc = _service(db, current_user)
    try:
        return await svc.send_receipt_email(payment_id)
    except Exception as e:
        if hasattr(e, "status_code"):
            raise HTTPException(status_code=e.status_code, detail=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


# ── Reminder ─────────────────────────────────────────────────────

@router.post("/reminder")
async def send_payment_reminder(
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Send a payment reminder email. Body:
      - enrollment_id (required)
      - custom_message, deadline (optional)
    """
    _require_admin(current_user)
    if "enrollment_id" not in body:
        raise HTTPException(status_code=400, detail="enrollment_id is required")
    svc = _service(db, current_user)
    try:
        return await svc.send_payment_reminder(
            enrollment_id=body["enrollment_id"],
            custom_message=body.get("custom_message"),
            deadline=body.get("deadline"),
        )
    except Exception as e:
        if hasattr(e, "status_code"):
            raise HTTPException(status_code=e.status_code, detail=str(e))
        logger.error("Error sending reminder: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


# ── Export ───────────────────────────────────────────────────────

@router.get("/export")
async def export_transactions_csv(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Export transactions to CSV."""
    _require_admin(current_user)
    svc = _service(db, current_user)
    csv_str = await svc.export_transactions_csv(status=status_filter)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )
