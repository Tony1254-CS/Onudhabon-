import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, inputCls, btnPrimary, labelCls } from "@/components/auth/AuthShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign Up — অনুধাবন AI" }] }),
  component: SignupPage,
});

const ROLES = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "parent", label: "Parent" },
] as const;

const CLASSES = ["class-8", "class-9", "class-10", "class-11", "class-12"] as const;

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("student");
  const [classLevel, setClassLevel] = useState<(typeof CLASSES)[number]>("class-10");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/learn`,
        data: {
          full_name: fullName,
          role,
          class_level: role === "student" ? classLevel : null,
        },
      },
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    navigate({ to: "/learn" });
  };

  return (
    <AuthShell
      title="Begin your journey"
      subtitle="Create an account to map your mind."
      footer={
        <>
          Already a member?{" "}
          <Link to="/login" className="text-[var(--accent-cold-blue)] hover:text-[var(--accent-blue)] font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputCls}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label className={labelCls}>I am a</label>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`h-10 rounded-lg text-xs font-medium border transition-all ${
                  role === r.value
                    ? "bg-[var(--accent-blue)]/15 border-[var(--accent-cold-blue)]/60 text-[var(--text-primary)]"
                    : "bg-white/[0.02] border-[var(--border)] text-[var(--text-secondary)] hover:border-white/20"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {role === "student" && (
          <div>
            <label className={labelCls}>Class level</label>
            <div className="grid grid-cols-5 gap-2">
              {CLASSES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassLevel(c)}
                  className={`h-10 rounded-lg text-xs font-semibold border transition-all ${
                    classLevel === c
                      ? "bg-[var(--accent-purple)]/15 border-[var(--accent-purple)]/60 text-[var(--text-primary)]"
                      : "bg-white/[0.02] border-[var(--border)] text-[var(--text-secondary)] hover:border-white/20"
                  }`}
                >
                  {c.replace("class-", "")}
                </button>
              ))}
            </div>
          </div>
        )}

        {err && <p className="text-xs text-red-400">{err}</p>}
        <button type="submit" disabled={loading} className={btnPrimary}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-bangla">শুরু করো</span>}
        </button>
      </form>
    </AuthShell>
  );
}
