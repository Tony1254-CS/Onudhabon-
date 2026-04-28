import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { createGalaxy, type GalaxyHandle, type GalaxyStar } from "@/components/galaxy/createGalaxy";
import { GalaxySidebar } from "@/components/galaxy/GalaxySidebar";
import { ConceptDetail } from "@/components/galaxy/ConceptDetail";

export const Route = createFileRoute("/galaxy")({
  head: () => ({
    meta: [
      { title: "জ্ঞানের মহাবিশ্ব — অনুধাবন AI" },
      { name: "description", content: "Your personal knowledge galaxy — every concept a star." },
    ],
  }),
  component: GalaxyPage,
});

const SUBJECTS = ["সব", "পদার্থবিজ্ঞান", "রসায়ন", "জীববিজ্ঞান", "গণিত"];

function GalaxyPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const galaxyRef = useRef<GalaxyHandle | null>(null);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [stars, setStars] = useState<GalaxyStar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("সব");
  const [selected, setSelected] = useState<GalaxyStar | null>(null);
  const [hovered, setHovered] = useState<GalaxyStar | null>(null);

  // Auth + load
  useEffect(() => {
    let m = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!m) return;
      setAuthed(!!s);
      if (!s) navigate({ to: "/login" });
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!m) return;
      setAuthed(!!session);
      if (!session) { navigate({ to: "/login" }); return; }
      const { data } = await supabase
        .from("concept_nodes")
        .select("id, concept, subject, mastery_level, emotional_tag, last_reviewed")
        .order("created_at", { ascending: false });
      if (!m) return;
      setStars(
        (data ?? []).map((r) => ({
          id: r.id,
          concept: r.concept,
          subject: r.subject,
          mastery: r.mastery_level ?? 0,
          emotional: r.emotional_tag,
          lastReviewed: r.last_reviewed,
        })),
      );
      setLoading(false);
    });
    return () => { m = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  // Init Three scene once
  useEffect(() => {
    if (!canvasRef.current || !labelRef.current) return;
    const g = createGalaxy(canvasRef.current, labelRef.current, {
      onHover: setHovered,
      onClick: setSelected,
    });
    galaxyRef.current = g;
    return () => { g.destroy(); galaxyRef.current = null; };
  }, []);

  // Push stars when ready
  useEffect(() => {
    if (galaxyRef.current && !loading) {
      galaxyRef.current.setStars(stars);
      // Drain mastery celebrations queued from /learn
      const raw = localStorage.getItem("galaxy_celebrations");
      if (raw) {
        try {
          const queue: string[] = JSON.parse(raw);
          if (queue.length) {
            const matched: GalaxyStar[] = [];
            queue.forEach((entry) => {
              const [subject, concept] = entry.split("::");
              const found = stars.find(
                (s) => s.concept === concept && (s.subject ?? "") === (subject ?? ""),
              );
              if (found) matched.push(found);
            });
            // Stagger celebrations
            matched.slice(0, 5).forEach((s, i) => {
              setTimeout(() => galaxyRef.current?.celebrateStar(s.id), 600 + i * 1400);
            });
            localStorage.removeItem("galaxy_celebrations");
          }
        } catch {
          localStorage.removeItem("galaxy_celebrations");
        }
      }
    }
  }, [stars, loading]);

  // Filter
  useEffect(() => {
    galaxyRef.current?.setSubjectFilter(filter === "সব" ? null : filter);
  }, [filter]);

  const visibleStars = useMemo(
    () => (filter === "সব" ? stars : stars.filter((s) => s.subject === filter)),
    [stars, filter],
  );
  const overall = useMemo(() => {
    if (visibleStars.length === 0) return 0;
    return visibleStars.reduce((a, s) => a + s.mastery, 0) / visibleStars.length;
  }, [visibleStars]);

  const counts = useMemo(() => ({
    total: stars.length,
    mastered: stars.filter((s) => s.emotional === "gold").length,
    fragile: stars.filter((s) => s.emotional === "cold-blue").length,
  }), [stars]);

  if (authed === null) return <div className="min-h-screen bg-black" />;
  if (!authed) return null;

  const isEmpty = !loading && stars.length === 0;
  const r = 14, c = 2 * Math.PI * r;

  return (
    <div className="min-h-screen bg-black text-[var(--text-primary)] antialiased overflow-hidden">
      <Navbar />

      {/* 3D canvas + labels (full viewport under navbar) */}
      <div className="absolute inset-0 pt-16">
        <div ref={canvasRef} className="absolute inset-0" />
        <div ref={labelRef} className="absolute inset-0 pointer-events-none" />
      </div>

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 px-5 py-2.5 rounded-full bg-[var(--bg-secondary)]/85 backdrop-blur-2xl border border-[var(--border)]"
        style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
      >
        <h1 className="font-display text-base whitespace-nowrap">জ্ঞানের মহাবিশ্ব</h1>
        <div className="hidden md:flex items-center gap-1">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-bangla transition-all ${
                filter === s
                  ? "bg-[var(--accent-blue)]/20 text-[var(--accent-cold-blue)]"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
            <motion.circle
              cx="16" cy="16" r={r} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c - overall * c }}
              transition={{ duration: 1, ease: "easeOut" }}
              transform="rotate(-90 16 16)"
              style={{ filter: "drop-shadow(0 0 6px rgba(245,158,11,0.7))" }}
            />
          </svg>
          <span className="text-sm font-display tabular-nums text-[var(--accent-gold)]">
            {Math.round(overall * 100)}%
          </span>
        </div>
      </motion.div>

      {/* Sidebar */}
      {!isEmpty && <GalaxySidebar stars={visibleStars} onFocus={(id) => galaxyRef.current?.focusStar(id)} />}

      {/* Detail panel */}
      <ConceptDetail star={selected} onClose={() => setSelected(null)} />

      {/* Hover label fallback (in addition to CSS2D) */}
      {hovered && !selected && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3 py-1.5 rounded-full bg-black/80 backdrop-blur border border-[var(--border)] text-xs font-bangla">
          {hovered.concept} · <span className="text-[var(--text-secondary)]">{Math.round(hovered.mastery * 100)}%</span>
        </div>
      )}

      {/* Bottom legend */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 py-2.5 rounded-full bg-[var(--bg-secondary)]/85 backdrop-blur-2xl border border-[var(--border)] text-[11px] font-bangla"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" style={{ boxShadow: "0 0 8px #F59E0Baa" }} />
          আয়ত্ত করেছ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#60A5FA]" style={{ boxShadow: "0 0 8px #60A5FAaa" }} />
          ভঙ্গুর জ্ঞান
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FB923C]" style={{ boxShadow: "0 0 8px #FB923Caa" }} />
          পর্যালোচনা দরকার
        </span>
        <span className="hidden sm:inline text-[var(--text-secondary)]">
          মোট: {counts.total} | আয়ত্ত: {counts.mastered} | ভঙ্গুর: {counts.fragile}
        </span>
      </motion.div>

      {/* Empty state */}
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        >
          <div className="text-center max-w-md px-6 pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-[var(--border)] text-xs text-[var(--text-secondary)] mb-5">
              <Sparkles className="h-3 w-3 text-[var(--accent-gold)]" /> Empty galaxy
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-balance mb-3">
              তোমার জ্ঞানের মহাবিশ্ব এখনো শূন্য।
            </h2>
            <p className="text-[var(--text-secondary)] font-bangla mb-6 leading-relaxed">
              শেখা শুরু করো — প্রতিটি ধারণা একটি নতুন তারা।
            </p>
            <Link
              to="/learn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--accent-blue)] hover:bg-[var(--accent-cold-blue)] text-white font-semibold text-sm transition-all"
              style={{ boxShadow: "0 0 30px rgba(59,130,246,0.4)" }}
            >
              শিখতে যাও <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
