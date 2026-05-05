"use client";

import { useMemo, useState } from "react";
import {
  type Edge,
  type Node,
  type OnNodesChange,
  MarkerType,
  Position,
} from "@xyflow/react";
import { ConceptDetails } from "./ConceptDetails";
import { AssessmentDialog } from "./AssessmentDialog";
import { GraphCanvas } from "./GraphCanvas";
import { Sidebar } from "./Sidebar";
import { scopeConceptsForGradeGraph } from "../lib/graphScope";
import {
  computeCoverageMetrics,
  computeNextBestConcept,
} from "../lib/graphLearningMetrics";
import { useKnowledgeState } from "../hooks/useKnowledgeState";
import type { Concept } from "../types/knowledgeGraph";
import type { TutorContextSnapshot } from "../types/aiTutor";
import { TutorChatPanel } from "./TutorChatPanel";

type DashboardProps = {
  onResetComplete: () => void;
};

function getMasteryColor(mastery: number) {
  if (mastery >= 0.7) return "#10b981";
  if (mastery >= 0.4) return "#f59e0b";
  return "#ef4444";
}

function getNodePosition(index: number, total: number) {
  const columns = Math.max(4, Math.ceil(Math.sqrt(Math.max(total, 1))));
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: 80 + column * 190,
    y: 120 + row * 140,
  };
}

/** React Flow hides nodes until `node.width`/`node.height` exist (style.width is not enough). */
const GRAPH_NODE_DIM = { width: 180, height: 88 };

