export type Concept = {
  id: string;
  name: string;
  description: string;
  /** Short “textbook vibes” recap for learners (mock copy for now). */
  exploreContent: string;
  class: number;
  subject:
    | "math"
    | "physics"
    | "chemistry"
    | "biology"
    | "english"
    | "social_science";
  chapter: string;
};

export type Relationship = {
  source: string;
  target: string;
};

export type SkillAnswer = "yes" | "somewhat" | "no";

export type SkillCheckQuestion = {
  id: string;
  conceptId: string;
  prompt: string;
  class: number;
  subject: Concept["subject"];
};

/** Why this row’s scores last changed (debugging / product analytics). */
export type MasteryUpdateReason =
  | "quiz_attempt"
  | "learning_event"
  | "skill_onboarding"
  | "spaced_interval"
  | "subtopic_weak_area_spread";

export type UserKnowledgeState = {
  concept_id: string;
  user_id: string;
  mastery_score: number;
  exposure_score: number;
  confusion_score: number;
  last_updated: number;
  last_mastery_update_reason?: MasteryUpdateReason;
};

export type LearningEventType =
  | "view"
  | "quiz_correct"
  | "quiz_wrong"
  | "doubt"
  | "understood"
  | "confusing";

export type LearningEvent = {
  user_id: string;
  concept_id: string;
  event_type: LearningEventType;
  timestamp: number;
};

export type QuizQuestion = {
  id: string;
  conceptId: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  hint?: string;
};

export type QuizAttemptMeta = {
  source?: "gemini_assessment";
  model_used?: string;
  /** Stable hash of question ids for debugging / drift detection */
  questions_fingerprint?: string;
  /** Per subtopic tallies from AI questions when present */
  subtopic_breakdown?: Record<string, { wrong: number; total: number }>;
};

export type QuizAttempt = {
  user_id: string;
  concept_id: string;
  correct_count: number;
  total_questions: number;
  time_taken_seconds: number;
  hints_used: number;
  mastery_score: number;
  timestamp: number;
  meta?: QuizAttemptMeta;
  /** Mirrors persisted learner-state driver for this snapshot */
  mastery_update_reason?: MasteryUpdateReason;
};
