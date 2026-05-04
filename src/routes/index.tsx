import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ParticleField } from "@/components/landing/ParticleField";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { Innovation } from "@/components/landing/Innovation";
import { Features } from "@/components/landing/Features";
import { DemoFlow } from "@/components/landing/DemoFlow";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "অনুধাবন AI — A Cognitive Flow Learning System" },
      {
        name: "description",
        content:
          "The first adaptive learning platform that understands not just what you don't know — but how you feel while not knowing it. Built for Bangladesh.",
      },
      { property: "og:title", content: "অনুধাবন AI — Cognitive Flow Learning" },
      { property: "og:description", content: "Adaptive, Bangla-first learning that maps your mind in real time." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setAuthed(!!session?.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <div className="relative min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <ParticleField />
      {!authed && <Navbar />}
      <main className="relative z-10">
        <Hero />
        <Problem />
        <Innovation />
        <Features />
        <DemoFlow />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
