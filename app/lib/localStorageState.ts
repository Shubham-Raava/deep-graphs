"use client";

import {
  concepts,
  GRAPH_DATA_VERSION,
  quizQuestions,
  relationships,
  skillCheckQuestions,
} from "../data/mockGraph";
import type {
  Concept,
  LearningEvent,
  LearningEventType,
  QuizAttempt,
  QuizAttemptMeta,
  QuizQuestion,
  Relationship,
  SkillAnswer,
  SkillCheckQuestion,
  UserKnowledgeState,
} from "../types/knowledgeGraph";

export const storageKeys = {
  userClass: "user_class",
  userSubject: "user_subject",
  concepts: "concepts",
  relationships: "relationships",
  userKnowledgeState: "user_knowledge_state",
  learningEvents: "learning_events",
  quizAttempts: "quiz_attempts",
  userId: "user_id",
  graphDataVersion: "graph_data_version",
} as const;

const baseExposure = 0.3;
const baseConfusion = 0.2;

/** Small decay on each explicit “view” to model spaced reinforcement revisits. */
const VIEW_CONFUSION_DECAY = 0.018;

/** UI mastery deltas stay smaller than quiz EMA moves so self-report cannot dominate assessments. */
const UI_MASTERY_UNDERSTOOD_BUMP = 0.08;
const UI_MASTERY_QUIZ_CORRECT_BUMP = 0.08;
const UI_MASTERY_QUIZ_WRONG_DROP = 0.06;

const INTERACTION_GAP_DAY_MS = 86400000;
const IDLE_MASTERY_GAP_START_DAYS = 1.5;
const IDLE_CONFUSION_EASE_START_DAYS = 5;

/**
 * Quiz-derived mastery policy (see submitQuizAttempt):
 * - Raw signal = weighted accuracy / speed / hints from calculateMasteryFromQuiz.
 * - Prerequisite cap uses **transitive** prerequisites (full ancestor chain on the graph).
 * - Soft cap: effective = 0.8 * min(raw, cap) + 0.2 * raw so learners still see some movement before prereqs catch up.
 * - EMA: final mastery blends previous stored mastery with the new effective signal (less volatile than overwriting).
 * - Confusion: blends prior confusion with a bump from wrong ratio + hints; extra decay when quiz accuracy is high.
 */
const SOFT_CAP_BLEND = 0.8;
const QUIZ_EMA_ALPHA_PREVIOUS = 0.6;
const QUIZ_EMA_ALPHA_PREVIOUS_FIRST_ATTEMPT = 0.55;

