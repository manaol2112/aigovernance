/**
 * Sample workshop capture notes for testing auto-map and AI control analysis.
 * Mix of compliant (aligned/partial-positive) and gap areas across all risk sub-pillars.
 *
 * Intended use: Capture tab → "Load sample notes" → Save → Auto-map to controls → Review → Analyze.
 */

export type SampleCaptureNotes = {
  workshopNotes: string;
  facilitatorNotes: string;
  /** Human-readable summary of expected analysis outcomes when testing. */
  testingGuide: {
    expectedAligned: string[];
    expectedGaps: string[];
    expectedPartial: string[];
  };
};

const WORKSHOP_NOTES = `# Acme Financial Services — AI Governance Workshop Transcript (Sample)
Date: 2026-06-15 | Facilitator: J. Rivera | Participants: CIO, CRO, Head of Data, ML Platform Lead, Legal Counsel

Legend for testing: [COMPLIANT] = strong controls in place | [PARTIAL] = mixed / informal | [GAP] = missing or not implemented

---

## GOVERNANCE & ACCOUNTABILITY

### Scope, Context & Interested Parties (gov-scope-context)

Q: Describe internal and external factors shaping your AI program.
A [COMPLIANT]: Our AI program is driven by board-approved digital strategy, EU AI Act readiness, and competitive pressure in retail banking. Regulatory landscape (GDPR, EU AI Act, local consumer protection) materially affects our credit scoring and customer chatbot use cases. Stakeholder expectations from the board and regulators are documented in our enterprise context register, reviewed annually.

Q: What is the documented scope of your AI management system?
A [COMPLIANT]: The AIMS scope covers all ML models in production across retail banking, wealth advisory, and fraud detection. Design, build, deploy, operate, and retire stages are in scope. Shadow IT AI tools and employee personal ChatGPT use are explicitly out of scope until formal onboarding. Scope boundaries are approved by the AI Governance Committee.

Q: How do you maintain an AI system inventory?
A [PARTIAL]: We maintain a centralized AI inventory in ServiceNow with business owner, technical owner, and risk tier. Re-evaluation occurs at intake for new use cases, but vendor-sourced models are sometimes added informally before inventory update — we are tightening change management integration.

Q: Which interested parties have defined requirements?
A [COMPLIANT]: Regulators (ECB, national DPA), customers, employees, and the board have documented requirements captured in our interested-parties register. Legal and compliance review these quarterly and feed updates into governance policy.

Q: For each in-scope use case, confirm boundary and context.
A [PARTIAL]: Credit decisioning and fraud models have clear boundaries documented. The internal HR screening pilot lacks a finalized scope exception record — flagged for follow-up.

### AI Policy & Leadership Commitment (gov-policy-leadership)

Q: Has leadership formally endorsed responsible AI?
A [COMPLIANT]: The board formally endorsed responsible AI in March 2025. The CEO signed a public commitment aligned with OECD AI principles. The Chief Risk Officer is accountable for fulfillment, with quarterly reporting to the board risk committee.

Q: Walk through your AI policy.
A [COMPLIANT]: Our AI policy (v2.1, approved by the board) defines prohibited uses (covert biometric profiling, undisclosed automated legal decisions), permitted uses with conditions, and explicit coverage of high-risk AI, third-party AI, and generative AI. Last reviewed January 2026. Policy is documented, approved, and maintained on the intranet.

Q: How is the AI policy communicated?
A [COMPLIANT]: Mandatory annual training for all engineers and product owners. Policy cross-references security, privacy, data governance, HR, and procurement policies. Conflicts escalate to Legal and the AI Governance Committee with documented resolution.

Q: Provide an example where policy influenced a decision.
A [COMPLIANT]: In Q1 2026, the AI policy blocked deployment of an external resume-screening vendor until bias testing was completed. Exception requests require CRO approval and are logged in the governance register.

Q: Where does policy not cover emerging practices?
A [PARTIAL]: Agentic AI workflows and employee use of public foundation models are not yet fully addressed. Updates planned in the next 12 months — currently in progress.

### Roles, Accountability & Decision Rights (gov-roles-accountability)

Q: Describe your AI governance structure.
A [COMPLIANT]: Board risk committee provides oversight. Executive sponsor is the CIO. AI Ethics & Risk Committee meets monthly. Operational roles include ML Platform Lead, Data Protection Officer, and business unit AI champions. Authority over in-scope systems rests with the AI Governance Committee.

Q: Who is R/A/C/I for lifecycle decisions?
A [COMPLIANT]: RACI matrix is documented and approved for use-case approval, model development, data sourcing, deployment, monitoring, incident response, and decommissioning. Business owners are Accountable; ML engineering is Responsible for build/deploy.

Q: Can developers deploy without independent review?
A [COMPLIANT]: No — production deployment requires independent review by Model Risk Management and security sign-off. Segregation of duties is enforced via CI/CD gates. Role assignments are maintained in IAM and reviewed quarterly.

Q: What is the escalation path for cross-boundary AI issues?
A [PARTIAL]: Escalation path is documented (team lead → AI Governance Committee → CRO → board). A recent vendor data-quality incident took 9 days to resolve — accountable owner was clear but timeliness needs improvement.

Q: Name owners for each in-scope use case.
A [PARTIAL]: Credit scoring and fraud detection have named business, technical, and risk owners. The customer chatbot shares a technical owner across three systems — role clarity gap flagged.

### AI Risk Management & Oversight (gov-risk-oversight)

Q: What AI-specific risks are recognized?
A [COMPLIANT]: We recognize safety, bias, privacy, security, legal, reputational, and systemic risks. These are integrated into enterprise risk management via COSO ERM, not treated as standalone IT issues. AI risks appear on the corporate risk register with board oversight.

Q: Describe your AI risk assessment methodology.
A [COMPLIANT]: Methodology uses 5×5 likelihood/impact scoring, treatment options (accept, mitigate, transfer, avoid), and linkage to controls. Residual risk acceptance requires CRO sign-off above threshold. Documented and approved procedure exists.

Q: When are AI risk assessments performed?
A [COMPLIANT]: Assessments at intake, design change, retraining, vendor change, and regulatory change. AI risk register is maintained in GRC tool and reviewed monthly by the AI Governance Committee.

Q: How is risk appetite applied?
A [COMPLIANT]: Board-approved risk appetite statements define thresholds for automated decisions affecting consumers. Executive sign-off required for high-risk deployments. Monitoring confirms appetite breaches trigger escalation.

Q: Any grandfathered systems without assessment?
A [GAP]: Two legacy fraud rules engines pre-date formal AI risk assessment — partial documentation only. Remediation planned but not yet implemented.

---

## FAIRNESS, BIAS & FUNDAMENTAL RIGHTS

### Impact Assessment & Fundamental Rights (fair-impact-assessment)

Q: Which systems affect fundamental rights?
A [PARTIAL]: Credit scoring and HR screening affect access to services and employment. Criteria for fundamental-rights impact assessment exist but are applied inconsistently — chatbot was deployed without assessment (waived informally).

Q: Describe your impact assessment process.
A [GAP]: No formal enterprise-wide fundamental-rights impact assessment template. Legal conducts ad hoc reviews. Missing standardized methodology, DPO participation is informal, and affected communities are not routinely consulted.

Q: Walk through a completed impact assessment.
A [GAP]: Credit scoring has a partial legal review from 2024 but not a complete fundamental-rights assessment. No signed approval record for proceeding. Re-assessment triggers are undocumented.

Q: How are mitigations confirmed before go-live?
A [GAP]: Mitigations from legal reviews are tracked manually in spreadsheets. No systematic confirmation before go-live. Post-deployment consultation with affected populations does not occur.

Q: Flag use cases lacking required assessment.
A [GAP]: Customer chatbot — assessment waived. HR screening pilot — no assessment. Fraud model — partial only. Two gaps and one partial across in-scope use cases.

### Bias, Fairness & Non-Discrimination Controls (fair-bias-mitigation)

Q: Which protected attributes could be affected?
A [COMPLIANT]: Credit scoring could affect race (proxy via geography), gender, age, disability (indirectly). Protected attributes documented in fairness context register. Legal fairness implications identified for lending decisions.

Q: What fairness metrics and thresholds do you use?
A [GAP]: No approved enterprise fairness metrics. Data science team uses demographic parity informally for credit model only. Thresholds are unknown — no formal approval. Trade-offs between fairness and accuracy are not documented.

Q: Pre-release and production bias testing?
A [PARTIAL]: Credit model has pre-release bias testing (annual). Production monitoring for bias is ad hoc — manual quarterly reviews, not automated. Other in-scope systems lack bias testing entirely.

Q: How are bias findings remediated?
A [PARTIAL]: Credit model bias findings from 2025 were mitigated via feature removal — documented in model card. Chatbot and fraud systems have no remediation process for bias findings.

Q: Systems lacking fairness controls?
A [GAP]: HR screening pilot and customer chatbot have no bias testing, no fairness monitoring, and no documented mitigations. Full gap for two of four in-scope systems.

---

## PRIVACY & DATA GOVERNANCE

### Data Governance & Quality (data-governance-quality)

Q: How is training data governed?
A [COMPLIANT]: Data governance policy requires documented provenance, quality checks, and approval for training datasets. Feature store enforces schema validation and lineage tracking. Data stewards assigned per domain.

Q: What data quality controls exist for AI?
A [COMPLIANT]: Automated profiling, completeness checks, and drift detection on input features. Quality thresholds defined and monitored. Issues logged in data quality register with remediation SLAs.

Q: How is data preparation documented?
A [COMPLIANT]: ETL pipelines documented in data catalog. Transformations version-controlled. Training data snapshots tagged with dataset version IDs linked to model versions.

Q: Data lifecycle and retention for AI?
A [COMPLIANT]: Retention schedules align with GDPR and internal policy. Deletion procedures tested annually. Personal data minimization enforced at feature engineering stage.

Q: Any data quality gaps?
A [PARTIAL]: Vendor-provided enrichment data lacks complete provenance for one fraud feature set — partial gap being remediated.

### Privacy & Lawful Processing (data-privacy-protection)

Q: How is personal data identified in AI pipelines?
A [COMPLIANT]: PII detection runs on training and inference pipelines. Data classification labels (public, internal, confidential, restricted) enforced. Personal data inventory maintained by DPO.

Q: Lawful basis and consent for AI processing?
A [COMPLIANT]: Legal basis documented per use case in processing records. Consent mechanisms for marketing AI comply with GDPR. Privacy impact assessments completed for credit and chatbot.

Q: Privacy-by-design in model development?
A [COMPLIANT]: Privacy reviews required at design gate. Differential privacy explored for aggregate analytics. Data minimization and purpose limitation enforced in feature selection.

Q: Cross-border data transfers for AI?
A [COMPLIANT]: Transfers governed by SCCs and documented in transfer impact assessments. ML training in EU region by default.

Q: Privacy gaps?
A [PARTIAL]: HR screening pilot processes employee data without updated privacy notice — planned fix in progress.

---

## SAFETY & RELIABILITY

### Lifecycle Safety, Testing & Validation (safe-lifecycle-vv)

Q: Verification and validation approach?
A [COMPLIANT]: V&V plan required for all production models. Unit tests, integration tests, backtesting, and champion/challenger validation documented. Model performance benchmarks established before release.

Q: Robustness testing?
A [PARTIAL]: Credit model has robustness testing for input perturbations. Chatbot lacks systematic robustness testing — informal manual testing only.

Q: Safety criteria for go-live?
A [COMPLIANT]: Go-live checklist includes accuracy thresholds, error rate limits, and fallback behavior. Independent Model Risk sign-off required. Safety criteria documented and approved.

Q: How are model updates validated?
A [COMPLIANT]: Retraining triggers formal re-validation. A/B testing in shadow mode before promotion. Validation results logged and reviewed.

Q: Validation gaps?
A [GAP]: HR screening pilot has no formal V&V plan — not yet implemented. Planned for Q3 2026.

### Safe Deployment & Operational Reliability (safe-deployment-ops)

Q: Release criteria and deployment controls?
A [COMPLIANT]: CI/CD pipeline with automated gates, canary deployments, and rollback capability. Release criteria documented in runbook. Change advisory board approval for high-risk models.

Q: Operational reliability and SLAs?
A [COMPLIANT]: 99.9% SLA for fraud and credit inference endpoints. Monitoring dashboards with latency, throughput, and error rate alerts. On-call rotation established and tested.

Q: Decommissioning procedures?
A [PARTIAL]: Decommissioning checklist exists but was skipped for one retired marketing model — records incomplete.

Q: Runbooks and rollback?
A [PARTIAL]: Fraud and credit models have documented runbooks. Chatbot rollback procedure is informal — manual only, not tested in 12 months.

Q: Systems lacking operational controls?
A [GAP]: HR screening pilot has no defined SLAs, no on-call owner, and no rollback procedure.

---

## SECURITY & ADVERSARIAL RISK

### AI-Specific Security Threats (sec-ai-threats)

Q: Which AI-specific threats apply?
A [COMPLIANT]: Prompt injection, data poisoning, model extraction, and adversarial examples identified for chatbot and credit API. Threat landscape documented in security risk register.

Q: AI-specific threat modeling?
A [PARTIAL]: STRIDE analysis performed for credit API. Chatbot and RAG corpus lack formal AI threat modeling — gap identified.

Q: Controls mitigating AI threats?
A [COMPLIANT]: Input validation, output filtering, rate limiting, and API authentication implemented for production inference endpoints. Integrity checks on model weights in artifact registry.

Q: Adversarial or red-team testing?
A [PARTIAL]: Annual penetration test includes some prompt injection scenarios for chatbot. No dedicated adversarial ML red-team testing. Red-team exercise planned but not yet performed.

Q: Unmitigated AI security risks?
A [GAP]: Public-facing chatbot API lacks comprehensive guardrails against prompt injection. Third-party embedding model used without security review.

### Access, Infrastructure & Tooling Security (sec-controls-access)

Q: What AI assets require protection?
A [COMPLIANT]: Training datasets, feature stores, model weights, prompts, embeddings, experiment logs, and inference endpoints inventoried and classified.

Q: Access control model?
A [COMPLIANT]: RBAC with least privilege enforced. MFA required for production access. Model weight downloads require manager approval and are audit logged. Break-glass procedures documented and tested.

Q: MLOps pipeline security?
A [COMPLIANT]: Pipelines run in isolated VPC. Secrets managed in vault. Container images scanned. Access to training compute governed by IAM policies.

Q: Security monitoring for AI assets?
A [COMPLIANT]: SIEM ingests inference API logs, admin actions, and data export events. Alerts configured for anomalous access patterns.

Q: Access control gaps?
A [PARTIAL]: Jupyter notebook environment on shared drive has overly broad read access — remediation in progress.

---

## TRANSPARENCY & EXPLAINABILITY

### User Disclosure & System Documentation (trans-user-disclosure)

Q: How are users informed about AI use?
A [COMPLIANT]: Credit decisions include AI disclosure per regulatory requirements. Chatbot displays "You are interacting with an AI assistant" banner. Intended purpose documented in user-facing materials.

Q: System documentation for users?
A [PARTIAL]: Credit model has consumer-facing explanation of factors considered. Chatbot capabilities and limitations disclosure is incomplete — missing known failure modes.

Q: Internal system documentation?
A [COMPLIANT]: System descriptions, intended purpose, and known limitations documented in Confluence. Updated at each major release.

Q: Transparency for automated decisions?
A [COMPLIANT]: Right to explanation process established for credit decisions. Human review available on request per GDPR Article 22.

Q: Disclosure gaps?
A [GAP]: HR screening pilot does not disclose AI use to candidates — not implemented. Regulatory exposure flagged by Legal.

### Explainability & Interpretability (trans-explainability)

Q: Explainability approach for in-scope systems?
A [GAP]: Credit model uses SHAP values internally but explanations are not provided to all affected users consistently. No explainability framework approved at enterprise level.

Q: Meaningful information for affected parties?
A [GAP]: Chatbot decisions (e.g., product recommendations) have no explainability — users cannot understand why specific recommendations appear. Not implemented.

Q: Explainability for auditors and regulators?
A [PARTIAL]: Model Risk team can generate SHAP-based explanations on request. No standardized interpretability reports. Process is manual and slow.

Q: Explainability tooling and standards?
A [GAP]: No documented explainability standards. Tooling varies by team. Planned evaluation of LIME/SHAP tooling in progress — not yet approved.

Q: Systems lacking explainability?
A [GAP]: Chatbot, fraud model (black-box ensemble), and HR pilot lack meaningful explainability. Full gap across three of four systems.

---

## HUMAN OVERSIGHT & OPERATIONS

### Human Oversight & Override (over-human-loop)

Q: Human-in-the-loop for high-impact decisions?
A [COMPLIANT]: Credit scores below threshold route to human underwriter. Fraud alerts require analyst review before account action. Human oversight procedures documented and approved.

Q: Override mechanisms?
A [COMPLIANT]: Underwriters can override credit model recommendations with documented justification. Override rates monitored monthly. Fraud analysts can dismiss false positives.

Q: Meaningful human control?
A [COMPLIANT]: Humans retain final authority on lending decisions. Automation assists but does not replace human judgment for borderline cases. Governance policy requires human oversight for high-risk AI.

Q: Training for human overseers?
A [COMPLIANT]: Underwriters and fraud analysts trained on AI system limitations and override procedures. Training records maintained and audited.

Q: Oversight gaps?
A [PARTIAL]: Chatbot escalates to human agent but escalation triggers are not tuned — many low-risk queries unnecessarily escalated. Override logging for chatbot incomplete.

### Monitoring, Incidents & Operational Response (over-monitoring-incident)

Q: Production monitoring for AI systems?
A [COMPLIANT]: Real-time monitoring for model drift, data drift, latency, and error rates. Dashboards reviewed daily by ML ops. Alerting integrated with PagerDuty.

Q: Incident response for AI failures?
A [COMPLIANT]: AI incidents follow standard IT incident process with AI-specific playbooks. Severity classification includes model degradation, bias drift, and security events. Incident response tested in tabletop exercise (2025).

Q: Corrective action and post-mortems?
A [COMPLIANT]: Post-mortems required for Sev-1/2 AI incidents. Lessons learned feed into risk register and testing requirements. Recurring patterns tracked quarterly.

Q: Drift detection effectiveness?
A [COMPLIANT]: Automated drift detection with retraining triggers. False positive rate acceptable. Validated against holdout sets monthly.

Q: Monitoring blind spots?
A [GAP]: HR screening pilot has no production monitoring. Chatbot incident response not tested in last 12 months. Two systems flagged.

---

## COMPLIANCE, DOCUMENTATION & TRACEABILITY

### Documentation, Records & Traceability (comp-documentation-records)

Q: What documentation must exist?
A [COMPLIANT]: System description, intended purpose, data sheets, model cards, risk assessments, test results, deployment records, and change history required per documentation standard.

Q: Documentation standards and ownership?
A [COMPLIANT]: Standards aligned with ISO 42001 Annex A and internal templates. ML Platform owns technical docs; Model Risk owns validation records; Legal owns compliance docs.

Q: Documentation index for a sample system?
A [COMPLIANT]: Credit model documentation index complete in document management system — all artifacts versioned, last updated March 2026, 7-year retention. Auditor can reconstruct history from records.

Q: Logging and traceability?
A [COMPLIANT]: Inference requests, model updates, data changes, overrides, and admin actions logged. Logs retained 3 years, tamper-evident storage. Output traceable to model version and input features.

Q: Documentation gaps?
A [PARTIAL]: Chatbot missing complete model card. HR pilot has no technical documentation. Fraud model logs support regulatory inquiry but lack immutable audit trail for admin actions.

### Conformity, Audit & Management Review (comp-conformity-audit)

Q: Conformity obligations and audit scope?
A [COMPLIANT]: Internal audit program includes AI governance annually. EU AI Act conformity assessment planned for high-risk credit system. Scope documented in audit charter.

Q: Internal audit of AI controls?
A [COMPLIANT]: Internal audit completed AI governance review in 2025 — findings tracked to remediation. Audit procedure established and approved.

Q: Management review of AIMS?
A [COMPLIANT]: AI Governance Committee conducts management review quarterly. Inputs include audit results, incident trends, risk register, and stakeholder feedback. Minutes documented and approved.

Q: Continual improvement?
A [COMPLIANT]: Corrective actions from audits tracked in GRC tool. Improvement initiatives logged. ISO 42001 certification targeted for 2027.

Q: Conformity gaps?
A [PARTIAL]: EU AI Act technical documentation for credit system is in progress — not yet complete. Conformity assessment not yet performed.

---

## THIRD-PARTY & SUPPLY CHAIN

### Vendor & Third-Party AI Risk (supply-vendor)

Q: Third-party AI inventory?
A [PARTIAL]: Major vendors (cloud ML, chatbot platform) inventoried. Smaller SaaS AI tools discovered ad hoc — incomplete third-party AI inventory.

Q: Vendor due diligence for AI?
A [GAP]: Formal AI vendor due diligence checklist exists but not applied to chatbot vendor or embedding model provider. Missing security and bias assessments for two vendors.

Q: Contractual AI controls?
A [PARTIAL]: Master agreements include data processing terms. AI-specific clauses (model update notification, bias testing, incident reporting) only in two of five vendor contracts.

Q: Ongoing vendor monitoring?
A [GAP]: No ongoing monitoring of vendor model updates or performance. Vendor AI risk reviews not performed annually as required by policy.

Q: Supply chain gaps summary?
A [GAP]: Chatbot vendor, embedding provider, and HR screening SaaS lack complete due diligence. Third-party AI governance is the weakest pillar.

---

## GPAI & SYSTEMIC RISK

### GPAI & Systemic Risk (sys-gpai-systemic)

Q: Use of foundation models / GPAI?
A [GAP]: Teams use OpenAI and open-source LLMs (Llama, Mistral) for prototyping without centralized approval. Shadow use of public foundation models is widespread and undocumented.

Q: GPAI governance controls?
A [GAP]: No policy for general-purpose AI model selection, fine-tuning, or deployment. No systemic risk evaluation for large-scale model use. Governance oversight not established for GPAI.

Q: Systemic impact evaluation?
A [GAP]: No evaluation of systemic societal impact from foundation model use. Planned policy update in progress — not yet implemented.

Q: Foundation model documentation?
A [GAP]: Fine-tuned models lack documentation of base model, training data sources, and known limitations. Missing records for regulatory inquiry.

Q: GPAI remediation plans?
A [PARTIAL]: CIO committed to centralizing GPAI approval by Q4 2026. Current state is full gap for documentation and oversight.

---

## END OF WORKSHOP TRANSCRIPT
Use "Auto-map to controls" then analyze individual controls in Review to validate aligned vs gap vs partial outcomes.
`;

