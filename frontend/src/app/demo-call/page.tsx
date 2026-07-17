"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
        setMicError(`Microphone unavailable: ${err.message}. Type below instead.`);
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
    if (!SR) {
      setMicError("Speech recognition not available. Try the Record Audio button below instead.");
      return;
    }

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
          setAnswer(transcript);
          setTimeout(() => handleAnswerTextWith(transcript), 100);
        } else {
          setSymptom(transcript);
          setTimeout(() => handleSpeakTextWith(transcript), 100);
        }
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        cleanupMic();
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setMicError("Microphone access denied. Allow mic access in browser settings, or type below.");
        } else if (event.error === "no-speech") {
          setMicError("No speech detected. Try speaking louder or type below.");
        } else if (event.error === "aborted") {
          setMicError("");
        } else if (event.error === "network") {
          setMicError("Browser speech server unavailable. Click 'Record Audio' below to use the offline fallback.");
        } else {
          setMicError(`Microphone error: ${event.error}. Try the Record Audio button below instead.`);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      const levelInterval = setInterval(() => {
        setMicLevel(levelRef.current);
      }, 100);
      recognition.onend = () => {
        clearInterval(levelInterval);
        setIsRecording(false);
        cleanupMic();
      };
    } catch {
      cleanupMic();
      setMicError("Could not start microphone. Try typing below.");
    }
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cleanupMic();
        if (chunksRef.current.length === 0) { setMicError("No audio recorded. Try again."); return; }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setLoading(true);

        try {
          const result = await api.triage.audio(blob, isFollowUp ? sessionIdRef.current || undefined : undefined, language);
          if (isFollowUp) {
            setAnswer(result.transcript || "");
            if (result.next_question) {
              handleTriageResponse({
                urgency: result.urgency,
                possible_category: result.possible_category,
                next_question: result.next_question,
                enough_info: result.complete,
                session_id: result.session_id,
              });
            }
          } else {
            setSymptom(result.transcript || "");
            if (!sessionIdRef.current && result.session_id) {
              setSessionId(result.session_id);
              sessionIdRef.current = result.session_id;
            }
            if (result.transcript) {
              await handleSpeakTextWith(result.transcript);
            }
            handleTriageResponse({
              urgency: result.urgency,
              possible_category: result.possible_category,
              next_question: result.next_question,
              enough_info: result.complete,
              session_id: result.session_id,
            });
          }
        } catch {
          setMicError("Failed to process audio. Try typing below.");
        } finally {
          setLoading(false);
        }
      };

      recorder.onerror = () => {
        cleanupMic();
        setMicError("Recording failed. Try typing below.");
      };

      recorder.start();
      setIsRecording(true);

      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 5000);
    } catch {
      cleanupMic();
      setMicError("Could not start recording. Try typing below.");
    }
  }, [language, requestMic, cleanupMic]);

  const stopAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleTriageResponse = (result: any) => {
    setTriageResult(result);
    if (result.next_question) {
      setConversation((p) => [...p, { role: "assistant", text: result.next_question }]);
    }
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
      setStep("result");
      return;
    }
    setStep("listening");
    setLoading(true);
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
      setStep("result");
      return;
    }
    setStep("listening");
    setLoading(true);
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
    if (!SR) { setMicError("Speech recognition not supported. Select a language manually."); return; }

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
        try {
          setStep("listening");
          setLoading(true);
          const result = await api.triage.detectLanguage(transcript);
          const lang = result.language || "hi";
          setLanguage(lang);
          setSymptom(transcript);
          setTimeout(() => handleSpeakTextWith(transcript), 100);
        } catch {
          setLanguage("hi");
          setSymptom(transcript);
          setTimeout(() => handleSpeakTextWith(transcript), 100);
        } finally {
          setLoading(false);
        }
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        cleanupMic();
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setMicError("Microphone access denied. Select a language manually or allow mic access.");
        } else {
          setMicError(`Could not detect language: ${event.error}. Please select manually.`);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      cleanupMic();
      setMicError("Could not start microphone. Please select a language manually.");
    }
  };

  const handleSpeakText = useCallback(async () => {
    handleSpeakTextWith(symptom);
  }, [symptom, handleSpeakTextWith]);

  const handleAnswerText = useCallback(async () => {
    handleAnswerTextWith(answer);
  }, [answer, handleAnswerTextWith]);

  const reset = () => {
    setStep("language");
    setSessionId(null);
    sessionIdRef.current = null;
    setSymptom("");
    setAnswer("");
    setTriageResult(null);
    setConversation([]);
    setMicError("");
  };

  const stepIndex = ["language", "speak", "reply", "result"].indexOf(
    step === "listening" ? "speak" : step === "answer" ? "reply" : step
  );

  const isEmergency = triageResult?.urgency === "emergency" || isRedFlag(symptom) || isRedFlag(answer);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-emerald-700">← SwasthyaSetu</Link>
          <span className="text-xs text-gray-400">📞 Browser Voice Call</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3 md:px-4 py-6 md:py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">📞 SwasthyaSetu Web Voice Demo</CardTitle>
          </CardHeader>
          <CardContent>
            {step === "language" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Step 1: Choose your language</p>
                  <span className="text-xs text-gray-400">{LANGUAGES.length} languages</span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <Button
                    onClick={handleDetectLanguage}
                    disabled={isRecording || loading}
                    variant="outline"
                    className="w-full bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800"
                  >
                    <span className="text-lg mr-2">🌐</span>
                    {isRecording ? "Listening..." : loading ? "Detecting..." : "Speak to Auto-Detect Language"}
                  </Button>
                  <p className="text-xs text-blue-500 mt-1">Say something — we&apos;ll detect your language automatically</p>
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR PICK MANUALLY</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                {micError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {micError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {LANGUAGES.map((l) => {
                    const hs = !!l.speech;
                    return (
                      <Button
                        key={l.code} variant={language === l.code ? "default" : "outline"}
                        className={`justify-start h-auto py-2.5 px-3 ${language === l.code ? 'bg-emerald-600' : ''}`}
                        onClick={() => { setLanguage(l.code); setStep("speak"); }}
                      >
                        <div className="text-left w-full">
                          <p className="font-medium text-sm">{l.native}</p>
                          <p className="text-xs text-gray-400">{l.label}{!hs && " (text only)"}</p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === "speak" && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-gray-500">
                  Step 2: Tell us what&apos;s troubling you in <strong>{LANGUAGES.find(l=>l.code===language)?.native}</strong>
                </p>

                {micError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {micError}
                    <button className="ml-2 underline text-red-500" onClick={() => setMicError("")}>Dismiss</button>
                  </div>
                )}

                <div className={`rounded-xl p-8 text-center transition-colors ${isRecording && recordingMode === "speech" ? 'bg-red-50 border-2 border-red-300' : recordingMode === "audio" ? 'bg-purple-50 border-2 border-purple-300' : 'bg-gray-50 border border-gray-100'}`}>
                  <Button
                    onClick={() => startSpeechRecognition(false)}
                    disabled={isRecording || loading}
                    variant="default"
                    size="lg"
                    className={`w-32 h-32 rounded-full mb-4 transition-transform active:scale-95 shadow-xl ${isRecording && recordingMode === "speech" ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    <span className="text-5xl">{isRecording && recordingMode === "speech" ? "🎙️" : "🎤"}</span>
                  </Button>

                  {isRecording && recordingMode === "speech" && (
                    <div className="flex justify-center gap-0.5 mb-3 h-6 items-end">
                      {Array.from({length: 20}).map((_, i) => (
                        <div key={i} className="w-1.5 bg-red-400 rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(4, Math.min(24, micLevel * 24 * (Math.sin(i * 0.8 + Date.now() * 0.003) * 0.5 + 0.5)))}px`, opacity: 0.4 + micLevel * 0.6 }}
                        />
                      ))}
                    </div>
                  )}

                  <h3 className={`text-lg font-medium ${isRecording && recordingMode === "speech" ? 'text-red-600' : 'text-gray-700'}`}>
                    {isRecording && recordingMode === "speech" ? "Listening..." : "Click & Speak"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {isRecording && recordingMode === "speech" ? "Speak now — auto-detected when you pause" : `Speak in ${LANGUAGES.find(l=>l.code===language)?.label}`}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">⚡ In-browser — no upload, instant result</p>
                </div>

                {!micError?.includes("network") && !micError?.includes("fallback") && (
                <div className="flex items-center gap-3">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="text-xs text-gray-400">FALLBACK</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>
                )}

                <div className={`rounded-xl p-6 text-center ${recordingMode === "audio" && isRecording ? 'bg-purple-50 border-2 border-purple-300' : 'bg-gray-50 border border-gray-100'}`}>
                  {!isRecording || recordingMode !== "audio" ? (
                    <Button
                      onClick={() => startAudioRecording(false)}
                      disabled={isRecording || loading}
                      variant="outline"
                      className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <span className="text-lg mr-2">🔴</span>
                      Record Audio (sends to server)
                    </Button>
                  ) : (
                    <div>
                      <p className="text-purple-700 font-medium mb-2">🔴 Recording... (max 5s)</p>
                      <div className="flex justify-center gap-0.5 mb-2 h-5 items-end">
                        {Array.from({length: 16}).map((_, i) => (
                          <div key={i} className="w-1.5 bg-purple-400 rounded-full"
                            style={{ height: `${Math.max(3, Math.min(20, micLevel * 20 * (Math.sin(i * 0.7 + Date.now() * 0.004) * 0.5 + 0.5)))}px` }}
                          />
                        ))}
                      </div>
                      <Button onClick={stopAudioRecording} variant="destructive" size="sm" className="mt-1">
                        Stop Recording
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Records 5s audio — transcribed on server via Whisper</p>
                </div>

                {!hasSpeech && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <span className="text-xl block mb-1">⌨️</span>
                  <p className="text-sm text-amber-700">
                    Voice not available for {LANGUAGES.find(l=>l.code===language)?.label} — type instead or use Record Audio above
                  </p>
                </div>
                )}

                <div className="relative flex items-center py-4">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR TYPE</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder={LANGUAGE_PROMPTS[language]}
                    value={symptom}
                    onChange={(e) => setSymptom(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSpeakText()}
                  />
                  <Button onClick={handleSpeakText} disabled={!symptom.trim() || loading}>
                     Send Text
                  </Button>
                </div>
              </div>
            )}

            {step === "listening" && (
              <div className="text-center py-12 space-y-4">
                <div className="animate-pulse">
                  <p className="text-5xl mb-4">🤖</p>
                  <p className="text-lg font-medium text-emerald-700">Processing...</p>
                  <p className="text-sm text-gray-400">AI is analyzing your symptoms</p>
                </div>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}

            {step === "reply" && triageResult?.next_question && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 shadow-inner">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <p className="font-medium text-emerald-800 text-sm mb-1">SwasthyaSetu AI</p>
                      <p className="text-gray-700 font-medium">{triageResult.next_question}</p>
                    </div>
                  </div>
                </div>
                <Separator />

                {micError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {micError}
                  </div>
                )}

                <div className={`rounded-xl p-6 text-center transition-colors ${isRecording && recordingMode === "speech" ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-50 border border-gray-100'}`}>
                   <Button
                    onClick={() => startSpeechRecognition(true)}
                    disabled={isRecording || loading}
                    variant="default"
                    size="lg"
                    className={`w-24 h-24 rounded-full mb-3 transition-transform active:scale-95 shadow-lg ${isRecording && recordingMode === "speech" ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    <span className="text-4xl">{isRecording && recordingMode === "speech" ? "🎙️" : "🎤"}</span>
                  </Button>

                  {isRecording && recordingMode === "speech" && (
                    <div className="flex justify-center gap-0.5 mb-2 h-4 items-end">
                      {Array.from({length: 12}).map((_, i) => (
                        <div key={i} className="w-1 bg-red-400 rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(3, Math.min(16, micLevel * 16 * (Math.sin(i * 0.8 + Date.now() * 0.003) * 0.5 + 0.5)))}px`, opacity: 0.4 + micLevel * 0.6 }}
                        />
                      ))}
                    </div>
                  )}

                  <h3 className={`text-sm font-medium ${isRecording && recordingMode === "speech" ? 'text-red-600' : 'text-gray-700'}`}>
                    {isRecording && recordingMode === "speech" ? "Listening..." : "Click & Answer"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Speak your answer — it will be sent automatically</p>
                </div>

                <div className={`rounded-xl p-4 text-center ${recordingMode === "audio" && isRecording ? 'bg-purple-50 border-2 border-purple-300' : 'bg-gray-50 border border-gray-100'}`}>
                  {!isRecording || recordingMode !== "audio" ? (
                    <Button onClick={() => startAudioRecording(true)} disabled={isRecording || loading}
                      variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <span className="mr-1">🔴</span> Record Audio
                    </Button>
                  ) : (
                    <div>
                      <p className="text-purple-700 text-sm font-medium">🔴 Recording...</p>
                      <Button onClick={stopAudioRecording} variant="destructive" size="sm" className="mt-1">Stop</Button>
                    </div>
                  )}
                </div>

                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR TYPE</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder={`Type your answer in ${LANGUAGES.find(l=>l.code===language)?.label}...`}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnswerText()}
                  />
                  <Button onClick={handleAnswerText} disabled={!answer.trim() || loading}>
                    Send
                  </Button>
                </div>
              </div>
            )}

            {step === "result" && triageResult && (
              <div className="space-y-6 animate-fade-in">
                {isEmergency ? (
                  <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6 text-center space-y-3">
                    <p className="text-4xl">🚨</p>
                    <h3 className="text-xl font-bold text-red-700">EMERGENCY DETECTED</h3>
                    <p className="text-red-600 text-sm">Red-flag symptoms detected. Immediate action required.</p>
                    <Badge className="bg-red-600 text-white text-sm px-4 py-1">CALL 108</Badge>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center space-y-3">
                    <p className="text-4xl">✅</p>
                    <h3 className="text-xl font-bold text-emerald-700">Triage Complete</h3>
                    <p className="text-sm text-gray-500">Redirecting to ASHA Dashboard...</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3 text-center bg-white shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">Urgency</p>
                    <Badge className={URGENCY_COLORS[triageResult.urgency] || ""}>
                      {triageResult.urgency?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="border rounded-lg p-3 text-center bg-white shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">Category</p>
                    <p className="font-medium text-sm">{triageResult.possible_category}</p>
                  </div>
                </div>

                <Separator />
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transcription Log</p>
                  {conversation.map((turn, i) => (
                    <div key={i} className="flex gap-2 text-sm bg-gray-50 p-2 rounded">
                      <span className="font-medium w-16 text-xs text-gray-400 shrink-0">
                        {turn.role === "user" ? "👤 You" : "🤖 AI"}
                      </span>
                      <span className="text-gray-700 italic">{turn.text}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <Link href="/asha" className="flex-1">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Go to ASHA Dashboard Now</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center gap-2 mt-6">
          {["language", "speak", "reply", "result"].map((s, i) => (
            <div key={s} className={`w-8 h-1 rounded-full transition-colors ${i <= stepIndex ? "bg-emerald-500" : "bg-gray-200"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
