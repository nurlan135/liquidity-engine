# Testing Patterns

**Analysis Date:** 2026-09-04

## Test Framework

**Runner:**
- None installed. No `jest`, `vitest`, `playwright`, `cypress`, or `@testing-library/*` in `package.json` devDependencies (only `eslint`, `eslint-config-next`, `tailwindcss`, `typescript`, `@types/*`)
- No config files present: no `jest.config.*`, `vitest.config.*`, `vitest.setup.*`, `playwright.config.*`, `cypress.config.*` at repo root
- Closest existing signals: `.gitignore` reserves `/coverage` (default Jest/Vitest output dir) and `npm-debug.log*` — aspirational only, no tooling wired up

**Assertion Library:**
- Not applicable — none installed

**Run Commands:**
```bash
npm run lint   # eslint (only automated check currently wired; script is bare `eslint`)
npm run build  # next build (type + production check via `tsconfig.json`: strict, noEmit)
npm run dev    # next dev (manual verification only at this stage)
```

No test commands exist. Do not invent `npm test` until a runner is added.

## Test File Organization

**Location:**
- No pattern established — zero `*.test.*` / `*.spec.*` files outside `node_modules/`
- Prescribed: co-locate unit tests next to the module under test (`lib/format.ts` → `lib/format.test.ts`, `components/ui/button.tsx` → `components/ui/button.test.tsx`)

**Naming:**
- Prescribed: `<module>.test.{ts,tsx}` for unit/integration (Vitest convention, matches `tsconfig.json` include of `**/*.ts(x)` so tests typecheck without config changes)

**Structure:**
```
lib/<domain>.ts            # unit under test
lib/<domain>.test.ts       # co-located unit test (to be created)
components/ui/<name>.tsx
components/ui/<name>.test.tsx  # component test (to be created)
```

## Test Structure

**Suite Organization:**
No in-repo examples. When Vitest is adopted, follow this pattern (consistent with the codebase's named-export module design in `lib/utils.ts`, `components/ui/button.tsx`):

```typescript
import { describe, expect, it } from "vitest";
import { cn } from "cn";

describe("cn", () => {
  it("merges conflicting tailwind classes", () => {
    expect(cn("px-2 px-4")).toBe("px-4");
  });
});
```

**Patterns:**
- Setup pattern: none established — prefer top-level `describe` per module, `it` per behavior; use `beforeEach` only for shared mutable fixtures (zustand stores — see below)
- Teardown pattern: none established — reset zustand stores between tests via `useStore.setState(initialState)` in `beforeEach`, not module re-imports
- Assertion pattern: none established — use `expect(...).toBe/toEqual/toMatchObject`; for class strings use exact `toBe` (class order from `cn`/`cva` is deterministic)

## Mocking

**Framework:** None installed. Prescribed: Vitest built-ins (`vi.mock`, `vi.fn`, `vi.spyOn`) — no separate mocking library needed.

**Patterns:**
No in-repo examples. Prescribed pattern for this stack:

```typescript
import { vi } from "vitest";

// Mock next/font/google (loads binary font data at build time)
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));
```

**What to Mock:**
- `next/font/google` (`Geist`, `Geist_Mono` in `app/layout.tsx`) — font loading requires network/build artifacts
- `next/image` and `next/link` in component tests — assert passthrough props, not image optimization
- `lightweight-charts` chart instances — mock the chart API surface; test data transformation, not canvas rendering
- `date-fns` / `date-fns-tz` timezone-dependent helpers only when asserting formatting — otherwise use fixed dates with explicit `timeZone`

**What NOT to Mock:**
- `cn` / `class-variance-authority` — assert real class output (e.g., `buttonVariants({ variant: "destructive" })` contains `text-destructive`); mocking these defeats the test
- Pure `lib/` helpers — test directly
- zustand stores — test with real store + `setState` reset, not mocked selectors

## Fixtures and Factories

**Test Data:**
No fixtures exist. Prescribed: factory functions returning fresh objects per test (avoids shared-mutable leakage, critical once zustand stores hold liquidity/position state):

```typescript
function makePosition(overrides = {}) {
  return { symbol: "AAPL", qty: 100, side: "long" as const, ...overrides };
}
```

**Location:**
- Prescribed: `lib/__fixtures__/<domain>.ts` for shared domain factories; inline factories at top of the test file for single-use data
- Do not create a top-level `test/` or `fixtures/` dir — keep fixtures close to `lib/` consumers via the `@/lib` alias

## Coverage

**Requirements:** None enforced. `tsconfig.json` has `strict: true` and `next build` as the current quality gate in place of coverage.

**View Coverage:**
```bash
# Not configured. After adding vitest with --coverage flag:
# npx vitest run --coverage   # writes to /coverage (already gitignored in .gitignore)
```

## Test Types

**Unit Tests:**
- Not used. Prescribed first targets: `lib/utils.ts` re-export (`cn` truth-table), `buttonVariants` variant/size matrix in `components/ui/button.tsx`, date helpers once `date-fns` logic lands in `lib/`

**Integration Tests:**
- Not used. Prescribed: zustand store transitions (action → state → selector output) and server-action round trips once those layers exist

**E2E Tests:**
- Not used. No Playwright/Cypress config. Prescribed (when UI flows stabilize): Playwright for critical paths only (page load at `app/page.tsx`, dialog/calendar interactions in `components/ui/dialog.tsx`, `components/ui/calendar.tsx`); unit-test everything else

## Common Patterns

**Async Testing:**
No examples. Prescribed: `async/await` with `findBy*` queries for React component tests; `await act(async () => ...)` for state updates in zustand-backed components.

**Error Testing:**
No examples (no `error.tsx` boundaries, no `try/catch` in first-party code). Prescribed: once `app/**/error.tsx` segments are added, test by throwing in the segment under test and asserting the boundary renders; for `lib/` validators, assert thrown `Error` instances with `expect(fn).toThrowError(...)`, not silent `null` returns.

---

*Testing analysis: 2026-09-04*
