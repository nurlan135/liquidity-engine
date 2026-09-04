# Coding Conventions

**Analysis Date:** 2026-09-04

## Naming Patterns

**Files:**
- kebab-case for component files: `components/ui/calendar.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/button.tsx`
- lowercase single-word for routes/utilities: `app/page.tsx`, `app/layout.tsx`, `lib/utils.ts`
- Route segments follow Next.js App Router: `app/page.tsx` (route UI), `app/layout.tsx` (shared shell), `app/globals.css` (global styles)

**Functions:**
- PascalCase for React components: `Home`, `RootLayout`, `Button`, `Calendar`, `Card`, `CardHeader`, `CardTitle`, `CalendarDayButton`
- camelCase for helpers/variants: `buttonVariants`, `getDefaultClassNames`
- Compound components share the base name prefix: `Card` + `CardHeader`/`CardContent`/`CardFooter`/`CardAction`/`CardDescription`/`CardTitle` (`components/ui/card.tsx`)

**Variables:**
- camelCase throughout: `geistSans`, `geistMono`, `defaultClassNames`, `showOutsideDays`
- CSS-variable bindings use camelCase handles: `geistSans.variable`, `geistMono.variable` (`app/layout.tsx`)

**Types:**
- Inline prop types via `React.ComponentProps<...>`: `React.ComponentProps<"div">`, `React.ComponentProps<typeof DayPicker>`, `React.ComponentProps<typeof Button>["variant"]`
- Intersections for extension: `React.ComponentProps<typeof DayPicker> & { buttonVariant?: ... }` (`components/ui/calendar.tsx`)
- `cva` + `VariantProps` for variant-typed props: `ButtonPrimitive.Props & VariantProps<typeof buttonVariants>` (`components/ui/button.tsx`)
- Narrow string unions for constrained props: `{ size?: "default" | "sm" }` (`components/ui/card.tsx`), `LayoutProps<"/">` for the root layout (`app/layout.tsx`)

## Code Style

**Formatting:**
- No Prettier config in repo (no `.prettierrc*`, `biome.json`); formatting follows shadcn defaults
- 2-space indentation, double quotes, trailing commas in multiline literals
- Mixed semicolons by origin: scaffold routes use semicolons (`app/page.tsx`, `app/layout.tsx`); shadcn-generated `components/ui/*` omit semicolons (`components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/calendar.tsx`). Match the surrounding file when editing
- Tailwind class strings sorted in shadcn canonical order (layout → box → typography → state/variant modifiers)

**Linting:**
- ESLint 9 flat config in `eslint.config.mjs`: `defineConfig([...nextVitals, ...nextTs])` from `eslint-config-next`
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Run with `npm run lint` (`package.json` — script is bare `eslint`, no path args)
- TypeScript `strict: true`, `noEmit: true`, `jsx: react-jsx`, `moduleResolution: bundler` (`tsconfig.json`)

## Import Organization

**Order:**
1. React / framework imports: `import * as React from "react"`, `import Image from "next/image"`, `import type { Metadata } from "next"`
2. Third-party packages: `@base-ui/react/button`, `class-variance-authority`, `cn`, `react-day-picker`, `lucide-react`
3. Internal aliases: `@/components/ui/button`, `@/lib/utils` (via `@/*` → `./*` in `tsconfig.json`)
4. Relative/sibling and style imports last: `./globals.css` (`app/layout.tsx`)

**Path Aliases:**
- `@/*` maps to repo root (`tsconfig.json` `paths`), so `@/components/...`, `@/lib/...`, `@/app/...` all resolve
- shadcn aliases in `components.json`: `components: @/components`, `utils: @/lib/utils`, `ui: @/components/ui`, `lib: @/lib`, `hooks: @/hooks`
- Bare `cn` import is used (not `@/lib/utils`): `import { cn } from "cn"` in `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/calendar.tsx`; `lib/utils.ts` is a one-line re-export (`export { cn } from "cn"`). Use `from "cn"` in UI components, not a relative path

