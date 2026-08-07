import { prisma } from "@/lib/db";
import { RISK_PILLARS } from "@/lib/risk-pillars";
import { DEFAULT_SURVEY_FRAMEWORKS } from "@/lib/maturity-survey-constants";
import type { SurveyMode } from "@/lib/maturity-survey-mode";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import { applySurveyModeToCatalog } from "@/lib/maturity-survey-types";

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

  const fullCatalog = RISK_PILLARS.map((pillar) => {
    const pillarRiskIds = new Set(
      risks.filter((r) => pillar.categories.includes(r.category)).map((r) => r.id)
    );

    const pillarControls = controls
      .filter((c) => c.riskLinks.some((rl) => pillarRiskIds.has(rl.riskId)))
      .map((c) => {
        const fwCodes = [
          ...new Set(
            c.requirementLinks
              .map((l) => l.requirement.framework.code)
              .filter((code) => selected.has(code))
          ),
        ];
        return { control: c, frameworkCodes: fwCodes };
      })
      .filter(({ frameworkCodes: fws }) => fws.length > 0)
      .map(({ control: c, frameworkCodes: fws }) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        description: c.description,
        controlType: c.controlType,
        ownerRole: c.ownerRole,
        frameworkCodes: fws,
      }));

    const allFrameworks = new Set(pillarControls.flatMap((c) => c.frameworkCodes));

    return {
      pillarId: pillar.id,
      pillarLabel: pillar.label,
      pillarDescription: pillar.description,
      criticality: pillar.criticality,
      frameworkCodes: [...allFrameworks],
      controls: pillarControls,
    };
  }).filter((g) => g.controls.length > 0);

  return applySurveyModeToCatalog(fullCatalog, mode);
}
