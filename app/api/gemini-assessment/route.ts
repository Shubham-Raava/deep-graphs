import { NextResponse } from "next/server";
import type {
  AiAssessmentFeedbackPayload,
  AiAssessmentGeneratePayload,
  AiAssessmentQuestion,
} from "../../types/aiAssessment";

/** Strict server-side validation so clients never see broken MCQs. */
function validateMcqQuestions(questions: AiAssessmentQuestion[] | undefined): AiAssessmentQuestion[] {
  if (!Array.isArray(questions)) return [];
  const out: AiAssessmentQuestion[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q.prompt !== "string" || !q.prompt.trim()) continue;
    const opts = (q.options ?? []).map((o) => String(o).trim()).slice(0, 4);
    if (opts.length !== 4) continue;
    if (new Set(opts).size !== 4) continue;
    const correct = String(q.correctAnswer).trim();
    if (!opts.includes(correct)) continue;
    out.push({
      id: typeof q.id === "string" && q.id ? q.id : `ai-q-${i + 1}`,
      prompt: q.prompt.trim(),
      options: opts,
      correctAnswer: correct,
      explanation: typeof q.explanation === "string" ? q.explanation : "",
      subtopic: typeof q.subtopic === "string" ? q.subtopic : undefined,
    });
  }
  return out;
}

/**
 * Override with GEMINI_MODEL in .env.local if one model fails in your region/account.
 * Otherwise we try these in order until one succeeds.
 */
const DEFAULT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
] as const;

const MODEL_CANDIDATES = process.env.GEMINI_MODEL?.trim()
  ? [process.env.GEMINI_MODEL.trim()]
  : [...DEFAULT_MODELS];

function geminiUrl(model: string, key: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
}

type GeminiRaw = {
  error?: { message?: string; code?: number; status?: string };
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

function extractTextFromGemini(raw: unknown): { text: string; debug?: string } {
  const d = raw as GeminiRaw;
  if (d.error?.message) {
    return { text: "", debug: d.error.message };
  }
  const block = d.promptFeedback?.blockReason;
  if (block) {
    return { text: "", debug: `blocked: ${block}` };
  }
  const cand = d.candidates?.[0];
  if (!cand) {
    return { text: "", debug: "no candidates (check API key / safety / model name)" };
  }
  if (cand.finishReason && cand.finishReason !== "STOP" && cand.finishReason !== "MAX_TOKENS") {
    const parts = cand.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") ?? "";
    if (!parts) {
      return { text: "", debug: `finishReason: ${cand.finishReason}` };
    }
    return { text: parts };
  }
  const text = cand.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") ?? "";
  return { text };
}

function unwrapJsonFence(text: string): string {
  let t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) t = fence[1].trim();
  return t;
}

