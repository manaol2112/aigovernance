/**
 * Intelligent assessment suite triggers for the AI System Register.
 * Maps register profile answers → required / recommended assessments.
 */

export const REGISTER_ASSESSMENT_TYPES = [
  {
    id: "privacy_dpia",
    title: "Privacy / DPIA assessment",
    shortTitle: "Privacy / DPIA",
    description:
      "Evaluate personal data processing, lawful basis, retention, and DPIA readiness.",
    frameworkAnchors: ["GDPR", "ISO/IEC 27701", "NIST Privacy"],
  },
  {
    id: "fundamental_rights",
    title: "AI Impact / Fundamental Rights assessment",
    shortTitle: "Fundamental rights",
    description:
      "Assess impacts on individuals’ rights, opportunities, and fundamental freedoms (FRIA-style).",
    frameworkAnchors: ["EU AI Act FRIA", "OECD", "NIST AI RMF Map"],
  },
  {
    id: "fairness_bias",
    title: "Fairness & Bias assessment",
    shortTitle: "Fairness & bias",
    description:
      "Examine discriminatory outcomes, disparate impact, and bias testing for people-affecting decisions.",
    frameworkAnchors: ["NIST AI RMF", "ISO/IEC 24027", "EU AI Act"],
  },
  {
    id: "third_party_model",
    title: "Third-Party / Model Risk assessment",
    shortTitle: "Third-party / model",
    description:
      "Vendor, foundation-model, and supply-chain due diligence for externally sourced AI.",
    frameworkAnchors: ["ISO/IEC 42001", "NIST AI RMF Map 4", "Vendor risk"],
  },
  {
    id: "agent_autonomy",
    title: "AI Agent / Autonomy Risk assessment",
    shortTitle: "Agent / autonomy",
    description:
      "Evaluate autonomous actions, tool use, escalation, and human override effectiveness.",
    frameworkAnchors: ["NIST AI RMF", "ISO/IEC 42001 A.9"],
  },
  {
    id: "security_threat",
    title: "AI Security / Threat assessment",
    shortTitle: "AI security",
    description:
      "Threat modeling for prompt injection, data exfiltration, model abuse, and attack surface.",
    frameworkAnchors: ["NIST AI RMF Measure", "OWASP LLM Top 10"],
  },
  {
    id: "safety",
    title: "AI Safety assessment",
    shortTitle: "AI safety",
    description:
      "High-consequence failure modes, harm scenarios, and safety mitigations.",
    frameworkAnchors: ["NIST AI RMF", "ISO/IEC 42001"],
  },
  {
    id: "data_risk",
    title: "Data Risk assessment",
    shortTitle: "Data risk",
    description:
      "Training, fine-tuning, and operational data quality, lineage, poisoning, and leakage risks.",
    frameworkAnchors: ["NIST AI RMF", "ISO/IEC 5259"],
  },
  {
    id: "legal_regulatory",
    title: "Legal / Regulatory assessment",
    shortTitle: "Legal / regulatory",
    description:
      "Jurisdiction, sector obligations, prohibited/restricted use, and compliance evidence gaps.",
    frameworkAnchors: ["EU AI Act", "Sector regulation", "Corporate policy"],
  },
  {
    id: "change_model",
    title: "Change / Model Risk assessment",
    shortTitle: "Change / model",
    description:
      "Controls for material model, prompt, or dependency changes before and after go-live.",
    frameworkAnchors: ["ISO/IEC 42001", "ITIL change", "MLOps"],
  },
  {
    id: "formal_risk",
    title: "Formal AI Risk Assessment",
    shortTitle: "Final risk rating",
    description:
      "Final consolidation: ingest suite assessment findings, set overall inherent / residual risk, and identify risk treatment.",
    frameworkAnchors: ["NIST AI RMF", "ISO/IEC 42001", "COSO ERM"],
  },
] as const;

export type RegisterAssessmentTypeId = (typeof REGISTER_ASSESSMENT_TYPES)[number]["id"];

export type AssessmentPriority = "required" | "recommended";

