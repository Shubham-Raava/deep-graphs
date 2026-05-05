"use client";

import type {
  SkillAnswer,
  SkillCheckQuestion,
} from "../types/knowledgeGraph";

type SkillCheckProps = {
  questions: SkillCheckQuestion[];
  answers: Record<string, SkillAnswer>;
  onAnswerChange: (conceptId: string, answer: SkillAnswer) => void;
};

const answerOptions: { value: SkillAnswer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "somewhat", label: "Somewhat" },
  { value: "no", label: "No" },
];

export function SkillCheck({
  questions,
  answers,
  onAnswerChange,
}: SkillCheckProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Initial Skill Check</h2>
        <p className="mt-1 text-sm text-slate-300">
          This quick check initializes your concept mastery state.
        </p>
      </div>

      <div className="space-y-3">
        {questions.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-[#171b35] p-3 text-sm text-slate-300">
            No skill-check questions found for this selection. Continue to initialize
            with default baseline scores.
          </div>
        )}
        {questions.map((question) => (
          <div
            key={question.id}
            className="rounded-lg border border-white/10 bg-[#171b35] p-3"
          >
            <p className="mb-2 text-sm text-slate-100">{question.prompt}</p>
            <div className="grid grid-cols-3 gap-2">
              {answerOptions.map((option) => {
                const isActive = answers[question.conceptId] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onAnswerChange(question.conceptId, option.value)}
                    className={`rounded-md border px-2 py-2 text-xs font-medium transition ${
                      isActive
                        ? "border-violet-300 bg-violet-500/25 text-violet-100"
                        : "border-white/10 bg-[#20264d] text-slate-200 hover:border-violet-400/60"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
