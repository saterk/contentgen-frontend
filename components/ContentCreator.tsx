"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getHealth, getItem, streamChat } from "@/lib/api";
import { logout, useSession } from "@/lib/auth";
import { Brand } from "./Logo";
import type { ChatMessage, Health, Item, Mode, PieceState, Run, XEvent } from "@/lib/types";
import { ChatPanel } from "./ChatPanel";
import { ItemDrawer } from "./ItemDrawer";
import { ResultsPanel } from "./ResultsPanel";

const STEP_LABELS: Record<string, string> = {
  design_brief: "Drafting copy",
  copy_check: "Checking copy",
  generate_images: "Generating image",
  image_check: "Checking image",
};

function newConversationId() {
  return `conv_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export default function ContentCreator() {
  const router = useRouter();
  const session = useSession();
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("content-creator");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [openItem, setOpenItem] = useState<Item | null>(null);

  const conversationId = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const currentRunId = useRef<string | null>(null);

  useEffect(() => {
    if (session === null) router.replace("/login"); // logged out or session expired
  }, [session, router]);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((e: unknown) => setHealthError(e instanceof Error ? e.message : String(e)));
  }, []);

  const updatePiece = useCallback((itemId: string, fn: (p: PieceState) => PieceState) => {
    setRuns((rs) =>
      rs.map((r) => (r.pieces.some((p) => p.itemId === itemId) ? { ...r, pieces: r.pieces.map((p) => (p.itemId === itemId ? fn(p) : p)) } : r)),
    );
  }, []);

  const refreshItem = useCallback(
    (itemId: string) => {
      getItem(itemId)
        .then((item) => {
          updatePiece(itemId, (p) => ({ ...p, item }));
          setOpenItem((open) => (open?.id === itemId ? item : open));
        })
        .catch(() => {});
    },
    [updatePiece],
  );

  const handleEvent = useCallback(
    (ev: XEvent, runMode: Mode) => {
      switch (ev.type) {
        case "requirement":
          currentRunId.current = `pending_${Date.now()}`;
          setRuns((rs) => [
            { id: currentRunId.current!, mode: runMode, profile: ev.request.profile, segmentId: ev.request.segment_id, pieces: [] },
            ...rs,
          ]);
          break;
        case "plan": {
          const id = currentRunId.current;
          setRuns((rs) =>
            rs.map((r) =>
              r.id === id
                ? { ...r, pieces: ev.pieces.map((p) => ({ piece: p.piece, itemId: p.item_id, angle: p.angle, status: "queued", flags: [] })) }
                : r,
            ),
          );
          break;
        }
        case "step":
          updatePiece(ev.item_id, (p) => ({ ...p, status: p.status === "pending_review" ? "generating_copy" : p.status, step: STEP_LABELS[ev.step] ?? ev.step }));
          break;
        case "check_failed":
          updatePiece(ev.item_id, (p) => ({ ...p, flags: [...p.flags, `${ev.stage} check failed (attempt ${ev.attempt}): ${ev.findings.join("; ")}`] }));
          break;
        case "brief_ready":
        case "images_ready":
          refreshItem(ev.item_id);
          break;
        case "item_ready":
          updatePiece(ev.item_id, (p) => ({ ...p, status: ev.status, step: undefined }));
          refreshItem(ev.item_id);
          break;
        case "done": {
          const id = currentRunId.current;
          setRuns((rs) => rs.map((r) => (r.id === id ? { ...r, id: ev.request_id, done: ev } : r)));
          currentRunId.current = ev.request_id;
          break;
        }
      }
    },
    [refreshItem, updatePiece],
  );

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      conversationId.current ??= newConversationId();
      const history: ChatMessage[] = [...messages, { role: "user", content: text }];
      setMessages(history);
      setStreamingText("");
      setBusy(true);
      currentRunId.current = null;
      const controller = new AbortController();
      abortRef.current = controller;
      const runMode = mode;
      let reply = "";
      try {
        await streamChat(
          history,
          conversationId.current,
          runMode,
          {
            onText: (t) => {
              reply += t;
              setStreamingText(reply);
            },
            onEvent: (ev) => handleEvent(ev, runMode),
          },
          controller.signal,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        reply += controller.signal.aborted ? "\n\n_Stopped._" : `\n\n**Error:** ${msg}`;
      } finally {
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
        setStreamingText("");
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, handleEvent, messages, mode],
  );

  const newChat = () => {
    abortRef.current?.abort();
    conversationId.current = null;
    setMessages([]);
    setRuns([]);
    setStreamingText("");
    setOpenItem(null);
  };

  const signOut = () => {
    newChat();
    logout();
  };

  const totalCost = runs.reduce((s, r) => s + (r.done?.cost_usd ?? 0), 0);

  if (!session) {
    return <div className="flex h-dvh items-center justify-center text-sm text-zinc-400">Loading…</div>;
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <h1>
          <Brand />
        </h1>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">Prototype – not for publication</span>
        <HealthDot health={health} error={healthError} />
        <div className="ml-auto flex items-center gap-3 text-sm">
          {totalCost > 0 && <span className="text-zinc-500">Session cost ${totalCost.toFixed(4)}</span>}
          <label className="flex items-center gap-2">
            <span className="text-zinc-500">Mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              disabled={busy}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="content-creator">Copy + images</option>
              <option value="content-creator-brief">Copy only (fast)</option>
            </select>
          </label>
          <button onClick={newChat} className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            New chat
          </button>
          <span className="border-l border-zinc-200 pl-3 text-zinc-500 dark:border-zinc-700">{session.username}</span>
          <button onClick={signOut} className="text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100">
            Log out
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ChatPanel
          messages={messages}
          streamingText={streamingText}
          busy={busy}
          onSend={send}
          onStop={() => abortRef.current?.abort()}
        />
        <ResultsPanel runs={runs} onOpen={(item) => setOpenItem(item)} />
      </main>

      {openItem && <ItemDrawer item={openItem} onClose={() => setOpenItem(null)} />}
    </div>
  );
}

function HealthDot({ health, error }: { health: Health | null; error: string | null }) {
  if (error) return <span className="text-xs text-red-600">● Backend unreachable ({error})</span>;
  if (!health) return <span className="text-xs text-zinc-400">● Connecting…</span>;
  const ok = health.status === "ok";
  return (
    <span className={`text-xs ${ok ? "text-green-700 dark:text-green-400" : "text-amber-700"}`} title={JSON.stringify(health.providers, null, 1)}>
      ● {ok ? "Connected" : health.warnings.join("; ")} · KB {health.kb_version} · {health.providers.llm?.split(":").slice(1).join(":")}
    </span>
  );
}
