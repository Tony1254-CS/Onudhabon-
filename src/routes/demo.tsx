import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pause, Play, Sparkles, GraduationCap, Stars } from "lucide-react";
import { DEMO_RESPONSES } from "@/data/demo-cache";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo — অনুধাবন AI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoPage,
});

const DEMO = DEMO_RESPONSES.electric_current_teach;

type StepDef = { at: number; id: number; label: string };
const STEPS: StepDef[] = [
  { at: 0, id: 1, label: "Topic" },
  { at: 2000, id: 2, label: "Stream" },
  { at: 5000, id: 3, label: "CTA glow" },
  { at: 7000, id: 4, label: "Socratic" },
  { at: 9000, id: 5, label: "Student types" },
  { at: 11000, id: 6, label: "Mind map" },
  { at: 14000, id: 7, label: "State shift" },
  { at: 16000, id: 8, label: "Result" },
  { at: 18000, id: 9, label: "Galaxy" },
  { at: 20000, id: 10, label: "Star ignites" },
];
const FINAL_AT = 22000;
const TOTAL_DURATION = 24000;

function DemoPage() {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const startRef = useRef<number>(performance.now());
  const pausedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Timeline driver
  useEffect(() => {
    const tick = () => {
      if (!paused) {
        const now = performance.now();
        const t = now - startRef.current;
        setElapsed(Math.min(t, TOTAL_DURATION));
        if (t >= TOTAL_DURATION) {
          // loop after a beat
          setTimeout(() => { startRef.current = performance.now(); }, 2500);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [paused]);

  const togglePause = () => {
    if (paused) {
      // resume: shift start by paused duration
      startRef.current += performance.now() - pausedAtRef.current;
      setPaused(false);
    } else {
      pausedAtRef.current = performance.now();
      setPaused(true);
    }
  };

  const currentStep = useMemo(() => {
    let cur = 1;
    for (const s of STEPS) if (elapsed >= s.at) cur = s.id;
    return cur;
  }, [elapsed]);

  // Streaming words
  const words = DEMO.ai_explanation.split(" ");
  const streamProgress = Math.max(0, Math.min(1, (elapsed - 2000) / 4500));
  const visibleWords = words.slice(0, Math.floor(words.length * streamProgress));

  const showCtaGlow = elapsed >= 5000 && elapsed < 9000;
  const inSocratic = elapsed >= 7000;
  const studentText = useMemo(() => {
    if (elapsed < 9000) return "";
    const p = Math.min(1, (elapsed - 9000) / 1800);
    return DEMO.simulated_student.slice(0, Math.floor(DEMO.simulated_student.length * p));
  }, [elapsed]);
  const visibleNodeCount = elapsed >= 11000 ? Math.min(DEMO.mind_map_nodes.length, Math.floor((elapsed - 11000) / 500) + 1) : 0;
  const showResult = elapsed >= 16000;
  const inGalaxy = elapsed >= 18000;
  const starIgnited = elapsed >= 20000;
  const showFinal = elapsed >= FINAL_AT;

  // Cognitive state animated transition (Confused → Focused at step 7)
  const cogState = elapsed < 14000 ? "confused" : "focused";

  return (
    <div className="min-h-screen bg-[#080B14] text-white antialiased overflow-hidden relative">
      {/* Demo badge */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300 backdrop-blur"
        >
          <Sparkles className="h-3 w-3" /> Demo Mode
        </motion.div>
        <Link
          to="/"
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
        >
          <span className="inline-flex items-center gap-1"><X className="h-3 w-3" /> Demo বন্ধ করো</span>
        </Link>
      </div>

      {/* Background particles */}
      <BgParticles />

      <main className="relative mx-auto max-w-6xl px-4 pt-20 pb-32">
        <AnimatePresence mode="wait">
          {!inGalaxy ? (
            <motion.div key="learn" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.5 }}>
              <LearnPanel
                topic={DEMO.topic_bn}
                visibleWords={visibleWords}
                allWords={words.length}
                showCtaGlow={showCtaGlow}
                inSocratic={inSocratic}
                studentText={studentText}
                socraticReply={elapsed >= 13000 ? DEMO.socratic_response_1 : ""}
                visibleNodeCount={visibleNodeCount}
                cogState={cogState}
                showResult={showResult}
              />
            </motion.div>
          ) : (
            <motion.div key="galaxy" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}>
              <GalaxyPanel ignited={starIgnited} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Final overlay */}
        <AnimatePresence>
          {showFinal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 grid place-items-center bg-black/60 backdrop-blur-xl"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 14 }}
                className="relative rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-blue-500/10 px-10 py-8 text-center"
                style={{ boxShadow: "0 0 100px rgba(245,158,11,0.4)" }}
              >
                <ParticleBurst />
                <p className="text-2xl font-medium text-white">বোধ হোক।</p>
                <p className="mt-2 text-sm text-white/70">১টি নতুন ধারণা আয়ত্ত করেছ। ✨</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Step indicator */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-[#080B14]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            {STEPS.map((s) => {
              const active = s.id === currentStep;
              const done = s.id < currentStep;
              return (
                <div
                  key={s.id}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all ${
                    active ? "bg-amber-400 text-black scale-110" : done ? "bg-amber-400/30 text-amber-200" : "bg-white/5 text-white/40"
                  }`}
                  style={active ? { boxShadow: "0 0 20px rgba(245,158,11,0.6)" } : undefined}
                >
                  {s.id}
                </div>
              );
            })}
          </div>
          <button
            onClick={togglePause}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
          >
            {paused ? <><Play className="h-3 w-3" /> চালু করো</> : <><Pause className="h-3 w-3" /> বিরতি</>}
          </button>
          {/* progress bar */}
          <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-blue-400 transition-[width] duration-100"
              style={{ width: `${Math.min(100, (elapsed / TOTAL_DURATION) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----- Sub views ----- */

function LearnPanel({
  topic, visibleWords, allWords, showCtaGlow, inSocratic, studentText, socraticReply, visibleNodeCount, cogState, showResult,
}: {
  topic: string; visibleWords: string[]; allWords: number; showCtaGlow: boolean;
  inSocratic: boolean; studentText: string; socraticReply: string; visibleNodeCount: number;
  cogState: string; showResult: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Center */}
      <motion.div
        animate={inSocratic ? { boxShadow: "inset 0 0 60px rgba(139,92,246,0.25)" } : { boxShadow: "inset 0 0 0 rgba(0,0,0,0)" }}
        transition={{ duration: 0.8 }}
        className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl"
      >
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-wider text-white/50">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" /> বিষয়: <span className="font-bangla text-amber-300">{topic}</span>
          {inSocratic && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-purple-400/40 bg-purple-400/10 px-2 py-0.5 text-[10px] text-purple-300">
              <GraduationCap className="h-3 w-3" /> Socratic Mode
            </span>
          )}
        </div>

        {/* AI streamed message */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 leading-relaxed text-white/90">
          <p className="font-bangla text-[15px]">
            {visibleWords.join(" ")}
            {visibleWords.length < allWords && <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-amber-400/80 align-middle" />}
          </p>
        </div>

        {/* Teach-back CTA */}
        <AnimatePresence>
          {showCtaGlow && !inSocratic && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 flex justify-center">
              <motion.button
                animate={{ scale: [1, 1.04, 1], boxShadow: ["0 0 20px rgba(139,92,246,0.4)", "0 0 40px rgba(139,92,246,0.7)", "0 0 20px rgba(139,92,246,0.4)"] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="rounded-full border border-purple-400/50 bg-purple-500/15 px-6 py-3 font-bangla text-purple-200"
              >
                এখন তুমি আমাকে বোঝাও →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simulated student bubble */}
        <AnimatePresence>
          {studentText && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-500/15 px-4 py-3 text-sm font-bangla text-blue-100">
                {studentText}
                {studentText.length < DEMO.simulated_student.length && <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-blue-300/80 align-middle" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Socratic reply */}
        <AnimatePresence>
          {socraticReply && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm font-bangla text-purple-100">
                {socraticReply}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result card */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 18 }}
              className="mt-6 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-blue-500/10 p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">সেশন বিশ্লেষণ</h3>
                <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-200">দক্ষতা {Math.round(DEMO.mastery_score * 100)}%</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="mb-1 text-white/50">আয়ত্ত করেছ</p>
                  <ul className="space-y-1">
                    {DEMO.concepts_understood.map((c) => (
                      <li key={c} className="flex items-center gap-1.5 text-emerald-300"><span>●</span><span className="font-bangla">{c}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-white/50">আরও শেখা প্রয়োজন</p>
                  <ul className="space-y-1">
                    {DEMO.gap_detected.map((c) => (
                      <li key={c} className="flex items-center gap-1.5 text-orange-300"><span>○</span><span className="font-bangla">{c}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Right rail: mind map + cognitive state */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
          <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/50">Live Mind Map</p>
          <MiniMindMap visibleCount={visibleNodeCount} />
        </div>
        <CognitiveCard state={cogState} />
      </div>
    </div>
  );
}

function MiniMindMap({ visibleCount }: { visibleCount: number }) {
  const COLOR: Record<string, string> = { gold: "#F59E0B", "cold-blue": "#60A5FA", gap: "#FB923C" };
  const positions: Record<string, { x: number; y: number }> = {
    "1": { x: 50, y: 50 }, "2": { x: 20, y: 20 }, "3": { x: 78, y: 25 }, "4": { x: 75, y: 75 }, "5": { x: 25, y: 80 },
  };
  return (
    <div className="relative h-64 w-full">
      <svg className="absolute inset-0 h-full w-full">
        {DEMO.mind_map_edges.map((e, i) => {
          const a = positions[e.source]; const b = positions[e.target];
          const visible = parseInt(e.source) <= visibleCount && parseInt(e.target) <= visibleCount;
          if (!a || !b) return null;
          return (
            <motion.line
              key={i}
              x1={`${a.x}%`} y1={`${a.y}%`} x2={`${b.x}%`} y2={`${b.y}%`}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1}
              initial={{ opacity: 0 }} animate={{ opacity: visible ? 1 : 0 }}
            />
          );
        })}
      </svg>
      {DEMO.mind_map_nodes.map((n, i) => {
        const p = positions[n.id]; if (!p) return null;
        const visible = i < visibleCount;
        return (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-[11px] font-bangla font-medium"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              background: `${COLOR[n.status]}25`, color: COLOR[n.status],
              border: `1px solid ${COLOR[n.status]}55`,
              boxShadow: n.status === "gold" ? `0 0 16px ${COLOR[n.status]}66` : undefined,
            }}
          >
            {n.label}
          </motion.div>
        );
      })}
    </div>
  );
}

function CognitiveCard({ state }: { state: string }) {
  const config: Record<string, { label: string; emoji: string; color: string }> = {
    confused: { label: "বিভ্রান্ত", emoji: "😕", color: "#FB923C" },
    focused: { label: "মনোযোগী", emoji: "🎯", color: "#F59E0B" },
  };
  const c = config[state] || config.focused;
  return (
    <motion.div
      key={state}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl"
    >
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/50">Cognitive State</p>
      <motion.div
        animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity }}
        className="flex items-center gap-3"
      >
        <span className="text-3xl">{c.emoji}</span>
        <div>
          <p className="text-lg font-semibold font-bangla" style={{ color: c.color }}>{c.label}</p>
          <p className="text-[10px] text-white/40">behavioral + attention signals</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GalaxyPanel({ ignited }: { ignited: boolean }) {
  const stars = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 3 + 0.5, hl: i === 17,
  })), []);
  return (
    <div className="relative mx-auto h-[60vh] max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0A0E1A] via-[#0F1424] to-[#080B14]">
      <div className="absolute inset-x-0 top-4 z-10 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs text-blue-200">
          <Stars className="h-3 w-3" /> Knowledge Galaxy
        </p>
      </div>
      {stars.map((s) => {
        const isHero = s.hl;
        const color = isHero && ignited ? "#F59E0B" : isHero ? "#60A5FA" : "rgba(255,255,255,0.5)";
        const size = isHero ? s.size + 4 : s.size;
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0 }} animate={{ opacity: isHero ? 1 : 0.4 + Math.random() * 0.4 }}
            transition={{ duration: 1, delay: s.id * 0.005 }}
            className="absolute rounded-full"
            style={{
              left: `${s.x}%`, top: `${s.y}%`,
              width: size, height: size, background: color,
              boxShadow: isHero ? `0 0 ${ignited ? 30 : 12}px ${color}` : `0 0 ${size * 2}px ${color}`,
            }}
          />
        );
      })}
      <AnimatePresence>
        {ignited && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400"
            style={{
              left: `${stars[17].x}%`, top: `${stars[17].y}%`,
              boxShadow: "0 0 60px #F59E0B",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ParticleBurst() {
  const particles = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    id: i,
    x: Math.cos((i / 14) * Math.PI * 2) * 120,
    y: Math.sin((i / 14) * Math.PI * 2) * 120,
    color: i % 2 === 0 ? "#F59E0B" : "#60A5FA",
  })), []);
  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
          style={{ background: p.color, boxShadow: `0 0 10px ${p.color}` }}
        />
      ))}
    </>
  );
}

function BgParticles() {
  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 1.5 + 0.3, delay: Math.random() * 4,
  })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 4, delay: s.delay, repeat: Infinity }}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
        />
      ))}
    </div>
  );
}
