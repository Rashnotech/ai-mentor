#!/usr/bin/env python3
"""Authentication routes with security features"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks, Body
from pydantic import BaseModel, Field, EmailStr

from auth.dependencies import get_rate_limiter, get_token_service, get_user_service, get_current_user
from domains.tokens.services.token_service import TokenService
from domains.users.services.user_service import UserService, UserRole
from extension.security_utils import RateLimiter


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth")


# Request/Response Models
class LoginRequest(BaseModel):
    """Login request"""
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")
    device_fingerprint: Optional[str] = Field(None, description="Device fingerprint for tracking")


class SignupRequest(BaseModel):
    """User registration request"""
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=8, description="User password")
    confirm_password: str = Field(..., description="Password confirmation")
    full_name: str = Field(..., min_length=2, description="Full name")


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str = Field(..., description="Valid refresh token")


class ChangePasswordRequest(BaseModel):
    """Change password request"""
    old_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
    confirm_password: str = Field(..., description="Password confirmation")


class ProfileUpdateRequest(BaseModel):
    """Profile update request"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255, description="Full name")
    bio: Optional[str] = Field(None, max_length=500, description="User bio")
    github_username: Optional[str] = Field(None, max_length=100, description="GitHub username")
    linkedin_username: Optional[str] = Field(None, max_length=100, description="LinkedIn username")


class ResetPasswordRequest(BaseModel):
    """Password reset request"""
    email: str = Field(..., description="User email")


class VerifyResetOtpRequest(BaseModel):
    """OTP verification request"""
    email: str = Field(..., description="User email")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class ResetPasswordConfirmRequest(BaseModel):
    """Password reset confirmation"""
    email: str = Field(..., description="User email")
    reset_token: str = Field(..., description="Reset session token from OTP verification")
    new_password: str = Field(..., min_length=8, description="New password")
    confirm_password: str = Field(..., description="Password confirmation")


class LogoutRequest(BaseModel):
    """Logout request"""
    logout_all_devices: bool = Field(False, description="Logout from all devices")


class MentorProfileUpdateRequest(BaseModel):
    """Mentor profile update request"""
    title: Optional[str] = Field(None, max_length=255, description="Professional title/profession")
    company: Optional[str] = Field(None, max_length=255, description="Company working for")
    languages: Optional[list[str]] = Field(None, description="Languages spoken")
    expertise: Optional[list[str]] = Field(None, description="Areas of expertise")
    years_experience: Optional[int] = Field(None, ge=0, description="Years of experience")
    timezone: Optional[str] = Field(None, max_length=50, description="Timezone")
    availability: Optional[str] = Field(None, description="Availability status")


class AvatarUploadResponse(BaseModel):
    """Avatar upload response"""
    avatar_url: str
    message: str


class VerifyEmailRequest(BaseModel):
    """Email verification via 6-digit code"""
    email: str = Field(..., description="User email")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class ResendVerificationRequest(BaseModel):
    """Resend verification email"""
    email: str = Field(..., description="User email")


