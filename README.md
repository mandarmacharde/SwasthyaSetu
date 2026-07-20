<div align="center">
  <br/>
  <img src="https://img.shields.io/badge/🤖%20SwasthyaSetu-AI%20for%20Bharat%202026-10b981?style=for-the-badge&labelColor=064e3b" alt="SwasthyaSetu" />
  <br/><br/>

  <h3>🌿 Bridging every village to healthcare — one voice call, in your own tongue</h3>

  <br/>

  <p>
    <a href="https://swasthya-setu-mauve.vercel.app" target="_blank">
      <img src="https://img.shields.io/badge/🌐%20Live%20App-22c55e?style=for-the-badge" alt="Live App"/>
    </a>
    &nbsp;
    <a href="https://swasthyasetu-pjgf.onrender.com/docs" target="_blank">
      <img src="https://img.shields.io/badge/📡%20API%20Docs-64748b?style=for-the-badge" alt="API Docs"/>
    </a>
    &nbsp;
    <a href="https://github.com/mandarmacharde/SwasthyaSetu" target="_blank">
      <img src="https://img.shields.io/badge/📦%20GitHub-1f2937?style=for-the-badge" alt="GitHub"/>
    </a>
  </p>

  <br/>

  <p>
    <a href="https://vercel.com"><img src="https://img.shields.io/badge/deployed%20on-Vercel-000000?style=flat-square&logo=vercel" alt="Vercel"/></a>
    &nbsp;
    <a href="https://render.com"><img src="https://img.shields.io/badge/deployed%20on-Render-46e3b7?style=flat-square&logo=render" alt="Render"/></a>
    &nbsp;
    <img src="https://img.shields.io/badge/python-3.12+-3776AB?style=flat-square&logo=python" alt="Python"/>
    &nbsp;
    <img src="https://img.shields.io/badge/next.js-16-000000?style=flat-square&logo=next.js" alt="Next.js"/>
    &nbsp;
    <img src="https://img.shields.io/badge/Groq-Llama%203.3--70b-f97316?style=flat-square" alt="Groq"/>
  </p>

  <br/><br/>
</div>

---

## 🚀 Live Links

