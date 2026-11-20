"use client";

import { useRef, useState } from "react";
import { copyBrief, copyImageAndBrief, downloadComposedAd } from "@/lib/export";
import type { Item, ItemStatus, PieceState } from "@/lib/types";
import { AdPreview } from "./AdPreview";

const STATUS: Record<ItemStatus, { label: string; cls: string }> = {
  queued: { label: "Queued", cls: "bg-zinc-100 text-zinc-600" },
  generating_copy: { label: "Working", cls: "bg-sky-100 text-sky-800" },
  copy_check_failed: { label: "Retrying copy", cls: "bg-amber-100 text-amber-800" },
  generating_images: { label: "Working", cls: "bg-sky-100 text-sky-800" },
  image_check_failed: { label: "Retrying image", cls: "bg-amber-100 text-amber-800" },
  pending_review: { label: "Ready for review", cls: "bg-green-100 text-green-800" },
  needs_attention: { label: "Needs attention", cls: "bg-red-100 text-red-800" },
};

export function PieceCard({ piece, onOpen }: { piece: PieceState; onOpen: (item: Item) => void }) {
  const item = piece.item;
  const brief = item?.brief;
  const status = STATUS[piece.status] ?? STATUS.queued;
  const working = piece.status !== "pending_review" && piece.status !== "needs_attention";
  const image = item?.images.find((i) => i.id === item.chosen_image_id) ?? item?.images.at(-1);
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800">
        <span className="font-semibold">Piece {piece.piece}</span>
        {item && <span className="text-xs text-zinc-400">{item.content_id}</span>}
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>
          {working && piece.step ? `${piece.step}…` : status.label}
        </span>
      </div>

      <div className="p-3">
        {brief ? (
          <div ref={previewRef}>
            <AdPreview brief={brief} image={image} disclaimer={item?.disclaimer?.text} pending={working} />
          </div>
        ) : (
          <div className="flex aspect-[4/5] w-full animate-pulse items-center justify-center rounded-lg bg-zinc-100 p-6 text-center text-xs text-zinc-500 dark:bg-zinc-800">
            {piece.status === "needs_attention" ? (item?.error ?? "Needs attention") : piece.angle}
          </div>
        )}
      </div>

      {piece.flags.length > 0 && (
        <ul className="mx-3 mb-2 space-y-1 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {piece.flags.map((f, i) => (
            <li key={i}>⚠ {f}</li>
          ))}
        </ul>
      )}

      {brief && item && !working && <CopyBar item={item} previewRef={previewRef} hasImage={!!image} />}

      {brief && item && (
        <div className="space-y-2 px-3 pb-3 text-sm">
          <p className="text-zinc-700 dark:text-zinc-300">{brief.body}</p>
          <ul className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            {brief.benefit_lines.map((l, i) => (
              <li key={i}>
                • {l} <code className="rounded bg-zinc-100 px-1 text-[10px] dark:bg-zinc-800">{brief.benefit_fact_ids[i]}</code>
              </li>
            ))}
          </ul>
          <Checks item={item} />
          <details className="text-xs">
            <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">Visual brief &amp; image prompt</summary>
            <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-zinc-600 dark:text-zinc-400">
              <dt className="text-zinc-400">Angle</dt>
              <dd>{item.angle}</dd>
              <dt className="text-zinc-400">Subject</dt>
              <dd>{brief.visual.subject}</dd>
              <dt className="text-zinc-400">Mood</dt>
              <dd>{brief.visual.mood_story}</dd>
              <dt className="text-zinc-400">Light</dt>
              <dd>{brief.visual.light_color}</dd>
              <dt className="text-zinc-400">Layout</dt>
              <dd>{brief.visual.composition}</dd>
              <dt className="text-zinc-400">Avoid</dt>
              <dd>{brief.visual.must_avoid.join(", ")}</dd>
              <dt className="text-zinc-400">Prompt</dt>
              <dd className="font-mono text-[11px]">{image?.prompt ?? brief.image_prompt}</dd>
              <dt className="text-zinc-400">Rationale</dt>
              <dd>{brief.rationale}</dd>
            </dl>
          </details>
          <button
            onClick={() => onOpen(item)}
            className="w-full rounded-md border border-zinc-200 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Run log &amp; details · ${item.totals.cost_usd.toFixed(4)} · {(item.totals.latency_ms / 1000).toFixed(1)}s
          </button>
        </div>
      )}
    </article>
  );
}

function CopyBar({
  item,
  previewRef,
  hasImage,
}: {
  item: Item;
  previewRef: React.RefObject<HTMLDivElement | null>;
  hasImage: boolean;
}) {
  const [note, setNote] = useState<string | null>(null);

  const run = async (action: () => Promise<string>) => {
    try {
      setNote(await action());
    } catch (e) {
      setNote(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setTimeout(() => setNote(null), 2500);
  };

  const btn =
    "flex-1 rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div className="px-3 pb-2">
      <div className="flex gap-1.5">
        {hasImage && (
          <button
            className={`${btn} border-red-200 text-red-700 dark:border-red-900 dark:text-red-300`}
            title="Image and brief together. Paste into Word, Outlook, Gmail, Docs or LINE."
            onClick={() =>
              run(async () =>
                (await copyImageAndBrief(item)) === "full" ? "Copied image + brief" : "This browser can't copy images: copied the brief only",
              )
            }
          >
            Copy image + brief
          </button>
        )}
        <button className={btn} onClick={() => run(async () => (await copyBrief(item), "Copied brief"))}>
          Copy brief
        </button>
        <button
          className={btn}
          title="The composed ad (image, headline, CTA, disclaimer) as a 1080×1350 PNG"
          onClick={() =>
            run(async () => {
              if (!previewRef.current) throw new Error("preview not ready");
              await downloadComposedAd(previewRef.current, item);
              return "Downloaded ad PNG";
            })
          }
        >
          Download ad
        </button>
      </div>
      {note && <p className="mt-1 text-center text-[11px] text-green-700 dark:text-green-400">{note}</p>}
    </div>
  );
}

function Checks({ item }: { item: Item }) {
  const latest = (stage: "copy" | "image") =>
    item.checks.filter((c) => c.stage === stage && c.item_version === item.version).at(-1);
  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      {(["copy", "image"] as const).map((stage) => {
        const c = latest(stage);
        if (!c) return null;
        const hits = c.rule_hits.map((h) => h.detail).join("; ");
        return (
          <span
            key={stage}
            title={hits || (typeof c.judge_notes === "string" ? c.judge_notes : "")}
            className={`rounded px-1.5 py-0.5 ${c.passed ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700"}`}
          >
            {c.passed ? "✓" : "✗"} {stage} check{c.attempt > 1 ? ` (attempt ${c.attempt})` : ""}
          </span>
        );
      })}
    </div>
  );
}
