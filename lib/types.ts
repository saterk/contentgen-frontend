// Types mirroring the backend's API responses (backend/app/api/items.py, pipeline events).

export type Mode = "content-creator" | "content-creator-brief";

export type ItemStatus =
  | "queued"
  | "generating_copy"
  | "copy_check_failed"
  | "generating_images"
  | "image_check_failed"
  | "pending_review"
  | "needs_attention";

export type VisualBrief = {
  subject: string;
  mood_story: string;
  light_color: string;
  composition: string;
  must_avoid: string[];
};

export type ContentBrief = {
  headline: string;
  body: string;
  benefit_lines: string[];
  benefit_fact_ids: string[];
  cta_text: string;
  disclaimer_id: string;
  visual: VisualBrief;
  image_prompt: string;
  negative_prompt: string | null;
  language: "th" | "en";
  rationale: string;
};

export type ImageInfo = {
  id: string;
  url: string;
  variant_no: number;
  attempt: number;
  width: number;
  height: number;
  prompt: string;
  provider: string;
  model: string;
  seed: number | null;
  passed: boolean;
};

export type CheckInfo = {
  stage: "copy" | "image";
  item_version: number;
  attempt: number;
  passed: boolean;
  rule_hits: { rule?: string; detail: string }[];
  judge_score: number | null;
  judge_notes: unknown;
  at: string;
};

export type RunLogRow = {
  step: string;
  provider: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  error: string | null;
  at: string;
};

export type Item = {
  id: string;
  piece: number;
  content_id: string;
  angle: string;
  status: ItemStatus;
  version: number;
  error: string | null;
  tags: Record<string, string | null>;
  brief: ContentBrief | null;
  request: { profile: { product: string; style: string; tone: string; format: string }; segment_id: string } | null;
  disclaimer: { id: string; text: string } | null;
  images: ImageInfo[];
  chosen_image_id: string | null;
  checks: CheckInfo[];
  run_logs: RunLogRow[];
  totals: { cost_usd: number; latency_ms: number; input_tokens: number; output_tokens: number };
};

export type Health = {
  status: "ok" | "degraded";
  warnings: string[];
  kb_version: string;
  providers: Record<string, string>;
};

// x_event payloads on chat.completion.chunk
export type XEvent =
  | { type: "requirement"; request: { count: number; segment_id: string; product_id: string; profile: Record<string, string> } }
  | { type: "plan"; count: number; pieces: { piece: number; item_id: string; angle: string }[] }
  | { type: "step"; piece: number; item_id: string; step: string }
  | { type: "brief_ready" | "images_ready"; piece: number; item_id: string }
  | { type: "check_failed"; piece: number; item_id: string; stage: "copy" | "image"; attempt: number; findings: string[] }
  | { type: "item_ready"; piece: number; item_id: string; status: ItemStatus; reason?: string }
  | { type: "needs_input"; missing: string[] }
  | {
      type: "done";
      request_id: string;
      item_ids: string[];
      summary: { total: number; pending_review: number; needs_attention: number };
      total_time_ms: number;
      cost_usd: number;
    }
  | { type: "error"; message: string };

export type PieceState = {
  piece: number;
  itemId: string;
  angle: string;
  status: ItemStatus;
  step?: string;
  flags: string[];
  item?: Item;
};

export type Run = {
  id: string; // request id once known; temporary id before
  mode: Mode;
  profile?: Record<string, string>;
  segmentId?: string;
  pieces: PieceState[];
  done?: Extract<XEvent, { type: "done" }>;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };
