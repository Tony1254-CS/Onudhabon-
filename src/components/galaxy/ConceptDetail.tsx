import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { GalaxyStar } from "./createGalaxy";

const TAG_META: Record<string, { label: string; color: string }> = {
  gold:        { label: "আয়ত্ত করেছ",       color: "#F59E0B" },
  "cold-blue": { label: "ভঙ্গুর জ্ঞান",       color: "#60A5FA" },
  fragile:     { label: "পর্যালোচনা দরকার",  color: "#FB923C" },
};

export function ConceptDetail({ star, onClose }: { star: GalaxyStar | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {star && (
        <motion.div
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="absolute top-20 right-4 bottom-20 w-[320px] z-20 rounded-2xl bg-[var(--bg-secondary)]/85 backdrop-blur-2xl border border-[var(--border)] p-5 flex flex-col"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0">
              {star.subject && (
                <span className="inline-block text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-white/[0.05] border border-[var(--border)] text-[var(--text-secondary)] mb-2">
                  {star.subject}
                </span>
              )}
              <h3 className="font-display text-2xl text-balance">{star.concept}</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-[var(--text-secondary)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
              <span>আয়ত্ত স্তর</span>
              <span className="tabular-nums">{Math.round(star.mastery * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${star.mastery * 100}%` }}
                transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
                className="h-full rounded-full"
                style={{
                  background: TAG_META[star.emotional ?? ""]?.color ?? "#475569",
                  boxShadow: `0 0 12px ${TAG_META[star.emotional ?? ""]?.color ?? "#475569"}88`,
                }}
              />
            </div>
          </div>

          {star.emotional && TAG_META[star.emotional] && (
            <div className="mb-5">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bangla"
                style={{
                  background: `${TAG_META[star.emotional].color}1f`,
                  border: `1px solid ${TAG_META[star.emotional].color}66`,
                  color: TAG_META[star.emotional].color,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: TAG_META[star.emotional].color }} />
                {TAG_META[star.emotional].label}
              </span>
            </div>
          )}

          {star.lastReviewed && (
            <p className="text-xs text-[var(--text-secondary)] mb-6">
              শেষ পর্যালোচনা: {new Date(star.lastReviewed).toLocaleDateString("bn-BD")}
            </p>
          )}

          <div className="mt-auto">
            <Link
              to="/learn"
              search={{ topic: star.concept } as never}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--accent-blue)]/15 border border-[var(--accent-blue)]/40 text-[var(--accent-cold-blue)] font-bangla text-sm hover:bg-[var(--accent-blue)]/25 transition-all"
            >
              <Sparkles className="w-4 h-4" /> পুনরায় অনুশীলন করো <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
