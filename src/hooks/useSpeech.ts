import { useCallback, useEffect, useRef, useState } from "react";

type Listener = () => void;

const speechState = {
  supported: false,
  speaking: false,
  voices: [] as SpeechSynthesisVoice[],
  initialized: false,
  listeners: new Set<Listener>(),
};

function notify() {
  speechState.listeners.forEach((listener) => listener());
}

function syncVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechState.supported = true;
  speechState.voices = window.speechSynthesis.getVoices();
  notify();
}

function ensureSpeechReady() {
  if (speechState.initialized || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechState.initialized = true;
  speechState.supported = true;
  syncVoices();
  window.speechSynthesis.onvoiceschanged = syncVoices;
}

function stripMarkdown(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[>#*_~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreVoice(voice: SpeechSynthesisVoice, lang: string) {
  const target = lang.toLowerCase();
  const voiceLang = (voice.lang || "").toLowerCase();
  const name = (voice.name || "").toLowerCase();

  if (voiceLang === target) return 100;
  if (voiceLang.startsWith(target.split("-")[0])) return 90;
  if (name.includes("bangla") || name.includes("bengali") || name.includes("বাংলা")) return 85;
  return 0; // never use hi/en for Bangla — sounds wrong
}

function pickVoice(lang: string) {
  const ranked = speechState.voices
    .map((voice) => ({ voice, score: scoreVoice(voice, lang) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked[0].voice : undefined;
}

async function waitForVoices() {
  if (speechState.voices.length || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  await new Promise<void>((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      syncVoices();
      if (speechState.voices.length || Date.now() - started > 1200) {
        window.clearInterval(timer);
        resolve();
      }
    }, 120);
  });
}

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-bangla`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Split long text on sentence boundaries (Bangla daari ও পূর্ণচ্ছেদ included)
function splitForTTS(text: string, maxLen = 240): string[] {
  const sentences = text
    .split(/(?<=[।!?\.])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if ((buf + " " + s).trim().length > maxLen && buf) {
      chunks.push(buf.trim());
      buf = s;
    } else {
      buf = (buf ? buf + " " : "") + s;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

const audioCache = new Map<string, string>(); // text -> object URL

async function fetchTTSAudio(text: string): Promise<string | null> {
  const key = text.slice(0, 200);
  const cached = audioCache.get(key);
  if (cached) return cached;
  try {
    const r = await fetch(TTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, apikey: KEY },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) return null;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    audioCache.set(key, url);
    if (audioCache.size > 30) {
      const first = audioCache.keys().next().value;
      if (first) {
        const u = audioCache.get(first);
        if (u) URL.revokeObjectURL(u);
        audioCache.delete(first);
      }
    }
    return url;
  } catch {
    return null;
  }
}

export function useSpeech() {
  const [, setTick] = useState(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    ensureSpeechReady();
    const listener = () => setTick((v) => v + 1);
    speechState.listeners.add(listener);
    return () => {
      speechState.listeners.delete(listener);
    };
  }, []);

  const stopAudioEl = useCallback(() => {
    const el = audioElRef.current;
    if (el) {
      try { el.pause(); el.src = ""; } catch { /* noop */ }
      audioElRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    }
    stopAudioEl();
    speechState.speaking = false;
    notify();
  }, [stopAudioEl]);

  const speakBrowser = useCallback(async (text: string, lang: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    ensureSpeechReady();
    await waitForVoices();
    const voice = pickVoice(lang);
    if (!voice) return false; // no real Bangla voice — caller should fall back
    return new Promise<boolean>((resolve) => {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.voice = voice;
        u.rate = 0.95;
        u.pitch = 1;
        u.onstart = () => { speechState.speaking = true; notify(); };
        u.onend = () => { speechState.speaking = false; notify(); resolve(true); };
        u.onerror = () => { speechState.speaking = false; notify(); resolve(false); };
        window.speechSynthesis.speak(u);
      } catch {
        resolve(false);
      }
    });
  }, []);

  const speakServer = useCallback(async (text: string) => {
    cancelledRef.current = false;
    speechState.speaking = true;
    notify();
    const chunks = splitForTTS(text);
    // Pre-fetch in parallel for smooth playback
    const urlsP = chunks.map((c) => fetchTTSAudio(c));
    for (let i = 0; i < chunks.length; i++) {
      if (cancelledRef.current) break;
      const url = await urlsP[i];
      if (!url || cancelledRef.current) continue;
      const audio = new Audio(url);
      audioElRef.current = audio;
      try {
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      } catch { /* noop */ }
    }
    audioElRef.current = null;
    speechState.speaking = false;
    notify();
    return true;
  }, []);

  const speak = useCallback(async (text: string, lang = "bn-BD") => {
    const cleanText = stripMarkdown(text);
    if (!cleanText) return false;
    cancelledRef.current = false;

    // Try browser first only if there's an actual Bangla voice
    const ok = await speakBrowser(cleanText, lang);
    if (ok) return true;
    if (cancelledRef.current) return false;

    // Server Bangla TTS fallback
    return speakServer(cleanText);
  }, [speakBrowser, speakServer]);

  const hasBanglaVoice = speechState.voices.some((voice) => scoreVoice(voice, "bn-BD") >= 85);

  return {
    supported: true, // server fallback is always available
    speaking: speechState.speaking,
    speak,
    cancel,
    hasBanglaVoice,
  };
}
