import type { Concept, Relationship } from "../types/knowledgeGraph";

/**
 * Concepts taught in exactly `selectedClassNum`, plus any same-subject prerequisite
 * ancestors so prerequisite edges remain visible within the student's grade ceiling.
 */
export function scopeConceptsForGradeGraph({
  concepts,
  relationships,
  selectedClassNum,
  selectedSubject,
}: {
  concepts: Concept[];
  relationships: Relationship[];
  selectedClassNum: number;
  selectedSubject: string;
}): Concept[] {
  const subjectMatch = (c: Concept) =>
    selectedSubject === "all" || c.subject === selectedSubject;

  const allowedConcepts = concepts.filter(
    (concept) =>
      subjectMatch(concept) && concept.class <= selectedClassNum,
  );
  const allowedIds = new Set(allowedConcepts.map((concept) => concept.id));

  const scopedEdges = relationships.filter(
    (edge) => allowedIds.has(edge.source) && allowedIds.has(edge.target),
  );

  const focalIds = new Set(
    allowedConcepts.filter((c) => c.class === selectedClassNum).map((c) => c.id),
  );

  let seeds = [...focalIds];
  if (seeds.length === 0) {
    seeds = [...allowedIds];
  }

  const incomingByTarget = new Map<string, string[]>();
  for (const edge of scopedEdges) {
    let list = incomingByTarget.get(edge.target);
    if (!list) {
      list = [];
      incomingByTarget.set(edge.target, list);
    }
    list.push(edge.source);
  }

  const include = new Set<string>(seeds);
  const stack = [...seeds];
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const sourceId of incomingByTarget.get(id) ?? []) {
      if (!include.has(sourceId)) {
        include.add(sourceId);
        stack.push(sourceId);
      }
    }
  }

  return allowedConcepts.filter((concept) => include.has(concept.id));
}
