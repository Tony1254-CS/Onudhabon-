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

export type CoachingTip = { tip: string; nextAction: string; reason: string };

const COACH: Record<CognitiveState, CoachingTip[]> = {
  flow: [
    { tip: "তুমি বিস্তারিত ব্যাখ্যা করছ — এটাই গভীর শেখার চিহ্ন।", nextAction: "আরেকটা ‘কেন’ প্রশ্নের উত্তর দাও", reason: "বড় উত্তর + স্থির ছন্দ" },
    { tip: "চিন্তা + দ্রুত প্রতিক্রিয়া — ফ্লো-তে আছ।", nextAction: "ছন্দ ভাঙবে না — চালিয়ে যাও", reason: "কোয়ালিটি + কনসিসটেন্সি" },
    { tip: "এখন সবচেয়ে কঠিন প্রশ্নটা সমাধান করো।", nextAction: "একটা চ্যালেঞ্জিং সমস্যা নাও", reason: "ফ্লো রাইডে আছ" },
  ],
  focused: [
    { tip: "ভালো চলছে — গভীরতা বাড়াও।", nextAction: "একটা ‘কেন’ প্রশ্ন করো", reason: "মাঝারি দৈর্ঘ্যের উত্তর" },
    { tip: "এই বিষয়ে নিজের ভাষায় সারমর্ম লেখো।", nextAction: "৩ লাইনে সারাংশ দাও", reason: "মনোযোগ স্থির" },
  ],
  "mastery-ready": [
    { tip: "তুমি ধারণাটা বুঝে ফেলেছ। নিজের ভাষায় উদাহরণ দাও।", nextAction: "একটা বাস্তব উদাহরণ লেখো", reason: "Socratic মোডে গভীর উত্তর" },
    { tip: "এবার সক্রেটিক টেস্টে পরীক্ষা দাও।", nextAction: "Socratic শুরু করো", reason: "ধারণা প্রায় আয়ত্তে" },
  ],
  exploring: [
    { tip: "তুমি ধারণাটা ছুঁয়ে দেখছ। আরেকটু গভীরে যাও।", nextAction: "বিস্তারিত উত্তর লেখো", reason: "ছোট/অগভীর উত্তর" },
    { tip: "একটা নির্দিষ্ট প্রশ্ন দিয়ে শুরু করো।", nextAction: "‘এটা কেন হয়’ প্রশ্ন করো", reason: "নতুন এক্সপ্লোরেশন" },
  ],
  confused: [
    { tip: "উত্তর দিতে সময় লাগছে — কোথাও আটকে আছ।", nextAction: "‘ব্যাখ্যা করো’ লিখে সাহায্য চাও", reason: "৬০ সেকেন্ডের বেশি গ্যাপ" },
    { tip: "আগের উত্তর আবার পড়ে দেখো।", nextAction: "আগের ধাপ রিভিউ করো", reason: "ছন্দ ভেঙে গেছে" },
  ],
  overloaded: [
    { tip: "অনেকগুলো ছোট উত্তর — মাথায় চাপ পড়ছে।", nextAction: "৫ মিনিট বিরতি নাও", reason: "৩+ ছোট উত্তর পরপর" },
    { tip: "ব্রেইনকে রিসেট দাও — পানি খাও, একটু হাঁটো।", nextAction: "টাইমার সেট করো", reason: "কগনিটিভ ওভারলোড" },
  ],
  disengaged: [
    { tip: "মনোযোগ ভেঙে যাচ্ছে — উঠে দাঁড়াও, একটু হাঁটো।", nextAction: "১ মিনিট ব্রেক নাও", reason: "দীর্ঘ নিষ্ক্রিয়তা" },
    { tip: "ছোট ছোট উত্তর — মনোযোগ কমছে।", nextAction: "পুরো বাক্যে উত্তর দাও", reason: "এনগেজমেন্ট ড্রপ" },
  ],
};

function pickCoach(state: CognitiveState, seed: number): CoachingTip {
  const list = COACH[state];
  return list[seed % list.length];
}

export type StateTransition = {
  state: CognitiveState;
  ts: number;
  reason: string;
};

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
  reason: string;
  timeline: StateTransition[];
};

export function useCognitiveState(signals: Signal[], mode: "teaching" | "socratic"): CognitiveState {
  return useCognitiveMetrics(signals, mode).state;
}

