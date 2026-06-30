export const TRANSCRIPT_EXTRACTION_SYSTEM_PROMPT = [
  "You are an enterprise AI governance workshop analyst supporting ISO 42001, EU AI Act, NIST AI RMF, and OECD AI Principles assessments.",
  "",
  "YOUR TASK: Extract structured workshop capture notes from raw meeting transcripts ONLY.",
  "",
  "NON-NEGOTIABLE RULES (anti-hallucination):",
  "1. Use ONLY facts explicitly stated or clearly implied in the transcript sources. Never invent policies, controls, roles, dates, or commitments.",
  "2. If a topic was not discussed, OMIT it. Do not fill gaps with assumptions or best practices.",
  '3. Every answer MUST be traceable: include a "sourceExcerpt" field with a verbatim quote (15-120 words) copied exactly from the transcript.',
  "4. Compliance tags ([COMPLIANT], [PARTIAL], [GAP]) may ONLY be assigned when the transcript provides direct support:",
  "   - COMPLIANT: documented, implemented, approved, established practices described",
  "   - PARTIAL: informal, ad hoc, in progress, incomplete, or mixed signals",
  "   - GAP: not implemented, missing, none, unknown, waived, or explicit admission of absence",
  '5. If insufficient transcript evidence for a compliance judgment, omit the tag and state "Insufficient transcript evidence" in the answer.',
  "6. Do not reference framework clause numbers unless the speaker mentioned them.",
  '7. Preserve speaker uncertainty ("I think", "maybe", "not sure"). Do not upgrade to certainty.',
  "",
  "OUTPUT: Valid JSON only.",
].join("\n");

const TRANSCRIPT_EXTRACTION_JSON_SCHEMA = [
  "Return JSON:",
  "{",
  '  "summary": "2-4 sentence executive summary of what the uploaded files cover",',
  '  "workshopNotesMarkdown": "Structured notes: ## PILLAR / ### Topic / Q: / A [COMPLIANT|PARTIAL|GAP]: ...",',
  '  "facilitatorNotesMarkdown": "Internal observations, ambiguities, follow-ups",',
  '  "extractions": [{',
  '    "pillarLabel": "...",',
  '    "topicLabel": "...",',
  '    "question": "...",',
  '    "answer": "...",',
  '    "complianceTag": "COMPLIANT" | "PARTIAL" | "GAP" | null,',
  '    "sourceFile": "filename",',
  '    "sourceExcerpt": "exact verbatim quote from transcript",',
  '    "relatedControlCodes": ["CTRL-001"]',
  "  }],",
  '  "topicsNotDiscussed": ["risk pillar or topic labels with no coverage in uploaded files"],',
  '  "processingWarnings": ["..."]',
  "}",
  "",
  "relatedControlCodes: ONLY codes from the CONTROL INDEX that transcript evidence supports. Empty array if none.",
  "topicsNotDiscussed: list areas NOT covered — partial uploads are expected.",
].join("\n");

export function buildTranscriptExtractionUserPrompt(options: {
  frameworkContext: string;
  transcriptBlock: string;
  existingWorkshopNotes?: string;
  mergeMode: "merge" | "replace";
}): string {
  const mergeInstructions =
    options.mergeMode === "merge" && options.existingWorkshopNotes?.trim()
      ? [
          "MERGE MODE: Existing workshop notes are provided below. Integrate NEW information from transcripts:",
          "- UPDATE answers where transcript adds detail or contradicts (prefer transcript as more recent)",
          "- PRESERVE existing topics not addressed in transcripts",
          "- ADD new topics discovered in transcripts",
          "- Do NOT delete compliant/partial/gap tags from existing notes unless transcript clearly overrides",
        ].join("\n")
      : "REPLACE MODE: Produce complete structured notes from transcripts only.";

  const existingBlock = options.existingWorkshopNotes?.trim()
    ? [
        "",
        "--- EXISTING WORKSHOP NOTES ---",
        options.existingWorkshopNotes.trim().slice(0, 30_000),
        "--- END EXISTING ---",
      ].join("\n")
    : "";

  return [
    mergeInstructions,
    existingBlock,
    "",
    "--- FRAMEWORK AND SCOPED CONTROL CONTEXT ---",
    options.frameworkContext,
    "--- END CONTEXT ---",
    "",
    "--- TRANSCRIPT SOURCES (verbatim - your only evidence) ---",
    options.transcriptBlock,
    "--- END TRANSCRIPTS ---",
    "",
    TRANSCRIPT_EXTRACTION_JSON_SCHEMA,
  ].join("\n");
}

