#!/usr/bin/python3
"""Internship routes package."""
from .internship_routes import router
from .admin_routes import router as admin_router

__all__ = ["router", "admin_router"]
