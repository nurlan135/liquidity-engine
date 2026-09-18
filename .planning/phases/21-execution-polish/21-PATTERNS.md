# Phase 21: Execution Polish - Pattern Map

**Mapped:** 2026-09-17
**Files analyzed:** 11 (6 modified, 4 new, 1 docs)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `components/dashboard/firing-log-panel.tsx` (extend) | component | request-response (store-read render) | self — same file | exact |
| `components/dashboard/ticket-panel.tsx` (extend) | component | request-response (store-read render) | self — same file | exact |
| `components/dashboard/calibration-sandbox.tsx` (new, implied slider block near FiringLogPanel) | component | request-response (preview-only sandbox) | `components/dashboard/ticket-panel.tsx` | role-match |
| `components/ui/slider.tsx` (new 7th primitive) | component (primitive wrapper) | request-response (knob renderer only) | `components/ui/button.tsx` | role-match |
| `src/lib/ticket.ts` (modify SL/TP buffer) | service (brokerage math) | transform (fixed-order derivation) | self — same file | exact |
| `src/lib/store.ts` (modify sandbox slice) | store | request-response (session Zustand) | self — `ticketInputs` + `appendFiringLog` slice | exact |
| `src/lib/ict/pools-parity.test.ts` (new) | test | request-response (parity harness) | `src/lib/ict/parity.test.ts` | exact (idiom copy) |
| `src/lib/ticket.test.ts` (extend buffer matrix) | test | transform (boundary pins) | self — same file | exact |
| `src/lib/ict/trigger.test.ts` + `src/lib/ict/replay.test.ts` (re-pin boundaries) | test | transform (boundary pins) | self — same files | exact |
| `src/lib/ict/calibration.ts` or inline band-verdict helper (new, POL-01) | utility | transform (pure verdict math) | `src/lib/ict/replay.test.ts` `summarizeReplay` | role-match |
| `.planning/PROJECT.md` (amend shadcn allowlist 6→7) | config/docs | — | self — lines 73, 79 | exact |

## Pattern Assignments

### `components/dashboard/firing-log-panel.tsx` (component, request-response)

**Analog:** self — `components/dashboard/firing-log-panel.tsx` (git-tracked, verified)

**Imports pattern** (lines 1-4):
```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';
```

**Core reader pattern** (lines 18-22) — direct subscriptions, no useShallow, newest-first derived at render:
```tsx
export function FiringLogPanel() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const firingLog = useDashboard((s) => s.firingLog);
  const firingLogOverflow = useDashboard((s) => s.firingLogOverflow);
  const entries = firingLog.slice().reverse();
```

**Render-state pattern** (lines 30-44) — skeleton → empty → entries; overflow line above entries:
```tsx
{lastUpdatedISO === null ? (
  <div className="flex flex-col gap-3">
    <div className="h-3 animate-pulse" />
    <div className="h-3 animate-pulse" />
    <div className="h-3 animate-pulse" />
  </div>
) : firingLog.length === 0 ? (
  <p className="text-base font-semibold">{EMPTY_COPY}</p>
) : (
  <div>
    {firingLogOverflow > 0 ? (
      <p data-slot="firing-log-overflow" className="font-mono text-[11px] tracking-widest text-muted-foreground">
        {`+${firingLogOverflow} köhnə qeyd`}
      </p>
```

**Entry row pattern** (lines 45-64) — data-slot + data-verdict/session/asof attrs, Label + mono + muted rows:
```tsx
{entries.map((entry) => (
  <div
    key={`${entry.sessionDate}-${entry.asOf}-${entry.verdict}`}
    data-slot="firing-log-entry"
    data-verdict={entry.verdict}
    data-direction={entry.direction ?? ''}
    data-session={entry.sessionDate}
    data-asof={entry.asOf}
  >
    <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">
      {`${entry.verdict} · ${entry.direction ?? '—'}`}
    </p>
    <p className="font-mono text-xs tabular-nums">
      {`Zaman ${gateMark(entry.gates.timing)} · Süpürmə ${gateMark(entry.gates.purge)} · Displacement ${gateMark(entry.gates.displacement)}`}
    </p>
    <p className="font-mono text-xs tabular-nums text-muted-foreground">
      {`${entry.reasonKey} · ${entry.sessionDate}`}
    </p>
```

