"""Add gamification tables for XP and streak tracking

Revision ID: add_gamification_tables
Revises: add_email_sent_at_field
Create Date: 2026-02-06 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_gamification_tables'
down_revision = 'add_email_sent_at_field'  # Update to your latest migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create gamification tables (idempotent — uses IF NOT EXISTS):
    - user_gamification: Stores XP and streak summary per user
    - daily_xp_logs: Tracks daily activity for streak verification
    """

    # Create user_gamification table
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_gamification (
            user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            total_xp INTEGER NOT NULL DEFAULT 0,
            current_streak INTEGER NOT NULL DEFAULT 0,
            longest_streak INTEGER NOT NULL DEFAULT 0,
            last_activity_date DATE,
            total_questions_answered INTEGER NOT NULL DEFAULT 0,
            total_correct_answers INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_user_gamification_xp ON user_gamification (total_xp)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_user_gamification_streak ON user_gamification (current_streak)")

    # Create daily_xp_logs table
    op.execute("""
        CREATE TABLE IF NOT EXISTS daily_xp_logs (
            log_id SERIAL PRIMARY KEY,
            user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
            activity_date DATE NOT NULL,
            xp_earned INTEGER NOT NULL DEFAULT 0,
            questions_answered INTEGER NOT NULL DEFAULT 0,
            correct_answers INTEGER NOT NULL DEFAULT 0,
            first_activity_at TIMESTAMP WITH TIME ZONE NOT NULL,
            last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
    """)

    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_xp_log_user_date ON daily_xp_logs (user_id, activity_date)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_daily_xp_log_date ON daily_xp_logs (activity_date)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_daily_xp_logs_user_id ON daily_xp_logs (user_id)")


def downgrade() -> None:
    """Remove gamification tables."""
    op.drop_index('idx_daily_xp_log_date', table_name='daily_xp_logs')
    op.drop_index('idx_daily_xp_log_user_date', table_name='daily_xp_logs')
    op.drop_table('daily_xp_logs')
    
    op.drop_index('idx_user_gamification_streak', table_name='user_gamification')
    op.drop_index('idx_user_gamification_xp', table_name='user_gamification')
    op.drop_table('user_gamification')
