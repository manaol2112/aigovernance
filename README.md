# AI Governance — Crosswalk & Assessment Platform

Enterprise-grade AI governance knowledge base with source-verified crosswalks across:

- **NIST AI RMF 1.0** (72 subcategories from [official Playbook JSON](https://airc.nist.gov/docs/playbook.json))
- **ISO/IEC 42001:2023** (mandatory clauses + Annex A controls)
- **EU AI Act** (Regulation 2024/1689 — governance articles)
- **OECD AI Principles** (OECD/LEGAL/0449)
- **COSO ERM 2017** (20 principles)

## Quick Start

### Prerequisites

- Node.js 20.19+ or 22.12+
- Docker (for PostgreSQL)

### Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL
npm run db:up

# Apply schema
npm run db:push

# Ingest frameworks, crosswalks, risks, and controls
npm run db:seed

# Validate seed manifests (CI anti-drift)
npm run db:validate

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
prisma/seeds/          # Authoritative framework JSON (NIST from official source)
scripts/ingest/        # Ingestion pipeline with content-hash validation
scripts/               # Crosswalk, risk/control seeding
src/app/(admin)/       # Framework browser, crosswalk console, controls, assessments
src/app/api/           # Assessment CRUD and gap report export (CSV/JSON)
sources/               # Gitignored — place licensed ISO 42001 full text here
```

## Anti-Hallucination Policy

- Requirement text is ingested from official sources only
- Each row has `contentHash`, `sourceDocument`, `sourceUrl`, `sourcePage`
- Verification workflow: `draft` → `peer_reviewed` → `verified`
- CI manifest validation ensures row counts and hashes don't drift

## ISO 42001 Licensed Text

Place your purchased ISO/IEC 42001:2023 text in `sources/iso-42001/` to replace control objective summaries with verbatim licensed content.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run db:up` | Start PostgreSQL via Docker Compose |
| `npm run db:push` | Apply Prisma schema |
| `npm run db:seed` | Full seed: frameworks + crosswalk + controls |
| `npm run db:validate` | Validate manifest hashes |

## Assessment Workflow

1. **Scope** — Select frameworks, risk tiers, and AI system context
2. **Questionnaire** — Rate each in-scope control's maturity level
3. **Gap Report** — Auto-generated findings for unimplemented controls
4. **Export** — Download CSV or JSON gap report
