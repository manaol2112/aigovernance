"use client";

import {
  REGISTER_ACTOR_EMAIL_HEADER,
  REGISTER_ACTOR_NAME_HEADER,
  REGISTER_ACTOR_STORAGE_KEY,
  type RegisterActor,
} from "@/lib/ai-system-register-actor-shared";
import { normalizeEmail } from "@/lib/ai-system-register-governance";

export type { RegisterActor };

export function loadRegisterActor(): RegisterActor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REGISTER_ACTOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RegisterActor>;
    if (!parsed.email || !parsed.displayName) return null;
    return {
      email: normalizeEmail(parsed.email),
      displayName: String(parsed.displayName).trim(),
    };
  } catch {
    return null;
  }
}

export function saveRegisterActor(actor: RegisterActor): void {
  window.localStorage.setItem(
    REGISTER_ACTOR_STORAGE_KEY,
    JSON.stringify({
      email: normalizeEmail(actor.email),
      displayName: actor.displayName.trim(),
    })
  );
}

export function registerActorHeaders(
  actor: RegisterActor | null = loadRegisterActor()
): Record<string, string> {
  if (!actor) return {};
  return {
    [REGISTER_ACTOR_EMAIL_HEADER]: actor.email,
    [REGISTER_ACTOR_NAME_HEADER]: actor.displayName,
  };
}

export async function registerFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const actorHeaders = registerActorHeaders();
  for (const [key, value] of Object.entries(actorHeaders)) {
    headers.set(key, value);
  }
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}
