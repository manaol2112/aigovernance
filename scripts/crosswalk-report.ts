import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const unmappedNist = await prisma.frameworkRequirement.findMany({
    where: {
      framework: { code: "NIST-AI-RMF" },
      requirementType: "subcategory",
      crosswalkFrom: { none: {} },
    },
    select: { clauseId: true, title: true },
    orderBy: { clauseId: "asc" },
  });

  const duplicateControls = await prisma.$queryRaw<
    Array<{ requirement_id: string; clause_id: string; control_count: bigint }>
  >`
    SELECT crl.requirement_id, fr.clause_id, COUNT(DISTINCT crl.control_id) as control_count
    FROM control_requirement_links crl
    JOIN framework_requirements fr ON fr.id = crl.requirement_id
    GROUP BY crl.requirement_id, fr.clause_id
    HAVING COUNT(DISTINCT crl.control_id) > 3
    ORDER BY control_count DESC
    LIMIT 20
  `;

  const mappingStats = await prisma.crosswalkMapping.groupBy({
    by: ["mappingType", "confidence"],
    _count: true,
  });

  console.log("=== Crosswalk Report ===\n");
  console.log(`Unmapped NIST subcategories: ${unmappedNist.length}`);
  if (unmappedNist.length > 0) {
    unmappedNist.slice(0, 10).forEach((r) => console.log(`  - ${r.clauseId}: ${r.title}`));
    if (unmappedNist.length > 10) console.log(`  ... and ${unmappedNist.length - 10} more`);
  }

  console.log("\nMapping statistics:");
  mappingStats.forEach((s) =>
    console.log(`  ${s.mappingType} / ${s.confidence}: ${s._count}`)
  );

  console.log(`\nRequirements with >3 controls (potential dedup issues): ${duplicateControls.length}`);
  duplicateControls.forEach((d) =>
    console.log(`  - ${d.clause_id}: ${d.control_count} controls`)
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
