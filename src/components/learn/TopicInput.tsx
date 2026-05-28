import { motion } from "framer-motion";
import { Sparkles, MessageSquare, Network, ArrowRight } from "lucide-react";
import { useState } from "react";

export const SUBJECTS = [
  "গণিত",
  "পদার্থবিজ্ঞান",
  "রসায়ন",
  "জীববিজ্ঞান",
  "বাংলা",
  "ইংরেজি",
  "আইসিটি",
  "অন্যান্য",
] as const;

export type Subject = (typeof SUBJECTS)[number];

const SUGGESTED_BY_SUBJECT: Record<Subject, string[]> = {
  "গণিত":           ["দ্বিঘাত সমীকরণ", "ত্রিকোণমিতি", "সম্ভাব্যতা", "ক্যালকুলাস", "ভেক্টর"],
  "পদার্থবিজ্ঞান":   ["তড়িৎ প্রবাহ", "নিউটনের সূত্র", "আলোর প্রতিফলন", "তরঙ্গ", "তাপগতিবিদ্যা"],
  "রসায়ন":          ["রাসায়নিক বিক্রিয়া", "পর্যায় সারণি", "অম্ল ও ক্ষারক", "জৈব যৌগ", "মোলারিটি"],
  "জীববিজ্ঞান":     ["কোষ বিভাজন", "সালোকসংশ্লেষণ", "জেনেটিক্স", "মানবদেহের সিস্টেম", "বিবর্তন"],
  "বাংলা":          ["ক্রিয়াপদ", "সমাস", "সন্ধি", "ছন্দ", "অলংকার"],
  "ইংরেজি":         ["Tenses", "Voice Change", "Narration", "Prepositions", "Essay Writing"],
  "আইসিটি":         ["HTML বেসিক", "নেটওয়ার্কিং", "ডেটাবেস", "অ্যালগরিদম", "সাইবার নিরাপত্তা"],
  "অন্যান্য":       ["সাধারণ জ্ঞান", "ইতিহাস", "ভূগোল", "অর্থনীতি", "নাগরিকতা"],
};


export function TopicInput({
  initialSubject,
  onPick,
  onDirectChat,
  onGenerateMap,
}: {
  initialSubject?: Subject;
  onPick: (t: string, subject: Subject) => void;
  onDirectChat: (subject: Subject) => void;
  onGenerateMap?: (t: string, subject: Subject) => void;
}) {
  const [custom, setCustom] = useState("");
  const [subject, setSubject] = useState<Subject>(initialSubject ?? "অন্যান্য");

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
        প্রথমে বিষয় (subject) বেছে নাও, তারপর নির্দিষ্ট টপিক লেখো বা সরাসরি চ্যাট করো।
      </p>

      <div className="w-full max-w-2xl">
        {/* Subject picker */}
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]/70 mb-2 text-center">
            বিষয় নির্বাচন করো
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUBJECTS.map((s) => {
              const active = s === subject;
              return (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-bangla border transition-all ${
                    active
                      ? "bg-[var(--accent-blue)]/20 border-[var(--accent-blue)]/70 text-[var(--accent-cold-blue)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]"
                  }`}
                  aria-pressed={active}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Free-text + actions */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) onPick(custom.trim(), subject); }}
            placeholder="যেমনঃ পারমাণবিক গঠন, ব্যাকরণে ক্রিয়াপদ, আপেক্ষিকতা…"
            className="flex-1 bg-white/[0.03] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] font-bangla placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[var(--accent-blue)]/60 transition-colors"
          />
          <button
            onClick={() => custom.trim() && onPick(custom.trim(), subject)}
            disabled={!custom.trim()}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent-blue)] hover:bg-[var(--accent-cold-blue)] text-white font-bangla text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ boxShadow: "0 0 24px rgba(59,130,246,0.35)" }}
          >
            শেখা শুরু করো <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-8">
          <button
            onClick={() => onDirectChat(subject)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--accent-purple)]/40 bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/20 font-bangla text-sm transition-all"
          >
            <MessageSquare className="w-4 h-4" /> সরাসরি AI-এর সাথে চ্যাট করো
          </button>
          {onGenerateMap && (
            <button
              onClick={() => custom.trim() && onGenerateMap(custom.trim(), subject)}
              disabled={!custom.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20 font-bangla text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={custom.trim() ? "বিষয়টির mind-map এক ক্লিকে তৈরি করো" : "প্রথমে বিষয় লেখো"}
            >
              <Network className="w-4 h-4" /> এই বিষয়ের Mind-Map তৈরি করো
            </button>
          )}
        </div>

        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]/60 text-center mb-3">
          জনপ্রিয় টপিক · <span className="text-[var(--accent-cold-blue)]">{subject}</span>
        </p>
        <div key={subject} className="flex flex-wrap justify-center gap-2">
          {SUGGESTED_BY_SUBJECT[subject].map((topic, i) => (
            <motion.button
              key={topic}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
              onClick={() => onPick(topic, subject)}
              className="px-4 py-2 rounded-full text-sm font-bangla border border-[var(--border)] hover:border-[var(--accent-blue)]/60 hover:bg-[var(--accent-blue)]/10 hover:text-[var(--accent-cold-blue)] transition-all"
              title={subject}
            >
              {topic}
            </motion.button>
          ))}
        </div>

      </div>
    </motion.div>
  );
}
