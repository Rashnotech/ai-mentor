"""Add mentor_bookings table for 1-on-1 student mentor session bookings.

Revision ID: c8d9e0f1a2b4
Revises: b7c8d9e0f1a2
Create Date: 2026-11-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c8d9e0f1a2b4"
down_revision: Union[str, None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mentor_bookings",
        sa.Column("booking_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("student_id", sa.String(length=36), nullable=False),
        sa.Column("mentor_id", sa.String(length=36), nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("platform", sa.String(length=30), nullable=False, server_default="google_meet"),
        sa.Column("meeting_link", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="confirmed"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["mentor_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("booking_id"),
    )
    op.create_index("ix_mentor_bookings_student_id", "mentor_bookings", ["student_id"])
    op.create_index("ix_mentor_bookings_mentor_id", "mentor_bookings", ["mentor_id"])
    op.create_index("idx_mentor_booking_mentor_time", "mentor_bookings", ["mentor_id", "scheduled_start"])


def downgrade() -> None:
    op.drop_index("idx_mentor_booking_mentor_time", table_name="mentor_bookings")
    op.drop_index("ix_mentor_bookings_mentor_id", table_name="mentor_bookings")
    op.drop_index("ix_mentor_bookings_student_id", table_name="mentor_bookings")
    op.drop_table("mentor_bookings")
