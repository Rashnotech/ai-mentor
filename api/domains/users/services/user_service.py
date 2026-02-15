#!/usr/bin/env python3
"""User service for PostgreSQL with SQLAlchemy"""
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime, timezone, timedelta
from auth.password import hash_password, verify_password
from domains.users.models.user import User, UserRole, PasswordHistory, FailedLoginAttempt
from domains.users.models.onboarding import UserProfile
from fastapi import HTTPException, status
import logging
from utils.validate import validate_email, validate_password



logger = logging.getLogger(__name__)


class UserService:
    """Service for user account operations with security"""

    def __init__(self, session: AsyncSession):
        """
        Initialize user service
        
        Args:
            session: SQLAlchemy async session
        """
        self.session = session


    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user with brute force protection
        
        Args:
            email: User email
            password: User password
            
        Returns:
            User document or None
        """
        try:
            # Check for too many failed attempts
            is_locked, lockout_time = await self._check_login_attempts(email)
            if is_locked:
                remaining_time = lockout_time - datetime.now(timezone.utc)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Account locked. Try again in {remaining_time.seconds // 60} minutes"
                )
            
            # Find user
            stmt = select(User).where(User.email == email)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                await self._record_failed_login(email, None)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            # OAuth-only accounts cannot use password login
            if not user.password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"This account uses {user.auth_provider or 'social'} login. Please sign in with {user.auth_provider or 'your social provider'} instead."
                )
            
            # Verify password
            if not verify_password(password, user.password):
                await self._record_failed_login(email, user.id)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            # Check if user is active
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is inactive"
                )
            
            # Clear failed attempts
            await self._clear_failed_login(user.id)
            
            # Serialize response
            return self._serialize_user(user)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication failed"
            )

    async def create_user(
        self,
        email: str,
        password: str,
        full_name: str,
        role: UserRole = UserRole.STUDENT,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        Create new user with validation
        
        Args:
            email: User email
            password: User password
            full_name: User full name
            role: User role
            **kwargs: Additional user data
            
        Returns:
            Created user document or None
        """
        try:
            # Validate inputs
            if not validate_email(email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid email format"
                )
            
            is_valid, error_msg = validate_password(password)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )
            
            if not full_name or len(full_name.strip()) < 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Full name must be at least 2 characters"
                )
            
            # Check for duplicate email
            stmt = select(User).where(User.email == email)
            result = await self.session.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            
            # Create user
            user = User(
                email=email,
                password=hash_password(password),
                full_name=full_name.strip(),
                role=role,
                is_active=True,
                is_verified=False,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                last_password_change=datetime.now(timezone.utc),
                **kwargs
            )
            
            self.session.add(user)
            await self.session.commit()
            
            logger.info(f"User created: {email}")
            return self._serialize_user(user)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            await self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )

    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find user by email"""
        try:
            stmt = select(User).where(User.email == email)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()
            return self._serialize_user(user) if user else None
        except Exception as e:
            logger.error(f"Error finding user by email: {str(e)}")
            return None

    async def find_by_id(self, user_id: str, include_onboarding: bool = True) -> Optional[Dict[str, Any]]:
        """Find user by ID with optional onboarding status"""
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                return None
            
            user_data = self._serialize_user(user)
            
            # Fetch onboarding status from user_profiles table
            if include_onboarding and user_data:
                profile_stmt = select(UserProfile).where(UserProfile.user_id == user_id)
                profile_result = await self.session.execute(profile_stmt)
                profile = profile_result.scalar_one_or_none()
                
                user_data["onboarding_completed"] = profile.onboarding_completed if profile else False
            
            return user_data
        except Exception as e:
            logger.error(f"Error finding user by ID: {str(e)}")
            return None

    async def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """
        Change user password with validation
        
        Args:
            user_id: User ID
            old_password: Current password
            new_password: New password
            
        Returns:
            True if successful
        """
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Verify old password
            if not verify_password(old_password, user.password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid current password"
                )
            
            # Validate new password
            is_valid, error_msg = validate_password(new_password)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )
            
            # Check password history (not reusing last 5 passwords)
            stmt_history = select(PasswordHistory).where(
                PasswordHistory.user_id == user_id
            ).order_by(PasswordHistory.changed_at.desc()).limit(5)
            
            result_history = await self.session.execute(stmt_history)
            history_records = result_history.scalars().all()
            
            for record in history_records:
                if verify_password(new_password, record.password_hash):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot reuse recent passwords"
                    )
            
            # Hash new password
            hashed_password = hash_password(new_password)
            
            # Store old password in history
            password_history = PasswordHistory(
                user_id=user_id,
                password_hash=user.password,
                changed_at=datetime.now(timezone.utc)
            )
            self.session.add(password_history)
            
            # Update user password
            user.password = hashed_password
            user.last_password_change = datetime.now(timezone.utc)
            user.updated_at = datetime.now(timezone.utc)
            
            await self.session.commit()
            logger.info(f"Password changed for user {user_id}")
            return True
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error changing password: {str(e)}")
            await self.session.rollback()
            return False

    async def update_profile(self, user_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Update user profile fields
        
        Args:
            user_id: User ID
            update_data: Dictionary of fields to update (full_name, bio, github_username, linkedin_username)
            
        Returns:
            Updated user data if successful, None otherwise
        """
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                return None
            
            # Update allowed fields
            allowed_fields = {"full_name", "bio", "github_username", "linkedin_username"}
            for field, value in update_data.items():
                if field in allowed_fields and hasattr(user, field):
                    setattr(user, field, value)
            
            user.updated_at = datetime.now(timezone.utc)
            
            await self.session.commit()
            await self.session.refresh(user)
            
            logger.info(f"Profile updated for user {user_id}")
            return self._serialize_user(user)
        except Exception as e:
            logger.error(f"Error updating profile: {str(e)}")
            await self.session.rollback()
            return None

    async def reset_password_request(self, email: str) -> Tuple[bool, str]:
        """
        Request password reset — generates a 6-digit OTP.

        The plain OTP is returned so the caller can send it via email.
        The OTP is stored hashed in the database for secure verification.

        Args:
            email: User email

        Returns:
            Tuple of (success, plain_otp).  plain_otp is "" when the
            email does not match any account (we still return success
            so we don't reveal whether the email exists).
        """
        import random
        try:
            stmt = select(User).where(User.email == email)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                # Don't reveal if email exists
                return True, ""

            # Generate a cryptographically-sufficient 6-digit OTP
            otp = f"{random.SystemRandom().randint(0, 999999):06d}"

            # Store a password-hash of the OTP (salted + Argon2)
            user.reset_token = hash_password(otp)
            user.reset_token_expires = datetime.now(timezone.utc) + timedelta(minutes=10)
            user.updated_at = datetime.now(timezone.utc)

            await self.session.commit()

            logger.info(f"Password reset OTP generated for {email}")
            return True, otp
        except Exception as e:
            logger.error(f"Error in password reset request: {str(e)}")
            await self.session.rollback()
            return False, ""

    async def verify_reset_otp(self, email: str, otp: str) -> Tuple[bool, str]:
        """
        Verify the 6-digit OTP and, if valid, issue a short-lived
        session token that authorises the final password-reset step.

        Args:
            email: User email
            otp: The 6-digit OTP entered by the user

        Returns:
            Tuple of (success, session_token).
        """
        import uuid as _uuid
        try:
            stmt = select(User).where(User.email == email)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user or not user.reset_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired verification code"
                )

            # Check expiry first
            if not user.reset_token_expires or user.reset_token_expires < datetime.now(timezone.utc):
                # Clear stale token
                user.reset_token = None
                user.reset_token_expires = None
                await self.session.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification code has expired. Please request a new one."
                )

            # Verify hashed OTP
            if not verify_password(otp, user.reset_token):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification code"
                )

            # OTP is correct — swap it for a one-time session token (UUID)
            session_token = str(_uuid.uuid4())
            user.reset_token = session_token        # stored plain (high-entropy, single-use, short-lived)
            user.reset_token_expires = datetime.now(timezone.utc) + timedelta(minutes=15)
            user.updated_at = datetime.now(timezone.utc)

            await self.session.commit()

            logger.info(f"Reset OTP verified for {email}")
            return True, session_token
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error verifying reset OTP: {str(e)}")
            await self.session.rollback()
            return False, ""

    async def reset_password(self, email: str, reset_token: str, new_password: str) -> bool:
        """
        Reset password using the session token obtained after OTP verification.

        Also enforces password-reuse prevention (last 5 passwords).

        Args:
            email: User email
            reset_token: Session token from verify_reset_otp
            new_password: New password

        Returns:
            True if successful
        """
        try:
            stmt = select(User).where(User.email == email)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user or not user.reset_token or user.reset_token != reset_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid reset token"
                )

            if not user.reset_token_expires or user.reset_token_expires < datetime.now(timezone.utc):
                user.reset_token = None
                user.reset_token_expires = None
                await self.session.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Reset session expired. Please start over."
                )

            # Validate new password strength
            is_valid, error_msg = validate_password(new_password)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )

            # --- Password-reuse prevention (last 5) ---
            stmt_history = (
                select(PasswordHistory)
                .where(PasswordHistory.user_id == user.id)
                .order_by(PasswordHistory.changed_at.desc())
                .limit(5)
            )
            result_history = await self.session.execute(stmt_history)
            history_records = result_history.scalars().all()

            # Also check the current password
            if verify_password(new_password, user.password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot reuse your current password"
                )

            for record in history_records:
                if verify_password(new_password, record.password_hash):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot reuse a recent password. Please choose a different one."
                    )

            hashed_password = hash_password(new_password)

            # Store old password in history
            password_history = PasswordHistory(
                user_id=user.id,
                password_hash=user.password,
                changed_at=datetime.now(timezone.utc)
            )
            self.session.add(password_history)

            user.password = hashed_password
            user.last_password_change = datetime.now(timezone.utc)
            user.reset_token = None
            user.reset_token_expires = None
            user.updated_at = datetime.now(timezone.utc)

            await self.session.commit()

            logger.info(f"Password reset for {email}")
            return True
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error resetting password: {str(e)}")
            await self.session.rollback()
            return False

    async def update_last_login(self, user_id: str) -> bool:
        """Update last login timestamp"""
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if user:
                user.last_login = datetime.now(timezone.utc)
                await self.session.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Error updating last login: {str(e)}")
            await self.session.rollback()
            return False

    # ------------------------------------------------------------------ #
    #  Email verification
    # ------------------------------------------------------------------ #

    async def generate_email_verification_token(self, user_id: str) -> Tuple[bool, str]:
        """
        Generate a secure, single-use email verification token.

        The plain token is returned so the caller can embed it in the
        verification email.  A hashed version is stored in the database.

        Any previously-issued verification token is automatically
        invalidated.

        Args:
            user_id: User ID

        Returns:
            Tuple of (success, plain_token).
        """
        import secrets
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                return False, ""

            if user.is_verified:
                # Already verified — no-op
                return True, ""

            # 32-byte URL-safe token (256 bits of entropy)
            plain_token = secrets.token_urlsafe(32)

            # Store a hashed version (Argon2 via hash_password)
            user.email_verification_token = hash_password(plain_token)
            user.email_verification_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
            user.updated_at = datetime.now(timezone.utc)

            await self.session.commit()

            logger.info(f"Email verification token generated for user {user_id}")
            return True, plain_token
        except Exception as e:
            logger.error(f"Error generating verification token: {str(e)}")
            await self.session.rollback()
            return False, ""

    async def verify_email(self, user_id: str, token: str) -> bool:
        """
        Verify a user's email by validating their token.

        On success the user is marked as verified and the token is
        invalidated.

        Args:
            user_id: User ID
            token:   The plain verification token

        Returns:
            True if verification succeeded.
        """
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification link"
                )

            if user.is_verified:
                # Idempotent — already verified
                return True

            if not user.email_verification_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No pending verification. Please request a new one."
                )

            # Check expiry
            if (
                not user.email_verification_token_expires
                or user.email_verification_token_expires < datetime.now(timezone.utc)
            ):
                user.email_verification_token = None
                user.email_verification_token_expires = None
                await self.session.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification link has expired. Please request a new one."
                )

            # Verify hashed token
            if not verify_password(token, user.email_verification_token):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification link"
                )

            # Mark verified & invalidate token
            user.is_verified = True
            user.email_verification_token = None
            user.email_verification_token_expires = None
            user.updated_at = datetime.now(timezone.utc)

            await self.session.commit()

            logger.info(f"Email verified for user {user_id} ({user.email})")
            return True
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error verifying email: {str(e)}")
            await self.session.rollback()
            return False

    async def verify_email_by_code(self, email: str, code: str) -> bool:
        """
        Verify a user's email using the 6-digit code.

        Args:
            email: User email
            code:  6-digit verification code

        Returns:
            True if verification succeeded.
        """
        try:
            stmt = select(User).where(User.email == email)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification code"
                )

            if user.is_verified:
                return True

            if not user.email_verification_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No pending verification. Please request a new one."
                )

            if (
                not user.email_verification_token_expires
                or user.email_verification_token_expires < datetime.now(timezone.utc)
            ):
                user.email_verification_token = None
                user.email_verification_token_expires = None
                await self.session.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification code has expired. Please request a new one."
                )

            if not verify_password(code, user.email_verification_token):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification code"
                )

            user.is_verified = True
            user.email_verification_token = None
            user.email_verification_token_expires = None
            user.updated_at = datetime.now(timezone.utc)

            await self.session.commit()

            logger.info(f"Email verified via code for {email}")
            return True
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error verifying email by code: {str(e)}")
            await self.session.rollback()
            return False

    async def generate_email_verification_code(self, user_id: str) -> Tuple[bool, str]:
        """
        Generate a 6-digit email verification code (for manual entry).

        The code is hashed before storage. Any previous code is
        automatically invalidated.

        Args:
            user_id: User ID

        Returns:
            Tuple of (success, plain_code).
        """
        import random
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                return False, ""

            if user.is_verified:
                return True, ""

            code = f"{random.SystemRandom().randint(0, 999999):06d}"

            user.email_verification_token = hash_password(code)
            user.email_verification_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
            user.updated_at = datetime.now(timezone.utc)

            await self.session.commit()

            logger.info(f"Email verification code generated for user {user_id}")
            return True, code
        except Exception as e:
            logger.error(f"Error generating verification code: {str(e)}")
            await self.session.rollback()
            return False, ""

    async def _record_failed_login(self, email: str, user_id: Optional[str]) -> None:
        """Record failed login attempt"""
        try:
            if user_id:
                stmt = select(FailedLoginAttempt).where(FailedLoginAttempt.user_id == user_id)
                result = await self.session.execute(stmt)
                attempt = result.scalar_one_or_none()
                
                if attempt:
                    attempt.attempt_count += 1
                    attempt.last_attempt = datetime.now(timezone.utc)
                    
                    if attempt.attempt_count >= 5:
                        attempt.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
                else:
                    attempt = FailedLoginAttempt(
                        user_id=user_id,
                        email=email,
                        attempt_count=1,
                        last_attempt=datetime.now(timezone.utc)
                    )
                    self.session.add(attempt)
            
            await self.session.commit()
        except Exception as e:
            logger.error(f"Error recording failed login: {str(e)}")
            await self.session.rollback()

    async def _clear_failed_login(self, user_id: str) -> None:
        """Clear failed login attempts"""
        try:
            stmt = delete(FailedLoginAttempt).where(FailedLoginAttempt.user_id == user_id)
            await self.session.execute(stmt)
            await self.session.commit()
        except Exception as e:
            logger.error(f"Error clearing failed login: {str(e)}")
            await self.session.rollback()

    async def _check_login_attempts(self, email: str) -> Tuple[bool, Optional[datetime]]:
        """
        Check if account is locked due to failed attempts
        
        Returns:
            Tuple of (is_locked, lockout_time)
        """
        try:
            stmt = select(FailedLoginAttempt).where(FailedLoginAttempt.email == email)
            result = await self.session.execute(stmt)
            record = result.scalar_one_or_none()
            
            if not record or record.attempt_count < 5:
                return False, None
            
            if not record.locked_until or record.locked_until < datetime.now(timezone.utc):
                await self._clear_failed_login(record.user_id)
                return False, None
            
            return True, record.locked_until
        except Exception as e:
            logger.error(f"Error checking login attempts: {str(e)}")
            return False, None

    @staticmethod
    def _serialize_user(user: Optional[User]) -> Optional[Dict[str, Any]]:
        """Convert ORM user object to API response"""
        if not user:
            return None
        
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value if isinstance(user.role, UserRole) else user.role,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "github_username": user.github_username,
            "linkedin_username": user.linkedin_username,
            "last_login": user.last_login,
            "created_at": user.created_at
        }
