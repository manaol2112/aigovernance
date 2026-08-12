import { prisma } from "@/lib/db";
import { RISK_PILLARS } from "@/lib/risk-pillars";
import { DEFAULT_SURVEY_FRAMEWORKS } from "@/lib/maturity-survey-constants";
import type { SurveyMode } from "@/lib/maturity-survey-mode";
import type { SurveyControlItem, SurveyPillarGroup } from "@/lib/maturity-survey-types";
import { applySurveyModeToCatalog } from "@/lib/maturity-survey-types";

type DbControl = Awaited<
  ReturnType<typeof prisma.canonicalControl.findMany>
>[number] & {
  riskLinks: Array<{ riskId: string; risk: { category: string } }>;
  requirementLinks: Array<{
    requirement: { framework: { code: string } };
  }>;
};

function mergeControlPools(
  primary: SurveyControlItem[],
  fallback: SurveyControlItem[]
): SurveyControlItem[] {
  const seen = new Set(primary.map((control) => control.id));
  return [...primary, ...fallback.filter((control) => !seen.has(control.id))];
}

function mapPillarControls(
  controls: DbControl[],
  pillarRiskIds: Set<string>,
  selectedFrameworks: Set<string> | null
): SurveyControlItem[] {
  return controls
    .filter((c) => c.riskLinks.some((rl) => pillarRiskIds.has(rl.riskId)))
    .map((c) => {
      const fwCodes = [
        ...new Set(
          c.requirementLinks
            .map((l) => l.requirement.framework.code)
            .filter((code) => (selectedFrameworks ? selectedFrameworks.has(code) : true))
        ),
      ];
      return { control: c, frameworkCodes: fwCodes };
    })
    .filter(({ frameworkCodes }) =>
      selectedFrameworks ? frameworkCodes.length > 0 : frameworkCodes.length >= 0
    )
    .map(({ control: c, frameworkCodes: fws }) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      controlType: c.controlType,
      ownerRole: c.ownerRole,
      frameworkCodes: fws,
    }));
}

/** Server-only — loads pillar → control catalog from the canonical control library. */
export async function buildMaturitySurveyCatalog(
  frameworkCodes: string[] = DEFAULT_SURVEY_FRAMEWORKS,
  mode: SurveyMode = "quick"
): Promise<SurveyPillarGroup[]> {
  const selected = new Set(frameworkCodes);

  const [risks, controls] = await Promise.all([
    prisma.riskStatement.findMany(),
    prisma.canonicalControl.findMany({
      include: {
        riskLinks: { include: { risk: true } },
        requirementLinks: {
          include: { requirement: { include: { framework: true } } },
        },
      },
      orderBy: { code: "asc" },
    }),
  ]);

  const fullCatalog: SurveyPillarGroup[] = RISK_PILLARS.map((pillar) => {
    const pillarRiskIds = new Set(
      risks.filter((r) => pillar.categories.includes(r.category)).map((r) => r.id)
    );

    const scopedControls = mapPillarControls(controls, pillarRiskIds, selected);
    const libraryControls = mapPillarControls(controls, pillarRiskIds, null);
    const pillarControls =
      scopedControls.length > 0
        ? mergeControlPools(scopedControls, libraryControls)
        : libraryControls;

    const allFrameworks = new Set(
      pillarControls.flatMap((c) => c.frameworkCodes).filter((code) => selected.has(code))
    );

    return {
      pillarId: pillar.id,
      pillarLabel: pillar.label,
      pillarDescription: pillar.description,
      criticality: pillar.criticality,
      frameworkCodes: [...allFrameworks],
      controls: pillarControls,
    };
  });

  return applySurveyModeToCatalog(fullCatalog, mode);
}
