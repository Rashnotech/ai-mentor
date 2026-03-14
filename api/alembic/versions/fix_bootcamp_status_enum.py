"""Fix bootcampstatus and enrollmentpaymentstatus enum values

Revision ID: fix_bootcamp_status_enum
Revises: 4c5a3ebc62dd
Create Date: 2026-02-06

This migration fixes the mismatch between PostgreSQL enum values and SQLAlchemy:

bootcampstatus:
- DRAFT → draft
- ENROLLING → published  
- IN_PROGRESS → in_progress
- COMPLETED → completed
- CANCELLED → cancelled

enrollmentpaymentstatus:
- PENDING → pending
- PARTIAL → partial
- PAID → paid
- REFUNDED → refunded
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fix_bootcamp_status_enum'
down_revision = 'f930b1e5f935'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # =========================================================================
    # Fix bootcampstatus enum
    # =========================================================================
    
    # Step 1: Rename old enum type
    op.execute("ALTER TYPE bootcampstatus RENAME TO bootcampstatus_old")
    
    # Step 2: Create new enum with correct values
    op.execute("""
        CREATE TYPE bootcampstatus AS ENUM (
            'draft',
            'published', 
            'in_progress',
            'completed',
            'cancelled'
        )
    """)
    
    # Step 3: Update column to use new type, mapping old values to new
    op.execute("""
        ALTER TABLE bootcamps 
        ALTER COLUMN status TYPE bootcampstatus 
        USING (
            CASE status::text
                WHEN 'DRAFT' THEN 'draft'::bootcampstatus
                WHEN 'ENROLLING' THEN 'published'::bootcampstatus
                WHEN 'IN_PROGRESS' THEN 'in_progress'::bootcampstatus
                WHEN 'COMPLETED' THEN 'completed'::bootcampstatus
                WHEN 'CANCELLED' THEN 'cancelled'::bootcampstatus
            END
        )
    """)
    
    # Step 4: Drop old enum type
    op.execute("DROP TYPE bootcampstatus_old")
    
    # =========================================================================
    # Fix enrollmentpaymentstatus enum
    # =========================================================================
    
    # Step 1: Rename old enum type
    op.execute("ALTER TYPE enrollmentpaymentstatus RENAME TO enrollmentpaymentstatus_old")
    
    # Step 2: Create new enum with correct values
    op.execute("""
        CREATE TYPE enrollmentpaymentstatus AS ENUM (
            'pending',
            'partial', 
            'paid',
            'refunded'
        )
    """)
    
    # Step 3: Update column to use new type
    op.execute("""
        ALTER TABLE bootcamp_enrollments 
        ALTER COLUMN payment_status TYPE enrollmentpaymentstatus 
        USING (
            CASE payment_status::text
                WHEN 'PENDING' THEN 'pending'::enrollmentpaymentstatus
                WHEN 'PARTIAL' THEN 'partial'::enrollmentpaymentstatus
                WHEN 'PAID' THEN 'paid'::enrollmentpaymentstatus
                WHEN 'REFUNDED' THEN 'refunded'::enrollmentpaymentstatus
            END
        )
    """)
    
    # Step 4: Drop old enum type
    op.execute("DROP TYPE enrollmentpaymentstatus_old")


def downgrade() -> None:
    # =========================================================================
    # Reverse bootcampstatus
    # =========================================================================
    op.execute("ALTER TYPE bootcampstatus RENAME TO bootcampstatus_new")
    
    op.execute("""
        CREATE TYPE bootcampstatus AS ENUM (
            'DRAFT',
            'ENROLLING', 
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED'
        )
    """)
    
    op.execute("""
        ALTER TABLE bootcamps 
        ALTER COLUMN status TYPE bootcampstatus 
        USING (
            CASE status::text
                WHEN 'draft' THEN 'DRAFT'::bootcampstatus
                WHEN 'published' THEN 'ENROLLING'::bootcampstatus
                WHEN 'in_progress' THEN 'IN_PROGRESS'::bootcampstatus
                WHEN 'completed' THEN 'COMPLETED'::bootcampstatus
                WHEN 'cancelled' THEN 'CANCELLED'::bootcampstatus
            END
        )
    """)
    
    op.execute("DROP TYPE bootcampstatus_new")
    
    # =========================================================================
    # Reverse enrollmentpaymentstatus
    # =========================================================================
    op.execute("ALTER TYPE enrollmentpaymentstatus RENAME TO enrollmentpaymentstatus_new")
    
    op.execute("""
        CREATE TYPE enrollmentpaymentstatus AS ENUM (
            'PENDING',
            'PARTIAL', 
            'PAID',
            'REFUNDED'
        )
    """)
    
    op.execute("""
        ALTER TABLE bootcamp_enrollments 
        ALTER COLUMN payment_status TYPE enrollmentpaymentstatus 
        USING (
            CASE payment_status::text
                WHEN 'pending' THEN 'PENDING'::enrollmentpaymentstatus
                WHEN 'partial' THEN 'PARTIAL'::enrollmentpaymentstatus
                WHEN 'paid' THEN 'PAID'::enrollmentpaymentstatus
                WHEN 'refunded' THEN 'REFUNDED'::enrollmentpaymentstatus
            END
        )
    """)
    
    op.execute("DROP TYPE enrollmentpaymentstatus_new")