| | |
|---|---|
| 🌐 **Frontend** | [swasthya-setu-mauve.vercel.app](https://swasthya-setu-mauve.vercel.app) |
| 📡 **Backend API** | [swasthyasetu-pjgf.onrender.com](https://swasthyasetu-pjgf.onrender.com) |
| 📘 **API Docs (Swagger)** | [swasthyasetu-pjgf.onrender.com/docs](https://swasthyasetu-pjgf.onrender.com/docs) |
| 🎬 **Demo Video** | [Google Drive](https://drive.google.com/drive/folders/1Lq03kkz0lWkVl8wJrKrO2U00u2bwtj6l) |
| 📝 **Project Write-up** | [Google Drive](https://drive.google.com/file/d/14CGcZvh5gJ1b19Tuwv9vgajKEjqXtiHM/view?usp=sharing) |

---

## 🩺 What It Does

A **browser-based AI voice triage** system for rural India. A patient opens the web app, taps the mic, and speaks their symptoms in **Hindi, Marathi, or English**. The AI converses — listening via **Groq Whisper**, thinking via **Groq Llama 3.3-70b** (WHO IMCI/ICTRC protocol), speaking back via **edge-tts** — until it determines urgency and category. The case is logged for ASHA workers and doctors.

> ✨ No app store. No text literacy needed. Just a browser and a mic.

---

## 🏗️ Architecture

```
                     ┌─────────────────────┐
                     │   Patient's Phone   │
                     │  (Browser + Mic)    │
                     └──────────┬──────────┘
                                │ MediaRecorder
                                ▼
                     ┌─────────────────────┐
                     │   Next.js Frontend  │
                     │   (Vercel)          │
                     └──────────┬──────────┘
                                │ HTTPS
                                ▼
                     ┌─────────────────────┐
                     │   FastAPI Backend   │
                     │   (Render)          │
                     │                     │
              ┌──────┼─────────────────────┼──────┐
              │      │                     │      │
              ▼      ▼                     ▼      ▼
       ┌─────────┐ ┌──────┐        ┌─────────┐ ┌──────────┐
       │  Groq   │ │ Groq │        │edge-tts │ │Supabase  │
       │ Whisper │ │Llama │        │  TTS    │ │PostgreSQL│
       │  (STT)  │ │Triage│        │(speak)  │ │ (store)  │
       └─────────┘ └──────┘        └─────────┘ └──────────┘
                                            │
                              ┌─────────────┴─────────────┐
                              │                           │
                          ┌──────┐                  ┌────────┐
                          │ ASHA │                  │ Doctor │
                          │ Dash │                  │  Dash  │
                          └──────┘                  └────────┘
```

---

## ⚡ Tech Stack

| Layer | Technology | Badge |
|---|---|---|
| **Frontend** | Next.js 16, Tailwind CSS, shadcn/ui | ![Next.js](https://img.shields.io/badge/-000000?style=flat-square&logo=next.js) |
| **Backend** | FastAPI, Python 3.12+ | ![FastAPI](https://img.shields.io/badge/-009688?style=flat-square&logo=fastapi) |
| **STT** | Groq Whisper (`whisper-large-v3-turbo`) | ![Groq](https://img.shields.io/badge/-f97316?style=flat-square) |
| **AI Triage** | Groq Llama 3.3–70b (WHO IMCI/ICTRC protocol) | ![Groq](https://img.shields.io/badge/-f97316?style=flat-square) |
| **TTS** | edge-tts (Hindi / Marathi / English) | ![Azure](https://img.shields.io/badge/-0078D4?style=flat-square&logo=microsoft-azure) |
| **Database** | Supabase (PostgreSQL) | ![Supabase](https://img.shields.io/badge/-3ECF8E?style=flat-square&logo=supabase) |
| **Auth** | Demo mode (localStorage mock) | — |
| **Deployment** | Render (backend) + Vercel (frontend) | ![Render](https://img.shields.io/badge/-46e3b7?style=flat-square) ![Vercel](https://img.shields.io/badge/-000000?style=flat-square&logo=vercel) |

---

## ✨ Features

- 🎤 **Voice triage** — tap the mic, speak symptoms, AI converses back in the same language
- 🗣️ **3 Indian languages** — हिन्दी · मराठी · English. Switch mid-call
- ⚡ **Direct record** — page loads ready to record, no language selection step
- 🚨 **WHO protocol triage** — danger signs → immediate emergency. Max 6 questions, then auto-classify
- 📋 **ASHA dashboard** — view open cases, assign to yourself, mark visited
- 🩺 **Doctor dashboard** — review triaged cases, mark as treated
- 👑 **Admin dashboard** — system-wide analytics, create ASHA/doctor accounts
- 📄 **Case detail** — full transcript, urgency badge, status history
- 📱 **PWA** — installable on mobile, dark theme, offline-ready

---

## 🏁 Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env — add GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY

# Run
uvicorn app.main:app --reload --port 8000
```

Create Supabase tables by running `backend/supabase_schema.sql` in Supabase SQL Editor, then seed:

```bash
curl -X POST http://localhost:8000/api/seed/demo
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### Login

Open `/login` and pick a role. Admin can create new ASHA/Doctor accounts from the dashboard.

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | Groq API key for Llama and Whisper |
| `SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `SUPABASE_KEY` | ✅ Yes | Supabase anon/public key |
---

## 📡 API Endpoints

### Triage
```
POST /api/triage            Text-based triage (JSON)
POST /api/audio-triage      Audio triage (multipart) → STT → triage → TTS
```

### Cases
```
GET    /api/cases/           List cases (filter: status, urgency, assigned_to)
GET    /api/cases/{id}       Get case detail with full transcript
PATCH  /api/cases/{id}       Update case (status, assigned_to)
```

### Users
```
GET  /api/users/             List all users
POST /api/users/create       Create ASHA/Doctor (name, phone, role, district)
```

### Seed
```
POST /api/seed/demo          Populate demo data (cases, users, patients)
GET  /api/seed/status        Check record counts
```

---

## 🗺️ Dashboard URLs

| Page | Route | Access |
|---|---|---|
| 🏠 Demo Call | `/demo-call` | Public |
| 🔑 Login | `/login` | Public |
| 👑 Admin | `/admin` | Admin |
| 👩‍⚕️ ASHA | `/asha` | ASHA Worker |
| 🩺 Doctor | `/doctor` | Doctor |
| 📄 Case Detail | `/cases/[id]` | ASHA / Doctor |

---

## 📁 Project Structure

```
📦 SwasthyaSetu
├── 📂 backend
│   ├── 📂 app
│   │   ├── 📂 api         # Route handlers
│   │   ├── 📂 services    # Triage engine, STT, TTS, sessions
│   │   ├── config.py      # Env config
│   │   └── main.py        # FastAPI entrypoint
│   ├── supabase_schema.sql
│   └── render.yaml
├── 📂 frontend
│   ├── 📂 src
│   │   ├── 📂 app         # Next.js pages
│   │   ├── 📂 components  # UI components
│   │   └── 📂 lib         # API client, auth, languages
│   └── vercel.json
└── README.md
```

---

<div align="center">
  <br/>
  <sub>Built with ❤️ for <strong>AI for Bharat Hackathon 2026</strong></sub>
  <br/>
  <sub>Mandar Prakash Macharde · SPIT, Mumbai</sub>
  <br/><br/>
</div>