# Routes
@router.post("/login", status_code=status.HTTP_200_OK)
async def login(
    request: LoginRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    user_service: UserService = Depends(get_user_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    token_service: TokenService = Depends(get_token_service),
):
    """
    Login user and return access/refresh tokens
    
    Args:
        request: Login credentials
        http_request: HTTP request for IP extraction
        background_tasks: Background tasks queue
        
    Returns:
        Access token, refresh token, and user info
        
    Raises:
        HTTPException: For authentication errors
    """
    try:
        client_ip = http_request.client.host if http_request.client else "unknown"
        
        # Rate limiting
        if not await rate_limiter.check_rate_limit(
            request.email,
            max_requests=5,
            window_seconds=60
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later."
            )
        
        # Authenticate user
        user = await user_service.authenticate_user(request.email, request.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Update last login
        background_tasks.add_task(
            user_service.update_last_login,
            user["id"]
        )
        
        # Create token pair
        tokens = await token_service.create_token_pair(
            email=user["email"],
            user_id=user["id"],
            role=user["role"],
            device_fingerprint=request.device_fingerprint
        )
        
        logger.info(f"User logged in: {user['email']} from {client_ip}")
        
        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": tokens["token_type"],
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "role": user["role"],
                "is_verified": user["is_verified"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_token(
    request: RefreshTokenRequest,
    http_request: Request,
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    token_service: TokenService = Depends(get_token_service),
):
    """
    Refresh access token using refresh token
    
    Args:
        request: Refresh token
        http_request: HTTP request
        
    Returns:
        New access token
        
    Raises:
        HTTPException: If refresh token is invalid
    """
    try:
        client_ip = http_request.client.host if http_request.client else "unknown"
        
        # Rate limiting
        if not await rate_limiter.check_rate_limit(
            f"refresh_{client_ip}",
            max_requests=10,
            window_seconds=60
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many refresh requests"
            )
        
        # Refresh token
        new_tokens = await token_service.refresh_access_token(request.refresh_token)
        
        logger.info(f"Token refreshed from {client_ip}")
        
        return {
            "access_token": new_tokens["access_token"],
            "token_type": new_tokens["token_type"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    request: LogoutRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    token_service: TokenService = Depends(get_token_service),
):
    """
    Logout user and revoke tokens
    
    Args:
        request: Logout options
        http_request: HTTP request
        current_user: Authenticated user
        
    Returns:
        Logout confirmation
    """
    try:
        client_ip = http_request.client.host if http_request.client else "unknown"
        
        if request.logout_all_devices:
            # Revoke all tokens
            await token_service.revoke_all_user_tokens(current_user.get("user_id"))
            logger.info(f"User logged out from all devices: {current_user.get('email')} from {client_ip}")
            message = "Logged out from all devices"
        else:
            # Revoke current refresh token
            await token_service.revoke_refresh_token(
                current_user.get("email")
            )
            logger.info(f"User logged out: {current_user.get('email')} from {client_ip}")
            message = "Logged out successfully"
        
        return {
            "message": message,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    request: SignupRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    user_service: UserService = Depends(get_user_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    token_service: TokenService = Depends(get_token_service),
):
    """
    Register new user
    
    Args:
        request: Registration data
        http_request: HTTP request
        background_tasks: Background tasks queue
        
    Returns:
        New user and tokens
        
    Raises:
        HTTPException: For validation errors
    """
    try:
        client_ip = http_request.client.host if http_request.client else "unknown"
        
        # Rate limiting for signup
        if not await rate_limiter.check_rate_limit(
            f"signup_{client_ip}",
            max_requests=5,
            window_seconds=3600
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many signup attempts from this IP"
            )
        
        # Validate password confirmation
        if request.password != request.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match"
            )
        
        # Create user
        user = await user_service.create_user(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            role=UserRole.STUDENT
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        # Create token pair
        tokens = await token_service.create_token_pair(
            email=user["email"],
            user_id=user["id"],
            role=user["role"]
        )
        
        # --- Trigger email verification in the background ---
        try:
            from domains.mailings.services.email_service import email_service
            from core.config import settings

            success, verification_code = await user_service.generate_email_verification_code(user["id"])
            if success and verification_code:
                # Build a link that carries the code for one-click verification
                verification_link = (
                    f"{settings.FRONTEND_URL}/verify-email"
                    f"?email={user['email']}&code={verification_code}"
                )

                background_tasks.add_task(
                    email_service.send_email_verification,
                    user["email"],
                    user["full_name"],
                    verification_code,
                    verification_link,
                )
        except Exception as email_err:
            # Never fail the signup because of email — log and continue
            logger.error(f"Failed to queue verification email for {user['email']}: {email_err}")

        logger.info(f"New user registered: {user['email']} from {client_ip}")
        
        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": tokens["token_type"],
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "role": user["role"],
                "is_verified": False
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    request: ResetPasswordRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    user_service: UserService = Depends(get_user_service),
):
    """
    Request password reset — sends a 6-digit OTP to the user's email.
    """
    try:
        client_ip = http_request.client.host if http_request.client else "unknown"

        # Rate limiting — 3 requests per hour per email
        if not await rate_limiter.check_rate_limit(
            f"reset_{request.email}",
            max_requests=3,
            window_seconds=3600
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many reset attempts. Try again later."
            )

        # Generate OTP
        success, otp = await user_service.reset_password_request(request.email)

        # Send OTP via email in the background (only when user exists)
        if success and otp:
            from domains.mailings.services.email_service import email_service

            # Fetch user name for the email greeting
            user_data = await user_service.find_by_email(request.email)
            user_name = user_data.get("full_name", "") if user_data else ""

            background_tasks.add_task(
                email_service.send_password_reset_otp,
                request.email,
                user_name,
                otp,
            )

        logger.info(f"Password reset requested for {request.email} from {client_ip}")

        # Always return the same response to avoid email enumeration
        return {
            "message": "If an account exists with this email, a verification code has been sent.",
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )


@router.post("/verify-reset-otp", status_code=status.HTTP_200_OK)
async def verify_reset_otp(
    request: VerifyResetOtpRequest,
    http_request: Request,
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    user_service: UserService = Depends(get_user_service),
):
    """
    Verify a 6-digit OTP and return a session token for the password-reset step.
    """
    try:
        client_ip = http_request.client.host if http_request.client else "unknown"

        # Rate limiting — 5 attempts per 10 minutes per email
        if not await rate_limiter.check_rate_limit(
            f"verify_otp_{request.email}",
            max_requests=5,
            window_seconds=600
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many verification attempts. Please wait and try again."
            )

        success, session_token = await user_service.verify_reset_otp(
            request.email,
            request.otp,
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification failed"
            )

        logger.info(f"Reset OTP verified for {request.email} from {client_ip}")

        return {
            "message": "Verification successful",
            "reset_token": session_token,
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification failed"
        )


@router.post("/resend-reset-otp", status_code=status.HTTP_200_OK)
async def resend_reset_otp(
    request: ResetPasswordRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    user_service: UserService = Depends(get_user_service),
):
    """
    Re-generate and re-send the 6-digit OTP.
    Uses a tighter rate limit than the initial request.
    """
    try:
        client_ip = http_request.client.host if http_request.client else "unknown"

        # Rate limiting — 2 resends per 10 min per email
        if not await rate_limiter.check_rate_limit(
            f"resend_otp_{request.email}",
            max_requests=2,
            window_seconds=600
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many resend attempts. Please wait a few minutes."
            )

        success, otp = await user_service.reset_password_request(request.email)

        if success and otp:
            from domains.mailings.services.email_service import email_service

            user_data = await user_service.find_by_email(request.email)
            user_name = user_data.get("full_name", "") if user_data else ""

            background_tasks.add_task(
                email_service.send_password_reset_otp,
                request.email,
                user_name,
                otp,
            )

        logger.info(f"Reset OTP resent for {request.email} from {client_ip}")

        return {
            "message": "A new verification code has been sent to your email.",
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP resend error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification code"
        )


@router.post("/reset-password/confirm", status_code=status.HTTP_200_OK)
async def reset_password_confirm(
    request: ResetPasswordConfirmRequest,
    http_request: Request,
    user_service: UserService = Depends(get_user_service),
):
    """
    Confirm password reset using the session token obtained after OTP verification.
    Enforces password-reuse prevention (last 5 passwords).
    """
    try:
        # Validate password confirmation
        if request.new_password != request.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match"
            )

        # Reset password (service validates token, checks history, etc.)
        success = await user_service.reset_password(
            request.email,
            request.reset_token,
            request.new_password
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset failed"
            )

        logger.info(f"Password reset confirmed for {request.email}")

        return {
            "message": "Password reset successfully",
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset confirmation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )


# ===== EMAIL VERIFICATION ENDPOINTS =====


@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(
    request: VerifyEmailRequest,
    http_request: Request,
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    user_service: UserService = Depends(get_user_service),
):
    """
    Verify user's email with a 6-digit code (manual entry or from link).
    """
    try:
        client_ip = http_request.client.host if http_request.client else "unknown"

        # Rate limit — 5 attempts per 10 min per email
        if not await rate_limiter.check_rate_limit(
            f"verify_email_{request.email}",
            max_requests=5,
            window_seconds=600
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many verification attempts. Please wait and try again."
            )

        success = await user_service.verify_email_by_code(request.email, request.code)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email verification failed"
            )

        logger.info(f"Email verified for {request.email} from {client_ip}")

        return {
            "message": "Email verified successfully",
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification_email(
    request: ResendVerificationRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    user_service: UserService = Depends(get_user_service),
):
    """
    Resend the email verification code.

    Invalidates any previous code and generates a new one.
    Rate-limited to prevent abuse.
    """
    try:
        client_ip = http_request.client.host if http_request.client else "unknown"

        # Rate limit — 3 resends per hour per email
        if not await rate_limiter.check_rate_limit(
            f"resend_verify_{request.email}",
            max_requests=3,
            window_seconds=3600
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many resend attempts. Please try again later."
            )

        # Find user by email
        user_data = await user_service.find_by_email(request.email)

        # Always return success to avoid email enumeration
        if user_data and not user_data.get("is_verified"):
            from domains.mailings.services.email_service import email_service
            from core.config import settings

            success, verification_code = await user_service.generate_email_verification_code(
                user_data["id"]
            )

            if success and verification_code:
                verification_link = (
                    f"{settings.FRONTEND_URL}/verify-email"
                    f"?email={request.email}&code={verification_code}"
                )

                background_tasks.add_task(
                    email_service.send_email_verification,
                    request.email,
                    user_data.get("full_name", ""),
                    verification_code,
                    verification_link,
                )

        logger.info(f"Verification resend requested for {request.email} from {client_ip}")

        return {
            "message": "If your account exists and is not yet verified, a new verification email has been sent.",
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification email"
        )


@router.get("/verification-status", status_code=status.HTTP_200_OK)
async def check_verification_status(
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """
    Check if the current user's email is verified.
    Useful for frontend guards and banners.
    """
    try:
        user = await user_service.find_by_id(current_user.get("user_id"), include_onboarding=False)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return {
            "is_verified": user.get("is_verified", False),
            "email": user.get("email"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification status check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check verification status"
        )


@router.get("/me", status_code=status.HTTP_200_OK)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """
    Get current user information
    
    Args:
        current_user: Authenticated user from token
        
    Returns:
        Current user details
    """
    try:
        user = await user_service.find_by_id(current_user.get("user_id"))
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"user": user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user info"
        )


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    request: ChangePasswordRequest,
    http_request: Request,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """
    Change user password
    
    Args:
        request: Password change request
        http_request: HTTP request
        current_user: Authenticated user
        
    Returns:
        Confirmation message
        
    Raises:
        HTTPException: If password change fails
    """
    try:
        # Validate password confirmation
        if request.new_password != request.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match"
            )
        
        # Change password
        success = await user_service.change_password(
            current_user.get("user_id"),
            request.old_password,
            request.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to change password"
            )
        
        logger.info(f"Password changed for user {current_user.get('email')}")
        
        return {
            "message": "Password changed successfully",
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )


@router.put("/me", status_code=status.HTTP_200_OK)
async def update_current_user_profile(
    request: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """
    Update current user profile
    
    Args:
        request: Profile update data (bio, github_username, linkedin_username, full_name)
        current_user: Authenticated user from token
        
    Returns:
        Updated user details
    """
    try:
        user_id = current_user.get("user_id")
        
        # Build update data from non-None fields
        update_data = {}
        if request.full_name is not None:
            update_data["full_name"] = request.full_name
        if request.bio is not None:
            update_data["bio"] = request.bio
        if request.github_username is not None:
            update_data["github_username"] = request.github_username
        if request.linkedin_username is not None:
            update_data["linkedin_username"] = request.linkedin_username
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        # Update user profile
        updated_user = await user_service.update_profile(user_id, update_data)
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"Profile updated for user {current_user.get('email')}")
        
        return {"user": updated_user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )


# ===== MENTOR PROFILE ENDPOINTS =====

@router.get("/me/mentor-profile", status_code=status.HTTP_200_OK)
async def get_my_mentor_profile(
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """
    Get current mentor's profile
    
    Returns mentor-specific profile data including:
    - Professional title/profession
    - Company
    - Languages spoken
    - Expertise areas
    - Availability settings
    """
    from auth.dependencies import get_db_session
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from domains.users.models.onboarding import MentorProfile
    
    try:
        user_id = current_user.get("user_id")
        user_role = current_user.get("role")
        
        # Only mentors can access their mentor profile
        if user_role not in [UserRole.MENTOR.value, UserRole.MENTOR, UserRole.ADMIN.value, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can access mentor profile"
            )
        
        # Get database session
        async for session in get_db_session():
            # Get or create mentor profile
            stmt = select(MentorProfile).where(MentorProfile.user_id == user_id)
            result = await session.execute(stmt)
            profile = result.scalar_one_or_none()
            
            if not profile:
                # Create empty profile if it doesn't exist
                profile = MentorProfile(user_id=user_id)
                session.add(profile)
                await session.commit()
                await session.refresh(profile)
            
            return {
                "user_id": str(profile.user_id),
                "title": profile.title,
                "company": profile.company,
                "expertise": profile.expertise or [],
                "languages": profile.languages or [],
                "hourly_rate": float(profile.hourly_rate) if profile.hourly_rate else None,
                "availability": profile.availability or "available",
                "timezone": profile.timezone or "UTC",
                "years_experience": profile.years_experience,
                "linkedin_url": profile.linkedin_url,
                "github_url": profile.github_url,
                "website_url": profile.website_url,
                "total_sessions": profile.total_sessions or 0,
                "total_students": profile.total_students or 0,
                "rating": float(profile.rating) if profile.rating else 0.0,
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting mentor profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get mentor profile"
        )


@router.put("/me/mentor-profile", status_code=status.HTTP_200_OK)
async def update_my_mentor_profile(
    request: MentorProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """
    Update current mentor's profile
    
    Updates mentor-specific profile data:
    - title: Professional title/profession (e.g., "Senior Data Scientist")
    - company: Company working for
    - languages: List of languages spoken
    - expertise: List of expertise areas
    - years_experience: Years of professional experience
    - timezone: Preferred timezone
    - availability: Availability status
    """
    from db.session import get_db_session
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from domains.users.models.onboarding import MentorProfile
    from datetime import datetime, timezone
    
    try:
        user_id = current_user.get("user_id")
        user_role = current_user.get("role")
        
        # Only mentors can update their mentor profile
        if user_role not in [UserRole.MENTOR.value, UserRole.MENTOR, UserRole.ADMIN.value, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can update mentor profile"
            )
        
        # Get database session
        async for session in get_db_session():
            # Get or create mentor profile
            stmt = select(MentorProfile).where(MentorProfile.user_id == user_id)
            result = await session.execute(stmt)
            profile = result.scalar_one_or_none()
            
            if not profile:
                profile = MentorProfile(user_id=user_id)
                session.add(profile)
            
            # Update fields from request
            update_data = request.model_dump(exclude_unset=True)
            
            for field, value in update_data.items():
                if hasattr(profile, field):
                    setattr(profile, field, value)
            
            profile.updated_at = datetime.now(timezone.utc)
            
            await session.commit()
            await session.refresh(profile)
            
            logger.info(f"Mentor profile updated for user {current_user.get('email')}")
            
            return {
                "user_id": str(profile.user_id),
                "title": profile.title,
                "company": profile.company,
                "expertise": profile.expertise or [],
                "languages": profile.languages or [],
                "hourly_rate": float(profile.hourly_rate) if profile.hourly_rate else None,
                "availability": profile.availability or "available",
                "timezone": profile.timezone or "UTC",
                "years_experience": profile.years_experience,
                "linkedin_url": profile.linkedin_url,
                "github_url": profile.github_url,
                "website_url": profile.website_url,
                "total_sessions": profile.total_sessions or 0,
                "total_students": profile.total_students or 0,
                "rating": float(profile.rating) if profile.rating else 0.0,
                "message": "Mentor profile updated successfully"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating mentor profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update mentor profile"
        )


@router.post("/me/avatar", status_code=status.HTTP_200_OK)
async def upload_avatar(
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """
    Upload avatar image
    
    Accepts base64 encoded image data in request body.
    Stores the avatar and returns the URL.
    
    For now, this stores a placeholder URL. In production,
    this would upload to a cloud storage service.
    """
    from fastapi import Body
    from db.session import get_db_session
    from sqlalchemy import select, update
    from domains.users.models.user import User
    from datetime import datetime, timezone
    import base64
    import uuid
    
    try:
        user_id = current_user.get("user_id")
        
        # For now, generate a placeholder avatar URL
        # In production, this would handle actual file upload to S3/CloudStorage
        avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id}"
        
        # Update user's avatar_url in database
        async for session in get_db_session():
            stmt = select(User).where(User.id == user_id)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            user.avatar_url = avatar_url
            user.updated_at = datetime.now(timezone.utc)
            
            await session.commit()
            
            logger.info(f"Avatar updated for user {current_user.get('email')}")
            
            return AvatarUploadResponse(
                avatar_url=avatar_url,
                message="Avatar updated successfully"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading avatar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar"
        )


@router.put("/me/avatar", status_code=status.HTTP_200_OK)
async def update_avatar_url(
    avatar_url: str = Body(..., embed=True, description="Avatar URL"),
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """
    Update avatar URL directly
    
    Accepts a URL string to set as the user's avatar.
    Useful when uploading to external services.
    """
    from db.session import get_db_session
    from sqlalchemy import select
    from domains.users.models.user import User
    from datetime import datetime, timezone
    
    try:
        user_id = current_user.get("user_id")
        
        # Update user's avatar_url in database
        async for session in get_db_session():
            stmt = select(User).where(User.id == user_id)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            user.avatar_url = avatar_url
            user.updated_at = datetime.now(timezone.utc)
            
            await session.commit()
            
            logger.info(f"Avatar URL updated for user {current_user.get('email')}")
            
            return AvatarUploadResponse(
                avatar_url=avatar_url,
                message="Avatar updated successfully"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating avatar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update avatar"
        )
