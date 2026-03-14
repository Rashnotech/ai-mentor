"""add email verification token fields to users

Revision ID: e7a1b2c3d4e5
Revises: 4c5a3ebc62dd
Create Date: 2026-02-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7a1b2c3d4e5'
down_revision: Union[str, None] = '4c5a3ebc62dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('email_verification_token', sa.String(255), nullable=True),
    )
    op.add_column(
        'users',
        sa.Column(
            'email_verification_token_expires',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_index(
        'idx_user_email_verification_token',
        'users',
        ['email_verification_token'],
    )


def downgrade() -> None:
    op.drop_index('idx_user_email_verification_token', table_name='users')
    op.drop_column('users', 'email_verification_token_expires')
    op.drop_column('users', 'email_verification_token')
