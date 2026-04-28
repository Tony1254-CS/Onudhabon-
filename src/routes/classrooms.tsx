import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, LogIn, Users, GraduationCap, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { toast } from "sonner";

export const Route = createFileRoute("/classrooms")({
  head: () => ({ meta: [{ title: "ক্লাসরুম — অনুধাবন AI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ join: (s.join as string) || undefined }),
  component: ClassroomsPage,
});

type Classroom = { id: string; name: string; description: string | null; subject: string | null; join_code: string; teacher_id: string; created_at: string };

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function ClassroomsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string>("student");
  const [teaching, setTeaching] = useState<Classroom[]>([]);
  const [enrolled, setEnrolled] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [creating, setCreating] = useState(false);

  // Join form
  const [code, setCode] = useState(search.join || "");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      if (!mounted) return;
      setUserId(session.user.id);
      const { data: p } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      if (mounted) setRole(p?.role || "student");
      await refresh(session.user.id);
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [navigate]);

  // Auto-join via ?join=CODE
  useEffect(() => {
    if (!userId || !search.join || joining) return;
    setCode(search.join.toUpperCase());
  }, [userId, search.join, joining]);

  const refresh = async (uid: string) => {
    const { data: own } = await supabase.from("classrooms").select("*").eq("teacher_id", uid).order("created_at", { ascending: false });
    setTeaching((own || []) as Classroom[]);
    const { data: mems } = await supabase.from("classroom_members").select("classroom_id").eq("student_id", uid);
    const ids = (mems || []).map((m) => m.classroom_id);
    if (ids.length) {
      const { data: rooms } = await supabase.from("classrooms").select("*").in("id", ids).order("created_at", { ascending: false });
      setEnrolled((rooms || []) as Classroom[]);
    } else {
      setEnrolled([]);
    }
  };

  const createClassroom = async () => {
    if (!userId || !name.trim()) return;
    setCreating(true);
    const join_code = generateCode();
    const { data, error } = await supabase
      .from("classrooms")
      .insert({ name: name.trim(), subject: subject.trim() || null, teacher_id: userId, join_code })
      .select()
      .single();
    setCreating(false);
    if (error || !data) { toast.error("ক্লাসরুম তৈরি করা যায়নি"); return; }
    setName(""); setSubject("");
    toast.success(`তৈরি হয়েছে! কোড: ${join_code}`);
    setTeaching((p) => [data as Classroom, ...p]);
  };

  const joinClassroom = async () => {
    if (!userId || !code.trim()) return;
    setJoining(true);
    const c = code.trim().toUpperCase();
    const { data: room } = await supabase.from("classrooms").select("*").eq("join_code", c).maybeSingle();
    if (!room) { setJoining(false); toast.error("ভুল কোড"); return; }
    const { error } = await supabase.from("classroom_members").insert({ classroom_id: room.id, student_id: userId });
    setJoining(false);
    if (error && !String(error.message).includes("duplicate")) {
      toast.error("জয়েন করা যায়নি");
      return;
    }
    toast.success(`${room.name} এ যোগ দিয়েছ!`);
    setCode("");
    navigate({ to: "/classrooms/$classroomId", params: { classroomId: room.id } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B14] text-white">
        <Navbar />
        <div className="grid min-h-[60vh] place-items-center text-white/50">লোড হচ্ছে…</div>
      </div>
    );
  }

  const isTeacher = role === "teacher";

  return (
    <div className="min-h-screen bg-[#080B14] text-white antialiased">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-24">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">ক্লাসরুম</h1>
          <p className="mt-1 text-sm text-white/50">{isTeacher ? "তোমার ক্লাসরুম তৈরি করো ও পরিচালনা করো" : "ক্লাসরুমে জয়েন করো ও কন্টেন্ট দেখো"}</p>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-2">
          {isTeacher && (
            <Panel title="নতুন ক্লাসরুম তৈরি করো" icon={Plus}>
              <div className="space-y-3">
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="ক্লাসের নাম (যেমন: Class 9 Math)"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm placeholder-white/30 outline-none focus:border-amber-400/50"
                />
                <input
                  type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="বিষয় (ঐচ্ছিক)"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm placeholder-white/30 outline-none focus:border-amber-400/50"
                />
                <button
                  onClick={createClassroom} disabled={creating || !name.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  তৈরি করো
                </button>
              </div>
            </Panel>
          )}

          <Panel title="ক্লাসে জয়েন করো" icon={LogIn}>
            <div className="space-y-3">
              <input
                type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="৬-অক্ষরের কোড (যেমন: ABC123)" maxLength={6}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm tracking-widest placeholder-white/30 outline-none focus:border-blue-400/50 font-mono uppercase"
              />
              <button
                onClick={joinClassroom} disabled={joining || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-50"
              >
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                জয়েন করো
              </button>
              <p className="text-xs text-white/40">শিক্ষকের কাছ থেকে কোড বা ইনভাইট লিংক নাও।</p>
            </div>
          </Panel>
        </div>

        {isTeacher && teaching.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/70">
              <GraduationCap className="h-4 w-4" /> আমার ক্লাসরুম ({teaching.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {teaching.map((c) => <ClassroomCard key={c.id} c={c} showCode />)}
            </div>
          </section>
        )}

        {enrolled.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/70">
              <Users className="h-4 w-4" /> যোগদানকৃত ক্লাস ({enrolled.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {enrolled.map((c) => <ClassroomCard key={c.id} c={c} />)}
            </div>
          </section>
        )}

        {teaching.length === 0 && enrolled.length === 0 && (
          <p className="mt-10 text-center text-sm text-white/40">এখনো কোনো ক্লাসরুম নেই — উপরে তৈরি করো বা জয়েন করো।</p>
        )}
      </main>
    </div>
  );
}

function ClassroomCard({ c, showCode = false }: { c: Classroom; showCode?: boolean }) {
  const [copied, setCopied] = useState(false);
  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/classrooms?join=${c.join_code}` : "";
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("কপি হয়েছে");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-[background-color,box-shadow] hover:bg-white/[0.04] hover:shadow-lg">
      <Link to="/classrooms/$classroomId" params={{ classroomId: c.id }} className="block">
        <p className="text-base font-semibold text-white">{c.name}</p>
        {c.subject && <p className="mt-0.5 text-xs text-white/50">{c.subject}</p>}
      </Link>
      {showCode && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={() => copy(c.join_code)} className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-mono text-amber-300 hover:bg-amber-500/20">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {c.join_code}
          </button>
          <button onClick={() => copy(inviteLink)} className="text-[11px] text-blue-300 hover:text-blue-200 underline">ইনভাইট লিংক কপি</button>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: typeof Plus }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/70">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      {children}
    </section>
  );
}
