/** Snapshot of learner + graph state sent with each tutor chat turn (server builds prompt from this). */
export type TutorContextSnapshot = {
  profile: { userClass: string; userSubject: string };
  selectedConcept: null | {
    id: string;
    name: string;
    chapter: string;
    subject: string;
    description: string;
    exploreSnippet: string;
  };
  prerequisiteNames: string[];
  dependentNames: string[];
  coverage: {
    engagedPercent: number;
    engagedCount: number;
    totalInScope: number;
    neverEngagedCount: number;
    blockingPrerequisiteNames: string[];
  };
  nextBest: null | { name: string; reason: string };
  scoreRows: Array<{
    conceptId: string;
    name: string;
    mastery: number;
    confusion: number;
    exposure: number;
  }>;
  recentEvents: Array<{
    conceptId: string;
    event_type: string;
    at: number;
  }>;
};

export type TutorChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TutorChatRequestBody = {
  messages: TutorChatMessage[];
  context: TutorContextSnapshot;
};

export type TutorChatResponseBody = {
  reply?: string;
  modelUsed?: string;
  error?: string;
  detail?: string;
};
