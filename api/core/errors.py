#!/usr/bin/python3
"""
Custom exception and error handling for the AI Mentor API.
"""
from typing import Optional


class AppError(Exception):
    """
    Custom application error with HTTP status code and error code.
    
    Used throughout the application for consistent error handling and responses.
    """
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str,
        headers: Optional[dict] = None,
    ):
        """
        Initialize AppError.
        
        Args:
            status_code: HTTP status code (e.g., 400, 404, 500)
            detail: Human-readable error message
            error_code: Machine-readable error code (e.g., "INVALID_CREDENTIALS")
            headers: Optional headers to include in response
        """
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
        self.headers = headers
        super().__init__(detail)
    
    def to_dict(self) -> dict:
        """Convert error to dictionary format for API response."""
        return {
            "status_code": self.status_code,
            "detail": self.detail,
            "error_code": self.error_code,
        }


class ValidationError(AppError):
    """Raised when request validation fails."""
    
    def __init__(self, detail: str, error_code: str = "VALIDATION_ERROR"):
        super().__init__(
            status_code=400,
            detail=detail,
            error_code=error_code,
        )


class AuthenticationError(AppError):
    """Raised when authentication fails."""
    
    def __init__(self, detail: str = "Authentication failed", error_code: str = "AUTHENTICATION_ERROR"):
        super().__init__(
            status_code=401,
            detail=detail,
            error_code=error_code,
        )


class AuthorizationError(AppError):
    """Raised when user lacks required permissions."""
    
    def __init__(self, detail: str = "Not authorized", error_code: str = "AUTHORIZATION_ERROR"):
        super().__init__(
            status_code=403,
            detail=detail,
            error_code=error_code,
        )


class NotFoundError(AppError):
    """Raised when requested resource not found."""
    
    def __init__(self, detail: str = "Resource not found", error_code: str = "NOT_FOUND"):
        super().__init__(
            status_code=404,
            detail=detail,
            error_code=error_code,
        )


class ConflictError(AppError):
    """Raised when request conflicts with existing data."""
    
    def __init__(self, detail: str = "Conflict", error_code: str = "CONFLICT"):
        super().__init__(
            status_code=409,
            detail=detail,
            error_code=error_code,
        )


class RateLimitError(AppError):
    """Raised when rate limit exceeded."""
    
    def __init__(self, detail: str = "Rate limit exceeded", error_code: str = "RATE_LIMIT_EXCEEDED"):
        super().__init__(
            status_code=429,
            detail=detail,
            error_code=error_code,
            headers={"Retry-After": "60"},
        )


class InternalServerError(AppError):
    """Raised for internal server errors."""
    
    def __init__(self, detail: str = "Internal server error", error_code: str = "INTERNAL_ERROR"):
        super().__init__(
            status_code=500,
            detail=detail,
            error_code=error_code,
        )
