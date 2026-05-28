import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Printer, Target, TrendingUp, Brain, AlertTriangle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type SubjectMastery = { subject: string; mastery: number };

export type SparklineDay = { date: string; sessions: number; avgMastery: number };

export type RecentSession = {
  topic: string;
  cognitiveState: string | null;
  createdAt: string;
};

export type CognitiveDist = {
  focused: number;
  confused: number;
  overloaded: number;
  disengaged: number;
};

export type LearningGoal = { id: string; title: string; completed: boolean };

export type RichStudentData = {
  subjectMastery: SubjectMastery[];
  sparkline7d: SparklineDay[];
  strengthConcepts: { concept: string; mastery: number }[];
  weakConcepts: { concept: string; mastery: number }[];
  recentSessions: RecentSession[];
  cognitiveDistribution7d: CognitiveDist;
  learningGoals: LearningGoal[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATE_META: Record<string, { label: string; color: string }> = {
  focused: { label: "মনোযোগী", color: "#10B981" },
  confused: { label: "বিভ্রান্ত", color: "#F59E0B" },
  overloaded: { label: "অতিরিক্ত চাপ", color: "#EF4444" },
  disengaged: { label: "নিষ্ক্রিয়", color: "#6B7280" },
  "mastery-ready": { label: "দক্ষতাপ্রস্তুত", color: "#3B82F6" },
  flow: { label: "ফ্লো", color: "#8B5CF6" },
  exploring: { label: "অন্বেষণ", color: "#22C55E" },
};

const SUBJECT_COLORS: Record<string, string> = {
  "পদার্থবিজ্ঞান": "#3B82F6",
  "রসায়ন": "#10B981",
  "জীববিজ্ঞান": "#22C55E",
  "গণিত": "#F59E0B",
};
const subjectColor = (s: string) => SUBJECT_COLORS[s] ?? "#8B5CF6";

// ─── Mini Donut Chart (SVG, pure — no hooks) ──────────────────────────────────
function DonutChart({ dist }: { dist: CognitiveDist }) {
  const total = dist.focused + dist.confused + dist.overloaded + dist.disengaged || 1;
  const slices = [
    { label: "মনোযোগী", value: dist.focused, color: "#10B981" },
    { label: "বিভ্রান্ত", value: dist.confused, color: "#F59E0B" },
    { label: "অতিরিক্ত", value: dist.overloaded, color: "#EF4444" },
    { label: "নিষ্ক্রিয়", value: dist.disengaged, color: "#6B7280" },
  ];
  const R = 30; const CX = 40; const CY = 40;
  let angle = -Math.PI / 2;
  const paths: { d: string; color: string; label: string; pct: number }[] = [];
  slices.forEach((s) => {
    if (!s.value) return;
    const pct = s.value / total;
    const sweep = pct * 2 * Math.PI;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    angle += sweep;
    const x2 = CX + R * Math.cos(angle);
    const y2 = CY + R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    paths.push({ d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`, color: s.color, label: s.label, pct });
  });

  if (!paths.length) {
    return <p className="text-xs text-white/25 font-bangla">এই সপ্তাহে ডেটা নেই</p>;
  }

  return (
    <div className="flex items-center gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.85} />)}
        <circle cx={CX} cy={CY} r={16} fill="#0C1020" />
      </svg>
      <div className="space-y-1">
        {paths.map((p) => (
          <div key={p.label} className="flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-white/50 font-bangla">{p.label}</span>
            <span className="ml-1 tabular-nums text-white/70">{Math.round(p.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SVG Sparkline (pure — no hooks) ─────────────────────────────────────────
function Sparkline({ days }: { days: SparklineDay[] }) {
  if (!days.length || days.every((d) => d.sessions === 0)) {
    return <div className="h-16 flex items-center text-xs text-white/30 font-bangla">এই সপ্তাহে কোনো সেশন নেই</div>;
  }
  const maxM = Math.max(...days.map((d) => d.avgMastery), 0.01);
  const W = 280; const H = 60; const pad = 4;
  const xStep = (W - pad * 2) / Math.max(days.length - 1, 1);
  const pts = days.map((d, i) => ({
    x: pad + i * xStep,
    y: H - pad - ((d.avgMastery / maxM) * (H - pad * 2)),
    sessions: d.sessions,
  }));
  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        <polyline
          points={poly}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.sessions > 0 ? 3 : 1.5} fill={p.sessions > 0 ? "#F59E0B" : "#F59E0B50"} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-white/25">
        {days.filter((_, i) => i % 2 === 0).map((d, i) => <span key={i}>{d.date}</span>)}
      </div>
    </div>
  );
}

// ─── Main Component (no hooks — pure render) ───────────────────────────────────
type Props = {
  data: RichStudentData;
  onMessage: () => void;
  onPrint: () => void;
};

export function StudentDetail({ data, onMessage, onPrint }: Props) {
  return (
    <div className="border-t border-white/5 pt-4 space-y-5">

      {/* Subject mastery bars */}
      {data.subjectMastery.length > 0 && (
        <section>
          <h4 className="mb-2.5 text-[10px] uppercase tracking-wider text-white/30 font-bangla">বিষয় দক্ষতা</h4>
          <div className="space-y-2">
            {data.subjectMastery.map((s) => {
              const pct = Math.round(s.mastery * 100);
              const color = subjectColor(s.subject);
              return (
                <div key={s.subject}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-white/50 font-bangla">{s.subject}</span>
                    <span className="tabular-nums text-white/40">{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sparkline */}
      <section>
        <h4 className="mb-2.5 text-[10px] uppercase tracking-wider text-white/30 font-bangla">৭ দিনের অগ্রগতি</h4>
        <Sparkline days={data.sparkline7d} />
      </section>

      {/* Strengths + Weaknesses */}
      <section className="grid grid-cols-2 gap-3">
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-300/60 font-bangla">
            <TrendingUp className="h-3 w-3" /> শক্তি
          </h4>
          <ul className="space-y-1.5">
            {data.strengthConcepts.length > 0 ? data.strengthConcepts.slice(0, 3).map((c) => (
              <li key={c.concept} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                <span className="truncate text-xs text-white/70 font-bangla">{c.concept}</span>
                <span className="tabular-nums text-[10px] text-emerald-300 shrink-0">{Math.round(c.mastery * 100)}%</span>
              </li>
            )) : (
              <li className="text-xs text-white/25 font-bangla">এখনো নেই</li>
            )}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-red-300/60 font-bangla">
            <AlertTriangle className="h-3 w-3" /> দুর্বলতা
          </h4>
          <ul className="space-y-1.5">
            {data.weakConcepts.length > 0 ? data.weakConcepts.slice(0, 3).map((c) => (
              <li key={c.concept} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                <span className="truncate text-xs text-white/70 font-bangla">{c.concept}</span>
                <span className="tabular-nums text-[10px] text-red-300 shrink-0">{Math.round(c.mastery * 100)}%</span>
              </li>
            )) : (
              <li className="text-xs text-white/25 font-bangla">কোনো দুর্বলতা নেই 🎉</li>
            )}
          </ul>
        </div>
      </section>

      {/* Recent sessions */}
      {data.recentSessions.length > 0 && (
        <section>
          <h4 className="mb-2.5 text-[10px] uppercase tracking-wider text-white/30 font-bangla">সাম্প্রতিক সেশন</h4>
          <ul className="space-y-2">
            {data.recentSessions.slice(0, 5).map((s, i) => {
              const sm = s.cognitiveState ? STATE_META[s.cognitiveState] : null;
              return (
                <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Brain className="h-3 w-3 shrink-0 text-white/20" />
                    <span className="truncate text-xs text-white/70 font-bangla">{s.topic}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sm && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bangla"
                        style={{ background: `${sm.color}20`, color: sm.color }}
                      >
                        {sm.label}
                      </span>
                    )}
                    <span className="text-[10px] text-white/25">
                      {new Date(s.createdAt).toLocaleDateString("bn-BD")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Cognitive distribution donut */}
      <section>
        <h4 className="mb-2.5 text-[10px] uppercase tracking-wider text-white/30 font-bangla">৭ দিনের মানসিক অবস্থা</h4>
        <DonutChart dist={data.cognitiveDistribution7d} />
      </section>

      {/* Learning goals */}
      {data.learningGoals.length > 0 && (
        <section>
          <h4 className="mb-2.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/30 font-bangla">
            <Target className="h-3 w-3" /> লার্নিং লক্ষ্য
          </h4>
          <ul className="space-y-1.5">
            {data.learningGoals.map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-xs">
                <span className={`h-2 w-2 rounded-full shrink-0 ${g.completed ? "bg-emerald-400" : "border border-white/20"}`} />
                <span className={`font-bangla ${g.completed ? "text-white/40 line-through" : "text-white/70"}`}>{g.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Parent action row */}
      <section className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
        <button
          onClick={onMessage}
          className="flex items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/20 transition-colors font-bangla"
        >
          <MessageCircle className="h-3.5 w-3.5" /> একটি বার্তা পাঠাও
        </button>
        <button
          onClick={onPrint}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors font-bangla"
        >
          <Printer className="h-3.5 w-3.5" /> সাপ্তাহিক রিপোর্ট প্রিন্ট
        </button>
      </section>
    </div>
  );
}
