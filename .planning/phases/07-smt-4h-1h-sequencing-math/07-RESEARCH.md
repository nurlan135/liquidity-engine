# Phase 7: SMT + 4H/1H Sequencing Math - Research

**Researched:** 2026-09-07
**Domain:** Pure-function ICT market-structure math (SMT divergence, correlation gate, rollover suppression, FVG/IRL transition, 1H→4H aggregation) in `src/lib/ict`
**Confidence:** HIGH for in-repo contracts and patterns; MEDIUM for ICT semantics and session mechanics; LOW for Pearson/FVG construction details (standard formulas, pinned by tests)

## Summary

Phase 7 builds four pure-function modules on top of the proven Phase 6 data contracts: a time-anchored SMT comparator (`smt.ts`) fed exclusively by `JoinResult` rows from `join.ts`, a rolling 20-day Pearson correlation gate that runs before swing matching, per-symbol rollover suppression reusing the v1.0 `ROLLOVER_ATR_MULT = 3` tripwire on ES, an NQ-D1 FVG map with sweep-then-reject ERL/IRL transition state, and a NY-anchored 1H→4H aggregator (`aggregate.ts`) emitting the reused D1 `Candle` shape. Every new function follows the established house template: injected time, `closedOnly` discipline, honest-degrade envelopes with reason strings, and dense matched-pair fixtures.

The critical research finding is that all four domains are contractually pre-decided by CONTEXT.md and PITFALLS.md — there is no stack choice left to make. The planner's job is sequencing and fixture design, not library selection: zero new dependencies, zero I/O, zero store changes. The highest-risk items are (1) swing matching done by time-anchored windows instead of index zipping, (2) the 18:00 ET anchor resolved through IANA `America/New_York` wall-clock (never a fixed offset), and (3) the correlation gate's zero-variance guard, which is the one edge the locked decisions do not spell out.

**Primary recommendation:** Implement in dependency order — correlation gate + swing matching first (`smt.ts`), rollover extension second (parameterize `detectRollover` inputs per symbol), FVG/transition third, `aggregate.ts` last — each with its fixture family green before the next starts, and keep the D1 NQ anchor path byte-identical throughout.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**SMT comparator inputs**
- **D-01:** D1 daily candles only feed the SMT comparator. Locked by the REQUIREMENTS.md out-of-scope rule (daily SMT first; intraday SMT only after the daily comparator proves honest on the live URL). The proven D1 NQ anchor path stays the signal source; 1H/15M intraday pipes remain reserved for AMD/Phase 8.
- **D-02:** Swing detection is fractal k=2 (2 lower highs / higher lows each side) over a ~60 daily-bar window. Same `SWING_K` named constant applied to both legs, pinned by test per PITFALLS P1.
- **D-03:** Non-confirmation tolerance is a fixed 25 bps constant (`SMT_TOL_BPS=25`) on both legs. Basis points absorb the NQ≈5× ES point-scale difference (per PITFALLS P1); the correlation-regime gate absorbs volatility shifts instead of an ATR-scaled tolerance.
- **D-04:** SMT output is `{ direction: BULLISH | BEARISH | NO-SIGNAL, sweeperLeg: NQ | ES, nqWindow, esWindow, bpsGap }`. Labels which leg swept (the manipulated one — fade it) per PITFALLS P1 directional honesty; never a bare "SMT detected". Takes matched time-anchored pairs only (`detectSMT(pairs, toleranceBps)`), never two raw candle arrays.

**Correlation-regime gate**
- **D-05:** Decouple is measured as rolling 20-day Pearson correlation on daily closes; SMT is suppressed below 0.70 (`CORR_MIN=0.70`, `CORR_WINDOW=20`). The 20-bar window shares vocabulary with the existing `REGIME_AVG_WINDOW=20`.
- **D-06:** The gate emits a suppressed envelope `{ suppressed: true, reason: 'CORR_DECOUPLED', corr }` — the same suppressed-envelope vocabulary as rollover-week (ICT-09), so Phase 9 §3 renders one honest pattern for both.
- **D-07:** Gate runs before swing matching; decoupled windows skip matching entirely. Cheaper, and matched-pair fixtures never need a low-correlation case.

