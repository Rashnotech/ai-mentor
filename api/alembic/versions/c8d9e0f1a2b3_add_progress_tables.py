"""add progress tracking tables

Revision ID: c8d9e0f1a2b3
Revises: a3b4c5d6e7f8
Create Date: 2026-03-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


progress_status_enum = sa.Enum(
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETED",
    name="progressstatus",
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # Ensure enum exists before creating user_progress.
    progress_status_enum.create(bind, checkfirst=True)

    if "user_progress" not in existing_tables:
        op.create_table(
            "user_progress",
            sa.Column("progress_id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=True),
            sa.Column("lesson_id", sa.Integer(), nullable=True),
            sa.Column("project_id", sa.Integer(), nullable=True),
            sa.Column("status", progress_status_enum, nullable=True),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("time_spent_seconds", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.CheckConstraint(
                "lesson_id IS NOT NULL OR project_id IS NOT NULL",
                name="check_lesson_or_project",
            ),
            sa.ForeignKeyConstraint(["lesson_id"], ["lessons.lesson_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("progress_id"),
        )
        op.create_index("ix_user_progress_user_id", "user_progress", ["user_id"], unique=False)
        op.create_index("ix_user_progress_lesson_id", "user_progress", ["lesson_id"], unique=False)
        op.create_index("ix_user_progress_project_id", "user_progress", ["project_id"], unique=False)
        op.create_index("ix_user_progress_status", "user_progress", ["status"], unique=False)
        op.create_index(
            "idx_user_progress_status",
            "user_progress",
            ["user_id", "status"],
            unique=False,
        )

    if "path_adjustments" not in existing_tables:
        op.create_table(
            "path_adjustments",
            sa.Column("adjustment_id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=True),
            sa.Column("path_id", sa.Integer(), nullable=True),
            sa.Column("adjustment_type", sa.String(length=50), nullable=True),
            sa.Column("target_module_id", sa.Integer(), nullable=True),
            sa.Column("target_lesson_id", sa.Integer(), nullable=True),
            sa.Column("target_project_id", sa.Integer(), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("ai_reason", sa.String(length=255), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["path_id"], ["learning_paths.path_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["target_lesson_id"], ["lessons.lesson_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["target_module_id"], ["modules.module_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["target_project_id"], ["projects.project_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("adjustment_id"),
        )
        op.create_index("ix_path_adjustments_user_id", "path_adjustments", ["user_id"], unique=False)
        op.create_index("ix_path_adjustments_path_id", "path_adjustments", ["path_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "path_adjustments" in existing_tables:
        op.drop_index("ix_path_adjustments_path_id", table_name="path_adjustments")
        op.drop_index("ix_path_adjustments_user_id", table_name="path_adjustments")
        op.drop_table("path_adjustments")

    if "user_progress" in existing_tables:
        op.drop_index("idx_user_progress_status", table_name="user_progress")
        op.drop_index("ix_user_progress_status", table_name="user_progress")
        op.drop_index("ix_user_progress_project_id", table_name="user_progress")
        op.drop_index("ix_user_progress_lesson_id", table_name="user_progress")
        op.drop_index("ix_user_progress_user_id", table_name="user_progress")
        op.drop_table("user_progress")

    progress_status_enum.drop(bind, checkfirst=True)
