/* eslint-disable @next/next/no-img-element -- images come from the backend */
"use client";

import { useEffect } from "react";
import { imageUrl } from "@/lib/api";
import type { Item } from "@/lib/types";

export function ItemDrawer({ item, onClose }: { item: Item; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 text-sm shadow-xl dark:bg-zinc-900"
      >
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-base font-semibold">
            Piece {item.piece} · {item.content_id}
          </h2>
          <span className="text-xs text-zinc-500">
            {item.status} · v{item.version}
          </span>
          <button onClick={onClose} className="ml-auto rounded px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            ✕
          </button>
        </div>

        <Section title="Totals">
          ${item.totals.cost_usd.toFixed(5)} · {(item.totals.latency_ms / 1000).toFixed(1)}s of step time ·{" "}
          {item.totals.input_tokens}+{item.totals.output_tokens} tokens
        </Section>

        <Section title="Run log">
          <table className="w-full text-xs">
            <thead className="text-left text-zinc-400">
              <tr>
                <th className="py-1 pr-2">Step</th>
                <th className="pr-2">Model</th>
                <th className="pr-2 text-right">Tokens</th>
                <th className="pr-2 text-right">Cost</th>
                <th className="text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {item.run_logs.map((r, i) => (
                <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-1 pr-2">
                    {r.step}
                    {r.error && <div className="text-red-600">{r.error}</div>}
                  </td>
                  <td className="pr-2 text-zinc-500">{r.model ?? r.provider}</td>
                  <td className="pr-2 text-right">{r.input_tokens + r.output_tokens || "–"}</td>
                  <td className="pr-2 text-right">{r.cost_usd ? `$${r.cost_usd.toFixed(5)}` : "–"}</td>
                  <td className="text-right">{(r.latency_ms / 1000).toFixed(2)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Checks">
          <ul className="space-y-1 text-xs">
            {item.checks.map((c, i) => (
              <li key={i}>
                <span className={c.passed ? "text-green-700" : "text-red-700"}>{c.passed ? "✓" : "✗"}</span> {c.stage} · v
                {c.item_version} · attempt {c.attempt}
                {c.rule_hits.length > 0 && <span className="text-zinc-500"> — {c.rule_hits.map((h) => h.detail).join("; ")}</span>}
                {typeof c.judge_notes === "string" && <span className="text-zinc-400"> — {c.judge_notes}</span>}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Images">
          <div className="grid grid-cols-3 gap-2">
            {item.images.map((img) => (
              <a key={img.id} href={imageUrl(img.url)} target="_blank" rel="noreferrer" className="block">
                <img src={imageUrl(img.url)} alt="" className="aspect-[4/5] w-full rounded object-cover" />
                <span className="text-[11px] text-zinc-500">
                  attempt {img.attempt} · {img.width}×{img.height} · {img.passed ? "passed" : "failed"}
                </span>
              </a>
            ))}
          </div>
        </Section>

        <Section title="Tags (for Module 2)">
          <pre className="overflow-x-auto rounded bg-zinc-50 p-2 text-[11px] dark:bg-zinc-950">{JSON.stringify(item.tags, null, 2)}</pre>
        </Section>

        <Section title="Brief JSON">
          <pre className="overflow-x-auto rounded bg-zinc-50 p-2 text-[11px] dark:bg-zinc-950">{JSON.stringify(item.brief, null, 2)}</pre>
        </Section>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-zinc-400 uppercase">{title}</h3>
      {children}
    </section>
  );
}
