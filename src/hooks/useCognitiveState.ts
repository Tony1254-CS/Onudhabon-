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

export type AttentionSnap = {
  status: "off" | "loading" | "no-face" | "looking-away" | "stable" | "focused";
  faceMissingFor: number;
  awayCount30s: number;
};

export type TypingSnap = {
  keystrokes: number;
  backspaces: number;
  lastTypingTs: number;
  sessionStartTs: number;
};

export type CoachActionId =
  | "break-timer"
  | "switch-socratic"
  | "review-prereq"
  | "replay-last"
  | "ask-explain"
  | "challenge"
  | "stretch"
  | "ground-check";

export type CoachAction = { id: CoachActionId; label: string };

export type CoachingTip = {
  tip: string;
  nextAction: string;
  reason: string;
  actions?: CoachAction[];
};

export type CognitiveContext = {
  state: CognitiveState;
  totalMessages: number;
  idleSec: number;
  avgLen: number;
  cadenceSec: number;
  recentShort: number;
  lastLen: number;
  focusMinutes: number;
  questionBurst: number;        // ? marks in last 60s
  backspaceRatio: number;       // backspaces / keystrokes
  attention?: AttentionSnap;
  fragilePrereq?: string | null;
};

// ---- Priority rule engine ----
// Higher priority wins. First matching rule for the current state takes effect.
type CoachRule = {
  priority: number;
  match: (c: CognitiveContext) => boolean;
  build: (c: CognitiveContext) => CoachingTip;
};

