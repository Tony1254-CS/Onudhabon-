import { motion } from "framer-motion";
import { HelpCircle, BookOpen, Mic, Network, Sparkles } from "lucide-react";

const steps = [
  { icon: HelpCircle, label: "Ask" },
  { icon: BookOpen, label: "Learn" },
  { icon: Mic, label: "Teach Back" },
  { icon: Network, label: "Map Forms" },
  { icon: Sparkles, label: "Galaxy Updates" },
];

const ease = [0.25, 1, 0.5, 1] as const;

export function DemoFlow() {
  return (
    <section className="relative py-32 px-6 bg-[var(--bg-secondary)]/40">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-gold)] mb-4">
            The Flow
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-balance">
            How a session unfolds
          </h2>
        </motion.div>

        <div className="relative">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-4">
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-center w-full lg:w-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.6, delay: i * 0.18, ease }}
                  className="flex flex-col items-center gap-3 mx-auto"
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-[var(--accent-blue)]/30 blur-xl" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full glass border-[var(--accent-cold-blue)]/40">
                      <s.icon className="h-6 w-6 text-[var(--accent-cold-blue)]" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-[var(--bg-primary)] border border-[var(--accent-cold-blue)]/60 flex items-center justify-center text-[10px] font-bold text-[var(--accent-cold-blue)]">
                      {i + 1}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{s.label}</span>
                </motion.div>

                {i < steps.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.18 + 0.2, ease }}
                    className="hidden lg:block flex-1 h-px mx-2 origin-left bg-gradient-to-r from-[var(--accent-cold-blue)]/60 via-[var(--accent-purple)]/60 to-[var(--accent-cold-blue)]/60"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
