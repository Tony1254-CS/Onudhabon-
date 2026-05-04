import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, RefreshCw, Trophy, Sparkles, WifiOff } from "lucide-react";
import { useTopicNotes } from "@/hooks/useTopicResources";
import { saveQuizResult } from "@/hooks/useTopicResources";

type Q = { question: string; answer: string; choices: string[]; correctIdx: number };

function scrambleChoices(quiz: { question: string; answer: string }[]): Q[] {
  // build distractors by sampling other answers
  return quiz.map((q, i) => {
    const distractors = quiz
      .filter((_, j) => j !== i)
      .map((d) => d.answer)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const choices = [...distractors, q.answer].sort(() => Math.random() - 0.5);
    return { ...q, choices, correctIdx: choices.indexOf(q.answer) };
  });
}

export function QuizPanel({ topic, online, onSubmit }: { topic: string; online: boolean; onSubmit?: (result: { score: number; total: number }) => void }) {
  const { data, loading, generate, fromCache } = useTopicNotes(topic);
  const questions = useMemo<Q[]>(() => (data?.quiz ? scrambleChoices(data.quiz) : []), [data]);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [questionCount, setQuestionCount] = useState(8);

  // Auto-generate notes (which contains quiz) if none yet
  useEffect(() => {
    if (topic && !data && !loading && online) generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  // Reset state when topic changes
  useEffect(() => { setPicks({}); setSubmitted(false); setQuestionCount(8); }, [topic]);

  const visibleQuestions = useMemo(() => questions.slice(0, Math.min(questionCount, questions.length)), [questionCount, questions]);

  const score = useMemo(() => {
    if (!visibleQuestions.length) return 0;
    return visibleQuestions.reduce((acc, q, i) => acc + (picks[i] === q.correctIdx ? 1 : 0), 0);
  }, [picks, visibleQuestions]);

  const total = visibleQuestions.length;
  const pct = total ? Math.round((score / total) * 100) : 0;

  const handleSubmit = () => {
    setSubmitted(true);
    if (total > 0) {
      saveQuizResult({ topic, score, total, takenAt: Date.now() });
      onSubmit?.({ score, total });
    }
  };

  const reset = () => { setPicks({}); setSubmitted(false); };

  if (!topic) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center font-bangla text-xs text-[var(--text-secondary)]/70">
        একটি বিষয় শুরু করো — কুইজ স্বয়ংক্রিয়ভাবে তৈরি হবে।
      </div>
    );
  }

  if (!data && loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-xs text-[var(--text-secondary)] font-bangla">
        <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
        কুইজ তৈরি হচ্ছে…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-xs text-[var(--text-secondary)] font-bangla px-4">
        <WifiOff className="w-6 h-6 text-white/40" />
        এই বিষয়ের কুইজ এখনো প্রস্তুত নয়।
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-bangla">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-[var(--border)] bg-black/30 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] truncate">
            {data.title || topic} · কুইজ
          </span>
          {fromCache && (
            <span className="px-1.5 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[9px] font-medium">
              Offline
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {questions.length > 0 && (
            <div className="hidden sm:flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5 mr-1">
              {[5, 8, questions.length].map((count, idx) => {
                const value = idx === 2 ? questions.length : Math.min(count, questions.length);
                const active = questionCount === value;
                return (
                  <button
                    key={`${count}-${idx}`}
                    onClick={() => { setQuestionCount(value); setPicks({}); setSubmitted(false); }}
                    className={`px-2.5 py-1 rounded-full text-[10px] transition ${active ? "bg-amber-400/20 text-amber-100" : "text-white/60 hover:text-white"}`}
                  >
                    {idx === 2 ? "সব" : `${value}Q`}
                  </button>
                );
              })}
            </div>
          )}
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
        {visibleQuestions.map((q, i) => {
          const picked = picks[i];
          const isCorrect = submitted && picked === q.correctIdx;
          const isWrong = submitted && picked !== undefined && picked !== q.correctIdx;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
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
              {submitted && (
                <p className="mt-2 text-[11px] text-emerald-200/90 pl-1">
                  উত্তর: {q.answer}
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
          <button
            onClick={reset}
            className="px-4 py-1.5 rounded-full text-xs bg-amber-400/15 border border-amber-400/40 text-amber-200 hover:bg-amber-400/25 transition"
          >
            আবার দাও
          </button>
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
