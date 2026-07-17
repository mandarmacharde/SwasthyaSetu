from fastapi import APIRouter

from app.supabase_client import get_supabase

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/")
async def list_users():
    sb = get_supabase()
    result = sb.table("users").select("*").execute()
    return result.data
