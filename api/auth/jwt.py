#!/usr/bin/env python3
"""Enhanced JWT authentication module with security features"""
import jwt
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from core.config import settings
import logging


logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


class JWTHandler:
    """Handles JWT token creation and validation with enhanced security"""
    
    @staticmethod
    def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None,
        token_type: str = "access"
    ) -> str:
        """
        Create a JWT access token with security headers
        
        Args:
            data: Payload data to encode
            expires_delta: Custom expiration time
            token_type: Type of token (access/refresh)
            
        Returns:
            Encoded JWT token
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            if token_type == "refresh":
                expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
            else:
                expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": token_type
        })
        
        try:
            encoded_jwt = jwt.encode(
                to_encode,
                settings.JWT_SECRET_KEY,
                algorithm=settings.JWT_ALGORITHM
            )
            logger.debug(f"Created {token_type} token with payload structure")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating JWT token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token creation failed"
            )

    @staticmethod
    def decode_access_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """
        Decode and validate JWT token with type checking
        
        Args:
            token: JWT token to decode
            token_type: Expected token type
            
        Returns:
            Decoded payload or None
            
        Raises:
            HTTPException for various token errors
        """
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Invalid token type. Expected {token_type}"
                )
            
            # Extract sub data
            sub_data = payload.get("sub")
            if isinstance(sub_data, str):
                try:
                    sub_data = json.loads(sub_data)
                except json.JSONDecodeError:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Invalid token payload"
                    )
            
            # Include jti in the returned data for token revocation checks
            if payload.get("jti"):
                sub_data["jti"] = payload.get("jti")
            
            return sub_data
            
        except jwt.ExpiredSignatureError:
            logger.warning(f"Expired {token_type} token attempted")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid {token_type} token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid token"
            )
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Token validation failed"
            )

    @staticmethod
    def verify_token_not_revoked(token: str, revoked_tokens: set) -> bool:
        """
        Check if token has been revoked
        
        Args:
            token: Token to check
            revoked_tokens: Set of revoked token JTIs
            
        Returns:
            True if token is valid (not revoked)
        """
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_exp": False}
            )
            jti = payload.get("jti")
            return jti not in revoked_tokens if jti else True
        except Exception:
            return False
