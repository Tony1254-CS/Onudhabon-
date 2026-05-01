// Progressive mastery engine — single source of truth for concept state transitions.
//
// Mastery score is stored as 0..1 in the DB (`concept_nodes.mastery_level`). All
// public APIs in this file work in 0..100 for clarity; helpers convert at the edges.

export type MasteryState =
  | "unknown"
  | "exposed"
  | "developing"
  | "practiced"
  | "mastered"
  | "fragile";

export type MasteryNode = {
  score: number;            // 0..100
  confidence: number;       // 0..1
  interactionCount: number;
  misconceptionCount: number;
  lastReviewed: string | null; // ISO
  state: MasteryState;
};

// ----- Score → state band ---------------------------------------------------
// 0–20 unknown · 21–40 exposed · 41–60 developing · 61–80 practiced · 81–100 mastered
// "fragile" is a separate signal: confidence is low OR the concept has decayed
// after being mastered.

export function bandForScore(score: number): Exclude<MasteryState, "fragile"> {
  const s = Math.max(0, Math.min(100, score));
  if (s <= 20) return "unknown";
  if (s <= 40) return "exposed";
  if (s <= 60) return "developing";
  if (s <= 80) return "practiced";
  return "mastered";
}

export function deriveState(node: Pick<MasteryNode, "score" | "confidence" | "misconceptionCount">): MasteryState {
  const band = bandForScore(node.score);
  // Fragile: previously climbed but confidence dropped or misconceptions piled up.
  if (band === "mastered" && node.confidence < 0.55) return "fragile";
  if (band === "practiced" && node.misconceptionCount >= 3 && node.confidence < 0.5) return "fragile";
  return band;
}

// Caps prevent jumping straight from unknown → mastered.
const CAPS: Record<"discussion" | "explanation" | "quiz", number> = {
  discussion: 35,    // discussion alone can never exceed "exposed"
  explanation: 75,   // student-led explanation can reach late "practiced"
  quiz: 100,         // only quizzes (or sustained explanations) can reach mastered
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

// ----- Update kinds ---------------------------------------------------------

export type UpdateKind =
  | { type: "discussion" }                                // tutor talked about it
  | { type: "explanation"; quality: "strong" | "weak" | "gap" } // student explained
  | { type: "quiz"; correct: boolean }                    // quiz answer
  | { type: "decay"; daysSince: number };                 // time elapsed sweep

export function applyUpdate(prev: MasteryNode, update: UpdateKind, now = new Date()): MasteryNode {
  let { score, confidence, interactionCount, misconceptionCount } = prev;
  let touched = false;

  switch (update.type) {
    case "discussion": {
      // Exposure only — small bump, capped at 35.
      if (score < CAPS.discussion) {
        score = clamp(score + 6, 0, CAPS.discussion);
      }
      confidence = clamp(confidence + 0.02, 0, 1);
      interactionCount += 1;
      touched = true;
      break;
    }
    case "explanation": {
      interactionCount += 1;
      touched = true;
      if (update.quality === "strong") {
        score = clamp(score + 10, 0, CAPS.explanation);
        confidence = clamp(confidence + 0.12, 0, 1);
      } else if (update.quality === "weak") {
        score = clamp(score + 4, 0, CAPS.explanation);
        confidence = clamp(confidence + 0.04, 0, 1);
      } else {
        // gap — student showed a hole
        score = clamp(score - 5);
        confidence = clamp(confidence - 0.08, 0, 1);
        misconceptionCount += 1;
      }
      break;
    }
    case "quiz": {
      interactionCount += 1;
      touched = true;
      if (update.correct) {
        // Bigger jump if already developing+, smaller from cold start.
        const gain = score >= 40 ? 10 : 7;
        score = clamp(score + gain);
        confidence = clamp(confidence + 0.15, 0, 1);
      } else {
        score = clamp(score - 8);
        confidence = clamp(confidence - 0.18, 0, 1);
        misconceptionCount += 1;
      }
      break;
    }
    case "decay": {
      // Lose ~2 points per inactive week, faster when low confidence.
      const weeks = update.daysSince / 7;
      const rate = 2 + (1 - confidence) * 2; // 2..4 pts/week
      score = clamp(score - weeks * rate);
      confidence = clamp(confidence - weeks * 0.05, 0, 1);
      // Decay does not bump interaction count or change lastReviewed.
      break;
    }
  }

  const nextState = deriveState({ score, confidence, misconceptionCount });
  return {
    score,
    confidence,
    interactionCount,
    misconceptionCount,
    lastReviewed: touched ? now.toISOString() : prev.lastReviewed,
    state: nextState,
  };
}

// ----- DB <-> engine adapters ----------------------------------------------

export type DbConceptRow = {
  mastery_level: number | null;       // 0..1
  confidence?: number | null;         // 0..1
  interaction_count?: number | null;
  misconception_count?: number | null;
  last_reviewed?: string | null;
  state?: MasteryState | null;
};

export function fromDb(row: DbConceptRow | null | undefined): MasteryNode {
  const score = clamp((row?.mastery_level ?? 0) * 100);
  const confidence = Math.max(0, Math.min(1, row?.confidence ?? 0));
  const node: MasteryNode = {
    score,
    confidence,
    interactionCount: row?.interaction_count ?? 0,
    misconceptionCount: row?.misconception_count ?? 0,
    lastReviewed: row?.last_reviewed ?? null,
    state: (row?.state as MasteryState) || deriveState({ score, confidence, misconceptionCount: row?.misconception_count ?? 0 }),
  };
  return node;
}

export function toDbPatch(node: MasteryNode) {
  return {
    mastery_level: +(node.score / 100).toFixed(4),
    confidence: +node.confidence.toFixed(4),
    interaction_count: node.interactionCount,
    misconception_count: node.misconceptionCount,
    last_reviewed: node.lastReviewed,
    state: node.state,
    emotional_tag:
      node.state === "mastered" ? "gold"
      : node.state === "fragile" ? "fragile"
      : node.state === "practiced" ? "gold"
      : node.state === "developing" ? "cold-blue"
      : node.state === "exposed" ? "cold-blue"
      : "fragile",
  };
}

export function emptyNode(): MasteryNode {
  return {
    score: 0,
    confidence: 0,
    interactionCount: 0,
    misconceptionCount: 0,
    lastReviewed: null,
    state: "unknown",
  };
}

// UI helpers
export const STATE_LABEL_BN: Record<MasteryState, string> = {
  unknown: "অজানা",
  exposed: "পরিচিত",
  developing: "গড়ে উঠছে",
  practiced: "অনুশীলিত",
  mastered: "আয়ত্তে",
  fragile: "ভঙ্গুর",
};

export const STATE_COLOR: Record<MasteryState, string> = {
  unknown: "#64748B",     // slate
  exposed: "#60A5FA",     // blue
  developing: "#22D3EE",  // cyan
  practiced: "#A78BFA",   // violet
  mastered: "#F59E0B",    // gold
  fragile: "#EF4444",     // red
};

export function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (Date.now() - t) / (1000 * 60 * 60 * 24));
}
