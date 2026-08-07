import type {
  ControlFollowUpEntry,
  FollowUpPack,
  FollowUpQuestionItem,
} from "@/lib/follow-up-questions-types";

export type {
  ControlFollowUpEntry,
  FollowUpPack,
  FollowUpQuestionItem,
} from "@/lib/follow-up-questions-types";

import { prisma } from "@/lib/db";
import { getControlWorkshopGuide } from "@/lib/control-workshop-guide";
import { loadControlRequirementSummaries, type ControlRequirementSummary } from "@/lib/control-requirement-context";
import { getPillarControlTreeForAssessment } from "@/lib/pillar-control-tree";
import { runWithConcurrency } from "@/lib/concurrency";
import {
  loadFollowUpQuestionsStore,
  type StoredCustomFollowUp,
} from "@/lib/follow-up-questions-store";

const RECOMMENDED_QUESTION_LIMIT = 3;

function isNotAssessedControl(evalRow: { complianceStatus: string } | null): boolean {
  return !evalRow || evalRow.complianceStatus === "not_assessed";
}

function buildStandardQuestions(
  control: { code: string; title: string; description: string; ownerRole: string },
  guide: Awaited<ReturnType<typeof getControlWorkshopGuide>>,
  reqSummary: ControlRequirementSummary | undefined
): FollowUpQuestionItem[] {
  const items: FollowUpQuestionItem[] = [];
  const seen = new Set<string>();

  function push(item: FollowUpQuestionItem) {
    const key = item.text.toLowerCase().slice(0, 80);
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  }

  for (const block of guide?.subPillarWorkshop ?? []) {
    for (const q of block.questions) {
      push({
        id: q.id,
        text: q.prompt,
        source: "workshop",
        phaseLabel: q.phaseLabel,
      });
      const probe = q.probes.find(Boolean);
      if (probe) {
        push({
          id: `${q.id}-probe`,
          text: probe,
          source: "probe",
          phaseLabel: q.phaseLabel,
        });
      }
      if (items.length >= RECOMMENDED_QUESTION_LIMIT) break;
    }
    if (items.length >= RECOMMENDED_QUESTION_LIMIT) break;
  }

  push({
    id: `${control.code}-tpl-practices`,
    text: `Describe what is currently in place for ${control.title} (${control.code}), including named owners, approval path, and artifacts that demonstrate operation.`,
    source: "template",
  });

  push({
    id: `${control.code}-tpl-evidence`,
    text: `What documentary or system evidence can you provide for ${control.code}? If none exists today, state that explicitly and explain interim controls.`,
    source: "template",
  });

  const frameworkReq = reqSummary?.frameworkRequirements?.[0];
  if (frameworkReq) {
    push({
      id: `${control.code}-tpl-framework`,
      text: `How does the organization address this linked obligation: ${frameworkReq.slice(0, 280)}${frameworkReq.length > 280 ? "…" : ""}`,
      source: "template",
    });
  } else if (control.description?.trim()) {
    push({
      id: `${control.code}-tpl-requirement`,
      text: `Against the canonical requirement for ${control.code} — ${control.description.slice(0, 220)}${control.description.length > 220 ? "…" : ""} — what practices exist and what is missing?`,
      source: "template",
    });
  }

  if (control.ownerRole?.trim()) {
    push({
      id: `${control.code}-tpl-owner`,
      text: `Who is accountable for ${control.code} (${control.ownerRole})? Walk through the last time this control was exercised end-to-end.`,
      source: "template",
    });
  }

  return items.slice(0, RECOMMENDED_QUESTION_LIMIT);
}

function toCustomItems(stored: StoredCustomFollowUp[]): FollowUpQuestionItem[] {
  return stored.map((q) => ({
    id: q.id,
    text: q.text,
    source: "custom" as const,
  }));
}

