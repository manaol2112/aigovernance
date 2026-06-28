import type { MappingType, MappingConfidence } from "@prisma/client";

export type CrosswalkEntry = {
  sourceClauseId: string;
  sourceFramework: string;
  targetClauseId: string;
  targetFramework: string;
  mappingType: MappingType;
  confidence: MappingConfidence;
  rationale: string;
};

/** Maps previously unmapped NIST subcategories + new EU/ISO/OECD/COSO linkages */
export const crosswalkExpansion: CrosswalkEntry[] = [
  // ── NIST GOVERN (previously unmapped) ──
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-1.7", targetFramework: "ISO-42001", targetClauseId: "A.6.2.5", mappingType: "related", confidence: "high", rationale: "Decommissioning and phasing out aligns with controlled deployment/end-of-life planning." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-1.7", targetFramework: "EU-AIA", targetClauseId: "Art-20", mappingType: "related", confidence: "high", rationale: "Decommissioning relates to provider corrective actions and system withdrawal." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-2.3", targetFramework: "ISO-42001", targetClauseId: "5.1", mappingType: "equivalent", confidence: "high", rationale: "Executive leadership responsibility maps to top management leadership and commitment." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-2.3", targetFramework: "COSO-ERM", targetClauseId: "Comp1-Principle3", mappingType: "related", confidence: "high", rationale: "Executive decision responsibility aligns with desired culture and tone at the top." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-3.2", targetFramework: "ISO-42001", targetClauseId: "A.3.2", mappingType: "equivalent", confidence: "high", rationale: "Team role differentiation maps to AI roles and responsibilities control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-3.2", targetFramework: "EU-AIA", targetClauseId: "Art-25", mappingType: "related", confidence: "high", rationale: "Role differentiation supports value-chain responsibility allocation." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-4.2", targetFramework: "ISO-42001", targetClauseId: "A.5.3", mappingType: "equivalent", confidence: "high", rationale: "Documenting risks and impacts aligns with impact assessment documentation." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-4.2", targetFramework: "EU-AIA", targetClauseId: "Art-27", mappingType: "related", confidence: "high", rationale: "Risk documentation supports fundamental rights impact assessment." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-4.3", targetFramework: "ISO-42001", targetClauseId: "A.6.2.4", mappingType: "equivalent", confidence: "high", rationale: "Testing practices align with verification and validation control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-4.3", targetFramework: "EU-AIA", targetClauseId: "Art-9(4)", mappingType: "related", confidence: "high", rationale: "Testing for risk management measures aligns with EU risk mitigation testing." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-5.2", targetFramework: "ISO-42001", targetClauseId: "A.4.6", mappingType: "partial", confidence: "medium", rationale: "Incorporating adjudicated feedback relates to human resource and competency management." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-5.2", targetFramework: "OECD-AI", targetClauseId: "Principle-2.2", mappingType: "related", confidence: "high", rationale: "Feedback incorporation supports fairness and human-centred values." },

  // ── NIST MAP (previously unmapped) ──
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-1.2", targetFramework: "ISO-42001", targetClauseId: "A.4.6", mappingType: "equivalent", confidence: "high", rationale: "Inter-disciplinary competencies map to human resources management." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-1.2", targetFramework: "OECD-AI", targetClauseId: "Principle-5.2", mappingType: "related", confidence: "medium", rationale: "Competency mapping supports accountability and governance capacity." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-1.3", targetFramework: "ISO-42001", targetClauseId: "4.1", mappingType: "related", confidence: "high", rationale: "Mission and goals alignment maps to organizational context." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-1.3", targetFramework: "COSO-ERM", targetClauseId: "Comp2-Principle6", mappingType: "related", confidence: "high", rationale: "Mission alignment supports business objective setting." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-1.4", targetFramework: "ISO-42001", targetClauseId: "A.9.4", mappingType: "equivalent", confidence: "high", rationale: "Business value and use context maps to intended use documentation." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-1.5", targetFramework: "ISO-42001", targetClauseId: "6.1.2", mappingType: "related", confidence: "high", rationale: "Risk tolerance documentation aligns with AI risk assessment process." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-1.5", targetFramework: "COSO-ERM", targetClauseId: "Comp2-Principle7", mappingType: "equivalent", confidence: "high", rationale: "Documented risk tolerances map to COSO risk appetite definition." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-2.2", targetFramework: "ISO-42001", targetClauseId: "A.8.2", mappingType: "equivalent", confidence: "high", rationale: "Knowledge limits documentation aligns with user information control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-2.2", targetFramework: "EU-AIA", targetClauseId: "Art-13", mappingType: "related", confidence: "high", rationale: "System limitations disclosure supports EU transparency obligations." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-3.3", targetFramework: "ISO-42001", targetClauseId: "A.9.4", mappingType: "equivalent", confidence: "high", rationale: "Application scope specification maps to intended use control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-3.4", targetFramework: "ISO-42001", targetClauseId: "A.4.6", mappingType: "partial", confidence: "high", rationale: "Operator proficiency processes relate to human resource management." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-3.4", targetFramework: "EU-AIA", targetClauseId: "Art-14(4)(a)", mappingType: "related", confidence: "high", rationale: "Operator proficiency supports human oversight understanding requirements." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-3.5", targetFramework: "ISO-42001", targetClauseId: "A.9.2", mappingType: "equivalent", confidence: "high", rationale: "Human oversight process definition maps to responsible use processes." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-3.5", targetFramework: "EU-AIA", targetClauseId: "Art-14", mappingType: "equivalent", confidence: "high", rationale: "Human oversight mapping directly supports EU Art. 14." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-4.1", targetFramework: "ISO-42001", targetClauseId: "4.1", mappingType: "related", confidence: "high", rationale: "Legal risk mapping aligns with organizational context and legal requirements." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-4.1", targetFramework: "EU-AIA", targetClauseId: "Art-6", mappingType: "related", confidence: "high", rationale: "Legal risk mapping supports high-risk AI classification under EU Act." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-4.2", targetFramework: "ISO-42001", targetClauseId: "A.10.3", mappingType: "equivalent", confidence: "high", rationale: "Third-party internal controls map to supplier management." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-4.2", targetFramework: "EU-AIA", targetClauseId: "Art-25", mappingType: "related", confidence: "high", rationale: "Component risk controls support value-chain responsibility obligations." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-5.2", targetFramework: "ISO-42001", targetClauseId: "A.8.5", mappingType: "related", confidence: "high", rationale: "Stakeholder engagement maps to information for interested parties." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-5.2", targetFramework: "COSO-ERM", targetClauseId: "Comp5-Principle20", mappingType: "related", confidence: "high", rationale: "External AI actor engagement supports risk communication." },

  // ── NIST MEASURE (previously unmapped) ──
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-1.2", targetFramework: "ISO-42001", targetClauseId: "9.1", mappingType: "equivalent", confidence: "high", rationale: "Metrics appropriateness review aligns with monitoring and measurement." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-1.2", targetFramework: "COSO-ERM", targetClauseId: "Comp4-Principle16", mappingType: "related", confidence: "high", rationale: "Control effectiveness assessment relates to COSO ERM assessment." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-1.3", targetFramework: "ISO-42001", targetClauseId: "A.6.2.4", mappingType: "partial", confidence: "high", rationale: "Independent evaluation aligns with verification and validation." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.2", targetFramework: "ISO-42001", targetClauseId: "A.5.4", mappingType: "related", confidence: "high", rationale: "Human subjects evaluation aligns with individual impact assessment." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.3", targetFramework: "ISO-42001", targetClauseId: "A.6.2.4", mappingType: "equivalent", confidence: "high", rationale: "Performance criteria measurement maps to V&V control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.4", targetFramework: "ISO-42001", targetClauseId: "A.6.2.4", mappingType: "equivalent", confidence: "high", rationale: "System behavior evaluation maps to V&V control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.5", targetFramework: "ISO-42001", targetClauseId: "A.6.2.4", mappingType: "equivalent", confidence: "high", rationale: "Validity and reliability demonstration maps to V&V." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.5", targetFramework: "EU-AIA", targetClauseId: "Art-15", mappingType: "related", confidence: "high", rationale: "Reliability demonstration supports EU accuracy and robustness requirements." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.7", targetFramework: "ISO-42001", targetClauseId: "A.6.2.4", mappingType: "partial", confidence: "high", rationale: "Security/resilience evaluation maps to V&V." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.7", targetFramework: "EU-AIA", targetClauseId: "Art-15", mappingType: "equivalent", confidence: "high", rationale: "Security evaluation maps to EU cybersecurity requirements." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.8", targetFramework: "ISO-42001", targetClauseId: "A.8.2", mappingType: "equivalent", confidence: "high", rationale: "Transparency/accountability measurement maps to user information." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.8", targetFramework: "EU-AIA", targetClauseId: "Art-13", mappingType: "related", confidence: "high", rationale: "Transparency measurement supports EU transparency obligations." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.9", targetFramework: "ISO-42001", targetClauseId: "A.8.2", mappingType: "partial", confidence: "high", rationale: "Model explainability maps to user documentation and information." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.9", targetFramework: "EU-AIA", targetClauseId: "Art-13", mappingType: "related", confidence: "high", rationale: "Explainability supports deployer ability to interpret outputs per Art. 13." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.10", targetFramework: "ISO-42001", targetClauseId: "A.7.4", mappingType: "equivalent", confidence: "high", rationale: "Privacy risk examination maps to data quality control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.10", targetFramework: "EU-AIA", targetClauseId: "Art-10", mappingType: "related", confidence: "high", rationale: "Privacy risk measurement supports EU data governance." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.12", targetFramework: "OECD-AI", targetClauseId: "Principle-1.2", mappingType: "related", confidence: "medium", rationale: "Environmental impact measurement aligns with sustainable development principle." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.13", targetFramework: "ISO-42001", targetClauseId: "9.1", mappingType: "equivalent", confidence: "high", rationale: "TEVV metrics effectiveness review maps to performance evaluation." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-3.2", targetFramework: "ISO-42001", targetClauseId: "A.6.2.6", mappingType: "related", confidence: "high", rationale: "Difficult-to-track risk approaches relate to operation and monitoring." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-3.2", targetFramework: "EU-AIA", targetClauseId: "Art-72", mappingType: "related", confidence: "high", rationale: "Risk tracking supports post-market monitoring." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-3.3", targetFramework: "ISO-42001", targetClauseId: "A.8.3", mappingType: "equivalent", confidence: "high", rationale: "Community feedback processes map to external reporting mechanisms." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-3.3", targetFramework: "EU-AIA", targetClauseId: "Art-72", mappingType: "related", confidence: "high", rationale: "User feedback supports post-market monitoring." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-4.1", targetFramework: "ISO-42001", targetClauseId: "A.6.2.5", mappingType: "related", confidence: "high", rationale: "Deployment-context measurement connects to deployment control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-4.2", targetFramework: "ISO-42001", targetClauseId: "9.1", mappingType: "equivalent", confidence: "high", rationale: "Deployment trustworthiness measurement maps to performance evaluation." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-4.3", targetFramework: "ISO-42001", targetClauseId: "10.2", mappingType: "equivalent", confidence: "high", rationale: "Performance improvement tracking maps to continual improvement." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-4.3", targetFramework: "COSO-ERM", targetClauseId: "Comp5-Principle19", mappingType: "related", confidence: "high", rationale: "Stakeholder consultation on performance maps to COSO review and revision." },

  // ── NIST MANAGE (previously unmapped) ──
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-1.2", targetFramework: "ISO-42001", targetClauseId: "6.1.3", mappingType: "equivalent", confidence: "high", rationale: "Risk treatment prioritization maps to AI risk treatment process." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-1.2", targetFramework: "COSO-ERM", targetClauseId: "Comp3-Principle14", mappingType: "equivalent", confidence: "high", rationale: "Prioritized risk treatment maps to COSO prioritize risks." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-1.3", targetFramework: "ISO-42001", targetClauseId: "6.1.3", mappingType: "equivalent", confidence: "high", rationale: "High-priority risk responses map to risk treatment." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-1.3", targetFramework: "EU-AIA", targetClauseId: "Art-9(4)", mappingType: "related", confidence: "high", rationale: "Risk responses align with EU risk mitigation measures." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-1.4", targetFramework: "ISO-42001", targetClauseId: "6.1.3", mappingType: "partial", confidence: "high", rationale: "Residual risk documentation maps to risk treatment process." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-1.4", targetFramework: "EU-AIA", targetClauseId: "Art-9", mappingType: "related", confidence: "high", rationale: "Residual risk management supports EU risk management system." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-3.2", targetFramework: "ISO-42001", targetClauseId: "A.10.3", mappingType: "equivalent", confidence: "high", rationale: "Pre-trained model monitoring maps to supplier/third-party management." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-3.2", targetFramework: "EU-AIA", targetClauseId: "Art-53", mappingType: "related", confidence: "high", rationale: "Third-party model monitoring supports GPAI provider obligations." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-4.2", targetFramework: "ISO-42001", targetClauseId: "10.1", mappingType: "equivalent", confidence: "high", rationale: "Continual improvement activities map to ISO improvement clause." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-4.2", targetFramework: "COSO-ERM", targetClauseId: "Comp5-Principle19", mappingType: "related", confidence: "high", rationale: "Continual improvement maps to COSO review and revision." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-4.3", targetFramework: "ISO-42001", targetClauseId: "A.8.4", mappingType: "equivalent", confidence: "high", rationale: "Incident communication to AI actors maps to incident communication control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-4.3", targetFramework: "EU-AIA", targetClauseId: "Art-73", mappingType: "equivalent", confidence: "high", rationale: "Incident communication maps to EU serious incident reporting." },

  // ── OECD (previously unmapped principles) ──
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-1", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-4.1", mappingType: "related", confidence: "medium", rationale: "Inclusive growth principle relates to stakeholder engagement." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-1.2", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.12", mappingType: "related", confidence: "medium", rationale: "Sustainable development aligns with environmental impact measurement." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-2", targetFramework: "NIST-AI-RMF", targetClauseId: "MANAGE-2.3", mappingType: "related", confidence: "high", rationale: "Human-centred values map to human-AI configuration." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-2.1", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-4.1", mappingType: "related", confidence: "high", rationale: "Rule of law and human rights map to legal risk mapping." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-3", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.8", mappingType: "related", confidence: "high", rationale: "Transparency principle maps to transparency measurement." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-3.2", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-2.2", mappingType: "related", confidence: "high", rationale: "Disclosure of AI nature maps to knowledge limits documentation." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-4", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.11", mappingType: "related", confidence: "high", rationale: "Robustness and safety map to robustness measurement." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-4.2", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.7", mappingType: "related", confidence: "high", rationale: "Security throughout lifecycle maps to security evaluation." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-5", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-2.2", mappingType: "related", confidence: "high", rationale: "Accountability principle maps to accountability structures." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-5.2", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.2", mappingType: "related", confidence: "medium", rationale: "Governance capacity maps to interdisciplinary competencies." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-5.3", targetFramework: "NIST-AI-RMF", targetClauseId: "MANAGE-3.1", mappingType: "related", confidence: "high", rationale: "Redress mechanisms relate to incident response." },

  // ── COSO (previously unmapped principles) ──
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp1-Principle3", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-2.3", mappingType: "related", confidence: "high", rationale: "Culture principle maps to executive leadership responsibility." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp1-Principle4", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.2", mappingType: "related", confidence: "high", rationale: "Core values commitment maps to trustworthy AI policies." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp1-Principle5", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.2", mappingType: "related", confidence: "high", rationale: "Attracting capable individuals maps to interdisciplinary competencies." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp2-Principle6", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.3", mappingType: "related", confidence: "high", rationale: "Business objectives map to mission and goals understanding." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp2-Principle8", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.3", mappingType: "related", confidence: "medium", rationale: "Evaluating alternative strategies considers alignment with organizational mission and goals." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp2-Principle9", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.4", mappingType: "related", confidence: "medium", rationale: "Business objective setting maps to business value definition." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp3-Principle12", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-3.2", mappingType: "related", confidence: "high", rationale: "Portfolio view of risk maps to risk assessment." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp3-Principle14", targetFramework: "NIST-AI-RMF", targetClauseId: "MANAGE-1.2", mappingType: "equivalent", confidence: "high", rationale: "Prioritize risks maps to risk treatment prioritization." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp3-Principle15", targetFramework: "NIST-AI-RMF", targetClauseId: "MANAGE-1.3", mappingType: "related", confidence: "high", rationale: "Portfolio risk responses map to high-priority risk responses." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp4-Principle17", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-1.2", mappingType: "related", confidence: "high", rationale: "Evaluates risk and control maps to metrics effectiveness review." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp4-Principle18", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-4.2", mappingType: "related", confidence: "high", rationale: "Reports on risk maps to deployment trustworthiness measurement." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp5-Principle19", targetFramework: "NIST-AI-RMF", targetClauseId: "MANAGE-4.2", mappingType: "related", confidence: "high", rationale: "Review and revision maps to continual improvement." },

  // ── New EU articles -> ISO ──
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-6", targetFramework: "ISO-42001", targetClauseId: "6.1.2", mappingType: "related", confidence: "high", rationale: "High-risk classification supports risk assessment scoping." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-8", targetFramework: "ISO-42001", targetClauseId: "6.1.3", mappingType: "related", confidence: "high", rationale: "Compliance with requirements maps to risk treatment." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-16", targetFramework: "ISO-42001", targetClauseId: "5.1", mappingType: "related", confidence: "high", rationale: "Provider obligations align with leadership commitment." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-26", targetFramework: "ISO-42001", targetClauseId: "A.9.2", mappingType: "equivalent", confidence: "high", rationale: "Deployer obligations map to responsible use processes." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-43", targetFramework: "ISO-42001", targetClauseId: "A.6.2.4", mappingType: "related", confidence: "high", rationale: "Conformity assessment relates to verification and validation." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-49", targetFramework: "ISO-42001", targetClauseId: "A.6.2.7", mappingType: "related", confidence: "high", rationale: "Registration requires maintained technical documentation." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-50", targetFramework: "ISO-42001", targetClauseId: "A.8.2", mappingType: "related", confidence: "high", rationale: "Art. 50 transparency to natural persons aligns with ISO user information for AI systems." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-52", targetFramework: "ISO-42001", targetClauseId: "A.8.2", mappingType: "equivalent", confidence: "high", rationale: "Transparency obligations map to user information control." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-71", targetFramework: "ISO-42001", targetClauseId: "A.6.2.7", mappingType: "related", confidence: "high", rationale: "EU database requires complete technical documentation." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-73", targetFramework: "ISO-42001", targetClauseId: "A.8.4", mappingType: "equivalent", confidence: "high", rationale: "Serious incident reporting maps to incident communication." },

  // ── ISO main body (new clauses) -> NIST ──
  { sourceFramework: "ISO-42001", sourceClauseId: "4.3", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.1", mappingType: "related", confidence: "high", rationale: "AIMS scope determination aligns with legal/regulatory context." },
  { sourceFramework: "ISO-42001", sourceClauseId: "7.1", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.2", mappingType: "related", confidence: "high", rationale: "Resources for AIMS align with interdisciplinary competencies." },
  { sourceFramework: "ISO-42001", sourceClauseId: "9.1", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-1.2", mappingType: "equivalent", confidence: "high", rationale: "Monitoring and measurement maps to metrics effectiveness review." },
  { sourceFramework: "ISO-42001", sourceClauseId: "10.1", targetFramework: "NIST-AI-RMF", targetClauseId: "MANAGE-4.2", mappingType: "equivalent", confidence: "high", rationale: "Continual improvement maps to measurable improvement activities." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.6.1.2", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-2.1", mappingType: "related", confidence: "high", rationale: "Responsible development objectives align with intended purpose documentation." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.6.1.3", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-2.3", mappingType: "related", confidence: "high", rationale: "Documented design and development processes establish lifecycle capabilities and constraints." },
];
