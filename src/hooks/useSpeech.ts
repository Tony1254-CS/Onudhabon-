import { useCallback, useEffect, useState } from "react";

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
  if (voiceLang.startsWith("hi")) return 40;
  if (voiceLang.startsWith("en")) return 20;
  return 0;
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

export function useSpeech() {
  const [, setTick] = useState(0);

  useEffect(() => {
    ensureSpeechReady();
    const listener = () => setTick((v) => v + 1);
    speechState.listeners.add(listener);
    return () => {
      speechState.listeners.delete(listener);
    };
  }, []);

  const speak = useCallback(async (text: string, lang = "bn-BD") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    ensureSpeechReady();
    await waitForVoices();

    const cleanText = stripMarkdown(text);
    if (!cleanText) return false;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      const voice = pickVoice(lang) ?? pickVoice("hi-IN") ?? pickVoice("en-US");
      if (voice) utterance.voice = voice;
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.onstart = () => {
        speechState.speaking = true;
        notify();
      };
      utterance.onend = () => {
        speechState.speaking = false;
        notify();
      };
      utterance.onerror = () => {
        speechState.speaking = false;
        notify();
      };
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      speechState.speaking = false;
      notify();
      return false;
    }
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // noop
    }
    speechState.speaking = false;
    notify();
  }, []);

  const hasBanglaVoice = speechState.voices.some((voice) => scoreVoice(voice, "bn-BD") >= 85);

  return {
    supported: speechState.supported,
    speaking: speechState.speaking,
    speak,
    cancel,
    hasBanglaVoice,
  };
}