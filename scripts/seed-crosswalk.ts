import { PrismaClient, MappingType, MappingConfidence, VerificationStatus, CoverageLevel, ControlType, ControlFrequency } from "@prisma/client";

import { crosswalkExpansion } from "./data/crosswalk-expansion";
import { crosswalkIsoEuBackfill } from "./data/crosswalk-iso-eu-backfill";

const prisma = new PrismaClient();

type CrosswalkEntry = {
  sourceClauseId: string;
  sourceFramework: string;
  targetClauseId: string;
  targetFramework: string;
  mappingType: MappingType;
  confidence: MappingConfidence;
  rationale: string;
};

const crosswalks: CrosswalkEntry[] = [
  // NIST GOVERN -> ISO 42001
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-1.1", targetFramework: "ISO-42001", targetClauseId: "4.1", mappingType: "related", confidence: "high", rationale: "Legal/regulatory context understanding aligns with organizational context determination." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-1.2", targetFramework: "ISO-42001", targetClauseId: "5.2", mappingType: "equivalent", confidence: "high", rationale: "Trustworthy AI in policies maps to AI policy establishment." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-1.2", targetFramework: "ISO-42001", targetClauseId: "A.2.2", mappingType: "equivalent", confidence: "high", rationale: "Organizational AI policies align with ISO AI policy control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-1.3", targetFramework: "ISO-42001", targetClauseId: "6.1.2", mappingType: "equivalent", confidence: "high", rationale: "Risk tolerance and prioritization maps to AI risk assessment process." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-1.3", targetFramework: "COSO-ERM", targetClauseId: "Comp2-Principle7", mappingType: "equivalent", confidence: "high", rationale: "Risk tolerance directly maps to COSO risk appetite definition." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-1.4", targetFramework: "ISO-42001", targetClauseId: "A.6.2.3", mappingType: "partial", confidence: "high", rationale: "Documentation policies align with design/development documentation control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-1.5", targetFramework: "ISO-42001", targetClauseId: "A.3.2", mappingType: "equivalent", confidence: "high", rationale: "AI actor roles and responsibilities align with ISO roles control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-1.6", targetFramework: "ISO-42001", targetClauseId: "A.3.3", mappingType: "equivalent", confidence: "high", rationale: "Workplace AI policies and concern reporting align." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-2.1", targetFramework: "COSO-ERM", targetClauseId: "Comp1-Principle1", mappingType: "equivalent", confidence: "high", rationale: "Board oversight of AI risks maps to board risk oversight principle." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-2.2", targetFramework: "COSO-ERM", targetClauseId: "Comp1-Principle2", mappingType: "equivalent", confidence: "high", rationale: "Accountability structures align with operating structures principle." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-3.1", targetFramework: "ISO-42001", targetClauseId: "A.10.3", mappingType: "partial", confidence: "medium", rationale: "Supply chain diversity maps partially to supplier management." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-4.1", targetFramework: "ISO-42001", targetClauseId: "A.8.3", mappingType: "related", confidence: "high", rationale: "Stakeholder engagement aligns with external reporting mechanisms." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-5.1", targetFramework: "ISO-42001", targetClauseId: "A.4.6", mappingType: "partial", confidence: "medium", rationale: "Workforce diversity in AI teams relates to human resources management." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-6.1", targetFramework: "ISO-42001", targetClauseId: "A.10.3", mappingType: "equivalent", confidence: "high", rationale: "Third-party AI risk management aligns with supplier relationship management." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "GOVERN-6.2", targetFramework: "ISO-42001", targetClauseId: "A.10.2", mappingType: "equivalent", confidence: "high", rationale: "Third-party contingency maps to responsibility allocation." },

  // NIST MAP -> ISO
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-1.1", targetFramework: "ISO-42001", targetClauseId: "A.5.2", mappingType: "equivalent", confidence: "high", rationale: "Context and impact identification maps to impact assessment process." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-1.6", targetFramework: "ISO-42001", targetClauseId: "A.5.4", mappingType: "equivalent", confidence: "high", rationale: "Impact characterization maps to individual impact assessment." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-2.1", targetFramework: "ISO-42001", targetClauseId: "A.9.4", mappingType: "equivalent", confidence: "high", rationale: "Intended purpose documentation aligns with ISO intended use control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-2.3", targetFramework: "ISO-42001", targetClauseId: "A.6.2.2", mappingType: "equivalent", confidence: "high", rationale: "AI system capabilities and limitations map to requirements specification." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-3.1", targetFramework: "COSO-ERM", targetClauseId: "Comp3-Principle10", mappingType: "equivalent", confidence: "high", rationale: "Risk identification maps to COSO risk identification principle." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-3.2", targetFramework: "COSO-ERM", targetClauseId: "Comp3-Principle11", mappingType: "equivalent", confidence: "high", rationale: "Risk assessment maps to COSO severity assessment." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MAP-5.1", targetFramework: "ISO-42001", targetClauseId: "A.10.3", mappingType: "partial", confidence: "high", rationale: "Third-party risk identification maps to supplier management." },

  // NIST MEASURE -> ISO/EU
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-1.1", targetFramework: "ISO-42001", targetClauseId: "A.6.2.4", mappingType: "equivalent", confidence: "high", rationale: "Appropriate methods and metrics align with verification and validation." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.1", targetFramework: "ISO-42001", targetClauseId: "A.6.2.6", mappingType: "equivalent", confidence: "high", rationale: "AI system evaluation aligns with operation and monitoring." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.6", targetFramework: "EU-AIA", targetClauseId: "Art-10(2)(f)", mappingType: "equivalent", confidence: "high", rationale: "Bias evaluation maps to EU data quality and representativeness requirements." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-2.11", targetFramework: "EU-AIA", targetClauseId: "Art-15", mappingType: "equivalent", confidence: "high", rationale: "Robustness and cybersecurity measurement maps to EU Art. 15." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-3.1", targetFramework: "ISO-42001", targetClauseId: "A.6.2.6", mappingType: "equivalent", confidence: "high", rationale: "Tracking emergent AI risks aligns with operation and monitoring of AI systems." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MEASURE-3.1", targetFramework: "ISO-42001", targetClauseId: "9.1", mappingType: "related", confidence: "high", rationale: "Emergent risk tracking supports ISO monitoring, measurement, and evaluation." },

  // NIST MANAGE -> EU/ISO
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-1.1", targetFramework: "ISO-42001", targetClauseId: "6.1.3", mappingType: "equivalent", confidence: "high", rationale: "Risk treatment and response maps to AI risk treatment process." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-1.1", targetFramework: "COSO-ERM", targetClauseId: "Comp3-Principle13", mappingType: "equivalent", confidence: "high", rationale: "Risk response maps to COSO implement risk responses." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-2.1", targetFramework: "EU-AIA", targetClauseId: "Art-9", mappingType: "equivalent", confidence: "high", rationale: "Risk treatment and residual risk maps to EU risk management system." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-2.2", targetFramework: "EU-AIA", targetClauseId: "Art-72", mappingType: "equivalent", confidence: "high", rationale: "Post-deployment monitoring maps to EU post-market monitoring." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-2.3", targetFramework: "EU-AIA", targetClauseId: "Art-14", mappingType: "partial", confidence: "high", rationale: "Human-AI configuration relates to human oversight requirements." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-2.4", targetFramework: "EU-AIA", targetClauseId: "Art-27", mappingType: "related", confidence: "medium", rationale: "Impact assessment for rights relates to deployer FRIA obligation." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-3.1", targetFramework: "ISO-42001", targetClauseId: "A.8.4", mappingType: "equivalent", confidence: "high", rationale: "Incident response maps to incident communication control." },
  { sourceFramework: "NIST-AI-RMF", sourceClauseId: "MANAGE-4.1", targetFramework: "EU-AIA", targetClauseId: "Art-17", mappingType: "partial", confidence: "high", rationale: "Post-deployment monitoring maps to EU quality management system." },

  // EU -> ISO direct mappings
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-9", targetFramework: "ISO-42001", targetClauseId: "6.1.2", mappingType: "equivalent", confidence: "high", rationale: "EU risk management system aligns with ISO AI risk assessment." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-10", targetFramework: "ISO-42001", targetClauseId: "A.7.4", mappingType: "equivalent", confidence: "high", rationale: "EU data governance maps to ISO data quality control." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-11", targetFramework: "ISO-42001", targetClauseId: "A.6.2.7", mappingType: "equivalent", confidence: "high", rationale: "EU technical documentation maps to ISO technical documentation control." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-12", targetFramework: "ISO-42001", targetClauseId: "A.6.2.8", mappingType: "equivalent", confidence: "high", rationale: "EU record-keeping maps to ISO event log control." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-13", targetFramework: "ISO-42001", targetClauseId: "A.8.2", mappingType: "equivalent", confidence: "high", rationale: "EU transparency maps to ISO user information control." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-14", targetFramework: "ISO-42001", targetClauseId: "A.9.2", mappingType: "partial", confidence: "high", rationale: "EU human oversight maps to ISO responsible use processes." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-17", targetFramework: "ISO-42001", targetClauseId: "5.1", mappingType: "related", confidence: "high", rationale: "EU QMS requires leadership commitment aligned with ISO Clause 5.1." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-17", targetFramework: "ISO-42001", targetClauseId: "9.1", mappingType: "related", confidence: "high", rationale: "EU QMS includes monitoring and measurement per ISO Clause 9.1." },
  { sourceFramework: "EU-AIA", sourceClauseId: "Art-17", targetFramework: "ISO-42001", targetClauseId: "10.1", mappingType: "related", confidence: "high", rationale: "EU QMS requires continual improvement aligned with ISO Clause 10.1." },

  // OECD -> NIST high-level
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-2.2", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.6", mappingType: "related", confidence: "high", rationale: "OECD fairness principle relates to NIST bias measurement." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-2.3", targetFramework: "NIST-AI-RMF", targetClauseId: "MANAGE-2.3", mappingType: "related", confidence: "high", rationale: "OECD human agency maps to NIST human-AI configuration." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-3.1", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.4", mappingType: "related", confidence: "high", rationale: "OECD transparency maps to NIST documentation policies." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-4.1", targetFramework: "NIST-AI-RMF", targetClauseId: "MEASURE-2.11", mappingType: "related", confidence: "high", rationale: "OECD robustness/safety maps to NIST robustness measurement." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-5.1", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-2.2", mappingType: "related", confidence: "high", rationale: "OECD accountability maps to NIST accountability structures." },
  { sourceFramework: "OECD-AI", sourceClauseId: "Principle-1.1", targetFramework: "COSO-ERM", targetClauseId: "Comp2-Principle9", mappingType: "related", confidence: "medium", rationale: "OECD inclusive growth relates to COSO business objectives." },

  // COSO -> NIST governance
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp1-Principle1", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-2.1", mappingType: "equivalent", confidence: "high", rationale: "Board oversight principle maps to NIST board AI risk oversight." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp3-Principle10", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-3.1", mappingType: "equivalent", confidence: "high", rationale: "COSO risk identification maps to NIST risk identification." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp3-Principle11", targetFramework: "NIST-AI-RMF", targetClauseId: "MAP-3.2", mappingType: "equivalent", confidence: "high", rationale: "COSO risk assessment maps to NIST risk assessment." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp4-Principle16", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-1.4", mappingType: "related", confidence: "high", rationale: "COSO ERM assessment relates to NIST risk process documentation." },
  { sourceFramework: "COSO-ERM", sourceClauseId: "Comp5-Principle20", targetFramework: "NIST-AI-RMF", targetClauseId: "GOVERN-4.1", mappingType: "related", confidence: "high", rationale: "COSO risk communication maps to NIST stakeholder engagement." },
];

