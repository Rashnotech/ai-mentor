#!/usr/bin/python3
"""
Nomba Payment Gateway Service — production-ready async implementation.

Uses httpx.AsyncClient for non-blocking HTTP calls compatible with FastAPI's
async event loop. Handles token caching, checkout creation, payment verification,
and webhook signature verification.
"""
import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from core.config import settings
from domains.payments.schemas import (
    CheckoutOrderRequest,
    CheckoutOrderResponse,
    WebhookPayload,
)

logger = logging.getLogger(__name__)


class NombaService:
    """Comprehensive async Nomba Payment Gateway Service."""

    def __init__(self):
        self.base_url = getattr(settings, "NOMBA_BASE_URL", "https://api.nomba.com")
        self.client_id = getattr(settings, "NOMBA_CLIENT_ID", None)
        self.client_secret = getattr(settings, "NOMBA_CLIENT_SECRET", None)
        self.account_id = getattr(settings, "NOMBA_ACCOUNT_ID", None)
        self.webhook_secret = getattr(settings, "NOMBA_WEBHOOK_SECRET", None)
        self.is_test_mode = getattr(settings, "NOMBA_TEST_MODE", True)

        # Cached access token
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

        if not all([self.client_id, self.client_secret, self.account_id]):
            raise ValueError(
                "Missing required Nomba configuration. "
                "Set NOMBA_CLIENT_ID, NOMBA_CLIENT_SECRET, and NOMBA_ACCOUNT_ID."
            )

    # ─── Authentication ────────────────────────────────────────────

    async def get_access_token(self) -> str:
        """Obtain (or return cached) Nomba access token."""
        if (
            self._access_token
            and self._token_expires_at
            and datetime.now(timezone.utc) < self._token_expires_at
        ):
            return self._access_token

        token_url = f"{self.base_url}/v1/auth/token/issue"
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    token_url,
                    json=payload,
                    headers={"accountId": self.account_id},
                )

            if response.status_code != 200:
                logger.error(
                    "Failed to get Nomba access token: %s - %s",
                    response.status_code,
                    response.text,
                )
                raise Exception(f"Nomba authentication failed: {response.status_code}")

            response_data = response.json()

            if response_data.get("code") != "00" or "data" not in response_data:
                logger.error("Invalid Nomba auth response: %s", response_data)
                raise Exception("Invalid authentication response format")

            token_data = response_data["data"]
            self._access_token = token_data.get("access_token")
            if not self._access_token:
                raise Exception("No access token in Nomba response")

            expires_in = token_data.get("expires_in", 3600)
            self._token_expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=expires_in - 60
            )

            logger.info("Successfully obtained Nomba access token")
            return self._access_token

        except httpx.RequestError as e:
            logger.error("Network error getting Nomba access token: %s", str(e))
            raise Exception(f"Network error during authentication: {str(e)}")

    # ─── Checkout ──────────────────────────────────────────────────

    async def checkout(
        self, checkout_request: CheckoutOrderRequest
    ) -> CheckoutOrderResponse:
        """Create a checkout order and return the hosted payment link."""
        access_token = await self.get_access_token()

        checkout_url = f"{self.base_url}/v1/checkout/order"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "accountId": self.account_id,
        }
        payload: Dict[str, Any] = {
            "order": {
                "orderReference": checkout_request.orderReference,
                "customerEmail": checkout_request.customerEmail,
                "callbackUrl": checkout_request.callbackUrl,
                "amount": str(checkout_request.amount),
                "currency": checkout_request.currency,
                "accountId": self.account_id,
            },
            "tokenizeCard": False,
        }

        if checkout_request.customerName:
            payload["order"]["customerName"] = checkout_request.customerName

        if checkout_request.metadata:
            payload["order"]["metadata"] = checkout_request.metadata

        if checkout_request.description:
            payload["order"]["description"] = checkout_request.description

        logger.info(
            "Creating Nomba checkout order: reference=%s amount=%s %s",
            checkout_request.orderReference,
            checkout_request.amount,
            checkout_request.currency,
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    checkout_url, json=payload, headers=headers
                )

            if response.status_code != 200:
                logger.error(
                    "Nomba checkout failed: %s - %s",
                    response.status_code,
                    response.text,
                )
                raise Exception(
                    f"Checkout creation failed: {response.status_code} - {response.text}"
                )

            response_data = response.json()

            if response_data.get("code") != "00" or "data" not in response_data:
                logger.error("Invalid checkout response: %s", response_data)
                raise Exception("Invalid checkout response format")

            data = response_data["data"]
            if not data.get("checkoutLink"):
                logger.error("No checkout link in Nomba response")
                raise Exception("No checkout link received from Nomba")

            checkout_response = CheckoutOrderResponse(
                checkoutLink=data["checkoutLink"],
                orderReference=data.get(
                    "orderReference", checkout_request.orderReference
                ),
                amount=data.get("amount", checkout_request.amount),
                status=data.get("status", "pending"),
                createdAt=datetime.now(timezone.utc),
            )

            logger.info(
                "Checkout order created: reference=%s link=%s",
                checkout_request.orderReference,
                data["checkoutLink"][:80],
            )
            return checkout_response

        except httpx.RequestError as e:
            logger.error("Network error during Nomba checkout: %s", str(e))
            raise Exception(f"Network error during checkout: {str(e)}")

    # ─── Verification ──────────────────────────────────────────────

    async def verify_payment(self, order_reference: str) -> Optional[Dict[str, Any]]:
        """Verify payment status using the order reference."""
        token = await self.get_access_token()

        verify_url = f"{self.base_url}/v1/checkout/order/{order_reference}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "accountId": self.account_id,
        }

        logger.info("Verifying Nomba payment: reference=%s", order_reference)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(verify_url, headers=headers)

            if response.status_code != 200:
                logger.error(
                    "Payment verification failed: %s - %s",
                    response.status_code,
                    response.text,
                )
                return None

            payment_data = response.json()
            if not isinstance(payment_data, dict):
                logger.error("Invalid payment verification data format")
                return None

            if payment_data.get("code") != "00":
                logger.error(
                    "Verification returned error code: %s", payment_data.get("code")
                )
                return None

            data = payment_data.get("data", {})
            if not data:
                logger.error("No data in payment verification response")
                return None

            logger.info("Payment verification completed: reference=%s", order_reference)

            # The Nomba checkout order status endpoint returns the order directly
            return {
                "status": data.get("status", "UNKNOWN"),
                "orderReference": data.get("orderReference", order_reference),
                "amount": data.get("amount"),
                "currency": data.get("currency", "NGN"),
                "paymentMethod": data.get("onlineCheckoutPaymentMethod"),
                "customerEmail": data.get("customerEmail"),
                "cardType": data.get("onlineCheckoutCardType"),
                "cardLast4": data.get("onlineCheckoutCardPanLast4Digits"),
                "gatewayMessage": data.get("gatewayMessage"),
                "timeCreated": data.get("timeCreated"),
                "timeUpdated": data.get("timeUpdated"),
                "transactionReference": data.get("id", order_reference),
                "responseCode": payment_data.get("code"),
                "responseDescription": payment_data.get("description"),
                "verifiedAt": datetime.now(timezone.utc).isoformat(),
            }

        except httpx.RequestError as e:
            logger.error("Network error during verification: %s", str(e))
            raise Exception(f"Network error during verification: {str(e)}")

    # ─── Webhook Signature Verification ────────────────────────────

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify the HMAC-SHA256 webhook signature."""
        if not self.webhook_secret:
            logger.warning(
                "Webhook secret not configured — skipping signature verification"
            )
            return True

        try:
            expected = hmac.new(
                self.webhook_secret.encode("utf-8"),
                payload,
                hashlib.sha256,
            ).hexdigest()
            return hmac.compare_digest(signature, expected)
        except Exception as e:
            logger.error("Error verifying webhook signature: %s", str(e))
            return False

    # ─── Webhook Processing ────────────────────────────────────────

    async def handle_webhook(
        self, payload: bytes, signature: str
    ) -> Dict[str, Any]:
        """Parse and validate an incoming Nomba webhook."""
        if not self.verify_webhook_signature(payload, signature):
            logger.warning("Invalid webhook signature")
            raise Exception("Invalid webhook signature")

        try:
            webhook_data = json.loads(payload.decode("utf-8"))
        except json.JSONDecodeError as e:
            logger.error("Invalid JSON in webhook payload: %s", str(e))
            raise Exception("Invalid webhook payload format")

        webhook = WebhookPayload(
            event=webhook_data.get("event"),
            data=webhook_data.get("data", {}),
            timestamp=datetime.now(timezone.utc),
        )

        logger.info("Nomba webhook received: event=%s", webhook.event)

        return {
            "event": webhook.event,
            "data": webhook.data,
            "received_at": datetime.now(timezone.utc).isoformat(),
        }