const FACILITATOR_NOTES = `# Facilitator Internal Notes (Sample — not shared with client)

Overall maturity: STRONG in governance, privacy, security access controls, and compliance documentation. WEAKEST in fairness/bias, explainability, supply chain, and GPAI/shadow AI.

Priority gaps to validate in analysis:
1. Fairness — no enterprise fairness metrics; chatbot and HR pilot untested [expect: gap]
2. Fundamental rights impact assessment — inconsistent, chatbot waived [expect: gap]
3. Explainability — not implemented for chatbot/fraud/HR [expect: gap]
4. Supply chain — missing vendor due diligence on 2+ vendors [expect: gap]
5. GPAI — shadow foundation model use, undocumented [expect: gap]
6. HR screening pilot — multiple gaps across pillars; treat as high-risk outlier

Strong compliant signals (should map to aligned/partial-positive):
- Board-approved AI policy, documented and maintained
- RACI, segregation of duties, CI/CD deployment gates
- GDPR privacy program, PII detection, consent records
- RBAC/MFA, audit logging, SIEM monitoring for AI assets
- Model V&V for credit/fraud, drift monitoring, incident playbooks
- Internal audit and management review established

Partial areas (expect: partial):
- AI inventory — vendor models added informally
- Bias testing — credit only, ad hoc production monitoring
- Chatbot — incomplete disclosure, no explainability, weak security guardrails
- EU AI Act conformity docs — in progress

Testing tip: After auto-map, run AI analysis on controls under Fairness, Transparency, Supply Chain, and Systemic pillars first — those should show the clearest gaps. Governance and Privacy controls should show stronger in-place findings.

Evidence referenced by client (not uploaded in this sample):
- AI Policy v2.1 (board-approved)
- RACI matrix, AI risk register export
- Credit model model card and V&V report
- Privacy processing records, DPIA for credit
- SIEM access logs sample
`;

