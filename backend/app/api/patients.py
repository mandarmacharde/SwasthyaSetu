from fastapi import APIRouter, HTTPException

from app.supabase_client import get_supabase

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("/")
async def list_patients(search: str | None = None):
    sb = get_supabase()
    query = sb.table("patients").select("*").order("created_at", desc=True)
    if search:
        query = query.or_(f"name.ilike.%{search}%,phone.ilike.%{search}%")
    result = query.execute()
    return result.data


@router.get("/{patient_id}")
async def get_patient(patient_id: int):
    sb = get_supabase()
    result = sb.table("patients").select("*").eq("id", patient_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient = result.data[0]

    cases = sb.table("cases").select("*").eq("patient_id", patient_id).order("created_at", desc=True).execute()
    patient["cases"] = cases.data

    return patient
