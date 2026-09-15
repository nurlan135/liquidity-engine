# Phase 16: Fatal-Flaw Invalidation - Pattern Map

**Mapped:** 2026-09-11
**Files analyzed:** 4 (2 new, 2 modified)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/ict/invalidation.ts` (new) | service (pure detector-fusion) | transform | `src/lib/ict/trigger.ts` | exact |
| `src/lib/ict/invalidation.test.ts` (new) | test | transform | `src/lib/ict/trigger.test.ts` | exact |
| `src/lib/store.ts` (modified: `selectFatalFlaw`) | store | request-response (derived selector) | `src/lib/store.ts` `selectTrigger` block | exact |
| `src/lib/store.test.ts` (modified: flaw selector cases) | test | transform | `src/lib/store.test.ts` trigger-block idiom | exact |

Supporting envelope analogs (consumed, not copied structurally): `src/lib/ict/smt.ts`, `src/lib/ict/judas.ts`, `src/lib/ict/rollover.ts` + `src/lib/ict/types.ts`, `src/lib/ict/purity.test.ts`.

All analog paths below verified git-tracked via `git ls-files` (non-empty output for every path named).

## Pattern Assignments

### `src/lib/ict/invalidation.ts` (service, transform)

**Analog:** `src/lib/ict/trigger.ts` (352 lines, read in full this session)

**Imports pattern** (lines 1-7):
```typescript
import { formatInTimeZone } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import type { AmdOutput } from '@/src/lib/ict/amd';
import { TOL_EPS } from '@/src/lib/ict/judas';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { FvgGap } from '@/src/lib/ict/fvg';
```
Copy: `@/`-aliased type-only imports of every consumed envelope plus `NY_TZ`/`formatInTimeZone` only if date rendering is needed; value-import only shared constants (`TOL_EPS` precedent). New file imports `TriggerOutput, TriggerReasonKey` types from `@/src/lib/ict/trigger`, `SmtOutput` from `@/src/lib/ict/smt`, `JudasOutput` from `@/src/lib/ict/judas`, `RolloverFlag` from `@/src/lib/ict/types`. Zero store/zustand imports (purity breach).

**Purity header discipline** (lines 9-17):
```typescript
// ICT-15 (D-01/D-02/D-03/D-04/D-05/D-06/D-07/D-10): three-gate WHY NOW
// trigger fusion over detector outputs. ...
// Pure:
// caller-supplied detector outputs plus an injected asOf epoch plus an
// injected alreadyFired boolean only — no clock reads, no store imports, no
// candle arrays, no ES input.
```
Copy: file-top comment naming the locked decisions, then an explicit `Pure:` allow-list. Flaw file states: trigger + smt + judas + rollover + stale envelopes plus injected `asOf` epoch only — no clock reads, no store imports, no candle arrays.

**CALIBRATION-PROVISIONAL constants** (lines 19-30):
```typescript
/** Killzone open in NY wall-clock minutes since midnight, exclusive (D-01). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1-4 fires/week (TRIG-04).
export const TRIGGER_KZ_START_MIN = 120;
```
Copy: every new exported threshold (only if genuinely new — reuse `CORR_MIN` for the SMT re-arm reference per RESEARCH) gets a doc comment + `CALIBRATION-PROVISIONAL` seed line. Source-text-pinned by tests (see test assignment).

**Input/output interface shape** (lines 36-69):
```typescript
export type TriggerReasonKey =
  | 'FIRE_LONG'
  | 'FIRE_SHORT'
  | 'ARMED_MISSING_TIMING'
  | ...
export interface TriggerInput {
  judas: JudasOutput | null;
  /** Carried for parity and downstream context; does NOT vote (D-05). */
  amd: AmdOutput | null;
  /** Read-only agree-tag only; never a gate, never blocks FIRE. */
  smt: SmtOutput | null;
  /** Active unmitigated FVG inventory from the selector boundary. */
  fvg: FvgGap[] | null;
  /** Injected evaluation instant in UTC epoch seconds — never a clock read. */
  asOf: number;
  /** Cooldown state injected by the caller (D-06): a FIRE already logged this session. */
  alreadyFired: boolean;
}
export interface TriggerOutput {
  verdict: TriggerVerdict;
  direction: TriggerDirection;
  reasonKey: TriggerReasonKey;
  /** Verbatim Azerbaijani sentence, test-pinned with toBe — never interpolated. */
  reason: string;
  gates: { timing: boolean; purge: boolean; displacement: boolean };
  /** D-04 handle the Phase 17 ticket consumes; non-null only on FIRE verdicts. */
  entryFvg: FvgGap | null;
  inputs: { judas: JudasOutput | null; amd: AmdOutput | null; smt: SmtOutput | null };
}
```
Copy: `FatalFlawInput { trigger, smt, judas, rollover, stale, asOf }` with per-field doc comments stating vote/no-vote role; `FatalFlawOutput` serializable (`invalidated`, `downgraded`, `flawClass`, `reasonKey`, `reason`, `unblock`, `sentence`, `challenge`, `carriedArmedReason`, `asOf`). Null envelopes degrade honestly, never throw on null.

**Verbatim prose table** (lines 82-111):
```typescript
// D-09 verbatim Azerbaijani reasons (locked with 15-03 wording): one base
// sentence per reasonKey plus at most one fixed SMT suffix. No number or
// price interpolation, no banned vocabulary.
const REASON_FIRE_LONG =
  'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.';
