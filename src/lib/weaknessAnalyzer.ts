// Weakness analyzer — derives a structured "why is this concept weak?" for the
// teacher dashboard, plus a dynamic intervention suggestion based on the cause.
//
// Inputs come from the existing concept_nodes + sessions tables. No DB writes.

import { daysSince, fromDb, type DbConceptRow } from "./masteryEngine";

export type WeaknessReason =
  | "repeated_misconception"
  | "low_quiz_accuracy"
  | "incomplete_explanation"
  | "dependency_weakness"
  | "poor_retention"
  | "newly_introduced";

export type Severity = "low" | "medium" | "high" | "critical";

export type InterventionType =
  | "self_explanation"
  | "spaced_repetition"
  | "prerequisite_review"
  | "formula_practice"
  | "conceptual_analogy"
  | "guided_walkthrough";

export type WeaknessAnalysis = {
  concept: string;
  subject: string | null;
  mastery: number;          // 0..1
  severity: Severity;
  severityScore: number;    // 0..100, higher = worse
  reason: WeaknessReason;
  reasonLabel: string;      // Bangla label
  suggestedAction: string;  // Bangla suggestion sentence
  interventionType: InterventionType;
  prerequisites: string[];
  recentMistakes: string[]; // free-text excerpts from sessions
  misconceptionExamples: string[]; // exact wrong statements from misconceptions table
  trend: "improving" | "declining" | "flat";
  trendDelta: number;       // last - first, in percent
  lastReviewedDays: number;
  dimensions: { exposure: number; understanding: number; application: number; retention: number };
};

const REASON_LABEL_BN: Record<WeaknessReason, string> = {
  repeated_misconception: "বারবার ভুল ধারণা",
  low_quiz_accuracy: "কুইজে কম নির্ভুলতা",
  incomplete_explanation: "অসম্পূর্ণ ব্যাখ্যা",
  dependency_weakness: "পূর্বশর্তে দুর্বলতা",
  poor_retention: "ধরে রাখায় ঘাটতি",
  newly_introduced: "সদ্য পরিচিত",
};

const INTERVENTION_TEMPLATES: Record<InterventionType, string> = {
  self_explanation: "শিক্ষার্থীকে নিজের ভাষায় ধারণাটি ব্যাখ্যা করতে বলো।",
  spaced_repetition: "স্পেসড রিপিটিশন রিভিউ অ্যাসাইন করো (২, ৭, ১৪ দিন)।",
  prerequisite_review: "পুনরায় চেষ্টার আগে পূর্বশর্ত ধারণাগুলো রিভিউ করাও।",
  formula_practice: "ফর্মুলা-ভিত্তিক অনুশীলন অ্যাসাইন করো।",
  conceptual_analogy: "একটি বাস্তব উপমা/অ্যানালজি দিয়ে ধারণাটি ব্যাখ্যা করো।",
  guided_walkthrough: "ধাপে ধাপে গাইডেড ওয়াকথ্রু সেশন নাও।",
};

export type ConceptInput = DbConceptRow & {
  id: string;
  user_id: string;
  concept: string;
  subject: string | null;
  prerequisites?: string[] | null;
};

export type SessionInput = {
  id: string;
  user_id: string;
  topic: string | null;
  subject: string | null;
  mastery_score: number | null;
  cognitive_state: string | null;
  created_at: string;
  messages?: unknown;
};

