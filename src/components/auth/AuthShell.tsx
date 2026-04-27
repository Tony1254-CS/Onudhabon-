import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ParticleField } from "@/components/landing/ParticleField";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-20 bg-[var(--bg-primary)] overflow-hidden">
      <ParticleField />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full animate-blob pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.18), transparent 60%), radial-gradient(circle at 70% 70%, rgba(139,92,246,0.15), transparent 65%)",
          filter: "blur(60px)",
        }}
      />
      <Link
        to="/"
        className="absolute top-6 left-6 z-10 flex items-baseline gap-1.5 group"
      >
        <span className="font-display text-xl font-bangla">অনুধাবন</span>
        <span className="text-xs font-bold tracking-widest text-[var(--accent-cold-blue)]">AI</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
        className="relative z-10 w-full max-w-md glass rounded-2xl p-8 md:p-10"
        style={{ boxShadow: "0 0 60px -20px rgba(59,130,246,0.4)" }}
      >
        <h1 className="font-display text-3xl tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>
        <div className="mt-8 space-y-4">{children}</div>
        <div className="mt-6 pt-6 border-t border-[var(--border)] text-center text-sm text-[var(--text-secondary)]">
          {footer}
        </div>
      </motion.div>
    </div>
  );
}

export const inputCls =
  "w-full h-11 px-4 rounded-lg bg-white/[0.03] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[var(--accent-cold-blue)]/60 focus:ring-2 focus:ring-[var(--accent-blue)]/20 transition-all";

export const btnPrimary =
  "w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-blue)] text-white text-sm font-semibold hover:bg-[var(--accent-cold-blue)] active:scale-[0.98] transition-all hover:shadow-[0_0_24px_0_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed";

export const labelCls = "block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider";
