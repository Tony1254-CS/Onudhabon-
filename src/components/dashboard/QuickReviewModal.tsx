import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Sparkles, BookOpen, Clock, CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeWeakness,
  SEVERITY_COLOR,
  SEVERITY_LABEL_BN,
  INTERVENTION_LABEL_BN,
  type ConceptInput,
  type SessionInput,
  type MisconceptionRecord,
} from "@/lib/weaknessAnalyzer";

type Props = {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  conceptId: string;
  concept: string;
  teacherId: string;
  nodes: ConceptInput[];
  sessions: SessionInput[];
};

export function QuickReviewModal({ open, onClose, studentId, studentName, conceptId, concept, teacherId, nodes, sessions }: Props) {
  const [misconceptions, setMisconceptions] = useState<MisconceptionRecord[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) { setNote(""); setDone(false); return; }
    (async () => {
      const { data } = await supabase
        .from("misconceptions")
        .select("user_id, concept, statement, tag, weakness_type, resolved, detected_at")
        .eq("user_id", studentId)
        .eq("concept", concept)
        .order("detected_at", { ascending: false })
        .limit(50);
      setMisconceptions((data || []) as MisconceptionRecord[]);
    })();
  }, [open, studentId, concept]);

  const node = nodes.find((n) => n.id === conceptId) || nodes.find((n) => n.user_id === studentId && n.concept === concept);
  const analysis = useMemo(() => {
    if (!node) return null;
    return analyzeWeakness(node, nodes, sessions, misconceptions);
  }, [node, nodes, sessions, misconceptions]);

  async function assign() {
    if (!analysis) return;
    setBusy(true);
    const { data: iv, error } = await supabase
      .from("interventions")
      .insert({
        student_id: studentId,
        teacher_id: teacherId,
        concept: analysis.concept,
        subject: analysis.subject,
        weakness_reason: analysis.reason,
        severity: analysis.severity,
        intervention_type: analysis.interventionType,
        suggested_action: analysis.suggestedAction,
        notes: note.trim() || null,
        mastery_before: analysis.mastery,
        status: "assigned",
      })
      .select("*")
      .single();
    if (!error && iv) {
      await supabase.from("notifications").insert({
        user_id: studentId,
        type: "intervention_assigned",
        title: `নতুন হস্তক্ষেপ: ${analysis.concept}`,
        body: note.trim() || analysis.suggestedAction,
        intervention_id: (iv as { id: string }).id,
      });
      setDone(true);
    }
    setBusy(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 bg-[#0B0F1C] shadow-2xl sm:rounded-2xl"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/5 p-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/40">দুর্বল ধারণা পর্যালোচনা</p>
                <p className="mt-0.5 truncate text-sm text-white/70">{studentName} → <span className="font-semibold text-white">{concept}</span></p>
              </div>
              <button onClick={onClose} className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {!analysis ? (
                <p className="py-8 text-center text-sm text-white/50">এই ধারণার জন্য কোনো ডেটা পাওয়া যায়নি।</p>
              ) : done ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                  <p className="mt-3 text-sm font-medium text-white">হস্তক্ষেপ অ্যাসাইন হয়েছে</p>
                  <p className="mt-1 text-xs text-white/50">শিক্ষার্থী একটি নোটিফিকেশন পাবে।</p>
                  <button
                    onClick={onClose}
                    className="mt-4 rounded-md bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/15"
                  >বন্ধ করো</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    style={{ borderColor: `${SEVERITY_COLOR[analysis.severity]}33`, backgroundColor: `${SEVERITY_COLOR[analysis.severity]}10` }}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <AlertTriangle className="h-4 w-4" style={{ color: SEVERITY_COLOR[analysis.severity] }} />
                      <span style={{ color: SEVERITY_COLOR[analysis.severity] }} className="font-semibold uppercase tracking-wider">
                        {SEVERITY_LABEL_BN[analysis.severity]}
                      </span>
                      <span className="text-white/50">· দক্ষতা {Math.round(analysis.mastery * 100)}%</span>
                    </div>
                    <span className="text-[10px] text-white/40">{analysis.lastReviewedDays === 0 ? "আজ" : `${analysis.lastReviewedDays} দিন আগে`}</span>
                  </div>

                  <Block icon={<Sparkles className="h-3.5 w-3.5" />} title="কেন দুর্বল">
                    <p className="text-sm text-white/85">{analysis.reasonLabel}</p>
                  </Block>

                  <Block icon={<BookOpen className="h-3.5 w-3.5" />} title="পরামর্শকৃত হস্তক্ষেপ">
                    <p className="text-sm text-white/85">{analysis.suggestedAction}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">টাইপ: {INTERVENTION_LABEL_BN[analysis.interventionType]}</p>
                  </Block>

                  {analysis.misconceptionExamples.length > 0 && (
                    <Block icon={<AlertTriangle className="h-3.5 w-3.5" />} title="শিক্ষার্থীর ভুল ধারণা">
                      <ul className="space-y-1">
                        {analysis.misconceptionExamples.slice(0, 3).map((m, i) => (
                          <li key={i} className="text-xs italic text-white/75">"{m}"</li>
                        ))}
                      </ul>
                    </Block>
                  )}

                  {analysis.prerequisites.length > 0 && (
                    <Block icon={<Clock className="h-3.5 w-3.5" />} title="পূর্বশর্ত">
                      <ul className="flex flex-wrap gap-1">
                        {analysis.prerequisites.map((p) => (
                          <li key={p} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/70">{p}</li>
                        ))}
                      </ul>
                    </Block>
                  )}

                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/50">শিক্ষকের নোট (ঐচ্ছিক)</label>
                    <div className="flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
                      <MessageSquare className="mt-1 h-3.5 w-3.5 shrink-0 text-white/40" />
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="শিক্ষার্থীকে কী করতে হবে — সংক্ষেপে লেখো"
                        className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {analysis && !done && (
              <div className="flex items-center justify-end gap-2 border-t border-white/5 p-3">
                <button
                  onClick={onClose}
                  className="rounded-md px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white"
                >বাতিল</button>
                <button
                  onClick={assign}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  হস্তক্ষেপ অ্যাসাইন করো
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}
