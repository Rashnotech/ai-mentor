#!/usr/bin/python3
"""Main app entry"""
from fastapi import FastAPI, HTTPException, Body
from contextlib import asynccontextmanager
from domains.users.routes import user_router
from domains.courses.routes import admin as courses_admin
from domains.courses.routes import student as courses_student
from domains.courses.routes import mentor as courses_mentor
from domains.courses.routes import rewards as courses_rewards
from domains.courses.routes import public as courses_public
from domains.bootcamps.routes import router as bootcamps_router
from domains.sessions.routes import router as sessions_router
from domains.community.routes import router as community_router
from domains.payments.routes import router as payments_router
from domains.payments.admin_routes import router as payments_admin_router
from domains.courses.jobs.scheduler import setup_scheduled_jobs, start_scheduler, stop_scheduler
from core.config import settings
from fastapi.middleware.cors import CORSMiddleware
from db.base import Base
from db.session import db_session


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management - startup and shutdown events."""
    # Startup
    await db_session.create_tables_async()
    
    # Setup and start the background job scheduler
    setup_scheduled_jobs()
    start_scheduler()
    
    yield
    
    # Shutdown
    stop_scheduler()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.PROJECT_VERSION,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# Build CORS origins: allow specific frontend URL + any extras from config
_cors_origins = []
if settings.FRONTEND_URL:
    _cors_origins.append(settings.FRONTEND_URL)
for origin in settings.CORS_ALLOW_ORIGINS:
    if origin != "*" and origin not in _cors_origins:
        _cors_origins.append(origin)
# Fallback to ["*"] only if nothing specific is configured
if not _cors_origins:
    _cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(user_router, prefix=settings.API_V1_STR)
app.include_router(courses_admin.router, prefix=settings.API_V1_STR)
app.include_router(courses_student.router, prefix=settings.API_V1_STR)
app.include_router(courses_mentor.router, prefix=settings.API_V1_STR)
app.include_router(courses_rewards.router, prefix=settings.API_V1_STR)
app.include_router(courses_public.router, prefix=settings.API_V1_STR)
app.include_router(bootcamps_router, prefix=settings.API_V1_STR)
app.include_router(sessions_router, prefix=settings.API_V1_STR)
app.include_router(community_router, prefix=settings.API_V1_STR)
app.include_router(payments_router, prefix=settings.API_V1_STR)
app.include_router(payments_admin_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)