import type { CrosswalkEntry } from "./crosswalk-expansion";

/**
 * ISO/EU clauses that have direct control links but lacked crosswalk paths.
 * Targets derived from existing control bridges and seed crosswalk patterns — not invented requirements.
 */
export const crosswalkIsoEuBackfill: CrosswalkEntry[] = [
  // ── ISO main body (control-bridged to NIST) ──
  { sourceFramework: "ISO-42001", sourceClauseId: "4.2", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.1", mappingType: "related", confidence: "high", rationale: "Interested party requirements align with legal/regulatory context determination." },
  { sourceFramework: "ISO-42001", sourceClauseId: "4.3", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.1", mappingType: "related", confidence: "high", rationale: "AIMS scope determination considers organizational context per GOVERN-1.1." },
  { sourceFramework: "ISO-42001", sourceClauseId: "4.4", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.2", mappingType: "related", confidence: "high", rationale: "Establishing AIMS aligns with integrating trustworthy AI into policies and processes." },
  { sourceFramework: "ISO-42001", sourceClauseId: "5.3", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.5", mappingType: "equivalent", confidence: "high", rationale: "Organizational roles and authorities map to AI actor roles and responsibilities." },
  { sourceFramework: "ISO-42001", sourceClauseId: "6.1.1", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.3", mappingType: "related", confidence: "high", rationale: "Planning for risks and opportunities aligns with mission and goals understanding." },
  { sourceFramework: "ISO-42001", sourceClauseId: "6.1.4", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.6", mappingType: "equivalent", confidence: "high", rationale: "AI system impact assessment maps to impact characterization." },
  { sourceFramework: "ISO-42001", sourceClauseId: "7.1", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-5.1", mappingType: "related", confidence: "medium", rationale: "AIMS resources relate to workforce and organizational capacity for AI." },
  { sourceFramework: "ISO-42001", sourceClauseId: "7.2", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.2", mappingType: "equivalent", confidence: "high", rationale: "Competence requirements map to interdisciplinary AI competencies." },
  { sourceFramework: "ISO-42001", sourceClauseId: "7.3", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.2", mappingType: "related", confidence: "high", rationale: "AI policy awareness supports policy integration in GOVERN-1.2." },
  { sourceFramework: "ISO-42001", sourceClauseId: "7.4", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-4.1", mappingType: "equivalent", confidence: "high", rationale: "AIMS communication maps to stakeholder engagement." },
  { sourceFramework: "ISO-42001", sourceClauseId: "7.5", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.4", mappingType: "equivalent", confidence: "high", rationale: "Documented information aligns with documentation policies." },
  { sourceFramework: "ISO-42001", sourceClauseId: "8.1", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-2.3", mappingType: "related", confidence: "high", rationale: "Operational planning and control supports lifecycle process definition." },
  { sourceFramework: "ISO-42001", sourceClauseId: "8.3", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.6", mappingType: "related", confidence: "high", rationale: "Data for AI systems aligns with data quality and bias measurement." },
  { sourceFramework: "ISO-42001", sourceClauseId: "9.2", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.4", mappingType: "related", confidence: "high", rationale: "Internal audit verifies risk process documentation and control effectiveness." },
  { sourceFramework: "ISO-42001", sourceClauseId: "9.3", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-2.1", mappingType: "related", confidence: "high", rationale: "Management review provides board/executive oversight of AIMS performance." },

  // ── ISO Annex A (control-bridged) ──
  { sourceFramework: "ISO-42001", sourceClauseId: "A.2.3", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.2", mappingType: "related", confidence: "high", rationale: "AI policy alignment with other policies supports trustworthy AI integration." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.2.4", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.2", mappingType: "related", confidence: "high", rationale: "AI policy review supports maintaining integrated governance policies." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.4.2", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.2", mappingType: "related", confidence: "high", rationale: "Resource documentation supports competency and resource planning." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.4.3", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.6", mappingType: "related", confidence: "high", rationale: "Data resources management aligns with training data governance." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.4.4", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.2", mappingType: "related", confidence: "medium", rationale: "Tooling resources support AI development capacity." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.4.5", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.2", mappingType: "related", confidence: "medium", rationale: "Computing resources support AI development and deployment capacity." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.5.5", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-1.6", mappingType: "equivalent", confidence: "high", rationale: "Societal impact assessment maps to impact characterization." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.7.2", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.6", mappingType: "related", confidence: "high", rationale: "Development data management aligns with data quality measurement." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.7.3", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.6", mappingType: "related", confidence: "high", rationale: "Data acquisition processes support data governance for AI." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.7.5", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.6", mappingType: "related", confidence: "high", rationale: "Data provenance supports data quality and governance measurement." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.7.6", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.6", mappingType: "related", confidence: "high", rationale: "Data preparation aligns with data quality criteria for AI." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.9.3", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-3.5", mappingType: "related", confidence: "high", rationale: "Responsible use objectives align with human oversight process definition." },
  { sourceFramework: "ISO-42001", sourceClauseId: "A.10.4", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-6.1", mappingType: "related", confidence: "high", rationale: "Customer relationship management relates to third-party AI risk." },

  // ── EU articles without crosswalk (control-bridged) ──
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-9(2)", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-3.1", mappingType: "equivalent", confidence: "high", rationale: "EU risk identification and evaluation maps to NIST risk identification." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-9(2)", targetFramework: "ISO-42001", targetClauseId: "6.1.2", mappingType: "related", confidence: "high", rationale: "Risk identification supports ISO AI risk assessment process." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-10(2)(a)", targetFramework: "EU-AIA", targetClauseId: "Art-10", mappingType: "partial", confidence: "high", rationale: "Sub-clause (a) implements parent Art. 10 data governance obligation." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-10(2)(a)", targetFramework: "ISO-42001", targetClauseId: "A.7.4", mappingType: "related", confidence: "high", rationale: "Design choices for datasets align with ISO data quality control." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-19", targetFramework: "EU-AIA", targetClauseId: "Art-13", mappingType: "related", confidence: "high", rationale: "Art. 19 instructions for use relate to Art. 13 transparency obligations." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-19", targetFramework: "EU-AIA", targetClauseId: "Art-48", mappingType: "related", confidence: "high", rationale: "Art. 19 requires declaration of conformity accompanying the system." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-21", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-2.2", mappingType: "related", confidence: "high", rationale: "Authority cooperation aligns with accountability structures." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-22", targetFramework: "EU-AIA", targetClauseId: "Art-21", mappingType: "related", confidence: "high", rationale: "Authorised representative supports provider authority cooperation obligations." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-47", targetFramework: "EU-AIA", targetClauseId: "Art-43", mappingType: "related", confidence: "high", rationale: "CE marking follows conformity assessment per Art. 43." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-48", targetFramework: "EU-AIA", targetClauseId: "Art-43", mappingType: "related", confidence: "high", rationale: "EU declaration of conformity follows conformity assessment." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-51", targetFramework: "EU-AIA", targetClauseId: "Art-53", mappingType: "related", confidence: "high", rationale: "Systemic risk GPAI classification relates to GPAI provider obligations." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-55", targetFramework: "EU-AIA", targetClauseId: "Art-53", mappingType: "related", confidence: "high", rationale: "Systemic risk GPAI obligations extend base GPAI provider requirements." },

  { sourceFramework: "ISO-42001", sourceClauseId: "8.2", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-2.3", mappingType: "equivalent", confidence: "high", rationale: "AI system life cycle maps to capabilities and limitations specification in lifecycle context." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-4.3", targetFramework: "NIST-AI-RMF", targetClauseId: "MANAGE-2.3", mappingType: "related", confidence: "high", rationale: "Contingency and fallback maps to human-AI configuration and oversight." },
];
