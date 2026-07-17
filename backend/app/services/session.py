import uuid
import json
from datetime import datetime, timezone

from app.supabase_client import get_supabase


async def create_session(language: str = "mr", phone: str = "") -> str:
    session_id = uuid.uuid4().hex[:12]
    sb = get_supabase()
    sb.table("cases").insert({
        "session_id": session_id,
        "language": language,
        "callback_number": phone,
    }).execute()
    return session_id


async def add_turn(session_id: str, role: str, content: str):
    sb = get_supabase()
    result = sb.table("cases").select("*").eq("session_id", session_id).execute()
    if not result.data:
        return
    case = result.data[0]
    turns = json.loads(case["transcript"]) if case["transcript"] else []
    turns.append({"role": role, "content": content, "timestamp": datetime.now(timezone.utc).isoformat()})
    sb.table("cases").update({
        "transcript": json.dumps(turns, ensure_ascii=False),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("session_id", session_id).execute()


async def get_history(session_id: str) -> list[dict]:
    sb = get_supabase()
    result = sb.table("cases").select("*").eq("session_id", session_id).execute()
    if not result.data:
        return []
    turns = json.loads(result.data[0]["transcript"]) if result.data[0]["transcript"] else []
    return [{"role": t["role"], "content": t["content"]} for t in turns]


async def update_triage(session_id: str, triage_result: dict):
    sb = get_supabase()
    existing = sb.table("cases").select("*").eq("session_id", session_id).execute()
    if not existing.data:
        return
    payload = {
        "urgency": triage_result.get("urgency", "medium"),
        "possible_category": triage_result.get("possible_category", ""),
        "triage_summary": json.dumps(triage_result, ensure_ascii=False),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if triage_result.get("enough_info"):
        payload["status"] = "open"
    sb.table("cases").update(payload).eq("session_id", session_id).execute()


async def get_session(session_id: str) -> dict | None:
    sb = get_supabase()
    result = sb.table("cases").select("*").eq("session_id", session_id).execute()
    return result.data[0] if result.data else None
