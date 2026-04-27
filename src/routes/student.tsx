import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Target, Sparkles, Plus, Trash2, CheckCircle2, Circle, ArrowRight, Flame, BookOpen, Bell, Wand2, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { StatCard, MasteryRing } from "@/components/dashboard/StatCard";
import { MasteryChart } from "@/components/dashboard/MasteryChart";
import { toast } from "sonner";

export const Route = createFileRoute("/student")({
  head: () => ({ meta: [{ title: "আমার অগ্রগতি — অনুধাবন AI" }] }),
  component: StudentDashboard,
});

type Concept = { id: string; concept: string; subject: string | null; mastery_level: number | null; last_reviewed: string | null; created_at: string };
type Session = { id: string; topic: string | null; subject: string | null; mastery_score: number | null; cognitive_state: string | null; created_at: string; messages: unknown };
type Goal = { id: string; topic: string; target_date: string | null; status: string; notes: string | null; created_at: string };
type Notification = { id: string; type: string; title: string; body: string | null; goal_id: string | null; read_at: string | null; created_at: string };
type PlanStep = { concept: string; title: string; description: string; duration_min: number };
type Plan = { id: string; title: string; steps: PlanStep[]; status: string; created_at: string };

const STATE_EMOJI: Record<string, string> = {
  focused: "🎯", confused: "😕", overloaded: "🥵", disengaged: "💤", "mastery-ready": "✨",
};

function StudentDashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [newGoal, setNewGoal] = useState("");
  const [newGoalDate, setNewGoalDate] = useState("");

  // Auth
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      if (!mounted) return;
      setUserId(session.user.id);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle();
      if (mounted) {
        setName(profile?.full_name || "শিক্ষার্থী");
        setAuthChecked(true);
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  // Fetch data
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: cn }, { data: ss }, { data: gs }] = await Promise.all([
        supabase.from("concept_nodes").select("*").eq("user_id", userId),
        supabase.from("sessions").select("id, topic, subject, mastery_score, cognitive_state, created_at, messages").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("learning_goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);
      if (!mounted) return;
      setConcepts((cn || []) as Concept[]);
      setSessions((ss || []) as Session[]);
      setGoals((gs || []) as Goal[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [userId]);

  const stats = useMemo(() => {
    const total = concepts.length;
    const masteries = concepts.map((c) => c.mastery_level ?? 0);
    const avg = masteries.length ? masteries.reduce((a, b) => a + b, 0) / masteries.length : 0;
    const strong = concepts.filter((c) => (c.mastery_level ?? 0) >= 0.7).length;
    const subjects = new Set(concepts.map((c) => c.subject).filter(Boolean)).size;
    return { total, avg, strong, subjects };
  }, [concepts]);

  // Streak — consecutive days with at least one session
  const streak = useMemo(() => {
    if (!sessions.length) return 0;
    const days = new Set(sessions.map((s) => new Date(s.created_at).toDateString()));
    let count = 0;
    const cur = new Date();
    while (days.has(cur.toDateString())) {
      count++;
      cur.setDate(cur.getDate() - 1);
    }
    return count;
  }, [sessions]);

  const chartData = useMemo(() => {
    const days: { date: string; mastery: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const label = d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
      const filtered = sessions.filter((s) => {
        const t = new Date(s.created_at);
        return t >= d && t < next;
      });
      const avg = filtered.length ? filtered.reduce((a, s) => a + (s.mastery_score ?? 0), 0) / filtered.length : 0;
      days.push({ date: label, mastery: Math.round(avg * 100) });
    }
    return days;
  }, [sessions]);

  const recentSessions = useMemo(() => sessions.slice(0, 6), [sessions]);

  const weakConcepts = useMemo(
    () => [...concepts].filter((c) => (c.mastery_level ?? 0) < 0.5).sort((a, b) => (a.mastery_level ?? 0) - (b.mastery_level ?? 0)).slice(0, 5),
    [concepts]
  );

  const pendingGoals = useMemo(() => goals.filter((g) => g.status === "pending"), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === "completed"), [goals]);

  const addGoal = async () => {
    if (!userId || !newGoal.trim()) return;
    const topic = newGoal.trim();
    const date = newGoalDate || null;
    const optimistic: Goal = {
      id: `tmp-${Date.now()}`, topic, target_date: date, status: "pending", notes: null, created_at: new Date().toISOString(),
    };
    setGoals((p) => [optimistic, ...p]);
    setNewGoal(""); setNewGoalDate("");
    const { data, error } = await supabase
      .from("learning_goals")
      .insert({ user_id: userId, topic, target_date: date })
      .select()
      .single();
    if (error) {
      toast.error("লক্ষ্য যুক্ত করা যায়নি");
      setGoals((p) => p.filter((g) => g.id !== optimistic.id));
      return;
    }
    setGoals((p) => p.map((g) => (g.id === optimistic.id ? (data as Goal) : g)));
  };

  const toggleGoal = async (g: Goal) => {
    const next = g.status === "pending" ? "completed" : "pending";
    setGoals((p) => p.map((x) => (x.id === g.id ? { ...x, status: next } : x)));
    await supabase.from("learning_goals").update({ status: next }).eq("id", g.id);
  };

  const deleteGoal = async (id: string) => {
    setGoals((p) => p.filter((g) => g.id !== id));
    await supabase.from("learning_goals").delete().eq("id", id);
  };

  if (!authChecked) {
    return <div className="grid min-h-screen place-items-center bg-[#080B14] text-white/60">যাচাই হচ্ছে…</div>;
  }

  return (
    <div className="min-h-screen bg-[#080B14] text-white antialiased">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-24">
        {/* Header */}
        <header className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            স্বাগতম, <span className="bg-gradient-to-r from-amber-300 to-blue-400 bg-clip-text text-transparent">{name}</span>
          </motion.h1>
          <p className="mt-2 text-sm text-white/50">তোমার শেখার যাত্রা এক ঝলকে</p>
        </header>

        {/* Stats */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="মোট ধারণা" value={stats.total} icon={Brain} accent="#3B82F6" />
          <StatCard label="গড় দক্ষতা" value={Math.round(stats.avg * 100)} suffix="%" icon={Target} accent="#F59E0B" />
          <StatCard label="দৃঢ় ধারণা" value={stats.strong} icon={Sparkles} accent="#10B981" />
          <StatCard label="ধারাবাহিক দিন" value={streak} icon={Flame} accent="#EF4444" pulse={streak > 0} />
        </section>

        {loading ? (
          <div className="grid h-64 place-items-center text-white/40">লোড হচ্ছে…</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* LEFT — 2 cols */}
            <div className="space-y-6 lg:col-span-2">
              <Panel title="দক্ষতা অগ্রগতি (১৪ দিন)">
                {sessions.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="এখনো কোনো সেশন নেই"
                    cta={<Link to="/learn" className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30">শেখা শুরু করো <ArrowRight className="h-3 w-3" /></Link>}
                  />
                ) : (
                  <MasteryChart data={chartData} />
                )}
              </Panel>

              <Panel title="সাম্প্রতিক মাইন্ড-ম্যাপ সেশন">
                {recentSessions.length === 0 ? (
                  <p className="text-sm text-white/50">এখনো কোনো সেশন নেই।</p>
                ) : (
                  <ul className="space-y-2">
                    {recentSessions.map((s) => {
                      const msgs = Array.isArray(s.messages) ? s.messages.length : 0;
                      const score = Math.round((s.mastery_score ?? 0) * 100);
                      return (
                        <li key={s.id} className="group rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-[box-shadow,background-color] hover:bg-white/[0.04] hover:shadow-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-amber-500/20 text-lg">
                              {STATE_EMOJI[s.cognitive_state || "focused"] || "📘"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">{s.topic || "অজানা টপিক"}</p>
                              <p className="mt-0.5 text-xs text-white/40">
                                {new Date(s.created_at).toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}
                                {" • "}{msgs} বার্তা
                                {s.subject ? ` • ${s.subject}` : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold tabular-nums" style={{ color: score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444" }}>
                                {score}%
                              </p>
                              <Link to="/learn" search={{ topic: s.topic || "" }} className="text-[10px] text-white/40 hover:text-amber-300">পুনরায় খুলো →</Link>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>

              <Panel title="দুর্বল ধারণা — পর্যালোচনা প্রয়োজন">
                {weakConcepts.length === 0 ? (
                  <p className="text-sm text-white/50">দারুণ! সব ধারণাই শক্তিশালী।</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {weakConcepts.map((c) => {
                      const v = c.mastery_level ?? 0;
                      return (
                        <Link
                          key={c.id}
                          to="/learn"
                          search={{ topic: c.concept }}
                          className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 transition-colors hover:bg-red-500/10"
                        >
                          <MasteryRing value={v} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{c.concept}</p>
                            <p className="text-xs text-white/40">{c.subject || "সাধারণ"}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-white/40" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>

            {/* RIGHT — goals */}
            <div className="space-y-6">
              <Panel title="শেখার লক্ষ্য">
                <div className="mb-4 space-y-2">
                  <input
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addGoal()}
                    placeholder="নতুন লক্ষ্য (যেমন: কোয়ান্টাম পদার্থবিদ্যা)"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-500/40"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newGoalDate}
                      onChange={(e) => setNewGoalDate(e.target.value)}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 outline-none focus:border-amber-500/40"
                    />
                    <button
                      onClick={addGoal}
                      disabled={!newGoal.trim()}
                      className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/30 disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" /> যোগ
                    </button>
                  </div>
                </div>

                {pendingGoals.length === 0 && completedGoals.length === 0 ? (
                  <p className="text-sm text-white/50">কোনো লক্ষ্য নেই। উপরে যোগ করো।</p>
                ) : (
                  <ul className="space-y-1.5">
                    <AnimatePresence initial={false}>
                      {pendingGoals.map((g) => <GoalItem key={g.id} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} />)}
                      {completedGoals.map((g) => <GoalItem key={g.id} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} />)}
                    </AnimatePresence>
                  </ul>
                )}
              </Panel>

              <Panel title="বিষয় কভারেজ">
                <p className="mb-2 text-xs text-white/50">তুমি <span className="font-semibold text-amber-300">{stats.subjects}</span>টি বিষয় অন্বেষণ করেছ</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(concepts.map((c) => c.subject).filter(Boolean))).slice(0, 12).map((sub) => (
                    <span key={sub} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">{sub}</span>
                  ))}
                  {stats.subjects === 0 && <p className="text-xs text-white/40">এখনও কোনো বিষয় নেই।</p>}
                </div>
              </Panel>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function GoalItem({ goal, onToggle, onDelete }: { goal: Goal; onToggle: (g: Goal) => void; onDelete: (id: string) => void }) {
  const done = goal.status === "completed";
  const overdue = !done && goal.target_date && new Date(goal.target_date) < new Date();
  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5"
    >
      <button onClick={() => onToggle(goal)} className="shrink-0 text-white/60 hover:text-amber-300 transition-[color,transform] hover:scale-110">
        {done ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${done ? "text-white/40 line-through" : "text-white"}`}>{goal.topic}</p>
        {goal.target_date && (
          <p className={`text-[10px] tabular-nums ${overdue ? "text-red-400" : "text-white/40"}`}>
            {overdue ? "⚠ অতিক্রান্ত: " : "📅 "}
            {new Date(goal.target_date).toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}
          </p>
        )}
      </div>
      {!done && (
        <Link to="/learn" search={{ topic: goal.topic }} className="shrink-0 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-300 opacity-0 transition-opacity hover:bg-amber-500/20 group-hover:opacity-100">
          শুরু
        </Link>
      )}
      <button onClick={() => onDelete(goal.id)} className="shrink-0 rounded-md p-1 text-white/30 opacity-0 transition-[opacity,color] hover:text-red-400 group-hover:opacity-100">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.li>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/70">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ icon: Icon, title, cta }: { icon: React.ComponentType<{ className?: string }>; title: string; cta?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <Icon className="h-8 w-8 text-white/30" />
      <p className="text-sm text-white/50">{title}</p>
      {cta}
    </div>
  );
}
