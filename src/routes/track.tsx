import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Loader2, KeyRound, Activity, Brain, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { toast } from "sonner";

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
};

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  focused: { label: "মনোযোগী", color: "#10B981" },
  confused: { label: "বিভ্রান্ত", color: "#F59E0B" },
  overloaded: { label: "অতিরিক্ত", color: "#EF4444" },
  disengaged: { label: "নিষ্ক্রিয়", color: "#6B7280" },
  "mastery-ready": { label: "দক্ষতাপ্রস্তুত", color: "#3B82F6" },
};

function TrackPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string>("student");
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);

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

  const loadLinks = async (uid: string) => {
    const { data: links } = await supabase
      .from("student_links")
      .select("id, student_id")
      .eq("observer_id", uid);
    const ids = (links || []).map((l) => l.student_id);
    if (!ids.length) { setStudents([]); return; }

    const [{ data: profs }, { data: nodes }, { data: sess }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, nickname, class_level").in("id", ids),
      supabase.from("concept_nodes").select("user_id, concept, mastery_level").in("user_id", ids),
      supabase.from("sessions").select("user_id, created_at, cognitive_state").in("user_id", ids).order("created_at", { ascending: false }),
    ]);

    const profMap = new Map((profs || []).map((p) => [p.id, p]));
    const nodesByUser = new Map<string, { concept: string; mastery: number }[]>();
    (nodes || []).forEach((n) => {
      const arr = nodesByUser.get(n.user_id) || [];
      arr.push({ concept: n.concept, mastery: n.mastery_level || 0 });
      nodesByUser.set(n.user_id, arr);
    });
    const lastByUser = new Map<string, { created_at: string; state: string | null }>();
    (sess || []).forEach((s) => {
      if (!lastByUser.has(s.user_id)) lastByUser.set(s.user_id, { created_at: s.created_at, state: s.cognitive_state });
    });

    const result: LinkedStudent[] = (links || []).map((l) => {
      const p = profMap.get(l.student_id);
      const ns = nodesByUser.get(l.student_id) || [];
      const avg = ns.length ? ns.reduce((a, n) => a + n.mastery, 0) / ns.length : 0;
      const weakest = ns.length ? [...ns].sort((a, b) => a.mastery - b.mastery)[0].concept : null;
      const last = lastByUser.get(l.student_id);
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
        cognitiveState: last?.state ?? null,
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
          <h1 className="text-3xl font-bold tracking-tight">শিক্ষার্থী ট্র্যাকিং</h1>
          <p className="mt-1 text-sm text-white/50">শিক্ষার্থীর ৮-অক্ষরের কোড দিয়ে যোগ করো — তারপর তার অগ্রগতি দেখতে পারবে</p>
        </motion.header>

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
                return (
                  <motion.li
                    key={s.link_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-[background-color,box-shadow] hover:bg-white/[0.04] hover:shadow-lg"
                  >
                    <div className="flex items-start gap-3">
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
                      <button
                        onClick={() => removeLink(s.link_id)}
                        className="rounded-md p-1.5 text-red-400/70 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </main>
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
