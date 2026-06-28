import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  PrismaClient,
  RequirementType,
  VerificationStatus,
  RiskTier,
  ActorType,
  Prisma,
} from "@prisma/client";
import { contentHash, buildManifest } from "../../src/lib/provenance";

const prisma = new PrismaClient();
const SEEDS_DIR = join(process.cwd(), "prisma/seeds");

type SeedRequirement = {
  clauseId: string;
  parentClauseId?: string | null;
  title: string;
  requirementText: string;
  requirementType: string;
  riskTier?: string | null;
  actor?: string | null;
  theme?: string | null;
  sortOrder: number;
  sourceDocument: string;
  sourceVersion: string;
  sourceUrl: string;
  sourcePage?: string | null;
  metadata?: Record<string, unknown>;
};

type FrameworkSeed = {
  framework: {
    code: string;
    name: string;
    version: string;
    publisher: string;
    sourceUrl: string;
    effectiveDate?: string;
  };
  requirements: SeedRequirement[];
};

type NistPlaybookEntry = {
  type: string;
  title: string;
  category: string;
  description: string;
  section_about?: string;
  section_actions?: string;
  section_doc?: string;
  section_ref?: string;
  "AI Actors"?: string[];
  Topic?: string[];
};

function mapRequirementType(type: string): RequirementType {
  const map: Record<string, RequirementType> = {
    obligation: "obligation",
    recommendation: "recommendation",
    principle: "principle",
    control: "control",
    subcategory: "subcategory",
    category: "category",
    function: "function",
  };
  return map[type] ?? "recommendation";
}

function mapRiskTier(tier?: string | null): RiskTier | null {
  if (!tier) return null;
  const map: Record<string, RiskTier> = {
    prohibited: "prohibited",
    high: "high",
    limited: "limited",
    minimal: "minimal",
    gpai: "gpai",
    general: "general",
  };
  return map[tier] ?? null;
}

function mapActor(actor?: string | null): ActorType | null {
  if (!actor) return null;
  const map: Record<string, ActorType> = {
    provider: "provider",
    deployer: "deployer",
    importer: "importer",
    distributor: "distributor",
    authority: "authority",
    general: "general",
  };
  return map[actor] ?? null;
}

