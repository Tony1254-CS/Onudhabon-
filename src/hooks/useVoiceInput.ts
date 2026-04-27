import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface SR extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
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
  cbRef.current = onTranscript;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = useCallback(async () => {
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

    const rec: SR = new SR();
    rec.lang = "bn-BD";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => setRecording(true);
    rec.onresult = (e: any) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) cbRef.current(final, true);
      else if (interim) cbRef.current(interim, false);
    };
    rec.onerror = (e: any) => {
      const code = e?.error ?? "unknown";
      if (code === "no-speech") {
        toast.message("কোনো কথা শোনা যায়নি।");
      } else if (code === "not-allowed" || code === "service-not-allowed") {
        toast.error("মাইক্রোফোনের অনুমতি দরকার।");
      } else if (code === "network") {
        toast.error("ভয়েস স্বীকৃতি সার্ভারে পৌঁছানো যায়নি (network)।");
      } else if (code !== "aborted") {
        toast.error("ভয়েস ত্রুটি: " + code);
      }
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    recRef.current = rec;
    try {
      rec.start();
    } catch (err: any) {
      toast.error("ভয়েস শুরু করা যায়নি: " + (err?.message ?? "unknown"));
      setRecording(false);
    }
  }, []);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* noop */ }
    setRecording(false);
  }, []);

  return { recording, supported, start, stop };
}
