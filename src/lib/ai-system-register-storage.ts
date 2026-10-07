import { mkdir } from "fs/promises";
import { join } from "path";

/**
 * Temporary / configurable evidence root for the AI System Register prototype.
 * Set `AI_REGISTER_EVIDENCE_DIR` in the environment for a durable path later.
 */
export function getAiRegisterEvidenceRoot(): string {
  const configured = process.env.AI_REGISTER_EVIDENCE_DIR?.trim();
  if (configured) return configured;
  return join(process.cwd(), "tmp", "ai-system-register-evidence");
}

export async function ensureAiRegisterEvidenceDir(
  organizationId: string,
  systemId: string
): Promise<string> {
  const dir = join(getAiRegisterEvidenceRoot(), organizationId, systemId);
  await mkdir(dir, { recursive: true });
  return dir;
}
