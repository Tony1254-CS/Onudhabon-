import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import type { TopicStat } from "./SubjectView";

type StudentNode = {
  id: string;
  full_name: string | null;
  mastery: number;
};

type Props = {
  topic: TopicStat | null;
  onClose: () => void;
  onAssignReview: (studentId: string, studentName: string, conceptId: string, concept: string) => void;
  allNodes: Array<{ id: string; user_id: string; concept: string; mastery_level: number | null; subject: string | null }>;
  students: Array<{ id: string; full_name: string | null }>;
};

const SUBJECT_COLORS: Record<string, string> = {
  "পদার্থবিজ্ঞান": "#3B82F6",
  "রসায়ন": "#10B981",
  "জীববিজ্ঞান": "#22C55E",
  "গণিত": "#F59E0B",
};

function Avatar({ name, mastery }: { name: string; mastery: number }) {
  const pct = Math.round(mastery * 100);
  const color = pct >= 70 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";
  const initial = (name && name.length > 0) ? name.charAt(0).toUpperCase() : "?";
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-black"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm text-white">{name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          </div>
          <span className="text-[10px] tabular-nums text-white/40">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

export function TopicDrawer({ topic, onClose, onAssignReview, allNodes, students }: Props) {
  const [studentData, setStudentData] = useState<{
    mastered: StudentNode[];
    weak: StudentNode[];
  }>({ mastered: [], weak: [] });

  useEffect(() => {
    if (!topic) {
      setStudentData({ mastered: [], weak: [] });
      return;
    }
    const studentMap = new Map(students.map((s) => [s.id, s]));

    // Match by concept name (safe — no key splitting)
    const relevant = allNodes.filter((n) => n.concept === topic.topic);

    const mastered: StudentNode[] = [];
    const weak: StudentNode[] = [];

    relevant.forEach((n) => {
      const s = studentMap.get(n.user_id);
      if (!s) return;
      const m = n.mastery_level ?? 0;
      const node: StudentNode = { id: n.user_id, full_name: s.full_name, mastery: m };
      if (m >= 0.65) mastered.push(node);
      else weak.push(node);
    });

    setStudentData({
      mastered,
      weak: weak.sort((a, b) => a.mastery - b.mastery),
    });
  }, [topic, allNodes, students]);

  const subjectColor = topic ? (SUBJECT_COLORS[topic.subject] ?? "#8B5CF6") : "#8B5CF6";

  return (
    <AnimatePresence>
      {topic && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-[#0C1020] shadow-2xl"
          >
            {/* Header */}
            <div
              className="shrink-0 border-b border-white/10 p-5"
              style={{ background: `linear-gradient(135deg, ${subjectColor}10, transparent)` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium font-bangla"
                    style={{ background: `${subjectColor}20`, color: subjectColor }}
                  >
                    {topic.subject}
                  </span>
                  <h2 className="text-lg font-semibold font-bangla text-white">{topic.topic}</h2>
                  <p className="mt-1 text-xs text-white/40">
                    {topic.studentCount} শিক্ষার্থী · গড় {Math.round(topic.avgMastery * 100)}%
                    {topic.strugglingCount > 0 && ` · ${topic.strugglingCount} সংগ্রামরত`}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mastery bar */}
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[10px] text-white/30">
                  <span>শ্রেণী গড় দক্ষতা</span>
                  <span>{Math.round(topic.avgMastery * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(topic.avgMastery * 100)}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${subjectColor}, ${subjectColor}80)` }}
                  />
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Weak students */}
              {studentData.weak.length > 0 && (
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-300/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    সংগ্রামরত ({studentData.weak.length})
                  </h3>
                  <ul className="space-y-3">
                    {studentData.weak.map((st) => (
                      <li key={st.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <Avatar name={st.full_name || "Unnamed"} mastery={st.mastery} />
                        <button
                          onClick={() =>
                            onAssignReview(
                              st.id,
                              st.full_name || "Unnamed",
                              `${st.id}-${topic.topic}`,
                              topic.topic,
                            )
                          }
                          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
                        >
                          পর্যালোচনা অ্যাসাইন করো <ArrowRight className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Mastered students */}
              {studentData.mastered.length > 0 && (
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    আয়ত্তে আনছে ({studentData.mastered.length})
                  </h3>
                  <ul className="space-y-2.5">
                    {studentData.mastered.map((st) => (
                      <li key={st.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <Avatar name={st.full_name || "Unnamed"} mastery={st.mastery} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {studentData.mastered.length === 0 && studentData.weak.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-white/30 font-bangla">
                  এই টপিকে কোনো শিক্ষার্থীর ডেটা নেই।
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