async function geminiGenerate(
  key: string,
  prompt: string,
  wantJsonMime: boolean,
): Promise<{ ok: true; text: string; modelUsed: string } | { ok: false; detail: string }> {
  const bodyBase = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: wantJsonMime ? 0.55 : 0.5,
      maxOutputTokens: 8192,
      ...(wantJsonMime ? { responseMimeType: "application/json" as const } : {}),
    },
  };

  const errors: string[] = [];

  for (const model of MODEL_CANDIDATES) {
    const res = await fetch(geminiUrl(model, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyBase),
    });

    const raw = (await res.json()) as GeminiRaw;

    if (!res.ok) {
      errors.push(
        `${model}: HTTP ${res.status} ${raw.error?.message ?? JSON.stringify(raw).slice(0, 180)}`,
      );
      continue;
    }

    const { text, debug } = extractTextFromGemini(raw);
    if (!text.trim()) {
      errors.push(`${model}: empty response ${debug ? `(${debug})` : ""}`);
      continue;
    }

    return { ok: true, text: unwrapJsonFence(text), modelUsed: model };
  }

  return { ok: false, detail: errors.join(" | ").slice(0, 900) };
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Set GEMINI_API_KEY in .env.local (server-side only)." },
      { status: 501 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = (body as { mode?: string }).mode;
  if (mode === "generate") {
    const { concept } = body as { concept: AiAssessmentGeneratePayload["concept"] };
    if (!concept?.name || !concept.id) {
      return NextResponse.json({ error: "Missing concept payload" }, { status: 400 });
    }

    const prompt = `You write Indian NCERT-style multiple-choice drills (Classes 6–10).
Create exactly 6 NEW questions ONLY about this concept (not trivia about metadata):
Name: ${concept.name}
Chapter: ${concept.chapter}, Class ${concept.class}, Subject: ${concept.subject}
Definition-style summary: ${concept.description}
Teaching notes:\n${concept.exploreContent}

Rules:
- Each question must have exactly 4 distinct string options.
- correctAnswer must EXACTLY equal one of the four options (verbatim).
- Mix difficulty: 2 recall, 2 application, 2 short micro-problem style.

Return ONLY valid JSON (no markdown fences) with this shape:
{"questions":[{"id":"q1","prompt":"...","options":["a","b","c","d"],"correctAnswer":"a","explanation":"...","subtopic":"optional"}]}`;

    let modelUsed = "";
    let parsed: { questions?: AiAssessmentQuestion[] };
    try {
      const first = await geminiGenerate(key, prompt, true);
      if (!first.ok) {
        return NextResponse.json(
          {
            error: "Gemini call failed for all configured models.",
            detail: first.detail,
            hint: 'Try GEMINI_MODEL=gemini-1.5-flash in .env.local or verify your API key at https://aistudio.google.com/apikey',
          },
          { status: 502 },
        );
      }
      modelUsed = first.modelUsed;
      parsed = JSON.parse(first.text) as { questions?: AiAssessmentQuestion[] };
    } catch {
      try {
        const second = await geminiGenerate(key, prompt, false);
        if (!second.ok) {
          return NextResponse.json(
            {
              error: "Model returned non-JSON",
              detail: second.detail,
            },
            { status: 502 },
          );
        }
        modelUsed = second.modelUsed;
        parsed = JSON.parse(unwrapJsonFence(second.text)) as { questions?: AiAssessmentQuestion[] };
      } catch (e2) {
        return NextResponse.json(
          {
            error: "Could not parse questions JSON",
            detail: e2 instanceof Error ? e2.message : "parse error",
          },
          { status: 502 },
        );
      }
    }

    const questions = validateMcqQuestions(parsed.questions).slice(0, 7);

    if (questions.length < 5) {
      return NextResponse.json(
        { error: "Model returned too few valid questions after validation", sample: questions },
        { status: 502 },
      );
    }

    const fingerprint = questions.map((q) => q.id).join("|");
    return NextResponse.json({ questions, modelUsed, questionsFingerprint: fingerprint });
  }

  if (mode === "feedback") {
    const payload = body as AiAssessmentFeedbackPayload;
    if (!payload.concept?.name || !payload.results?.length) {
      return NextResponse.json({ error: "Missing feedback payload" }, { status: 400 });
    }

    const lines = payload.results
      .map(
        (r, i) =>
          `Q${i + 1} [${r.subtopic ?? "general"}] ${r.prompt}
Student: ${r.chosen ?? "(no answer)"} | Correct: ${r.correctAnswer} | ${r.wasCorrect ? "RIGHT" : "WRONG"}`,
      )
      .join("\n");

    const prompt = `You are a supportive tutor. The student took a short quiz on "${payload.concept.name}" (Class ${payload.concept.class} ${payload.concept.subject}, ${payload.concept.chapter}).
Score: ${payload.correctCount}/${payload.totalQuestions} (${payload.scorePercent.toFixed(0)}%).

Per-question:
${lines}

Return ONLY valid JSON:
{
  "weakAreas": ["2-6 short bullets naming the skill or subtopic behind each miss"],
  "personalizedPlan": "Use clear sections in plain text (no markdown): (1) weakest areas in one sentence each, (2) what to revise first and why, (3) 3-5 numbered concrete actions the student can do today, (4) one sentence on which prerequisite ideas to strengthen if any misses look foundational.",
  "encouragement": "one short warm sentence"
}`;

    let parsed: {
      weakAreas?: string[];
      personalizedPlan?: string;
      encouragement?: string;
    };
    try {
      const first = await geminiGenerate(key, prompt, true);
      if (!first.ok) {
        return NextResponse.json(
          {
            error: "Gemini feedback failed for all configured models.",
            detail: first.detail,
          },
          { status: 502 },
        );
      }
      parsed = JSON.parse(first.text) as typeof parsed;
    } catch {
      try {
        const second = await geminiGenerate(key, prompt, false);
        if (!second.ok) {
          return NextResponse.json({ error: "Feedback non-JSON", detail: second.detail }, { status: 502 });
        }
        parsed = JSON.parse(unwrapJsonFence(second.text)) as typeof parsed;
      } catch (e2) {
        return NextResponse.json(
          {
            error: "Could not parse feedback JSON",
            detail: e2 instanceof Error ? e2.message : "parse error",
          },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({
      weakAreas: parsed.weakAreas ?? [],
      personalizedPlan: parsed.personalizedPlan ?? "",
      encouragement: parsed.encouragement ?? "",
    });
  }

  return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
}
