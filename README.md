# SwasthyaSetu

Bridging every village to healthcare — one phone call, in one's own tongue.

**AI for Bharat Hackathon 2026** · Track: Rural Healthcare Access  
**Mandar Prakash Macharde** · SPIT, Mumbai

---

## Architecture

```
Feature Phone                Smartphone (PWA)
     │                            │
  Phone Call (IVR)             Web App
     │                            │
  Twilio Voice                Next.js + shadcn/ui
     │                            │
     └──────────┬────────────────┘
                │
           FastAPI Backend
                │
     ┌──────────┼──────────┐
     │          │          │
  STT (Whisper) │     TTS (edge-tts)
     │          │          │
     └──────────┼──────────┘
                │
         AI Triage (Gemini)
           WHO Protocol
                │
         ┌──────┴──────┐
         │             │
    PostgreSQL       Twilio SMS
    (persistence)    (notifications)
         │
    ┌───┴───────────┐
    │               │
 ASHA Dashboard  Doctor Dashboard
  (Next.js)       (Next.js)
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, SQLModel, PostgreSQL/SQLite |
| **AI** | Gemini 2.5 Flash, faster-whisper, edge-tts |
| **Frontend** | Next.js 15, Tailwind CSS, shadcn/ui |
| **IVR** | Twilio Voice + Media Streams |
| **Notifications** | Twilio SMS, Firebase (optional) |
| **Auth** | JWT, bcrypt |
| **Deployment** | Docker, docker-compose |

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY

# Run (SQLite, no external DB needed)
uvicorn app.main:app --reload --port 8090
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### 3. With Docker

```bash
docker-compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model name |
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./swasthyasetu.db` | PostgreSQL or SQLite |
| `TWILIO_ACCOUNT_SID` | For IVR | — | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For IVR | — | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | For IVR | — | Twilio phone number |
| `JWT_SECRET` | No | `dev-secret-...` | JWT signing key |
| `MOCK_TRIAGE` | No | — | Set to `1` to use mock triage (no API key needed) |
| `DEFAULT_LANG` | No | `mr` | Default language code |

## API Endpoints

### Health
```
GET /health
```

### Triage
```
POST /api/triage        — Text-based triage (JSON body)
POST /api/audio-triage  — Audio-based triage (multipart form)
```

### Cases
```
GET    /api/cases/                  — List cases (filter by status, urgency)
GET    /api/cases/by-session/{id}   — Get case by session ID
GET    /api/cases/{id}              — Get case by case ID
PATCH  /api/cases/{id}/assign       — Assign case to user
PATCH  /api/cases/{id}/status       — Update case status
```

### Patients
```
GET /api/patients/      — List patients
GET /api/patients/{id}  — Get patient with case history
```

### Users
```
GET /api/users/       — List users (filter by role, district)
GET /api/users/{id}   — Get user details
```

### IVR (Twilio)
```
POST /api/ivr/voice             — Incoming call handler
POST /api/ivr/choose-language   — Language selection
POST /api/ivr/process-speech    — Speech processing
```

## Dashboard URLs

| Page | URL | Role |
|---|---|---|
| Landing | `/` | Public |
| Login | `/login` | Public |
| ASHA Dashboard | `/asha` | ASHA Worker |
| Doctor Dashboard | `/doctor` | Doctor |
| Admin Dashboard | `/admin` | Admin |

## Testing

```bash
cd backend
pytest tests/ -v
```

## Project Structure

```
backend/
  app/
    api/           — Route handlers
    models/        — SQLModel database models
    services/      — Business logic
    config.py      — Environment config
    database.py    — Database engine
    main.py        — FastAPI app
  tests/           — Unit + integration tests
  demo.py          — CLI demo
frontend/
  src/
    app/           — Next.js pages
    components/    — Reusable UI components
    lib/           — API client
```

## Demo

The system includes a CLI demo that works without an API key:

```bash
cd backend
MOCK_TRIAGE=1 python demo.py --lang mr    # Marathi text demo
MOCK_TRIAGE=1 python demo.py --lang hi    # Hindi text demo
MOCK_TRIAGE=1 python demo.py --lang en    # English text demo
```

## License

Hackathon project — AI for Bharat 2026, IIIT Delhi
