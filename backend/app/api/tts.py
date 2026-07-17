from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.tts import synthesize

router = APIRouter(prefix="/api/tts", tags=["tts"])


class TtsRequest(BaseModel):
    text: str
    language: str = "mr"


@router.post("")
async def tts_endpoint(req: TtsRequest):
    audio = await synthesize(req.text, req.language)
    return Response(content=audio, media_type="audio/mp3")