const allCrosswalks: CrosswalkEntry[] = [...crosswalks, ...crosswalkExpansion, ...crosswalkIsoEuBackfill];

async function getRequirementId(frameworkCode: string, clauseId: string) {
  const req = await prisma.frameworkRequirement.findFirst({
    where: {
      clauseId,
      framework: { code: frameworkCode },
    },
  });
  if (!req) {
    throw new Error(`Requirement not found: ${frameworkCode}:${clauseId}`);
  }
  return req.id;
}

async function main() {
  console.log("Seeding crosswalk mappings...");
  let created = 0;
  let skipped = 0;

  for (const entry of allCrosswalks) {
    try {
      const sourceId = await getRequirementId(entry.sourceFramework, entry.sourceClauseId);
      const targetId = await getRequirementId(entry.targetFramework, entry.targetClauseId);

      await prisma.crosswalkMapping.upsert({
        where: {
          sourceRequirementId_targetRequirementId_mappingType: {
            sourceRequirementId: sourceId,
            targetRequirementId: targetId,
            mappingType: entry.mappingType,
          },
        },
        create: {
          sourceRequirementId: sourceId,
          targetRequirementId: targetId,
          mappingType: entry.mappingType,
          confidence: entry.confidence,
          rationale: entry.rationale,
          verificationStatus: VerificationStatus.peer_reviewed,
          verifiedBy: "governance-lead",
          verifiedAt: new Date(),
        },
        update: {
          confidence: entry.confidence,
          rationale: entry.rationale,
          verificationStatus: VerificationStatus.peer_reviewed,
          verifiedBy: "governance-lead",
          verifiedAt: new Date(),
        },
      });
      created++;
    } catch (e) {
      console.warn(`  Skipped: ${entry.sourceFramework}:${entry.sourceClauseId} -> ${entry.targetFramework}:${entry.targetClauseId}`);
      skipped++;
    }
  }

  console.log(`  ✓ ${created} crosswalk mappings created/updated (${skipped} skipped, ${allCrosswalks.length} total defined)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
