<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tests

Run unit tests after code changes: `npm test` (Vitest). Tests live in `src/**/*.test.ts`.

Maturity survey wizard changes must keep `src/lib/maturity-survey-wizard-state.test.ts` green — see `.cursor/rules/maturity-survey-wizard.mdc` for invariants (stable `steps`, never render `navigationSteps`).
