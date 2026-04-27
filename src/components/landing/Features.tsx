import { motion } from "framer-motion";
import { Mic, Network, Gauge, Sparkles, Languages, WifiOff } from "lucide-react";

const features = [
  { icon: Mic, title: "Socratic Teach-Back", desc: "Teach the AI back in Bangla. It listens, evaluates, and probes deeper." },
  { icon: Network, title: "Live Mind Map", desc: "Watch your understanding take shape — concept by concept, in real time." },
  { icon: Gauge, title: "Cognitive State Engine", desc: "The system reads your mental state and adapts pace, tone, and challenge." },
  { icon: Sparkles, title: "Knowledge Galaxy", desc: "A 3D universe of mastered concepts. Every star is a thing you truly know." },
  { icon: Languages, title: "Bangla-First", desc: "Full voice interaction in Bangla — built for how Bangladeshi students think." },
  { icon: WifiOff, title: "Offline Capsule", desc: "Download a learning capsule. Continue without internet. Sync when you return." },
];

const ease = [0.25, 1, 0.5, 1] as const;

export function Features() {
  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease }}
          className="text-center mb-20"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-cold-blue)] mb-4">
            What's Inside
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-balance">
            Six surfaces. One mind.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.1 + Math.floor(i / 3) * 0.15, ease }}
              whileHover={{ y: -4 }}
              className="group glass rounded-2xl p-7 hover:border-[var(--accent-cold-blue)]/30 transition-all hover:shadow-[0_0_40px_-10px_rgba(96,165,250,0.4)] relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[var(--accent-blue)]/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="inline-flex items-center justify-center h-11 w-11 rounded-lg bg-white/[0.04] border border-white/10 mb-5 group-hover:border-[var(--accent-cold-blue)]/40 transition-colors">
                  <f.icon className="h-5 w-5 text-[var(--accent-cold-blue)]" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl mb-2">{f.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
