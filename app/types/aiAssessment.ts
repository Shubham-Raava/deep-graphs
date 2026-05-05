export type AiAssessmentQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  subtopic?: string;
};

export type AiAssessmentGeneratePayload = {
  concept: {
    id: string;
    name: string;
    description: string;
    exploreContent: string;
    class: number;
    subject: string;
    chapter: string;
  };
};

export type AiAssessmentFeedbackPayload = AiAssessmentGeneratePayload & {
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  results: {
    questionId: string;
    prompt: string;
    chosen: string | null;
    correctAnswer: string;
    wasCorrect: boolean;
    subtopic?: string;
  }[];
};
