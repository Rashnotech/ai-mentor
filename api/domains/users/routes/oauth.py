#!/usr/bin/python3
"""
OAuth authentication routes — OAuth 2.0 Authorization Code Flow.

Endpoints:
  GET   /auth/{provider}/login     — Redirect user to provider consent screen
  POST  /auth/{provider}/callback  — Exchange code for JWT, set HttpOnly cookies
"""
import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_db_session
from core.config import settings
from domains.users.services.oauth_service import OAuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["oauth"])

SUPPORTED_PROVIDERS = ("google", "github")


class OAuthCallbackBody(BaseModel):
    """Body sent by the frontend callback page."""
    code: str
    state: str


def _set_auth_cookies(response: JSONResponse, access_token: str, refresh_token: str) -> None:
    """Set secure HttpOnly cookies for access and refresh tokens."""
    is_production = settings.ENVIRONMENT == "production"

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )


def _clear_auth_cookies(response: JSONResponse) -> None:
    """Remove auth cookies."""
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def _validate_provider(provider: str) -> None:
    """Raise 400 if the provider is not supported."""
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}. Supported: {', '.join(SUPPORTED_PROVIDERS)}",
        )


# ── Step 1: Redirect user to provider consent screen ─────────

@router.get("/{provider}/login")
async def oauth_login(provider: str):
    """
    Redirect the user to the OAuth provider's consent / authorization screen.

    The provider will redirect back to the frontend callback page
    ``/auth/{provider}/callback?code=…&state=…`` after the user authorises.
    """
    _validate_provider(provider)

    try:
        data = OAuthService.get_auth_url(provider)
        # Redirect the browser directly to the provider consent screen
        return RedirectResponse(url=data["authorization_url"], status_code=302)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Error generating %s auth URL: %s", provider, exc)
        raise HTTPException(status_code=500, detail="Failed to generate authorization URL")


# ── Step 2: Handle provider callback ─────────────────────────

@router.post("/{provider}/callback")
async def oauth_callback(
    provider: str,
    body: OAuthCallbackBody,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Exchange the authorization code for tokens, create/link user,
    set HttpOnly cookies, and return user info (no tokens in body).
    """
    _validate_provider(provider)

    try:
        svc = OAuthService(db)
        result = await svc.handle_callback(
            provider=provider,
            code=body.code,
            state=body.state,
        )

        # Build JSON payload — tokens are NOT included in the body
        payload = {
            "status": "success",
            "is_new_user": result["is_new_user"],
            "user": result["user"],
        }

        response = JSONResponse(content=payload, status_code=200)
        _set_auth_cookies(response, result["access_token"], result["refresh_token"])
        return response

    except ValueError as exc:
        logger.warning("%s OAuth error: %s", provider, exc)
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("%s callback error: %s", provider, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="OAuth authentication failed")


# ── Logout (clear cookies) ───────────────────────────────────

@router.post("/oauth/logout")
async def oauth_logout():
    """Clear HttpOnly auth cookies."""
    response = JSONResponse(content={"status": "success", "message": "Logged out"})
    _clear_auth_cookies(response)
    return response
