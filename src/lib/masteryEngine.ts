// Multi-dimensional Socratic mastery engine.
//
// Mastery is NOT a single number bumped per interaction. It is a weighted
// composite of four learning dimensions, each fed by separate evidence streams:
//
//   exposure       — has the concept been seen / discussed?
//   understanding  — can the student explain it correctly without misconceptions?
//   application    — can the student answer challenge / probing / transfer questions?
//   retention      — does it survive delayed recall checks?
//
// Composite mastery (0..100) = 0.10*exposure + 0.30*understanding +
//                              0.25*application + 0.35*retention
//
// One good explanation cannot push mastery near 100. The understanding band
// alone is capped at ~70, application requires challenge-question evidence,
// and retention only grows from delayed recall checks. So the path to
// "mastered" requires multi-step, multi-day evidence.
//
// Concept rows in the DB store both the dimensions (0..1 floats) and a
// composite `mastery_level` (0..1) derived from them, plus rolling evidence:
// explanation_quality, challenge_score, quiz_accuracy, retention_score,
// hint_dependency, misconception_count, retention_history.

export type MasteryState =
  | "unknown"
  | "exposed"
  | "developing"
  | "practiced"
  | "mastered"
  | "fragile";

export type Dimensions = {
  exposure: number;       // 0..1
  understanding: number;  // 0..1
  application: number;    // 0..1
  retention: number;      // 0..1
};

export type EvidenceScores = {
  explanationQuality: number; // EMA, 0..1
  challengeScore: number;     // EMA, 0..1
  quizAccuracy: number;       // EMA, 0..1
  retentionScore: number;     // EMA, 0..1
  hintDependency: number;     // EMA, 0..1 (higher = more hints needed)
};

export type MasteryNode = {
  // Composite + state
  score: number;              // 0..100 (composite)
  state: MasteryState;
  confidence: number;         // 0..1, derived from evidence consistency
  // Dimensions
  dims: Dimensions;
  // Rolling evidence
  evidence: EvidenceScores;
  // Counters & timestamps
  interactionCount: number;
  misconceptionCount: number;
  lastReviewed: string | null;
  lastRetentionCheck: string | null;
  retentionHistory: { at: string; score: number }[];
};

// Dimension weights for composite mastery.
const W = { exposure: 0.10, understanding: 0.30, application: 0.25, retention: 0.35 };

// Per-dimension caps so a single channel cannot drive composite to 100.
// Understanding tops out at 0.70 — to exceed that you need application + retention.
const DIM_CAP = { exposure: 1.0, understanding: 0.70, application: 0.85, retention: 1.0 };

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// ----- Update kinds ---------------------------------------------------------

export type UpdateKind =
  | { type: "discussion" }
  | { type: "explanation"; quality: "strong" | "weak" | "gap"; usedHint?: boolean }
  | { type: "challenge"; correct: boolean; usedHint?: boolean }   // probing/follow-up question
  | { type: "quiz"; correct: boolean }
  | { type: "retention"; correct: boolean; daysSinceLearned: number } // delayed recall check
  | { type: "decay"; daysSince: number };

// EMA helpers — small alpha so single events don't dominate.
function ema(prev: number, sample: number, alpha: number) {
  return clamp01(prev * (1 - alpha) + sample * alpha);
}

