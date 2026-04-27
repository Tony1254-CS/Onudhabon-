import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, PlayCircle } from "lucide-react";

const ease = [0.25, 1, 0.5, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, delay: 0.2 + i * 0.15, ease },
  }),
};

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Breathing gradient mesh */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none">
        <div className="animate-blob h-[80vw] w-[80vw] max-h-[900px] max-w-[900px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(59,130,246,0.25), transparent 60%), radial-gradient(circle at 70% 60%, rgba(139,92,246,0.22), transparent 65%), radial-gradient(circle at 50% 80%, rgba(245,158,11,0.08), transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Faint neural SVG */}
      <svg
        className="absolute inset-0 w-full h-full z-0 opacity-[0.18] pointer-events-none"
        aria-hidden
      >
        <defs>
          <linearGradient id="line-grad" x1="0" x2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        {Array.from({ length: 14 }).map((_, i) => {
          const x1 = (i * 137) % 100;
          const y1 = (i * 53) % 100;
          const x2 = (i * 211) % 100;
          const y2 = (i * 97) % 100;
          return (
            <motion.line
              key={i}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke="url(#line-grad)"
              strokeWidth="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 2.5, delay: 0.2 + i * 0.08, ease }}
            />
          );
        })}
      </svg>

      <div className="relative z-10 text-center max-w-4xl px-6 mx-auto">
        <motion.div
          custom={0}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-[var(--text-secondary)] mb-8"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-cold-blue)] animate-pulse" />
          Live AI · powered by Gemini · NCTB-grounded
        </motion.div>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="font-display font-bangla text-[clamp(3.5rem,10vw,7rem)] leading-[0.95] tracking-tight text-balance"
        >
          <span className="text-gradient">অনুধাবন</span>{" "}
          <span className="text-[var(--text-primary)]">AI</span>
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-6 text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto text-pretty"
        >
          The first adaptive learning platform that understands not just{" "}
          <span className="text-[var(--text-primary)]">what</span> you don't know — but{" "}
          <span className="text-[var(--accent-cold-blue)]">how you feel</span> while not knowing it.
        </motion.p>

        <motion.div
          custom={3}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/signup"
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[var(--accent-blue)] text-white font-semibold animate-pulse-glow hover:bg-[var(--accent-cold-blue)] transition-all hover:scale-[1.03] active:scale-[0.98] font-bangla"
          >
            শুরু করো
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#how"
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/15 text-[var(--text-primary)] hover:bg-white/[0.04] hover:border-white/30 transition-all font-bangla"
          >
            <PlayCircle size={18} />
            দেখো কীভাবে কাজ করে
          </a>
        </motion.div>

        <motion.div
          custom={4}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-20 text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]/60"
        >
          Scroll to begin
          <div className="mx-auto mt-3 h-10 w-px bg-gradient-to-b from-[var(--accent-cold-blue)] to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}
