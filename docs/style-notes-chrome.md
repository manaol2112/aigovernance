# Chrome & theme patterns (AI Assurance Hub)

## Two shells

1. **Admin shell** (`AdminChromeShell`) — app sidebar + scrollable main. Used for catalog, assessments, workflow, admin.
2. **Immersive portal** (`MaturityPortalShell` / `GuidedWorkshopScrollShell`) — no app sidebar; product header + own `data-maturity-scroll` root. Used for `/maturity-assessment/*` and `/guided-workshop/*`.

## Canonical headers

| Surface | Component |
| --- | --- |
| Admin catalog / list dashboards | `AdminPageHeader` **`hero`** (Frameworks pattern) |
| Assessment engagement workflow | `AssessmentEngagementHeader` (keeps journey context) |
| Immersive maturity / workshop | `MaturityPortalShell` header |
| Workshop presenter window | `WorkshopPresentationView` title bar only |

### Dashboard page pattern (match Frameworks)

```
space-y-8
└ AdminPageHeader variant="hero"
   · eyebrow + title + description
   · actions (white primary + outline secondary)
   · AdminPageHeaderStat grid (3–4 metrics)
└ optional secondary board (highlights / posture)
└ section
   · h2 + short lead (text-slate-600)
   · catalog / table / cards
```

Used on: Frameworks, Controls, Risk taxonomy, Crosswalk, Matrix, Assessments, New assessment, Admin.

Do not invent additional page-header patterns.

## Theme (global)

- `data-theme` on `<html>`: `light` | `dark` | `deloitte`.
- Change via **sidebar theme cycle** (quick) or **Admin → Appearance** (full picker).
- Prefer CSS variables (`bg-theme-page`, `--theme-brand*`) on new surfaces.

### Deloitte surface rules (avoid mixed “dark mode” pages)

| Class | Role |
| --- | --- |
| `brand-canvas-shell` | White page canvas under Deloitte |
| `brand-ink-surface` / `admin-hero-header` | Black band only (hero, CTA, report shell) |
| `brand-elevated-card` | White cards on light canvas |

**Workspace pages** (home, frameworks, assessments, landings): light canvas + black heroes.  
**Live reports / results**: full `brand-ink-surface` (intentional presentation ink — not random dark mode).

## Scroll contract

- Outer shell: `h-dvh overflow-hidden`.
- Scroll on `AdminMainShell` **or** an inner `h-full min-h-0 overflow-y-auto` root (`data-maturity-scroll` when needed).
- Never put `overflow-hidden` on a parent without a scrollable descendant.

## Brand (#4)

Deloitte theme tokens and marks are **not** brand-approved by engineering. Route brand questions to [Brandspace](https://brandspace.deloitte.com/). See `docs/deloitte-brand-notes.md` for the public-cue research that drives the Deloitte theme.