**Extension guidance (D-01/D-02/D-04):** Band verdict renders INLINE next to entries (no separate summary block); pools-on-vs-off proof table reads the same `firingLog` array; empty log → verdict renders NOTHING (keep `EMPTY_COPY` + calibration body per UI-SPEC). Degraded thin path dims at `opacity-45` + tag, never hides.

---

### `components/dashboard/ticket-panel.tsx` (component, request-response)

**Analog:** self — `components/dashboard/ticket-panel.tsx` (git-tracked, verified)

**Imports + math-free contract** (lines 1-7):
```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PAPER_EQUITY_USD } from '@/src/lib/ticket';
import { useDashboard } from '@/src/lib/store';
```

**Selector pattern** (lines 31-36) — stable selector-function subscription, derivation during render:
```tsx
const riskPct = useDashboard((s) => s.ticketInputs.riskPct);
const setRiskPct = useDashboard((s) => s.setRiskPct);
const appendPaperLog = useDashboard((s) => s.appendPaperLog);
const selectTicket = useDashboard((s) => s.selectTicket);
const ticket = selectTicket();
```

**Degraded + verdict pattern** (lines 45-89) — dim wrapper, STALE/THIN tag naming leg, verbatim reason:
```tsx
const degraded =
  ticket !== null && (ticket.degraded.stale || ticket.degraded.thin);
const degradedTag =
  ticket !== null && ticket.degraded.stale
    ? `STALE — ${(ticket.degraded.leg ?? 'bilinmir').toUpperCase()}`
    : ticket !== null && ticket.degraded.thin
      ? `THIN — ${(ticket.degraded.leg ?? 'bilinmir').toUpperCase()}`
      : null;
// ...
<div className={degraded ? 'opacity-45' : undefined}>
  {degradedTag !== null ? (
    <p data-slot="ticket-degraded-tag" className="font-mono text-[11px] tracking-widest text-muted-foreground">
      {degradedTag}
    </p>
  ) : null}
  <p data-slot="ticket-verdict" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
    {ticket.verdict}
    {ticket.direction !== null ? ` · ${ticket.direction}` : null}
  </p>
  <p data-slot="ticket-reason" className="text-base font-semibold">
    {ticket.reason}
  </p>
```

**Price/mono pattern** (lines 92-99) — `font-mono text-xl font-semibold tabular-nums`, `—` for null legs:
```tsx
function fmtPrice(value: number | null): string {
  return value === null ? '—' : value.toFixed(2);
}
// ...
<p data-slot="ticket-sl" className="font-mono text-xl font-semibold tabular-nums">
  {`Stop: ${fmtPrice(ticket.sl)}`}
</p>
```

**Extension guidance (D-07):** Buffer note renders as verbatim Azerbaijani prose line (UI-SPEC: `Stop ekstremdən 0.25×ATR kənarda; TP ekstremdən əvvəl — maqnit-xətt yoxdur`) in `text-muted-foreground` Body/mono beside `data-slot="ticket-reason"`; chart SL/TP lines move (EXECUTE only, z-order unchanged). R/R gate position unchanged.

---

### `components/dashboard/calibration-sandbox.tsx` (new component, request-response)

**Analog:** `components/dashboard/ticket-panel.tsx` (role-match — session Zustand + Button + Card shell)

