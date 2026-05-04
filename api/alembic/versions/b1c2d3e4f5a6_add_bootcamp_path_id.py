"""add bootcamp path_id

Revision ID: b1c2d3e4f5a6
Revises: ba7abe03233e
Create Date: 2026-04-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b1c2d3e4f5a6"
down_revision = "ba7abe03233e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bootcamps",
        sa.Column("path_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_bootcamps_path_id_learning_paths",
        "bootcamps",
        "learning_paths",
        ["path_id"],
        ["path_id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_bootcamps_path_id_learning_paths",
        "bootcamps",
        type_="foreignkey",
    )
    op.drop_column("bootcamps", "path_id")
