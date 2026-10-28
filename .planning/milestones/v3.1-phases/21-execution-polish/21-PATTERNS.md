# Phase 21: Execution Polish - Pattern Map

**Mapped:** 2026-10-27
**Files analyzed:** 8 (5 new, 3 modified)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/ticket.ts` (modify: buffer in resolveSL/resolveTP) | service (pure lib) | transform | `src/lib/ticket.ts` itself (lines 256-286) + `src/lib/pool-prose.ts` rankDistAtr | exact |
| `src/lib/fire-rate.ts` (NEW) | service (pure helper) | transform | `src/lib/pool-prose.ts` (rankDistAtr/distAtrOf) | role-match |
| `components/dashboard/report.tsx` (modify: §5 strip + D-15/D-17) | component | request-response (render over store) | `components/dashboard/report.tsx` itself (§5 block lines 304-340, §1 lines 168-199) | exact |
| `src/lib/pools-parity.test.ts` (NEW) | test (harness) | batch | `src/lib/ict/parity.test.ts` | role-match |
| `src/lib/pool-overlay.test.ts` (extend: D-16 pin) | test | batch | `src/lib/pool-overlay.test.ts` itself | exact |
| `components/ui/slider.tsx` (NEW) | component (primitive) | request-response | `components/ui/button.tsx` | role-match |
| `components/dashboard/threshold-control.tsx` (NEW) | component | request-response | `components/dashboard/ticket-panel.tsx` (risk stepper lines 127-150) | role-match |
| `src/lib/store.ts` (modify: threshold slice) | store | CRUD (clamped setter) | `src/lib/store.ts` itself (setRiskPct lines 1063-1070) | exact |

## Pattern Assignments

### `src/lib/ticket.ts` — modify resolveSL/resolveTP (service, transform)

**Analog:** `src/lib/ticket.ts` lines 256-286 + `src/lib/pool-prose.ts` lines 47-57 (rankDistAtr ATR precedent)

**Imports pattern** — new import is one line beside existing ict imports:
```typescript
import { computeATR } from '@/src/lib/ict/regime';
```
Copy `src/lib/pool-prose.ts` line 9 verbatim for the specifier.

**Core pattern — SL buffer** (extend lines 256-261, keep extremum selection, shift by direction):
```typescript
function resolveSL(direction: 'LONG' | 'SHORT', entry: number, entryFvg: FvgGap, asia: AsiaRange): number | null {
  const sl = direction === 'LONG' ? Math.min(entryFvg.bottom, asia.low) : Math.max(entryFvg.top, asia.high);
  if (direction === 'LONG' && !(sl < entry)) return null;
  if (direction === 'SHORT' && !(sl > entry)) return null;
  return sl;
}
```
Buffer change: compute `buffer = 0.25 * atr` (atr = last value of `computeATR(d1candles)`), then `LONG: sl - buffer`, `SHORT: sl + buffer`, re-applying the same side-of-entry null guards. Signature unchanged.

**Core pattern — TP pull-inside** (extend lines 267-286, same buffer idiom):
```typescript
  if (direction === 'LONG') {
    return {
      tp1: asia.high > entry ? asia.high : null,
      tp2: dol.price > entry ? dol.price : null,
      tp3: range.high > entry ? range.high : null,
    };
  }
