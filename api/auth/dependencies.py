#!/usr/bin/python3
"""a module that handle GraphQL"""
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import db_session
from auth.jwt import oauth2_scheme, JWTHandler
from typing import AsyncGenerator
from domains.tokens.services.token_service import TokenService
from extension.security_utils import CSRFProtection,  RateLimiter
from domains.users.services.user_service import UserService
import logging 


logger = logging.getLogger(__name__)


async def get_currrent_user(request: Request):
    # Try Authorization header first, then fall back to HttpOnly cookie
    auth = request.headers.get("Authorization")
    if auth:
        token = auth.replace("Bearer ", "").replace("Bearer", "").strip()
        if token:
            return JWTHandler.decode_access_token(token)

    # Fall back to HttpOnly cookie
    token = request.cookies.get("access_token")
    if token:
        return JWTHandler.decode_access_token(token)

    return None


async def require_role(user, allowed_roles: list[str]):
    if not user:
        raise Exception("Not authenticated")
    if user["role"] not in allowed_roles:
        raise Exception("Forbidden")


# Dependency functions
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session"""
    session = await db_session.get_async_session()
    try:
        yield session
    finally:
        await session.close()


async def get_token_service(session: AsyncSession = Depends(get_db_session)) -> TokenService:
    """Get token service"""
    return TokenService(session)


async def get_user_service(session: AsyncSession = Depends(get_db_session)) -> UserService:
    """Get user service"""
    return UserService(session)


async def get_rate_limiter(session: AsyncSession = Depends(get_db_session)) -> RateLimiter:
    """Get rate limiter"""
    return RateLimiter(session)


async def get_csrf_protection(session: AsyncSession = Depends(get_db_session)) -> CSRFProtection:
    """Get CSRF protection"""
    return CSRFProtection(session)


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
) -> dict:
    """
    Get current authenticated user from token.

    Checks in order:
      1. Bearer token from Authorization header (via oauth2_scheme)
      2. ``access_token`` HttpOnly cookie

    Returns:
        Current user data

    Raises:
        HTTPException: If no valid token is found
    """

    # 1. Try Bearer token from header
    if token:
        try:
            payload = JWTHandler.decode_access_token(token, token_type="access")
            if payload:
                return payload
        except HTTPException:
            pass  # fall through to cookie
        except Exception:
            pass

    # 2. Try HttpOnly cookie
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        try:
            payload = JWTHandler.decode_access_token(cookie_token, token_type="access")
            if payload:
                return payload
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error validating cookie token: {str(e)}")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )