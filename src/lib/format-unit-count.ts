/** Coerce to a non-negative integer for user-facing counts. */
export function normalizeCount(count: number, fallback = 0): number {
  if (!Number.isFinite(count)) return fallback;
  return Math.max(0, Math.round(count));
}

/**
 * Format `{count} {unit}` as one string — never rely on JSX whitespace between
 * expressions and adjacent text (e.g. `{count} domains` rendering as "10domains").
 */
export function formatUnitCount(
  count: number,
  singular: string,
  plural?: string
): string {
  const n = normalizeCount(count);
  const unit = n === 1 ? singular : (plural ?? `${singular}s`);
  return `${n} ${unit}`;
}

/** e.g. formatCountPhrase(10, "domain", "you'll rate") -> "10 domains you'll rate" */
export function formatCountPhrase(
  count: number,
  singular: string,
  phrase: string,
  plural?: string
): string {
  return `${formatUnitCount(count, singular, plural)} ${phrase}`;
}

/** e.g. formatProgressOf(3, 10, "Question") -> "Question 3 of 10" */
export function formatProgressOf(current: number, total: number, label: string): string {
  return `${label} ${normalizeCount(current, 1)} of ${normalizeCount(total)}`;
}

/** e.g. formatOfTotal(3, 10, "answered") -> "3 of 10 answered" */
export function formatOfTotal(current: number, total: number, suffix: string): string {
  const totalLabel = total > 0 ? String(normalizeCount(total)) : "—";
  return `${normalizeCount(current)} of ${totalLabel} ${suffix}`;
}

/** e.g. formatRemainingUnit(2, "question") -> "2 questions remaining" */
export function formatRemainingUnit(count: number, singular: string, plural?: string): string {
  return `${formatUnitCount(count, singular, plural)} remaining`;
}