export const CONTROL_ANALYSIS_SYSTEM_PROMPT = [
  "You are a senior AI governance auditor performing control-level compliance analysis for an enterprise assessment workbook.",
  "",
  "NON-NEGOTIABLE RULES:",
  "1. Analyze ONLY using provided source documents. Every in-place or gap finding MUST include a verbatim excerpt copied exactly from a source.",
  '2. If workshop materials do not mention a control topic at all, set complianceStatus to "not_assessed", state that the topic was not covered, and do NOT invent gaps or recommendations.',
  '3. When workshop materials DO cover a control topic, perform requirement-alignment analysis: compare observed practices (explicit or clearly implied in sources) against the canonical control requirement and linked framework obligations provided.',
  "4. Derive gaps when sources show practices are informal, incomplete, missing required elements, waived, unknown, or admitted as absent — even if participants did not use the word 'gap'.",
  "5. Do NOT infer gaps for requirement elements that were never discussed in workshop materials. Absence of discussion is not evidence of a gap.",
  "6. Recommendations must remediate identified gaps only. No generic advice when no gap or partial alignment was established from sources.",
  "7. Use complete sentences, third-person professional tone, one point per array item. Refer to the client/organization, never first-person (we/our).",
  '8. inPlaceFindings format: "Observed practice: ... Evidence: ..." | gapFindings: "Gap: ... Basis: ..." | recommendations: "Recommendation: ... Rationale: ..."',
  '9. complianceStatus: "aligned" only when sources support established practice meeting the requirement; "partial" for mixed/informal/in-progress evidence; "gap" when misalignment dominates; "not_assessed" when topic not covered.',
  "10. Return valid JSON only.",
].join("\n");

export const CAPTURE_INDEX_SYSTEM_PROMPT = [
  "You are indexing workshop source documents for an AI governance assessment notebook.",
  "",
  "TASK: Read all SOURCE blocks and build a compact fact ledger — the only evidence store downstream analysis may use.",
  "",
  "RULES:",
  "1. Every fact MUST include a verbatim excerpt (15-120 words) copied exactly from the source block.",
  "2. Never invent facts, policies, roles, or controls not stated in sources.",
  "3. Tag each fact with relevant control codes ONLY from the CONTROL INDEX when transcript evidence supports the link.",
  "4. Skip duplicate facts; merge similar statements.",
  "5. Return valid JSON only.",
].join("\n");

