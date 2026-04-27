import { useEffect, useRef, useState } from "react";

export type CognitiveState = "focused" | "confused" | "overloaded" | "disengaged" | "mastery-ready" | "exploring";

export const STATE_META: Record<CognitiveState, { icon: string; label: string; color: string; glow: string }> = {
  focused:        { icon: "🎯", label: "মনোযোগী",          color: "#3B82F6", glow: "rgba(59,130,246,0.4)" },
  confused:       { icon: "😕", label: "বিভ্রান্ত",         color: "#F97316", glow: "rgba(249,115,22,0.4)" },
  overloaded:     { icon: "🔥", label: "অতিরিক্ত চাপ",      color: "#EF4444", glow: "rgba(239,68,68,0.4)" },
  disengaged:     { icon: "💤", label: "অমনোযোগী",          color: "#6B7280", glow: "rgba(107,114,128,0.4)" },
  "mastery-ready":{ icon: "🚀", label: "আয়ত্তের কাছাকাছি", color: "#F59E0B", glow: "rgba(245,158,11,0.45)" },
  exploring:      { icon: "🔍", label: "অনুসন্ধানী",        color: "#8B5CF6", glow: "rgba(139,92,246,0.4)" },
};

export type Signal = { ts: number; type: "send" | "receive"; length: number };

export function useCognitiveState(signals: Signal[], mode: "teaching" | "socratic"): CognitiveState {
  const [state, setState] = useState<CognitiveState>("focused");
  const lastEval = useRef(0);

  useEffect(() => {
    const compute = () => {
      const now = Date.now();
      lastEval.current = now;
      const userSignals = signals.filter(s => s.type === "send");
      if (userSignals.length === 0) { setState("focused"); return; }

      const last = userSignals[userSignals.length - 1];
      const prev = userSignals[userSignals.length - 2];
      const gap = prev ? last.ts - prev.ts : 0;
      const avgLen = userSignals.slice(-3).reduce((a, s) => a + s.length, 0) / Math.min(3, userSignals.length);
      const recentShort = userSignals.slice(-3).filter(s => s.length < 15).length;

      // Long detailed in socratic = mastery
      if (mode === "socratic" && avgLen > 120) { setState("mastery-ready"); return; }
      // Many short retries
      if (recentShort >= 3) { setState("overloaded"); return; }
      // Long gap between messages
      if (gap > 30000) { setState("confused"); return; }
      // Very short single response
      if (last.length < 10 && userSignals.length > 1) { setState("disengaged"); return; }
      // Long answer
      if (avgLen > 80) { setState("focused"); return; }
      // Default exploring
      setState("exploring");
    };
    compute();
    const id = setInterval(compute, 30000);
    return () => clearInterval(id);
  }, [signals, mode]);

  return state;
}
