import type { AssessmentTriggerInput } from "@/lib/ai-system-register-assessment-triggers";
import {
  parseAssessmentSuite,
  syncAssessmentSuite,
  type AssessmentSuiteState,
} from "@/lib/ai-system-register-assessment-triggers";

/** Build trigger input from a register item / API body shape. */
export function toAssessmentTriggerInput(
  system: Record<string, unknown>
): AssessmentTriggerInput {
  return {
    personalDataInvolved: Boolean(system.personalDataInvolved),
    specialCategoryData: Boolean(system.specialCategoryData),
    dataCategories: Array.isArray(system.dataCategories)
      ? (system.dataCategories as string[])
      : [],
    decisionImpact: (system.decisionImpact as string) ?? null,
    autonomyLevel: (system.autonomyLevel as string) ?? null,
    humanInTheLoop:
      system.humanInTheLoop === undefined ? null : Boolean(system.humanInTheLoop),
    aiCapabilities: Array.isArray(system.aiCapabilities)
      ? (system.aiCapabilities as string[])
      : [],
    buildType: (system.buildType as string) ?? null,
    modelProvider: (system.modelProvider as string) ?? null,
    modelNameVersion: (system.modelNameVersion as string) ?? null,
    modelType: (system.modelType as string) ?? null,
    developerProvider: (system.developerProvider as string) ?? null,
    vendor: (system.vendor as string) ?? null,
    trainsOnCustomerData: (system.trainsOnCustomerData as string) ?? null,
    businessCriticality: (system.businessCriticality as string) ?? null,
    criticalBusinessProcess: Boolean(system.criticalBusinessProcess),
    failureImpact: (system.failureImpact as string) ?? null,
    euAnnexIiiRelevance: (system.euAnnexIiiRelevance as string) ?? null,
    regulatoryJurisdictions: Array.isArray(system.regulatoryJurisdictions)
      ? (system.regulatoryJurisdictions as string[])
      : [],
    prohibitedUseNotes: (system.prohibitedUseNotes as string) ?? null,
    riskTier: (system.riskTier as string) ?? null,
    customerFacing: Boolean(system.customerFacing),
    employeeFacing: Boolean(system.employeeFacing),
    externalFacing: Boolean(system.externalFacing),
    status: (system.status as string) ?? null,
    deploymentStage: (system.deploymentStage as string) ?? null,
    hostingLocation: (system.hostingLocation as string) ?? null,
    crossBorderTransfers: Boolean(system.crossBorderTransfers),
    friaStatus: (system.friaStatus as string) ?? null,
    dpiaStatus: (system.dpiaStatus as string) ?? null,
  };
}

export function rebuildAssessmentSuite(
  system: Record<string, unknown>,
  previousSuite?: unknown
): AssessmentSuiteState {
  return syncAssessmentSuite(
    toAssessmentTriggerInput(system),
    parseAssessmentSuite(previousSuite ?? system.assessmentSuite)
  );
}
