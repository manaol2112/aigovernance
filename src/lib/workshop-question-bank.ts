/** Logical phases for enterprise AI governance workshop facilitation. */
export type WorkshopQuestionPhase =
  | "context"
  | "design"
  | "implementation"
  | "effectiveness"
  | "gaps"
  | "application"
  | "requirement";

export const WORKSHOP_PHASE_META: Record<
  WorkshopQuestionPhase,
  { order: number; label: string; shortLabel: string }
> = {
  context: { order: 1, label: "Set context & scope", shortLabel: "Context" },
  design: { order: 2, label: "Governance design", shortLabel: "Design" },
  implementation: { order: 3, label: "Implementation & practice", shortLabel: "Practice" },
  effectiveness: { order: 4, label: "Operating effectiveness", shortLabel: "Effectiveness" },
  gaps: { order: 5, label: "Gaps & remediation", shortLabel: "Gaps" },
  application: { order: 6, label: "In-scope use cases", shortLabel: "Apply" },
  requirement: { order: 7, label: "Framework requirement", shortLabel: "Requirements" },
};

export type WorkshopQuestionTemplate = {
  phase: WorkshopQuestionPhase;
  intent: string;
  prompt: string;
  /** Optional sub-pillar-specific follow-up probes; defaults to phase probes if omitted. */
  probes?: string[];
};

