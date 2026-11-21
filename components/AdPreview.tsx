/* eslint-disable @next/next/no-img-element -- images come from the backend; next/image adds nothing here */
import { imageUrl } from "@/lib/api";
import type { ContentBrief, ImageInfo } from "@/lib/types";

/** Composed single-image ad: image with headline, benefit lines, CTA, disclaimer and logo placeholder. */
export function AdPreview({
  brief,
  image,
  disclaimer,
  pending,
}: {
  brief: ContentBrief;
  image?: ImageInfo;
  disclaimer?: string;
  pending?: boolean;
}) {
  return (
    <div className="@container relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-gradient-to-br from-amber-200 via-rose-200 to-zinc-300 text-white">
      {image ? (
        // no crossOrigin: the image always displays; copy / download fetch it separately (needs bucket CORS)
        <img
          src={imageUrl(image.url)}
          alt={brief.visual.subject}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[4cqw] text-zinc-600">
          {pending ? "Generating image…" : "No image (copy-only mode)"}
        </div>
      )}

      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/65 via-black/35 to-transparent p-[5cqw] pb-[12cqw]">
        <h3 className="text-[6.5cqw] leading-tight font-bold drop-shadow">{brief.headline}</h3>
        <ul className="mt-[2.5cqw] space-y-[1cqw] text-[3.4cqw] leading-snug">
          {brief.benefit_lines.map((line, i) => (
            <li key={i} className="flex gap-[1.5cqw] drop-shadow">
              <span className="text-red-300">✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-[5cqw] pt-[14cqw]">
        <div className="flex items-end justify-between gap-[3cqw]">
          <span className="rounded-full bg-red-600 px-[4.5cqw] py-[2cqw] text-[3.8cqw] font-semibold shadow">{brief.cta_text}</span>
          <span className="rounded border border-white/70 px-[2cqw] py-[1cqw] text-[2.8cqw] tracking-widest text-white/90">LOGO</span>
        </div>
        {disclaimer && <p className="mt-[2.5cqw] text-[2.3cqw] leading-snug text-white/80">{disclaimer}</p>}
      </div>

      <span className="absolute top-[2cqw] right-[2cqw] rounded bg-amber-300/95 px-[1.5cqw] py-[0.5cqw] text-[2.2cqw] font-semibold text-amber-950">
        PROTOTYPE – NOT FOR PUBLICATION
      </span>
    </div>
  );
}
