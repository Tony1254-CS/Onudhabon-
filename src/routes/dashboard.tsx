import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, Target, AlertTriangle, Activity, Printer, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { StatCard, MasteryRing } from "@/components/dashboard/StatCard";
import { StudentList } from "@/components/dashboard/StudentList";
import { ConceptHeatmap } from "@/components/dashboard/ConceptHeatmap";
import { MasteryChart } from "@/components/dashboard/MasteryChart";
import { Timeline, type TimelineEntry } from "@/components/dashboard/Timeline";
import { InterventionPanel } from "@/components/dashboard/InterventionPanel";
import { QuickReviewModal } from "@/components/dashboard/QuickReviewModal";
import type { ConceptInput, SessionInput } from "@/lib/weaknessAnalyzer";

export type StudentRow = {
  id: string;
  full_name: string | null;
  class_level: string | null;
  cognitive_state: string | null;
  last_active: string | null;
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — অনুধাবন AI" }] }),
  component: DashboardPage,
});

type ConceptNode = { id: string; user_id: string; concept: string; subject: string | null; mastery_level: number | null; last_reviewed: string | null; created_at: string; confidence?: number | null; interaction_count?: number | null; misconception_count?: number | null; state?: string | null; prerequisites?: string[] | null };
type Session = { id: string; user_id: string; topic: string | null; subject: string | null; mastery_score: number | null; cognitive_state: string | null; created_at: string };

function DashboardPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chartStudent, setChartStudent] = useState<string>("all");
  const [reviewTarget, setReviewTarget] = useState<{ studentId: string; studentName: string; conceptId: string; concept: string } | null>(null);

  // Auth + role gate
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      if (!mounted) return;
      const role = profile?.role;
      if (role === "student") { navigate({ to: "/learn" }); return; }
      if (role !== "teacher" && role !== "parent") { navigate({ to: "/learn" }); return; }
      setTeacherId(session.user.id);
      setAllowed(true);
      setAuthChecked(true);
    })();
    return () => { mounted = false; };
  }, [navigate]);

  // Fetch data
  useEffect(() => {
    if (!allowed) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: profs }, { data: cn }, { data: ss }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, class_level, role").eq("role", "student"),
        supabase.from("concept_nodes").select("*"),
        supabase.from("sessions").select("id, user_id, topic, subject, mastery_score, cognitive_state, created_at").order("created_at", { ascending: false }),
      ]);
      if (!mounted) return;

      const sessionsByUser = new Map<string, Session>();
      (ss || []).forEach((s) => { if (!sessionsByUser.has(s.user_id)) sessionsByUser.set(s.user_id, s as Session); });

      const studentRows: StudentRow[] = (profs || []).map((p) => {
        const last = sessionsByUser.get(p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          class_level: p.class_level,
          cognitive_state: last?.cognitive_state ?? null,
          last_active: last?.created_at ?? null,
        };
      });

      setStudents(studentRows);
      setNodes((cn || []) as ConceptNode[]);
      setSessions((ss || []) as Session[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [allowed]);

  // Derived data
  const conceptsByStudent = useMemo(() => {
    const map: Record<string, { concept: string; mastery: number; subject: string | null }[]> = {};
    nodes.forEach((n) => {
      (map[n.user_id] ||= []).push({ concept: n.concept, mastery: n.mastery_level ?? 0, subject: n.subject });
    });
    return map;
  }, [nodes]);

  const stats = useMemo(() => {
    const total = students.length;
    const masteries = nodes.map((n) => n.mastery_level ?? 0);
    const avg = masteries.length ? masteries.reduce((a, b) => a + b, 0) / masteries.length : 0;
    const flagged = nodes.filter((n) => (n.mastery_level ?? 0) < 0.4).length;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activeToday = new Set(sessions.filter((s) => new Date(s.created_at) >= today).map((s) => s.user_id)).size;
    return { total, avg, flagged, activeToday };
  }, [students, nodes, sessions]);

  const weakAlerts = useMemo(() => {
    const studentMap = new Map(students.map((s) => [s.id, s.full_name || "Unnamed"]));
    return nodes
      .filter((n) => (n.mastery_level ?? 0) < 0.4 && studentMap.has(n.user_id))
      .sort((a, b) => (a.mastery_level ?? 0) - (b.mastery_level ?? 0))
      .slice(0, 8)
      .map((n) => ({ ...n, student: studentMap.get(n.user_id) || "Unnamed" }));
  }, [nodes, students]);

  const topConcepts = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach((n) => counts.set(n.concept, (counts.get(n.concept) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);
  }, [nodes]);

  const heatmapMatrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    nodes.forEach((n) => {
      (m[n.user_id] ||= {})[n.concept] = n.mastery_level ?? 0;
    });
    return m;
  }, [nodes]);

  const chartData = useMemo(() => {
    const days: { date: string; mastery: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const label = d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
      const filtered = sessions.filter((s) => {
        const t = new Date(s.created_at);
        if (t < d || t >= next) return false;
        return chartStudent === "all" || s.user_id === chartStudent;
      });
      const avg = filtered.length ? filtered.reduce((a, s) => a + (s.mastery_score ?? 0), 0) / filtered.length : 0;
      days.push({ date: label, mastery: Math.round(avg * 100) });
    }
    return days;
  }, [sessions, chartStudent]);

  const timeline: TimelineEntry[] = useMemo(() => {
    if (!selectedId) return [];
    return sessions
      .filter((s) => s.user_id === selectedId)
      .slice(0, 10)
      .map((s) => ({ id: s.id, date: s.created_at, topic: s.topic || "—", mastery: s.mastery_score ?? 0, state: s.cognitive_state }));
  }, [sessions, selectedId]);

  const weeklyReport = useMemo(() => {
    const target = selectedId ? students.find((s) => s.id === selectedId) : students[0];
    if (!target) return null;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const studentSessions = sessions.filter((s) => s.user_id === target.id && new Date(s.created_at) >= weekAgo);
    const studentNodes = nodes.filter((n) => n.user_id === target.id);
    const avg = studentNodes.length ? studentNodes.reduce((a, n) => a + (n.mastery_level ?? 0), 0) / studentNodes.length : 0;
    const weakest = [...studentNodes].sort((a, b) => (a.mastery_level ?? 0) - (b.mastery_level ?? 0))[0];
    return {
      name: target.full_name || "শিক্ষার্থী",
      count: studentSessions.length,
      avg: Math.round(avg * 100),
      weakest: weakest?.concept || "—",
    };
  }, [selectedId, students, sessions, nodes]);

  if (!authChecked) {
    return <div className="grid min-h-screen place-items-center bg-[#080B14] text-white/60">যাচাই হচ্ছে…</div>;
  }
  if (!allowed) return null;

  return (
    <div className="min-h-screen bg-[#080B14] text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-24 print:pt-4">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">শিক্ষক ড্যাশবোর্ড</h1>
            <p className="mt-1 text-sm text-white/50">শিক্ষার্থীদের অগ্রগতি ও জ্ঞানের গভীর বিশ্লেষণ</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 print:hidden"
          >
            <Printer className="h-4 w-4" /> প্রিন্ট করো
          </button>
        </header>

        {/* Stats row */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="মোট শিক্ষার্থী" value={stats.total} icon={Users} accent="#3B82F6" />
          <StatCard label="গড় দক্ষতা" value={Math.round(stats.avg * 100)} suffix="%" icon={Target} accent="#F59E0B" />
          <StatCard label="দুর্বল ধারণা" value={stats.flagged} icon={AlertTriangle} accent="#EF4444" pulse={stats.flagged > 0} />
          <StatCard label="আজ সক্রিয়" value={stats.activeToday} icon={Activity} accent="#10B981" pulse={stats.activeToday > 0} />
        </section>

        {loading ? (
          <div className="grid h-64 place-items-center text-white/40">লোড হচ্ছে…</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT */}
            <div className="space-y-6">
              <Panel title="শিক্ষার্থী অগ্রগতি">
                <StudentList students={students} conceptsByStudent={conceptsByStudent} selectedId={selectedId} onSelect={setSelectedId} />
              </Panel>

              <Panel title="দুর্বল ধারণা সতর্কতা" pulse={weakAlerts.length > 0}>
                {weakAlerts.length === 0 ? (
                  <p className="text-sm text-white/50">কোনো সতর্কতা নেই — দারুণ!</p>
                ) : (
                  <ul className="space-y-2">
                    {weakAlerts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white"><span className="text-white/60">{a.student}</span> → <span className="font-medium">{a.concept}</span></p>
                          <p className="text-xs text-white/40">{a.subject || "সাধারণ"} • দক্ষতা {Math.round((a.mastery_level ?? 0) * 100)}%</p>
                        </div>
                        <button
                          onClick={() => setReviewTarget({
                            studentId: a.user_id,
                            studentName: a.student,
                            conceptId: a.id,
                            concept: a.concept,
                          })}
                          className="flex shrink-0 items-center gap-1 rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30"
                        >
                          পর্যালোচনা <ArrowRight className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title={`লার্নিং টাইমলাইন${selectedId ? "" : " — শিক্ষার্থী নির্বাচন করো"}`}>
                <Timeline entries={timeline} />
              </Panel>
            </div>

            {/* RIGHT */}
            <div className="space-y-6">
              <Panel title="ধারণা হিটম্যাপ">
                <ConceptHeatmap students={students} topConcepts={topConcepts} matrix={heatmapMatrix} />
              </Panel>

              <Panel title="দক্ষতা অগ্রগতি (১৪ দিন)">
                <div className="mb-3 flex items-center justify-end">
                  <select
                    value={chartStudent}
                    onChange={(e) => setChartStudent(e.target.value)}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="all">সকল শিক্ষার্থী</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.full_name || "Unnamed"}</option>)}
                  </select>
                </div>
                <MasteryChart data={chartData} />
              </Panel>

              <Panel title="সাপ্তাহিক ইন্টেলিজেন্স রিপোর্ট">
                {weeklyReport ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-blue-500/5 p-5">
                    <div className="flex items-start gap-4">
                      <MasteryRing value={weeklyReport.avg / 100} size={56} />
                      <p className="text-sm leading-relaxed text-white/80">
                        <span className="font-semibold text-white">{weeklyReport.name}</span> এই সপ্তাহে{" "}
                        <span className="font-semibold text-amber-300">{weeklyReport.count}</span>টি ধারণা অনুশীলন করেছে। গড় দক্ষতা{" "}
                        <span className="font-semibold text-blue-300">{weeklyReport.avg}%</span>। সবচেয়ে দুর্বল বিষয়:{" "}
                        <span className="font-semibold text-red-300">{weeklyReport.weakest}</span>।{" "}
                        {weeklyReport.avg < 60 ? "শিক্ষকের মনোযোগ প্রয়োজন।" : "চমৎকার অগ্রগতি, চালিয়ে যাও।"}
                      </p>
                    </div>
                  </motion.div>
                ) : <p className="text-sm text-white/50">কোনো ডেটা নেই।</p>}
              </Panel>
            </div>
          </div>
        )}

        {!loading && teacherId && (
          <section id="intervention-panel" className="mt-6">
            <Panel title="হস্তক্ষেপ ও দুর্বলতা বিশ্লেষণ" pulse={false}>
              <InterventionPanel
                students={students.map((s) => ({ id: s.id, full_name: s.full_name }))}
                nodes={nodes as ConceptInput[]}
                sessions={sessions as SessionInput[]}
                selectedStudentId={selectedId}
                teacherId={teacherId}
              />
            </Panel>
          </section>
        )}
      </main>
      {reviewTarget && teacherId && (
        <QuickReviewModal
          open={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
          studentId={reviewTarget.studentId}
          studentName={reviewTarget.studentName}
          conceptId={reviewTarget.conceptId}
          concept={reviewTarget.concept}
          teacherId={teacherId}
          nodes={nodes as ConceptInput[]}
          sessions={sessions as SessionInput[]}
        />
      )}
    </div>
  );
}

function Panel({ title, children, pulse = false }: { title: string; children: React.ReactNode; pulse?: boolean }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/70">
        {title}
        {pulse && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}
