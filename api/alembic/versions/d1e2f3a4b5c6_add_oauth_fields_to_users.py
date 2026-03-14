"""add oauth fields to users

Revision ID: d1e2f3a4b5c6
Revises: ba7abe03233e
Create Date: 2026-02-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d1e2f3a4b5c6"
down_revision: str = "ba7abe03233e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add OAuth columns to users table
    op.add_column("users", sa.Column("auth_provider", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("provider_id", sa.String(255), nullable=True))

    # Make password nullable (for OAuth users who don't have passwords)
    op.alter_column("users", "password", existing_type=sa.String(255), nullable=True)

    # Add indexes
    op.create_index("idx_user_provider", "users", ["auth_provider", "provider_id"])


def downgrade() -> None:
    op.drop_index("idx_user_provider", table_name="users")
    op.alter_column("users", "password", existing_type=sa.String(255), nullable=False)
    op.drop_column("users", "provider_id")
    op.drop_column("users", "auth_provider")