function severityFromScore(score: number): Severity {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function pickReason(args: {
  node: ReturnType<typeof fromDb>;
  prereqWeak: boolean;
  recentSessions: SessionInput[];
  lastReviewedDays: number;
  misconceptionCount: number;
}): WeaknessReason {
  const { node, prereqWeak, recentSessions, lastReviewedDays, misconceptionCount } = args;
  const dims = node.dims;
  const ev = node.evidence;

  // Repeated misconception: explicit logged misconceptions OR engine counter.
  if (misconceptionCount >= 2 || node.misconceptionCount >= 3) return "repeated_misconception";
  if (prereqWeak) return "dependency_weakness";

  // Quiz / application channel is weak after enough attempts.
  if (ev.quizAccuracy > 0 && ev.quizAccuracy < 0.5 && node.interactionCount >= 3) {
    return "low_quiz_accuracy";
  }
  if (dims.application < 0.35 && dims.understanding > 0.4) {
    return "low_quiz_accuracy";
  }

  // Newly introduced — exposure but almost no understanding evidence.
  if (dims.exposure > 0 && dims.understanding < 0.2 && node.interactionCount <= 1) {
    return "newly_introduced";
  }

  // Retention dimension is weak OR concept stale.
  if (dims.retention < 0.3 && dims.understanding > 0.4) return "poor_retention";
  if (lastReviewedDays >= 7 && dims.retention < 0.5) return "poor_retention";

  // Understanding itself is shaky → incomplete explanation.
  if (dims.understanding < 0.5 || ev.explanationQuality < 0.5) {
    return "incomplete_explanation";
  }

  if (recentSessions.length === 0) return "poor_retention";
  return "incomplete_explanation";
}

function pickIntervention(reason: WeaknessReason): InterventionType {
  switch (reason) {
    case "repeated_misconception": return "conceptual_analogy";
    case "low_quiz_accuracy":      return "formula_practice";
    case "incomplete_explanation": return "self_explanation";
    case "dependency_weakness":    return "prerequisite_review";
    case "poor_retention":         return "spaced_repetition";
    case "newly_introduced":       return "guided_walkthrough";
  }
}

function trendFrom(sessions: SessionInput[]): { trend: WeaknessAnalysis["trend"]; delta: number } {
  if (sessions.length < 2) return { trend: "flat", delta: 0 };
  const sorted = [...sessions].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const first = sorted[0].mastery_score ?? 0;
  const last = sorted[sorted.length - 1].mastery_score ?? 0;
  const delta = Math.round((last - first) * 100);
  if (delta > 4) return { trend: "improving", delta };
  if (delta < -4) return { trend: "declining", delta };
  return { trend: "flat", delta };
}

function recentMistakesFor(concept: string, sessions: SessionInput[]): string[] {
  const out: string[] = [];
  for (const s of sessions) {
    const matchTopic = (s.topic || "").toLowerCase().includes(concept.toLowerCase());
    if (!matchTopic) continue;
    if ((s.mastery_score ?? 1) >= 0.6) continue;
    const label = `${new Date(s.created_at).toLocaleDateString("bn-BD", { day: "numeric", month: "short" })} — ${s.topic || concept} (${Math.round((s.mastery_score ?? 0) * 100)}%)`;
    out.push(label);
    if (out.length >= 4) break;
  }
  return out;
}

export type MisconceptionRecord = {
  user_id: string;
  concept: string;
  statement: string;
  tag: string;
  weakness_type: string;
  resolved: boolean;
  detected_at: string;
};

export function analyzeWeakness(
  conceptRow: ConceptInput,
  allConcepts: ConceptInput[],
  sessions: SessionInput[],
  misconceptions: MisconceptionRecord[] = [],
): WeaknessAnalysis {
  const node = fromDb(conceptRow);
  const lastReviewedDays = Math.round(daysSince(node.lastReviewed));

  const prereqs = (conceptRow.prerequisites || []).filter(Boolean);
  const prereqRows = allConcepts.filter(
    (c) => c.user_id === conceptRow.user_id && prereqs.includes(c.concept),
  );
  const prereqWeak = prereqRows.some((p) => (p.mastery_level ?? 0) < 0.5);

  const studentSessions = sessions
    .filter((s) => s.user_id === conceptRow.user_id)
    .slice(0, 20);
  const conceptSessions = studentSessions.filter((s) =>
    (s.topic || "").toLowerCase().includes(conceptRow.concept.toLowerCase()),
  );

  const conceptMisconceptions = misconceptions.filter(
    (m) => m.user_id === conceptRow.user_id && m.concept === conceptRow.concept && !m.resolved,
  );
  const misconceptionExamples = conceptMisconceptions.slice(0, 4).map((m) => m.statement);

  const reason = pickReason({
    node,
    prereqWeak,
    recentSessions: conceptSessions,
    lastReviewedDays,
    misconceptionCount: conceptMisconceptions.length,
  });
  const interventionType = pickIntervention(reason);

  // Severity: combine mastery gap + dimension-aware penalties + stale time + misconception count.
  const masteryGap = (1 - (conceptRow.mastery_level ?? 0)) * 50;       // 0..50
  const retentionGap = (1 - node.dims.retention) * 15;                  // 0..15
  const miscon = Math.min(20, conceptMisconceptions.length * 7);        // 0..20
  const stale = lastReviewedDays >= 14 ? 15 : lastReviewedDays >= 7 ? 8 : 0;
  const severityScore = Math.min(100, Math.round(masteryGap + retentionGap + miscon + stale));

  const { trend, delta } = trendFrom(conceptSessions);

  return {
    concept: conceptRow.concept,
    subject: conceptRow.subject,
    mastery: conceptRow.mastery_level ?? 0,
    severity: severityFromScore(severityScore),
    severityScore,
    reason,
    reasonLabel: REASON_LABEL_BN[reason],
    suggestedAction: INTERVENTION_TEMPLATES[interventionType],
    interventionType,
    prerequisites: prereqs,
    recentMistakes: recentMistakesFor(conceptRow.concept, studentSessions),
    misconceptionExamples,
    trend,
    trendDelta: delta,
    lastReviewedDays,
    dimensions: node.dims,
  };
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#F97316",
  critical: "#EF4444",
};

export const SEVERITY_LABEL_BN: Record<Severity, string> = {
  low: "কম",
  medium: "মাঝারি",
  high: "উচ্চ",
  critical: "জরুরি",
};

export const INTERVENTION_LABEL_BN: Record<InterventionType, string> = {
  self_explanation: "নিজের ভাষায় ব্যাখ্যা",
  spaced_repetition: "স্পেসড রিপিটিশন",
  prerequisite_review: "পূর্বশর্ত রিভিউ",
  formula_practice: "ফর্মুলা অনুশীলন",
  conceptual_analogy: "ধারণাগত উপমা",
  guided_walkthrough: "গাইডেড ওয়াকথ্রু",
};

export const STATUS_LABEL_BN: Record<string, string> = {
  assigned: "অ্যাসাইনড",
  in_progress: "চলমান",
  completed: "সম্পন্ন",
  retry: "পুনরায় চেষ্টা",
  improved: "উন্নত হয়েছে",
};
