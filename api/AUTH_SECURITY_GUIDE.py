#!/usr/bin/env python3
"""
Authentication and Security Implementation Guide

This module provides secure authentication routes with industry-standard security practices.
"""

# ============================================================================
# SECURITY FEATURES IMPLEMENTED
# ============================================================================

"""
1. TOKEN MANAGEMENT
   - Enhanced JWT with type validation (access vs refresh)
   - JTI (JWT ID) for token revocation tracking
   - Automatic token expiration handling
   - Token pair creation (access + refresh)
   - Refresh token rotation

2. PASSWORD SECURITY
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 number
   - At least 1 special character
   - Password hashing with bcrypt
   - Password change history (prevents reuse of last 5 passwords)
   - Password reset with time-limited tokens

3. RATE LIMITING
   - Login: 5 attempts per minute
   - Signup: 5 attempts per hour per IP
   - Password reset: 3 attempts per hour per email
   - Token refresh: 10 attempts per minute
   - Brute force protection with 15-minute lockout

4. USER ACCOUNT PROTECTION
   - Email validation
   - Duplicate email prevention
   - Account verification status
   - Last login tracking
   - Failed login attempt tracking
   - Account lockout after 5 failed attempts
   - Automatic lockout reset after 15 minutes

5. TOKEN REVOCATION
   - Individual token revocation
   - All tokens revocation (logout all devices)
   - Token blacklist support
   - Automatic cleanup of expired tokens

6. SECURITY HEADERS
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Strict-Transport-Security
   - Content-Security-Policy
   - Referrer-Policy
   - Permissions-Policy

# ============================================================================
# API ENDPOINTS
# ============================================================================

POST /auth/login
    Request:
        {
            "email": "user@example.com",
            "password": "SecurePass123!",
            "device_fingerprint": "optional-device-id"
        }
    Response:
        {
            "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
            "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
            "token_type": "bearer",
            "user": {
                "id": "user-id",
                "email": "user@example.com",
                "full_name": "User Name",
                "role": "student",
                "is_verified": false
            }
        }
    Status Codes:
        200: Login successful
        401: Invalid credentials
        429: Too many login attempts
        500: Server error

POST /auth/refresh
    Request:
        {
            "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
        }
    Response:
        {
            "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
            "token_type": "bearer"
        }
    Status Codes:
        200: Token refreshed
        401: Invalid refresh token
        429: Too many refresh requests
        500: Server error

POST /auth/logout
    Headers:
        Authorization: Bearer <access_token>
    Request:
        {
            "logout_all_devices": false
        }
    Response:
        {
            "message": "Logged out successfully",
            "status": "success"
        }
    Status Codes:
        200: Logout successful
        401: Unauthorized
        500: Server error

POST /auth/signup
    Request:
        {
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!",
            "full_name": "New User"
        }
    Response:
        {
            "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
            "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
            "token_type": "bearer",
            "user": {
                "id": "user-id",
                "email": "newuser@example.com",
                "full_name": "New User",
                "role": "student"
            }
        }
    Status Codes:
        201: User created
        400: Invalid data or email exists
        429: Too many signup attempts
        500: Server error

POST /auth/reset-password
    Request:
        {
            "email": "user@example.com"
        }
    Response:
        {
            "message": "If account exists, password reset link will be sent to email",
            "status": "success"
        }
    Status Codes:
        200: Reset requested (always returns success for security)
        429: Too many reset attempts
        500: Server error

POST /auth/reset-password/confirm
    Request:
        {
            "email": "user@example.com",
            "reset_token": "reset-token-from-email",
            "new_password": "NewSecurePass123!",
            "confirm_password": "NewSecurePass123!"
        }
    Response:
        {
            "message": "Password reset successfully",
            "status": "success"
        }
    Status Codes:
        200: Password reset
        400: Invalid token or validation error
        500: Server error

POST /auth/change-password
    Headers:
        Authorization: Bearer <access_token>
    Request:
        {
            "old_password": "OldPass123!",
            "new_password": "NewPass123!",
            "confirm_password": "NewPass123!"
        }
    Response:
        {
            "message": "Password changed successfully",
            "status": "success"
        }
    Status Codes:
        200: Password changed
        400: Invalid old password
        401: Unauthorized
        500: Server error

GET /auth/me
    Headers:
        Authorization: Bearer <access_token>
    Response:
        {
            "user": {
                "id": "user-id",
                "email": "user@example.com",
                "full_name": "User Name",
                "role": "student",
                "is_active": true,
                "is_verified": false,
                "last_login": "2025-12-29T10:30:00Z",
                "created_at": "2025-12-25T08:15:00Z"
            }
        }
    Status Codes:
        200: User found
        401: Unauthorized
        404: User not found
        500: Server error

# ============================================================================
# INTEGRATION GUIDE
# ============================================================================

1. IMPORT ROUTES IN MAIN APP
   
   from fastapi import FastAPI
   from api.routes.auth import router as auth_router
   
   app = FastAPI()
   app.include_router(auth_router)

2. DATABASE COLLECTIONS CREATED AUTOMATICALLY
   - users: User accounts
   - refresh_tokens: Active refresh tokens
   - revoked_tokens: Blacklisted tokens
   - password_history: Password change history
   - failed_login_attempts: Failed login tracking
   - rate_limits: Rate limiting data
   - csrf_tokens: CSRF tokens

3. ENVIRONMENT VARIABLES REQUIRED
   JWT_SECRET_KEY: Secret key for JWT (minimum 32 characters)
   JWT_ALGORITHM: Algorithm (default: HS256)
   ACCESS_TOKEN_EXPIRE_MINUTES: Access token lifetime (default: 15)
   REFRESH_TOKEN_EXPIRE_DAYS: Refresh token lifetime (default: 7)
   API_V1_STR: API version prefix (e.g., "/api/v1")

4. MIDDLEWARE SETUP
   Add security headers middleware:
   
   from fastapi.middleware import Middleware
   from api.security.security_utils import SecurityHeaders
   
   # Apply in middleware or response hooks

5. BACKGROUND TASKS
   - Update last login timestamp
   - Send email notifications (password reset, login alerts)
   - Cleanup expired tokens
   - Cleanup failed login attempts

# ============================================================================
# SECURITY BEST PRACTICES
# ============================================================================

1. ALWAYS USE HTTPS IN PRODUCTION
2. KEEP JWT_SECRET_KEY SECURE AND ROTATE PERIODICALLY
3. IMPLEMENT RATE LIMITING AT INFRASTRUCTURE LEVEL (CDN, WAF)
4. MONITOR FAILED LOGIN ATTEMPTS AND SUSPICIOUS PATTERNS
5. LOG ALL AUTH EVENTS WITH TIMESTAMPS AND IPs
6. IMPLEMENT EMAIL VERIFICATION FOR NEW ACCOUNTS
7. SEND LOGIN ALERTS TO EMAIL FOR SECURITY
8. IMPLEMENT IP WHITELISTING FOR ADMIN ACCOUNTS
9. USE SECURE SESSION MANAGEMENT
10. IMPLEMENT AUDIT LOGGING FOR SENSITIVE OPERATIONS

# ============================================================================
# EXAMPLE USAGE
# ============================================================================

CLIENT-SIDE FLOW:

1. User Signup:
   POST /auth/signup
   {email, password, confirm_password, full_name}
   ↓
   Returns: access_token, refresh_token, user info
   ↓
   Store tokens in secure storage

2. User Login:
   POST /auth/login
   {email, password, device_fingerprint}
   ↓
   Returns: access_token, refresh_token, user info
   ↓
   Store tokens in secure storage

3. API Requests:
   GET /api/protected-endpoint
   Headers: Authorization: Bearer <access_token>
   ↓
   Server validates token
   ↓
   If valid: Process request
   If expired: Trigger token refresh

4. Token Refresh:
   POST /auth/refresh
   {refresh_token}
   ↓
   Returns: new access_token
   ↓
   Update stored access_token

5. Logout:
   POST /auth/logout
   Headers: Authorization: Bearer <access_token>
   {logout_all_devices: false}
   ↓
   Server revokes token(s)
   ↓
   Clear tokens from storage

# ============================================================================
# ERROR HANDLING
# ============================================================================

400 Bad Request: Invalid input data
401 Unauthorized: Missing or invalid authentication
403 Forbidden: Insufficient permissions or invalid token type
404 Not Found: Resource not found
429 Too Many Requests: Rate limit exceeded
500 Internal Server Error: Server error

All errors return JSON:
{
    "detail": "Error message"
}

# ============================================================================

What's New:

Fixed UserProfile Model — Updated schema to use String(36) FK to users.id (matching your User model), added timestamps and nullable fields

OnboardingService — Handles:

Creating user profiles after signup
Updating skill level, learning style, goals, language, timezone
Completing onboarding (validates all required fields are set)
Onboarding Routes (4 endpoints):

POST /onboarding/start — Initialize onboarding
GET /onboarding/profile — Get current profile
POST /onboarding/update — Update skill level, learning style, goals, preferences
POST /onboarding/complete — Mark onboarding complete
Flow After Signup:

User signs up → Call POST /onboarding/start to begin onboarding
User selects skill level, learning style, primary goal → Call POST /onboarding/update
User finishes → Call POST /onboarding/complete (validates all required fields)

POST   /api/v1/courses                                    - Create course
POST   /api/v1/courses/{course_id}/paths                 - Create learning path
POST   /api/v1/courses/{course_id}/paths/{path_id}/set-default  - Set default path
POST   /api/v1/courses/paths/{path_id}/modules           - Create module
POST   /api/v1/courses/modules/{module_id}/lessons       - Create lesson
POST   /api/v1/courses/modules/{module_id}/projects      - Create project

Complete Student Journey:

Sign Up → POST /api/v1/auth/signup
Start Onboarding → POST /api/v1/onboarding/start
Update Profile → POST /api/v1/onboarding/update (skill level, learning style, goals)
Complete Onboarding → POST /api/v1/onboarding/complete (marks as done)
Enroll in Course → POST /api/v1/enrollments/courses/{course_id}
Triggers automatic path assignment
Creates custom path matching student's profile OR assigns default
View Learning Path → GET /api/v1/enrollments/courses/{course_id}
Shows complete path structure (modules → lessons → projects)
Personalization Rules:
Custom Path Created When:

Student completes onboarding with skill level, learning style, primary goal
Path title: "Custom Path - Beginner/Intermediate/Advanced"
Tags added: style-visual, goal-career-change, etc.
Min/max skill levels set to student's level
Default Path Assigned When:

No custom path can be created
Course has a default path marked is_default=true
POST   /api/v1/enrollments/courses/{course_id}    - Enroll and get path
GET    /api/v1/enrollments/courses/{course_id}    - View assigned path structure


"""

# Import all modules to ensure they're accessible
from api.auth.jwt import JWTHandler, oauth2_scheme
from api.services.token_service_enhanced import TokenService
from api.domains.users.services.user_service import UserService, UserRole
from api.extension.security_utils import RateLimiter, CSRFProtection, SecurityHeaders
from api.domains.users.routes.auth import router

__all__ = [
    "JWTHandler",
    "oauth2_scheme",
    "TokenService",
    "UserService",
    "UserRole",
    "RateLimiter",
    "CSRFProtection",
    "SecurityHeaders",
    "router",
]
