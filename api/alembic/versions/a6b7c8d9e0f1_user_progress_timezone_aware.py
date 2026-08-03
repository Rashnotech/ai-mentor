"""Make user_progress timestamp columns timezone-aware.

started_at/completed_at/created_at/updated_at were plain TIMESTAMP WITHOUT
TIME ZONE, inconsistent with every other progress-tracking table in the
schema. The project-start trigger writes started_at with an
offset-aware datetime.now(timezone.utc), which asyncpg rejects against a
naive column ("can't subtract offset-naive and offset-aware datetimes").

Revision ID: a6b7c8d9e0f1
Revises: f5a6b7c8d9e0
Create Date: 2026-08-03
"""
from typing import Sequence, Union

from alembic import op


revision: str = "a6b7c8d9e0f1"
down_revision: Union[str, None] = "f5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = ("started_at", "completed_at", "created_at", "updated_at")


def upgrade() -> None:
    for column in _COLUMNS:
        op.execute(
            f"ALTER TABLE user_progress "
            f"ALTER COLUMN {column} TYPE TIMESTAMP WITH TIME ZONE "
            f"USING {column} AT TIME ZONE 'UTC'"
        )


def downgrade() -> None:
    for column in _COLUMNS:
        op.execute(
            f"ALTER TABLE user_progress "
            f"ALTER COLUMN {column} TYPE TIMESTAMP WITHOUT TIME ZONE "
            f"USING {column} AT TIME ZONE 'UTC'"
        )
