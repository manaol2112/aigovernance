# Sample Workshop Capture Notes

Dummy workshop transcript for testing the **Capture → Auto-map → Review → Analyze** flow.

## How to load

### Workshop transcripts (recommended for real recordings)

1. Open **Capture** → **Workshop transcripts**
2. Upload `.txt` or `.md` transcript exports (or click **Sample transcripts** for 3 demo files)
3. Keep **Merge with existing notes** checked to enrich sample/manual notes
4. Click **Analyze transcripts** — AI extracts structured notes, auto-maps controls, and runs grounded gap analysis
5. Review results in **Review** tab (all findings cite source excerpts)

Sample transcript files: `public/sample-transcripts/01-governance-policy-session.txt`, `02-fairness-privacy-session.txt`, `03-security-vendor-session.txt`

### Structured sample notes (manual testing)

1. Open an assessment → **Workshop & Control Analysis**
2. Go to the **Capture** tab
3. Click **Load sample notes**
4. Click **Save notes**, then **Auto-map to controls**
5. Switch to **Review**, pick a control, and run **Analyze**

### Via CLI

```bash
npx tsx scripts/seed-sample-capture-notes.ts <assessmentId>
```

Source of truth: `src/lib/sample-workshop-capture-notes.ts`

## What’s included

Notes cover all **20 risk sub-pillars** (~5 workshop questions each), formatted as Q&A transcript with explicit tags:

| Tag | Meaning |
|-----|---------|
| `[COMPLIANT]` | Strong controls — expect **aligned** or positive partial analysis |
| `[PARTIAL]` | Mixed / informal — expect **partial** analysis |
| `[GAP]` | Missing or not implemented — expect **gap** analysis |

### Expected aligned areas

- Governance & Accountability — policy, roles, risk oversight
- Privacy & Data Governance — data quality, lawful processing
- Security — access controls, infrastructure protection
- Compliance — documentation, logging, internal audit
- Human Oversight — credit/fraud human-in-the-loop

### Expected gap areas

- Fairness — impact assessment, bias testing (chatbot, HR pilot)
- Transparency — explainability not implemented
- Supply Chain — missing vendor due diligence
- Systemic — shadow GPAI / foundation model use
- Safety — HR pilot missing V&V and operational controls

### Expected partial areas

- Legacy fraud engines without formal risk assessment
- Credit-only bias testing; ad hoc monitoring elsewhere
- Chatbot — weak disclosure, security guardrails, explainability
- EU AI Act conformity documentation in progress

## Facilitator notes

The sample also includes internal facilitator notes (prioritized gaps, testing tips). These are merged during auto-map and analysis alongside workshop notes.

## Scenario context

Fictional client: **Acme Financial Services** — retail banking AI (credit scoring, fraud, chatbot, HR screening pilot). Strong enterprise governance and privacy; weaker fairness, explainability, vendor AI, and shadow LLM use.