const RULES: CoachRule[] = [
  // OVERLOADED — eyes wandering + short replies = visible fatigue
  {
    priority: 100,
    match: (c) => c.state === "overloaded" && (c.attention?.awayCount30s ?? 0) >= 4,
    build: () => ({
      tip: "তুমি বারবার অন্যদিকে তাকাচ্ছ আর উত্তরগুলোও ছোট হয়ে আসছে — চোখ ও মস্তিষ্ক দুটোই ক্লান্ত।",
      nextAction: "৫ মিনিটের ব্রেক — ২০ ফুট দূরে তাকাও",
      reason: "চোখ ঘুরছে + ছোট উত্তর",
      actions: [{ id: "break-timer", label: "৫ মিনিট টাইমার" }],
    }),
  },
  // OVERLOADED — generic
  {
    priority: 50,
    match: (c) => c.state === "overloaded",
    build: (c) => ({
      tip: `${c.recentShort}টি ছোট উত্তর পরপর — মাথায় চাপ পড়ছে। জোর করে এগোলে ভুলে যাবে।`,
      nextAction: "৫ মিনিট বিরতি, পানি খাও",
      reason: "কগনিটিভ ওভারলোড",
      actions: [{ id: "break-timer", label: "৫ মিনিট টাইমার" }],
    }),
  },

  // DISENGAGED — camera says no face
  {
    priority: 100,
    match: (c) => c.state === "disengaged" && (c.attention?.faceMissingFor ?? 0) > 20,
    build: (c) => ({
      tip: `তুমি ${Math.round(c.attention!.faceMissingFor)} সেকেন্ড ধরে সামনে নেই — ফিরে এসে এক লাইনে বলো কোথায় আটকেছ।`,
      nextAction: "ফিরে এসে টাইপ করো",
      reason: "ক্যামেরায় মুখ নেই",
      actions: [{ id: "ground-check", label: "আমি ফিরেছি" }],
    }),
  },
  // DISENGAGED — present but checked out
  {
    priority: 50,
    match: (c) => c.state === "disengaged",
    build: () => ({
      tip: "তুমি আছ কিন্তু মন নেই — উঠে দাঁড়াও, এক মিনিট হাঁটো, তারপর নিজের ভাষায় একটা প্রশ্ন লেখো।",
      nextAction: "১ মিনিট হাঁটো",
      reason: "এনগেজমেন্ট ড্রপ",
      actions: [{ id: "break-timer", label: "১ মিনিট ব্রেক" }],
    }),
  },

  // CONFUSED — repetitive questioning
  {
    priority: 90,
    match: (c) => c.state === "confused" && c.questionBurst >= 3,
    build: (c) => ({
      tip: "তুমি একই জিনিস বারবার জিজ্ঞেস করছ — মানে ভিত্তিতে একটা ফাঁক আছে। আগের ধাপে ফিরে যাই।",
      nextAction: "প্রয়োজনীয় ধারণা রিভিউ করো",
      reason: `${c.questionBurst}টি প্রশ্ন ১ মিনিটে`,
      actions: [{ id: "review-prereq", label: "প্রয়োজনীয় ধারণা" }],
    }),
  },
  // CONFUSED — fragile prerequisite
  {
    priority: 85,
    match: (c) => c.state === "confused" && !!c.fragilePrereq,
    build: (c) => ({
      tip: `এই বিভ্রান্তির শিকড় "${c.fragilePrereq}"-এ। ২ মিনিটের রিভিউ দিই?`,
      nextAction: "রিভিউ শুরু করো",
      reason: "দুর্বল ভিত্তি ধারণা",
      actions: [{ id: "review-prereq", label: "রিভিউ শুরু" }],
    }),
  },
  // CONFUSED — typing struggle
  {
    priority: 75,
    match: (c) => c.state === "confused" && c.backspaceRatio > 0.25,
    build: () => ({
      tip: "তুমি লিখছ আর মুছছ — চিন্তা গুছিয়ে আসছে না। আমাকে বলো ‘সহজভাবে ব্যাখ্যা করো’।",
      nextAction: "শেষ ব্যাখ্যা আবার শুনো",
      reason: "বেশি ব্যাকস্পেস",
      actions: [{ id: "replay-last", label: "আবার ব্যাখ্যা" }],
    }),
  },
  // CONFUSED — generic
  {
    priority: 30,
    match: (c) => c.state === "confused",
    build: (c) => ({
      tip: `উত্তর দিতে ${Math.round(c.cadenceSec)}s লাগছে — কোথাও আটকে আছ। সাহায্য চাইতে দ্বিধা করো না।`,
      nextAction: "আগের ধাপ রিভিউ করো",
      reason: "দীর্ঘ গ্যাপ",
      actions: [{ id: "replay-last", label: "আবার ব্যাখ্যা" }],
    }),
  },

  // FLOW — celebrate + push deeper
  {
    priority: 80,
    match: (c) => c.state === "flow" && c.focusMinutes > 15,
    build: (c) => ({
      tip: `তুমি ${Math.round(c.focusMinutes)} মিনিট গভীর মনোযোগে — দারুণ! এখন এমন একটা প্রশ্ন নাও যেটা সাধারণত এড়িয়ে যাও।`,
      nextAction: "একটা কঠিন প্রশ্ন নাও",
      reason: "দীর্ঘ ফ্লো",
      actions: [{ id: "challenge", label: "চ্যালেঞ্জ দাও" }],
    }),
  },
  {
    priority: 40,
    match: (c) => c.state === "flow",
    build: () => ({
      tip: "চিন্তা + দ্রুত প্রতিক্রিয়া — ফ্লো-তে আছ। ছন্দ ভাঙবে না।",
      nextAction: "চালিয়ে যাও",
      reason: "কোয়ালিটি + কনসিসটেন্সি",
      actions: [{ id: "stretch", label: "আরেকটু গভীরে" }],
    }),
  },

  // MASTERY-READY — push to Socratic
  {
    priority: 80,
    match: (c) => c.state === "mastery-ready" && c.attention?.status === "focused",
    build: () => ({
      tip: "তুমি প্রস্তুত — চোখ স্থির, ব্যাখ্যা গভীর। এবার নিজে শেখাও, যেন আমি ৫ বছরের বাচ্চা।",
      nextAction: "Socratic মোড চালু করো",
      reason: "গভীর উত্তর + স্থির মনোযোগ",
      actions: [{ id: "switch-socratic", label: "Socratic শুরু" }],
    }),
  },
  {
    priority: 40,
    match: (c) => c.state === "mastery-ready",
    build: () => ({
      tip: "তুমি ধারণাটা বুঝে ফেলেছ। নিজের ভাষায় একটা বাস্তব উদাহরণ দাও।",
      nextAction: "Socratic-এ পরীক্ষা দাও",
      reason: "Socratic-এ গভীর উত্তর",
      actions: [{ id: "switch-socratic", label: "Socratic শুরু" }],
    }),
  },

  // FOCUSED — gentle nudges
  {
    priority: 30,
    match: (c) => c.state === "focused",
    build: () => ({
      tip: "ভালো চলছে — গভীরতা বাড়াও। একটা ‘কেন’ প্রশ্ন নিজে লিখো।",
      nextAction: "৩ লাইনে সারাংশ দাও",
      reason: "স্থির মনোযোগ",
      actions: [{ id: "ask-explain", label: "‘কেন’ প্রশ্ন করো" }],
    }),
  },

  // EXPLORING — first messages
  {
    priority: 20,
    match: (c) => c.state === "exploring",
    build: () => ({
      tip: "তুমি ধারণাটা ছুঁয়ে দেখছ — আরেকটু গভীরে যাও। একটা নির্দিষ্ট প্রশ্ন দিয়ে শুরু করো।",
      nextAction: "‘এটা কেন হয়’ প্রশ্ন করো",
      reason: "নতুন এক্সপ্লোরেশন",
      actions: [{ id: "ask-explain", label: "প্রশ্ন তৈরি করো" }],
    }),
  },
];

