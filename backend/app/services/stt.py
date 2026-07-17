import tempfile
from pathlib import Path
from faster_whisper import WhisperModel

from app.config import WHISPER_MODEL_SIZE

_model = None

SCRIPT_HINTS = {
    "mr": "मराठी भाषेत लिहा",
    "hi": "हिंदी भाषा में लिखें",
    "en": "Write in English",
}

def _get_model():
    global _model
    if _model is None:
        _model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
    return _model

def _transcribe(path: str, language: str | None) -> str:
    model = _get_model()
    hint = SCRIPT_HINTS.get(language, "")
    segments, _ = model.transcribe(path, language=language, beam_size=5, initial_prompt=hint)
    return " ".join(seg.text for seg in segments).strip()

import io

def transcribe(audio_bytes: bytes, language: str | None = "mr") -> str:
    if not audio_bytes or len(audio_bytes) < 100:
        return ""
    try:
        return _transcribe(io.BytesIO(audio_bytes), language)
    except Exception as e:
        print(f"STT Error during transcription: {e}")
        return ""


