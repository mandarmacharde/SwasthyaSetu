from app.services import stt, tts, triage_engine, session as sess


async def process_audio_turn(
    audio_bytes: bytes,
    session_id: str | None = None,
    language: str = "mr",
    phone: str = "",
) -> dict:
    if session_id is None:
        session_id = await sess.create_session(language, phone)

    transcript = stt.transcribe(audio_bytes, language=language)
    if not transcript:
        return {"session_id": session_id, "error": "no speech detected"}

    await sess.add_turn(session_id, "user", transcript)
    history = await sess.get_history(session_id)

    result = triage_engine.triage(history, language=language)
    await sess.update_triage(session_id, result)

    reply_text = ""
    reply_audio = b""
    if result.get("next_question"):
        reply_text = result["next_question"]
        try:
            reply_audio = await tts.synthesize(reply_text, language=language)
        except Exception:
            reply_audio = b""
        await sess.add_turn(session_id, "assistant", reply_text)

    return {
        "session_id": session_id,
        "transcript": transcript,
        "triage": result,
        "reply_text": reply_text,
        "reply_audio": reply_audio,
        "complete": result.get("enough_info", False),
    }


async def process_text_turn(
    text: str,
    session_id: str | None = None,
    language: str = "mr",
) -> dict:
    if session_id is None:
        session_id = await sess.create_session(language)

    await sess.add_turn(session_id, "user", text)
    history = await sess.get_history(session_id)

    result = triage_engine.triage(history, language=language)
    await sess.update_triage(session_id, result)

    reply_text = ""
    reply_audio = b""
    if result.get("next_question"):
        reply_text = result["next_question"]
        try:
            reply_audio = await tts.synthesize(reply_text, language=language)
        except Exception:
            reply_audio = b""
        await sess.add_turn(session_id, "assistant", reply_text)

    return {
        "session_id": session_id,
        "transcript": text,
        "triage": result,
        "reply_text": reply_text,
        "reply_audio": reply_audio,
        "complete": result.get("enough_info", False),
    }
