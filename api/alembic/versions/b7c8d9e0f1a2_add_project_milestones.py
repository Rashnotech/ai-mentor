"""Add milestones to projects and completed_milestones to user_progress.

Revision ID: b7c8d9e0f1a2
Revises: a6b7c8d9e0f1
Create Date: 2026-11-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "a6b7c8d9e0f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("milestones", sa.JSON(), nullable=True))
    op.add_column("user_progress", sa.Column("completed_milestones", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("user_progress", "completed_milestones")
    op.drop_column("projects", "milestones")
