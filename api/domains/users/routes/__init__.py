#!/usr/bin/python3
"""api domains users routes package"""

from domains.users.routes import auth, onboarding, admin, community, oauth
from fastapi import APIRouter


user_router = APIRouter()


user_router.include_router(auth.router, tags=["Authentication"])
user_router.include_router(oauth.router, tags=["OAuth"])
user_router.include_router(onboarding.router, tags=["Onboarding"])
user_router.include_router(admin.router, tags=["Admin - Users"])
user_router.include_router(community.router, tags=["Community"])