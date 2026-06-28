/**
 * Comprehensive framework audit: requirements completeness, crosswalk coverage,
 * risk/control linkage, and seed integrity.
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SEEDS_DIR = join(process.cwd(), "prisma/seeds");

type AuditIssue = {
  severity: "critical" | "warning" | "info";
  framework?: string;
  clauseId?: string;
  category: string;
  message: string;
};

const issues: AuditIssue[] = [];

function add(severity: AuditIssue["severity"], category: string, message: string, extra?: Partial<AuditIssue>) {
  issues.push({ severity, category, message, ...extra });
}

async function main() {
  console.log("=".repeat(70));
  console.log("FRAMEWORK REQUIREMENTS & CROSSWALK AUDIT");
  console.log("=".repeat(70));

  // ── 1. Manifest / seed integrity ──
  const frameworks = await prisma.framework.findMany({
    include: {
      requirements: {
        orderBy: { sortOrder: "asc" },
        include: {
          crosswalkFrom: true,
          crosswalkTo: true,
          controlLinks: { include: { control: true } },
          riskLinks: { include: { risk: true } },
        },
      },
    },
  });

  const expectedCounts: Record<string, number> = {
    "NIST-AI-RMF": 95,
    "OECD-AI": 18,
    "EU-AIA": 36,
    "ISO-42001": 62,
    "COSO-ERM": 20,
  };

  console.log("\n## 1. REQUIREMENT ROW COUNTS\n");
  for (const fw of frameworks.sort((a, b) => a.code.localeCompare(b.code))) {
    const expected = expectedCounts[fw.code];
    const actual = fw.requirements.length;
    const ok = expected === actual;
    console.log(`  ${ok ? "✓" : "✗"} ${fw.code}: ${actual} rows (expected ${expected ?? "?"})`);
    if (!ok) add("critical", "count", `${fw.code} has ${actual} rows, expected ${expected}`, { framework: fw.code });

    const verified = fw.requirements.filter((r) => r.verificationStatus === "verified").length;
    const draft = fw.requirements.filter((r) => r.verificationStatus === "draft").length;
    console.log(`      verification: ${verified} verified, ${draft} draft, ${fw.requirements.length - verified - draft} other`);
  }

  // ── 2. NIST playbook row-by-row ──
  console.log("\n## 2. NIST AI RMF — PLAYBOOK ROW-BY-ROW\n");
  const playbook = JSON.parse(
    readFileSync(join(SEEDS_DIR, "nist-ai-rmf/playbook.json"), "utf-8")
  ) as Array<{ title: string; description: string; category: string }>;

  const nistReqs = frameworks.find((f) => f.code === "NIST-AI-RMF")!.requirements;
  const nistByClause = new Map(nistReqs.map((r) => [r.clauseId, r]));

  const functions = ["GOVERN", "MAP", "MEASURE", "MANAGE"];
  for (const fn of functions) {
    if (!nistByClause.has(fn)) add("critical", "nist", `Missing function row: ${fn}`, { framework: "NIST-AI-RMF", clauseId: fn });
  }

  const categories = [...new Set(playbook.map((p) => p.category))].sort();
  for (const cat of categories) {
    if (!nistByClause.has(cat)) add("critical", "nist", `Missing category row: ${cat}`, { framework: "NIST-AI-RMF", clauseId: cat });
  }

  let nistMissing = 0;
  let nistTextMismatch = 0;
  for (const entry of playbook) {
    const clauseId = entry.title.replace(/\s+/g, "-");
    const req = nistByClause.get(clauseId);
    if (!req) {
      nistMissing++;
      add("critical", "nist", `Playbook entry missing in DB: ${entry.title}`, { framework: "NIST-AI-RMF", clauseId });
    } else if (req.requirementText.trim() !== entry.description.trim()) {
      nistTextMismatch++;
      add("warning", "nist", `Text mismatch for ${clauseId}`, { framework: "NIST-AI-RMF", clauseId });
    }
  }
  console.log(`  Playbook entries: ${playbook.length}`);
  console.log(`  Function rows: 4, Category rows: ${categories.length}, Subcategory rows: ${playbook.length}`);
  console.log(`  Missing from DB: ${nistMissing}, Text mismatches: ${nistTextMismatch}`);

  const nistSubcats = nistReqs.filter((r) => r.requirementType === "subcategory");
  const unmappedNist = nistSubcats.filter((r) => r.crosswalkFrom.length === 0 && r.crosswalkTo.length === 0);
  const noControlNist = nistSubcats.filter((r) => r.controlLinks.length === 0);
  console.log(`  Subcategories with no crosswalk: ${unmappedNist.length}/${nistSubcats.length}`);
  console.log(`  Subcategories with no control link: ${noControlNist.length}/${nistSubcats.length}`);

  // ── 3. Per-framework coverage ──
  console.log("\n## 3. PER-FRAMEWORK COVERAGE (crosswalk + controls + risks)\n");

  /** Requirements that are authority-only or not provider-actionable — excluded from control coverage */
  const controlCoverageExceptions: Record<string, string[]> = {
    "EU-AIA": ["Art-7"],
  };

  const coverageGaps: Array<{ framework: string; clauseId: string; title: string }> = [];

  for (const fw of frameworks.sort((a, b) => a.code.localeCompare(b.code))) {
    const exceptions = new Set(controlCoverageExceptions[fw.code] ?? []);
    const actionable = fw.requirements.filter(
      (r) => !["function", "category"].includes(r.requirementType)
    );
    const noCrosswalk = actionable.filter((r) => r.crosswalkFrom.length === 0 && r.crosswalkTo.length === 0);
    const noControl = actionable.filter(
      (r) => r.controlLinks.length === 0 && !exceptions.has(r.clauseId)
    );
    const noRisk = actionable.filter((r) => r.riskLinks.length === 0);

    console.log(`  ${fw.code} (${actionable.length} actionable rows):`);
    console.log(`    No crosswalk: ${noCrosswalk.length} (${pct(noCrosswalk.length, actionable.length)})`);
    console.log(`    No control:   ${noControl.length} (${pct(noControl.length, actionable.length)})${exceptions.size ? ` (${exceptions.size} authority-only excluded)` : ""}`);
    console.log(`    No risk:      ${noRisk.length} (${pct(noRisk.length, actionable.length)})`);

    if (noCrosswalk.length > 0 && fw.code === "NIST-AI-RMF") {
      add("warning", "crosswalk", `${noCrosswalk.length} NIST subcategories unmapped in crosswalk`, { framework: fw.code });
    }
    if (noControl.length > 0) {
      noControl.forEach((r) => coverageGaps.push({ framework: fw.code, clauseId: r.clauseId, title: r.title }));
      add("critical", "controls", `${fw.code}: ${noControl.length} actionable requirements lack direct control links`, { framework: fw.code });
    }
  }

  if (coverageGaps.length > 0) {
    console.log("\n  Requirements without direct control links:");
    coverageGaps.slice(0, 25).forEach((g) => console.log(`    ✗ ${g.framework} ${g.clauseId}: ${g.title}`));
    if (coverageGaps.length > 25) console.log(`    ... +${coverageGaps.length - 25} more`);
  }

  // ── 4. Seed reference integrity (crosswalk + controls) ──
  console.log("\n## 4. SEED REFERENCE INTEGRITY\n");

  const reqLookup = new Map<string, string>();
  for (const fw of frameworks) {
    for (const r of fw.requirements) {
      reqLookup.set(`${fw.code}::${r.clauseId}`, r.id);
    }
  }

  // Parse crosswalk seed
  const crosswalkSrc = readFileSync(join(process.cwd(), "scripts/seed-crosswalk.ts"), "utf-8");
  const crosswalkMatches = [...crosswalkSrc.matchAll(/sourceFramework:\s*"([^"]+)"[\s\S]*?sourceClauseId:\s*"([^"]+)"[\s\S]*?targetFramework:\s*"([^"]+)"[\s\S]*?targetClauseId:\s*"([^"]+)"/g)];
  // Simpler: load from DB
  const crosswalks = await prisma.crosswalkMapping.findMany({
    include: {
      sourceRequirement: { include: { framework: true } },
      targetRequirement: { include: { framework: true } },
    },
  });
  console.log(`  Crosswalk mappings in DB: ${crosswalks.length}`);
  let brokenCrosswalk = 0;
  for (const m of crosswalks) {
    if (!m.sourceRequirement || !m.targetRequirement) brokenCrosswalk++;
  }
  console.log(`  Broken crosswalk links: ${brokenCrosswalk}`);

  const controlLinks = await prisma.controlRequirementLink.findMany({
    include: { requirement: { include: { framework: true } }, control: true },
  });
  console.log(`  Control→requirement links: ${controlLinks.length}`);
  const controls = await prisma.canonicalControl.findMany({ include: { riskLinks: true, requirementLinks: true } });
  console.log(`  Canonical controls: ${controls.length} (expected 38)`);
  if (controls.length < 38) {
    add("critical", "controls", `Expected 38 canonical controls, found ${controls.length}`);
  }
  const risks = await prisma.riskStatement.findMany();
  console.log(`  Risk statements: ${risks.length}`);

  // Check seed-risks-controls + supplements requirementLinks resolve
  const rcsSrc = readFileSync(join(process.cwd(), "scripts/seed-risks-controls.ts"), "utf-8");
  const supSrc = readFileSync(join(process.cwd(), "scripts/data/big4-requirement-supplements.ts"), "utf-8");
  const addSrc = readFileSync(join(process.cwd(), "scripts/data/big4-additional-controls.ts"), "utf-8");
  const combinedSrc = rcsSrc + supSrc + addSrc;
  const linkRefs = [...combinedSrc.matchAll(/framework:\s*"([^"]+)",\s*clauseId:\s*"([^"]+)"/g)];
  let brokenRefs = 0;
  const missingRefs: string[] = [];
  for (const [, fw, clauseId] of linkRefs) {
    if (!reqLookup.has(`${fw}::${clauseId}`)) {
      brokenRefs++;
      missingRefs.push(`${fw} ${clauseId}`);
    }
  }
  console.log(`  Control seed requirement refs: ${linkRefs.length} total, ${brokenRefs} broken`);
  if (brokenRefs > 0) {
    missingRefs.slice(0, 10).forEach((r) => console.log(`    ✗ ${r}`));
    add("critical", "controls", `${brokenRefs} control seed references point to missing requirements`);
  }

  // ── 5. EU AI Act completeness check ──
  console.log("\n## 5. EU AI ACT — COVERAGE SCOPE\n");
  const euReqs = frameworks.find((f) => f.code === "EU-AIA")!.requirements;
  const euClauses = euReqs.map((r) => r.clauseId).sort();
  console.log(`  Captured articles (${euClauses.length}): ${euClauses.join(", ")}`);
  const missingEuHighRisk = [
    "Art-18", "Art-23", "Art-24", "Art-28", "Art-29", "Art-30",
    "Art-31", "Art-32", "Art-33", "Art-34", "Art-35", "Art-36", "Art-37",
    "Art-38", "Art-39", "Art-40", "Art-41", "Art-42", "Art-44", "Art-45", "Art-46",
  ].filter((a) => !euClauses.includes(a));
  console.log(`  Known articles NOT in curated set (${missingEuHighRisk.length} examples):`);
  missingEuHighRisk.forEach((a) => console.log(`    - ${a} (not ingested — curated subset only)`));
  add("info", "eu-scope", "EU AI Act includes 36 curated governance articles covering high-risk, GPAI, conformity, deployer, and incident obligations");

  // ── 6. ISO 42001 Annex A completeness ──
  console.log("\n## 6. ISO 42001 — ANNEX A COVERAGE\n");
  const isoReqs = frameworks.find((f) => f.code === "ISO-42001")!.requirements;
  const annexA = isoReqs.filter((r) => r.clauseId.startsWith("A."));
  const mainClauses = isoReqs.filter((r) => !r.clauseId.startsWith("A."));
  console.log(`  Main clauses (4–6): ${mainClauses.length} rows`);
  console.log(`  Annex A controls: ${annexA.length} rows`);
  // ISO 42001 Annex A Table A.1 has 38 controls in the standard
  const expectedAnnexA = 38;
  if (annexA.length !== expectedAnnexA) {
    add("warning", "iso", `ISO Annex A has ${annexA.length} controls ingested; standard has ${expectedAnnexA} controls`, { framework: "ISO-42001" });
    console.log(`  ⚠ Standard Annex A has ${expectedAnnexA} controls; ${Math.abs(expectedAnnexA - annexA.length)} ${annexA.length < expectedAnnexA ? "may be missing" : "extra rows ingested"}`);
  } else {
    console.log(`  ✓ Annex A control count aligns with standard (${expectedAnnexA})`);
  }

  // ── 7. OECD completeness ──
  console.log("\n## 7. OECD AI PRINCIPLES\n");
  const oecdReqs = frameworks.find((f) => f.code === "OECD-AI")!.requirements;
  const principles = oecdReqs.filter((r) => r.requirementType === "principle");
  const subRecs = oecdReqs.filter((r) => r.requirementType === "recommendation");
  console.log(`  Principles: ${principles.length} (OECD has 5)`);
  console.log(`  Sub-recommendations: ${subRecs.length}`);
  if (principles.length !== 5) add("warning", "oecd", `Expected 5 OECD principles, found ${principles.length}`, { framework: "OECD-AI" });

  // ── 8. COSO ERM completeness ──
  console.log("\n## 8. COSO ERM 2017\n");
  const cosoReqs = frameworks.find((f) => f.code === "COSO-ERM")!.requirements;
  console.log(`  Principles ingested: ${cosoReqs.length} (COSO has 20 principles across 5 components)`);
  const components = ["Comp1", "Comp2", "Comp3", "Comp4", "Comp5"];
  for (const comp of components) {
    const count = cosoReqs.filter((r) => r.parentClauseId === comp || r.clauseId.startsWith(comp)).length;
    console.log(`    ${comp}: ${count} principles`);
  }
  add("info", "coso-scope", "COSO ingests 20 principles only; 5 component-level rows not separate requirements");

  // ── 9. Unmapped requirements detail ──
  console.log("\n## 9. UNMAPPED NIST SUBCATEGORIES (no crosswalk)\n");
  unmappedNist.slice(0, 72).forEach((r) => {
    console.log(`  - ${r.clauseId}: ${r.title} [controls: ${r.controlLinks.length}, risks: ${r.riskLinks.length}]`);
  });

  // ── 10. Requirements with controls but no risks (derived link gap) ──
  console.log("\n## 10. ACTIONABLE REQUIREMENTS WITH ZERO RISK LINKS\n");
  for (const fw of frameworks) {
    const gaps = fw.requirements.filter(
      (r) =>
        !["function", "category"].includes(r.requirementType) &&
        r.riskLinks.length === 0
    );
    if (gaps.length > 0) {
      console.log(`  ${fw.code}: ${gaps.length} requirements`);
      gaps.slice(0, 5).forEach((g) => console.log(`    - ${g.clauseId}: ${g.title}`));
      if (gaps.length > 5) console.log(`    ... +${gaps.length - 5} more`);
    }
  }

  // ── Summary ──
  console.log("\n" + "=".repeat(70));
  console.log("AUDIT SUMMARY");
  console.log("=".repeat(70));
  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");
  console.log(`  Critical: ${critical.length}  |  Warnings: ${warnings.length}  |  Info: ${infos.length}`);
  if (critical.length) {
    console.log("\n  CRITICAL:");
    critical.forEach((i) => console.log(`    ✗ [${i.category}] ${i.message}`));
  }
  if (warnings.length) {
    console.log("\n  WARNINGS:");
    warnings.forEach((i) => console.log(`    ⚠ [${i.category}] ${i.message}`));
  }
  if (infos.length) {
    console.log("\n  INFO:");
    infos.forEach((i) => console.log(`    ℹ [${i.category}] ${i.message}`));
  }
}

function pct(n: number, total: number) {
  return total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
