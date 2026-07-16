# AI Career Mentor

**Live demo:** [ai-mentor-umber-ten.vercel.app](https://ai-mentor-umber-ten.vercel.app)
*(free-tier hosting — the first request after idle can take up to a minute to wake the services)*

Upload your resume, name **any** target role, and get a graded, actionable report:
an overall grade, how closely you match the role, the exact skills you're missing,
hand-picked courses to close each gap, and a personal upskilling roadmap from a
mentor chatbot.

---

## What it does

- **Graded assessment** — a letter grade (A–D) and 0–100 score from a logistic-regression
  model over resume-quality features (skills, length, action verbs, quantified impact, sections).
- **Skill-gap analysis for any role** — a local LLM lists the skills a role needs; the app
  detects which your resume already covers and which are missing.
- **Curated learning** — for every gap, free and paid course results (keyless DuckDuckGo search)
  plus deterministic platform search links.
- **Mentor chatbot** — asks your situation (student / working / between jobs) and weekly hours,
  then generates a realistic phased roadmap tailored to it.
- **Accounts & history** — sign up, and every assessment and roadmap is saved to your history:
  re-grade a saved resume against a new role without re-uploading, compare two assessments
  side by side, track roadmap progress, and export reports to PDF.

---

## Architecture

```
React (Vite, :5173)
      │  /api/*  (Vite dev proxy)
      ▼
Spring Boot API (:8080) ──► PostgreSQL   (users, analyses, roadmaps)
      │
      ▼
FastAPI ML service (:8100) ──► Ollama (:11434)  role requirements + roadmaps
                            └─► DuckDuckGo HTML   keyless course search
```

| Layer | Stack |
|-------|-------|
| Frontend | React 19, Vite, React Router |
| Backend | Java 21, Spring Boot 4, Spring Data JPA, token auth (BCrypt) |
| ML service | Python 3.11, FastAPI, scikit-learn, pdfplumber |
| Database | PostgreSQL |
| LLM | Ollama `qwen2.5:7b` (local) — or Groq (cloud) |

---

## Prerequisites

- **Java 21** and **PostgreSQL**
- **[uv](https://docs.astral.sh/uv/)** (Python 3.11) for the ML service
- **Node 18+** for the frontend
- **[Ollama](https://ollama.com)** with the model pulled:
  ```bash
  ollama pull qwen2.5:7b
  ```

---

## Setup

### 1. Database

Create a database named `ai_mentor` (tables are auto-created on first run via `ddl-auto=update`):

```sql
CREATE DATABASE ai_mentor;
```

Credentials are set in `backend/src/main/resources/application.properties`
(defaults: user `postgres`, password `root`). Adjust to match your local Postgres.

### 2. ML service (`:8100`)

```bash
cd ml-service
uv run uvicorn app.main:app --port 8100 --reload
```

### 3. Backend (`:8080`)

```bash
cd backend
./mvnw spring-boot:run
```

### 4. Frontend (`:5173`)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**, create an account, and upload a resume (PDF or `.txt`).

> First analysis of a **new** role calls the local LLM and can take a few seconds;
> results are cached per role afterward.

---

## Configuration

Backend (`application.properties`):

| Key | Default | Purpose |
|-----|---------|---------|
| `ml.service.url` | `http://localhost:8100` | ML service base URL |
| `app.cors.origins` | `http://localhost:5173` | allowed frontend origin(s) |
| `app.token.ttl-days` | `14` | session token lifetime |

ML service (environment variables):

| Var | Default | Purpose |
|-----|---------|---------|
| `LLM_PROVIDER` | `ollama` | `ollama` (local) or `groq` (cloud) |
| `OLLAMA_URL` | `http://localhost:11434/api/chat` | Ollama endpoint |
| `OLLAMA_MODEL` | `qwen2.5:7b` | local model |
| `GROQ_API_KEY` | – | required when `LLM_PROVIDER=groq` |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model |

---

## API

All `/api/*` routes except auth require an `Authorization: Bearer <token>` header.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` · `/login` · `/logout` | account + session |
| `GET`  | `/api/roles` | role suggestions |
| `POST` | `/api/analyze` | grade an uploaded resume for a role |
| `POST` | `/api/reassess` | re-grade a saved resume for a new role |
| `POST` | `/api/roadmap` | generate + save an upskilling roadmap |
| `GET`  | `/api/analyses` · `/api/roadmaps` | your history |
| `PATCH`| `/api/roadmaps/{id}/progress` | save phase completion |
| `DELETE` | `/api/analyses/{id}` · `/api/roadmaps/{id}` | delete an item |

---

## Deployment (free tier)

The live demo runs on this stack:

| Piece | Host | Key settings |
|-------|------|--------------|
| `frontend/` | Vercel | Root Directory = `frontend`; API URL via `frontend/.env.production`; SPA rewrite in `vercel.json` |
| `backend/` | Render (Docker, `backend/Dockerfile`) | `SPRING_DATASOURCE_URL/USERNAME/PASSWORD`, `ML_SERVICE_URL` |
| `ml-service/` | Render | `LLM_PROVIDER=groq`, `GROQ_API_KEY` |
| PostgreSQL | Supabase | use the **Session pooler** connection (Render is IPv4-only), prefix with `jdbc:` |
| LLM | Groq | no free host runs Ollama well |

Deploy order: database → ml-service → backend → frontend.

Gotchas hit in the wild:
- Supabase JDBC URL must be `jdbc:postgresql://...pooler.supabase.com:5432/postgres` — the direct `db.<ref>...` host is IPv6-only and the REST URL doesn't work for JDBC.
- If you create the tables by hand, `id` columns need `GENERATED BY DEFAULT AS IDENTITY`.
- Groq's CDN rejects Python's default urllib user-agent (403) — the ML service sends its own.

---

## Project layout

```
ai_mentor/
├── frontend/     React + Vite SPA
├── backend/      Spring Boot API + auth + persistence
└── ml-service/   FastAPI: grading model, gap analysis, LLM wrapper, course search
```

## Notes

- Session auth is a deliberately small single-token-per-user model (no Spring Security
  filter chain); swap in Spring Security if you need roles/OAuth/refresh tokens.
- The grade model trains on synthetic data on first run — retrain on real graded
  resumes for production-quality scoring.
- Rate limiting is in-memory per instance; use Redis/bucket4j if you scale out.
