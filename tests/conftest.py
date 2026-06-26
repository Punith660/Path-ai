import os
import pytest

# Ensure that DATABASE_URL is set to a file-based SQLite database
# before any backend modules (which instantiate the database engine) are imported.
# This prevents attempts to connect to a local PostgreSQL server during test runs.
os.environ["DATABASE_URL"] = "sqlite:///test_db.db"

# Import models first to register them with Base.metadata, then create tables.
from backend.db.models import *  # noqa: F401, E402 — ensure all tables are known
from backend.db.config import init_db  # noqa: E402

init_db()

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_db():
    yield
    # Clean up the test database file after the entire test session finishes
    try:
        if os.path.exists("test_db.db"):
            os.remove("test_db.db")
    except Exception:
        pass
