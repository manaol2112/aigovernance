# AI System Register — Product & Requirements Plan

Status: **Requirements locked (pending build)**  
Date: 2026-10-01  
Goal: A multi-organization **AI System Register** for inventoring, governing, assessing risk, and storing evidence for every material AI system / use case — aligned to NIST AI RMF, ISO/IEC 42001, EU AI Act, OECD, and COSO ERM.

### Locked decisions

| Decision | Choice |
| --- | --- |
| Product name / nav | **AI System Register** (`/ai-system-register`) |
| Full Assessment engagement `UseCase` | **Fully separate.** No link, import, or sync with Full Assessment inventory rows. |
| Register risk assessments | **Nested inside each register record.** Create system → run / re-run risk assessment on that record (not a separate top-level product). |
| Tenancy | **Multi-organization.** Every register row belongs to an `Organization`; UI filters by selected org. |
| Risk tiering | **Manual tier allowed without assessment.** Guided assessment optional; manual set requires rationale. Assessed tiers also confirmable/overridable with rationale. |
| Field depth (v1) | **Full extended set day one** (all catalog groups in §5, not a lean 22-field subset). |
| Advanced-only items | True “Advanced” fields in §5.9–5.10 still ship in v1 where listed; continuous monitoring integrations remain later. |

---

## 1. Problem statement

Organizations cannot govern AI they cannot see. Leadership needs a living inventory of AI use cases with:

- Clear ownership and accountability  
- Risk classification grounded in framework criteria (not gut feel)  
- Status of risk / impact assessments  
- Evidence repository per use case  
- Optional guided risk assessment that **assigns** a risk rating  

Today this repo already has a **UseCase** model, but it is **nested under a client Assessment engagement** (`assessmentId` required). That supports delivery workshops; it does **not** yet provide a durable company-wide register as a first-class product area.

---

## 2. What already exists (baseline to reuse)

| Asset | Location | Relevance |
| --- | --- | --- |
| `UseCase` Prisma model | `prisma/schema.prisma` | Name, type, actor, risk tier, data categories, owners, vendor, stage, autonomy, regions |
| Use-case types & defaults | `src/lib/use-case-types.ts` | 12 types incl. EU high-risk flags |
| Intake draft + options | `src/lib/use-case-intake.ts` | Actor, risk tier, deployment, autonomy, regions |
| Assessment workflow stage | `use_cases` in journey | Create use cases inside engagements |
| `AISystem` + `GovernanceEvidence` | schema | System registry + evidence signals (still assessment-scoped) |
| Risk pillars (11) | `src/lib/risk-pillars.ts` | Shared taxonomy for governance themes |

**Implication:** Reuse enums, type catalog, and intake patterns. Build a **new multi-org AI System Register** with its own models. Do not couple to Full Assessment `UseCase`.

---

## 3. Product vision

### 3.1 Primary surface

New sidebar / hub section: **AI System Register** (`/ai-system-register`)

- Org switcher / scope (multi-org)  
- List / filter / search systems for the selected organization  
- Create / edit / retire systems (full extended field set)  
- Detail page with tabs: **Overview · Risk assessment · Evidence · History**  
- **Risk assessment lives inside the system record** — start, complete, version, and re-run from that page (or as a step during create)  

### 3.2 Relationship to Full Assessment (engagement product)

**Fully separate.** Full Assessment workshop `UseCase` rows are unchanged and not linked.

| Mode | Behavior |
| --- | --- |
| AI System Register | Multi-org inventory + nested risk assessments + evidence |
| Full Assessment | Engagement delivery product; own use-case intake |
| “Assessment” in this plan | Means **register risk assessment** on an `AiSystemRegister` record — not Full Assessment |

### 3.3 Success criteria

1. Users can manage register rows per organization (multi-org).  
2. Every material system has owners, lifecycle status, review dates, and extended governance fields.  
3. Risk tier can be set **manually** (with rationale) **or** via nested risk assessment **or** left **Not assessed**.  
4. Completing a nested risk assessment writes inherent/residual tier + factor breakdown on that system.  
5. Evidence can be attached and browsed per system.  
6. Usable without opening Full Assessment.

---

## 4. Framework research — what the register must support

### 4.1 NIST AI RMF (Govern / Map / Measure / Manage)

Critical inventory & risk factors:

- **Context of use** — intended purpose, users, deployment setting, assumptions/limits  
- **Impacts** — beneficial and harmful; likelihood × magnitude (Map 5.1)  
- **Third-party / IP / supply-chain risk** (Map 4.1)  
- **TEVV / safety / monitoring** readiness (Measure)  
- **Inventory itself** as a governed, resourced mechanism (Govern 1.6)

### 4.2 ISO/IEC 42001

- Documented **AI system inventory** and purposes (≈ Clause 8.4)  
- **AI system impact assessment** (≈ 6.1.4 / 8.2 / 8.4)  
- Lifecycle controls, documented information, continual improvement  
- Roles, competence, and accountability for each system/use case  

### 4.3 EU AI Act (Reg. 2024/1689)

Must capture enough to support (not replace legal advice):

- **Role** — provider / deployer / importer / distributor / unclear  
- **Risk class** — prohibited / high / limited (transparency) / minimal / GPAI  
- **Annex III relevance** (high-risk domains)  
- **Article 50** transparency triggers (chatbots, synthetic content, etc.)  
- **FRIA** (fundamental rights impact assessment) trigger/status  
- Human oversight expectations for high-risk systems  

### 4.4 OECD AI Principles & COSO ERM

- Transparency, accountability, safety, fairness  
- Risk appetite, residual risk after controls, escalation to risk owners  

### 4.5 Industry inventory practice (synthesis)

Practical registers (EU AI Compass, Trustera-style inventories) converge on ~20–35 fields covering ownership, purpose, data, vendor/tech, compliance flags, lifecycle, and evidence location — then deepen with risk assessment.

---

## 5. Comprehensive field catalog

**v1 ships the full extended set** below (all groups). Create wizard may progressive-disclose sections, but every field is available on day one — not deferred to a “lean MVP.”

### 5.1 Identity & lifecycle (MVP)

| Field | Type | Notes |
| --- | --- | --- |
| `useCaseCode` | string | Human ID e.g. `AI-UC-0042` |
| `name` | string | Business name |
| `description` / intended purpose | text | Plain language purpose |
| `status` | enum | `discovery` · `proposed` · `pilot` · `production` · `suspended` · `retired` · `prohibited_blocked` |
| `useCaseType` | existing enum | Reuse `UseCaseType` |
| `department` / business function | string | |
| `regions` | string[] | Deployment / impact geographies |
| `deploymentStage` | existing enum | Align with status or keep both (stage = tech; status = governance) |
| `goLiveDate` / `retirementDate` | date? | Extended |
| `lastReviewedAt` / `nextReviewAt` | date | Review cadence |
| `createdBy` / timestamps | audit | |

### 5.2 Ownership & accountability (MVP)

| Field | Type | Notes |
| --- | --- | --- |
| `businessOwner` | string (later userId) | Accountable owner |
| `technicalOwner` | string | Engineering / system owner |
| `riskOwner` | string | Risk / compliance owner |
| `humanOversightOwner` | string | Who can intervene / escalate |
| `stewardTeam` | string? | Extended |
| `raciNotes` | text? | Extended |

### 5.3 Role, regulatory & classification (MVP + Extended)

| Field | Type | Notes |
| --- | --- | --- |
| `actorRole` | existing `ActorType` | EU AI Act role |
| `euAnnexIiiRelevance` | enum | `none` · `potential` · `confirmed` · `legal_review` |
| `euArticle50Trigger` | enum/string[] | chatbot, synthetic media, emotion recognition, biometric categorisation, none |
| `friaStatus` | enum | `not_required` · `screening` · `required` · `in_progress` · `completed` · `waived` |
| `dpiaStatus` | enum | Same pattern (GDPR Art. 35) |
| `ropaLinked` | boolean / link | Extended |
| `applicableFrameworks` | string[] | NIST, ISO 42001, EU AIA, etc. |
| `sectorDomain` | string | HR, credit, healthcare, education, critical infrastructure, etc. |

### 5.4 Users, decisions & autonomy (MVP)

| Field | Type | Notes |
| --- | --- | --- |
| `intendedUsers` | string[] / text | Employees, customers, applicants, citizens… |
| `affectedPopulations` | text | Who is impacted (may differ from users) |
| `decisionImpact` | enum | `advisory` · `decision_support` · `automated_recommendation` · `automated_decision` · `unclear` |
| `autonomyLevel` | existing enum | low / medium / high |
| `humanInTheLoop` | boolean / enum | Complements autonomy |
| `overrideEscalationPath` | text | Extended |

### 5.5 Data & privacy (MVP)

