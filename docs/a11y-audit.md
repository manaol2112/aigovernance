# Accessibility audit – WCAG 2.2 AA (AI Assurance Hub)

Engineering target: **WCAG 2.2 Level AA** across admin, immersive portal, and workshop presenter surfaces.

This is not a formal certification. Brand marks (including Deloitte) remain subject to [Brandspace](https://brandspace.deloitte.com/site/index) review.

## Sitewide foundations

| Criterion | Implementation |
| --- | --- |
| 1.4.3 Contrast (Minimum) | Remapped light/deloitte `slate-400/500` and `theme-text-muted`; dark muted `#cbd5e1` on cards; Deloitte buttons use black on brand green (`--theme-brand-on`) |
| 1.4.11 Non-text Contrast | Stronger form borders (`border-strong`); outline buttons use strong border |
| 2.4.1 Bypass Blocks | Skip links: admin `#main-content`, portal `#portal-main`, presenter `#presenter-content` |
| 2.4.7 Focus Visible | Global `:focus-visible` + component rings with offset |
| 2.5.8 Target Size | Button `sm` raised to 36px min height |
| 2.3.3 Animation | `prefers-reduced-motion` disables motion sitewide |
| 1.4.4 / text size | Floor for `text-[8px]`/`text-[9px]` → 10px |
| 4.1.2 Name, Role, Value | Dialog close labelled; sidebar/`aria-current`; theme cycle labelled |
| 1.3.1 Headings | `CardTitle` is not an `h3` (avoids h1→h3 skips); pages use `AdminPageHeader` `h1` |
| 3.1.1 Language | `<html lang="en">` |

## Theme notes

- **Light / Deloitte:** muted body text uses ≥4.5:1 colors.
- **Dark:** indigo *text* stays light for readability; solid `bg-indigo-600/700` forced to deep indigo + white label for AA.
- **Deloitte green `#86BC25`:** too light for white text — primary buttons use black label text.

## Automated checks

```bash
npm test -- src/lib/contrast.test.ts
```

Contrast helpers live in `src/lib/contrast.ts`.

## Page matrix

| Surface | Status | Notes |
| --- | --- | --- |
| Admin shell + sidebar | Pass foundations | Theme cycle, skip link, focus |
| Dashboard | Pass foundations | Dark hero intentional |
| Assessments / new / workflow | Pass foundations | Engagement `h1`; workshop `h2` |
| Workshop presenter | Pass foundations | Skip + single nav rail |
| Frameworks / controls / risk / crosswalk / matrix / admin | Pass foundations | `AdminPageHeader` |
| Maturity / guided-workshop portal | Pass foundations | Skip + subtitle contrast |
| Charts / heatmaps / report SVGs | Partial | Decorative OK; data labels may need follow-up |
| Third-party / PDF export | Out of scope for HTML AA | |

## Manual verification (release)

1. Keyboard-only: tab entire admin sidebar, open assessment, workshop mode/list/topic, dialogs.
2. VoiceOver/NVDA: skip link, `aria-current`, form labels on new assessment.
3. Zoom 200%: scroll still works (admin main / portal scroll roots).
4. OS reduce motion: landing animations off.
5. Theme cycle: light → dark → deloitte; primary buttons remain readable.
6. Optional: axe DevTools or Lighthouse accessibility ≥90 on `/`, `/assessments`, `/frameworks`, maturity landing.

## Known follow-ups

- Wire `Input`/`Label` into older forms that still use raw `<input>` without `htmlFor`.
- Chart/SVG text contrast in maturity report.
- Add axe to CI when browser e2e is available.
