# PathAI Verify

Deterministic resume verification and candidate ranking platform with PDF/DOCX parsing, OCR fallback, JWT authentication, database-backed report history, and explainable scoring.

![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-646CFF)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688)
![Database](https://img.shields.io/badge/database-SQLAlchemy-blue)
![OCR](https://img.shields.io/badge/OCR-Tesseract%20%2B%20OpenCV-blue)
![Deployment](https://img.shields.io/badge/deploy-Docker-black)

## Overview

PathAI Verify helps candidates and hiring teams evaluate whether resume claims are internally consistent and aligned with a job description. The app parses resumes, extracts skills and evidence, checks job-description coverage, flags weak or unsupported claims, analyzes employment timelines, and presents the results in an authenticated dashboard.

The implementation is deterministic and heuristic-based. It does not call an external LLM API.

## Implemented Features

- Authentication with registration, login, JWT access tokens, protected routes, and current-user lookup.
- Password reset endpoints with single-use hashed reset tokens, expiration, rate limiting, and optional Resend email delivery.
- Protected dashboard shell for authenticated users.
- PDF and DOCX resume upload with validation for file type, signature, empty files, and a 10 MB size limit.
- PDF text extraction with PyMuPDF.
- OCR fallback for low-text PDFs using PyMuPDF rendering, Pillow, OpenCV preprocessing, and Tesseract.
- DOCX paragraph and table extraction with `python-docx`.
- Pasted resume text flow that takes priority over uploaded files.
- Job-description-aware verification with strictness levels: `low`, `medium`, and `high`.
- Cross-reference setting for checking whether skills, projects, certifications, and seniority claims support each other.
- Section-aware resume parsing, skill discovery, action-verb detection, evidence classification, and claim scoring.
- Compatibility, confidence, risk, verdict, matched skills, missing skills, weak areas, findings, and evidence outputs.
- Timeline analysis for year ranges, possible overlaps, gaps, and suspiciously long spans.
- Explainability summaries, confidence reasoning, risk summaries, risk breakdowns, and positive evidence summaries.
- Database-backed report persistence for manager-owned reports, with browser `localStorage` fallback in the frontend.
- Report search, view, and delete flows.
- Manager-only candidate ranking from pasted resume text.
- Manager-only candidate ranking from multiple uploaded PDF/DOCX files.
- Ranking session persistence with per-user ownership checks.
- Ranking history, expanded ranking details, per-candidate detail pages, and ranking deletion.
- PDF report generation endpoint for downloadable verification reports.
- Security middleware for trusted hosts, CORS, HTTPS enforcement in production, and common security headers.
- Docker build that compiles the Vite frontend, installs backend dependencies, installs Tesseract, and serves the SPA from FastAPI.

## How Verification Works

1. A user uploads a PDF/DOCX resume or pastes resume text.
2. Uploaded files are validated by extension, content type, binary signature, size, and emptiness.
3. PDF or DOCX text is extracted. Low-text PDFs can trigger OCR fallback.
4. Resume text and the job description are normalized.
5. Resume sections are parsed and skills are discovered from section-aware evidence.
6. Job requirements are extracted from the job description.
7. Skill claims, missing claims, pattern-based claims, and consistency findings are generated.
8. Evidence is classified into levels such as demonstrated, supported, mentioned, weak, or missing.
9. The pipeline calculates compatibility, confidence, risk, weak areas, timeline signals, and verdict.
10. The frontend renders summary, skills, evidence, reports, ranking, and candidate-detail views.

## Tech Stack

### Frontend

| Area | Technology |
| --- | --- |
| App framework | React 18, Vite 6 |
| Language | TypeScript |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4, custom PathAI theme CSS |
| UI primitives | Radix UI-based local components |
| Icons | Lucide React, MUI icons |
| Charts | Recharts |
| Notifications | Sonner |
| Animation | Motion |
| State | React context, browser `localStorage` |

### Backend

| Area | Technology |
| --- | --- |
| API framework | FastAPI |
| Server | Uvicorn |
| Validation | Pydantic |
| Database ORM | SQLAlchemy |
| Local database default | SQLite at `pathai.db` |
| Production database support | PostgreSQL-compatible `DATABASE_URL` |
| Authentication | JWT with `python-jose`, bcrypt via Passlib |
| Email provider | Optional Resend for password reset emails |
| PDF reports | ReportLab |

### Parsing and Analysis

| Area | Technology |
| --- | --- |
| PDF extraction | PyMuPDF |
| DOCX extraction | python-docx |
| OCR | pytesseract, Tesseract OCR |
| Image preprocessing | Pillow, OpenCV headless, NumPy |
| Verification logic | Deterministic heuristics, curated skills, section-aware evidence scoring |

## Architecture

```text
React + Vite authenticated dashboard
        |
        | /api/auth/*
        v
FastAPI auth + JWT + SQLAlchemy users

Resume upload or pasted text
        |
        | POST /extract-text
        v
FastAPI validation
        |
        +-- PDF  -> PyMuPDF text extraction -> OCR fallback when needed
        +-- DOCX -> python-docx paragraph/table extraction
        |
        v
Normalized resume text
        |
        | POST /verify
        v
Section parser -> skill discovery -> JD extraction -> evidence and signal modules
        |
        v
Compatibility, confidence, risk, findings, claims, evidence, timeline, summaries
        |
        +-- POST /reports       Persist report for current manager
        +-- POST /report/pdf    Generate downloadable PDF

Multiple candidates + shared JD
        |
        +-- POST /rank          Rank pasted candidate text
        +-- POST /rank-files    Extract and rank uploaded files
        |
        v
Persisted ranking sessions, ranking history, and candidate detail views
```

## Folder Structure

```text
.
|-- backend/
|   |-- main.py                 # FastAPI app, middleware, API routes, SPA serving
|   |-- analysis_engine.py      # Public adapter for the verification pipeline
|   |-- auth/                   # Register, login, JWT, password reset, role guards
|   |-- db/                     # SQLAlchemy config, models, migrations, services
|   |-- parser/                 # PDF, DOCX, OCR, normalization, quality checks
|   |-- parsers/                # Structured resume section parser
|   |-- evidence/               # Evidence extraction/classification helpers
|   |-- verification/           # Main pipeline, JD extraction, skills, years
|   |-- signals/                # Skill, fraud, depth, consistency, explainability signals
|   |-- scoring/                # Legacy-compatible scoring helpers
|   |-- timeline/               # Timeline parsing and analysis
|   |-- reporting/              # PDF report generation
|   `-- _qa_fixtures/           # Parser QA fixtures
|-- src/
|   |-- main.tsx                # React entrypoint
|   |-- app/
|   |   |-- App.tsx             # Providers and router
|   |   |-- routes.tsx          # Route definitions and route protection
|   |   |-- context/            # Auth and verification contexts/API clients
|   |   |-- components/         # Dashboard layout and UI components
|   |   |-- pages/              # Auth, upload, dashboard, reports, ranking pages
|   |   `-- utils/              # Frontend evidence helpers
|   `-- styles/                 # Tailwind input, theme tokens, fonts
|-- tests/                      # Pytest backend/API/unit tests
|-- backend_test_fixtures/      # Additional test fixtures
|-- pathai_design/              # Separate Next.js design prototype
|-- dist/                       # Vite production build output, when built
|-- Dockerfile                  # Full-stack production container
|-- requirements.txt            # Python dependencies
|-- package.json                # Frontend scripts and dependencies
|-- package-lock.json           # npm lockfile
|-- vite.config.ts              # Vite config
`-- .env.example                # Runtime configuration template
```

## API Endpoints

### Public and Auth

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Backend health check. |
| `POST` | `/api/auth/register` | Create a user account. Current backend assigns new users the `candidate` role. |
| `POST` | `/api/auth/login` | Authenticate with username/password and return a bearer token. |
| `GET` | `/api/auth/me` | Return the current authenticated user. |
| `POST` | `/api/auth/forgot-password` | Create a password reset token and send/log a reset link. |
| `POST` | `/api/auth/reset-password` | Reset a password with a valid single-use token. |

### Verification and Reports

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/extract-text` | Accept a PDF or DOCX upload and return normalized extracted text plus warnings. |
| `POST` | `/score-resume` | Legacy-compatible text scoring endpoint. |
| `POST` | `/verify` | Run the main JD-aware verification pipeline. |
| `POST` | `/report/pdf` | Generate a downloadable PDF verification report. |
| `POST` | `/reports` | Persist a verification report for the current manager. |
| `GET` | `/reports` | List reports owned by the current manager. |
| `DELETE` | `/reports/{report_id}` | Delete a report owned by the current manager. |

### Ranking

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/rank` | Manager-only ranking for multiple pasted candidate resumes. |
| `POST` | `/rank-files` | Manager-only ranking for multiple uploaded PDF/DOCX resumes. |
| `GET` | `/rankings` | List ranking sessions owned by the current manager. |
| `GET` | `/rankings/{ranking_id}` | Return one ranking session with candidate results. |
| `GET` | `/rankings/{ranking_id}/candidates/{ranking_candidate_id}` | Return full analysis for one candidate in a ranking. |
| `DELETE` | `/rankings/{ranking_id}` | Delete a ranking session owned by the current manager. |

When `dist/` exists, FastAPI also serves the built frontend at `/`, `/assets/*`, and SPA fallback routes.

## Frontend Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/login` | Public | Sign in. |
| `/register` | Public | Create an account and sign in. |
| `/forgot-password` | Public | Request a password reset link. |
| `/reset-password` | Public | Submit a password reset token and new password. |
| `/` | Authenticated | Upload/paste resume and job description. |
| `/summary` | Authenticated | Verification verdict, scores, summaries, and findings. |
| `/skills` | Authenticated | Claim and skill evidence breakdown. |
| `/evidence` | Authenticated | Evidence snippets, findings, timeline, and skill timeline insights. |
| `/reports` | Authenticated | Search, view, and delete saved reports. |
| `/settings` | Authenticated | Strictness and cross-reference preferences. |
| `/help` | Authenticated | In-app help content. |
| `/rank` and `/ranking` | Manager only | Rank candidates from pasted text or uploaded files. |
| `/ranking-history` | Manager only | View and delete stored ranking sessions. |
| `/ranking-history/:rankingId/candidate/:candidateId` | Manager only | Candidate analysis detail from ranking history. |
| `/rank/:rankingId/candidate/:candidateId` | Manager only | Candidate analysis detail from a fresh ranking. |
| `/rankings/:rankingId/candidates/:candidateId` | Manager only | Candidate analysis detail route alias. |

## Environment Variables

Copy `.env.example` to `.env` and adjust values for local or deployed use.

| Variable | Purpose | Default in code/example |
| --- | --- | --- |
| `JWT_SECRET_KEY` | Required secret for signing JWT access tokens. Backend startup fails without it. | `change_me_to_a_random_secret` in `.env.example` |
| `DATABASE_URL` | SQLAlchemy database URL. | `sqlite:///pathai.db` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins. | `http://localhost:3000,http://localhost:5173` |
| `FRONTEND_URL` | Base URL used in password reset links. | `http://localhost:5173` |
| `ENVIRONMENT` | Set to `production` to require `X-Forwarded-Proto: https`. | `development` |
| `ALLOWED_HOSTS` | Trusted Host middleware allowlist. | `localhost,[IP_ADDRESS],testserver` in code |
| `JWT_EXPIRE_MINUTES` | JWT lifetime. | `60` |
| `RESET_TOKEN_EXPIRE_MINUTES` | Password reset token lifetime. | `15` |
| `MAX_LOGIN_ATTEMPTS` | Login attempts before lockout/rate limit. | `5` |
| `LOGIN_WINDOW_SECONDS` | Login rate-limit window. | `300` |
| `ACCOUNT_LOCKOUT_SECONDS` | Account lockout duration. | `900` |
| `MAX_RESET_ATTEMPTS` | Password reset attempts allowed per window. | `3` |
| `RESET_WINDOW_SECONDS` | Password reset rate-limit window. | `3600` |
| `RESEND_API_KEY` | Optional API key for sending reset emails through Resend. | unset |
| `FROM_EMAIL` | Sender address for reset emails. | `[EMAIL]` |
| `PORT` | Server port used by Docker command. | `8000` |
| `VITE_BASE_PATH` | Frontend build base path. | `/` |

## Installation

### Prerequisites

- Node.js 20 is recommended.
- Python 3.11 is recommended.
- Tesseract OCR is required for local OCR fallback.
- npm for the root Vite app.

### Install frontend dependencies

```bash
npm ci
```

### Install backend dependencies

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

On macOS/Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### Install Tesseract locally

Docker installs Tesseract automatically. For local OCR fallback, install it on the host:

```bash
# Windows
winget install UB-Mannheim.TesseractOCR

# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install tesseract-ocr
```

## Running Locally

Create a `.env` file first. At minimum, set `JWT_SECRET_KEY`.

```bash
copy .env.example .env
```

Run the backend:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Run the frontend in another terminal:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

In development, the frontend calls the backend at `http://localhost:8000`.

## Production Build

Build the frontend:

```bash
npm run build
```

Serve the built SPA from FastAPI:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open:

```text
http://127.0.0.1:8000
```

## Docker

```bash
docker build -t pathai-verify .
docker run --rm -p 8000:8000 --env-file .env pathai-verify
```

The Docker image:

- Installs frontend dependencies with `npm ci`.
- Builds the Vite app.
- Installs Python dependencies.
- Installs `tesseract-ocr`.
- Copies the built `dist/` folder into the runtime image.
- Starts `uvicorn backend.main:app`.

## Database

The backend uses SQLAlchemy and creates tables on startup with `Base.metadata.create_all()`. It also runs lightweight migrations from `backend/db/migrate.py`.

Implemented tables include:

- `users`
- `password_reset_tokens`
- `reports`
- `jobs`
- `candidates`
- `rankings`
- `ranking_candidates`

SQLite is the default local database. PostgreSQL-compatible databases can be used by setting `DATABASE_URL`.

## Authentication and Roles

The backend supports `candidate` and `manager` role checks. General dashboard routes require authentication. Ranking and persisted report API endpoints require the `manager` role.

Important current behavior: `POST /api/auth/register` always creates users with the `candidate` role, even though the frontend registration form displays a role selector. To use manager-only ranking features, a user's role must currently be updated in the database or seeded externally.

## Ranking Formula

Candidate ranking uses the same deterministic analysis pipeline as single-resume verification. The composite score is:

```text
rank_score = compatibility_score * 0.7 + confidence * 0.2 - risk_score * 0.1
```

Results are sorted by descending `rank_score` and persisted with full candidate analysis data when the database write succeeds.

## Testing

Run the backend test suite:

```bash
python -m pytest tests/
```

Run frontend type checking:

```bash
npm run typecheck
```

Build the frontend:

```bash
npm run build
```

The test suite includes coverage for authentication, password reset, file extraction endpoints, verification API behavior, skill/fraud/timeline/ranking signals, ranking scores, and ranking ownership.

## Current Limitations

- The analysis is deterministic and heuristic-based, not semantic model reasoning.
- The frontend upload accept list includes `.doc`, but the backend only accepts valid PDF and DOCX files.
- New registrations are stored as `candidate` users; manager role assignment is not currently wired through the backend registration schema.
- OCR quality depends on scan resolution, language, layout, and Tesseract availability.
- Password reset email delivery requires `RESEND_API_KEY`; without it, reset links are logged for development.
- Rate limiting is in-memory, so it resets when the backend process restarts and is not shared across multiple server instances.
- SQLite is suitable for local development; production deployments should use a managed database through `DATABASE_URL`.
- The `pathai_design/` directory is a separate Next.js design prototype, not the production app.

## License

MIT License.
