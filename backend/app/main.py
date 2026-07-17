from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import GROQ_API_KEY
from app.supabase_client import get_supabase
from app.api import triage, cases, seed, detect, users, ivr


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        sb = get_supabase()
        sb.table("health_centers").select("*").limit(1).execute()
    except Exception:
        pass
    yield


app = FastAPI(title="SwasthyaSetu", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(triage.router)
app.include_router(detect.router)
app.include_router(cases.router)
app.include_router(users.router)
app.include_router(seed.router)
app.include_router(ivr.router)


@app.get("/health")
async def health():
    has_key = bool(GROQ_API_KEY)
    sb_ok = False
    try:
        sb = get_supabase()
        sb.table("health_centers").select("*").limit(1).execute()
        sb_ok = True
    except Exception:
        pass
    return {"status": "ok", "groq_configured": has_key, "supabase_connected": sb_ok, "version": "1.0.0"}
