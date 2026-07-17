import json
import os
from groq import Groq

from app.config import GROQ_API_KEY, GROQ_MODEL

_FORCE_MOCK = os.getenv("MOCK_TRIAGE", "").lower() in ("1", "true", "yes")

SYSTEM_PROMPT = """You are a medical triage assistant following the WHO IMCI first-contact protocol for rural India.

## STRICT RULES
1. **NEVER diagnose.** Never name a specific disease.
2. **Ask ONE question at a time.** Never list multiple questions.
3. **Always respond in the patient's language.**
4. **Output ONLY valid JSON.** No markdown, no explanation.

## STEP 1 — DANGER SIGNS (check on first turn)
On the first turn, ask: "Are you unconscious or having convulsions? Can you drink? Are you vomiting everything?"
If ANY danger sign is confirmed → {"urgency":"emergency","possible_category":"Other","next_question":"","enough_info":true}

## STEP 2 — CLASSIFY AND FOLLOW QUESTION TEMPLATES
Determine the symptom category from the patient's first response. Then ask questions in THIS EXACT ORDER for that category. Skip questions the patient already answered.

### FEVER template:
1. "How many days has the fever lasted?"
2. "Is the fever very high? Can you measure the temperature?"
3. "Do you have a cough or runny nose?"
4. "Do you have body aches or joint pain?"
5. "Do you have a stiff neck?"
6. "Do you have a rash?"
→ If stiff neck or rash: HIGH urgency
→ If >7 days or very high: HIGH urgency
→ If 3-7 days: MEDIUM urgency
→ If <3 days with no other symptoms: LOW urgency

### RESPIRATORY template:
1. "Do you have a cough?"
2. "Do you have difficulty breathing?"
3. "Do you have chest pain or chest indrawing?"
4. "Do you have noisy breathing (wheezing or stridor)?"
5. "Can you drink fluids normally?"
→ If stridor at rest or chest indrawing: HIGH urgency
→ If difficulty breathing: MEDIUM urgency
→ If cough only: LOW urgency

### DIARRHEA template:
1. "How many days have you had diarrhea?"
2. "Is there blood in the stool?"
3. "Are you able to drink fluids?"
4. "Do you have sunken eyes?"
5. "Is your skin pinch going back slowly?"
6. "How many times have you had diarrhea today?"
→ If blood in stool + sunken eyes: HIGH urgency
→ If some dehydration signs: MEDIUM urgency
→ If no dehydration: LOW urgency

### INJURY template:
1. "How did the injury happen?"
2. "Is there severe bleeding?"
3. "Can you move the injured body part normally?"
4. "Is the wound deep?"
5. "Do you have a fever?"
→ If severe bleeding or can't move: EMERGENCY
→ If deep wound: MEDIUM urgency
→ If minor cut: LOW urgency

### MATERNAL template (pregnant women):
1. "How many months pregnant are you?"
2. "Do you have vaginal bleeding?"
3. "Do you have severe abdominal pain?"
4. "Do you have fits or convulsions?"
5. "Do you have severe headache or blurred vision?"
→ If any of these symptoms: HIGH urgency

### EAR template:
1. "Do you have ear pain?"
2. "Is there discharge from the ear?"
3. "For how long?"
4. "Do you have fever?"
→ If discharge with fever: MEDIUM urgency
→ If pain only: LOW urgency

## URGENCY CLASSES
- LOW: Minor symptoms. Can wait for PHC visit within 48h.
- MEDIUM: Needs attention within 24h. ASHA worker should visit.
- HIGH: Needs attention within 6h. PHC referral needed.
- EMERGENCY: Danger sign present. Call 108 immediately.

## OUTPUT FORMAT (strict JSON)
{"urgency":"low|medium|high|emergency","possible_category":"Fever|Respiratory|Diarrhea|Injury|Maternal|Ear|Other","next_question":"one question in patient's language","enough_info":true|false}

Set enough_info=true only after you have asked at least 2 questions and can classify urgency. If the patient's response is unclear, ask ONE clarifying question."""


def _extract_json(text: str) -> dict | None:
    import re
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
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

_QUESTION_COUNT_MAP = {
    "Fever": 6, "Respiratory": 5, "Diarrhea": 6, "Injury": 5, "Maternal": 5, "Ear": 4, "Other": 2,
}

_DANGER_SIGNS_MR = ["बेशुद्ध", "झटके", "जप्ती", "श्वास घेऊ शकत नाही", "काहीही पिऊ शकत नाही", "सगळं उलटी करतो", "घरघर"]
_DANGER_SIGNS_HI = ["बेहोश", "दौरे", "सांस नहीं", "पी नहीं पाता", "सब उल्टी", "घरघर"]
_DANGER_SIGNS_EN = ["unconscious", "convulsion", "seizure", "not breathing", "can't drink", "vomiting everything", "stridor"]


def triage(history: list[dict], language: str = "mr") -> dict:
    if not GROQ_API_KEY or _FORCE_MOCK:
        return _mock_triage(history, language)

    lang_name = _LANGUAGE_NAMES.get(language, "Marathi")
    system = SYSTEM_PROMPT + f"\n\nThe patient speaks {lang_name}. Always respond in {lang_name}."

    client = Groq(api_key=GROQ_API_KEY)
    messages = [{"role": "system", "content": system}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    user_count = sum(1 for m in history if m["role"] == "user")
    if user_count >= 6:
        messages.append({"role": "user", "content": "I have asked enough questions. Set enough_info=true and classify the urgency now."})
    else:
        messages.append({"role": "user", "content": "Reply ONLY with a single valid JSON object. Follow the question template."})

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

    all_danger = _DANGER_SIGNS_MR + _DANGER_SIGNS_HI + _DANGER_SIGNS_EN
    if any(kw in last for kw in all_danger):
        return {"urgency": "emergency", "possible_category": "Other", "next_question": "", "enough_info": True}

    n = len(user_msgs)
    if n == 1:
        qs = {"mr": "ताप किती दिवसांपासून आहे?", "hi": "बुखार कितने दिनों से है?", "en": "How many days has the fever lasted?"}
        return {"urgency": "low", "possible_category": "Fever", "next_question": qs.get(language, qs["en"]), "enough_info": False}
    if n == 2:
        qs = {"mr": "ताप खूप तीव्र आहे का?", "hi": "बुखार बहुत तेज है?", "en": "Is the fever very high?"}
        return {"urgency": "medium", "possible_category": "Fever", "next_question": qs.get(language, qs["en"]), "enough_info": False}
    if n == 3:
        qs = {"mr": "खोकला किंवा सर्दी आहे का?", "hi": "खांसी या नाक बह रहा है?", "en": "Do you have a cough or runny nose?"}
        return {"urgency": "medium", "possible_category": "Fever", "next_question": qs.get(language, qs["en"]), "enough_info": False}
    return {"urgency": "medium", "possible_category": "Fever", "next_question": "", "enough_info": True}
