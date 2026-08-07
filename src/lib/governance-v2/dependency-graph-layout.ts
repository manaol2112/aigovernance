import type { DependencyGraph, DependencyNode } from "@/lib/governance-v2/types";

export type SwimlaneGroup = {
  layerIndex: number;
  layerLabel: string;
  layerDescription: string;
  nodes: DependencyNode[];
};

/** Canonical AIMS paths shown as readable left-to-right flows. */
export const CANONICAL_DEPENDENCY_PATHS: Array<{
  id: string;
  label: string;
  description: string;
  codes: string[];
}> = [
  {
    id: "governance",
    label: "Governance foundation",
    description: "Policy and accountability before risk treatment",
    codes: ["CTRL-GOV-001", "CTRL-GOV-002", "CTRL-RM-001"],
  },
  {
    id: "lifecycle",
    label: "Build → deploy → operate",
    description: "Data, validation, production, and monitoring",
    codes: [
      "CTRL-GOV-001",
      "CTRL-DATA-001",
      "CTRL-TEST-001",
      "CTRL-DEPLOY-001",
      "CTRL-MON-001",
      "CTRL-INC-001",
    ],
  },
  {
    id: "assurance",
    label: "Documentation & conformity",
    description: "QMS, records, and conformity assessment",
    codes: ["CTRL-GOV-001", "CTRL-QMS-001", "CTRL-DOC-001", "CTRL-LOG-001", "CTRL-CONFORM-001"],
  },
];

export function buildSwimlaneGroups(graph: DependencyGraph): SwimlaneGroup[] {
  const groups: SwimlaneGroup[] = [];

  for (const layer of graph.layers) {
    const nodes = graph.nodes
      .filter((n) => n.layer === layer.index)
      .sort((a, b) => {
        if (a.blocked !== b.blocked) return a.blocked ? -1 : 1;
        return a.controlCode.localeCompare(b.controlCode);
      });

    if (nodes.length === 0) continue;

    groups.push({
      layerIndex: layer.index,
      layerLabel: layer.label,
      layerDescription: layer.description,
      nodes,
    });
  }

  return groups;
}

export type CriticalPathStep = {
  controlId: string | null;
  controlCode: string;
  controlTitle: string;
  readiness: DependencyNode["readiness"] | "out_of_scope";
  readinessLabel: string;
  blocked: boolean;
  inScope: boolean;
};

export type CriticalPath = {
  id: string;
  label: string;
  description: string;
  steps: CriticalPathStep[];
  blockedCount: number;
  pathOpen: boolean;
};

export function buildCriticalPaths(graph: DependencyGraph): CriticalPath[] {
  const nodeByCode = new Map(graph.nodes.map((n) => [n.controlCode, n]));

  return CANONICAL_DEPENDENCY_PATHS.map((path) => {
    const steps: CriticalPathStep[] = path.codes.map((code) => {
      const node = nodeByCode.get(code);
      if (!node) {
        return {
          controlId: null,
          controlCode: code,
          controlTitle: "Not in assessment scope",
          readiness: "out_of_scope" as const,
          readinessLabel: "Out of scope",
          blocked: false,
          inScope: false,
        };
      }
      return {
        controlId: node.controlId,
        controlCode: node.controlCode,
        controlTitle: node.controlTitle,
        readiness: node.readiness,
        readinessLabel: node.readinessLabel,
        blocked: node.blocked,
        inScope: true,
      };
    });

    const inScopeSteps = steps.filter((s) => s.inScope);
    const blockedCount = inScopeSteps.filter((s) => s.blocked || s.readiness !== "effective").length;
    const pathOpen = inScopeSteps.length > 0 && inScopeSteps.every((s) => s.readiness === "effective");

    return {
      id: path.id,
      label: path.label,
      description: path.description,
      steps,
      blockedCount,
      pathOpen,
    };
  });
}

export function getHighlightedIds(
  graph: DependencyGraph,
  selectedId: string | null
): Set<string> {
  if (!selectedId) return new Set();

  const ids = new Set<string>([selectedId]);

  for (const edge of graph.edges) {
    if (edge.fromControlId === selectedId) {
      ids.add(edge.toControlId);
    }
    if (edge.toControlId === selectedId) {
      ids.add(edge.fromControlId);
    }
  }

  return ids;
}

export function buildPrerequisiteChain(
  graph: DependencyGraph,
  controlId: string
): DependencyNode[] {
  const nodeById = new Map(graph.nodes.map((n) => [n.controlId, n]));
  const chain: DependencyNode[] = [];
  const visited = new Set<string>();

  function walk(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const prereqEdges = graph.edges.filter(
      (e) => e.fromControlId === id && e.relationType === "depends_on"
    );

    for (const edge of prereqEdges) {
      walk(edge.toControlId);
      const node = nodeById.get(edge.toControlId);
      if (node && !chain.some((c) => c.controlId === node.controlId)) {
        chain.push(node);
      }
    }
  }

  walk(controlId);
  chain.sort((a, b) => a.layer - b.layer || a.controlCode.localeCompare(b.controlCode));

  const self = nodeById.get(controlId);
  if (self) chain.push(self);

  return chain;
}