...
const REASON_BY_KEY: Record<TriggerReasonKey, string> = {
  FIRE_LONG: REASON_FIRE_LONG,
  ...
};
```
Copy: `REASON_BY_KEY`-style record for flaw reasons + `SENTENCE_BY_KEY` 4-cell table on `(direction × sweepSide)` + fixed 3-entry challenge bank. One base sentence per key, no `${}` interpolation, `toBe`-pinned. Fixed suffix idiom precedent (line 110-111): `const SMT_AGREE_SUFFIX = 'SMT razılaşır.'`.

**Boundary-throw discipline** (lines 162-190, 266-280):
```typescript
function assertValidJudas(judas: TriggerInput['judas']): void {
  if (judas === null || judas === undefined) {
    return;
  }
  if (typeof judas !== 'object' || Array.isArray(judas)) {
    throw new Error(`evaluateTrigger requires a JudasOutput object or null, got ${String(judas)}`);
  }
  ...
}
export function evaluateTrigger(input: TriggerInput): TriggerOutput {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`evaluateTrigger requires an input object, got ${String(input)}`);
  }
  const { judas, amd, smt, fvg, asOf, alreadyFired } = input;
  if (!Number.isFinite(asOf) || (asOf as number) <= 0) {
    throw new Error(`evaluateTrigger requires a finite positive asOf epoch, got ${String(asOf)}`);
  }
```
Copy: `checkFatalFlaw` mirrors it — malformed envelopes throw with `got ${String(...)}` strings; `asOf` required finite-positive; null envelopes return early (degrade), never throw.

**Direction helper** (lines 220-227):
```typescript
function directionOf(sweepSide: JudasOutput['sweepSide'] | null | undefined): TriggerDirection {
  if (sweepSide === 'HIGH') return 'SHORT';
  if (sweepSide === 'LOW') return 'LONG';
  return null;
}
```
Copy: reuse for the opposite-sweep SOFT predicate — confirmed judas whose side implies the counter-direction (`HIGH`→`SHORT`, `LOW`→`LONG`) disagrees with `trigger.direction`. Gate on `judas.confirmed === true` (D-03 closed-candle confirmation inherited) and non-null `sweepSide`.

**Core verdict construction + return** (lines 304-351):
```typescript
  const passes = (timing ? 1 : 0) + (purged ? 1 : 0) + (displacement ? 1 : 0);
  let verdict: TriggerVerdict;
  ...
  return {
    verdict,
    direction,
    reasonKey,
    reason: REASON_BY_KEY[reasonKey] + smtSuffix(judas, smt),
    gates: { timing, purge: purged, displacement },
    entryFvg: entry,
    inputs: { judas: judas ?? null, amd: amd ?? null, smt: smt ?? null },
  };
