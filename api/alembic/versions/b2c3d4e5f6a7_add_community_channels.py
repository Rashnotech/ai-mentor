"""add community channels table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-10 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- enums ---
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_type') THEN
                CREATE TYPE channel_type AS ENUM ('public', 'private');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_category') THEN
                CREATE TYPE channel_category AS ENUM ('discussion', 'study-group', 'leadership');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_status') THEN
                CREATE TYPE channel_status AS ENUM ('active', 'archived');
            END IF;
        END $$;
    """)

    # --- table (idempotent) ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS community_channels (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            type channel_type NOT NULL DEFAULT 'public',
            category channel_category NOT NULL DEFAULT 'discussion',
            status channel_status NOT NULL DEFAULT 'active',
            join_link VARCHAR(500),
            members_count INTEGER NOT NULL DEFAULT 0,
            posts_count INTEGER NOT NULL DEFAULT 0,
            created_by VARCHAR(36),
            bootcamp_id INTEGER,
            course_id INTEGER,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)

    # --- add missing columns if table was auto-created without them ---
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'community_channels' AND column_name = 'bootcamp_id'
            ) THEN
                ALTER TABLE community_channels ADD COLUMN bootcamp_id INTEGER;
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'community_channels' AND column_name = 'course_id'
            ) THEN
                ALTER TABLE community_channels ADD COLUMN course_id INTEGER;
            END IF;
        END $$;
    """)

    # --- indexes (all idempotent) ---
    op.execute("CREATE INDEX IF NOT EXISTS idx_channel_slug ON community_channels (slug);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_channel_status_type ON community_channels (status, type);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_channel_category ON community_channels (category);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_channel_bootcamp_id ON community_channels (bootcamp_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_channel_course_id ON community_channels (course_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS community_channels;")
    op.execute("DROP TYPE IF EXISTS channel_status;")
    op.execute("DROP TYPE IF EXISTS channel_category;")
    op.execute("DROP TYPE IF EXISTS channel_type;")