function pickTip(ctx: CognitiveContext): CoachingTip {
  const matches = RULES.filter((r) => r.match(ctx)).sort((a, b) => b.priority - a.priority);
  if (matches.length) return matches[0].build(ctx);
  return {
    tip: STATE_META[ctx.state].tagline,
    nextAction: "চালিয়ে যাও",
    reason: "—",
  };
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
  actions: CoachAction[];
  timeline: StateTransition[];
  signals: {
    eyes: string;
    typing: string;
    pace: string;
    trend: string;
  };
};

export type CognitiveExtra = {
  attention?: AttentionSnap;
  typing?: TypingSnap;
  fragilePrereq?: string | null;
};

export function useCognitiveState(signals: Signal[], mode: "teaching" | "socratic", extra?: CognitiveExtra): CognitiveState {
  return useCognitiveMetrics(signals, mode, extra).state;
}

function classify(opts: {
  totalMessages: number; idleSec: number; avgLen: number; cadenceSec: number;
  recentShort: number; lastLen: number; mode: "teaching" | "socratic";
  attention?: AttentionSnap; questionBurst: number; backspaceRatio: number;
}): { state: CognitiveState; reason: string } {
  const { totalMessages, idleSec, avgLen, cadenceSec, recentShort, lastLen, mode, attention, questionBurst, backspaceRatio } = opts;

  // --- Hard attention overrides ---
  if (attention && attention.faceMissingFor > 25) {
    return { state: "disengaged", reason: `${Math.round(attention.faceMissingFor)}s সামনে নেই` };
  }
  if (attention && attention.awayCount30s >= 6 && recentShort >= 2) {
    return { state: "overloaded", reason: `চোখ ${attention.awayCount30s}× ঘুরেছে + ছোট উত্তর` };
  }
  if (attention && attention.awayCount30s >= 4 && avgLen > 60) {
    return { state: "confused", reason: `চোখ ঘুরছে কিন্তু লিখছ` };
  }

  // --- Behavioral signals ---
  if (questionBurst >= 3) return { state: "confused", reason: `${questionBurst}টি প্রশ্ন ১ মিনিটে` };
  if (backspaceRatio > 0.35 && totalMessages > 0) return { state: "confused", reason: `${Math.round(backspaceRatio * 100)}% ব্যাকস্পেস` };

  // --- Chat-driven baseline ---
  if (totalMessages === 0) return { state: "exploring", reason: "এখনও কোনো বার্তা নেই" };
  if (idleSec > 120) return { state: "disengaged", reason: `${Math.floor(idleSec)}s নিষ্ক্রিয়` };

  // Camera-boosted promotion to flow
  const camFocused = attention?.status === "focused";
  if (camFocused && avgLen > 100 && cadenceSec > 5 && cadenceSec < 80) {
    return { state: "flow", reason: `চোখ স্থির + গভীর উত্তর` };
  }

  if (mode === "socratic" && avgLen > 140 && recentShort === 0) return { state: "flow", reason: `Socratic-এ গড় ${Math.round(avgLen)} অক্ষর` };
  if (avgLen > 120 && cadenceSec > 8 && cadenceSec < 60) return { state: "flow", reason: `গভীর উত্তর + স্থির ছন্দ ${Math.round(cadenceSec)}s` };
  if (mode === "socratic" && avgLen > 100) return { state: "mastery-ready", reason: `Socratic-এ গড় ${Math.round(avgLen)} অক্ষর` };
  if (recentShort >= 3) return { state: "overloaded", reason: `${recentShort}টি ছোট উত্তর পরপর` };
  if (cadenceSec > 60 && totalMessages > 1) return { state: "confused", reason: `${Math.round(cadenceSec)}s গড় গ্যাপ` };
  if (lastLen < 10 && totalMessages > 1) return { state: "disengaged", reason: `শেষ উত্তর ${lastLen} অক্ষর` };
  if (avgLen > 60) return { state: "focused", reason: `গড় ${Math.round(avgLen)} অক্ষর` };
  return { state: "exploring", reason: `গড় ${Math.round(avgLen)} অক্ষর` };
}

