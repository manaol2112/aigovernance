import { normalizeEmail } from "@/lib/ai-system-register-governance";

export const REGISTER_ACTOR_EMAIL_HEADER = "x-ai-register-actor-email";
export const REGISTER_ACTOR_NAME_HEADER = "x-ai-register-actor-name";
export const REGISTER_ACTOR_STORAGE_KEY = "ai-system-register-actor";

export type RegisterActor = {
  email: string;
  displayName: string;
};

export function parseRegisterActorFromHeaders(
  headers: Headers | { get(name: string): string | null }
): RegisterActor | null {
  const email = headers.get(REGISTER_ACTOR_EMAIL_HEADER)?.trim() ?? "";
  const displayName = headers.get(REGISTER_ACTOR_NAME_HEADER)?.trim() ?? "";
  if (!email || !displayName) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { email: normalizeEmail(email), displayName };
}
