import { motion } from "framer-motion";
import {
  Mic, Network, Gauge, Sparkles, Languages, WifiOff,
  Eye, Brain, GraduationCap, MessageSquare, ListChecks, PlayCircle,
  NotebookPen, Users, Lightbulb, ShieldCheck,
} from "lucide-react";

const features = [
  { icon: Mic, title: "Socratic Teach-Back", desc: "Teach the AI back in Bangla. It listens, evaluates, and probes deeper." },
  { icon: Network, title: "Live Mind Map", desc: "Watch your understanding take shape — concept by concept, in real time." },
  { icon: Gauge, title: "Cognitive State Engine", desc: "7 states with smoothing + hysteresis. No flicker, just steady reads." },
  { icon: Eye, title: "Attention Tracking", desc: "On-device face signals via face-api.js. Nothing leaves your browser." },
  { icon: Lightbulb, title: "Cognitive Hints", desc: "The AI quietly explains why it simplified, deepened, or slowed down." },
  { icon: Sparkles, title: "Knowledge Galaxy", desc: "A 3D universe of mastered concepts. Every star is a thing you truly know." },
  { icon: Brain, title: "Mastery Engine", desc: "Exposure → Developing → Practiced → Mastered, with retention decay." },
  { icon: ListChecks, title: "Adaptive Quizzes", desc: "Deeper question pool that adapts to your current cognitive state." },
  { icon: PlayCircle, title: "Verified Resources", desc: "Every YouTube / link is validated with a working preview card." },
  { icon: NotebookPen, title: "Auto Notes", desc: "Session notes generated and saved per topic — ready to revise." },
  { icon: MessageSquare, title: "Multi-provider RAG", desc: "Gemini → Groq → OpenRouter failover, grounded in NCTB curriculum." },
  { icon: GraduationCap, title: "Teacher Dashboard", desc: "Weakness heatmap, interventions, classroom view — all in one place." },
  { icon: Users, title: "Classrooms & Tracking", desc: "Parents and teachers follow real progress, not just marks." },
  { icon: Languages, title: "Bangla-First", desc: "Full voice + UI in Bangla — built for how Bangladeshi students think." },
  { icon: WifiOff, title: "Offline Capsule + PWA", desc: "Download a capsule, learn offline, sync when you return." },
  { icon: ShieldCheck, title: "Role-Aware Surfaces", desc: "Students, teachers, and parents each see only what they need." },
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
            Sixteen surfaces. One mind.
          </h2>
          <p className="mt-5 text-[var(--text-secondary)] max-w-2xl mx-auto text-base">
            Every capability we've shipped — from cognitive sensing to verified resources — in one cohesive system.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 + Math.floor(i / 3) * 0.06, ease }}
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
