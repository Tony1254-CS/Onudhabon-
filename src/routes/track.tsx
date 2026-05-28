import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, Loader2, KeyRound, Activity, Brain,
  AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { toast } from "sonner";
import { StudentDetail, type RichStudentData, type SubjectMastery, type SparklineDay, type RecentSession, type CognitiveDist, type LearningGoal } from "@/components/track/StudentDetail";
import { ParentMessageModal } from "@/components/track/ParentMessageModal";

export const Route = createFileRoute("/track")({
  head: () => ({ meta: [{ title: "শিক্ষার্থী ট্র্যাকিং — অনুধাবন AI" }] }),
  component: TrackPage,
});

type LinkedStudent = {
  link_id: string;
  student_id: string;
  full_name: string | null;
  nickname: string | null;
  class_level: string | null;
  conceptCount: number;
  avgMastery: number;
  weakest: string | null;
  lastSession: string | null;
  cognitiveState: string | null;
  richData: RichStudentData | null;
};

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  focused: { label: "মনোযোগী", color: "#10B981" },
  confused: { label: "বিভ্রান্ত", color: "#F59E0B" },
  overloaded: { label: "অতিরিক্ত", color: "#EF4444" },
  disengaged: { label: "নিষ্ক্রিয়", color: "#6B7280" },
  "mastery-ready": { label: "দক্ষতাপ্রস্তুত", color: "#3B82F6" },
  flow: { label: "ফ্লো", color: "#8B5CF6" },
  exploring: { label: "অন্বেষণ", color: "#22C55E" },
};

const KNOWN_SUBJECTS = ["পদার্থবিজ্ঞান", "রসায়ন", "জীববিজ্ঞান", "গণিত"];

function TrackPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string>("student");
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<LinkedStudent | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      if (!mounted) return;
      setUserId(session.user.id);
      const { data: p } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      if (mounted) setRole(p?.role || "student");
      await loadLinks(session.user.id);
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [navigate]);

  // Real-time refresh
  useEffect(() => {
    if (!userId || !students.length) return;
    const ids = new Set(students.map((s) => s.student_id));
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const trigger = (uid: string) => {
      if (!ids.has(uid)) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => loadLinks(userId), 400);
    };
    const channel = supabase
      .channel(`track-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "concept_nodes" },
        (payload) => trigger((payload.new as { user_id?: string })?.user_id || (payload.old as { user_id?: string })?.user_id || ""))
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" },
        (payload) => trigger((payload.new as { user_id?: string })?.user_id || (payload.old as { user_id?: string })?.user_id || ""))
      .subscribe();
    return () => {
      if (debounce) clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [userId, students]);

  const loadLinks = async (uid: string) => {
    const { data: links } = await supabase
      .from("student_links")
      .select("id, student_id")
      .eq("observer_id", uid);
    const ids = (links || []).map((l) => l.student_id);
    if (!ids.length) { setStudents([]); return; }

    // Expanded fetch — includes subject, cognitive_state per session for distribution
    const [{ data: profs }, { data: nodes }, { data: sess }, { data: goals }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, nickname, class_level").in("id", ids),
      supabase.from("concept_nodes").select("user_id, concept, mastery_level, subject").in("user_id", ids),
      supabase.from("sessions").select("user_id, created_at, cognitive_state, topic, mastery_score, subject").in("user_id", ids).order("created_at", { ascending: false }).limit(200),
      supabase.from("learning_goals" as any).select("id, user_id, title, completed").in("user_id", ids).limit(50),
    ]);

    const profMap = new Map((profs || []).map((p) => [p.id, p]));
    const nodesByUser = new Map<string, { concept: string; mastery: number; subject: string | null }[]>();
    (nodes || []).forEach((n) => {
      const arr = nodesByUser.get(n.user_id) || [];
      arr.push({ concept: n.concept, mastery: n.mastery_level || 0, subject: n.subject });
      nodesByUser.set(n.user_id, arr);
    });
    // Use plain any[] to avoid typeof-null issues
    const sessByUser = new Map<string, any[]>(ids.map((id) => [id, []]));
    (sess || []).forEach((s: any) => {
      const arr = sessByUser.get(s.user_id) || [];
      arr.push(s);
      sessByUser.set(s.user_id, arr);
    });
    const goalsByUser = new Map<string, any[]>(ids.map((id) => [id, []]));
    ((goals as any[]) || []).forEach((g: any) => {
      const arr = goalsByUser.get(g.user_id) || [];
      arr.push(g);
      goalsByUser.set(g.user_id, arr);
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result: LinkedStudent[] = (links || []).map((l) => {
      const p = profMap.get(l.student_id);
      const ns = nodesByUser.get(l.student_id) || [];
      const userSess = sessByUser.get(l.student_id) || [];
      const userGoals = (goalsByUser.get(l.student_id) || []) as any[];
      const avg = ns.length ? ns.reduce((a, n) => a + n.mastery, 0) / ns.length : 0;
      const sorted = [...ns].sort((a, b) => a.mastery - b.mastery);
      const weakest = sorted[0]?.concept ?? null;
      const last = userSess[0];

      // Rich data —————————————————————————
      // Subject mastery
      const subjectMap = new Map<string, number[]>();
      ns.forEach((n) => {
        const subj = n.subject ?? "অন্যান্য";
        (subjectMap.get(subj) ?? subjectMap.set(subj, []).get(subj)!).push(n.mastery);
      });
      const subjectMastery: SubjectMastery[] = [...subjectMap.entries()]
        .map(([subject, ms]) => ({ subject, mastery: ms.reduce((a, b) => a + b, 0) / ms.length }))
        .sort((a, b) => KNOWN_SUBJECTS.indexOf(a.subject) - KNOWN_SUBJECTS.indexOf(b.subject));

      // 7-day sparkline
      const sparkline7d: SparklineDay[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(); day.setDate(day.getDate() - i); day.setHours(0, 0, 0, 0);
        const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
        const daySess = userSess.filter((s) => {
          const t = new Date(s.created_at); return t >= day && t < nextDay;
        });
        const dayAvg = daySess.length ? daySess.reduce((a, s) => a + (s.mastery_score ?? 0), 0) / daySess.length : 0;
        sparkline7d.push({ date: day.toLocaleDateString("bn-BD", { day: "numeric" }), sessions: daySess.length, avgMastery: dayAvg });
      }

      // Strengths & weaknesses
      const strengthConcepts = [...ns].sort((a, b) => b.mastery - a.mastery).slice(0, 3);
      const weakConcepts = [...ns].sort((a, b) => a.mastery - b.mastery).filter((n) => n.mastery < 0.6).slice(0, 3);

      // Recent sessions
      const recentSessions: RecentSession[] = userSess.slice(0, 5).map((s) => ({
        topic: s.topic ?? "—",
        cognitiveState: s.cognitive_state,
        createdAt: s.created_at,
      }));

      // Cognitive distribution last 7 days
      const recentSess = userSess.filter((s) => new Date(s.created_at) >= sevenDaysAgo);
      const cognitiveDist: CognitiveDist = { focused: 0, confused: 0, overloaded: 0, disengaged: 0 };
      recentSess.forEach((s) => {
        const state = s.cognitive_state;
        if (state === "focused" || state === "flow" || state === "mastery-ready") cognitiveDist.focused++;
        else if (state === "confused") cognitiveDist.confused++;
        else if (state === "overloaded") cognitiveDist.overloaded++;
        else if (state === "disengaged") cognitiveDist.disengaged++;
      });

      // Learning goals
      const learningGoals: LearningGoal[] = userGoals.map((g: any) => ({
        id: g.id,
        title: g.title,
        completed: g.completed ?? false,
      }));

      const richData: RichStudentData = {
        subjectMastery,
        sparkline7d,
        strengthConcepts,
        weakConcepts,
        recentSessions,
        cognitiveDistribution7d: cognitiveDist,
        learningGoals,
      };

      return {
        link_id: l.id,
        student_id: l.student_id,
        full_name: p?.full_name ?? null,
        nickname: p?.nickname ?? null,
        class_level: p?.class_level ?? null,
        conceptCount: ns.length,
        avgMastery: avg,
        weakest,
        lastSession: last?.created_at ?? null,
        cognitiveState: last?.cognitive_state ?? null,
        richData,
      };
    });
    setStudents(result);
  };

  const addByCode = async () => {
    if (!userId || !code.trim()) return;
    if (code.trim().length !== 8) { toast.error("কোড ৮ অক্ষরের হতে হবে"); return; }
    setAdding(true);
    try {
      const { data, error } = await supabase.rpc("find_student_by_code", { _code: code.trim().toUpperCase() });
      if (error) throw error;
      const found = (data as Array<{ id: string; full_name: string | null }> | null)?.[0];
      if (!found) { toast.error("এই কোডে কোনো শিক্ষার্থী পাওয়া যায়নি"); return; }
      if (found.id === userId) { toast.error("নিজের কোড যোগ করা যাবে না"); return; }
      const relation = role === "teacher" ? "teacher" : "parent";
      const { error: linkErr } = await supabase
        .from("student_links")
        .insert({ observer_id: userId, student_id: found.id, relation });
      if (linkErr) {
        if (String(linkErr.message).includes("duplicate")) toast.error("ইতিমধ্যে যুক্ত");
        else toast.error("যুক্ত করা যায়নি");
        return;
      }
      toast.success(`${found.full_name || "শিক্ষার্থী"} যুক্ত হয়েছে`);
      setCode("");
      await loadLinks(userId);
    } catch (e) {
      console.error(e);
      toast.error("সমস্যা হয়েছে");
    } finally {
      setAdding(false);
    }
  };

  const removeLink = async (link_id: string) => {
    if (!confirm("লিংক সরাবে?")) return;
    setStudents((p) => p.filter((s) => s.link_id !== link_id));
    await supabase.from("student_links").delete().eq("id", link_id);
  };

  const stats = useMemo(() => {
    if (!students.length) return null;
    const avg = students.reduce((a, s) => a + s.avgMastery, 0) / students.length;
    const struggling = students.filter((s) => s.avgMastery < 0.4 && s.conceptCount > 0).length;
    return { count: students.length, avg, struggling };
  }, [students]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B14] text-white">
        <Navbar />
        <div className="grid min-h-[60vh] place-items-center text-white/50">লোড হচ্ছে…</div>
      </div>
    );
  }

  if (role === "student") {
    return (
      <div className="min-h-screen bg-[#080B14] text-white">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 pt-24 text-center">
          <p className="text-white/60">এই পেজটি অভিভাবক ও শিক্ষকদের জন্য।</p>
          <Link to="/student" className="mt-4 inline-block text-amber-300 underline">তোমার ড্যাশবোর্ডে যাও</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080B14] text-white antialiased">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-24">
        <Link to={role === "teacher" ? "/dashboard" : "/"} className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <ArrowLeft className="h-3 w-3" /> ফিরে যাও
        </Link>

        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">শিক্ষার্থী ট্র্যাকিং</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              LIVE
            </span>
          </div>
          <p className="mt-1 text-sm text-white/50">শিক্ষার্থীর ৮-অক্ষরের কোড দিয়ে যোগ করো — তারপর তার অগ্রগতি real-time দেখতে পারবে</p>
        </motion.header>

        {/* Comparison strip — when 2+ students */}
        {students.length >= 2 && (
          <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-white/30 font-bangla">তুলনা</p>
            <div className="space-y-2.5">
              {students.map((s) => {
                const name = s.nickname || s.full_name || "Unnamed";
                const avg = Math.round(s.avgMastery * 100);
                const color = avg >= 70 ? "#10B981" : avg >= 40 ? "#F59E0B" : "#EF4444";
                return (
                  <div key={s.student_id} className="flex items-center gap-3">
                    <div className="w-24 shrink-0 truncate text-xs text-white/60 font-bangla">{name}</div>
                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${avg}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full rounded-full"
                        style={{ background: color }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-white/40">{avg}%</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Add by code */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/70">
            <KeyRound className="h-4 w-4" /> কোড দিয়ে যোগ করো
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
              placeholder="যেমন: AB23CD45"
              maxLength={8}
              className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm tracking-[0.3em] outline-none focus:border-amber-400/50"
            />
            <button
              onClick={addByCode}
              disabled={adding || code.length !== 8}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              যোগ করো
            </button>
          </div>
        </section>

        {/* Summary */}
        {stats && (
          <section className="mb-6 grid grid-cols-3 gap-3">
            <Stat label="ট্র্যাক করছ" value={stats.count} accent="#3B82F6" />
            <Stat label="গড় দক্ষতা" value={`${Math.round(stats.avg * 100)}%`} accent="#F59E0B" />
            <Stat label="সংগ্রামরত" value={stats.struggling} accent="#EF4444" />
          </section>
        )}

        {/* Student list */}
        {students.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center text-sm text-white/40">
            এখনো কোনো শিক্ষার্থী যোগ করোনি — উপরে কোড দিয়ে শুরু করো।
          </p>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence>
              {students.map((s) => {
                const name = s.nickname || s.full_name || "Unnamed";
                const avg = Math.round(s.avgMastery * 100);
                const stateInfo = s.cognitiveState ? STATE_LABELS[s.cognitiveState] : null;
                const isExpanded = expandedId === s.student_id;

                return (
                  <motion.li
                    key={s.link_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="group rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-[background-color,box-shadow] hover:bg-white/[0.03]"
                    style={{ boxShadow: isExpanded ? "0 0 30px rgba(245,158,11,0.06)" : undefined }}
                  >
                    {/* Card header — always visible, click to expand */}
                    <div
                      className="flex cursor-pointer items-start gap-3 p-4"
                      onClick={() => setExpandedId(isExpanded ? null : s.student_id)}
                    >
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-blue-500 text-base font-bold text-black">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-base font-semibold text-white">{name}</p>
                          {stateInfo && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${stateInfo.color}20`, color: stateInfo.color }}>
                              {stateInfo.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40">{s.class_level || "—"}</p>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                          <Mini icon={Brain} label="ধারণা" value={s.conceptCount} />
                          <Mini icon={Activity} label="দক্ষতা" value={s.conceptCount ? `${avg}%` : "—"}
                            color={s.conceptCount === 0 ? undefined : avg >= 70 ? "#10B981" : avg >= 40 ? "#F59E0B" : "#EF4444"} />
                          <Mini icon={AlertTriangle} label="দুর্বলতম" value={s.weakest || "—"} />
                        </div>

                        {s.conceptCount > 0 && (
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${avg}%`,
                              background: avg >= 70 ? "#10B981" : avg >= 40 ? "#F59E0B" : "#EF4444",
                            }} />
                          </div>
                        )}

                        {s.lastSession && (
                          <p className="mt-2 text-[10px] text-white/40">
                            শেষ সেশন: {new Date(s.lastSession).toLocaleString("bn-BD")}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); removeLink(s.link_id); }}
                          className="rounded-md p-1.5 text-red-400/70 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-white/20">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                      </div>
                    </div>

                    {/* Expanded detail — animated via motion.div, no nested AnimatePresence */}
                    <AnimatePresence initial={false}>
                      {isExpanded && s.richData && (
                        <motion.div
                          key="detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden px-4 pb-4"
                        >
                          <StudentDetail
                            data={s.richData}
                            onMessage={() => setMessageTarget(s)}
                            onPrint={() => window.print()}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </main>

      {/* Parent message modal */}
      {messageTarget && userId && (
        <ParentMessageModal
          open={!!messageTarget}
          onClose={() => setMessageTarget(null)}
          studentId={messageTarget.student_id}
          studentName={messageTarget.nickname || messageTarget.full_name || "শিক্ষার্থী"}
          parentId={userId}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function Mini({ icon: Icon, label, value, color }: { icon: typeof Brain; label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
      <div className="flex items-center gap-1 text-white/40">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 truncate text-xs font-semibold tabular-nums" style={{ color: color || "rgba(255,255,255,0.9)" }}>{value}</p>
    </div>
  );
}