export function applyUpdate(prev: MasteryNode, update: UpdateKind, now = new Date()): MasteryNode {
  const dims = { ...prev.dims };
  const ev = { ...prev.evidence };
  let interactionCount = prev.interactionCount;
  let misconceptionCount = prev.misconceptionCount;
  let lastReviewed = prev.lastReviewed;
  let lastRetentionCheck = prev.lastRetentionCheck;
  let retentionHistory = prev.retentionHistory;
  let touched = false;

  switch (update.type) {
    case "discussion": {
      // Discussion only feeds the exposure dimension. Cannot move understanding,
      // application, or retention at all.
      dims.exposure = clamp01(dims.exposure + 0.18);
      interactionCount += 1;
      touched = true;
      break;
    }

    case "explanation": {
      interactionCount += 1;
      touched = true;
      const sample = update.quality === "strong" ? 0.85
                   : update.quality === "weak"   ? 0.45
                   : 0.10; // gap
      ev.explanationQuality = ema(ev.explanationQuality, sample, 0.25);
      // Understanding rises slowly toward its cap — strong explanation alone
      // cannot push it past 0.70, and even getting there takes multiple
      // consecutive strong explanations because of the EMA + capped delta.
      const target = Math.min(DIM_CAP.understanding, ev.explanationQuality);
      dims.understanding = clamp01(dims.understanding + (target - dims.understanding) * 0.35);
      // Exposure also rises a touch — explaining means having seen it.
      dims.exposure = clamp01(Math.max(dims.exposure, 0.5));

      if (update.quality === "gap") {
        misconceptionCount += 1;
        // Gaps drag understanding down a bit beyond just the EMA pull.
        dims.understanding = clamp01(dims.understanding - 0.05);
      }
      if (update.usedHint) {
        ev.hintDependency = ema(ev.hintDependency, 1, 0.2);
      } else {
        ev.hintDependency = ema(ev.hintDependency, 0, 0.1);
      }
      break;
    }

    case "challenge": {
      // Probing / follow-up / application questions feed the application dim.
      interactionCount += 1;
      touched = true;
      const sample = update.correct ? (update.usedHint ? 0.6 : 1.0) : 0.0;
      ev.challengeScore = ema(ev.challengeScore, sample, 0.3);
      const target = Math.min(DIM_CAP.application, ev.challengeScore);
      dims.application = clamp01(dims.application + (target - dims.application) * 0.4);
      if (!update.correct) {
        misconceptionCount += 1;
        dims.application = clamp01(dims.application - 0.04);
      }
      ev.hintDependency = ema(ev.hintDependency, update.usedHint ? 1 : 0, 0.15);
      break;
    }

    case "quiz": {
      interactionCount += 1;
      touched = true;
      ev.quizAccuracy = ema(ev.quizAccuracy, update.correct ? 1 : 0, 0.25);
      // Quizzes feed application primarily, understanding secondarily.
      const targetApp = Math.min(DIM_CAP.application, ev.quizAccuracy);
      dims.application = clamp01(dims.application + (targetApp - dims.application) * 0.3);
      dims.understanding = clamp01(dims.understanding + (update.correct ? 0.04 : -0.06));
      if (!update.correct) misconceptionCount += 1;
      break;
    }

    case "retention": {
      // Delayed recall — the only path that builds the retention dimension.
      // Weight grows with days since learned (bigger gap, stronger evidence).
      interactionCount += 1;
      touched = true;
      lastRetentionCheck = now.toISOString();
      const days = Math.max(0, update.daysSinceLearned);
      const reliability = Math.min(1, 0.4 + days / 30); // 0.4 at 0d → 1.0 at 18d+
      const sample = update.correct ? reliability : 0;
      ev.retentionScore = ema(ev.retentionScore, sample, 0.35);
      const target = ev.retentionScore;
      dims.retention = clamp01(dims.retention + (target - dims.retention) * 0.5);
      retentionHistory = [...prev.retentionHistory, { at: lastRetentionCheck, score: sample }].slice(-20);
      if (!update.correct) {
        // Failed delayed recall pulls understanding down too — they may have
        // memorized but not understood.
        dims.understanding = clamp01(dims.understanding - 0.08);
        misconceptionCount += 1;
      }
      break;
    }

    case "decay": {
      // Time decay hits retention hardest, then understanding, then application.
      // Exposure does not decay (you saw it; that's a fact).
      const weeks = update.daysSince / 7;
      const conf = compositeConfidence(ev);
      const k = 1 + (1 - conf); // 1..2× when low confidence
      dims.retention     = clamp01(dims.retention     - weeks * 0.05 * k);
      dims.understanding = clamp01(dims.understanding - weeks * 0.025 * k);
      dims.application   = clamp01(dims.application   - weeks * 0.02  * k);
      // Decay does NOT bump interaction count or change lastReviewed.
      break;
    }
  }

  const score = compositeScore(dims);
  const confidence = compositeConfidence(ev);
  const state = deriveState({ score, confidence, misconceptionCount, dims });

  return {
    score,
    state,
    confidence,
    dims,
    evidence: ev,
    interactionCount,
    misconceptionCount,
    lastReviewed: touched ? now.toISOString() : lastReviewed,
    lastRetentionCheck,
    retentionHistory,
  };
}

// ----- Derivations ----------------------------------------------------------

export function compositeScore(d: Dimensions): number {
  const raw = d.exposure * W.exposure
            + d.understanding * W.understanding
            + d.application * W.application
            + d.retention * W.retention;
  return clamp(Math.round(raw * 100));
}

// Confidence reflects evidence consistency. Many corroborating channels +
// low hint dependency = high confidence.
export function compositeConfidence(ev: EvidenceScores): number {
  const channels = [ev.explanationQuality, ev.challengeScore, ev.quizAccuracy, ev.retentionScore];
  const active = channels.filter((c) => c > 0.05);
  if (active.length === 0) return 0;
  const mean = active.reduce((a, b) => a + b, 0) / active.length;
  // Penalize if very few channels have evidence.
  const breadth = Math.min(1, active.length / 3);
  const hintPenalty = ev.hintDependency * 0.25;
  return clamp01(mean * breadth - hintPenalty);
}

export function bandForScore(score: number): Exclude<MasteryState, "fragile"> {
  const s = clamp(score);
  if (s <= 20) return "unknown";
  if (s <= 40) return "exposed";
  if (s <= 60) return "developing";
  if (s <= 80) return "practiced";
  return "mastered";
}

export function deriveState(args: {
  score: number;
  confidence: number;
  misconceptionCount: number;
  dims: Dimensions;
}): MasteryState {
  const band = bandForScore(args.score);
  // Mastered REQUIRES retention evidence — composite alone isn't enough.
  if (band === "mastered" && args.dims.retention < 0.55) return "practiced";
  if (band === "mastered" && args.confidence < 0.55) return "fragile";
  if (band === "practiced" && args.misconceptionCount >= 3 && args.confidence < 0.5) return "fragile";
  if (band === "practiced" && args.dims.retention < 0.3) return "fragile";
  return band;
}

