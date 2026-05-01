import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { LeftPanel, type ConceptNode } from "@/components/learn/LeftPanel";
import { MobileLearnDrawers } from "@/components/learn/MobileLearnDrawers";
import { MindMap, type ExtractedConcept } from "@/components/learn/MindMap";
import { CognitivePanel } from "@/components/learn/CognitivePanel";
import { MessageBubble, TypingDots } from "@/components/learn/MessageBubble";
import { ChatInput } from "@/components/learn/ChatInput";
import { TopicInput } from "@/components/learn/TopicInput";
import { ResultCard } from "@/components/learn/ResultCard";
import { NotesPanel } from "@/components/learn/NotesPanel";
import { QuizPanel } from "@/components/learn/QuizPanel";
import { ResourcesPanel } from "@/components/learn/ResourcesPanel";
import { MasteryBurst } from "@/components/learn/MasteryBurst";
import { AttentionWidget, AttentionConsentModal, type AttentionStatus } from "@/components/learn/AttentionWidget";
import { useChatStream, type ChatMsg } from "@/hooks/useChatStream";
import { useCognitiveState, type Signal, type CognitiveState } from "@/hooks/useCognitiveState";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSpeech } from "@/hooks/useSpeech";
import { Volume2, VolumeX, Brain, BookOpen, Activity, Trophy, ExternalLink, ChevronRight, PanelRightClose } from "lucide-react";
import { cacheSession, idbPut, idbGet } from "@/lib/idb";
import { toast } from "sonner";
import {
  applyUpdate, fromDb, toDbPatch, deriveState, type MasteryState, type MasteryNode,
} from "@/lib/masteryEngine";

// Map the engine's progressive state → the legacy 3-band UI confidence used by MindMap/LeftPanel.
const stateToConfidence = (s: MasteryState): ExtractedConcept["confidence"] =>
  s === "mastered" || s === "practiced" ? "strong"
  : s === "developing" || s === "exposed" ? "weak"
  : "gap"; // unknown, fragile

const stateToEmotional = (s: MasteryState) =>
  s === "mastered" ? "gold"
  : s === "fragile" ? "fragile"
  : s === "practiced" ? "gold"
  : s === "developing" || s === "exposed" ? "cold-blue"
  : "fragile";

type LearnSearch = { topic?: string };

export const Route = createFileRoute("/learn")({
  validateSearch: (search: Record<string, unknown>): LearnSearch => ({
    topic: typeof search.topic === "string" ? search.topic : undefined,
  }),
  head: () => ({ meta: [{ title: "Learn — অনুধাবন AI" }] }),
  component: LearnPage,
});

type Phase = "topic" | "teaching" | "socratic" | "result";

const RAG_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-concepts`;
const EVAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socratic-evaluate`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function LearnPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const online = useOnlineStatus();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("topic");
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<(ChatMsg & { image?: string })[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [concepts, setConcepts] = useState<ExtractedConcept[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [showTeachBack, setShowTeachBack] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Attention engine state
  const [attentionEnabled, setAttentionEnabled] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [attentionStatus, setAttentionStatus] = useState<AttentionStatus>("off");
  const attentionOverrideRef = useRef<CognitiveState | null>(null);

  const [rightCollapsed, setRightCollapsed] = useState(false);

  const { send, streaming, provider } = useChatStream();
  const { supported: ttsSupported, speaking, speak, cancel: cancelSpeak, hasBanglaVoice } = useSpeech();
  const [autoSpeak, setAutoSpeak] = useState(false);
  const baseState = useCognitiveState(signals, phase === "socratic" ? "socratic" : "teaching");
  const cognitiveState: CognitiveState = attentionOverrideRef.current ?? baseState;

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

  // Auto-start teaching from ?topic= deep link (e.g. from Galaxy)
  useEffect(() => {
    if (authed && search.topic && phase === "topic") {
      startTeaching(search.topic);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, search.topic]);

  // Attention -> cognitive state override
  useEffect(() => {
    if (!attentionEnabled) { attentionOverrideRef.current = null; return; }
    if (attentionStatus === "no-face") attentionOverrideRef.current = "disengaged";
    else if (attentionStatus === "looking-away") attentionOverrideRef.current = "confused";
    else if (attentionStatus === "focused") attentionOverrideRef.current = "focused";
    else attentionOverrideRef.current = null;
  }, [attentionEnabled, attentionStatus]);

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

  const confidenceToMastery = (c: ExtractedConcept["confidence"]) =>
    c === "strong" ? 1 : c === "weak" ? 0.5 : 0.15;
  const confidenceToEmotional = (c: ExtractedConcept["confidence"]) =>
    c === "strong" ? "gold" : c === "weak" ? "cold-blue" : "fragile";

  const loadConceptsForTopic = async (t: string) => {
    // Always try IDB first so it works offline / faster paint
    const cached = await idbGet<ExtractedConcept[]>("concept_nodes", `topic_${t}`);
    if (cached && Array.isArray(cached) && cached.length) setConcepts(cached);

    if (!userId || !online) return;
    const { data } = await supabase
      .from("concept_nodes")
      .select("concept, mastery_level, confidence, interaction_count, misconception_count, last_reviewed, state")
      .eq("user_id", userId)
      .eq("subject", t);
    if (!data) return;
    const restored: ExtractedConcept[] = data.map((r) => {
      const node = fromDb(r as any);
      return { name: r.concept, confidence: stateToConfidence(node.state) };
    });
    if (restored.length) {
      setConcepts(restored);
      // Refresh local cache for offline use
      await idbPut("concept_nodes", `topic_${t}`, restored);
    }
  };

  // Persist a batch of concept observations through the progressive mastery engine.
  // - kind="discussion": tutor talked about it. Cap at "exposed".
  // - kind="explanation": student-led explanation in Socratic phase. Quality from extractor verdict.
  // Concepts NEVER jump from unknown → mastered: caps + per-update score deltas enforce this.
  const persistConcepts = async (
    topicVal: string,
    items: ExtractedConcept[],
    kind: "discussion" | "explanation" = "discussion",
  ) => {
    if (!topicVal || !items.length) return;
    // Cache locally for full offline mind-map (UI bands use legacy 3-band).
    await idbPut("concept_nodes", `topic_${topicVal}`, items);

    if (!userId || !online) return;

    // Fetch existing rows in one round-trip.
    const names = items.map((c) => c.name);
    const { data: existing } = await supabase
      .from("concept_nodes")
      .select("concept, mastery_level, confidence, interaction_count, misconception_count, last_reviewed, state")
      .eq("user_id", userId)
      .eq("subject", topicVal)
      .in("concept", names);

    const byName = new Map<string, any>();
    (existing ?? []).forEach((r: any) => byName.set(r.concept, r));

    const newlyMasteredNames: string[] = [];
    const upserts = items.map((c) => {
      const prevRow = byName.get(c.name);
      const prevNode: MasteryNode = fromDb(prevRow);
      const update = kind === "discussion"
        ? { type: "discussion" as const }
        : { type: "explanation" as const, quality: c.confidence };
      const next = applyUpdate(prevNode, update);
      if (next.state === "mastered" && prevNode.state !== "mastered") {
        newlyMasteredNames.push(c.name);
      }
      return {
        user_id: userId,
        concept: c.name,
        subject: topicVal,
        ...toDbPatch(next),
      };
    });

    // Celebrations: only when engine actually promoted to mastered.
    if (newlyMasteredNames.length) {
      const queueRaw = localStorage.getItem("galaxy_celebrations");
      const queue: string[] = queueRaw ? JSON.parse(queueRaw) : [];
      newlyMasteredNames.forEach((name) => {
        queue.push(`${topicVal}::${name}`);
        toast.success(`🌟 নতুন তারা! "${name}" আয়ত্তে এসেছে`, {
          description: "তোমার জ্ঞানের মহাবিশ্বে যোগ হলো একটি উজ্জ্বল তারা।",
          duration: 4500,
        });
      });
      localStorage.setItem("galaxy_celebrations", JSON.stringify(queue.slice(-50)));
      window.dispatchEvent(new CustomEvent("mastery-burst", { detail: { count: newlyMasteredNames.length } }));
    }

    await supabase
      .from("concept_nodes")
      .upsert(upserts, { onConflict: "user_id,subject,concept" });

    // Reflect server-side state back into the live UI confidence band.
    setConcepts((prev) => {
      const map = new Map(prev.map((p) => [p.name, p] as const));
      upserts.forEach((u) => {
        const cur = map.get(u.concept);
        const conf = stateToConfidence(u.state as MasteryState);
        map.set(u.concept, cur ? { ...cur, confidence: conf } : { name: u.concept, confidence: conf });
      });
      return Array.from(map.values());
    });
  };

  // Apply quiz outcomes (one row per question) to the concept the question is about.
  // Currently quizzes are topic-scoped; we attribute results to the topic itself
  // plus any currently-tracked concepts as light reinforcement.
  const recordQuizOutcome = async (correctCount: number, total: number) => {
    if (!topic || !userId || !online || total === 0) return;
    // Topic-level bump first (always present as a concept row).
    const { data: existing } = await supabase
      .from("concept_nodes")
      .select("concept, mastery_level, confidence, interaction_count, misconception_count, last_reviewed, state")
      .eq("user_id", userId)
      .eq("subject", topic);
    const byName = new Map<string, any>();
    (existing ?? []).forEach((r: any) => byName.set(r.concept, r));

    const targets = [topic, ...concepts.map((c) => c.name)].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    const upserts = targets.map((name) => {
      let node = fromDb(byName.get(name));
      // Apply each question outcome sequentially: `correctCount` correct, the rest wrong.
      for (let i = 0; i < correctCount; i++) node = applyUpdate(node, { type: "quiz", correct: true });
      for (let i = 0; i < total - correctCount; i++) node = applyUpdate(node, { type: "quiz", correct: false });
      return { user_id: userId, concept: name, subject: topic, ...toDbPatch(node) };
    });
    await supabase
      .from("concept_nodes")
      .upsert(upserts, { onConflict: "user_id,subject,concept" });
  };


  const deleteConcept = async (name: string) => {
    // Optimistic local removal
    setConcepts((prev) => prev.filter((c) => c.name !== name));
    if (!userId || !online || !topic) return;
    await supabase
      .from("concept_nodes")
      .delete()
      .eq("user_id", userId)
      .eq("subject", topic)
      .eq("concept", name);
    // Re-sync with server so the map matches Supabase exactly
    await loadConceptsForTopic(topic);
  };

  const startTeaching = async (t: string) => {
    setTopic(t);
    setPhase("teaching");
    setConcepts([]);
    await loadConceptsForTopic(t);
    const userMsg: ChatMsg = { role: "user", content: `আমাকে "${t}" সম্পর্কে শেখাও।` };
    setMessages([userMsg]);
    setSignals((s) => [...s, { ts: Date.now(), type: "send", length: userMsg.content.length }]);
    streamReply([userMsg], t, "focused", true, "teaching", () => setShowTeachBack(true));
  };

  // mode = "merge" : take the higher confidence (used in teaching to grow the map without ever auto-mastering)
  // mode = "verdict": authoritative — the AI Socratic verdict overwrites confidence (allows promotion to "strong" AND demotion).
  const mergeConcepts = (incoming: ExtractedConcept[], mode: "merge" | "verdict" = "merge") => {
    setConcepts((prev) => {
      const rank = { strong: 3, weak: 2, gap: 1 } as const;
      const map = new Map<string, ExtractedConcept>();
      for (const c of prev) map.set(c.name, c);
      for (const c of incoming) {
        const existing = map.get(c.name);
        if (!existing) { map.set(c.name, c); continue; }
        const nextConfidence =
          mode === "verdict"
            ? c.confidence
            : rank[c.confidence] >= rank[existing.confidence] ? c.confidence : existing.confidence;
        // In verdict mode the AI's fresh reason wins; in merge mode prefer the new one if present, else keep old.
        const nextReason = mode === "verdict" ? (c.reason ?? existing.reason) : (c.reason || existing.reason);
        map.set(c.name, {
          name: c.name,
          confidence: nextConfidence,
          reason: nextReason,
          related: Array.from(new Set([...(existing.related ?? []), ...(c.related ?? [])])),
        });
      }
      return Array.from(map.values());
    });
  };

  // Live mind-map extraction. In teaching mode we grow the map but DOWNGRADE any
  // "strong" verdict from the generic extractor to "weak" — student hasn't proven
  // mastery yet; only the Socratic evaluator can mint a gold star.
  const runExtraction = async (history: ChatMsg[], topicVal: string, mode: Phase) => {
    const transcript = history
      .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
      .join("\n");
    if (!transcript.trim() || !topicVal) return;
    setExtracting(true);
    try {
      const r = await fetch(RAG_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ topic: topicVal, transcript }),
      });
      const j = await r.json();
      if (Array.isArray(j.concepts) && j.concepts.length) {
        const sanitized: ExtractedConcept[] = (j.concepts as ExtractedConcept[]).map((c) =>
          mode === "teaching" && c.confidence === "strong" ? { ...c, confidence: "weak" } : c,
        );
        mergeConcepts(sanitized, "merge");
        // Persist WITHOUT the mastery-burst side-effect for teaching mode (no "strong" present anyway).
        persistConcepts(topicVal, sanitized);
      }
    } catch { /* silent */ }
    finally { setExtracting(false); }
  };

  // Socratic AI mastery verdict — authoritative source for "mastered → galaxy star".
  // Runs only on the student's OWN explanation (user turns), so the tutor's words
  // can never accidentally promote a concept.
  const runSocraticEvaluation = async (studentExplanation: string, topicVal: string) => {
    if (!studentExplanation.trim() || !topicVal || !online) return;
    setExtracting(true);
    try {
      const r = await fetch(EVAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ topic: topicVal, studentExplanation }),
      });
      const j = await r.json();
      if (Array.isArray(j.concepts) && j.concepts.length) {
        const verdicts = j.concepts as ExtractedConcept[];
        mergeConcepts(verdicts, "verdict");
        persistConcepts(topicVal, verdicts);
      }
    } catch { /* silent */ }
    finally { setExtracting(false); }
  };


  const streamReply = (
    history: ChatMsg[], topicVal: string, state: string, useRAG: boolean,
    extractionMode: Phase, onDone?: () => void,
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
      // Grow the live mind-map after every assistant turn (no auto-mastery here).
      const fullHistory: ChatMsg[] = [...history, { role: "assistant", content: acc }];
      runExtraction(fullHistory, topicVal, extractionMode);
      if (autoSpeak && acc.trim()) {
        speak(acc, "bn-BD").then((ok) => {
          if (!ok) toast.error("এই ডিভাইসে বাংলা ভয়েস প্লেব্যাক শুরু হয়নি।");
        });
      }
      onDone?.();
    });
  };

  const playAssistantSpeech = (text: string) => {
    if (speaking) {
      cancelSpeak();
      return;
    }
    speak(text, "bn-BD").then((ok) => {
      if (!ok) toast.error("বাংলা Text-to-Speech এই ব্রাউজারে এখনো প্রস্তুত নয়।");
      else if (!hasBanglaVoice) toast.message("বাংলা ভয়েস না থাকায় কাছাকাছি সিস্টেম ভয়েস ব্যবহার করা হচ্ছে।");
    });
  };

  const onUserSend = (text: string, image?: string) => {
    if (!text.trim() && !image) return;
    const userMsg: ChatMsg & { image?: string } = { role: "user", content: text || "(ছবি)", image };
    const history = [...messages, userMsg];
    setMessages(history);
    setSignals((s) => [...s, { ts: Date.now(), type: "send", length: text.length }]);
    setShowTeachBack(false);

    // Live mind-map: kick off extraction immediately from what the student JUST wrote,
    // before the AI even replies — so the map reacts to user input in real time.
    if (text.trim() && topic) {
      if (phase === "socratic") {
        // Authoritative AI verdict on the student's full explanation so far.
        const studentExplanation = history
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join("\n");
        runSocraticEvaluation(studentExplanation, topic);
      } else {
        runExtraction(history.map(({ image: _i, ...m }) => m), topic, phase);
      }
    }

    streamReply(
      history.map(({ image: _i, ...m }) => m),
      topic,
      cognitiveState,
      true,
      phase,
      () => { if (phase === "teaching") setShowTeachBack(true); },
    );
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
    const masteryScore = concepts.length === 0 ? 0 :
      concepts.filter(c => c.confidence === "strong").length / concepts.length;
    const sessionRecord = {
      topic, subject: null, cognitive_state: cognitiveState,
      mastery_score: masteryScore, messages, concepts,
      created_at: new Date().toISOString(),
    };
    // Always cache locally for offline access
    await cacheSession(sessionRecord);
    await idbPut("concept_nodes", `topic_${topic}`, concepts);
    if (userId && online) {
      await supabase.from("sessions").insert({
        user_id: userId,
        topic, subject: null, cognitive_state: cognitiveState,
        mastery_score: masteryScore,
        messages: messages as any,
      });
      // Final upsert ensures concepts persisted even if extraction calls were dropped
      await persistConcepts(topic, concepts);
    }
  };

  if (authed === null) return <div className="min-h-screen bg-[var(--bg-primary)]" />;
  if (!authed) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
      <Navbar />
      <MasteryBurst />
      <div className="pt-16 h-screen flex">
        <LeftPanel topic={topic} onTopic={startTeaching} nodes={leftNodes} />
        <MobileLearnDrawers topic={topic} onTopic={startTeaching} nodes={leftNodes} concepts={concepts} cognitiveState={cognitiveState} onDeleteConcept={deleteConcept} online={online} />

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
                {ttsSupported && (
                  <button
                    onClick={() => {
                      if (autoSpeak) { cancelSpeak(); setAutoSpeak(false); }
                      else {
                        setAutoSpeak(true);
                        if (!hasBanglaVoice) toast.message("ডিভাইসে বাংলা voice নেই — server-side বাংলা TTS ব্যবহার হবে।");
                      }
                    }}
                    title={autoSpeak ? "অটো-ভয়েস বন্ধ করো" : hasBanglaVoice ? "AI উত্তর বাংলায় শুনতে চালু করো" : "AI উত্তর fallback voice-এ শুনতে চালু করো"}
                    className={`p-1.5 rounded-full border text-xs flex items-center gap-1 transition-all ${
                      autoSpeak
                        ? "bg-[var(--accent-blue)]/15 border-[var(--accent-blue)]/50 text-[var(--accent-cold-blue)]"
                        : "bg-white/[0.04] border-[var(--border)] text-[var(--text-secondary)] hover:border-white/20"
                    }`}
                  >
                    {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline pr-1">{speaking ? "বলছি…" : autoSpeak ? "Voice On" : "Voice Off"}</span>
                  </button>
                )}
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

          {/* Attention engine: icon when off, widget when on */}
          <AttentionWidget
            enabled={attentionEnabled}
            onConsentRequest={() => setShowConsent(true)}
            onDisable={() => setAttentionEnabled(false)}
            onSignal={(s) => setAttentionStatus(s.status)}
          />
          <AttentionConsentModal
            open={showConsent}
            onAccept={() => { setShowConsent(false); setAttentionEnabled(true); }}
            onCancel={() => setShowConsent(false)}
          />

          {phase === "topic" ? (
            <TopicInput
              onPick={startTeaching}
              onDirectChat={() => startTeaching("সরাসরি চ্যাট")}
              onGenerateMap={async (t) => {
                setTopic(t);
                setPhase("teaching");
                setConcepts([]);
                await loadConceptsForTopic(t);
                try {
                  const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-mindmap`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
                    body: JSON.stringify({ topic: t }),
                  });
                  if (!r.ok) throw new Error(String(r.status));
                  const data = await r.json();
                  const incoming: ExtractedConcept[] = [];
                  for (const b of (data.branches ?? [])) {
                    incoming.push({ name: b.name, confidence: "weak", related: (b.children ?? []).map((c: any) => c.name) });
                    for (const c of (b.children ?? [])) {
                      incoming.push({ name: c.name, confidence: "gap", related: [b.name] });
                    }
                  }
                  if (incoming.length) {
                    mergeConcepts(incoming);
                    persistConcepts(t, incoming);
                  }
                  const intro: ChatMsg = { role: "user", content: `"${t}" বিষয়ের mind-map তৈরি করেছি। এবার প্রতিটি ধারণা ধরে ধরে শেখাও।` };
                  setMessages([intro]);
                  streamReply([intro], t, "exploring", true, "teaching", () => setShowTeachBack(true));
                } catch {
                  toast.error("Mind-map তৈরি ব্যর্থ — সরাসরি শেখা শুরু করছি।");
                  startTeaching(t);
                }
              }}
            />
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-3xl mx-auto">
                  {messages.map((m, i) => (
                    <MessageBubble
                      key={i}
                      msg={m}
                      streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
                      canSpeak={ttsSupported}
                      speaking={speaking}
                      onSpeak={playAssistantSpeech}
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
                          disabled={!online}
                          title={!online ? "সংযোগ ফিরলে Socratic মোড চালু হবে" : undefined}
                          className="px-6 py-3 rounded-full bg-[var(--accent-purple)]/15 border border-[var(--accent-purple)]/50 text-[var(--accent-purple)] font-bangla hover:bg-[var(--accent-purple)]/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}
                        >
                          {online ? "এখন তুমি আমাকে বোঝাও →" : "🔌 সংযোগ ফিরলে Socratic মোড চালু হবে"}
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
                voiceDisabled={!online}
                voiceDisabledMessage="ভয়েস ইনপুটের জন্য সংযোগ প্রয়োজন"
              />
            </>
          )}
        </main>

        {/* RIGHT */}
        {rightCollapsed ? (
          <button
            onClick={() => setRightCollapsed(false)}
            title="প্যানেল খোলো"
            className="hidden xl:flex flex-col items-center gap-2 w-10 shrink-0 border-l border-[var(--border)] bg-[var(--bg-secondary)]/40 hover:bg-white/[0.04] py-3 text-white/60 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <Brain className="w-4 h-4" />
            <BookOpen className="w-4 h-4" />
            <Trophy className="w-4 h-4" />
            <ExternalLink className="w-4 h-4" />
          </button>
        ) : (
          <aside className="hidden xl:flex flex-col w-[380px] shrink-0 border-l border-[var(--border)] bg-[var(--bg-secondary)]/40 backdrop-blur-xl">
            <RightTabs
              onClose={() => setRightCollapsed(true)}
              tabs={[
                {
                  id: "map",
                  label: "Mind Map",
                  icon: <Brain className="w-3.5 h-3.5" />,
                  content: (
                    <div className="h-full relative">
                      <div className="absolute top-2 right-2 z-10 text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] flex items-center gap-1.5">
                        {extracting && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-purple)] opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent-purple)]" />
                          </span>
                        )}
                        {extracting ? "Extracting…" : "Live Mind Map"}
                      </div>
                      <MindMap concepts={concepts} extracting={extracting} onDelete={deleteConcept} />
                    </div>
                  ),
                },
                {
                  id: "notes",
                  label: "Notes",
                  icon: <BookOpen className="w-3.5 h-3.5" />,
                  content: <NotesPanel topic={topic} online={online} />,
                },
                {
                  id: "quiz",
                  label: "Quiz",
                  icon: <Trophy className="w-3.5 h-3.5" />,
                  content: <QuizPanel topic={topic} online={online} />,
                },
                {
                  id: "res",
                  label: "Resources",
                  icon: <ExternalLink className="w-3.5 h-3.5" />,
                  content: <ResourcesPanel topic={topic} online={online} />,
                },
                {
                  id: "state",
                  label: "State",
                  icon: <Activity className="w-3.5 h-3.5" />,
                  content: <CognitivePanel state={cognitiveState} />,
                },
              ]}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

type Tab = { id: string; label: string; icon: React.ReactNode; content: React.ReactNode };

function RightTabs({ tabs, onClose }: { tabs: Tab[]; onClose?: () => void }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <>
      <div className="flex shrink-0 border-b border-[var(--border)] bg-black/30 backdrop-blur">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors border-b-2 ${
              active === t.id
                ? "border-amber-400 text-amber-300 bg-amber-400/[0.04]"
                : "border-transparent text-[var(--text-secondary)] hover:text-white/80 hover:bg-white/[0.03]"
            }`}
          >
            {t.icon}
            <span className="hidden 2xl:inline">{t.label}</span>
          </button>
        ))}
        {onClose && (
          <button
            onClick={onClose}
            title="প্যানেল লুকাও"
            className="shrink-0 px-3 border-b-2 border-transparent text-white/50 hover:text-white hover:bg-white/[0.05] transition"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 relative">
        {tabs.map((t) => (
          <div
            key={t.id}
            className="absolute inset-0"
            style={{ display: active === t.id ? "block" : "none" }}
          >
            {t.content}
          </div>
        ))}
      </div>
    </>
  );
}
