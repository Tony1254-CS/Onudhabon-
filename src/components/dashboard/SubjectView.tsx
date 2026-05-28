import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Users, TrendingUp, AlertTriangle, BookOpen } from "lucide-react";

export type SubjectStat = {
  subject: string;
  studentCount: number;
  avgMastery: number;
  weakConceptCount: number;
  topStrugglingTopic: string | null;
  topics: TopicStat[];
};

export type TopicStat = {
  topic: string;
  subject: string;
  avgMastery: number;
  studentCount: number;
  strugglingCount: number;
  lastTouched: string | null;
};

const SUBJECT_META: Record<string, { color: string; glow: string; emoji: string }> = {
  "পদার্থবিজ্ঞান":  { color: "#3B82F6", glow: "rgba(59,130,246,0.15)",  emoji: "⚛️" },
  "রসায়ন":         { color: "#10B981", glow: "rgba(16,185,129,0.15)",  emoji: "🧪" },
  "জীববিজ্ঞান":    { color: "#22C55E", glow: "rgba(34,197,94,0.15)",   emoji: "🧬" },
  "গণিত":           { color: "#F59E0B", glow: "rgba(245,158,11,0.15)",  emoji: "📐" },
  "অন্যান্য":       { color: "#8B5CF6", glow: "rgba(139,92,246,0.15)", emoji: "📚" },
};

function MasteryBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

function TopicRow({ t, color }: { t: TopicStat; color: string }) {
  const avg = Math.round(t.avgMastery * 100);
  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 pr-4 text-sm text-white font-bangla">{t.topic}</td>
      <td className="py-2.5 pr-4 text-xs text-white/50 tabular-nums">{t.studentCount} জন</td>
      <td className="py-2.5 pr-4 w-32">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full" style={{ width: `${avg}%`, background: color }} />
          </div>
          <span className="text-xs tabular-nums text-white/60 shrink-0">{avg}%</span>
        </div>
      </td>
      <td className="py-2.5 pr-4 text-xs text-red-300/80 tabular-nums">{t.strugglingCount}</td>
      <td className="py-2.5 text-[10px] text-white/30">
        {t.lastTouched ? new Date(t.lastTouched).toLocaleDateString("bn-BD") : "—"}
      </td>
    </tr>
  );
}

function SubjectCard({
  stat,
  isOpen,
  onToggle,
}: {
  stat: SubjectStat;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const meta = SUBJECT_META[stat.subject] ?? SUBJECT_META["অন্যান্য"];
  const avg = Math.round(stat.avgMastery * 100);

  return (
    <motion.div
      layout
      className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
      style={{ boxShadow: isOpen ? `0 0 30px ${meta.glow}` : undefined }}
    >
      <button
        onClick={onToggle}
        className="w-full p-5 text-left flex items-start gap-4 hover:bg-white/[0.02] transition-colors"
      >
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
          style={{ background: meta.glow, border: `1px solid ${meta.color}30` }}
        >
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-bangla font-semibold text-white text-base">{stat.subject}</h3>
            {stat.weakConceptCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] text-red-300">
                <AlertTriangle className="h-2.5 w-2.5" />
                {stat.weakConceptCount} দুর্বল
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3 text-[11px]">
            <div className="flex items-center gap-1.5 text-white/50">
              <Users className="h-3 w-3" style={{ color: meta.color }} />
              <span>{stat.studentCount} শিক্ষার্থী</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/50">
              <TrendingUp className="h-3 w-3" style={{ color: meta.color }} />
              <span>গড় {avg}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/50">
              <BookOpen className="h-3 w-3" style={{ color: meta.color }} />
              <span>{stat.topics.length} টপিক</span>
            </div>
          </div>
          <MasteryBar value={stat.avgMastery} color={meta.color} />
          {stat.topStrugglingTopic && (
            <p className="mt-1.5 text-[10px] text-white/30 truncate font-bangla">
              সবচেয়ে কঠিন: {stat.topStrugglingTopic}
            </p>
          )}
        </div>
        <div className="shrink-0 text-white/30 mt-1">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && stat.topics.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 px-5 pb-4">
              <p className="mt-3 mb-2 text-[10px] uppercase tracking-wider text-white/30">
                টপিক বিশ্লেষণ
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-white/30">
                      <th className="pb-2 pr-4 text-left">টপিক</th>
                      <th className="pb-2 pr-4 text-left">শিক্ষার্থী</th>
                      <th className="pb-2 pr-4 text-left">গড় দক্ষতা</th>
                      <th className="pb-2 pr-4 text-left">সংগ্রামরত</th>
                      <th className="pb-2 text-left">শেষ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stat.topics.map((t) => (
                      <TopicRow key={t.topic} t={t} color={meta.color} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function SubjectView({
  subjectStats,
  searchQuery,
}: {
  subjectStats: SubjectStat[];
  searchQuery: string;
}) {
  const [openSubject, setOpenSubject] = useState<string | null>(null);

  const filtered = subjectStats.filter(
    (s) =>
      !searchQuery ||
      s.subject.includes(searchQuery) ||
      s.topics.some((t) => t.topic.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-white/40 font-bangla">
        কোনো বিষয় পাওয়া যায়নি।
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {filtered.map((stat) => (
        <SubjectCard
          key={stat.subject}
          stat={stat}
          isOpen={openSubject === stat.subject}
          onToggle={() =>
            setOpenSubject(openSubject === stat.subject ? null : stat.subject)
          }
        />
      ))}
    </div>
  );
}
