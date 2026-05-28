import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, ArrowRight } from "lucide-react";
import type { TopicStat } from "./SubjectView";

type SortKey = "topic" | "subject" | "avgMastery" | "studentCount" | "strugglingCount" | "lastTouched";

function SortIcon({ col, active, dir }: { col: string; active: string; dir: "asc" | "desc" }) {
  if (col !== active) return <span className="ml-1 inline-block w-3 opacity-0">↑</span>;
  return dir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3 w-3 text-amber-300" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3 text-amber-300" />
  );
}

const SUBJECT_COLORS: Record<string, string> = {
  "পদার্থবিজ্ঞান": "#3B82F6",
  "রসায়ন": "#10B981",
  "জীববিজ্ঞান": "#22C55E",
  "গণিত": "#F59E0B",
};
const subjectColor = (s: string) => SUBJECT_COLORS[s] ?? "#8B5CF6";

export function TopicView({
  topics,
  searchQuery,
  subjectFilter,
  onSelectTopic,
}: {
  topics: TopicStat[];
  searchQuery: string;
  subjectFilter: string;
  onSelectTopic: (t: TopicStat) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("strugglingCount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const filtered = topics
    .filter((t) => subjectFilter === "all" || t.subject === subjectFilter)
    .filter(
      (t) =>
        !searchQuery ||
        t.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.includes(searchQuery),
    );

  const sorted = [...filtered].sort((a, b) => {
    let va: string | number;
    let vb: string | number;
    if (sortKey === "topic") { va = a.topic; vb = b.topic; }
    else if (sortKey === "subject") { va = a.subject; vb = b.subject; }
    else if (sortKey === "lastTouched") { va = a.lastTouched ?? ""; vb = b.lastTouched ?? ""; }
    else { va = a[sortKey] as number; vb = b[sortKey] as number; }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const Th = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      onClick={() => toggleSort(col)}
      className="cursor-pointer select-none whitespace-nowrap pb-3 pr-4 text-left text-[10px] uppercase tracking-wider text-white/30 hover:text-white/60 transition-colors"
    >
      {label}
      <SortIcon col={col} active={sortKey} dir={sortDir} />
    </th>
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-white/40 font-bangla">
        কোনো টপিক পাওয়া যায়নি।
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <Th label="টপিক" col="topic" />
            <Th label="বিষয়" col="subject" />
            <Th label="গড় দক্ষতা" col="avgMastery" />
            <Th label="শিক্ষার্থী" col="studentCount" />
            <Th label="সংগ্রামরত" col="strugglingCount" />
            <Th label="শেষ সেশন" col="lastTouched" />
            <th className="pb-3 text-left text-[10px] uppercase tracking-wider text-white/30"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => {
            const avg = Math.round(t.avgMastery * 100);
            const color = subjectColor(t.subject);
            const masteryColor = avg >= 70 ? "#10B981" : avg >= 40 ? "#F59E0B" : "#EF4444";
            return (
              <motion.tr
                key={`${t.subject}-${t.topic}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="group border-t border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer"
                onClick={() => onSelectTopic(t)}
              >
                <td className="py-3 pr-4 text-sm font-bangla text-white">{t.topic}</td>
                <td className="py-3 pr-4">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium font-bangla"
                    style={{ background: `${color}20`, color }}
                  >
                    {t.subject}
                  </span>
                </td>
                <td className="py-3 pr-4 w-36">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${avg}%`, background: masteryColor }}
                      />
                    </div>
                    <span className="tabular-nums text-xs text-white/60">{avg}%</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-xs tabular-nums text-white/60">{t.studentCount}</td>
                <td className="py-3 pr-4 text-xs tabular-nums">
                  <span className={t.strugglingCount > 0 ? "text-red-300" : "text-white/30"}>
                    {t.strugglingCount}
                  </span>
                </td>
                <td className="py-3 pr-4 text-[10px] text-white/30">
                  {t.lastTouched
                    ? new Date(t.lastTouched).toLocaleDateString("bn-BD")
                    : "—"}
                </td>
                <td className="py-3">
                  <ArrowRight className="h-3.5 w-3.5 text-white/20 group-hover:text-amber-300 transition-colors" />
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
