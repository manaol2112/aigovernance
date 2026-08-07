import { prisma } from "@/lib/db";
import { getScopedControlsForAssessment } from "@/lib/control-scoping";
import { RISK_PILLARS } from "@/lib/risk-pillars";
import { assessControlReadiness } from "@/lib/governance-v2/dependency-readiness";
import type {
  DependencyEdge,
  DependencyGraph,
  DependencyNode,
  DependencyUnlockPath,
} from "@/lib/governance-v2/types";

/** AIMS maturity stack — depth increases as you move toward operational assurance. */
export const GOVERNANCE_LAYERS = [
  {
    index: 0,
    label: "Foundation",
    description: "Policy, scope, accountability, and legal baseline",
  },
  {
    index: 1,
    label: "Risk & planning",
    description: "Risk management, data governance, and quality planning",
  },
  {
    index: 2,
    label: "Design & build",
    description: "Impact assessment, testing, documentation, and transparency",
  },
  {
    index: 3,
    label: "Deploy & operate",
    description: "Deployment, oversight, third-party, and operational controls",
  },
  {
    index: 4,
    label: "Assure & monitor",
    description: "Monitoring, incidents, and performance evaluation",
  },
  {
    index: 5,
    label: "Conform & improve",
    description: "Conformity, reporting, and continual improvement",
  },
] as const;

/**
 * Canonical prerequisite chains reflecting ISO 42001 AIMS logic.
 * Edge: dependent (from) depends_on prerequisite (to).
 */
export const GOVERNANCE_DEPENDENCY_CHAINS: Array<{
  fromCode: string;
  toCode: string;
  relationType: "depends_on" | "enables";
  rationale: string;
  impactScore: number;
}> = [
  {
    fromCode: "CTRL-GOV-002",
    toCode: "CTRL-GOV-001",
    relationType: "depends_on",
    rationale: "Roles and accountability require an approved AI governance policy foundation",
    impactScore: 2.5,
  },
  {
    fromCode: "CTRL-RM-001",
    toCode: "CTRL-GOV-001",
    relationType: "depends_on",
    rationale: "AI risk management must align to governance policy and scope",
    impactScore: 2.5,
  },
  {
    fromCode: "CTRL-RM-001",
    toCode: "CTRL-GOV-002",
    relationType: "depends_on",
    rationale: "Risk treatment requires defined ownership and decision rights",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-DATA-001",
    toCode: "CTRL-GOV-001",
    relationType: "depends_on",
    rationale: "Data governance inherits policy and accountability structures",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-DATA-001",
    toCode: "CTRL-RM-001",
    relationType: "depends_on",
    rationale: "Data classification and handling depend on risk context",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-IMPACT-001",
    toCode: "CTRL-RM-001",
    relationType: "depends_on",
    rationale: "Impact assessment requires established risk methodology",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-TEST-001",
    toCode: "CTRL-DATA-001",
    relationType: "depends_on",
    rationale: "Model testing requires data quality and governance baseline",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-TEST-001",
    toCode: "CTRL-RM-001",
    relationType: "depends_on",
    rationale: "Validation criteria derive from risk classification",
    impactScore: 1.5,
  },
  {
    fromCode: "CTRL-DOC-001",
    toCode: "CTRL-GOV-001",
    relationType: "depends_on",
    rationale: "Technical documentation standards flow from governance policy",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-DEPLOY-001",
    toCode: "CTRL-TEST-001",
    relationType: "depends_on",
    rationale: "Production deployment requires completed validation evidence",
    impactScore: 2.5,
  },
  {
    fromCode: "CTRL-DEPLOY-001",
    toCode: "CTRL-DOC-001",
    relationType: "depends_on",
    rationale: "Deployment authorization requires technical documentation",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-DEPLOY-001",
    toCode: "CTRL-OVER-001",
    relationType: "depends_on",
    rationale: "Operational deployment requires human oversight mechanisms",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-MON-001",
    toCode: "CTRL-DEPLOY-001",
    relationType: "depends_on",
    rationale: "Post-deployment monitoring requires defined production baseline",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-INC-001",
    toCode: "CTRL-MON-001",
    relationType: "depends_on",
    rationale: "Incident response relies on monitoring signals and runbooks",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-INC-001",
    toCode: "CTRL-OVER-001",
    relationType: "depends_on",
    rationale: "Escalation paths require oversight and override procedures",
    impactScore: 1.5,
  },
  {
    fromCode: "CTRL-QMS-001",
    toCode: "CTRL-GOV-001",
    relationType: "depends_on",
    rationale: "AIMS quality management extends governance policy",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-CONFORM-001",
    toCode: "CTRL-QMS-001",
    relationType: "depends_on",
    rationale: "Conformity assessment requires operational QMS",
    impactScore: 2.5,
  },
  {
    fromCode: "CTRL-CONFORM-001",
    toCode: "CTRL-DOC-001",
    relationType: "depends_on",
    rationale: "Conformity requires complete technical documentation",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-CONFORM-001",
    toCode: "CTRL-LOG-001",
    relationType: "depends_on",
    rationale: "Audit trail and logging substantiate conformity claims",
    impactScore: 2,
  },
  {
    fromCode: "CTRL-3RD-001",
    toCode: "CTRL-GOV-001",
    relationType: "depends_on",
    rationale: "Third-party AI risk management requires governance policy",
    impactScore: 1.5,
  },
  {
    fromCode: "CTRL-TRANS-001",
    toCode: "CTRL-GOV-001",
    relationType: "depends_on",
    rationale: "Transparency obligations are defined in governance framework",
    impactScore: 1.5,
  },
];

