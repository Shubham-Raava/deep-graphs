"use client";

import { useMemo, useState } from "react";
import {
  getSkillQuestionsForSelection,
  initializeLearningState,
} from "../lib/localStorageState";
import type { SkillAnswer, SkillCheckQuestion } from "../types/knowledgeGraph";
import { ClassSelection } from "./ClassSelection";
import { SkillCheck } from "./SkillCheck";

type OnboardingFlowProps = {
  onComplete: () => void;
};

const classOptions = [
  { label: "Class 9", value: "class_9" },
];

const subjectOptions = [
  { label: "Math", value: "math" },
  { label: "Physics", value: "physics" },
  { label: "Chemistry", value: "chemistry" },
  { label: "Biology", value: "biology" },
  { label: "English", value: "english" },
  { label: "Social science", value: "social_science" },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, SkillAnswer>>({});

  const scopedSkillQuestions = useMemo<SkillCheckQuestion[]>(() => {
    if (!selectedClass || !selectedSubject) return [];
    return getSkillQuestionsForSelection({ selectedClass, selectedSubject });
  }, [selectedClass, selectedSubject]);

  const progressPercent = (step / 3) * 100;
  const areAllAnswersComplete = scopedSkillQuestions.every(
    (question) => !!answers[question.conceptId],
  );

  const canContinue = useMemo(() => {
    if (step === 1) return selectedClass !== null;
    if (step === 2) return selectedSubject !== null;
    return areAllAnswersComplete;
  }, [areAllAnswersComplete, selectedClass, selectedSubject, step]);

  const handleNext = () => {
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }

    if (!selectedClass || !selectedSubject) return;

    initializeLearningState({
      selectedClass,
      selectedSubject,
      answers,
    });
    onComplete();
  };

  const handleBack = () => {
    setStep((current) => Math.max(1, current - 1));
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090d1a] px-4 py-10 text-slate-100">
      <section className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#11142a] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)] sm:p-8">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
            <span>Learning Setup</span>
            <span>{`Step ${step} / 3`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#242949]">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div
          key={step}
          className="min-h-64 transition-all duration-300"
        >
          {step === 1 && (
            <ClassSelection
              title="Select your class"
              subtitle="This helps tailor concept progression to your level."
              options={classOptions}
              selectedValue={selectedClass}
              onSelect={(value) => {
                setSelectedClass(value);
                setAnswers({});
              }}
            />
          )}

          {step === 2 && (
            <ClassSelection
              title="Select your subject"
              subtitle="Pick the primary subject to focus on first."
              options={subjectOptions}
              selectedValue={selectedSubject}
              onSelect={(value) => {
                setSelectedSubject(value);
                setAnswers({});
              }}
            />
          )}

          {step === 3 && (
            <SkillCheck
              questions={scopedSkillQuestions}
              answers={answers}
              onAnswerChange={(conceptId, answer) =>
                setAnswers((prev) => ({ ...prev, [conceptId]: answer }))
              }
            />
          )}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="rounded-md border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-violet-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canContinue}
            className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-violet-500/50"
          >
            {step === 3 ? "Finish Setup" : "Continue"}
          </button>
        </div>
      </section>
    </main>
  );
}