async function upsertFramework(seed: FrameworkSeed) {
  const { framework, requirements } = seed;
  const fw = await prisma.framework.upsert({
    where: { code: framework.code },
    create: {
      code: framework.code,
      name: framework.name,
      version: framework.version,
      publisher: framework.publisher,
      sourceUrl: framework.sourceUrl,
      effectiveDate: framework.effectiveDate
        ? new Date(framework.effectiveDate)
        : null,
    },
    update: {
      name: framework.name,
      version: framework.version,
      publisher: framework.publisher,
      sourceUrl: framework.sourceUrl,
      effectiveDate: framework.effectiveDate
        ? new Date(framework.effectiveDate)
        : null,
    },
  });

  for (const req of requirements) {
    const hash = contentHash(req.requirementText);
    await prisma.frameworkRequirement.upsert({
      where: {
        frameworkId_clauseId: {
          frameworkId: fw.id,
          clauseId: req.clauseId,
        },
      },
      create: {
        frameworkId: fw.id,
        clauseId: req.clauseId,
        parentClauseId: req.parentClauseId ?? null,
        title: req.title,
        requirementText: req.requirementText,
        requirementType: mapRequirementType(req.requirementType),
        riskTier: mapRiskTier(req.riskTier),
        actor: mapActor(req.actor),
        theme: req.theme ?? null,
        sortOrder: req.sortOrder,
        verificationStatus: VerificationStatus.verified,
        contentHash: hash,
        sourceDocument: req.sourceDocument,
        sourceVersion: req.sourceVersion,
        sourceUrl: req.sourceUrl,
        sourcePage: req.sourcePage ?? null,
        metadata: (req.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      update: {
        parentClauseId: req.parentClauseId ?? null,
        title: req.title,
        requirementText: req.requirementText,
        requirementType: mapRequirementType(req.requirementType),
        riskTier: mapRiskTier(req.riskTier),
        actor: mapActor(req.actor),
        theme: req.theme ?? null,
        sortOrder: req.sortOrder,
        contentHash: hash,
        sourceDocument: req.sourceDocument,
        sourceVersion: req.sourceVersion,
        sourceUrl: req.sourceUrl,
        sourcePage: req.sourcePage ?? null,
        metadata: (req.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  const seedClauseIds = new Set(requirements.map((r) => r.clauseId));
  const existing = await prisma.frameworkRequirement.findMany({
    where: { frameworkId: fw.id },
    select: { id: true, clauseId: true },
  });
  const stale = existing.filter((r) => !seedClauseIds.has(r.clauseId));
  if (stale.length > 0) {
    await prisma.frameworkRequirement.deleteMany({
      where: { id: { in: stale.map((r) => r.id) } },
    });
    console.log(`  Removed ${stale.length} stale requirement(s): ${stale.map((r) => r.clauseId).join(", ")}`);
  }

  return { framework: fw, count: requirements.length };
}

function loadJsonSeed<T>(relativePath: string): T {
  const path = join(SEEDS_DIR, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Seed file not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function ingestNist(): FrameworkSeed {
  const playbookPath = join(SEEDS_DIR, "nist-ai-rmf/playbook.json");
  const playbook = JSON.parse(
    readFileSync(playbookPath, "utf-8")
  ) as NistPlaybookEntry[];

  const categories = new Set<string>();
  for (const entry of playbook) {
    categories.add(entry.category);
  }

  const requirements: SeedRequirement[] = [];
  let sortOrder = 0;

  const functions = ["Govern", "Map", "Measure", "Manage"];
  for (const fn of functions) {
    sortOrder++;
    requirements.push({
      clauseId: fn.toUpperCase(),
      parentClauseId: null,
      title: fn.toUpperCase(),
      requirementText: `${fn.toUpperCase()} function of the NIST AI Risk Management Framework.`,
      requirementType: "function",
      theme: fn,
      sortOrder,
      sourceDocument: "NIST AI RMF 1.0",
      sourceVersion: "1.0",
      sourceUrl: "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf",
      sourcePage: `Section 3.1 - ${fn}`,
    });
  }

  for (const cat of [...categories].sort()) {
    sortOrder++;
    const fn = cat.split("-")[0];
    requirements.push({
      clauseId: cat,
      parentClauseId: fn,
      title: cat,
      requirementText: `Category ${cat} of the NIST AI Risk Management Framework Core.`,
      requirementType: "category",
      theme: cat,
      sortOrder,
      sourceDocument: "NIST AI RMF 1.0",
      sourceVersion: "1.0",
      sourceUrl: "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf",
      sourcePage: `Tables 1-4 - ${cat}`,
    });
  }

  for (const entry of playbook) {
    sortOrder++;
    requirements.push({
      clauseId: entry.title.replace(/\s+/g, "-"),
      parentClauseId: entry.category,
      title: entry.title,
      requirementText: entry.description,
      requirementType: "subcategory",
      theme: entry.Topic?.[0] ?? entry.type,
      sortOrder,
      sourceDocument: "NIST AI RMF Playbook",
      sourceVersion: "1.0",
      sourceUrl: "https://airc.nist.gov/docs/playbook.json",
      sourcePage: entry.title,
      metadata: {
        type: entry.type,
        category: entry.category,
        aiActors: entry["AI Actors"],
        topics: entry.Topic,
        sectionAbout: entry.section_about,
        sectionActions: entry.section_actions,
        sectionDoc: entry.section_doc,
        sectionRef: entry.section_ref,
      },
    });
  }

  return {
    framework: {
      code: "NIST-AI-RMF",
      name: "NIST AI Risk Management Framework",
      version: "1.0",
      publisher: "NIST",
      sourceUrl: "https://airc.nist.gov/docs/playbook.json",
      effectiveDate: "2023-01-26",
    },
    requirements,
  };
}

function writeManifest(frameworkCode: string, seed: FrameworkSeed) {
  const manifest = buildManifest(
    frameworkCode,
    seed.framework.version,
    seed.requirements.map((r) => ({
      clauseId: r.clauseId,
      requirementText: r.requirementText,
    })),
    seed.framework.sourceUrl
  );
  const manifestPath = join(
    SEEDS_DIR,
    "manifests",
    `${frameworkCode.toLowerCase()}.json`
  );
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`  Manifest written: ${manifestPath}`);
}

async function main() {
  console.log("Starting framework ingestion...\n");

  const seeds: Array<{ code: string; seed: FrameworkSeed }> = [
    { code: "NIST-AI-RMF", seed: ingestNist() },
    { code: "OECD-AI", seed: loadJsonSeed("oecd/oecd-ai-principles.json") },
    { code: "EU-AIA", seed: loadJsonSeed("eu-ai-act/eu-ai-act-governance.json") },
    { code: "ISO-42001", seed: loadJsonSeed("iso-42001/iso-42001-controls.json") },
    { code: "COSO-ERM", seed: loadJsonSeed("coso-erm/coso-erm-2017.json") },
  ];

  for (const { code, seed } of seeds) {
    console.log(`Ingesting ${code} (${seed.requirements.length} requirements)...`);
    writeManifest(code, seed);
    const result = await upsertFramework(seed);
    console.log(`  ✓ ${result.count} requirements loaded for ${result.framework.name}\n`);
  }

  const total = await prisma.frameworkRequirement.count();
  console.log(`Total requirements in database: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
