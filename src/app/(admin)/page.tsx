import { prisma } from "@/lib/db";
import { GovernanceDashboard } from "@/components/governance-dashboard";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let frameworkCount: number = FRAMEWORK_COLUMNS.length;
  let controlCount = 0;
  let requirementCount = 0;

  try {
    [frameworkCount, controlCount, requirementCount] = await Promise.all([
      prisma.framework.count(),
      prisma.canonicalControl.count(),
      prisma.frameworkRequirement.count(),
    ]);
  } catch {
    // Landing still renders if the catalog is not reachable.
  }

  return (
    <GovernanceDashboard
      proof={{
        frameworkCount,
        controlCount,
        requirementCount,
      }}
    />
  );
}
