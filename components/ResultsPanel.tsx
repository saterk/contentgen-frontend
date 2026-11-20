"use client";

import type { Item, Run } from "@/lib/types";
import { PieceCard } from "./PieceCard";

export function ResultsPanel({ runs, onOpen }: { runs: Run[]; onOpen: (item: Item) => void }) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto p-4">
      {runs.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-zinc-400">
          Content pieces appear here as they are generated.
        </div>
      ) : (
        <div className="space-y-8">
          {runs.map((run) => (
            <RunGroup key={run.id} run={run} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
}

function RunGroup({ run, onOpen }: { run: Run; onOpen: (item: Item) => void }) {
  const d = run.done;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {run.profile &&
          ["product", "style", "tone", "format"].map((k) => run.profile?.[k] && <Chip key={k} label={k} value={run.profile[k]} />)}
        {run.segmentId && <Chip label="segment" value={run.segmentId} />}
        {run.mode === "content-creator-brief" && <Chip label="mode" value="copy only" />}
        <span className="ml-auto text-xs text-zinc-500">
          {d
            ? `${d.summary.pending_review}/${d.summary.total} ready · ${(d.total_time_ms / 1000).toFixed(1)}s · $${d.cost_usd.toFixed(4)}`
            : run.pieces.length
              ? "Generating…"
              : "Planning…"}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {run.pieces.map((p) => (
          <PieceCard key={p.itemId} piece={p} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900">
      <span className="text-zinc-400">{label}</span> {value}
    </span>
  );
}
