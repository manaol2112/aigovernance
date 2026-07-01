import type { CitationDraft } from "@/lib/control-analyzer";

export type CaptureCitation = {
  id: string;
  citationIndex: number;
  section: string;
  claimText: string;
  sourceType: string;
  sourceId: string | null;
  sourceLabel: string;
  excerpt: string;
  startOffset: number;
  endOffset: number;
};

export type GroundedFact = {
  factId: string;
  fact: string;
  sourceId: string;
  sourceFile: string;
  excerpt: string;
  controlCodes: string[];
  pillarLabel?: string;
};

export type PersistedControlAssessment = {
  controlId: string;
  controlCode: string;
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  complianceStatus: "aligned" | "partial" | "gap" | "not_assessed";
  citations: CitationDraft[];
  workshopNotes: string;
};

export type ControlMappingEntry = {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  controlDescription: string;
  pillarId: string;
  pillarLabel: string;
  narrative: string;
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  complianceStatus: "aligned" | "partial" | "gap" | "not_assessed";
  sourceFiles: string[];
  excerpts: string[];
  citations: CaptureCitation[];
};

export type CaptureAnalysisSummary = {
  summary: string;
  filesProcessed: number;
  fileNames: string[];
  controlsMapped: number;
  pillarsCovered: string[];
  topicsNotDiscussed: string[];
  unmappedSentences: number;
  warnings: string[];
  mappings: ControlMappingEntry[];
};
