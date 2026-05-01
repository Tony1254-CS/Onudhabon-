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
type Notification = { id: string; type: string; title: string; body: string | null; goal_id: string | null; intervention_id: string | null; read_at: string | null; created_at: string };
type PlanStep = { concept: string; title: string; description: string; duration_min: number };
type Plan = { id: string; title: string; steps: PlanStep[]; status: string; created_at: string };
type Intervention = {
  id: string;
  concept: string;
  subject: string | null;
  severity: string;
  intervention_type: string;
  suggested_action: string;
  status: string;
  student_response: string | null;
  submitted_at: string | null;
  assigned_at: string;
};

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showInbox, setShowInbox] = useState(false);

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
      const [{ data: cn }, { data: ss }, { data: gs }, { data: ns }, { data: pp }, { data: ivs }] = await Promise.all([
        supabase.from("concept_nodes").select("*").eq("user_id", userId),
        supabase.from("sessions").select("id, topic, subject, mastery_score, cognitive_state, created_at, messages").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("learning_goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("practice_plans").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(3),
        supabase.from("interventions").select("id, concept, subject, severity, intervention_type, suggested_action, status, student_response, submitted_at, assigned_at").eq("student_id", userId).order("assigned_at", { ascending: false }).limit(20),
      ]);
      if (!mounted) return;
      setConcepts((cn || []) as Concept[]);
      setSessions((ss || []) as Session[]);
      setGoals((gs || []) as Goal[]);
      setNotifications((ns || []) as Notification[]);
      setPlans(((pp || []) as unknown) as Plan[]);
      setInterventions((ivs || []) as Intervention[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [userId]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications]);

  const stats = useMemo(() => {
    const total = concepts.length;
    const ml = concepts.map((c) => c.mastery_level || 0);
    const avg = ml.length ? ml.reduce((a, b) => a + b, 0) / ml.length : 0;
    const strong = concepts.filter((c) => (c.mastery_level || 0) >= 0.7).length;
    const subjectSet = new Set<string>();
    for (const c of concepts) if (c.subject) subjectSet.add(c.subject);
    return { total, avg, strong, subjects: subjectSet.size };
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

  const markNotificationRead = async (id: string) => {
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    const now = new Date().toISOString();
    setNotifications((p) => p.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
  };

  const generatePlan = async () => {
    if (generatingPlan) return;
    setGeneratingPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-practice-plan", { body: {} });
      if (error) throw error;
      if (data?.plan) {
        setPlans((p) => [data.plan as Plan, ...p].slice(0, 3));
        toast.success("নতুন প্ল্যান তৈরি হয়েছে!");
      } else {
        toast.info(data?.message || "কোনো দুর্বল ধারণা নেই।");
      }
    } catch (e) {
      console.error(e);
      toast.error("প্ল্যান তৈরি করা যায়নি — আবার চেষ্টা করো।");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const archivePlan = async (id: string) => {
    setPlans((p) => p.filter((x) => x.id !== id));
    await supabase.from("practice_plans").update({ status: "archived" }).eq("id", id);
  };

  const submitIntervention = async (iv: Intervention, response: string) => {
    const now = new Date().toISOString();
    setInterventions((p) => p.map((x) => (x.id === iv.id ? { ...x, status: "submitted", student_response: response, submitted_at: now } : x)));
    const { error } = await supabase
      .from("interventions")
      .update({ status: "submitted", student_response: response, submitted_at: now })
      .eq("id", iv.id);
    if (error) {
      toast.error("জমা দেওয়া যায়নি");
      return;
    }
    toast.success("শিক্ষককে পাঠানো হয়েছে!");
  };

  const startIntervention = async (iv: Intervention) => {
    if (iv.status !== "assigned") return;
    setInterventions((p) => p.map((x) => (x.id === iv.id ? { ...x, status: "in_progress" } : x)));
    await supabase.from("interventions").update({ status: "in_progress" }).eq("id", iv.id);
  };

  if (!authChecked) {
    return <div className="grid min-h-screen place-items-center bg-[#080B14] text-white/60">যাচাই হচ্ছে…</div>;
  }

  return (
    <div className="min-h-screen bg-[#080B14] text-white antialiased">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-24">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="text-balance text-3xl font-bold tracking-tight sm:text-4xl"
            >
              স্বাগতম, <span className="bg-gradient-to-r from-amber-300 to-blue-400 bg-clip-text text-transparent">{name}</span>
            </motion.h1>
            <p className="mt-2 text-sm text-white/50">তোমার শেখার যাত্রা এক ঝলকে</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowInbox((v) => !v)}
              className="relative flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-[background-color,box-shadow] hover:bg-white/10 hover:shadow-lg"
            >
              <Bell className="h-4 w-4" />
              <span>ইনবক্স</span>
              {unreadCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-black tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showInbox && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,360px)] rounded-2xl border border-white/10 bg-[#0c0f1a] p-3 shadow-2xl backdrop-blur-xl"
                >
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/60">নোটিফিকেশন</p>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[10px] text-amber-300 hover:text-amber-200">সব পড়া দাও</button>
                      )}
                      <button onClick={() => setShowInbox(false)} className="text-white/40 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-white/40">কোনো নোটিফিকেশন নেই।</p>
                    ) : (
                      <ul className="space-y-1">
                        {notifications.map((n) => (
                          <li
                            key={n.id}
                            onClick={() => !n.read_at && markNotificationRead(n.id)}
                            className={`cursor-pointer rounded-lg p-2.5 transition-colors ${n.read_at ? "bg-white/[0.02] hover:bg-white/[0.04]" : "bg-amber-500/10 hover:bg-amber-500/15"}`}
                          >
                            <div className="flex items-start gap-2">
                              {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-white">{n.title}</p>
                                {n.body && <p className="mt-0.5 text-[11px] leading-relaxed text-white/60">{n.body}</p>}
                                <p className="mt-1 text-[10px] text-white/40">{new Date(n.created_at).toLocaleString("bn-BD")}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Stats */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="মোট ধারণা" value={stats.total} icon={Brain} accent="#3B82F6" />
          <StatCard label="গড় দক্ষতা" value={Math.round(stats.avg * 100)} suffix="%" icon={Target} accent="#F59E0B" />
          <StatCard label="দৃঢ় ধারণা" value={stats.strong} icon={Sparkles} accent="#10B981" />
          <StatCard label="ধারাবাহিক দিন" value={streak} icon={Flame} accent="#EF4444" pulse={streak > 0} />
        </section>

        {/* Mastered stars */}
        <MasteredStars concepts={concepts} />

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

              <Panel
                title="অনুশীলন প্ল্যান"
                action={
                  <button
                    onClick={generatePlan}
                    disabled={generatingPlan}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-blue-500/20 px-3 py-1.5 text-xs font-medium text-amber-200 transition-[background-color,box-shadow] hover:from-amber-500/30 hover:to-blue-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50"
                  >
                    {generatingPlan ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    {generatingPlan ? "তৈরি হচ্ছে…" : "নতুন প্ল্যান"}
                  </button>
                }
              >
                {plans.length === 0 ? (
                  <EmptyState
                    icon={Wand2}
                    title="এখনও কোনো প্ল্যান নেই — উপরের বোতামে চাপ দাও।"
                  />
                ) : (
                  <div className="space-y-4">
                    {plans.map((plan) => (
                      <div key={plan.id} className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-amber-500/[0.02] p-4">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{plan.title}</p>
                            <p className="text-[10px] text-white/40">{new Date(plan.created_at).toLocaleString("bn-BD")}</p>
                          </div>
                          <button onClick={() => archivePlan(plan.id)} className="rounded-md p-1 text-white/30 hover:text-red-400" title="আর্কাইভ">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <ol className="space-y-2">
                          {(plan.steps || []).map((s, i) => (
                            <li key={i} className="group flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.04]">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-300 tabular-nums">{i + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white">{s.title}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-white/60">{s.description}</p>
                                <p className="mt-1 text-[10px] text-white/40">⏱ {s.duration_min || 10} মিনিট • {s.concept}</p>
                              </div>
                              <Link
                                to="/learn"
                                search={{ topic: s.concept }}
                                className="shrink-0 self-center rounded-md bg-amber-500/20 px-2.5 py-1 text-[10px] font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
                              >
                                শুরু →
                              </Link>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
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

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">{title}</h2>
        {action}
      </div>
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

function MasteredStars({ concepts }: { concepts: Concept[] }) {
  const mastered = concepts.filter((c) => (c.mastery_level ?? 0) >= 0.9);
  if (mastered.length === 0) return null;
  return (
    <section className="mb-6 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.04] via-transparent to-blue-400/[0.04] p-5 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-200">
          <Sparkles className="h-4 w-4" />
          তোমার তারা
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] tabular-nums text-amber-200">
            {mastered.length}
          </span>
        </h2>
        <Link to="/galaxy" className="text-[11px] text-amber-300 hover:text-amber-200">গ্যালাক্সি দেখো →</Link>
      </div>
      <div className="flex flex-wrap gap-3">
        {mastered.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.08 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="group relative flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100"
            style={{ boxShadow: "0 0 18px rgba(245,158,11,0.35), inset 0 0 12px rgba(245,158,11,0.1)" }}
          >
            <span
              className="relative flex h-2.5 w-2.5"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300" style={{ boxShadow: "0 0 10px #fbbf24" }} />
            </span>
            <span className="truncate max-w-[160px]">{c.concept}</span>
            {c.subject && (
              <span className="text-[9px] text-amber-300/70 hidden sm:inline">· {c.subject}</span>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