export async function buildFollowUpPack(
  assessmentId: string,
  department?: string | null
): Promise<FollowUpPack> {
  const [pillarTree, evaluations, customStore] = await Promise.all([
    getPillarControlTreeForAssessment(assessmentId, department),
    prisma.controlEvaluation.findMany({
      where: { assessmentId },
      select: {
        controlId: true,
        complianceStatus: true,
        analyzedAt: true,
        inPlaceFindings: true,
        gapFindings: true,
      },
    }),
    loadFollowUpQuestionsStore(assessmentId),
  ]);

  const evalByControlId = new Map(evaluations.map((e) => [e.controlId, e]));

  type GapControl = {
    controlId: string;
    controlCode: string;
    controlTitle: string;
    pillarId: string;
    pillarLabel: string;
    ownerRole: string;
    description: string;
    frameworkCodes: string[];
    reason: "not_assessed" | "not_discussed" | "never_analyzed";
    complianceStatus: string;
  };

  const gapControls: GapControl[] = [];
  let totalInScope = 0;

  for (const pillar of pillarTree) {
    for (const control of pillar.controls) {
      totalInScope++;
      const evalRow = evalByControlId.get(control.id) ?? null;
      if (!isNotAssessedControl(evalRow)) continue;

      gapControls.push({
        controlId: control.id,
        controlCode: control.code,
        controlTitle: control.title,
        pillarId: pillar.pillarId,
        pillarLabel: pillar.pillarLabel,
        ownerRole: control.ownerRole,
        description: control.description,
        frameworkCodes: pillar.frameworkCodes,
        reason: "not_assessed" as const,
        complianceStatus: evalRow?.complianceStatus ?? "not_assessed",
      });
    }
  }

  const reqSummaries = await loadControlRequirementSummaries(gapControls.map((c) => c.controlId));

  const entries = await runWithConcurrency(gapControls, 5, async (ctrl) => {
    const guide = await getControlWorkshopGuide(ctrl.controlId, assessmentId, department);
    const reqSummary = reqSummaries.get(ctrl.controlCode.toUpperCase());
    const standardQuestions = buildStandardQuestions(
      {
        code: ctrl.controlCode,
        title: ctrl.controlTitle,
        description: ctrl.description,
        ownerRole: ctrl.ownerRole,
      },
      guide,
      reqSummary
    );
    const customStored = customStore[ctrl.controlId]?.questions ?? [];

    return {
      controlId: ctrl.controlId,
      controlCode: ctrl.controlCode,
      controlTitle: ctrl.controlTitle,
      pillarId: ctrl.pillarId,
      pillarLabel: ctrl.pillarLabel,
      ownerRole: ctrl.ownerRole,
      complianceStatus: ctrl.complianceStatus,
      reason: ctrl.reason,
      standardQuestions,
      customQuestions: toCustomItems(customStored),
      frameworkCodes: ctrl.frameworkCodes,
    } satisfies ControlFollowUpEntry;
  });

  entries.sort(
    (a, b) =>
      a.pillarLabel.localeCompare(b.pillarLabel) || a.controlCode.localeCompare(b.controlCode)
  );

  return {
    assessmentId,
    generatedAt: new Date().toISOString(),
    totalInScope,
    coverageGapCount: entries.length,
    entries,
  };
}

export async function buildFollowUpEntryForControl(
  assessmentId: string,
  controlId: string,
  department?: string | null
): Promise<ControlFollowUpEntry | null> {
  const pack = await buildFollowUpPack(assessmentId, department);
  return pack.entries.find((e) => e.controlId === controlId) ?? null;
}

export function formatFollowUpPackMarkdown(
  pack: FollowUpPack,
  options?: { assessmentName?: string; clientName?: string }
): string {
  const lines: string[] = [
    "# Follow-up questions — not assessed controls",
    "",
    options?.clientName ? `**Client:** ${options.clientName}` : "",
    options?.assessmentName ? `**Assessment:** ${options.assessmentName}` : "",
    `**Generated:** ${new Date(pack.generatedAt).toLocaleString()}`,
    `**Controls:** ${pack.coverageGapCount} not assessed`,
    "",
  ].filter(Boolean);

  let currentPillar = "";
  for (const entry of pack.entries) {
    if (entry.pillarLabel !== currentPillar) {
      currentPillar = entry.pillarLabel;
      lines.push(`## ${currentPillar}`, "");
    }

    lines.push(`### ${entry.controlCode} — ${entry.controlTitle}`);
    lines.push("");

    const recommended = entry.standardQuestions;
    const custom = entry.customQuestions;
    let n = 1;

    for (const q of recommended) {
      lines.push(`${n}. ${q.text}`);
      n++;
    }
    for (const q of custom) {
      lines.push(`${n}. ${q.text} *(custom)*`);
      n++;
    }

    if (recommended.length === 0 && custom.length === 0) {
      lines.push("_No questions recorded._");
    }

    lines.push("");
  }

  return lines.join("\n");
}
