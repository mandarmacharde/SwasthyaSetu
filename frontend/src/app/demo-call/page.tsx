"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { URGENCY_COLORS } from "@/lib/theme";
import { LANGUAGES, LANGUAGE_PROMPTS, speechLangMap } from "@/lib/languages";

type Step = "language" | "speak" | "listening" | "reply" | "answer" | "result";

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
  const [step, setStep] = useState<Step>("language");
  const [language, setLanguage] = useState("mr");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [symptom, setSymptom] = useState("");
  const [answer, setAnswer] = useState("");
  const [triageResult, setTriageResult] = useState<any>(null);
  const [conversation, setConversation] = useState<{ role: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState("");
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const hasSpeech = !!speechLangMap[language];

  const cleanupMic = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setIsRecording(false);
  }, []);

  const isRedFlag = (text: string) =>
    RED_FLAG_KEYWORDS.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));

  const startSpeechRecognition = useCallback(async (isFollowUp: boolean, langOverride?: string) => {
    setMicError("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicError("Speech recognition not supported. Try Safari or Chrome on desktop."); return; }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      setMicError("Microphone access denied. Allow mic in browser settings.");
      return;
    }

    try {
      const recognition = new SR();
      recognition.lang = langOverride || speechLangMap[language] || "mr-IN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => { setIsRecording(false); cleanupMic(); };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (isFollowUp) {
          setAnswer(transcript);
          setTimeout(() => handleAnswerTextWith(transcript), 100);
        } else {
          setSymptom(transcript);
          setTimeout(() => handleSpeakTextWith(transcript), 100);
        }
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false); cleanupMic();
        if (event.error === "network") {
          setMicError("Speech recognition requires internet. Try Safari — it uses on-device recognition.");
        } else if (event.error === "not-allowed" || event.error === "permission-denied") {
          setMicError("Microphone blocked. Allow mic access and refresh.");
        } else if (event.error === "no-speech") {
          setMicError("No speech detected. Try speaking louder.");
        } else {
          setMicError(`Microphone error. Try typing below.`);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      cleanupMic();
      setMicError("Could not start microphone. Try typing below.");
    }
  }, [language, cleanupMic]);

  const handleTriageResponse = (result: any) => {
    setTriageResult(result);
    if (result.next_question) setConversation((p) => [...p, { role: "assistant", text: result.next_question }]);
    if (result.complete) {
      setConversation((p) => [...p, { role: "assistant", text: `Assessment: ${result.urgency.toUpperCase()}` }]);
      setStep("result");
      setTimeout(() => { window.location.href = "/asha"; }, 3500);
    } else {
      setStep("reply");
    }
  };

  const handleSpeakTextWith = useCallback(async (text: string) => {
    if (!text.trim()) return;
    if (isRedFlag(text)) {
      setConversation((p) => [...p, { role: "user", text }]);
      setTriageResult({ urgency: "emergency", possible_category: "Other", enough_info: true, session_id: null });
      setStep("result"); return;
    }
    setStep("listening"); setLoading(true);
    setConversation((p) => [...p, { role: "user", text }]);
    try {
      const currentSessionId = sessionIdRef.current;
      const result = await api.triage.text(text, currentSessionId || undefined, language);
      if (!currentSessionId && result.session_id) { setSessionId(result.session_id); sessionIdRef.current = result.session_id; }
      handleTriageResponse(result);
    } catch { setStep("speak"); }
    finally { setLoading(false); }
  }, [language]);

  const handleAnswerTextWith = useCallback(async (text: string) => {
    if (!text.trim() || !sessionIdRef.current) return;
    if (isRedFlag(text)) {
      setConversation((p) => [...p, { role: "user", text }]);
      setTriageResult((prev: any) => ({ ...prev, urgency: "emergency", enough_info: true }));
      setStep("result"); return;
    }
    setStep("listening"); setLoading(true);
    setConversation((p) => [...p, { role: "user", text }]);
    try {
      const result = await api.triage.text(text, sessionIdRef.current!, language);
      handleTriageResponse(result);
    } catch { setStep("reply"); }
    finally { setLoading(false); }
  }, [language]);

  const handleDetectLanguage = async () => {
    setMicError("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicError("Speech recognition not available. Select manually."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch { setMicError("Microphone blocked. Select manually."); return; }

    try {
      const recognition = new SR();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => { setIsRecording(false); cleanupMic(); };
      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        try { setStep("listening"); setLoading(true);
          const result = await api.triage.detectLanguage(transcript);
          setLanguage(result.language || "hi"); setSymptom(transcript);
          setTimeout(() => handleSpeakTextWith(transcript), 100);
        } catch { setLanguage("hi"); setSymptom(transcript); setTimeout(() => handleSpeakTextWith(transcript), 100); }
        finally { setLoading(false); }
      };
      recognition.onerror = () => { setIsRecording(false); cleanupMic(); setMicError("Detection failed. Select manually."); };
      recognitionRef.current = recognition;
      recognition.start();
    } catch { cleanupMic(); setMicError("Could not start mic."); }
  };

  const handleSpeakText = useCallback(async () => { handleSpeakTextWith(symptom); }, [symptom, handleSpeakTextWith]);
  const handleAnswerText = useCallback(async () => { handleAnswerTextWith(answer); }, [answer, handleAnswerTextWith]);
  const reset = () => { setStep("language"); setSessionId(null); sessionIdRef.current = null; setSymptom(""); setAnswer(""); setTriageResult(null); setConversation([]); setMicError(""); };
  const isEmergency = triageResult?.urgency === "emergency" || isRedFlag(symptom) || isRedFlag(answer);

  const lang = LANGUAGES.find((l) => l.code === language);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {step !== "language" && step !== "result" && (
        <div className="fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur z-10 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
          <span className="font-mono"><CallTimer /></span>
        </div>
      )}

      {/* Language Selection */}
      {step === "language" && (
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🏥</div>
            <h1 className="text-2xl font-bold text-white">SwasthyaSetu</h1>
            <p className="text-sm text-gray-400">Select your language</p>
          </div>

          <button onClick={handleDetectLanguage} disabled={isRecording || loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-4 px-4 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <div className="text-2xl mb-1">🌐</div>
            <div className="text-sm font-medium">{isRecording ? "Listening..." : loading ? "Detecting..." : "Auto-Detect Language"}</div>
            <div className="text-xs text-emerald-200 mt-0.5">Tap & speak — we&apos;ll detect automatically</div>
          </button>

          {micError && <div className="bg-red-900/50 border border-red-700 rounded-xl p-3 text-xs text-red-300">{micError}</div>}

          <div className="text-center text-xs text-gray-500">— or choose —</div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {LANGUAGES.map((l) => (
              <button key={l.code} onClick={() => { setLanguage(l.code); setStep("speak"); }}
                className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-3 px-4 transition-all active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">{l.code.toUpperCase()}</div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium">{l.native}</div>
                  <div className="text-xs text-gray-400">{l.label}{!l.speech && " (text only)"}</div>
                </div>
                <span className="text-gray-500 text-lg">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Call Screen */}
      {(step === "speak" || step === "reply") && (
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="mb-4">
            <div className={`w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl transition-all duration-500 ${isRecording ? "bg-red-500 shadow-lg shadow-red-500/30 scale-110" : "bg-gray-700"}`}>
              {step === "speak" ? (isRecording ? "🎙️" : "👤") : (isRecording ? "🎙️" : "🤖")}
            </div>
            <h2 className="text-xl font-bold text-white">
              {step === "speak" ? lang?.native || "Patient" : "SwasthyaSetu AI"}
            </h2>
            <p className="text-sm text-gray-400">{lang?.label || "Unknown"}</p>
          </div>

          {step === "reply" && triageResult?.next_question && (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 mx-4 text-left">
              <p className="text-xs text-emerald-400 mb-1 font-medium">AI Question</p>
              <p className="text-white text-sm leading-relaxed">{triageResult.next_question}</p>
            </div>
          )}

          {micError && (
            <div className="bg-red-900/50 border border-red-700 rounded-xl p-3 mx-4">
              <p className="text-xs text-red-300">{micError}</p>
            </div>
          )}

          {/* Mic Button */}
          {hasSpeech && (
            <div className="space-y-3">
              <button onClick={() => startSpeechRecognition(step === "reply")} disabled={isRecording || loading}
                className={`w-24 h-24 rounded-full mx-auto transition-all active:scale-90 ${isRecording ? "bg-red-500 shadow-lg shadow-red-500/50 scale-110 animate-pulse" : "bg-emerald-600 hover:bg-emerald-500 shadow-lg"}`}
              >
                <span className="text-4xl">{isRecording ? "🎙️" : "🎤"}</span>
              </button>
              <p className="text-sm text-gray-300">{isRecording ? "Listening..." : step === "speak" ? "Tap to Speak" : "Tap to Answer"}</p>
              {!isRecording && <p className="text-xs text-gray-500">In-browser — nothing uploaded</p>}
            </div>
          )}

          {!hasSpeech && (
            <div className="bg-gray-800 rounded-xl p-4 mx-4">
              <p className="text-sm text-gray-400">Voice not available for {lang?.label}</p>
            </div>
          )}

          {/* Text fallback */}
          <div className="space-y-2 px-4">
            <div className="flex items-center gap-2">
              <div className="flex-grow border-t border-gray-700"></div>
              <span className="text-xs text-gray-500">or type</span>
              <div className="flex-grow border-t border-gray-700"></div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={step === "speak" ? LANGUAGE_PROMPTS[language] : `Type in ${lang?.label}...`}
                value={step === "speak" ? symptom : answer}
                onChange={(e) => step === "speak" ? setSymptom(e.target.value) : setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (step === "speak" ? handleSpeakText() : handleAnswerText())}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
              <Button onClick={step === "speak" ? handleSpeakText : handleAnswerText}
                disabled={(step === "speak" ? !symptom.trim() : !answer.trim()) || loading}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Send
              </Button>
            </div>
          </div>

          {/* End Call */}
          <button onClick={reset}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 mx-auto flex items-center justify-center transition-all active:scale-90 shadow-lg"
          >
            <span className="text-xl">📞</span>
          </button>
          <p className="text-xs text-gray-500 -mt-3">End Call</p>
        </div>
      )}

      {/* Processing */}
      {step === "listening" && (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-emerald-600 mx-auto flex items-center justify-center text-4xl animate-pulse">🤖</div>
          <p className="text-lg font-medium text-white">Processing</p>
          <p className="text-sm text-gray-400">AI is analyzing your symptoms</p>
          <div className="flex justify-center gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {step === "result" && triageResult && (
        <div className="w-full max-w-sm text-center space-y-6">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl ${isEmergency ? "bg-red-500" : "bg-emerald-500"}`}>
            {isEmergency ? "🚨" : "✅"}
          </div>

          <div>
            <h2 className={`text-xl font-bold ${isEmergency ? "text-red-400" : "text-emerald-400"}`}>
              {isEmergency ? "EMERGENCY DETECTED" : "Triage Complete"}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {isEmergency ? "Red-flag symptoms — call 108 immediately" : "Redirecting to ASHA dashboard..."}
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
                <span className="font-medium text-gray-400 shrink-0 w-6">{turn.role === "user" ? "👤" : "🤖"}</span>
                <span className="text-gray-300 text-left">{turn.text}</span>
              </div>
            ))}
          </div>

          <a href="/asha">
            <Button className="bg-emerald-600 hover:bg-emerald-500 w-48 rounded-xl">Go to ASHA Dashboard</Button>
          </a>
        </div>
      )}
    </div>
  );
}
