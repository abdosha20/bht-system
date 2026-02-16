"use client";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(payload);
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

export async function getValidAccessToken() {
  const client = getBrowserSupabaseClient();
  const { data } = await client.auth.getSession();
  const current = data.session;
  if (!current?.access_token) return null;

  const payload = decodeJwtPayload(current.access_token);
  const now = Math.floor(Date.now() / 1000);
  const exp = payload?.exp ?? 0;

  // Refresh if token is expired or about to expire.
  if (exp <= now + 30) {
    const refreshed = await client.auth.refreshSession();
    return refreshed.data.session?.access_token ?? null;
  }

  return current.access_token;
}

export async function authorizedJsonFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const client = getBrowserSupabaseClient();
  let token = await getValidAccessToken();
  if (!token) {
    return new Response(JSON.stringify({ error: "Sign in required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const baseHeaders = new Headers(init?.headers ?? {});
  baseHeaders.set("Authorization", `Bearer ${token}`);
  if (!baseHeaders.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
    baseHeaders.set("Content-Type", "application/json");
  }

  let res = await fetch(input, { ...init, headers: baseHeaders });
  if (res.status !== 401) return res;

  // Retry once after forced refresh for InvalidJWT / expired sessions.
  const refreshed = await client.auth.refreshSession();
  token = refreshed.data.session?.access_token ?? null;
  if (!token) return res;

  const retryHeaders = new Headers(init?.headers ?? {});
  retryHeaders.set("Authorization", `Bearer ${token}`);
  if (!retryHeaders.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
    retryHeaders.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers: retryHeaders });
}