export const SAMPLE_WORKSHOP_CAPTURE_NOTES: SampleCaptureNotes = {
  workshopNotes: WORKSHOP_NOTES.trim(),
  facilitatorNotes: FACILITATOR_NOTES.trim(),
  testingGuide: {
    expectedAligned: [
      "Governance & Accountability — policy, roles, risk oversight",
      "Privacy & Data Governance — data quality, lawful processing",
      "Security — access controls, infrastructure protection",
      "Compliance — documentation, logging, internal audit",
      "Human Oversight — credit/fraud human-in-the-loop",
    ],
    expectedGaps: [
      "Fairness — impact assessment, bias testing (chatbot, HR pilot)",
      "Transparency — explainability not implemented",
      "Supply Chain — missing vendor due diligence",
      "Systemic — shadow GPAI use, undocumented foundation models",
      "Safety — HR pilot missing V&V and operational controls",
    ],
    expectedPartial: [
      "Governance — legacy fraud engines, shared chatbot owner",
      "Fairness — credit model bias testing only",
      "Security — incomplete AI threat modeling for chatbot",
      "Transparency — incomplete chatbot user disclosure",
      "Compliance — EU AI Act docs in progress",
    ],
  },
};

export function getSampleWorkshopCaptureNotes(): SampleCaptureNotes {
  return SAMPLE_WORKSHOP_CAPTURE_NOTES;
}
