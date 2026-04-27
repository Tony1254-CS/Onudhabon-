import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const SUGGESTED = [
  "তড়িৎ প্রবাহ",
  "আলোর প্রতিফলন",
  "রাসায়নিক বিক্রিয়া",
  "কোষ বিভাজন",
  "নিউটনের সূত্র",
];

export function TopicInput({ onPick }: { onPick: (t: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex-1 flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-[var(--text-secondary)] mb-6">
        <Sparkles className="h-3 w-3 text-[var(--accent-gold)]" />
        নতুন অধ্যায়
      </div>
      <h1 className="font-display text-4xl md:text-5xl tracking-tight text-center mb-3">
        আজ কী <span className="text-gradient">শিখতে</span> চাও?
      </h1>
      <p className="text-[var(--text-secondary)] text-center font-bangla mb-10 max-w-md">
        একটি বিষয় বেছে নাও বা নিজে লেখো। আমি তোমাকে বুঝাব — তারপর তুমি আমাকে বোঝাবে।
      </p>
      <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
        {SUGGESTED.map((t, i) => (
          <motion.button
            key={t}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            onClick={() => onPick(t)}
            className="px-4 py-2 rounded-full text-sm font-bangla border border-[var(--border)] hover:border-[var(--accent-blue)]/60 hover:bg-[var(--accent-blue)]/10 hover:text-[var(--accent-cold-blue)] transition-all"
          >
            {t}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
