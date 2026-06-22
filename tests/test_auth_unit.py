"""
Unit tests for core auth logic (no DB required).
"""
from __future__ import annotations

import sys
import os

# Override DB to use SQLite in-memory for testing
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from backend.auth.utils import hash_password, verify_password, create_access_token, decode_access_token
from backend.auth.schemas import UserCreate, LoginRequest, Token, UserOut


class TestPasswordHashing:
    def test_hash_and_verify(self):
        pwd = "securePassword123!"
        hashed = hash_password(pwd)
        assert hashed != pwd
        assert verify_password(pwd, hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_verify_empty_password(self):
        hashed = hash_password("something")
        assert verify_password("", hashed) is False


class TestJWT:
    def test_create_and_decode(self):
        token = create_access_token({"sub": 1, "role": "manager"})
        assert isinstance(token, str)
        assert len(token) > 20

        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "1"
        assert payload["role"] == "manager"
        assert "exp" in payload

    def test_decode_invalid_token(self):
        assert decode_access_token("invalid.token.here") is None

    def test_decode_expired_token(self):
        # Manually create an expired token
        from datetime import datetime, timedelta, timezone
        from jose import jwt
        from backend.auth.utils import SECRET_KEY, ALGORITHM

        expired = datetime.now(timezone.utc) - timedelta(hours=1)
        token = jwt.encode(
            {"sub": "1", "exp": expired},
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
        assert decode_access_token(token) is None

    def test_token_preserves_role(self):
        for role in ("manager", "candidate"):
            token = create_access_token({"sub": 42, "role": role})
            payload = decode_access_token(token)
            assert payload["role"] == role


class TestSchemas:
    def test_user_create_valid(self):
        u = UserCreate(email="a@b.com", username="test", password="pass123", role="manager")
        assert u.role == "manager"

    def test_user_create_default_role(self):
        u = UserCreate(email="a@b.com", username="test", password="pass123")
        assert u.role == "candidate"

    def test_user_create_invalid_role(self):
        import pydantic
        try:
            UserCreate(email="a@b.com", username="test", password="pass123", role="admin")
            assert False, "Should have raised"
        except pydantic.ValidationError:
            pass

    def test_token_schema(self):
        t = Token(access_token="xyz")
        assert t.token_type == "bearer"

    def test_user_out_excludes_password(self):
        assert "password" not in UserOut.model_fields
        assert "hashed_password" not in UserOut.model_fields


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))