export function useCognitiveMetrics(signals: Signal[], mode: "teaching" | "socratic", extra?: CognitiveExtra): CognitiveMetrics {
  const [now, setNow] = useState(Date.now());
  const focusStartRef = useRef<number | null>(null);
  const lastStateRef = useRef<CognitiveState | null>(null);
  const timelineRef = useRef<StateTransition[]>([]);
  const stableSinceRef = useRef<number>(Date.now());
  const candidateRef = useRef<CognitiveState | null>(null);
  const [, forceTimeline] = useState(0);

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

    // Question-mark burst in last 60s (approximated by short signals heuristic — caller
    // can refine via extra.typing if needed). We don't see text content here, so estimate
    // by short, frequent sends as a proxy for "lots of quick questions".
    const last60s = userSignals.filter((s) => now - s.ts < 60000);
    const questionBurst = last60s.length >= 4 && avgLen < 40 ? last60s.length : 0;

    // Backspace ratio from typing metrics
    const backspaceRatio = extra?.typing && extra.typing.keystrokes > 20
      ? extra.typing.backspaces / extra.typing.keystrokes
      : 0;

    const { state: rawState, reason } = classify({
      totalMessages, idleSec, avgLen, cadenceSec, recentShort,
      lastLen: last?.length ?? 0, mode,
      attention: extra?.attention,
      questionBurst,
      backspaceRatio,
    });

    // Hysteresis (kept from prior implementation)
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

    if (lastStateRef.current !== state) {
      timelineRef.current = [
        { state, ts: now, reason },
        ...timelineRef.current,
      ].slice(0, 8);
      lastStateRef.current = state;
      queueMicrotask(() => forceTimeline((n) => n + 1));
    }

    if (state === "flow" || state === "focused" || state === "mastery-ready") {
      if (focusStartRef.current === null) focusStartRef.current = now;
    } else {
      focusStartRef.current = null;
    }
    const focusMinutes = focusStartRef.current ? (now - focusStartRef.current) / 60000 : 0;

    let flowScore = 30;
    if (state === "flow") flowScore = 92;
    else if (state === "mastery-ready") flowScore = 80;
    else if (state === "focused") flowScore = 68;
    else if (state === "exploring") flowScore = 50;
    else if (state === "confused") flowScore = 35;
    else if (state === "overloaded") flowScore = 18;
    else if (state === "disengaged") flowScore = 12;
    flowScore = Math.min(100, Math.round(flowScore + Math.min(focusMinutes, 10)));

    const ctx: CognitiveContext = {
      state, totalMessages, idleSec, avgLen, cadenceSec, recentShort,
      lastLen: last?.length ?? 0, focusMinutes,
      questionBurst, backspaceRatio,
      attention: extra?.attention, fragilePrereq: extra?.fragilePrereq ?? null,
    };
    const coach = pickTip(ctx);

    // Signals row — make engine legible
    const eyes = extra?.attention
      ? extra.attention.status === "focused" ? "স্থির 👁"
        : extra.attention.status === "stable" ? "ঠিক আছে"
        : extra.attention.status === "looking-away" ? `${extra.attention.awayCount30s}× ঘুরছে`
        : extra.attention.status === "no-face" ? `${Math.round(extra.attention.faceMissingFor)}s নেই`
        : extra.attention.status === "loading" ? "শুরু…" : "বন্ধ"
      : "—";
    const typingChip = extra?.typing && extra.typing.keystrokes > 0
      ? `${Math.round(backspaceRatio * 100)}% মুছছ`
      : "—";
    const paceChip = cadenceSec > 0 ? `${Math.round(cadenceSec)}s/বার্তা` : "—";
    const trendChip = focusMinutes >= 1 ? `${focusMinutes.toFixed(1)}m ফ্লো`
      : idleSec > 30 ? `${Math.round(idleSec)}s নিষ্ক্রিয়` : "শুরু";

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
      actions: coach.actions ?? [],
      timeline: timelineRef.current,
      signals: { eyes, typing: typingChip, pace: paceChip, trend: trendChip },
    };
  }, [signals, mode, now, extra]);
}
