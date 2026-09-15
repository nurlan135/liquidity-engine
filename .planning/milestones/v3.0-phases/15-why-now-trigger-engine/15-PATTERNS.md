# Phase 15: WHY NOW Trigger Engine - Pattern Map

**Mapped:** 2026-09-10
**Files analyzed:** 4 (2 new, 2 modified)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/ict/trigger.ts` (new) | service (pure ICT fusion) | transform (detector outputs → verdict) | `src/lib/ict/amd.ts` | exact |
| `src/lib/ict/trigger.test.ts` (new) | test | transform | `src/lib/ict/amd.test.ts` + `src/lib/ict/judas.test.ts` | exact |
| `src/lib/store.ts` (modified — `selectTrigger`, firing-log slice, `firingLogToJson`, `sharedEpoch`) | store | request-response (derived selector, poll-driven) | `src/lib/store.ts` (`selectJudas`/`selectAMD`/`selectLiquidityPath`/`selectRange4H`) | exact (self) |
| `src/lib/store.test.ts` (modified — selector + cap/dedup + serializer tests) | test | request-response | `src/lib/store.test.ts` (stale-refusal / empty-refusal / all-degraded) | exact (self) |

All analog paths verified git-TRACKED via `git ls-files` (judas.ts, amd.ts, fvg.ts, smt.ts, asia.ts, aggregate.ts, store.ts, store.test.ts, judas.test.ts, amd.test.ts, fvg.test.ts, purity.test.ts — all printed, non-empty).

## Pattern Assignments

### `src/lib/ict/trigger.ts` (service, transform)

**Analog:** `src/lib/ict/amd.ts` (primary — pure fusion over detector outputs + injected `asOf` + verbatim Azerbaijani reasons); secondary `src/lib/ict/judas.ts` (constants + strict killzone edges + boundary validation).

**Imports pattern** (`src/lib/ict/amd.ts` lines 1-5; `src/lib/ict/judas.ts` lines 1-5):
```typescript
// Copy: type-only detector imports + NY_TZ from aggregate, date-fns-tz for wall clock.
// trigger.ts needs: JudasOutput, AmdOutput, SmtOutput, FvgGap types + NY_TZ + formatInTimeZone.
import { formatInTimeZone } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import type { AsiaRange } from '@/src/lib/ict/asia';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
```

**Constants pattern** (`src/lib/ict/judas.ts` lines 16-25 — `CALIBRATION-PROVISIONAL` precedent that `TRIGGER_*` mirrors):
```typescript
/** Killzone open in NY wall-clock minutes since midnight, exclusive (D-07). */
export const KILLZONE_START_MIN = 120;
/** Killzone close in NY wall-clock minutes since midnight, exclusive (D-07). */
export const KILLZONE_END_MIN = 300;
/** Displacement seed as a multiple of Asia height (D-09, budget-tuned). */
export const DISP_MULT = 0.5;
/** Confirmation window in candles: the sweep plus the next 3 (D-10). */
export const CONFIRM_WINDOW = 4;
/** Epsilon for displacement boundary compares. */
export const TOL_EPS = 1e-9;
```
```typescript
// trigger.ts copies shape verbatim (RESEARCH §Code Examples lines 274-277):
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1–4 fires/week (TRIG-04).
export const TRIGGER_KZ_START_MIN = 120; // mirrors KILLZONE_START_MIN
export const TRIGGER_KZ_END_MIN = 300;   // mirrors KILLZONE_END_MIN
export const TRIGGER_DISP_MULT = 0.5;    // D-03: mirrors DISP_MULT
export const TRIGGER_LOG_CAP = 50;       // D-08: firing-log cap
```

**Wall-clock helper pattern** (`src/lib/ict/judas.ts` lines 60-64; identical in `amd.ts` lines 63-67, `asia.ts` lines 53-61):
```typescript
function nyMinutesOf(timeSec: number): number {
  const hour = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'H'));
  const minute = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'm'));
  return hour * 60 + minute;
}
```
```typescript
// Session-date key precedent (aggregate.ts lines 41-43; asia.ts lines 59-61):
function nyDateOf(timeSec: number): string {
  return formatInTimeZone(timeSec * 1000, NY_TZ, 'yyyy-MM-dd');
}
```
Copy both into `trigger.ts` (timing gate + cooldown session key). Never `getHours()` arithmetic, never fixed UTC offsets.

**Killzone edge discipline** (`src/lib/ict/judas.ts` lines 172-181 — strict inequality, preRun never promoted):
```typescript
if (minutes <= KILLZONE_START_MIN || minutes >= KILLZONE_END_MIN) {
  return {
    candidate: false,
    confirmed: false,
    preRun: true,
    sweepSide,
    sweepTime: sweep.time,
    displacementMult: 0,
  };
}
```
Trigger timing gate mirrors strict exclusivity: `mins > TRIGGER_KZ_START_MIN && mins < TRIGGER_KZ_END_MIN` (minutes 120/300 → timing false). D-01 falls out of `judas.confirmed === true` alone — do NOT add any `NY_SESSION` import/branch in `trigger.ts` (Pitfall 2).

**Input shape + validation pattern** (`src/lib/ict/amd.ts` lines 30-36 input, 121-144 `assertValidJudas`, 146-156 entry guard):
```typescript
export interface AmdInput {
  asia: AsiaRange | null;
  judas: JudasOutput | null;
  smt: SmtOutput | null;
  /** Injected evaluation instant in UTC epoch seconds — never a clock read. */
  asOf: number;
}
```
```typescript
function assertValidJudas(judas: AmdInput['judas']): void {
  if (judas === null || judas === undefined) {
    return;
  }
  if (typeof judas !== 'object' || Array.isArray(judas)) {
    throw new Error(`amdPhase requires a JudasOutput object or null, got ${String(judas)}`);
  }
  const j = judas as JudasOutput;
  if (typeof j.candidate !== 'boolean' || typeof j.confirmed !== 'boolean') {
    throw new Error(
      `amdPhase requires boolean judas candidate/confirmed, got candidate=${String(j.candidate)} confirmed=${String(j.confirmed)}`,
    );
  }
  // ... sweepTime finite-positive-or-null, sweepSide HIGH/LOW/null checks (lines 134-143)
}
```
```typescript
export function amdPhase(input: AmdInput): AmdOutput {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`amdPhase requires an input object, got ${String(input)}`);
  }
  const { asia, judas, smt, asOf } = input;
  if (!Number.isFinite(asOf) || (asOf as number) <= 0) {
    throw new Error(`amdPhase requires a finite positive asOf epoch, got ${String(asOf)}`);
  }
