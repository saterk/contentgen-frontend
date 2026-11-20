// Copy / download helpers for a generated piece (image + brief).

import { toPng } from "html-to-image";
import { imageUrl } from "./api";
import type { ImageInfo, Item } from "./types";

const BADGE = "PROTOTYPE – NOT FOR PUBLICATION";

export function pickImage(item: Item): ImageInfo | undefined {
  return item.images.find((i) => i.id === item.chosen_image_id) ?? item.images.at(-1);
}

function profileLine(item: Item): string {
  const p = item.request?.profile;
  const seg = item.request?.segment_id ?? item.tags.segment ?? "";
  return p ? `${p.product} · ${seg} · ${p.style} / ${p.tone} / ${p.format}` : seg;
}

/** Plain-text brief, for chat apps, tickets and anything without rich paste. */
export function briefText(item: Item): string {
  const b = item.brief;
  if (!b) return "";
  const img = pickImage(item);
  const lines = [
    BADGE,
    `Piece ${item.piece} · ${item.content_id} · ${profileLine(item)}`,
    "",
    `Headline: ${b.headline}`,
    `Body: ${b.body}`,
    "Benefits:",
    ...b.benefit_lines.map((l, i) => `- ${l} [${b.benefit_fact_ids[i]}]`),
    `CTA: ${b.cta_text}`,
    `Disclaimer (${b.disclaimer_id}): ${item.disclaimer?.text ?? ""}`,
    "",
    "Visual brief",
    `Subject: ${b.visual.subject}`,
    `Mood / story: ${b.visual.mood_story}`,
    `Light & colour: ${b.visual.light_color}`,
    `Composition: ${b.visual.composition}`,
    `Must avoid: ${b.visual.must_avoid.join(", ")}`,
    `Image prompt: ${img?.prompt ?? b.image_prompt}`,
    ...(img ? [`Image: ${imageUrl(img.url)} (${img.width}×${img.height}, ${img.model})`] : []),
    "",
    `Angle: ${item.angle}`,
    `Rationale: ${b.rationale}`,
  ];
  return lines.join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Rich brief for Word / Outlook / Gmail / Docs, with the image embedded inline. */
function briefHtml(item: Item, imageDataUrl?: string): string {
  const b = item.brief!;
  const row = (k: string, v: string) =>
    `<tr><td style="padding:2px 10px 2px 0;color:#71717a;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:2px 0">${v}</td></tr>`;
  return `<div style="font-family:'Noto Sans Thai',Arial,sans-serif;font-size:14px;line-height:1.45">
<p style="margin:0 0 6px;color:#b45309;font-weight:600">${BADGE}</p>
<p style="margin:0 0 8px;color:#52525b">Piece ${item.piece} · ${esc(item.content_id)} · ${esc(profileLine(item))}</p>
${imageDataUrl ? `<img src="${imageDataUrl}" width="360" style="display:block;margin:0 0 10px;border-radius:6px" alt="${esc(b.visual.subject)}">` : ""}
<table style="border-collapse:collapse">
${row("Headline", `<b>${esc(b.headline)}</b>`)}
${row("Body", esc(b.body))}
${row("Benefits", b.benefit_lines.map((l, i) => `• ${esc(l)} <span style="color:#71717a">[${esc(b.benefit_fact_ids[i])}]</span>`).join("<br>"))}
${row("CTA", esc(b.cta_text))}
${row("Disclaimer", `${esc(item.disclaimer?.text ?? "")} <span style="color:#71717a">(${esc(b.disclaimer_id)})</span>`)}
${row("Subject", esc(b.visual.subject))}
${row("Mood / story", esc(b.visual.mood_story))}
${row("Light & colour", esc(b.visual.light_color))}
${row("Composition", esc(b.visual.composition))}
${row("Must avoid", esc(b.visual.must_avoid.join(", ")))}
${row("Image prompt", `<span style="font-family:monospace;font-size:12px">${esc(pickImage(item)?.prompt ?? b.image_prompt)}</span>`)}
${row("Angle", esc(item.angle))}
${row("Rationale", esc(b.rationale))}
</table></div>`;
}

/** Fetch the image and convert it to PNG (browsers only accept image/png on the clipboard). */
async function imageAsPng(img: ImageInfo): Promise<Blob> {
  const res = await fetch(imageUrl(img.url), { mode: "cors" });
  if (!res.ok) throw new Error(`image ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob());
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Put image + brief on the clipboard as one item: rich HTML (image inline), the PNG itself,
 * and plain text. Each app pastes the richest format it understands.
 * Returns "full" or "text" (when the browser can't copy images).
 */
export async function copyImageAndBrief(item: Item): Promise<"full" | "text"> {
  const img = pickImage(item);
  const text = briefText(item);
  if (img && typeof ClipboardItem !== "undefined") {
    try {
      const png = await imageAsPng(img);
      const html = briefHtml(item, await blobToDataUrl(png));
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
          "image/png": png,
        }),
      ]);
      return "full";
    } catch {
      // fall through to text (e.g. Firefox, or the browser refused the image)
    }
  }
  await navigator.clipboard.writeText(text);
  return "text";
}

export async function copyBrief(item: Item): Promise<void> {
  await navigator.clipboard.writeText(briefText(item));
}

function download(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/** Render the composed ad preview node to a 1080-px-wide PNG and download it. */
export async function downloadComposedAd(node: HTMLElement, item: Item): Promise<void> {
  const dataUrl = await toPng(node, { pixelRatio: 1080 / node.offsetWidth, cacheBust: true });
  download(dataUrl, `${item.content_id}_piece${item.piece}_ad.png`);
}
