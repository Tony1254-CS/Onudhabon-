import { motion } from "framer-motion";
import { Sparkles, MessageSquare, Network, ArrowRight } from "lucide-react";
import { useState } from "react";

const SUGGESTED = [
  "তড়িৎ প্রবাহ",
  "আলোর প্রতিফলন",
  "রাসায়নিক বিক্রিয়া",
  "কোষ বিভাজন",
  "নিউটনের সূত্র",
];

export function TopicInput({
  onPick,
  onDirectChat,
  onGenerateMap,
}: {
  onPick: (t: string) => void;
  onDirectChat: () => void;
  onGenerateMap?: (t: string) => void;
}) {
  const [custom, setCustom] = useState("");

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
      <p className="text-[var(--text-secondary)] text-center font-bangla mb-8 max-w-md">
        একটি বিষয় বেছে নাও, নিজে লেখো, অথবা সরাসরি আমার সাথে কথা বলো।
      </p>

      {/* Free-text + actions */}
      <div className="w-full max-w-2xl">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) onPick(custom.trim()); }}
            placeholder="যেমনঃ পারমাণবিক গঠন, ব্যাকরণে ক্রিয়াপদ, আপেক্ষিকতা…"
            className="flex-1 bg-white/[0.03] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] font-bangla placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[var(--accent-blue)]/60 transition-colors"
          />
          <button
            onClick={() => custom.trim() && onPick(custom.trim())}
            disabled={!custom.trim()}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent-blue)] hover:bg-[var(--accent-cold-blue)] text-white font-bangla text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ boxShadow: "0 0 24px rgba(59,130,246,0.35)" }}
          >
            শেখা শুরু করো <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-8">
          <button
            onClick={onDirectChat}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--accent-purple)]/40 bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/20 font-bangla text-sm transition-all"
          >
            <MessageSquare className="w-4 h-4" /> সরাসরি AI-এর সাথে চ্যাট করো
          </button>
          {onGenerateMap && (
            <button
              onClick={() => custom.trim() && onGenerateMap(custom.trim())}
              disabled={!custom.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20 font-bangla text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={custom.trim() ? "বিষয়টির mind-map এক ক্লিকে তৈরি করো" : "প্রথমে বিষয় লেখো"}
            >
              <Network className="w-4 h-4" /> এই বিষয়ের Mind-Map তৈরি করো
            </button>
          )}
        </div>

        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]/60 text-center mb-3">
          জনপ্রিয় বিষয়
        </p>
        <div className="flex flex-wrap justify-center gap-2">
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
      </div>
    </motion.div>
  );
}