export type AssessmentTriggerResult = {
  assessmentType: RegisterAssessmentTypeId;
  title: string;
  shortTitle: string;
  description: string;
  frameworkAnchors: string[];
  priority: AssessmentPriority;
  reasons: string[];
  triggerIds: string[];
};

/** Subset of register fields used for trigger evaluation. */
export type AssessmentTriggerInput = {
  personalDataInvolved?: boolean | null;
  specialCategoryData?: boolean | null;
  dataCategories?: string[] | null;
  decisionImpact?: string | null;
  autonomyLevel?: string | null;
  humanInTheLoop?: boolean | null;
  aiCapabilities?: string[] | null;
  buildType?: string | null;
  modelProvider?: string | null;
  modelNameVersion?: string | null;
  modelType?: string | null;
  developerProvider?: string | null;
  vendor?: string | null;
  trainsOnCustomerData?: string | null;
  businessCriticality?: string | null;
  criticalBusinessProcess?: boolean | null;
  failureImpact?: string | null;
  euAnnexIiiRelevance?: string | null;
  regulatoryJurisdictions?: string[] | null;
  prohibitedUseNotes?: string | null;
  riskTier?: string | null;
  customerFacing?: boolean | null;
  employeeFacing?: boolean | null;
  externalFacing?: boolean | null;
  status?: string | null;
  deploymentStage?: string | null;
  hostingLocation?: string | null;
  crossBorderTransfers?: boolean | null;
  friaStatus?: string | null;
  dpiaStatus?: string | null;
};

type Accumulator = Map<
  RegisterAssessmentTypeId,
  { priority: AssessmentPriority; reasons: string[]; triggerIds: string[] }
>;

function addTrigger(
  acc: Accumulator,
  assessmentType: RegisterAssessmentTypeId,
  triggerId: string,
  reason: string,
  priority: AssessmentPriority = "required"
) {
  const existing = acc.get(assessmentType);
  if (!existing) {
    acc.set(assessmentType, {
      priority,
      reasons: [reason],
      triggerIds: [triggerId],
    });
    return;
  }
  if (!existing.triggerIds.includes(triggerId)) {
    existing.triggerIds.push(triggerId);
    existing.reasons.push(reason);
  }
  if (priority === "required") existing.priority = "required";
}

function hasCapability(input: AssessmentTriggerInput, value: string): boolean {
  return (input.aiCapabilities ?? []).includes(value);
}

function textLooksMaterial(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length >= 12);
}

function isElevatedTier(tier: string | null | undefined): boolean {
  return ["prohibited", "high", "gpai", "limited"].includes(tier ?? "");
}

function isHighCriticality(value: string | null | undefined): boolean {
  return value === "high" || value === "mission_critical";
}

function usesExternalModel(input: AssessmentTriggerInput): boolean {
  const build = input.buildType ?? "";
  if (build === "vendor" || build === "open_source" || build === "mixed") return true;
  if (input.modelProvider?.trim()) return true;
  if (input.developerProvider?.trim() && build !== "internal") return true;
  if (input.vendor?.trim()) return true;
  if (input.modelType === "llm" || input.modelType === "agent") return true;
  return false;
}

function isPeopleDecisioning(input: AssessmentTriggerInput): boolean {
  return ["decision_support", "automated_recommendation", "automated_decision"].includes(
    input.decisionImpact ?? ""
  );
}

function isAutonomous(input: AssessmentTriggerInput): boolean {
  return (
    input.autonomyLevel === "high" ||
    hasCapability(input, "agentic") ||
    input.modelType === "agent" ||
    input.humanInTheLoop === false
  );
}

function hasCyberExposure(input: AssessmentTriggerInput): boolean {
  return Boolean(
    input.externalFacing ||
      input.customerFacing ||
      usesExternalModel(input) ||
      isAutonomous(input) ||
      input.hostingLocation?.trim() ||
      input.crossBorderTransfers
  );
}

