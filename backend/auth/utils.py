"""
Auth utilities: password hashing (passlib/bcrypt), JWT creation/verification,
and password reset token generation.
"""

from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

# ── Password hashing ──────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Return a bcrypt hash of *password*."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches the stored bcrypt *hashed* value."""
    return pwd_context.verify(plain, hashed)


# ── JWT ───────────────────────────────────────────────────────────────────────

_SECRET_KEY: str | None = os.getenv("JWT_SECRET_KEY")
if _SECRET_KEY is None:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable is not set. "
        "Authentication cannot start without a secret key."
    )
SECRET_KEY: str = _SECRET_KEY
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))


def create_access_token(data: dict) -> str:
    """Encode *data* into a signed JWT with an expiration claim.

    The 'sub' value is coerced to string (python-jose requirement).
    """
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Decode and validate *token*. Returns the payload dict, or None if invalid/expired."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ── Password reset tokens ─────────────────────────────────────────────────────

RESET_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "15"))


def generate_reset_token() -> str:
    """Generate a cryptographically secure random token for password reset."""
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    """Hash a reset token using bcrypt for secure storage."""
    return pwd_context.hash(token)


def verify_reset_token(plain_token: str, hashed_token: str) -> bool:
    """Return True if *plain_token* matches the stored *hashed_token*."""
    return pwd_context.verify(plain_token, hashed_token)


def get_reset_token_expiry() -> datetime:
    """Return the UTC datetime when a reset token should expire."""
    return datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)


# ── Rate limiting helpers ─────────────────────────────────────────────────────

from collections import defaultdict
import time

LOGIN_ATTEMPTS: dict[str, list[float]] = defaultdict(list)
LOGIN_ATTEMPTS_IP: dict[str, list[float]] = defaultdict(list)
ACCOUNT_LOCKOUT: dict[str, float] = {}
RESET_ATTEMPTS_EMAIL: dict[str, list[float]] = defaultdict(list)
RESET_ATTEMPTS_IP: dict[str, list[float]] = defaultdict(list)

MAX_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
LOGIN_WINDOW_SECONDS: int = int(os.getenv("LOGIN_WINDOW_SECONDS", "300"))
ACCOUNT_LOCKOUT_SECONDS: int = int(os.getenv("ACCOUNT_LOCKOUT_SECONDS", "900"))
MAX_RESET_ATTEMPTS: int = int(os.getenv("MAX_RESET_ATTEMPTS", "3"))
RESET_WINDOW_SECONDS: int = int(os.getenv("RESET_WINDOW_SECONDS", "3600"))


def _prune_attempts(attempts: list[float], window: int) -> None:
    cutoff = time.time() - window
    while attempts and attempts[0] < cutoff:
        attempts.pop(0)


def check_login_rate_limit(username: str, ip: str) -> None:
    now = time.time()
    if username in ACCOUNT_LOCKOUT:
        if now < ACCOUNT_LOCKOUT[username]:
            raise RuntimeError("Account is temporarily locked.")
        else:
            del ACCOUNT_LOCKOUT[username]
    _prune_attempts(LOGIN_ATTEMPTS[username], LOGIN_WINDOW_SECONDS)
    _prune_attempts(LOGIN_ATTEMPTS_IP[ip], LOGIN_WINDOW_SECONDS)
    if len(LOGIN_ATTEMPTS[username]) >= MAX_LOGIN_ATTEMPTS:
        ACCOUNT_LOCKOUT[username] = time.time() + ACCOUNT_LOCKOUT_SECONDS
        LOGIN_ATTEMPTS[username].clear()
        raise RuntimeError("Account is temporarily locked.")
    if len(LOGIN_ATTEMPTS_IP[ip]) >= MAX_LOGIN_ATTEMPTS:
        raise RuntimeError("Too many login attempts from this IP.")


def record_login_attempt(username: str, ip: str, success: bool) -> None:
    now = time.time()
    if not success:
        LOGIN_ATTEMPTS[username].append(now)
        LOGIN_ATTEMPTS_IP[ip].append(now)
        _prune_attempts(LOGIN_ATTEMPTS[username], LOGIN_WINDOW_SECONDS)
        _prune_attempts(LOGIN_ATTEMPTS_IP[ip], LOGIN_WINDOW_SECONDS)
        if len(LOGIN_ATTEMPTS[username]) >= MAX_LOGIN_ATTEMPTS:
            ACCOUNT_LOCKOUT[username] = time.time() + ACCOUNT_LOCKOUT_SECONDS
    else:
        LOGIN_ATTEMPTS.pop(username, None)
        ACCOUNT_LOCKOUT.pop(username, None)


def check_reset_rate_limit(email: str, ip: str) -> None:
    _prune_attempts(RESET_ATTEMPTS_EMAIL[email], RESET_WINDOW_SECONDS)
    _prune_attempts(RESET_ATTEMPTS_IP[ip], RESET_WINDOW_SECONDS)
    if len(RESET_ATTEMPTS_EMAIL[email]) >= MAX_RESET_ATTEMPTS:
        raise RuntimeError("Too many password reset requests for this email.")
    if len(RESET_ATTEMPTS_IP[ip]) >= MAX_RESET_ATTEMPTS:
        raise RuntimeError("Too many password reset requests from this IP.")


def record_reset_attempt(email: str, ip: str) -> None:
    now = time.time()
    RESET_ATTEMPTS_EMAIL[email].append(now)
    RESET_ATTEMPTS_IP[ip].append(now)