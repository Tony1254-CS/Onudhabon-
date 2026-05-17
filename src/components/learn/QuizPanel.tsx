import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, RefreshCw, Trophy, Sparkles, WifiOff, Wand2 } from "lucide-react";
import { useQuizGenerator } from "@/hooks/useQuizGenerator";
import { saveQuizResult } from "@/hooks/useTopicResources";

const COUNT_OPTIONS = [5, 10, 15, 20];

export function QuizPanel({ topic, online, onSubmit }: { topic: string; online: boolean; onSubmit?: (result: { score: number; total: number }) => void }) {
  const { questions, loading, error, fromCache, generate } = useQuizGenerator(topic);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [count, setCount] = useState(10);

  // Auto-generate on topic change if nothing cached
  useEffect(() => {
    if (topic && online && questions.length === 0 && !loading) generate(count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  // Reset state when topic changes
  useEffect(() => { setPicks({}); setSubmitted(false); }, [topic]);

  const visible = useMemo(() => questions.slice(0, Math.min(count, questions.length)), [questions, count]);
  const score = useMemo(
    () => visible.reduce((acc, q, i) => acc + (picks[i] === q.correctIdx ? 1 : 0), 0),
    [picks, visible],
  );
  const total = visible.length;
  const pct = total ? Math.round((score / total) * 100) : 0;

  const handleSubmit = () => {
    setSubmitted(true);
    if (total > 0) {
      saveQuizResult({ topic, score, total, takenAt: Date.now() });
      onSubmit?.({ score, total });
    }
  };

  const reset = () => { setPicks({}); setSubmitted(false); };

  const regenerate = async (n = count) => {
    reset();
    setCount(n);
    await generate(n);
  };

  if (!topic) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center font-bangla text-xs text-[var(--text-secondary)]/70">
        একটি বিষয় শুরু করো — কুইজ স্বয়ংক্রিয়ভাবে তৈরি হবে।
      </div>
    );
  }

  if (!questions.length && loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-xs text-[var(--text-secondary)] font-bangla">
        <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
        কুইজ তৈরি হচ্ছে…
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-xs text-[var(--text-secondary)] font-bangla px-4">
        <WifiOff className="w-6 h-6 text-white/40" />
        {error === "offline" ? "অফলাইনে কুইজ তৈরি করা যাবে না।" : "এখনো কুইজ নেই।"}
        {online && (
          <button onClick={() => generate(count)} className="mt-1 px-3 py-1.5 rounded-md border border-white/15 hover:bg-white/10 text-white/80 text-[11px]">
            কুইজ তৈরি করো
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-bangla">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-[var(--border)] bg-black/30 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] truncate">
            {topic} · কুইজ
          </span>
          {fromCache && (
            <span className="px-1.5 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[9px] font-medium">
              Offline
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5 mr-1">
            {COUNT_OPTIONS.map((n) => {
              const active = count === n;
              return (
                <button
                  key={n}
                  onClick={() => regenerate(n)}
                  disabled={loading || !online}
                  className={`px-2.5 py-1 rounded-full text-[10px] transition tabular-nums disabled:opacity-40 ${active ? "bg-amber-400/20 text-amber-100" : "text-white/60 hover:text-white"}`}
                >
                  {n}Q
                </button>
              );
            })}
          </div>
          <button
            onClick={() => regenerate(count)}
            disabled={loading || !online}
            title="নতুন প্রশ্ন তৈরি করো"
            className="px-2 py-1 rounded-md text-[10px] text-amber-200 border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 transition disabled:opacity-40 inline-flex items-center gap-1"
          >
            <Wand2 className={`w-3 h-3 ${loading ? "animate-pulse" : ""}`} /> নতুন
          </button>
          <button
            onClick={reset}
            title="আবার চেষ্টা করো"
            className="p-1.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-sm">
        {visible.map((q, i) => {
          const picked = picks[i];
          const isCorrect = submitted && picked === q.correctIdx;
          const isWrong = submitted && picked !== undefined && picked !== q.correctIdx;
          return (
            <motion.div
              key={`${i}-${q.question.slice(0, 12)}`}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`rounded-xl border p-3 ${isCorrect ? "border-emerald-400/40 bg-emerald-400/5" : isWrong ? "border-red-400/40 bg-red-400/5" : "border-white/10 bg-white/[0.02]"}`}
            >
              <p className="text-[13px] text-white/90 mb-2.5">
                <span className="text-amber-300 tabular-nums">{i + 1}.</span> {q.question}
              </p>
              <div className="space-y-1.5">
                {q.choices.map((c, ci) => {
                  const chosen = picked === ci;
                  const correct = submitted && ci === q.correctIdx;
                  return (
                    <button
                      key={ci}
                      disabled={submitted}
                      onClick={() => setPicks((p) => ({ ...p, [i]: ci }))}
                      className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition flex items-start gap-2 ${
                        correct
                          ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100"
                          : chosen && submitted
                            ? "border-red-400/60 bg-red-400/15 text-red-100"
                            : chosen
                              ? "border-amber-400/60 bg-amber-400/10 text-amber-100"
                              : "border-white/10 bg-white/[0.02] text-white/80 hover:bg-white/[0.05]"
                      } ${submitted ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <span className="mt-0.5">
                        {correct ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                          chosen && submitted ? <XCircle className="w-3.5 h-3.5" /> :
                            <span className="inline-block w-3.5 h-3.5 rounded-full border border-white/30" />}
                      </span>
                      <span className="flex-1">{c}</span>
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && (
                <p className="mt-2 text-[11px] text-emerald-200/90 pl-1">
                  ব্যাখ্যা: {q.explanation}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-[var(--border)] bg-black/40 backdrop-blur p-3 flex items-center justify-between gap-3">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="score"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Trophy className={`w-5 h-5 ${pct >= 70 ? "text-amber-300" : pct >= 40 ? "text-blue-300" : "text-red-300"}`} />
              <div>
                <p className="text-sm font-semibold text-white tabular-nums">
                  {score} / {total} <span className="text-[var(--text-secondary)] text-xs">({pct}%)</span>
                </p>
                <p className="text-[10px] text-white/50">
                  {pct >= 70 ? "চমৎকার!" : pct >= 40 ? "আরও অনুশীলন করো।" : "আবার চেষ্টা করো।"}
                </p>
              </div>
            </motion.div>
          ) : (
            <span className="text-[11px] text-white/60 tabular-nums">
              {Object.keys(picks).length} / {total} উত্তর দেওয়া হয়েছে
            </span>
          )}
        </AnimatePresence>
        {submitted ? (
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 transition"
            >
              আবার দাও
            </button>
            <button
              onClick={() => regenerate(count)}
              disabled={loading || !online}
              className="px-3 py-1.5 rounded-full text-xs bg-amber-400/15 border border-amber-400/40 text-amber-200 hover:bg-amber-400/25 transition disabled:opacity-40 inline-flex items-center gap-1"
            >
              <Wand2 className="w-3 h-3" /> নতুন প্রশ্ন
            </button>
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(picks).length === 0}
            className="px-4 py-1.5 rounded-full text-xs bg-emerald-400/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-400/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            জমা দাও
          </button>
        )}
      </div>
    </div>
  );
}
