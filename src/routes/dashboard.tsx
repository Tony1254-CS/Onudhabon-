import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, Target, AlertTriangle, Activity, Printer, ArrowRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { StatCard, MasteryRing } from "@/components/dashboard/StatCard";
import { StudentList } from "@/components/dashboard/StudentList";
import { ConceptHeatmap } from "@/components/dashboard/ConceptHeatmap";
import { MasteryChart } from "@/components/dashboard/MasteryChart";
import { Timeline, type TimelineEntry } from "@/components/dashboard/Timeline";
import { InterventionPanel } from "@/components/dashboard/InterventionPanel";
import { QuickReviewModal } from "@/components/dashboard/QuickReviewModal";
import { SubjectView, type SubjectStat, type TopicStat } from "@/components/dashboard/SubjectView";
import { TopicView } from "@/components/dashboard/TopicView";
import { TopicDrawer } from "@/components/dashboard/TopicDrawer";
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

type Pivot = "student" | "subject" | "topic";

const KNOWN_SUBJECTS = ["পদার্থবিজ্ঞান", "রসায়ন", "জীববিজ্ঞান", "গণিত", "অন্যান্য"];

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

  // Pivot + filter state
  const [pivot, setPivot] = useState<Pivot>("student");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<TopicStat | null>(null);

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

  // Derived data — student pivot
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

  // Subject pivot data
  const subjectStats = useMemo((): SubjectStat[] => {
    const subjectMap = new Map<string, {
      studentIds: Set<string>;
      masteries: number[];
      weakCount: number;
      topicMap: Map<string, { masteries: number[]; studentIds: Set<string>; lastTouched: string | null }>;
    }>();

    const normalise = (s: string | null) => {
      if (!s) return "অন্যান্য";
      return KNOWN_SUBJECTS.includes(s) ? s : "অন্যান্য";
    };

    nodes.forEach((n) => {
      const subj = normalise(n.subject);
      if (!subjectMap.has(subj)) {
        subjectMap.set(subj, { studentIds: new Set(), masteries: [], weakCount: 0, topicMap: new Map() });
      }
      const e = subjectMap.get(subj)!;
      e.studentIds.add(n.user_id);
      const m = n.mastery_level ?? 0;
      e.masteries.push(m);
      if (m < 0.4) e.weakCount++;

      // per-topic inside subject
      const conc = n.concept;
      if (!e.topicMap.has(conc)) {
        e.topicMap.set(conc, { masteries: [], studentIds: new Set(), lastTouched: n.last_reviewed });
      }
      const te = e.topicMap.get(conc)!;
      te.masteries.push(m);
      te.studentIds.add(n.user_id);
      if (n.last_reviewed && (!te.lastTouched || n.last_reviewed > te.lastTouched)) {
        te.lastTouched = n.last_reviewed;
      }
    });

    return KNOWN_SUBJECTS
      .filter((s) => subjectMap.has(s))
      .map((subj) => {
        const e = subjectMap.get(subj)!;
        const avgMastery = e.masteries.length ? e.masteries.reduce((a, b) => a + b, 0) / e.masteries.length : 0;
        const topics: TopicStat[] = [...e.topicMap.entries()].map(([topic, te]) => {
          const tAvg = te.masteries.length ? te.masteries.reduce((a, b) => a + b, 0) / te.masteries.length : 0;
          return {
            topic,
            subject: subj,
            avgMastery: tAvg,
            studentCount: te.studentIds.size,
            strugglingCount: te.masteries.filter((m) => m < 0.4).length,
            lastTouched: te.lastTouched,
          };
        }).sort((a, b) => a.avgMastery - b.avgMastery);

        const topStrugglingTopic = topics.find((t) => t.strugglingCount > 0)?.topic ?? null;

        return {
          subject: subj,
          studentCount: e.studentIds.size,
          avgMastery,
          weakConceptCount: e.weakCount,
          topStrugglingTopic,
          topics,
        };
      });
  }, [nodes]);

  // Topic pivot data — flat list across all subjects
  const topicStats = useMemo((): TopicStat[] => {
    const topicMap = new Map<string, { subject: string; masteries: number[]; studentIds: Set<string>; lastTouched: string | null }>();
    nodes.forEach((n) => {
      const key = `${n.subject ?? "অন্যান্য"}::${n.concept}`;
      if (!topicMap.has(key)) {
        topicMap.set(key, { subject: n.subject ?? "অন্যান্য", masteries: [], studentIds: new Set(), lastTouched: n.last_reviewed });
      }
      const e = topicMap.get(key)!;
      const m = n.mastery_level ?? 0;
      e.masteries.push(m);
      e.studentIds.add(n.user_id);
      if (n.last_reviewed && (!e.lastTouched || n.last_reviewed > e.lastTouched)) {
        e.lastTouched = n.last_reviewed;
      }
    });

    return [...topicMap.entries()].map(([key, e]) => {
      const [subject, topic] = key.split(/::/);
      const avgMastery = e.masteries.length ? e.masteries.reduce((a, b) => a + b, 0) / e.masteries.length : 0;
      return {
        topic,
        subject,
        avgMastery,
        studentCount: e.studentIds.size,
        strugglingCount: e.masteries.filter((m) => m < 0.4).length,
        lastTouched: e.lastTouched,
      };
    });
  }, [nodes]);

  // Filtered subject list for the subject dropdown — must be BEFORE early returns (Rules of Hooks)
  const availableSubjects = useMemo(
    () => [...new Set(nodes.map((n) => n.subject ?? "অন্যান্য"))].filter(Boolean).sort(),
    [nodes],
  );

  if (!authChecked) {
    return <div className="grid min-h-screen place-items-center bg-[#080B14] text-white/60">যাচাই হচ্ছে…</div>;
  }
  if (!allowed) return null;

  const pivotLabels: { key: Pivot; label: string }[] = [
    { key: "student", label: "শিক্ষার্থী" },
    { key: "subject", label: "বিষয়" },
    { key: "topic", label: "টপিক" },
  ];

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

        {/* Stats row — always visible */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="মোট শিক্ষার্থী" value={stats.total} icon={Users} accent="#3B82F6" />
          <StatCard label="গড় দক্ষতা" value={Math.round(stats.avg * 100)} suffix="%" icon={Target} accent="#F59E0B" />
          <StatCard label="দুর্বল ধারণা" value={stats.flagged} icon={AlertTriangle} accent="#EF4444" pulse={stats.flagged > 0} />
          <StatCard label="আজ সক্রিয়" value={stats.activeToday} icon={Activity} accent="#10B981" pulse={stats.activeToday > 0} />
        </section>

        {/* Pivot toggle + filters */}
        <section className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          {/* Pivot pills */}
          <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 gap-1">
            {pivotLabels.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPivot(key)}
                className={`rounded-lg px-4 py-1.5 text-sm font-bangla font-medium transition-all ${
                  pivot === key
                    ? "bg-amber-500/20 text-amber-300 shadow-sm"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Subject dropdown */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400/50 font-bangla"
          >
            <option value="all">সব বিষয়</option>
            {availableSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="খুঁজুন…"
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-1.5 text-sm text-white placeholder-white/25 outline-none focus:border-amber-400/50 font-bangla"
            />
          </div>
        </section>

        {loading ? (
          <div className="grid h-64 place-items-center text-white/40">লোড হচ্ছে…</div>
        ) : (
          <>
            {/* ────── STUDENT PIVOT (original layout) ────── */}
            {pivot === "student" && (
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

            {/* ────── SUBJECT PIVOT ────── */}
            {pivot === "subject" && (
              <Panel title="বিষয় বিশ্লেষণ">
                <SubjectView
                  subjectStats={subjectFilter === "all"
                    ? subjectStats
                    : subjectStats.filter((s) => s.subject === subjectFilter)}
                  searchQuery={searchQuery}
                />
              </Panel>
            )}

            {/* ────── TOPIC PIVOT ────── */}
            {pivot === "topic" && (
              <Panel title="টপিক বিশ্লেষণ">
                <TopicView
                  topics={topicStats}
                  searchQuery={searchQuery}
                  subjectFilter={subjectFilter}
                  onSelectTopic={setSelectedTopic}
                />
              </Panel>
            )}
          </>
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

      {/* QuickReviewModal */}
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

      {/* TopicDrawer */}
      <TopicDrawer
        topic={selectedTopic}
        onClose={() => setSelectedTopic(null)}
        onAssignReview={(studentId, studentName, conceptId, concept) => {
          setSelectedTopic(null);
          setReviewTarget({ studentId, studentName, conceptId, concept });
        }}
        allNodes={nodes}
        students={students}
      />
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
