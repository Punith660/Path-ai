# Project Configuration Security Audit

## Results

### 1. Security Headers
**FAIL** — `backend/main.py`
**Issue:** No HTTP security headers are set. Missing: `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport-Security`, `X-XSS-Protection`.
**Minimal fix:** Add a Starlette middleware to attach default security headers on every response.

### 2. CORS Configuration
**FAIL** — `backend/main.py` (lines 66–73, `DEFAULT_CORS_ORIGINS`)
**Issue:** Default CORS origins contain literal `[IP_ADDRESS]` placeholders. `allow_methods=["*"]` and `allow_headers=["*"]` are overly permissive. `allow_credentials=True` with broad origins can expose the API to credential-bearing cross-origin requests.
**Minimal fix:** Remove `[IP_ADDRESS]` from defaults. Restrict methods and headers to the minimum required set (e.g., `["GET","POST","PUT","DELETE","OPTIONS"]` and `["Authorization","Content-Type"]`).

### 3. HTTPS Enforcement
**FAIL** — `backend/main.py` / `Dockerfile`
**Issue:** No HTTP-to-HTTPS redirect. The API listens on plain HTTP with no TLS configuration. Production deployments would serve traffic in the clear unless a reverse proxy (e.g., nginx, Cloudflare) is explicitly configured upstream.
**Minimal fix:** Add a middleware that checks `X-Forwarded-Proto` or reject non-HTTPS requests in production. Document that a TLS-terminating reverse proxy is required.

### 4. Environment Variables
**FAIL** — `.gitignore`, `Dockerfile`, `backend/main.py`
**Issue:** No `.env.example` or `.env.template` exists. `DATABASE_URL` defaults to `sqlite:///pathai.db` (unsafe for production). `FRONTEND_URL` defaults to `http://localhost:5173` (leaks dev URL). `CORS_ORIGINS` defaults include literal `[IP_ADDRESS]` strings. Required `JWT_SECRET_KEY` has no documented generation method.
**Minimal fix:** Create `.env.example` with all required vars, safe defaults, and a comment showing how to generate `JWT_SECRET_KEY` (e.g., `openssl rand -hex 32`).

### 5. Secret Management
**PASS** — `backend/auth/utils.py`, `backend/auth/routes.py`
**Note:** `JWT_SECRET_KEY` is required at startup (raises `RuntimeError` if missing). Passwords use bcrypt (passlib). Reset tokens are bcrypt-hashed before database storage. Rate limiting is in-memory (acceptable for MVP; should move to Redis for production).

### 6. Debug Settings
**PASS** — `Dockerfile`, `backend/main.py`
**Note:** Logging level is `INFO` (not `DEBUG`). No debug mode or `--reload` in production CMD. Auto-reload is not enabled in Docker. (The `CMD` does use a shell form with `${PORT:-8000}` substitution, which is acceptable.)

### 7. Cookie Security
**PASS** — `backend/auth/depends.py`
**Note:** The application uses JWT-based bearer token authentication (`Authorization: Bearer <token>`), not cookie-based sessions. No cookies are set by the backend, so cookie-specific security flags (`HttpOnly`, `Secure`, `SameSite`) are not applicable.

### 8. Trusted Hosts
**FAIL** — `Dockerfile` (`CMD`), `backend/main.py`
**Issue:** The `uvicorn` CMD in `Dockerfile` uses a literal `[IP_ADDRESS]` string as the bind host. No `allowed_hosts` middleware is configured (FastAPI/Starlette does not validate `Host` headers by default), making the application vulnerable to host header injection attacks.
**Minimal fix:** Change `CMD` to `--host 0.0.0.0` (standard container binding). Add Starlette's `TrustedHostMiddleware` with a configurable allow-list via environment variable.

---

## Summary

| Check                | Result |
|----------------------|--------|
| Security Headers     | FAIL   |
| CORS Configuration   | FAIL   |
| HTTPS Enforcement    | FAIL   |
| Environment Variables| FAIL   |
| Secret Management    | PASS   |
| Debug Settings       | PASS   |
| Cookie Security      | PASS   |
| Trusted Hosts        | FAIL   |

**5 FAIL / 3 PASS**