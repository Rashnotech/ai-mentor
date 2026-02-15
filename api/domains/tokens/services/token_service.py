#!/usr/bin/env python3
"""Token service for PostgreSQL with SQLAlchemy"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import json
import uuid
import logging

from auth.jwt import JWTHandler
from core.config import settings
from domains.users.models.user import RefreshToken, RevokedToken, User


logger = logging.getLogger(__name__)


class TokenService:
    """Service for managing tokens with revocation support"""

    def __init__(self, session: AsyncSession):
        """
        Initialize token service
        
        Args:
            session: SQLAlchemy async session
        """
        self.session = session

    async def create_token_pair(
        self,
        email: str,
        user_id: str,
        role: str,
        device_fingerprint: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Create access and refresh token pair with security metadata
        
        Args:
            email: User email
            user_id: User ID
            role: User role
            device_fingerprint: Device fingerprint for additional security
            ip_address: Client IP address
            user_agent: Client user agent
            
        Returns:
            Dictionary with access_token and refresh_token
        """
        try:
            # Generate JTI (JWT ID) for token revocation tracking
            access_jti = str(uuid.uuid4())
            refresh_jti = str(uuid.uuid4())
            
            # Create access token
            access_payload = {
                "sub": json.dumps({
                    "email": email,
                    "user_id": user_id,
                    "role": role
                }),
                "jti": access_jti,
                "scope": "access"
            }
            access_token = JWTHandler.create_access_token(
                access_payload,
                token_type="access"
            )
            
            # Create refresh token with longer expiry
            refresh_payload = {
                "sub": json.dumps({
                    "email": email,
                    "user_id": user_id,
                    "role": role
                }),
                "jti": refresh_jti,
                "scope": "refresh"
            }
            refresh_token = JWTHandler.create_access_token(
                refresh_payload,
                expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                token_type="refresh"
            )
            
            # Delete old refresh tokens for this user
            stmt = delete(RefreshToken).where(RefreshToken.user_id == user_id)
            await self.session.execute(stmt)
            
            # Store refresh token metadata
            db_token = RefreshToken(
                user_id=user_id,
                refresh_token_jti=refresh_jti,
                access_token_jti=access_jti,
                device_fingerprint=device_fingerprint,
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                is_revoked=False
            )
            
            self.session.add(db_token)
            await self.session.commit()
            
            logger.info(f"Token pair created for user {email}")
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer"
            }
        except Exception as e:
            logger.error(f"Error creating token pair: {str(e)}")
            await self.session.rollback()
            raise

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """
        Create new access token from valid refresh token
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            Dictionary with new access_token
        """
        try:
            # Decode refresh token
            payload = JWTHandler.decode_access_token(refresh_token, token_type="refresh")
            if not payload:
                raise Exception("Invalid refresh token payload")
            
            email = payload.get("email")
            user_id = payload.get("user_id")
            role = payload.get("role")
            jti = payload.get("jti")
            
            # Verify token exists and is not revoked
            stmt = select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.refresh_token_jti == jti,
                RefreshToken.is_revoked == False
            )
            result = await self.session.execute(stmt)
            stored_token = result.scalar_one_or_none()
            
            if not stored_token:
                logger.warning(f"Refresh token not found or revoked for {email}")
                raise Exception("Refresh token not found or revoked")
            
            # Check expiration
            if stored_token.expires_at < datetime.now(timezone.utc):
                await self.revoke_refresh_token(user_id, jti)
                raise Exception("Refresh token expired")
            
            # Create new access token
            new_jti = str(uuid.uuid4())
            access_payload = {
                "sub": json.dumps({
                    "email": email,
                    "user_id": user_id,
                    "role": role
                }),
                "jti": new_jti,
                "scope": "access"
            }
            access_token = JWTHandler.create_access_token(
                access_payload,
                token_type="access"
            )
            
            # Update stored token with new JTI
            stored_token.access_token_jti = new_jti
            stored_token.updated_at = datetime.now(timezone.utc)
            
            await self.session.commit()
            
            logger.info(f"Access token refreshed for user {email}")
            return {
                "access_token": access_token,
                "token_type": "bearer"
            }
        except Exception as e:
            logger.error(f"Error refreshing access token: {str(e)}")
            await self.session.rollback()
            raise

    async def revoke_refresh_token(self, user_id: str, jti: Optional[str] = None) -> bool:
        """
        Revoke refresh token(s) for a user
        
        Args:
            user_id: User ID
            jti: Specific token JTI to revoke (if None, revokes all)
            
        Returns:
            True if revocation successful
        """
        try:
            if jti:
                stmt = select(RefreshToken).where(
                    RefreshToken.user_id == user_id,
                    RefreshToken.refresh_token_jti == jti
                )
                result = await self.session.execute(stmt)
                token = result.scalar_one_or_none()
                if token:
                    token.is_revoked = True
                    token.revoked_at = datetime.now(timezone.utc)
            else:
                stmt = select(RefreshToken).where(RefreshToken.user_id == user_id)
                result = await self.session.execute(stmt)
                tokens = result.scalars().all()
                for token in tokens:
                    token.is_revoked = True
                    token.revoked_at = datetime.now(timezone.utc)
            
            await self.session.commit()
            logger.info(f"Token(s) revoked for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error revoking token: {str(e)}")
            await self.session.rollback()
            return False

    async def revoke_all_user_tokens(self, user_id: str) -> bool:
        """
        Revoke all tokens for a user (used for logout all)
        
        Args:
            user_id: User ID
            
        Returns:
            True if revocation successful
        """
        try:
            stmt = select(RefreshToken).where(RefreshToken.user_id == user_id)
            result = await self.session.execute(stmt)
            tokens = result.scalars().all()
            
            for token in tokens:
                token.is_revoked = True
                token.revoked_at = datetime.now(timezone.utc)
            
            await self.session.commit()
            logger.info(f"All tokens revoked for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error revoking all tokens: {str(e)}")
            await self.session.rollback()
            return False

    async def add_token_to_blacklist(self, jti: str, expires_at: datetime) -> bool:
        """
        Add token to blacklist for explicit revocation
        
        Args:
            jti: Token JTI
            expires_at: Token expiration time
            
        Returns:
            True if added successfully
        """
        try:
            revoked_token = RevokedToken(
                jti=jti,
                revoked_at=datetime.now(timezone.utc),
                expires_at=expires_at,
                reason="User logout"
            )
            self.session.add(revoked_token)
            await self.session.commit()
            logger.info(f"Token {jti} added to blacklist")
            return True
        except Exception as e:
            logger.error(f"Error adding token to blacklist: {str(e)}")
            await self.session.rollback()
            return False

    async def is_token_blacklisted(self, jti: str) -> bool:
        """
        Check if token JTI is blacklisted
        
        Args:
            jti: Token JTI
            
        Returns:
            True if blacklisted
        """
        try:
            stmt = select(RevokedToken).where(RevokedToken.jti == jti)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none() is not None
        except Exception as e:
            logger.error(f"Error checking token blacklist: {str(e)}")
            return False

    async def cleanup_expired_tokens(self) -> int:
        """
        Clean up expired tokens from database
        
        Returns:
            Number of tokens deleted
        """
        try:
            stmt = delete(RefreshToken).where(
                RefreshToken.expires_at < datetime.now(timezone.utc)
            )
            result = await self.session.execute(stmt)
            await self.session.commit()
            
            # Also cleanup revoked tokens
            stmt_revoked = delete(RevokedToken).where(
                RevokedToken.expires_at < datetime.now(timezone.utc)
            )
            revoked_result = await self.session.execute(stmt_revoked)
            await self.session.commit()
            
            total_deleted = result.rowcount + revoked_result.rowcount
            logger.info(f"Cleaned up {total_deleted} expired tokens")
            return total_deleted
        except Exception as e:
            logger.error(f"Error cleaning up expired tokens: {str(e)}")
            await self.session.rollback()
            return 0
