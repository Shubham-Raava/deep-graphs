"use client";

import type { Concept } from "../types/knowledgeGraph";
import type { UserKnowledgeState } from "../types/knowledgeGraph";

function masteryFillColor(mastery: number): string {
  if (mastery >= 0.7) return "#10b981";
  if (mastery >= 0.4) return "#f59e0b";
  return "#ef4444";
}

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
    <aside className="border-t border-white/10 bg-[#11142a] p-3 sm:p-4 lg:border-t-0 lg:border-l">
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
            className="min-h-[48px] w-full rounded-md border-2 border-indigo-400/60 bg-gradient-to-r from-indigo-500/25 to-violet-600/20 px-3 py-3 text-left text-sm font-semibold text-indigo-50 shadow-md shadow-indigo-950/30 transition hover:border-indigo-300 hover:from-indigo-500/35 hover:to-violet-600/30 active:opacity-90"
          >
            ★ Start assessment — Gemini quiz + personalized note after submit
          </button>

          {knowledgeState && (
            <section className="rounded-lg border border-violet-400/30 bg-gradient-to-b from-violet-500/10 to-[#161a34] p-3 shadow-inner shadow-violet-950/20">
              <h4 className="mb-3 text-sm font-semibold tracking-wide text-violet-100">
                Scores for this concept
              </h4>
              <div className="grid gap-3">
                <div className="rounded-md border border-emerald-500/35 bg-emerald-950/30 p-3 ring-1 ring-emerald-400/10">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200/90">
                      Mastery
                    </span>
                    <span
                      className="text-2xl font-bold tabular-nums leading-none"
                      style={{ color: masteryFillColor(knowledgeState.mastery_score) }}
                    >
                      {(knowledgeState.mastery_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/35">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${Math.min(100, Math.max(0, knowledgeState.mastery_score * 100))}%`,
                        backgroundColor: masteryFillColor(knowledgeState.mastery_score),
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-slate-400">
                    Same scale as node color on the graph: strong (green), building (yellow), or
                    priority review (red).
                  </p>
                </div>

                <div className="rounded-md border border-amber-500/35 bg-amber-950/25 p-3 ring-1 ring-amber-400/10">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">
                      Confusion
                    </span>
                    <span className="text-2xl font-bold tabular-nums leading-none text-amber-200">
                      {(knowledgeState.confusion_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/35">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-[width]"
                      style={{
                        width: `${Math.min(100, Math.max(0, knowledgeState.confusion_score * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-slate-400">
                    Rises when you mark confusing or miss questions; high values mean spend more
                    time here before advancing.
                  </p>
                </div>

                <div className="rounded-md border border-violet-500/35 bg-violet-950/30 p-3 ring-1 ring-violet-400/10">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-violet-200/90">
                      Exposure
                    </span>
                    <span className="text-2xl font-bold tabular-nums leading-none text-violet-200">
                      {(knowledgeState.exposure_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/35">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-[width]"
                      style={{
                        width: `${Math.min(100, Math.max(0, knowledgeState.exposure_score * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-slate-400">
                    How much this concept has shown up in your sessions; use “Viewed” or quizzes to
                    increase it.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => onMarkUnderstood(concept.id)}
                  className="min-h-[44px] rounded-md border border-emerald-400/40 bg-emerald-500/15 px-3 py-2.5 text-left text-xs text-emerald-100 transition hover:bg-emerald-500/25 active:bg-emerald-500/20"
                >
                  Mark as Understood (+0.1 mastery)
                </button>
                <button
                  type="button"
                  onClick={() => onMarkConfusing(concept.id)}
                  className="min-h-[44px] rounded-md border border-rose-400/40 bg-rose-500/15 px-3 py-2.5 text-left text-xs text-rose-100 transition hover:bg-rose-500/25 active:bg-rose-500/20"
                >
                  Mark as Confusing (+0.1 confusion)
                </button>
                <button
                  type="button"
                  onClick={() => onViewedConcept(concept.id)}
                  className="min-h-[44px] rounded-md border border-violet-300/40 bg-violet-500/15 px-3 py-2.5 text-left text-xs text-violet-100 transition hover:bg-violet-500/25 active:bg-violet-500/20"
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
            <h4 className="mb-1 font-medium text-slate-200">Graph legend</h4>
            <p className="text-slate-300">Node = concept</p>
            <p className="text-slate-300">Edge = prerequisite (must come before)</p>
            <p className="mt-1 text-xs leading-snug text-slate-400">
              Hover an edge to see who it connects; click opens the dependent concept, Shift+click
              opens the prerequisite.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-200">Node fill (mastery)</p>
            <ul className="mt-1 space-y-1 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-4 shrink-0 rounded-sm bg-[#10b981]" />
                Green — mastery ≥70% (strong)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-4 shrink-0 rounded-sm bg-[#f59e0b]" />
                Yellow — mastery 40–70% (building)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-4 shrink-0 rounded-sm bg-[#ef4444]" />
                Red — mastery {"<"}40% (priority)
              </li>
              <li className="pt-1 text-slate-500">
                Dimmed nodes are off the path to the selected concept, not a different mastery
                color.
              </li>
            </ul>
          </section>
        </div>
      )}
    </aside>
  );
}
