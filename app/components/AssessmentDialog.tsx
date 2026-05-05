"use client";

import { useCallback, useEffect, useState } from "react";
import type { Concept, QuizAttemptMeta } from "../types/knowledgeGraph";
import type { AiAssessmentQuestion } from "../types/aiAssessment";

type AssessmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concept: Concept | null;
  onAttemptRecorded: (payload: {
    correctCount: number;
    totalQuestions: number;
    timeTakenSeconds: number;
    hintsUsed: number;
    conceptId: string;
    meta?: QuizAttemptMeta;
  }) => void;
};

type FeedbackPayload = {
  weakAreas: string[];
  personalizedPlan: string;
  encouragement: string;
};

type QuizResultRow = {
  questionId: string;
  prompt: string;
  chosen: string | null;
  correctAnswer: string;
  wasCorrect: boolean;
  subtopic?: string;
};

/** Always-available revision note built from misses (used if Gemini is slow or fails). */
function buildLocalPostQuizFeedback(
  concept: Concept,
  results: QuizResultRow[],
  pct: number,
): FeedbackPayload {
  const misses = results.filter((r) => !r.wasCorrect);
  const weakAreas = misses.map((r) => {
    const st = r.subtopic?.trim();
    if (st) return st;
    return r.prompt.length > 80 ? `${r.prompt.slice(0, 80)}…` : r.prompt;
  });
  const uniqueWeak = [...new Set(weakAreas)].slice(0, 10);

  const missedBullets =
    misses.length === 0
      ? [
          "• No misses — skim prerequisites on the graph anyway so the next topic stays easy.",
        ]
      : misses.map((r) => {
          const head = r.subtopic ? `${r.subtopic}: ` : "";
          const body = r.prompt.length > 120 ? `${r.prompt.slice(0, 120)}…` : r.prompt;
          return `• ${head}${body}`;
        });

  const personalizedPlan = [
    `Score: ${pct.toFixed(0)}% on “${concept.name}” (${concept.chapter}).`,
    "",
    "What looks weakest right now",
    ...missedBullets,
    "",
    "What to revise next (concrete)",
    "1) Re-read the Explore section for this concept and write definitions in your own words.",
    "2) For each bullet above, redo one similar example from your textbook or notes.",
    "3) If a miss names a sub-topic, search that phrase in your notes and add one worked example.",
    "4) When ready, run ★ Start assessment again on this node or a prerequisite the graph highlights.",
  ].join("\n");

  const encouragement =
    pct >= 85
      ? "Strong round — polish the few gaps above and you will lock this topic in."
      : pct >= 60
        ? "Good foundation — the bullets above are your fastest review queue."
        : "Treat this as a map, not a verdict — follow the steps and your next attempt will climb.";

  return {
    weakAreas:
      uniqueWeak.length > 0 ? uniqueWeak : ["Overall understanding — follow the checklist below"],
    personalizedPlan,
    encouragement,
  };
}

