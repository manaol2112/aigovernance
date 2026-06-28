import {
  PrismaClient,
  VerificationStatus,
  CoverageLevel,
  ControlType,
  ControlFrequency,
} from "@prisma/client";

import {
  additionalRisks,
  additionalControls,
  isoAnnexSupplements,
  oecdFullCoverage,
  cosoFullCoverage,
} from "./data/big4-additional-controls";
import { requirementSupplements } from "./data/big4-requirement-supplements";
import { operatingStandards } from "./data/big4-operating-standards";
import { coverageUpgrades } from "./data/remediation-coverage-upgrades";

const prisma = new PrismaClient();

const risks = [
  { code: "RISK-LEGAL-001", statement: "Failure to comply with applicable AI-related laws and regulations may result in legal penalties, enforcement actions, and loss of operating license.", category: "legal", relatedHarm: "Regulatory fines, litigation, market access restrictions" },
  { code: "RISK-GOV-001", statement: "Inadequate AI governance structures may lead to unclear accountability, inconsistent risk decisions, and ineffective oversight.", category: "governance", relatedHarm: "Organizational liability, audit findings, reputational damage" },
  { code: "RISK-GOV-002", statement: "Undefined or misaligned AI risk appetite may cause over-exposure to high-impact AI risks or excessive risk aversion blocking innovation.", category: "governance", relatedHarm: "Strategic misalignment, resource misallocation" },
  { code: "RISK-BIAS-001", statement: "AI systems may produce discriminatory or unfair outcomes due to biased training data, flawed algorithms, or inadequate testing.", category: "fairness", relatedHarm: "Discrimination claims, harm to protected groups, reputational damage" },
  { code: "RISK-PRIV-001", statement: "AI systems may improperly process personal data or violate privacy rights through inadequate data governance.", category: "privacy", relatedHarm: "Privacy violations, regulatory penalties, loss of user trust" },
  { code: "RISK-SAFE-001", statement: "AI systems may cause physical or psychological harm to individuals due to unsafe design, deployment, or failure modes.", category: "safety", relatedHarm: "Injury, death, psychological harm, product liability" },
  { code: "RISK-SEC-001", statement: "AI systems may be vulnerable to adversarial attacks, data poisoning, or cybersecurity breaches compromising integrity and confidentiality.", category: "security", relatedHarm: "Data breaches, system compromise, operational disruption" },
  { code: "RISK-TRANS-001", statement: "Insufficient transparency may prevent users and stakeholders from understanding AI system capabilities, limitations, and decision logic.", category: "transparency", relatedHarm: "Misuse, loss of trust, inability to exercise rights" },
  { code: "RISK-OVER-001", statement: "Inadequate human oversight may allow AI systems to operate autonomously in situations requiring human judgment and intervention.", category: "operational", relatedHarm: "Erroneous decisions, inability to override harmful outputs" },
  { code: "RISK-DATA-001", statement: "Poor data quality, incomplete datasets, or inadequate data governance may degrade AI system performance and reliability.", category: "data", relatedHarm: "Inaccurate outputs, biased results, system failures" },
  { code: "RISK-ROB-001", statement: "AI systems may lack sufficient accuracy, robustness, or resilience under real-world conditions and edge cases.", category: "reliability", relatedHarm: "System failures, incorrect decisions, safety incidents" },
  { code: "RISK-DOC-001", statement: "Inadequate technical documentation may prevent verification of compliance and hinder incident investigation.", category: "compliance", relatedHarm: "Regulatory non-compliance, inability to audit" },
  { code: "RISK-LOG-001", statement: "Insufficient record-keeping and logging may prevent traceability of AI system decisions and lifecycle events.", category: "compliance", relatedHarm: "Inability to investigate incidents, regulatory violations" },
  { code: "RISK-3RD-001", statement: "Third-party AI components or services may introduce unmanaged risks through supply chain dependencies.", category: "supply_chain", relatedHarm: "Hidden vulnerabilities, vendor failures, cascading incidents" },
  { code: "RISK-IMPACT-001", statement: "Failure to assess AI system impacts on individuals, groups, and society may result in unmitigated harms to fundamental rights.", category: "fundamental_rights", relatedHarm: "Rights violations, societal harm, public backlash" },
  { code: "RISK-INC-001", statement: "Ineffective incident response may allow AI-related harms to escalate and prevent timely remediation.", category: "operational", relatedHarm: "Prolonged harm, regulatory escalation, reputational crisis" },
  { code: "RISK-MON-001", statement: "Lack of post-deployment monitoring may allow performance degradation, drift, and emerging risks to go undetected.", category: "operational", relatedHarm: "Silent failures, accumulating harm, compliance gaps" },
  { code: "RISK-GPAI-001", statement: "General-purpose AI models with systemic risk capabilities may cause widespread harm if not properly evaluated and mitigated.", category: "systemic", relatedHarm: "Large-scale societal impact, systemic failures" },
  { code: "RISK-ACCT-001", statement: "Unclear accountability and lack of redress mechanisms may leave affected parties without remedy for AI-related harms.", category: "accountability", relatedHarm: "Unaddressed grievances, loss of stakeholder trust" },
  { code: "RISK-QMS-001", statement: "Absence of a quality management system may result in inconsistent AI development practices and compliance failures.", category: "compliance", relatedHarm: "Product defects, regulatory rejection, market withdrawal" },
];

