"""add_mentor_profiles_table

Revision ID: a8f2c3d4e5f6
Revises: 3df71d87b2be
Create Date: 2026-01-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8f2c3d4e5f6'
down_revision: Union[str, None] = '3df71d87b2be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create mentor_profiles table
    op.create_table(
        'mentor_profiles',
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('company', sa.String(length=255), nullable=True),
        sa.Column('expertise', sa.JSON(), nullable=True, server_default='[]'),
        sa.Column('languages', sa.JSON(), nullable=True, server_default='[]'),
        sa.Column('hourly_rate', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('availability', sa.String(length=20), nullable=True, server_default='available'),
        sa.Column('timezone', sa.String(length=50), nullable=True, server_default='UTC'),
        sa.Column('years_experience', sa.Integer(), nullable=True),
        sa.Column('linkedin_url', sa.String(length=255), nullable=True),
        sa.Column('github_url', sa.String(length=255), nullable=True),
        sa.Column('website_url', sa.String(length=255), nullable=True),
        sa.Column('total_sessions', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_students', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('rating', sa.Numeric(precision=3, scale=2), nullable=True, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )
    
    # Create index on availability for filtering
    op.create_index('idx_mentor_availability', 'mentor_profiles', ['availability'], unique=False)


def downgrade() -> None:
    # Drop index
    op.drop_index('idx_mentor_availability', table_name='mentor_profiles')
    
    # Drop table
    op.drop_table('mentor_profiles')