```
Copy: first-match-wins disjunction body (HARD rollover → HARD stale → SOFT SMT → SOFT opposite-sweep → clean). SOFT branches gated on `trigger.verdict === 'FIRE_LONG' || 'FIRE_SHORT'`; carry `trigger.reasonKey` as `carriedArmedReason`. Return carries `asOf` for Phase 18 replay.

---

### `src/lib/ict/smt.ts` — SOFT-flaw envelope analog (role-match)

**Analog:** `src/lib/ict/smt.ts` (lines 6-14, 30-45, 202-243)

**Suppression union** (lines 39-45):
```typescript
export interface SmtSuppressed {
  suppressed: true;
  reason: 'CORR_DECOUPLED' | 'rollover-week';
  corr?: number;
}
export type SmtOutput = SmtSignal | SmtSuppressed;
```
Copy the read pattern, not the shape: narrow on `smt.suppressed === true` then branch on `reason`. `CORR_MIN` reuse (line 12: `export const CORR_MIN = 0.7;`) — the D-13 unblock sentence names the fixed `"0.70"` threshold string, never interpolates live `corr`.

**Gate order** (lines 233-243):
```typescript
  if (paired.length < CORR_WINDOW) {
    return { suppressed: true, reason: 'CORR_DECOUPLED' };
  }
  ...
  if (!Number.isFinite(corr) || corr < CORR_MIN) {
    return { suppressed: true, reason: 'CORR_DECOUPLED', corr };
  }
```
Note: any `suppressed: true` regardless of reason is a SOFT flaw input; `corr` is optional so flaw code must handle its absence.

---

### `src/lib/ict/judas.ts` + `src/lib/ict/rollover.ts` — envelope analogs (role-match)

**JudasOutput** (`src/lib/ict/judas.ts` lines 29-36):
```typescript
export interface JudasOutput {
  candidate: boolean;
  confirmed: boolean;
  preRun: boolean;
  sweepSide: SweepSide | null;
  sweepTime: number | null;
  displacementMult: number;
}
```
SOFT opposite-sweep reads `confirmed === true` + `sweepSide` only. Confirmation window precedent (lines 191-206): close-based reversal inside sweep-plus-next-3 — flaw inherits D-03 closed-candle confirmation, never re-checks candles.

**RolloverFlag** (`src/lib/ict/types.ts` lines 41-45; `src/lib/ict/rollover.ts` lines 33-55):
```typescript
export interface RolloverFlag {
  rolloverSuspect: boolean;
  contractHint: string;
  proximityWarning: string | null;
}
```
HARD rollover reads `rolloverSuspect === true`. Never call date arithmetic in the flaw module — `detectRollover(closed, atr, asOfDate, hint)` runs at the selector boundary (existing `selectRollover` at `src/lib/store.ts:751-757`); flaw consumes the flag.

---

### `src/lib/store.ts` (modified — `selectFatalFlaw` selector; store, request-response)

**Analog:** `src/lib/store.ts` `selectTrigger` block (lines 830-869) + `sharedEpoch` (lines 430-438)

**Single time truth** (lines 430-438):
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
Copy: `selectFatalFlaw` calls `sharedEpoch(get)` exactly once — never a second derivation. The epoch is the trigger's own truth; pass it as `asOf` to `checkFatalFlaw`.

**Selector pattern** (lines 830-869):
```typescript
  // Phase 15 WHY NOW trigger: one poll-driven path from detectors through
  // evaluateTrigger to the firing log. Refuse-with-null on stale or empty
  // intraday legs; degraded detector outputs yield honest WAIT via
  // evaluateTrigger (null only on the throw path). FVG derives inline from
  // the same nq.candles the selectLiquidityPath precedent uses; empty or
  // stale maps to fvg null so the displacement gate fails honestly.
  selectTrigger: () => {
    const { nq, nq1h, nq15m } = get();
    if (nq1h.stale || nq15m.stale) return null;
    if (closedOnlyIntraday(nq1h.candles).length === 0) return null;
    if (closedOnlyIntraday(nq15m.candles).length === 0) return null;
    try {
      const epoch = sharedEpoch(get);
      const judas = get().selectJudas();
      const smt = get().selectSMT();
      const amd = get().selectAMD(epoch);
      ...
      const out = evaluateTrigger({ judas, amd, smt, fvg, asOf: epoch, alreadyFired });
      get().appendFiringLog(out, epoch);
      return out;
    } catch {
      return null;
    }
  },
