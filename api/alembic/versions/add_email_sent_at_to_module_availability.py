"""Add email_sent_at to user_module_availability

Revision ID: add_email_sent_at_field
Revises: 
Create Date: 2026-02-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_email_sent_at_field'
down_revision = None  # Update this to your latest migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add email_sent_at column to track notification status."""
    op.add_column(
        'user_module_availability',
        sa.Column('email_sent_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    # Add index for efficient queries on pending notifications
    op.create_index(
        'idx_user_module_availability_email_pending',
        'user_module_availability',
        ['scheduled_unlock_date'],
        postgresql_where=sa.text('is_unlocked = FALSE AND email_sent_at IS NULL')
    )


def downgrade() -> None:
    """Remove email_sent_at column."""
    op.drop_index('idx_user_module_availability_email_pending', table_name='user_module_availability')
    op.drop_column('user_module_availability', 'email_sent_at')
