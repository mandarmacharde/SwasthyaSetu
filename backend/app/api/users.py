from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.supabase_client import get_supabase

router = APIRouter(prefix="/api/users", tags=["users"])


class CreateUserRequest(BaseModel):
    name: str
    phone: str
    role: str
    district: str = ""


@router.get("/")
async def list_users():
    sb = get_supabase()
    result = sb.table("users").select("*").execute()
    return result.data


@router.post("/create")
async def create_user(req: CreateUserRequest):
    if req.role not in ("asha", "doctor"):
        raise HTTPException(status_code=400, detail="Role must be asha or doctor")
    hc = sb.table("health_centers").select("*").limit(1).execute()
    hc_id = hc.data[0]["id"] if hc.data else None
    sb = get_supabase()
    result = sb.table("users").insert({
        "name": req.name,
        "phone": req.phone,
        "role": req.role,
        "district": req.district,
        "health_center_id": hc_id,
        "password_hash": "",
    }).execute()
    return {"message": "User created", "user": result.data[0]}
