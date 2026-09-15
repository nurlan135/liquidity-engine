# Phase 17: Paper Ticket + §§4–6 Live UI + Chart Pins - Pattern Map

**Mapped:** 2026-09-11
**Files analyzed:** 14 new/modified files
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/ticket.ts` (NEW) | service (pure derivation lib, outside `ict/`) | transform (fixed-order derivation) | `src/lib/ict/trigger.ts` + `src/lib/confluence.ts` | exact (trigger for derivation shape; confluence for outside-`ict/` placement) |
| `src/lib/ticket.test.ts` (NEW) | test (co-located unit) | transform | `src/lib/confluence.test.ts` + `src/lib/ict/invalidation.test.ts` | exact |
| `src/lib/ticket-vocabulary.test.ts` (NEW, or inside `ticket.test.ts`) | test (grep guard) | file-I/O (raw-text scan) | `src/lib/ict/purity.test.ts` | exact |
| `src/lib/store.ts` (MOD — `ticketInputs` slice + `selectTicket` + `paperLog`) | store (Zustand slice + derived selector) | request-response (derive during render) | `src/lib/store.ts` lines 435-443 (`sharedEpoch`), 841-906 (`selectTrigger`/`selectFatalFlaw`/`appendFiringLog`) | exact (self-analog) |
| `src/lib/store.test.ts` (MOD — extend) | test (store selector) | request-response | `src/lib/store.test.ts` lines 1110-1420 (trigger/flaw selector tests) | exact (self-analog) |
| `src/lib/report.ts` (MOD — §§4–6 `unavailable` → `live`, §5 PAPER prefix) | config (pure constants) | transform | `src/lib/report.ts` lines 17-24 (self-analog) | exact (self-analog) |
| `src/lib/report.test.ts` (MOD — literal update) | test (contract literals) | transform | `src/lib/report.test.ts` lines 8-32 (self-analog) | exact (self-analog) |
| `src/lib/chart-mapper.ts` (MOD only if `ticketLineInputs` guard needed) | utility (finite-guard mapper) | transform | `src/lib/chart-mapper.ts` lines 43-59 (`asiaLineInputs`) | exact (self-analog) |
| `components/dashboard/execution-protocol.tsx` (NEW) | component (thin render panel) | request-response | `components/dashboard/sentiment-panel.tsx` + `components/dashboard/report.tsx` §3 block | role-match |
| `components/dashboard/ticket-panel.tsx` (NEW) | component (thin render panel + inputs + CTAs) | request-response | `components/dashboard/sentiment-panel.tsx` (Card+Button) + `components/dashboard/report.tsx` | role-match |
| `components/dashboard/fatal-flaw.tsx` (NEW) | component (thin render panel) | request-response | `components/dashboard/sentiment-panel.tsx` + `components/dashboard/report.tsx` §3 block | role-match |
| `components/dashboard/report.tsx` (MOD — §§4–6 live blocks) | component (report render) | request-response | `components/dashboard/report.tsx` lines 116-181 (§3 live block, self-analog) | exact (self-analog) |
| `components/dashboard/terminal-shell.tsx` (MOD — 3 cards → live panels + PAPER banner) | component (shell composition) | request-response | `components/dashboard/terminal-shell.tsx` lines 74-84, 112-131, 283-335, 340-378 (self-analog) | exact (self-analog) |
| `components/charts/nq-chart.tsx` (MOD — `T` pin + entry/SL/TP lines) | component (canvas overlay) | event-driven (props → canvas) | `components/charts/nq-chart.tsx` lines 63-106, 205-242, 341-472 (self-analog) | exact (self-analog) |
| `vitest.config.ts` (MOD only if `.test.tsx` chosen — Pitfall 5 decision) | config | batch | `vitest.config.ts` lines 4-13 (self-analog) | exact (self-analog) |

## Pattern Assignments

### `src/lib/ticket.ts` (service, transform)

**Analog:** `src/lib/ict/trigger.ts` (derivation shape) + `src/lib/confluence.ts` (placement outside `ict/`)

**Placement / header pattern** — copy from `src/lib/confluence.ts` lines 4-12:
```typescript
// Selector-level scoring lives here, never inside src/lib/ict, so ict purity holds. Pure: no clock reads, no store imports.
```
New file header must state: brokerage math, not ICT methodology → lives beside `confluence.ts`; pure: injected `asOf`, no store imports, no `Date.now`. This keeps the `ict` purity guard (`purity.test.ts` globs `./*.ts` only inside `ict/`) from ever scanning it.

**Imports pattern** — copy from `src/lib/ict/trigger.ts` lines 1-7 and `src/lib/ict/invalidation.ts` lines 1-4:
```typescript
import type { TriggerOutput } from '@/src/lib/ict/trigger';
import type { FatalFlawOutput } from '@/src/lib/ict/invalidation';
import type { FvgGap } from '@/src/lib/ict/fvg';
import type { LevelsOutput } from '@/src/lib/ict/levels';
```
Type-only imports via `@/` alias; consume `TriggerOutput`/`FatalFlawOutput`/`FvgGap`/`LevelsOutput` — never re-derive gates (see Don't Hand-Roll).

**Exported-constant pattern** — copy from `src/lib/ict/trigger.ts` lines 19-30:
```typescript
/** Killzone open in NY wall-clock minutes since midnight, exclusive (D-01). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1-4 fires/week (TRIG-04).
export const TRIGGER_KZ_START_MIN = 120;
export const TRIGGER_DISP_MULT = 0.5;
export const TRIGGER_LOG_CAP = 50;
```
New constants: `export const TICKET_RR_MIN = 3;` (+ `PAPER_EQUITY_USD`, `NQ_POINT_VALUE` per OQ-1) with the same `CALIBRATION-PROVISIONAL` comment style + one-line doc comment. Boundary tests pin them.

**Verbatim-reason pattern** — copy from `src/lib/ict/trigger.ts` lines 82-108 and `src/lib/ict/invalidation.ts` lines 70-90:
```typescript
const REASON_FIRE_LONG =
  'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.';
const REASON_BY_KEY: Record<TriggerReasonKey, string> = { FIRE_LONG: REASON_FIRE_LONG, /* ... */ };
```
Ticket reasons: one `const` per gate-fail + `REASON_BY_KEY`-style lookup; Azerbaijani sentences test-pinned with `toBe`, never interpolated — except the R/R-fail reason which MUST name the computed ratio (e.g. `"R/R 1:1.8 — EXECUTE blocked"` — the single sanctioned interpolation; planner locks format).

**Boundary-throw pattern** — copy from `src/lib/ict/trigger.ts` lines 159-190 (`assertValidJudas`) and lines 266-278 (`evaluateTrigger` entry guard):
```typescript
function assertValidJudas(judas: TriggerInput['judas']): void {
  if (judas === null || judas === undefined) return;  // null degrades honestly downstream — never throws here
  if (typeof judas !== 'object' || Array.isArray(judas)) {
    throw new Error(`evaluateTrigger requires a JudasOutput object or null, got ${String(judas)}`);
  }
  // ... field-level got-string errors
}
export function evaluateTrigger(input: TriggerInput): TriggerOutput {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`evaluateTrigger requires an input object, got ${String(input)}`);
  }
  if (!Number.isFinite(asOf) || (asOf as number) <= 0) {
    throw new Error(`evaluateTrigger requires a finite positive asOf epoch, got ${String(asOf)}`);
  }
