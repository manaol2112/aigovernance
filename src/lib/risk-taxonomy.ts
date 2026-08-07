import { RISK_PILLARS } from "@/lib/risk-pillars";

export type RiskTaxonomyControlLink = {
  code: string;
  title: string;
  coverage: string;
};

export type RiskTaxonomyItem = {
  id: string;
  code: string;
  statement: string;
  category: string;
  relatedHarm: string | null;
  controls: RiskTaxonomyControlLink[];
};

export type RiskTaxonomyPillarGroup = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: "critical" | "high" | "medium";
  risks: RiskTaxonomyItem[];
  uniqueControlCount: number;
};

export type RiskTaxonomySummary = {
  totalRisks: number;
  pillarCount: number;
  mitigatedRisks: number;
  totalControlLinks: number;
};

type RiskInput = {
  id: string;
  code: string;
  statement: string;
  category: string;
  relatedHarm: string | null;
  controlLinks: Array<{
    coverage: string;
    control: { code: string; title: string };
  }>;
};

export function buildRiskTaxonomy(
  risks: RiskInput[]
): { groups: RiskTaxonomyPillarGroup[]; summary: RiskTaxonomySummary } {
  const groups: RiskTaxonomyPillarGroup[] = RISK_PILLARS.map((pillar) => {
    const pillarRisks = risks.filter((risk) => pillar.categories.includes(risk.category));
    const uniqueControls = new Set<string>();

    const items: RiskTaxonomyItem[] = pillarRisks.map((risk) => {
      const controls = risk.controlLinks.map((link) => {
        uniqueControls.add(link.control.code);
        return {
          code: link.control.code,
          title: link.control.title,
          coverage: link.coverage,
        };
      });

      return {
        id: risk.id,
        code: risk.code,
        statement: risk.statement,
        category: risk.category,
        relatedHarm: risk.relatedHarm,
        controls,
      };
    });

    return {
      pillarId: pillar.id,
      pillarLabel: pillar.label,
      pillarDescription: pillar.description,
      criticality: pillar.criticality,
      risks: items,
      uniqueControlCount: uniqueControls.size,
    };
  }).filter((group) => group.risks.length > 0);

  const mitigatedRisks = risks.filter((risk) => risk.controlLinks.length > 0).length;
  const totalControlLinks = risks.reduce((sum, risk) => sum + risk.controlLinks.length, 0);

  return {
    groups,
    summary: {
      totalRisks: risks.length,
      pillarCount: groups.length,
      mitigatedRisks,
      totalControlLinks,
    },
  };
}
