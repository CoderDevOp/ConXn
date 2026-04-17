# ConXn

ConXn is an alumni intelligence platform that combines semantic search, graph-based discovery, and guided outreach.
It includes:

- A React + Vite frontend (`frontend`)
- A FastAPI backend (`backend`)
- Alumni seed data (`alumni.csv`)

## Features

- Semantic alumni search with structured query parsing
- Smart search buckets:
  - Filtered matches (strong fit)
  - Recommended matches (partial fit)
  - Relaxed suggestions
- 2D and 3D alumni network visualization
- Student and Alumni dedicated workspaces
- Organization workspace for private alumni roster upload and scoped search
- AI-assisted message/email drafting (Gemini/Ollama optional)

## Tech Stack

- Frontend: React, Vite, Tailwind, Cytoscape, 3d-force-graph
- Backend: FastAPI, Sentence Transformers, NetworkX, Pandas
- LLM integrations: Google Gemini (optional), Ollama (optional)

## Project Structure

```text
Atlantas/
├─ backend/
│  ├─ app/
│  │  ├─ main.py
│  │  ├─ organization_store.py
│  │  ├─ social_store.py
│  │  └─ data/
│  ├─ requirements.txt
│  └─ .env.example
├─ frontend/
│  ├─ src/
│  ├─ package.json
│  └─ .env.example
├─ scripts/
└─ alumni.csv
```

## Prerequisites

- Python 3.10+ (recommended 3.11)
- Node.js 18+ (recommended 20+)
- npm

## Setup

### 1) Backend setup

```bash
cd backend
python -m venv .venv
```

Activate venv:

- Windows (PowerShell):

```powershell
.\.venv\Scripts\Activate.ps1
```

- macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Optional: copy env template and configure keys:

```bash
cp .env.example .env
```

### 2) Frontend setup

```bash
cd ../frontend
npm install
```

Optional env:

```bash
cp .env.example .env
```

## Running Locally

Run backend and frontend in separate terminals.

### Terminal 1: Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URL: `http://127.0.0.1:8000`

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

Frontend URL: usually `http://localhost:5173` (or next free port)

## Useful Commands

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

### Backend quick check

```bash
curl http://127.0.0.1:8000/health
```

## Environment Variables

### Backend (`backend/.env`)

- `ALUMNI_CSV` (optional) custom CSV path
- `GEMINI_API_KEY`, `GEMINI_MODEL` (optional)
- `OLLAMA_URL`, `OLLAMA_MODEL` (optional)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (optional)

Data path behavior:

- Uses repo root `alumni.csv` if present
- Else falls back to `backend/app/data/alumni.csv`
- Can be overridden with `ALUMNI_CSV`

### Frontend (`frontend/.env`)

- `VITE_API_URL` (optional)
  - Keep unset in dev to use Vite proxy (`/api -> http://127.0.0.1:8000`)

## Troubleshooting

- Frontend cannot reach backend:
  - Make sure backend is running on port `8000`
  - Keep `VITE_API_URL` unset for local dev unless intentionally overriding
- Port already in use:
  - Vite auto-selects next available port (e.g., 5174, 5175)
- Search quality issues after backend code changes:
  - Restart backend so changes are reloaded cleanly

## License

Add your preferred license here (MIT/Apache-2.0/etc.).