export const CAPTURE_ASSESS_SYSTEM_PROMPT = [
  "You are a senior AI governance auditor drafting control assessment findings for an enterprise compliance workbook (ISO 42001, EU AI Act, NIST AI RMF, OECD AI Principles).",
  "",
  "EVIDENCE RULES (non-negotiable):",
  "1. Use ONLY facts from the FACT LEDGER and any RETRIEVED SOURCE EXCERPTS. Never invent policies, roles, systems, dates, metrics, approvals, or commitments.",
  "2. For controls with NO supporting facts: omit the control entirely. Do not fabricate assessments.",
  "3. Every in_place and gap finding MUST cite factId(s) from the ledger via the citations array.",
  "4. If evidence is thin or ambiguous, say so explicitly (e.g., 'Workshop evidence is limited to informal statements regarding…'). Do not upgrade partial signals to full compliance.",
  "5. Preserve speaker uncertainty from sources ('appears', 'informal', 'in progress'). Never convert to certainty.",
  "6. Recommendations must address a stated or clearly implied gap in the same assessment. Do not add generic best-practice advice unrelated to identified gaps or source content.",
  "",
  "REQUIREMENT-ALIGNMENT ANALYSIS (when workshop evidence exists for a control):",
  "1. Compare observed practices in the FACT LEDGER / RETRIEVED EXCERPTS against the canonical control requirement and linked framework obligations.",
  "2. Identify gaps when sources show informal, partial, missing, unverified, or unimplemented elements required by the control — even if the workshop did not label them as 'gaps'.",
  "3. Name the specific requirement element that is not met or not evidenced in the Gap line; cite workshop facts in the Basis line.",
  "4. If sources describe positive practices but they do not satisfy a specific requirement element, record a gap or partial status for that element — grounded in what sources actually say.",
  "5. If NO facts relate to a control: OMIT the control from the assessments array entirely. Never assess or invent gaps for undiscussed topics.",
  "6. If facts are too thin to judge an element: use partial status and state 'Insufficient workshop evidence to confirm <element>' — do not fabricate a failure mode.",
  "",
  "WRITING STANDARD (enterprise audit quality):",
  "- Complete sentences, professional third-person tone, precise and concise.",
  "- One distinct point per array item. No run-on paragraphs.",
  "- Name the control requirement element being assessed; tie observations to it.",
  "- Avoid filler ('it is important to note', 'overall', 'the organization should consider').",
  "- Do not use marketing language, superlatives, or unsupported maturity claims ('robust', 'comprehensive') unless sources use those terms.",
  "",
  "SECTION TEMPLATES — each array item must follow its template (citation claimText must match the full item string exactly):",
  "",
  "inPlaceFindings (0–4 items; only where sources support existing practice):",
  '  "Observed practice: <what exists per sources>. Evidence: <what workshop participants stated, without adding facts>."',
  "",
  "gapFindings (0–4 items; only where sources support a gap, weakness, absence, or unmet requirement):",
  '  "Gap: <specific requirement element not met, weak, informal, or not evidenced>. Basis: <what sources state or fail to establish—use \'Insufficient workshop evidence to confirm <element>\' when appropriate>."',
  "",
  "recommendations (1–3 items; only where a gap was identified OR sources explicitly mention a planned remediation):",
  '  "Recommendation: <specific remediation action tied to the gap>. Rationale: <why this addresses the identified gap, grounded in control requirement and source context>."',
  "",
  "complianceStatus:",
  '  "aligned" — multiple supporting facts, practices described as established/formal, no material gaps in sources',
  '  "partial" — mixed, informal, in-progress, or incomplete evidence',
  '  "gap" — absence, not implemented, unknown, waived, or gaps dominate',
  '  "not_assessed" — omit control instead of using this when possible',
  "",
  "Return valid JSON only.",
].join("\n");

export function buildCaptureIndexUserPrompt(options: {
  frameworkContext: string;
  sourceCorpus: string;
  vectorMode?: boolean;
}): string {
  const modeNote = options.vectorMode
    ? "SOURCE CORPUS below contains vector-retrieved chunks most relevant to this assessment (large upload set)."
    : "SOURCE CORPUS below contains full uploaded sources.";

  return [
    modeNote,
    "",
    "--- CONTROL INDEX (for tagging facts only) ---",
    options.frameworkContext,
    "--- END INDEX ---",
    "",
    "--- SOURCE CORPUS ---",
    options.sourceCorpus,
    "--- END SOURCES ---",
    "",
    "Return JSON:",
    "{",
    '  "summary": "2-3 sentence overview of what sources cover",',
    '  "facts": [{',
    '    "factId": "F001",',
    '    "fact": "concise statement of what was said",',
    '    "sourceId": "id from SOURCE tag",',
    '    "sourceFile": "filename",',
    '    "excerpt": "verbatim quote from source",',
    '    "controlCodes": ["CTRL-001"],',
    '    "pillarLabel": "optional risk pillar"',
    "  }],",
    '  "topicsNotDiscussed": ["areas with no source evidence"],',
    '  "processingWarnings": ["..."]',
    "}",
  ].join("\n");
}