## Error Handling

**Patterns:**
- No error-handling pattern established — no `try/catch`, error boundaries (`error.tsx`), `not-found.tsx`, or result types exist in `app/`, `lib/`, `components/`
- When adding: use Next.js App Router conventions — `app/**/error.tsx` for route segments, `app/**/not-found.tsx` for missing resources, and throw from server components/actions rather than returning sentinel values
- Client components calling fallible code should surface state via the existing `components/ui/toast.tsx` primitives, not `alert()` or `console.error` in render paths

## Logging

**Framework:** None — no logger, no `console.*` calls in first-party code.

**Patterns:**
- Do not add ad-hoc `console.log`; there is no log aggregation to receive it
- When observability is introduced, add a single `lib/logger.ts` wrapper and call it from route handlers/server actions; keep client components log-free

## Comments

**When to Comment:**
- Sparingly. Current code has zero explanatory comments in `app/`, `lib/`, `components/ui/`; intent is carried by names (`CalendarDayButton`, `buttonVariants`, `showOutsideDays`)
- Comment only non-obvious Tailwind/state couplings (e.g., why a `data-[...]` selector exists) and date/locale edge cases (`components/ui/calendar.tsx` RTL overrides, range-start/middle/end selectors)

**JSDoc/TSDoc:**
- Not used anywhere. Do not add JSDoc to new components; prefer precise prop types (`VariantProps`, string unions) over doc comments

## Function Design

**Size:** Small, single-purpose functions. Examples: `Button` (10-line wrapper, `components/ui/button.tsx`), `CardTitle`/`CardDescription`/`CardAction` (thin `div` wrappers, `components/ui/card.tsx`), `CalendarDayButton` (focused day-cell renderer, `components/ui/calendar.tsx`)

**Parameters:** Props-object with destructuring + rest spread-through:
```tsx
// components/ui/card.tsx
function Card({ className, size = "default", ...props }: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
```
- Defaults via destructuring (`size = "default"`, `showOutsideDays = true`, `captionLayout = "label"`), never `defaultProps`
- Always forward `...props` and merge `className` last via `cn(base, className)`

**Return Values:** Return JSX directly; no intermediate `render*` helpers. Variant computation is extracted to a module-level `cva` object (`buttonVariants`) and invoked at render: `cn(buttonVariants({ variant, size, className }))`

## Module Design

**Exports:** Named exports only for shared modules:
```tsx
// components/ui/button.tsx
export { Button, buttonVariants }
// components/ui/card.tsx
export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
// lib/utils.ts
export { cn } from "cn"
```
- Exception: App Router files use default export for the route component (`export default function Home()`, `export default function RootLayout()`) as required by Next.js
- Import primitives, not whole modules: `import { Button as ButtonPrimitive } from "@base-ui/react/button"` (`components/ui/button.tsx`)

**Barrel Files:** None. Import from the defining file directly (`@/components/ui/button`), never add `components/ui/index.ts`. `lib/utils.ts` is a re-export shim for `cn`, not a barrel — do not accumulate unrelated helpers there; create `lib/<domain>.ts` per domain instead.

**Client/Server boundary:** `"use client"` pragma at the top of interactive components only (`components/ui/calendar.tsx` has it; `components/ui/button.tsx`, `components/ui/card.tsx` do not declare it). Server Components are the default — add `"use client"` only when hooks/event handlers require it.

**Styling contract:** All themeable values go through CSS variables in `app/globals.css` (`--background`, `--primary`, `--radius`, `--chart-1..5`, oklch palette, `.dark` overrides). Components reference tokens (`bg-primary`, `text-muted-foreground`, `ring-ring/50`), never hardcoded hex. New components must use tokens + `data-slot="<name>"` attributes (see `data-slot="button"`, `data-slot="card"`) so Tailwind `in-data-[slot=...]` selectors keep working.

---

*Convention analysis: 2026-09-04*
