"""Add course reviews and additional course fields

Revision ID: b9c8d7e6f5g4
Revises: a8f2c3d4e5f6
Create Date: 2024-01-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b9c8d7e6f5g4'
down_revision: Union[str, None] = 'a8f2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new fields to courses table
    op.add_column('courses', sa.Column('prerequisites', postgresql.ARRAY(sa.String(255)), nullable=True))
    op.add_column('courses', sa.Column('what_youll_learn', postgresql.ARRAY(sa.String(255)), nullable=True))
    op.add_column('courses', sa.Column('certificate_on_completion', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('courses', sa.Column('average_rating', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('courses', sa.Column('total_reviews', sa.Integer(), nullable=False, server_default='0'))

    # Create course_reviews table
    op.create_table(
        'course_reviews',
        sa.Column('review_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('review_text', sa.Text(), nullable=True),
        sa.Column('is_anonymous', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_approved', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('review_id'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.course_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='rating_range_check'),
    )

    # Create unique constraint for one review per user per course
    op.create_unique_constraint('uq_course_user_review', 'course_reviews', ['course_id', 'user_id'])

    # Create indexes for better query performance
    op.create_index('ix_course_reviews_course_id', 'course_reviews', ['course_id'])
    op.create_index('ix_course_reviews_user_id', 'course_reviews', ['user_id'])
    op.create_index('ix_course_reviews_rating', 'course_reviews', ['rating'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_course_reviews_rating', table_name='course_reviews')
    op.drop_index('ix_course_reviews_user_id', table_name='course_reviews')
    op.drop_index('ix_course_reviews_course_id', table_name='course_reviews')

    # Drop unique constraint
    op.drop_constraint('uq_course_user_review', 'course_reviews', type_='unique')

    # Drop course_reviews table
    op.drop_table('course_reviews')

    # Remove new columns from courses table
    op.drop_column('courses', 'total_reviews')
    op.drop_column('courses', 'average_rating')
    op.drop_column('courses', 'certificate_on_completion')
    op.drop_column('courses', 'what_youll_learn')
    op.drop_column('courses', 'prerequisites')
