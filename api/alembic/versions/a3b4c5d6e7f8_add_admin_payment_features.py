"""add admin payment features: split payment cols, audit log table, extended enum values

Revision ID: a3b4c5d6e7f8
Revises: f7e8d9c0b1a2
Create Date: 2026-02-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3b4c5d6e7f8'
down_revision: Union[str, None] = 'f7e8d9c0b1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add new enum values to paymentstatus
    # PostgreSQL requires explicit ALTER TYPE for enum additions
    op.execute("ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'cancelled'")
    op.execute("ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'partial'")

    # 2. Add new columns to payments table
    op.add_column(
        'payments',
        sa.Column('is_split_payment', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.add_column(
        'payments',
        sa.Column('admin_override_note', sa.Text(), nullable=True),
    )
    op.add_column(
        'payments',
        sa.Column('overridden_by', sa.String(36), nullable=True),
    )
    op.create_foreign_key(
        'fk_payment_overridden_by',
        'payments',
        'users',
        ['overridden_by'],
        ['id'],
        ondelete='SET NULL',
    )

    # 3. Create payment_audit_logs table
    op.create_table(
        'payment_audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('payment_id', sa.Integer(), nullable=False),
        sa.Column('admin_id', sa.String(36), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('previous_status', sa.String(20), nullable=True),
        sa.Column('new_status', sa.String(20), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_audit_payment', 'payment_audit_logs', ['payment_id'])
    op.create_index('idx_audit_admin', 'payment_audit_logs', ['admin_id'])


def downgrade() -> None:
    op.drop_index('idx_audit_admin', table_name='payment_audit_logs')
    op.drop_index('idx_audit_payment', table_name='payment_audit_logs')
    op.drop_table('payment_audit_logs')

    op.drop_constraint('fk_payment_overridden_by', 'payments', type_='foreignkey')
    op.drop_column('payments', 'overridden_by')
    op.drop_column('payments', 'admin_override_note')
    op.drop_column('payments', 'is_split_payment')

    # Note: PostgreSQL does not support removing enum values easily.
    # The 'cancelled' and 'partial' values will remain in the enum type.
    # To fully remove them, you'd need to recreate the enum type.
