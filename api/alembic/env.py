"""Alembic environment configuration for database migrations."""
from logging.config import fileConfig
import asyncio
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import your models' Base and database config
from db.base import Base
from core.config import settings

# Import all models so they are registered with Base.metadata
from domains.users.models.user import User
from domains.users.models.onboarding import UserProfile
from domains.courses.models.course import Course, LearningPath, Module
from domains.courses.models.certification import Certificate
from domains.progress.models.progress import UserProgress
from domains.payments.models import Payment, PaymentAuditLog, EnrollmentStatus, PaymentStatus
# Add other model imports as needed

# this is the Alembic Config object
config = context.config

# Get database URL - we'll use it directly in the engine creation
# Don't set it via config due to special character issues with configparser
DATABASE_URL_SYNC = settings.DATABASE_URL.replace("+asyncpg", "")

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    context.configure(
        url=DATABASE_URL_SYNC,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import create_engine
    
    # Use sync engine for migrations
    connectable = create_engine(
        DATABASE_URL_SYNC,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        do_run_migrations(connection)

    connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    from sqlalchemy import create_engine
    
    connectable = create_engine(
        DATABASE_URL_SYNC,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        do_run_migrations(connection)

    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