| Field | Type | Notes |
| --- | --- | --- |
| `dataCategories` | string[] | Reuse existing options + special-category flag |
| `personalDataInvolved` | boolean | |
| `specialCategoryData` | boolean | GDPR Art. 9 |
| `dataSources` | text / tags | Inputs |
| `dataOutputs` / destinations | text | Where results go |
| `retentionPolicy` | text | |
| `crossBorderTransfers` | boolean / notes | Extended |
| `lawfulBasis` | string? | Advanced |

### 5.6 Technology, model & supply chain (MVP)

| Field | Type | Notes |
| --- | --- | --- |
| `buildType` | enum | `internal` · `vendor` · `open_source` · `mixed` |
| `vendor` / `modelProvider` | string | |
| `modelNameVersion` | string | Extended |
| `modelType` | enum | Reuse/extend `AISystemModelType` (LLM, classical ML, vision, agent…) |
| `hostingLocation` | string | |
| `subprocessors` | text | Extended |
| `trainsOnCustomerData` | enum | `yes` · `no` · `unknown` · `not_applicable` |
| `contractDpaStatus` | enum | `none` · `in_progress` · `executed` · `not_required` |
| `dependencies` | text / links | Other systems, APIs |

### 5.7 Risk, assessment & residual posture (MVP)

| Field | Type | Notes |
| --- | --- | --- |
| `riskAssessmentStatus` | enum | `not_started` · `in_progress` · `completed` · `stale` · `waived` |
| `inherentRiskTier` | `RiskTier` | Before controls — **system-assigned or analyst-confirmed** |
| `residualRiskTier` | `RiskTier` | After controls |
| `inherentRiskScore` | 0–100 | Computed |
| `residualRiskScore` | 0–100 | Computed |
| `riskAssessmentCompletedAt` | datetime? | |
| `riskAssessmentVersion` | int | Re-assess creates new version |
| `riskSummary` | text | Narrative for leadership |
| `keyRiskThemes` | string[] | Mapped to 11 pillars / NIST characteristics |
| `treatmentPlan` | text | Extended |
| `riskAcceptedBy` / `acceptedAt` | audit | Extended |

### 5.8 Evidence & documentation (MVP repository)

| Field / entity | Type | Notes |
| --- | --- | --- |
| Evidence items | related rows | File + metadata per use case |
| `evidenceType` | enum | policy, model_card, dpiA, fria, test_report, vendor_due_diligence, approval, monitoring_log, incident, other |
| `title`, `file`, `url`, `notes` | | |
| `linkedControlCodes` | string[] | Optional |
| `capturedAt` / uploader | audit | |
| Register fields | | `evidenceCompleteness` derived %; `lastEvidenceReviewAt` |

### 5.9 Operations, safety & monitoring (Extended)

| Field | Notes |
| --- | --- |
| Monitoring in place (Y/N + notes) | NIST Measure |
| Incident history / last incident | |
| Known limitations / out-of-scope uses | |
| Evaluation / V&V last date | |
| Change management linked? | |
| Shadow AI flag | Suspected unsanctioned tool |

### 5.10 Approvals & next actions (Extended)

| Field | Notes |
| --- | --- |
| Approval status | draft / pending / approved / rejected |
| Approved by / date | |
| Next action | classify, request vendor evidence, run FRIA, improve oversight, retire… |
| Linked maturity / workshop / assessment IDs | Cross-product |

---

## 6. Optional Risk Assessment — design

### 6.1 User flow (nested under the register record)

1. Create system in **AI System Register** (full extended fields; progressive sections OK).  
2. Risk tiering options at create / on detail:  
   - **Leave as Not assessed**  
   - **Set risk tier manually** (tier + mandatory rationale)  
   - **Run risk assessment now** (nested wizard on this system)  
3. If assessment: multi-step wizard (≈ 8–12 scored dimensions).  
4. On complete: compute **inherent** → confirm / override with rationale → optional control maturity → **residual** → persist versioned assessment **linked to this system**.  
5. From system detail → **Risk assessment** tab: history, current breakdown, **Re-assess**, mark stale when material fields change.

### 6.2 Critical risk factors (scored dimensions)

Each dimension scored **0–4** (none → severe) or Yes/No with weight. Map to frameworks:

| Dimension ID | Question focus | Framework anchors | Weight (proposed) |
| --- | --- | --- | --- |
| `people_impact` | Affects individuals’ rights, access, livelihood? | EU AIA Annex III, NIST Map | High (3) |
| `decision_automation` | Autonomy / automated decisions vs advisory | EU AIA, NIST Map | High (3) |
| `data_sensitivity` | Personal / special-category / biometric | GDPR, EU AIA, ISO | High (3) |
| `scale_exposure` | Population size, volume, criticality of process | NIST Map 5.1 | Medium (2) |
| `safety_harm` | Physical / psychological / safety-critical domain | EU AIA, NIST Measure | High (3) |
| `fairness_bias` | Protected groups / disparate impact plausible | NIST, OECD, EU FRIA | High (3) |
| `transparency_gap` | Users unaware / unexplained outcomes | Art. 50, OECD | Medium (2) |
| `oversight_gap` | No effective human override / escalation | EU AIA high-risk, NIST | High (3) |
| `security_adversarial` | Abuse, prompt injection, model theft, misuse | NIST Measure | Medium (2) |
| `third_party_supply` | Vendor opacity, no DPA, trains-on-data unknown | NIST Map 4.1, ISO | Medium (2) |
| `regulatory_trigger` | Annex III / prohibited pattern / GPAI systemic | EU AIA | High (3) + **hard rules** |
| `lifecycle_maturity` | Prod without monitoring / no assessment history | ISO 42001, COSO | Medium (2) |

**Hard rules (override score → tier):**

1. Prohibited-pattern affirmative → `prohibited` (block / escalate).  
2. Confirmed Annex III + production + high autonomy → floor at `high`.  
3. GPAI provider / systemic indicators → at least `gpai` classification path.  
4. Article 50-only (chatbot/content) with low people-impact → typically `limited`.  

### 6.3 Scoring → risk tier assignment

```
weightedScore = Σ (dimensionScore / 4 × weight) / Σ weights   → 0–100

Inherent tier (default mapping):
  ≥ 80 or hard-rule prohibited     → prohibited / escalate
  ≥ 60 or Annex III hard-rule      → high
  GPAI path                        → gpai
  ≥ 35                             → limited
  < 35                             → minimal
  incomplete assessment            → general (Not yet classified)
```

**Residual:** Apply control-effectiveness discount (0–40%) from a short control checklist (oversight, monitoring, DPIA/FRIA done, vendor DPA, testing). Cap so residual cannot fall more than one full tier without documented acceptance.

**Output stored:** scores, tier, factor breakdown JSON, narrative summary, assessor, timestamp, version. UI shows “How this rating was determined” (explainable, not a black box).

### 6.4 Explicit non-goals for v1 risk engine

- Not a substitute for legal conformity assessment  
- Not automatic FRIA/DPIA generation (status + checklist only)  
- Not real-time model monitoring  

---

## 7. Information architecture & UX

### 7.1 Routes

| Route | Purpose |
| --- | --- |
| `/ai-system-register` | Org-scoped list + filters + CTA create |
| `/ai-system-register/new` | Create wizard (full fields → optional nested risk assessment or manual tier) |
| `/ai-system-register/[id]` | Detail (Overview · Risk assessment · Evidence · History) |
| `/ai-system-register/[id]/risk-assessment` | Start / continue / re-run nested assessment |
| `/ai-system-register/[id]/risk-assessment/[assessmentId]` | Read-only version view (optional) |

### 7.2 List columns (MVP)

Code · Name · Type · Business owner · Status · Risk tier · Risk assessment status · Evidence count · Next review · Actions  

Filters: status, risk tier, assessment status, department, type, owner, region, shadow AI.

### 7.3 Detail tabs

1. **Overview** — full extended inventory fields  
2. **Risk assessment** — current tier source (manual vs assessed), inherent/residual, factor breakdown, version history, run/re-run CTA, manual override  
3. **Evidence** — upload/link repository  
4. **History** — audit of material field changes

### 7.4 Visual language

Match Deloitte / maturity portal patterns already shipped: black hero for create, light canvas list/detail, consistent badges (`Operating` / risk tiers), sticky footers on wizards.

---

## 8. Data model proposal (org-level)

### 8.1 New / evolved entities

```
Organization                          // NEW or extend if partial exists
  └── AiSystemRegisterItem            // register row (NEW) — aka AI system / use case
        ├── AiSystemRiskAssessment    // versioned nested assessments (FK → item)
        └── AiSystemEvidence          // repository files/links (FK → item)

Assessment
  └── UseCase                         // UNCHANGED — engagement-only, no FK to register
```

