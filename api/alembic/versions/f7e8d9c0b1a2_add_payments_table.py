"""add payments table and enrollment_status column

Revision ID: f7e8d9c0b1a2
Revises: b2c3d4e5f6a7
Create Date: 2026-02-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7e8d9c0b1a2'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Enum type for reuse
enrollment_status_enum = sa.Enum('pending_payment', 'active', 'cancelled', name='enrollmentstatus')
payment_status_enum = sa.Enum('pending', 'successful', 'failed', name='paymentstatus')


def upgrade() -> None:
    # Create enrollment status enum type
    enrollment_status_enum.create(op.get_bind(), checkfirst=True)
    payment_status_enum.create(op.get_bind(), checkfirst=True)

    # Add enrollment_status to user_course_enrollments
    op.add_column(
        'user_course_enrollments',
        sa.Column(
            'enrollment_status',
            enrollment_status_enum,
            nullable=False,
            server_default='active',
        ),
    )

    # Create payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('enrollment_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('reference', sa.String(100), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='NGN'),
        sa.Column('status', payment_status_enum, nullable=False, server_default='pending'),
        sa.Column('nomba_checkout_link', sa.String(1000), nullable=True),
        sa.Column('gateway_response', sa.Text(), nullable=True),
        sa.Column('customer_email', sa.String(255), nullable=True),
        sa.Column('payment_method', sa.String(50), nullable=True),
        sa.Column('transaction_reference', sa.String(255), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['enrollment_id'], ['user_course_enrollments.enrollment_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.course_id'], ondelete='CASCADE'),
    )

    # Indexes for payments table
    op.create_index('idx_payment_enrollment', 'payments', ['enrollment_id'])
    op.create_index('idx_payment_user_course', 'payments', ['user_id', 'course_id'])
    op.create_index('idx_payment_status', 'payments', ['status'])
    op.create_index('idx_payment_reference', 'payments', ['reference'], unique=True)


def downgrade() -> None:
    op.drop_index('idx_payment_reference', table_name='payments')
    op.drop_index('idx_payment_status', table_name='payments')
    op.drop_index('idx_payment_user_course', table_name='payments')
    op.drop_index('idx_payment_enrollment', table_name='payments')
    op.drop_table('payments')

    op.drop_column('user_course_enrollments', 'enrollment_status')

    payment_status_enum.drop(op.get_bind(), checkfirst=True)
    enrollment_status_enum.drop(op.get_bind(), checkfirst=True)
