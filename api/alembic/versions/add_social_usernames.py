"""add_github_linkedin_to_users

Revision ID: add_social_usernames
Revises: 
Create Date: 2026-01-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_social_usernames'
down_revision: Union[str, None] = 'a8f2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add github_username and linkedin_username columns to users table"""
    # Add columns with nullable=True to avoid issues with existing data
    op.add_column('users', sa.Column('github_username', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('linkedin_username', sa.String(100), nullable=True))


def downgrade() -> None:
    """Remove github_username and linkedin_username columns from users table"""
    op.drop_column('users', 'linkedin_username')
    op.drop_column('users', 'github_username')
