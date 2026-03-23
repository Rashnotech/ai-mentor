"""merge_all_heads

Revision ID: ba7abe03233e
Revises: add_gamification_tables, c1d2e3f4g5h6, e7a1b2c3d4e5, fix_bootcamp_status_enum
Create Date: 2026-02-10 17:26:20.889627

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba7abe03233e'
down_revision: Union[str, None] = ('add_gamification_tables', 'c1d2e3f4g5h6', 'e7a1b2c3d4e5', 'fix_bootcamp_status_enum')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
