import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser TTS via Web Speech Synthesis. Picks a Bangla voice when available,
 * falls back to default. Exposes speak/cancel and a speaking flag.
 */
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null as any;
    };
  }, []);

  const pickVoice = useCallback((lang: string) => {
    const voices = voicesRef.current;
    if (!voices.length) return undefined;
    const exact = voices.find((v) => v.lang?.toLowerCase() === lang.toLowerCase());
    if (exact) return exact;
    const prefix = lang.split("-")[0].toLowerCase();
    return voices.find((v) => v.lang?.toLowerCase().startsWith(prefix));
  }, []);

  const speak = useCallback((text: string, lang = "bn-BD") => {
    if (!supported || !text.trim()) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      const v = pickVoice(lang) ?? pickVoice("hi-IN") ?? pickVoice("en-US");
      if (v) u.voice = v;
      u.rate = 1;
      u.pitch = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  }, [supported, pickVoice]);

  const cancel = useCallback(() => {
    if (!supported) return;
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
