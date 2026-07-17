"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { URGENCY_COLORS } from "@/lib/theme";
import { LANGUAGES, LANGUAGE_PROMPTS, speechLangMap } from "@/lib/languages";

type PageStep = "language" | "call" | "result";

const RED_FLAG_KEYWORDS = [
  "convulsion", "seizure", "unconscious", "not breathing",
  "severe bleed", "poison", "drowning", "chest pain",
  "झटके", "बेशुद्ध", "श्वास", "रक्तस्त्राव", "जप्ती",
  "दौरे", "बेहोश", "सांस", "खून", "छातीत दुखणे",
];

function CallTimer() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return <span className="font-mono tabular-nums">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>;
}

export default function DemoCallPage() {
  const [pageStep, setPageStep] = useState<PageStep>("language");
  const [language, setLanguage] = useState("mr");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [conversation, setConversation] = useState<{ role: string; text: string }[]>([]);
  const [micError, setMicError] = useState("");
  const [typingText, setTypingText] = useState("");

  const [status, setStatus] = useState("");

  const sessionIdRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mountedRef = useRef(true);
  const languageRef = useRef(language);
  const isCompleteRef = useRef(false);
  const isRecordingRef = useRef(false);
  const turnRef = useRef(0);

  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const isRedFlag = (text: string) =>
    RED_FLAG_KEYWORDS.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));

  const playAudioFromBase64 = useCallback((base64: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "audio/mp3" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());
      } catch { resolve(); }
    });
  }, []);

  const startRecording = useCallback(() => {
    if (!mountedRef.current || isRecordingRef.current) return;
    setMicError("");
    setStatus("Recording...");

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        chunksRef.current = [];
        isRecordingRef.current = true;

        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus" : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType: mime });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          isRecordingRef.current = false;
          if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
          if (!mountedRef.current || chunksRef.current.length === 0) { setStatus(""); return; }

          const blob = new Blob(chunksRef.current, { type: mime });
          setStatus("AI is thinking...");

          try {
            turnRef.current += 1;
            const result = await api.triage.audio(blob, sessionIdRef.current || undefined, languageRef.current);
            if (!mountedRef.current) return;

            if (result.error) {
              setMicError(result.error);
              setStatus("");
              return;
            }

            if (!sessionIdRef.current && result.session_id) {
              sessionIdRef.current = result.session_id;
              setSessionId(result.session_id);
            }

            const transcript = result.transcript || "";
            if (transcript) {
              setConversation(p => [...p, { role: "user", text: transcript }]);
            }

            isCompleteRef.current = result.complete;

            if (result.complete) {
              const urgency = result.urgency || "medium";
              const category = result.possible_category || "Other";
              setTriageResult({ urgency, possible_category: category });
              setConversation(p => [...p, { role: "assistant", text: `Assessment: ${urgency.toUpperCase()} - ${category}` }]);
              setStatus("");
              setTimeout(() => setPageStep("result"), 1000);
              return;
            }

            const nextQ = result.next_question;
            if (nextQ) {
              setConversation(p => [...p, { role: "assistant", text: nextQ }]);
            }

            if (result.reply_audio_base64) {
              setStatus("AI is speaking...");
              await playAudioFromBase64(result.reply_audio_base64);
            }

            if (mountedRef.current && !isCompleteRef.current) {
              startRecording();
            }
          } catch {
            if (mountedRef.current) {
              setMicError("Something went wrong. Tap the mic to try again.");
              setStatus("");
            }
          }
        };

        recorder.start();
        setTimeout(() => {
          if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        }, 7000);
      })
      .catch(() => {
        isRecordingRef.current = false;
        if (mountedRef.current) setMicError("Microphone access denied. Allow mic or type below.");
      });
  }, [playAudioFromBase64]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const handleTextSubmit = useCallback(async () => {
    const text = typingText.trim();
    if (!text) return;
    setTypingText("");

    if (isRedFlag(text)) {
      setConversation(p => [...p, { role: "user", text }]);
      setTriageResult({ urgency: "emergency", possible_category: "Other" });
      isCompleteRef.current = true;
      setTimeout(() => setPageStep("result"), 1500);
      return;
    }

    setStatus("AI is thinking...");
    try {
      const result = await api.triage.text(text, sessionIdRef.current || undefined, languageRef.current);
      if (!sessionIdRef.current && result.session_id) {
        sessionIdRef.current = result.session_id;
        setSessionId(result.session_id);
      }
      setConversation(p => [...p, { role: "user", text }]);
      isCompleteRef.current = result.complete;

      if (result.complete) {
        setTriageResult({ urgency: result.urgency, possible_category: result.possible_category });
        setConversation(p => [...p, { role: "assistant", text: `Assessment: ${result.urgency.toUpperCase()} - ${result.possible_category}` }]);
        setStatus("");
        setTimeout(() => setPageStep("result"), 1000);
        return;
      }

      if (result.next_question) {
        setConversation(p => [...p, { role: "assistant", text: result.next_question }]);
        setStatus("");
      }
    } catch {
      setMicError("Failed to process. Try again.");
      setStatus("");
    }
  }, [typingText]);

  const enterCall = useCallback((langCode: string) => {
    setLanguage(langCode);
    languageRef.current = langCode;
    isCompleteRef.current = false;
    turnRef.current = 0;
    setSessionId(null);
    sessionIdRef.current = null;
    setConversation([]);
    setTriageResult(null);
    setMicError("");
    setPageStep("call");
    setStatus("");
    setTimeout(() => startRecording(), 600);
  }, [startRecording]);

  const handleDetectLanguage = async () => {
    setMicError("");
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        setStatus("Listening...");
        chunksRef.current = [];
        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType: mime });
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          if (chunksRef.current.length === 0) { setStatus(""); return; }
          const blob = new Blob(chunksRef.current, { type: mime });
          setStatus("Detecting...");
          try {
            const result = await api.triage.audio(blob, undefined, "en");
            if (result.transcript) {
              const langResult = await api.triage.detectLanguage(result.transcript);
              const lang = langResult.language || "hi";
              setLanguage(lang);
              languageRef.current = lang;
              if (result.session_id) { sessionIdRef.current = result.session_id; setSessionId(result.session_id); }
              setPageStep("call");
              setConversation(p => [...p, { role: "user", text: result.transcript! }]);
              isCompleteRef.current = result.complete;
              if (!result.complete && result.next_question) {
                setConversation(p => [...p, { role: "assistant", text: result.next_question! }]);
              }
              if (result.reply_audio_base64) {
                setStatus("AI is speaking...");
                await playAudioFromBase64(result.reply_audio_base64);
              }
              if (mountedRef.current && !result.complete) startRecording();
              else if (result.complete) {
                setTriageResult({ urgency: result.urgency, possible_category: result.possible_category });
                setTimeout(() => setPageStep("result"), 1000);
              }
            } else { setMicError("Could not detect language. Select manually."); setStatus(""); }
          } catch { setMicError("Detection failed."); setStatus(""); }
        };
        recorderRef.current = recorder;
        recorder.start();
        setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 7000);
      })
      .catch(() => setMicError("Mic access denied."));
  };

  const reset = () => {
    isCompleteRef.current = false;
    isRecordingRef.current = false;
    turnRef.current = 0;
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    setPageStep("language");
    setSessionId(null); sessionIdRef.current = null;
    setTriageResult(null); setConversation([]); setMicError(""); setStatus(""); setTypingText("");
  };

  const isEmergency = triageResult?.urgency === "emergency";
  const lang = LANGUAGES.find(l => l.code === language);
  const isRecording = recorderRef.current?.state === "recording";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {pageStep === "call" && (
        <div className="fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur z-10 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full animate-pulse ${status.includes("Recording") ? "bg-emerald-400" : status.includes("speaking") ? "bg-blue-400" : status.includes("thinking") ? "bg-amber-400" : "bg-gray-400"}`} />
            {status || "Connected"}
          </span>
          <span className="font-mono"><CallTimer /></span>
        </div>
      )}

      {pageStep === "language" && (
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🏥</div>
            <h1 className="text-2xl font-bold text-white">SwasthyaSetu</h1>
            <p className="text-sm text-gray-400">Select your language</p>
          </div>

          <button onClick={handleDetectLanguage}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-4 px-4 transition-all active:scale-[0.98]"
          >
            <div className="text-2xl mb-1">🌐</div>
            <div className="text-sm font-medium">Auto-Detect Language</div>
            <div className="text-xs text-emerald-200 mt-0.5">Tap & speak in any language</div>
          </button>

          {micError && <div className="bg-red-900/50 border border-red-700 rounded-xl p-3 text-xs text-red-300">{micError}</div>}

          <div className="text-center text-xs text-gray-500">— or choose —</div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {LANGUAGES.map((l) => (
              <button key={l.code} onClick={() => enterCall(l.code)}
                className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-3 px-4 transition-all active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">{l.code.toUpperCase()}</div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium">{l.native}</div>
                  <div className="text-xs text-gray-400">{l.label}</div>
                </div>
                <span className="text-gray-500 text-lg">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {pageStep === "call" && (
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="mb-2">
            <div className={`w-28 h-28 rounded-full mx-auto mb-3 flex items-center justify-center text-5xl transition-all duration-500 ${isRecording ? "bg-emerald-500 shadow-lg shadow-emerald-500/30 scale-110" : status.includes("speaking") ? "bg-blue-500 shadow-lg shadow-blue-500/30" : status.includes("thinking") ? "bg-amber-500" : "bg-gray-700"}`}>
              {isRecording ? "🎤" : status.includes("speaking") ? "🔊" : status.includes("thinking") ? "⏳" : "👤"}
            </div>
            <h2 className="text-xl font-bold text-white">
              {status.includes("speaking") || status.includes("thinking") ? "SwasthyaSetu AI" : lang?.native || "Patient"}
            </h2>
            <p className="text-sm text-gray-400">{lang?.label || "Unknown"}</p>
          </div>

          {isRecording && (
            <div className="flex justify-center gap-1.5 py-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
          )}

          <p className="text-sm text-gray-300">{status || "Tap mic to start"}</p>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4">
              {isRecording ? (
                <button onClick={stopRecording}
                  className="w-20 h-20 rounded-full bg-red-500 shadow-lg shadow-red-500/50 scale-110 animate-pulse flex items-center justify-center transition-all active:scale-90"
                >
                  <span className="text-3xl">⬤</span>
                </button>
              ) : (
                <button onClick={startRecording}
                  className="w-20 h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 shadow-lg flex items-center justify-center transition-all active:scale-90"
                >
                  <span className="text-3xl">🎤</span>
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">{isRecording ? "Recording... tap to stop" : "Tap mic to speak"}</p>
          </div>

          <div className="flex items-center gap-2 px-4 pt-2">
            <div className="flex-grow border-t border-gray-700" />
            <span className="text-xs text-gray-500">or type</span>
            <div className="flex-grow border-t border-gray-700" />
          </div>
          <div className="flex gap-2 px-4">
            <Input
              placeholder={LANGUAGE_PROMPTS[language]}
              value={typingText}
              onChange={(e) => setTypingText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
            <Button onClick={handleTextSubmit} disabled={!typingText.trim()}
              className="bg-emerald-600 hover:bg-emerald-500"
            >Send</Button>
          </div>

          {micError && <div className="bg-red-900/50 border border-red-700 rounded-xl p-3 mx-4 text-xs text-red-300">{micError}</div>}

          {conversation.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1.5 px-4">
              {conversation.slice(-4).map((turn, i) => (
                <div key={i} className={`flex gap-2 text-xs p-1.5 rounded-lg ${turn.role === "user" ? "bg-gray-800" : "bg-gray-800/50"}`}>
                  <span className="font-medium shrink-0">{turn.role === "user" ? "👤" : "🤖"}</span>
                  <span className="text-gray-300 text-left">{turn.text}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={reset}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 mx-auto flex items-center justify-center transition-all active:scale-90 shadow-lg"
          >
            <span className="text-xl">📞</span>
          </button>
          <p className="text-xs text-gray-500 -mt-2">End Call</p>
        </div>
      )}

      {pageStep === "result" && triageResult && (
        <div className="w-full max-w-sm text-center space-y-6">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl ${isEmergency ? "bg-red-500" : "bg-emerald-500"}`}>
            {isEmergency ? "🚨" : "✅"}
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isEmergency ? "text-red-400" : "text-emerald-400"}`}>
              {isEmergency ? "EMERGENCY DETECTED" : "Triage Complete"}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {isEmergency ? "Red-flag symptoms — call 108 immediately" : "A case has been created for ASHA follow-up"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4">
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Urgency</p>
              <Badge className={URGENCY_COLORS[triageResult.urgency] || ""}>{triageResult.urgency?.toUpperCase()}</Badge>
            </div>
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Category</p>
              <p className="text-sm font-medium text-white">{triageResult.possible_category}</p>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2 px-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Conversation</p>
            {conversation.map((turn, i) => (
              <div key={i} className={`flex gap-2 text-xs p-2 rounded-lg ${turn.role === "user" ? "bg-gray-800" : "bg-gray-800/50"}`}>
                <span className="font-medium shrink-0 w-6">{turn.role === "user" ? "👤" : "🤖"}</span>
                <span className="text-gray-300 text-left">{turn.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <a href="/asha"><Button className="bg-emerald-600 hover:bg-emerald-500 rounded-xl">ASHA Dashboard</Button></a>
            <Button onClick={reset} variant="outline" className="rounded-xl">New Call</Button>
          </div>
        </div>
      )}
    </div>
  );
}
