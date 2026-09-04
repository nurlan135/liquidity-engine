# Technology Stack

**Analysis Date:** 2026-09-04

## Languages

**Primary:**
- TypeScript ^5 (strict mode) - All app code in `app/`, `components/`, `lib/` (`.tsx`/`.ts`)
- TSX with `react-jsx` transform - React components in `app/page.tsx`, `app/layout.tsx`, `components/ui/*.tsx`

**Secondary:**
- CSS (Tailwind v4 theme syntax) - Theming in `app/globals.css`
- ESM JavaScript - Config files `eslint.config.mjs`, `postcss.config.mjs`

## Runtime

**Environment:**
- Node.js (version pinned by Next 16; `@types/node` ^20 for typings)

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`, ~340KB)

## Frameworks

**Core:**
- Next.js 16.3.4 (App Router) - Full-stack framework; routes in `app/`
- React 19.2.8 + `react-dom` 19.2.8 - UI rendering
- Tailwind CSS ^4 (via `@tailwindcss/postcss` ^4) - Styling, configured in `app/globals.css` + `postcss.config.mjs`

**Testing:**
- None detected - No test runner, assertion library, or `*.test.*`/`*.spec.*` files

**Build/Dev:**
- Next.js built-in (Turbopack/SWC) - `next dev`, `next build`, `next start` in `package.json`
- TypeScript `tsc --noEmit` (strict, `bundler` moduleResolution) - Type checking via `tsconfig.json`
- ESLint ^9 + `eslint-config-next` 16.3.4 (core-web-vitals + typescript presets) - Linting via `eslint.config.mjs`
- shadcn CLI ^4.21.0 (`shadcn` package) - Component scaffolding; config in `components.json`

## Key Dependencies

**Critical:**
- `zustand` ^5.0.15 - Client state management (installed, not yet imported in `app/` or `components/`)
- `lightweight-charts` ^5.2.1 - Financial charting (installed, not yet imported; matches liquidity-engine domain + `reference/design.html`)
- `date-fns` ^4.4.0 + `date-fns-tz` ^3.2.0 - Date/time handling (installed, not yet imported)

**Infrastructure:**
- `@base-ui/react` ^1.8.0 - Headless primitives backing `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/toast.tsx`
- `class-variance-authority` ^0.7.1 - Variant API in `components/ui/button.tsx`, `components/ui/calendar.tsx`
- `cn` ^0.2.5 - Classname merging, re-exported from `lib/utils.ts`, used by all `components/ui/*.tsx`
- `lucide-react` ^1.41.0 - Icons in `components/ui/calendar.tsx`, `components/ui/dialog.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/toast.tsx`
- `react-day-picker` ^10.0.1 - Calendar picker wrapped by `components/ui/calendar.tsx`
- `tw-animate-css` ^1.4.0 - Animation utilities, imported in `app/globals.css`
- `next/font/google` - Font loading (`Geist`, `Geist_Mono`) in `app/layout.tsx`
- `next/image` - Image optimization in `app/page.tsx`

## Configuration

**Environment:**
- No `.env*` files present (`.gitignore` ignores `.env*`; contents never read per policy)
- No `process.env` / `NEXT_PUBLIC_*` references anywhere in `app/`, `lib/`, `components/`
- Fonts loaded via `next/font/google` in `app/layout.tsx` (no external font CDN link)

**Build:**
- `next.config.ts` - Default/empty Next config
- `tsconfig.json` - Strict TS, path alias `@/*` -> `./*`, `next` plugin
- `postcss.config.mjs` - Single plugin `@tailwindcss/postcss`
- `components.json` - shadcn (`base-nova` style, RSC, `lucide` icons, aliases `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`)
- `eslint.config.mjs` - Flat config with Next presets, ignores `.next/`, `out/`, `build/`

## Platform Requirements

**Development:**
- Node.js compatible with Next 16 + React 19; run `npm install` then `npm run dev`
- Lint: `npm run lint` (`next lint` removed; runs `eslint`)

**Production:**
- Any Node host serving `next start` after `next build`; static assets in `public/` (`next.svg`, `vercel.svg`, etc.)
- Default Vercel-oriented scaffold (deploy links in `app/page.tsx`); no Dockerfile or CI config present

---

*Stack analysis: 2026-09-04*
