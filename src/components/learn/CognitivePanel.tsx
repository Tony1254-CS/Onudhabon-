import { motion, AnimatePresence } from "framer-motion";
import { type CognitiveState, STATE_META } from "@/hooks/useCognitiveState";

export function CognitivePanel({ state }: { state: CognitiveState }) {
  const meta = STATE_META[state];
  return (
    <div className="relative h-full p-5 flex flex-col items-center justify-center text-center">
      <div
        className="absolute inset-3 rounded-2xl pointer-events-none transition-all duration-700"
        style={{ background: `radial-gradient(ellipse at center, ${meta.glow} 0%, transparent 70%)` }}
      />
      <p className="relative text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-3">
        Cognitive State
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, scale: 0.85, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -8 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="relative flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-5xl"
            style={{ filter: `drop-shadow(0 0 16px ${meta.glow})` }}
          >
            {meta.icon}
          </motion.div>
          <p className="font-bangla text-base font-semibold" style={{ color: meta.color }}>
            {meta.label}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