```
`computeTicket` copies this exactly: object-shape guard with `got ${String(x)}` errors; `asOf` finite-positive guard; `assertValid*` helpers per envelope that return on null (honest STAND ASIDE downstream) and throw only on malformed shapes. Also copy `displacementGate` null-copy return (`{ pass: false, entryFvg: null }`, lines 239-244) for each fixed-order step.

**Core derivation pattern** — copy from `src/lib/ict/trigger.ts` lines 304-351 (count → verdict → single return object carrying `inputs` + `reason`):
```typescript
const passes = (timing ? 1 : 0) + (purged ? 1 : 0) + (displacement ? 1 : 0);
let verdict: TriggerVerdict; let reasonKey: TriggerReasonKey; let entry: FvgGap | null;
if (passes <= 1) { verdict = 'WAIT_FOR_MANIPULATION'; /* ... */ }
// ...
return { verdict, direction, reasonKey, reason: REASON_BY_KEY[reasonKey] + smtSuffix(judas, smt),
  gates: { timing, purge: purged, displacement }, entryFvg: entry,
  inputs: { judas: judas ?? null, amd: amd ?? null, smt: smt ?? null } };
```
`computeTicket` follows the same fixed-order early-stop skeleton: (1) direction from FIRE verdict else STAND ASIDE; (2) entry = OTE pocket ∩ entry-FVG; (3) SL from locked rule table (OQ-2); (4) TP1/TP2/TP3 structure-first (omit unresolvable legs with reason, never fixed-R fillers); (5) R/R gate (planner locks TP1 per Pitfall 7 recommendation); (6) verdict. Output carries `asOf` + per-leg `rMultiples` + `degraded` + `reason` for Phase 18 replay. Also copy `directionOf` total-function style (lines 223-227) and `displacementGate` polarity pick (lines 249-259: `needPolarity`, most-recent `originDate`, spread-copy `{ ...pick }`).

**Error handling:** boundary throws (above) for malformed envelopes; total functions (`directionOf`-style) never throw on null; float compares use `TOL_EPS` idiom (`judas.displacementMult + TOL_EPS >= TRIGGER_DISP_MULT`, line 243).

---

### `src/lib/ticket.test.ts` (test, transform)

**Analog:** `src/lib/confluence.test.ts` + `src/lib/ict/invalidation.test.ts`

**Imports + builder pattern** — copy from `src/lib/confluence.test.ts` lines 5-51 and `src/lib/ict/invalidation.test.ts` lines 13-80:
```typescript
import { describe, expect, it } from 'vitest';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import { deriveConvictionTier } from '@/src/lib/confluence';

