<!-- refreshed: 2026-09-04 -->
# Architecture

**Analysis Date:** 2026-09-04

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router (RSC)                  │
│              `app/layout.tsx` + `app/page.tsx`               │
├──────────────────┬──────────────────┬───────────────────────┤
│  UI Primitives   │   Chart Engine   │   Domain Logic        │
│  `components/ui` │ `lightweight-`   │   (planned: lib/)     │
│                  │ `charts`         │                       │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Shared Utilities Layer                    │
│         `lib/utils.ts` → re-export `cn` from `cn` pkg        │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Styling / Theming (Tailwind v4 + shadcn base-nova)          │
│  `app/globals.css` + `components.json`                       │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| RootLayout | App shell: fonts (Geist), html/body scaffold, global CSS import | `app/layout.tsx` |
| Home | Default route `/`; currently stock create-next-app placeholder | `app/page.tsx` |
| Button | cva-based button variants built on Base UI primitive | `components/ui/button.tsx` |
| Calendar | Date picker built on react-day-picker + Button primitives | `components/ui/calendar.tsx` |
| Card | Layout container family (Header/Title/Content/Footer/Action) | `components/ui/card.tsx` |
| Dialog | Modal primitive built on Base UI dialog | `components/ui/dialog.tsx` |
| DropdownMenu | Menu primitive built on Base UI menu | `components/ui/dropdown-menu.tsx` |
| Toast | Notification primitive built on Base UI toast | `components/ui/toast.tsx` |
| cn helper | Class-name merging; single re-export point for whole app | `lib/utils.ts` |
| Reference design | Static HTML mock of target 3-panel Liquidity Engine dashboard | `reference/design.html` |
| Institutional rules | Domain spec: ICT liquidity analysis engine prompt/report format | `reference/institutional_rules.md` |

## Pattern Overview

**Overall:** Next.js App Router with Server Components by default + shadcn/Base-UI headless primitive library + Tailwind v4 theme tokens.

**Key Characteristics:**
- File-system routing: every route is a `page.tsx` under `app/`.
- Server-first: `app/layout.tsx` and `app/page.tsx` are React Server Components (no `"use client"`); interactive primitives live in `components/ui/` as client components.
- Headless-primitive wrapping: each file in `components/ui/` wraps one `@base-ui/react/*` primitive and applies theme classes via `cn` + `cva`.
- Single utility alias: all styling composition goes through `cn` imported from `"cn"` (re-exported by `lib/utils.ts`); path alias `@/*` maps to repo root.

## Layers

**Presentation / Routes:**
- Purpose: Route definitions and page composition.
- Location: `app/`
- Contains: `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico`
- Depends on: `components/ui/*`, `lib/utils.ts`, `next/*`
- Used by: Next.js router directly (no manual imports).

**UI Primitive Library:**
- Purpose: Reusable, theme-aware controls (button, card, dialog, menu, toast, calendar).
- Location: `components/ui/`
- Contains: One file per primitive, `data-slot`-annotated divs, cva variants.
- Depends on: `@base-ui/react/*`, `class-variance-authority`, `cn`, `lucide-react`
- Used by: Route pages (planned: dashboard panels per `reference/design.html`).

**Utilities:**
- Purpose: Shared helpers.
- Location: `lib/`
- Contains: Currently only `lib/utils.ts` (`export { cn } from "cn"`)
- Depends on: `cn` npm package
- Used by: Every file in `components/ui/`

**Styling / Theme:**
- Purpose: Design tokens, dark-mode variant, shadcn base-nova theme wiring.
- Location: `app/globals.css`, `components.json`
- Contains: Tailwind v4 `@theme inline` token map, `:root`/`.dark` oklch variables, `@layer base` defaults
- Depends on: `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`
- Used by: All rendered UI implicitly.

**Reference / Spec (non-runtime):**
- Purpose: Target UI mock and domain knowledge; not imported by app code.
- Location: `reference/`
- Contains: `reference/design.html`, `reference/institutional_rules.md`
- Depends on: Nothing
- Used by: Developers/AI as build spec only.

## Data Flow

### Primary Request Path

1. HTTP GET `/` → Next.js App Router resolves `app/page.tsx` (`app/page.tsx:3`)
2. `RootLayout` wraps page: loads Geist fonts + `app/globals.css` (`app/layout.tsx:20`)
3. `Home` server-renders static JSX (currently `next/image` assets from `public/`) (`app/page.tsx:7`)
4. Response streams as RSC payload → hydrated in browser.

### Planned Domain Flow (from spec, not yet implemented)

1. User opens dashboard → client chart component mounts `lightweight-charts` instance
2. Price/sentiment inputs evaluated through ICT module pipeline (`reference/institutional_rules.md`: Modules 1–4)
3. Derived state (BSL/SSL, Dealing Range, SMT, OTE, ticket) renders into 3-panel layout (`reference/design.html:29-60`)
4. Client state management via `zustand` (dependency installed, no store file yet)

