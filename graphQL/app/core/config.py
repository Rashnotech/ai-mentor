#!/usr/bin/python3
"""a core of an application"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./mydb.db"


settings = Settings()