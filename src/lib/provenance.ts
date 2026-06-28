import { createHash } from "crypto";

export function contentHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex");
}

export function stableClauseId(prefix: string, id: string): string {
  return `${prefix}:${id}`;
}

export type SeedManifest = {
  frameworkCode: string;
  version: string;
  expectedRowCount: number;
  clauseIds: string[];
  contentHashes: Record<string, string>;
  sourceUrl: string;
  generatedAt: string;
};

export function buildManifest(
  frameworkCode: string,
  version: string,
  rows: Array<{ clauseId: string; requirementText: string }>,
  sourceUrl: string
): SeedManifest {
  const contentHashes: Record<string, string> = {};
  for (const row of rows) {
    contentHashes[row.clauseId] = contentHash(row.requirementText);
  }
  return {
    frameworkCode,
    version,
    expectedRowCount: rows.length,
    clauseIds: rows.map((r) => r.clauseId).sort(),
    contentHashes,
    sourceUrl,
    generatedAt: new Date().toISOString(),
  };
}

export function validateManifest(
  manifest: SeedManifest,
  rows: Array<{ clauseId: string; requirementText: string }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (rows.length !== manifest.expectedRowCount) {
    errors.push(
      `Row count mismatch: expected ${manifest.expectedRowCount}, got ${rows.length}`
    );
  }

  const rowIds = new Set(rows.map((r) => r.clauseId));
  for (const id of manifest.clauseIds) {
    if (!rowIds.has(id)) {
      errors.push(`Missing clause ID: ${id}`);
    }
  }

  for (const row of rows) {
    const expected = manifest.contentHashes[row.clauseId];
    if (!expected) {
      errors.push(`Unexpected clause ID: ${row.clauseId}`);
      continue;
    }
    const actual = contentHash(row.requirementText);
    if (actual !== expected) {
      errors.push(`Hash mismatch for ${row.clauseId}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