**Rollover suppression (ICT-09, extends v1.0 tripwire)**
- **D-08:** The v1.0 rollover tripwire (`ROLLOVER_ATR_MULT = 3`, raw OHLC only, never `adjclose`, per-symbol independent flags) is extended to ES with the same shared threshold constant. If EITHER leg is `rolloverSuspect` inside the comparison window → `{ suppressed: true, reason: 'rollover-week' }`, rendered by §3 as "SMT unavailable — contract roll week", not a weak signal. Matched-pair fixtures must include a roll-week suppression case (NQ gaps, ES doesn't → suppressed, not divergent).

**FVG map + ERL/IRL transition (ICT-10)**
- **D-09:** FVG map detects both polarities on NQ D1; mitigation is fill on close-through; the map is bounded to the latest ~20 gaps so output stays small and forward-compatible with STRUCT-03 quality grading.
- **D-10:** Sweep-then-reject = wick pierces the FVG boundary AND the same candle closes back inside/through the origin zone. Pure-function friendly on D1 closes; no displacement proof required. Transitions fire only on sweep-then-reject, never on sweep alone.
- **D-11:** The transition state `{ state: ERL | IRL, originFvg, triggerCandle }` upgrades §2 Delivery Cycle prose — §2 gains an IRL-aware delivery sentence, no new section. §2 Delivery Cycle upgrade ships in this phase as prose logic; §3 composition stays in Phase 9.

**4H synthesis (ICT-11)**
- **D-12:** The 1H→4H block grid anchors at 18:00 ET daily open (CME equity-index day boundary), resolved via IANA `America/New_York` wall-clock. Aligns 4H structure with futures session reality per PITFALLS CME sources; Baku display at the edge.
- **D-13:** Only complete 4-candle blocks are emitted (`closedOnly` discipline); the partial trailing block is excluded until its 4th hour closes. Detector outputs never self-update; the forming 1H candle still renders on the chart.
- **D-14:** `aggregate.ts` emits the reused D1 `Candle` shape for 4H blocks so `computeRange` / `computeBias` / regime helpers consume it unchanged — internal/external sequencing reads off existing math.

### Claude's Discretion

None — user decided every question directly (no "You decide" selections).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ICT-08 | SMT divergence status (NQ vs ES, time-anchored matched swing pairs, bps tolerance) — BULLISH / BEARISH / NO-SIGNAL with swing references, correlation-regime gate suppresses on decouple | Swing-matching contract + bps comparison (Patterns 1–2); Pearson gate (Pattern 3); gate-before-matching order (Pitfall 1); `JoinedRow` input contract from `join.ts` |
| ICT-09 | Rollover-week fake SMT suppressed when either leg is rollover-suspect (v1.0 tripwire reused on both symbols) | Per-symbol `detectRollover` reuse with shared `ROLLOVER_ATR_MULT` (Pattern 4); joint-suppression envelope; no-`adjclose` rule (Don't Hand-Roll) |
| ICT-10 | FVG map + ERL/IRL transition firing only on sweep-then-reject; §2 Delivery Cycle upgraded | 3-candle FVG scan + close-through mitigation bounded to latest ~20 (Pattern 5); same-candle wick-pierce-plus-close-back rule (Pattern 6); `computePrimaryDOL` prose anchor in `dol.ts` |
| ICT-11 | 4H structure synthesized from 1H NY-anchored blocks in pure `aggregate.ts` — injected time, `closedOnly` discipline | 18:00 ET IANA anchor + complete-4-candle-blocks-only emission (Pattern 7); reused `Candle` shape so `computeRange`/`computeBias` consume unchanged; maintenance-break gap skip |

## Project Constraints (from CLAUDE.md)

Via `CLAUDE.md` → `AGENTS.md` (read this session). Actionable directives for this phase:

- **Next.js docs rule:** "Read the relevant guide in `node_modules/next/dist/docs/` before writing any code." This phase writes zero Next.js code — pure functions in `src/lib/ict` plus vitest files. No App Router, page, or component API is touched, so no Next.js guide section applies. Flagged here so plan-check does not mis-fire on it. [VERIFIED: node_modules/next/dist/docs/ contains 01-app, 02-pages, 03-architecture, community, index.md — no lib/utility section relevant to pure math]
- **Purity:** `src/lib/ict` functions must be pure — no I/O, no `Date.now` inside, inject time. Verified clean this session: repo grep for `Date\.now|new Date\(\)` in `src/lib/ict` returns zero matches [VERIFIED: repo grep]. Every new module takes injected `asOf` and explicit candle windows.
- **State:** Zustand only — this phase makes no store changes; selectors derive later (Phases 8–9). New modules keep zero store imports.
- **Budget:** Zero — no paid APIs, no new dependencies. This phase installs nothing.
- **AI:** Rule-based, no LLM calls. The §2 prose upgrade (D-11) is deterministic template logic, not generation.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SMT swing matching + divergence compare | API / Backend (pure `src/lib/ict`, derived via selectors) | — | Deterministic math on joined daily closes; no DOM, no rendering, no per-client state |
| Correlation-regime gate | API / Backend (pure `src/lib/ict`) | — | Same inputs as SMT, runs before matching; a numeric pre-filter, not UI logic |
| Rollover suppression (ES extension) | API / Backend (pure `src/lib/ict`) | — | Reuses existing tripwire; per-symbol flags computed where candles live |
| FVG map + ERL/IRL transition | API / Backend (pure `src/lib/ict`) | — | NQ D1 scan producing state for §2 prose; rendering happens in Phase 9 |
| 1H→4H aggregation | API / Backend (pure `src/lib/ict`) | — | Timestamp bucketing on epoch-second intraday rows; emits `Candle` for existing range/bias math |
| §2 Delivery Cycle prose upgrade | API / Backend (report model builder) | — | Deterministic sentence selection from transition state; no new section, no client logic |

No capability in this phase belongs to the Browser/Client or CDN tiers. If a plan assigns detector computation to a component or hook, the tier map says it is misassigned — computation lives in `src/lib/ict`, components only render selector output (Phase 9).

## Standard Stack

### Core

No new libraries. The phase builds on in-repo modules plus the already-installed timezone library:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `date-fns-tz` (installed) | 3.2.0 [VERIFIED: npm registry + package.json] | IANA wall-clock resolution (`getTimezoneOffset`, `formatInTimeZone`) for the 18:00 ET anchor | Already the project's TZ primitive (`src/lib/time.ts`); DST-aware via IANA names, no hand-rolled offsets |
| `date-fns` (installed) | 4.4.0 [VERIFIED: npm registry + package.json] | Date formatting/parsing companions | Peer of `date-fns-tz`, already wired |
| vitest (installed) | 5.0.0 [VERIFIED: npm registry + package.json] | Fixture-test suite for all four detectors | Existing suite pattern (range/bias/dol/regime/rollover/join tests); `npm test` runs `vitest run` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/time.ts` (in-repo) | — | `BAKU_TZ`, `CME_TZ` constants, `toBakuYMD` bucketing precedent | Reference for TZ-constant style; `aggregate.ts` adds its own `America/New_York` anchor constant alongside them |
| `src/lib/ict/*` (in-repo) | — | `types.ts`, `join.ts`, `rollover.ts`, `range.ts`, `bias.ts`, `regime.ts`, `dol.ts` — inputs and templates | Every new module consumes or mirrors these; see Architecture Patterns |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fixed 25 bps tolerance (D-03) | ATR-scaled tolerance per leg | Rejected by locked decision: bps absorbs the ~5× point-scale gap; correlation gate absorbs volatility shifts. Do not revisit. |
| `getTimezoneOffset` arithmetic for ET anchor | `Intl.DateTimeFormat` hour extraction or a TZ-date class | Equivalent correctness; `date-fns-tz` is already installed and is the house primitive — consistency wins. |
| New 4H-specific range/bias math | Reused `computeRange` / `computeBias` on `Candle`-shaped blocks (D-14) | Reuse is the locked decision; 4H blocks are structurally D1-shaped candles. |
| Intraday SMT in this phase | Daily SMT only (D-01) | Out-of-scope per REQUIREMENTS.md; intraday pipes stay reserved for Phase 8. |

**Installation:**

```bash
# No new packages. Nothing to install.
```

## Package Legitimacy Audit

No external packages are installed in this phase — `date-fns-tz`, `date-fns`, and `vitest` are already in `package.json` and verified present on the registry this session (`npm view` returned 3.2.0 / 4.4.0 / 5.0.0). Per the protocol, no legitimacy gate run is required when nothing is installed.

| Package | Registry | Disposition |
|---------|----------|-------------|
| *(none — no new installs)* | — | N/A |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Phase 6 envelopes (per-leg NQ/ES D1 + 1H, forming-flagged)
        │                              │
        ▼                              ▼
┌───────────────┐              ┌───────────────┐
│ closedOnly()  │              │ closedOnly /  │
│ D1 legs       │              │ closedOnly-   │
└───────┬───────┘              │ Intraday 1H   │
        │                      └───────┬───────┘
        ▼                              │
┌───────────────┐                       ▼
│ innerJoinOn-  │               ┌───────────────┐
│ Timestamp     │               │ aggregate.ts  │
│ (Phase 6)     │               │ 18:00 ET grid │
└───────┬───────┘               │ complete 4-   │
        │ joined rows           │ candle blocks │
        ▼                       └───────┬───────┘
┌───────────────┐                       │ Candle-shaped
│ CORR GATE     │── decoupled ──▶ suppressed    4H blocks
│ r(closes,20)  │   {CORR_DECOUPLED}            │
│ ≥ 0.70?       │                       ▼
└───────┬───────┘               ┌───────────────┐
        │ coupled               │ computeRange /│
        ▼                       │ computeBias / │
┌───────────────┐               │ computeRegime │
│ matchSwings   │               │ (unchanged)   │
│ SWING_K=2     │               └───────────────┘
└───────┬───────┘
        │ matched pairs
        ▼
┌───────────────┐      ┌────────────────┐
│ detectSMT     │◀─────│ rollover check │
│ bps compare   │      │ per-symbol     │
│ ±25 bps       │      │ either suspect │
└───────┬───────┘      │ → suppressed   │
        │              │ {rollover-week}│
        ▼              └────────────────┘
  {direction, sweeperLeg,
   nqWindow, esWindow, bpsGap}
   │ BULLISH / BEARISH / NO-SIGNAL

Parallel lane (NQ D1 only):
  FVG map (both polarities, latest ~20)
        │ sweep-then-reject?
        ▼
  {state: ERL|IRL, originFvg, triggerCandle}
        │ feeds §2 Delivery Cycle prose
        ▼ (D-11, deterministic sentence)
```

Entry points: Phase 6 `JoinResult` (SMT lane), NQ D1 closed candles (FVG lane), NQ 1H epoch rows (aggregate lane). Decision points: correlation gate (before matching), rollover joint check (before/at compare), sweep-then-reject (transition only). All outputs are data, consumed by Phase 8–9 selectors — no rendering in this phase.

### Recommended Project Structure

```
src/lib/ict/
├── types.ts          # Candle, closedOnly(), IntradayCandle — unchanged (extended only if new shared envelope type needed)
├── join.ts           # unchanged — SMT consumes JoinResult
├── smt.ts            # NEW — SWING_K, SMT_TOL_BPS, CORR_WINDOW, CORR_MIN, matchSwings(), pearsonCorr(), detectSMT()
├── rollover.ts       # EXTEND usage — detectRollover() called per symbol; ROLLOVER_ATR_MULT shared, no fork
├── fvg.ts            # NEW — FVG map (both polarities, latest ~20) + sweep-then-reject transition
├── aggregate.ts      # NEW — NY-anchored 1H→4H synthesis, emits Candle[]
├── range.ts / bias.ts / regime.ts / dol.ts  # unchanged — 4H blocks + §2 prose read off these
└── __tests__ / *.test.ts  # NEW fixtures: smt bull/bear/choppy/roll-week, corr coupled/decoupled/zero-variance,
                           # fvg bull/bear/mitigated/sweep-without-reject, aggregate anchor/DST/partial-block
src/lib/__fixtures__/       # NEW JSON fixtures alongside existing nq-daily-baseline.json pattern
```

### Pattern 1: Time-anchored fractal swing matching (shared SWING_K)

**What:** Detect swing highs/lows with one fractal parameter on both legs, then pair swings by overlapping calendar window — never by array index.
**When to use:** Always for SMT; it is the entire ICT-08 correctness hinge (PITFALLS P1).
**Example:**

```typescript
// Contract shape (planner: exact field names are implementation detail,
// but time-anchored pairing + shared K are mandatory):
export const SWING_K = 2; // [ASSUMED — locked value from CONTEXT D-02, pin by test]

interface MatchedSwing {
  windowStart: string; // D1 business-day date, same calendar window both legs
  windowEnd: string;
  nqExtreme: number;
  esExtreme: number;
  kind: 'high' | 'low';
}

// Fractal rule: bar i is a swing high iff high[i] is the strict maximum
// of high[i-K..i+K]; mirror with minimum for swing low. [ASSUMED —
// standard fractal definition, no authoritative source fetched this session;
// LuxAlgo source confirms only that "only corresponding swings are
// comparable" [CITED: https://www.luxalgo.com/library/concept/smart-money-technique-divergence/]
function isSwingHigh(highs: number[], i: number, k: number): boolean {
  for (let j = i - k; j <= i + k; j++) {
    if (j === i) continue;
    if (highs[j] >= highs[i]) return false;
  }
  return true;
}

export function matchSwings(nq: Candle[], es: Candle[], k = SWING_K): MatchedSwing[] {
  // 1. closedOnly() both legs. 2. Detect swings per leg with SAME k.
  // 3. Pair by overlapping time window (~60-bar lookback).
  // 4. NEVER nqSwings[i] vs esSwings[i].
}
```

### Pattern 2: Basis-point non-confirmation compare with sweeper label

**What:** At each matched pair, check whether one leg took its prior extreme while the other failed within tolerance; tolerance in bps of price so NQ/ES scales compare fairly.
**When to use:** Inside `detectSMT(pairs, toleranceBps)` per matched pair, most-recent-pair-first evaluation order.
**Example:**

```typescript
export const SMT_TOL_BPS = 25; // [ASSUMED — locked value from CONTEXT D-03, pin by test]

// Bearish SMT: NQ swept above its prior high, ES held below its own prior
// high by more than tolerance → sweeperLeg 'NQ' (fade NQ).
// bpsGap = relative non-confirmation gap in basis points. [ASSUMED formula —
// locked output field from CONTEXT D-04; exact gap definition is planner detail]
function bpsGap(sweptPrice: number, heldPrice: number, referenceExtreme: number): number {
  return (Math.abs(sweptPrice - heldPrice) / referenceExtreme) * 10_000;
}

// Directional honesty (PITFALLS P1, corroborated [CITED:
// https://www.luxalgo.com/library/concept/smart-money-technique-divergence/]):
// the sweeping market is the manipulated one — output names sweeperLeg,
// never a bare "SMT detected".
```

### Pattern 3: Correlation gate before matching (with zero-variance guard)

**What:** Rolling Pearson r on the last `CORR_WINDOW` paired closes; below `CORR_MIN` emit the suppressed envelope and skip `matchSwings` entirely.
**When to use:** First step of the SMT pipeline, on joined rows only.
**Example:**

```typescript
export const CORR_WINDOW = 20; // [ASSUMED — locked value from CONTEXT D-05]
export const CORR_MIN = 0.70;  // [ASSUMED — locked value from CONTEXT D-05]

interface SmtSuppressed { suppressed: true; reason: 'CORR_DECOUPLED' | 'rollover-week'; corr?: number }

// Pearson r over paired closes. Standard formula [ASSUMED — textbook
// definition, no source fetched this session; planner pins with fixtures]:
// r = Σ((x−x̄)(y−ȳ)) / (√Σ(x−x̄)² · √Σ(y−ȳ)²)
export function pearsonCorr(nqCloses: number[], esCloses: number[]): number {
  // GUARD (not in locked decisions — planner must specify): if either
  // variance sum is 0 (flat leg, e.g. stale-repeated closes), denominator
  // is 0 → return NaN and treat as decoupled (suppressed), never divide.
  // Rationale: a flat leg carries zero directional information; proceeding
  // would emit either a crash or a spurious r=0/NaN-compare bug.
}
```

### Pattern 4: Per-symbol rollover tripwire + joint suppression

**What:** Run the existing `detectRollover` per symbol with the shared `ROLLOVER_ATR_MULT`; if either leg is suspect inside the comparison window, suppress.
**When to use:** ICT-09, wrapping the SMT compare — gate position: after correlation gate, before/at `detectSMT` (both orders defensible; planner picks one and pins it).
**Example:**

```typescript
// Source: src/lib/ict/rollover.ts:33-55 (read this session):
// "export function detectRollover(
//     candles: Candle[],
//     atr: number,
//     asOf: string,
//     contractHint: string,
//   ): RolloverFlag { ... const tripwire = ROLLOVER_ATR_MULT * atr;
//   ... for (let i = 1; i < closed.length; i++) {
//     if (Math.abs(closed[i].close - closed[i - 1].close) > tripwire) {"
import { detectRollover, ROLLOVER_ATR_MULT } from '@/src/lib/ict/rollover';
// [VERIFIED: src/lib/ict/rollover.ts:4] — "export const ROLLOVER_ATR_MULT = 3;"
// [VERIFIED: src/lib/ict/rollover.ts:43] — "const tripwire = ROLLOVER_ATR_MULT * atr;"
// Strict-greater-than semantics confirmed by test: gap exactly equal to
// 3×ATR leaves the flag clear [VERIFIED: src/lib/ict/rollover.test.ts:28-33].

const nqFlag = detectRollover(nqD1, nqAtr, asOf, 'NQ H6 -> M6');
const esFlag = detectRollover(esD1, esAtr, asOf, 'ES H6 -> M6');
if (nqFlag.rolloverSuspect || esFlag.rolloverSuspect) {
  return { suppressed: true, reason: 'rollover-week' }; // D-08 verbatim vocabulary
}
// Raw OHLC only, never adjclose — Yahoo futures continuous series are NOT
// back-adjusted; the gap must stay visible. Per-symbol ATR: NQ and ES have
// different volatilities, so each leg's tripwire uses its own ATR with the
// SHARED multiplier (warning sign in PITFALLS P7: different thresholds).
```

### Pattern 5: FVG map (both polarities, bounded, close-through mitigation)

**What:** Scan NQ D1 for 3-candle imbalances; keep the latest ~20; drop a gap when a later candle closes through it.
**When to use:** ICT-10 FVG lane, NQ D1 only (FVG-only IRL per out-of-scope rules).
**Example:**

```typescript
// Construction (3-candle gap) is [ASSUMED — CONTEXT D-09 locks behavior but
// the fetched FVG source (fluxcharts) contained no construction definition;
// standard ICT-education definition, planner pins with fixtures]:
// Bullish FVG at i: low[i+1] > high[i-1] → zone { top: low[i+1], bottom: high[i-1] }.
// Bearish FVG at i: high[i+1] < low[i-1] → zone { top: low[i-1], bottom: high[i+1] }.
// Mitigation (locked D-09: "fill on close-through"): a later candle with
// close beyond the far boundary removes the gap from the active map.
// Map bound: slice(-20) after each update — output stays small and
// STRUCT-03-compatible.
```

### Pattern 6: Sweep-then-reject transition (never sweep alone)

**What:** A transition fires only when one candle both pierces an active FVG boundary with its wick AND closes back inside/through the origin zone.
**When to use:** ERL/IRL state machine; output `{ state: 'ERL' | 'IRL', originFvg, triggerCandle }` (D-11 verbatim shape).
**Example:**

```typescript
// Rule (locked D-10, pure-function friendly on D1 closes) [ASSUMED pattern
// code — behavior locked, exact boundary comparisons are planner detail]:
// For an active bullish FVG { top, bottom } and candle c:
//   pierced = c.low < bottom;            // wick takes the boundary
//   rejected = c.close >= bottom;        // same candle closes back inside
//   if (pierced && rejected) → transition { state, originFvg: gap, triggerCandle: c }
// Sweep alone (pierced && !rejected) → NO transition, gap stays active.
// Contrast with range.ts rolling-extremes semantic: computeRange EXTENDS on
// wick pierce [VERIFIED: src/lib/ict/range.test.ts:37-57]; the FVG transition
// does the opposite (fires a state flip, does not move the zone). Do not
// conflate the two — planner must keep them in separate modules/tests.
```

### Pattern 7: NY-anchored 1H→4H aggregation (complete blocks only)

**What:** Bucket 1H epoch rows into 4H blocks on a grid anchored at 18:00 ET; emit only full 4-candle blocks as `Candle`-shaped aggregates; skip maintenance-break gaps without interpolation.
**When to use:** ICT-11 `aggregate.ts`, consuming `IntradayCandle[]` (UTC epoch seconds).
**Example:**

```typescript
// Anchor derivation [CITED: https://tastytrade.com/learn/trading-products/futures/futures-market-hours/]:
// "/ES and /NQ run from Sunday 5:00 p.m. to Friday 4:00 p.m. CT with a
// 60-minute break each day from 4:00 p.m. to 5:00 p.m. CT."
// 17:00 CT open == 18:00 ET open (CT is ET−1 year-round in wall-clock terms
// for session definition; resolve via IANA, never a literal −1/−4/−5).
// Corroborated in-repo: PITFALLS.md "daily 16:00–17:00 CT maintenance break".
import { getTimezoneOffset } from 'date-fns-tz'; // 3.2.0 [VERIFIED: npm registry]
// getTimezoneOffset('America/New_York', date) returns the DST-aware
// millisecond offset [CITED: Context7 /marnusw/date-fns-tz docs —
// "Accounts for Daylight Saving Time when IANA timezone names are used
// and a specific date is provided."]

// Aggregation rule [ASSUMED code — behavior locked D-12/D-13/D-14]:
// 1. closedOnlyIntraday() first (forming 1H candle renders on chart, never enters blocks).
//    [VERIFIED: src/lib/ict/types.ts:64-66] — "export function closedOnlyIntraday(
//    candles: IntradayCandle[]): IntradayCandle[] { return candles.filter((c) => !c.forming); }"
// 2. For each closed 1H row, compute NY wall-clock hour =
//    hour of (time*1000 + getTimezoneOffset('America/New_York', time*1000)).
// 3. Block index = floor((hours-since-18:00-ET-anchor) / 4); block key = date+index.
// 4. Aggregate block OHLC: open = first open, high = max high, low = min low,
//    close = last close (chronological). Emit as Candle { date, open, high, low, close }.
//    [VERIFIED: src/lib/ict/types.ts:1-8] — Candle is "{ date: string; open: number;
//    high: number; low: number; close: number; forming?: boolean; }"
// 5. Emit ONLY blocks with exactly 4 constituent 1H candles; drop the trailing
//    partial block silently (it becomes emittable when its 4th hour closes).
// 6. Maintenance-break hour (16:00–17:00 CT): no 1H row exists → gap is correct
//    absence; never synthesize a filler candle (PITFALLS debt row: interpolation
//    is "Never").
```

### Anti-Patterns to Avoid

- **Index-zipped swing comparison (`nqSwings[i]` vs `esSwings[i]`):** permanent phantom-divergence generator; every later fix re-tunes all thresholds. Time-anchored pairing only (PITFALLS P1, debt table "Never").
- **ATR-scaled or point-based tolerance:** NQ≈5× ES point scale makes raw-point tolerance meaningless across legs; volatility adaptation belongs to the correlation gate. Fixed 25 bps per D-03.
- **Bare "SMT detected" output:** the sweeping leg is the manipulated one — without `sweeperLeg` the signal is directionally dishonest. Always `{ direction, sweeperLeg, ... }`.
- **Gate-after-matching:** running the correlation gate after swing matching wastes the cheap pre-filter and forces low-correlation fixtures into matched-pair tests. Gate first per D-07.
- **Per-symbol rollover thresholds:** NQ and ES tripwires must share `ROLLOVER_ATR_MULT` (each with its own ATR). Different multipliers is a PITFALLS P7 warning sign.
- **Transition on sweep alone:** pierce-without-close-back is not a transition; firing on it turns every FVG touch into a regime flip. Sweep-then-reject only.
- **Fixed-offset ET anchor (`+4`/`+5` literals, `getHours()+X`):** 1-hour session error twice a year, invisible for months. IANA `America/New_York` resolution + March/November anchor tests.
- **Partial 4H block emission:** a 3-candle block that later updates is a self-updating detector output — the exact failure `closedOnly` discipline exists to prevent. Complete blocks only; the decision is marked costly-to-reverse in D-13.
- **Mutating the D1 NQ anchor path for alignment:** trimming NQ history to ES coverage corrupts the core value (Premium/Discount). SMT join uses its own intersected working copy [VERIFIED: src/lib/ict/join.ts:45-46] — "Works on its own intersected working copy; the D1 NQ anchor path (range.ts / computeRange callers) is untouched and unaffected."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ET wall-clock resolution | Custom EST/EDT offset table or `+4/+5` literals | `getTimezoneOffset('America/New_York', date)` from installed `date-fns-tz` 3.2.0 | DST transitions handled by IANA data; hand tables rot and fail silently for 6 months [CITED: Context7 /marnusw/date-fns-tz docs] |
| ATR / rolling average | Custom volatility loop for the rollover tripwire | Existing `computeATR` (`ATR_PERIOD = 14`) [VERIFIED: src/lib/ict/regime.ts:4-6] | Smoothed (Wilder-style) ATR already tested; tripwire semantics pinned by rollover.test.ts |
| Forming-candle exclusion | Ad-hoc `!forming` checks scattered per module | `closedOnly()` / `closedOnlyIntraday()` from `types.ts` [VERIFIED: src/lib/ict/types.ts:47-49, 64-66] | Single choke point; join re-validates at its boundary [VERIFIED: src/lib/ict/join.ts:55-58] |
| Timestamp alignment of NQ/ES | Index zip, date-string compare, manual truncation | `innerJoinOnTimestamp` + `JoinCoverage` [VERIFIED: src/lib/ict/join.ts:47-92] | Ascending, deduped, forming- and non-finite-safe; SMT trusts joined rows |
| `adjclose`-based normalization | Any cross-leg normalization using adjusted closes | Raw OHLC only, bps-of-price compare | Futures continuous series are not back-adjusted; `adjclose` masks the roll gaps that must stay visible (PITFALLS P7) |
| Session/anchor date bucketing from scratch | New TZ util module | `src/lib/time.ts` precedent (`BAKU_TZ`, `CME_TZ`, `toBakuYMD`) [VERIFIED: src/lib/time.ts:3-4] | March/November DST test pattern already proven in `time.test.ts`; extend, don't fork |
| Range/bias/regime math for 4H | 4H-specific duplicates of range/bias/regime | Reused `computeRange` / `computeBias` / `computeRegime` on `Candle`-shaped blocks (D-14) | One tested implementation; `computeRange` throws on zero closed candles [VERIFIED: src/lib/ict/range.ts:9-11] so aggregate must guarantee non-empty complete blocks |

**Key insight:** Every hard sub-problem in this phase (alignment, forming-exclusion, ATR, TZ bucketing, honest degrade) already has a tested in-repo answer. New code is composition of those answers plus four small locked formulas (fractal-k match, bps compare, Pearson gate, 3-candle FVG scan). Custom solutions in this domain fail expensively because they look right on clean weeks and break on roll weeks, DST weekends, and choppy ±1-bar regimes — exactly the fixtures the plan must include.

## Common Pitfalls

### Pitfall 1: Phantom SMT from index-compared swings

**What goes wrong:** Divergence badge fires constantly or never; signal flips direction when one leg's lookback shifts ±2 bars.
**Why it happens:** NQ (higher beta) prints a different swing count than ES over the same window; comparing `nqSwings[i]` to `esSwings[i]` drifts from the first mismatch onward.
**How to avoid:** `detectSMT(pairs, ...)` takes matched time-anchored pairs only; same `SWING_K=2` both legs, pinned by test; lookback-shift stability test (shift one leg ±2 bars → signal must not flip).
**Warning signs:** NQ/ES swing counts differ >20% over the same window; divergence fires on >30% of swings; any `[i]`-indexed cross-leg compare in `smt.ts`.

### Pitfall 2: Choppy ±1-bar offsets read as divergence

**What goes wrong:** Sideways markets emit endless BULLISH/BEARISH flicker.
**Why it happens:** Swing timestamps jitter ±1 bar between legs in chop; without a NO-SIGNAL default the comparator labels noise.
**How to avoid:** Negative fixture is mandatory: choppy ±1-bar-offset synthetic pair → `NO-SIGNAL` (PITFALLS "the test everyone skips"). Default output is NO-SIGNAL; divergence requires a clean sweep-vs-hold outside 25 bps.
**Warning signs:** No choppy fixture in `smt.test.ts`; backtest shows divergence clusters in range-bound weeks.

### Pitfall 3: Correlation gate crashes or lies on a flat leg

**What goes wrong:** `pearsonCorr` divides by zero when one leg's 20 closes are identical (stale-repeated data, halted symbol), producing `NaN`/`Infinity` that either throws or compares wrong.
**Why it happens:** Locked decisions specify the gate but not the zero-variance edge; a textbook Pearson implementation has no guard.
**How to avoid:** Explicit guard: zero variance in either window → treat as decoupled (`CORR_DECOUPLED` suppressed), never divide. Fixture: flat-ES 20-day window → suppressed envelope with `corr` reported.
**Warning signs:** No zero-variance test; `NaN` appearing in gate output; gate tested only on trending fixtures.

### Pitfall 4: Roll-week fake SMT (asymmetric gaps)

**What goes wrong:** NQ gaps 80 points on roll week while ES gaps 25; comparator reads "NQ new high, ES failed to confirm" — high-confidence bearish SMT wrapped in suspect premium/discount context.
**Why it happens:** Yahoo futures continuous series are not back-adjusted; the v1.0 flag covers NQ only unless extended.
**How to avoid:** Per-symbol `detectRollover` with shared multiplier + joint suppression (`either suspect → { suppressed: true, reason: 'rollover-week' }`); joint fixture (NQ gaps, ES doesn't → suppressed, not divergent); never `adjclose`.
**Warning signs:** SMT cluster on third-Friday Mar/Jun/Sep/Dec weeks; any `adjclose` reference in `src/lib/ict`; per-symbol thresholds that differ.

### Pitfall 5: FVG transition on sweep alone

**What goes wrong:** Every FVG touch flips ERL/IRL state; §2 prose whiplashes between delivery sentences.
**Why it happens:** Implementing only the pierce half of D-10 (wick through boundary) without the same-candle close-back half.
**How to avoid:** Negative fixture: pierce-without-reject (wick through, close outside) → NO transition, gap stays active. Mitigation (close-through fill) removes gaps; transition (pierce + close-back) flips state — separate tests for each.
**Warning signs:** No sweep-alone negative test; transition count ≈ pierce count in fixtures.

### Pitfall 6: 18:00 ET anchor drifts on DST weekends

**What goes wrong:** 4H blocks shift by one hour for half the year; structure reads the wrong session flow with no error.
**Why it happens:** Fixed UTC offset instead of IANA wall-clock; US springs forward/falls back while the offset literal doesn't.
**How to avoid:** Anchor via `getTimezoneOffset('America/New_York', t)` per candle; March + November anchor fixtures asserting block boundaries land on the same NY wall-clock both sides of each transition (mirrors the proven `time.test.ts` March/November pattern [VERIFIED: src/lib/time.test.ts:18-36]).
**Warning signs:** Any `+4`/`+5` literal or `getHours()+X` in `aggregate.ts`; anchor tests covering one season only.

### Pitfall 7: Partial trailing 4H block leaks into detectors

**What goes wrong:** The current incomplete block emits, then self-updates when the 4th hour closes — detector outputs rewrite history between polls.
**Why it happens:** Emitting "latest block" without a completeness check; the forming 1H candle inside it changes every poll.
**How to avoid:** Emit only blocks with exactly 4 closed 1H candles; consecutive-poll test (no new closed 1H candle → byte-identical aggregate output); `closedOnlyIntraday` at the aggregate boundary even though join already filters.
**Warning signs:** Aggregate output changes between polls with no new closed candle; block with <4 constituents in output.

### Pitfall 8: Purity / store entanglement

**What goes wrong:** `Date.now()` inside a detector, derived `smtSignal` in Zustand, snapshot tests green locally but red on UTC servers.
**Why it happens:** Second-milestone urgency; detectors "need now".
**How to avoid:** Injected `asOf` everywhere; store holds inputs only (no changes this phase at all); phase-gate grep for `Date.now`/`new Date()` in `src/lib/ict` must stay clean (verified clean this session [VERIFIED: repo grep]).
**Warning signs:** Any hit in the grep; store shape gaining `smt`/`fvg`/`blocks` fields; tests constructing "now" implicitly.

## Code Examples

Verified patterns from official sources and in-repo code read this session:

### Closed-only discipline (house template — reuse verbatim)

```typescript
// Source: src/lib/ict/types.ts:47-49 and 64-66 (read this session)
export function closedOnly(candles: Candle[]): Candle[] {
  return candles.filter((c) => !c.forming);
}
export function closedOnlyIntraday(candles: IntradayCandle[]): IntradayCandle[] {
  return candles.filter((c) => !c.forming);
}
// Every new module (smt, fvg, aggregate) calls the appropriate guard FIRST,
// even when the caller promises clean inputs (join.ts:55-58 precedent).
```

### Honest-degrade envelope (house template — extend the vocabulary)

```typescript
// Source pattern: src/lib/ict/bias.ts:10-17, regime.ts:43-51 (read this session)
// — insufficient history returns a degraded value with a reason string, never throws:
if (closed.length < MIN_CANDLES_FULL) {
  return {
    regime: 'compression',
    rationale: `Insufficient history (${closed.length} of ${MIN_CANDLES_FULL} closed candles): honest degrade to compression until the ATR window fills.`,
    atr: 0,
    avg: 0,
  };
}
// SMT/FVG follow suit: thin-history windows (< 60 D1 bars, < CORR_WINDOW
// joined closes) → NO-SIGNAL or suppressed-with-reason, never a guess.
// Suppressed reasons share one vocabulary: 'CORR_DECOUPLED' | 'rollover-week' (D-06, D-08).
```

### DST-aware IANA offset (Context7-verified)

```typescript
// Source: Context7 /marnusw/date-fns-tz docs (fetched this session) [CITED]
import { getTimezoneOffset } from 'date-fns-tz';
// Winter (EST, UTC-5): getTimezoneOffset('America/New_York', new Date(2016, 0, 1))
//   → -18000000. Summer (EDT, UTC-4): → -14400000.
// "Accounts for Daylight Saving Time when IANA timezone names are used
// and a specific date is provided."
const ms = new Date('2026-07-15T22:00:00Z').getTime();
const nyWallClockMs = ms + getTimezoneOffset('America/New_York', ms);
const nyHour = new Date(nyWallClockMs).getUTCHours(); // DST-safe NY hour
```

### Joined-row consumption (SMT input contract)

```typescript
// Source: src/lib/ict/join.ts:22-31, 47-50 (read this session)
// "export interface JoinedRow {
//    /** Shared UTC epoch-seconds timestamp. One row per shared timestamp. */
//    time: number; nq: IntradayCandle; es: IntradayCandle; }"
// SMT takes JoinedRow[] (or D1-equivalent time-anchored pairs) — never two raw
// arrays. Coverage rides alongside: "{ nq, es, joined, dropped }" (join.ts:5-20).
// Gate placement: if (joined.length < CORR_WINDOW) → suppressed/thin-history
// before any Pearson or swing work.
```

### §2 Delivery Cycle prose anchor (D-11 target)

```typescript
// Source: src/lib/ict/dol.ts:6-22 (read this session)
// "export function computePrimaryDOL(range: DealingRange, bias: BiasDirection, lastPrice: number): DOLTarget {
//    ... if (bias === 'BULLISH') { return { name: DOL_HIGH_NAME, price: range.high }; }
//    if (bias === 'BEARISH') { return { name: DOL_LOW_NAME, price: range.low }; } ..."
// with "export const DOL_HIGH_NAME = 'Range High / PDH';" / "'Range Low / PDL'"
// The D-11 upgrade adds an IRL-aware delivery sentence selected from
// { state: ERL | IRL, originFvg, triggerCandle } — deterministic template
// logic beside computePrimaryDOL's consumers, no new report section.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-symbol NQ D1 math only (v1.0) | Dual-symbol joined math with per-leg envelopes (Phase 6, complete) | 2026-09-07 | SMT/rollover lanes have clean joined inputs; no alignment work remains in this phase |
| `Candle` on business-day strings for everything | Split contract: D1 strings vs intraday UTC-epoch `IntradayCandle` (Phase 6 D-16) | 2026-09-07 | `aggregate.ts` consumes epoch rows; SMT consumes D1-window pairs; never unify |
| Close-only re-anchor detector (v1.0) | Rolling-recompute extremes incl. wicks (Phase 03.2 D-08) | 2026-09-06 | Wick pierce extends range extremes — FVG transition logic must NOT copy this semantic (Pattern 6 vs range.test.ts:37-57) |
| NQ-only rollover tripwire | Per-symbol tripwire + joint suppression (this phase, D-08) | Now | Shared `ROLLOVER_ATR_MULT`, independent flags |

**Deprecated/outdated:**
- `checkReanchor` helper: deleted in 03.2 (zero callers); rolling recompute carries re-anchoring — do not reintroduce any re-anchor function in this phase.
- `useShallow` on derived selector output: loops on fresh nested identity (03.2) — irrelevant this phase (no selectors), but Phase 9 consumers of SMT output must use stable selector-function subscription.
- Unified D1/intraday candle contract: rejected in Phase 6 — `aggregate.ts` must not accept business-day strings.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Fractal k=2 center-extreme definition (strict max/min over k neighbors each side); equality handling (equal highs → no swing) | Pattern 1 | MEDIUM — planner must pin equality semantics in fixtures; wrong choice shifts swing timestamps ±1 bar and interacts with Pitfall 2 |
| A2 | Pearson textbook formula + zero-variance→decoupled guard | Pattern 3 | LOW — guard direction (suppress vs NO-SIGNAL) is planner's call; either is honest, but §3 renders them differently in Phase 9 |
| A3 | 3-candle FVG construction (gap between candle i−1 extreme and candle i+1 extreme) | Pattern 5 | MEDIUM — no authoritative definition fetched; fixtures define truth. If ICT-education consensus differs, map stays self-consistent but labels may mismatch trader expectations |
| A4 | Sweep-then-reject boundary comparisons (pierce = wick beyond, reject = close back inside/through) | Pattern 6 | LOW — behavior locked, exact edge (touch vs strict pierce) pinned by fixtures |
| A5 | 4H block OHLC aggregation (first-open / max-high / min-low / last-close) + `date` label convention for blocks | Pattern 7 | LOW — standard aggregation; label format must be documented since `computeRange` threads `asOf` through and tests assert it |
| A6 | NQ≈5× ES point scale (justifies bps over points) | Pattern 2 | LOW — locked tolerance either way; only the rationale's number is approximate |
| A7 | CME 18:00 ET ≈ 17:00 CT daily open equivalence for the anchor | Pattern 7 | LOW — Tate/tastytrade fetch confirms 17:00 CT open; CT≡ET−1 for session-definition purposes is wall-clock convention, resolved via IANA at runtime anyway |
| A8 | `detectSMT(pairs, toleranceBps)` signature and `{ direction, sweeperLeg, nqWindow, esWindow, bpsGap }` field set | Patterns 1–2 | LOW — locked names from CONTEXT; planner implements as specified |

## Open Questions

1. **Gate order: correlation → rollover → match, or correlation → match → rollover?**
   - What we know: D-07 locks correlation-gate-first. D-08 locks joint suppression but not its position relative to matching.
   - What's unclear: Whether rollover suppression short-circuits before `matchSwings` (cheaper, fewer fixtures) or applies at compare time (matched windows available for the §3 reason string).
   - Recommendation: Planner picks rollover-check-before-matching (same rationale as D-07: cheaper, and matched-pair fixtures never need a roll-week case — D-08 already requires a dedicated suppression fixture). Pin the order in tests.

2. **Which ATR feeds each leg's rollover tripwire on D1?**
   - What we know: `computeATR` exists (`ATR_PERIOD = 14`); `detectRollover(candles, atr, asOf, hint)` takes ATR as a parameter; rollover.test.ts passes literal `10` in most tests.
   - What's unclear: Whether each leg's ATR is `computeATR(legD1)` last value or a shared/windowed value.
   - Recommendation: Per-leg `computeATR(legD1).at(-1)` with the shared multiplier; thin-history legs (empty ATR series) → treat as non-suspect with reason, never suspect (mirrors selectRollover's atr≤0→null precedent from PROJECT.md).

3. **§2 prose upgrade mechanics: where does the sentence live?**
   - What we know: D-11 says "§2 gains an IRL-aware delivery sentence, no new section" shipping "as prose logic" in this phase.
   - What's unclear: Which module owns the sentence builder (fvg.ts export vs report-model helper) and its exact template.
   - Recommendation: Export a pure `describeDeliveryTransition(state): string` from the FVG module with Azerbaijani-prose-aware neutral wording (house precedent: trap-vs-genuine); Phase 9 wires it into §2. Planner defines the template and pins with snapshot-ish string tests.

## Environment Availability

Phase is pure math + tests; no external services, CLIs, or databases required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vitest, build | ✓ | v24.11.1 [VERIFIED: `node --version` this session] | — |
| npm | installs (none needed) | ✓ | 11.6.2 [VERIFIED: `npm --version` this session] | — |
| `date-fns-tz` | ET anchor resolution | ✓ (installed) | 3.2.0 [VERIFIED: npm registry] | — |
| Yahoo / network | None (fixtures only) | — | — | Not required — all detector tests use synthetic + JSON fixtures |

**Missing dependencies with no fallback:** none — nothing blocks execution.
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 5.0.0 (`npm test` → `vitest run`) [VERIFIED: npm registry + package.json] |
| Config file | none detected at root (check for vitest/vite config in planning; existing `*.test.ts` run via `npm test`) — see Wave 0 |
| Quick run command | `npm test -- src/lib/ict/smt.test.ts` (single-file filter) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ICT-08 | Bullish SMT: ES sweeps low, NQ holds → BULLISH + sweeperLeg ES + swing refs | unit | `npm test -- src/lib/ict/smt.test.ts` | ❌ Wave 0 |
| ICT-08 | Bearish SMT mirror (NQ sweeps high, ES holds) | unit | `npm test -- src/lib/ict/smt.test.ts` | ❌ Wave 0 |
| ICT-08 | Choppy ±1-bar offsets → NO-SIGNAL | unit | `npm test -- src/lib/ict/smt.test.ts` | ❌ Wave 0 |
| ICT-08 | Lookback-shift ±2 bars → signal does not flip | unit | `npm test -- src/lib/ict/smt.test.ts` | ❌ Wave 0 |
| ICT-08 | corr < 0.70 → `{ suppressed: true, reason: 'CORR_DECOUPLED', corr }`, matching skipped | unit | `npm test -- src/lib/ict/smt.test.ts` | ❌ Wave 0 |
| ICT-08 | Zero-variance leg → suppressed, no divide-by-zero | unit | `npm test -- src/lib/ict/smt.test.ts` | ❌ Wave 0 |
| ICT-09 | NQ gaps / ES clean → `{ suppressed: true, reason: 'rollover-week' }`, not divergent | unit | `npm test -- src/lib/ict/smt.test.ts` (joint) + rollover ES-leg case | ❌ Wave 0 |
| ICT-10 | Bullish + bearish FVG detection on NQ D1 fixtures | unit | `npm test -- src/lib/ict/fvg.test.ts` | ❌ Wave 0 |
| ICT-10 | Close-through fill removes gap; map bounded to latest ~20 | unit | `npm test -- src/lib/ict/fvg.test.ts` | ❌ Wave 0 |
| ICT-10 | Sweep-then-reject → transition; sweep-alone → no transition | unit | `npm test -- src/lib/ict/fvg.test.ts` | ❌ Wave 0 |
| ICT-10 | §2 delivery sentence builder returns IRL-aware string | unit | `npm test -- src/lib/ict/fvg.test.ts` | ❌ Wave 0 |
| ICT-11 | 1H→4H blocks anchor 18:00 ET; complete 4-candle blocks only; Candle shape output | unit | `npm test -- src/lib/ict/aggregate.test.ts` | ❌ Wave 0 |
| ICT-11 | March + November fixtures: anchor stable across DST; partial trailing block excluded | unit | `npm test -- src/lib/ict/aggregate.test.ts` | ❌ Wave 0 |
| ICT-11 | 4H blocks feed `computeRange`/`computeBias` unchanged | unit (integration) | `npm test -- src/lib/ict/aggregate.test.ts` | ❌ Wave 0 |
| all | `Date.now`/`new Date()` grep clean in `src/lib/ict`; `closedOnly` assertions in detector tests | static + unit | grep + `npm test` | ✅ grep clean verified this session |

### Sampling Rate

- **Per task commit:** `npm test -- src/lib/ict/<touched>.test.ts`
- **Per wave merge:** `npm test` (full suite — must stay green; existing range/bias/dol/regime/rollover/join tests are the no-regression gate)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/ict/smt.test.ts` — covers ICT-08 + ICT-09 joint suppression (bull, bear, choppy NO-SIGNAL, lookback-shift, CORR_DECOUPLED, zero-variance, roll-week)
- [ ] `src/lib/ict/fvg.test.ts` — covers ICT-10 (both polarities, mitigation, bound, sweep-vs-reject, §2 sentence)
- [ ] `src/lib/ict/aggregate.test.ts` — covers ICT-11 (anchor, DST pair, partial-block, Candle-shape reuse)
- [ ] `src/lib/__fixtures__/smt-*.json` — matched-pair fixtures (bull/bear/choppy/roll-week) alongside existing `join-misaligned.json` pattern
- [ ] Confirm vitest include pattern picks up new test files (existing `*.test.ts` colocated — no config change expected, verify on first run)

## Security Domain

`security_enforcement: true` (config.json; ASVS L1). This phase adds no network, auth, session, or secret surface — pure functions on in-memory candle arrays. Applicable slice:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (no identity in this phase) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Finite-OHLC guards at module boundaries (house precedent: `computePrimaryDOL` throws on non-finite [VERIFIED: src/lib/ict/dol.ts:7-9]; `detectRollover` throws on non-finite/negative ATR [VERIFIED: src/lib/ict/rollover.ts:40-41]; `computeATR` throws on bad period [VERIFIED: src/lib/ict/regime.ts:18-20]). New modules validate `toleranceBps > 0`, `window ≥ 2`, non-empty inputs — throw or honest-degrade, never silent NaN. |
| V6 Cryptography | no | — (never hand-roll; nothing to encrypt here) |

### Known Threat Patterns for pure-math `src/lib/ict`

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| NaN-poisoning via non-finite OHLC (e.g. Yahoo null rows reaching SMT) | Tampering | Re-validate at module boundary (`Number.isFinite` filter or throw) — join.ts:34-41 precedent [VERIFIED]; SMT/FVG/aggregate repeat it |
| `adjclose` smuggling via a "helpful" normalizer | Tampering | Ban `adjclose` in review; grep gate alongside the `Date.now` grep |
| Unbounded output growth (FVG map over years of D1) | Denial of Service (memory) | Hard bound latest ~20 (D-09); test with 200-bar fixture asserting length ≤ 20 |

## Sources

### Primary (HIGH confidence — read from repo this session)

- `src/lib/ict/types.ts:1-8, 41-66` — `Candle`, `RolloverFlag`, `closedOnly`, `IntradayCandle`, `closedOnlyIntraday`
- `src/lib/ict/join.ts:5-92` — `JoinCoverage`, `JoinedRow`, `JoinResult`, `innerJoinOnTimestamp` (working-copy + boundary re-validation comments)
- `src/lib/ict/rollover.ts:4-55` — `ROLLOVER_ATR_MULT = 3`, tripwire loop, `isNearRolloverWeek`, strict-greater-than semantics
- `src/lib/ict/range.ts:4-34` — `ANCHOR_WINDOW = 20`, `computeRange`, `computePosition`
- `src/lib/ict/regime.ts:4-67` — `ATR_PERIOD = 14`, `REGIME_AVG_WINDOW = 20`, `MIN_CANDLES_FULL = 34`, `computeATR`, `computeRegime` degrade branch
- `src/lib/ict/bias.ts:6-41` — 0.48–0.52 buffer, COMPRESSION degrade
- `src/lib/ict/dol.ts:1-22` — `computePrimaryDOL`, PDH/PDL names
- `src/lib/time.ts:1-17` — `BAKU_TZ`, `CME_TZ`, DST-tested bucketing; `src/lib/time.test.ts:18-36` March/November pattern
- `src/lib/ict/rollover.test.ts:28-33`, `range.test.ts:37-57`, `join.test.ts` — strict-3×, rolling-extremes, misaligned-join precedents
- `.planning/research/PITFALLS.md` P1, P4, P7, P8 + debt/integration tables — the constraint source behind D-01…D-14
- Repo grep this session: zero `Date.now`/`new Date()` in `src/lib/ict`; `npm view` versions cross-checked with `package.json`

### Secondary (MEDIUM confidence — official/curated docs fetched this session)

- Context7 `/marnusw/date-fns-tz` docs — `getTimezoneOffset(timezone, date)` DST-aware IANA resolution + EST/EDT examples
- [LuxAlgo — SMT Divergence concept](https://www.luxalgo.com/library/concept/smart-money-technique-divergence/) — matched-swing comparability, sweeper-is-manipulated, confirmation-not-trigger
- [Tastytrade — Futures Market Hours](https://tastytrade.com/learn/trading-products/futures/futures-market-hours/) — ES/NQ Sun 17:00 CT → Fri 16:00 CT, 16:00–17:00 CT daily break (fetch succeeded; cmegroup.com fetch failed with ECONNRESET)

### Tertiary (LOW confidence — unverified, marked for fixture-pinning)

- Pearson formula, fractal-k equality handling, 3-candle FVG construction, bps-gap definition, 4H OHLC aggregation rule — all tagged [ASSUMED] inline and logged in Assumptions (planner pins via fixtures, not via more research)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nothing new; installed versions registry-verified; in-repo contracts read line-by-line
- Architecture: HIGH — data flow derives directly from locked decisions + Phase 6 contracts; tier map is unambiguous (all backend-pure)
- Pitfalls: MEDIUM — P1/P4/P7/P8 mechanisms corroborated by repo history + fetched sources; FVG-construction and Pearson-guard specifics rest on [ASSUMED] formulas pinned by tests
- ICT semantics (SMT/FVG/Judas-adjacent): MEDIUM — LuxAlgo corroborates PITFALLS; no official ICT spec exists (known project-wide caveat from STATE.md)

**Research date:** 2026-09-07
**Valid until:** 2026-10-07 (30 days — stable domain; in-repo contracts + education sources, no fast-moving dependency)

---

*Phase: 7-smt-4h-1h-sequencing-math*
*In-repo values verified by Read this session with verbatim quotes; registry versions via `npm view`; confidence tiers per `gsd_run query classify-confidence` (websearch LOW / context7 MEDIUM / verified-websearch MEDIUM).*
