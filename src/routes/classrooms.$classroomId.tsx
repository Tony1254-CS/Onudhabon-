import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Link as LinkIcon, FileText, Upload, Trash2, Copy, Users, BarChart3, Loader2, Plus, ExternalLink, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { toast } from "sonner";

export const Route = createFileRoute("/classrooms/$classroomId")({
  head: () => ({ meta: [{ title: "ক্লাসরুম — অনুধাবন AI" }] }),
  component: ClassroomDetail,
});

type Classroom = { id: string; name: string; description: string | null; subject: string | null; join_code: string; teacher_id: string; created_at: string };
type Post = { id: string; classroom_id: string; author_id: string; kind: string; title: string; body: string | null; url: string | null; file_path: string | null; created_at: string };
type Member = { id: string; classroom_id: string; student_id: string; joined_at: string };
type StudentProfile = { id: string; full_name: string | null; nickname: string | null; class_level: string | null };

function ClassroomDetail() {
  const { classroomId } = Route.useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Record<string, StudentProfile>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"stream" | "members" | "monitor">("stream");
  const [authorized, setAuthorized] = useState(false);

  // Per-student concept stats (for monitoring tab)
  const [conceptStats, setConceptStats] = useState<Record<string, { count: number; avg: number; weakest?: string }>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      if (!mounted) return;
      setUserId(session.user.id);
      const { data: room } = await supabase.from("classrooms").select("*").eq("id", classroomId).maybeSingle();
      if (!room) { toast.error("ক্লাসরুম পাওয়া যায়নি"); navigate({ to: "/classrooms" }); return; }
      if (mounted) { setClassroom(room as Classroom); setAuthorized(true); }
      await Promise.all([loadPosts(), loadMembers(room as Classroom)]);
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [classroomId, navigate]);

  const loadPosts = async () => {
    const { data } = await supabase.from("classroom_posts").select("*").eq("classroom_id", classroomId).order("created_at", { ascending: false });
    setPosts((data || []) as Post[]);
  };

  const loadMembers = async (room: Classroom) => {
    const { data: mems } = await supabase.from("classroom_members").select("*").eq("classroom_id", classroomId);
    setMembers((mems || []) as Member[]);
    const ids = (mems || []).map((m) => m.student_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, nickname, class_level").in("id", ids);
      const map: Record<string, StudentProfile> = {};
      (profs || []).forEach((p) => { map[p.id] = p as StudentProfile; });
      setProfiles(map);

      // Concept stats per student
      const { data: nodes } = await supabase.from("concept_nodes").select("user_id, concept, mastery_level").in("user_id", ids);
      const stats: Record<string, { count: number; sum: number; weakest?: { c: string; m: number } }> = {};
      (nodes || []).forEach((n) => {
        const s = stats[n.user_id] || { count: 0, sum: 0 };
        s.count += 1;
        s.sum += n.mastery_level || 0;
        if (!s.weakest || (n.mastery_level || 0) < s.weakest.m) s.weakest = { c: n.concept, m: n.mastery_level || 0 };
        stats[n.user_id] = s;
      });
      const out: Record<string, { count: number; avg: number; weakest?: string }> = {};
      Object.entries(stats).forEach(([uid, s]) => {
        out[uid] = { count: s.count, avg: s.count ? s.sum / s.count : 0, weakest: s.weakest?.c };
      });
      setConceptStats(out);
    } else {
      setProfiles({});
      setConceptStats({});
    }
    void room;
  };

  const isTeacher = !!classroom && !!userId && classroom.teacher_id === userId;

  const classAvg = useMemo(() => {
    const vals = Object.values(conceptStats);
    if (!vals.length) return 0;
    return vals.reduce((a, s) => a + s.avg, 0) / vals.length;
  }, [conceptStats]);

  const copyInvite = async () => {
    if (!classroom) return;
    const link = `${window.location.origin}/classrooms?join=${classroom.join_code}`;
    await navigator.clipboard.writeText(link);
    toast.success("ইনভাইট লিংক কপি হয়েছে");
  };

  const leave = async () => {
    if (!userId) return;
    await supabase.from("classroom_members").delete().eq("classroom_id", classroomId).eq("student_id", userId);
    toast.success("ক্লাস ছাড়লে");
    navigate({ to: "/classrooms" });
  };

  if (loading || !classroom || !authorized) {
    return (
      <div className="min-h-screen bg-[#080B14] text-white">
        <Navbar />
        <div className="grid min-h-[60vh] place-items-center text-white/50">লোড হচ্ছে…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080B14] text-white antialiased">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-24">
        <Link to="/classrooms" className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <ArrowLeft className="h-3 w-3" /> সকল ক্লাসরুম
        </Link>

        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{classroom.name}</h1>
            <p className="mt-1 text-sm text-white/50">
              {classroom.subject || "সাধারণ"} • {members.length} জন শিক্ষার্থী • কোড <span className="font-mono text-amber-300">{classroom.join_code}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyInvite} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
              <Copy className="h-3 w-3" /> ইনভাইট কপি
            </button>
            {!isTeacher && (
              <button onClick={leave} className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20">
                ছেড়ে দাও
              </button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
          <TabBtn active={tab === "stream"} onClick={() => setTab("stream")} label="স্ট্রিম" />
          <TabBtn active={tab === "members"} onClick={() => setTab("members")} label={`সদস্য (${members.length})`} />
          {isTeacher && <TabBtn active={tab === "monitor"} onClick={() => setTab("monitor")} label="মনিটরিং" />}
        </div>

        {tab === "stream" && (
          <StreamTab posts={posts} isTeacher={isTeacher} classroomId={classroomId} userId={userId!} onChange={loadPosts} profiles={profiles} teacherId={classroom.teacher_id} />
        )}
        {tab === "members" && (
          <MembersTab members={members} profiles={profiles} stats={conceptStats} />
        )}
        {tab === "monitor" && isTeacher && (
          <MonitorTab members={members} profiles={profiles} stats={conceptStats} classAvg={classAvg} />
        )}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${active ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
    >
      {label}
    </button>
  );
}

function StreamTab({ posts, isTeacher, classroomId, userId, onChange, profiles, teacherId }: {
  posts: Post[]; isTeacher: boolean; classroomId: string; userId: string; onChange: () => void;
  profiles: Record<string, StudentProfile>; teacherId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="space-y-4">
      {isTeacher && (
        <div>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] py-3 text-sm text-white/60 hover:border-amber-400/40 hover:text-white">
              <Plus className="h-4 w-4" /> নতুন পোস্ট যোগ করো
            </button>
          ) : (
            <PostForm classroomId={classroomId} userId={userId} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); onChange(); }} />
          )}
        </div>
      )}

      {posts.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center text-sm text-white/40">এখনো কোনো পোস্ট নেই।</p>
      ) : (
        posts.map((p) => (
          <PostCard key={p.id} post={p} canDelete={isTeacher && p.author_id === userId} onDeleted={onChange}
            authorName={p.author_id === teacherId ? "শিক্ষক" : (profiles[p.author_id]?.nickname || profiles[p.author_id]?.full_name || "—")}
          />
        ))
      )}
    </div>
  );
}

