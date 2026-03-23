"""add_lesson_content_fields

Revision ID: f930b1e5f935
Revises: 4c5a3ebc62dd
Create Date: 2026-01-24 08:26:18.841607

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f930b1e5f935'
down_revision: Union[str, None] = '4c5a3ebc62dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new lesson content fields
    op.add_column('lessons', sa.Column('content', sa.Text(), nullable=True))
    op.add_column('lessons', sa.Column('youtube_video_url', sa.String(length=500), nullable=True))
    op.add_column('lessons', sa.Column('external_resources', postgresql.ARRAY(sa.String(length=500)), nullable=True))
    op.add_column('lessons', sa.Column('expected_outcomes', postgresql.ARRAY(sa.String(length=500)), nullable=True))


def downgrade() -> None:
    op.drop_column('lessons', 'expected_outcomes')
    op.drop_column('lessons', 'external_resources')
    op.drop_column('lessons', 'youtube_video_url')
    op.drop_column('lessons', 'content')
