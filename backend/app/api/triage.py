from fastapi import APIRouter, UploadFile, File, Form, Depends
from pydantic import BaseModel
import base64

from app.services.pipeline import process_audio_turn, process_text_turn

router = APIRouter(prefix="/api", tags=["triage"])


class TurnRequest(BaseModel):
    text: str
    session_id: str | None = None
    language: str = "mr"


class TurnResponse(BaseModel):
    session_id: str
    transcript: str
    urgency: str
    possible_category: str
    next_question: str
    complete: bool


@router.post("/triage", response_model=TurnResponse)
async def triage_endpoint(req: TurnRequest):
    result = await process_text_turn(req.text, req.session_id, req.language)
    return TurnResponse(
        session_id=result["session_id"],
        transcript=result["transcript"],
        urgency=result["triage"]["urgency"],
        possible_category=result["triage"]["possible_category"],
        next_question=result["reply_text"],
        complete=result["complete"],
    )


@router.post("/audio-triage")
async def audio_triage_endpoint(
    audio: UploadFile = File(...),
    session_id: str | None = Form(None),
    language: str = Form("mr"),
):
    audio_bytes = await audio.read()
    result = await process_audio_turn(audio_bytes, session_id, language)
    
    reply_audio_base64 = None
    if result.get("reply_audio"):
        reply_audio_base64 = base64.b64encode(result["reply_audio"]).decode("utf-8")

    return {
        "session_id": result["session_id"],
        "transcript": result.get("transcript", ""),
        "urgency": result.get("triage", {}).get("urgency", ""),
        "possible_category": result.get("triage", {}).get("possible_category", ""),
        "next_question": result.get("reply_text", ""),
        "reply_audio_base64": reply_audio_base64,
        "complete": result.get("complete", False),
        "error": result.get("error"),
    }