export function AssessmentDialog({
  open,
  onOpenChange,
  concept,
  onAttemptRecorded,
}: AssessmentDialogProps) {
  const [generationKey, setGenerationKey] = useState(0);
  const [phase, setPhase] = useState<"idle" | "loading" | "quiz" | "results" | "error">(
    "idle",
  );
  const [questions, setQuestions] = useState<AiAssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackPayload | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [generationMeta, setGenerationMeta] = useState<{
    modelUsed?: string;
    questionsFingerprint?: string;
  }>({});
  const [quizResults, setQuizResults] = useState<QuizResultRow[]>([]);

  const resetDialogUi = useCallback(() => {
    setPhase("idle");
    setQuestions([]);
    setAnswers({});
    setErrorMessage("");
    setStartedAt(null);
    setScore(null);
    setFeedback(null);
    setFeedbackLoading(false);
    setGenerationKey(0);
    setGenerationMeta({});
    setQuizResults([]);
  }, []);

  useEffect(() => {
    if (!open || !concept?.id) return;
    const c = concept;

    let cancelled = false;

    async function generate() {
      setPhase("loading");
      setErrorMessage("");
      setAnswers({});
      setScore(null);
      setFeedback(null);
      setQuestions([]);
      setQuizResults([]);
      setGenerationMeta({});
      try {
        const res = await fetch("/api/gemini-assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "generate",
            concept: {
              id: c.id,
              name: c.name,
              description: c.description,
              exploreContent: c.exploreContent,
              class: c.class,
              subject: c.subject,
              chapter: c.chapter,
            },
          }),
        });
        const data = (await res.json()) as {
          questions?: AiAssessmentQuestion[];
          modelUsed?: string;
          questionsFingerprint?: string;
          error?: string;
          detail?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.questions?.length) {
          const hint = (data as { hint?: string }).hint ?? "";
          const detail = (data as { detail?: string }).detail ?? "";
          const base = data.error ?? `Request failed (${res.status})`;
          throw new Error(
            [base, detail && `— ${detail}`, hint && `(${hint})`].filter(Boolean).join(" "),
          );
        }
        setQuestions(data.questions);
        setGenerationMeta({
          modelUsed: data.modelUsed,
          questionsFingerprint:
            data.questionsFingerprint ?? data.questions.map((q) => q.id).join("|"),
        });
        setStartedAt(Date.now());
        setPhase("quiz");
      } catch (e) {
        if (cancelled) return;
        setPhase("error");
        setErrorMessage(e instanceof Error ? e.message : "Could not generate assessment.");
      }
    }

    void generate();
    return () => {
      cancelled = true;
    };
  }, [open, concept, generationKey]);

  useEffect(() => {
    if (open) return;
    queueMicrotask(resetDialogUi);
  }, [open, resetDialogUi]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const submitAssessment = async () => {
    if (!concept || questions.length === 0 || !startedAt) return;

    let correct = 0;
    const results: QuizResultRow[] = questions.map((q) => {
      const chosen = answers[q.id] ?? null;
      const wasCorrect = chosen !== null && chosen === q.correctAnswer;
      if (wasCorrect) correct += 1;
      return {
        questionId: q.id,
        prompt: q.prompt,
        chosen,
        correctAnswer: q.correctAnswer,
        wasCorrect,
        subtopic: q.subtopic,
      };
    });
    setQuizResults(results);

    const total = questions.length;
    const pct = total > 0 ? (correct / total) * 100 : 0;
    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    const subtopic_breakdown: NonNullable<QuizAttemptMeta["subtopic_breakdown"]> = {};
    for (const r of results) {
      const key = (r.subtopic && r.subtopic.trim()) || "_general";
      const slot = subtopic_breakdown[key] ?? { wrong: 0, total: 0 };
      slot.total += 1;
      if (!r.wasCorrect) slot.wrong += 1;
      subtopic_breakdown[key] = slot;
    }

    const meta: QuizAttemptMeta = {
      source: "gemini_assessment",
      model_used: generationMeta.modelUsed,
      questions_fingerprint:
        generationMeta.questionsFingerprint ?? questions.map((q) => q.id).join("|"),
      subtopic_breakdown,
    };

    setScore({ correct, total });
    setPhase("results");

    onAttemptRecorded({
      conceptId: concept.id,
      correctCount: correct,
      totalQuestions: total,
      timeTakenSeconds,
      hintsUsed: 0,
      meta,
    });

    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/gemini-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "feedback",
          concept: {
            id: concept.id,
            name: concept.name,
            description: concept.description,
            exploreContent: concept.exploreContent,
            class: concept.class,
            subject: concept.subject,
            chapter: concept.chapter,
          },
          scorePercent: pct,
          correctCount: correct,
          totalQuestions: total,
          results,
        }),
      });
      const data = (await res.json()) as FeedbackPayload & { error?: string };
      const localFb = buildLocalPostQuizFeedback(concept, results, pct);
      if (res.ok) {
        const aiWeak = data.weakAreas ?? [];
        const aiPlan = (data.personalizedPlan ?? "").trim();
        const aiEnc = (data.encouragement ?? "").trim();
        setFeedback({
          weakAreas: aiWeak.length
            ? [...new Set([...aiWeak, ...localFb.weakAreas])].slice(0, 12)
            : localFb.weakAreas,
          personalizedPlan:
            aiPlan.length >= 60
              ? `${aiPlan}\n\n---\nFrom your quiz misses (always shown)\n${localFb.personalizedPlan}`
              : `${localFb.personalizedPlan}${aiPlan ? `\n\n(Gemini add-on)\n${aiPlan}` : ""}`,
          encouragement: aiEnc || localFb.encouragement,
        });
      } else {
        setFeedback({
          weakAreas: localFb.weakAreas,
          personalizedPlan: [
            localFb.personalizedPlan,
            "",
            "Gemini note unavailable:",
            data.error ??
              "Check GEMINI_API_KEY in .env.local and restart next dev — the checklist above still applies.",
          ].join("\n"),
          encouragement: localFb.encouragement,
        });
      }
    } catch {
      setFeedback(buildLocalPostQuizFeedback(concept, results, pct));
    } finally {
      setFeedbackLoading(false);
    }
  };

  const allAnswered =
    questions.length > 0 && questions.every((q) => answers[q.id] !== undefined && answers[q.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const newAttempt = () => {
    setGenerationKey((k) => k + 1);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assessment-dialog-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-violet-500/30 bg-[#0f1428] shadow-2xl shadow-violet-950/60"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 id="assessment-dialog-title" className="text-base font-semibold text-white">
              AI assessment (Gemini)
            </h2>
            {concept && (
              <p className="mt-0.5 text-xs text-slate-400">
                {concept.name} • Class {concept.class} • {concept.subject.toUpperCase()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded px-2 py-1 text-sm text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {phase === "loading" && (
            <p className="text-sm text-slate-300">Generating 6 tailored questions…</p>
          )}

          {phase === "error" && (
            <div className="space-y-2 text-sm">
              <p className="text-rose-200">{errorMessage}</p>
              <p className="text-xs text-slate-500">
                Add <code className="text-violet-300">GEMINI_API_KEY</code> to{" "}
                <code className="text-violet-300">.env.local</code> and restart{" "}
                <code className="text-violet-300">next dev</code>.
              </p>
            </div>
          )}

          {phase === "quiz" && (
            <div className="space-y-5">
              {questions.map((q, qi) => (
                <fieldset key={q.id} className="rounded-lg border border-white/10 bg-[#161c36] p-3">
                  <legend className="px-1 text-xs font-medium text-violet-200">
                    Question {qi + 1} / {questions.length}
                    {q.subtopic ? ` · ${q.subtopic}` : ""}
                  </legend>
                  <p className="mb-3 text-sm text-slate-100">{q.prompt}</p>
                  <div className="grid gap-2">
                    {q.options.map((opt) => (
                      <label
                        key={opt}
                        className={`flex cursor-pointer gap-2 rounded-md border px-2 py-2 text-xs transition ${
                          answers[q.id] === opt
                            ? "border-violet-400 bg-violet-500/20 text-violet-50"
                            : "border-white/10 bg-[#12162c] text-slate-200 hover:border-violet-400/40"
                        }`}
                      >
                        <input
                          type="radio"
                          className="mt-0.5"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [q.id]: opt,
                            }))
                          }
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {phase === "results" && score && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3">
                <p className="font-medium text-emerald-100">Your score</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
                </p>
              </div>

              {quizResults.some((r) => !r.wasCorrect) && (
                <div className="rounded-lg border border-rose-400/25 bg-rose-950/30 p-3">
                  <p className="mb-2 text-xs font-medium text-rose-100">Questions to revisit</p>
                  <ul className="max-h-40 space-y-2 overflow-y-auto text-xs text-slate-200">
                    {quizResults
                      .filter((r) => !r.wasCorrect)
                      .map((r) => (
                        <li key={r.questionId} className="rounded border border-white/10 bg-black/20 p-2">
                          {r.subtopic && (
                            <p className="mb-0.5 text-[10px] font-medium text-amber-200/95">{r.subtopic}</p>
                          )}
                          <p className="text-slate-300">{r.prompt}</p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            Your answer: {r.chosen ?? "(none)"} · Correct: {r.correctAnswer}
                          </p>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {feedbackLoading && (
                <p className="text-xs text-slate-400">
                  Gemini is drafting weak spots and a personalized learning plan…
                </p>
              )}

              {feedback && (
                <div className="rounded-lg border border-violet-400/30 bg-violet-950/25 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-200/95">
                    Tutor note — weak parts & what to revise
                  </p>
                  {feedback.encouragement && (
                    <p className="mb-3 text-xs text-violet-100">{feedback.encouragement}</p>
                  )}
                  {feedback.weakAreas.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-medium text-amber-200">Weak areas (topics / skills)</p>
                      <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-300">
                        {feedback.weakAreas.map((w, i) => (
                          <li key={`${i}-${w.slice(0, 48)}`}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {feedback.personalizedPlan && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-200">Personalized plan</p>
                      <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">
                        {feedback.personalizedPlan}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-md border border-white/15 px-3 py-2 text-xs text-slate-200 hover:bg-white/5"
          >
            Close
          </button>
          {phase === "quiz" && (
            <button
              type="button"
              disabled={!allAnswered}
              onClick={() => void submitAssessment()}
              className="flex-1 rounded-md bg-violet-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-violet-500/40"
            >
              Submit answers
            </button>
          )}
          {(phase === "results" || phase === "error") && concept && (
            <button
              type="button"
              onClick={() => newAttempt()}
              className="flex-1 rounded-md border border-violet-400/40 px-3 py-2 text-xs text-violet-100 hover:bg-violet-500/15"
            >
              New attempt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