export function Dashboard({ onResetComplete }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const {
    concepts,
    relationships,
    knowledgeState,
    learningEvents,
    profile,
    setProfile,
    handleLearningEvent,
    handleQuizAttempt,
    resetAll,
  } = useKnowledgeState();
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(
    () => concepts[0]?.id ?? null,
  );
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [nodePositions, setNodePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const selectedClassNum = useMemo(
    () => Number(profile.userClass.replace("class_", "")),
    [profile.userClass],
  );

  const scopedConcepts = useMemo(
    () =>
      scopeConceptsForGradeGraph({
        concepts,
        relationships,
        selectedClassNum,
        selectedSubject: profile.userSubject,
      }),
    [concepts, relationships, profile.userSubject, selectedClassNum],
  );

  const filteredConcepts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return scopedConcepts;
    return scopedConcepts.filter((concept) =>
      concept.name.toLowerCase().includes(normalizedQuery),
    );
  }, [scopedConcepts, searchQuery]);

  const visibleConceptIds = useMemo(
    () => new Set(filteredConcepts.map((concept) => concept.id)),
    [filteredConcepts],
  );

  const visibleRelationships = useMemo(
    () =>
      relationships.filter(
        (edge) => visibleConceptIds.has(edge.source) && visibleConceptIds.has(edge.target),
      ),
    [relationships, visibleConceptIds],
  );

  const effectiveSelectedConceptId = useMemo(() => {
    if (selectedConceptId && visibleConceptIds.has(selectedConceptId)) {
      return selectedConceptId;
    }
    return filteredConcepts[0]?.id ?? null;
  }, [filteredConcepts, selectedConceptId, visibleConceptIds]);

  const masteryByConceptId = useMemo(() => {
    return knowledgeState.reduce<Record<string, number>>((acc, item) => {
      acc[item.concept_id] = item.mastery_score;
      return acc;
    }, {});
  }, [knowledgeState]);

  const conceptNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const concept of filteredConcepts) {
      map.set(concept.id, concept.name);
    }
    return map;
  }, [filteredConcepts]);

  const selectedConcept = useMemo(
    () =>
      filteredConcepts.find((concept) => concept.id === effectiveSelectedConceptId) ?? null,
    [effectiveSelectedConceptId, filteredConcepts],
  );

  const prerequisiteIds = useMemo(
    () =>
      effectiveSelectedConceptId
        ? visibleRelationships
            .filter((item) => item.target === effectiveSelectedConceptId)
            .map((item) => item.source)
        : [],
    [effectiveSelectedConceptId, visibleRelationships],
  );

  const dependentIds = useMemo(
    () =>
      effectiveSelectedConceptId
        ? visibleRelationships
            .filter((item) => item.source === effectiveSelectedConceptId)
            .map((item) => item.target)
        : [],
    [effectiveSelectedConceptId, visibleRelationships],
  );

  const highlightedConceptIds = useMemo(
    () =>
      new Set([
        ...prerequisiteIds,
        ...dependentIds,
        ...(effectiveSelectedConceptId ? [effectiveSelectedConceptId] : []),
      ]),
    [dependentIds, effectiveSelectedConceptId, prerequisiteIds],
  );

  const nodes = useMemo<Node[]>(() => {
    const total = filteredConcepts.length;
    return filteredConcepts.map((concept, index) => ({
      id: concept.id,
      data: { label: concept.name },
      position: nodePositions[concept.id] ?? getNodePosition(index, total),
    }));
  }, [filteredConcepts, nodePositions]);

  const styledNodes = useMemo(() => {
    return nodes.map((node) => {
      const concept = filteredConcepts.find((item) => item.id === node.id);
      const mastery = masteryByConceptId[node.id] ?? 0.1;
      const isSelected = node.id === effectiveSelectedConceptId;
      const isConnected = highlightedConceptIds.has(node.id);
      const hasSelection = effectiveSelectedConceptId !== null;

      const focal = concept?.class === selectedClassNum;
      const label =
        concept == null ? node.id : focal ? concept.name : `${concept.name}\n(prerequisite)`;

      return {
        ...node,
        width: GRAPH_NODE_DIM.width,
        height: GRAPH_NODE_DIM.height,
        measured: {
          width: GRAPH_NODE_DIM.width,
          height: GRAPH_NODE_DIM.height,
        },
        handles: [
          {
            id: "in",
            type: "target" as const,
            position: Position.Top,
            x: GRAPH_NODE_DIM.width / 2,
            y: 0,
          },
          {
            id: "out",
            type: "source" as const,
            position: Position.Bottom,
            x: GRAPH_NODE_DIM.width / 2,
            y: GRAPH_NODE_DIM.height,
          },
        ],
        data: {
          label,
          description: concept?.description ?? "",
        },
        style: {
          borderRadius: 12,
          border: `1px solid ${isSelected ? "#ddd6fe" : "#6d28d9"}`,
          background: getMasteryColor(mastery),
          color: "#f8fafc",
          padding: 10,
          width: GRAPH_NODE_DIM.width,
          height: GRAPH_NODE_DIM.height,
          whiteSpace: "pre-line",
          textAlign: "center" as const,
          boxShadow: isSelected
            ? "0 0 0 3px rgba(167,139,250,0.45)"
            : "0 2px 14px rgba(2,6,23,0.35)",
          opacity: hasSelection && !isConnected ? 0.38 : 1,
          transition:
            "background-color 250ms ease, border-color 180ms ease, opacity 180ms ease",
        },
      };
    });
  }, [
    effectiveSelectedConceptId,
    filteredConcepts,
    highlightedConceptIds,
    masteryByConceptId,
    nodes,
    selectedClassNum,
  ]);

  const styledEdges = useMemo<Edge[]>(() => {
    const hasSelection = effectiveSelectedConceptId !== null;

    return visibleRelationships.map((item) => {
      const isHighlighted =
        item.source === effectiveSelectedConceptId ||
        item.target === effectiveSelectedConceptId;
      return {
        id: `${item.source}-${item.target}`,
        type: "prerequisite" as const,
        source: item.source,
        target: item.target,
        selectable: true,
        animated: isHighlighted,
        data: {
          sourceName: conceptNameById.get(item.source) ?? "Prerequisite",
          targetName: conceptNameById.get(item.target) ?? "Concept",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: isHighlighted ? "#ddd6fe" : "#818cf8",
        },
        style: {
          stroke: isHighlighted ? "#ddd6fe" : "#818cf8",
          strokeWidth: isHighlighted ? 2.75 : 2,
          opacity: hasSelection && !isHighlighted ? 0.45 : 0.98,
          transition: "all 180ms ease",
        },
        zIndex: isHighlighted ? 2 : 0,
      };
    });
  }, [conceptNameById, effectiveSelectedConceptId, visibleRelationships]);

  const selectedKnowledge = useMemo(
    () =>
      knowledgeState.find((item) => item.concept_id === effectiveSelectedConceptId) ?? null,
    [effectiveSelectedConceptId, knowledgeState],
  );

  const prerequisites = useMemo(
    () => filteredConcepts.filter((concept) => prerequisiteIds.includes(concept.id)),
    [filteredConcepts, prerequisiteIds],
  );

  const dependents = useMemo(
    () => filteredConcepts.filter((concept) => dependentIds.includes(concept.id)),
    [filteredConcepts, dependentIds],
  );

  const averageMastery = useMemo(() => {
    if (knowledgeState.length === 0) return 0;
    const total = knowledgeState.reduce((acc, item) => acc + item.mastery_score, 0);
    return total / knowledgeState.length;
  }, [knowledgeState]);

  const handleEvent = (conceptId: string, eventType: "understood" | "confusing" | "view") => {
    handleLearningEvent(conceptId, eventType);
  };

  const weakConcept = useMemo((): Concept | null => {
    if (filteredConcepts.length === 0) return null;
    let best: { concept: Concept; weaknessScore: number } | null = null;

    for (const concept of filteredConcepts) {
      const state = knowledgeState.find((item) => item.concept_id === concept.id);
      if (!state) continue;
      const weaknessScore = state.mastery_score - state.confusion_score;
      if (!best || weaknessScore < best.weaknessScore) {
        best = { concept, weaknessScore };
      }
    }

    return best?.concept ?? null;
  }, [filteredConcepts, knowledgeState]);

  const weakPrerequisites = useMemo(() => {
    return prerequisites.filter((concept) => {
      const state = knowledgeState.find((item) => item.concept_id === concept.id);
      return (state?.mastery_score ?? 0) < 0.5;
    });
  }, [knowledgeState, prerequisites]);

  const coverageMetrics = useMemo(
    () =>
      computeCoverageMetrics(
        scopedConcepts,
        knowledgeState,
        selectedClassNum,
        relationships,
      ),
    [knowledgeState, relationships, scopedConcepts, selectedClassNum],
  );

  const nextBest = useMemo(
    () =>
      computeNextBestConcept(
        scopedConcepts,
        relationships,
        knowledgeState,
        selectedClassNum,
      ),
    [knowledgeState, relationships, scopedConcepts, selectedClassNum],
  );

  const weakConceptList = useMemo(() => {
    return filteredConcepts
      .map((concept) => {
        const state = knowledgeState.find((item) => item.concept_id === concept.id);
        return {
          concept,
          mastery: state?.mastery_score ?? 0,
        };
      })
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 3);
  }, [filteredConcepts, knowledgeState]);

  const recentEvents = useMemo(() => {
    return [...learningEvents]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);
  }, [learningEvents]);

  const tutorSuggestion = useMemo(() => {
    if (!selectedConcept) return "Select a concept to get adaptive guidance.";

    const weakMessage = weakConcept
      ? `Weakest concept currently: ${weakConcept.name}.`
      : "No weak concept detected yet.";
    const prereqMessage = weakPrerequisites.length
      ? `You should revise ${weakPrerequisites.map((item) => item.name).join(", ")} first.`
      : prerequisites.length > 0
        ? "Prerequisites look stable. Continue practice."
        : "This concept has no prerequisite in the current graph.";

    return `${weakMessage} For ${selectedConcept.name}, ${prereqMessage}`;
  }, [prerequisites.length, selectedConcept, weakConcept, weakPrerequisites]);

  const tutorChatContext = useMemo((): TutorContextSnapshot => {
    const merged = filteredConcepts.map((c) => {
      const s = knowledgeState.find((k) => k.concept_id === c.id);
      return {
        conceptId: c.id,
        name: c.name,
        mastery: s?.mastery_score ?? 0.1,
        confusion: s?.confusion_score ?? 0.2,
        exposure: s?.exposure_score ?? 0.3,
      };
    });
    const sorted = [...merged].sort((a, b) => a.mastery - b.mastery);
    const bottom = sorted.slice(0, 20);
    const selId = effectiveSelectedConceptId;
    let scoreRows = bottom.slice(0, 24);
    if (selId) {
      const selectedRow = merged.find((r) => r.conceptId === selId);
      if (selectedRow) {
        const rest = bottom.filter((r) => r.conceptId !== selId);
        scoreRows = [selectedRow, ...rest].slice(0, 24);
      }
    }

    return {
      profile: { userClass: profile.userClass, userSubject: profile.userSubject },
      selectedConcept: selectedConcept
        ? {
            id: selectedConcept.id,
            name: selectedConcept.name,
            chapter: selectedConcept.chapter,
            subject: selectedConcept.subject,
            description: selectedConcept.description,
            exploreSnippet: selectedConcept.exploreContent.slice(0, 700),
          }
        : null,
      prerequisiteNames: prerequisites.map((p) => p.name),
      dependentNames: dependents.map((d) => d.name),
      coverage: {
        engagedPercent: coverageMetrics.engagedPercent,
        engagedCount: coverageMetrics.engagedCount,
        totalInScope: coverageMetrics.totalInScope,
        neverEngagedCount: coverageMetrics.neverEngagedCount,
        blockingPrerequisiteNames: coverageMetrics.blockingPrerequisiteNames,
      },
      nextBest: nextBest ? { name: nextBest.concept.name, reason: nextBest.reason } : null,
      scoreRows,
      recentEvents: [...learningEvents]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 12)
        .map((e) => ({
          conceptId: e.concept_id,
          event_type: e.event_type,
          at: e.timestamp,
        })),
    };
  }, [
    coverageMetrics,
    dependents,
    effectiveSelectedConceptId,
    filteredConcepts,
    knowledgeState,
    learningEvents,
    nextBest,
    prerequisites,
    profile.userClass,
    profile.userSubject,
    selectedConcept,
  ]);

  const handleNodesChange: OnNodesChange<Node> = (changes) => {
    setNodePositions((current) => {
      const next = { ...current };
      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          next[change.id] = change.position;
        }
      });
      return next;
    });
  };

  const handleReset = () => {
    resetAll();
    onResetComplete();
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#090d1a] text-slate-100">
      <section className="grid h-full grid-rows-[240px_1fr_360px] lg:grid-cols-[280px_1fr_420px] lg:grid-rows-1">
        <Sidebar
          concepts={filteredConcepts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedConceptId={effectiveSelectedConceptId}
          onSelectConcept={(conceptId) => {
            setSelectedConceptId(conceptId);
            handleEvent(conceptId, "view");
          }}
          masteryByConceptId={masteryByConceptId}
        />

        <div className="relative h-full min-h-0 border-y border-white/10 bg-[#0b1020] lg:border-x lg:border-y-0">
          <div className="absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-[#11142a]/90 px-3 py-2 text-xs backdrop-blur">
            <div className="flex items-center gap-2">
              <select
                value={profile.userClass}
                onChange={(event) => {
                  const nextClass = event.target.value;
                  setProfile({ ...profile, userClass: nextClass });
                }}
                className="rounded border border-white/20 bg-[#161a34] px-2 py-1 text-slate-200"
              >
                <option value="class_9">Class 9</option>
              </select>
              <select
                value={profile.userSubject}
                onChange={(event) => {
                  const nextSubject = event.target.value;
                  setProfile({ ...profile, userSubject: nextSubject });
                }}
                className="rounded border border-white/20 bg-[#161a34] px-2 py-1 capitalize text-slate-200"
              >
                <option value="all">All Subjects</option>
                <option value="math">Math</option>
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="biology">Biology</option>
                <option value="english">English</option>
                <option value="social_science">Social science</option>
              </select>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-300">{filteredConcepts.length} concepts</span>
                <span className="text-[10px] font-normal text-slate-500">
                  Class {selectedClassNum} focal topics • prerequisite trail stays on-graph (same{" "}
                  {profile.userSubject === "all" ? "filters" : "subject"})
                </span>
              </div>
            </div>
            <span className="text-violet-200">
              Avg mastery: {(averageMastery * 100).toFixed(0)}% | Events:{" "}
              {learningEvents.length}
            </span>
          </div>

          <div className="absolute left-3 right-3 top-14 z-10 space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-[#242949]">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-300"
                style={{ width: `${averageMastery * 100}%` }}
                title="Average mastery across all tracked concepts"
              />
            </div>
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-white/10 bg-[#11142a]/90 px-2 py-1.5 text-[10px] text-slate-400 backdrop-blur"
              title="Each graph node is filled by that concept’s mastery score"
            >
              <span className="font-medium text-slate-300">Node fill = mastery:</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-3.5 shrink-0 rounded-sm bg-[#10b981]" />
                Green ≥70% (strong)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-3.5 shrink-0 rounded-sm bg-[#f59e0b]" />
                Yellow 40–70% (building)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-3.5 shrink-0 rounded-sm bg-[#ef4444]" />
                Red {"<"}40% (priority)
              </span>
              <span className="text-slate-500">· Dimmed = not on path to selected concept</span>
              <span className="basis-full text-slate-500">
                Edges: hover for prerequisite → dependent label. Click selects the dependent; Shift+click
                selects the prerequisite.
              </span>
            </div>
          </div>

          <div className="relative h-full pt-[6.25rem]">
            <GraphCanvas
              nodes={styledNodes}
              edges={styledEdges}
              onNodeClick={(conceptId) => {
                setSelectedConceptId(conceptId);
                handleEvent(conceptId, "view");
              }}
              onNodeDoubleClick={(conceptId) => {
                setSelectedConceptId(conceptId);
                handleEvent(conceptId, "view");
                setAssessmentOpen(true);
              }}
              onEdgeClick={({ sourceId, targetId, shiftKey }) => {
                const next = shiftKey ? sourceId : targetId;
                if (visibleConceptIds.has(next)) {
                  setSelectedConceptId(next);
                  handleEvent(next, "view");
                }
              }}
              onNodesChange={handleNodesChange}
            />
            {selectedConcept && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3 pt-8 bg-gradient-to-t from-[#0b1020] via-[#0b1020]/95 to-transparent">
                <div className="pointer-events-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-400/35 bg-[#12162c]/95 px-3 py-2.5 shadow-lg shadow-black/40 backdrop-blur">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-indigo-200/90">
                      Selected concept
                    </p>
                    <p className="truncate text-sm font-semibold text-white">{selectedConcept.name}</p>
                    <p className="truncate text-[10px] text-slate-500">
                      {selectedConcept.chapter} · {selectedConcept.subject}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssessmentOpen(true)}
                    className="shrink-0 rounded-md bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-900/40 transition hover:from-indigo-400 hover:to-violet-500"
                  >
                    ★ Start assessment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex h-full min-h-0 flex-col border-t border-white/10 bg-[#11142a] lg:border-t-0 lg:border-l">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ConceptDetails
              concept={selectedConcept}
              prerequisites={prerequisites}
              dependents={dependents}
              knowledgeState={selectedKnowledge}
              onMarkUnderstood={(conceptId) =>
                handleEvent(conceptId, "understood")
              }
              onMarkConfusing={(conceptId) =>
                handleEvent(conceptId, "confusing")
              }
              onViewedConcept={(conceptId) => handleEvent(conceptId, "view")}
              onOpenAssessment={(conceptId) => {
                setSelectedConceptId(conceptId);
                setAssessmentOpen(true);
              }}
            />

            <div className="space-y-3 border-t border-white/10 bg-[#11142a] p-4">
              {weakPrerequisites.length > 0 && selectedConcept && (
                <section className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3">
                  <h4 className="mb-1 text-sm font-medium text-amber-200">
                    Prerequisite Warning
                  </h4>
                  <p className="text-xs text-amber-100">
                    Before learning {selectedConcept.name}, revise{" "}
                    {weakPrerequisites.map((item) => item.name).join(", ")}.
                  </p>
                </section>
              )}

              <section className="rounded-md border border-emerald-400/25 bg-emerald-950/25 p-3">
                <h4 className="mb-2 text-sm font-medium text-emerald-200">Graph coverage</h4>
                <ul className="space-y-1 text-xs leading-relaxed text-slate-300">
                  <li>
                    Engaged concepts: {coverageMetrics.engagedPercent}% (
                    {coverageMetrics.engagedCount}/{coverageMetrics.totalInScope})
                  </li>
                  <li>Never engaged (low exposure): {coverageMetrics.neverEngagedCount}</li>
                  {coverageMetrics.blockingPrerequisiteNames.length > 0 ? (
                    <li className="text-amber-100/95">
                      Weak prerequisites blocking focal topics:{" "}
                      {coverageMetrics.blockingPrerequisiteNames.join(", ")}
                    </li>
                  ) : (
                    <li className="text-slate-500">No weak prerequisite blockers on focal nodes.</li>
                  )}
                </ul>
              </section>

              <section className="rounded-md border border-violet-400/30 bg-[#1a1630] p-3">
                <h4 className="mb-2 text-sm font-medium text-violet-200">Next best concept</h4>
                {nextBest ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-100">{nextBest.concept.name}</p>
                    <p className="text-[11px] leading-relaxed text-slate-400">{nextBest.reason}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedConceptId(nextBest.concept.id);
                        handleEvent(nextBest.concept.id, "view");
                      }}
                      className="w-full rounded-md bg-violet-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-500"
                    >
                      Study this concept
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No suggestion in this scope yet.</p>
                )}
              </section>

              <section className="rounded-md border border-white/10 bg-[#161a34] p-3">
                <h4 className="mb-2 text-sm font-medium text-violet-200">Adaptive Tutor Note</h4>
                <p className="text-xs text-slate-300">{tutorSuggestion}</p>
                {weakConceptList.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-slate-400">Weak concepts (current scope):</p>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {weakConceptList.map((item) => (
                        <li key={item.concept.id}>
                          • {item.concept.name} ({(item.mastery * 100).toFixed(0)}%)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section className="rounded-md border border-indigo-400/25 bg-[#161c36] p-3">
                <h4 className="mb-1 text-sm font-medium text-indigo-200">Assessment</h4>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Use <strong className="text-slate-200">★ Start assessment</strong> on the graph bar
                  (bottom), <strong className="text-slate-200">double-click a node</strong> to jump
                  straight in, or the same button on the concept card. After submit you get missed
                  questions listed plus a <strong className="text-slate-200">tutor note</strong> (AI +
                  a checklist from your wrong answers).
                </p>
              </section>

              <section className="rounded-md border border-white/10 bg-[#161a34] p-3">
                <h4 className="mb-2 text-sm font-medium text-slate-100">Recent Learning Events</h4>
                {recentEvents.length === 0 ? (
                  <p className="text-xs text-slate-400">No events yet.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-slate-300">
                    {recentEvents.map((event, index) => (
                      <li key={`${event.concept_id}-${event.timestamp}-${index}`}>
                        • {event.event_type} on {event.concept_id}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-white/10 bg-[#11142a] p-4">
            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
            >
              Reset Progress
            </button>
          </div>
        </div>
      </section>

      <AssessmentDialog
        open={assessmentOpen}
        onOpenChange={setAssessmentOpen}
        concept={selectedConcept}
        onAttemptRecorded={(payload) => handleQuizAttempt(payload)}
      />

      <TutorChatPanel context={tutorChatContext} />
    </main>
  );
}