export const SUB_PILLAR_QUESTION_BANK: Record<string, WorkshopQuestionTemplate[]> = {
  "gov-scope-context": [
    {
      phase: "context",
      intent: "Establish organizational context driving AI governance obligations.",
      prompt:
        "Describe the internal and external factors shaping your AI program — business strategy, regulatory landscape, competitive pressure, and stakeholder expectations. Which of these materially affect in-scope use cases?",
    },
    {
      phase: "design",
      intent: "Define AIMS boundaries, lifecycle stages, and exclusion criteria.",
      prompt:
        "What is the documented scope of your AI management system — which entities, sites, systems, and lifecycle stages (design, build, deploy, operate, retire) are in scope versus explicitly out of scope?",
    },
    {
      phase: "implementation",
      intent: "Verify scope is applied consistently to inventory and change management.",
      prompt:
        "How do you maintain an AI system inventory, and how is scope re-evaluated when a new model, vendor, or use case is proposed? Who decides whether something falls inside or outside scope?",
    },
    {
      phase: "effectiveness",
      intent: "Confirm interested-party requirements are identified and reviewed.",
      prompt:
        "Which interested parties (regulators, customers, employees, board, civil society) have defined requirements for your AI systems, and how often are those expectations reviewed and reflected in governance?",
    },
    {
      phase: "application",
      intent: "Map scope and context to each use case in this assessment.",
      prompt:
        "For each in-scope use case in this assessment: confirm its boundary, affected populations, deployment context, and any scope exceptions or compensating controls that apply.",
    },
  ],
  "gov-policy-leadership": [
    {
      phase: "context",
      intent: "Understand leadership mandate and accountability for responsible AI.",
      prompt:
        "Has the board or executive leadership formally endorsed responsible AI as an organizational priority? What public commitments, principles, or statements exist, and who is accountable for their fulfillment?",
    },
    {
      phase: "design",
      intent: "Assess AI policy content, approval authority, and review cadence.",
      prompt:
        "Walk through your AI policy (or equivalent): what it requires, who approved it, how it defines prohibited versus permitted uses, and when it was last reviewed. Does it address high-risk AI, third-party AI, and generative AI explicitly?",
    },
    {
      phase: "implementation",
      intent: "Verify policy communication, training, and integration with related policies.",
      prompt:
        "How is the AI policy communicated to teams that build, procure, or operate AI? How does it align with security, privacy, data governance, HR, and procurement policies — and how are conflicts resolved?",
    },
    {
      phase: "effectiveness",
      intent: "Test whether policy drives real decisions and exceptions are governed.",
      prompt:
        "Provide a recent example where the AI policy influenced a go/no-go decision, blocked a use case, or required additional controls. How are policy exceptions requested, approved, and recorded?",
    },
    {
      phase: "gaps",
      intent: "Identify policy coverage gaps and planned updates.",
      prompt:
        "Where does the current policy not adequately cover emerging AI practices (e.g., agentic AI, shadow AI, employee use of public models)? What updates are planned in the next 12 months?",
    },
  ],
  "gov-roles-accountability": [
    {
      phase: "context",
      intent: "Map governance structure from board to operational teams.",
      prompt:
        "Describe your AI governance structure: board/committee oversight, executive sponsor, AI ethics or risk committee, and operational roles. Which body has authority over in-scope systems?",
    },
    {
      phase: "design",
      intent: "Validate RACI and decision rights across the AI lifecycle.",
      prompt:
        "For in-scope use cases, who is Responsible, Accountable, Consulted, and Informed for: use-case approval, model development, data sourcing, deployment, monitoring, incident response, and decommissioning?",
    },
    {
      phase: "implementation",
      intent: "Confirm role clarity in practice and separation of duties.",
      prompt:
        "Can developers or data scientists deploy models to production without independent review? Where is segregation of duties enforced, and how are role assignments documented and kept current?",
    },
    {
      phase: "effectiveness",
      intent: "Test escalation paths and timeliness of governance decisions.",
      prompt:
        "When an AI issue crosses legal, IT, business, and vendor boundaries, what is the escalation path? Provide a recent example — how long did it take to reach a decision, and was the accountable owner clear?",
    },
    {
      phase: "application",
      intent: "Assign ownership for each in-scope use case.",
      prompt:
        "For each use case in this assessment, name the business owner, technical owner, and risk/compliance owner. Are any roles vacant, outsourced, or shared across too many systems?",
    },
  ],
  "gov-risk-oversight": [
    {
      phase: "context",
      intent: "Understand AI risk taxonomy and integration with enterprise risk.",
      prompt:
        "What AI-specific risks does the organization recognize (safety, bias, privacy, security, legal, reputational, systemic), and how are they integrated into enterprise risk management — not treated as a standalone IT issue?",
    },
    {
      phase: "design",
      intent: "Assess risk assessment methodology, criteria, and treatment options.",
      prompt:
        "Describe your AI risk assessment methodology: scoring criteria, likelihood/impact scales, treatment options (accept, mitigate, transfer, avoid), and how risks are linked to controls and residual risk acceptance.",
    },
    {
      phase: "implementation",
      intent: "Verify assessments occur at the right triggers and feed a living register.",
      prompt:
        "When are AI risk assessments performed — at intake, design change, new data, retraining, vendor change, regulatory change? How is the AI risk register maintained, and who reviews it?",
    },
    {
      phase: "effectiveness",
      intent: "Confirm risk appetite, thresholds, and executive sign-off.",
      prompt:
        "What is the organization's AI risk appetite and tolerance statements? Who signs off when residual risk exceeds thresholds, and how are risk reporting and KPIs shared with leadership?",
    },
    {
      phase: "gaps",
      intent: "Identify unassessed risks and treatment backlog.",
      prompt:
        "Which in-scope systems have not been risk-assessed in the last 12 months, or have open high/critical findings without approved treatment plans? What is the remediation timeline?",
    },
  ],
  "fair-impact-assessment": [
    {
      phase: "context",
      intent: "Determine when fundamental-rights and societal impact assessment is required.",
      prompt:
        "Which in-scope systems can affect individuals' rights, livelihoods, access to services, or vulnerable groups? What criteria trigger a fundamental-rights or algorithmic impact assessment before deployment?",
    },
    {
      phase: "design",
      intent: "Assess impact assessment methodology and participant diversity.",
      prompt:
        "Describe your impact assessment process: methodology, required participants (legal, ethics, affected communities, DPO), documentation template, and how severity and likelihood of harm are evaluated.",
    },
    {
      phase: "implementation",
      intent: "Review a completed assessment and re-assessment triggers.",
      prompt:
        "Walk through a completed impact assessment for an in-scope system — what harms were identified, what mitigations were required, and who approved proceeding? What events trigger a re-assessment?",
    },
    {
      phase: "effectiveness",
      intent: "Verify mitigations were implemented and outcomes monitored.",
      prompt:
        "For mitigations identified in impact assessments, how do you confirm they were implemented before go-live and remain effective in production? Are affected populations consulted post-deployment?",
    },
    {
      phase: "application",
      intent: "Identify use cases lacking required impact assessment.",
      prompt:
        "For each in-scope use case: was an impact assessment required, completed, and signed off? Flag any gaps, waivers, or grandfathered systems operating without assessment.",
    },
  ],
  "fair-bias-mitigation": [
    {
      phase: "context",
      intent: "Identify protected attributes and fairness context for in-scope systems.",
      prompt:
        "For in-scope systems, which protected or sensitive attributes could be directly or indirectly affected (race, gender, age, disability, geography, socioeconomic status)? Which decisions have legal fairness implications?",
    },
    {
      phase: "design",
      intent: "Assess fairness metrics, thresholds, and testing methodology.",
      prompt:
        "What fairness definitions and metrics do you use (demographic parity, equalized odds, individual fairness), what thresholds are acceptable, and who approved them? How do you handle trade-offs between fairness and accuracy?",
    },
    {
      phase: "implementation",
      intent: "Review pre-release and production bias testing practices.",
      prompt:
        "What bias and fairness tests run before release (dataset analysis, subgroup performance, counterfactual testing) and in production? Who interprets results, and what happens when thresholds are breached?",
    },
    {
      phase: "effectiveness",
      intent: "Confirm ongoing monitoring and remediation of disparate impact.",
      prompt:
        "How do you monitor for drift in fairness outcomes over time? Provide an example where bias was detected post-deployment — what was the response, and how quickly was it resolved?",
    },
    {
      phase: "gaps",
      intent: "Surface systems without adequate fairness controls.",
      prompt:
        "Which in-scope systems lack documented fairness testing, have not been tested on representative subgroups, or rely on proxy variables that could introduce discrimination?",
    },
  ],
  "data-governance-quality": [
    {
      phase: "context",
      intent: "Map data flows and criticality for AI training and inference.",
      prompt:
        "For in-scope systems, map the data lifecycle: sources, transformations, training datasets, inference inputs, outputs stored, and downstream consumers. Which datasets are business-critical or high-risk?",
    },
    {
      phase: "design",
      intent: "Assess data quality standards, provenance, and lineage requirements.",
      prompt:
        "What data quality criteria apply to AI (completeness, accuracy, timeliness, representativeness, label quality)? How is provenance documented, and can you trace a model output back to source data and version?",
    },
    {
      phase: "implementation",
      intent: "Verify data approval, refresh, and change control processes.",
      prompt:
        "Who approves new training data sources or material dataset changes? How are dataset versions controlled, and what testing occurs before a new data version is used for retraining?",
    },
    {
      phase: "effectiveness",
      intent: "Confirm data quality monitoring and issue remediation.",
      prompt:
        "How is data quality monitored in production pipelines? Provide an example where poor data quality affected model behavior — how was it detected and corrected?",
    },
    {
      phase: "application",
      intent: "Validate data governance per in-scope use case.",
      prompt:
        "For each in-scope use case: identify the primary datasets, data owner, last quality review, known limitations, and whether synthetic or scraped data is used without adequate governance.",
    },
  ],
  "data-privacy-protection": [
    {
      phase: "context",
      intent: "Identify personal data processing in AI systems.",
      prompt:
        "Which in-scope systems process personal data — including inferred, generated, or biometric data? What categories of data subjects are affected, and in which jurisdictions?",
    },
    {
      phase: "design",
      intent: "Assess lawful basis, DPIA/PIA, and privacy-by-design controls.",
      prompt:
        "What lawful basis applies to each processing activity? Have DPIAs or PIAs been completed for high-risk AI processing, and what privacy-by-design controls were mandated (minimization, pseudonymization, retention limits)?",
    },
    {
      phase: "implementation",
      intent: "Verify consent, rights fulfillment, and cross-border transfers.",
      prompt:
        "How are data subject rights (access, deletion, objection, portability) fulfilled when AI systems are involved? How are international transfers governed, and is automated decision-making disclosed to individuals?",
    },
    {
      phase: "effectiveness",
      intent: "Test privacy controls under operational conditions.",
      prompt:
        "Can you demonstrate that training data excludes unnecessary personal fields, that retention schedules are enforced, and that re-identification risks from model outputs have been assessed?",
    },
    {
      phase: "gaps",
      intent: "Identify privacy gaps and regulatory exposure.",
      prompt:
        "Which in-scope systems process personal data without a completed DPIA, clear lawful basis, or documented retention/deletion procedure? What is the remediation plan?",
    },
  ],
  "safe-lifecycle-vv": [
    {
      phase: "context",
      intent: "Define safety and reliability requirements by risk tier.",
      prompt:
        "How do you classify in-scope systems by safety criticality, and what V&V rigor is required at each tier? Who defines acceptance criteria before development begins?",
    },
    {
      phase: "design",
      intent: "Assess V&V plan, test coverage, and independent review requirements.",
      prompt:
        "For a recent model change, what was the V&V plan — functional tests, robustness tests, stress tests, red-teaming, human evaluation? Was independent review required, and who signed off?",
    },
    {
      phase: "implementation",
      intent: "Verify test execution, defect management, and release gates.",
      prompt:
        "Walk through your release gate: what test evidence must pass before promotion to staging/production? How are defects tracked, severity-rated, and resolved — can critical issues be waived, and by whom?",
    },
    {
      phase: "effectiveness",
      intent: "Confirm post-release validation and model versioning discipline.",
      prompt:
        "After deployment, how do you validate that production behavior matches tested behavior? How are model versions, training snapshots, and deployment artifacts linked for reproducibility?",
    },
    {
      phase: "application",
      intent: "Review V&V adequacy per in-scope use case.",
      prompt:
        "For each in-scope use case: summarize the last major V&V cycle, open safety-related defects, and any known limitations documented for users and operators.",
    },
  ],
  "safe-deployment-ops": [
    {
      phase: "context",
      intent: "Understand deployment environments and operational context.",
      prompt:
        "Where do in-scope systems run (cloud, on-prem, edge, vendor-hosted), and what operational constraints apply — latency, availability SLAs, failover, and human backup when AI fails?",
    },
    {
      phase: "design",
      intent: "Assess release checklist, rollback, and change management.",
      prompt:
        "What must be true before production deployment — checklist items, approvals, rollback plan, canary/shadow deployment, and communication to affected teams? Is there a formal change advisory process for AI?",
    },
    {
      phase: "implementation",
      intent: "Verify operational reliability controls and capacity management.",
      prompt:
        "How do you monitor accuracy, latency, error rates, and resource consumption in production? What happens when performance degrades — automatic rollback, human takeover, or degraded mode?",
    },
    {
      phase: "effectiveness",
      intent: "Review incident history and decommissioning practices.",
      prompt:
        "Have any in-scope systems experienced production failures, silent degradation, or emergency rollbacks in the last 12 months? How are systems safely decommissioned when retired?",
    },
    {
      phase: "gaps",
      intent: "Identify deployment and ops maturity gaps.",
      prompt:
        "Which in-scope systems lack documented runbooks, on-call ownership, rollback procedures, or defined SLAs for AI-specific failures?",
    },
  ],
  "sec-ai-threats": [
    {
      phase: "context",
      intent: "Identify AI-specific threat landscape for in-scope systems.",
      prompt:
        "For in-scope systems, which AI-specific threats apply: training data poisoning, model inversion/extraction, prompt injection, adversarial examples, supply-chain compromise of models/libraries, or insider model theft?",
    },
    {
      phase: "design",
      intent: "Assess threat modeling and security requirements for AI components.",
      prompt:
        "Is AI-specific threat modeling performed (STRIDE, MITRE ATLAS, or equivalent)? What security requirements are mandated for models, prompts, RAG corpora, and inference APIs?",
    },
    {
      phase: "implementation",
      intent: "Verify security controls and testing for AI attack vectors.",
      prompt:
        "What controls mitigate identified threats — input validation, output filtering, rate limiting, model watermarking, integrity checks on weights, sandboxing? Has adversarial or red-team testing been performed?",
    },
    {
      phase: "effectiveness",
      intent: "Confirm security monitoring and incident response for AI attacks.",
      prompt:
        "How would you detect a prompt injection attack, data exfiltration via model API, or poisoned fine-tuning data in production? Provide an example or tabletop scenario.",
    },
    {
      phase: "gaps",
      intent: "Surface unmitigated AI security risks.",
      prompt:
        "Which in-scope systems have not undergone AI-specific threat assessment, expose models publicly without guardrails, or use third-party components without security review?",
    },
  ],
  "sec-controls-access": [
    {
      phase: "context",
      intent: "Inventory AI assets requiring protection.",
      prompt:
        "What AI assets require protection — training datasets, feature stores, model weights, prompts, embeddings, experiment logs, MLOps pipelines, and production inference endpoints?",
    },
    {
      phase: "design",
      intent: "Assess access control model and privileged access management.",
      prompt:
        "How is access to AI development and production environments governed — RBAC/ABAC, least privilege, MFA, break-glass procedures? Who can download model weights or export training data?",
    },
    {
      phase: "implementation",
      intent: "Verify secrets management, network segmentation, and audit logging.",
      prompt:
        "How are API keys, model credentials, and cloud compute access managed? Is there network segmentation between training and production, and are access events logged and reviewed?",
    },
    {
      phase: "effectiveness",
      intent: "Confirm periodic access reviews and tooling security.",
      prompt:
        "When were AI platform access rights last recertified? How are notebooks, AutoML tools, and employee use of external AI services governed to prevent shadow AI and data leakage?",
    },
  ],
  "trans-user-disclosure": [
    {
      phase: "context",
      intent: "Identify audiences requiring AI transparency.",
      prompt:
        "Who interacts with in-scope AI systems — end users, customers, employees, regulators, downstream integrators — and what transparency obligations apply to each audience?",
    },
    {
      phase: "design",
      intent: "Assess disclosure content, timing, and format requirements.",
      prompt:
        "What must be disclosed before and during AI interaction: that AI is used, intended purpose, known limitations, data used, human review options, and how to contest outcomes? Where are these defined?",
    },
    {
      phase: "implementation",
      intent: "Review live disclosures and system documentation.",
      prompt:
        "Show how disclosures appear in the actual user experience for an in-scope system — UI labels, consent flows, terms, API documentation. Are instructions for use and intended purpose documented for operators?",
    },
    {
      phase: "effectiveness",
      intent: "Test comprehension and handle user complaints about transparency.",
      prompt:
        "Has user testing validated that disclosures are understandable? How are transparency-related complaints or regulatory inquiries handled, and are disclosure updates version-controlled?",
    },
  ],
  "trans-explainability": [
    {
      phase: "context",
      intent: "Determine explainability requirements by decision impact.",
      prompt:
        "For in-scope systems, which decisions are high-impact on individuals or the organization, and what level of explainability is required — global model understanding, local per-decision, or counterfactual explanations?",
    },
    {
      phase: "design",
      intent: "Assess explainability methods and audience-appropriate communication.",
      prompt:
        "What explainability techniques are used (SHAP, LIME, attention maps, rule extraction, natural-language summaries), and are they validated as fit-for-purpose for the audience — regulators, customers, internal reviewers?",
    },
    {
      phase: "implementation",
      intent: "Verify explanations are available in operational workflows.",
      prompt:
        "Can a reviewer or affected individual obtain a meaningful explanation today — not just in a lab demo? How are explanations logged, and what happens when the model cannot be explained adequately?",
    },
    {
      phase: "effectiveness",
      intent: "Confirm explainability supports appeals and audit.",
      prompt:
        "When a decision is contested, can you reconstruct why the model produced that output? Have explanations been tested for accuracy (fidelity) and non-misleading simplifications?",
    },
    {
      phase: "gaps",
      intent: "Identify black-box systems without adequate explainability.",
      prompt:
        "Which high-impact in-scope systems lack per-decision explainability, rely on uninterpretable ensemble/deep models without compensating controls, or cannot support regulatory audit requests?",
    },
  ],
  "over-human-loop": [
    {
      phase: "context",
      intent: "Classify automation level and required human involvement.",
      prompt:
        "For each in-scope system, what is the automation level (decision support, human-on-the-loop, human-in-the-loop, fully automated)? What regulations or internal policy mandate human involvement?",
    },
    {
      phase: "design",
      intent: "Assess human oversight design, competence, and interface.",
      prompt:
        "How is human oversight designed — alerts, review queues, override buttons, kill switches? Are reviewers trained, do they have sufficient context and time, and is cognitive overload considered?",
    },
    {
      phase: "implementation",
      intent: "Verify override works in practice and is not illusory.",
      prompt:
        "Demonstrate a concrete workflow where a human reviewed, overrode, or stopped an AI output. Is override technically enforced or merely procedural? Can automation resume without re-approval?",
    },
    {
      phase: "effectiveness",
      intent: "Measure oversight quality and automation bias.",
      prompt:
        "How do you monitor whether humans meaningfully review decisions versus rubber-stamping? Are override rates, review times, and escalation patterns analyzed?",
    },
    {
      phase: "application",
      intent: "Validate oversight adequacy per high-risk use case.",
      prompt:
        "For the highest-risk in-scope use cases: is human oversight proportionate, documented, and tested under failure scenarios (model outage, adversarial input, edge cases)?",
    },
  ],
  "over-monitoring-incident": [
    {
      phase: "context",
      intent: "Define operational monitoring scope for AI systems.",
      prompt:
        "What must be monitored for in-scope systems — model performance, data drift, concept drift, fairness drift, security anomalies, cost, and business KPIs? Who defines monitoring requirements?",
    },
    {
      phase: "design",
      intent: "Assess alerting thresholds, runbooks, and incident classification.",
      prompt:
        "What thresholds trigger alerts versus automated action versus human escalation? Are AI-specific runbooks documented, and how are incidents classified (severity, regulatory reportability, customer impact)?",
    },
    {
      phase: "implementation",
      intent: "Review monitoring tooling and incident response process.",
      prompt:
        "Walk through your monitoring stack and a recent alert or incident — detection time, triage, root cause, containment, notification (internal, customer, regulator), and corrective/preventive actions.",
    },
    {
      phase: "effectiveness",
      intent: "Confirm post-incident learning and continual improvement.",
      prompt:
        "How are AI incidents post-mortemed, and how do lessons learned feed back into risk assessment, testing, and governance? Are recurring incident patterns tracked?",
    },
    {
      phase: "gaps",
      intent: "Identify monitoring blind spots.",
      prompt:
        "Which in-scope systems lack production monitoring, have no defined on-call owner, or have not tested incident response in the last 12 months?",
    },
  ],
  "comp-documentation-records": [
    {
      phase: "context",
      intent: "Define documentation obligations across the AI lifecycle.",
      prompt:
        "What documentation must exist for in-scope systems — system description, intended purpose, data sheets, model cards, risk assessments, test results, deployment records, and change history?",
    },
    {
      phase: "design",
      intent: "Assess documentation standards, templates, and ownership.",
      prompt:
        "Are documentation standards defined (ISO 42001 Annex A, EU AI Act technical documentation, internal templates)? Who is responsible for creating, reviewing, and approving each document type?",
    },
    {
      phase: "implementation",
      intent: "Verify records are complete, current, and accessible for audit.",
      prompt:
        "For one in-scope system, provide a documentation index: what exists, where it is stored, version, last update, and retention period. Can an auditor reconstruct the system's history from records alone?",
    },
    {
      phase: "effectiveness",
      intent: "Confirm logging, traceability, and immutable audit trails.",
      prompt:
        "What events are logged (inference requests, model updates, data changes, overrides, admin actions), how long are logs retained, and are they tamper-evident? Can you trace a specific output to model version and input data?",
    },
    {
      phase: "gaps",
      intent: "Identify documentation and record-keeping gaps.",
      prompt:
        "Which in-scope systems have incomplete technical documentation, missing model cards, or logs that cannot support regulatory inquiry or forensic investigation?",
    },
  ],
  "comp-conformity-audit": [
    {
      phase: "context",
      intent: "Understand conformity obligations and audit program scope.",
      prompt:
        "Which conformity or certification obligations apply (ISO 42001, EU AI Act, sector regulations)? Is there a defined internal audit program for AI governance, and what is its scope and frequency?",
    },
    {
      phase: "design",
      intent: "Assess audit criteria, independence, and management review inputs.",
      prompt:
        "What criteria do internal audits use, who performs them (independent of the audited function), and what inputs feed management review — audit findings, KPIs, incidents, regulatory changes?",
    },
    {
      phase: "implementation",
      intent: "Review recent audit results and corrective action tracking.",
      prompt:
        "When was the last AI governance audit, what was in scope, what were the major findings, and what is the status of corrective actions? Are findings tracked to closure with evidence?",
    },
    {
      phase: "effectiveness",
      intent: "Confirm management review drives continual improvement.",
      prompt:
        "When did leadership last review AI governance performance — objectives met, resource adequacy, emerging risks, improvement opportunities? What decisions resulted, and were they documented?",
    },
    {
      phase: "gaps",
      intent: "Surface conformity and audit maturity gaps.",
      prompt:
        "Which governance areas have never been audited, lack defined KPIs, or have repeat findings without root-cause remediation? What is the path to external certification if required?",
    },
  ],
  "supply-vendor": [
    {
      phase: "context",
      intent: "Inventory third-party AI dependencies and criticality.",
      prompt:
        "For in-scope systems, which third-party components are used — foundation models, APIs, datasets, labeling services, MLOps platforms, cloud AI services? Which are single points of failure or high-risk?",
    },
    {
      phase: "design",
      intent: "Assess vendor due diligence and contractual AI obligations.",
      prompt:
        "What due diligence is performed before onboarding an AI vendor (security, privacy, bias, IP, sub-processors, exit strategy)? What AI-specific clauses exist in contracts — SLAs, audit rights, training data use, incident notification?",
    },
    {
      phase: "implementation",
      intent: "Verify ongoing vendor monitoring and change notification.",
      prompt:
        "How do you monitor vendor model updates, policy changes, and sub-processor changes? What happens when a vendor deprecates a model or changes terms — is there a reassessment and migration plan?",
    },
    {
      phase: "effectiveness",
      intent: "Test vendor incident handling and contingency.",
      prompt:
        "Has a vendor AI incident occurred (outage, bias controversy, breach)? How was it handled, and do you have fallback options if the vendor fails or is non-compliant?",
    },
    {
      phase: "application",
      intent: "Review vendor governance per in-scope use case.",
      prompt:
        "For each in-scope use case relying on third-party AI: name the vendor, contract status, last assessment date, known limitations from the provider, and gaps in provider documentation.",
    },
  ],
  "sys-gpai-systemic": [
    {
      phase: "context",
      intent: "Determine GPAI/foundation model usage and systemic exposure.",
      prompt:
        "Do in-scope systems use general-purpose or foundation models (commercial APIs, open-weight models, internal foundation models)? What downstream modifications occur — fine-tuning, RAG, agents — and what systemic risks could emerge at scale?",
    },
    {
      phase: "design",
      intent: "Assess provider evaluation and systemic risk methodology.",
      prompt:
        "How do you evaluate GPAI providers — model cards, systemic risk reports, capability evaluations, acceptable use policies? Is there a methodology for assessing downstream deployer obligations under the EU AI Act or equivalent?",
    },
    {
      phase: "implementation",
      intent: "Verify controls for GPAI integration and dependency management.",
      prompt:
        "What controls limit GPAI misuse — output filtering, capability restrictions, usage monitoring, fine-tuning guardrails? How do you track which foundation model version is in production and document modifications?",
    },
    {
      phase: "effectiveness",
      intent: "Confirm systemic impact monitoring and governance escalation.",
      prompt:
        "How would you detect and respond to systemic harms — widespread misinformation, capability misuse at scale, cascading failures across integrated systems? Is there executive escalation for systemic risk events?",
    },
    {
      phase: "gaps",
      intent: "Identify GPAI governance gaps.",
      prompt:
        "Which in-scope systems use GPAI without adequate provider due diligence, lack documentation of modifications, or have not assessed systemic risk proportional to deployment scale?",
    },
  ],
};

