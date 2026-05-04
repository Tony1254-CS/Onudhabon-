import { useEffect, useMemo, useRef, useState } from "react";

export type CognitiveState = "focused" | "confused" | "overloaded" | "disengaged" | "mastery-ready" | "exploring" | "flow";

export const STATE_META: Record<CognitiveState, { icon: string; label: string; color: string; glow: string; tagline: string }> = {
  flow:           { icon: "🌊", label: "ফ্লো স্টেট",          color: "#22D3EE", glow: "rgba(34,211,238,0.55)", tagline: "চমৎকার! তুমি এখন গভীর মনোযোগে আছো — এই ছন্দ ধরে রাখো।" },
  focused:        { icon: "🎯", label: "মনোযোগী",          color: "#3B82F6", glow: "rgba(59,130,246,0.4)",  tagline: "ভালো গতিতে চলছ — আরেকটু গভীরে গেলে ফ্লো-তে পৌঁছাবে।" },
  "mastery-ready":{ icon: "🚀", label: "আয়ত্তের কাছাকাছি", color: "#F59E0B", glow: "rgba(245,158,11,0.45)", tagline: "তুমি প্রায় আয়ত্ত করে ফেলেছ — এখন একটা চ্যালেঞ্জ নাও।" },
  exploring:      { icon: "🔍", label: "অনুসন্ধানী",        color: "#8B5CF6", glow: "rgba(139,92,246,0.4)",  tagline: "নতুন কিছু খুঁজছ — প্রশ্ন করো, পরীক্ষা করো।" },
  confused:       { icon: "😕", label: "বিভ্রান্ত",         color: "#F97316", glow: "rgba(249,115,22,0.4)",  tagline: "একটু থামো — আগের ধাপে ফিরে গিয়ে আবার দেখো।" },
  overloaded:     { icon: "🔥", label: "অতিরিক্ত চাপ",      color: "#EF4444", glow: "rgba(239,68,68,0.4)",   tagline: "ব্রেইন ক্লান্ত। ৫ মিনিট বিরতি নাও, পানি খাও।" },
  disengaged:     { icon: "💤", label: "অমনোযোগী",          color: "#6B7280", glow: "rgba(107,114,128,0.4)", tagline: "মনোযোগ ভেঙে যাচ্ছে — উঠে দাঁড়াও, একটু হাঁটো।" },
};

export type Signal = { ts: number; type: "send" | "receive"; length: number };

export type CognitiveMetrics = {
  state: CognitiveState;
  flowScore: number;        // 0..100
  focusMinutes: number;     // continuous focus session
  totalMessages: number;
  avgResponseLength: number;
  cadenceSec: number;       // avg time between sends
  idleSec: number;          // since last interaction
  tip: string;
  nextAction: string;
};

export function useCognitiveState(signals: Signal[], mode: "teaching" | "socratic"): CognitiveState {
  return useCognitiveMetrics(signals, mode).state;
}

