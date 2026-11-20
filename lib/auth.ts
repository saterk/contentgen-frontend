// Login session kept in localStorage (prototype). The token is a signed, expiring
// session token from POST /api/auth/login, sent as the Bearer token on every API call.

import { useSyncExternalStore } from "react";

const KEY = "cc_session";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type Session = { token: string; username: string; expires_at: number };

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSession: Session | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Current session, or null when logged out or expired. Stable reference while unchanged. */
export function getSession(): Session | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSession = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cachedSession = null;
    }
  }
  if (cachedSession && cachedSession.expires_at * 1000 <= Date.now()) return null;
  return cachedSession;
}

function setSession(s: Session | null) {
  try {
    if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the session lives only until reload
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb); // login / logout in another tab
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** undefined while rendering on the server / before hydration, then Session | null. */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribe, getSession, () => undefined);
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Login failed (${res.status})`);
  setSession(body as Session);
}

export function logout() {
  setSession(null);
}
