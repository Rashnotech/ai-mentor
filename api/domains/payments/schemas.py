#!/usr/bin/python3
"""Pydantic schemas for payment endpoints."""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class PaymentStatusEnum(str, Enum):
    PENDING = "pending"
    SUCCESSFUL = "successful"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PARTIAL = "partial"


class EnrollmentStatusEnum(str, Enum):
    PENDING_PAYMENT = "pending_payment"
    ACTIVE = "active"
    CANCELLED = "cancelled"


# ─── Request Schemas ───

class InitiatePaymentRequest(BaseModel):
    """Request to initiate a payment for course enrollment."""
    course_id: int = Field(..., description="ID of the course to enroll in")
    path_id: Optional[int] = Field(None, description="Optional specific learning path ID")


class VerifyPaymentRequest(BaseModel):
    """Request to verify a payment by reference."""
    reference: str = Field(..., description="Unique payment reference")


class RetryPaymentRequest(BaseModel):
    """Request to retry a failed payment for an existing enrollment."""
    enrollment_id: int = Field(..., description="ID of the enrollment to retry payment for")


# ─── Response Schemas ───

class PaymentInitiatedResponse(BaseModel):
    """Response after payment initiation - contains Nomba checkout link."""
    enrollment_id: int
    payment_id: int
    reference: str
    amount: float
    currency: str
    checkout_link: str
    status: str = "pending"
    message: str = "Payment initiated successfully. Redirect to checkout."


class PaymentVerificationResponse(BaseModel):
    """Response from payment verification."""
    reference: str
    payment_status: PaymentStatusEnum
    enrollment_status: EnrollmentStatusEnum
    enrollment_id: int
    course_id: int
    amount: float
    currency: str
    message: str
    verified_at: Optional[str] = None
    payment_method: Optional[str] = None
    transaction_reference: Optional[str] = None


class PaymentStatusResponse(BaseModel):
    """Quick payment status check response."""
    reference: str
    payment_status: PaymentStatusEnum
    enrollment_status: EnrollmentStatusEnum
    enrollment_id: int
    course_id: int
    amount: float
    currency: str
    checkout_link: Optional[str] = None
    created_at: str


class PaymentHistoryItem(BaseModel):
    """A single payment record in history."""
    payment_id: int
    reference: str
    amount: float
    currency: str
    status: PaymentStatusEnum
    payment_method: Optional[str] = None
    created_at: str
    verified_at: Optional[str] = None


class EnrollmentPaymentInfo(BaseModel):
    """Enrollment info with payment details."""
    enrollment_id: int
    course_id: int
    enrollment_status: EnrollmentStatusEnum
    payments: list[PaymentHistoryItem]
    latest_checkout_link: Optional[str] = None
    total_attempts: int


class WebhookResponse(BaseModel):
    """Response to webhook calls."""
    status: str = "received"
    message: str = "Webhook processed successfully"


# ─── Nomba Gateway Schemas ───

class CheckoutOrderRequest(BaseModel):
    """Internal schema for Nomba checkout order creation."""
    orderReference: str
    customerEmail: str
    customerName: Optional[str] = None
    callbackUrl: str
    amount: float
    currency: str = "NGN"
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class CheckoutOrderResponse(BaseModel):
    """Internal schema for Nomba checkout order response."""
    checkoutLink: str
    orderReference: str
    amount: float
    status: str = "pending"
    createdAt: Optional[datetime] = None


class WebhookPayload(BaseModel):
    """Internal schema for Nomba webhook payload."""
    event: Optional[str] = None
    data: Dict[str, Any] = {}
    timestamp: Optional[datetime] = None


# ─── Admin Schemas ───

class AdminTransactionListParams(BaseModel):
    """Query parameters for listing transactions."""
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    status: Optional[str] = None
    course_id: Optional[int] = None
    payment_method: Optional[str] = None
    search: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    sort_by: str = "created_at"
    sort_order: str = "desc"


class AdminTransactionItem(BaseModel):
    """Single transaction in admin list."""
    id: int
    reference: str
    enrollment_id: int
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    course_id: int
    course_title: Optional[str] = None
    amount: float
    currency: str
    status: str
    payment_method: Optional[str] = None
    is_split_payment: bool = False
    admin_override_note: Optional[str] = None
    created_at: str
    verified_at: Optional[str] = None
    updated_at: Optional[str] = None


class AdminTransactionListResponse(BaseModel):
    """Paginated response for admin transaction list."""
    transactions: list[AdminTransactionItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: Dict[str, Any]


class AdminTransactionDetailResponse(BaseModel):
    """Full detail of a transaction for admin view."""
    payment: AdminTransactionItem
    enrollment_status: str
    gateway_response: Optional[Dict[str, Any]] = None
    payment_history: list[AdminTransactionItem]
    audit_trail: list[Dict[str, Any]]
    split_info: Optional[Dict[str, Any]] = None


class AdminResolvePaymentRequest(BaseModel):
    """Request to resolve a payment issue."""
    action: str = Field(..., description="mark_completed, retry, cancel, mark_failed")
    note: str = Field(..., min_length=1, description="Reason for this action")


class AdminManualPaymentRequest(BaseModel):
    """Request to record a manual/cash payment."""
    user_id: str = Field(..., description="ID of the user")
    course_id: int = Field(..., description="ID of the course")
    amount: float = Field(..., gt=0)
    payment_method: str = Field(default="cash", description="cash, bank_transfer, manual")
    note: str = Field(default="", description="Admin note")
    path_id: Optional[int] = None


class AdminSplitPaymentConfigRequest(BaseModel):
    """Configure a split payment for an enrollment."""
    enrollment_id: int
    total_amount: float = Field(..., gt=0)
    initial_amount: float = Field(..., gt=0)
    note: str = Field(default="")


class AdminSplitPaymentRecordRequest(BaseModel):
    """Record a subsequent split payment."""
    enrollment_id: int
    amount: float = Field(..., gt=0)
    payment_method: str = Field(default="cash")
    note: str = Field(default="")


class AdminSendReminderRequest(BaseModel):
    """Request to send a payment reminder."""
    enrollment_id: int
    custom_message: Optional[str] = None
    deadline: Optional[str] = None
