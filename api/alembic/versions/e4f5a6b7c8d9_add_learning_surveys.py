"""Add automatic learning survey tables.

Revision ID: e4f5a6b7c8d9
Revises: b1c2d3e4f5a6, c8d9e0f1a2b3, d1e2f3a4b5c6
Create Date: 2026-07-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, tuple[str, ...], None] = (
    "b1c2d3e4f5a6",
    "c8d9e0f1a2b3",
    "d1e2f3a4b5c6",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "surveys",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("survey_type", sa.String(length=50), nullable=False),
        sa.Column("trigger_type", sa.String(length=50), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("priority", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_by", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_surveys_slug", "surveys", ["slug"], unique=True)
    op.create_index("ix_surveys_survey_type", "surveys", ["survey_type"])
    op.create_index("ix_surveys_trigger_type", "surveys", ["trigger_type"])
    op.create_index("ix_surveys_is_active", "surveys", ["is_active"])

    op.create_table(
        "survey_questions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("survey_id", sa.Integer(), nullable=False),
        sa.Column("question_key", sa.String(length=100), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(length=30), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("is_required", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("survey_id", "question_key", name="uq_survey_question_key"),
    )
    op.create_index("ix_survey_questions_survey_id", "survey_questions", ["survey_id"])
    op.create_index("idx_survey_questions_order", "survey_questions", ["survey_id", "order"])

    op.create_table(
        "survey_responses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("survey_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=True),
        sa.Column("path_id", sa.Integer(), nullable=True),
        sa.Column("enrollment_id", sa.Integer(), nullable=True),
        sa.Column("module_id", sa.Integer(), nullable=True),
        sa.Column("cycle_key", sa.String(length=150), nullable=False),
        sa.Column("responses_json", sa.JSON(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.course_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["path_id"], ["learning_paths.path_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["enrollment_id"], ["user_course_enrollments.enrollment_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["module_id"], ["modules.module_id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "survey_id", "enrollment_id", "cycle_key", name="uq_survey_response_cycle"),
    )
    for column in ("survey_id", "user_id", "course_id", "path_id", "enrollment_id", "module_id", "submitted_at"):
        op.create_index(f"ix_survey_responses_{column}", "survey_responses", [column])
    op.create_index("idx_survey_responses_filters", "survey_responses", ["survey_id", "course_id", "submitted_at"])

    op.create_table(
        "user_survey_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("survey_id", sa.Integer(), nullable=False),
        sa.Column("enrollment_id", sa.Integer(), nullable=True),
        sa.Column("module_id", sa.Integer(), nullable=True),
        sa.Column("cycle_key", sa.String(length=150), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="shown", nullable=False),
        sa.Column("shown_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("skipped_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_eligible_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["enrollment_id"], ["user_course_enrollments.enrollment_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["module_id"], ["modules.module_id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "survey_id", "enrollment_id", "cycle_key", name="uq_user_survey_event_cycle"),
    )
    for column in ("user_id", "survey_id", "enrollment_id", "status", "shown_at", "next_eligible_at"):
        op.create_index(f"ix_user_survey_events_{column}", "user_survey_events", [column])
    op.create_index("idx_user_survey_events_cooldown", "user_survey_events", ["user_id", "shown_at", "next_eligible_at"])


def downgrade() -> None:
    op.drop_table("user_survey_events")
    op.drop_table("survey_responses")
    op.drop_table("survey_questions")
    op.drop_table("surveys")
