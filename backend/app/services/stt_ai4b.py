"""STT router — selects backend via STT_BACKEND env var.

pipeline
      ↓
stt_ai4b.transcribe()
      ↓
select_backend()
      ├── FasterWhisperBackend    ← active (default)
      ├── AI4BharatBackend        ← placeholder
      └── BHASHINIBackend         ← placeholder
"""

import io
import os
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


# ── Abstract base ──────────────────────────────────────────────────

class STTBackend(ABC):
    @abstractmethod
    def transcribe(self, audio_bytes: bytes, language: str | None) -> str:
        ...


# ── Active backend: faster-whisper ─────────────────────────────────

class FasterWhisperBackend(STTBackend):
    _model = None

    def transcribe(self, audio_bytes: bytes, language: str | None) -> str:
        try:
            model = self._get_model()
            hints = {
                "mr": "मराठी भाषेत लिहा",
                "hi": "हिंदी भाषा में लिखें",
                "en": "Write in English",
            }
            hint = hints.get(language, "")
            segments, _ = model.transcribe(
                io.BytesIO(audio_bytes),
                language=language,
                beam_size=5,
                initial_prompt=hint,
            )
            return " ".join(seg.text for seg in segments).strip()
        except Exception as e:
            logger.error("Whisper STT error: %s", e)
            return ""

    def _get_model(self):
        if self._model is None:
            from faster_whisper import WhisperModel
            from app.config import WHISPER_MODEL_SIZE
            self.__class__._model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
        return self._model


# ── Placeholder: AI4Bharat HF models ───────────────────────────────

class AI4BharatBackend(STTBackend):
    """Requires STT_BACKEND=ai4bharat and optionally HF_TOKEN in .env.

    Models:
      ai4bharat/indicconformer_stt_hi_hybrid_ctc_rnnt_large  (gated, needs HF token)
      onnx-community/indicwav2vec-hindi-ONNX                 (open)
    """
    def transcribe(self, audio_bytes: bytes, language: str | None) -> str:
        logger.info("AI4BharatBackend not wired — falling through")
        return FasterWhisperBackend().transcribe(audio_bytes, language)


# ── Placeholder: BHASHINI ULCA API ─────────────────────────────────

class BHASHINIBackend(STTBackend):
    """Requires STT_BACKEND=ai4bharat plus BHASHINI_USER_ID & BHASHINI_API_KEY in .env.

    API: POST https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline
    """
    def transcribe(self, audio_bytes: bytes, language: str | None) -> str:
        logger.info("BHASHINIBackend not wired — falling through")
        return FasterWhisperBackend().transcribe(audio_bytes, language)


# ── Backend selector ──────────────────────────────────────────────

_BACKENDS = {
    "whisper":    FasterWhisperBackend,
    "ai4bharat":  AI4BharatBackend,
    "bhashini":   BHASHINIBackend,
}

_active_backend: STTBackend | None = None

def select_backend(name: str | None = None) -> STTBackend:
    global _active_backend
    if _active_backend is not None:
        return _active_backend
    name = name or os.getenv("STT_BACKEND", "whisper").lower()
    cls = _BACKENDS.get(name)
    if cls is None:
        logger.warning("Unknown STT backend '%s', using whisper", name)
        cls = FasterWhisperBackend
    _active_backend = cls()
    return _active_backend


# ── Public API (same signature as stt.py) ─────────────────────────

def transcribe(audio_bytes: bytes, language: str | None = "mr") -> str:
    if not audio_bytes or len(audio_bytes) < 100:
        return ""
    return select_backend().transcribe(audio_bytes, language)
