from fastapi import APIRouter
from pydantic import BaseModel
from groq import Groq
from app.config import GROQ_API_KEY, GROQ_MODEL

router = APIRouter(prefix="/api", tags=["detect"])

_LANGUAGE_MAP = {
    "hindi": "hi", "bengali": "bn", "telugu": "te", "marathi": "mr",
    "tamil": "ta", "gujarati": "gu", "kannada": "kn", "malayalam": "ml",
    "punjabi": "pa", "odia": "or", "urdu": "ur", "assamese": "as",
    "maithili": "mai", "santali": "sat", "kashmiri": "ks", "nepali": "ne",
    "sindhi": "sd", "konkani": "kok", "dogri": "doi", "manipuri": "mni",
    "bodo": "brx", "sanskrit": "sa", "english": "en",
}


class DetectRequest(BaseModel):
    text: str


class DetectResponse(BaseModel):
    language: str
    label: str


@router.post("/detect-language", response_model=DetectResponse)
async def detect_language(req: DetectRequest):
    labels = {v: k for k, v in _LANGUAGE_MAP.items()}
    if not GROQ_API_KEY:
        return DetectResponse(language="hi", label=labels.get("hi", "Hindi"))

    client = Groq(api_key=GROQ_API_KEY)
    try:
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "Identify the language of the given text. Reply ONLY with the language name in lowercase English. Examples: 'hindi', 'marathi', 'bengali', 'tamil', 'english'."},
                {"role": "user", "content": req.text},
            ],
            max_tokens=20,
            temperature=0,
        )
        detected = resp.choices[0].message.content.strip().lower().rstrip(".")
        code = _LANGUAGE_MAP.get(detected, "hi")
        return DetectResponse(language=code, label=labels.get(code, "Hindi"))
    except Exception:
        return DetectResponse(language="hi", label=labels.get("hi", "Hindi"))
