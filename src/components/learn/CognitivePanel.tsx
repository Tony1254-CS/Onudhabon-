import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Activity, Clock, Gauge, History, MessageCircle, Sparkles, Wind } from "lucide-react";
import { type CognitiveState, STATE_META, useCognitiveMetrics, type Signal } from "@/hooks/useCognitiveState";

export function CognitivePanel({
  state,
  signals,
  mode = "teaching",
  onSuggestBreak,
}: {
  state: CognitiveState;
  signals?: Signal[];
  mode?: "teaching" | "socratic";
  onSuggestBreak?: () => void;
}) {
  const metrics = useCognitiveMetrics(signals ?? [], mode);
  // Prefer external override (e.g. attention engine) but enrich with live metrics
  const active: CognitiveState = state ?? metrics.state;
  const meta = STATE_META[active];

  return (
    <div className="relative h-full overflow-y-auto p-4 space-y-4 font-bangla">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{ background: `radial-gradient(ellipse at top, ${meta.glow} 0%, transparent 60%)` }}
      />

      {/* HERO — state + flow ring */}
      <div className="relative rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-4">
        <div className="flex items-center gap-4">
          <FlowRing value={metrics.flowScore} color={meta.color} icon={meta.icon} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Cognitive State</p>
            <AnimatePresence mode="wait">
              <motion.h3
                key={active}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-lg font-semibold leading-tight"
                style={{ color: meta.color }}
              >
                {meta.label}
              </motion.h3>
            </AnimatePresence>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-white/60">
              <Gauge className="w-3 h-3" />
              <span className="tabular-nums">Flow Score {metrics.flowScore}/100</span>
            </div>
          </div>
        </div>

        {/* Coaching message */}
        <AnimatePresence mode="wait">
          <motion.p
            key={meta.tagline}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative mt-3 text-[13px] leading-relaxed text-white/85"
          >
            {meta.tagline}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* LIVE TIP card */}
      <motion.div
        layout
        className="relative rounded-2xl border p-3.5"
        style={{
          borderColor: `${meta.color}55`,
          background: `linear-gradient(135deg, ${meta.color}14, transparent 70%)`,
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: meta.color }} />
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">এখন কী করবে</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={metrics.tip}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[13px] leading-relaxed text-white/90"
          >
            {metrics.tip}
          </motion.p>
        </AnimatePresence>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/60 truncate">→ {metrics.nextAction}</span>
          {(active === "overloaded" || active === "disengaged") && onSuggestBreak && (
            <button
              onClick={onSuggestBreak}
              className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/85 hover:bg-white/10"
            >
              বিরতি নাও
            </button>
          )}
        </div>
      </motion.div>

      {/* METRICS GRID */}
      <div className="relative grid grid-cols-2 gap-2">
        <Metric icon={<Wind className="w-3 h-3" />} label="ফ্লো সময়" value={`${metrics.focusMinutes.toFixed(1)}m`} color={meta.color} />
        <Metric icon={<MessageCircle className="w-3 h-3" />} label="বার্তা" value={`${metrics.totalMessages}`} color={meta.color} />
        <Metric icon={<Activity className="w-3 h-3" />} label="গড় দৈর্ঘ্য" value={`${Math.round(metrics.avgResponseLength)}c`} color={meta.color} />
        <Metric icon={<Clock className="w-3 h-3" />} label="ছন্দ" value={metrics.cadenceSec ? `${metrics.cadenceSec.toFixed(0)}s` : "—"} color={meta.color} />
      </div>

      {/* Pulse waveform — visual heartbeat */}
      <div className="relative rounded-2xl border border-white/10 bg-black/30 p-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/50 mb-2">মনোযোগের স্পন্দন</p>
        <Waveform color={meta.color} intensity={metrics.flowScore / 100} />
        <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
          <span>শান্ত</span>
          <span>স্থির</span>
          <span>গভীর</span>
        </div>
      </div>

      {/* TIMELINE — recent state transitions */}
      <div className="relative rounded-2xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <History className="w-3 h-3 text-white/50" />
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">সাম্প্রতিক পরিবর্তন</p>
        </div>
        {metrics.timeline.length === 0 ? (
          <p className="text-[11px] text-white/40">এখনও কোনো পরিবর্তন রেকর্ড হয়নি।</p>
        ) : (
          <ol className="relative space-y-2">
            <span className="absolute left-[5px] top-1 bottom-1 w-px bg-white/10" />
            {metrics.timeline.map((t, i) => {
              const m = STATE_META[t.state];
              const ago = Math.max(0, Math.round((Date.now() - t.ts) / 1000));
              const agoLabel = ago < 60 ? `${ago}s` : `${Math.round(ago / 60)}m`;
              return (
                <li key={`${t.ts}-${i}`} className="relative pl-5">
                  <span
                    className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-black"
                    style={{ background: m.color, boxShadow: i === 0 ? `0 0 8px ${m.color}` : "none" }}
                  />
                  <div className="flex items-center gap-2 text-[12px]">
                    <span style={{ color: m.color }} className="font-semibold">{m.icon} {m.label}</span>
                    <span className="ml-auto text-[10px] text-white/40 tabular-nums">{agoLabel} আগে</span>
                  </div>
                  <p className="text-[10.5px] text-white/55 leading-snug">কেন: {t.reason}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
      <div className="flex items-center gap-1.5 text-white/55" style={{ color: `${color}cc` }}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-base font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function FlowRing({ value, color, icon }: { value: number; color: string; icon: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative shrink-0">
      <svg width={76} height={76} className="-rotate-90">
        <circle cx={38} cy={38} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={6} fill="none" />
        <motion.circle
          cx={38}
          cy={38}
          r={r}
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c - dash }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 flex items-center justify-center text-2xl"
        style={{ filter: `drop-shadow(0 0 10px ${color})` }}
      >
        {icon}
      </motion.div>
    </div>
  );
}

function Waveform({ color, intensity }: { color: string; intensity: number }) {
  const [tick, setTick] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      ref.current += 1;
      setTick(ref.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const bars = 32;
  return (
    <div className="flex items-end gap-[3px] h-12">
      {Array.from({ length: bars }).map((_, i) => {
        const phase = (tick / 30 + i * 0.4);
        const wave = (Math.sin(phase) + 1) / 2; // 0..1
        const noise = (Math.sin(phase * 2.3 + i) + 1) / 2;
        const h = 4 + wave * 30 * (0.4 + intensity) + noise * 6 * intensity;
        return (
          <div
            key={i}
            className="flex-1 rounded-full transition-[background] duration-500"
            style={{
              height: `${h}px`,
              background: color,
              opacity: 0.4 + 0.6 * intensity,
              boxShadow: intensity > 0.7 ? `0 0 6px ${color}` : "none",
            }}
          />
        );
      })}
    </div>
  );
}
