"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { URGENCY_COLORS } from "@/lib/theme";
import { LANGUAGES, LANGUAGE_PROMPTS, speechLangMap } from "@/lib/languages";

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "done";
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

let audioCtx: AudioContext | null = null;
let audioRef: HTMLAudioElement | null = null;

async function playServerTTS(text: string, language: string): Promise<void> {
  const blob = await api.tts.synthesize(text, language);
  const url = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audioRef = audio;
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    if (audioCtx?.state === "suspended") audioCtx.resume();
    audio.play().catch(() => resolve());
  });
}

export default function DemoCallPage() {
  const [pageStep, setPageStep] = useState<PageStep>("language");
  const [language, setLanguage] = useState("mr");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [conversation, setConversation] = useState<{ role: string; text: string }[]>([]);
  const [micError, setMicError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);
  const [typingText, setTypingText] = useState("");

  const sessionIdRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mountedRef = useRef(true);
  const languageRef = useRef(language);
  const isCompleteRef = useRef(false);

  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

    const unlockAudio = useCallback(() => {
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
  }, []);

  const cleanupAll = useCallback(() => {
    if (audioRef) { audioRef.pause(); audioRef = null; }
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} recognitionRef.current = null; }
    if (recorderRef.current?.state === "recording") { try { recorderRef.current.stop(); } catch {} }
    recorderRef.current = null;
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  const isRedFlag = (text: string) =>
    RED_FLAG_KEYWORDS.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));

  const speakText = useCallback(async (text: string): Promise<void> => {
    if (!mountedRef.current) return;
    await playServerTTS(text, languageRef.current);
  }, []);

  const handleTriageResult = useCallback(async (result: any, transcript: string) => {
    setTriageResult(result);
    setConversation(p => [...p, { role: "user", text: transcript }]);
    isCompleteRef.current = result.complete;

    if (result.complete) {
      const finalMsg = `Assessment: ${result.urgency.toUpperCase()} - ${result.possible_category}`;
      setConversation(p => [...p, { role: "assistant", text: finalMsg }]);
      setVoiceState("done");
      setTimeout(() => setPageStep("result"), 1500);
      return;
    }

    const question = result.next_question;
    if (!question) {
      setMicError("No response from AI. Type below.");
      setVoiceState("idle");
      return;
    }

    setConversation(p => [...p, { role: "assistant", text: question }]);
    setVoiceState("speaking");
    await speakText(question);
    if (mountedRef.current && !isCompleteRef.current) {
      startListening();
    }
  }, [speakText]);

  const startSpeechRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false;

    const recognition = new SR();
    recognition.lang = speechLangMap[languageRef.current] || "mr-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let hasResult = false;

    recognition.onstart = () => {
      if (mountedRef.current) { setVoiceState("listening"); setUsingFallback(false); setMicError(""); }
    };

    recognition.onresult = async (event: any) => {
      hasResult = true;
      const transcript = event.results[0][0].transcript;
      if (!mountedRef.current) return;
      setVoiceState("processing");

      if (isRedFlag(transcript)) {
        setConversation(p => [...p, { role: "user", text: transcript }]);
        const emergencyResult = { urgency: "emergency", possible_category: "Other", complete: true, session_id: null as string | null };
        setTriageResult(emergencyResult);
        isCompleteRef.current = true;
        setVoiceState("done");
        setTimeout(() => setPageStep("result"), 1500);
        return;
      }

      try {
        const result = await api.triage.text(transcript, sessionIdRef.current || undefined, languageRef.current);
        if (!sessionIdRef.current && result.session_id) {
          sessionIdRef.current = result.session_id;
          setSessionId(result.session_id);
        }
        await handleTriageResult(result, transcript);
      } catch {
        if (mountedRef.current) { setMicError("Failed to process. Type below."); setVoiceState("idle"); }
      }
    };

    recognition.onerror = (event: any) => {
      if (!mountedRef.current) return;
      if (event.error === "abort") return;
      cleanupAll();
      if (event.error === "network") {
        startFallbackRecording();
      } else {
        setMicError(event.error === "no-speech" ? "No speech detected. Try again." : "Mic error. Type below.");
        setVoiceState("idle");
      }
    };

    recognition.onend = () => {
      if (!mountedRef.current) return;
      if (!hasResult) {
        setMicError("No speech detected. Tap mic to try again.");
        setVoiceState("idle");
      }
    };

    try {
      recognition.start();
    } catch {
      startFallbackRecording();
    }
    return true;
  }, [handleTriageResult, cleanupAll]);

  const startFallbackRecording = useCallback(() => {
    if (!mountedRef.current) return;
    setUsingFallback(true);
    setMicError("");

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

        recorder.onstop = async () => {
          if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
          if (!mountedRef.current || chunksRef.current.length === 0) { setUsingFallback(false); return; }

          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          setVoiceState("processing");
          try {
            const result = await api.triage.audio(blob, sessionIdRef.current || undefined, languageRef.current);
            if (!mountedRef.current) return;
            setUsingFallback(false);
            if (result.error) { setMicError(result.error); setVoiceState("idle"); return; }
            if (result.transcript) {
              if (!sessionIdRef.current && result.session_id) {
                sessionIdRef.current = result.session_id;
                setSessionId(result.session_id);
              }
              await handleTriageResult(result, result.transcript);
            }
          } catch {
            if (mountedRef.current) { setMicError("Audio processing failed."); setVoiceState("idle"); }
          }
        };

        recorder.start();
        setVoiceState("listening");
        setTimeout(() => {
          if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        }, 7000);
      })
      .catch(() => {
        if (mountedRef.current) { setMicError("Microphone access denied."); setVoiceState("idle"); }
      });
  }, [handleTriageResult]);

  const startListening = useCallback(() => {
    if (!mountedRef.current) return;
    cleanupAll();
    const started = startSpeechRecognition();
    if (!started) startFallbackRecording();
  }, [startSpeechRecognition, startFallbackRecording, cleanupAll]);

  const handleMicTap = useCallback(() => {
    unlockAudio();
    if (voiceState === "speaking") {
      window.speechSynthesis?.cancel();
      cleanupAll();
      startListening();
      return;
    }
    if (voiceState === "idle" || voiceState === "done") {
      startListening();
    }
  }, [voiceState, startListening, cleanupAll, unlockAudio]);

  const handleTextSubmit = useCallback(async () => {
    const text = typingText.trim();
    if (!text) return;
    setTypingText("");
    setVoiceState("processing");
    cleanupAll();

    if (isRedFlag(text)) {
      setConversation(p => [...p, { role: "user", text }]);
      const emergencyResult = { urgency: "emergency", possible_category: "Other", complete: true, session_id: null as string | null };
      setTriageResult(emergencyResult);
      isCompleteRef.current = true;
      setVoiceState("done");
      setTimeout(() => setPageStep("result"), 1500);
      return;
    }

    try {
      const result = await api.triage.text(text, sessionIdRef.current || undefined, languageRef.current);
      if (!sessionIdRef.current && result.session_id) {
        sessionIdRef.current = result.session_id;
        setSessionId(result.session_id);
      }
      await handleTriageResult(result, text);
    } catch {
      if (mountedRef.current) { setMicError("Failed to process."); setVoiceState("idle"); }
    }
  }, [typingText, handleTriageResult, cleanupAll]);

  const enterCall = useCallback((langCode: string) => {
    unlockAudio();
    setLanguage(langCode);
    languageRef.current = langCode;
    setPageStep("call");
    setVoiceState("idle");
    setTimeout(() => startListening(), 500);
  }, [startListening, unlockAudio]);

  const handleDetectLanguage = async () => {
    unlockAudio();
    setMicError("");
    setUsingFallback(false);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recognition = new SR();
        recognition.lang = "en-IN";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onstart = () => setVoiceState("listening");
        recognition.onend = () => cleanupAll();
        recognition.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          setVoiceState("processing");
          try {
            const result = await api.triage.detectLanguage(transcript);
            const lang = result.language || "hi";
            setLanguage(lang);
            languageRef.current = lang;
            const triageR = await api.triage.text(transcript, undefined, lang);
            if (!sessionIdRef.current && triageR.session_id) { sessionIdRef.current = triageR.session_id; setSessionId(triageR.session_id); }
            setPageStep("call");
            await handleTriageResult(triageR, transcript);
          } catch {
            enterCall("hi");
          }
        };
        recognition.onerror = async () => { cleanupAll(); await detectFallback(); };
        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch { cleanupAll(); }
    }
    await detectFallback();
  };

  const detectFallback = async () => {
    setUsingFallback(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        cleanupAll();
        if (chunksRef.current.length === 0) { setUsingFallback(false); return; }
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setVoiceState("processing");
        try {
          const result = await api.triage.audio(blob, undefined, "en");
          setUsingFallback(false);
          if (result.transcript) {
            const langResult = await api.triage.detectLanguage(result.transcript);
            const lang = langResult.language || "hi";
            setLanguage(lang);
            languageRef.current = lang;
            if (result.session_id && !sessionIdRef.current) { sessionIdRef.current = result.session_id; setSessionId(result.session_id); }
            setPageStep("call");
            await handleTriageResult(result, result.transcript);
          }
        } catch { setUsingFallback(false); setMicError("Detection failed."); }
      };
      recorder.start();
      setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 7000);
    } catch { cleanupAll(); setMicError("Mic blocked."); }
  };

  const reset = () => {
    cleanupAll();
    isCompleteRef.current = false;
    setPageStep("language");
    setSessionId(null);
    sessionIdRef.current = null;
    setTriageResult(null);
    setConversation([]);
    setMicError("");
    setUsingFallback(false);
    setVoiceState("idle");
    setTypingText("");
  };

  const isEmergency = triageResult?.urgency === "emergency" || conversation.some(t => isRedFlag(t.text));
  const lang = LANGUAGES.find(l => l.code === language);
  const statusText = !voiceState || voiceState === "idle" ? "Tap mic to start" :
    voiceState === "listening" ? (usingFallback ? "Recording..." : "Listening...") :
    voiceState === "processing" ? "AI is thinking..." :
    voiceState === "speaking" ? "AI is speaking..." : "Complete";
  const avatarEmoji = voiceState === "speaking" || voiceState === "processing" ? "🤖" : "👤";
  const avatarColor = voiceState === "listening" ? "bg-emerald-500 shadow-emerald-500/30" :
    voiceState === "speaking" ? "bg-blue-500 shadow-blue-500/30" :
    voiceState === "processing" ? "bg-amber-500 shadow-amber-500/30" : "bg-gray-700";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {pageStep !== "language" && pageStep !== "result" && (
        <div className="fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur z-10 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full animate-pulse ${voiceState === "listening" ? "bg-emerald-400" : voiceState === "speaking" ? "bg-blue-400" : "bg-gray-400"}`} />
            {voiceState === "speaking" ? "AI Speaking" : voiceState === "listening" ? "Listening" : voiceState === "processing" ? "Processing" : "Connected"}
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

          <button onClick={handleDetectLanguage} disabled={voiceState === "listening" || voiceState === "processing"}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-4 px-4 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <div className="text-2xl mb-1">🌐</div>
            <div className="text-sm font-medium">
              {voiceState === "listening" ? (usingFallback ? "Recording..." : "Listening...") : voiceState === "processing" ? "Detecting..." : "Auto-Detect Language"}
            </div>
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
                  <div className="text-xs text-gray-400">{l.label}{!l.speech && " (text only)"}</div>
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
            <div className={`w-28 h-28 rounded-full mx-auto mb-3 flex items-center justify-center text-5xl transition-all duration-500 ${avatarColor} ${(voiceState === "listening" || voiceState === "speaking") ? "scale-110 shadow-lg" : ""}`}>
              {avatarEmoji}
            </div>
            <h2 className="text-xl font-bold text-white">
              {voiceState === "speaking" || voiceState === "processing" ? "SwasthyaSetu AI" : lang?.native || "Patient"}
            </h2>
            <p className="text-sm text-gray-400">{lang?.label || "Unknown"}</p>
          </div>

          {voiceState === "listening" && (
            <div className="flex justify-center gap-1.5 py-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
          )}

          {voiceState === "speaking" && (
            <div className="flex justify-center gap-1.5 py-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0s" }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          )}

          {voiceState === "processing" && (
            <div className="flex justify-center gap-1.5 py-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-spin" />
            </div>
          )}

          <p className="text-sm text-gray-300">{statusText}</p>
          {usingFallback && <p className="text-xs text-purple-400">⚡ Recording 7s...</p>}

          {voiceState !== "done" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4">
                <button onClick={handleMicTap}
                  className={`w-20 h-20 rounded-full transition-all active:scale-90 ${
                    voiceState === "listening" ? "bg-red-500 shadow-lg shadow-red-500/50 scale-110 animate-pulse" :
                    voiceState === "speaking" ? "bg-blue-600 hover:bg-blue-500 shadow-lg" :
                    voiceState === "processing" ? "bg-amber-600 shadow-lg" :
                    "bg-emerald-600 hover:bg-emerald-500 shadow-lg"
                  }`}
                >
                  <span className="text-3xl">
                    {voiceState === "listening" ? "🎙️" : voiceState === "speaking" ? "🔊" : "🎤"}
                  </span>
                </button>
              </div>
              {voiceState === "speaking" && (
                <p className="text-xs text-blue-400">Tap mic to interrupt and speak</p>
              )}

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
                <Button onClick={handleTextSubmit} disabled={!typingText.trim() || voiceState === "processing"}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Send
                </Button>
              </div>
            </div>
          )}

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
                <span className="font-medium text-gray-400 shrink-0 w-6">{turn.role === "user" ? "👤" : "🤖"}</span>
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
