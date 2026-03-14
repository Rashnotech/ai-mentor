"""merge_heads

Revision ID: 4c5a3ebc62dd
Revises: add_social_usernames, b9c8d7e6f5g4
Create Date: 2026-01-24 08:19:11.902124

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c5a3ebc62dd'
down_revision: Union[str, None] = ('add_social_usernames', 'b9c8d7e6f5g4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
