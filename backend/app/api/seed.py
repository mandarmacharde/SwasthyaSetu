from datetime import datetime, timedelta, timezone
from fastapi import APIRouter
import bcrypt

from app.supabase_client import get_supabase

router = APIRouter(prefix="/api/seed", tags=["seed"])

DEMO_CASES = [
    {
        "session_id": "demo-emergency",
        "urgency": "emergency",
        "possible_category": "Other",
        "status": "open",
        "language": "mr",
        "triage_summary": '{"urgency":"emergency","possible_category":"Other","next_question":"","enough_info":true}',
        "transcript": '[{"role":"user","content":"माझ्या मुलाला झटके येत आहेत","timestamp":"2026-07-15T10:00:00"}]',
        "callback_number": "+919876543210",
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
    },
    {
        "session_id": "demo-fever",
        "urgency": "medium",
        "possible_category": "Fever",
        "status": "assigned",
        "language": "hi",
        "triage_summary": '{"urgency":"medium","possible_category":"Fever","next_question":"","enough_info":true}',
        "transcript": '[{"role":"user","content":"मेरे बच्चे को बुखार है"},{"role":"assistant","content":"बुखार कितने दिनों से है?"},{"role":"user","content":"दो दिन से"}]',
        "callback_number": "+919876543211",
        "assigned_to": 1,
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
    },
    {
        "session_id": "demo-injury",
        "urgency": "low",
        "possible_category": "Injury",
        "status": "visited",
        "language": "en",
        "triage_summary": '{"urgency":"low","possible_category":"Injury","next_question":"","enough_info":true}',
        "transcript": '[{"role":"user","content":"I have a small cut on my hand"},{"role":"assistant","content":"Is it bleeding heavily?"},{"role":"user","content":"No, just a little"}]',
        "callback_number": "+919876543212",
        "assigned_to": 1,
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat(),
    },
    {
        "session_id": "demo-respiratory",
        "urgency": "high",
        "possible_category": "Respiratory",
        "status": "open",
        "language": "mr",
        "triage_summary": '{"urgency":"high","possible_category":"Respiratory","next_question":"","enough_info":true}',
        "transcript": '[{"role":"user","content":"मला खोकला आहे आणि ताप आहे"},{"role":"assistant","content":"श्वास घेण्यास त्रास होतो का?"},{"role":"user","content":"हो, थोडा"}]',
        "callback_number": "+919876543213",
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat(),
    },
]


@router.post("/demo")
async def seed_demo_data():
    sb = get_supabase()

    existing = sb.table("cases").select("*").eq("session_id", "demo-emergency").execute()
    if existing.data:
        return {"message": "Demo data already seeded"}

    hc = sb.table("health_centers").insert({
        "name": "PHC Andheri",
        "district": "Mumbai",
        "pincode": "400093",
        "phone": "+912226850000",
    }).execute()
    hc_id = hc.data[0]["id"]

    pw_hash = bcrypt.hashpw(b"asha123", bcrypt.gensalt()).decode()
    users_data = [
        {"name": "Anita Sharma", "phone": "+919000000001", "role": "asha", "district": "Mumbai", "health_center_id": hc_id, "password_hash": pw_hash},
        {"name": "Dr. Rajesh Kumar", "phone": "+919000000002", "role": "doctor", "district": "Mumbai", "health_center_id": hc_id, "password_hash": bcrypt.hashpw(b"doctor123", bcrypt.gensalt()).decode()},
        {"name": "Priya Verma", "phone": "+919000000003", "role": "asha", "district": "Thane", "health_center_id": hc_id, "password_hash": bcrypt.hashpw(b"asha123", bcrypt.gensalt()).decode()},
    ]
    user_ids = []
    for u in users_data:
        result = sb.table("users").insert(u).execute()
        user_ids.append(result.data[0]["id"])

    patient = sb.table("patients").insert({
        "phone": "+919876543210",
        "name": "Demo Patient",
        "language": "mr",
        "district": "Mumbai",
        "abha_id": "ABHA-XXXX-1234",
    }).execute()
    patient_id = patient.data[0]["id"]

    for dc in DEMO_CASES:
        case_data = {
            "session_id": dc["session_id"],
            "patient_id": patient_id,
            "assigned_to": dc.get("assigned_to"),
            "urgency": dc["urgency"],
            "possible_category": dc["possible_category"],
            "status": dc["status"],
            "language": dc["language"],
            "triage_summary": dc["triage_summary"],
            "transcript": dc["transcript"],
            "callback_number": dc["callback_number"],
            "created_at": dc["created_at"],
            "updated_at": dc["created_at"],
        }
        sb.table("cases").insert(case_data).execute()

    return {"message": "Demo data seeded", "cases": len(DEMO_CASES), "users": len(users_data), "patients": 1}


@router.get("/status")
async def seed_status():
    sb = get_supabase()
    cases = sb.table("cases").select("*", count="exact").execute()
    users = sb.table("users").select("*", count="exact").execute()
    patients = sb.table("patients").select("*", count="exact").execute()
    return {
        "cases": len(cases.data),
        "users": len(users.data),
        "patients": len(patients.data),
    }
