import json
import os
from groq import Groq

from app.config import GROQ_API_KEY, GROQ_MODEL

_FORCE_MOCK = os.getenv("MOCK_TRIAGE", "").lower() in ("1", "true", "yes")

SYSTEM_PROMPT = """You are a medical triage assistant for rural India. You follow the WHO first-contact protocol.

## CRITICAL RULES
1. **NEVER diagnose.** Never name a specific disease. Only classify urgency.
2. **Ask one question at a time.** Never list multiple questions.
3. **Ask in the same language the patient is speaking.**
4. **Output ONLY valid JSON.** No markdown, no explanation.

## RED FLAGS — classify as "emergency" immediately
- Unconscious / not responding
- Not breathing / difficulty breathing
- Severe bleeding
- Convulsions / seizures / fits
- Severe chest pain
- Poisoning / overdose
- Severe burn
- Drowning / near drowning

## URGENCY CLASSES
- **low**: Minor symptoms, no red flags. Can wait for PHC visit.
- **medium**: Needs attention within 24h. Notify ASHA worker.
- **emergency**: Red flag present or suspected. Call 108 immediately.

## OUTPUT FORMAT
{"urgency":"low|medium|emergency","possible_category":"Fever|Diarrhea|Injury|Respiratory|Maternal|Other","next_question":"question in patient's language","enough_info":true|false}

Set enough_info=true only when you have enough info to classify urgency. Always ask 2-3 questions first unless a red flag is detected."""


def _extract_json(text: str) -> dict | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    import re
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


_LANGUAGE_NAMES = {
    "hi": "Hindi", "bn": "Bengali", "te": "Telugu", "mr": "Marathi",
    "ta": "Tamil", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam",
    "pa": "Punjabi", "or": "Odia", "ur": "Urdu", "as": "Assamese",
    "mai": "Maithili", "sat": "Santali", "ks": "Kashmiri", "ne": "Nepali",
    "sd": "Sindhi", "kok": "Konkani", "doi": "Dogri", "mni": "Manipuri",
    "brx": "Bodo", "sa": "Sanskrit", "en": "English",
}

def triage(history: list[dict], language: str = "mr") -> dict:
    if not GROQ_API_KEY or _FORCE_MOCK:
        return _mock_triage(history, language)

    lang_name = _LANGUAGE_NAMES.get(language, "Marathi")
    system = SYSTEM_PROMPT + f"\n\nThe patient speaks {lang_name}. Always respond in {lang_name}."

    client = Groq(api_key=GROQ_API_KEY)
    messages = [{"role": "system", "content": system}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": "Reply ONLY with a JSON object."})

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            max_tokens=200,
            temperature=0.1,
        )
        content = response.choices[0].message.content
        parsed = _extract_json(content)
        if parsed:
            return parsed
        return _mock_triage(history, language)
    except Exception as e:
        print(f"Triage API Error: {e}")
        return _mock_triage(history, language)


def _mock_triage(history: list[dict], language: str = "mr") -> dict:
    user_msgs = [h["content"] for h in history if h["role"] == "user"]
    last = user_msgs[-1].lower() if user_msgs else ""

    red_flags_mr = ["झटके", "बेशुद्ध", "श्वास", "रक्तस्त्राव", "जप्ती"]
    red_flags_hi = ["झटके", "बेहोश", "सांस", "खून", "दौरे"]
    red_flags_en = ["convulsion", "seizure", "unconscious", "not breathing", "severe bleed", "fits", "poison"]
    if any(kw in last for kw in red_flags_mr + red_flags_hi + red_flags_en):
        return {"urgency": "emergency", "possible_category": "Other", "next_question": "", "enough_info": True}

    if len(user_msgs) < 2:
        questions = {
            "mr": "ताप किती दिवसांपासून आहे?",
            "hi": "बुखार कितने दिनों से है?",
            "en": "How long has the fever lasted?",
        }
        return {"urgency": "medium", "possible_category": "Fever", "next_question": questions.get(language, questions["en"]), "enough_info": False}
    return {"urgency": "medium", "possible_category": "Fever", "next_question": "", "enough_info": True}
