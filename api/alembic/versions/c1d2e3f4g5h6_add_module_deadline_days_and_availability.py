"""add module deadline days and availability tables

Revision ID: c1d2e3f4g5h6
Revises: b9c8d7e6f5g4
Create Date: 2026-02-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'c1d2e3f4g5h6'
down_revision = 'b9c8d7e6f5g4'
branch_labels = None
depends_on = None


def _add_column_if_not_exists(table: str, column: str, col_type: str) -> None:
    """Add a column only if it does not already exist (PostgreSQL)."""
    op.execute(
        f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type}"
    )


def upgrade() -> None:
    # Add new columns to modules table (idempotent)
    _add_column_if_not_exists('modules', 'unlock_after_days', 'INTEGER NOT NULL DEFAULT 0')
    _add_column_if_not_exists('modules', 'is_available_by_default', 'BOOLEAN NOT NULL DEFAULT true')
    _add_column_if_not_exists('modules', 'first_deadline_days', 'INTEGER')
    _add_column_if_not_exists('modules', 'second_deadline_days', 'INTEGER')
    _add_column_if_not_exists('modules', 'third_deadline_days', 'INTEGER')

    # Add new columns to projects table (idempotent)
    _add_column_if_not_exists('projects', 'first_deadline_days', 'INTEGER')
    _add_column_if_not_exists('projects', 'second_deadline_days', 'INTEGER')
    _add_column_if_not_exists('projects', 'third_deadline_days', 'INTEGER')

    # Create user_module_availability table (IF NOT EXISTS)
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_module_availability (
            availability_id SERIAL PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            module_id INTEGER NOT NULL REFERENCES modules(module_id) ON DELETE CASCADE,
            path_id INTEGER NOT NULL REFERENCES learning_paths(path_id) ON DELETE CASCADE,
            is_unlocked BOOLEAN NOT NULL DEFAULT false,
            unlocked_at TIMESTAMP WITH TIME ZONE,
            scheduled_unlock_date TIMESTAMP WITH TIME ZONE,
            first_deadline TIMESTAMP WITH TIME ZONE,
            second_deadline TIMESTAMP WITH TIME ZONE,
            third_deadline TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_user_module_availability_user_module ON user_module_availability (user_id, module_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_user_module_availability_scheduled ON user_module_availability (scheduled_unlock_date, is_unlocked)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_module_availability_user_id ON user_module_availability (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_module_availability_module_id ON user_module_availability (module_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_module_availability_path_id ON user_module_availability (path_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_module_availability_is_unlocked ON user_module_availability (is_unlocked)")

    # Create user_course_enrollments table (IF NOT EXISTS)
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_course_enrollments (
            enrollment_id SERIAL PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
            path_id INTEGER REFERENCES learning_paths(path_id) ON DELETE SET NULL,
            enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            started_learning_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN NOT NULL DEFAULT true,
            completed_at TIMESTAMP WITH TIME ZONE,
            expected_completion_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_user_course_enrollment_user_course ON user_course_enrollments (user_id, course_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_course_enrollments_user_id ON user_course_enrollments (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_course_enrollments_course_id ON user_course_enrollments (course_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_course_enrollments_path_id ON user_course_enrollments (path_id)")


def downgrade() -> None:
    # Drop user_course_enrollments table
    op.drop_index(op.f('ix_user_course_enrollments_path_id'), table_name='user_course_enrollments')
    op.drop_index(op.f('ix_user_course_enrollments_course_id'), table_name='user_course_enrollments')
    op.drop_index(op.f('ix_user_course_enrollments_user_id'), table_name='user_course_enrollments')
    op.drop_index('idx_user_course_enrollment_user_course', table_name='user_course_enrollments')
    op.drop_table('user_course_enrollments')
    
    # Drop user_module_availability table
    op.drop_index(op.f('ix_user_module_availability_is_unlocked'), table_name='user_module_availability')
    op.drop_index(op.f('ix_user_module_availability_path_id'), table_name='user_module_availability')
    op.drop_index(op.f('ix_user_module_availability_module_id'), table_name='user_module_availability')
    op.drop_index(op.f('ix_user_module_availability_user_id'), table_name='user_module_availability')
    op.drop_index('idx_user_module_availability_scheduled', table_name='user_module_availability')
    op.drop_index('idx_user_module_availability_user_module', table_name='user_module_availability')
    op.drop_table('user_module_availability')
    
    # Remove columns from projects table
    op.drop_column('projects', 'third_deadline_days')
    op.drop_column('projects', 'second_deadline_days')
    op.drop_column('projects', 'first_deadline_days')
    
    # Remove columns from modules table
    op.drop_column('modules', 'third_deadline_days')
    op.drop_column('modules', 'second_deadline_days')
    op.drop_column('modules', 'first_deadline_days')
    op.drop_column('modules', 'is_available_by_default')
    op.drop_column('modules', 'unlock_after_days')
