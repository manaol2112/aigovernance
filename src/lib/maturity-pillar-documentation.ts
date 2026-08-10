/**
 * Expected documentation artifacts per risk pillar — deterministic, client-safe catalog.
 */

import type { MaturityLevel, MaturityDocumentStatus } from "@prisma/client";
import { MATURITY_DOCUMENT_STATUS_LABELS } from "@/lib/maturity-document-constants";

export type PillarDocumentationItem = {
  id: string;
  title: string;
  description: string;
  typicalOwner: string;
  priority: number;
};

export const PILLAR_EXPECTED_DOCUMENTATION: Record<string, PillarDocumentationItem[]> = {
  governance: [
    {
      id: "ai-governance-policy",
      title: "AI Governance Policy",
      description: "Board-approved policy defining scope, principles, and requirements for responsible AI use.",
      typicalOwner: "Chief AI / Technology Officer",
      priority: 1,
    },
    {
      id: "ai-risk-appetite",
      title: "AI Risk Appetite Statement",
      description: "Documented tolerance levels for AI risks aligned to enterprise risk framework.",
      typicalOwner: "Chief Risk Officer",
      priority: 2,
    },
    {
      id: "ai-raci",
      title: "AI Roles & Responsibilities Matrix",
      description: "RACI or equivalent assigning accountability for AI lifecycle decisions.",
      typicalOwner: "AI Governance Office",
      priority: 3,
    },
    {
      id: "board-oversight-charter",
      title: "Board or ExCo AI Oversight Terms of Reference",
      description: "Charter describing oversight cadence, reporting, and escalation for AI.",
      typicalOwner: "Company Secretary / General Counsel",
      priority: 4,
    },
    {
      id: "ai-use-case-register",
      title: "AI Use Case Inventory",
      description: "Living register of in-scope AI systems, owners, risk tier, and status.",
      typicalOwner: "AI Governance Office",
      priority: 5,
    },
  ],
  fairness: [
    {
      id: "bias-impact-methodology",
      title: "Algorithmic Impact Assessment Methodology",
      description: "Standard approach for assessing fairness, bias, and fundamental rights impacts.",
      typicalOwner: "Responsible AI Lead",
      priority: 1,
    },
    {
      id: "bias-testing-procedure",
      title: "Bias Testing & Validation Procedure",
      description: "Documented steps, metrics, and thresholds for pre- and post-deployment bias testing.",
      typicalOwner: "Model Risk / Data Science",
      priority: 2,
    },
    {
      id: "protected-groups-register",
      title: "Protected Attributes & Testing Coverage Register",
      description: "Record of groups tested, data limitations, and mitigations applied.",
      typicalOwner: "Responsible AI Lead",
      priority: 3,
    },
    {
      id: "fundamental-rights-assessment",
      title: "Fundamental Rights Impact Assessment Template",
      description: "Template and completed assessments for high-risk AI use cases.",
      typicalOwner: "Legal / Compliance",
      priority: 4,
    },
    {
      id: "fairness-remediation-log",
      title: "Fairness Remediation & Decision Log",
      description: "Audit trail of bias findings, model changes, and approval to deploy.",
      typicalOwner: "Model Owner",
      priority: 5,
    },
  ],
  "privacy-data": [
    {
      id: "ai-data-governance-policy",
      title: "AI Data Governance Policy",
      description: "Rules for lawful collection, use, retention, and deletion of data for AI.",
      typicalOwner: "Chief Data Officer",
      priority: 1,
    },
    {
      id: "data-lineage-register",
      title: "Training & Inference Data Lineage Register",
      description: "Provenance, quality checks, and approvals for datasets used in models.",
      typicalOwner: "Data Governance",
      priority: 2,
    },
    {
      id: "dpia-ai-template",
      title: "AI Privacy Impact Assessment (DPIA) Template",
      description: "Template and records for DPIAs where personal data is processed by AI.",
      typicalOwner: "Data Protection Officer",
      priority: 3,
    },
    {
      id: "data-quality-standards",
      title: "AI Data Quality Standards",
      description: "Minimum quality, representativeness, and labeling requirements for AI data.",
      typicalOwner: "Data Engineering",
      priority: 4,
    },
    {
      id: "retention-schedule-ai",
      title: "AI Data Retention & Disposal Schedule",
      description: "Retention periods and secure disposal for model training and inference data.",
      typicalOwner: "Data Protection Officer",
      priority: 5,
    },
  ],
  "safety-reliability": [
    {
      id: "ai-safety-policy",
      title: "AI Safety & Reliability Policy",
      description: "Requirements for harm prevention, accuracy targets, and safe deployment.",
      typicalOwner: "Chief Technology Officer",
      priority: 1,
    },
    {
      id: "model-validation-report",
      title: "Model Validation & Testing Report",
      description: "Documented validation results, test coverage, and release criteria.",
      typicalOwner: "Model Risk Management",
      priority: 2,
    },
    {
      id: "robustness-test-plan",
      title: "Robustness & Edge-Case Test Plan",
      description: "Plan covering failure modes, stress tests, and acceptable error bounds.",
      typicalOwner: "ML Engineering",
      priority: 3,
    },
    {
      id: "human-harm-assessment",
      title: "Human Harm Risk Assessment",
      description: "Assessment of physical, psychological, or societal harm from AI outputs.",
      typicalOwner: "Product / Risk Owner",
      priority: 4,
    },
    {
      id: "deployment-checklist",
      title: "Pre-Production Safety Checklist",
      description: "Sign-off checklist before production release of AI capabilities.",
      typicalOwner: "Release Manager",
      priority: 5,
    },
  ],
  security: [
    {
      id: "ai-security-policy",
      title: "AI Security Policy",
      description: "Security requirements for models, pipelines, APIs, and training infrastructure.",
      typicalOwner: "Chief Information Security Officer",
      priority: 1,
    },
    {
      id: "adversarial-risk-assessment",
      title: "Adversarial & Model Integrity Risk Assessment",
      description: "Assessment of poisoning, evasion, and extraction risks for in-scope models.",
      typicalOwner: "Application Security",
      priority: 2,
    },
    {
      id: "model-access-controls",
      title: "Model & Pipeline Access Control Standard",
      description: "Authentication, authorization, and secrets management for AI assets.",
      typicalOwner: "Security Engineering",
      priority: 3,
    },
    {
      id: "security-monitoring-runbook",
      title: "AI Security Monitoring Runbook",
      description: "Procedures for detecting and responding to AI-specific security events.",
      typicalOwner: "Security Operations",
      priority: 4,
    },
    {
      id: "vendor-security-requirements",
      title: "Third-Party AI Security Requirements",
      description: "Minimum security clauses and due diligence for AI vendors and APIs.",
      typicalOwner: "Vendor Risk Management",
      priority: 5,
    },
  ],
  transparency: [
    {
      id: "transparency-disclosure-policy",
      title: "AI Transparency & Disclosure Policy",
      description: "When and how users are informed that AI is involved in decisions or content.",
      typicalOwner: "Product Legal / Compliance",
      priority: 1,
    },
    {
      id: "explainability-standard",
      title: "Explainability Standard",
      description: "Requirements for interpretability by use-case tier and audience.",
      typicalOwner: "Responsible AI Lead",
      priority: 2,
    },
    {
      id: "user-facing-disclosures",
      title: "User-Facing AI Disclosure Templates",
      description: "Approved copy and UI patterns for AI transparency in products.",
      typicalOwner: "Product Management",
      priority: 3,
    },
    {
      id: "limitations-register",
      title: "Known Limitations & Capability Register",
      description: "Documented limits, failure cases, and inappropriate use warnings.",
      typicalOwner: "Product Owner",
      priority: 4,
    },
    {
      id: "stakeholder-communication-plan",
      title: "Stakeholder Communication Plan",
      description: "Plan for communicating AI capabilities and limits to regulators and customers.",
      typicalOwner: "Communications / Compliance",
      priority: 5,
    },
  ],
  oversight: [
    {
      id: "human-oversight-policy",
      title: "Human Oversight Policy",
      description: "Requirements for human-in-the-loop, override, and escalation design.",
      typicalOwner: "Operations / Risk Owner",
      priority: 1,
    },
    {
      id: "monitoring-procedure",
      title: "AI Operational Monitoring Procedure",
      description: "Cadence, metrics, and thresholds for ongoing performance monitoring.",
      typicalOwner: "ML Operations",
      priority: 2,
    },
    {
      id: "override-escalation-playbook",
      title: "Override & Escalation Playbook",
      description: "Steps for human reviewers to intervene, override, or halt AI outputs.",
      typicalOwner: "Operations Manager",
      priority: 3,
    },
    {
      id: "incident-response-plan",
      title: "AI Incident Response Plan",
      description: "Classification, response roles, and notification for AI-related incidents.",
      typicalOwner: "Incident Response Lead",
      priority: 4,
    },
    {
      id: "post-incident-review-template",
      title: "Post-Incident Review Template",
      description: "Template for root-cause analysis and corrective actions after AI incidents.",
      typicalOwner: "Risk Management",
      priority: 5,
    },
  ],
  compliance: [
    {
      id: "technical-documentation-file",
      title: "AI Technical Documentation File",
      description: "Consolidated technical documentation per regulatory requirements (e.g. EU AI Act Annex IV).",
      typicalOwner: "Compliance / Engineering",
      priority: 1,
    },
    {
      id: "logging-retention-standard",
      title: "AI Logging & Record-Retention Standard",
      description: "What to log, retention periods, and audit-readiness for AI systems.",
      typicalOwner: "Compliance",
      priority: 2,
    },
    {
      id: "quality-management-procedure",
      title: "AI Quality Management Procedure",
      description: "QMS-aligned process for design, change control, and post-market monitoring.",
      typicalOwner: "Quality Assurance",
      priority: 3,
    },
    {
      id: "conformity-assessment-records",
      title: "Conformity Assessment Records",
      description: "Evidence of assessments, sign-offs, and regulatory submissions where applicable.",
      typicalOwner: "Regulatory Affairs",
      priority: 4,
    },
    {
      id: "audit-trail-register",
      title: "AI Decision Audit Trail Register",
      description: "Traceability from inputs to outputs for high-risk or regulated decisions.",
      typicalOwner: "Compliance",
      priority: 5,
    },
  ],
  "supply-chain": [
    {
      id: "third-party-ai-policy",
      title: "Third-Party AI Governance Policy",
      description: "Requirements for procuring, integrating, and monitoring external AI services.",
      typicalOwner: "Procurement / Vendor Risk",
      priority: 1,
    },
    {
      id: "vendor-due-diligence-checklist",
      title: "AI Vendor Due Diligence Checklist",
      description: "Standard questionnaire and evidence requests for AI suppliers.",
      typicalOwner: "Vendor Risk Management",
      priority: 2,
    },
    {
      id: "contractual-ai-clauses",
      title: "AI Contractual Terms & SLAs",
      description: "Standard clauses covering data use, security, transparency, and liability.",
      typicalOwner: "Legal / Procurement",
      priority: 3,
    },
    {
      id: "vendor-register",
      title: "AI Vendor & Component Register",
      description: "Inventory of third-party models, APIs, and dependencies with risk tier.",
      typicalOwner: "AI Governance Office",
      priority: 4,
    },
    {
      id: "ongoing-vendor-assurance",
      title: "Ongoing Vendor Assurance Plan",
      description: "Periodic reviews, attestations, and exit plans for critical AI vendors.",
      typicalOwner: "Vendor Risk Management",
      priority: 5,
    },
  ],
  systemic: [
    {
      id: "gpai-governance-framework",
      title: "GPAI / Systemic Risk Governance Framework",
      description: "Governance approach for general-purpose or high-reach AI capabilities.",
      typicalOwner: "Executive Sponsor / AI Governance",
      priority: 1,
    },
    {
      id: "systemic-risk-assessment",
      title: "Systemic Impact Risk Assessment",
      description: "Assessment of large-scale societal or market-wide harm scenarios.",
      typicalOwner: "Enterprise Risk Management",
      priority: 2,
    },
    {
      id: "red-teaming-report",
      title: "Red-Teaming & Safety Evaluation Report",
      description: "Documented adversarial testing and systemic safety evaluation results.",
      typicalOwner: "Safety / Security Lead",
      priority: 3,
    },
    {
      id: "downstream-use-policy",
      title: "Downstream Use & Deployment Policy",
      description: "Rules for how GPAI outputs may be used by internal teams and external parties.",
      typicalOwner: "Legal / Product",
      priority: 4,
    },
    {
      id: "regulator-engagement-log",
      title: "Regulator & Stakeholder Engagement Log",
      description: "Record of regulatory correspondence and commitments for systemic AI.",
      typicalOwner: "Regulatory Affairs",
      priority: 5,
    },
  ],
};

