import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { LeftPanel, type ConceptNode } from "@/components/learn/LeftPanel";
import { MindMap, type ExtractedConcept } from "@/components/learn/MindMap";
import { CognitivePanel } from "@/components/learn/CognitivePanel";
import { MessageBubble, TypingDots } from "@/components/learn/MessageBubble";
import { ChatInput } from "@/components/learn/ChatInput";
import { TopicInput } from "@/components/learn/TopicInput";
import { ResultCard } from "@/components/learn/ResultCard";
import { useChatStream, type ChatMsg } from "@/hooks/useChatStream";
import { useCognitiveState, type Signal } from "@/hooks/useCognitiveState";

export const Route = createFileRoute("/learn")({
  head: () => ({ meta: [{ title: "Learn — অনুধাবন AI" }] }),
  component: LearnPage,
});

type Phase = "topic" | "teaching" | "socratic" | "result";

const RAG_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-concepts`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function LearnPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("topic");
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<(ChatMsg & { image?: string })[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [concepts, setConcepts] = useState<ExtractedConcept[]>([]);
  const [showTeachBack, setShowTeachBack] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { send, streaming, provider } = useChatStream();
  const cognitiveState = useCognitiveState(signals, phase === "socratic" ? "socratic" : "teaching");

  // auth gate
  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setAuthed(!!s); setUserId(s?.user.id ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setAuthed(!!session); setUserId(session?.user.id ?? null);
      if (!session) navigate({ to: "/login" });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  // autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // Derive left-panel concept nodes from extracted concepts
  const leftNodes: ConceptNode[] = useMemo(() => concepts.map((c, i) => ({
    id: `${i}-${c.name}`,
    name: c.name,
    mastery: c.confidence === "strong" ? 1 : c.confidence === "weak" ? 0.5 : 0.15,
    emotional: c.confidence === "strong" ? "gold" : c.confidence === "weak" ? "cold-blue" : "fragile",
  })), [concepts]);

  const startTeaching = (t: string) => {
    setTopic(t);
    setPhase("teaching");
    const userMsg: ChatMsg = { role: "user", content: `আমাকে "${t}" সম্পর্কে শেখাও।` };
    setMessages([userMsg]);
    setSignals((s) => [...s, { ts: Date.now(), type: "send", length: userMsg.content.length }]);
    streamReply([userMsg], t, "focused", true, () => setShowTeachBack(true));
  };

  const streamReply = (
    history: ChatMsg[], topicVal: string, state: string, useRAG: boolean, onDone?: () => void
  ) => {
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    let acc = "";
    send(history, { topic: topicVal, cognitiveState: state, useRAG }, (delta) => {
      acc += delta;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") next[next.length - 1] = { ...last, content: acc };
        return next;
      });
    }).then(() => {
      setSignals((s) => [...s, { ts: Date.now(), type: "receive", length: acc.length }]);
      onDone?.();
    });
  };

  const onUserSend = (text: string, image?: string) => {
    if (!text.trim() && !image) return;
    const userMsg: ChatMsg & { image?: string } = { role: "user", content: text || "(ছবি)", image };
    const history = [...messages, userMsg];
    setMessages(history);
    setSignals((s) => [...s, { ts: Date.now(), type: "send", length: text.length }]);
    setShowTeachBack(false);

    const isSocratic = phase === "socratic";
    streamReply(
      history.map(({ image: _i, ...m }) => m),
      topic,
      cognitiveState,
      true,
      () => { if (phase === "teaching") setShowTeachBack(true); },
    );

    if (isSocratic) {
      // Extract concepts from the cumulative student transcript
      const transcript = history.filter(m => m.role === "user").map(m => m.content).join("\n");
      fetch(RAG_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ topic, transcript }),
      }).then(r => r.json()).then((j) => {
        if (Array.isArray(j.concepts)) setConcepts(j.concepts);
      }).catch(() => { /* silent */ });
    }
  };

  const enterSocratic = () => {
    setPhase("socratic");
    setShowTeachBack(false);
    const promptMsg: ChatMsg = {
      role: "assistant",
      content: "ঠিক আছে। এখন তুমি আমাকে বোঝাও — যেন আমি কিছুই জানি না। প্রথম থেকে শুরু করো, ধাপে ধাপে।",
    };
    setMessages((prev) => [...prev, promptMsg]);
  };

  const finish = async () => {
    setPhase("result");
    // Persist session
    if (userId) {
      const masteryScore = concepts.length === 0 ? 0 :
        concepts.filter(c => c.confidence === "strong").length / concepts.length;
      await supabase.from("sessions").insert({
        user_id: userId,
        topic, subject: null, cognitive_state: cognitiveState,
        mastery_score: masteryScore,
        messages: messages as any,
      });
      // Persist concept nodes
      for (const c of concepts) {
        await supabase.from("concept_nodes").insert({
          user_id: userId,
          concept: c.name,
          subject: topic,
          mastery_level: c.confidence === "strong" ? 1 : c.confidence === "weak" ? 0.5 : 0.15,
          emotional_tag: c.confidence === "strong" ? "gold" : c.confidence === "weak" ? "cold-blue" : "fragile",
          last_reviewed: new Date().toISOString(),
        });
      }
    }
  };

  if (authed === null) return <div className="min-h-screen bg-[var(--bg-primary)]" />;
  if (!authed) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
      <Navbar />
      <div className="pt-16 h-screen flex">
        <LeftPanel topic={topic} onTopic={startTeaching} nodes={leftNodes} />

        {/* CENTER */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          <AnimatePresence>
            {phase === "socratic" && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none rounded-none"
                style={{ boxShadow: "inset 0 0 60px rgba(139,92,246,0.15)" }}
              />
            )}
          </AnimatePresence>

          {/* Header */}
          {phase !== "topic" && (
            <div className="shrink-0 px-6 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-secondary)]/40 backdrop-blur-xl">
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                <h2 className="font-bangla text-sm truncate">{topic}</h2>
              </div>
              <div className="flex items-center gap-2">
                {provider && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-[var(--border)] text-[var(--text-secondary)]">
                    {provider}
                  </span>
                )}
                {phase === "socratic" && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--accent-purple)]/15 border border-[var(--accent-purple)]/40 text-[var(--accent-purple)] flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> Socratic Mode
                  </span>
                )}
              </div>
            </div>
          )}

          {phase === "topic" ? (
            <TopicInput onPick={startTeaching} />
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-3xl mx-auto">
                  {messages.map((m, i) => (
                    <MessageBubble
                      key={i}
                      msg={m}
                      streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
                    />
                  ))}
                  {streaming && messages[messages.length - 1]?.role !== "assistant" && <TypingDots />}

                  <AnimatePresence>
                    {showTeachBack && phase === "teaching" && !streaming && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-center my-6"
                      >
                        <button
                          onClick={enterSocratic}
                          className="px-6 py-3 rounded-full bg-[var(--accent-purple)]/15 border border-[var(--accent-purple)]/50 text-[var(--accent-purple)] font-bangla hover:bg-[var(--accent-purple)]/25 transition-all"
                          style={{ boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}
                        >
                          এখন তুমি আমাকে বোঝাও →
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {phase === "socratic" && messages.filter(m => m.role === "user").length >= 2 && !streaming && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex justify-center my-4"
                    >
                      <button
                        onClick={finish}
                        className="px-5 py-2 rounded-full text-sm bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/40 text-[var(--accent-gold)] font-bangla hover:bg-[var(--accent-gold)]/25 transition-all"
                      >
                        সেশন শেষ করো
                      </button>
                    </motion.div>
                  )}

                  {phase === "result" && (
                    <ResultCard concepts={concepts} onContinue={() => navigate({ to: "/" })} />
                  )}
                </div>
              </div>
              <ChatInput
                onSend={onUserSend}
                disabled={streaming || phase === "result"}
                placeholder={phase === "socratic" ? "তোমার ব্যাখ্যা লেখো বা বলো…" : "আরো প্রশ্ন করো…"}
              />
            </>
          )}
        </main>

        {/* RIGHT */}
        <aside className="hidden xl:flex flex-col w-[320px] shrink-0 border-l border-[var(--border)] bg-[var(--bg-secondary)]/40 backdrop-blur-xl">
          <div className="h-[60%] border-b border-[var(--border)] relative">
            <div className="absolute top-2 right-2 z-10 text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Live Mind Map
            </div>
            <MindMap concepts={concepts} />
          </div>
          <div className="h-[40%]">
            <CognitivePanel state={cognitiveState} />
          </div>
        </aside>
      </div>
    </div>
  );
}
