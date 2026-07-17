import json
import os
from groq import Groq

from app.config import GROQ_API_KEY, GROQ_MODEL

_FORCE_MOCK = os.getenv("MOCK_TRIAGE", "").lower() in ("1", "true", "yes")

SYSTEM_PROMPT = """You are a medical triage assistant following the WHO ICTRC (Integrated Clinical Triage and Referral) first-contact protocol for rural India.

## MANDATORY RULES
1. **NEVER diagnose.** Never name a specific disease. Only classify urgency and category.
2. **Ask ONE question at a time.** Never list multiple questions in one turn.
3. **Always respond in the patient's language.** Mirror their language exactly.
4. **Output ONLY valid JSON.** No markdown, no explanation, no greetings.

## STEP 1 — CHECK GENERAL DANGER SIGNS (ask first, always)
On the very first turn, ask about these danger signs one at a time:
- Is the patient unconscious or lethargic?
- Is the patient having convulsions/seizures right now?
- Is the patient able to drink or breastfeed?
- Is the patient vomiting everything?
- Does the patient have stridor (noisy breathing when calm)?

If ANY danger sign is confirmed → urgency="emergency", enough_info=true, stop.

## STEP 2 — CLASSIFY MAIN SYMPTOM
Ask about one symptom at a time. Follow this decision tree:

### If cough / difficulty breathing:
- Does the child have cough or difficult breathing? (yes/no)
- If yes: Can the child drink? Is there chest indrawing? Stridor when calm?
  → Chest indrawing + stridor = "Respiratory" + emergency
  → Chest indrawing only = "Respiratory" + high
  → Fast breathing only = "Respiratory" + medium
  → No signs = "Respiratory" + low

### If diarrhea:
- How many days? Is there blood in stool? Is the patient thirsty?
- Are eyes sunken? Skin pinch goes back slowly?
  → Blood in stool + sunken eyes = "Diarrhea" + emergency
  → Sunken eyes or slow skin pinch = "Diarrhea" + high
  → Thirsty + some signs = "Diarrhea" + medium
  → No dehydration signs = "Diarrhea" + low

### If fever:
- How many days has the fever lasted?
- Does the child have stiff neck? Runny nose? Cough? Rash?
- Is the fever very high (difficult to control)?
  → Stiff neck or petechial rash = "Fever" + emergency
  → Fever >7 days or very high = "Fever" + high
  → Fever 3-7 days = "Fever" + medium
  → Fever <3 days, no other signs = "Fever" + low

### If ear problem:
- Is there ear pain? Ear discharge? For how long?
  → Swelling behind ear (mastoiditis) = "Ear" + emergency
  → Purulent discharge <2 weeks = "Ear" + medium
  → Discharge >2 weeks = "Ear" + low
  → Ear pain only = "Ear" + low

### If injury / wound:
- Is there severe bleeding? Can the patient move normally?
- Is the wound deep? Any foreign object?
  → Severe bleeding or unable to move = "Injury" + emergency
  → Deep wound = "Injury" + medium
  → Minor cut/scratch = "Injury" + low

### If maternal (pregnant woman):
- Is there vaginal bleeding? Severe abdominal pain? Fits?
  → Any of these = "Maternal" + emergency

## URGENCY CLASSES
- LOW: Minor symptoms, no danger signs. Patient can wait for PHC visit within 48h.
- MEDIUM: Needs attention within 24h. ASHA worker should visit.
- HIGH: Needs attention within 6h. ASHA worker visits within 2h. Prepare for PHC referral.
- EMERGENCY: Danger sign present. Call 108 / ambulance immediately.

## CATEGORY OPTIONS
"Fever" | "Respiratory" | "Diarrhea" | "Ear" | "Injury" | "Maternal" | "Other"

## OUTPUT FORMAT (strict JSON only)
{"urgency":"low|medium|high|emergency","possible_category":"Fever|Respiratory|Diarrhea|Ear|Injury|Maternal|Other","next_question":"one question in patient's language","enough_info":true|false}

Set enough_info=true only when you have classified urgency. Always ask 2-3 questions first unless a danger sign is confirmed."""


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


_DANGER_SIGN_KEYWORDS_MR = ["बेशुद्ध", "झटके", "जप्ती", "श्वास घेऊ शकत नाही", "काहीही पिऊ शकत नाही", "सगळं उलटी करतो", "घरघर"]
_DANGER_SIGN_KEYWORDS_HI = ["बेहोश", "दौरे", "सांस नहीं ले पा", "कुछ नहीं पी पाता", "सब उल्टी कर देता", "घरघर"]
_DANGER_SIGN_KEYWORDS_EN = ["unconscious", "convulsion", "seizure", "not breathing", "can't drink", "vomiting everything", "stridor"]


def triage(history: list[dict], language: str = "mr") -> dict:
    if not GROQ_API_KEY or _FORCE_MOCK:
        return _mock_triage(history, language)

    lang_name = _LANGUAGE_NAMES.get(language, "Marathi")
    system = SYSTEM_PROMPT + f"\n\nThe patient speaks {lang_name}. Always respond in {lang_name}."

    client = Groq(api_key=GROQ_API_KEY)
    messages = [{"role": "system", "content": system}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": "Reply ONLY with a valid JSON object."})

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            max_tokens=250,
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

    all_danger_kw = _DANGER_SIGN_KEYWORDS_MR + _DANGER_SIGN_KEYWORDS_HI + _DANGER_SIGN_KEYWORDS_EN
    if any(kw in last for kw in all_danger_kw):
        return {"urgency": "emergency", "possible_category": "Other", "next_question": "", "enough_info": True}

    n = len(user_msgs)
    if n == 1:
        qs = {"mr": "ताप किती दिवसांपासून आहे का?", "hi": "बुखार कितने दिनों से है?", "en": "How many days has the fever lasted?"}
        return {"urgency": "low", "possible_category": "Fever", "next_question": qs.get(language, qs["en"]), "enough_info": False}
    if n == 2:
        qs = {"mr": "खोकला आहे का? श्वास घेण्यास त्रास होतो का?", "hi": "खांसी है? सांस लेने में तकलीफ है?", "en": "Is there a cough or difficulty breathing?"}
        return {"urgency": "low", "possible_category": "Fever", "next_question": qs.get(language, qs["en"]), "enough_info": False}
    if n == 3:
        qs = {"mr": "जुलाब आहे का?", "hi": "दस्त है?", "en": "Is there diarrhea?"}
        return {"urgency": "medium", "possible_category": "Fever", "next_question": qs.get(language, qs["en"]), "enough_info": False}
    return {"urgency": "medium", "possible_category": "Fever", "next_question": "", "enough_info": True}
