"""Add ai_mentor_feedback table for the smart-trigger AI mentor agent.

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-07-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f5a6b7c8d9e0"
down_revision: Union[str, None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_mentor_feedback",
        sa.Column("feedback_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("category", sa.String(length=30), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("module_id", sa.Integer(), nullable=True),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("context_title", sa.String(length=255), nullable=True),
        sa.Column("score_percent", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["module_id"], ["modules.module_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("feedback_id"),
    )
    op.create_index("ix_ai_mentor_feedback_user_id", "ai_mentor_feedback", ["user_id"])
    op.create_index("ix_ai_mentor_feedback_category", "ai_mentor_feedback", ["category"])
    op.create_index("ix_ai_mentor_feedback_module_id", "ai_mentor_feedback", ["module_id"])
    op.create_index("ix_ai_mentor_feedback_project_id", "ai_mentor_feedback", ["project_id"])
    op.create_index("idx_ai_mentor_feedback_user_created", "ai_mentor_feedback", ["user_id", "created_at"])
    op.create_index(
        "idx_ai_mentor_feedback_dedup",
        "ai_mentor_feedback",
        ["user_id", "category", "module_id", "project_id"],
    )


def downgrade() -> None:
    op.drop_table("ai_mentor_feedback")
