# Design QA Feedback – Action Plan (AI Assurance Hub)

Stakeholder design/QA feedback mapped to this codebase.

**Brand note (#4):** Do not treat code changes as Deloitte brand approval. Flag via [Deloitte Brandspace](https://brandspace.deloitte.com/site/index). See `docs/style-notes-chrome.md` and `docs/a11y-audit.md`.

---

## Critical

### 1. Sidebar active state — DONE
`usePathname()` + `isSidebarNavActive()` + tests + `aria-current`.

### 2. Scrolling (Chrome/Safari) — DONE
Client `AdminChromeShell` / `AdminMainShell`; full-bleed inner scroll roots.

### 3. Accessibility WCAG 2.2 AA — DONE (foundations + audit doc)
Focus, skip link, min 10px, reduced motion, badge contrast, page-by-page notes in `docs/a11y-audit.md`. Follow-ups listed there (axe CI, chart contrast).

---

## Medium

### 5. Light/dark + header consistency — DONE
- Global theme: sidebar cycle + Admin Appearance.
- Canonical `AdminPageHeader` on frameworks, controls, risk taxonomy, crosswalk, matrix, admin.
- Pattern documented in `docs/style-notes-chrome.md`.

### 6. Workshop facilitation panel — DONE
Solid stakeholders rail; topic chips → select; more room for questions.

### 7. Workshop navigation depth — DONE
- Facilitation: mode + scope + progress in aside; topic select in runbook; content priority.
- Presenter: mode + list + topic in one rail; header is title/actions only.

---

## Order completed
1. #1–2 → 2. #3 → 3. #4 flag → 4. #5–6 → 5. #7
