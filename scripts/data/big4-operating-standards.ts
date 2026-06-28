/** Big 4 audit-grade operating procedures and evidence artifacts (2–4 per control) */

export type OpStandard = {
  procedure: { steps: string; responsibleRole: string; linkedPolicy?: string };
  evidence: Array<{ evidenceType: string; description: string; retentionPeriod: string; collectionMethod: string }>;
};


export const operatingStandards: Record<string, OpStandard> = {
  "CTRL-GOV-001": {
    procedure: {
      steps: "1. Draft AI governance policy integrating NIST trustworthy characteristics and ISO 42001 policy requirements.\n2. Conduct legal, risk, technology, and ethics review.\n3. Obtain board or executive committee approval.\n4. Publish to policy repository and communicate via mandatory training.\n5. Review annually or upon regulatory/material organizational change.\n\nACCEPTANCE CRITERIA: Current approved policy version published; 100% AI actor roles assigned training within 90 days.\nESCALATION: Policy approval delay >30 days → CAIO → Audit Committee.\nSLA: Annual review by Q1; emergency updates within 15 business days of trigger event.",
      responsibleRole: "AI Governance Lead",
      linkedPolicy: "AI Governance Policy",
    },
    evidence: [
      { evidenceType: "Policy document", description: "Board/executive-approved AI governance policy with version history and approval signatures", retentionPeriod: "7 years", collectionMethod: "Document management system" },
      { evidenceType: "Communication record", description: "Policy dissemination records including acknowledgment by AI actors", retentionPeriod: "3 years", collectionMethod: "LMS / HR records" },
      { evidenceType: "Policy review log", description: "Annual policy review checklist with change rationale", retentionPeriod: "7 years", collectionMethod: "GRC platform" },
      { evidenceType: "Stakeholder sign-off", description: "Legal, risk, and technology stakeholder review sign-offs", retentionPeriod: "5 years", collectionMethod: "Workflow system" },
    ],
  },
  "CTRL-GOV-002": {
    procedure: {
      steps: "1. Define impact/likelihood scales aligned with enterprise ERM.\n2. Set AI risk appetite thresholds by system tier (high-risk, limited, minimal).\n3. Map all in-scope AI systems to risk tiers.\n4. Present to risk committee for approval.\n5. Reassess quarterly and upon material changes.\n\nACCEPTANCE CRITERIA: All high-risk AI systems mapped; appetite statement board-approved.\nESCALATION: Unmapped high-risk system → Enterprise Risk Manager → CRO within 48 hours.\nSLA: Quarterly risk register refresh.",
      responsibleRole: "Enterprise Risk Manager",
    },
    evidence: [
      { evidenceType: "Risk appetite statement", description: "Board-approved AI risk appetite and tolerance thresholds", retentionPeriod: "7 years", collectionMethod: "GRC platform" },
      { evidenceType: "Risk register", description: "AI risk register with scored, prioritized risks and tier assignments", retentionPeriod: "5 years", collectionMethod: "Risk management system" },
      { evidenceType: "Risk committee minutes", description: "Risk committee meeting minutes approving appetite and tier mappings", retentionPeriod: "7 years", collectionMethod: "Board portal" },
    ],
  },
  "CTRL-RM-001": {
    procedure: {
      steps: "1. Integrate AI risk management into SDLC gates (design, build, deploy, operate).\n2. Identify risks per lifecycle stage using standardized taxonomy.\n3. Assess likelihood/impact; define treatment measures per Art. 9 and ISO 6.1.3.\n4. Document residual risks and obtain acceptance for high residual exposure.\n5. Monitor continuously; update register upon material changes.\n\nACCEPTANCE CRITERIA: Risk assessment completed before production deployment; Art. 9(2) and 9(4) elements documented.\nESCALATION: Unmitigated high residual risk → AI Risk Manager → CAIO → Risk Committee.\nSLA: Risk assessment within 10 business days of gate trigger; continuous monitoring alerts triaged within 24 hours.",
      responsibleRole: "AI Risk Manager",
    },
    evidence: [
      { evidenceType: "Risk management plan", description: "AIMS-integrated AI risk management process with lifecycle integration points", retentionPeriod: "Life of system + 5 years", collectionMethod: "AIMS documentation" },
      { evidenceType: "Risk assessment reports", description: "Stage-gate risk assessments with treatment plans and residual risk acceptance", retentionPeriod: "Life of system + 5 years", collectionMethod: "GRC platform" },
      { evidenceType: "Risk treatment log", description: "Tracked risk treatment actions with owners, due dates, and closure evidence", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
      { evidenceType: "Residual risk acceptance", description: "Signed residual risk acceptance for risks above appetite threshold", retentionPeriod: "7 years", collectionMethod: "Risk committee records" },
    ],
  },
  "CTRL-DATA-001": {
    procedure: {
      steps: "1. Define data quality criteria per use case (completeness, accuracy, representativeness).\n2. Validate training/validation/test datasets against Art. 10(2)(a) and (f) criteria.\n3. Conduct bias and statistical representativeness examinations.\n4. Document data provenance and lineage.\n5. Re-validate upon material data changes.\n\nACCEPTANCE CRITERIA: All production datasets pass quality gates; bias examination documented.\nESCALATION: Failed quality gate → Data Steward → AI System Owner; block deployment.\nSLA: Dataset validation within 5 business days of submission.",
      responsibleRole: "Data Steward",
    },
    evidence: [
      { evidenceType: "Data quality report", description: "Dataset quality metrics, bias analysis, and representativeness results", retentionPeriod: "Life of model + 5 years", collectionMethod: "ML pipeline artifacts" },
      { evidenceType: "Data governance policy", description: "Approved AI data governance procedures including Art. 10 alignment", retentionPeriod: "7 years", collectionMethod: "Policy repository" },
      { evidenceType: "Data lineage record", description: "End-to-end data provenance and transformation lineage", retentionPeriod: "Life of model + 5 years", collectionMethod: "Data catalog" },
      { evidenceType: "Bias examination report", description: "Documented bias testing results per protected characteristics where applicable", retentionPeriod: "Life of model + 5 years", collectionMethod: "ML governance platform" },
    ],
  },
  "CTRL-TEST-001": {
    procedure: {
      steps: "1. Develop test plan aligned with requirements, Art. 15, and ISO A.6.2.4.\n2. Execute functional, performance, bias, robustness, and security tests.\n3. Document pass/fail against acceptance criteria.\n4. Remediate failures; obtain QA and system owner sign-off.\n5. Re-test after material changes.\n\nACCEPTANCE CRITERIA: All critical test cases pass; no open P1 defects at deployment gate.\nESCALATION: Failed security/robustness test → QA Lead → CISO → block deployment.\nSLA: Test cycle completion within 15 business days of build completion.",
      responsibleRole: "QA Engineer",
    },
    evidence: [
      { evidenceType: "Test plan", description: "Approved test plan with scope, criteria, and traceability to requirements", retentionPeriod: "Life of system + 5 years", collectionMethod: "Test management system" },
      { evidenceType: "Test results", description: "Validation and testing reports with pass/fail criteria and remediation records", retentionPeriod: "Life of system + 5 years", collectionMethod: "Test management system" },
      { evidenceType: "Adversarial testing report", description: "Red team and adversarial test results for high-risk and GPAI systems", retentionPeriod: "5 years", collectionMethod: "Security testing platform" },
      { evidenceType: "Deployment sign-off", description: "QA and system owner sign-off before production release", retentionPeriod: "Life of system + 5 years", collectionMethod: "Change management system" },
    ],
  },
  "CTRL-DOC-001": {
    procedure: {
      steps: "1. Create technical documentation before market placement per Art. 11 and Annex IV.\n2. Include system description, training data summary, metrics, limitations, and risk controls.\n3. Maintain version control; update upon material changes.\n4. Review completeness quarterly against checklist.\n5. Provide to authorities within required timeframe upon request.\n\nACCEPTANCE CRITERIA: Technical file complete per Annex IV checklist; version current.\nESCALATION: Incomplete documentation at deployment gate → block release → Technical Documentation Lead → CAIO.\nSLA: Authority document requests fulfilled within 5 business days.",
      responsibleRole: "Technical Documentation Lead",
    },
    evidence: [
      { evidenceType: "Technical documentation", description: "Complete technical file per Annex IV/XI with version history", retentionPeriod: "10 years", collectionMethod: "Document management system" },
      { evidenceType: "Model card", description: "Model card with capabilities, limitations, intended use, and performance metrics", retentionPeriod: "Life of system + 5 years", collectionMethod: "ML registry" },
      { evidenceType: "Documentation review record", description: "Quarterly completeness review checklist with findings", retentionPeriod: "5 years", collectionMethod: "QMS records" },
      { evidenceType: "Authority submission log", description: "Log of documentation provided to regulators upon request", retentionPeriod: "10 years", collectionMethod: "Regulatory records" },
    ],
  },
  "CTRL-LOG-001": {
    procedure: {
      steps: "1. Define log events (inputs, outputs, overrides, modifications) per Art. 12.\n2. Implement automatic logging in production environments.\n3. Configure retention per regulatory and contractual minimums.\n4. Test log completeness and integrity quarterly.\n5. Enable secure access for incident investigation and audits.\n\nACCEPTANCE CRITERIA: 100% of required log events captured; retention meets Art. 12 minimums.\nESCALATION: Logging failure → DevOps → CISO within 4 hours.\nSLA: Log integrity tests quarterly; incident log extraction within 2 hours of request.",
      responsibleRole: "DevOps Engineer",
    },
    evidence: [
      { evidenceType: "Log configuration", description: "Logging architecture, event catalog, and retention configuration", retentionPeriod: "Life of system", collectionMethod: "Infrastructure documentation" },
      { evidenceType: "Audit logs", description: "Sample audit log exports demonstrating input/output traceability", retentionPeriod: "Per regulatory minimum", collectionMethod: "Log management platform" },
      { evidenceType: "Log integrity test", description: "Quarterly log completeness and tamper-evidence test results", retentionPeriod: "3 years", collectionMethod: "Security operations records" },
    ],
  },
  "CTRL-TRANS-001": {
    procedure: {
      steps: "1. Draft instructions for use covering intended purpose, limitations, and performance metrics.\n2. Implement transparency obligations for deployers/users per Art. 13 and Art. 50.\n3. Review with legal, UX, and accessibility teams.\n4. Publish with system deployment; maintain currency.\n5. Assess transparency adequacy annually.\n\nACCEPTANCE CRITERIA: Instructions for use published before deployment; Art. 50 transparency obligations met.\nESCALATION: Missing transparency for high-risk system → Product Owner → Legal → block deployment.\nSLA: Update instructions within 10 business days of material system change.",
      responsibleRole: "Product Manager",
    },
    evidence: [
      { evidenceType: "Instructions for use", description: "User-facing documentation with capabilities, limitations, and appropriate use guidance", retentionPeriod: "Life of system + 3 years", collectionMethod: "Product documentation" },
      { evidenceType: "Transparency assessment", description: "Assessment of transparency adequacy for intended users and deployers", retentionPeriod: "3 years", collectionMethod: "Compliance review records" },
      { evidenceType: "Art-50 disclosure record", description: "Evidence of transparency disclosures for applicable AI interactions", retentionPeriod: "5 years", collectionMethod: "Product/compliance records" },
    ],
  },
  "CTRL-OVER-001": {
    procedure: {
      steps: "1. Define human oversight requirements by risk tier per Art. 14.\n2. Design HMI with override, stop, and escalation capabilities per Art. 14(4)(a).\n3. Assign trained oversight personnel with documented competencies.\n4. Test override mechanisms before deployment and semi-annually.\n5. Monitor oversight effectiveness via sampling and metrics.\n\nACCEPTANCE CRITERIA: Override tested and functional; trained overseers assigned for all high-risk systems.\nESCALATION: Override failure → immediate system suspension → System Owner → CAIO.\nSLA: Override test before every deployment; semi-annual re-test.",
      responsibleRole: "Human Factors Engineer",
    },
    evidence: [
      { evidenceType: "HMI design specification", description: "Human oversight interface design with override and shutdown mechanisms", retentionPeriod: "Life of system + 5 years", collectionMethod: "Design documentation" },
      { evidenceType: "Oversight training records", description: "Training completion for personnel assigned human oversight roles", retentionPeriod: "3 years", collectionMethod: "LMS records" },
      { evidenceType: "Override test results", description: "Documented override and shutdown mechanism test results", retentionPeriod: "5 years", collectionMethod: "QA records" },
    ],
  },
  "CTRL-IMPACT-001": {
    procedure: {
      steps: "1. Trigger impact assessment before high-risk deployment or material change.\n2. Identify affected individuals, groups, and fundamental rights.\n3. Evaluate societal and environmental impacts per OECD Principle 1.\n4. Document findings, mitigations, and residual impacts.\n5. Conduct stakeholder consultation where required; notify authorities if applicable.\n\nACCEPTANCE CRITERIA: Impact assessment completed and approved before deployment gate.\nESCALATION: Unmitigated fundamental rights impact → Responsible AI Lead → General Counsel → block deployment.\nSLA: Assessment completion within 15 business days of trigger.",
      responsibleRole: "Impact Assessment Lead",
    },
    evidence: [
      { evidenceType: "Impact assessment report", description: "Completed FRIA or AI impact assessment with mitigations", retentionPeriod: "7 years", collectionMethod: "GRC platform" },
      { evidenceType: "Stakeholder consultation record", description: "Records of stakeholder engagement during assessment", retentionPeriod: "5 years", collectionMethod: "Meeting minutes" },
      { evidenceType: "Mitigation tracker", description: "Tracked impact mitigation actions with closure evidence", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
    ],
  },
  "CTRL-INC-001": {
    procedure: {
      steps: "1. Detect and classify AI incidents using severity matrix.\n2. Contain immediate harm; preserve logs and evidence.\n3. Notify affected parties, internal stakeholders, and authorities per requirements.\n4. Investigate root cause; implement corrective actions.\n5. Conduct lessons learned and update controls.\n\nACCEPTANCE CRITERIA: All P1 incidents contained within SLA; root cause documented.\nESCALATION: P1 incident → Incident Commander → CAIO → General Counsel immediately.\nSLA: P1 triage within 1 hour; authority notification per Art. 73 timelines.",
      responsibleRole: "Incident Commander",
    },
    evidence: [
      { evidenceType: "Incident response plan", description: "AI-specific incident response procedures with severity matrix and notification paths", retentionPeriod: "7 years", collectionMethod: "Policy repository" },
      { evidenceType: "Incident reports", description: "Documented AI incidents with timeline, root cause, and remediation", retentionPeriod: "7 years", collectionMethod: "Incident management system" },
      { evidenceType: "Post-incident review", description: "Lessons learned and corrective action tracking", retentionPeriod: "7 years", collectionMethod: "Incident management system" },
    ],
  },
  "CTRL-MON-001": {
    procedure: {
      steps: "1. Define post-market monitoring metrics and thresholds per Art. 72.\n2. Implement automated performance and anomaly monitoring.\n3. Review monitoring reports monthly (high-risk) or quarterly.\n4. Investigate anomalies and drift events.\n5. Trigger remediation, retraining, or retirement as needed.\n\nACCEPTANCE CRITERIA: Monitoring plan approved; all high-risk systems under active monitoring.\nESCALATION: Sustained performance degradation → MLOps Lead → System Owner within 48 hours.\nSLA: Monthly review for high-risk; anomaly investigation within 24 hours.",
      responsibleRole: "MLOps Engineer",
    },
    evidence: [
      { evidenceType: "Monitoring plan", description: "Post-market monitoring plan with metrics, thresholds, and review cadence", retentionPeriod: "Life of system + 5 years", collectionMethod: "AIMS documentation" },
      { evidenceType: "Performance dashboards", description: "Operational monitoring dashboards and alert logs", retentionPeriod: "2 years", collectionMethod: "Monitoring platform" },
      { evidenceType: "Monitoring review minutes", description: "Periodic monitoring review records with decisions and actions", retentionPeriod: "5 years", collectionMethod: "Operations records" },
    ],
  },
  "CTRL-QMS-001": {
    procedure: {
      steps: "1. Document QMS scope, processes, and compliance criteria per Art. 17.\n2. Define quality objectives and KPIs.\n3. Conduct internal audits per audit program.\n4. Manage non-conformities through CAPA process.\n5. Report QMS performance at management review.\n\nACCEPTANCE CRITERIA: QMS documented and certified/self-declared; internal audit program current.\nESCALATION: Major non-conformity → Quality Manager → CAIO within 5 business days.\nSLA: Internal audit cycle covers all QMS processes within 12 months.",
      responsibleRole: "Quality Manager",
    },
    evidence: [
      { evidenceType: "QMS documentation", description: "Quality management system manual, policies, and procedures", retentionPeriod: "7 years", collectionMethod: "QMS platform" },
      { evidenceType: "Internal audit reports", description: "QMS internal audit findings, CAPA records, and closure evidence", retentionPeriod: "5 years", collectionMethod: "Audit management system" },
      { evidenceType: "QMS KPI dashboard", description: "Quality objectives and KPI tracking with trend analysis", retentionPeriod: "3 years", collectionMethod: "QMS platform" },
    ],
  },
  "CTRL-3RD-001": {
    procedure: {
      steps: "1. Maintain inventory of third-party AI components, models, and services.\n2. Assess vendor AI governance maturity and security posture.\n3. Include AI-specific contractual requirements (GOVERN-6.1, A.10.3).\n4. Monitor vendor compliance quarterly.\n5. Maintain contingency plans for critical vendor failures.\n\nACCEPTANCE CRITERIA: All critical third-party AI components assessed; contracts include AI clauses.\nESCALATION: Critical vendor non-compliance → Vendor Risk Manager → CAIO → Procurement.\nSLA: New vendor assessment before onboarding; quarterly monitoring review.",
      responsibleRole: "Vendor Risk Manager",
    },
    evidence: [
      { evidenceType: "Vendor assessment", description: "Third-party AI vendor risk assessments with scoring and remediation", retentionPeriod: "5 years", collectionMethod: "Vendor management system" },
      { evidenceType: "Contract clauses", description: "AI-specific contractual requirements including audit rights and incident notification", retentionPeriod: "Life of contract + 7 years", collectionMethod: "Contract repository" },
      { evidenceType: "Vendor inventory", description: "Complete inventory of third-party AI components with criticality ratings", retentionPeriod: "3 years", collectionMethod: "CMDB / vendor registry" },
    ],
  },
  "CTRL-GPAI-001": {
    procedure: {
      steps: "1. Classify GPAI model systemic risk status per Art. 51.\n2. Conduct model evaluation per Annex XI and state-of-the-art protocols.\n3. Perform adversarial testing for systemic risk models per Art. 55.\n4. Document and publish model information per Art. 53.\n5. Report serious incidents to authorities.\n\nACCEPTANCE CRITERIA: Evaluation complete before release; systemic risk models pass adversarial testing.\nESCALATION: Systemic risk classification → GPAI Compliance Lead → General Counsel → CAIO.\nSLA: Evaluation within 20 business days of model completion.",
      responsibleRole: "GPAI Compliance Lead",
    },
    evidence: [
      { evidenceType: "Model evaluation report", description: "Standardized GPAI evaluation per Annex XI protocols", retentionPeriod: "5 years", collectionMethod: "Model registry" },
      { evidenceType: "Adversarial testing results", description: "Documented adversarial and red-team testing for systemic risk models", retentionPeriod: "5 years", collectionMethod: "Security testing platform" },
      { evidenceType: "Model information sheet", description: "Published model documentation per Art. 53 transparency requirements", retentionPeriod: "5 years", collectionMethod: "Model registry" },
    ],
  },
  "CTRL-CLASS-001": {
    procedure: {
      steps: "1. Inventory all AI systems in scope.\n2. Assess against EU Annex III, GPAI, and internal risk taxonomy.\n3. Document classification rationale and responsible approver.\n4. Obtain legal review for borderline cases.\n5. Re-classify upon material change to purpose or context.\n\nACCEPTANCE CRITERIA: Every in-scope AI system has documented classification before development proceeds.\nESCALATION: Unclassified high-risk candidate → AI Compliance Lead → Legal within 48 hours.\nSLA: Classification within 5 business days of system registration.",
      responsibleRole: "AI Compliance Lead",
    },
    evidence: [
      { evidenceType: "Classification record", description: "Documented classification decision with Annex III mapping and rationale", retentionPeriod: "Life of system + 7 years", collectionMethod: "GRC platform" },
      { evidenceType: "Legal review sign-off", description: "Legal review for borderline or high-risk classifications", retentionPeriod: "7 years", collectionMethod: "Legal repository" },
      { evidenceType: "AI system inventory", description: "Master inventory of AI systems with classification status", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
    ],
  },
  "CTRL-CONFORM-001": {
    procedure: {
      steps: "1. Determine applicable conformity assessment procedure per Art. 43.\n2. Execute assessment against Chapter III requirements.\n3. Draw up EU declaration of conformity per Art. 48.\n4. Affix CE marking where applicable.\n5. Maintain documentation for authority requests.\n\nACCEPTANCE CRITERIA: Valid declaration before EU market placement; CE marking where required.\nESCALATION: Conformity gap → Quality Manager → Regulatory Affairs → block market placement.\nSLA: Conformity assessment complete before planned launch date.",
      responsibleRole: "Quality Manager",
    },
    evidence: [
      { evidenceType: "EU declaration of conformity", description: "Signed declaration per Art. 48 with notified body reference if applicable", retentionPeriod: "10 years", collectionMethod: "QMS repository" },
      { evidenceType: "Conformity assessment report", description: "Internal or third-party conformity assessment results", retentionPeriod: "10 years", collectionMethod: "Compliance records" },
      { evidenceType: "CE marking record", description: "Evidence of CE marking application and placement", retentionPeriod: "10 years", collectionMethod: "Product records" },
    ],
  },
  "CTRL-DEPLOY-001": {
    procedure: {
      steps: "1. Complete deployer obligations checklist per Art. 26.\n2. Assign human oversight personnel with training.\n3. Validate input data relevance and quality at point of use.\n4. Follow provider instructions for use.\n5. Maintain deployer logs; conduct FRIA where required.\n\nACCEPTANCE CRITERIA: Deployer checklist complete; oversight personnel assigned before go-live.\nESCALATION: Incomplete deployer obligations → Deployer System Owner → Legal.\nSLA: Checklist completion before production use.",
      responsibleRole: "Deployer System Owner",
    },
    evidence: [
      { evidenceType: "Deployer checklist", description: "Completed deployer obligations checklist per Art. 26", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
      { evidenceType: "Input validation record", description: "Evidence of input data quality checks at deployment", retentionPeriod: "3 years", collectionMethod: "Operations records" },
      { evidenceType: "FRIA record", description: "Fundamental rights impact assessment where required for deployers", retentionPeriod: "7 years", collectionMethod: "GRC platform" },
    ],
  },
  "CTRL-REG-001": {
    procedure: {
      steps: "1. Prepare registration data from approved technical documentation.\n2. Submit to EU database before market placement per Art. 49.\n3. Verify registration accuracy against technical file.\n4. Update registration upon material changes.\n5. Maintain registration confirmation for audits.\n\nACCEPTANCE CRITERIA: Valid registration receipt before EU market placement.\nESCALATION: Registration failure → Regulatory Affairs → General Counsel; block EU deployment.\nSLA: Registration submitted at least 5 business days before market placement.",
      responsibleRole: "Regulatory Affairs Lead",
    },
    evidence: [
      { evidenceType: "Registration confirmation", description: "EU database registration receipt and entry screenshot/export", retentionPeriod: "10 years", collectionMethod: "Regulatory records" },
      { evidenceType: "Registration data pack", description: "Submitted registration data cross-referenced to technical documentation", retentionPeriod: "10 years", collectionMethod: "Regulatory records" },
      { evidenceType: "Update log", description: "Log of registration updates upon material changes", retentionPeriod: "10 years", collectionMethod: "Regulatory records" },
    ],
  },
  "CTRL-INC-REPORT-001": {
    procedure: {
      steps: "1. Detect and classify serious incident per Art. 73 criteria.\n2. Contain immediate harm; preserve evidence.\n3. Report to market surveillance authority within required timeframe.\n4. Notify affected deployers and users.\n5. Document root cause, remediation, and preventive actions.\n\nACCEPTANCE CRITERIA: Authority notification within regulatory deadline; affected parties notified.\nESCALATION: Serious incident → Incident Commander → General Counsel → CAIO immediately.\nSLA: Initial authority report per Art. 73 timelines (typically 15 days; immediate for death/serious harm).",
      responsibleRole: "Incident Commander",
    },
    evidence: [
      { evidenceType: "Incident report", description: "Serious incident report submitted to market surveillance authority", retentionPeriod: "7 years", collectionMethod: "Incident management system" },
      { evidenceType: "Authority correspondence", description: "Regulator acknowledgment and follow-up communications", retentionPeriod: "10 years", collectionMethod: "Regulatory records" },
      { evidenceType: "Affected party notification", description: "Evidence of notification to deployers and affected users", retentionPeriod: "7 years", collectionMethod: "Incident management system" },
    ],
  },
  "CTRL-DECOM-001": {
    procedure: {
      steps: "1. Trigger decommission assessment upon retirement decision.\n2. Plan data/model retirement, retention, and destruction.\n3. Notify stakeholders and users of phase-out timeline.\n4. Execute decommission per plan with verification.\n5. Archive documentation per retention policy.\n\nACCEPTANCE CRITERIA: Data handled per retention/destruction policy; stakeholders notified.\nESCALATION: Data destruction non-compliance → System Owner → DPO → Legal.\nSLA: Decommission plan approved before shutdown; execution within agreed timeline.",
      responsibleRole: "AI System Owner",
    },
    evidence: [
      { evidenceType: "Decommission plan", description: "Approved plan with timeline, data handling, and stakeholder communication", retentionPeriod: "7 years", collectionMethod: "AIMS documentation" },
      { evidenceType: "Data destruction certificate", description: "Certificate of secure data/model destruction where applicable", retentionPeriod: "7 years", collectionMethod: "IT records" },
      { evidenceType: "Stakeholder notification", description: "Records of stakeholder notification of system retirement", retentionPeriod: "5 years", collectionMethod: "Communications records" },
    ],
  },
  "CTRL-TRAIN-001": {
    procedure: {
      steps: "1. Define competency requirements by AI role (developer, overseer, risk manager).\n2. Deliver role-based training programs aligned with ISO 7.2/7.3.\n3. Assess proficiency via tests or practical evaluation.\n4. Maintain interdisciplinary team composition records.\n5. Refresh training annually and upon material process changes.\n\nACCEPTANCE CRITERIA: 100% of AI actors complete required training within 90 days of role assignment.\nESCALATION: Training gap >30 days → Learning Lead → CAIO → HR.\nSLA: Annual refresher by Q4; new hire training within 30 days.",
      responsibleRole: "Learning & Development Lead",
    },
    evidence: [
      { evidenceType: "Training records", description: "AI competency training completion and assessment scores", retentionPeriod: "3 years", collectionMethod: "LMS" },
      { evidenceType: "Competency matrix", description: "Role-based competency requirements mapped to training modules", retentionPeriod: "3 years", collectionMethod: "HR records" },
      { evidenceType: "Training program review", description: "Annual training program adequacy review", retentionPeriod: "5 years", collectionMethod: "L&D records" },
    ],
  },
  "CTRL-RISK-PRI-001": {
    procedure: {
      steps: "1. Score risks from Map function using enterprise scales.\n2. Prioritize by impact × likelihood; rank top risks.\n3. Define treatment plans for risks above appetite.\n4. Document residual risks and obtain acceptance.\n5. Review prioritization quarterly.\n\nACCEPTANCE CRITERIA: All risks above appetite have treatment plans; residual acceptance documented.\nESCALATION: Unaccepted high residual risk → AI Risk Manager → Risk Committee.\nSLA: Quarterly prioritization review.",
      responsibleRole: "AI Risk Manager",
    },
    evidence: [
      { evidenceType: "Prioritized risk register", description: "Risk register with treatment status, owners, and residual risk scores", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
      { evidenceType: "Treatment plan tracker", description: "Risk treatment actions with milestones and closure evidence", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
      { evidenceType: "Risk committee review", description: "Quarterly risk prioritization review minutes", retentionPeriod: "7 years", collectionMethod: "Risk committee records" },
    ],
  },
  "CTRL-FEEDBACK-001": {
    procedure: {
      steps: "1. Publish accessible feedback and appeal channels.\n2. Triage reported issues within 2 business days.\n3. Investigate and remediate valid concerns.\n4. Incorporate adjudicated outcomes into system updates.\n5. Report feedback trends to governance quarterly.\n\nACCEPTANCE CRITERIA: All appeals acknowledged within 2 business days; P1 issues resolved within 15 business days.\nESCALATION: Unresolved P1 appeal → Customer Experience → CAIO → Legal.\nSLA: Acknowledge within 2 business days; resolve P1 within 15 business days.",
      responsibleRole: "Customer Experience Lead",
    },
    evidence: [
      { evidenceType: "Feedback log", description: "Complete record of user/community feedback, appeals, and resolutions", retentionPeriod: "3 years", collectionMethod: "Support/feedback system" },
      { evidenceType: "Appeal outcome record", description: "Documented appeal decisions and system changes implemented", retentionPeriod: "5 years", collectionMethod: "Legal/compliance records" },
      { evidenceType: "Feedback trend report", description: "Quarterly feedback analysis reported to governance", retentionPeriod: "3 years", collectionMethod: "GRC platform" },
    ],
  },
  "CTRL-PRIV-001": {
    procedure: {
      steps: "1. Map personal data flows for AI system.\n2. Assess privacy risks (minimization, purpose limitation, retention).\n3. Apply privacy-preserving techniques where appropriate.\n4. Complete DPIA where required by GDPR.\n5. Review before deployment and upon material data changes.\n\nACCEPTANCE CRITERIA: DPIA completed where required; privacy mitigations implemented before deployment.\nESCALATION: High privacy risk without mitigation → Privacy Officer → DPO → block deployment.\nSLA: Privacy assessment within 10 business days of trigger.",
      responsibleRole: "Privacy Officer",
    },
    evidence: [
      { evidenceType: "Privacy impact assessment", description: "AI-specific privacy risk assessment or DPIA", retentionPeriod: "5 years", collectionMethod: "Privacy office records" },
      { evidenceType: "Data flow diagram", description: "Personal data flow mapping for AI processing activities", retentionPeriod: "5 years", collectionMethod: "Privacy office records" },
      { evidenceType: "Mitigation record", description: "Documented privacy controls and minimization measures applied", retentionPeriod: "5 years", collectionMethod: "Privacy office records" },
    ],
  },
  "CTRL-ENV-001": {
    procedure: {
      steps: "1. Measure compute energy consumption for training and inference.\n2. Calculate carbon footprint using approved methodology.\n3. Document environmental impact in sustainability reporting.\n4. Identify reduction opportunities (efficient models, green compute).\n5. Set and track improvement targets annually.\n\nACCEPTANCE CRITERIA: Energy/carbon metrics reported for all major model training runs.\nESCALATION: Material ESG reporting gap → Sustainability Lead → CAIO → ESG Committee.\nSLA: Annual environmental report; major training runs measured at completion.",
      responsibleRole: "Sustainability Lead",
    },
    evidence: [
      { evidenceType: "Carbon/energy report", description: "Training and inference energy consumption and carbon metrics", retentionPeriod: "3 years", collectionMethod: "Sustainability reporting" },
      { evidenceType: "Compute utilization log", description: "GPU/compute utilization records for major AI workloads", retentionPeriod: "2 years", collectionMethod: "Cloud billing / ML platform" },
      { evidenceType: "Reduction target tracker", description: "Environmental improvement targets and progress tracking", retentionPeriod: "5 years", collectionMethod: "ESG platform" },
    ],
  },
  "CTRL-LEGAL-001": {
    procedure: {
      steps: "1. Monitor regulatory developments across applicable jurisdictions.\n2. Map legal requirements to AI systems and processes.\n3. Conduct gap assessments against current controls.\n4. Update policies and control mappings quarterly.\n5. Brief AI governance committee on material changes.\n\nACCEPTANCE CRITERIA: Legal register current within 30 days of regulatory change.\nESCALATION: Material compliance gap → Legal Counsel → General Counsel → CAIO.\nSLA: Quarterly legal register review; emergency briefing within 5 business days of major regulation.",
      responsibleRole: "Legal Counsel",
    },
    evidence: [
      { evidenceType: "Legal requirements register", description: "Register of applicable AI laws/regulations by jurisdiction with effective dates", retentionPeriod: "7 years", collectionMethod: "Legal repository" },
      { evidenceType: "Gap assessment", description: "Quarterly compliance gap assessment against legal register", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
      { evidenceType: "Regulatory change log", description: "Log of regulatory changes with impact assessment and action items", retentionPeriod: "7 years", collectionMethod: "Legal repository" },
    ],
  },
  "CTRL-ACCT-001": {
    procedure: {
      steps: "1. Define accountability structures and RACI for AI decisions.\n2. Assign executive responsibility per Art. 21 where applicable.\n3. Publish redress and appeal mechanisms.\n4. Track and resolve appeals within SLA.\n5. Report accountability metrics to board annually.\n\nACCEPTANCE CRITERIA: RACI published; redress mechanism accessible; executive accountability documented.\nESCALATION: Unresolved executive accountability gap → CAIO → Board Audit Committee.\nSLA: Appeal resolution within 30 business days unless extended with notice.",
      responsibleRole: "Chief AI Officer",
    },
    evidence: [
      { evidenceType: "Accountability matrix", description: "RACI matrix for AI governance roles and decision accountability", retentionPeriod: "3 years", collectionMethod: "Governance repository" },
      { evidenceType: "Redress procedure", description: "Published appeal and redress process with SLA commitments", retentionPeriod: "7 years", collectionMethod: "Policy repository" },
      { evidenceType: "Board accountability report", description: "Annual accountability and redress metrics report to board", retentionPeriod: "7 years", collectionMethod: "Board portal" },
    ],
  },
};