**Chosen approach:** New register models only. Nested risk assessments always belong to an `AiSystemRegisterItem`. No FK to Full Assessment `UseCase`.

### 8.2 Multi-tenancy / org scope (**locked: multi-org**)

- `Organization` is first-class (id, name, industry?, createdAt, …).  
- Every register item, risk assessment, and evidence row has `organizationId`.  
- UI: org context selector (header or register page); list/create scoped to active org.  
- APIs: reject cross-org access; all queries filter by `organizationId`.  
- Seed: at least one default organization for local/dev.

---

## 9. Phased delivery

### Phase 1 — Multi-org register + full fields + manual risk

- `Organization` + org switcher  
- Nav: **AI System Register**  
- List / create / edit with **full extended field set**  
- Manual risk tier (with rationale) or Not assessed  
- Evidence repository per system  
- Unit tests for org scoping + validators  

### Phase 2 — Nested risk assessment engine

- Risk assessment wizard **inside** the system record  
- Scoring + hard rules + version history + explainability UI  
- Assign inherent/residual tiers; override with rationale  
- Stale detection when material fields change  

### Phase 3 — Operations & export

- Export (CSV / PDF board pack)  
- Review reminders / next review queue  
- Shadow AI workflow polish  
- *(No Full Assessment integration — intentionally out of scope)*  

### Phase 4 — Platform hardening

- User accounts for owners; notifications  
- Control mapping per system  
- Continuous monitoring hooks  
- Stronger org RBAC if needed

---

## 10. Acceptance criteria (Phase 1–2)

1. User can select an organization and only see that org’s systems.  
2. User can create a system with the full extended field set and see it on the register.  
3. User can set risk tier **manually** (rationale required) without running assessment.  
4. User can skip assessment; status shows **Not assessed**.  
5. User can run nested risk assessment on that system; tier + factor breakdown persist on the record.  
6. User can attach ≥1 evidence item on that system.  
7. Filters work for org, risk tier, and assessment status.  
8. `npm test` and `npm run verify:deploy` remain green.  
9. Stakeholder-ready copy (explainable rationale; no raw equations in UI).  

---

## 11. Open decisions

| Topic | Status |
| --- | --- |
| Product name | **Locked — AI System Register** |
| Multi-org | **Locked** |
| Full Assessment link | **Locked — none** |
| Nested risk assessment inside system | **Locked** |
| Manual risk without assessment | **Locked** (rationale required) |
| Full extended fields day one | **Locked** |
| Evidence storage backend | **Locked** — store files under a **temporary/configurable server folder** (env e.g. `AI_REGISTER_EVIDENCE_DIR`, default `tmp/ai-system-register-evidence`). Swap to durable object storage later without changing the product model. |
| Org creation UX | **Locked** — **Organization is the starting point.** User creates/selects an org first; the AI inventory is always housed under that org. No register rows without an organization. |
| Independence | **Locked** — Totally independent prototype from Full Assessment; sidebar link only for presentation. |

---

## 12. Locked defaults summary

| Topic | Locked choice |
| --- | --- |
| Nav / routes | **AI System Register** · `/ai-system-register` |
| Tenancy | Multi-org (`organizationId` on all register entities) |
| Full Assessment | Separate; no FK / sync |
| Risk | Manual tier OK · nested guided assessment optional · both need rationale on override |
| Fields | Full extended catalog in v1 |
| Assessments | Versioned rows **belong to** the register system |
| Evidence | Temp/configurable directory via env; not tied to Full Assessment storage |
| Org UX | Create org → then inventory under that org |
| Product posture | Independent prototype; sidebar entry for demos |

---

## 13. Out of scope (for now)

- Legal opinion / certified conformity assessment  
- Automatic discovery of shadow AI across the estate  
- Replacing GDPR ROPA systems of record  
- Real-time model performance monitoring  
- Linking or migrating Full Assessment engagement use cases  

---

## 14. Next step / build status

1. ~~Confirm evidence storage + org CRUD~~ — locked.  
2. ~~Prisma: `Organization`, `AiSystemRegisterItem`, `AiSystemRiskAssessment`, `AiSystemEvidence`.~~  
3. ~~Phase 1 UI + APIs with org-first flow~~ (sidebar + org create + system create/list/detail + evidence temp storage).  
4. Phase 2 nested guided risk wizard + scoring tests.  
5. `npm run verify` + `npm run verify:deploy` before merge to `main`.
