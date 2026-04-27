import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { MasteryRing } from "./StatCard";
import type { StudentRow } from "@/routes/dashboard";

const STATE_COLOR: Record<string, string> = {
  focused: "#F59E0B",
  confused: "#FB923C",
  overloaded: "#EF4444",
  disengaged: "#6B7280",
  "mastery-ready": "#10B981",
};

const STATE_LABEL: Record<string, string> = {
  focused: "🎯 মনোযোগী",
  confused: "😕 বিভ্রান্ত",
  overloaded: "🥵 ক্লান্ত",
  disengaged: "💤 আগ্রহহীন",
  "mastery-ready": "✨ প্রস্তুত",
};

export function StudentList({
  students,
  conceptsByStudent,
  selectedId,
  onSelect,
}: {
  students: StudentRow[];
  conceptsByStudent: Record<string, { concept: string; mastery: number; subject: string | null }[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!students.length) {
    return <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50">কোনো শিক্ষার্থী যুক্ত নেই।</p>;
  }

  return (
    <div className="space-y-2">
      {students.map((s) => {
        const concepts = conceptsByStudent[s.id] || [];
        const avg = concepts.length ? concepts.reduce((a, c) => a + c.mastery, 0) / concepts.length : 0;
        const isOpen = expanded === s.id;
        const state = s.cognitive_state || "focused";
        return (
          <div key={s.id} className={`rounded-xl border transition-colors ${selectedId === s.id ? "border-amber-500/40 bg-amber-500/5" : "border-white/10 bg-white/[0.02]"}`}>
            <button
              onClick={() => { onSelect(s.id); setExpanded(isOpen ? null : s.id); }}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white">
                {(s.full_name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{s.full_name || "Unnamed"}</p>
                <p className="text-xs text-white/40">
                  {s.last_active ? `সক্রিয় ${new Date(s.last_active).toLocaleDateString("bn-BD")}` : "এখনও সক্রিয় নেই"}
                </p>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: `${STATE_COLOR[state] || "#6B7280"}20`, color: STATE_COLOR[state] || "#9CA3AF" }}
              >
                {STATE_LABEL[state] || state}
              </span>
              <MasteryRing value={avg} size={40} />
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-white/5"
                >
                  <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                    {concepts.length === 0 ? (
                      <p className="col-span-full text-xs text-white/40">এখনও কোনো ধারণা নেই।</p>
                    ) : concepts.map((c) => {
                      const color = c.mastery > 0.7 ? "#10B981" : c.mastery >= 0.4 ? "#F59E0B" : "#EF4444";
                      return (
                        <div key={c.concept} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                          <span className="truncate text-white/80">{c.concept}</span>
                          <span className="ml-2 shrink-0 font-semibold tabular-nums" style={{ color }}>{Math.round(c.mastery * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
