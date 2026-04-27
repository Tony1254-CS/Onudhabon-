import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/learn")({
  head: () => ({ meta: [{ title: "Learn — অনুধাবন AI" }] }),
  component: LearnPage,
});

function LearnPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      if (!session) navigate({ to: "/login" });
      else setEmail(session.user.email ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session) navigate({ to: "/login" });
      else setEmail(session.user.email ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-cold-blue)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-[var(--text-secondary)] mb-6">
            <Sparkles className="h-3 w-3 text-[var(--accent-gold)]" />
            Welcome, {email}
          </div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tight">
            Your <span className="text-gradient">galaxy</span> awaits.
          </h1>
          <p className="mt-4 text-[var(--text-secondary)] font-bangla">
            শীঘ্রই এখানে তোমার প্রথম অধ্যায় শুরু হবে।
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="px-5 py-2.5 rounded-full text-sm border border-[var(--border)] hover:border-white/30 hover:bg-white/[0.04] transition-all"
            >
              Sign out
            </button>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-full text-sm bg-[var(--accent-blue)] hover:bg-[var(--accent-cold-blue)] text-white font-semibold transition-all"
            >
              Back home
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
