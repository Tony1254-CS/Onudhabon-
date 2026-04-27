import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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

export function useVoiceInput(onTranscript: (text: string, final: boolean) => void) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SR | null>(null);
  const cbRef = useRef(onTranscript);
  const shouldContinueRef = useRef(false);
  const baseTextRef = useRef("");
  const finalTextRef = useRef("");
  cbRef.current = onTranscript;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
    return () => {
      shouldContinueRef.current = false;
      try { recRef.current?.abort(); } catch { /* noop */ }
    };
  }, []);

  const createRecognition = useCallback((SR: any) => {
    const rec: SR = new SR();
    rec.lang = "bn-BD";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => setRecording(true);
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
      if (code === "no-speech") {
        toast.message("কথা শোনা যাচ্ছে না — আবার বলো।");
      } else if (code === "not-allowed" || code === "service-not-allowed") {
        shouldContinueRef.current = false;
        toast.error("মাইক্রোফোনের অনুমতি দরকার।");
      } else if (code === "audio-capture") {
        shouldContinueRef.current = false;
        toast.error("মাইক্রোফোন থেকে অডিও ধরা যাচ্ছে না।");
      } else if (code === "network") {
        toast.error("ভয়েস স্বীকৃতির সংযোগ বিচ্ছিন্ন হয়েছে।");
      } else if (code !== "aborted") {
        toast.error("ভয়েস ত্রুটি: " + code);
      }
      if (code !== "no-speech") setRecording(false);
    };
    rec.onend = () => {
      if (!shouldContinueRef.current) {
        setRecording(false);
        recRef.current = null;
        return;
      }
      window.setTimeout(() => {
        if (!shouldContinueRef.current) return;
        try {
          recRef.current = createRecognition(SR);
          recRef.current.start();
        } catch {
          setRecording(false);
        }
      }, 150);
    };
    return rec;
  }, []);

  const start = useCallback(async (initialText = "") => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("এই ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়। Chrome ব্যবহার করো।");
      return;
    }

    // Explicitly request mic permission first — gives a clear error if denied.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We don't need the stream — Web Speech opens its own. Release immediately.
      stream.getTracks().forEach((t) => t.stop());
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

    shouldContinueRef.current = true;
    baseTextRef.current = initialText.trim();
    finalTextRef.current = initialText.trim();

    try { recRef.current?.abort(); } catch { /* noop */ }
    recRef.current = createRecognition(SR);
    try {
      recRef.current.start();
    } catch (err: any) {
      shouldContinueRef.current = false;
      toast.error("ভয়েস শুরু করা যায়নি: " + (err?.message ?? "unknown"));
      setRecording(false);
    }
  }, [createRecognition]);

  const stop = useCallback(() => {
    shouldContinueRef.current = false;
    try { recRef.current?.stop(); } catch { /* noop */ }
    setRecording(false);
  }, []);

  return { recording, supported, start, stop };
}