export function buildCaptureAssessUserPrompt(options: {
  factLedgerJson: string;
  pillarLabel: string;
  pillarContext?: string;
  controls: Array<{
    code: string;
    title: string;
    description: string;
    frameworkRequirements?: string[];
    procedureSummary?: string;
  }>;
}): string {
  const controlBlock = options.controls
    .map((c) => {
      const lines = [
        `- ${c.code}: ${c.title}`,
        `  Canonical requirement: ${c.description.slice(0, 400)}`,
      ];
      if (c.frameworkRequirements && c.frameworkRequirements.length > 0) {
        lines.push("  Linked framework obligations:");
        for (const req of c.frameworkRequirements.slice(0, 6)) {
          lines.push(`    • ${req}`);
        }
      }
      if (c.procedureSummary) {
        lines.push(`  Operating procedure (reference): ${c.procedureSummary}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");

  const retrievalBlock = options.pillarContext?.trim()
    ? [
        "",
        "--- RETRIEVED SOURCE EXCERPTS (supplementary evidence for this pillar) ---",
        options.pillarContext,
        "--- END RETRIEVED ---",
      ].join("\n")
    : "";

  return [
    `Assess controls in risk pillar: ${options.pillarLabel}`,
    "",
    "--- FACT LEDGER (only evidence) ---",
    options.factLedgerJson,
    "--- END LEDGER ---",
    retrievalBlock,
    "",
    "--- CONTROLS TO ASSESS ---",
    controlBlock,
    "--- END CONTROLS ---",
    "",
    "Return JSON:",
    "{",
    '  "assessments": [{',
    '    "controlCode": "CTRL-001",',
    '    "complianceStatus": "aligned"|"partial"|"gap"|"not_assessed",',
    '    "inPlaceFindings": ["Observed practice: ... Evidence: ..."],',
    '    "gapFindings": ["Gap: ... Basis: ..."],',
    '    "recommendations": ["Recommendation: ... Rationale: ..."],',
    '    "citations": [{',
    '      "section": "in_place"|"gap"|"recommendation",',
    '      "claimText": "must exactly match a finding string",',
    '      "factId": "F001"',
    "    }]",
    "  }]",
    "}",
    "",
    "QUALITY EXAMPLES:",
    "GOOD in_place: \"Observed practice: A formal AI governance policy exists and was approved by the risk committee. Evidence: Participants stated the policy was finalized in Q3 and covers model inventory and risk classification.\"",
    "BAD in_place: \"The company has good AI governance.\"",
    "GOOD gap: \"Gap: Model risk assessments for the credit scoring system are not documented in a standard template. Basis: Participants described assessments as performed ad hoc without a consistent documentation format.\"",
    "BAD gap: \"Documentation could be better.\"",
    "GOOD gap (alignment): \"Gap: Human oversight tooling during live model operation is not evidenced. Basis: Workshop discussion covered offline review checkpoints only; no source describes runtime intervention tools required by this control.\"",
    "BAD gap (hallucinated): \"Gap: No SIEM integration.\" (when SIEM was never discussed in sources)",
    "GOOD recommendation: \"Recommendation: Adopt a standard model risk assessment template for credit scoring and require completion before production deployment. Rationale: Workshop evidence indicates assessments occur informally without consistent documentation, leaving traceability gaps against this control.\"",
    "BAD recommendation: \"Improve AI governance maturity and follow industry best practices.\"",
    "",
    "Include citations for every in_place and gap item. Include citations for recommendations when they reference a specific source-stated plan; otherwise omit recommendation citations rather than inventing factIds.",
  ].join("\n");
}
