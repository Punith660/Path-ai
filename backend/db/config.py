"""
Database configuration for PostgreSQL (Neon) + SQLAlchemy.

Expects DATABASE_URL environment variable.
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_GBvJ2LRTtN7F@ep-spring-water-asn8p8e5.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Yield a database session, ensuring it's closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Call once on startup."""
    Base.metadata.create_all(bind=engine)