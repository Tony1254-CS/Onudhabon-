import { motion } from "framer-motion";
import { Brain, EyeOff, HeartPulse } from "lucide-react";

const cards = [
  {
    icon: Brain,
    title: "Memorize",
    desc: "Students reproduce answers they don't truly understand. Marks rise. Comprehension doesn't.",
    color: "from-blue-500/20 to-transparent",
  },
  {
    icon: EyeOff,
    title: "Silent Confusion",
    desc: "Existing systems never detect the hidden gaps quietly forming behind every right answer.",
    color: "from-purple-500/20 to-transparent",
  },
  {
    icon: HeartPulse,
    title: "Emotional Blindspot",
    desc: "No tutor — human or AI — knows how you feel while you struggle. So nothing adapts.",
    color: "from-amber-500/20 to-transparent",
  },
];

export function Problem() {
  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className="text-center mb-20"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-cold-blue)] mb-4">
            The Problem
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-balance">
            Bangladesh's Hidden{" "}
            <span className="text-gradient">Learning Crisis</span>
          </h2>
          <p className="mt-6 text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
            Three invisible failures, repeated millions of times every day.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 40, clipPath: "inset(100% 0 0 0)" }}
              whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.15, ease: [0.25, 1, 0.5, 1] }}
              whileHover={{ y: -4 }}
              className="group relative glass rounded-2xl p-8 overflow-hidden hover:border-white/20 transition-colors"
            >
              <div
                className={`absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl bg-gradient-to-br ${c.color} opacity-50 group-hover:opacity-100 transition-opacity`}
              />
              <div className="relative">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-white/[0.04] border border-white/10 mb-6">
                  <c.icon className="h-5 w-5 text-[var(--accent-cold-blue)]" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-2xl mb-3">{c.title}</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed text-[0.95rem]">
                  {c.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