export function genericQuestionTemplates(subLabel: string): WorkshopQuestionTemplate[] {
  const topic = subLabel.toLowerCase();
  return [
    {
      phase: "context",
      intent: `Establish scope and relevance of ${topic} for in-scope AI systems.`,
      prompt: `For ${subLabel}: which in-scope systems are affected, what regulatory or business drivers apply, and what could go wrong if this area is weak?`,
    },
    {
      phase: "design",
      intent: `Assess designed controls, policies, and standards for ${topic}.`,
      prompt: `What policies, standards, and control objectives define how ${topic} should work in your organization? Who approved them and when were they last updated?`,
    },
    {
      phase: "implementation",
      intent: `Verify ${topic} is implemented consistently in practice.`,
      prompt: `Describe how ${topic} works day-to-day: roles involved, tools used, approval steps, and how new AI initiatives are onboarded into this control area.`,
    },
    {
      phase: "effectiveness",
      intent: `Test operating effectiveness with evidence and examples.`,
      prompt: `Provide a recent example demonstrating ${topic} working — or failing — in practice. What metrics or evidence prove it is effective?`,
    },
    {
      phase: "gaps",
      intent: `Identify maturity gaps and remediation priorities for ${topic}.`,
      prompt: `Where are the known gaps in ${topic}? What is prioritized for the next 6–12 months, and what resources or executive support are needed?`,
    },
    {
      phase: "application",
      intent: `Apply ${topic} assessment to each in-scope use case.`,
      prompt: `For each use case in this assessment: how does ${topic} apply, and does anything differ materially from your other AI systems?`,
    },
  ];
}