function isRegulated(input: AssessmentTriggerInput): boolean {
  const jurisdictions = input.regulatoryJurisdictions ?? [];
  if (jurisdictions.some((j) => j !== "none_unclear")) return true;
  if (["potential", "confirmed", "legal_review"].includes(input.euAnnexIiiRelevance ?? "")) {
    return true;
  }
  if (textLooksMaterial(input.prohibitedUseNotes)) return true;
  if (input.friaStatus && input.friaStatus !== "not_required") return true;
  if (input.dpiaStatus && input.dpiaStatus !== "not_required") return true;
  return false;
}

function isHighImpact(input: AssessmentTriggerInput): boolean {
  return (
    isElevatedTier(input.riskTier) ||
    isHighCriticality(input.businessCriticality) ||
    Boolean(input.criticalBusinessProcess) ||
    ["confirmed", "legal_review"].includes(input.euAnnexIiiRelevance ?? "") ||
    textLooksMaterial(input.failureImpact) ||
    input.specialCategoryData === true ||
    (isPeopleDecisioning(input) &&
      Boolean(input.customerFacing || input.employeeFacing || input.externalFacing))
  );
}

function usesTrainingOrTuningData(input: AssessmentTriggerInput): boolean {
  const trains = (input.trainsOnCustomerData ?? "").toLowerCase();
  if (trains === "yes") return true;
  const categories = input.dataCategories ?? [];
  if (categories.some((c) => /train|model|content|intellectual/i.test(c))) return true;
  if (hasCapability(input, "genai") && (input.personalDataInvolved || categories.length > 0)) {
    return true;
  }
  return false;
}

function needsChangeModelControls(input: AssessmentTriggerInput): boolean {
  const inProd =
    input.deploymentStage === "prod" ||
    input.status === "production" ||
    input.status === "pilot";
  return Boolean(inProd && (usesExternalModel(input) || input.modelNameVersion?.trim()));
}

