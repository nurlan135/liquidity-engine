# Codebase Structure

**Analysis Date:** 2026-09-04

## Directory Layout

```
liquidity-engine/
├── app/                # Next.js App Router: routes, layout, global styles
├── components/ui/      # shadcn/Base-UI presentational primitives
├── lib/                # Shared utilities (currently cn re-export only)
├── public/             # Static SVG assets served verbatim
├── reference/          # Non-runtime spec: HTML mock + ICT domain rules
├── .planning/codebase/ # GSD codebase maps (this file lives here)
├── AGENTS.md           # Agent instructions (Next.js version warning)
├── CLAUDE.md           # Points to AGENTS.md
├── components.json     # shadcn config: style, aliases, theme wiring
├── next.config.ts      # Next.js config (default/empty)
├── tsconfig.json       # TS config: bundler resolution, @/* alias
├── postcss.config.mjs  # PostCSS: tailwindcss v4 plugin
├── eslint.config.mjs   # ESLint: next core-web-vitals + typescript
└── package.json        # Deps: next 16, react 19, base-ui, zustand, charts
```

## Directory Purposes

**app/:**
- Purpose: File-system routing and app shell
- Contains: `layout.tsx` (root shell), `page.tsx` (GET `/`), `globals.css` (theme), `favicon.ico`
- Key files: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

**components/ui/:**
- Purpose: Reusable headless UI primitives, one file per control
- Contains: `button.tsx`, `calendar.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `toast.tsx`
- Key files: `components/ui/button.tsx` (cva variant reference pattern), `components/ui/card.tsx` (slot/container pattern)

**lib/:**
- Purpose: Shared non-UI helpers
- Contains: `lib/utils.ts` only — `export { cn } from "cn"`
- Key files: `lib/utils.ts`

**public/:**
- Purpose: Static assets served at `/`
- Contains: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` (create-next-app defaults)
- Key files: `public/next.svg`, `public/vercel.svg` (referenced by `app/page.tsx`)

**reference/:**
- Purpose: Build spec, NOT imported by runtime code
- Contains: `design.html` (3-panel dashboard mock), `institutional_rules.md` (ICT analysis engine spec)
- Key files: `reference/design.html`, `reference/institutional_rules.md`

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout — fonts, global CSS, html/body scaffold; wraps every route
- `app/page.tsx`: Home route `/` — placeholder landing, replace with dashboard

**Configuration:**
- `package.json`: Scripts (`dev`, `build`, `start`, `lint`) and all dependencies
- `tsconfig.json`: `moduleResolution: bundler`, `jsx: react-jsx`, `@/* → ./*` alias
- `next.config.ts`: Empty default NextConfig — add هن image domains/env here when needed
- `components.json`: shadcn `base-nova` style, `css: app/globals.css`, aliases (`components`, `utils`, `ui`, `lib`, `hooks`)
- `eslint.config.mjs`: `eslint-config-next/core-web-vitals` + typescript presets
- `postcss.config.mjs`: Tailwind v4 PostCSS plugin

**Core Logic:**
- `lib/utils.ts`: `cn` re-export — sole shared helper today
- `reference/institutional_rules.md`: Domain spec for future `lib/` ICT modules (sentiment, dealing range, SMT, execution)

**Testing:**
- No test files, test directories, or runner configs exist in this repo

## Naming Conventions

**Files:**
- Routes: lowercase App Router convention — `layout.tsx`, `page.tsx`
- UI primitives: kebab-case matching component — `dropdown-menu.tsx`, `dialog.tsx`, `toast.tsx`
- Utilities: lowercase single-word — `lib/utils.ts`
- Config: tool-default names — `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`

**Directories:**
- Lowercase plural/case-by-tool: `components/`, `public/`, `reference/`, `app/`, `lib/`
- UI subfolder groups primitives: `components/ui/` (shadcn convention; future `components/charts/`, `components/dashboard/` follow the same grouping)

## Where to Add New Code

**New Feature (e.g. Liquidity Map panel from `reference/design.html`):**
- Primary code: `components/dashboard/<panel-name>.tsx` (new folder; keep `components/ui/` for generic primitives only)
- Page composition: `app/page.tsx` (assemble panels) or new route `app/<route>/page.tsx`
- Domain logic: `lib/<domain>/<module>.ts` (e.g. `lib/liquidity/dealing-range.ts`)
- Tests: No convention yet — co-locate as `<module>.test.ts` next to source when a runner is added

**New Component/Module:**
- Generic primitive (button-like): `components/ui/<name>.tsx` wrapping `@base-ui/react/<name>`, styled with `cn` + tokens
- Feature component (chart, ticket): `components/<feature>/<name>.tsx` with `"use client"` if interactive
- Chart work: new `components/charts/` folder using `lightweight-charts`; reference target layout in `reference/design.html:40-47`

**Utilities:**
- Shared helpers: `lib/` — add `lib/store.ts` (zustand store), `lib/format.ts`, `lib/liquidity/*` for ICT math from `reference/institutional_rules.md`
- Hooks: `hooks/` (alias pre-declared in `components.json:21` but folder does not exist yet — create on first hook)

## Special Directories

**reference/:**
- Purpose: Design mock + domain knowledge base
- Generated: No (hand-authored spec)
- Committed: Yes

**.planning/:**
- Purpose: GSD planning artifacts including these codebase maps
- Generated: Yes (by GSD commands)
- Committed: Yes (check project convention before committing)

**node_modules/next/dist/docs/ (per AGENTS.md):**
- Purpose: Version-pinned Next.js API guides that override training-data assumptions
- Generated: No (ships with the installed `next` package)
- Committed: No (inside `node_modules`) — read before writing framework code

---

*Structure analysis: 2026-09-04*