/** @deprecated Use GOVERNANCE_DEPENDENCY_CHAINS */
export const DEFAULT_DEPENDENCY_CHAINS = GOVERNANCE_DEPENDENCY_CHAINS;

function remediationActionForReadiness(
  readiness: DependencyNode["readiness"]
): string {
  if (readiness === "effective") return "Prerequisite satisfied";
  if (readiness === "partial") return "Strengthen documentation and close partial gaps";
  if (readiness === "ineffective") return "Close control gap and upload substantiating evidence";
  return "Run assessment and establish baseline evidence";
}

function whyFixFirstMessage(input: {
  blockedControlCode: string;
  blockedControlTitle: string;
  prerequisiteCode: string;
  prerequisiteTitle: string;
}): string {
  return `${input.blockedControlCode} (${input.blockedControlTitle}) depends on ${input.prerequisiteCode} (${input.prerequisiteTitle}). Until that prerequisite is operating effectively, downstream evidence for the blocked control cannot be treated as reliable or complete.`;
}

function pillarForControlCode(code: string): { pillarId: string; pillarLabel: string } {
  const prefix = code.replace(/^CTRL-/, "").split("-")[0]?.toUpperCase() ?? "";
  const map: Record<string, string> = {
    GOV: "governance",
    RM: "governance",
    RISK: "governance",
    LEGAL: "governance",
    ACCT: "governance",
    DATA: "privacy-data",
    PRIV: "privacy-data",
    IMPACT: "fairness",
    TEST: "safety-reliability",
    DEPLOY: "safety-reliability",
    ENV: "safety-reliability",
    DOC: "compliance",
    LOG: "compliance",
    QMS: "compliance",
    CONFORM: "compliance",
    TRANS: "transparency",
    OVER: "oversight",
    MON: "oversight",
    INC: "oversight",
    "INC-REPORT": "oversight",
    "3RD": "supply-chain",
    GPAI: "systemic",
    CLASS: "governance",
    REG: "governance",
    TRAIN: "governance",
    FEEDBACK: "oversight",
    DECOM: "oversight",
  };

  const pillarId = map[prefix] ?? "governance";
  const pillar = RISK_PILLARS.find((p) => p.id === pillarId) ?? RISK_PILLARS[0];
  return { pillarId: pillar.id, pillarLabel: pillar.label };
}