/** Evaluate register answers and return the ordered assessment suite. */
export function determineRequiredAssessments(
  input: AssessmentTriggerInput
): AssessmentTriggerResult[] {
  const acc: Accumulator = new Map();

  // Privacy / DPIA
  if (input.personalDataInvolved || input.specialCategoryData) {
    addTrigger(
      acc,
      "privacy_dpia",
      "personal_or_sensitive_data",
      input.specialCategoryData
        ? "Special-category / sensitive data is processed."
        : "Personal data is processed.",
      "required"
    );
  }
  if ((input.dataCategories ?? []).length > 0 && input.personalDataInvolved) {
    addTrigger(
      acc,
      "privacy_dpia",
      "data_categories_personal",
      "Personal data categories are declared on the register.",
      "required"
    );
  }
  if (input.dpiaStatus && input.dpiaStatus !== "not_required") {
    addTrigger(
      acc,
      "privacy_dpia",
      "dpia_status",
      `DPIA status is set to ${input.dpiaStatus.replace(/_/g, " ")}.`,
      "required"
    );
  }

  // Fundamental rights / AI impact
  if (
    isPeopleDecisioning(input) ||
    input.employeeFacing ||
    input.customerFacing ||
    textLooksMaterial(input.failureImpact) ||
    input.friaStatus && input.friaStatus !== "not_required" ||
    ["potential", "confirmed", "legal_review"].includes(input.euAnnexIiiRelevance ?? "")
  ) {
    addTrigger(
      acc,
      "fundamental_rights",
      "rights_or_opportunities_impact",
      isPeopleDecisioning(input)
        ? "System makes or supports decisions that can affect individuals."
        : input.employeeFacing || input.customerFacing
          ? "Use case is customer- or employee-facing."
          : "Register signals potential rights/impact exposure (FRIA / Annex III / failure impact).",
      "required"
    );
  }

  // Fairness & bias
  if (isPeopleDecisioning(input) || hasCapability(input, "predictive") || hasCapability(input, "recommendation") || hasCapability(input, "biometric")) {
    addTrigger(
      acc,
      "fairness_bias",
      "people_decisions_or_scoring",
      isPeopleDecisioning(input)
        ? "Makes decisions or recommendations about people."
        : "Capability profile includes scoring, recommendation, or biometric processing.",
      "required"
    );
  }

  // Formal AI risk
  if (isHighImpact(input) || isAutonomous(input) || isRegulated(input)) {
    addTrigger(
      acc,
      "formal_risk",
      "high_impact_or_regulated",
      isHighImpact(input)
        ? "High-impact / high-risk profile (criticality, risk tier, Annex III, or failure impact)."
        : isAutonomous(input)
          ? "Autonomy / agentic profile requires formal residual risk rating."
          : "Regulated activity requires a formal AI risk assessment.",
      "required"
    );
  } else {
    addTrigger(
      acc,
      "formal_risk",
      "baseline_register",
      "Baseline formal risk assessment is recommended for every material AI use case.",
      "recommended"
    );
  }

  // Third-party / model
  if (usesExternalModel(input)) {
    addTrigger(
      acc,
      "third_party_model",
      "external_or_foundation_model",
      "Uses external, vendor, open-source, or foundation-model components.",
      "required"
    );
  }

  // Agent / autonomy
  if (isAutonomous(input)) {
    addTrigger(
      acc,
      "agent_autonomy",
      "autonomous_agent_capability",
      input.humanInTheLoop === false
        ? "No meaningful human oversight is declared."
        : "Autonomous / agentic capability or high autonomy level is declared.",
      "required"
    );
  }

  // Security
  if (hasCyberExposure(input)) {
    addTrigger(
      acc,
      "security_threat",
      "cybersecurity_exposure",
      input.externalFacing || input.customerFacing
        ? "External or customer-facing exposure increases AI attack surface."
        : "External models, hosting, autonomy, or cross-border transfers create security exposure.",
      "required"
    );
  }

  // Safety
  if (
    textLooksMaterial(input.failureImpact) ||
    isHighCriticality(input.businessCriticality) ||
    Boolean(input.criticalBusinessProcess) ||
    input.riskTier === "prohibited" ||
    input.riskTier === "high"
  ) {
    addTrigger(
      acc,
      "safety",
      "high_consequence_failure",
      textLooksMaterial(input.failureImpact)
        ? "Potential impact if AI fails is material."
        : "Business criticality / risk tier indicates high-consequence failure potential.",
      "required"
    );
  }

  // Data risk (training / fine-tuning)
  if (usesTrainingOrTuningData(input)) {
    addTrigger(
      acc,
      "data_risk",
      "training_or_finetuning_data",
      (input.trainsOnCustomerData ?? "").toLowerCase() === "yes"
        ? "System trains or fine-tunes on customer data."
        : "GenAI/data profile indicates training, tuning, or model-relevant data risk.",
      "required"
    );
  }

  // Legal / regulatory
  if (isRegulated(input)) {
    addTrigger(
      acc,
      "legal_regulatory",
      "regulated_activity",
      (input.regulatoryJurisdictions ?? []).length
        ? "Regulatory jurisdictions are declared on the register."
        : "Annex III, prohibited-use notes, or FRIA/DPIA status indicate regulated activity.",
      "required"
    );
  }

  // Change / model risk
  if (needsChangeModelControls(input)) {
    addTrigger(
      acc,
      "change_model",
      "material_model_change_context",
      "Pilot/production use with a named or external model requires change/model risk controls.",
      "required"
    );
  } else if (usesExternalModel(input)) {
    addTrigger(
      acc,
      "change_model",
      "model_lifecycle_recommended",
      "External/foundation models benefit from change and model-risk controls.",
      "recommended"
    );
  }

  const byId = new Map(REGISTER_ASSESSMENT_TYPES.map((item) => [item.id, item]));
  const order = REGISTER_ASSESSMENT_TYPES.map((item) => item.id);

  return order
    .filter((id) => acc.has(id))
    .map((id) => {
      const meta = byId.get(id)!;
      const hit = acc.get(id)!;
      return {
        assessmentType: id,
        title: meta.title,
        shortTitle: meta.shortTitle,
        description: meta.description,
        frameworkAnchors: [...meta.frameworkAnchors],
        priority: hit.priority,
        reasons: hit.reasons,
        triggerIds: hit.triggerIds,
      };
    });
}

