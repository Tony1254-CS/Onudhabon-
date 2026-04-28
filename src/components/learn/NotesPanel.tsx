import { useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Download, RefreshCw, Sparkles, WifiOff, AlertCircle, CheckCircle2, Lightbulb, FileText } from "lucide-react";
import { useTopicNotes, type Notes } from "@/hooks/useTopicResources";

export function NotesPanel({ topic, online }: { topic: string; online: boolean }) {
  const { data, loading, error, fromCache, generate } = useTopicNotes(topic);

  // auto-generate on first mount with topic
  useEffect(() => {
    if (topic && !data && !loading && online) {
      generate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const download = () => {
    if (!data) return;
    const text = notesToText(data);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.title || topic}-notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!topic) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center font-bangla text-xs text-[var(--text-secondary)]/70">
        একটি বিষয় শুরু করো — তোমার নোট স্বয়ংক্রিয়ভাবে তৈরি হবে।
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-[var(--border)] bg-black/30 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] truncate">
            {data?.title || topic}
          </span>
          {fromCache && (
            <span
              title="অফলাইনে সংরক্ষিত"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[9px] font-medium"
            >
              <CheckCircle2 className="w-2.5 h-2.5" /> Offline
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => generate(true)}
            disabled={loading || !online}
            title={online ? "নতুনভাবে তৈরি করো" : "অফলাইনে regenerate করা যাবে না"}
            className="p-1.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={download}
            disabled={!data}
            title="ডাউনলোড"
            className="p-1.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 font-bangla text-[var(--text-primary)]">
        {!data && loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-xs text-[var(--text-secondary)]">
            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
            নোট তৈরি হচ্ছে…
          </div>
        )}

        {!data && !loading && error === "offline_no_cache" && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-xs text-[var(--text-secondary)] px-4">
            <WifiOff className="w-6 h-6 text-white/40" />
            <p>এই বিষয়ের নোট অফলাইনে নেই।<br />ইন্টারনেট আসলে আবার চেষ্টা করো।</p>
          </div>
        )}

        {!data && !loading && error && error !== "offline_no_cache" && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-xs text-red-300/80 px-4">
            <AlertCircle className="w-6 h-6" />
            নোট তৈরি করতে সমস্যা হয়েছে।
            <button
              onClick={() => generate(true)}
              className="mt-1 px-3 py-1.5 rounded-md border border-white/15 hover:bg-white/10 text-white/80 text-[11px]"
            >
              আবার চেষ্টা করো
            </button>
          </div>
        )}

        {!data && !loading && !error && !online && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-xs text-[var(--text-secondary)] px-4">
            <WifiOff className="w-6 h-6 text-white/40" />
            অফলাইন — নতুন নোট তৈরি করতে সংযোগ প্রয়োজন।
          </div>
        )}

        {data && (
          <div className="space-y-5 text-sm leading-relaxed">
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-3 border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.06] to-transparent"
            >
              <h3 className="text-base font-semibold mb-1 text-amber-200 text-balance">{data.title}</h3>
              <p className="text-xs text-white/80 leading-relaxed">{data.summary}</p>
            </motion.div>

            {data.sections.map((s, i) => (
              <motion.section
                key={i}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <h4 className="flex items-center gap-2 text-xs font-semibold text-white/90 mb-2">
                  <span className="w-1 h-3.5 rounded-full bg-amber-400/70" />
                  {s.heading}
                </h4>
                <ul className="space-y-1.5 text-xs text-white/80 pl-3">
                  {s.points.map((p, j) => (
                    <li key={j} className="relative pl-3 before:absolute before:left-0 before:top-1.5 before:w-1 before:h-1 before:rounded-full before:bg-white/40">
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.section>
            ))}

            {data.formulas && data.formulas.length > 0 && (
              <section>
                <h4 className="flex items-center gap-2 text-xs font-semibold text-white/90 mb-2">
                  <FileText className="w-3 h-3 text-blue-400" /> সূত্র
                </h4>
                <div className="space-y-2">
                  {data.formulas.map((f, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                      <div className="text-[11px] text-white/60 mb-0.5">{f.name}</div>
                      <code className="block text-sm text-blue-200 font-mono mb-1">{f.expression}</code>
                      <p className="text-[11px] text-white/70">{f.meaning}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h4 className="flex items-center gap-2 text-xs font-semibold text-white/90 mb-2">
                <Sparkles className="w-3 h-3 text-purple-400" /> উদাহরণ
              </h4>
              <ul className="space-y-1.5 text-xs text-white/80">
                {data.examples.map((e, i) => (
                  <li key={i} className="rounded-md border border-white/10 bg-white/[0.02] p-2">{e}</li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="flex items-center gap-2 text-xs font-semibold text-white/90 mb-2">
                <Lightbulb className="w-3 h-3 text-amber-400" /> মনে রাখার টিপস
              </h4>
              <ul className="space-y-1 text-xs text-amber-100/90">
                {data.tips.map((t, i) => (
                  <li key={i} className="pl-3 relative before:absolute before:left-0 before:top-1.5 before:w-1 before:h-1 before:rounded-full before:bg-amber-300">
                    {t}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="flex items-center gap-2 text-xs font-semibold text-white/90 mb-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Quick Quiz
              </h4>
              <div className="space-y-2">
                {data.quiz.map((q, i) => (
                  <details key={i} className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-2.5">
                    <summary className="cursor-pointer text-xs text-white/90 marker:text-emerald-300">
                      {i + 1}. {q.question}
                    </summary>
                    <p className="mt-1.5 text-[11px] text-emerald-200/90 pl-3 border-l border-emerald-400/30">
                      {q.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function notesToText(n: Notes): string {
  const lines: string[] = [];
  lines.push(n.title);
  lines.push("=".repeat(n.title.length));
  lines.push("");
  lines.push(n.summary);
  lines.push("");
  for (const s of n.sections) {
    lines.push(`## ${s.heading}`);
    s.points.forEach((p) => lines.push(`  • ${p}`));
    lines.push("");
  }
  if (n.formulas?.length) {
    lines.push("## সূত্র");
    n.formulas.forEach((f) => lines.push(`  ${f.name}: ${f.expression} — ${f.meaning}`));
    lines.push("");
  }
  lines.push("## উদাহরণ");
  n.examples.forEach((e) => lines.push(`  • ${e}`));
  lines.push("");
  lines.push("## টিপস");
  n.tips.forEach((t) => lines.push(`  • ${t}`));
  lines.push("");
  lines.push("## Quiz");
  n.quiz.forEach((q, i) => {
    lines.push(`  ${i + 1}. ${q.question}`);
    lines.push(`     উত্তর: ${q.answer}`);
  });
  return lines.join("\n");
}