```
`trigger.ts` copies: `TriggerInput { judas, amd, smt, fvg, asOf, alreadyFired }` with the same throw-at-boundary idiom (non-finite/positive `asOf` throws; malformed `judas` envelope throws; null detector inputs degrade to WAIT, never throw). `amd` carried for parity/downstream, does NOT vote. `smt` read-only suffix only.

**Reason-assembly pattern** (`src/lib/ict/amd.ts` lines 48-58 constants, 95-111 `smtTag`, 160-164 assembly):
```typescript
const REASON_CONFIRMED = 'Asia Range Təmizlənib. London Judas Swing Baş verib.';
const SMT_AGREE_TAG = 'SMT razılaşır.';
const SMT_SUPPRESSED_TAG = 'SMT Gözlənilir.';
```
```typescript
function smtTag(judas: JudasOutput | null | undefined, smt: SmtOutput | null | undefined): string {
  if (smt === null || smt === undefined) {
    return '';
  }
  if (smt.suppressed) {
    return ` ${SMT_SUPPRESSED_TAG}`;
  }
  if (judas !== null && judas !== undefined && judas.confirmed && judas.sweepSide !== null) {
    if (judas.sweepSide === 'HIGH' && smt.direction === 'BEARISH') {
      return ` ${SMT_AGREE_TAG}`;
    }
    if (judas.sweepSide === 'LOW' && smt.direction === 'BULLISH') {
      return ` ${SMT_AGREE_TAG}`;
    }
  }
  return '';
}
```
```typescript
const reason = base.reason + smtTag(judas, smt);
```
Trigger copies deterministic sentence selection: one base Azerbaijani sentence per `reasonKey` + at most one fixed SMT agree-suffix. No number/price interpolation (breaks verbatim `toBe` pins). Suppressed SMT never blocks FIRE.

**FVG-handle types** (`src/lib/ict/fvg.ts` lines 8-18):
```typescript
export const FVG_MAP_BOUND = 20;
export type FvgPolarity = 'BULLISH' | 'BEARISH';
export interface FvgGap {
  polarity: FvgPolarity;
  top: number;
  bottom: number;
  originDate: string;
  mitigated: boolean;
}
```
`entryFvg: FvgGap | null` — null unless FIRE. Selection rule (planner locks): most recent `originDate` of required polarity (`LONG→BULLISH`, `SHORT→BEARISH`).

**Purity header comment precedent** (`src/lib/ict/judas.ts` lines 7-14; `amd.ts` lines 7-16; `fvg.ts` lines 1-2):
```typescript
// Pure: caller-supplied rows plus an AsiaRange only — no clock reads, no
// store imports, no ES input, no rollover or SMT state (read-only rule).
```
`trigger.ts` carries the same header: detector outputs + injected `asOf` + `alreadyFired` only.

---

### `src/lib/ict/trigger.test.ts` (test, transform)

**Analog:** `src/lib/ict/amd.test.ts` (fixture-builder + prose-pin idiom) + `src/lib/ict/judas.test.ts` (epoch builders + killzone strip + constant pins).

**Fixture builders** (`src/lib/ict/amd.test.ts` lines 18-45):
```typescript
function fixtureJudas(overrides: Partial<JudasOutput> = {}): JudasOutput {
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

function signalSmt(
  direction: 'BULLISH' | 'BEARISH' | 'NO-SIGNAL' = 'BEARISH',
): SmtOutput {
  return {
    suppressed: false,
    direction,
    sweeperLeg: 'NQ',
    nqWindow: null,
    esWindow: null,
    bpsGap: 30,
  };
}

function suppressedSmt(): SmtOutput {
  return { suppressed: true, reason: 'CORR_DECOUPLED', corr: 0.4 };
}
```
Copy `fixtureTriggerJudas` / `signalSmt` / `suppressedSmt` verbatim; add `fixtureFvg(polarity)` list builder in `fvg.test.ts` `candle()`+`dated()` style (`fvg.test.ts` lines 14-20).

**Epoch builders** (`src/lib/ict/judas.test.ts` lines 32-64; same shape in `amd.test.ts` lines 51-59):
```typescript
function nyHourEpoch(nyDate: string, nyHour: number): number {
  return Math.floor(fromZonedTime(`${nyDate} ${String(nyHour).padStart(2, '0')}:00:00`, NY_TZ).getTime() / 1000);
}

function nyMinuteEpoch(nyDate: string, hhmm: string): number {
  return Math.floor(fromZonedTime(`${nyDate} ${hhmm}:00`, NY_TZ).getTime() / 1000);
}

// Twelve consecutive closed 15M rows starting at a NY wall-clock HH:MM —
// the full 02:00-05:00 killzone strip.
function block15(nyDate: string, startHhmm: string, price = BASE): IntradayCandle[] {
  const rows: IntradayCandle[] = [];
  let t = nyMinuteEpoch(nyDate, startHhmm);
  for (let i = 0; i < 12; i++) {
    rows.push(row(t, price));
    t += STEP;
  }
  return rows;
}
```
Do NOT invent new time builders. `SESSION = '2026-06-15'` fixture-date idiom (`judas.test.ts` line 68, `amd.test.ts` line 12); `fixtureRange()` Asia anchor (`judas.test.ts` lines 70-72).

**Row builder** (`src/lib/ict/judas.test.ts` lines 17-26):
```typescript
function row(time: number, price: number, overrides: Partial<IntradayCandle> = {}): IntradayCandle {
  return {
    time,
    open: price,
    high: price + 8,
    low: price - 6,
    close: price + 3,
    ...overrides,
  };
}
```

**Verbatim prose pins** (`src/lib/ict/amd.test.ts` lines 61-69):
```typescript
describe('amd: accumulation on Asia hours with null Judas', () => {
  it('returns accumulation with the exact accumulation reason', () => {
    const out = amdPhase({ asia: fixtureAsia(), judas: null, smt: null, asOf: asiaHourEpoch() });
    expect(out.phase).toBe('accumulation');
    expect(out.reason).toBe('Asia Range Təmizlənməyib. London Judas Swing Gözlənilir.');
    expect(out.inputs.asia).toEqual(fixtureAsia());
    expect(out.inputs.judas).toBeNull();
    expect(out.inputs.smt).toBeNull();
  });
});
```
Trigger copies `toBe` (never `toContain`) for all 4+ verdict reasons once planner locks D-09 wording.

**Constant-pin + gate-table + boundary coverage** (extends `judas.test.ts`/`amd.test.ts` idiom):
- `TRIGGER_DISP_MULT === 0.5`, kz window `120/300`, `TRIGGER_LOG_CAP === 50` pinned with `toBe`.
- Gate table: 3/3 → FIRE_LONG (LOW sweep) / FIRE_SHORT (HIGH sweep); each exactly-2-of-3 → ARMED + matching `reasonKey`; 0–1 → WAIT_FOR_MANIPULATION.
- Boundaries: disp just-below/just-above 0.5; killzone edge minutes 120/300 exclusive → timing false; `TOL_EPS = 1e-9` float-compare precedent (`judas.ts` line 197: `dist + TOL_EPS >= threshold`; `smt.ts` line 297 `TOL_EPS_BPS = 1e-9`).
- Spam-guard: choppy-sideways fixture (no sweep, e.g. price 20050 rows strictly inside 20100/20000 per `judas.test.ts` lines 66-67) → WAIT, 0–1 gates.
- Cooldown matrix: `alreadyFired: true/false`; no-FVG → max ARMED (D-04); NY-hours sweep → purge false → never FIRE (D-01); suppressed SMT → FIRE still allowed (suffix only).
- Malformed-input throws: `amd.test.ts` lines 227-243 precedent (`candidate: 1`, string `sweepTime`, `'BOTH'` sweepSide all throw).

---

### `src/lib/store.ts` (store, request-response) — MODIFIED

**Analog:** itself — `selectJudas` / `selectAMD` / `selectLiquidityPath` / `selectRange4H` + type/interface block.

**Interface registration** (`src/lib/store.ts` lines 232-237):
```typescript
selectSMT: () => SmtOutput | null;
selectAsia: () => AsiaRange | null;
selectJudas: () => JudasOutput | null;
selectAMD: (asOf?: number) => AmdOutput | null;
selectConfluence: () => ConvictionTier;
selectLiquidityPath: () => string | null;
```
Add beside them: `selectTrigger: () => TriggerOutput | null;` + `firingLog: FiringLogEntry[];` + `firingLogOverflow: number;` + `appendFiringLog: (out: TriggerOutput, asOf: number) => void;` (naming per RESEARCH Pattern 4/5; planner finalizes). Import `evaluateTrigger` + types + `TRIGGER_LOG_CAP` from `@/src/lib/ict/trigger` following lines 13-17 import-block style:
```typescript
import { asiaRange, type AsiaRange } from '@/src/lib/ict/asia';
import { judasSwing, type JudasOutput } from '@/src/lib/ict/judas';
import { evaluateSMT, type SmtOutput } from '@/src/lib/ict/smt';
import { amdPhase, type AmdOutput } from '@/src/lib/ict/amd';
import { applyMitigation, describeDeliveryTransition, detectFVGs, detectTransition } from '@/src/lib/ict/fvg';
```

**Selector envelope — refuse + try/catch-never-throw** (`src/lib/store.ts` lines 695-704 `selectSMT`, 736-748 `selectJudas`, 770-781 `selectLiquidityPath`):
```typescript
selectSMT: () => {
  const { nq, es, asOfBaku } = get();
  if (nq.stale || es.stale) return null;
  if (nq.candles.length === 0 || es.candles.length === 0) return null;
  try {
    return evaluateSMT(nq.candles, es.candles, asOfBaku);
  } catch {
    return null;
  }
},
```
```typescript
selectLiquidityPath: () => {
  const { nq, asOfBaku } = get();
  if (nq.stale) return null;
  if (nq.candles.length === 0) return null;
  try {
    const gaps = detectFVGs(nq.candles);
    const active = applyMitigation(gaps, nq.candles);
    return describeDeliveryTransition(detectTransition(active, nq.candles, asOfBaku));
  } catch {
    return null;
  }
},
```
`selectTrigger` copies this envelope exactly: stale/empty `nq15m` (and `nq1h` for Asia) → `null`; degraded detector outputs → honest WAIT via `evaluateTrigger` (not selector `null`); `null` only on the throw path. FVG derivation is inline `detectFVGs(nq.candles) → applyMitigation` on `nq.candles` + `asOfBaku` per Pitfall-4 precedent (`store.ts` lines 770-781); empty/stale → `fvg: null` → displacement gate honestly fails to ARMED.

**Epoch fallback → `sharedEpoch(get)` extraction** (`src/lib/store.ts` lines 750-766):
```typescript
selectAMD: (asOf?: number) => {
  try {
    const asia = get().selectAsia();
    const judas = get().selectJudas();
    const smt = get().selectSMT();
    const epoch =
      asOf ??
      (() => {
        const iso = get().nq1h.lastUpdatedISO;
        const parsed = iso === null ? NaN : new Date(iso).getTime();
        return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : Math.floor(new Date().getTime() / 1000);
      })();
    return amdPhase({ asia, judas, smt, asOf: epoch });
  } catch {
    return null;
  }
},
```
Extract the IIFE into module-scope `sharedEpoch(get)` and reuse in both `selectAMD` and `selectTrigger` — single time truth, no torn reads, no duplication. `Date.now()` lives ONLY here at the caller boundary (legal; `ict/` never reads clocks per purity guard).

**NY-date-from-data precedent** (`src/lib/store.ts` lines 624-628 `selectRange4H`):
```typescript
const sorted = [...closed].sort((a, b) => a.time - b.time);
const latest = sorted[sorted.length - 1];
const asOf = formatInTimeZone(latest.time * 1000, NY_TZ, 'yyyy-MM-dd');
```
Cooldown session key uses the same `formatInTimeZone(..., NY_TZ, 'yyyy-MM-dd')` idiom on the trigger `asOf` (NY calendar date per RESEARCH A2 — planner confirms vs Asia `sessionDate`).

**Firing-log slice logic** (new; no direct in-repo analog — closest is per-leg `lastError` refuse-with-reason envelope + cap discipline). Specified shape (RESEARCH §Code Examples):
```typescript
export interface FiringLogEntry {
  asOf: number;
  verdict: TriggerVerdict;
  gates: { timing: boolean; purge: boolean; displacement: boolean };
  direction: TriggerDirection;
  reasonKey: TriggerReasonKey;
  sessionDate: string; // NY-date key, D-06 dedup + replay reconstruction
}
// appendFiringLog: append iff verdict !== 'WAIT_FOR_MANIPULATION';
//   FIRE_* skipped when a FIRE_* with same sessionDate exists (D-06);
//   drop oldest beyond TRIGGER_LOG_CAP (with overflow counter).
// firingLogToJson(entries): string — includes { entries, thresholds: { TRIGGER_DISP_MULT, TRIGGER_KZ_START_MIN, TRIGGER_KZ_END_MIN }, exportedAt: <caller ISO> }.
//   Pure + unit-tested; Blob/anchor download wiring is the Phase 17 seam.
```

---

### `src/lib/store.test.ts` (test, request-response) — MODIFIED

**Analog:** itself — stale-refusal / empty-refusal / all-degraded blocks (`src/lib/store.test.ts` lines 855-973).

**Stale-refusal pattern** (lines 855-882):
```typescript
it('stale-refusal: stale nq1h forces selectAsia null, stale ES forces selectSMT null', async () => {
  const { useDashboard } = await resetDualState();
  stubFourLegs();
  await useDashboard.getState().refreshNQ();
  // ...
  useDashboard.setState({
    nq1h: { ...useDashboard.getState().nq1h, stale: true, lastError: 'intraday stale' },
  });
  expect(useDashboard.getState().selectAsia()).toBeNull();
  expect(useDashboard.getState().selectJudas()).toBeNull();
  expect(useDashboard.getState().nq1h.lastError).toBe('intraday stale');
  // ...
  useDashboard.getState().stopDualPoll();
});
```

**Asia-fallback fixture pattern** (lines 884-916 — `fromZonedTime` epoch helper + inline `mk` row builder):
```typescript
const { fromZonedTime } = await import('date-fns-tz');
const epoch = (s: string) => Math.floor(fromZonedTime(s, 'America/New_York').getTime() / 1000);
const mk = (time: number, i: number) => ({
  time,
  open: 20000 + i * 10,
  high: 20000 + i * 10 + 15,
  low: 20000 + i * 10 - 12,
  close: 20000 + i * 10 + 5,
});
```

**Empty/all-degraded pattern** (lines 918-973):
```typescript
expect(() => {
  asia = useDashboard.getState().selectAsia();
  judas = useDashboard.getState().selectJudas();
  smt = useDashboard.getState().selectSMT();
  amd = useDashboard.getState().selectAMD(1770500000);
  path = useDashboard.getState().selectLiquidityPath();
}).not.toThrow();
// ...
expect(state.selectSMT()).toBeNull();
expect(state.selectConfluence()).toBe('standart');
```
New `selectTrigger` tests copy all three: stale-`nq15m` → `null`; empty legs → `null` without throwing; shared-epoch coherence with `selectAMD`; log cap-50/oldest-drop + FIRE-session-dedup + `firingLogToJson` shape incl. threshold versions. `resetDualState()` + `stubFourLegs()` + `mockIntradayEnvelope` + `stopDualPoll()` lifecycle copied from the same file.

---

## Shared Patterns

### Purity (applies to: `trigger.ts`, `trigger.test.ts`)
**Source:** `src/lib/ict/purity.test.ts` (lines 18-44)
```typescript
function hasStoreImport(text: string): boolean {
  return (
    text.includes("'zustand'") ||
    text.includes('"zustand"') ||
    text.includes("'src/lib/store'") ||
    text.includes('"src/lib/store"') ||
    text.includes("'@/store") ||
    text.includes('"@/store') ||
    text.includes("'@/src/lib/store") ||
    text.includes('"@/src/lib/store')
  );
}

describe('ict purity guard', () => {
  it('contains no Date.now( clock reads', () => {
    const violations = ictSources()
      .filter(([, text]) => text.includes('Date.now('))
      .map(([path]) => path);
    expect(violations).toEqual([]);
  });

  it('contains no store imports', () => {
    const violations = ictSources()
      .filter(([, text]) => hasStoreImport(text))
      .map(([path]) => path);
    expect(violations).toEqual([]);
  });
});
```
`trigger.ts` is auto-scanned (glob `./*.ts`, test files excluded) with zero config change. No `Date.now(`, no zustand/store imports. Cooldown arrives as injected `alreadyFired: boolean`; time as injected `asOf` epoch seconds.

### Error handling — throw-at-boundary + selector never-throws (applies to: all files)
**Sources:** `src/lib/ict/judas.ts` (lines 96-112), `src/lib/ict/amd.ts` (lines 121-156), `src/lib/store.ts` (lines 695-704)
- ICT layer throws `Error` with `got ${String(x)}` interpolation on malformed envelopes (non-array rows, non-finite AsiaRange, non-finite/positive `dispMult`/`asOf`, malformed `judas`).
- Honest degrade returns (never throws): empty deduped rows → `idle()` (`judas.ts` lines 130-132); empty Asia window → `null` (`asia.ts` lines 121-123); null detector inputs in trigger → WAIT with per-gate booleans.
- Store selectors wrap every detector call in `try { ... } catch { return null; }`. Null means degraded — never a throw into render.

### Validation — finite-OHLC + finite-time drop filters (applies to: `trigger.ts` indirectly via detectors)
**Source:** `src/lib/ict/judas.ts` (lines 38-53, 118-128)
```typescript
function hasFiniteOhlc(c: IntradayCandle): boolean {
  return (
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
}

function hasValidTime(c: IntradayCandle): boolean {
  return Number.isFinite(c.time) && c.time > 0;
}
```
Trigger inherits clean outputs only; its own boundary validates the `TriggerInput` envelope (`asOf` finite-positive, `FvgGap` finiteness via `assertFiniteGap` precedent in `fvg.ts` lines 29-35).

### Response envelope — verdict + reason + inputs echo (applies to: `trigger.ts`)
**Source:** `src/lib/ict/amd.ts` (lines 38-46 `AmdOutput`)
```typescript
export interface AmdOutput {
  phase: AmdPhase;
  reason: string;
  inputs: {
    asia: AsiaRange | null;
    judas: JudasOutput | null;
    smt: SmtOutput | null;
  };
}
```
`TriggerOutput { verdict, direction, reasonKey, reason, gates, entryFvg, inputs: { judas, amd, smt } }` keeps the echo for Phase 16 flaw snapshot + Phase 18 bar-by-bar replay. Serializable only (plain `FvgGap` data, no class instances).

### Direction map (applies to: `trigger.ts`)
**Source:** `src/lib/ict/amd.ts` (lines 102-110 `smtTag` concordance) + `src/lib/ict/judas.ts` (line 215 magnitude-only displacement)
```typescript
if (judas.sweepSide === 'HIGH' && smt.direction === 'BEARISH') {
  return ` ${SMT_AGREE_TAG}`;
}
if (judas.sweepSide === 'LOW' && smt.direction === 'BULLISH') {
  return ` ${SMT_AGREE_TAG}`;
}
```
D-10 reduces to total function of `sweepSide`: `HIGH → FIRE_SHORT`, `LOW → FIRE_LONG` (`JudasOutput.displacementMult` is magnitude only — `Math.max(0, maxDist) / height`). Null `sweepSide` forces purge gate false.

## No Analog Found

| File / Piece | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `firingLogToJson` serializer + Blob/anchor download | utility (store module scope) | batch (export) | Repo grep for `createObjectURL\|Blob` in `components/` returned nothing (RESEARCH Pattern 5) — no download precedent. Phase 15 ships the pure serializer only; click wiring is the Phase 17 seam. Planner uses RESEARCH spec shape. |
| Firing-log cap-50 + oldest-drop + overflow counter | store slice | batch (bounded append) | No existing bounded-log slice in `store.ts`; closest discipline is the per-leg envelope + `FVG_MAP_BOUND = 20` trailing slice (`fvg.ts` line 118: `active.slice(-FVG_MAP_BOUND)`). Copy that slice idiom for the cap. |

## Metadata

**Analog search scope:** `src/lib/ict/` (all 14 test + source files), `src/lib/store.ts`, `src/lib/store.test.ts`
**Files scanned:** 12 (7 sources + 5 tests, each read once in full — all ≤ 2,000 lines; no re-reads)
**Analog freshness:** most recent touch `9243007 feat(14-03)` (purity guard); Asia fallback `edbc70a`; all ICT modules at 300/300 green post-Phase-14 baseline
**Pattern extraction date:** 2026-09-10
