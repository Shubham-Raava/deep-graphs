"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TutorChatMessage,
  TutorChatResponseBody,
  TutorContextSnapshot,
} from "../types/aiTutor";

type TutorChatPanelProps = {
  context: TutorContextSnapshot;
};

export function TutorChatPanel({ context }: TutorChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TutorChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);

    const run = async (thread: TutorChatMessage[]) => {
      setLoading(true);
      try {
        const res = await fetch("/api/gemini-tutor-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: thread, context }),
        });
        const data = (await res.json()) as TutorChatResponseBody;
        if (!res.ok || !data.reply?.trim()) {
          setError(data.error ?? data.detail ?? `Request failed (${res.status})`);
          return;
        }
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply! }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      } finally {
        setLoading(false);
      }
    };

    setMessages((prev) => {
      const thread = [...prev, { role: "user", content: text } satisfies TutorChatMessage];
      void run(thread);
      return thread;
    });
  }, [context, input, loading]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-violet-400/50 bg-gradient-to-br from-violet-600 to-indigo-700 text-xl shadow-lg shadow-violet-950/50 transition hover:scale-105 hover:border-violet-300"
        title={open ? "Close tutor chat" : "Open AI tutor (uses your scores)"}
        aria-expanded={open}
        aria-label="Toggle tutor chat"
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div
          className="pointer-events-auto fixed bottom-[4.5rem] right-4 z-[60] flex h-[min(520px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0f1228] shadow-2xl shadow-black/50"
          role="dialog"
          aria-label="Tutor chat"
        >
          <div className="border-b border-white/10 bg-[#161a34] px-3 py-2">
            <p className="text-sm font-semibold text-violet-100">AI tutor</p>
            <p className="text-[10px] leading-snug text-slate-500">
              Uses your mastery snapshot on each send. Not a substitute for your teacher.
            </p>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && !loading && (
              <p className="text-xs leading-relaxed text-slate-400">
                Ask anything about what you&apos;re studying—weak topics, prerequisites, or how to
                revise. I can see your approximate scores from this session.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
                className={`max-w-[95%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-violet-600/35 text-violet-50"
                    : "mr-auto border border-white/10 bg-[#1a1f3d] text-slate-200"
                }`}
              >
                <span className="mb-1 block text-[9px] font-medium uppercase tracking-wide text-slate-500">
                  {m.role === "user" ? "You" : "Tutor"}
                </span>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {loading && (
              <p className="text-xs italic text-slate-500">Tutor is thinking…</p>
            )}
            {error && (
              <p className="rounded border border-rose-500/30 bg-rose-950/40 px-2 py-1.5 text-xs text-rose-200">
                {error}
              </p>
            )}
          </div>

          <div className="border-t border-white/10 p-2">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Message…"
                rows={2}
                className="min-h-[44px] flex-1 resize-none rounded-md border border-white/15 bg-[#161a34] px-2 py-1.5 text-sm text-white outline-none focus:border-violet-400"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                className="shrink-0 self-end rounded-md bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
