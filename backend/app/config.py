import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./swasthyasetu.db")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
