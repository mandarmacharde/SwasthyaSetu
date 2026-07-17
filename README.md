# SwasthyaSetu

Bridging every village to healthcare — one phone call, in one's own tongue.

**AI for Bharat Hackathon 2026** · Track: Rural Healthcare Access  
**Mandar Prakash Macharde** · SPIT, Mumbai

---

## What It Does

A **browser-based AI voice triage** system for rural India. A patient opens the web app, selects their language (22 Indian languages supported), taps the mic, and speaks their symptoms. The AI converses with them naturally — listening, thinking, speaking back — until it has enough info to determine urgency and category. The case is then sent to local ASHA workers and doctors for follow-up.

No app store, no text literacy required — just a browser and a mic.

---

## Architecture

```
Patient (Smartphone)
     │
  Browser with SpeechRecognition + speechSynthesis
     │
  Next.js Frontend (vercel-ready)
     │
  FastAPI Backend (render-ready)
     │
  ├── Groq AI (Llama 3.3-70b) — triage engine
  │
  └── Supabase (PostgreSQL) — cases, users, patients
          │
     ┌────┴────┐
  ASHA Dashboard   Doctor Dashboard
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, Python |
| **AI** | Groq (Llama 3.3-70b-versatile) |
| **Database** | Supabase (PostgreSQL) |
| **Frontend** | Next.js 15, Tailwind CSS, shadcn/ui |
| **Speech (browser)** | Web Speech API (SpeechRecognition + speechSynthesis) |
| **Speech (fallback)** | MediaRecorder + backend Whisper |
| **Auth** | Demo mode (localStorage), bcrypt |
| **Deployment** | Render (backend) + Vercel (frontend) |

## Features

- **Voice conversation** — listen → Groq triage → TTS speaks back → auto-listen. Like a real voice assistant.
- **22 Indian languages** — Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu, Assamese, Maithili, Santali, Kashmiri, Nepali, Sindhi, Konkani, Dogri, Manipuri, Bodo, Sanskrit, English
- **Auto-detect language** — tap the mic button, speak, the system detects which language you're using
- **All browsers** — SpeechRecognition on Safari/Chrome/Edge; auto-fallback to MediaRecorder+Whisper on Firefox
- **Cross-browser mic** — single button that works everywhere. TTS speaks AI responses aloud (Chrome autoplay handled).
- **Red-flag detection** — keywords for emergencies (seizures, unconsciousness, severe bleeding) trigger immediate emergency alert
- **ASHA dashboard** — view open cases, assign to yourself, mark visited
- **Doctor dashboard** — review triaged cases, mark as treated
- **Case detail** — full conversation transcript, urgency badge, status transitions
- **Phone-style UI** — dark gradient screen, pulsing mic, red end-call button, call timer

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

### 3. IVR (Toll-Free Call)

The IVR lets feature-phone users dial a number and speak symptoms. Uses **Twilio** + **Whisper** + **Groq** + **edge-tts**.

**Setup:**
1. Sign up at [twilio.com](https://twilio.com) (free trial ~$15 credit)
2. Buy a phone number in the Twilio console
3. Expose your local backend with [ngrok](https://ngrok.com): `ngrok http 8000`
4. In Twilio Console → Phone Numbers → your number → Voice configuration:
   - Set webhook to `https://your-ngrok-url.ngrok.io/api/ivr/voice` (POST)
5. Call your Twilio number — you'll hear a language menu, then speak your symptoms

**How it works:**
- Twilio `<Gather>` with DTMF for language selection
- `<Record>` captures speech, sends to backend
- Backend: **Whisper** (transcribe) → **Groq** (triage) → **edge-tts** (speak response)
- `<Play>` plays the AI's spoken question back to caller
- Loop continues until triage is complete → case logged to Supabase → hangup

**Languages supported on IVR:** Hindi, Marathi, English, Tamil, Bengali, Gujarati (edge-tts voices)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

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
POST /api/detect-language    — Detect language (JSON)
```

### Cases
```
GET    /api/cases/            — List cases
GET    /api/cases/{id}        — Get case detail
PATCH  /api/cases/{id}        — Update case (status, assigned_to)
```

### Users
```
GET /api/users/               — List users
```

### IVR (Twilio)
```
POST /api/ivr/voice           — Incoming call → language menu
POST /api/ivr/language        — DTMF selection → greeting + record
POST /api/ivr/recording       — Recording callback → transcribe + triage + respond
GET  /api/ivr/audio/{name}    — Serve generated TTS audio
```

### Seed
```
POST /api/seed/demo           — Seed demo data
GET  /api/seed/status         — Check data count
```

## Dashboard URLs

| Page | URL | Role |
|---|---|---|
| Demo Call | `/demo-call` | Public (patient) |
| Login | `/login` | Public |
| ASHA Dashboard | `/asha` | ASHA Worker |
| Doctor Dashboard | `/doctor` | Doctor |
| Admin Dashboard | `/admin` | Admin |
| Case Detail | `/cases/[id]` | ASHA/Doctor |

## Project Structure

```
backend/
  app/
    api/           — Route handlers (triage, cases, auth, detect, seed)
    models/        — Stubbed SQLModel (migrating to Supabase)
    services/      — Triage engine (Groq), session mgmt, Supabase client
    config.py      — Environment config
    main.py        — FastAPI app
    supabase_client.py — Supabase singleton
  supabase_schema.sql — DDL for all 4 tables
  render.yaml      — Render deploy config
frontend/
  src/
    app/           — Next.js pages (demo-call, login, asha, doctor, admin, cases)
    components/    — Reusable UI components
    lib/           — API client, languages, theme
```
