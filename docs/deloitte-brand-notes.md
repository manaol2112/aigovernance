# Deloitte visual theme — research notes

## Brandspace

Official brand system: [Deloitte Brand Space](https://brandspace.deloitte.com/) (login required).  
Engineering **cannot** approve logo use, wordmarks, or client-facing brand application. Route that to Brandspace / brand team.

This theme is an **inspired implementation** from public sources so the product can feel Deloitte-aligned in demos and internal use.

## Public cues applied

| Element | Guidance used | App behavior |
| --- | --- | --- |
| Green | `#86BC25` (PMS 368) | Signature accent, green period/dot, hero accent bar |
| Extended greens | Toolkit Green 2/4/6/7 | Tokenized in `deloitte-brand.ts` |
| Typography | Open Sans; Light for headlines | Loaded via `next/font`; `h1`/`h2` weight 300 |
| Canvas | Black / white / restrained gray | White page, black sidebar & heroes |
| Green discipline | Digital site uses green sparingly | Primary CTAs are **black**, not green fills |
| Links / interactive | Teal `#1076A8` on deloitte.com | `--theme-link` under Deloitte theme |
| Radius | Modest, corporate | Smaller radius tokens under Deloitte theme |

## Surface consistency

Deloitte theme is **not** “sometimes dark mode, sometimes light.”

1. **Default workspace** — white canvas, black sidebar, black hero bands (`admin-hero-header` / `brand-ink-surface`), green accents.  
2. **Reports / results** — full black presentation shell (`brand-ink-surface`) for client-facing scores.  
3. Do not leave unmarked `bg-slate-950` page roots under Deloitte — they read as a second theme.

## How to enable

**Admin → Appearance → Deloitte**, or the sidebar theme cycle.

## Files

- `src/lib/deloitte-brand.ts` — palette tokens  
- `src/app/globals.css` — `[data-theme="deloitte"]` system  
- `src/app/layout.tsx` — Open Sans  
- `src/components/layout/sidebar.tsx` — wordmark + green period  

## Still for humans / Brandspace

- Official Deloitte wordmark SVG (we use product name + green period, not the trademarked logo artwork)
- Client deliverables / proposals using Deloitte marks
- Any claim of “brand approved”