function getTransitivePrerequisiteIds(
  targetId: string,
  edges: Relationship[],
): Set<string> {
  const incomingByTarget = new Map<string, string[]>();
  for (const edge of edges) {
    let list = incomingByTarget.get(edge.target);
    if (!list) {
      list = [];
      incomingByTarget.set(edge.target, list);
    }
    list.push(edge.source);
  }
  const seen = new Set<string>();
  const stack = [...(incomingByTarget.get(targetId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const p of incomingByTarget.get(id) ?? []) stack.push(p);
  }
  return seen;
}

function safeParse<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

function clampScore(score: number) {
  return Math.min(1, Math.max(0, score));
}

/**
 * Mild forgetting / uncertainty easing when the learner touches a concept after idle days.
 * Applied before quiz math or UI deltas on that interaction only (not on passive reads).
 */
function applyInteractionGapAdjustment(entry: UserKnowledgeState): UserKnowledgeState {
  const now = Date.now();
  const gapDays = (now - entry.last_updated) / INTERACTION_GAP_DAY_MS;

  let mastery = entry.mastery_score;
  let confusion = entry.confusion_score;
  let changed = false;

  if (gapDays >= IDLE_MASTERY_GAP_START_DAYS) {
    const masteryLoss = Math.min(
      0.06,
      Math.max(0, gapDays - IDLE_MASTERY_GAP_START_DAYS) * 0.004,
    );
    if (masteryLoss > 0.0005) {
      mastery = clampScore(mastery * (1 - masteryLoss));
      changed = true;
    }
  }

  if (gapDays >= IDLE_CONFUSION_EASE_START_DAYS) {
    const confusionEase = Math.min(
      0.04,
      Math.max(0, gapDays - IDLE_CONFUSION_EASE_START_DAYS) * 0.003,
    );
    if (confusionEase > 0.0005) {
      confusion = clampScore(Math.max(0, confusion - confusionEase));
      changed = true;
    }
  }

  if (!changed) return entry;

  return {
    ...entry,
    mastery_score: mastery,
    confusion_score: confusion,
    last_mastery_update_reason: "spaced_interval",
  };
}

/** Spread weak Gemini subtopic signals to related concepts (same subject, name/chapter match). */
function applyWeakSubtopicConfusionSpread(
  assessedConceptId: string,
  meta: QuizAttemptMeta | undefined,
  state: UserKnowledgeState[],
  conceptList: Concept[],
): UserKnowledgeState[] {
  const breakdown = meta?.subtopic_breakdown;
  if (!breakdown || Object.keys(breakdown).length === 0) return state;

  const assessed = conceptList.find((c) => c.id === assessedConceptId);
  if (!assessed) return state;

  let next: UserKnowledgeState[] = state.map((row) => ({ ...row }));

  for (const [label, stats] of Object.entries(breakdown)) {
    if (label === "_general" || stats.total < 1) continue;
    const weak = stats.wrong / stats.total;
    if (weak < 0.34) continue;

    const needle = label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (needle.length < 3) continue;

    for (const c of conceptList) {
      if (c.id === assessedConceptId) continue;
      if (c.subject !== assessed.subject) continue;

      const hay = `${c.name} ${c.chapter}`.toLowerCase();
      const shortName = c.name.slice(0, Math.min(6, c.name.length)).toLowerCase();
      const tokenMatch = hay.includes(needle) || (shortName.length >= 3 && needle.includes(shortName));
      if (!tokenMatch) continue;

      const bump = clampScore(0.01 + weak * 0.035);
      next = next.map((row): UserKnowledgeState => {
        if (row.concept_id !== c.id) return row;
        return {
          ...row,
          confusion_score: clampScore(row.confusion_score + bump),
          last_mastery_update_reason: "subtopic_weak_area_spread",
          last_updated: Date.now(),
        };
      });
    }
  }

  return next;
}

function ensureLatestGraphData() {
  if (!isBrowser()) return;

  const storedVersion = localStorage.getItem(storageKeys.graphDataVersion);
  if (storedVersion === GRAPH_DATA_VERSION) return;

  localStorage.setItem(storageKeys.concepts, JSON.stringify(concepts));
  localStorage.setItem(storageKeys.relationships, JSON.stringify(relationships));
  localStorage.setItem(storageKeys.graphDataVersion, GRAPH_DATA_VERSION);
}

export function answerToMastery(answer: SkillAnswer) {
  if (answer === "yes") return 0.7;
  if (answer === "somewhat") return 0.4;
  return 0.1;
}

export function hasPersistedKnowledge() {
  if (!isBrowser()) return false;

  const persistedState = safeParse<UserKnowledgeState[]>(
    localStorage.getItem(storageKeys.userKnowledgeState),
  );

  return Array.isArray(persistedState) && persistedState.length > 0;
}

export function loadConceptsFromStorage() {
  if (!isBrowser()) return [];
  ensureLatestGraphData();
  return safeParse<Concept[]>(localStorage.getItem(storageKeys.concepts)) ?? [];
}

export function loadRelationshipsFromStorage() {
  if (!isBrowser()) return [];
  ensureLatestGraphData();
  return (
    safeParse<Relationship[]>(localStorage.getItem(storageKeys.relationships)) ?? []
  );
}

export function loadKnowledgeState() {
  if (!isBrowser()) return [];
  ensureLatestGraphData();

  const current = safeParse<UserKnowledgeState[]>(
    localStorage.getItem(storageKeys.userKnowledgeState),
  );
  if (!current || current.length === 0) return [];

  const userId = getOrCreateUserId();
  const byConceptId = new Map(current.map((item) => [item.concept_id, item]));
  const hydrated = concepts.map((concept) => {
    const existing = byConceptId.get(concept.id);
    if (existing) return existing;
    return {
      user_id: userId,
      concept_id: concept.id,
      mastery_score: 0.1,
      exposure_score: baseExposure,
      confusion_score: baseConfusion,
      last_updated: Date.now(),
    };
  });
  localStorage.setItem(storageKeys.userKnowledgeState, JSON.stringify(hydrated));
  return hydrated;
}

export function loadUserProfile() {
  if (!isBrowser()) return { userClass: "class_9", userSubject: "all" };
  return {
    userClass: localStorage.getItem(storageKeys.userClass) ?? "class_9",
    userSubject: localStorage.getItem(storageKeys.userSubject) ?? "all",
  };
}

export function loadLearningEvents() {
  if (!isBrowser()) return [];
  return safeParse<LearningEvent[]>(localStorage.getItem(storageKeys.learningEvents)) ?? [];
}

export function loadQuizAttempts() {
  if (!isBrowser()) return [];
  return safeParse<QuizAttempt[]>(localStorage.getItem(storageKeys.quizAttempts)) ?? [];
}

export function getActiveConcepts({
  selectedClass,
  selectedSubject,
}: {
  selectedClass: string;
  selectedSubject: string;
}) {
  const classNumber = Number(selectedClass.replace("class_", ""));
  return concepts.filter(
    (concept) =>
      concept.class <= classNumber &&
      (selectedSubject === "all" || concept.subject === selectedSubject),
  );
}

export function getRelationshipsForConceptSet(activeConcepts: Concept[]) {
  const conceptIds = new Set(activeConcepts.map((concept) => concept.id));
  return relationships.filter(
    (edge) => conceptIds.has(edge.source) && conceptIds.has(edge.target),
  );
}

export function getSkillQuestionsForSelection({
  selectedClass,
  selectedSubject,
}: {
  selectedClass: string;
  selectedSubject: string;
}) {
  const classNumber = Number(selectedClass.replace("class_", ""));
  const scoped = skillCheckQuestions.filter(
    (question) =>
      (selectedSubject === "all" || question.subject === selectedSubject) &&
      question.class <= classNumber,
  );
  if (scoped.length > 0) return scoped.slice(0, 5);

  const fallbackConcepts = getActiveConcepts({ selectedClass, selectedSubject });
  return fallbackConcepts.slice(0, 5).map<SkillCheckQuestion>((concept, index) => ({
    id: `fallback-skill-${index + 1}`,
    conceptId: concept.id,
    prompt: `How comfortable are you with ${concept.name}?`,
    class: concept.class,
    subject: concept.subject,
  }));
}

export function getQuizQuestionForConcept(conceptId: string): QuizQuestion | null {
  return quizQuestions.find((question) => question.conceptId === conceptId) ?? null;
}

export function getQuizQuestionsForConcept(conceptId: string): QuizQuestion[] {
  return quizQuestions.filter((question) => question.conceptId === conceptId);
}

export function getQuizQuestionsForConcepts(conceptIds: string[]): QuizQuestion[] {
  const allowed = new Set(conceptIds);
  return quizQuestions.filter((question) => allowed.has(question.conceptId));
}

export function analyzeMistakes(incorrectConceptIds: string[]): string | null {
  if (incorrectConceptIds.length === 0) return null;
  const frequency = incorrectConceptIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(frequency).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function getOrCreateUserId() {
  if (!isBrowser()) return "guest_user";
  const existing = localStorage.getItem(storageKeys.userId);
  if (existing) return existing;
  const generated = `user_${Date.now()}`;
  localStorage.setItem(storageKeys.userId, generated);
  return generated;
}

function appendLearningEvent(event: LearningEvent) {
  const currentEvents = loadLearningEvents();
  const nextEvents = [...currentEvents, event];
  localStorage.setItem(storageKeys.learningEvents, JSON.stringify(nextEvents));
}

export function initializeLearningState({
  selectedClass,
  selectedSubject,
  answers,
}: {
  selectedClass: string;
  selectedSubject: string;
  answers: Record<string, SkillAnswer>;
}) {
  if (!isBrowser()) return;

  const timestamp = Date.now();
  const userId = getOrCreateUserId();
  const activeConceptIds = new Set(
    getActiveConcepts({ selectedClass, selectedSubject }).map((concept) => concept.id),
  );

  const knowledgeState: UserKnowledgeState[] = concepts.map((concept) => ({
    user_id: userId,
    concept_id: concept.id,
    mastery_score: activeConceptIds.has(concept.id)
      ? answerToMastery(answers[concept.id] ?? "no")
      : 0.1,
    exposure_score: baseExposure,
    confusion_score: baseConfusion,
    last_updated: timestamp,
    last_mastery_update_reason: "skill_onboarding",
  }));

  localStorage.setItem(storageKeys.userClass, selectedClass);
  localStorage.setItem(storageKeys.userSubject, selectedSubject);
  localStorage.setItem(storageKeys.concepts, JSON.stringify(concepts));
  localStorage.setItem(storageKeys.relationships, JSON.stringify(relationships));
  localStorage.setItem(storageKeys.graphDataVersion, GRAPH_DATA_VERSION);
  localStorage.setItem(
    storageKeys.userKnowledgeState,
    JSON.stringify(knowledgeState),
  );
  localStorage.setItem(storageKeys.learningEvents, JSON.stringify([]));
  localStorage.setItem(storageKeys.quizAttempts, JSON.stringify([]));
}

export function updateKnowledgeState(
  conceptId: string,
  updater: (current: UserKnowledgeState) => UserKnowledgeState,
) {
  if (!isBrowser()) return null;

  const currentState = loadKnowledgeState();
  const target = currentState.find((item) => item.concept_id === conceptId);

  if (!target) return null;

  const updatedEntry = updater(target);
  const normalizedEntry: UserKnowledgeState = {
    ...updatedEntry,
    mastery_score: clampScore(updatedEntry.mastery_score),
    exposure_score: clampScore(updatedEntry.exposure_score),
    confusion_score: clampScore(updatedEntry.confusion_score),
    last_updated: Date.now(),
    last_mastery_update_reason: updatedEntry.last_mastery_update_reason,
  };

  const nextState = currentState.map((item) =>
    item.concept_id === conceptId ? normalizedEntry : item,
  );

  localStorage.setItem(storageKeys.userKnowledgeState, JSON.stringify(nextState));

  return nextState;
}

export function applyLearningEvent(
  conceptId: string,
  eventType: LearningEventType,
): UserKnowledgeState[] | null {
  const userId = getOrCreateUserId();

  const nextState = updateKnowledgeState(conceptId, (current) => {
    const base = applyInteractionGapAdjustment(current);

    if (eventType === "view") {
      return {
        ...base,
        exposure_score: base.exposure_score + 0.1,
        confusion_score: clampScore(
          Math.max(0, base.confusion_score - VIEW_CONFUSION_DECAY),
        ),
        last_mastery_update_reason: "learning_event",
      };
    }
    if (eventType === "quiz_correct") {
      return {
        ...base,
        mastery_score: base.mastery_score + UI_MASTERY_QUIZ_CORRECT_BUMP,
        confusion_score: base.confusion_score - 0.05,
        last_mastery_update_reason: "learning_event",
      };
    }
    if (eventType === "quiz_wrong") {
      return {
        ...base,
        mastery_score: base.mastery_score - UI_MASTERY_QUIZ_WRONG_DROP,
        confusion_score: base.confusion_score + 0.12,
        last_mastery_update_reason: "learning_event",
      };
    }
    if (eventType === "doubt" || eventType === "confusing") {
      return {
        ...base,
        confusion_score: base.confusion_score + 0.1,
        last_mastery_update_reason: "learning_event",
      };
    }
    if (eventType === "understood") {
      return {
        ...base,
        mastery_score: base.mastery_score + UI_MASTERY_UNDERSTOOD_BUMP,
        last_mastery_update_reason: "learning_event",
      };
    }
    return base;
  });

  appendLearningEvent({
    user_id: userId,
    concept_id: conceptId,
    event_type: eventType,
    timestamp: Date.now(),
  });

  return nextState;
}

/**
 * Single source of truth for converting an assessment outcome into a 0–1 “quiz mastery” snapshot.
 * Components: 60% accuracy, 20% speed (vs ~2 min), 20% inverse hint density.
 */
function calculateMasteryFromQuiz({
  correctCount,
  totalQuestions,
  timeTakenSeconds,
  hintsUsed,
}: {
  correctCount: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  hintsUsed: number;
}) {
  const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const speed = clampScore(1 - timeTakenSeconds / 120);
  const hintsRatio = clampScore(hintsUsed / Math.max(1, totalQuestions));
  const mastery = 0.6 * accuracy + 0.2 * speed + 0.2 * (1 - hintsRatio);

  return {
    mastery: clampScore(mastery),
    accuracy,
    speed,
    hintsRatio,
  };
}

function appendQuizAttempt(attempt: QuizAttempt) {
  const attempts = loadQuizAttempts();
  localStorage.setItem(storageKeys.quizAttempts, JSON.stringify([...attempts, attempt]));
}

export function submitQuizAttempt({
  conceptId,
  correctCount,
  totalQuestions,
  timeTakenSeconds,
  hintsUsed,
  meta,
}: {
  conceptId: string;
  correctCount: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  hintsUsed: number;
  meta?: QuizAttemptMeta;
}) {
  const userId = getOrCreateUserId();
  const currentState = loadKnowledgeState();
  const targetRow = currentState.find((item) => item.concept_id === conceptId);
  if (!targetRow) return null;

  const target = applyInteractionGapAdjustment(targetRow);

  const { mastery: rawQuizMastery, accuracy } = calculateMasteryFromQuiz({
    correctCount,
    totalQuestions,
    timeTakenSeconds,
    hintsUsed,
  });

  const transitivePreds = getTransitivePrerequisiteIds(conceptId, relationships);
  const prerequisiteMasteries = [...transitivePreds]
    .map((id) => currentState.find((item) => item.concept_id === id)?.mastery_score)
    .filter((score): score is number => typeof score === "number");
  const prerequisiteCap =
    prerequisiteMasteries.length > 0 ? Math.min(...prerequisiteMasteries) : 1;

  const hardCapped = Math.min(rawQuizMastery, prerequisiteCap);
  const effectiveQuizSignal = clampScore(
    SOFT_CAP_BLEND * hardCapped + (1 - SOFT_CAP_BLEND) * rawQuizMastery,
  );

  const priorAttempts = loadQuizAttempts().filter((a) => a.concept_id === conceptId).length;
  const emaPreviousWeight =
    priorAttempts === 0 ? QUIZ_EMA_ALPHA_PREVIOUS_FIRST_ATTEMPT : QUIZ_EMA_ALPHA_PREVIOUS;
  const nextMastery = clampScore(
    emaPreviousWeight * target.mastery_score +
      (1 - emaPreviousWeight) * effectiveQuizSignal,
  );

  const nextExposure = target.exposure_score + 0.2;
  const wrongRatio = 1 - accuracy;
  const proposedConfusion = clampScore(
    target.confusion_score + wrongRatio * 0.11 + clampScore(hintsUsed / 10) * 0.09,
  );
  let nextConfusion = clampScore(
    0.72 * target.confusion_score + 0.28 * proposedConfusion,
  );
  if (accuracy >= 0.8) {
    nextConfusion = clampScore(nextConfusion * 0.96);
  }

  let nextState: UserKnowledgeState[] = currentState.map(
    (item): UserKnowledgeState =>
      item.concept_id === conceptId
        ? {
            ...item,
            mastery_score: nextMastery,
            exposure_score: clampScore(nextExposure),
            confusion_score: nextConfusion,
            last_updated: Date.now(),
            last_mastery_update_reason: "quiz_attempt",
          }
        : item,
  );

  nextState = applyWeakSubtopicConfusionSpread(conceptId, meta, nextState, concepts);

  localStorage.setItem(storageKeys.userKnowledgeState, JSON.stringify(nextState));

  appendQuizAttempt({
    user_id: userId,
    concept_id: conceptId,
    correct_count: correctCount,
    total_questions: totalQuestions,
    time_taken_seconds: timeTakenSeconds,
    hints_used: hintsUsed,
    mastery_score: nextMastery,
    timestamp: Date.now(),
    meta,
    mastery_update_reason: "quiz_attempt",
  });

  appendLearningEvent({
    user_id: userId,
    concept_id: conceptId,
    event_type: accuracy >= 0.5 ? "quiz_correct" : "quiz_wrong",
    timestamp: Date.now(),
  });

  return nextState;
}

export function resetLearningState() {
  if (!isBrowser()) return;
  Object.values(storageKeys).forEach((key) => localStorage.removeItem(key));
}