```
Copy line-for-line in structure:
- Refuse-null guards first (stale/empty legs → `null`, no throw).
- One `try { ... } catch { return null; }` — selectors never throw into render (same idiom at `selectSMT` lines 763-772 and `selectRollover` lines 751-757).
- Derive trigger FIRST via `get().selectTrigger()`, then read the identical envelopes (`selectSMT`, `selectJudas`, `selectRollover`-style rollover derivation, per-leg `stale` booleans), then `checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf: epoch })`.
- Rollover derivation follows the inline-FVG precedent (lines 846-853): derive at the boundary inside inner try/catch → `null` degrades to "no HARD rollover signal" honestly.
- Trigger null → return null (SOFT never evaluated on null per D-12); HARD-on-null sub-case is planner's call per RESEARCH Pitfall 6.

**Interface + import additions:**
- Type declaration beside `selectTrigger` (`src/lib/store.ts:252`): `selectFatalFlaw: () => FatalFlawOutput | null;`
- Value import `checkFatalFlaw` + type imports following the trigger import block (lines 19-28); re-export comment discipline (lines 30-33): canonical output type stays in `invalidation.ts`, store re-exports the type only.

---

### `src/lib/ict/invalidation.test.ts` (new; test, transform)

**Analog:** `src/lib/ict/trigger.test.ts` (1001 lines; lines 1-160 read)

**Test imports + fixture builders** (lines 1-88):
```typescript
import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import {
  TRIGGER_DISP_MULT,
  ...
  evaluateTrigger,
} from '@/src/lib/ict/trigger';
import type { JudasOutput, SweepSide } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
...
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
function suppressedSmt(): SmtOutput {
  return { suppressed: true, reason: 'CORR_DECOUPLED', corr: 0.4 };
}
function nyMinuteEpoch(nyDate: string, hhmm: string): number {
  return Math.floor(fromZonedTime(`${nyDate} ${hhmm}:00`, NY_TZ).getTime() / 1000);
}
```
Copy: same header (`vitest` + `fromZonedTime` + `NY_TZ` + module import + envelope type imports), same `Partial<T>` override fixture builders for trigger/smt/judas/rollover/stale envelopes, same `nyMinuteEpoch` DST-aware epoch builder. No fake timers (injected instants need none — Pitfall 4 warning sign).

**Constant pins** (lines 94-123):
```typescript
describe('trigger: calibrated constants pinned', () => {
  it('pins TRIGGER_DISP_MULT, the killzone window, and the log cap', () => {
    expect(TRIGGER_DISP_MULT).toBe(0.5);
    ...
  });
  it('carries a CALIBRATION-PROVISIONAL comment on every TRIGGER constant (TRIG-04)', async () => {
    const modules = import.meta.glob('./trigger.ts', { query: '?raw', import: 'default', eager: true, }) as Record<string, string>;
    ...
    expect(preceding).toContain('CALIBRATION-PROVISIONAL');
  });
});
```
Copy: pin every new `FLAW_*` constant value with `toBe` + the source-text `CALIBRATION-PROVISIONAL` pin via `import.meta.glob('./invalidation.ts', ...)` — same channel the purity guard reads, no fs dependency.

**Verbatim prose pins** (lines 134-160):
```typescript
    expect(out.verdict).toBe('FIRE_LONG');
    expect(out.direction).toBe('LONG');
    expect(out.reasonKey).toBe('FIRE_LONG');
    expect(out.reason).toBe(
      'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır. SMT razılaşır.',
    );
    expect(out.gates).toEqual({ timing: true, purge: true, displacement: true });
