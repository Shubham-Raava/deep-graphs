"use client";

import { useCallback, useState } from "react";
import {
  applyLearningEvent,
  loadConceptsFromStorage,
  loadKnowledgeState,
  loadLearningEvents,
  loadQuizAttempts,
  loadRelationshipsFromStorage,
  loadUserProfile,
  resetLearningState,
  submitQuizAttempt,
} from "../lib/localStorageState";
import type {
  Concept,
  LearningEvent,
  LearningEventType,
  QuizAttempt,
  QuizAttemptMeta,
  Relationship,
  UserKnowledgeState,
} from "../types/knowledgeGraph";

type UserProfile = {
  userClass: string;
  userSubject: string;
};

export function useKnowledgeState() {
  const [concepts] = useState<Concept[]>(() => loadConceptsFromStorage());
  const [relationships] = useState<Relationship[]>(() =>
    loadRelationshipsFromStorage(),
  );
  const [knowledgeState, setKnowledgeState] = useState<UserKnowledgeState[]>(() =>
    loadKnowledgeState(),
  );
  const [learningEvents, setLearningEvents] = useState<LearningEvent[]>(() =>
    loadLearningEvents(),
  );
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>(() =>
    loadQuizAttempts(),
  );
  const [profile, setProfileState] = useState<UserProfile>(() => {
    const loaded = loadUserProfile();
    return {
      userClass: loaded.userClass ?? "class_9",
      userSubject: loaded.userSubject ?? "all",
    };
  });

  const setProfile = useCallback((next: UserProfile) => {
    setProfileState(next);
    localStorage.setItem("user_class", next.userClass);
    localStorage.setItem("user_subject", next.userSubject);
  }, []);

  const handleLearningEvent = useCallback(
    (conceptId: string, eventType: LearningEventType) => {
      const nextState = applyLearningEvent(conceptId, eventType);
      if (nextState) {
        setKnowledgeState(nextState);
        setLearningEvents(loadLearningEvents());
      }
    },
    [],
  );

  const handleQuizAttempt = useCallback(
    (payload: {
      conceptId: string;
      correctCount: number;
      totalQuestions: number;
      timeTakenSeconds: number;
      hintsUsed: number;
      meta?: QuizAttemptMeta;
    }) => {
      const nextState = submitQuizAttempt(payload);
      if (nextState) {
        setKnowledgeState(nextState);
        setLearningEvents(loadLearningEvents());
        setQuizAttempts(loadQuizAttempts());
      }
    },
    [],
  );

  const resetAll = useCallback(() => {
    resetLearningState();
  }, []);

  return {
    concepts,
    relationships,
    knowledgeState,
    learningEvents,
    quizAttempts,
    profile,
    setProfile,
    handleLearningEvent,
    handleQuizAttempt,
    resetAll,
  };
}
