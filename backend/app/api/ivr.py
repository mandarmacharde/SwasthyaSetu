import hashlib
import os
import tempfile
import time
from pathlib import Path
from urllib.request import urlopen

from fastapi import APIRouter, Request, Form
from fastapi.responses import Response

from app.services.stt import transcribe
from app.services.triage_engine import triage
from app.services.tts import synthesize

router = APIRouter(prefix="/api/ivr", tags=["ivr"])

AUDIO_DIR = Path(tempfile.gettempdir()) / "ss_ivr"
AUDIO_DIR.mkdir(exist_ok=True)

sessions: dict[str, dict] = {}

LANG_MAP = {"1": "hi", "2": "mr", "3": "en", "4": "ta", "5": "bn", "6": "gu"}
LANG_VOICE = {
    "1": "hi-IN", "2": "mr-IN", "3": "en-IN", "4": "ta-IN", "5": "bn-IN", "6": "gu-IN",
}
LANG_MENU = (
    "<Say voice='Polly.Kajal'>"
    "Press 1 for Hindi. 2 for Marathi. 3 for English. 4 for Tamil. 5 for Bengali. 6 for Gujarati."
    "</Say>"
)
GREETINGS = {
    "hi": "नमस्ते, स्वास्थ्यसेतु में आपका स्वागत है। कृपया अपनी समस्या बताएं।",
    "mr": "नमस्कार, स्वास्थ्यसेतुमध्ये आपले स्वागत आहे. कृपया आपली समस्या सांगा.",
    "en": "Hello, welcome to SwasthyaSetu. Please describe your problem.",
    "ta": "வணக்கம், ஸ்வஸ்த்யசேதுவுக்கு வரவேற்கிறோம். உங்கள் பிரச்சினையைச் சொல்லுங்கள்.",
    "bn": "নমস্কার, স্বাস্থ্যসেতুতে আপনাকে স্বাগত। আপনার সমস্যা বলুন।",
    "gu": "નમસ્તે, સ્વાસ્થ્યસેતુમાં તમારું સ્વાગત છે. કૃપા કરીને તમારી સમસ્યા જણાવો.",
}
FINAL_MSGS = {
    "hi": "आपका मामला दर्ज कर लिया गया है। एक आशा कार्यकर्ता जल्द ही आपसे संपर्क करेगी। धन्यवाद।",
    "mr": "तुमचा केस नोंदवला गेला आहे. एक आशा कार्यकर्ता लवकरच तुमच्याशी संपर्क करेल. धन्यवाद.",
    "en": "Your case has been recorded. An ASHA worker will contact you soon. Thank you.",
    "ta": "உங்கள் வழக்கு பதிவு செய்யப்பட்டுள்ளது. ஒரு ஆஷா பணியாளர் விரைவில் உங்களை தொடர்புகொள்வார். நன்றி.",
    "bn": "আপনার কেস রেকর্ড করা হয়েছে। একজন আশা কর্মী শীঘ্রই আপনার সাথে যোগাযোগ করবেন। ধন্যবাদ।",
    "gu": "તમારો કેસ રેકોર્ડ થઈ ગયો છે. એક આશા કાર્યકર્તા ટૂંક સમયમાં તમારો સંપર્ક કરશે. આભાર.",
}
RETRY = (
    "<Say>I could not hear you. Please speak after the beep.</Say>"
    '<Record action="/api/ivr/recording" method="POST" maxLength="15" />'
)


def _respond(body: str) -> Response:
    return Response(
        content=f'<?xml version="1.0" encoding="UTF-8"?><Response>{body}</Response>',
        media_type="application/xml",
    )


async def _save_and_url(text: str, lang: str) -> str:
    key = hashlib.md5(f"{text}:{lang}".encode()).hexdigest()[:12]
    path = AUDIO_DIR / f"{key}.mp3"
    if not path.exists():
        raw = await synthesize(text, lang)
        path.write_bytes(raw)
    return f"/api/ivr/audio/{key}.mp3"


@router.get("/audio/{name}")
async def serve_audio(name: str):
    path = AUDIO_DIR / name
    if not path.exists():
        return Response(status_code=404)
    return Response(content=path.read_bytes(), media_type="audio/mpeg")


@router.post("/voice")
async def ivr_voice(CallSid: str = Form(""), **kw):
    sessions.pop(CallSid, None)
    return _respond(
        f'<Gather numDigits="1" action="/api/ivr/language" method="POST">{LANG_MENU}</Gather>'
    )


@router.post("/language")
async def ivr_language(CallSid: str = Form(""), Digits: str = Form("1"), **kw):
    lang = LANG_MAP.get(Digits, "hi")
    sessions[CallSid] = {"lang": lang, "history": [], "turns": 0}
    greeting = GREETINGS.get(lang, GREETINGS["hi"])
    url = await _save_and_url(greeting, lang)
    return _respond(
        f'<Play>{url}</Play>'
        f'<Record action="/api/ivr/recording" method="POST" maxLength="15" />'
    )


@router.post("/recording")
async def ivr_recording(
    CallSid: str = Form(""),
    RecordingUrl: str = Form(""),
    From: str = Form(""),
    **kw,
):
    session = sessions.get(CallSid, {"lang": "hi", "history": [], "turns": 0})
    lang = session["lang"]

    if not RecordingUrl:
        return _respond(RETRY)

    audio_url = RecordingUrl.replace("http://", "https://")
    if not audio_url.endswith(".mp3"):
        audio_url += ".mp3"

    try:
        with urlopen(audio_url, timeout=15) as resp:
            audio_bytes = resp.read()
    except Exception:
        return _respond(RETRY)

    transcript = transcribe(audio_bytes, language=lang)
    if not transcript:
        return _respond(RETRY)

    session["history"].append({"role": "user", "content": transcript})
    session["turns"] += 1

    result = triage(session["history"], lang)
    session["history"].append({"role": "assistant", "content": result.get("next_question", "")})

    if result.get("enough_info"):
        urgency = result.get("urgency", "medium")
        msg = FINAL_MSGS.get(lang, FINAL_MSGS["en"])
        if urgency == "emergency":
            msg = "This is an emergency. Please call 108 immediately. " + msg
        url = await _save_and_url(msg, lang)

        try:
            from app.supabase_client import get_supabase

            sb = get_supabase()
            sid = hashlib.md5(CallSid.encode()).hexdigest()[:12]
            sb.table("cases").insert({
                "session_id": sid,
                "urgency": urgency,
                "possible_category": result.get("possible_category", "Other"),
                "status": "open",
                "language": lang,
                "transcript": str(session["history"]),
                "triage_summary": str(result),
                "callback_number": From,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }).execute()
        except Exception:
            pass

        sessions.pop(CallSid, None)
        return _respond(f"<Play>{url}</Play><Hangup />")

    question = result.get("next_question")
    if not question:
        question = {"hi": "कृपया और बताएं।", "mr": "कृपया अधिक सांगा.", "en": "Please tell me more."}.get(lang, "Please tell me more.")

    url = await _save_and_url(question, lang)
    return _respond(
        f"<Play>{url}</Play>"
        f'<Record action="/api/ivr/recording" method="POST" maxLength="15" />'
    )
