"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/lib/types";

const EXAMPLES = [
  "ขอ 3 ชิ้น ประกันสุขภาพ สำหรับเด็กจบใหม่ แบบเล่าเรื่อง โทนเป็นกันเอง ภาพเดี่ยวพร้อม CTA",
  "2 reassuring educational posts about annuity for happy retirement, single image with CTA",
  "Make 4 warm story ads about CI for young families, single image with a CTA",
  "อยากได้คอนเทนต์ประกันสะสมทรัพย์ครับ",
];

export function ChatPanel({
  messages,
  streamingText,
  busy,
  onSend,
  onStop,
}: {
  messages: ChatMessage[];
  streamingText: string;
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, streamingText]);

  const submit = () => {
    if (!draft.trim() || busy) return;
    onSend(draft.trim());
    setDraft("");
  };

  return (
    <section className="flex min-h-0 flex-col border-zinc-200 bg-white max-lg:h-[45dvh] max-lg:border-b lg:w-[420px] lg:shrink-0 lg:border-r dark:border-zinc-800 dark:bg-zinc-900">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !busy && (
          <div className="space-y-3 text-sm text-zinc-500">
            <p>
              Describe what you need: <b>product</b>, <b>segment</b>, <b>style</b>, <b>tone</b>, <b>format</b> and{" "}
              <b>how many pieces</b> (1–10). Thai or English. I&apos;ll ask if something is missing.
            </p>
            <p className="text-xs">
              Products: Endowment · Annuity · Health · CI — Segments: Young Families · Happy Retirement · First Jobber
            </p>
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => onSend(ex)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-left text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {busy && <Bubble message={{ role: "assistant", content: streamingText || "…" }} streaming />}
        <div ref={endRef} />
      </div>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder="e.g. 3 warm story posts about Health for First Jobber…"
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
          {busy ? (
            <button onClick={onStop} className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-300 dark:bg-zinc-700">
              Stop
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
            >
              Send
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-zinc-400">Enter to send · Shift+Enter for a new line</p>
      </div>
    </section>
  );
}

function Bubble({ message, streaming }: { message: ChatMessage; streaming?: boolean }) {
  const user = message.role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          user ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
        } ${streaming ? "animate-pulse-subtle" : ""}`}
      >
        {user ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="chat-md">
            {/* single newlines from the stream are line breaks, not paragraph joins */}
            <ReactMarkdown>{message.content.replace(/([^\n])\n(?!\n)/g, "$1  \n")}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