**Copy for sandbox shell:** Card wrapper `data-slot="ticket"` → new block uses `data-slot="calibration-sandbox"` (UI-SPEC); title Label role `text-[11px] font-semibold uppercase tracking-[0.1em]` with section labels `TETİK HƏDLƏRİ` + `HOVUZ TOLERANSLIĞI`; Apply CTA `Tətbiq et` reuses `Button size="sm"`:
```tsx
// Copy from ticket-panel.tsx lines 56-60 (Card shell) and 129-149 (risk stepper → slider rows + Apply)
<Card data-slot="calibration-sandbox">
  <CardHeader>
    <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Kalibrləmə Sandbox</CardTitle>
  </CardHeader>
```
```tsx
// Stepper precedent (lines 129-149): label + control + mono value; degraded disables
<Button size="sm" variant="outline" onClick={() => setRiskPct(riskPct - RISK_STEP)} disabled={degraded} data-slot="risk-decrement">−</Button>
<span data-slot="risk-value" className="font-mono text-xs tabular-nums">{riskPct.toFixed(1)}</span>
```

**State rules (D-14/D-15):** Preview-only until Apply — sliders write a separate preview slice, selectors read pinned constants only; unapplied preview dims at `opacity-45` + `BAXIŞ — tətbiq edilməyib` tag; refresh resets (no localStorage); Apply writes constants + re-pins boundary tests.

---

### `components/ui/slider.tsx` (new primitive wrapper, request-response)

**Analog:** `components/ui/button.tsx` (role-match — shadcn → @base-ui/react wrapper precedent, git-tracked)

**Imports pattern** (lines 1-3):
```tsx
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
```

