import type { ControlType, ControlFrequency, CoverageLevel } from "@prisma/client";

export type AdditionalRisk = {
  code: string;
  statement: string;
  category: string;
  relatedHarm: string;
};

export type AdditionalControl = {
  code: string;
  title: string;
  description: string;
  controlType: ControlType;
  frequency: ControlFrequency;
  ownerRole: string;
  cosoIcfComponent?: string;
  cosoIcfPrinciple?: string;
  riskCodes: string[];
  requirementLinks: Array<{ framework: string; clauseId: string; coverage: CoverageLevel }>;
  evidence: Array<{ evidenceType: string; description: string; retentionPeriod: string; collectionMethod: string }>;
  procedure: { steps: string; responsibleRole: string; linkedPolicy?: string };
};

export const additionalRisks: AdditionalRisk[] = [
  {
    code: "RISK-ENV-001",
    statement: "AI model training and inference may cause significant environmental impact through energy consumption and carbon emissions if not measured and managed.",
    category: "environmental",
    relatedHarm: "Carbon footprint, regulatory disclosure failures, reputational harm, ESG rating impact",
  },
  {
    code: "RISK-DRIFT-001",
    statement: "Model and data drift in production may degrade AI system performance, accuracy, and fairness without timely detection and remediation.",
    category: "operational",
    relatedHarm: "Silent quality degradation, incorrect decisions, compliance gaps, customer harm",
  },
];

