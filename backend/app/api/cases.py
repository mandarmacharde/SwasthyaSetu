from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone

from app.supabase_client import get_supabase

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("/")
async def list_cases(
    status: str | None = None,
    urgency: str | None = None,
    assigned_to: int | None = None,
):
    sb = get_supabase()
    query = sb.table("cases").select("*").order("created_at", desc=True)
    if status:
        statuses = [s.strip() for s in status.split(",")]
        filters = ",".join(f"status.eq.{s}" for s in statuses)
        query = query.or_(filters)
    if urgency:
        query = query.eq("urgency", urgency)
    if assigned_to is not None:
        query = query.eq("assigned_to", assigned_to)
    result = query.execute()
    return result.data


@router.get("/{case_id}")
async def get_case(case_id: int):
    sb = get_supabase()
    result = sb.table("cases").select("*").eq("id", case_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Case not found")
    return result.data[0]


class CaseUpdate(BaseModel):
    status: str | None = None
    assigned_to: int | None = None


@router.patch("/{case_id}")
async def update_case(case_id: int, update: CaseUpdate):
    sb = get_supabase()
    existing = sb.table("cases").select("*").eq("id", case_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Case not found")

    payload: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if update.status is not None:
        if update.status not in ("open", "assigned", "visited", "closed"):
            raise HTTPException(status_code=400, detail=f"Invalid status: {update.status}")
        payload["status"] = update.status
    if update.assigned_to is not None:
        payload["assigned_to"] = update.assigned_to

    result = sb.table("cases").update(payload).eq("id", case_id).execute()
    return result.data[0]