**Wrapper pattern** (lines 42-55) — thin function over primitive, `data-slot`, `cn()` merge, props spread:
```tsx
function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
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

**Install guidance (D-16):** `npx shadcn@4.21.0 add slider` (shadcn CLI copies the file, no new npm dep — `@base-ui/react ^1.8.0` already declared). New file wraps `@base-ui/react/slider` the same way (sub-module path confirmed from CLI output at install time); exports `{ Slider }`; knobs render ONLY from `@/components/ui/slider`. Aliases per `components.json` lines 15-21 (`@/components/ui`). UI-SPEC exception: thumb visual 16px with 44px pointer hit-area; accent reserved for active-track fill + focused thumb ring.

---

### `src/lib/ticket.ts` (service/brokerage math, transform)

**Analog:** self — `src/lib/ticket.ts` (git-tracked, verified)

**Imports pattern** (lines 1-7) — type imports via `@/` alias, brokerage beside ict:
```typescript
import type { TriggerOutput } from '@/src/lib/ict/trigger';
import type { FatalFlawOutput } from '@/src/lib/ict/invalidation';
import type { LevelsOutput } from '@/src/lib/ict/levels';
import type { FvgGap } from '@/src/lib/ict/fvg';
import type { AsiaRange } from '@/src/lib/ict/asia';
import type { DealingRange, DOLTarget } from '@/src/lib/ict/types';
import { TOL_EPS } from '@/src/lib/ict/judas';
```

**Provisional-constant pattern** (lines 19-32) — new buffer multiples copy this comment shape:
```typescript
/** R/R floor gating EXECUTE — TP1 must cover risk threefold (D-03). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-14, unobserved live. Authority: R/R Min 1:3 (institutional_rules.md Modul 4).
export const TICKET_RR_MIN = 3;
```

**Boundary-validation pattern** (lines 242-246 + 288-300) — got-string throws on malformed, null degrades downstream:
```typescript
function assertValidRiskPct(riskPct: TicketInput['riskPct']): void {
  if (typeof riskPct !== 'number' || !Number.isFinite(riskPct) || riskPct < RISK_PCT_MIN || riskPct > RISK_PCT_MAX) {
    throw new Error(`computeTicket requires a finite riskPct in 0.1 to 5, got ${String(riskPct)}`);
  }
}
// computeTicket boundary (lines 288-300): finite-positive asOf check, then assertValid* chain
```

**SL insertion point** (lines 252-257) — POL-02 pushes beyond pool extreme by 0.25× ATR here:
```typescript
function resolveSL(direction: 'LONG' | 'SHORT', entry: number, entryFvg: FvgGap, asia: AsiaRange): number | null {
  const sl = direction === 'LONG' ? Math.min(entryFvg.bottom, asia.low) : Math.max(entryFvg.top, asia.high);
  if (direction === 'LONG' && !(sl < entry)) return null;
  if (direction === 'SHORT' && !(sl > entry)) return null;
  return sl;
}
```

**TP insertion point** (lines 263-282) — TP legs resolve BEFORE the pool extreme; unresolvable stay null:
```typescript
function resolveTP(
  direction: 'LONG' | 'SHORT',
  entry: number,
  asia: AsiaRange,
  dol: DOLTarget,
  range: DealingRange,
): { tp1: number | null; tp2: number | null; tp3: number | null } {
  if (direction === 'LONG') {
    return {
      tp1: asia.high > entry ? asia.high : null,
      tp2: dol.price > entry ? dol.price : null,
      tp3: range.high > entry ? range.high : null,
    };
  }
```

**Fixed-order + R/R gate** (lines 333-358) — steps 3→4→5 order locked; gate on TP1 only at `TICKET_RR_MIN = 3`, sole sanctioned interpolation:
```typescript
// Step 3 — SL from the locked OQ-2 rule table.
const sl = resolveSL(direction, entry, trigger.entryFvg as FvgGap, asia);
// Step 4 — structure-first TP ladder ... TP1 must resolve
const tp = resolveTP(direction, entry, asia, dol, range);
if (tp.tp1 === null) {
  return standAside(REASON_TP, epoch, degraded);
}
const stopDist = Math.abs(entry - sl);
if (!(stopDist > STOP_EPS)) {
  const stopped = standAside(REASON_STOP, epoch, degraded);
  return stopped;
}
const rr = Math.abs((tp.tp1 as number) - entry) / stopDist;
if (!(rr + TOL_EPS >= TICKET_RR_MIN)) {
  return standAside(`R/R 1:${rr.toFixed(1)} — EXECUTE bloklandı.`, epoch, degraded);
}
```

**Verbatim-reason pattern** (lines 81-89) — one const per gate, `toBe`-pinned, never interpolated except R/R ratio:
```typescript
const REASON_SL = 'STAND ASIDE: stop həll edilmədi — struktur səviyyə çatışmır.';
const REASON_EXECUTE_LONG = 'EXECUTE LONG: giriş, stop və TP pilləsi həll edildi — R/R şərti ödənilir.';
```

---

### `src/lib/store.ts` (store, request-response)

**Analog:** self — `src/lib/store.ts` ticketInputs + appendFiringLog slices (git-tracked, verified)

**Imports + re-export pattern** (lines 1, 20-31, 37-46) — zustand create, ict math imports, type re-exports beside owner:
```typescript
import { create } from 'zustand';
import {
  TRIGGER_DISP_MULT,
  TRIGGER_KZ_END_MIN,
  TRIGGER_KZ_START_MIN,
  TRIGGER_LOG_CAP,
  evaluateTrigger,
  nyDateOf,
  type FiringLogEntry,
  type TriggerOutput,
} from '@/src/lib/ict/trigger';
// Re-exported so consumers read the log shape from the store slice owner;
// the canonical definition stays beside the verdict in trigger.ts (moving it
// here would force trigger.ts to import from the store — a purity violation).
export type { FiringLogEntry } from '@/src/lib/ict/trigger';
```

**Trailing-cap + overflow pattern** (lines 1051-1061) — sandbox preview follows session-ephemeral shape:
```typescript
const next = [...firingLog, entry];
if (next.length > TRIGGER_LOG_CAP) {
  const overflow = next.length - TRIGGER_LOG_CAP;
  set({
    firingLog: next.slice(-TRIGGER_LOG_CAP),
    firingLogOverflow: get().firingLogOverflow + overflow,
  });
} else {
  set({ firingLog: next });
}
```

**Clamped-setter pattern** (lines 1066-1070) — `setRiskPct` clamps to band, refuses NaN/non-finite:
```typescript
setRiskPct: (pct) => {
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct <= 0) return;
  const clamped = Math.min(RISK_PCT_MAX, Math.max(RISK_PCT_MIN, pct));
  set({ ticketInputs: { riskPct: clamped } });
},
```

**Log-append guards** (lines 1027-1042) — WAIT skip, already-fired echo skip, one FIRE per NY date:
```typescript
appendFiringLog: (out, asOf) => {
  if (out.verdict === 'WAIT_FOR_MANIPULATION') return;
  if (out.reasonKey === 'ARMED_ALREADY_FIRED') return;
  const sessionDate = nyDateOf(asOf);
  const { firingLog } = get();
  const isFire = out.verdict === 'FIRE_LONG' || out.verdict === 'FIRE_SHORT';
  if (
    isFire &&
    firingLog.some(
      (entry) =>
        entry.sessionDate === sessionDate &&
        (entry.verdict === 'FIRE_LONG' || entry.verdict === 'FIRE_SHORT'),
    )
  ) {
    return;
  }
```

**Sandbox guidance (D-15):** New preview slice beside `ticketInputs: { riskPct: 1 }` (line 508) — separate preview state from pinned constants, session scope only, no persistence; `selectPools` envelope untouched; selectors read pinned until Apply commits + re-pins.

---

### `src/lib/ict/pools-parity.test.ts` (new test, request-response)

**Analog:** `src/lib/ict/parity.test.ts` (exact idiom copy, git-tracked; stays untouched per D-09)

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

**Fixture-builder pattern** (lines 18-65) — `STEP 900, BASE 20000` idiom via `fromZonedTime` + `NY_TZ`:
```typescript
function fixtureTriggerJudas(overrides: Partial<JudasOutput> = {}): JudasOutput {
  return {
    candidate: false,
    confirmed: false,
    preRun: false,
    sweepSide: null,
    sweepTime: null,
    displacementMult: 0,
    ...overrides,
  };
}
function nyMinuteEpoch(nyDate: string, hhmm: string): number {
  return Math.floor(fromZonedTime(`${nyDate} ${hhmm}:00`, NY_TZ).getTime() / 1000);
}
```

**Shared-triple + identity-assert pattern** (lines 80-95, 139-153) — identical references feed all three verdicts:
```typescript
function firingTriple(
  sweepSide: SweepSide,
  smt: SmtOutput,
  nyDate = '2026-06-15',
): ParityTriple {
  const asOf = nyMinuteEpoch(nyDate, '03:00');
  // ...
}
// ...
expect(out.inputs.judas).toEqual(triple.judas);
expect(out.inputs.smt).toEqual(triple.smt);
expect(out.inputs.judas).toBe(triple.judas);
expect(out.inputs.smt).toBe(triple.smt);
```

**Roster-sweep pattern** (lines 389-423) — full roster, single-snapshot triple, zero-contradiction bar:
```typescript
it('sweeps the full roster over every ARMED-or-better bar with zero contradictions', () => {
  const bars: ParityTriple[] = [
    firingTriple('HIGH', signalSmt('BEARISH')),
    firingTriple('LOW', signalSmt('BULLISH')),
    firingTriple('HIGH', suppressedSmt()),
    firingTriple('LOW', suppressedSmt()),
  ];
  // ... evaluateTrigger per bar, armedOrBetter check, toBe identity, swept === 4
  expect(swept).toBe(4);
});
```

**New-suite guidance (D-09–D-12):** Mirror this shape with pools toggled — replay the 20-session transition table (see `replay.test.ts` driver below) × {pools ON, pools OFF} → trigger/flaw/ticket triple per bar → exact-match assert on all three verdicts (buffered SL/TP deltas included, no tolerance band). Both arms run the SAME buffered `computeTicket` build; toggle is pools presence only, never a new `TriggerInput`/`TicketInput` field.

---

### `src/lib/ict/replay.test.ts` driver + band verdict (test/utility, transform)

**Analog:** `src/lib/ict/replay.test.ts` (git-tracked, verified)

**Replay-driver pattern** (lines 191-223) — bar-by-bar, session-scoped `alreadyFired`, flaw-after-trigger on same snapshot:
```typescript
function runReplay(sessions: ReplayBarInput[][]): ReplayBarResult[] {
  const log: ReplayBarResult[] = [];
  for (const bars of sessions) {
    let firedThisSession = false;
    let prevCombined: CombinedState | null = null;
    for (const bar of bars) {
      const trigger = evaluateTrigger({
        judas: bar.judas,
        amd: null,
        smt: bar.smt,
        fvg: bar.fvg,
        asOf: bar.asOf,
        alreadyFired: firedThisSession,
      });
      const flaw = checkFatalFlaw({
        trigger,
        smt: bar.smt,
        judas: bar.judas,
        rollover: bar.rollover,
        stale: bar.stale,
        asOf: bar.asOf,
      });
      const combined = combinedOf(trigger, flaw);
      assertLegalEdge(prevCombined, trigger, flaw);
      if (trigger.verdict === 'FIRE_LONG' || trigger.verdict === 'FIRE_SHORT') {
        firedThisSession = true;
      }
```

**Band-verdict single definition** (lines 249-264) — REUSE, don't redefine; panel verdict + helper copy this:
```typescript
function summarizeReplay(log: ReplayBarResult[], sessionDates: string[]): CalibrationSummary {
  const fireBars = log.filter(
    (b) => b.trigger.verdict === 'FIRE_LONG' || b.trigger.verdict === 'FIRE_SHORT',
  );
  const fires = fireBars.length;
  // ...
  const weeks = Math.max(1, new Set(sessionDates.map(mondayOfNyDate)).size);
  const firesPerWeek = fires / weeks;
  const killRate = firedSessions === 0 ? 0 : invalidated / firedSessions;
  const verdict = firesPerWeek >= 1 && firesPerWeek <= 4 ? 'IN-BAND' : 'OUT-OF-BAND';
  return { fires, sessions, firesPerWeek, invalidated, killRate, band: '1-4/week', verdict };
}
```

**Calibration-helper guidance (POL-01):** New helper (e.g. `src/lib/ict/calibration.ts` pure, injected entries + overflow count, no clock/store imports) reuses FIRE-only counting + 4-NY-week denominator + overflow inclusion; empty log → renders nothing (no confident HOLD). 20-session population lives at `replay.test.ts` lines 598-743.

---

### `src/lib/ticket.test.ts` + trigger/replay boundary pins (test, transform)

**Analog:** self — `src/lib/ticket.test.ts` (git-tracked, verified)

**Fixture pattern** (lines 1-42) — tracer fixture with hand-computed math in comments:
```typescript
import { describe, expect, it } from 'vitest';
import { computeTicket, NQ_POINT_VALUE, PAPER_EQUITY_USD, TICKET_RR_MIN, type TicketInput } from '@/src/lib/ticket';
// Tracer fixture: FIRE_LONG + clean flaw + resolvable structure.
// Range 20260/20010 (width 250) → bullOTE [20062.5, 20105]; BULLISH gap
// [20090, 20120] ∩ bullOTE = [20090, 20105] → entry 20097.5; SL =
// min(20090, asiaLow 20085) = 20085 → stop 12.5; TP1 = asiaHigh 20210 →
// RR 112.5/12.5 = 9 ≥ 3; TP2/TP3 = range high 20260; size = floor(250/250) = 1.
function fixtureEntryFvg(overrides: Partial<FvgGap> = {}): FvgGap {
```

**Buffer-matrix guidance (D-08):** Extend with 0.25× ATR SL-buffer rows + TP-pullback rows using the same tracer shape; buffer multiples ship CALIBRATION-PROVISIONAL with boundary pins; `computeATR` denominator from `src/lib/ict/regime.ts` lines 16-40 (Wilder smoothing, period 14, `closedOnly`, empty → `[]`).

---

### Supporting analogs (referenced, not re-read)

**`src/lib/ict/trigger.ts` calibration constants + verdict types** (lines 19-32, 59-80, 116-126):
```typescript
/** Killzone open in NY wall-clock minutes since midnight, exclusive (D-01). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1-4 fires/week (TRIG-04).
export const TRIGGER_KZ_START_MIN = 120;
export const TRIGGER_DISP_MULT = 0.5;
export const TRIGGER_LOG_CAP = 50;
export interface FiringLogEntry {
  asOf: number;
  verdict: TriggerVerdict;
  gates: { timing: boolean; purge: boolean; displacement: boolean };
  direction: TriggerDirection;
  reasonKey: TriggerReasonKey;
  sessionDate: string;
}
export function nyMinutesOf(timeSec: number): number {
  const hour = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'H'));
  const minute = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'm'));
  return hour * 60 + minute;
}
```
Slider knob bounds seed from `TRIGGER_KZ_START_MIN/END_MIN`, `TRIGGER_DISP_MULT` + pool constants below.

**`src/lib/ict/pools.ts` constants under review** (lines 15-38) + ATR-merge radius (lines 260, 275):
```typescript
/** Equality-cluster tolerance in basis points (D-02, mirrors SMT_TOL_BPS). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-16, unobserved live. Phase 21 reviews against firing log.
export const EQUAL_TOL_BPS = 25;
export const MERGE_ATR_MULT = 0.25;
export const DOL_BOOST = 2.0;
export const BEHIND_PENALTY = 0.25;
export const EQUAL_BONUS_STEPS = [3.0, 2.0, 1.0, 0.5];
export type PoolSide = 'BSL' | 'SSL';
```
```typescript
const radius = MERGE_ATR_MULT * atr; // pools.ts:260 — SL buffer mirrors this 0.25× idiom
```

**`src/lib/ict/regime.ts` ATR denominator** (lines 16-40):
```typescript
export function computeATR(candles: Candle[], period: number = ATR_PERIOD): number[] {
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`computeATR requires a positive integer period, got ${period}`);
  }
  const closed = closedOnly(candles);
  if (closed.length < period + 1) {
    return [];
  }
```

**`components/ui/card.tsx` panel shell** (lines 4-20, 71-79):
```tsx
function Card({ className, size = "default", ...props }: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div data-slot="card" data-size={size}
      className={cn("group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 ...", className)}
```

**`.planning/PROJECT.md` allowlist** (lines 73, 79) — planner must include the docs edit:
```
Tech stack: ... shadcn primitives (button, dropdown-menu, dialog, toast, calendar, card).
- Shadcn usage restricted to: button, dropdown-menu, dialog, toast, calendar, card.
→ amend both lines to append `, slider` (7th primitive, first amendment since v1.0).
```

---

## Shared Patterns

### CALIBRATION-PROVISIONAL + boundary-test pins
**Source:** `src/lib/ict/trigger.ts` lines 19-30; `src/lib/ict/pools.ts` lines 15-35; `src/lib/ticket.ts` lines 19-21
**Apply to:** Threshold retune (D-03), buffer multiples (D-08), pool-tolerance knobs (D-13), sandbox Apply path
```typescript
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1-4 fires/week (TRIG-04).
export const TRIGGER_KZ_START_MIN = 120;
// New buffer constants copy this comment shape; re-pinned constants stay CALIBRATION-PROVISIONAL until live evidence accrues.
```

### Purity guard (no clock, no store in ict)
**Source:** `src/lib/ict/purity.test.ts` lines 1-45
**Apply to:** Band-verdict helper, buffer helpers, pools-parity driver — anything under `src/lib/ict/`
```typescript
const sources = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
// Guard fails on: text.includes('Date.now(') → violations []; zustand/store imports → violations []
// Buffer/parity code injects asOf/epochs/ATR from callers; session fired-state lives in the driver (replay precedent).
```

### Refuse-null / never-throws selector envelopes
**Source:** `src/lib/ticket.ts` lines 302-305; `src/lib/store.ts` lines 1090-1101 (comment block)
```typescript
// Null envelopes degrade to STAND ASIDE — never a throw on null.
if (trigger === null || flaw === null || levels === null || range === null || dol === null || asia === null) {
  return standAside(REASON_NULL_INPUT, epoch, degraded);
}
// Calibration reads degrade honestly, never throw on empty log (empty body + verdict renders nothing).
```

### Verbatim Azerbaijani prose, toBe-pinned
**Source:** `src/lib/ict/trigger.ts` lines 85-108 (`REASON_BY_KEY`); `src/lib/ticket.ts` lines 81-89
**Apply to:** Buffer notes, band verdicts, proof-table rows
```typescript
const REASON_FIRE_LONG =
  'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.';
// Detector reasons render verbatim; buffer notes follow the same toBe idiom — never interpolate numbers (R/R ratio sole exception).
```

### Session-scoped Zustand (no persistence)
**Source:** `src/lib/store.ts` lines 506-508, 1066-1088 (`ticketInputs`, `setRiskPct`, `appendPaperLog` cap-50 idiom)
**Apply to:** Slider sandbox slice
```typescript
firingLog: [],
firingLogOverflow: 0,
ticketInputs: { riskPct: 1 },
// Sandbox: separate preview slice, session-ephemeral, refresh resets; Apply writes pinned constants + re-pins boundaries.
```

### Panel render discipline (dark terminal, typography, data-slots)
**Source:** `components/dashboard/firing-log-panel.tsx`; `21-UI-SPEC.md` Typography/Color sections; `components/ui/card.tsx`
**Apply to:** FiringLogPanel extension + sandbox block
- Titles Label role `text-[11px] font-semibold uppercase tracking-[0.1em]`; verdict/buffer-note Heading `text-base font-semibold`; numerics `font-mono tabular-nums`; secondary `text-muted-foreground`.
- HOLD `#00ff88 --terminal-up`, BREAK destructive, identical proof rows muted / divergent rows destructive; pool lines NEVER accent (`--terminal-up/down`).
- Loading `h-3 animate-pulse` rows on `lastUpdatedISO === null`; preview `opacity-45` + `BAXIŞ` tag; `data-slot="firing-log"` retained, new `data-slot="calibration-sandbox"`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | Every Phase 21 surface has a tracked in-repo analog: panel extensions (self), slider wrapper (`button.tsx`), sandbox slice (`ticketInputs`/`appendFiringLog`), parity suite (`parity.test.ts` + `replay.test.ts` driver), buffer insertion (`ticket.ts` SL/TP steps), band verdict (`summarizeReplay`). Planner falls back to RESEARCH.md Code Examples only for open numeric defaults (TP-pullback multiple per Open Question 1). |

## Metadata

**Analog search scope:** `components/dashboard/`, `components/ui/`, `src/lib/`, `src/lib/ict/`, `.planning/`, `components.json`
**Files scanned:** 14 dashboard + 6 ui primitives + 39 ict modules + 17 lib tests + store/ticket/panels (all reads above, no range re-read)
**Analog tracked-source check:** `git ls-files` confirms all 13 named analogs tracked; new files `src/lib/ict/pools-parity.test.ts` + `components/ui/slider.tsx` correctly absent (Wave 0 creates)
**Pattern extraction date:** 2026-09-17
