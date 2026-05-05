import type { Concept, Relationship, UserKnowledgeState } from "../types/knowledgeGraph";

const BASELINE_EXPOSURE = 0.3;

/** Exposure at or below this counts as “not yet engaged” for coverage. */
const NEVER_VIEWED_EXPOSURE_MAX = 0.42;
/** Count as “engaged” when exposure cleared this bar (views / quizzes). */
const ENGAGED_EXPOSURE_MIN = 0.46;
/** Recommend studying prereqs first when mastery stays below this. */
const PREREQ_GATE = 0.42;

export type CoverageMetrics = {
  totalInScope: number;
  engagedCount: number;
  engagedPercent: number;
  neverEngagedCount: number;
  blockingPrerequisiteNames: string[];
};

export type NextBestConceptResult = {
  concept: Concept;
  reason: string;
} | null;

function stateById(knowledgeState: UserKnowledgeState[]) {
  return new Map(knowledgeState.map((s) => [s.concept_id, s]));
}

/**
 * Coverage for the current graph scope: engagement %, never-touched nodes,
 * and focal concepts whose incoming prerequisites are still weak.
 */
export function computeCoverageMetrics(
  scopedConcepts: Concept[],
  knowledgeState: UserKnowledgeState[],
  selectedClassNum: number,
  relationships: Relationship[],
): CoverageMetrics {
  const map = stateById(knowledgeState);
  const scopedIds = new Set(scopedConcepts.map((c) => c.id));

  let engagedCount = 0;
  let neverEngagedCount = 0;

  for (const concept of scopedConcepts) {
    const s = map.get(concept.id);
    const exposure = s?.exposure_score ?? BASELINE_EXPOSURE;
    if (exposure >= ENGAGED_EXPOSURE_MIN) engagedCount++;
    if (exposure <= NEVER_VIEWED_EXPOSURE_MAX) neverEngagedCount++;
  }

  const blockingNames: string[] = [];

  const incomingByTarget = new Map<string, string[]>();
  for (const edge of relationships) {
    if (!scopedIds.has(edge.source) || !scopedIds.has(edge.target)) continue;
    let list = incomingByTarget.get(edge.target);
    if (!list) {
      list = [];
      incomingByTarget.set(edge.target, list);
    }
    list.push(edge.source);
  }

  const focal = scopedConcepts.filter((c) => c.class === selectedClassNum);
  for (const concept of focal) {
    const preds = incomingByTarget.get(concept.id) ?? [];
    for (const pid of preds) {
      const m = map.get(pid)?.mastery_score ?? 0;
      if (m < PREREQ_GATE) {
        const name = scopedConcepts.find((c) => c.id === pid)?.name ?? pid;
        if (!blockingNames.includes(name)) blockingNames.push(name);
      }
    }
  }

  const totalInScope = scopedConcepts.length;
  const engagedPercent =
    totalInScope > 0 ? Math.round((engagedCount / totalInScope) * 100) : 0;

  return {
    totalInScope,
    engagedCount,
    engagedPercent,
    neverEngagedCount,
    blockingPrerequisiteNames: blockingNames.slice(0, 8),
  };
}

/**
 * Pick the weakest learnable concept: prefer nodes whose prerequisites meet the gate;
 * if none, fall back to the weakest node in scope (usually a prerequisite itself).
 */
export function computeNextBestConcept(
  scopedConcepts: Concept[],
  relationships: Relationship[],
  knowledgeState: UserKnowledgeState[],
  selectedClassNum: number,
): NextBestConceptResult {
  if (scopedConcepts.length === 0) return null;

  const map = stateById(knowledgeState);
  const scopedIds = new Set(scopedConcepts.map((c) => c.id));

  const predecessorIds = (conceptId: string) =>
    relationships
      .filter((e) => e.target === conceptId && scopedIds.has(e.source))
      .map((e) => e.source);

  const prereqsSatisfied = (conceptId: string) =>
    predecessorIds(conceptId).every(
      (pid) => (map.get(pid)?.mastery_score ?? 0) >= PREREQ_GATE,
    );

  const weaknessMetric = (conceptId: string) => {
    const s = map.get(conceptId);
    const mastery = s?.mastery_score ?? 0.1;
    const confusion = s?.confusion_score ?? 0.2;
    const exposure = s?.exposure_score ?? BASELINE_EXPOSURE;
    const base = mastery - confusion * 0.55;
    const focal = scopedConcepts.find((c) => c.id === conceptId)?.class === selectedClassNum;
    return base - (focal ? 0.04 : 0) - (exposure <= NEVER_VIEWED_EXPOSURE_MAX ? 0.08 : 0);
  };

  const feasible = scopedConcepts.filter((c) => prereqsSatisfied(c.id));
  const pool = feasible.length > 0 ? feasible : scopedConcepts;

  let best: { concept: Concept; metric: number } | null = null;
  for (const concept of pool) {
    const metric = weaknessMetric(concept.id);
    if (!best || metric < best.metric) {
      best = { concept, metric };
    }
  }

  if (!best) return null;

  const usedFeasiblePool = feasible.length > 0;
  const reason = usedFeasiblePool
    ? best.metric < 0.38
      ? "Low mastery vs confusion — review or run an assessment."
      : "Next step along concepts whose prerequisites look ready."
    : "Prerequisite mastery is still low — strengthen these basics first.";

  return { concept: best.concept, reason };
}
