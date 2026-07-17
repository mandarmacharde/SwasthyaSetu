import io
import edge_tts

VOICE_MAP = {
    "mr": "mr-IN-AarohiNeural",
    "hi": "hi-IN-SwaraNeural",
    "en": "en-IN-NeerjaNeural",
}


async def synthesize(text: str, language: str = "mr") -> bytes:
    voice = VOICE_MAP.get(language, "mr-IN-AarohiNeural")
    communicate = edge_tts.Communicate(text, voice)
    audio_bytes = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes.write(chunk["data"])
    return audio_bytes.getvalue()