```
Copy: disjunction table (rollover→HARD from ARMED/WAIT too; stale→HARD; SMT suppressed→SOFT downgrade FIRING→ARMED + unblock; opposite sweep→SOFT; SOFT on ARMED/WAIT→untouched + carried reason), determinism (100-run byte-identical), race fixture (FIRE + flaw same snapshot → INVALIDATED with both reasons), and `toBe` pins on every `reason`/`sentence`/`challenge` plus the generic-`"Invalidated"` ban assertion.

---

### `src/lib/store.test.ts` (modified; test, transform)

**Analog:** `src/lib/store.test.ts` trigger-block idiom (lines 1110-1174)

**Stale-guard test** (lines 1110-1132):
```typescript
  it('trigger-stale: stale nq15m or nq1h forces selectTrigger null', async () => {
    const { useDashboard } = await resetDualState();
    stubFourLegs();
    ...
    useDashboard.setState({
      nq15m: { ...useDashboard.getState().nq15m, stale: true, lastError: '15m stale' },
    });
    expect(useDashboard.getState().selectTrigger()).toBeNull();
```
Copy: `flaw-stale` case — same `resetDualState` + `stubFourLegs` + refresh + `setState` stale-flag + `toBeNull` shape.

**Coherence test** (lines 1146-1158):
```typescript
  it('trigger-coherence: selectTrigger shares its epoch with selectAMD on the same poll', async () => {
    ...
    // Same state, back-to-back: the trigger-carried AMD snapshot equals the
    // direct selectAMD derivation — both read sharedEpoch, never torn clocks.
    const trigger = useDashboard.getState().selectTrigger();
    expect(trigger).not.toBeNull();
    expect(trigger!.inputs.amd).toEqual(useDashboard.getState().selectAMD());
```
Copy: `flaw-coherence` case — back-to-back `selectFatalFlaw()` equals flaw re-evaluation on the trigger's own snapshot; assert `flaw.asOf` equals the trigger epoch and no second clock read.

---

## Shared Patterns

### Purity (applies to: `invalidation.ts`, automatically verified)
**Source:** `src/lib/ict/purity.test.ts` (lines 8-44)
```typescript
const sources = import.meta.glob('./*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
function ictSources(): Array<[string, string]> {
  return Object.entries(sources).filter(([path]) => !path.endsWith('.test.ts'));
}
...
  it('contains no Date.now( clock reads', () => {
    const violations = ictSources()
      .filter(([, text]) => text.includes('Date.now('))
      .map(([path]) => path);
    expect(violations).toEqual([]);
  });
```
The `./*.ts` glob auto-covers the new file — no guard edit needed. Rules: no `Date.now(`, no `zustand`/`src/lib/store` imports, `asOf` required (never `?? Date.now()`), stale as plain booleans.

### Error Handling (applies to: all four files)
**Sources:** `src/lib/ict/trigger.ts:162-190, 266-280` (boundary throws with got-strings; null degrades); `src/lib/store.ts:763-772, 836-869` (selector try/catch-never-throw, refuse-null first)
- Pure layer: malformed envelope → `throw new Error('... got ${String(x)}')`; null envelope → honest degrade, never throw.
- Store layer: guards first, everything else inside `try`, `catch { return null; }`. Null means degraded — never a throw into render.

### Validation (applies to: `invalidation.ts`, `invalidation.test.ts`)
**Source:** `src/lib/ict/trigger.ts:195-218` (`assertValidFvg`: array check, per-object finite-bounds + polarity checks with got-strings)
```typescript
function assertValidFvg(fvg: TriggerInput['fvg']): void {
  if (fvg === null || fvg === undefined) {
    return;
  }
  if (!Array.isArray(fvg)) {
    throw new Error(`evaluateTrigger requires an FvgGap array or null, got ${String(fvg)}`);
  }
```
Mirror with `assertValidTrigger`/`assertValidSmt`/`assertValidJudas`/`assertValidRollover`/`assertValidStale` in the flaw module. Test both sides: malformed → throws with got-string; null → degrades.

### Selector Derivation (applies to: `selectFatalFlaw` in `store.ts`)
**Source:** `src/lib/store.ts:818-828` (`selectAMD`), `836-869` (`selectTrigger`)
- `selectAMD`-style optional-epoch parameter is NOT copied — flaw takes the trigger's epoch, never its own `asOf?` override (second clock read = P3 torn-read).
- `selectRollover` (`src/lib/store.ts:751-757`) is the rollover-derivation call to reuse if it satisfies the flaw's date-string input; else derive inline per the FVG precedent.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | None. All four files have exact analogs. The only novel content (4-cell direction × sweep-side sentence table, 3-entry challenge bank, HARD/SOFT precedence order) is new logic inside the `trigger.ts` structural shell — planner drafts prose at plan time per D-10, no codebase analog needed or expected. |

## Metadata

**Analog search scope:** `src/lib/ict/*.ts`, `src/lib/store.ts`, `src/lib/store.test.ts`
**Files scanned:** 8 read/grepped (`trigger.ts`, `trigger.test.ts`, `smt.ts`, `judas.ts`, `rollover.ts`, `types.ts`, `store.ts`, `store.test.ts`) + `purity.test.ts`
**Pattern extraction date:** 2026-09-11
**Strong-match stop:** 5 analogs (trigger module, trigger test, store selector block, store test block, purity guard) + 3 envelope references (smt, judas, rollover) — search stopped per early-stopping rule.
