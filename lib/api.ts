// Typed client for the content-creator backend.
//
// Chat goes through our backend's OpenAI-compatible /v1/chat/completions endpoint,
// using the official `openai` package. Item details come from the read-only REST API.
// Every call carries the login session token; a 401 logs the user out.

import OpenAI from "openai";
import { getSession, logout } from "./auth";
import type { ChatMessage, Health, Item, Mode, XEvent } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type ApiError = { error: { message: string; type: string; code: string | null } };

function token(): string {
  return getSession()?.token ?? "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, ...(init?.headers ?? {}) },
  });
  if (res.status === 401) logout();
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.error?.message ?? `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** Image bytes through our API (logged in, CORS already allowed), for copy / download. */
export async function getImageBlob(imageId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/images/${encodeURIComponent(imageId)}/file`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (res.status === 401) logout();
  if (!res.ok) throw new Error(`image ${res.status}`);
  return res.blob();
}

export const getHealth = () => request<Health>("/api/health");
export const getItem = (id: string) => request<Item>(`/api/items/${id}`);
// Local store: "/images/…" served by the API. R2: an absolute (presigned or public) URL.
export const imageUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `${API_BASE}${url}`);

export type StreamHandlers = {
  onText: (text: string) => void;
  onEvent: (event: XEvent) => void;
};

/** Send the conversation and stream the reply. Resolves when the stream ends. */
export async function streamChat(
  messages: ChatMessage[],
  conversationId: string,
  mode: Mode,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const client = new OpenAI({
    baseURL: `${API_BASE}/v1`,
    apiKey: token(), // our login session token, not a model-provider key
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
  });
  try {
    const stream = await client.chat.completions.create(
      { model: mode, stream: true, messages, metadata: { conversation_id: conversationId } },
      { signal },
    );
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) handlers.onText(text);
      const ev = (chunk as unknown as { x_event?: XEvent }).x_event;
      if (ev) handlers.onEvent(ev);
    }
  } catch (e) {
    if (e instanceof OpenAI.AuthenticationError) {
      logout();
      throw new Error("Your session has expired. Please log in again.");
    }
    throw e;
  }
}
