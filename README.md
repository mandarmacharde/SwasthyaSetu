# SwasthyaSetu

Bridging every village to healthcare — one phone call, in one's own tongue.

**AI for Bharat Hackathon 2026** · Track: Rural Healthcare Access  
**Mandar Prakash Macharde** · SPIT, Mumbai

---

## What It Does

A **browser-based AI voice triage** system for rural India. A patient opens the web app, taps the mic, and speaks their symptoms in Hindi, Marathi, or English. The AI converses — listening via Whisper, thinking via Groq (Llama 3.3-70b), speaking back via edge-tts — until it has enough info to determine urgency and category. The case is logged for ASHA workers and doctors.

No app store, no text literacy required — just a browser and a mic.

---

## Architecture

```
Patient (Smartphone)
     │
  Browser (MediaRecorder + audio element)
     │
  Next.js Frontend
     │
  FastAPI Backend
     │
  ├── Whisper (STT)
  ├── Groq AI (Llama 3.3-70b) — triage engine
  ├── edge-tts (TTS)
  └── Supabase (PostgreSQL) — cases, users, patients
          │
     ┌────┴────┐
  ASHA Dashboard   Doctor Dashboard
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, Python |
| **STT** | Whisper (via Groq) |
| **AI Triage** | Groq (Llama 3.3-70b-versatile) with WHO IMCI/ICTRC protocol |
| **TTS** | edge-tts (Hindi, Marathi, English) |
| **Database** | Supabase (PostgreSQL) |
| **Frontend** | Next.js 16, Tailwind CSS, shadcn/ui |
| **Auth** | Demo mode (localStorage mock) |
| **Deployment** | Render (backend) + Vercel (frontend) |

## Features

- **Voice triage** — tap the mic, speak symptoms, AI converses back in the same language
- **3 Indian languages** — Hindi (हिन्दी), Marathi (मराठी), English. Switch mid-call
- **Direct record** — no language selection step; page loads ready to record
- **WHO protocol triage** — danger signs (unconscious, seizures, severe bleeding) trigger immediate emergency. Max 6 questions per session, then auto-classify
- **ASHA dashboard** — view open cases, assign to yourself, mark visited
- **Doctor dashboard** — review triaged cases, mark as treated
- **Admin dashboard** — system-wide analytics, create ASHA/doctor accounts
- **Case detail** — full conversation transcript, urgency badge, status history
- **PWA** — installable on mobile, works offline-capable

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env — add GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY

# Run
uvicorn app.main:app --reload --port 8000
```

Create Supabase tables by running `backend/supabase_schema.sql` in Supabase SQL Editor, then seed demo data:

```bash
curl -X POST http://localhost:8000/api/seed/demo
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### 3. Login

Open `/login` — choose a role (Admin, ASHA Worker, or Doctor) to auto-login. Admin can create new ASHA/Doctor accounts from the dashboard.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for Llama 3.3-70b |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon/public key |
| `DEFAULT_LANG` | No | Default language code (`mr`) |

## API Endpoints

### Triage
```
POST /api/triage             — Text triage (JSON)
POST /api/audio-triage       — Audio triage (multipart)
```

### Cases
```
GET    /api/cases/            — List cases (filterable by status, urgency, assigned_to)
GET    /api/cases/{id}        — Get case detail
PATCH  /api/cases/{id}        — Update case (status, assigned_to)
```

### Users
```
GET  /api/users/              — List all users
POST /api/users/create        — Create ASHA/Doctor user (name, phone, role, district)
```

### Seed
```
POST /api/seed/demo           — Seed demo data (cases, users, patients)
GET  /api/seed/status         — Check data count
```

## Dashboard URLs

| Page | URL | Role |
|---|---|---|
| Demo Call | `/demo-call` | Public (patient) |
| Login | `/login` | Public |
| Admin Dashboard | `/admin` | Admin |
| ASHA Dashboard | `/asha` | ASHA Worker |
| Doctor Dashboard | `/doctor` | Doctor |
| Case Detail | `/cases/[id]` | ASHA/Doctor |

## Project Structure

```
backend/
  app/
    api/           — Route handlers (triage, cases, users, seed)
    services/      — Triage engine (Groq), session mgmt, Supabase client
    config.py      — Environment config
    main.py        — FastAPI app
  supabase_schema.sql — DDL for all 4 tables
  render.yaml      — Render deploy config
frontend/
  src/
    app/           — Next.js pages (demo-call, login, asha, doctor, admin, cases)
    components/    — Reusable UI components
    lib/           — API client, auth, languages
```
