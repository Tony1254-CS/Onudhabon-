import { motion } from "framer-motion";
import type { GalaxyStar } from "./createGalaxy";

const TAG_COLOR: Record<string, string> = {
  gold: "#F59E0B",
  "cold-blue": "#60A5FA",
  fragile: "#FB923C",
};

export function GalaxySidebar({
  stars, onFocus,
}: { stars: GalaxyStar[]; onFocus: (id: string) => void }) {
  const mastered = stars.filter((s) => s.emotional === "gold");
  const fragile = stars.filter((s) => s.emotional === "cold-blue");
  const review = stars.filter((s) => s.emotional === "fragile");

  const Section = ({ title, items, icon }: { title: string; items: GalaxyStar[]; icon: string }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
          <span>{icon}</span> {title} <span className="ml-auto tabular-nums">{items.length}</span>
        </p>
        <ul className="space-y-1">
          {items.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => onFocus(s.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left group"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 transition-all group-hover:scale-150"
                  style={{
                    background: TAG_COLOR[s.emotional ?? ""] ?? "#475569",
                    boxShadow: `0 0 8px ${TAG_COLOR[s.emotional ?? ""] ?? "#475569"}aa`,
                  }}
                />
                <span className="text-sm font-bangla truncate flex-1">{s.concept}</span>
                <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                  {Math.round(s.mastery * 100)}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-20 left-4 bottom-20 w-[280px] z-20 rounded-2xl bg-[var(--bg-secondary)]/85 backdrop-blur-2xl border border-[var(--border)] p-5 overflow-y-auto"
      style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-4">
        তোমার ধারণা
      </p>
      <Section title="Mastered" items={mastered} icon="⭐" />
      <Section title="Fragile" items={fragile} icon="🔵" />
      <Section title="Review Needed" items={review} icon="⚠️" />
      {stars.length === 0 && (
        <p className="text-xs text-[var(--text-secondary)]/70 font-bangla">
          এখনো কোনো ধারণা নেই।
        </p>
      )}
    </motion.aside>
  );
}