export function getAssessmentTypeMeta(id: RegisterAssessmentTypeId) {
  return REGISTER_ASSESSMENT_TYPES.find((item) => item.id === id);
}

/** Lightweight module questions for non-formal assessments. */
export const ASSESSMENT_MODULE_QUESTIONS: Record<
  Exclude<RegisterAssessmentTypeId, "formal_risk">,
  Array<{ id: string; prompt: string; help?: string }>
> = {
  privacy_dpia: [
    {
      id: "lawful_basis_documented",
      prompt: "Is a lawful basis documented for each personal data processing purpose?",
    },
    {
      id: "dpia_completed",
      prompt: "Has a DPIA been completed or formally waived with rationale?",
    },
    {
      id: "retention_minimisation",
      prompt: "Are retention and data minimisation controls defined and enforced?",
    },
    {
      id: "data_subject_rights",
      prompt: "Can data subject rights (access, deletion, objection) be fulfilled for AI outputs/logs?",
    },
    {
      id: "transfer_safeguards",
      prompt: "If cross-border transfers occur, are appropriate safeguards in place?",
    },
  ],
  fundamental_rights: [
    {
      id: "rights_impact_mapped",
      prompt: "Have affected rights and opportunities been mapped for impacted populations?",
    },
    {
      id: "severity_consultation",
      prompt: "Were impacted stakeholders or domain experts consulted?",
    },
    {
      id: "mitigations_defined",
      prompt: "Are mitigations defined for residual fundamental-rights risks?",
    },
    {
      id: "fria_evidence",
      prompt: "Is FRIA (or equivalent) evidence available and current?",
    },
  ],
  fairness_bias: [
    {
      id: "fairness_metrics",
      prompt: "Are fairness metrics defined for relevant demographic or cohort groups?",
    },
    {
      id: "bias_testing",
      prompt: "Has bias testing been performed on training and/or production data?",
    },
    {
      id: "human_appeal",
      prompt: "Is there a human appeal or contestability path for adverse outcomes?",
    },
    {
      id: "monitoring_drift",
      prompt: "Is disparate-impact / performance drift monitored after deployment?",
    },
  ],
  third_party_model: [
    {
      id: "vendor_diligence",
      prompt: "Has vendor / model-provider due diligence been completed?",
    },
    {
      id: "contractual_controls",
      prompt: "Do contracts cover data use, training restrictions, incidents, and audit rights?",
    },
    {
      id: "model_card",
      prompt: "Is a model card / system card available and reviewed?",
    },
    {
      id: "exit_strategy",
      prompt: "Is there a documented exit / substitution strategy for the provider?",
    },
  ],
  agent_autonomy: [
    {
      id: "action_boundaries",
      prompt: "Are allowed tools, actions, and spend/authority boundaries explicitly defined?",
    },
    {
      id: "human_override",
      prompt: "Can a human pause, override, or reverse agent actions in practice?",
    },
    {
      id: "tool_allowlist",
      prompt: "Are external tools allowlisted and authenticated with least privilege?",
    },
    {
      id: "audit_trail",
      prompt: "Are agent plans, tool calls, and outcomes logged for audit?",
    },
  ],
  security_threat: [
    {
      id: "threat_model",
      prompt: "Has an AI-specific threat model been completed (prompt injection, data exfil, abuse)?",
    },
    {
      id: "input_output_controls",
      prompt: "Are input validation and output filtering controls in place?",
    },
    {
      id: "secrets_isolation",
      prompt: "Are secrets, credentials, and sensitive retrieval corpora isolated from the model?",
    },
    {
      id: "monitoring_response",
      prompt: "Are security monitoring and incident response playbooks defined for AI assets?",
    },
  ],
  safety: [
    {
      id: "harm_scenarios",
      prompt: "Have high-consequence failure / harm scenarios been documented?",
    },
    {
      id: "kill_switch",
      prompt: "Is there a tested kill-switch or rapid disable path?",
    },
    {
      id: "evaluation_gates",
      prompt: "Do safety evaluation gates block unsafe releases?",
    },
    {
      id: "incident_learning",
      prompt: "Are safety incidents reviewed with corrective actions tracked?",
    },
  ],
  data_risk: [
    {
      id: "lineage_documented",
      prompt: "Is training / fine-tuning / RAG data lineage documented?",
    },
    {
      id: "poisoning_controls",
      prompt: "Are controls in place against data poisoning and contamination?",
    },
    {
      id: "leakage_tests",
      prompt: "Have memorization / leakage tests been considered or performed?",
    },
    {
      id: "license_ip",
      prompt: "Are data licensing and IP constraints validated for model use?",
    },
  ],
  legal_regulatory: [
    {
      id: "jurisdiction_mapped",
      prompt: "Are applicable laws and jurisdictions mapped to concrete obligations?",
    },
    {
      id: "prohibited_screen",
      prompt: "Has the use case been screened against prohibited / restricted practices?",
    },
    {
      id: "transparency_duties",
      prompt: "Are transparency / disclosure duties (e.g. Art. 50) identified and implemented?",
    },
    {
      id: "legal_signoff",
      prompt: "Has legal / compliance sign-off been obtained where required?",
    },
  ],
  change_model: [
    {
      id: "change_policy",
      prompt: "Is there a change policy for models, prompts, tools, and retrieval corpora?",
    },
    {
      id: "regression_tests",
      prompt: "Are regression / evaluation suites required before material changes go live?",
    },
    {
      id: "rollback_plan",
      prompt: "Is a rollback plan defined and tested?",
    },
    {
      id: "reassessment_trigger",
      prompt: "Do material changes trigger reassessment of risk and related assessments?",
    },
  ],
};

