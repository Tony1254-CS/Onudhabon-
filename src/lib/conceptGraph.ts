// Concept dependency graph utilities.
//
// Reads the curated curriculum graph stored in `concept_relationships`
// (concept ← prerequisite, with strength 0..1) and exposes helpers for:
//   - looking up prerequisites for a set of concepts (case-insensitive)
//   - merging curriculum prereqs into an ExtractedConcept[] so the mind-map
//     panel can render directional dependency edges
//   - identifying which prerequisites to remediate first when a student is
//     weak in a concept (sorted by edge strength × prereq weakness gap)

import { supabase } from "@/integrations/supabase/client";
import type { ExtractedConcept } from "@/components/learn/MindMap";

export type ConceptEdge = {
  concept: string;
  prerequisite: string;
  subject: string;
  strength: number;
};

export type RemediationTarget = {
  prerequisite: string;
  strength: number;
  mastery: number; // 0..1, prereq's current mastery (0 if unknown)
  priority: number; // higher = remediate first
};

const norm = (s: string) => s.trim().toLowerCase();

// Fetch all curriculum edges that involve the given concept names (as either
// dependent or prerequisite). One round-trip; case-insensitive match.
export async function fetchEdgesForConcepts(
  names: string[],
  subject?: string | null,
): Promise<ConceptEdge[]> {
  const clean = Array.from(new Set(names.map((n) => n?.trim()).filter(Boolean)));
  if (clean.length === 0) return [];
  // PostgREST `in.()` is case-sensitive; widen by also fetching by subject and
  // filtering client-side with normalized comparison.
  let q = supabase
    .from("concept_relationships")
    .select("concept,prerequisite,subject,strength");
  if (subject) q = q.eq("subject", subject);
  const { data, error } = await q.limit(2000);
  if (error || !data) return [];
  const set = new Set(clean.map(norm));
  return (data as ConceptEdge[]).filter(
    (e) => set.has(norm(e.concept)) || set.has(norm(e.prerequisite)),
  );
}

// Merge curriculum prerequisites (from the graph) into the live ExtractedConcept[]
// so the mind-map renders directional prereq edges between known nodes.
// Only edges where BOTH endpoints exist in the visible concept set are added,
// to avoid orphan nodes.
export function mergeCurriculumPrereqs(
  concepts: ExtractedConcept[],
  edges: ConceptEdge[],
): ExtractedConcept[] {
  const known = new Map(concepts.map((c) => [norm(c.name), c.name] as const));
  const additions = new Map<string, Set<string>>(); // concept -> prereqs

  for (const e of edges) {
    const dep = known.get(norm(e.concept));
    const pre = known.get(norm(e.prerequisite));
    if (!dep || !pre || dep === pre) continue;
    if (!additions.has(dep)) additions.set(dep, new Set());
    additions.get(dep)!.add(pre);
  }

  return concepts.map((c) => {
    const extra = additions.get(c.name);
    if (!extra || extra.size === 0) return c;
    const merged = Array.from(new Set([...(c.prerequisites ?? []), ...extra]));
    return { ...c, prerequisites: merged };
  });
}

// Given a target weak concept, rank which prerequisite concepts should be
// remediated first. Higher priority = stronger curriculum dependency
// combined with weaker current mastery on the prereq side.
export function rankRemediationTargets(
  weakConcept: string,
  edges: ConceptEdge[],
  masteryByConcept: Record<string, number>,
): RemediationTarget[] {
  const target = norm(weakConcept);
  const masteryNorm: Record<string, number> = {};
  for (const [k, v] of Object.entries(masteryByConcept)) masteryNorm[norm(k)] = v;

  const direct = edges.filter((e) => norm(e.concept) === target);
  return direct
    .map<RemediationTarget>((e) => {
      const m = masteryNorm[norm(e.prerequisite)] ?? 0;
      const gap = 1 - m;
      return {
        prerequisite: e.prerequisite,
        strength: e.strength,
        mastery: m,
        priority: Math.round(e.strength * gap * 100),
      };
    })
    .sort((a, b) => b.priority - a.priority);
}
