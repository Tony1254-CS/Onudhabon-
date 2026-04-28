import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const STT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface SR extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (e: any) => void;
  onerror: (e: any) => void;
  onend: () => void;
  onstart: () => void;
}

type Mode = "idle" | "webspeech" | "recording" | "transcribing";

/**
 * Hybrid voice input:
 *  - First tries browser's Web Speech API (instant, free, on-device).
 *  - If unsupported / errored OR user explicitly long-presses → records mic
 *    audio and sends it to a server-side Whisper (Bangla) endpoint.
 *
 * Callback fires with the final text. Set `final=true` only on completed
 * results so callers can distinguish interim transcripts.
 */
export function useVoiceInput(onTranscript: (text: string, final: boolean) => void) {
  const [mode, setMode] = useState<Mode>("idle");
  const [supported, setSupported] = useState(false);

  const recRef = useRef<SR | null>(null);
  const cbRef = useRef(onTranscript);
  const shouldContinueRef = useRef(false);
  const baseTextRef = useRef("");
  const finalTextRef = useRef("");
  cbRef.current = onTranscript;

  // MediaRecorder fallback state
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    // We're supported as long as the browser has a microphone — fallback to Whisper
    // covers Web-Speech-less browsers (Firefox, Safari iOS, etc.).
    const hasMic = !!navigator.mediaDevices?.getUserMedia;
    setSupported(!!SR || hasMic);
    return () => {
      shouldContinueRef.current = false;
      try { recRef.current?.abort(); } catch { /* noop */ }
      stopMediaStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopMediaStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const recording = mode === "webspeech" || mode === "recording";
  const transcribing = mode === "transcribing";

  // ────────────── Web Speech path ──────────────
  const createRecognition = useCallback((SR: any) => {
    const rec: SR = new SR();
    rec.lang = "bn-BD";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => setMode("webspeech");
    rec.onresult = (e: any) => {
      let committed = finalTextRef.current;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = String(e.results[i][0].transcript ?? "").replace(/\s+/g, " ").trim();
        if (!t) continue;
        if (e.results[i].isFinal) committed = `${committed} ${t}`.trim();
        else interim = `${interim} ${t}`.trim();
      }
      finalTextRef.current = committed;
      const composed = [committed, interim].filter(Boolean).join(" ").trim() || baseTextRef.current;
      cbRef.current(composed, !interim);
    };
    rec.onerror = (e: any) => {
      const code = e?.error ?? "unknown";
      if (code === "language-not-supported" || code === "service-not-allowed") {
        // Quietly switch to Whisper fallback.
        shouldContinueRef.current = false;
        toast.message("ব্রাউজার বাংলা ভয়েস বুঝতে পারছে না। মাইকে ধরে রেখে কথা বলো — Whisper দিয়ে পাঠাব।");
        startWhisperRecording();
        return;
      }
      if (code === "no-speech") {
        toast.message("কথা শোনা যাচ্ছে না — আবার বলো।");
      } else if (code === "not-allowed") {
        shouldContinueRef.current = false;
        toast.error("মাইক্রোফোনের অনুমতি দরকার।");
      } else if (code === "audio-capture") {
        shouldContinueRef.current = false;
        toast.error("মাইক্রোফোন থেকে অডিও ধরা যাচ্ছে না।");
      } else if (code === "network") {
        shouldContinueRef.current = false;
        toast.message("ভয়েস স্বীকৃতির সংযোগ বিচ্ছিন্ন — Whisper দিয়ে চেষ্টা করো (মাইকে চেপে ধরো)।");
      } else if (code !== "aborted") {
        toast.error("ভয়েস ত্রুটি: " + code);
      }
      if (code !== "no-speech") setMode("idle");
    };
    rec.onend = () => {
      if (!shouldContinueRef.current) {
        setMode((m) => (m === "webspeech" ? "idle" : m));
        recRef.current = null;
        return;
      }
      window.setTimeout(() => {
        if (!shouldContinueRef.current) return;
        try {
          recRef.current = createRecognition(SR);
          recRef.current.start();
        } catch {
          setMode("idle");
        }
      }, 150);
    };
    return rec;
  }, []);

  // ────────────── Whisper (server) fallback ──────────────
  const startWhisperRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stopMediaStream();
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size < 1000) { setMode("idle"); return; }
        setMode("transcribing");
        try {
          const fd = new FormData();
          fd.append("audio", blob, "voice.webm");
          fd.append("language", "bn");
          const r = await fetch(STT_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${KEY}` },
            body: fd,
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j?.error ?? "stt failed");
          const text = String(j.text ?? "").trim();
          if (text) {
            const composed = baseTextRef.current ? `${baseTextRef.current} ${text}`.trim() : text;
            cbRef.current(composed, true);
          } else {
            toast.message("কিছুই শোনা গেল না — আবার চেষ্টা করো।");
          }
        } catch (err: any) {
          toast.error("Whisper transcription ব্যর্থ: " + (err?.message ?? "unknown"));
        } finally {
          setMode("idle");
        }
      };
      mr.start();
      setMode("recording");
    } catch (err: any) {
      if (err?.name === "NotAllowedError") toast.error("মাইক্রোফোনের অনুমতি দাও।");
      else toast.error("মাইক্রোফোন অ্যাক্সেস ব্যর্থ: " + (err?.message ?? "unknown"));
      setMode("idle");
    }
  }, []);

  const stopWhisperRecording = useCallback(() => {
    try { mediaRef.current?.stop(); } catch { /* noop */ }
    mediaRef.current = null;
  }, []);

  // ────────────── Public API ──────────────
  const start = useCallback(async (initialText = "", forceWhisper = false) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    baseTextRef.current = initialText.trim();
    finalTextRef.current = initialText.trim();

    // Permission probe
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        toast.error("মাইক্রোফোনের অনুমতি দাও (ব্রাউজার সেটিংস থেকে)।");
      } else if (err?.name === "NotFoundError") {
        toast.error("কোনো মাইক্রোফোন পাওয়া যায়নি।");
      } else {
        toast.error("মাইক্রোফোন অ্যাক্সেস ব্যর্থ: " + (err?.message ?? "unknown"));
      }
      return;
    }

    if (!SR || forceWhisper) {
      await startWhisperRecording();
      return;
    }

    shouldContinueRef.current = true;
    try { recRef.current?.abort(); } catch { /* noop */ }
    recRef.current = createRecognition(SR);
    try {
      recRef.current.start();
    } catch (err: any) {
      shouldContinueRef.current = false;
      toast.message("Web Speech ব্যর্থ — Whisper দিয়ে চেষ্টা করছি।");
      await startWhisperRecording();
    }
  }, [createRecognition, startWhisperRecording]);

  const stop = useCallback(() => {
    shouldContinueRef.current = false;
    if (mode === "recording") {
      stopWhisperRecording();
      return;
    }
    try { recRef.current?.stop(); } catch { /* noop */ }
    setMode((m) => (m === "webspeech" ? "idle" : m));
  }, [mode, stopWhisperRecording]);

  return { recording, transcribing, supported, start, stop };
}
