# Phase 02: Terminal Composition - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 13 (new/modified)
**Analogs found:** 9 / 13 (4 greenfield: Zustand store, lightweight-charts island, zone primitive, fixture JSON)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/store.ts` (NEW) | store | request-response (poll envelope → state) | `src/lib/yahoo.ts` (singleflight + envelope) | partial (data-flow match, role greenfield — no store exists yet) |
| `src/lib/sentiment.ts` (NEW) | utility (pure math) | transform | `src/lib/ict/bias.ts` | exact (pure fn, threshold constants, rationale string) |
| `src/lib/countdown.ts` (NEW, or beside `src/lib/time.ts`) | utility (pure math) | transform | `src/lib/time.ts` | exact (pure, injected clock) |
| `src/lib/fixtures/*.json` (NEW, 2–3 scenarios) | config (static data) | file-I/O | `src/lib/__fixtures__/yahoo-null.json` | role-match |
| `components/dashboard/terminal-shell.tsx` (NEW) | component (client shell) | request-response | `app/layout.tsx` (composition shell) + `app/page.tsx` (anti-pattern to invert) | partial |
| `components/dashboard/status-strip.tsx` (NEW) | component | transform (envelope → LIVE/STALE/CLOSED) | `src/lib/yahoo.ts` lines 300-307 (stale-serve truth) | partial |
| `components/dashboard/panels.tsx` (NEW: liquidity/sentiment/calendar panels) | component | request-response | `components/ui/card.tsx` | role-match |
| `components/dashboard/report.tsx` (NEW: 6-section report) | component | transform (bias/DOL/regime → prose) | `src/lib/ict/bias.ts` + `src/lib/ict/regime.ts` (rationale strings) | partial |
| `components/charts/nq-chart.tsx` (NEW) | component (client-only island) | streaming (poll → setData) | NONE (greenfield — v5 API from `node_modules/lightweight-charts/dist/typings.d.ts` per RESEARCH.md) | no-analog |
| `components/charts/zone-primitive.ts` (NEW) | utility (chart plugin) | streaming | NONE (greenfield — session-highlighting plugin pattern per RESEARCH.md) | no-analog |
| `app/page.tsx` (REPLACE placeholder) | route | request-response | `app/api/yahoo/route.ts` (envelope consumer contract) + current `app/page.tsx` (what to delete) | partial |
| `app/globals.css` (MODIFY: terminal tokens) | config | transform | `app/globals.css` itself (`.dark` block lines 86-118) | exact (self-analog) |
| `*.test.ts` co-located (store, sentiment, countdown, chart-mapper, fixtures) | test | batch | `src/lib/ict/range.test.ts` + `src/lib/time.test.ts` + `src/lib/yahoo.test.ts` | exact |

**Analog search scope:** `src/lib/**`, `src/lib/ict/**`, `app/**`, `components/ui/**` (globbed all three trees; 6 ui primitives, 5 app files, 19 src files).
**Tracked-source gate:** `git ls-files` confirms ALL `src/lib/**`, `app/**`, `package.json`, `tsconfig.json`, `vitest.config.ts` analogs tracked. `components/ui/*` did NOT appear in `git ls-files` output (untracked scaffold on disk) — planner treats those excerpts as on-disk convention, not tracked source; the tracked convention backup is `.planning/codebase/CONVENTIONS.md` (`cn` from `"cn"`, `data-slot`, named exports, no barrels).

## Pattern Assignments

### `src/lib/store.ts` (store, request-response)

**Analog:** `src/lib/yahoo.ts` — client side mirrors the server's singleflight + envelope discipline.

**Imports pattern** (`src/lib/yahoo.ts` lines 1-2; `@/*` alias per `tsconfig.json` lines 21-23 + `vitest.config.ts` line 5):
```ts
import { toBakuYMD } from '@/src/lib/time';
import type { Candle } from '@/src/lib/ict/types';
```

**Core singleflight pattern** (lines 290-293 — copy the guard shape, client side uses a boolean flag):
```ts
const pending = inFlight.get(CACHE_KEY);
if (pending) {
  return pending.then((env) => ({ ...env, candles: env.candles.map((c) => ({ ...c })) }));
}
```

**Envelope truth pattern** (lines 25-31, 125-133 — store holds exactly these fields, nothing more):
```ts
export interface Envelope {
  candles: Candle[];
  contractHint: string;
  lastUpdatedISO: string;
  stale: boolean;
  source: string;
}
export function buildEnvelope(candles: Candle[], now: Date = new Date(), contractHint = `${SYMBOL} · CME`): Envelope {
  return { candles, contractHint, lastUpdatedISO: now.toISOString(), stale: false, source: 'live' };
}
```

**Stale-derivation pattern** (lines 300-307 — status strip derives from THIS, never local clock):
```ts
const warm = payloadCache.get(CACHE_KEY);
const nonRetryable4xx = err instanceof UpstreamError && err.retryable === false && err.status !== undefined && err.status >= 400 && err.status < 500;
if (warm && !nonRetryable4xx && now.getTime() - warm.fetchedAt < MAX_STALE_MS) {
  return { ...warm.payload, candles: warm.payload.candles.map((c) => ({ ...c })), stale: true, source: 'stale' };
}
```

**Error-type pattern** (lines 14-23 — store reuses `UpstreamError` discriminator, never message text):
```ts
export class UpstreamError extends Error {
  readonly retryable: boolean;
  readonly status?: number;
  constructor(message: string, opts: { retryable?: boolean; status?: number } = {}) {
    super(message);
    this.name = 'UpstreamError';
    this.retryable = opts.retryable ?? false;
    if (opts.status !== undefined) this.status = opts.status;
  }
}
```

**Poll constants pattern** (lines 140-147 — client poll reads 60s TTL from here):
```ts
const CACHE_KEY = `${SYMBOL}:D1`;
const CACHE_TTL_MS = 60_000; // client setInterval matches this exactly (D-01)
```

---

### `src/lib/sentiment.ts` (utility pure math, transform)

**Analog:** `src/lib/ict/bias.ts` (full file, 36 lines — one Read extracts everything).

**Module shape to copy** (lines 1-8: type-only imports, re-exported constant, module-local thresholds):
```ts
import type { BiasDirection, BiasOutput, RegimeState } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW } from '@/src/lib/ict/range';

export { ANCHOR_WINDOW };

const BUFFER_LO = 0.48;
const BUFFER_HI = 0.52;
```

**Threshold + rationale pattern** (lines 9-36 — `trueAvg` mirrors this: named constants, early-return degrade, rationale string on every path):
```ts
export function computeBias(position: number, regime: RegimeState, closedCount: number): BiasOutput {
  if (!Number.isFinite(position) || closedCount < ANCHOR_WINDOW) {
    return {
      bias: 'COMPRESSION',
      rationale: `Insufficient history (${closedCount} of ${ANCHOR_WINDOW} closed candles) in ${regime} regime: holding COMPRESSION until the anchor window fills.`,
      position,
      regime,
    };
  }
  // ... BULLISH below BUFFER_LO / BEARISH above BUFFER_HI, each with rationale
}
```
Apply: `EXCLUDED` broker set + `60` crowded threshold as module constants; `trueAvg` returns `{ buy, sell, crowded }` with a rationale/prose field the same way.

**Sibling analog:** `src/lib/ict/dol.ts` lines 6-9 (finite-input guard — copy into `trueAvg` and countdown):
```ts
if (!Number.isFinite(range.high) || !Number.isFinite(range.low) || !Number.isFinite(lastPrice)) {
  throw new Error('computePrimaryDOL requires finite high, low, and lastPrice');
}
```

---

### `src/lib/countdown.ts` (utility pure math, transform)

**Analog:** `src/lib/time.ts` (full file, 17 lines).

**Copy exactly** (lines 1-12 — import surface, constant, injected-`now` default param):
```ts
import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';

export const BAKU_TZ = 'Asia/Baku';
export const CME_TZ = 'America/Chicago';

export function toBakuYMD(d: Date | number): string {
  return formatInTimeZone(d, BAKU_TZ, 'yyyy-MM-dd');
}

export function getAsOfBakuDate(now: Date = new Date()): string {
  return toBakuYMD(now);
}
```
New `formatCountdown(targetISO: string, now: Date = new Date())` lives beside these, same signature discipline: `now` injected, default `new Date()` only at the boundary. Never `Date.now()` inside. Countdown math uses `date-fns` + `date-fns-tz` only (both installed per `package.json` lines 17-18).

---

### `src/lib/fixtures/*.json` (config static data, file-I/O)

**Analog:** `src/lib/__fixtures__/yahoo-null.json` (consumed in `src/lib/yahoo.test.ts` line 3):
```ts
import nullFixture from '@/src/lib/__fixtures__/yahoo-null.json';
```
Pattern: committed JSON under `src/lib/__fixtures__/`, imported directly (works because `tsconfig.json` has `"resolveJsonModule": true`), shape-guarded at import with a hand-rolled guard + vitest shape test (Phase 1 precedent — no zod per RESEARCH.md). Fixture broker keys MUST contain "insta"/"fibogroup" substrings (case-insensitive) so the `trueAvg` exclusion has something to exclude (RESEARCH.md A1).

---

### `components/dashboard/*` (components, request-response)

**Analog:** `components/ui/card.tsx` (on-disk, untracked — see gate note) + `components/ui/button.tsx` + `components/ui/toast.tsx`.

**Card shell pattern** (`card.tsx` lines 1-20 — every panel is a `Card`; `data-slot`, `cn` from `"cn"`, never hardcoded hex):
```tsx
import * as React from "react"
import { cn } from "cn"

function Card({ className, size = "default", ...props }: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 ...",
        className
      )}
      {...props}
    />
  )
}
```
Sub-shells: `CardHeader`/`data-slot="card-header"`, `CardTitle`/`data-slot="card-title"`, `CardContent`/`data-slot="card-content"` (lines 22-79). Named exports only, no barrels (lines 94-102):
```ts
export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent, }
```

**Button pattern** (`button.tsx` lines 5-6, 42-57 — `cva` variants + `data-slot="button"`; manual-refresh `Yenilə` button uses `variant="outline"`/`size="sm"`; scenario switcher uses same):
```tsx
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
// ...
function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (<ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />)
}
export { Button, buttonVariants }
```

**Client-directive pattern** (`toast.tsx` line 1 — every dashboard component starts with this; server-first boundary):
```tsx
"use client"
```
Feature code imports wrappers from `@/components/ui/*`, never `@base-ui/react/*` directly (RESEARCH.md A3). Poll-failure toast uses the singleton manager (`toast.tsx` line 10): `const toast = ToastPrimitive.createToastManager()`.

**Composition-shell analog:** `app/layout.tsx` lines 20-29 (typed props, font variables, flex column body — `TerminalShell` composes panels the same way; never convert `app/layout.tsx` itself):
```tsx
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

---

### `components/dashboard/report.tsx` (component, transform)

**Analogs:** `src/lib/ict/bias.ts` + `src/lib/ict/regime.ts` (rationale-string pattern) + `src/lib/ict/dol.ts` lines 10-22 (blocked-side derivation).

**Blocked-side derivation** (`dol.ts` lines 10-15 + RESEARCH.md: BULLISH → SHORT blocked, BEARISH → LONG blocked, COMPRESSION → both stand down):
```ts
if (bias === 'BULLISH') {
  return { name: DOL_HIGH_NAME, price: range.high };
}
if (bias === 'BEARISH') {
  return { name: DOL_LOW_NAME, price: range.low };
}
```
Report section 2 binds `computeBias` + `computePrimaryDOL` + `computeRegime` outputs directly; rationale strings render verbatim (Azerbaijani prose authored per scenario for MOCK-03, never computed). Blocked side renders struck-through with locked copy `BLOCKED — premium` / `BLOCKED — discount` (D-09).

**Regime degrade pattern** (`regime.ts` lines 42-51 — sections 1,3–6 UNAVAILABLE markers mirror this honest-degrade shape):
```ts
if (closed.length < MIN_CANDLES_FULL) {
  return {
    regime: 'compression',
    rationale: `Insufficient history (${closed.length} of ${MIN_CANDLES_FULL} closed candles): honest degrade to compression until the ATR window fills.`,
    atr: 0,
    avg: 0,
  };
}
```

---

### `app/page.tsx` (REPLACE — route, request-response)

**Analog:** `app/api/yahoo/route.ts` (the contract the new page's client shell consumes) + current `app/page.tsx` (delete target).

**Envelope consumer contract** (`route.ts` lines 6-21 — success envelope vs 502 honesty chain):
```ts
export async function GET() {
  try {
    const envelope = await fetchNQDaily(new Date());
    return Response.json(envelope, {
      headers: {
        'Cache-Control': envelope.stale ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    const message = err instanceof UpstreamError ? err.message : 'upstream unavailable';
    return Response.json({ error: message, retryAfter: 60 }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
    });
  }
}
```
New `page.tsx` stays a Server Component (default export, no `"use client"`, no `next/dynamic ssr:false` inside it — that call lives in the `"use client"` shell per RESEARCH.md Pattern 2). Current `app/page.tsx` lines 1-69 is stock `create-next-app` placeholder (`next/image`, Templates/Deploy links) — replace wholesale, keep nothing.

---

### `app/globals.css` (MODIFY — config, transform)

**Analog:** itself, `.dark` block lines 86-118. Terminal tokens (`#0A0A0F`/`#14141E`/`#00D9FF`, candle greens/magentas, premium/discount bands) enter as new `--vars` under `.dark`, components reference `bg-card`/`text-muted-foreground`-style tokens + `data-slot`, never hardcoded hex (UI-SPEC color contract). Import header to preserve (lines 1-5):
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));
```

---

### Co-located tests (test, batch)

**Analogs:** `src/lib/ict/range.test.ts` + `src/lib/time.test.ts` + `src/lib/yahoo.test.ts` (all tracked).

**Test file skeleton** (`range.test.ts` lines 1-16 — factory helper + `describe`/`it` from vitest):
```ts
import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW, checkReanchor, computeRange } from '@/src/lib/ict/range';

function candle(date: string, price: number, overrides: Partial<Candle> = {}): Candle {
  return { date, open: price, high: price + 15, low: price - 12, close: price + 5, ...overrides };
}
```

**Injected-clock test pattern** (`time.test.ts` lines 18-25 — fixed instants, no `Date.now()`):
```ts
it('March spring-forward pair buckets to the same Baku date with stable +240 offset', () => {
  const before = new Date('2026-03-08T06:59:00Z');
  const after = new Date('2026-03-08T07:01:00Z');
  expect(toBakuYMD(before)).toBe('2026-03-08');
  expect(toBakuYMD(after)).toBe('2026-03-08');
});
```

**Mock-fetch + cache-reset pattern** (`yahoo.test.ts` lines 1-3, 36-44 — `__resetYahooCacheForTests` in `beforeEach`, `noSleep`, hand-built `Response`):
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetYahooCacheForTests, fetchNQDaily, parseChartJson } from '@/src/lib/yahoo';
import nullFixture from '@/src/lib/__fixtures__/yahoo-null.json';
// ...
function okResponse(json: unknown) { return Response.json(json); }
const noSleep = async () => {};
```
Store tests mock `global.fetch` with `okResponse(mockYahooJson(...))` + `noSleep`-style immediates. Note: `vitest.config.ts` line 6 includes only `src/**/*.test.ts` + `app/**/*.test.ts` — chart-mapper test must live under `src/` or `app/` (e.g. `src/components/charts/chart-mapper.test.ts` resolves mapper logic without canvas), NOT bare `components/`.

**Test runner:** `npm run test -- <area>` per task, full `npm run test` per wave (`package.json` line 10: `"test": "vitest run"`).

---

## Shared Patterns

### Pure-math discipline (applies to: `src/lib/sentiment.ts`, `src/lib/countdown.ts`, all selectors)
**Sources:** `src/lib/ict/types.ts` lines 47-49; `src/lib/ict/range.ts` lines 36-41; `src/lib/ict/levels.ts` lines 23-26
```ts
export function closedOnly(candles: Candle[]): Candle[] {
  return candles.filter((c) => !c.forming);
}
function checkReanchor(prev: DealingRange, candle: Candle): boolean {
  if (candle.forming) { return false; } // forming rows never affect math
  return candle.close > prev.high || candle.close < prev.low;
}
export function computeLevels(range: DealingRange, lastClose: number): LevelsOutput {
  if (!Number.isFinite(range.high) || !Number.isFinite(range.low) || !Number.isFinite(lastClose)) {
    throw new Error('computeLevels requires finite high, low, and lastClose');
  }
```
Rules: `forming` rows excluded via `closedOnly`; finite-input guards throwing `Error`; no I/O, no clock inside (clock injected at boundary). `src/lib/ict/*` is READ ONLY this phase — selectors call in, never duplicate.

### Candle shape (applies to: store, chart mapper, fixtures)
**Source:** `src/lib/ict/types.ts` lines 1-8
```ts
export interface Candle {
  date: string; // YYYY-MM-DD business-day string — flows proxy → store → chart untouched (v5 Time accepts it)
  open: number; high: number; low: number; close: number;
  forming?: boolean;
}
```

### Path alias + named exports (applies to: all new files)
**Sources:** `tsconfig.json` lines 21-23 (`"@/*": ["./*"]`); `vitest.config.ts` line 5 (same alias for tests); `card.tsx` lines 94-102 (named exports, no barrels); `lib/utils.ts` convention `cn` from `"cn"`.
Imports of ICT core always `@/src/lib/ict/*`; UI wrappers always `@/components/ui/*`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `components/charts/nq-chart.tsx` | component (client-only island) | streaming | No chart code exists yet. Planner uses RESEARCH.md Patterns 2–3 (`next/dynamic ssr:false` in `"use client"` shell; `chart.addSeries(CandlestickSeries, opts)` v5 API; create-once/`chart.remove()` lifecycle). Grep guard: reject `addCandlestickSeries` in review. |
| `components/charts/zone-primitive.ts` | utility (chart plugin) | streaming | No primitive code exists yet. Planner uses RESEARCH.md Pattern 4 (official session-highlighting `ISeriesPrimitive` pattern, time-boxed spike; overlay-LineSeries fallback with `autoscaleInfoProvider: () => null`). |
| `src/lib/store.ts` (Zustand mechanics) | store | request-response | No Zustand usage exists yet (installed per `package.json` line 27, `zustand 5.0.15`). Planner uses RESEARCH.md Pattern 1 (`create` + `useShallow`, `inFlight` guard, `fetch("/api/yahoo", { cache: "no-store" })`). Envelope/singleflight discipline analogs above (`src/lib/yahoo.ts`) still apply. |
| `src/lib/fixtures/*` contents | config | file-I/O | Shape defined by RESEARCH.md (broker `{broker, longPct, shortPct}[]`, calendar events with `startsAt` ISO, per-scenario prose). Import/shape-test mechanics per `yahoo-null.json` analog above. |

## Metadata

**Analog search scope:** `src/lib/**`, `src/lib/ict/**`, `app/**`, `components/ui/**`
**Files scanned:** ~30 (19 src, 5 app, 6 ui) + `package.json`, `tsconfig.json`, `vitest.config.ts`
**Pattern extraction date:** 2026-09-05
