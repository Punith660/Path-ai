"""
Integration tests for Ranking ownership and authorization.

Run:  python -m pytest tests/test_ranking_ownership.py -v
"""

from __future__ import annotations

import os

# Use a file-based SQLite database for testing, so that the tables are shared across all connections/threads!
os.environ["DATABASE_URL"] = "sqlite:///test_ownership.db"

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.db.config import engine, Base, get_db, init_db
from backend.db.models import User, Ranking

# Initialize the db tables
init_db()

client = TestClient(app)


class TestRankingOwnership:
    """End-to-end integration tests for ranking ownership."""

    REGISTER_URL = "/api/auth/register"
    LOGIN_URL = "/api/auth/login"
    RANK_URL = "/rank"
    RANKINGS_URL = "/rankings"
    RANK_FILES_URL = "/rank-files"

    def setup_method(self):
        # Clear and recreate database tables in the file-based SQLite db
        Base.metadata.drop_all(bind=engine)
        init_db()

    def teardown_method(self):
        # Clean up database file after run
        Base.metadata.drop_all(bind=engine)
        try:
            if os.path.exists("test_ownership.db"):
                os.remove("test_ownership.db")
        except Exception:
            pass

    def _register_and_login(self, email: str, username: str, password: str, role: str) -> str:
        # Register the user
        reg_resp = client.post(
            self.REGISTER_URL,
            json={
                "email": email,
                "username": username,
                "password": password,
                "role": role,
            },
        )
        assert reg_resp.status_code == 201, reg_resp.text

        # Login to get the access token
        login_resp = client.post(
            self.LOGIN_URL,
            json={"username": username, "password": password},
        )
        assert login_resp.status_code == 200, login_resp.text
        return login_resp.json()["access_token"]

    def test_ranking_creation_and_ownership(self):
        # 1. Register and log in User A (owner)
        token_a = self._register_and_login(
            "usera@test.com", "usera", "password123", "manager"
        )

        # 2. Register and log in User B (different user)
        token_b = self._register_and_login(
            "userb@test.com", "userb", "password123", "manager"
        )

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. Create a ranking session as User A
        rank_payload = {
            "job_description": "We need a Python developer who knows Django",
            "candidates": [
                {
                    "name": "Candidate A",
                    "text": "Extensive experience in Python and Django framework."
                }
            ],
            "strictness": "medium",
            "cross_reference_sync": True
        }

        # POST /rank with User A's token
        resp_rank = client.post(self.RANK_URL, json=rank_payload, headers=headers_a)
        assert resp_rank.status_code == 200, resp_rank.text
        results = resp_rank.json()
        assert len(results) == 1
        assert results[0]["candidate_name"] == "Candidate A"

        # Check database to ensure user_id is set to User A's id
        db = next(get_db())
        try:
            # Fetch the newly created ranking from DB
            ranking = db.query(Ranking).first()
            assert ranking is not None
            assert ranking.user_id is not None
            
            # Fetch user A from database to compare IDs
            user_a = db.query(User).filter(User.username == "usera").first()
            assert user_a is not None
            assert ranking.user_id == user_a.id
        finally:
            db.close()

        # 4. User A queries GET /rankings -> should see the 1 ranking they own
        resp_rankings_a = client.get(self.RANKINGS_URL, headers=headers_a)
        assert resp_rankings_a.status_code == 200, resp_rankings_a.text
        rankings_a_data = resp_rankings_a.json()
        assert len(rankings_a_data) == 1
        ranking_id = rankings_a_data[0]["id"]

        # 5. User B queries GET /rankings -> should see 0 rankings (empty list)
        resp_rankings_b = client.get(self.RANKINGS_URL, headers=headers_b)
        assert resp_rankings_b.status_code == 200, resp_rankings_b.text
        rankings_b_data = resp_rankings_b.json()
        assert len(rankings_b_data) == 0

        # 6. User A retrieves details of their own ranking -> should succeed (200)
        resp_detail_a = client.get(f"{self.RANKINGS_URL}/{ranking_id}", headers=headers_a)
        assert resp_detail_a.status_code == 200, resp_detail_a.text
        detail_a_data = resp_detail_a.json()
        assert detail_a_data["id"] == ranking_id
        assert detail_a_data["job_description"] == "We need a Python developer who knows Django"

        # 7. User B tries to retrieve details of User A's ranking -> should return 404
        resp_detail_b = client.get(f"{self.RANKINGS_URL}/{ranking_id}", headers=headers_b)
        assert resp_detail_b.status_code == 404, resp_detail_b.text

        # 8. GET or POST without authentication header -> should return 401 Unauthorized
        resp_unauth = client.get(self.RANKINGS_URL)
        assert resp_unauth.status_code == 401

    def test_rank_files_creation_and_ownership(self, monkeypatch):
        # Mock file extraction to bypass parsing dependencies
        monkeypatch.setattr("backend.main._extract_text_from_bytes", lambda kind, data: "Extensive experience in Python and Django framework.")

        # 1. Register and log in User A (owner)
        token_a = self._register_and_login(
            "usera@test.com", "usera", "password123", "manager"
        )
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. POST /rank-files with User A's token
        files_payload = [
            ("files", ("candidate_a.pdf", b"%PDF-1.4 ... valid pdf bytes ...", "application/pdf")),
            ("files", ("candidate_b.pdf", b"%PDF-1.4 ... valid pdf bytes ...", "application/pdf")),
        ]
        form_data = {
            "job_description": "We need a Python developer who knows Django",
            "strictness": "medium",
            "cross_reference_sync": "true"
        }

        resp = client.post(
            self.RANK_FILES_URL,
            data=form_data,
            files=files_payload,
            headers=headers_a
        )
        assert resp.status_code == 200, resp.text
        results = resp.json()
        assert len(results) == 2

        # Verify database to ensure ranking.user_id is set to User A's id
        db = next(get_db())
        try:
            ranking = db.query(Ranking).first()
            assert ranking is not None
            assert ranking.user_id is not None
            
            user_a = db.query(User).filter(User.username == "usera").first()
            assert user_a is not None
            assert ranking.user_id == user_a.id
        finally:
            db.close()