export const additionalControls: AdditionalControl[] = [
  {
    code: "CTRL-AIMS-001",
    title: "AI Management System Scope and Establishment",
    description: "Define, document, and maintain the scope and boundaries of the AI Management System (AIMS) including applicable AI systems, lifecycle activities, and interested party requirements.",
    controlType: "directive",
    frequency: "annual",
    ownerRole: "Chief AI Officer",
    cosoIcfComponent: "Control Environment",
    cosoIcfPrinciple: "Principle 3 - Establishes structures, reporting lines, authorities and responsibilities",
    riskCodes: ["RISK-GOV-001", "RISK-LEGAL-001"],
    requirementLinks: [
      { framework: "ISO-42001", clauseId: "4.3", coverage: "full" },
      { framework: "ISO-42001", clauseId: "4.4", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-1.1", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "AIMS scope statement", description: "Approved AIMS scope document listing in-scope AI systems, sites, and exclusions with rationale", retentionPeriod: "7 years", collectionMethod: "AIMS document repository" },
      { evidenceType: "Scope review record", description: "Management review minutes confirming scope adequacy", retentionPeriod: "7 years", collectionMethod: "Management review records" },
      { evidenceType: "Interested party register", description: "Register of interested parties and applicable requirements mapped to scope", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
    ],
    procedure: {
      steps: "1. Identify all AI systems and lifecycle activities.\n2. Determine organizational boundaries and exclusions.\n3. Document scope per ISO 42001 Clause 4.3.\n4. Obtain executive approval.\n5. Review at management review or upon material change.\n\nACCEPTANCE CRITERIA: Scope document approved; all high-risk AI systems included; exclusions justified.\nESCALATION: Material scope gaps → CAIO → Audit Committee within 10 business days.\nSLA: Scope review at least annually.",
      responsibleRole: "AI Management System Lead",
      linkedPolicy: "AI Management System Policy",
    },
  },
  {
    code: "CTRL-ISO-ROLES-001",
    title: "AI Organizational Roles, Responsibilities and Authorities",
    description: "Define, assign, and communicate AI governance roles, responsibilities, and authorities including AIMS conformity and performance reporting.",
    controlType: "directive",
    frequency: "annual",
    ownerRole: "Chief AI Officer",
    cosoIcfComponent: "Control Environment",
    cosoIcfPrinciple: "Principle 3 - Establishes structures, reporting lines, authorities and responsibilities",
    riskCodes: ["RISK-GOV-001", "RISK-ACCT-001"],
    requirementLinks: [
      { framework: "ISO-42001", clauseId: "5.3", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.3.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-1.5", coverage: "full" },
      { framework: "COSO-ERM", clauseId: "Comp1-Principle2", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "RACI matrix", description: "AI governance RACI covering AIMS roles and reporting lines", retentionPeriod: "3 years", collectionMethod: "Governance repository" },
      { evidenceType: "Job descriptions", description: "Role descriptions for AI System Owner, AI Risk Manager, Data Steward", retentionPeriod: "7 years", collectionMethod: "HR records" },
      { evidenceType: "Authority delegation", description: "Signed delegation of authority for AI compliance decisions", retentionPeriod: "7 years", collectionMethod: "Legal repository" },
    ],
    procedure: {
      steps: "1. Define AIMS roles per ISO 42001 5.3.\n2. Assign named individuals with backup coverage.\n3. Communicate via org chart and RACI.\n4. Confirm AIMS performance reporting line to top management.\n5. Review upon reorganization.\n\nACCEPTANCE CRITERIA: No unassigned critical roles; reporting line documented.\nESCALATION: Vacant critical role >30 days → CAIO → CHRO.\nSLA: Annual role review.",
      responsibleRole: "AI Governance Lead",
      linkedPolicy: "AI Roles and Responsibilities Policy",
    },
  },
  {
    code: "CTRL-ISO-PLAN-001",
    title: "AI Risk and Opportunity Planning",
    description: "Plan actions to address AI risks and opportunities identified during AIMS planning, integrating with business objectives.",
    controlType: "preventive",
    frequency: "annual",
    ownerRole: "Enterprise Risk Manager",
    cosoIcfComponent: "Risk Assessment",
    cosoIcfPrinciple: "Principle 6 - Specifies objectives to enable risk identification",
    riskCodes: ["RISK-GOV-002", "RISK-GOV-001"],
    requirementLinks: [
      { framework: "ISO-42001", clauseId: "6.1.1", coverage: "full" },
      { framework: "COSO-ERM", clauseId: "Comp2-Principle6", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-1.3", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Planning record", description: "Documented risk/opportunity actions from Clause 6.1.1 planning", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
      { evidenceType: "Objective alignment", description: "Mapping of AI objectives to business objectives", retentionPeriod: "5 years", collectionMethod: "Strategy documents" },
    ],
    procedure: {
      steps: "1. Review 4.1/4.2 context issues.\n2. Identify AIMS risks and opportunities.\n3. Plan actions and integration into AIMS processes.\n4. Assign owners and timelines.\n5. Track at management review.\n\nACCEPTANCE CRITERIA: All high-rated planning items have owners and due dates.\nSLA: Planning cycle aligned with annual business planning.",
      responsibleRole: "Enterprise Risk Manager",
    },
  },
  {
    code: "CTRL-ISO-RES-001",
    title: "AI Resource Management",
    description: "Determine and provide resources for AIMS including data, tooling, computing, and human resources throughout the AI lifecycle.",
    controlType: "directive",
    frequency: "quarterly",
    ownerRole: "Chief Technology Officer",
    riskCodes: ["RISK-GOV-001", "RISK-DATA-001"],
    requirementLinks: [
      { framework: "ISO-42001", clauseId: "7.1", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.4.2", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.4.3", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.4.4", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.4.5", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.4.6", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-5.1", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Resource plan", description: "Annual AI resource plan (compute, data, personnel, tooling)", retentionPeriod: "5 years", collectionMethod: "Budget/planning system" },
      { evidenceType: "Resource inventory", description: "Inventory of AI tooling and compute resources with owners", retentionPeriod: "3 years", collectionMethod: "CMDB / ML platform" },
      { evidenceType: "Capacity review", description: "Quarterly capacity and resource adequacy review", retentionPeriod: "3 years", collectionMethod: "Operations records" },
    ],
    procedure: {
      steps: "1. Forecast resource needs by AI system lifecycle stage.\n2. Document resource allocation per Annex A.4.\n3. Review adequacy quarterly.\n4. Escalate shortfalls to CTO/CFO.\n5. Update upon new high-risk deployments.\n\nACCEPTANCE CRITERIA: No critical resource gaps for in-scope systems.\nSLA: Quarterly review.",
      responsibleRole: "AI Platform Lead",
    },
  },
  {
    code: "CTRL-ISO-COMM-001",
    title: "AI Internal and External Communication",
    description: "Establish communication processes for AIMS including what, when, with whom, and how to communicate AI-related information.",
    controlType: "directive",
    frequency: "continuous",
    ownerRole: "Chief AI Officer",
    cosoIcfComponent: "Information and Communication",
    cosoIcfPrinciple: "Principle 15 - Communicates externally",
    riskCodes: ["RISK-TRANS-001", "RISK-GOV-001"],
    requirementLinks: [
      { framework: "ISO-42001", clauseId: "7.4", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.8.3", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-4.1", coverage: "partial" },
      { framework: "COSO-ERM", clauseId: "Comp5-Principle20", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Communication plan", description: "AIMS communication matrix (internal/external stakeholders)", retentionPeriod: "3 years", collectionMethod: "Communications repository" },
      { evidenceType: "Stakeholder communications", description: "Sample external reporting and stakeholder engagement records", retentionPeriod: "5 years", collectionMethod: "Corporate affairs records" },
    ],
    procedure: {
      steps: "1. Define communication matrix per 7.4.\n2. Establish external reporting mechanisms (A.8.3).\n3. Execute per material events and scheduled cycles.\n4. Log communications.\n5. Review effectiveness annually.\n\nACCEPTANCE CRITERIA: Required communications executed per plan.\nSLA: Material incidents communicated per incident response plan.",
      responsibleRole: "Corporate Communications Lead",
    },
  },
  {
    code: "CTRL-ISO-LC-001",
    title: "AI System Lifecycle Operational Control",
    description: "Plan, implement, and control AI system lifecycle processes including design, development, deployment, and decommissioning.",
    controlType: "preventive",
    frequency: "continuous",
    ownerRole: "AI System Owner",
    riskCodes: ["RISK-SAFE-001", "RISK-ROB-001", "RISK-GOV-001"],
    requirementLinks: [
      { framework: "ISO-42001", clauseId: "8.1", coverage: "full" },
      { framework: "ISO-42001", clauseId: "8.2", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.6.1.2", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.6.1.3", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.6.2.2", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.6.2.5", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.6.2.3", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-2.3", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Lifecycle procedure", description: "Approved AI SDLC procedure covering 8.1/8.2 requirements", retentionPeriod: "7 years", collectionMethod: "Process library" },
      { evidenceType: "Development objectives", description: "Documented development objectives per A.6.1.2 per system", retentionPeriod: "Life of system + 5 years", collectionMethod: "Project documentation" },
      { evidenceType: "Design and development process", description: "Documented SDLC processes per A.6.1.3", retentionPeriod: "7 years", collectionMethod: "Process library" },
      { evidenceType: "Deployment record", description: "Deployment approval and rollback plan per A.6.2.5", retentionPeriod: "Life of system + 5 years", collectionMethod: "Change management system" },
    ],
    procedure: {
      steps: "1. Define lifecycle criteria and controls per 8.1.\n2. Document development objectives (A.6.1.2) and design/development processes (A.6.1.3).\n3. Specify requirements (A.6.2.2).\n4. Gate deployment with approval (A.6.2.5).\n5. Maintain lifecycle records.\n\nACCEPTANCE CRITERIA: No production deployment without lifecycle gate approval.\nESCALATION: Gate failure → System Owner → CAIO.\nSLA: Change requests processed per IT change policy.",
      responsibleRole: "AI System Owner",
      linkedPolicy: "AI System Lifecycle Policy",
    },
  },
  {
    code: "CTRL-ISO-AUDIT-001",
    title: "AIMS Internal Audit Program",
    description: "Conduct planned internal audits to verify AIMS conformity and effective implementation per ISO 42001 Clause 9.2.",
    controlType: "detective",
    frequency: "annual",
    ownerRole: "Internal Audit Director",
    cosoIcfComponent: "Monitoring Activities",
    cosoIcfPrinciple: "Principle 16 - Conducts ongoing and/or separate evaluations",
    riskCodes: ["RISK-QMS-001", "RISK-GOV-001"],
    requirementLinks: [
      { framework: "ISO-42001", clauseId: "9.2", coverage: "full" },
      { framework: "COSO-ERM", clauseId: "Comp4-Principle16", coverage: "full" },
      { framework: "COSO-ERM", clauseId: "Comp4-Principle17", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Audit program", description: "Annual AIMS internal audit program and schedule", retentionPeriod: "7 years", collectionMethod: "Internal audit system" },
      { evidenceType: "Audit report", description: "Internal audit reports with findings and management responses", retentionPeriod: "7 years", collectionMethod: "Internal audit system" },
      { evidenceType: "Auditor competence", description: "Evidence of auditor independence and ISO 42001 competence", retentionPeriod: "5 years", collectionMethod: "HR/training records" },
    ],
    procedure: {
      steps: "1. Plan audit program covering all AIMS requirements over 3-year cycle.\n2. Execute audits per 9.2.\n3. Report findings to management.\n4. Track corrective actions to closure.\n5. Verify closure at next audit.\n\nACCEPTANCE CRITERIA: All high findings closed within agreed CAPA timelines.\nSLA: High findings remediated within 90 days unless approved extension.",
      responsibleRole: "Internal Audit Director",
    },
  },
  {
    code: "CTRL-ISO-MGMTREV-001",
    title: "AIMS Management Review",
    description: "Conduct management reviews at planned intervals to ensure AIMS continuing suitability, adequacy, and effectiveness.",
    controlType: "directive",
    frequency: "annual",
    ownerRole: "Chief AI Officer",
    cosoIcfComponent: "Monitoring Activities",
    cosoIcfPrinciple: "Principle 17 - Evaluates and communicates deficiencies",
    riskCodes: ["RISK-GOV-001", "RISK-QMS-001"],
    requirementLinks: [
      { framework: "ISO-42001", clauseId: "9.3", coverage: "full" },
      { framework: "COSO-ERM", clauseId: "Comp5-Principle19", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-2.1", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Management review minutes", description: "Signed minutes covering all 9.3 input/output requirements", retentionPeriod: "7 years", collectionMethod: "Board/governance repository" },
      { evidenceType: "Action tracker", description: "Management review action items with owners and status", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
    ],
    procedure: {
      steps: "1. Compile 9.3 inputs (audit results, KPIs, incidents, changes).\n2. Convene review with top management.\n3. Document decisions and improvement actions.\n4. Communicate outputs.\n5. Track actions to closure.\n\nACCEPTANCE CRITERIA: All mandatory 9.3 inputs reviewed; actions assigned.\nSLA: Annual review minimum; ad-hoc upon serious incident.",
      responsibleRole: "Chief AI Officer",
    },
  },
  {
    code: "CTRL-EU-AUTHREP-001",
    title: "EU Authorised Representative Appointment",
    description: "Appoint and maintain an EU authorised representative for third-country providers placing high-risk AI on the Union market per Art. 22.",
    controlType: "directive",
    frequency: "annual",
    ownerRole: "General Counsel",
    riskCodes: ["RISK-LEGAL-001", "RISK-GOV-001"],
    requirementLinks: [
      { framework: "EU-AIA", clauseId: "Art-22", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-21", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Mandate agreement", description: "Written mandate with EU authorised representative per Art. 22(3)", retentionPeriod: "10 years", collectionMethod: "Legal repository" },
      { evidenceType: "Representative register", description: "EU representative contact details published and maintained", retentionPeriod: "10 years", collectionMethod: "Regulatory records" },
      { evidenceType: "Cooperation log", description: "Record of authority document requests handled via representative", retentionPeriod: "7 years", collectionMethod: "Legal/compliance records" },
    ],
    procedure: {
      steps: "1. Determine if third-country provider status applies.\n2. Select qualified EU established representative.\n3. Execute written mandate per Art. 22.\n4. Update technical documentation with representative details.\n5. Review mandate annually.\n\nACCEPTANCE CRITERIA: Valid mandate before EU market placement.\nESCALATION: Mandate lapse → block EU deployments → General Counsel.\nSLA: Authority requests forwarded within 3 business days.",
      responsibleRole: "Regulatory Affairs Lead",
      linkedPolicy: "EU AI Act Compliance Policy",
    },
  },
  {
    code: "CTRL-DRIFT-001",
    title: "Model and Data Drift Detection",
    description: "Monitor production AI systems for model drift, data drift, and performance degradation with defined thresholds and remediation.",
    controlType: "detective",
    frequency: "continuous",
    ownerRole: "MLOps Lead",
    cosoIcfComponent: "Monitoring Activities",
    cosoIcfPrinciple: "Principle 17 - Evaluates and communicates deficiencies",
    riskCodes: ["RISK-DRIFT-001", "RISK-MON-001", "RISK-ROB-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-3.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-4.2", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "A.6.2.6", coverage: "partial" },
      { framework: "EU-AIA", clauseId: "Art-72", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Drift monitoring dashboard", description: "Production drift metrics with configured thresholds", retentionPeriod: "2 years", collectionMethod: "MLOps/monitoring platform" },
      { evidenceType: "Drift alert log", description: "Alert history and remediation actions for drift events", retentionPeriod: "5 years", collectionMethod: "Incident/monitoring system" },
      { evidenceType: "Retraining record", description: "Documentation of model refresh triggered by drift detection", retentionPeriod: "Life of model + 5 years", collectionMethod: "ML registry" },
    ],
    procedure: {
      steps: "1. Define drift KPIs and thresholds per model.\n2. Implement automated monitoring.\n3. Alert on threshold breach.\n4. Investigate and remediate (retrain, rollback, or retire).\n5. Document in post-market monitoring report.\n\nACCEPTANCE CRITERIA: Critical drift alerts investigated within 24 hours.\nESCALATION: Sustained drift affecting outcomes → System Owner → CAIO within 48 hours.\nSLA: P1 drift alerts triaged within 4 hours.",
      responsibleRole: "MLOps Lead",
    },
  },
];

export const isoAnnexSupplements: Record<string, Array<{ framework: string; clauseId: string; coverage: CoverageLevel }>> = {
  "CTRL-DOC-001": [
    { framework: "ISO-42001", clauseId: "A.6.2.3", coverage: "full" },
    { framework: "ISO-42001", clauseId: "A.6.2.7", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-3.1", coverage: "full" },
  ],
  "CTRL-LOG-001": [{ framework: "ISO-42001", clauseId: "A.6.2.8", coverage: "full" }],
  "CTRL-MON-001": [{ framework: "ISO-42001", clauseId: "A.6.2.6", coverage: "full" }],
  "CTRL-IMPACT-001": [{ framework: "ISO-42001", clauseId: "A.5.4", coverage: "full" }],
  "CTRL-DEPLOY-001": [{ framework: "ISO-42001", clauseId: "A.9.3", coverage: "full" }],
  "CTRL-3RD-001": [{ framework: "NIST-AI-RMF", clauseId: "GOVERN-6.1", coverage: "full" }],
};

export const oecdFullCoverage: Array<{ control: string; framework: string; clauseId: string; coverage: CoverageLevel }> = [
  { control: "CTRL-ENV-001", framework: "OECD-AI", clauseId: "Principle-1", coverage: "partial" },
  { control: "CTRL-IMPACT-001", framework: "OECD-AI", clauseId: "Principle-1.1", coverage: "full" },
  { control: "CTRL-ENV-001", framework: "OECD-AI", clauseId: "Principle-1.2", coverage: "full" },
  { control: "CTRL-OVER-001", framework: "OECD-AI", clauseId: "Principle-2", coverage: "full" },
  { control: "CTRL-LEGAL-001", framework: "OECD-AI", clauseId: "Principle-2.1", coverage: "full" },
  { control: "CTRL-DATA-001", framework: "OECD-AI", clauseId: "Principle-2.2", coverage: "full" },
  { control: "CTRL-TRANS-001", framework: "OECD-AI", clauseId: "Principle-3", coverage: "full" },
  { control: "CTRL-DOC-001", framework: "OECD-AI", clauseId: "Principle-3.1", coverage: "full" },
  { control: "CTRL-TRANS-001", framework: "OECD-AI", clauseId: "Principle-3.2", coverage: "full" },
  { control: "CTRL-TEST-001", framework: "OECD-AI", clauseId: "Principle-4", coverage: "full" },
  { control: "CTRL-TEST-001", framework: "OECD-AI", clauseId: "Principle-4.1", coverage: "full" },
  { control: "CTRL-TEST-001", framework: "OECD-AI", clauseId: "Principle-4.2", coverage: "full" },
  { control: "CTRL-ACCT-001", framework: "OECD-AI", clauseId: "Principle-5", coverage: "full" },
  { control: "CTRL-GOV-001", framework: "OECD-AI", clauseId: "Principle-5.1", coverage: "full" },
  { control: "CTRL-GOV-001", framework: "OECD-AI", clauseId: "Principle-5.2", coverage: "full" },
  { control: "CTRL-FEEDBACK-001", framework: "OECD-AI", clauseId: "Principle-5.3", coverage: "full" },
];

export const cosoFullCoverage: Array<{ control: string; framework: string; clauseId: string; coverage: CoverageLevel }> = [
  { control: "CTRL-ACCT-001", framework: "COSO-ERM", clauseId: "Comp1-Principle1", coverage: "full" },
  { control: "CTRL-ACCT-001", framework: "COSO-ERM", clauseId: "Comp1-Principle2", coverage: "full" },
  { control: "CTRL-ACCT-001", framework: "COSO-ERM", clauseId: "Comp1-Principle3", coverage: "full" },
  { control: "CTRL-GOV-001", framework: "COSO-ERM", clauseId: "Comp1-Principle4", coverage: "full" },
  { control: "CTRL-TRAIN-001", framework: "COSO-ERM", clauseId: "Comp1-Principle5", coverage: "full" },
  { control: "CTRL-LEGAL-001", framework: "COSO-ERM", clauseId: "Comp2-Principle6", coverage: "full" },
  { control: "CTRL-GOV-002", framework: "COSO-ERM", clauseId: "Comp2-Principle7", coverage: "full" },
  { control: "CTRL-LEGAL-001", framework: "COSO-ERM", clauseId: "Comp2-Principle9", coverage: "full" },
  { control: "CTRL-RM-001", framework: "COSO-ERM", clauseId: "Comp3-Principle10", coverage: "full" },
  { control: "CTRL-GOV-002", framework: "COSO-ERM", clauseId: "Comp3-Principle11", coverage: "full" },
  { control: "CTRL-GOV-002", framework: "COSO-ERM", clauseId: "Comp3-Principle12", coverage: "full" },
  { control: "CTRL-RM-001", framework: "COSO-ERM", clauseId: "Comp3-Principle13", coverage: "full" },
  { control: "CTRL-RISK-PRI-001", framework: "COSO-ERM", clauseId: "Comp3-Principle14", coverage: "full" },
  { control: "CTRL-RISK-PRI-001", framework: "COSO-ERM", clauseId: "Comp3-Principle15", coverage: "full" },
  { control: "CTRL-ISO-AUDIT-001", framework: "COSO-ERM", clauseId: "Comp4-Principle16", coverage: "full" },
  { control: "CTRL-ISO-AUDIT-001", framework: "COSO-ERM", clauseId: "Comp4-Principle17", coverage: "full" },
  { control: "CTRL-MON-001", framework: "COSO-ERM", clauseId: "Comp4-Principle18", coverage: "full" },
  { control: "CTRL-QMS-001", framework: "COSO-ERM", clauseId: "Comp5-Principle19", coverage: "full" },
  { control: "CTRL-FEEDBACK-001", framework: "COSO-ERM", clauseId: "Comp5-Principle20", coverage: "full" },
];