```
Each resolving leg moves one `buffer` step toward entry (`LONG: leg - buffer`, `SHORT: leg + buffer`); legs that no longer clear entry become null. TP1-null still STAND_ASIDE (line 347-349).

**Error handling pattern** — unchanged: finite-guard throws naming `computeTicket` (lines 115-215), null envelopes degrade to STAND ASIDE (lines 306-309). R/R gate on TP1 only (lines 359-362) stays; buffered fixtures may flip marginal EXECUTE to STAND ASIDE — recompute, do not relax the gate.

**Validation / test pattern** — extend `src/lib/ticket.test.ts`; copy fixture idiom lines 19-58 (fixtureEntryFvg / fixtureTrigger / fixtureCleanFlaw with overrides-spread).

---

### `src/lib/fire-rate.ts` — NEW (service, transform)

**Analog:** `src/lib/pool-prose.ts` lines 40-57

**Imports pattern:**
```typescript
import { computeATR } from '@/src/lib/ict/regime'; // only if needed; fire-rate itself needs no ATR
import type { FiringLogEntry } from '@/src/lib/ict/trigger'; // check trigger.ts export; store.ts:290 references FiringLogEntry
import { nyDateOf } from '@/src/lib/...'; // session-date idiom — grep nyDateOf in trigger.ts/store.ts for the exact module
```

**Core pattern** (copy distAtrOf guard-first shape, `pool-prose.ts` lines 41-45):
```typescript
export function distAtrOf(pool: LiquidityPool, lastClose: number, atr: number): number | null {
  if (!Number.isFinite(atr) || atr <= 0) return null;
  if (!Number.isFinite(lastClose)) return null;
  return Math.abs(poolMid(pool) - lastClose) / atr;
}
```
Fire-rate helper mirrors this: pure function over `(entries: FiringLogEntry[], nowEpoch: number)` → `{ count7d: number, inBand: boolean }`; guard non-finite inputs to a zero/empty result, windowing by `sessionDate`/7-day span using the `nyDateOf` session idiom (never hand-rolled offsets). Counting reads `verdict FIRE_LONG/FIRE_SHORT` only (appendFiringLog precedent, `store.ts` lines 1032, 1035-1039).

**Error handling:** pure null/empty returns, never throws on empty log (refuse-null honesty: empty log → honest zero count + out-of-band copy).

---

### `components/dashboard/report.tsx` — modify §5 + D-15/D-17 (component, request-response)

**Analog:** `components/dashboard/report.tsx` itself

**§5 insertion pattern** (after/inside `data-slot="s5-paper-ticket"`, lines 321-336):
```tsx
<div data-slot="s5-paper-ticket">
  <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">
    {`${ticket.verdict}${ticket.direction !== null ? ` · ${ticket.direction}` : ''}`}
  </p>
  <p className="text-base">{ticket.reason}</p>
  {ticket.verdict === 'STAND_ASIDE' ? null : (
    <div>
      <p className="font-mono text-xl font-semibold tabular-nums">
        {`Giriş ${ticket.entry === null ? '—' : ticket.entry.toFixed(2)} · Stop ${...}`}
      </p>
      ...
```
Fire-rate strip lands as one sibling `<p>` inside this div: `WHY NOW: {n} fires / 7d — bandda` (in-band) vs distinct honest copy out-of-band. Read `firingLog` via Zustand selector; counting delegates to `fire-rate.ts` helper. Null/error-state branches (lines 312-319: skeleton pulse, `ticketLegError ?? S3_EMPTY_COPY`) are untouched.

**D-15 pattern** (lines 185, 193): add `space-y-1` to `<div data-slot="s1-pain-threshold">` — class-only change, no branch restructure.

**D-17 pattern** (line 168): add `aria-live="polite"` to the §1 live `<section data-slot="report-section">`; `pool-lines`/`pool-ghosts` spans stay `aria-hidden`.

**Shared idioms:** `data-slot` naming, `font-mono tabular-nums` for numbers, `?? S3_EMPTY_COPY` refuse-null honesty, `toFixed(2)` price formatting.

---

### `src/lib/pools-parity.test.ts` — NEW (test harness, batch)

**Analog:** `src/lib/ict/parity.test.ts` lines 1-95

**Imports pattern** (lines 1-11):
```typescript
import { describe, expect, it } from 'vitest';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { evaluateTrigger } from '@/src/lib/ict/trigger';
import type { TriggerOutput } from '@/src/lib/ict/trigger';
import { checkFatalFlaw } from '@/src/lib/ict/invalidation';
import type { FatalFlawOutput } from '@/src/lib/ict/invalidation';
```

**Core pattern — fixture idiom** (lines 18-65): builder functions with `Partial<T>` overrides-spread, NY-session epochs via `fromZonedTime(..., NY_TZ)` (never hand-rolled offsets):
```typescript
function fixtureTriggerJudas(overrides: Partial<JudasOutput> = {}): JudasOutput {
  return { candidate: false, confirmed: false, ..., ...overrides };
}
function nyMinuteEpoch(nyDate: string, hhmm: string): number {
  return Math.floor(fromZonedTime(`${nyDate} ${hhmm}:00`, NY_TZ).getTime() / 1000);
}
```

**Core pattern — flaw driver** (lines 324-336):
```typescript
const FRESH_LEGS = { nq: false, es: false, nq1h: false, nq15m: false };
function flawOf(trigger: TriggerOutput, triple: ParityTriple): FatalFlawOutput {
  return checkFatalFlaw({ trigger, smt: triple.smt, judas: triple.judas, rollover: null, stale: FRESH_LEGS, asOf: triple.asOf });
}
```
Plus `computeTicket` fixtures from `src/lib/ticket.test.ts` lines 19-58.

**Harness shape (input-independence, NOT flag-threading):** run `evaluateTrigger` / `checkFatalFlaw` / `computeTicket` on shared fixtures twice — once with pools selector returning data, once forced null/empty — and `toEqual`-assert the three verdicts identical. Place file at `src/lib/pools-parity.test.ts` (outside `ict/`, purity guard scans `./*.ts` inside `ict/` only). Assert with `toEqual` on outputs (no snapshots), `toBe` on reason keys per `pool-overlay.test.ts` convention.

---

### `src/lib/pool-overlay.test.ts` — extend with D-16 pin (test, batch)

**Analog:** itself, lines 88-103

**Pin pattern:**
```typescript
it('pins rank-1 full hex versus rank-2 rgba 0.5 literals', () => {
  expect(poolLineColor(pool({ side: 'BSL' }), 1, false)).toBe('#00FF88');
  ...
});
it('pins ghost lines to MUTED_GRAY', () => {
  expect(POOL_MUTED_GRAY).toBe('#71717A');
  ...
});
```
D-16 addition: assert overlay literals equal `globals.css` `.dark` tokens (`--terminal-up: #00ff88`, `--terminal-down: #ff00ff`, `app/globals.css` lines 122-123) with `.toLowerCase()` normalization on both sides. Test-only change, no production edit.

---

### `components/ui/slider.tsx` — NEW (component primitive, request-response)

**Analog:** `components/ui/button.tsx` lines 1-57

**Imports pattern** (lines 1-3):
```typescript
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
```
Slider mirrors this: `import { Slider as SliderPrimitive } from "@base-ui/react/slider"`, same `cva` + `cn` + `data-slot="slider"` idiom.

**Core pattern** (lines 42-55):
```tsx
function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
export { Button, buttonVariants }
```
Slider follows identically: Root/Track/Thumb/Indicator/Value composition, `data-slot` attributes, `export { Slider, ... }`. Preferred install: `npx shadcn@latest add slider` (zero new deps — `@base-ui/react@1.9.0` on disk). Fallback if CLI unreachable: hand-author on on-disk `@base-ui/react/slider` parts in this idiom (never Radix).

---

### `components/dashboard/threshold-control.tsx` — NEW (component, request-response)

**Analog:** `components/dashboard/ticket-panel.tsx` lines 127-150 (risk stepper over store value)

**Core pattern:**
```tsx
<div className="flex flex-wrap items-center gap-2">
  <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Risk %</span>
  <Button size="sm" variant="outline" onClick={() => setRiskPct(riskPct - RISK_STEP)} disabled={degraded} data-slot="risk-decrement">−</Button>
  <span data-slot="risk-value" className="font-mono text-xs tabular-nums">{riskPct.toFixed(1)}</span>
  <Button size="sm" variant="outline" onClick={() => setRiskPct(riskPct + RISK_STEP)} disabled={degraded} data-slot="risk-increment">+</Button>
</div>
```
Threshold control mirrors this shape: label + slider + value readout + reset affordance, `data-slot` attributes (`threshold-*`), `disabled={degraded}` parity. Value + default + clamp live in the Zustand slice; slider is presentational. localStorage: lazy `useState(() => read() ?? DEFAULT)` initializer + write-through in the event handler — never module scope, never during render (SSR-safe).

---

### `src/lib/store.ts` — threshold slice (store, CRUD)

**Analog:** itself, lines 1063-1070 + firing-log cap idiom lines 1051-1060

**Setter pattern** (copy verbatim shape):
```typescript
setRiskPct: (pct) => {
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct <= 0) return;
  const clamped = Math.min(RISK_PCT_MAX, Math.max(RISK_PCT_MIN, pct));
  set({ ticketInputs: { riskPct: clamped } });
},
```
New slice: `thresholdInputs: { fireThreshold: number }` (name per planner) + `setFireThreshold` with identical clamp-on-write / refuse-on-garbage shape; default constant stays in code (reset restores it). Validate-on-read for the localStorage-hydrated value (finite + in band, else default). Cap idiom if any list is added: trailing-slice + overflow counter (`appendFiringLog` lines 1051-1060).

**Selector pattern:** `const riskPct = get().ticketInputs.riskPct;` (`store.ts` line 1145) → `computeTicket({... riskPct ...})` (line 1146). Whether the new threshold re-threads into `evaluateTrigger` is a planner decision (RESEARCH open question A4) — default to display/calibration-review only unless the plan pins the threading with replay fixtures.

---

## Shared Patterns

### Purity guard (applies to: fire-rate.ts, parity harness, ticket buffer)
**Source:** `src/lib/ict/purity.test.ts` (self-scan of `ict/*.ts` — no Date.now, no store imports)
New math lives in `src/lib/` or `components/`, never in `src/lib/ict/`. Harness at `src/lib/` level. `sharedEpoch` (`store.ts` lines 480-484) is the only clock boundary.

### Refuse-null honesty (applies to: §5 strip, threshold control)
**Source:** `components/dashboard/report.tsx` lines 178-181 + `pool-overlay.ts` ghosts
Null selector → honest empty copy (`?? S3_EMPTY_COPY` / `Məlumat yoxdur`), never cached values. Ghost/stand-aside states clear, never persist stale lines.

### Finite-guard throws (applies to: ticket buffer, fire-rate helper, overlay mapper)
**Source:** `src/lib/ticket.ts` lines 115-215; `src/lib/pool-overlay.ts` lines 66-68, 86-90
Guards name the function (`computeTicket requires ...`, `poolPriceLines requires finite top and bottom`). Pure helpers return null on degenerate math (SL side-of-entry, TP direction, distAtrOf guards).

### Test file idioms (applies to: parity harness, fire-rate test, color pin)
**Sources:** `src/lib/ict/parity.test.ts`, `src/lib/pool-overlay.test.ts`, `src/lib/ticket.test.ts`
`describe`/`it` from vitest, `@/` path alias, builder-with-overrides fixtures, `toBe` for literals/keys, `toEqual` for structural verdict equality, no snapshots, no component rendering.

### Store clamp-on-write (applies to: threshold slice)
**Source:** `src/lib/store.ts` lines 1063-1070
Refuse garbage (state untouched), clamp to band, single `set` call.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| — | — | — | None. All 8 files have in-repo analogs. The one genuine no-precedent area is localStorage persistence (no existing `localStorage` use in `components/`); planner should use the React lazy-`useState`-initializer + write-through idiom and verify with `next build`. |

## Metadata

**Analog search scope:** `components/ui/`, `components/dashboard/`, `src/lib/*.test.ts`, `src/lib/ict/*.test.ts`, `src/lib/ticket.ts`, `src/lib/store.ts`, `src/lib/pool-prose.ts`, `src/lib/pool-overlay.ts`, `app/globals.css`
**Files scanned:** ~30
**Pattern extraction date:** 2026-10-27
