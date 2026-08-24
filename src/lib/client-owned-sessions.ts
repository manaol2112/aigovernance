/** Browser-scoped registry so public landings only show sessions this client created or opened. */

export type ClientOwnedSessionKind = "maturity" | "workshop";

const STORAGE_KEYS: Record<ClientOwnedSessionKind, string> = {
  maturity: "aigovernance-owned-maturity-sessions",
  workshop: "aigovernance-owned-workshop-sessions",
};

const MAX_REMEMBERED = 40;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readIds(kind: ClientOwnedSessionKind): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[kind]);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function writeIds(kind: ClientOwnedSessionKind, ids: string[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(ids.slice(0, MAX_REMEMBERED)));
  } catch {
    // Ignore quota / private-mode failures — resume list simply stays empty.
  }
}

export function listClientOwnedSessionIds(kind: ClientOwnedSessionKind): string[] {
  return readIds(kind);
}

/** Remember a session this browser created or opened (most-recent first). */
export function rememberClientOwnedSession(kind: ClientOwnedSessionKind, id: string): void {
  const trimmed = id.trim();
  if (!trimmed) return;
  const next = [trimmed, ...readIds(kind).filter((existing) => existing !== trimmed)];
  writeIds(kind, next);
}

export function filterByClientOwnedIds<T extends { id: string }>(
  items: T[],
  ownedIds: readonly string[]
): T[] {
  if (ownedIds.length === 0) return [];
  const allowed = new Set(ownedIds);
  return items.filter((item) => allowed.has(item.id));
}