export function useCognitiveMetrics(signals: Signal[], mode: "teaching" | "socratic"): CognitiveMetrics {
  const [now, setNow] = useState(Date.now());
  const focusStartRef = useRef<number | null>(null);
  const lastStateRef = useRef<CognitiveState>("exploring");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const userSignals = signals.filter((s) => s.type === "send");
    const last = userSignals[userSignals.length - 1];
    const idleSec = last ? (now - last.ts) / 1000 : 0;
    const totalMessages = userSignals.length;
    const recent = userSignals.slice(-5);
    const avgLen = recent.length ? recent.reduce((a, s) => a + s.length, 0) / recent.length : 0;
    const gaps: number[] = [];
    for (let i = 1; i < recent.length; i++) gaps.push((recent[i].ts - recent[i - 1].ts) / 1000);
    const cadenceSec = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    const recentShort = recent.filter((s) => s.length < 15).length;

    let state: CognitiveState = "exploring";
    let tip = "একটা প্রশ্ন দিয়ে শুরু করো।";
    let nextAction = "একটা টপিক বেছে নাও।";

    if (totalMessages === 0) {
      state = "exploring";
      tip = "যেকোনো বিষয় টাইপ করো — অনুধাবন তোমাকে গাইড করবে।";
      nextAction = "প্রথম প্রশ্ন লেখো";
    } else if (idleSec > 120) {
      state = "disengaged";
      tip = "২ মিনিটের বেশি কোনো সাড়া নেই। ব্রেইনকে জাগাও।";
      nextAction = "একটা ছোট প্রশ্ন পাঠাও";
    } else if (mode === "socratic" && avgLen > 140 && recentShort === 0) {
      state = "flow";
      tip = "তুমি বিস্তারিত ব্যাখ্যা করছ — এটাই গভীর শেখার চিহ্ন।";
      nextAction = "আরেকটা ‘কেন’ প্রশ্নের উত্তর দাও";
    } else if (avgLen > 120 && cadenceSec > 8 && cadenceSec < 60) {
      state = "flow";
      tip = "চিন্তা + দ্রুত প্রতিক্রিয়া — ফ্লো-তে আছ।";
      nextAction = "ছন্দ ভাঙবে না — চালিয়ে যাও";
    } else if (mode === "socratic" && avgLen > 100) {
      state = "mastery-ready";
      tip = "তুমি ধারণাটা বুঝে ফেলেছ। এবার নিজের ভাষায় উদাহরণ দাও।";
      nextAction = "একটা বাস্তব উদাহরণ লেখো";
    } else if (recentShort >= 3) {
      state = "overloaded";
      tip = "অনেকগুলো ছোট উত্তর — মাথায় চাপ পড়ছে।";
      nextAction = "৫ মিনিট বিরতি নাও";
    } else if (cadenceSec > 60 && totalMessages > 1) {
      state = "confused";
      tip = "উত্তর দিতে সময় লাগছে — কোথাও আটকে আছ।";
      nextAction = "‘ব্যাখ্যা করো’ লিখে সাহায্য চাও";
    } else if (last && last.length < 10 && totalMessages > 1) {
      state = "disengaged";
      tip = "ছোট ছোট উত্তর — মনোযোগ কমছে।";
      nextAction = "পুরো বাক্যে উত্তর দাও";
    } else if (avgLen > 60) {
      state = "focused";
      tip = "ভালো চলছে — গভীরতা বাড়াও।";
      nextAction = "একটা ‘কেন’ প্রশ্ন করো";
    } else {
      state = "exploring";
      tip = "তুমি ধারণাটা ছুঁয়ে দেখছ। আরেকটু গভীরে যাও।";
      nextAction = "বিস্তারিত উত্তর লেখো";
    }

    // Track continuous focus duration
    if (state === "flow" || state === "focused" || state === "mastery-ready") {
      if (focusStartRef.current === null || lastStateRef.current === "disengaged" || lastStateRef.current === "overloaded") {
        focusStartRef.current = now;
      }
    } else {
      focusStartRef.current = null;
    }
    lastStateRef.current = state;

    const focusMinutes = focusStartRef.current ? (now - focusStartRef.current) / 60000 : 0;

    // Flow score 0..100
    let flowScore = 30;
    if (state === "flow") flowScore = 92;
    else if (state === "mastery-ready") flowScore = 80;
    else if (state === "focused") flowScore = 68;
    else if (state === "exploring") flowScore = 50;
    else if (state === "confused") flowScore = 35;
    else if (state === "overloaded") flowScore = 18;
    else if (state === "disengaged") flowScore = 12;
    flowScore = Math.min(100, Math.round(flowScore + Math.min(focusMinutes, 10)));

    return { state, flowScore, focusMinutes, totalMessages, avgResponseLength: avgLen, cadenceSec, idleSec, tip, nextAction };
  }, [signals, mode, now]);
}
