import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { validateManifest, type SeedManifest } from "../src/lib/provenance";

const MANIFESTS_DIR = join(process.cwd(), "prisma/seeds/manifests");
const SEEDS_DIR = join(process.cwd(), "prisma/seeds");

function getRequirementsForFramework(code: string): Array<{ clauseId: string; requirementText: string }> {
  if (code === "NIST-AI-RMF") {
    const playbook = JSON.parse(
      readFileSync(join(SEEDS_DIR, "nist-ai-rmf/playbook.json"), "utf-8")
    ) as Array<{ title: string; description: string; category: string; type: string }>;
    const rows: Array<{ clauseId: string; requirementText: string }> = [];
    const functions = ["GOVERN", "MAP", "MEASURE", "MANAGE"];
    for (const fn of functions) {
      rows.push({ clauseId: fn, requirementText: `${fn} function of the NIST AI Risk Management Framework.` });
    }
    const categories = [...new Set(playbook.map((p) => p.category))].sort();
    for (const cat of categories) {
      rows.push({ clauseId: cat, requirementText: `Category ${cat} of the NIST AI Risk Management Framework Core.` });
    }
    for (const entry of playbook) {
      rows.push({ clauseId: entry.title.replace(/\s+/g, "-"), requirementText: entry.description });
    }
    return rows;
  }

  const fileMap: Record<string, string> = {
    "OECD-AI": "oecd/oecd-ai-principles.json",
    "EU-AIA": "eu-ai-act/eu-ai-act-governance.json",
    "ISO-42001": "iso-42001/iso-42001-controls.json",
    "COSO-ERM": "coso-erm/coso-erm-2017.json",
  };

  const file = fileMap[code];
  if (!file) throw new Error(`Unknown framework: ${code}`);
  const seed = JSON.parse(readFileSync(join(SEEDS_DIR, file), "utf-8")) as {
    requirements: Array<{ clauseId: string; requirementText: string }>;
  };
  return seed.requirements;
}

function main() {
  const manifestFiles = readdirSync(MANIFESTS_DIR).filter((f) => f.endsWith(".json"));
  let allValid = true;

  for (const file of manifestFiles) {
    const manifest = JSON.parse(
      readFileSync(join(MANIFESTS_DIR, file), "utf-8")
    ) as SeedManifest;
    const rows = getRequirementsForFramework(manifest.frameworkCode);
    const result = validateManifest(manifest, rows);

    if (result.valid) {
      console.log(`✓ ${manifest.frameworkCode}: ${rows.length} rows validated`);
    } else {
      allValid = false;
      console.error(`✗ ${manifest.frameworkCode}:`);
      for (const err of result.errors) {
        console.error(`  - ${err}`);
      }
    }
  }

  if (!allValid) {
    process.exit(1);
  }
  console.log("\nAll manifests valid.");
}

main();
