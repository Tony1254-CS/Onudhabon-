import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Save, User as UserIcon, Copy, Check, KeyRound, GraduationCap, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "প্রোফাইল সেটিংস — অনুধাবন AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [role, setRole] = useState("student");
  const [studentCode, setStudentCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      if (!mounted) return;
      setUserId(session.user.id);
      setEmail(session.user.email || "");
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, nickname, class_level, role, student_code")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!mounted) return;
      if (p) {
        setFullName(p.full_name || "");
        setNickname(p.nickname || "");
        setClassLevel(p.class_level || "");
        setRole(p.role || "student");
        setStudentCode(p.student_code || null);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [navigate]);

  const copyCode = async () => {
    if (!studentCode) return;
    await navigator.clipboard.writeText(studentCode);
    setCodeCopied(true);
    toast.success("কোড কপি হয়েছে");
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        nickname: nickname.trim() || null,
        class_level: classLevel.trim() || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("সংরক্ষণ ব্যর্থ — আবার চেষ্টা করো");
    } else {
      toast.success("প্রোফাইল সংরক্ষিত হয়েছে");
    }
  };

  if (loading) {
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
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-24">
        <motion.header
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight">প্রোফাইল সেটিংস</h1>
          <p className="mt-1 text-sm text-white/50">তোমার তথ্য এডিট করো</p>
        </motion.header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-blue-500 text-2xl font-bold text-black">
              {(nickname || fullName || email || "?").trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{email}</p>
              <p className="text-xs text-white/40">{role === "teacher" ? "শিক্ষক অ্যাকাউন্ট" : role === "parent" ? "অভিভাবক" : "শিক্ষার্থী"}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="পূর্ণ নাম" value={fullName} onChange={setFullName} placeholder="তোমার পূর্ণ নাম" />
            <Field label="ডাকনাম / নিকনেম" value={nickname} onChange={setNickname} placeholder="যেমন: রাহুল" />
            <Field label="ক্লাস / শ্রেণি" value={classLevel} onChange={setClassLevel} placeholder="যেমন: Class 9" />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              সংরক্ষণ করো
            </button>
          </div>
        </section>

        {role === "student" && studentCode && (
          <section className="mt-6 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/5 to-blue-500/5 p-6">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 text-amber-300" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">তোমার স্টুডেন্ট কোড</h3>
                <p className="mt-1 text-xs text-white/50">এই কোডটি বাবা-মা বা শিক্ষকের সাথে শেয়ার করো — তারা তোমার অগ্রগতি দেখতে পারবে।</p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="rounded-lg bg-black/40 px-4 py-2.5 font-mono text-lg font-bold tracking-[0.3em] text-amber-200">
                    {studentCode}
                  </code>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs hover:bg-white/10"
                  >
                    {codeCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    কপি
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-xs text-white/50">
          <div className="flex items-center gap-2 text-white/70">
            <UserIcon className="h-4 w-4" />
            <span className="font-semibold">টিপ</span>
          </div>
          <p className="mt-2 leading-relaxed">
            ডাকনাম দিলে পুরো অ্যাপে সেটাই দেখানো হবে। ইমেল পরিবর্তন করতে চাইলে সাপোর্টের সাথে যোগাযোগ করো।
          </p>
        </section>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/60">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/50 focus:bg-white/[0.07] transition-colors"
      />
    </label>
  );
}