const BASE_SWEEP_TIME = 1770500000;
function judas(overrides: Partial<JudasOutput> = {}): JudasOutput {
  return { candidate: true, confirmed: true, preRun: false, sweepSide: 'HIGH',
    sweepTime: BASE_SWEEP_TIME, displacementMult: 0.6, ...overrides };
}
function fixtureFlawTrigger(overrides: Partial<TriggerOutput> = {}): TriggerOutput {
  return { verdict: 'FIRE_LONG', direction: 'LONG', reasonKey: 'FIRE_LONG',
    reason: 'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.',
    gates: { timing: true, purge: true, displacement: true }, entryFvg: null,
    inputs: { judas: null, amd: null, smt: null }, ...overrides };
}
```
Ticket test builders: `fixtureTicketInput()` composing a FIRE trigger + clean flaw + levels/range/asia/dol + `riskPct`; `toBe`-pinned verbatim reasons per gate fail.

**Assertion pattern** — copy from `src/lib/confluence.test.ts` lines 53-96 (one `it` per neighbor, `toBe` on verbatim copy) and `src/lib/ict/invalidation.test.ts` epoch helper (lines 70-72, `nyMinuteEpoch` via `fromZonedTime` + `NY_TZ`):
```typescript
it('confirmed HIGH plus BEARISH yields the highest tier', () => {
  expect(deriveConvictionTier(judas({ sweepSide: 'HIGH' }), smtSignal({ direction: 'BEARISH' }))).toBe('yüksək inam');
});
```
Required cases: derivation table (each gate fail → STAND ASIDE + its reason), R/R boundary 3.0 passes / 2.99 STAND ASIDE with ratio named, structure-first TP (unresolvable leg omitted, never filler), sizing refusal (zero stop distance / missing levels / non-finite riskPct), `TICKET_RR_MIN` pinned.

**Co-location:** file sits beside `ticket.ts` (`<module>.test.ts`); vitest `include` already matches `src/**/*.test.ts` — no config change for this file (see Pitfall 5 only for `.test.tsx`).

---

### `src/lib/ticket-vocabulary.test.ts` (test, file-I/O)

**Analog:** `src/lib/ict/purity.test.ts` lines 1-45

**Core grep-guard pattern** (lines 8-44):
```typescript
const sources = import.meta.glob('./*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
function ictSources(): Array<[string, string]> {
  return Object.entries(sources).filter(([path]) => !path.endsWith('.test.ts'));
}
describe('ict purity guard', () => {
  it('contains no Date.now( clock reads', () => {
    const violations = ictSources()
      .filter(([, text]) => text.includes('Date.now('))
      .map(([path]) => path);
    expect(violations).toEqual([]);
  });
```
Copy verbatim but scope per Pitfall 1: whole-word case-sensitive `Filled`, `Submit Order`, `placeOrder` across `src/`+`components/`+`app/` with zero allowlist; `Position` scoped to Phase 17 new files only (or whole-tree with explicit allowlist pinning `computePosition` / `selectPosition` / `LevelsOutput.position` + assert-the-allowlist-still-exists so a rename can't silently widen the ban). Exclude `*.test.ts` from self-scan. May live inside `ticket.test.ts` instead of a separate file — planner picks one.

---

### `src/lib/store.ts` (store, request-response)

**Analog:** `src/lib/store.ts` lines 435-443, 841-906 (self-analog)

**Single-time-truth pattern** (lines 435-443):
```typescript
// Phase 15: single time truth for selectAMD plus selectTrigger. Extracted
// from the selectAMD epoch IIFE: nq1h lastUpdatedISO with a Date fallback at
// the caller boundary only (ict/ never reads clocks), so both selectors can
// never disagree on time — no torn reads, no duplication.
function sharedEpoch(get: () => DashboardState): number {
  const iso = get().nq1h.lastUpdatedISO;
  const parsed = iso === null ? NaN : new Date(iso).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : Math.floor(new Date().getTime() / 1000);
}
```
`selectTicket` makes exactly ONE `sharedEpoch(get)` call; never a second epoch, never re-sliced candles.

**Refuse-null + try/catch envelope** — copy from `selectTrigger` (lines 841-874) and `selectFatalFlaw` (lines 884-906):
```typescript
selectTrigger: () => {
  const { nq, nq1h, nq15m } = get();
  if (nq1h.stale || nq15m.stale) return null;
  if (closedOnlyIntraday(nq1h.candles).length === 0) return null;
  if (closedOnlyIntraday(nq15m.candles).length === 0) return null;
  try {
    const epoch = sharedEpoch(get);
    const judas = get().selectJudas();
    // ... derive, appendFiringLog(out, epoch), return out
  } catch {
    return null;
  }
},
selectFatalFlaw: () => {
  // ...
  try {
    const epoch = sharedEpoch(get);
    const trigger = get().selectTrigger();
    if (trigger === null) return null;
    // ...
    return checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf: epoch });
  } catch {
    return null;
  }
},
```
`selectTicket` copies this shape: refuse-null on stale/empty trigger-critical legs (`nq1h`/`nq15m` + `nq` for FVG/levels per Pitfall 4); one `sharedEpoch`; `get().selectTrigger()` then flaw precedence (`invalidated` → STAND ASIDE + flaw reason; `downgraded` → STAND ASIDE + flaw reason + `carriedArmedReason`); inner try/catch for rollover-style inline derivations degrading to null; outer catch → null (never throws into render). `ticketInputs` slice: plain `{ riskPct }` (default 1) + clamped setters (refuse NaN/negative/oversize) + ` paperLog` array capped like `TRIGGER_LOG_CAP` with `appendFiringLog` idiom (lines 914-948: WAIT-skip, per-session dedup, `next.slice(-CAP)` + overflow counter). Interface additions beside lines 256-260 (`selectTrigger`/`selectFatalFlaw` declarations + `firingLog` fields).

**Type re-export precedent** (lines 31-37): re-export `TicketOutput` type from the store slice owner with the comment that the canonical definition stays in `ticket.ts`.

---

### `src/lib/store.test.ts` (test extension)

**Analog:** `src/lib/store.test.ts` lines 1110-1300 (self-analog)

Copy the async `resetDualState` + `stubFourLegs` + `seedTriggerFire` harness and these assertion shapes:
```typescript
// stale → null, reason preserved on the leg (lines 1110-1132)
useDashboard.setState({ nq15m: { ...useDashboard.getState().nq15m, stale: true, lastError: '15m stale' } });
expect(useDashboard.getState().selectTrigger()).toBeNull();
expect(useDashboard.getState().nq15m.lastError).toBe('15m stale');
// coherence: back-to-back identical + epoch pinned (lines 1267-1289)
expect(JSON.stringify(second)).toBe(JSON.stringify(first));
const expectedEpoch = Math.floor(new Date('2026-02-09T08:00:00.000Z').getTime() / 1000);
expect(first!.asOf).toBe(expectedEpoch);
// verbatim reason pinned (lines 1302-1316)
expect(out!.reason).toBe('WHY NOW LONG: Asia Range Təmizlənib. ...');
```
New tests: `ticketInputs` clamps, `selectTicket` flaw-precedence (INVALIDATED → STAND ASIDE + flaw reason), refuse-null on stale/empty, degraded envelope (`degraded: { stale/thin, leg }`), coherence (back-to-back identical + `asOf` = shared epoch). NOTE the D-12 ordering trap in the flaw test comment (lines 1192-1194): never pre-call `selectTrigger` before the first `selectFatalFlaw` on a FIRE poll — same applies to `selectTicket` tests that assert flaw precedence.

---

### `src/lib/report.ts` + `src/lib/report.test.ts` (config + test)

**Analog:** self — `src/lib/report.ts` lines 17-24, `src/lib/report.test.ts` lines 8-32

Flip pattern (Pattern 2):
```typescript
{ index: 4, title: '4. "WHY NOW?" EXECUTION PROTOCOL (5M/1M)', state: 'unavailable' },  // → 'live'
{ index: 5, title: '5. INSTITUTIONAL ORDER TICKET', state: 'unavailable' },              // → 'live' + PAPER prefix per D-06
{ index: 6, title: '6. FATAL FLAW CHECK & CHALLENGE QUESTION', state: 'unavailable' },  // → 'live'
```
Test literals that MUST move in the same plan (Pitfall 2):
```typescript
expect(live).toHaveLength(2);                        // → 5
expect(live.map((s) => s.index)).toEqual([2, 3]);    // → [2, 3, 4, 5, 6]
expect(REPORT_SECTIONS.map((s) => s.title)).toEqual([ // §5 title gains PAPER prefix
  '1. RETAIL EXPOSURE & SENTIMENT ENGINEERING',
  // ...
  '5. INSTITUTIONAL ORDER TICKET',                    // → PAPER-prefixed form
  '6. FATAL FLAW CHECK & CHALLENGE QUESTION',
]);
```

---

### `src/lib/chart-mapper.ts` (utility, conditional)

**Analog:** self — `asiaLineInputs` lines 43-59

```typescript
export function asiaLineInputs(high: number, low: number): AsiaLineInputs {
  if (!isFiniteNumber(high) || !isFiniteNumber(low)) {
    throw new Error(`asiaLineInputs requires finite asiaHigh and asiaLow, got ${String(high)} ${String(low)}`);
  }
  return { asiaHigh: high, asiaLow: low };
}
```
Optional `ticketLineInputs(entry, sl, tp1, tp2, tp3)` follows this exactly: module `isFiniteNumber` predicate (lines 17-19), `got ${String(...)}` throw naming the function, caller (`nq-chart.tsx`) wraps in try/catch so a throw renders no lines and never blocks. Only add if the chart plan wants the guard; otherwise pass ticket numbers directly.

---

### `execution-protocol.tsx` / `ticket-panel.tsx` / `fatal-flaw.tsx` (components, request-response)

**Analog:** `components/dashboard/sentiment-panel.tsx` (thin Card+Button panel) + `components/dashboard/report.tsx` §3 block (selector subscription + fallbacks)

**Shell pattern** — copy from `sentiment-panel.tsx` lines 31-33, 53-58, 91-108:
```typescript
export function SentimentPanel() {
  const scenario = useDashboard((s) => s.scenario);
  const setScenario = useDashboard((s) => s.setScenario);
  return (
    <Card data-slot="sentiment-panel">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Sentiment</CardTitle>
      </CardHeader>
      <CardContent>{/* ... */}</CardContent>
    </Card>
  );
}
```
Each new panel: `'use client'` first line; `Card` with its own `data-slot` (`execution-protocol` / `ticket` / `fatal-flaw` — reusing the exact slots the UNAVAILABLE cards hold so the shell swap is 1:1); `CardHeader` + `CardTitle` with the `text-[11px] font-semibold uppercase tracking-[0.1em]` class; `CardContent` with verbatim reason prose. Zero math — subscribe + print only (ARCHITECTURE.md component contract).

**Selector-subscription pattern** — copy from `report.tsx` lines 70-86 (stable-function + derive during render, NOT `useShallow` on nested output):
```typescript
const selectLiquidityPath = useDashboard((s) => s.selectLiquidityPath);
const selectSMT = useDashboard((s) => s.selectSMT);
const liquidityPath = selectLiquidityPath();
const smt = selectSMT();
```
Rationale is documented in `terminal-shell.tsx` lines 49-56: nested objects (`tp`, `rMultiples`) get fresh identity per call so `useShallow` never settles — subscribe to the stable selector function and derive during render. Panels read `selectTrigger` / `selectTicket` / `selectFatalFlaw` this way. (The `useShallow` form at `terminal-shell.tsx` line 46 is ONLY for flat scalar selections like `coverage`.)

**Null/loading copy pattern** — copy from `report.tsx` lines 34-38, 134-140, 205-212 and `sentiment-panel.tsx` lines 36-48:
```typescript
const S3_EMPTY_COPY = 'Məlumat yoxdur';
// skeleton while lastUpdatedISO === null:
{lastUpdatedISO === null ? (
  <div className="flex flex-col gap-3">
    <div className="h-3 animate-pulse" />
    ...
// null selector → locked copy:
<p className="text-base font-semibold">Məlumat yoxdur</p>
```
`Məlumat yoxdur` null fallback; skeleton pulse while `lastUpdatedISO === null`; per-leg `lastError` read verbatim for refuse-null reasons (see §3 block lines 117-128 for the `?? lastError ?? S3_EMPTY_COPY` chain).

**Degraded rendering** — copy from `terminal-shell.tsx` UNAVAILABLE cards (lines 340-350) opacity treatment, restyled per D-05: `opacity-45` + visible `STALE`/`THIN` tag naming the failed leg (e.g. `"STALE — nq15m"`), numbers visible but dimmed, sizing locked with reason. Never full-strength on stale/thin.

**CTA pattern** (`ticket-panel.tsx` only) — copy Button usage from `sentiment-panel.tsx` lines 93-104 + `terminal-shell.tsx` lines 195-198:
```typescript
<Button onClick={() => void refresh()} disabled={inFlight} data-slot="refresh-button">
```
Risk-% steppers (clamped setters) + KAĞIZ QEYD (EXECUTE side, appends `paperLog`) / İMTİNA (STAND ASIDE side, dismisses without logging). shadcn `button` + `card` only — no new installs (UI-SPEC Registry Safety).

---

### `components/dashboard/report.tsx` (component, request-response)

**Analog:** self — §3 live block, lines 112-181

Copy the whole §3 branch shape for each of §§4–6: `if (section.index === 4)` / `5` / `6` before the generic `unavailable` branch (lines 183-198), each with:
- leg `lastError` verbatim chain (lines 117-128): `liquidityPath ?? nqLeg.lastError ?? S3_EMPTY_COPY` idiom → §4 ← `selectTrigger().reason`, §5 ← ticket levels + PAPER-prefix title (D-06), §6 ← `flaw.sentence` + `flaw.challenge`;
- `lastUpdatedISO === null` skeleton (lines 134-139) vs. null-selector `Məlumat yoxdur` (line 212);
- `data-slot="report-section"` + per-block sub-slots mirroring `s3-liquidity-path` / `s3-smt-status` / `s3-amd-timing` (lines 154-177).
Math-free: all derivation stays in selectors; the component only prints `.reason` verbatim.

---

### `components/dashboard/terminal-shell.tsx` (component, request-response)

**Analog:** self — lines 64-86, 106-131, 283-335, 340-378

**Swap pattern** — the three UNAVAILABLE cards at lines 340-350 (`data-slot="execution-protocol"`), 356-366 (`data-slot="ticket"`), 368-378 (`data-slot="fatal-flaw"`):
```typescript
<Card data-slot="execution-protocol" className="pointer-events-none relative opacity-45">
  <span className="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-[0.1em]">
    UNAVAILABLE
  </span>
  ...
```
Each is replaced 1:1 by `<ExecutionProtocol />` / `<TicketPanel />` / `<FatalFlaw />` keeping the same `data-slot`. Locked `UNAVAILABLE` chip untouched elsewhere.

**PAPER banner pattern** — copy the thin/rollover banner idiom (lines 112-131):
```typescript
const thinBlock = showThinBanner ? (
  <div data-slot="thin-history-banner" role="status" data-tier={thinTierValue}
    data-closed-count={thinClosedCount}
    className="rounded px-3 py-2 font-mono text-[11px] tracking-widest text-muted-foreground">
    {thinTierCopy(thinTierValue, thinClosedCount)}
  </div>
) : null;
```
Terminal-top `data-slot="paper-banner"` strip, non-dismissible KAĞIZ/PAPER copy, rendered on every frame independent of envelope truth (above `<StatusStrip />`, outside the scrolled grid so it stays visible).

**fireBarDate mapping** — copy the `judasBarDate` containing-bar loop (lines 74-84), re-keyed to `ticket.asOf` per Pitfall 6:
```typescript
let judasBarDate: string | null = null;
if (judas !== null && judas.sweepTime !== null && candles.length > 0) {
  let best: string | null = null;
  for (const c of candles) {
    const barEpoch = Math.floor(new Date(`${c.date}T00:00:00Z`).getTime() / 1000);
    if (Number.isFinite(barEpoch) && barEpoch <= judas.sweepTime) {
      best = c.date;
    }
  }
  judasBarDate = best ?? candles[candles.length - 1].date;
}
```
Never reuse `judasBarDate` for the `T` pin — map from the ticket's own `asOf`.

**Chart-empty/skeleton precedent** (lines 297-335): `chart-skeleton` while `lastUpdatedISO === null`, `chart-empty` with `Məlumat yoxdur` + Yenilə button, `chart-error` with locked `POLL_FAILURE_COPY` (lines 25-27) — ticket panels mirror the empty/error treatment.

---

### `components/charts/nq-chart.tsx` (component, event-driven)

**Analog:** self — lines 49-106, 205-242, 341-472, 499-503

**`T` pin pattern** — extend `buildOverlayMarkers` (lines 63-106) with a third optional input appended AFTER Judas then SMT (J→S→T ordering):
```typescript
// Build the marker array from resolved detector outputs: Judas first, then
// SMT. Null, unresolved, NO-SIGNAL, or suppressed inputs contribute nothing;
// empty input returns [] so the caller clears via an empty marker set.
function buildOverlayMarkers(judas, judasBarDate, smt, smtBarDate, overlayStale, accent): OverlayMarker[] {
  const markers: OverlayMarker[] = [];
  const tone = overlayStale ? MUTED_GRAY : accent;   // line 75; MUTED_GRAY = '#71717A' line 61
  // Judas block lines 76-93: confirmed → solid accent 'J', candidate → MUTED_GRAY 'J?'
  // SMT block lines 94-104: unsuppressed + BULLISH/BEARISH → arrowUp/arrowDown 'S'
  return markers;
}
interface OverlayMarker { time: string; position: 'aboveBar' | 'belowBar';
  shape: 'circle' | 'arrowUp' | 'arrowDown'; color: string; text: string; }  // lines 52-58
```
T rule: push `{ time: fireBarDate, position: dir==='LONG'?'belowBar':'aboveBar', shape: 'arrowUp'|'arrowDown', color: tone, text: 'T' }` only when ticket verdict is EXECUTE_* — caller passes null otherwise so the existing empty-marker-set path clears it (D-10). Props-only addition (`trigger`/`fireBarDate`-style props mirroring `judas`/`judasBarDate`, lines 30-33); `propsRef` sync (line 126-130) and both effect dep arrays gain the new props.

**Price-line pattern** — copy the Asia-pair remove-then-create cycle, mount effect lines 205-227 + update effect lines 348-361, 428-449:
```typescript
// Mount (lines 205-227): guarded create
if (props.asiaHigh !== null && props.asiaHigh !== undefined && ...) {
  try {
    const asiaInputs = asiaLineInputs(props.asiaHigh, props.asiaLow);
    const asiaColor = props.overlayStale ? MUTED_GRAY : accent;
    asiaHighLineRef.current = typed.createPriceLine({ price: asiaInputs.asiaHigh,
      color: asiaColor, lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'Asia-H' });
```
```typescript
// Update (lines 348-361): unconditional remove-first
if (asiaHighLineRef.current !== null) live.removePriceLine(asiaHighLineRef.current);
if (asiaLowLineRef.current !== null) live.removePriceLine(asiaLowLineRef.current);
asiaHighLineRef.current = null; asiaLowLineRef.current = null;
// ... then re-create (lines 428-449), catch → refs stay null (no lines, never blocks)
```
Add `entryLineRef/slLineRef/tp1LineRef/tp2LineRef/tp3LineRef` to BOTH effects + the unmount cleanup (lines 321-329); titles `'Entry'/'SL'/'TP1'/'TP2'/'TP3'`; accent tone, `MUTED_GRAY` when `overlayStale` (line 363 `overlayTone`). Update effect MUST remove ticket refs unconditionally first — skipping creation is not enough (Pitfall 6 ghost-lines). Synchronous `import('lightweight-charts')` for `LineStyle`/`createSeriesMarkers` inside the effects (lines 139, 342) keeps the module top DOM-free.

**Marker-refresh pattern** (lines 450-472): rebuild via `buildOverlayMarkers(...)` on every input change, `plugin.setMarkers(next)` or lazy `createSeriesMarkers(liveSeries, next)`; catch → markers never block candles/lines. Test hooks: mirror lines 489-503 (`hasAsiaLines`/`hasJudasMarkers`/`hasSmtMarker` + hidden `data-slot` spans) with `hasTicketLines` / `ticket-markers` spans if the planner wants them.

---

### `vitest.config.ts` (config, conditional)

**Analog:** self — lines 4-13
```typescript
test: {
  environment: 'node',
  include: ['src/**/*.test.ts', 'app/**/*.test.ts'],
  testTimeout: 15000,
},
```
Pitfall 5 decision: either extend `include` with `src/**/*.test.tsx` (additive glob, own risk: none) or keep panels manual-UAT-only. Never silently add `.test.tsx` files CI ignores. `@` alias (`path.resolve(__dirname, '.')`, line 5) is used by every test import — keep it.

## Shared Patterns

### Purity (applies to `ticket.ts`, `chart-mapper.ts` additions)
**Source:** `src/lib/confluence.ts` lines 4-12 + `src/lib/ict/trigger.ts` lines 9-17
```typescript
// Selector-level scoring lives here, never inside src/lib/ict, so ict purity holds. Pure: no clock reads, no store imports.
```
No `Date.now`, no store/zustand imports in pure libs; time via injected `asOf`; `@/` type-only imports. Enforced by `purity.test.ts` idiom for `ict/`; `ticket.ts` keeps the discipline voluntarily for Phase 18 replay determinism.

### Error handling (applies to all lib + selector files)
**Source:** `src/lib/store.ts` lines 841-906 + `src/lib/ict/trigger.ts` lines 159-190
- Lib boundary: `assertValid*` helpers with `got ${String(x)}` throws; null degrades honestly (never throws on null).
- Selector boundary: refuse-null on stale/empty legs (owning-leg `lastError` carries the reason); everything in try/catch → null; never throws into render.
- Chart boundary: try/catch around guard + marker calls → null refs / empty markers; never blocks candles.

### Validation (applies to `ticket.ts` + `ticketInputs` setters + `chart-mapper.ts`)
**Source:** `src/lib/chart-mapper.ts` lines 17-19, 54-58 + `src/lib/ict/trigger.ts` lines 271-276
```typescript
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
```
`riskPct` setters clamp to a sane band (e.g. 0.1–5), refuse NaN/negative; `computeTicket` refuses (never clamps-to-fake) on null/non-finite entry/SL, `|entry-sl| <= 0` or below epsilon, unresolvable TP legs omitted with reason.

### Thin render panels (applies to all three new panels + §§4–6 blocks)
**Source:** `components/dashboard/report.tsx` lines 62-86 + `components/dashboard/sentiment-panel.tsx` lines 31-58
`'use client'`; stable selector-function subscription + derive during render; zero math; verbatim `.reason` prose; `Məlumat yoxdur` null copy; skeleton pulse while `lastUpdatedISO === null`; `opacity-45` + named-leg STALE/THIN tag when degraded; shadcn `card`+`button` only.

### Verbatim Azerbaijani copy (applies to reasons, sentences, banners, CTAs)
**Source:** `src/lib/ict/trigger.ts` lines 85-108 + `src/lib/ict/invalidation.ts` lines 74-101, 107-140 + `src/lib/store.test.ts` lines 1311-1313
One `const` per string, `Record<key, string>` lookup, `toBe`-pinned; no number/price interpolation (sole exception: R/R-fail reason names the computed ratio). Locked literals: `UNAVAILABLE` chip, `Məlumat yoxdur`, `KAĞIZ QEYD` / `İMTİNA` CTAs, `PAPER` banner + §5 title prefix.

### Test-harness (applies to all new/updated tests)
**Source:** `src/lib/confluence.test.ts` lines 10-51 + `src/lib/store.test.ts` lines 1110-1144
Small `Partial<T>` builder helpers with `...overrides`; one `it` per neighbor; `expect(...).toBe(...)` on verbatim copy; `expect(...).toBeNull()` + `expect(() => ...).not.toThrow()` for refuse-null envelopes; coherence via `JSON.stringify` equality + pinned epoch.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | None — every Phase 17 file has a tracked in-repo analog above. The only genuinely new math (entry∩SL∩TP resolution, R/R division, risk÷distance sizing) is specified by RESEARCH.md `## Code Examples` + OQ-1..OQ-4 planner locks, not by an analog. |

## Metadata

**Analog search scope:** `src/lib/`, `src/lib/ict/`, `components/dashboard/`, `components/charts/`, `vitest.config.ts`
**Files scanned:** 14 target files; analogs extracted from 12 tracked source files (all `git ls-files` verified — no mirror paths)
**Pattern extraction date:** 2026-09-11