type ControlDef = {
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

const controls: ControlDef[] = [
  {
    code: "CTRL-GOV-001",
    title: "AI Governance Policy Framework",
    description: "Establish, approve, communicate, and maintain AI governance policies integrating trustworthy AI characteristics across organizational processes.",
    controlType: "directive",
    frequency: "annual",
    ownerRole: "Chief AI Officer / CRO",
    cosoIcfComponent: "Control Environment",
    cosoIcfPrinciple: "Principle 3 - Establishes structures, reporting lines, authorities and responsibilities",
    riskCodes: ["RISK-GOV-001", "RISK-LEGAL-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-1.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-1.5", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-2.2", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "5.2", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.2.2", coverage: "full" },
      { framework: "OECD-AI", clauseId: "Principle-5.1", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Policy document", description: "Approved AI governance policy with version history", retentionPeriod: "7 years", collectionMethod: "Document management system" },
      { evidenceType: "Communication record", description: "Evidence of policy dissemination to AI actors", retentionPeriod: "3 years", collectionMethod: "Training/LMS records" },
    ],
    procedure: {
      steps: "1. Draft AI policy aligned with organizational values and regulatory requirements.\n2. Review with legal, risk, and technology stakeholders.\n3. Obtain executive approval.\n4. Publish and communicate to all AI actors.\n5. Review annually or upon significant change.",
      responsibleRole: "AI Governance Lead",
      linkedPolicy: "AI Governance Policy",
    },
  },
  {
    code: "CTRL-GOV-002",
    title: "AI Risk Appetite and Tolerance Framework",
    description: "Define, document, and apply AI risk appetite statements and risk scoring scales to prioritize risk management activities.",
    controlType: "directive",
    frequency: "annual",
    ownerRole: "Chief Risk Officer",
    cosoIcfComponent: "Risk Assessment",
    cosoIcfPrinciple: "Principle 7 - Identifies and assesses changes that could impact internal control",
    riskCodes: ["RISK-GOV-002"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-1.3", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-3.2", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "6.1.2", coverage: "full" },
      { framework: "COSO-ERM", clauseId: "Comp2-Principle7", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Risk appetite statement", description: "Board-approved AI risk appetite document", retentionPeriod: "7 years", collectionMethod: "GRC platform" },
      { evidenceType: "Risk register", description: "AI risk register with scored and prioritized risks", retentionPeriod: "5 years", collectionMethod: "Risk management system" },
    ],
    procedure: {
      steps: "1. Define risk scales (impact x likelihood).\n2. Set risk appetite thresholds by AI system category.\n3. Map all AI systems to risk levels.\n4. Review quarterly with risk committee.",
      responsibleRole: "Enterprise Risk Manager",
    },
  },
  {
    code: "CTRL-RM-001",
    title: "AI Risk Management System",
    description: "Establish and maintain a continuous, iterative risk management process throughout the AI system lifecycle including identification, assessment, treatment, and monitoring.",
    controlType: "preventive",
    frequency: "continuous",
    ownerRole: "AI Risk Manager",
    cosoIcfComponent: "Risk Assessment",
    cosoIcfPrinciple: "Principle 10 - Identifies risk",
    riskCodes: ["RISK-GOV-001", "RISK-SAFE-001", "RISK-IMPACT-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-2.1", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-1.1", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-1.5", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-3.1", coverage: "partial" },
      { framework: "EU-AIA", clauseId: "Art-9", coverage: "full" },
      { framework: "ISO-42001", clauseId: "6.1.3", coverage: "full" },
      { framework: "COSO-ERM", clauseId: "Comp3-Principle13", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Risk management plan", description: "Documented AI risk management process and lifecycle integration", retentionPeriod: "Life of system + 5 years", collectionMethod: "AIMS documentation" },
      { evidenceType: "Risk assessment reports", description: "Completed risk assessments at each lifecycle stage", retentionPeriod: "Life of system + 5 years", collectionMethod: "GRC platform" },
    ],
    procedure: {
      steps: "1. Identify risks at design, development, deployment, and operation stages.\n2. Assess likelihood and impact.\n3. Define and implement treatment measures.\n4. Monitor residual risks continuously.\n5. Update risk register upon changes.",
      responsibleRole: "AI Risk Manager",
    },
  },
  {
    code: "CTRL-DATA-001",
    title: "AI Data Governance and Quality Management",
    description: "Implement data governance practices ensuring training, validation, and testing datasets meet quality, representativeness, and bias mitigation criteria.",
    controlType: "preventive",
    frequency: "continuous",
    ownerRole: "Data Governance Lead",
    cosoIcfComponent: "Control Activities",
    cosoIcfPrinciple: "Principle 11 - Selects and develops control activities",
    riskCodes: ["RISK-DATA-001", "RISK-BIAS-001", "RISK-PRIV-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.6", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-1.1", coverage: "partial" },
      { framework: "EU-AIA", clauseId: "Art-10", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.7.4", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.7.5", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Data quality report", description: "Dataset quality metrics and bias analysis results", retentionPeriod: "Life of model + 5 years", collectionMethod: "ML pipeline artifacts" },
      { evidenceType: "Data governance policy", description: "Approved data governance procedures for AI", retentionPeriod: "7 years", collectionMethod: "Policy repository" },
    ],
    procedure: {
      steps: "1. Define data quality criteria for each AI use case.\n2. Validate datasets for completeness, representativeness, and errors.\n3. Conduct bias examinations.\n4. Document data provenance.\n5. Implement data lineage tracking.",
      responsibleRole: "Data Steward",
    },
  },
  {
    code: "CTRL-TEST-001",
    title: "AI System Verification, Validation, and Testing",
    description: "Test AI systems against defined requirements including accuracy, robustness, cybersecurity, and bias before deployment and after material changes.",
    controlType: "detective",
    frequency: "ad_hoc",
    ownerRole: "AI Quality Assurance Lead",
    cosoIcfComponent: "Control Activities",
    cosoIcfPrinciple: "Principle 10 - Selects and develops general controls over technology",
    riskCodes: ["RISK-ROB-001", "RISK-BIAS-001", "RISK-SEC-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.1", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-3.1", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.11", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.3", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.4", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.5", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.7", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.8", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.9", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-1.3", coverage: "partial" },
      { framework: "EU-AIA", clauseId: "Art-15", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.6.2.4", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Test results", description: "Validation and testing reports with pass/fail criteria", retentionPeriod: "Life of system + 5 years", collectionMethod: "Test management system" },
      { evidenceType: "Adversarial testing report", description: "Red team and adversarial test results for GPAI", retentionPeriod: "5 years", collectionMethod: "Security testing platform" },
    ],
    procedure: {
      steps: "1. Define test plans aligned with requirements.\n2. Execute functional, performance, bias, and security tests.\n3. Document results and remediation.\n4. Obtain sign-off before deployment.\n5. Re-test after material changes.",
      responsibleRole: "QA Engineer",
    },
  },
  {
    code: "CTRL-DOC-001",
    title: "AI Technical Documentation Management",
    description: "Create, maintain, and update technical documentation demonstrating compliance with applicable requirements throughout the AI system lifecycle.",
    controlType: "directive",
    frequency: "continuous",
    ownerRole: "AI System Owner",
    cosoIcfComponent: "Information and Communication",
    cosoIcfPrinciple: "Principle 13 - Uses relevant information",
    riskCodes: ["RISK-DOC-001", "RISK-TRANS-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-1.4", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-2.1", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-2.3", coverage: "partial" },
      { framework: "EU-AIA", clauseId: "Art-11", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.6.2.7", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-53", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Technical documentation", description: "Complete technical file per Annex IV/XI requirements", retentionPeriod: "10 years", collectionMethod: "Document management system" },
      { evidenceType: "Model card", description: "Model card or system datasheet with capabilities and limitations", retentionPeriod: "Life of system + 5 years", collectionMethod: "ML registry" },
    ],
    procedure: {
      steps: "1. Create documentation before market placement.\n2. Include system description, training data, metrics, and limitations.\n3. Update upon material changes.\n4. Review for completeness quarterly.\n5. Make available to authorities upon request.",
      responsibleRole: "Technical Documentation Lead",
    },
  },
  {
    code: "CTRL-LOG-001",
    title: "AI Event Logging and Record-Keeping",
    description: "Implement automatic logging capabilities enabling traceability of AI system operations, decisions, and modifications over the system lifetime.",
    controlType: "detective",
    frequency: "continuous",
    ownerRole: "AI Operations Lead",
    cosoIcfComponent: "Monitoring Activities",
    cosoIcfPrinciple: "Principle 17 - Evaluates and communicates deficiencies",
    riskCodes: ["RISK-LOG-001", "RISK-MON-001"],
    requirementLinks: [
      { framework: "EU-AIA", clauseId: "Art-12", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.6.2.8", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Log configuration", description: "Logging architecture and retention configuration", retentionPeriod: "Life of system", collectionMethod: "Infrastructure documentation" },
      { evidenceType: "Audit logs", description: "Sample audit log exports demonstrating traceability", retentionPeriod: "Per regulatory minimum", collectionMethod: "Log management platform" },
    ],
    procedure: {
      steps: "1. Define log events for inputs, outputs, and modifications.\n2. Implement automatic logging in production.\n3. Configure retention per regulatory requirements.\n4. Test log completeness periodically.\n5. Enable log access for incident investigation.",
      responsibleRole: "DevOps Engineer",
    },
  },
  {
    code: "CTRL-TRANS-001",
    title: "AI Transparency and User Information",
    description: "Provide deployers and users with sufficient information to interpret AI system outputs and use systems appropriately, including instructions for use.",
    controlType: "directive",
    frequency: "continuous",
    ownerRole: "Product Owner",
    cosoIcfComponent: "Information and Communication",
    cosoIcfPrinciple: "Principle 15 - Communicates externally",
    riskCodes: ["RISK-TRANS-001", "RISK-OVER-001"],
    requirementLinks: [
      { framework: "EU-AIA", clauseId: "Art-13", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-50", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-52", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "A.8.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-2.2", coverage: "full" },
      { framework: "OECD-AI", clauseId: "Principle-3.1", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Instructions for use", description: "User-facing documentation with capabilities and limitations", retentionPeriod: "Life of system + 3 years", collectionMethod: "Product documentation" },
      { evidenceType: "Transparency assessment", description: "Assessment of transparency adequacy for intended users", retentionPeriod: "3 years", collectionMethod: "Compliance review records" },
    ],
    procedure: {
      steps: "1. Draft instructions for use covering intended purpose and limitations.\n2. Include performance metrics and known failure modes.\n3. Review with legal and UX teams.\n4. Publish with system deployment.\n5. Update upon material changes.",
      responsibleRole: "Product Manager",
    },
  },
  {
    code: "CTRL-OVER-001",
    title: "Human Oversight Mechanisms",
    description: "Design and implement human-machine interface tools enabling effective human oversight during AI system operation including override and shutdown capabilities.",
    controlType: "preventive",
    frequency: "continuous",
    ownerRole: "AI System Owner",
    cosoIcfComponent: "Control Activities",
    cosoIcfPrinciple: "Principle 12 - Deploys through policies and procedures",
    riskCodes: ["RISK-OVER-001", "RISK-SAFE-001"],
    requirementLinks: [
      { framework: "EU-AIA", clauseId: "Art-14", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-2.3", coverage: "full" },
      { framework: "OECD-AI", clauseId: "Principle-2.3", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.9.2", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "HMI design specification", description: "Human oversight interface design and override mechanisms", retentionPeriod: "Life of system + 5 years", collectionMethod: "Design documentation" },
      { evidenceType: "Oversight training records", description: "Training for personnel assigned human oversight roles", retentionPeriod: "3 years", collectionMethod: "LMS records" },
    ],
    procedure: {
      steps: "1. Identify oversight requirements by risk level.\n2. Design HMI with override and shutdown.\n3. Assign trained oversight personnel.\n4. Test override mechanisms.\n5. Monitor oversight effectiveness.",
      responsibleRole: "Human Factors Engineer",
    },
  },
  {
    code: "CTRL-IMPACT-001",
    title: "AI Impact Assessment Process",
    description: "Conduct and document impact assessments evaluating effects on individuals, groups, fundamental rights, and society before deployment.",
    controlType: "preventive",
    frequency: "ad_hoc",
    ownerRole: "Responsible AI Lead",
    cosoIcfComponent: "Risk Assessment",
    cosoIcfPrinciple: "Principle 7 - Identifies and assesses changes",
    riskCodes: ["RISK-IMPACT-001", "RISK-BIAS-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MAP-1.6", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-4.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-2.4", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-1.1", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.2", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "A.5.2", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.5.4", coverage: "full" },
      { framework: "ISO-42001", clauseId: "6.1.4", coverage: "partial" },
      { framework: "EU-AIA", clauseId: "Art-27", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Impact assessment report", description: "Completed FRIA or AI impact assessment", retentionPeriod: "7 years", collectionMethod: "GRC platform" },
      { evidenceType: "Stakeholder consultation record", description: "Records of stakeholder engagement during assessment", retentionPeriod: "5 years", collectionMethod: "Meeting minutes" },
    ],
    procedure: {
      steps: "1. Trigger assessment before high-risk deployment.\n2. Identify affected individuals and groups.\n3. Evaluate fundamental rights impacts.\n4. Document findings and mitigations.\n5. Notify authorities if required.",
      responsibleRole: "Impact Assessment Lead",
    },
  },
  {
    code: "CTRL-INC-001",
    title: "AI Incident Response and Communication",
    description: "Establish incident response procedures for AI-related harms including detection, containment, notification, and remediation.",
    controlType: "corrective",
    frequency: "ad_hoc",
    ownerRole: "Incident Response Manager",
    cosoIcfComponent: "Monitoring Activities",
    cosoIcfPrinciple: "Principle 16 - Conducts ongoing and/or separate evaluations",
    riskCodes: ["RISK-INC-001", "RISK-ACCT-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-3.1", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.8.4", coverage: "full" },
      { framework: "OECD-AI", clauseId: "Principle-5.3", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Incident response plan", description: "AI-specific incident response procedures", retentionPeriod: "7 years", collectionMethod: "Policy repository" },
      { evidenceType: "Incident reports", description: "Documented AI incidents and remediation actions", retentionPeriod: "7 years", collectionMethod: "Incident management system" },
    ],
    procedure: {
      steps: "1. Detect and classify AI incidents.\n2. Contain and assess severity.\n3. Notify affected parties and authorities.\n4. Investigate root cause.\n5. Implement corrective actions and lessons learned.",
      responsibleRole: "Incident Commander",
    },
  },
  {
    code: "CTRL-MON-001",
    title: "Post-Deployment AI Monitoring",
    description: "Monitor AI system performance, drift, and emerging risks after deployment through defined post-market monitoring plans.",
    controlType: "detective",
    frequency: "continuous",
    ownerRole: "AI Operations Lead",
    cosoIcfComponent: "Monitoring Activities",
    cosoIcfPrinciple: "Principle 17 - Evaluates and communicates deficiencies",
    riskCodes: ["RISK-MON-001", "RISK-ROB-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-2.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-3.2", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-4.1", coverage: "partial" },
      { framework: "EU-AIA", clauseId: "Art-72", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.6.2.6", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Monitoring plan", description: "Post-market monitoring plan with metrics and thresholds", retentionPeriod: "Life of system + 5 years", collectionMethod: "AIMS documentation" },
      { evidenceType: "Performance dashboards", description: "Operational monitoring dashboards and alert logs", retentionPeriod: "2 years", collectionMethod: "Monitoring platform" },
    ],
    procedure: {
      steps: "1. Define monitoring metrics and thresholds.\n2. Implement automated monitoring.\n3. Review performance reports regularly.\n4. Investigate anomalies and drift.\n5. Update system or retrain as needed.",
      responsibleRole: "MLOps Engineer",
    },
  },
  {
    code: "CTRL-QMS-001",
    title: "AI Quality Management System",
    description: "Maintain a documented quality management system ensuring consistent compliance with AI regulatory and organizational requirements.",
    controlType: "directive",
    frequency: "continuous",
    ownerRole: "Quality Manager",
    cosoIcfComponent: "Control Environment",
    cosoIcfPrinciple: "Principle 2 - Exercises oversight responsibility",
    riskCodes: ["RISK-QMS-001", "RISK-LEGAL-001"],
    requirementLinks: [
      { framework: "EU-AIA", clauseId: "Art-17", coverage: "full" },
      { framework: "ISO-42001", clauseId: "5.1", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-4.1", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-4.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-4.3", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-1.2", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.13", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-4.2", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-4.3", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "9.1", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "10.1", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "QMS documentation", description: "Quality management system policies and procedures", retentionPeriod: "7 years", collectionMethod: "QMS platform" },
      { evidenceType: "Internal audit reports", description: "QMS internal audit findings and corrective actions", retentionPeriod: "5 years", collectionMethod: "Audit management system" },
    ],
    procedure: {
      steps: "1. Document QMS scope and processes.\n2. Define compliance criteria.\n3. Conduct internal audits.\n4. Manage non-conformities.\n5. Report to management for review.",
      responsibleRole: "Quality Manager",
    },
  },
  {
    code: "CTRL-3RD-001",
    title: "Third-Party AI Risk Management",
    description: "Assess and manage risks from third-party AI components, models, and services throughout the supply chain.",
    controlType: "preventive",
    frequency: "quarterly",
    ownerRole: "Vendor Risk Manager",
    cosoIcfComponent: "Control Activities",
    cosoIcfPrinciple: "Principle 11 - Selects and develops control activities",
    riskCodes: ["RISK-3RD-001", "RISK-SEC-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-6.1", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-3.1", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-6.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-3.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-4.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-5.2", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "A.10.3", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-5.1", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Vendor assessment", description: "Third-party AI vendor risk assessments", retentionPeriod: "5 years", collectionMethod: "Vendor management system" },
      { evidenceType: "Contract clauses", description: "AI-specific contractual requirements with vendors", retentionPeriod: "Life of contract + 7 years", collectionMethod: "Contract repository" },
    ],
    procedure: {
      steps: "1. Inventory third-party AI components.\n2. Assess vendor AI governance maturity.\n3. Include AI requirements in contracts.\n4. Monitor vendor compliance.\n5. Plan contingency for vendor failures.",
      responsibleRole: "Vendor Risk Manager",
    },
  },
  {
    code: "CTRL-GPAI-001",
    title: "General-Purpose AI Model Evaluation",
    description: "Evaluate GPAI models including systemic risk assessment, adversarial testing, and documentation per applicable GPAI obligations.",
    controlType: "detective",
    frequency: "ad_hoc",
    ownerRole: "GPAI Model Owner",
    cosoIcfComponent: "Risk Assessment",
    cosoIcfPrinciple: "Principle 15 - Assesses risk at the entity level",
    riskCodes: ["RISK-GPAI-001", "RISK-SEC-001"],
    requirementLinks: [
      { framework: "EU-AIA", clauseId: "Art-51", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-55", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-53", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Model evaluation report", description: "Standardized model evaluation per state-of-the-art protocols", retentionPeriod: "5 years", collectionMethod: "Model registry" },
      { evidenceType: "Adversarial testing results", description: "Documented adversarial testing of GPAI models", retentionPeriod: "5 years", collectionMethod: "Security testing platform" },
    ],
    procedure: {
      steps: "1. Classify GPAI model systemic risk status.\n2. Conduct model evaluation per Annex XI.\n3. Perform adversarial testing for systemic risk models.\n4. Document and publish model information.\n5. Report serious incidents to authorities.",
      responsibleRole: "GPAI Compliance Lead",
    },
  },
  {
    code: "CTRL-CLASS-001",
    title: "High-Risk AI Classification and Scoping",
    description: "Classify AI systems against regulatory criteria (EU Annex III, organizational risk taxonomy) and document classification rationale before development or deployment.",
    controlType: "directive",
    frequency: "ad_hoc",
    ownerRole: "AI Compliance Lead",
    cosoIcfComponent: "Risk Assessment",
    cosoIcfPrinciple: "Principle 10 - Identifies and assesses risk",
    riskCodes: ["RISK-LEGAL-001", "RISK-GOV-001"],
    requirementLinks: [
      { framework: "EU-AIA", clauseId: "Art-6", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-8", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-4.1", coverage: "full" },
      { framework: "ISO-42001", clauseId: "6.1.2", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Classification record", description: "Documented high-risk classification decision per AI system", retentionPeriod: "Life of system + 7 years", collectionMethod: "GRC platform" },
    ],
    procedure: {
      steps: "1. Inventory AI systems.\n2. Assess against Annex III and internal criteria.\n3. Document classification and rationale.\n4. Review with legal.\n5. Re-classify upon material change.",
      responsibleRole: "AI Compliance Lead",
    },
  },
  {
    code: "CTRL-CONFORM-001",
    title: "Conformity Assessment and EU Declaration",
    description: "Conduct conformity assessment procedures and maintain EU declaration of conformity and CE marking for applicable high-risk AI systems.",
    controlType: "preventive",
    frequency: "ad_hoc",
    ownerRole: "Quality Manager",
    riskCodes: ["RISK-LEGAL-001", "RISK-QMS-001"],
    requirementLinks: [
      { framework: "EU-AIA", clauseId: "Art-43", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-47", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-48", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-16", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "A.6.2.4", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "EU declaration of conformity", description: "Signed declaration per Art. 48", retentionPeriod: "10 years", collectionMethod: "QMS repository" },
      { evidenceType: "Conformity assessment report", description: "Third-party or internal conformity assessment results", retentionPeriod: "10 years", collectionMethod: "Compliance records" },
    ],
    procedure: {
      steps: "1. Determine applicable conformity procedure.\n2. Execute assessment against Chapter III requirements.\n3. Draw up EU declaration of conformity.\n4. Affix CE marking.\n5. Maintain documentation for authority requests.",
      responsibleRole: "Quality Manager",
    },
  },
  {
    code: "CTRL-DEPLOY-001",
    title: "Deployer Obligations Management",
    description: "Ensure deployers of high-risk AI systems implement technical and organisational measures including human oversight, input data quality, and logging.",
    controlType: "preventive",
    frequency: "continuous",
    ownerRole: "AI System Owner",
    riskCodes: ["RISK-OVER-001", "RISK-DATA-001", "RISK-LEGAL-001"],
    requirementLinks: [
      { framework: "EU-AIA", clauseId: "Art-26", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-3.5", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-3.3", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "A.9.2", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Deployer checklist", description: "Completed deployer obligations checklist per system", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
    ],
    procedure: {
      steps: "1. Assign human oversight personnel.\n2. Validate input data relevance.\n3. Follow instructions for use.\n4. Maintain deployer logs.\n5. Conduct FRIA where required.",
      responsibleRole: "Deployer System Owner",
    },
  },
  {
    code: "CTRL-REG-001",
    title: "EU AI System Registration",
    description: "Register high-risk AI systems in the EU database before market placement and maintain registration data accuracy.",
    controlType: "directive",
    frequency: "ad_hoc",
    ownerRole: "Regulatory Affairs Lead",
    riskCodes: ["RISK-LEGAL-001", "RISK-DOC-001"],
    requirementLinks: [
      { framework: "EU-AIA", clauseId: "Art-49", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-71", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "A.6.2.7", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Registration confirmation", description: "EU database registration receipt and entry", retentionPeriod: "10 years", collectionMethod: "Regulatory records" },
    ],
    procedure: {
      steps: "1. Prepare registration data from technical documentation.\n2. Submit to EU database before market placement.\n3. Verify registration accuracy.\n4. Update upon material changes.",
      responsibleRole: "Regulatory Affairs Lead",
    },
  },
  {
    code: "CTRL-INC-REPORT-001",
    title: "Serious Incident Reporting",
    description: "Report serious AI incidents to market surveillance authorities within required timeframes and communicate to affected parties.",
    controlType: "corrective",
    frequency: "ad_hoc",
    ownerRole: "Incident Response Manager",
    riskCodes: ["RISK-INC-001", "RISK-LEGAL-001", "RISK-ACCT-001"],
    requirementLinks: [
      { framework: "EU-AIA", clauseId: "Art-73", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-4.3", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-20", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "A.8.4", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Incident report", description: "Serious incident report submitted to authority", retentionPeriod: "7 years", collectionMethod: "Incident management system" },
    ],
    procedure: {
      steps: "1. Detect and classify serious incident.\n2. Contain immediate harm.\n3. Report to authority within required timeframe.\n4. Notify affected parties.\n5. Document root cause and remediation.",
      responsibleRole: "Incident Commander",
    },
  },
  {
    code: "CTRL-DECOM-001",
    title: "AI System Decommissioning",
    description: "Define and execute decommissioning and phase-out procedures for AI systems including data retention, model retirement, and stakeholder notification.",
    controlType: "corrective",
    frequency: "ad_hoc",
    ownerRole: "AI System Owner",
    riskCodes: ["RISK-GOV-001", "RISK-DATA-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-1.7", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-20", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "A.6.2.5", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "8.2", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Decommission plan", description: "Approved decommissioning plan with timeline and data handling", retentionPeriod: "7 years", collectionMethod: "AIMS documentation" },
    ],
    procedure: {
      steps: "1. Trigger decommission assessment.\n2. Plan data/model retirement.\n3. Notify stakeholders.\n4. Execute phase-out.\n5. Archive documentation.",
      responsibleRole: "AI System Owner",
    },
  },
  {
    code: "CTRL-TRAIN-001",
    title: "AI Workforce Competency and Training",
    description: "Ensure AI actors possess required competencies through training, certification, and interdisciplinary team composition.",
    controlType: "directive",
    frequency: "annual",
    ownerRole: "Chief Learning Officer",
    cosoIcfComponent: "Control Environment",
    cosoIcfPrinciple: "Principle 5 - Attracts, develops, and retains capable individuals",
    riskCodes: ["RISK-GOV-001", "RISK-OVER-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MAP-1.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-5.1", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-3.4", coverage: "full" },
      { framework: "ISO-42001", clauseId: "7.2", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.4.6", coverage: "full" },
      { framework: "COSO-ERM", clauseId: "Comp1-Principle5", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Training records", description: "AI competency training completion records", retentionPeriod: "3 years", collectionMethod: "LMS" },
    ],
    procedure: {
      steps: "1. Define competency requirements by role.\n2. Deliver training programs.\n3. Assess proficiency.\n4. Maintain interdisciplinary teams.\n5. Refresh annually.",
      responsibleRole: "Learning & Development Lead",
    },
  },
  {
    code: "CTRL-RISK-PRI-001",
    title: "AI Risk Prioritization and Treatment",
    description: "Prioritize documented AI risks by impact and likelihood, implement treatment for high-priority risks, and document residual risk acceptance.",
    controlType: "preventive",
    frequency: "quarterly",
    ownerRole: "AI Risk Manager",
    riskCodes: ["RISK-GOV-002", "RISK-SAFE-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-1.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-1.3", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MANAGE-1.4", coverage: "full" },
      { framework: "ISO-42001", clauseId: "6.1.3", coverage: "full" },
      { framework: "COSO-ERM", clauseId: "Comp3-Principle14", coverage: "full" },
    ],
    evidence: [
      { evidenceType: "Prioritized risk register", description: "Risk register with treatment status and residual risk", retentionPeriod: "5 years", collectionMethod: "GRC platform" },
    ],
    procedure: {
      steps: "1. Score risks from Map function.\n2. Prioritize by impact/likelihood.\n3. Define treatment plans.\n4. Document residual risks.\n5. Obtain acceptance for residual exposure.",
      responsibleRole: "AI Risk Manager",
    },
  },
  {
    code: "CTRL-FEEDBACK-001",
    title: "End-User and Community Feedback",
    description: "Establish feedback channels for end users and impacted communities to report problems, appeal decisions, and incorporate adjudicated outcomes.",
    controlType: "detective",
    frequency: "continuous",
    ownerRole: "Product Owner",
    riskCodes: ["RISK-ACCT-001", "RISK-BIAS-001", "RISK-IMPACT-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-3.3", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-5.2", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-4.1", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "A.8.3", coverage: "full" },
      { framework: "OECD-AI", clauseId: "Principle-5.3", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Feedback log", description: "Record of user/community feedback and resolutions", retentionPeriod: "3 years", collectionMethod: "Support/feedback system" },
    ],
    procedure: {
      steps: "1. Publish feedback channels.\n2. Triage reported issues.\n3. Investigate and remediate.\n4. Incorporate adjudicated feedback into system updates.\n5. Report trends to governance.",
      responsibleRole: "Customer Experience Lead",
    },
  },
  {
    code: "CTRL-PRIV-001",
    title: "AI Privacy Risk Assessment",
    description: "Examine privacy risks of AI systems including data minimization, purpose limitation, and privacy-preserving techniques.",
    controlType: "preventive",
    frequency: "ad_hoc",
    ownerRole: "Privacy Officer",
    riskCodes: ["RISK-PRIV-001", "RISK-DATA-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.10", coverage: "full" },
      { framework: "EU-AIA", clauseId: "Art-10", coverage: "partial" },
      { framework: "ISO-42001", clauseId: "A.7.4", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Privacy impact assessment", description: "AI-specific privacy risk assessment", retentionPeriod: "5 years", collectionMethod: "Privacy office records" },
    ],
    procedure: {
      steps: "1. Map data flows.\n2. Assess privacy risks.\n3. Apply mitigations.\n4. Document DPIA where required.\n5. Review before deployment.",
      responsibleRole: "Privacy Officer",
    },
  },
  {
    code: "CTRL-ENV-001",
    title: "AI Environmental Impact Assessment",
    description: "Measure and manage environmental impact and sustainability of AI model training and management activities.",
    controlType: "detective",
    frequency: "annual",
    ownerRole: "Sustainability Lead",
    riskCodes: ["RISK-ENV-001", "RISK-IMPACT-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MEASURE-2.12", coverage: "full" },
      { framework: "OECD-AI", clauseId: "Principle-1.2", coverage: "full" },
      { framework: "ISO-42001", clauseId: "A.5.5", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Carbon/energy report", description: "Training and inference energy consumption metrics", retentionPeriod: "3 years", collectionMethod: "Sustainability reporting" },
    ],
    procedure: {
      steps: "1. Measure compute energy for training/inference.\n2. Document environmental footprint.\n3. Identify reduction opportunities.\n4. Report to stakeholders.\n5. Set improvement targets.",
      responsibleRole: "Sustainability Lead",
    },
  },
  {
    code: "CTRL-LEGAL-001",
    title: "Legal and Regulatory Requirements Mapping",
    description: "Identify and maintain mapping of applicable legal and regulatory requirements to AI systems and organizational processes.",
    controlType: "directive",
    frequency: "quarterly",
    ownerRole: "Legal Counsel",
    riskCodes: ["RISK-LEGAL-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "MAP-4.1", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-1.3", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "MAP-1.4", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-1.1", coverage: "full" },
      { framework: "ISO-42001", clauseId: "4.1", coverage: "full" },
      { framework: "ISO-42001", clauseId: "4.2", coverage: "partial" },
      { framework: "EU-AIA", clauseId: "Art-25", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Legal requirements register", description: "Register of applicable AI laws and regulations by jurisdiction", retentionPeriod: "7 years", collectionMethod: "Legal repository" },
    ],
    procedure: {
      steps: "1. Monitor regulatory changes.\n2. Map requirements to AI systems.\n3. Gap assess compliance.\n4. Update policies.\n5. Brief governance committee quarterly.",
      responsibleRole: "Legal Counsel",
    },
  },
  {
    code: "CTRL-ACCT-001",
    title: "AI Accountability and Redress",
    description: "Establish accountability structures, executive responsibility for AI decisions, and redress mechanisms for affected parties.",
    controlType: "directive",
    frequency: "annual",
    ownerRole: "Chief AI Officer",
    riskCodes: ["RISK-ACCT-001", "RISK-GOV-001"],
    requirementLinks: [
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-2.3", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-2.1", coverage: "full" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-1.6", coverage: "partial" },
      { framework: "NIST-AI-RMF", clauseId: "GOVERN-3.2", coverage: "partial" },
      { framework: "OECD-AI", clauseId: "Principle-5.3", coverage: "full" },
      { framework: "COSO-ERM", clauseId: "Comp1-Principle2", coverage: "partial" },
      { framework: "EU-AIA", clauseId: "Art-21", coverage: "partial" },
    ],
    evidence: [
      { evidenceType: "Accountability matrix", description: "RACI matrix for AI governance roles", retentionPeriod: "3 years", collectionMethod: "Governance repository" },
      { evidenceType: "Redress procedure", description: "Documented appeal and redress process", retentionPeriod: "7 years", collectionMethod: "Policy repository" },
    ],
    procedure: {
      steps: "1. Define accountability structures.\n2. Assign executive responsibility.\n3. Publish redress mechanisms.\n4. Track and resolve appeals.\n5. Report to board annually.",
      responsibleRole: "Chief AI Officer",
    },
  },
];

type ReqLink = { framework: string; clauseId: string; coverage: CoverageLevel };

function dedupeLinks(links: ReqLink[]): ReqLink[] {
  const seen = new Map<string, ReqLink>();
  for (const link of links) {
    const key = `${link.framework}::${link.clauseId}`;
    const existing = seen.get(key);
    if (!existing || (link.coverage === "full" && existing.coverage !== "full")) {
      seen.set(key, link);
    }
  }
  return [...seen.values()];
}

const DETECTIVE_SAMPLING =
  "\nSAMPLING METHODOLOGY: For operating effectiveness testing, define population = all control occurrences in the period. Select minimum 25 items (100% if population ≤25) for continuous controls; test all events for ad_hoc triggers. Document selection method, results, exceptions, and extrapolation to population.";

function buildAllControls(): ControlDef[] {
  const merged = [...controls, ...additionalControls as ControlDef[]];
  const upgradeMap = new Map<string, CoverageLevel>();
  for (const u of coverageUpgrades) {
    upgradeMap.set(`${u.control}::${u.framework}::${u.clauseId}`, u.coverage);
  }

  return merged.map((ctrl) => {
    const supplements = requirementSupplements[ctrl.code] ?? [];
    const annexLinks = isoAnnexSupplements[ctrl.code] ?? [];
    const oecdLinks = oecdFullCoverage
      .filter((l) => l.control === ctrl.code)
      .map(({ framework, clauseId, coverage }) => ({ framework, clauseId, coverage }));
    const cosoLinks = cosoFullCoverage
      .filter((l) => l.control === ctrl.code)
      .map(({ framework, clauseId, coverage }) => ({ framework, clauseId, coverage }));
    const upgradeLinks = coverageUpgrades
      .filter((u) => u.control === ctrl.code)
      .map(({ framework, clauseId, coverage }) => ({ framework, clauseId, coverage }));

    const ops = operatingStandards[ctrl.code];
    const baseLinks = ctrl.requirementLinks.map((link) => {
      const key = `${ctrl.code}::${link.framework}::${link.clauseId}`;
      const upgraded = upgradeMap.get(key);
      return upgraded ? { ...link, coverage: upgraded } : link;
    });

    const procedure = ops?.procedure ?? ctrl.procedure;
    const withSampling =
      ctrl.controlType === "detective" && !procedure.steps.includes("SAMPLING METHODOLOGY")
        ? { ...procedure, steps: procedure.steps + DETECTIVE_SAMPLING }
        : procedure;

    return {
      ...ctrl,
      requirementLinks: dedupeLinks([
        ...baseLinks,
        ...supplements,
        ...annexLinks,
        ...oecdLinks,
        ...cosoLinks,
        ...upgradeLinks,
      ]),
      evidence: ops?.evidence ?? ctrl.evidence,
      procedure: withSampling,
    };
  });
}

async function getRequirementId(frameworkCode: string, clauseId: string) {
  const req = await prisma.frameworkRequirement.findFirst({
    where: { clauseId, framework: { code: frameworkCode } },
  });
  if (!req) return null;
  return req.id;
}

async function main() {
  const allRisks = [...risks, ...additionalRisks];
  const allControls = buildAllControls();

  console.log("Seeding risk statements...");
  const riskMap = new Map<string, string>();

  for (const risk of allRisks) {
    const r = await prisma.riskStatement.upsert({
      where: { code: risk.code },
      create: {
        code: risk.code,
        statement: risk.statement,
        category: risk.category,
        relatedHarm: risk.relatedHarm,
        verificationStatus: VerificationStatus.verified,
      },
      update: {
        statement: risk.statement,
        category: risk.category,
        relatedHarm: risk.relatedHarm,
      },
    });
    riskMap.set(risk.code, r.id);
  }
  console.log(`  ✓ ${allRisks.length} risk statements`);

  console.log("Seeding canonical controls...");
  for (const ctrl of allControls) {
    const control = await prisma.canonicalControl.upsert({
      where: { code: ctrl.code },
      create: {
        code: ctrl.code,
        title: ctrl.title,
        description: ctrl.description,
        controlType: ctrl.controlType,
        frequency: ctrl.frequency,
        ownerRole: ctrl.ownerRole,
        cosoIcfComponent: ctrl.cosoIcfComponent,
        cosoIcfPrinciple: ctrl.cosoIcfPrinciple,
        verificationStatus: VerificationStatus.verified,
      },
      update: {
        title: ctrl.title,
        description: ctrl.description,
        controlType: ctrl.controlType,
        frequency: ctrl.frequency,
        ownerRole: ctrl.ownerRole,
        cosoIcfComponent: ctrl.cosoIcfComponent,
        cosoIcfPrinciple: ctrl.cosoIcfPrinciple,
      },
    });

    for (const ev of ctrl.evidence) {
      const existing = await prisma.evidence.findFirst({
        where: { controlId: control.id, evidenceType: ev.evidenceType },
      });
      if (existing) {
        await prisma.evidence.update({
          where: { id: existing.id },
          data: ev,
        });
      } else {
        await prisma.evidence.create({
          data: { controlId: control.id, ...ev },
        });
      }
    }

    const existingProc = await prisma.procedure.findFirst({
      where: { controlId: control.id },
    });
    if (existingProc) {
      await prisma.procedure.update({
        where: { id: existingProc.id },
        data: ctrl.procedure,
      });
    } else {
      await prisma.procedure.create({
        data: { controlId: control.id, ...ctrl.procedure },
      });
    }

    for (const riskCode of ctrl.riskCodes) {
      const riskId = riskMap.get(riskCode);
      if (riskId) {
        await prisma.controlRiskLink.upsert({
          where: { controlId_riskId: { controlId: control.id, riskId } },
          create: { controlId: control.id, riskId, coverage: "full" },
          update: {},
        });
      }
    }

    const expectedReqIds = new Set<string>();
    for (const link of ctrl.requirementLinks) {
      const reqId = await getRequirementId(link.framework, link.clauseId);
      if (reqId) {
        expectedReqIds.add(reqId);
        await prisma.controlRequirementLink.upsert({
          where: { controlId_requirementId: { controlId: control.id, requirementId: reqId } },
          create: { controlId: control.id, requirementId: reqId, coverage: link.coverage },
          update: { coverage: link.coverage },
        });

        for (const riskCode of ctrl.riskCodes) {
          const riskId = riskMap.get(riskCode);
          if (riskId) {
            await prisma.requirementRiskLink.upsert({
              where: { requirementId_riskId: { requirementId: reqId, riskId } },
              create: { requirementId: reqId, riskId, coverage: "partial" },
              update: {},
            });
          }
        }
      }
    }

    await prisma.controlRequirementLink.deleteMany({
      where: {
        controlId: control.id,
        requirementId: { notIn: [...expectedReqIds] },
      },
    });
  }
  console.log(`  ✓ ${allControls.length} canonical controls with evidence and procedures`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
