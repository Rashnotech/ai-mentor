#!/usr/bin/env python3
"""Security utilities for PostgreSQL with SQLAlchemy"""
from fastapi import HTTPException, status, Request
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import logging
import secrets

from domains.users.models.user import RateLimit, CSRFToken


logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter for API endpoints"""

    def __init__(self, session: AsyncSession):
        """Initialize rate limiter"""
        self.session = session

    async def check_rate_limit(
        self,
        identifier: str,
        max_requests: int = 5,
        window_seconds: int = 60
    ) -> bool:
        """
        Check if request is within rate limit
        
        Args:
            identifier: Unique identifier (IP, email, etc.)
            max_requests: Maximum requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            True if allowed, False if rate limited
        """
        try:
            now = datetime.now(timezone.utc)
            window_start = now - timedelta(seconds=window_seconds)
            
            # Get current rate limit record
            stmt = select(RateLimit).where(RateLimit.identifier == identifier)
            result = await self.session.execute(stmt)
            record = result.scalar_one_or_none()
            
            if not record:
                # First request
                new_record = RateLimit(
                    identifier=identifier,
                    endpoint="general",
                    request_count=1,
                    first_request=now,
                    last_request=now
                )
                self.session.add(new_record)
                await self.session.commit()
                return True
            
            # Check if window has expired
            if record.first_request < window_start:
                # Reset counter
                record.request_count = 1
                record.first_request = now
                record.last_request = now
                await self.session.commit()
                return True
            
            # Check if limit exceeded
            if record.request_count < max_requests:
                record.request_count += 1
                record.last_request = now
                await self.session.commit()
                return True
            
            logger.warning(f"Rate limit exceeded for {identifier}")
            return False
        except Exception as e:
            logger.error(f"Rate limit check error: {str(e)}")
            await self.session.rollback()
            return True

    async def cleanup_expired_limits(self) -> int:
        """Remove expired rate limit records"""
        try:
            stmt = delete(RateLimit).where(
                RateLimit.last_request < datetime.now(timezone.utc) - timedelta(hours=1)
            )
            result = await self.session.execute(stmt)
            await self.session.commit()
            return result.rowcount
        except Exception as e:
            logger.error(f"Error cleaning up rate limits: {str(e)}")
            await self.session.rollback()
            return 0


class CSRFProtection:
    """CSRF token generation and validation"""

    def __init__(self, session: AsyncSession):
        """Initialize CSRF protection"""
        self.session = session

    @staticmethod
    def generate_csrf_token() -> str:
        """Generate secure CSRF token"""
        return secrets.token_urlsafe(32)

    async def create_csrf_token(
        self,
        session_id: str,
        expires_in_minutes: int = 30
    ) -> str:
        """
        Create and store CSRF token
        
        Args:
            session_id: Session identifier
            expires_in_minutes: Token expiration time
            
        Returns:
            CSRF token
        """
        try:
            token = self.generate_csrf_token()
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)
            
            csrf_token = CSRFToken(
                session_id=session_id,
                token=token,
                created_at=datetime.now(timezone.utc),
                expires_at=expires_at,
                is_used=False
            )
            
            self.session.add(csrf_token)
            await self.session.commit()
            
            logger.debug(f"CSRF token created for session {session_id}")
            return token
        except Exception as e:
            logger.error(f"Error creating CSRF token: {str(e)}")
            await self.session.rollback()
            raise

    async def validate_csrf_token(
        self,
        session_id: str,
        token: str
    ) -> bool:
        """
        Validate CSRF token
        
        Args:
            session_id: Session identifier
            token: CSRF token to validate
            
        Returns:
            True if valid
        """
        try:
            stmt = select(CSRFToken).where(
                CSRFToken.session_id == session_id,
                CSRFToken.token == token,
                CSRFToken.is_used == False,
                CSRFToken.expires_at > datetime.now(timezone.utc)
            )
            result = await self.session.execute(stmt)
            csrf_token = result.scalar_one_or_none()
            
            if not csrf_token:
                logger.warning(f"CSRF validation failed for session {session_id}")
                return False
            
            # Mark token as used
            csrf_token.is_used = True
            await self.session.commit()
            
            logger.debug(f"CSRF token validated for session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Error validating CSRF token: {str(e)}")
            await self.session.rollback()
            return False

    async def cleanup_expired_tokens(self) -> int:
        """Remove expired CSRF tokens"""
        try:
            stmt = delete(CSRFToken).where(
                CSRFToken.expires_at < datetime.now(timezone.utc)
            )
            result = await self.session.execute(stmt)
            await self.session.commit()
            logger.info(f"Cleaned up {result.rowcount} expired CSRF tokens")
            return result.rowcount
        except Exception as e:
            logger.error(f"Error cleaning up CSRF tokens: {str(e)}")
            await self.session.rollback()
            return 0


class SecurityHeaders:
    """Security headers for responses"""

    @staticmethod
    def apply_security_headers(response) -> None:
        """Apply security headers to response"""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
