import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ArrowRight, BookOpen, ChevronDown, ChevronUp, Clock, Sparkles, TrendingDown, TrendingUp, Minus, CheckCircle2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeWeakness,
  SEVERITY_COLOR,
  SEVERITY_LABEL_BN,
  INTERVENTION_LABEL_BN,
  STATUS_LABEL_BN,
  type ConceptInput,
  type SessionInput,
  type WeaknessAnalysis,
  type MisconceptionRecord,
} from "@/lib/weaknessAnalyzer";

type Intervention = {
  id: string;
  student_id: string;
  teacher_id: string;
  concept: string;
  subject: string | null;
  weakness_reason: string;
  severity: string;
  intervention_type: string;
  suggested_action: string;
  notes: string | null;
  status: string;
  mastery_before: number | null;
  mastery_after: number | null;
  retention_delta: number | null;
  assigned_at: string;
  completed_at: string | null;
  followup_at: string | null;
  created_at: string;
};

type Props = {
  students: { id: string; full_name: string | null }[];
  nodes: ConceptInput[];
  sessions: SessionInput[];
  selectedStudentId: string | null;
  teacherId: string;
};

function DimBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-white/50">{label}</span>
        <span className="text-[11px] font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function InterventionPanel({ students, nodes, sessions, selectedStudentId, teacherId }: Props) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [misconceptions, setMisconceptions] = useState<MisconceptionRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStudent, setFilterStudent] = useState<string>(selectedStudentId || "all");

  useEffect(() => {
    setFilterStudent(selectedStudentId || "all");
  }, [selectedStudentId]);

  // Load interventions + misconceptions
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: ivs }, { data: ms }] = await Promise.all([
        supabase.from("interventions").select("*").order("assigned_at", { ascending: false }),
        supabase
          .from("misconceptions")
          .select("user_id, concept, statement, tag, weakness_type, resolved, detected_at")
          .order("detected_at", { ascending: false })
          .limit(500),
      ]);
      if (!mounted) return;
      setInterventions((ivs || []) as Intervention[]);
      setMisconceptions((ms || []) as MisconceptionRecord[]);
    })();
    return () => { mounted = false; };
  }, []);

  // Build weakness analyses for the selected (or all) student(s)
  const analyses = useMemo(() => {
    const targets = filterStudent === "all" ? students : students.filter((s) => s.id === filterStudent);
    const out: { studentId: string; studentName: string; analysis: WeaknessAnalysis; conceptId: string }[] = [];
    for (const stu of targets) {
      const stuNodes = nodes.filter((n) => n.user_id === stu.id);
      // Weak: mastery < 0.6
      const weak = stuNodes.filter((n) => (n.mastery_level ?? 0) < 0.6);
      for (const w of weak) {
        out.push({
          studentId: stu.id,
          studentName: stu.full_name || "শিক্ষার্থী",
          conceptId: w.id,
          analysis: analyzeWeakness(w, nodes, sessions, misconceptions),
        });
      }
    }
    return out.sort((a, b) => b.analysis.severityScore - a.analysis.severityScore).slice(0, 12);
  }, [students, nodes, sessions, filterStudent, misconceptions]);

  async function assignIntervention(item: typeof analyses[number]) {
    setBusyId(item.conceptId);
    const { data, error } = await supabase
      .from("interventions")
      .insert({
        student_id: item.studentId,
        teacher_id: teacherId,
        concept: item.analysis.concept,
        subject: item.analysis.subject,
        weakness_reason: item.analysis.reason,
        severity: item.analysis.severity,
        intervention_type: item.analysis.interventionType,
        suggested_action: item.analysis.suggestedAction,
        mastery_before: item.analysis.mastery,
        status: "assigned",
      })
      .select("*")
      .single();
    setBusyId(null);
    if (!error && data) setInterventions((prev) => [data as Intervention, ...prev]);
  }

  async function updateStatus(iv: Intervention, status: string) {
    const patch: Partial<Intervention> = { status };
    if (status === "completed" || status === "improved") {
      patch.completed_at = new Date().toISOString();
      // Capture current mastery as mastery_after
      const node = nodes.find((n) => n.user_id === iv.student_id && n.concept === iv.concept);
      if (node) {
        patch.mastery_after = node.mastery_level ?? 0;
        if (iv.mastery_before != null) {
          patch.retention_delta = (node.mastery_level ?? 0) - iv.mastery_before;
        }
      }
    }
    const { data } = await supabase
      .from("interventions")
      .update(patch)
      .eq("id", iv.id)
      .select("*")
      .single();
    if (data) setInterventions((prev) => prev.map((p) => (p.id === iv.id ? (data as Intervention) : p)));
  }

  const history = useMemo(() => {
    if (filterStudent === "all") return interventions.slice(0, 20);
    return interventions.filter((i) => i.student_id === filterStudent);
  }, [interventions, filterStudent]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-white/50">শিক্ষার্থী নির্বাচন করো — দুর্বল ধারণা ও স্বয়ংক্রিয় হস্তক্ষেপ পরামর্শ দেখাও</p>
        <select
          value={filterStudent}
          onChange={(e) => setFilterStudent(e.target.value)}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="all">সকল শিক্ষার্থী</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name || "Unnamed"}</option>
          ))}
        </select>
      </div>

      {/* Weak concepts with intervention suggestions */}
      <div className="space-y-3">
        {analyses.length === 0 && (
          <p className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-center text-sm text-white/50">
            কোনো দুর্বল ধারণা পাওয়া যায়নি — দারুণ!
          </p>
        )}
        {analyses.map((item) => {
          const a = item.analysis;
          const color = SEVERITY_COLOR[a.severity];
          const isOpen = expanded === item.conceptId;
          const existing = interventions.find(
            (iv) => iv.student_id === item.studentId && iv.concept === a.concept && iv.status !== "completed" && iv.status !== "improved",
          );
          return (
            <motion.div
              key={item.conceptId}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-xl border bg-white/[0.02]"
              style={{ borderColor: `${color}33` }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : item.conceptId)}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-white/50">{item.studentName}</span>
                    <ArrowRight className="h-3 w-3 text-white/30" />
                    <span className="font-medium text-white">{a.concept}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {SEVERITY_LABEL_BN[a.severity]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/60">
                    <span className="text-white/80">কারণ:</span> {a.reasonLabel} · দক্ষতা {Math.round(a.mastery * 100)}%
                  </p>
                </div>
                <TrendBadge trend={a.trend} delta={a.trendDelta} />
                {isOpen ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 px-4 pb-4 pt-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Block icon={<Sparkles className="h-3.5 w-3.5" />} title="পরামর্শ">
                        <p className="text-sm text-white/80">{a.suggestedAction}</p>
                        <p className="mt-1 text-[11px] text-white/40">টাইপ: {INTERVENTION_LABEL_BN[a.interventionType]}</p>
                      </Block>
                      <Block icon={<BookOpen className="h-3.5 w-3.5" />} title="পূর্বশর্ত">
                        {a.prerequisites.length === 0 ? (
                          <p className="text-xs text-white/40">কোনো পূর্বশর্ত যোগ করা নেই</p>
                        ) : (
                          <ul className="flex flex-wrap gap-1">
                            {a.prerequisites.map((p) => (
                              <li key={p} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/70">{p}</li>
                            ))}
                          </ul>
                        )}
                      </Block>
                      <Block icon={<AlertTriangle className="h-3.5 w-3.5" />} title="সাম্প্রতিক ভুল">
                        {a.recentMistakes.length === 0 ? (
                          <p className="text-xs text-white/40">নথিবদ্ধ ভুল নেই</p>
                        ) : (
                          <ul className="space-y-1">
                            {a.recentMistakes.map((m, i) => (
                              <li key={i} className="text-xs text-white/70">• {m}</li>
                            ))}
                          </ul>
                        )}
                      </Block>
                      <Block icon={<Clock className="h-3.5 w-3.5" />} title="শেষ পর্যালোচনা">
                        <p className="text-sm text-white/80">{a.lastReviewedDays === 0 ? "আজ" : `${a.lastReviewedDays} দিন আগে`}</p>
                        <p className="mt-1 text-[11px] text-white/40">গুরুত্বের স্কোর: {a.severityScore}/100</p>
                      </Block>
                    </div>

                    {a.misconceptionExamples.length > 0 && (
                      <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-300">
                          <AlertTriangle className="h-3.5 w-3.5" /> সঠিক ভুল ধারণা
                        </p>
                        <ul className="space-y-1">
                          {a.misconceptionExamples.map((m, i) => (
                            <li key={i} className="text-xs italic text-white/80">"{m}"</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      <DimBar label="পরিচিতি" value={a.dimensions.exposure} color="#60A5FA" />
                      <DimBar label="বোধগম্যতা" value={a.dimensions.understanding} color="#22D3EE" />
                      <DimBar label="প্রয়োগ" value={a.dimensions.application} color="#A78BFA" />
                      <DimBar label="ধারণ" value={a.dimensions.retention} color="#F59E0B" />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {existing ? (
                        <>
                          <span className="rounded-md bg-blue-500/15 px-3 py-1.5 text-xs text-blue-200">
                            {STATUS_LABEL_BN[existing.status] || existing.status}
                          </span>
                          <button
                            onClick={() => updateStatus(existing, "completed")}
                            className="flex items-center gap-1 rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/30"
                          >
                            <CheckCircle2 className="h-3 w-3" /> সম্পন্ন
                          </button>
                          <button
                            onClick={() => updateStatus(existing, "retry")}
                            className="flex items-center gap-1 rounded-md bg-amber-500/20 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-500/30"
                          >
                            <RotateCcw className="h-3 w-3" /> পুনরায় চেষ্টা
                          </button>
                        </>
                      ) : (
                        <button
                          disabled={busyId === item.conceptId}
                          onClick={() => assignIntervention(item)}
                          className="flex items-center gap-1 rounded-md bg-amber-500/25 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/35 disabled:opacity-50"
                        >
                          {busyId === item.conceptId ? "যোগ হচ্ছে…" : "হস্তক্ষেপ অ্যাসাইন করো"}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Intervention history timeline */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60">
          <Clock className="h-3.5 w-3.5" /> হস্তক্ষেপের ইতিহাস
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-white/40">এখনো কোনো হস্তক্ষেপ অ্যাসাইন করা হয়নি।</p>
        ) : (
          <ol className="relative ml-2 space-y-3 border-l border-white/10 pl-4">
            {history.map((iv) => {
              const studentName = students.find((s) => s.id === iv.student_id)?.full_name || "শিক্ষার্থী";
              const before = Math.round((iv.mastery_before ?? 0) * 100);
              const after = iv.mastery_after != null ? Math.round(iv.mastery_after * 100) : null;
              const delta = iv.retention_delta != null ? Math.round(iv.retention_delta * 100) : null;
              return (
                <li key={iv.id} className="relative">
                  <span
                    className="absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-[#080B14]"
                    style={{ backgroundColor: SEVERITY_COLOR[iv.severity as keyof typeof SEVERITY_COLOR] || "#64748B" }}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span>{new Date(iv.assigned_at).toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}</span>
                    <span className="text-white/30">·</span>
                    <span>{studentName}</span>
                    <span className="text-white/30">·</span>
                    <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
                      {STATUS_LABEL_BN[iv.status] || iv.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-white">
                    <span className="font-medium">{iv.concept}</span> — {INTERVENTION_LABEL_BN[iv.intervention_type as keyof typeof INTERVENTION_LABEL_BN] || iv.intervention_type}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-white/50">আগে: <span className="text-white/80">{before}%</span></span>
                    {after != null && (
                      <>
                        <ArrowRight className="h-3 w-3 text-white/30" />
                        <span className="text-white/50">পরে: <span className="text-white/80">{after}%</span></span>
                        {delta != null && (
                          <span
                            className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                            style={{
                              backgroundColor: delta >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                              color: delta >= 0 ? "#34D399" : "#F87171",
                            }}
                          >
                            {delta >= 0 ? "+" : ""}{delta}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
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

function TrendBadge({ trend, delta }: { trend: "improving" | "declining" | "flat"; delta: number }) {
  const Icon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
  const color = trend === "improving" ? "#34D399" : trend === "declining" ? "#F87171" : "#94A3B8";
  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}{delta}%
    </span>
  );
}

