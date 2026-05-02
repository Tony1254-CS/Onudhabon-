import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Brain, Code2, Telescope, ArrowRight, Check } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — অনুধাবন AI" },
      { name: "description", content: "অনুধাবন AI is a cognitive flow learning system built for Bangladesh — Infinity AI BuildFest 2026." },
      { property: "og:title", content: "About — অনুধাবন AI" },
      { property: "og:description", content: "Cognitive Flow Learning System for Bangladesh." },
    ],
  }),
  component: AboutPage,
});

const TEAM = [
  { role: "Researcher", emoji: "🧪", desc: "Curriculum mapping, cognitive science, NCTB alignment." },
  { role: "Builder", emoji: "🛠️", desc: "Pedagogy design, prompt engineering, demo experience." },
  { role: "Developer", emoji: "💻", desc: "Edge functions, RAG, real-time UI, 3D galaxy." },
];

const STACK = [
  { name: "Gemini", color: "#60A5FA" },
  { name: "Groq", color: "#F59E0B" },
  { name: "OpenRouter", color: "#A78BFA" },
  { name: "LlamaCloud", color: "#10B981" },
  { name: "Supabase", color: "#34D399" },
  { name: "ReactFlow", color: "#3B82F6" },
  { name: "Three.js", color: "#FB923C" },
  { name: "face-api.js", color: "#F472B6" },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-[#080B14] text-white antialiased">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pt-28 pb-20">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/5 px-3 py-1 text-xs text-amber-200">
            <Sparkles className="h-3 w-3" /> Infinity AI BuildFest 2026
          </span>
          <h1 className="mt-6 text-balance text-5xl font-bold tracking-tight">
            যেখানে <span className="bg-gradient-to-r from-amber-400 to-blue-400 bg-clip-text text-transparent font-bangla">বোধ</span> জন্মায়।
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/60">
            অনুধাবন AI বাংলাদেশের জন্য তৈরি একটি কগনিটিভ ফ্লো লার্নিং সিস্টেম —
            যা শুধু উত্তর দেয় না, প্রশ্ন তোলে। যা শুধু পড়ায় না, ছাত্রের মনের ভেতর দিয়ে শেখার পথ তৈরি করে।
          </p>
        </motion.section>

        {/* Story */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-16 rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl"
        >
          <h2 className="text-2xl font-semibold">আমাদের গল্প</h2>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-white/70 font-bangla">
            <p>
              বাংলাদেশের লক্ষ লক্ষ শিক্ষার্থী মুখস্থ করে। কিন্তু বুঝে না।
              পরীক্ষায় পাস করে, কিন্তু ধারণাটা থেকে যায় ফাঁপা।
            </p>
            <p>
              অনুধাবন AI তৈরি হয়েছে এই গ্যাপ পূরণ করতে। আমরা একটি সিস্টেম বানিয়েছি যেখানে AI ছাত্রকে শেখায়, তারপর ছাত্র AI-কে শেখায় —
              এই Socratic teach-back দিয়ে আমরা বুঝতে পারি ছাত্র আসলেই বুঝেছে কিনা।
            </p>
            <p>
              আমরা cognitive state ট্র্যাক করি — confused, focused, overloaded — এবং সেই অনুযায়ী AI-এর শেখানোর ধরন পাল্টায়।
              একটি Knowledge Galaxy তৈরি হয় প্রতিটি ছাত্রের জন্য, যেখানে প্রতিটি ধারণা একটি তারা।
            </p>
          </div>
        </motion.section>

        {/* Problem stats */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-12"
        >
          <h2 className="mb-6 text-2xl font-semibold font-bangla">সমস্যা</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { num: "৩.৫ মিলিয়ন+", label: "SSC/HSC পরীক্ষার্থী প্রতি বছর" },
              { num: "৭২%", label: "শিক্ষার্থী মুখস্থ করে, বোঝে না" },
              { num: "১ লক্ষ+", label: "কোচিং সেন্টার — কোনো ব্যক্তিগতকরণ নেই" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl text-center"
                style={{ boxShadow: "0 10px 30px -20px rgba(245,158,11,0.25)" }}
              >
                <div className="font-bangla text-3xl font-bold tabular-nums bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                  {s.num}
                </div>
                <p className="mt-2 text-sm text-white/60 font-bangla leading-relaxed text-balance">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Business model */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-12"
        >
          <h2 className="mb-6 text-2xl font-semibold font-bangla">ব্যবসায়িক মডেল</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                tier: "শিক্ষার্থী",
                price: "বিনামূল্যে",
                features: ["সীমাহীন সক্রেটিক সেশন", "গ্যালাক্সি প্রগতি ট্র্যাকার", "লাইভ মাইন্ড ম্যাপ"],
                highlight: false,
              },
              {
                tier: "শিক্ষক",
                price: "BDT ৫০০/মাস",
                features: ["সম্পূর্ণ ড্যাশবোর্ড", "দুর্বল ধারণা সতর্কতা", "সাপ্তাহিক রিপোর্ট", "ক্লাসরুম ম্যানেজমেন্ট"],
                highlight: true,
              },
              {
                tier: "প্রতিষ্ঠান",
                price: "BDT ৫,০০০/মাস",
                features: ["সীমাহীন শিক্ষক", "সমস্ত শিক্ষার্থীর analytics", "কাস্টম curriculum আপলোড", "বাংলা অভিভাবক রিপোর্ট"],
                highlight: false,
              },
            ].map((p, i) => (
              <motion.div
                key={p.tier}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-6 backdrop-blur-xl bg-white/[0.03] border ${
                  p.highlight ? "border-amber-400/60" : "border-white/10"
                }`}
                style={p.highlight
                  ? { boxShadow: "0 0 0 1px rgba(245,158,11,0.4), 0 20px 50px -20px rgba(245,158,11,0.4)" }
                  : { boxShadow: "0 10px 30px -20px rgba(0,0,0,0.4)" }}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black">
                    জনপ্রিয়
                  </span>
                )}
                <h3 className="font-bangla text-base font-semibold text-white/80">{p.tier}</h3>
                <div className="mt-3 font-bangla text-3xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                  {p.price}
                </div>
                <ul className="mt-5 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 font-bangla text-sm text-white/70">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Global potential timeline */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-12"
        >
          <h2 className="mb-8 text-2xl font-semibold font-bangla">বৈশ্বিক সম্ভাবনা</h2>
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-xl">
            {/* Connecting line */}
            <div className="pointer-events-none absolute left-8 right-8 top-[calc(2rem+1.25rem)] hidden h-px bg-gradient-to-r from-amber-400/0 via-amber-400/60 to-amber-400/0 md:block" />
            <div className="grid gap-6 md:grid-cols-4">
              {[
                { phase: "Phase 1", title: "বাংলাদেশ", note: "NCTB curriculum" },
                { phase: "Phase 2", title: "দক্ষিণ এশিয়া", note: "India, Pakistan, Nepal" },
                { phase: "Phase 3", title: "আফ্রিকা ও মধ্যপ্রাচ্য", note: "স্থানীয় curriculum" },
                { phase: "Phase 4", title: "বৈশ্বিক", note: "যেকোনো জাতীয় curriculum" },
              ].map((step, i) => (
                <motion.div
                  key={step.phase}
                  initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                  className="relative flex flex-col items-center text-center"
                >
                  <div
                    className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/60 bg-[#080B14] font-semibold text-amber-300 tabular-nums"
                    style={{ boxShadow: "0 0 18px rgba(245,158,11,0.45)" }}
                  >
                    {i + 1}
                  </div>
                  <span className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-amber-300/80">{step.phase}</span>
                  <h3 className="mt-1 font-bangla text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 font-bangla text-xs text-white/55">{step.note}</p>
                </motion.div>
              ))}
            </div>
            <p className="mt-8 text-center font-bangla text-xs text-white/50">
              Curriculum-agnostic engine — NCTB সরিয়ে যেকোনো দেশের পাঠ্যক্রম যুক্ত করুন
            </p>
          </div>
        </motion.section>

        {/* Team */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-12"
        >
          <h2 className="mb-6 text-2xl font-semibold">টিম</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {TEAM.map((t, i) => (
              <motion.div
                key={t.role}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-amber-400/30"
                style={{ boxShadow: "0 10px 30px -20px rgba(0,0,0,0.4)" }}
              >
                <div className="text-3xl">{t.emoji}</div>
                <h3 className="mt-3 text-lg font-semibold text-white">{t.role}</h3>
                <p className="mt-1 text-sm text-white/50">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Stack */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-12"
        >
          <h2 className="mb-6 text-2xl font-semibold">প্রযুক্তি স্ট্যাক</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STACK.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-center backdrop-blur"
                style={{ borderColor: `${s.color}30`, boxShadow: `0 0 0 1px ${s.color}10, 0 8px 24px -16px ${s.color}40` }}
              >
                <span className="text-sm font-medium" style={{ color: s.color }}>{s.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Pillars */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-12 grid gap-4 sm:grid-cols-3"
        >
          {[
            { icon: Brain, label: "Cognitive Flow", desc: "Real-time state tracking adapts AI behavior." },
            { icon: Code2, label: "Multi-provider RAG", desc: "Gemini → Groq → OpenRouter failover with NCTB context." },
            { icon: Telescope, label: "Knowledge Galaxy", desc: "Every concept becomes a star in your personal sky." },
          ].map((p) => (
            <div key={p.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p.icon className="h-5 w-5 text-amber-300" />
              <h3 className="mt-3 text-base font-semibold">{p.label}</h3>
              <p className="mt-1 text-xs text-white/50">{p.desc}</p>
            </div>
          ))}
        </motion.section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mt-16 flex flex-col items-center gap-3 text-center"
        >
          <Link
            to="/demo"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-blue-400 px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ boxShadow: "0 10px 40px -10px rgba(245,158,11,0.5)" }}
          >
            ২২ সেকেন্ডের ডেমো দেখো <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="text-xs text-white/40 font-bangla">বোধ হোক।</p>
        </motion.div>
      </main>
    </div>
  );
}
