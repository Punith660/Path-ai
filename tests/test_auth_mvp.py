"""
Integration tests for the authentication MVP.

Run:  python -m pytest tests/test_auth_mvp.py -v
"""

from __future__ import annotations

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


class TestAuthMVP:
    """Minimal auth MVP integration tests."""

    REGISTER_URL = "/api/auth/register"
    LOGIN_URL = "/api/auth/login"
    ME_URL = "/api/auth/me"

    MANAGER_PAYLOAD = {
        "email": "manager@test.com",
        "username": "manager1",
        "password": "pass123",
        "role": "manager",
    }
    CANDIDATE_PAYLOAD = {
        "email": "candidate@test.com",
        "username": "candidate1",
        "password": "pass456",
        "role": "candidate",
    }

    def _register(self, payload: dict):
        return client.post(self.REGISTER_URL, json=payload)

    def _login(self, username: str, password: str):
        return client.post(self.LOGIN_URL, json={"username": username, "password": password})

    # ── Register ──────────────────────────────────────────────────────────

    def test_register_manager(self):
        resp = self._register(self.MANAGER_PAYLOAD)
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["username"] == "manager1"
        assert data["role"] == "manager"
        assert "id" in data
        assert "hashed_password" not in data  # never exposed

    def test_register_candidate(self):
        resp = self._register(self.CANDIDATE_PAYLOAD)
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["username"] == "candidate1"
        assert data["role"] == "candidate"

    def test_register_duplicate_email(self):
        resp = self._register(self.MANAGER_PAYLOAD)
        assert resp.status_code == 409, resp.text
        assert "email already exists" in resp.json()["detail"].lower()

    def test_register_duplicate_username(self):
        resp = self._register({
            "email": "manager2@test.com",
            "username": "manager1",
            "password": "pass123",
            "role": "candidate",
        })
        assert resp.status_code == 409, resp.text
        assert "username already exists" in resp.json()["detail"].lower()

    def test_register_invalid_role(self):
        resp = self._register({
            "email": "admin@test.com",
            "username": "admin1",
            "password": "pass123",
            "role": "admin",
        })
        assert resp.status_code == 422, resp.text  # validation error

    def test_register_short_password(self):
        resp = self._register({
            "email": "short@test.com",
            "username": "shortpw",
            "password": "ab",
            "role": "candidate",
        })
        assert resp.status_code == 422, resp.text

    # ── Login ─────────────────────────────────────────────────────────────

    def test_login_manager(self):
        resp = self._login("manager1", "pass123")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_candidate(self):
        resp = self._login("candidate1", "pass456")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "access_token" in data

    def test_login_wrong_password(self):
        resp = self._login("manager1", "wrongpass")
        assert resp.status_code == 401, resp.text

    def test_login_nonexistent_user(self):
        resp = self._login("nobody", "pass123")
        assert resp.status_code == 401, resp.text

    # ── GET /me ────────────────────────────────────────────────────────────

    def test_me_authenticated(self):
        login_resp = self._login("manager1", "pass123")
        token = login_resp.json()["access_token"]
        resp = client.get(self.ME_URL, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["username"] == "manager1"
        assert data["role"] == "manager"

    def test_me_no_token(self):
        resp = client.get(self.ME_URL)
        assert resp.status_code == 401, resp.text

    def test_me_invalid_token(self):
        resp = client.get(self.ME_URL, headers={"Authorization": "Bearer invalidtoken"})
        assert resp.status_code == 401, resp.text

    # ── Protected endpoints ───────────────────────────────────────────────

    def test_protected_me_authenticated(self):
        login_resp = self._login("manager1", "pass123")
        token = login_resp.json()["access_token"]
        resp = client.get("/api/protected/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200, resp.text

    def test_protected_me_no_auth(self):
        resp = client.get("/api/protected/me")
        assert resp.status_code == 401, resp.text

    def test_manager_only_as_manager(self):
        login_resp = self._login("manager1", "pass123")
        token = login_resp.json()["access_token"]
        resp = client.get("/api/protected/manager-only", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200, resp.text
        assert resp.json()["role"] == "manager"

    def test_manager_only_as_candidate(self):
        login_resp = self._login("candidate1", "pass456")
        token = login_resp.json()["access_token"]
        resp = client.get("/api/protected/manager-only", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403, resp.text  # Forbidden

    def test_candidate_only_as_candidate(self):
        login_resp = self._login("candidate1", "pass456")
        token = login_resp.json()["access_token"]
        resp = client.get("/api/protected/candidate-only", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200, resp.text
        assert resp.json()["role"] == "candidate"

    def test_candidate_only_as_manager(self):
        login_resp = self._login("manager1", "pass123")
        token = login_resp.json()["access_token"]
        resp = client.get("/api/protected/candidate-only", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403, resp.text  # Forbidden