#!/usr/bin/env tsx
/**
 * Load sample workshop capture notes into an assessment repository.
 *
 * Usage:
 *   npx tsx scripts/seed-sample-capture-notes.ts <assessmentId>
 *
 * Then open the assessment → Workshop → Capture tab → Auto-map to controls → Review.
 */

import { PrismaClient } from "@prisma/client";
import { SAMPLE_WORKSHOP_CAPTURE_NOTES } from "../src/lib/sample-workshop-capture-notes";

const prisma = new PrismaClient();

async function main() {
  const assessmentId = process.argv[2];
  if (!assessmentId) {
    console.error("Usage: npx tsx scripts/seed-sample-capture-notes.ts <assessmentId>");
    process.exit(1);
  }

  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) {
    console.error(`Assessment not found: ${assessmentId}`);
    process.exit(1);
  }

  await prisma.assessmentRepository.upsert({
    where: { assessmentId },
    create: {
      assessmentId,
      workshopNotes: SAMPLE_WORKSHOP_CAPTURE_NOTES.workshopNotes,
      facilitatorNotes: SAMPLE_WORKSHOP_CAPTURE_NOTES.facilitatorNotes,
    },
    update: {
      workshopNotes: SAMPLE_WORKSHOP_CAPTURE_NOTES.workshopNotes,
      facilitatorNotes: SAMPLE_WORKSHOP_CAPTURE_NOTES.facilitatorNotes,
    },
  });

  console.log(`Sample capture notes loaded for assessment "${assessment.name}" (${assessmentId})`);
  console.log("");
  console.log("Expected outcomes when testing analysis:");
  console.log("  Aligned:", SAMPLE_WORKSHOP_CAPTURE_NOTES.testingGuide.expectedAligned.join("; "));
  console.log("  Gaps:", SAMPLE_WORKSHOP_CAPTURE_NOTES.testingGuide.expectedGaps.join("; "));
  console.log("  Partial:", SAMPLE_WORKSHOP_CAPTURE_NOTES.testingGuide.expectedPartial.join("; "));
  console.log("");
  console.log("Next: Capture tab → Auto-map to controls → Review → Analyze controls");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
