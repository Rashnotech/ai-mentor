#!/usr/bin/python3
"""a core of an application"""
from pydantic_settings import BaseSettings
from typing import List, Optional
from dotenv import load_dotenv
from os import getenv

load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Mentor"
    PROJECT_VERSION: str = "1.0.0"
    PROJECT_DESCRIPTION: str = "An AI-powered mentoring platform to guide and support users in their personal and professional growth."
    CORS_ALLOW_ORIGINS: List[str] = ["*"]
    DATABASE_URL: str = getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/ai-mentor")
    DATABASE_NAME: str = getenv("DB_NAME", "ai-mentor")
    ENVIRONMENT: str = getenv("ENV", "development")
    MAIL_FROM: str = getenv("MAIL_FROM", "support@rashnotech.tech")

    API_V1_STR: str = "/api/v1"
    JWT_SECRET_KEY: str = getenv("SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    BREVO_API_KEY: str = str(getenv('BREVO_API_KEY'))
    FRONTEND_URL: str = getenv("FRONTEND_URL", "http://localhost:3000")

    # Nomba Payment Service
    NOMBA_BASE_URL: str = str(getenv("NOMBA_BASE_URL", "https://sandbox.nomba.com"))
    NOMBA_CLIENT_ID: Optional[str] = str(getenv("NOMBA_CLIENT_ID", ""))
    NOMBA_CLIENT_SECRET: Optional[str] = str(getenv("NOMBA_CLIENT_SECRET", ""))
    NOMBA_ACCOUNT_ID: Optional[str] = str(getenv("NOMBA_ACCOUNT_ID", ""))
    NOMBA_WEBHOOK_SECRET: Optional[str] = str(getenv("NOMBA_WEBHOOK_SECRET", ""))
    NOMBA_WEBHOOK_URL: Optional[str] = str(getenv("NOMBA_WEBHOOK_URL", ""))
    NOMBA_TEST_MODE: bool = True
    NOMBA_DEFAULT_CURRENCY: str = str(getenv("NOMBA_DEFAULT_CURRENCY","NGN"))
    NOMBA_DEFAULT_CALLBACK_URL: Optional[str] = str(getenv("NOMBA_DEFAULT_CALLBACK_URL", ""))

    # OAuth - Google
    GOOGLE_CLIENT_ID: str = getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/google/callback")

    # OAuth - GitHub
    GITHUB_CLIENT_ID: str = getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = getenv("GITHUB_CLIENT_SECRET", "")
    GITHUB_REDIRECT_URI: str = getenv("GITHUB_REDIRECT_URI", "http://localhost:3000/auth/github/callback")


    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()