export type PillarDocumentationExpectation = PillarDocumentationItem & {
  status: "establish" | "review" | "maintain";
  statusLabel: string;
  responseStatus?: MaturityDocumentStatus | null;
  responseLabel?: string | null;
};

export function buildPillarDocumentationExpectations(
  pillarId: string,
  options: {
    gapCount: number;
    partialCount: number;
    maturityLevel: MaturityLevel;
    missingDocumentationCount?: number;
    documentResponses?: Map<string, MaturityDocumentStatus>;
  }
): PillarDocumentationExpectation[] {
  const catalog = PILLAR_EXPECTED_DOCUMENTATION[pillarId] ?? [];
  const needsFoundation =
    options.gapCount > 0 ||
    (options.missingDocumentationCount ?? 0) > 0 ||
    options.maturityLevel === "not_implemented" ||
    options.maturityLevel === "initial";
  const needsReview = options.partialCount > 0 && !needsFoundation;

  return catalog
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map((item) => {
      let status: PillarDocumentationExpectation["status"];
      let statusLabel: string;

      if (needsFoundation) {
        status = "establish";
        statusLabel = "Establish or formalize";
      } else if (needsReview) {
        status = item.priority <= 3 ? "review" : "maintain";
        statusLabel = item.priority <= 3 ? "Review and strengthen" : "Maintain";
      } else {
        status = "maintain";
        statusLabel = "Maintain and keep current";
      }

      return {
        ...item,
        status,
        statusLabel,
        responseStatus: options.documentResponses?.get(item.id) ?? null,
        responseLabel: options.documentResponses?.has(item.id)
          ? MATURITY_DOCUMENT_STATUS_LABELS[options.documentResponses.get(item.id)!]
          : null,
      };
    });
}
