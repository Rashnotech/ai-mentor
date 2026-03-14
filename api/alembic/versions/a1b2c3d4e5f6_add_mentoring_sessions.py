"""add mentoring sessions and attendance tables

Revision ID: a1b2c3d4e5f6
Revises: ba7abe03233e
Create Date: 2026-02-10 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "ba7abe03233e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- session_platform enum ---
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_platform') THEN
                CREATE TYPE session_platform AS ENUM ('zoom','google_meet','microsoft_teams','custom');
            END IF;
        END$$;
    """)

    # --- session_status enum ---
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
                CREATE TYPE session_status AS ENUM ('scheduled','cancelled');
            END IF;
        END$$;
    """)

    # --- mentoring_sessions table ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS mentoring_sessions (
            session_id SERIAL PRIMARY KEY,
            mentor_id  VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

            bootcamp_id INTEGER REFERENCES bootcamps(bootcamp_id) ON DELETE SET NULL,
            course_id   INTEGER REFERENCES courses(course_id)     ON DELETE SET NULL,

            title          VARCHAR(255) NOT NULL,
            description    TEXT,
            platform       session_platform NOT NULL DEFAULT 'zoom',
            session_link   VARCHAR(500) NOT NULL,

            scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
            start_time     TIMESTAMP WITH TIME ZONE NOT NULL,
            end_time       TIMESTAMP WITH TIME ZONE NOT NULL,
            timezone       VARCHAR(50)  NOT NULL DEFAULT 'UTC',

            attendance_token VARCHAR(64) NOT NULL UNIQUE,

            status session_status NOT NULL DEFAULT 'scheduled',

            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_session_mentor_id ON mentoring_sessions (mentor_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_session_mentor_date ON mentoring_sessions (mentor_id, scheduled_date)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_session_bootcamp ON mentoring_sessions (bootcamp_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_session_course ON mentoring_sessions (course_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_session_token ON mentoring_sessions (attendance_token)")

    # --- session_attendances table ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS session_attendances (
            attendance_id SERIAL PRIMARY KEY,
            session_id    INTEGER NOT NULL REFERENCES mentoring_sessions(session_id) ON DELETE CASCADE,
            student_id    VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            marked_at     TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    """)

    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_session_student ON session_attendances (session_id, student_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_attendance_student ON session_attendances (student_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS session_attendances CASCADE")
    op.execute("DROP TABLE IF EXISTS mentoring_sessions CASCADE")
    op.execute("DROP TYPE IF EXISTS session_status")
    op.execute("DROP TYPE IF EXISTS session_platform")
