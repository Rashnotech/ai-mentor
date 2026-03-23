#!/usr/bin/python3
"""
OAuth authentication service.

Handles the complete OAuth 2.0 Authorization Code Flow for Google and GitHub.
Manages user creation / linking, token issuance, and CSRF state validation.
"""
import logging
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from auth.jwt import JWTHandler
from auth.oauth import GoogleOAuthHandler, GitHubOAuthHandler
from core.config import settings
from domains.tokens.services.token_service import TokenService
from domains.users.models.user import User, UserRole

logger = logging.getLogger(__name__)


# ── In‑memory CSRF state store (production: use Redis/DB) ────────
_oauth_states: Dict[str, Dict[str, Any]] = {}

# ── Provider configuration lookup ────────────────────────────────
_PROVIDER_CONFIG = {
    "google": {
        "client_id_attr": "GOOGLE_CLIENT_ID",
        "client_secret_attr": "GOOGLE_CLIENT_SECRET",
        "redirect_uri_attr": "GOOGLE_REDIRECT_URI",
    },
    "github": {
        "client_id_attr": "GITHUB_CLIENT_ID",
        "client_secret_attr": "GITHUB_CLIENT_SECRET",
        "redirect_uri_attr": "GITHUB_REDIRECT_URI",
    },
}


