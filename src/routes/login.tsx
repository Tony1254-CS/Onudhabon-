import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, inputCls, btnPrimary, labelCls } from "@/components/auth/AuthShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — অনুধাবন AI" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setErr(error.message);
      return;
    }
    // Route by role so teachers/parents don't land in the student chat UI
    let dest: "/learn" | "/dashboard" | "/track" = "/learn";
    try {
      const uid = data.user?.id;
      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle();
        const role = prof?.role;
        if (role === "teacher") dest = "/dashboard";
        else if (role === "parent") dest = "/track";
      }
    } catch { /* fall back to /learn */ }
    setLoading(false);
    navigate({ to: dest });
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your cognitive journey."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="text-[var(--accent-cold-blue)] hover:text-[var(--accent-blue)] font-medium">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
          />
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button type="submit" disabled={loading} className={btnPrimary}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-bangla">লগইন</span>}
        </button>
      </form>
    </AuthShell>
  );
}