function layerForControlCode(code: string): number {
  if (code.startsWith("CTRL-GOV") || code.startsWith("CTRL-LEGAL") || code.startsWith("CTRL-ACCT")) {
    return 0;
  }
  if (
    code.startsWith("CTRL-RM") ||
    code.startsWith("CTRL-DATA") ||
    code.startsWith("CTRL-PRIV") ||
    code.startsWith("CTRL-QMS")
  ) {
    return 1;
  }
  if (
    code.startsWith("CTRL-IMPACT") ||
    code.startsWith("CTRL-TEST") ||
    code.startsWith("CTRL-DOC") ||
    code.startsWith("CTRL-LOG") ||
    code.startsWith("CTRL-TRANS")
  ) {
    return 2;
  }
  if (
    code.startsWith("CTRL-DEPLOY") ||
    code.startsWith("CTRL-OVER") ||
    code.startsWith("CTRL-3RD") ||
    code.startsWith("CTRL-TRAIN")
  ) {
    return 3;
  }
  if (code.startsWith("CTRL-MON") || code.startsWith("CTRL-INC")) {
    return 4;
  }
  if (code.startsWith("CTRL-CONFORM") || code.startsWith("CTRL-FEEDBACK") || code.startsWith("CTRL-DECOM")) {
    return 5;
  }
  return 1;
}

export async function seedDefaultControlDependencies() {
  const controls = await prisma.canonicalControl.findMany({
    select: { id: true, code: true },
  });
  const byCode = new Map(controls.map((c) => [c.code, c.id]));
  let created = 0;

  for (const edge of GOVERNANCE_DEPENDENCY_CHAINS) {
    const fromId = byCode.get(edge.fromCode);
    const toId = byCode.get(edge.toCode);
    if (!fromId || !toId) continue;

    await prisma.controlDependency.upsert({
      where: {
        controlId_dependsOnControlId_relationType: {
          controlId: fromId,
          dependsOnControlId: toId,
          relationType: edge.relationType,
        },
      },
      create: {
        controlId: fromId,
        dependsOnControlId: toId,
        relationType: edge.relationType,
        impactScore: edge.impactScore,
        rationale: edge.rationale,
      },
      update: {
        impactScore: edge.impactScore,
        rationale: edge.rationale,
      },
    });
    created++;
  }
  return created;
}

function buildUnlockPath(
  controlId: string,
  nodes: DependencyNode[],
  edges: DependencyEdge[]
): DependencyUnlockPath | null {
  const target = nodes.find((n) => n.controlId === controlId);
  if (!target) return null;

  const prereqEdges = edges.filter(
    (e) => e.fromControlId === controlId && e.relationType === "depends_on"
  );

  const steps: DependencyUnlockPath["steps"] = [];
  for (const edge of prereqEdges) {
    const prereq = nodes.find((n) => n.controlId === edge.toControlId);
    if (!prereq) continue;
    steps.push({
      controlId: prereq.controlId,
      controlCode: prereq.controlCode,
      controlTitle: prereq.controlTitle,
      readiness: prereq.readinessLabel,
      rationale: edge.rationale ?? undefined,
      whyFixFirst: whyFixFirstMessage({
        blockedControlCode: target.controlCode,
        blockedControlTitle: target.controlTitle,
        prerequisiteCode: prereq.controlCode,
        prerequisiteTitle: prereq.controlTitle,
      }),
      action: remediationActionForReadiness(prereq.readiness),
    });
  }

  steps.sort((a, b) => a.controlCode.localeCompare(b.controlCode));

  return {
    controlId,
    controlCode: target.controlCode,
    controlTitle: target.controlTitle,
    steps,
  };
}