// ----- DB <-> engine adapters ----------------------------------------------

export type DbConceptRow = {
  mastery_level?: number | null;
  confidence?: number | null;
  interaction_count?: number | null;
  misconception_count?: number | null;
  last_reviewed?: string | null;
  state?: MasteryState | null;
  // dimensions
  exposure?: number | null;
  understanding?: number | null;
  application?: number | null;
  retention?: number | null;
  // evidence
  explanation_quality?: number | null;
  challenge_score?: number | null;
  quiz_accuracy?: number | null;
  retention_score?: number | null;
  hint_dependency?: number | null;
  last_retention_check?: string | null;
  retention_history?: { at: string; score: number }[] | null;
};

export function fromDb(row: DbConceptRow | null | undefined): MasteryNode {
  const dims: Dimensions = {
    exposure: clamp01(row?.exposure ?? 0),
    understanding: clamp01(row?.understanding ?? 0),
    application: clamp01(row?.application ?? 0),
    retention: clamp01(row?.retention ?? 0),
  };
  const evidence: EvidenceScores = {
    explanationQuality: clamp01(row?.explanation_quality ?? 0),
    challengeScore: clamp01(row?.challenge_score ?? 0),
    quizAccuracy: clamp01(row?.quiz_accuracy ?? 0),
    retentionScore: clamp01(row?.retention_score ?? 0),
    hintDependency: clamp01(row?.hint_dependency ?? 0),
  };
  const score = compositeScore(dims);
  const confidence = row?.confidence != null ? clamp01(row.confidence) : compositeConfidence(evidence);
  const misconceptionCount = row?.misconception_count ?? 0;
  return {
    score,
    state: (row?.state as MasteryState) || deriveState({ score, confidence, misconceptionCount, dims }),
    confidence,
    dims,
    evidence,
    interactionCount: row?.interaction_count ?? 0,
    misconceptionCount,
    lastReviewed: row?.last_reviewed ?? null,
    lastRetentionCheck: row?.last_retention_check ?? null,
    retentionHistory: row?.retention_history ?? [],
  };
}

export function toDbPatch(node: MasteryNode) {
  return {
    mastery_level: +(node.score / 100).toFixed(4),
    confidence: +node.confidence.toFixed(4),
    state: node.state,
    interaction_count: node.interactionCount,
    misconception_count: node.misconceptionCount,
    last_reviewed: node.lastReviewed,
    // dims
    exposure: +node.dims.exposure.toFixed(4),
    understanding: +node.dims.understanding.toFixed(4),
    application: +node.dims.application.toFixed(4),
    retention: +node.dims.retention.toFixed(4),
    // evidence
    explanation_quality: +node.evidence.explanationQuality.toFixed(4),
    challenge_score: +node.evidence.challengeScore.toFixed(4),
    quiz_accuracy: +node.evidence.quizAccuracy.toFixed(4),
    retention_score: +node.evidence.retentionScore.toFixed(4),
    hint_dependency: +node.evidence.hintDependency.toFixed(4),
    last_retention_check: node.lastRetentionCheck,
    retention_history: node.retentionHistory,
    emotional_tag:
      node.state === "mastered" ? "gold"
      : node.state === "fragile" ? "fragile"
      : node.state === "practiced" ? "gold"
      : node.state === "developing" || node.state === "exposed" ? "cold-blue"
      : "fragile",
  };
}

export function emptyNode(): MasteryNode {
  return {
    score: 0,
    state: "unknown",
    confidence: 0,
    dims: { exposure: 0, understanding: 0, application: 0, retention: 0 },
    evidence: { explanationQuality: 0, challengeScore: 0, quizAccuracy: 0, retentionScore: 0, hintDependency: 0 },
    interactionCount: 0,
    misconceptionCount: 0,
    lastReviewed: null,
    lastRetentionCheck: null,
    retentionHistory: [],
  };
}

// ----- UI helpers -----------------------------------------------------------

export const STATE_LABEL_BN: Record<MasteryState, string> = {
  unknown: "অজানা",
  exposed: "পরিচিত",
  developing: "গড়ে উঠছে",
  practiced: "অনুশীলিত",
  mastered: "আয়ত্তে",
  fragile: "ভঙ্গুর",
};

export const STATE_COLOR: Record<MasteryState, string> = {
  unknown: "#64748B",
  exposed: "#60A5FA",
  developing: "#22D3EE",
  practiced: "#A78BFA",
  mastered: "#F59E0B",
  fragile: "#EF4444",
};

export const DIM_LABEL_BN: Record<keyof Dimensions, string> = {
  exposure: "পরিচিতি",
  understanding: "বোধগম্যতা",
  application: "প্রয়োগ",
  retention: "ধারণ",
};

export function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (Date.now() - t) / (1000 * 60 * 60 * 24));
}
