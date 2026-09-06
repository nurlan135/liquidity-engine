# Phase 1: Data Foundation & ICT Core - Pattern Map

**Mapped:** 2026-09-04
**Files analyzed:** 13 (11 new, 2 modified)
**Analogs found:** 4 / 13 (codebase is a fresh scaffold — most Phase 1 files are greenfield; planner uses RESEARCH.md sketches where no analog exists)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/api/yahoo/route.ts` | route | request-response | `app/page.tsx` (App Router server-component convention) | partial |
| `src/lib/yahoo.ts` | service | request-response | — (no fetch/service layer exists) | none |
| `src/lib/time.ts` | utility | transform | — (no TZ util exists; `date-fns-tz` installed, unwired) | none |
| `src/lib/ict/types.ts` | model | transform | — | none |
| `src/lib/ict/range.ts` | service | transform | — | none |
| `src/lib/ict/levels.ts` | service | transform | — | none |
| `src/lib/ict/bias.ts` | service | transform | — | none |
| `src/lib/ict/dol.ts` | service | transform | — | none |
| `src/lib/ict/regime.ts` | service | transform | — | none |
| `src/lib/ict/rollover.ts` | service | transform | — | none |
| `src/lib/ict/*.test.ts` + `src/lib/*.test.ts` | test | batch | — (no test infra exists) | none |
| `vitest.config.ts` | config | batch | `next.config.ts` (typed config-object convention) | partial |
| `package.json` (modify: add vitest + test scripts) | config | batch | `package.json` itself | exact |
| `tsconfig.json` (modify only if needed) | config | batch | `tsconfig.json` itself | exact |

**Match-quality legend:** exact = same role + same data flow · role-match = same role · partial = convention-level only · none = greenfield, use RESEARCH.md.

## Pattern Assignments

### `app/api/yahoo/route.ts` (route, request-response)

**Analog:** `app/page.tsx` (partial — only App Router module conventions transfer; there is no existing Route Handler in the repo)

**App Router module pattern** (from `app/page.tsx`, git-tracked):
```tsx
import Image from "next/image";

export default function Home() {
```
- Route files are server-side modules by default; the proxy must stay server-only — never fetch Yahoo from client code (Pitfall 1).
- Do NOT add `"use client"` anywhere on this path, and do NOT convert `app/layout.tsx` to a client component (locked constraint from CONTEXT.md).

**Route Handler shape** — no in-repo analog; copy from RESEARCH.md Pattern 1 (verified against `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:49-67`):
```ts
export const dynamic = 'force-dynamic';
export const maxDuration = 15;
export async function GET() { return Response.json({ candles, lastUpdatedISO, stale, source }); }
```
- Success responses carry `Cache-Control: public, s-maxage=60, stale-while-revalidate=30`; 502s carry `Cache-Control: no-store`.
- Thin handler: all fetch/failover/backoff/cache logic lives in `src/lib/yahoo.ts` (fetch-injectable, unit-testable); the route only calls it and maps the result to the envelope / 502.

---

### `src/lib/yahoo.ts` (service, request-response)

**Analog:** none — no fetch or service layer exists in the codebase. Greenfield; copy RESEARCH.md Q1 + Code Examples sketches verbatim as the starting point:

**Host/failover/backoff sketch** (RESEARCH.md §Code Examples):
```ts
// src/lib/yahoo.ts — fetch injectable for tests
const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', 'Accept': 'application/json', 'Accept-Language': 'en-US,en;q=0.9', 'Referer': 'https://finance.yahoo.com/' };
export async function fetchNQDaily(now: Date, fetchFn = fetch, sleep = realSleep) {
  const p1 = Math.floor(now.getTime() / 1000) - 182 * 86400, p2 = Math.floor(now.getTime() / 1000);
  // attempts alternate hosts; delays 500→1000→2000ms ±25% jitter; honor Retry-After (cap 10s); retry 429/5xx/network + chart.error throttle only
}
```
- Fixed URL, no params parsed (D-01 kills SSRF: `period1`/`period2` computed server-side from injected `now`).
- Singleflight: module-level `Map<string, Promise<Payload>>` keyed `NQ=F:D1`, `.finally()` deletes the key.
- 60s module-level `Map<string, { payload, fetchedAt }>` cache; validate-then-cache; never cache errors.

**Shape-guard + null-row filter sketch** (RESEARCH.md §Code Examples):
```ts
export function parseChartJson(json: unknown): { candles: Candle[]; contractHint: string } {
  const r = json?.chart?.result?.[0]; if (json?.chart?.error || !r?.timestamp) throw new UpstreamError('soft-throttle-or-drift');
  const q = r.indicators?.quote?.[0]; if (!q) throw new UpstreamError('missing-quote');
  // zip by index, drop rows with non-finite O/H/L/C (last row → forming:true if close finite), map ts → toBakuYMD, assert ascending + symbol match
}
```
- Never read `adjclose` (D-08). Check `chart.error` before `chart.result` (Pitfall B).

---

### `src/lib/time.ts` (utility, transform)

**Analog:** none — no time util exists. `date-fns` 4.4.0 + `date-fns-tz` 3.2.0 are installed (package.json, git-tracked) but unwired.

**Time util shape** — copy RESEARCH.md Q3 (exports verified present in installed `date-fns-tz` 3.2.0):
```ts
export const BAKU_TZ = 'Asia/Baku';
export const CME_TZ = 'America/Chicago';
export function toBakuYMD(d: Date | number, now?: never): string // formatInTimeZone(d, BAKU_TZ, 'yyyy-MM-dd')
export function getAsOfBakuDate(now: Date = new Date()): string  // injected clock: tests pass explicit now
export function bakuOffsetMinutes(at: Date): number              // getTimezoneOffset(BAKU_TZ, at) — stable +240, asserted not assumed
```
- Exactly two TZ imports: `formatInTimeZone`, `getTimezoneOffset` from `date-fns-tz`. Never `@date-fns/tz`, never hand `+4h` offsets (Pitfalls 3, 9).
- Injected clock everywhere (`now: Date = new Date()` default); no `Date.now()` inside, no `Intl` in `src/lib/ict` (D-16).

---

### `src/lib/ict/types.ts` (model, transform)

**Analog:** none. Canonical contract for all downstream consumers + Phase 2 fixtures (Pitfall 10). Copy RESEARCH.md Q2 sketch:
```ts
interface Candle { date: string; open: number; high: number; low: number; close: number; forming?: boolean }
interface DealingRange { high: number; low: number; eq: number; window: number; asOf: string; thinHistory: boolean }
```
- Plus `BiasOutput` (mandatory `rationale: string`), `DOLTarget { name, price }`, `RegimeOutput`, `RolloverFlag`, and shared `closedOnly(candles)` helper that filters `forming` rows at every ict entry point (D-04, Pitfall C).

---

### `src/lib/ict/range.ts` (service, transform)

**Analog:** none. Copy RESEARCH.md Q2 `range.ts` rules:
- Inputs `(closed: Candle[], asOfBakuDate: string, window = 20)`; never fetches or trims (D-05).
- `high = max(high)`, `low = min(low)` over last `window`; `thinHistory = closed.length < window`.
- Re-anchor only on D1 **close** beyond either extreme; wick pierce → no action (D-06). Guard `high === low` → position 0.5.

### `src/lib/ict/levels.ts` (service, transform)

**Analog:** none. Copy RESEARCH.md Q2 `levels.ts` formulas (D-13, ICT-02):
- `eq = (high + low) / 2`; `q1 = low + 0.25·range`, `q3 = low + 0.75·range`; `position = (close − low) / (high − low)`.
- Absolute-price OTE pockets: bull `{ lo: high − 0.79·range, hi: high − 0.62·range }`, bear mirror `{ lo: low + 0.62·range, hi: low + 0.79·range }`.

### `src/lib/ict/bias.ts` (service, transform)

**Analog:** none. Copy RESEARCH.md Q2 `bias.ts` rule table + sketch (D-09, D-10, ICT-04):
```ts
export function computeBias(p: { position: number; regime: 'expansion' | 'compression'; nClosed: number }): BiasOutput {
  if (p.nClosed < ANCHOR_WINDOW) return { bias: 'COMPRESSION', rationale: `insufficient history (${p.nClosed}<${ANCHOR_WINDOW}); degrading honestly`, position: p.position };
  if (p.position >= 0.48 && p.position <= 0.52) return { bias: 'COMPRESSION', rationale: `equilibrium-fair at ${p.position.toFixed(2)}; regime=${p.regime}`, ... };
  const bull = p.position < 0.48;
  return { bias: bull ? 'BULLISH' : 'BEARISH', rationale: `${bull ? 'discount' : 'premium'} at ${p.position.toFixed(2)}; ${bull ? 'longs only in discount' : 'shorts only in premium'}; regime=${p.regime}`, ... };
}
```
- `rationale` required on every output; English strings (D-17).

### `src/lib/ict/dol.ts` (service, transform)

**Analog:** none. Copy RESEARCH.md Q2 `dol.ts` rule table (D-11, ICT-05): BULLISH → `range.high` (`"Range High / PDH"`); BEARISH → `range.low` (`"Range Low / PDL"`); COMPRESSION → nearer extreme + rationale `"equilibrium — nearest liquidity; await expansion"`.

### `src/lib/ict/regime.ts` (service, transform)

**Analog:** none. Copy RESEARCH.md Q2 `regime.ts` rule table (D-12, ICT-06): Wilder ATR(14) vs SMA(ATR(14), 20); `< 34` bars → Compression with honest-degrade rationale; binary output, no neutral band.

### `src/lib/ict/rollover.ts` (service, transform)

**Analog:** none. Copy RESEARCH.md Q2 `rollover.ts` tripwire (D-07, ICT-07): `|close[i] − close[i−1]| > 3 × ATR(14)` → `rolloverSuspect: true` + `contractHint` from Yahoo `meta` + third-Friday ±10d proximity warning; flag-and-continue, never freeze.

---

### Co-located `*.test.ts` (test, batch)

**Analog:** none — no test infra exists. Conventions (locked by CONTEXT.md D-14/D-15 + codebase STRUCTURE.md):
- Co-located `<module>.test.ts` next to each module (`src/lib/ict/range.test.ts`, `src/lib/time.test.ts`, `src/lib/yahoo.test.ts`, …).
- `vitest` globals: `describe/it/expect`, `vi.fn`/`vi.useFakeTimers` for clock + backoff tests; all fetch mocked — no network in tests.
- Fixture strategy: synthetic builders (`mkCandles(n, startPrice, drift)`); one Yahoo JSON fixture with mid-array null run (`src/lib/__fixtures__/yahoo-null.json`); one 250pt-gap fixture for rollover; DST instants as literal ISO strings (`2026-03-08T06:59Z` vs `2026-03-08T07:01Z`; November `2026-11-01T06:00Z` window; midnight-boundary `2026-06-15T19:59Z`/`20:01Z`).

---

### `vitest.config.ts` (config, batch)

**Analog:** `next.config.ts` (partial — typed config-object default-export convention, git-tracked):
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```
- Mirror that shape with vitest's `defineConfig`. Copy RESEARCH.md Q3 (include globs verified against vitest docs):
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'app/**/*.test.ts'] },
});
```
- Hand `resolve.alias` (no `vite-tsconfig-paths` dep). Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

---

### `package.json` / `tsconfig.json` (modify, config)

**Analog:** themselves (exact, git-tracked).
- `package.json`: add `vitest` (^5.0.0 per RESEARCH.md registry check) to `devDependencies` + `test`/`test:watch` scripts. Zero new runtime deps.
- `tsconfig.json`: `@/* → ./*` (lines 21-23) already resolves `@/src/...` — no alias change strictly required (RESEARCH.md). `include` already covers `**/*.ts`; new `src/**/*.test.ts` files are picked up automatically. Only touch if vitest types need `types: ["vitest/globals"]` (prefer explicit imports instead — no change).

## Shared Patterns

### Path alias `@/*` → repo root
**Source:** `tsconfig.json` (lines 21-23), git-tracked
```json
"paths": {
  "@/*": ["./*"]
}
```
**Apply to:** all `src/lib/**` imports and `vitest.config.ts` alias. Import domain code as `@/src/lib/ict/range`, TZ helpers as `@/src/lib/time`. D-15 migration (root `lib/` → `src/lib/ict`) uses this alias; existing `lib/utils.ts` (`export { cn } from "cn"` — scaffold file, present on disk, **not git-tracked**) stays untouched. Note: `cn` is imported from the `"cn"` package (see `components/ui/button.tsx` line 3), not a relative path — do not "fix" that import.

### Server-first App Router boundary
**Source:** `app/layout.tsx` + `app/page.tsx` (git-tracked)
- `app/` modules are Server Components by default; `app/layout.tsx` is a server component and must NEVER be converted to client (locked constraint).
- The Yahoo proxy is a Route Handler (`app/api/yahoo/route.ts`), the sole Yahoo caller. No `"use client"`, no client-side fetch of Yahoo.

### Strict purity for `src/lib/ict`
**Source:** no analog — locked by CONTEXT.md D-16. Restate as enforceable rule:
- No I/O, no `Date.now()`, no `Intl`, no store imports in `src/lib/ict`. Time injected (`asOfBakuDate`). Enforce by `grep` for `zustand|Date.now|Intl` under `src/lib` at review time (Pitfall 8).

### Error honesty (envelope, not exceptions, at the boundary)
**Source:** no analog — locked by CONTEXT.md D-02/D-03 + RESEARCH.md Q1:
- Upstream fail + warm cache → `stale:true, source:'stale'`, `lastUpdatedISO` unchanged. Upstream fail + empty cache → `502 { error, retryAfter: 60 }`, `Cache-Control: no-store`. Never cache errors, never synthesize candles.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/lib/yahoo.ts` | service | request-response | No fetch/service layer exists in scaffold; use RESEARCH.md Q1 + sketches |
| `src/lib/time.ts` | utility | transform | No TZ util exists; `date-fns-tz` installed but unwired; use RESEARCH.md Q3 |
| `src/lib/ict/types.ts` | model | transform | No domain models exist; use RESEARCH.md Q2 sketch |
| `src/lib/ict/range.ts` | service | transform | No domain logic exists; use RESEARCH.md Q2 rules |
| `src/lib/ict/levels.ts` | service | transform | Same as above |
| `src/lib/ict/bias.ts` | service | transform | Same as above |
| `src/lib/ict/dol.ts` | service | transform | Same as above |
| `src/lib/ict/regime.ts` | service | transform | Same as above |
| `src/lib/ict/rollover.ts` | service | transform | Same as above |
| `src/lib/**/*.test.ts` | test | batch | No test runner or test files exist; use RESEARCH.md Validation Architecture § |

## Metadata

**Analog search scope:** repo root excluding `node_modules` — `app/`, `lib/`, `components/ui/`, `reference/`, `*.config.*`, `tsconfig.json`, `package.json` (13 files on disk; full tracked list verified via `git ls-files`)
**Files scanned:** 13 new/modified files classified; 6 existing source files read (`lib/utils.ts`, `app/layout.tsx`, `app/page.tsx`, `components/ui/button.tsx`, `next.config.ts`, `tsconfig.json`, `package.json`)
**Tracking note:** `lib/utils.ts` and `components/ui/*` exist on disk but are **not git-tracked** (untracked scaffold, not gitignored — confirmed via `git check-ignore`). They are cited above for import conventions only, never as structural analogs. All other cited analogs (`app/layout.tsx`, `app/page.tsx`, `next.config.ts`, `tsconfig.json`, `package.json`) are git-tracked. No `node_modules` paths emitted.
**Pattern extraction date:** 2026-09-04
