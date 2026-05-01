import { motion } from "framer-motion";
import { STATE_COLOR, STATE_LABEL_BN, type MasteryState } from "@/lib/masteryEngine";

export type ConceptNode = {
  id: string;
  name: string;
  mastery: number; // 0..1
  emotional: "gold" | "cold-blue" | "fragile";
  state?: MasteryState;
};

const SUGGESTED = [
  "তড়িৎ প্রবাহ",
  "আলোর প্রতিফলন",
  "রাসায়নিক বিক্রিয়া",
  "কোষ বিভাজন",
  "নিউটনের সূত্র",
];

function MasteryRing({ value, color }: { value: number; color: string }) {
  const r = 12;
  const c = 2 * Math.PI * r;
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0">
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
      <motion.circle
        cx="16" cy="16" r={r} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - value * c }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        transform="rotate(-90 16 16)"
        style={{ filter: `drop-shadow(0 0 6px ${color}aa)` }}
      />
    </svg>
  );
}

export function LeftPanel({
  topic, onTopic, nodes, mobile = false,
}: { topic: string; onTopic: (t: string) => void; nodes: ConceptNode[]; mobile?: boolean }) {
  return (
    <aside className={mobile ? "flex flex-col w-full h-full" : "hidden lg:flex flex-col w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)]/40 backdrop-blur-xl"}>
      <div className="p-5 border-b border-[var(--border)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-3">Suggested Topics</p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED.map((t) => (
            <button
              key={t}
              onClick={() => onTopic(t)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bangla border transition-all ${
                topic === t
                  ? "bg-[var(--accent-blue)]/20 border-[var(--accent-blue)]/60 text-[var(--accent-cold-blue)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-4">Concept Nodes</p>
        {nodes.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)]/70 font-bangla leading-relaxed">
            শেখা শুরু করো — তোমার ধারণাগুলো এখানে প্রদর্শিত হবে।
          </p>
        ) : (
          <ul className="space-y-2">
            {nodes.map((n) => {
              const color = n.emotional === "gold" ? "#F59E0B" : n.emotional === "fragile" ? "#EF4444" : "#60A5FA";
              return (
                <motion.li
                  key={n.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                >
                  <MasteryRing value={n.mastery} color={color} />
                  <span className="text-sm font-bangla text-[var(--text-primary)] truncate">{n.name}</span>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