**State Management:**
- `zustand` `^5.0.15` installed but no store exists yet — use it for dashboard state (symbol, timeframe, ticket, confidence) when building. No Redux/Context pattern currently in codebase.

## Key Abstractions

**cn class merger:**
- Purpose: Single class-composition function for conditional Tailwind classes.
- Examples: `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/dialog.tsx`
- Pattern: `import { cn } from "cn"` then `cn("base-classes", className)` — never concatenate strings manually.

**cva variants:**
- Purpose: Type-safe visual variants (e.g. button `variant`/`size`).
- Examples: `components/ui/button.tsx`
- Pattern: `cva(base, { variants, defaultVariants })` + `VariantProps<typeof buttonVariants>` on props; export both component and `buttonVariants`.

**data-slot components:**
- Purpose: Stable selectors for styling/testing nested primitive parts.
- Examples: `components/ui/card.tsx` (`data-slot="card"`, `card-header`, …)
- Pattern: Each sub-component sets `data-slot="<name>"` and merges theme classes; consumers target via `has-data-[slot=...]` Tailwind selectors.

**Base-UI primitive wrap:**
- Purpose: Accessible behavior (dialog/menu/toast) without custom logic.
- Examples: `components/ui/dialog.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/toast.tsx`
- Pattern: `import { X as XPrimitive } from "@base-ui/react/X"` → wrap in themed function component → re-export named parts.

## Entry Points

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Every route render
- Responsibilities: Font variables, `<html lang>`, global CSS, body flex scaffold

**Home page:**
- Location: `app/page.tsx`
- Triggers: GET `/`
- Responsibilities: Landing content (placeholder; replace with Liquidity Engine dashboard per `reference/design.html`)

**Static assets:**
- Location: `public/*.svg`
- Triggers: `next/image` `src="/..."`
- Responsibilities: Logos/icons served verbatim

## Architectural Constraints

- **Threading:** Single-threaded React/Next server + client render; no workers. Chart rendering (`lightweight-charts`) runs on the main thread inside a client component — keep data transforms memoized.
- **Global state:** No module-level singletons exist yet. When adding the `zustand` store, keep exactly one store module (e.g. `lib/store.ts`) and avoid exporting mutable lets from `lib/`.
- **Circular imports:** None currently. Risk point: `components/ui/calendar.tsx` imports `components/ui/button.tsx` (`components/ui/calendar.tsx:12`); do not import calendar back from button. Keep primitive dependency direction one-way.
- **Client/server boundary:** Files under `app/` are Server Components by default. Any component using `lightweight-charts`, `zustand`, event handlers, or browser APIs MUST add `"use client"` in its own file under `components/` — never convert `app/layout.tsx` to a client component.
- **Path alias:** `@/*` maps to repo root (`tsconfig.json`), so `@/components/ui/button` resolves to `components/ui/button`. `components.json` additionally declares `ui → @/components/ui`, `lib → @/lib`, `hooks → @/hooks` aliases — use `@/` prefix for all cross-directory imports.

## Anti-Patterns

### Importing `cn` from relative `lib/utils` path

**What happens:** Importing via `../../lib/utils` instead of the package/alias import.
**Why it's wrong:** Every existing primitive imports `{ cn } from "cn"` (`components/ui/*.tsx`); a second path creates two module identities and breaks consistency.
**Do this instead:** `import { cn } from "cn"` — see `components/ui/card.tsx:2`.

### Putting domain/ICT logic inside `components/ui/`

**What happens:** Adding price-analysis or sentiment math to a primitive file.
**Why it's wrong:** `components/ui/` is a pure presentational layer wrapping Base UI; domain code there cannot be reused by non-UI consumers and pollutes the design system.
**Do this instead:** Put ICT calculations in `lib/` (new modules, e.g. `lib/liquidity/*`) and pass results as props — spec source is `reference/institutional_rules.md`.

### Hardcoding colors instead of theme tokens

**What happens:** Using literal hex/oklch values in `className` for surfaces and text.
**Why it's wrong:** `app/globals.css` defines light/dark token pairs (`--background`, `--card`, …); literals break dark mode.
**Do this instead:** Use token utilities (`bg-card text-card-foreground border-border`) as in `components/ui/card.tsx:14`.

## Error Handling

**Strategy:** Framework-default (no custom error boundaries or handlers yet).

**Patterns:**
- Next.js default error/404 rendering (no `error.tsx` / `not-found.tsx` present).
- No try/catch or Result types in current source; add route-level `error.tsx` when data fetching is introduced.

## Cross-Cutting Concerns

**Logging:** None configured. Use `console` during development; add a structured logger only when server actions/API routes appear.
**Validation:** No schema library installed. Add `zod` (not present) for any user-input or market-data parsing.
**Authentication:** None. No auth provider, middleware, or session handling exists.

---

*Architecture analysis: 2026-09-04*