function PostForm({ classroomId, userId, onClose, onCreated }: { classroomId: string; userId: string; onClose: () => void; onCreated: () => void }) {
  const [kind, setKind] = useState<"link" | "note" | "file">("link");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!title.trim()) { toast.error("শিরোনাম দাও"); return; }
    setBusy(true);
    let file_path: string | null = null;
    try {
      if (kind === "file") {
        if (!file) { toast.error("ফাইল নির্বাচন করো"); setBusy(false); return; }
        const path = `${classroomId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("classroom-files").upload(path, file);
        if (upErr) throw upErr;
        file_path = path;
      }
      const { error } = await supabase.from("classroom_posts").insert({
        classroom_id: classroomId,
        author_id: userId,
        kind,
        title: title.trim(),
        body: body.trim() || null,
        url: kind === "link" ? url.trim() : null,
        file_path,
      });
      if (error) throw error;
      toast.success("পোস্ট যোগ হয়েছে");
      onCreated();
    } catch (e) {
      console.error(e);
      toast.error("পোস্ট যোগ করা যায়নি");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-white/10 p-0.5">
          {(["link", "note", "file"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium ${kind === k ? "bg-amber-500/20 text-amber-200" : "text-white/50 hover:text-white"}`}>
              {k === "link" ? <LinkIcon className="h-3 w-3" /> : k === "note" ? <FileText className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
              {k === "link" ? "লিংক" : k === "note" ? "নোট" : "ফাইল"}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="শিরোনাম"
        className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder-white/30 outline-none focus:border-amber-400/50" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="বর্ণনা / নোট (ঐচ্ছিক)" rows={3}
        className="mb-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder-white/30 outline-none focus:border-amber-400/50" />
      {kind === "link" && (
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (YouTube, article, etc.)"
          className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder-white/30 outline-none focus:border-amber-400/50" />
      )}
      {kind === "file" && (
        <div className="mb-2">
          <input ref={inputRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
          <button onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3 py-3 text-xs text-white/60 hover:border-amber-400/40">
            <Upload className="h-3.5 w-3.5" />
            {file ? file.name : "ফাইল বেছে নাও (PDF, image, etc.)"}
          </button>
        </div>
      )}
      <button onClick={submit} disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        পোস্ট করো
      </button>
    </motion.div>
  );
}

function PostCard({ post, canDelete, onDeleted, authorName }: { post: Post; canDelete: boolean; onDeleted: () => void; authorName: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (post.file_path) {
      supabase.storage.from("classroom-files").createSignedUrl(post.file_path, 3600).then(({ data }) => {
        if (data?.signedUrl) setSignedUrl(data.signedUrl);
      });
    }
  }, [post.file_path]);

  const remove = async () => {
    if (!confirm("পোস্ট মুছবে?")) return;
    if (post.file_path) await supabase.storage.from("classroom-files").remove([post.file_path]);
    await supabase.from("classroom_posts").delete().eq("id", post.id);
    onDeleted();
  };

  const Icon = post.kind === "link" ? LinkIcon : post.kind === "file" ? Upload : FileText;
  const accent = post.kind === "link" ? "text-blue-300" : post.kind === "file" ? "text-amber-300" : "text-emerald-300";
  return (
    <motion.article initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-[background-color,box-shadow] hover:bg-white/[0.04] hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 ${accent}`}><Icon className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{post.title}</p>
            <p className="text-[11px] text-white/40">{authorName} • {new Date(post.created_at).toLocaleString("bn-BD")}</p>
          </div>
        </div>
        {canDelete && (
          <button onClick={remove} className="rounded-md p-1.5 text-red-400/70 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {post.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{post.body}</p>}
      {post.kind === "link" && post.url && (
        <a href={post.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-500/20">
          <ExternalLink className="h-3 w-3" /> লিংকে যাও
        </a>
      )}
      {post.kind === "file" && signedUrl && (
        <a href={signedUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20">
          <Download className="h-3 w-3" /> ডাউনলোড
        </a>
      )}
    </motion.article>
  );
}

function MembersTab({ members, profiles, stats }: { members: Member[]; profiles: Record<string, StudentProfile>; stats: Record<string, { count: number; avg: number; weakest?: string }> }) {
  if (members.length === 0) return <p className="py-12 text-center text-sm text-white/40">কেউ এখনো জয়েন করেনি।</p>;
  return (
    <ul className="space-y-2">
      {members.map((m) => {
        const p = profiles[m.student_id];
        const s = stats[m.student_id];
        const name = p?.nickname || p?.full_name || "Unnamed";
        const avg = s ? Math.round(s.avg * 100) : 0;
        return (
          <li key={m.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-blue-500 text-xs font-bold text-black">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{name}</p>
              <p className="text-[11px] text-white/40">{p?.class_level || "—"} • {s?.count || 0} ধারণা</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums" style={{ color: avg >= 70 ? "#10B981" : avg >= 40 ? "#F59E0B" : avg > 0 ? "#EF4444" : "rgba(255,255,255,0.3)" }}>
                {s ? `${avg}%` : "—"}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MonitorTab({ members, profiles, stats, classAvg }: {
  members: Member[]; profiles: Record<string, StudentProfile>;
  stats: Record<string, { count: number; avg: number; weakest?: string }>; classAvg: number;
}) {
  const totalConcepts = Object.values(stats).reduce((a, s) => a + s.count, 0);
  const struggling = Object.entries(stats).filter(([, s]) => s.avg < 0.4).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="ক্লাস গড় দক্ষতা" value={`${Math.round(classAvg * 100)}%`} accent="#F59E0B" />
        <Stat label="মোট ধারণা" value={totalConcepts} accent="#3B82F6" />
        <Stat label="সংগ্রামরত শিক্ষার্থী" value={struggling} accent="#EF4444" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/70">
          <BarChart3 className="h-4 w-4" /> পারফরম্যান্স
        </h3>
        {members.length === 0 ? (
          <p className="text-sm text-white/40">কোনো সদস্য নেই।</p>
        ) : (
          <ul className="space-y-3">
            {members.map((m) => {
              const p = profiles[m.student_id];
              const s = stats[m.student_id];
              const name = p?.nickname || p?.full_name || "Unnamed";
              const avg = s ? s.avg : 0;
              return (
                <li key={m.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-white">{name}</span>
                    <span className="tabular-nums text-white/60">{Math.round(avg * 100)}% • {s?.count || 0} ধারণা</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.round(avg * 100)}%`,
                      background: avg >= 0.7 ? "#10B981" : avg >= 0.4 ? "#F59E0B" : "#EF4444",
                    }} />
                  </div>
                  {s?.weakest && (
                    <p className="mt-1 text-[10px] text-white/40">দুর্বলতম: <span className="text-red-300">{s.weakest}</span></p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
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

void AnimatePresence;
void Users;
