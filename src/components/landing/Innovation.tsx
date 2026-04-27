import { motion } from "framer-motion";
import { MessageCircleQuestion, Activity } from "lucide-react";

const ease = [0.25, 1, 0.5, 1] as const;

export function Innovation() {
  return (
    <section id="how" className="relative py-32 px-6 bg-[var(--bg-secondary)]/40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_60%)]" />

      <div className="mx-auto max-w-6xl relative">
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease }}
          className="text-center mb-20"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-purple)] mb-4">
            Core Innovation
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-balance">
            Two Engines. One System.{" "}
            <span className="text-gradient">Never Done Before.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-10 items-stretch relative">
          {/* fusion line */}
          <svg
            className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"
            width="200"
            height="120"
            viewBox="0 0 200 120"
          >
            <defs>
              <linearGradient id="fuse" x1="0" x2="1">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#F1F5F9" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <motion.path
              d="M 10 60 Q 100 10 190 60 M 10 60 Q 100 110 190 60"
              fill="none"
              stroke="url(#fuse)"
              strokeWidth="1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 0.8 }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease, delay: 0.4 }}
            />
            <motion.circle
              cx="100"
              cy="60"
              r="6"
              fill="#F1F5F9"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.5, type: "spring" }}
            />
          </svg>

          {[
            {
              icon: MessageCircleQuestion,
              tag: "Engine 01",
              title: "Socratic Engine",
              desc: "AI teaches you, then asks YOU to explain it back. As you speak, a live mind map forms in real time. Missing nodes reveal missing knowledge — instantly visible.",
              accent: "var(--accent-blue)",
              from: "left",
            },
            {
              icon: Activity,
              tag: "Engine 02",
              title: "Cognitive Flow Engine",
              desc: "Real-time cognitive state estimation. Focused? Challenged harder. Confused? Simplified. Anxious? Confidence mode. Fatigued? Story mode.",
              accent: "var(--accent-purple)",
              from: "right",
            },
          ].map((e, i) => (
            <motion.div
              key={e.title}
              initial={{ opacity: 0, x: e.from === "left" ? -60 : 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, ease, delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className="relative glass rounded-2xl p-10 overflow-hidden group z-10"
              style={{ boxShadow: `0 0 60px -20px ${e.accent}` }}
            >
              <div
                className="absolute inset-0 opacity-30 group-hover:opacity-60 transition-opacity"
                style={{
                  background: `radial-gradient(ellipse at top right, ${e.accent}22, transparent 60%)`,
                }}
              />
              <div className="relative">
                <p
                  className="text-xs uppercase tracking-[0.25em] mb-4"
                  style={{ color: e.accent }}
                >
                  {e.tag}
                </p>
                <div
                  className="inline-flex h-14 w-14 items-center justify-center rounded-xl mb-6"
                  style={{
                    background: `${e.accent}1a`,
                    border: `1px solid ${e.accent}40`,
                  }}
                >
                  <e.icon className="h-6 w-6" style={{ color: e.accent }} strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-3xl mb-4">{e.title}</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed text-base">{e.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
