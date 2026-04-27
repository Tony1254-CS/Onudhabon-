import { motion } from "framer-motion";
import { Check, AlertTriangle, ArrowRight } from "lucide-react";
import type { ExtractedConcept } from "./MindMap";

export function ResultCard({
  concepts, onContinue,
}: { concepts: ExtractedConcept[]; onContinue: () => void }) {
  const understood = concepts.filter(c => c.confidence === "strong").map(c => c.name);
  const gaps = concepts.filter(c => c.confidence !== "strong").map(c => c.name);
  const score = concepts.length === 0 ? 0 : understood.length / concepts.length;
  const r = 36; const c = 2 * Math.PI * r;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      className="mx-auto max-w-xl my-6 p-6 rounded-2xl glass border border-[var(--accent-gold)]/30"
      style={{ boxShadow: "0 0 50px rgba(245,158,11,0.15)" }}
    >
      <div className="flex items-start gap-5">
        <div className="relative shrink-0">
          <svg width="92" height="92" viewBox="0 0 92 92">
            <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <motion.circle
              cx="46" cy="46" r={r} fill="none" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c - score * c }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              transform="rotate(-90 46 46)"
              style={{ filter: "drop-shadow(0 0 10px rgba(245,158,11,0.6))" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-2xl text-[var(--accent-gold)] tabular-nums">{Math.round(score * 100)}%</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-1">Mastery Score</p>
          <h3 className="font-display text-xl mb-3">তোমার অধিভূতি</h3>
          {understood.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 mb-1">
                <Check className="w-3 h-3" /> তুমি বুঝেছ
              </p>
              <p className="font-bangla text-sm">{understood.join("、 ")}</p>
            </div>
          )}
          {gaps.length > 0 && (
            <div>
              <p className="text-xs text-orange-400 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3" /> এখনো বুঝোনি
              </p>
              <p className="font-bangla text-sm">{gaps.join("、 ")}</p>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onContinue}
        className="mt-5 w-full py-2.5 rounded-xl bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/40 text-[var(--accent-gold)] font-bangla text-sm hover:bg-[var(--accent-gold)]/25 transition-all flex items-center justify-center gap-2"
      >
        Galaxy আপডেট দেখো <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