class OAuthService:
    """Handles OAuth authentication for Google and GitHub providers."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────────────────────────────────────────────────────
    #  STEP 1 — Generate authorization URL (any provider)
    # ──────────────────────────────────────────────────────────────

    @staticmethod
    def get_auth_url(provider: str) -> Dict[str, str]:
        """
        Build the OAuth authorization URL for the given provider.

        Args:
            provider: "google" or "github"

        Returns:
            Dict with ``authorization_url`` and ``state``
        """
        cfg = _PROVIDER_CONFIG.get(provider)
        if not cfg:
            raise ValueError(f"Unsupported OAuth provider: {provider}")

        client_id = getattr(settings, cfg["client_id_attr"], "")
        if not client_id:
            raise ValueError(f"{cfg['client_id_attr']} is not configured")

        redirect_uri = getattr(settings, cfg["redirect_uri_attr"], "")

        state = secrets.token_urlsafe(32)
        _oauth_states[state] = {
            "provider": provider,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        if provider == "google":
            url = GoogleOAuthHandler.get_authorization_url(
                client_id=client_id,
                redirect_uri=redirect_uri,
                state=state,
            )
        else:  # github
            url = GitHubOAuthHandler.get_authorization_url(
                client_id=client_id,
                redirect_uri=redirect_uri,
                state=state,
            )

        return {"authorization_url": url, "state": state}

    # ──────────────────────────────────────────────────────────────
    #  STEP 2 — Handle provider callback (unified)
    # ──────────────────────────────────────────────────────────────

    async def handle_callback(
        self, provider: str, code: str, state: str
    ) -> Dict[str, Any]:
        """
        Exchange auth code → access token → user profile → JWT.

        Works for any supported provider.
        """
        if provider == "google":
            return await self._handle_google(code, state)
        elif provider == "github":
            return await self._handle_github(code, state)
        else:
            raise ValueError(f"Unsupported OAuth provider: {provider}")

    # ── Provider-specific handlers ────────────────────────────────

    async def _handle_google(self, code: str, state: str) -> Dict[str, Any]:
        """Exchange Google auth code → tokens → user info → JWT."""
        self._validate_state(state, "google")

        token_data = await GoogleOAuthHandler.exchange_code_for_token(
            code=code,
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            redirect_uri=settings.GOOGLE_REDIRECT_URI,
        )

        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("Failed to obtain Google access token")

        user_info = await GoogleOAuthHandler.get_user_info(access_token)

        email = user_info.get("email")
        if not email:
            raise ValueError("Google did not return an email address")

        return await self._find_or_create_user(
            provider="google",
            provider_id=str(user_info.get("id", "")),
            email=email,
            full_name=user_info.get("name", email.split("@")[0]),
            avatar_url=user_info.get("picture"),
        )

    async def _handle_github(self, code: str, state: str) -> Dict[str, Any]:
        """Exchange GitHub auth code → tokens → user info → JWT."""
        self._validate_state(state, "github")

        token_data = await GitHubOAuthHandler.exchange_code_for_token(
            code=code,
            client_id=settings.GITHUB_CLIENT_ID,
            client_secret=settings.GITHUB_CLIENT_SECRET,
        )

        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("Failed to obtain GitHub access token")

        user_info = await GitHubOAuthHandler.get_user_info(access_token)

        # GitHub doesn't always include email in /user — fetch separately
        email = user_info.get("email")
        if not email:
            email = await GitHubOAuthHandler.get_user_email(access_token)
        if not email:
            raise ValueError(
                "GitHub did not return an email address. "
                "Please ensure your GitHub email is public or grant the user:email scope."
            )

        return await self._find_or_create_user(
            provider="github",
            provider_id=str(user_info.get("id", "")),
            email=email,
            full_name=user_info.get("name") or user_info.get("login", email.split("@")[0]),
            avatar_url=user_info.get("avatar_url"),
        )

    # ──────────────────────────────────────────────────────────────
    #  Internal helpers
    # ──────────────────────────────────────────────────────────────

    @staticmethod
    def _validate_state(state: str, expected_provider: str) -> None:
        """Validate the CSRF state token and consume it (one-time use)."""
        stored = _oauth_states.pop(state, None)
        if not stored:
            raise ValueError("Invalid or expired OAuth state parameter (CSRF check failed)")
        if stored.get("provider") != expected_provider:
            raise ValueError("OAuth state does not match expected provider")

    async def _find_or_create_user(
        self,
        provider: str,
        provider_id: str,
        email: str,
        full_name: str,
        avatar_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Find existing user or create new one, then issue JWT tokens.

        Handles three cases:
          1. User exists with same provider + provider_id  → log in
          2. User exists with same email (different provider) → link provider
          3. New user → create account
        """
        email_lower = email.strip().lower()

        # Case 1: Existing user with same provider + provider_id
        result = await self.db.execute(
            select(User).where(
                User.auth_provider == provider,
                User.provider_id == provider_id,
            )
        )
        user = result.scalar_one_or_none()

        if user:
            if avatar_url and user.avatar_url != avatar_url:
                user.avatar_url = avatar_url
            user.last_login = datetime.now(timezone.utc)
            await self.db.commit()
            logger.info("OAuth login: provider=%s email=%s", provider, email_lower)
            return await self._issue_tokens(user, is_new_user=False)

        # Case 2: Existing user by email → link provider
        result = await self.db.execute(
            select(User).where(func.lower(User.email) == email_lower)
        )
        user = result.scalar_one_or_none()

        if user:
            user.auth_provider = provider
            user.provider_id = provider_id
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            if not user.is_verified:
                user.is_verified = True
            user.last_login = datetime.now(timezone.utc)
            await self.db.commit()
            logger.info(
                "OAuth link: provider=%s linked to existing email=%s",
                provider, email_lower,
            )
            return await self._issue_tokens(user, is_new_user=False)

        # Case 3: Create new user
        user = User(
            id=str(uuid.uuid4()),
            email=email_lower,
            password=None,
            full_name=full_name,
            avatar_url=avatar_url,
            role=UserRole.STUDENT,
            is_active=True,
            is_verified=True,
            auth_provider=provider,
            provider_id=provider_id,
            last_login=datetime.now(timezone.utc),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        logger.info(
            "OAuth signup: provider=%s email=%s user_id=%s",
            provider, email_lower, user.id,
        )
        return await self._issue_tokens(user, is_new_user=True)

    async def _issue_tokens(
        self, user: User, is_new_user: bool = False
    ) -> Dict[str, Any]:
        """Issue JWT access + refresh tokens for the given user."""
        token_service = TokenService(self.db)
        tokens = await token_service.create_token_pair(
            email=user.email,
            user_id=user.id,
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
        )

        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": tokens["token_type"],
            "is_new_user": is_new_user,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value if hasattr(user.role, "value") else str(user.role),
                "is_verified": user.is_verified,
                "avatar_url": user.avatar_url,
                "auth_provider": user.auth_provider,
            },
        }