export async function buildDependencyGraph(assessmentId: string): Promise<DependencyGraph> {
  await seedDefaultControlDependencies();

  const [scopedControls, evaluations, dependencies] = await Promise.all([
    getScopedControlsForAssessment(assessmentId),
    prisma.controlEvaluation.findMany({
      where: { assessmentId },
      select: {
        controlId: true,
        implementationStatus: true,
        complianceStatus: true,
        inPlaceFindings: true,
        gapFindings: true,
        explainability: true,
      },
    }),
    prisma.controlDependency.findMany({
      include: {
        control: { select: { id: true, code: true, title: true } },
        dependsOn: { select: { id: true, code: true, title: true } },
      },
    }),
  ]);

  const scopedIds = new Set(scopedControls.map((c) => c.id));
  const evalMap = new Map(evaluations.map((e) => [e.controlId, e]));

  const readinessById = new Map<string, ReturnType<typeof assessControlReadiness>>();
  for (const c of scopedControls) {
    readinessById.set(c.id, assessControlReadiness(evalMap.get(c.id)));
  }

  const relevantDeps = dependencies.filter(
    (d) =>
      scopedIds.has(d.controlId) &&
      scopedIds.has(d.dependsOnControlId) &&
      (d.relationType === "depends_on" || d.relationType === "enables")
  );

  const nodes: DependencyNode[] = scopedControls.map((c) => {
    const assessment = readinessById.get(c.id)!;
    const layer = layerForControlCode(c.code);
    const { pillarId, pillarLabel } = pillarForControlCode(c.code);
    const layerMeta = GOVERNANCE_LAYERS[layer] ?? GOVERNANCE_LAYERS[0];

    const blockingReasons: DependencyNode["blockingReasons"] = [];
    for (const dep of relevantDeps) {
      if (dep.controlId !== c.id || dep.relationType !== "depends_on") continue;
      const prereq = readinessById.get(dep.dependsOnControlId);
      const prereqNode = scopedControls.find((sc) => sc.id === dep.dependsOnControlId);
      if (!prereq?.satisfiesDependency && prereqNode) {
        blockingReasons.push({
          controlId: prereqNode.id,
          controlCode: prereqNode.code,
          controlTitle: prereqNode.title,
          readiness: prereq?.label ?? "Not assessed",
          rationale:
            dep.rationale?.trim() ||
            `${c.code} depends on ${prereqNode.code} before it can be relied upon.`,
          whyFixFirst: whyFixFirstMessage({
            blockedControlCode: c.code,
            blockedControlTitle: c.title,
            prerequisiteCode: prereqNode.code,
            prerequisiteTitle: prereqNode.title,
          }),
          action: remediationActionForReadiness(prereq?.readiness ?? "not_assessed"),
          impactScore: dep.impactScore,
        });
      }
    }

    const blocked = blockingReasons.length > 0;

    return {
      controlId: c.id,
      controlCode: c.code,
      controlTitle: c.title,
      impactScore: blockingReasons.length > 0 ? 2 : 1,
      implementationStatus: assessment.readiness,
      blocked,
      readiness: assessment.readiness,
      readinessLabel: assessment.label,
      docCoverage: assessment.docCoverage,
      pillarId,
      pillarLabel,
      layer,
      layerLabel: layerMeta.label,
      blockingReasons,
    };
  });

  const edges: DependencyEdge[] = relevantDeps.map((d) => {
    const prereq = readinessById.get(d.dependsOnControlId);
    return {
      id: d.id,
      fromControlId: d.controlId,
      toControlId: d.dependsOnControlId,
      relationType: d.relationType,
      impactScore: d.impactScore,
      rationale: d.rationale,
      pathBlocked: !prereq?.satisfiesDependency,
    };
  });

  const blockedControlIds = nodes.filter((n) => n.blocked).map((n) => n.controlId);

  const unlockPaths = blockedControlIds
    .map((id) => buildUnlockPath(id, nodes, edges))
    .filter(
      (p): p is DependencyUnlockPath =>
        p != null && p.steps.some((s) => s.action !== "Prerequisite satisfied")
    )
    .sort((a, b) => b.steps.length - a.steps.length)
    .slice(0, 12);

  const criticalBlockerIds = new Set<string>();
  for (const node of nodes) {
    if (node.readiness === "effective") continue;
    const dependents = edges.filter((e) => e.toControlId === node.controlId && e.pathBlocked);
    if (dependents.length >= 2 || node.layer <= 1) {
      criticalBlockerIds.add(node.controlId);
    }
  }

  return {
    nodes,
    edges,
    blockedControlIds,
    unlockPaths,
    layers: [...GOVERNANCE_LAYERS],
    stats: {
      effective: nodes.filter((n) => n.readiness === "effective").length,
      partial: nodes.filter((n) => n.readiness === "partial").length,
      ineffective: nodes.filter((n) => n.readiness === "ineffective").length,
      notAssessed: nodes.filter((n) => n.readiness === "not_assessed").length,
      blocked: blockedControlIds.length,
      criticalBlockers: criticalBlockerIds.size,
    },
  };
}

export async function listControlDependencies() {
  return prisma.controlDependency.findMany({
    include: {
      control: { select: { code: true, title: true } },
      dependsOn: { select: { code: true, title: true } },
    },
    orderBy: { control: { code: "asc" } },
  });
}
