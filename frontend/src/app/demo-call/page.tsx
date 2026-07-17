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

  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState("");
  const [micReady, setMicReady] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const levelRef = useRef(0);
  const [recordingMode, setRecordingMode] = useState<"speech" | "audio">("speech");

  const hasSpeech = !!speechLangMap[language];

  const requestMic = useCallback(async (): Promise<boolean> => {
    if (streamRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        levelRef.current = Math.min(avg / 128, 1);
        if (streamRef.current) requestAnimationFrame(tick);
      };
      tick();
      setMicReady(true);
      setMicError("");
      return true;
    } catch (err: any) {
      setMicReady(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicError("Microphone access blocked. Allow mic in browser settings, then refresh.");
      } else if (err.name === "NotFoundError") {
        setMicError("No microphone found. Connect a mic or type below.");
      } else {
        setMicError(`Mic unavailable: ${err.message}.`);
      }
      return false;
    }
  }, []);

  const cleanupMic = useCallback(() => {
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setMicReady(false);
    setIsRecording(false);
  }, []);

  const isRedFlag = (text: string) =>
    RED_FLAG_KEYWORDS.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));

  const startSpeechRecognition = useCallback(async (isFollowUp: boolean, langOverride?: string) => {
    setRecordingMode("speech");
    setMicError("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicError("Try Record Audio below."); return; }
    const ok = await requestMic();
    if (!ok) return;
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
          setAnswer(transcript); setTimeout(() => handleAnswerTextWith(transcript), 100);
        } else {
          setSymptom(transcript); setTimeout(() => handleSpeakTextWith(transcript), 100);
        }
      };
      recognition.onerror = (event: any) => {
        setIsRecording(false); cleanupMic();
        if (event.error === "not-allowed" || event.error === "permission-denied") setMicError("Mic blocked.");
        else if (event.error === "no-speech") setMicError("No speech detected.");
        else if (event.error === "network") setMicError("Speech server unreachable. Use Record Audio below.");
        else setMicError("Mic error. Try Record Audio below.");
      };
      recognitionRef.current = recognition;
      recognition.start();
      const levelInterval = setInterval(() => setMicLevel(levelRef.current), 100);
      recognition.onend = () => { clearInterval(levelInterval); setIsRecording(false); cleanupMic(); };
    } catch { cleanupMic(); setMicError("Could not start mic."); }
  }, [language, requestMic, cleanupMic]);

  const startAudioRecording = useCallback(async (isFollowUp: boolean) => {
    setRecordingMode("audio");
    setMicError("");
    const ok = await requestMic();
    if (!ok) return;
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(streamRef.current!, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        cleanupMic();
        if (chunksRef.current.length === 0) { setMicError("No audio recorded."); return; }
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setLoading(true);
        try {
          const result = await api.triage.audio(blob, isFollowUp ? sessionIdRef.current || undefined : undefined, language);
          if (isFollowUp) {
            setAnswer(result.transcript || "");
            if (result.next_question) handleTriageResponse({ urgency: result.urgency, possible_category: result.possible_category, next_question: result.next_question, enough_info: result.complete, session_id: result.session_id });
          } else {
            setSymptom(result.transcript || "");
            if (!sessionIdRef.current && result.session_id) { setSessionId(result.session_id); sessionIdRef.current = result.session_id; }
            if (result.transcript) await handleSpeakTextWith(result.transcript);
            handleTriageResponse({ urgency: result.urgency, possible_category: result.possible_category, next_question: result.next_question, enough_info: result.complete, session_id: result.session_id });
          }
        } catch { setMicError("Audio processing failed."); }
        finally { setLoading(false); }
      };
      recorder.onerror = () => { cleanupMic(); setMicError("Recording failed."); };
      recorder.start();
      setIsRecording(true);
      setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 5000);
    } catch { cleanupMic(); setMicError("Could not start recording."); }
  }, [language, requestMic, cleanupMic]);

  const stopAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }, []);

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
    if (!SR) { setMicError("Speech recognition unavailable. Select manually."); return; }
    const ok = await requestMic();
    if (!ok) return;
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
      recognition.onerror = () => { setIsRecording(false); cleanupMic(); setMicError("Could not detect language. Select manually."); };
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
      {/* Connection bar */}
      {step !== "language" && step !== "result" && (
        <div className="fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur z-10 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
          <span className="font-mono">{isRecording ? <CallTimer /> : "—"}</span>
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

          {micError && (
            <div className="bg-red-900/50 border border-red-700 rounded-xl p-3 text-xs text-red-300">{micError}</div>
          )}

          <div className="text-center text-xs text-gray-500">— or choose —</div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {LANGUAGES.map((l) => (
              <button key={l.code} onClick={() => { setLanguage(l.code); setStep("speak"); }}
                className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-3 px-4 transition-all active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                  {l.code.toUpperCase()}
                </div>
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
          {/* Avatar / Contact */}
          <div className="mb-4">
            <div className={`w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl transition-all duration-500 ${isRecording ? (recordingMode === "speech" ? "bg-red-500 shadow-lg shadow-red-500/30 scale-110" : "bg-purple-500 shadow-lg shadow-purple-500/30 scale-110") : "bg-gray-700"}`}>
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

          {/* Mic Button */}
          {hasSpeech && step === "speak" && !micError && (
            <div className="space-y-3">
              <button onClick={() => startSpeechRecognition(false)} disabled={isRecording || loading}
                className={`w-24 h-24 rounded-full mx-auto transition-all active:scale-90 ${isRecording && recordingMode === "speech" ? "bg-red-500 shadow-lg shadow-red-500/50 scale-110 animate-pulse" : "bg-emerald-600 hover:bg-emerald-500 shadow-lg"}`}
              >
                <span className="text-4xl">{isRecording && recordingMode === "speech" ? "🎙️" : "🎤"}</span>
              </button>
              {isRecording && recordingMode === "speech" && (
                <div className="flex justify-center gap-1 h-5 items-end">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="w-1 bg-red-400 rounded-full transition-all"
                      style={{ height: `${Math.max(3, Math.min(20, micLevel * 20 * (Math.sin(i * 0.6 + Date.now() * 0.004) * 0.5 + 0.5)))}px`, opacity: 0.4 + micLevel * 0.6 }}
                    />
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-300">{isRecording && recordingMode === "speech" ? "Listening..." : "Tap to Speak"}</p>
              <p className="text-xs text-gray-500">In-browser — nothing uploaded</p>
            </div>
          )}

          {hasSpeech && step === "reply" && (
            <div className="space-y-3">
              <button onClick={() => startSpeechRecognition(true)} disabled={isRecording || loading}
                className={`w-20 h-20 rounded-full mx-auto transition-all active:scale-90 ${isRecording && recordingMode === "speech" ? "bg-red-500 shadow-lg shadow-red-500/50 scale-110 animate-pulse" : "bg-emerald-600 hover:bg-emerald-500 shadow-lg"}`}
              >
                <span className="text-3xl">{isRecording && recordingMode === "speech" ? "🎙️" : "🎤"}</span>
              </button>
              {isRecording && recordingMode === "speech" && (
                <div className="flex justify-center gap-0.5 h-4 items-end">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="w-1 bg-red-400 rounded-full transition-all"
                      style={{ height: `${Math.max(2, Math.min(14, micLevel * 14 * (Math.sin(i * 0.6 + Date.now() * 0.004) * 0.5 + 0.5)))}px`, opacity: 0.4 + micLevel * 0.6 }}
                    />
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-300">{isRecording && recordingMode === "speech" ? "Listening..." : "Tap to Answer"}</p>
            </div>
          )}

          {micError && (
            <div className="bg-red-900/50 border border-red-700 rounded-xl p-3 mx-4">
              <p className="text-xs text-red-300 mb-2">{micError}</p>
              <button onClick={() => startAudioRecording(step === "reply")}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-xl py-2 px-4 transition-all"
              >
                🔴 Record Audio Instead
              </button>
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
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 mx-auto flex items-center justify-center transition-all active:scale-90"
          >
            <span className="text-xl">📞</span>
          </button>
          <p className="text-xs text-gray-500 -mt-3">End Call</p>

          {/* Audio recording fallback (small) */}
          {!micError && (
            <div className="text-center">
              <button onClick={() => startAudioRecording(step === "reply")} disabled={isRecording || loading}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                🔴 Record Audio (server-side)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Processing */}
      {step === "listening" && (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-emerald-600 mx-auto flex items-center justify-center text-4xl animate-pulse">
            🤖
          </div>
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
            <Button className="bg-emerald-600 hover:bg-emerald-500 w-48 rounded-xl">
              Go to ASHA Dashboard
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
