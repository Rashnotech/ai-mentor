#!/usr/bin/python3
"""Idempotent Heroku release migration runner.

If an existing database was initialized outside Alembic (tables like
`path_adjustments` exist, but `alembic_version` is empty), this stamps the
appropriate baseline revision before running `alembic upgrade head` so
already-created tables do not raise DuplicateTable.
"""
import os
import subprocess
import sys
from typing import List, Optional

from sqlalchemy import create_engine, inspect, text


def normalize_sync_db_url(raw_url: str) -> str:
    """Convert async/Heroku DB URL into a synchronous SQLAlchemy postgresql URL."""
    return (
        raw_url.replace("+asyncpg", "")
        .replace("postgres://", "postgresql://", 1)
    )


def choose_baseline_revisions(existing_tables: set[str]) -> Optional[List[str]]:
    """Return baseline revisions to stamp when alembic_version is empty on an existing DB."""
    if "path_adjustments" not in existing_tables:
        return None
    if "ai_mentor_feedback" in existing_tables:
        return ["a6b7c8d9e0f1"]
    if "surveys" in existing_tables:
        return ["e4f5a6b7c8d9"]
    return ["b1c2d3e4f5a6", "c8d9e0f1a2b3", "d1e2f3a4b5c6"]


def ensure_baseline_stamped(db_url: str) -> Optional[List[str]]:
    """Stamp baseline revisions only when DB has existing tables and empty alembic_version."""
    engine = create_engine(normalize_sync_db_url(db_url))
    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        version_rows: List[str] = []
        if "alembic_version" in existing_tables:
            with engine.connect() as conn:
                version_rows = [
                    row[0]
                    for row in conn.execute(text("SELECT version_num FROM alembic_version")).fetchall()
                ]
        if version_rows:
            return None
        return choose_baseline_revisions(existing_tables)
    finally:
        engine.dispose()


def main() -> int:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        try:
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from core.config import settings
            db_url = settings.DATABASE_URL
        except Exception as exc:
            print(f"Could not resolve DATABASE_URL: {exc}", file=sys.stderr)
            return 1

    baseline = ensure_baseline_stamped(db_url)
    if baseline:
        print(f"Stamping baseline Alembic revision(s): {' '.join(baseline)}")
        stamp_proc = subprocess.run(["alembic", "stamp", *baseline], check=False)
        if stamp_proc.returncode != 0:
            return stamp_proc.returncode

    upgrade_proc = subprocess.run(["alembic", "upgrade", "head"], check=False)
    return upgrade_proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
