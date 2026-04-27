import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="relative py-40 px-6 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full animate-blob"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.25), transparent 60%), radial-gradient(circle at 70% 70%, rgba(139,92,246,0.2), transparent 65%)",
          filter: "blur(60px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <h2 className="font-display text-5xl md:text-7xl tracking-tight font-bangla text-balance">
          আজই <span className="text-gradient">শুরু করো</span>
        </h2>
        <p className="mt-6 text-lg text-[var(--text-secondary)]">
          Your first concept is one breath away. Build the galaxy of your own mind.
        </p>
        <div className="mt-10">
          <Link
            to="/signup"
            className="group inline-flex items-center gap-3 px-9 py-4 rounded-full bg-[var(--accent-blue)] text-white text-base font-semibold animate-pulse-glow hover:bg-[var(--accent-cold-blue)] hover:scale-[1.04] active:scale-[0.98] transition-all font-bangla"
          >
            শুরু করো
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
