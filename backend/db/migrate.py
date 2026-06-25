"""
Database migration utilities for Path-ai.

Handles schema changes that cannot be applied via metadata.create_all()
on existing databases (e.g., adding columns to existing tables).

Usage:
    python -m backend.db.migrate
"""

from __future__ import annotations

import logging

from sqlalchemy import text

from backend.db.config import engine

logger = logging.getLogger(__name__)

_MIGRATIONS: list[tuple[str, str, str]] = [
    (
        "001_add_ranking_user_id",
        "Add user_id column to rankings table for ranking ownership",
        (
            "ALTER TABLE rankings "
            "ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)"
        ),
    ),
]


def run_migrations(dialect: str | None = None) -> list[str]:
    """Execute pending schema migrations.

    Args:
        dialect: Database dialect name (e.g. 'postgresql', 'sqlite').
                 Auto-detected if None.

    Returns:
        List of migration names that were applied.
    """
    if dialect is None:
        dialect = engine.dialect.name

    applied: list[str] = []

    for migration_id, description, sql in _MIGRATIONS:
        # SQLite does not support IF NOT EXISTS for ALTER TABLE
        if dialect == "sqlite":
            # Check if column already exists
            check_sql = (
                "SELECT 1 FROM pragma_table_info('rankings') "
                "WHERE name = 'user_id'"
            )
            with engine.connect() as conn:
                result = conn.execute(text(check_sql)).scalar()
                if result:
                    logger.info("Migration %s already applied (SQLite)", migration_id)
                    continue

            # SQLite ALTER TABLE does not support REFERENCES inline
            stmt = "ALTER TABLE rankings ADD COLUMN user_id INTEGER"
        else:
            stmt = sql

        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
            applied.append(migration_id)
            logger.info("Applied migration %s: %s", migration_id, description)
        except Exception as exc:
            logger.warning(
                "Migration %s skipped (may already exist): %s",
                migration_id,
                exc,
            )

    return applied


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    applied = run_migrations()
    if applied:
        print(f"Applied migrations: {', '.join(applied)}")
    else:
        print("No pending migrations to apply.")