function classify(opts: {
  totalMessages: number; idleSec: number; avgLen: number; cadenceSec: number;
  recentShort: number; lastLen: number; mode: "teaching" | "socratic";
}): { state: CognitiveState; reason: string } {
  const { totalMessages, idleSec, avgLen, cadenceSec, recentShort, lastLen, mode } = opts;

  if (totalMessages === 0) return { state: "exploring", reason: "এখনও কোনো বার্তা নেই" };
  if (idleSec > 120) return { state: "disengaged", reason: `${Math.floor(idleSec)}s নিষ্ক্রিয়` };
  if (mode === "socratic" && avgLen > 140 && recentShort === 0) return { state: "flow", reason: `Socratic-এ গড় ${Math.round(avgLen)} অক্ষর` };
  if (avgLen > 120 && cadenceSec > 8 && cadenceSec < 60) return { state: "flow", reason: `গভীর উত্তর + স্থির ছন্দ ${Math.round(cadenceSec)}s` };
  if (mode === "socratic" && avgLen > 100) return { state: "mastery-ready", reason: `Socratic-এ গড় ${Math.round(avgLen)} অক্ষর` };
  if (recentShort >= 3) return { state: "overloaded", reason: `${recentShort}টি ছোট উত্তর পরপর` };
  if (cadenceSec > 60 && totalMessages > 1) return { state: "confused", reason: `${Math.round(cadenceSec)}s গড় গ্যাপ` };
  if (lastLen < 10 && totalMessages > 1) return { state: "disengaged", reason: `শেষ উত্তর ${lastLen} অক্ষর` };
  if (avgLen > 60) return { state: "focused", reason: `গড় ${Math.round(avgLen)} অক্ষর` };
  return { state: "exploring", reason: `গড় ${Math.round(avgLen)} অক্ষর` };
}

export function useCognitiveMetrics(signals: Signal[], mode: "teaching" | "socratic"): CognitiveMetrics {
  const [now, setNow] = useState(Date.now());
  const focusStartRef = useRef<number | null>(null);
  const lastStateRef = useRef<CognitiveState | null>(null);
  const timelineRef = useRef<StateTransition[]>([]);
  const stableSinceRef = useRef<number>(Date.now());
  const candidateRef = useRef<CognitiveState | null>(null);
  const [, forceTimeline] = useState(0);

  // Tick more often so state never feels "stuck"
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
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

    const { state: rawState, reason } = classify({
      totalMessages, idleSec, avgLen, cadenceSec, recentShort,
      lastLen: last?.length ?? 0, mode,
    });

    // Hysteresis: require a candidate to persist >=4s before committing.
    // This prevents jittering AND ensures we always escape "focused" once
    // signals shift (e.g. idle, short replies).
    let state = lastStateRef.current ?? rawState;
    if (candidateRef.current !== rawState) {
      candidateRef.current = rawState;
      stableSinceRef.current = now;
    }
    const stableFor = (now - stableSinceRef.current) / 1000;
    const forceImmediate = rawState === "overloaded" || rawState === "disengaged" || rawState === "flow";
    if (rawState !== state && (stableFor >= 4 || forceImmediate)) {
      state = rawState;
    }
    if (lastStateRef.current === null) state = rawState;

    // Record transition into the timeline
    if (lastStateRef.current !== state) {
      timelineRef.current = [
        { state, ts: now, reason },
        ...timelineRef.current,
      ].slice(0, 8);
      lastStateRef.current = state;
      // schedule a re-render so timeline updates show up
      queueMicrotask(() => forceTimeline((n) => n + 1));
    }

    // Continuous focus duration
    if (state === "flow" || state === "focused" || state === "mastery-ready") {
      if (focusStartRef.current === null) focusStartRef.current = now;
    } else {
      focusStartRef.current = null;
    }
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

    // Rotate coaching tips so messages don't feel static
    const seed = Math.floor(now / 12000) + totalMessages;
    const coach = pickCoach(state, seed);

    return {
      state,
      flowScore,
      focusMinutes,
      totalMessages,
      avgResponseLength: avgLen,
      cadenceSec,
      idleSec,
      tip: coach.tip,
      nextAction: coach.nextAction,
      reason,
      timeline: timelineRef.current,
    };
  }, [signals, mode, now]);
}
