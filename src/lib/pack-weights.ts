/**
 * Pack pillar + question weights for TMT (and other) questionnaire packs.
 * Weights are relative integers; scoring uses share-of-total, not absolute points.
 */

export const PACK_WEIGHT_MIN = 1;
export const PACK_WEIGHT_MAX = 10;
export const PACK_WEIGHT_DEFAULT = 1;

export function clampPackWeight(value: unknown, fallback = PACK_WEIGHT_DEFAULT): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(PACK_WEIGHT_MAX, Math.max(PACK_WEIGHT_MIN, Math.round(n)));
}

export function weightSharePct(weight: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((weight / total) * 1000) / 10;
}

export function sumWeights(weights: number[]): number {
  return weights.reduce((sum, weight) => sum + weight, 0);
}

/** Even split helper for admin “Distribute evenly”. */
export function evenPackWeights(count: number, totalPoints = count): number[] {
  if (count <= 0) return [];
  const base = Math.max(PACK_WEIGHT_MIN, Math.floor(totalPoints / count));
  const weights = Array.from({ length: count }, () =>
    Math.min(PACK_WEIGHT_MAX, Math.max(PACK_WEIGHT_MIN, base))
  );
  return weights;
}

export type WeightedAnswer = {
  score: number | null;
  weight: number;
};

/**
 * Pillar alignment from weighted question scores.
 * Unscored answers (don't know) are excluded from numerator and denominator.
 */
export function scoreWeightedAnswers(answers: WeightedAnswer[]): number | null {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const answer of answers) {
    if (answer.score == null) continue;
    const weight = clampPackWeight(answer.weight);
    weightedSum += answer.score * weight;
    weightTotal += weight;
  }
  if (weightTotal <= 0) return null;
  return Math.round(weightedSum / weightTotal);
}