export type ModuleAnswerValue = "yes" | "partial" | "no" | "na" | "";

/** Per-assessment residual risk rating (required to complete / waive a module). */
export type ModuleRiskRating = "minimal" | "limited" | "high" | "prohibited";

export const MODULE_RISK_RATING_OPTIONS: Array<{
  value: ModuleRiskRating;
  label: string;
  description: string;
}> = [
  {
    value: "minimal",
    label: "Minimal",
    description: "Gaps are minor or well controlled for this assessment area.",
  },
  {
    value: "limited",
    label: "Limited",
    description: "Material residual risk remains; monitoring and treatment needed.",
  },
  {
    value: "high",
    label: "High",
    description: "Significant residual risk; escalate and treat before relying on this use case.",
  },
  {
    value: "prohibited",
    label: "Prohibited",
    description: "Unacceptable residual risk for this assessment area — do not proceed as-is.",
  },
];

export function isModuleRiskRating(value: unknown): value is ModuleRiskRating {
  return (
    value === "minimal" ||
    value === "limited" ||
    value === "high" ||
    value === "prohibited"
  );
}

export function moduleRiskRatingToConcern(rating: ModuleRiskRating | null | undefined): number {
  switch (rating) {
    case "prohibited":
      return 4;
    case "high":
      return 3;
    case "limited":
      return 2;
    case "minimal":
      return 0.5;
    default:
      return 3;
  }
}

export type AssessmentModuleState = {
  status: "not_started" | "in_progress" | "completed" | "waived" | "stale";
  answers: Record<string, ModuleAnswerValue>;
  notes?: string;
  completedAt?: string | null;
  waivedReason?: string | null;
  /** Required when completing or waiving — feeds the final formal risk consolidation. */
  riskRating?: ModuleRiskRating | null;
  riskRatingRationale?: string | null;
};

export type AssessmentSuiteState = {
  version: 1;
  computedAt: string;
  triggered: AssessmentTriggerResult[];
  modules: Partial<Record<RegisterAssessmentTypeId, AssessmentModuleState>>;
};

export function emptyModuleState(): AssessmentModuleState {
  return {
    status: "not_started",
    answers: {},
    notes: "",
    completedAt: null,
    waivedReason: null,
    riskRating: null,
    riskRatingRationale: null,
  };
}

export function moduleHasRiskRating(moduleState: AssessmentModuleState | undefined): boolean {
  return isModuleRiskRating(moduleState?.riskRating);
}

