"use client";

import type { Concept } from "../types/knowledgeGraph";
import type { UserKnowledgeState } from "../types/knowledgeGraph";

type ConceptDetailsProps = {
  concept: Concept | null;
  prerequisites: Concept[];
  dependents: Concept[];
  knowledgeState: UserKnowledgeState | null;
  onMarkUnderstood: (conceptId: string) => void;
  onMarkConfusing: (conceptId: string) => void;
  onViewedConcept: (conceptId: string) => void;
  /** Opens the Gemini assessment dialog for this concept. */
  onOpenAssessment: (conceptId: string) => void;
};

export function ConceptDetails({
  concept,
  prerequisites,
  dependents,
  knowledgeState,
  onMarkUnderstood,
  onMarkConfusing,
  onViewedConcept,
  onOpenAssessment,
}: ConceptDetailsProps) {
  return (
    <aside className="border-t border-white/10 bg-[#11142a] p-4 lg:border-t-0 lg:border-l">
      <h2 className="mb-3 text-lg font-semibold text-white">Concept Details</h2>

      {!concept ? (
        <p className="text-sm text-slate-400">
          Click a node in the graph to view concept details.
        </p>
      ) : (
        <div className="space-y-4 text-sm">
          <section>
            <h3 className="text-base font-medium text-violet-300">{concept.name}</h3>
            <p className="mt-1 text-slate-300">{concept.description}</p>
            <p className="mt-1 text-xs text-slate-400">
              Class {concept.class} • {concept.subject.toUpperCase()} • {concept.chapter}
            </p>
          </section>

          <section className="rounded-md border border-violet-400/25 bg-violet-500/5 p-3">
            <h4 className="mb-1 text-sm font-medium text-violet-200">Explore this topic</h4>
            <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">
              {concept.exploreContent}
            </p>
          </section>

          <button
            type="button"
            onClick={() => onOpenAssessment(concept.id)}
            className="w-full rounded-md border-2 border-indigo-400/60 bg-gradient-to-r from-indigo-500/25 to-violet-600/20 px-3 py-3 text-left text-sm font-semibold text-indigo-50 shadow-md shadow-indigo-950/30 transition hover:border-indigo-300 hover:from-indigo-500/35 hover:to-violet-600/30"
          >
            ★ Start assessment — Gemini quiz + personalized note after submit
          </button>

          {knowledgeState && (
            <section className="rounded-md border border-white/10 bg-[#161a34] p-3">
              <h4 className="mb-2 font-medium text-slate-200">Knowledge Scores</h4>
              <div className="space-y-1 text-slate-300">
                <p>Mastery: {knowledgeState.mastery_score.toFixed(2)}</p>
                <p>Exposure: {knowledgeState.exposure_score.toFixed(2)}</p>
                <p>Confusion: {knowledgeState.confusion_score.toFixed(2)}</p>
              </div>

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => onMarkUnderstood(concept.id)}
                  className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-left text-xs text-emerald-100 transition hover:bg-emerald-500/25"
                >
                  Mark as Understood (+0.1 mastery)
                </button>
                <button
                  type="button"
                  onClick={() => onMarkConfusing(concept.id)}
                  className="rounded-md border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-left text-xs text-rose-100 transition hover:bg-rose-500/25"
                >
                  Mark as Confusing (+0.1 confusion)
                </button>
                <button
                  type="button"
                  onClick={() => onViewedConcept(concept.id)}
                  className="rounded-md border border-violet-300/40 bg-violet-500/15 px-3 py-2 text-left text-xs text-violet-100 transition hover:bg-violet-500/25"
                >
                  Viewed Concept (+0.1 exposure)
                </button>
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-1 font-medium text-slate-200">Prerequisites</h4>
            {prerequisites.length > 0 ? (
              <ul className="space-y-1 text-slate-300">
                {prerequisites.map((item) => (
                  <li key={item.id}>• {item.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">None</p>
            )}
          </section>

          <section>
            <h4 className="mb-1 font-medium text-slate-200">Dependent Concepts</h4>
            {dependents.length > 0 ? (
              <ul className="space-y-1 text-slate-300">
                {dependents.map((item) => (
                  <li key={item.id}>• {item.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">None</p>
            )}
          </section>

          <section className="rounded-md border border-white/10 bg-[#161a34] p-3">
            <h4 className="mb-1 font-medium text-slate-200">Legend</h4>
            <p className="text-slate-300">Node = Concept</p>
            <p className="text-slate-300">Edge = Prerequisite</p>
            <p className="mt-1 text-slate-300">Green/Yellow/Red = Mastery level</p>
          </section>
        </div>
      )}
    </aside>
  );
}
