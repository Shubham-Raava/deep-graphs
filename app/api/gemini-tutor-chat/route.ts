import { NextResponse } from "next/server";
import type { TutorChatRequestBody, TutorContextSnapshot } from "../../types/aiTutor";

const DEFAULT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
] as const;

const MODEL_CANDIDATES = process.env.GEMINI_MODEL?.trim()
  ? [process.env.GEMINI_MODEL.trim()]
  : [...DEFAULT_MODELS];

const MAX_USER_MESSAGE_CHARS = 2000;
const MAX_MESSAGES = 24;
const MAX_CONTEXT_JSON_CHARS = 12000;

function geminiUrl(model: string, key: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
}

type GeminiRaw = {
  error?: { message?: string };
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
    return { text: "", debug: "no candidates" };
  }
  const text = cand.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") ?? "";
  return { text };
}

function buildSystemInstruction(context: TutorContextSnapshot): string {
  const json = JSON.stringify(context);
  const trimmed = json.length > MAX_CONTEXT_JSON_CHARS ? json.slice(0, MAX_CONTEXT_JSON_CHARS) + "…" : json;

  return `You are DeepTutor, a friendly study coach for Indian NCERT-style schooling (especially Class 9 when the profile says class_9).

The following JSON is the learner's CURRENT snapshot from our app (mastery, confusion, exposure are approximate 0–1 scores from quizzes and light UI actions — never treat them as exam grades or medical/psychological diagnoses):

${trimmed}

Rules:
- Stay on-topic for school subjects and study skills. Politely refuse unrelated requests (coding malware, personal data, etc.).
- Use the snapshot: reference weak concepts, prerequisites, next-best suggestion, and coverage when helpful.
- Be concise by default; use short paragraphs or bullets. Offer to go deeper if the student asks.
- Encourage honest effort; never shame. Do not claim legal/medical certainty.
- If scores look missing, say the app may still be collecting data.
- Respond in the same language the student writes in when they use a non-English language; default English otherwise.`;
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

  const { messages, context } = body as TutorChatRequestBody;
  if (!context || typeof context !== "object") {
    return NextResponse.json({ error: "Missing context" }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  const trimmedMessages = messages.slice(-MAX_MESSAGES).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    content: typeof m.content === "string" ? m.content.slice(0, MAX_USER_MESSAGE_CHARS) : "",
  }));

  const last = trimmedMessages[trimmedMessages.length - 1];
  if (!last || last.role !== "user" || !last.content.trim()) {
    return NextResponse.json({ error: "Last message must be a non-empty user message" }, { status: 400 });
  }

  const contents = trimmedMessages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const systemInstruction = buildSystemInstruction(context as TutorContextSnapshot);

  const bodyBase = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: {
      temperature: 0.55,
      maxOutputTokens: 2048,
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
      errors.push(`${model}: HTTP ${res.status} ${raw.error?.message ?? ""}`.trim());
      continue;
    }

    const { text, debug } = extractTextFromGemini(raw);
    if (!text.trim()) {
      errors.push(`${model}: empty ${debug ? `(${debug})` : ""}`.trim());
      continue;
    }

    return NextResponse.json({ reply: text.trim(), modelUsed: model });
  }

  return NextResponse.json(
    {
      error: "Gemini tutor chat failed for all configured models.",
      detail: errors.join(" | ").slice(0, 900),
    },
    { status: 502 },
  );
}