export function isTriggeredAssessmentDone(
  item: AssessmentTriggerResult,
  suite: AssessmentSuiteState,
  formalRiskStatus: string
): boolean {
  if (item.assessmentType === "formal_risk") {
    return formalRiskStatus === "completed";
  }
  const module = suite.modules[item.assessmentType];
  const status = module?.status;
  if (status !== "completed" && status !== "waived") return false;
  // Completed modules must carry a risk rating for formal consolidation inputs.
  return moduleHasRiskRating(module);
}

/** Next incomplete assessment: required first, then recommended; prefers suite order after `afterType`. */
export function findNextTriggeredAssessment(
  suite: AssessmentSuiteState,
  formalRiskStatus: string,
  afterType?: RegisterAssessmentTypeId | null
): AssessmentTriggerResult | null {
  const incomplete = suite.triggered.filter(
    (item) =>
      item.assessmentType !== afterType &&
      !isTriggeredAssessmentDone(item, suite, formalRiskStatus)
  );
  if (incomplete.length === 0) return null;

  // Keep formal risk last — finish detailed modules before the consolidation rating.
  const detailed = incomplete.filter((item) => item.assessmentType !== "formal_risk");
  const requiredDetailed = detailed.filter((item) => item.priority === "required");
  const pool =
    requiredDetailed.length > 0
      ? requiredDetailed
      : detailed.length > 0
        ? detailed
        : incomplete;
  const poolIds = new Set(pool.map((item) => item.assessmentType));

  if (afterType) {
    const afterIndex = suite.triggered.findIndex((item) => item.assessmentType === afterType);
    if (afterIndex >= 0) {
      const following = suite.triggered
        .slice(afterIndex + 1)
        .find((item) => poolIds.has(item.assessmentType));
      if (following) return following;
    }
  }

  return pool[0] ?? null;
}

export function emptyAssessmentSuite(): AssessmentSuiteState {
  return {
    version: 1,
    computedAt: new Date(0).toISOString(),
    triggered: [],
    modules: {},
  };
}

export function parseAssessmentSuite(value: unknown): AssessmentSuiteState {
  if (!value || typeof value !== "object") return emptyAssessmentSuite();
  const raw = value as Partial<AssessmentSuiteState>;
  return {
    version: 1,
    computedAt: typeof raw.computedAt === "string" ? raw.computedAt : new Date(0).toISOString(),
    triggered: Array.isArray(raw.triggered) ? (raw.triggered as AssessmentTriggerResult[]) : [],
    modules:
      raw.modules && typeof raw.modules === "object"
        ? (raw.modules as AssessmentSuiteState["modules"])
        : {},
  };
}

export function syncAssessmentSuite(
  input: AssessmentTriggerInput,
  previous: AssessmentSuiteState | null | undefined
): AssessmentSuiteState {
  const triggered = determineRequiredAssessments(input);
  const prev = previous ?? emptyAssessmentSuite();
  const modules: AssessmentSuiteState["modules"] = { ...prev.modules };

  for (const item of triggered) {
    if (!modules[item.assessmentType]) {
      modules[item.assessmentType] = emptyModuleState();
    }
  }

  // Formal risk tracks via AiSystemRiskAssessment — keep module placeholder in sync.
  if (modules.formal_risk && modules.formal_risk.status === "not_started") {
    // leave as-is; UI maps formal risk assessment status separately
  }

  return {
    version: 1,
    computedAt: new Date().toISOString(),
    triggered,
    modules,
  };
}

export function moduleCompletion(
  assessmentType: Exclude<RegisterAssessmentTypeId, "formal_risk">,
  moduleState: AssessmentModuleState | undefined
): { answered: number; total: number; complete: boolean } {
  const questions = ASSESSMENT_MODULE_QUESTIONS[assessmentType];
  const answers = moduleState?.answers ?? {};
  const answered = questions.filter((q) => {
    const value = answers[q.id];
    return value === "yes" || value === "partial" || value === "no" || value === "na";
  }).length;
  return {
    answered,
    total: questions.length,
    complete: moduleState?.status === "completed" || answered === questions.length,
  };
}
