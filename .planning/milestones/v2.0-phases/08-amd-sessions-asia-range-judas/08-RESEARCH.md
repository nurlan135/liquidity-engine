# Phase 08: AMD Sessions (Asia Range + Judas) - Research

**Researched:** 2026-09-07
**Domain:** ICT session math — Asia Range, London Judas Swing, AMD phase classifier (pure functions in `src/lib/ict`)
**Confidence:** HIGH

## Summary

Phase 8 adds three pure-function modules to `src/lib/ict`: `asia.ts` (Baku-aware Asia Range from 1H NQ candles), `judas.ts` (three-gate London Judas detector on 15M NQ candles), and `amd.ts` (phase classifier fusing range + Judas + read-only SMT state). Every pattern needed already exists in-repo and was read this session: per-candle IANA wall-clock resolution (`aggregate.ts`), boundary re-validation plus forming exclusion (`aggregate.ts`, `join.ts`), close-based sweep-then-reject (`fvg.ts`), and suppressed envelopes with reason strings (`smt.ts`). No new dependencies are required — `date-fns-tz@3.2.0` is installed and current.

The phase's hard constraints are all locked (16 decisions, zero discretion areas): 20:00–00:00 NY Asia window (overriding the 19:00 text in both REQUIREMENTS.md ICT-12 and the roadmap criterion — a conforming edit is needed at planning time), strict 02:00–05:00 ET killzone, Asia-height-multiple displacement, close-based reversal in a 4-candle window, and NY rendered as `Gözlənilir`. The two genuinely open calibration points are the displacement multiple value and the 60-day false-positive budget run — both are tuned by test, not decided by research.

**Primary recommendation:** Build `asia.ts` → `judas.ts` → `amd.ts` in that order on the exact templates of `aggregate.ts` (IANA helpers), `fvg.ts` (sweep-then-reject), and `smt.ts` (suppressed envelopes); pin the DST triple-test and the pierce-without-reversal/p re-killzone fixtures first, then tune the displacement multiple against the ≤25% budget run.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Asia session is 20:00–00:00 NY wall-clock (IANA `America/New_York`, resolved per candle at call time). Chosen over the locked ICT-12 text (19:00) to match corroborated ICT education sources — the 19:00–20:00 transition hour is excluded. Roadmap success criterion needs a conforming edit (19:00 → 20:00) at planning time.
- **D-02:** Range high/low is wick-to-wick (full candle extremes, raw OHLC). Mirrors the D1 range precedent; no body-only filtering.
- **D-03:** Post-midnight wicks (00:00–02:00) are excluded from the Asia Range. Anything past 00:00 belongs to London's story, not Asia's range.
- **D-04:** Missing candles inside the window (Sunday 18:00 ET open effects, holidays) are skipped — range computed from present closed candles, never interpolated. Extends the Phase 6 no-interpolation precedent.
- **D-05:** Mixed intervals — Asia Range from 1H candles (5-candle window, stable edges), Judas sweep detection on 15M (finer pierce timing). Uses both Phase 6 intraday pipes; matches the 15m/5m Judas visibility in ICT sources. — **Reversibility:** costly — the 1H-range/15M-sweep split flows into detector signatures, fixtures, and Phase 9 selector inputs
- **D-06:** NQ-only detectors. Asia/Judas is an NQ-session concept; ES comparison belongs to the Phase 7 SMT comparator, never re-derived here.
- **D-07:** Killzone membership (02:00–05:00 ET, strict inequality both edges) is a per-candle IANA wall-clock check, resolved through `America/New_York` at call time. DST-safe by construction, same discipline as Phase 7 `aggregate.ts` (D-12).
- **D-08:** Pre-killzone sweeps (e.g. 01:47 ET pierce) are logged as `preRun: true` for analyst review, never promoted to candidates. Strict killzone edges per Pitfalls P5.
- **D-09:** Displacement threshold is a multiple of Asia Range height (not ATR, not fixed points). Self-normalizing: thin-range nights need less follow-through than wide-range nights.
- **D-10:** Confirmation window is the sweep candle + next 3 fifteen-minute candles (45 min total). Bounded, pure-function friendly, fits inside the killzone.
- **D-11:** Reversal = close-based: the sweep candle (or a candle in-window) closes back inside/through the swept extreme. Mirrors Phase 7 D-10 FVG sweep-then-reject (wick pierce + same-candle close back); no MSS/structure-shift machinery in v2.0.
- **D-12:** Sweeps without in-window displacement persist as candidates (`confirmed: false`), rendered hollow with hedge prose downstream — never silently expired, never promoted. Same candidates-vs-confirmed vocabulary as the roadmap criterion.
- **D-13:** Transitions are time + events: Asia hours → accumulation; killzone sweep ± displacement → manipulation; post-displacement continuation → distribution. Clock gives the skeleton, detector events give the promotions. Explainable in §3 prose.
- **D-14:** SMT fuses as a regime tag, read-only: confirmed Judas + aligned Phase 7 SMT agree → highest-conviction regime tag feeding ICT-15 confluence scoring in Phase 9. The classifier never mutates SMT output.
- **D-15:** NY session renders the honest unavailable marker (`Gözlənilir` with reason — no NY detector in v2.0). The classifier covers Asia + London only; NY stays a degraded branch, not a time-only guess.
- **D-16:** AMD output is `{ phase, reason, inputs }` — phase enum plus the why plus contributing detector references, so §3 renders reasons verbatim. Extends the Phase 7 suppressed-envelope vocabulary (`CORR_DECOUPLED`, `rollover-week`, per-leg stale refusal) rather than inventing a new pattern.

### Claude's Discretion
None — user decided every question directly (no "You decide" selections).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ICT-12 | User sees Asia Range (IANA `America/New_York` wall-clock, 19:00–00:00 NY per locked text — D-01 overrides to 20:00–00:00, conforming edit needed — Baku display at edge) — March + November + maintenance-break DST tests green | IANA per-candle pattern (`aggregate.ts:41-47`); `nyHourEpoch`/`fromZonedTime` DST fixture helper (`aggregate.test.ts:32-34`); 1H pipe `3mo` window (`yahoo.ts:59-63`) |
| ICT-13 | User sees London Judas Swing with three-gate conjunction (in-killzone AND swept-Asia-extreme AND reversal-with-displacement) — candidates hollow vs confirmed solid, ≤25% confirmed sessions over 60 days | FVG sweep-then-reject close-based precedent (`fvg.ts:137-169`); 15M pipe `1mo` window (`yahoo.ts:59-63`); 60-day budget verification from PITFALLS P5 |
| ICT-14 | User sees AMD phase classifier (accumulation / manipulation / distribution) fusing range + Judas + SMT state — NY shown as Gözlənilir until its detector lands | Suppressed-envelope vocabulary (`smt.ts:39-43`); SMT output shape consumed read-only (`smt.ts:30-37`); `Gözlənilir` unavailable-marker precedent; §3 prose shape (`institutional_rules.md` §3) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

The project instruction chain (`CLAUDE.md` → `AGENTS.md`) contains one operative directive: this is a non-standard Next.js build — read the relevant guide in `node_modules/next/dist/docs/` before writing code and heed deprecation notices. Verified this session: `node_modules/next/dist/docs` exists (`01-app`, `02-pages`, `03-architecture`, `04-community`, `index.md`).

**Applicability to Phase 8:** LOW impact. This phase writes framework-agnostic pure functions plus vitest fixtures — no App Router, SSR, or chart APIs are touched (overlays belong to Phase 9). The planner should still include a "consult `node_modules/next/dist/docs/` if any Next.js API surface is touched" guard, but no doc lookup is required for the math itself.

Effective standing constraints (from PROJECT.md, read this session): zero budget (no paid APIs), Zustand-only state, `src/lib/ict` purity (no I/O, no `Date.now` — inject time), rule-based no-LLM output.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Asia Range computation | API / Backend (pure lib) | — | Deterministic math on candle windows; no DOM, no I/O; lives in `src/lib/ict` per purity constraint |
| Judas sweep detection | API / Backend (pure lib) | — | Same as above — three-gate conjunction over closed 15M candles |
| AMD phase classification | API / Backend (pure lib) | — | Fusion of detector outputs + read-only SMT; selector-boundary derivation happens in Phase 9, not here |
| Session wall-clock resolution | API / Backend (pure lib) | — | IANA `America/New_York` per-candle resolution; must be host-timezone independent |
| Baku display labels | Frontend render (Phase 9) | — | Dual-stamp labels are a render concern; this phase emits machine data only |

**Sanity note for planner:** nothing in this phase touches the browser tier, SSR, CDN, or database. Any plan task mentioning store, selectors, chart, or §3 wiring belongs to Phase 9.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `date-fns-tz` (`formatInTimeZone`, `fromZonedTime`) | 3.2.0 [VERIFIED: npm registry — installed version matches latest] | IANA wall-clock resolution per candle; DST-correct fixture construction | Already the codebase standard (`aggregate.ts`, `time.ts`, `session-line.ts`, `freshness.ts` all use it); zero new deps |
| `vitest` | 5.x [VERIFIED: package.json — `vitest run`, colocated `src/**/*.test.ts`] | Fixture-test suite for the three new modules | Existing 133-test suite template; `testTimeout: 15000` already configured |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | 4.4.0 [VERIFIED: npm registry — installed] | Civil-date helpers if needed | Only if new calendar arithmetic is required — prefer reusing `aggregate.ts` civil-date functions or the NY wall-clock helpers directly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `date-fns-tz` per-candle resolution | Fixed UTC offsets | Never acceptable — 1-hour session error twice a year (PITFALLS P4, debt table) |
| Asia-height displacement multiple | ATR multiple or fixed points | Rejected by D-09: fixed points rot across volatility regimes; debt table allows ATR only as UI default, detector uses Asia-height multiples |

**Installation:**
```bash
# No installation required — date-fns-tz@3.2.0 and vitest@5 are already installed.
```

**Version verification:** `npm view date-fns-tz version` → `3.2.0`; `npm view date-fns version` → `4.4.0`; Node `v24.11.1`. All match installed versions — no upgrades needed.

## Package Legitimacy Audit

> No external packages are installed in this phase. All session math builds on `date-fns-tz` (already a dependency, verified current above) and the existing `src/lib/ict` modules. No audit table required — nothing to approve, remove, or flag.

## Architecture Patterns

### System Architecture Diagram

```
1H NQ closed candles (epoch-sec, Phase 6 pipe)
  │
  ▼
┌──────────────┐   NY wall-clock 20:00–00:00    ┌────────────────┐
│  asiaRange   │ ── per-candle IANA filter ──▶  │ AsiaRange      │
│  (asia.ts)   │    wick-to-wick, gaps skipped  │ {high,low,     │
└──────────────┘                                │  height,date}  │
                                                └───────┬────────┘
                                                        │ swept extreme
15M NQ closed candles (epoch-sec, Phase 6 pipe)         │
  │                                                     ▼
  ▼                                             ┌────────────────┐
┌──────────────┐   gate 1: in-killzone (02:00–05:00 ET strict)   │
│ judasSwing   │ ──gate 2: swept Asia extreme    │ JudasOutput    │
│ (judas.ts)   │ ──gate 3: close-based reversal │ {candidate,    │
└──────────────┘    + Asia-height displacement  │  confirmed,    │
  │                 (sweep + next 3 candles)     │  preRun, ...}  │
  │                                             └───────┬────────┘
  │                                                     │
  │   Phase 7 SMT output (read-only)                    │
  ▼   ┌──────────────────┐                              ▼
asOf ─▶│    amdPhase      │◀─────────────────────────────┘
clock  │    (amd.ts)      │
       │ time skeleton +  │──▶ { phase: accumulation|manipulation|distribution,
       │ event promotions │         reason, inputs }  (+ NY → Gözlənilir branch)
       └──────────────────┘
```

Data flows left-to-right: candle windows plus injected `asOf` enter pure functions; detector outputs flow forward into the classifier. Nothing flows backward (classifier never mutates SMT). Phase 9 selectors and §3 prose sit downstream of the right edge and are out of scope.

### Recommended Project Structure
```
src/lib/ict/
├── asia.ts          # asiaRange — 1H NQ closed candles → AsiaRange (D-01..D-04)
├── asia.test.ts     # clean range, DST triple, post-midnight exclusion, gap-skip, forming exclusion
├── judas.ts         # judasSwing — 15M NQ + AsiaRange → candidate/confirmed/preRun (D-07..D-12)
├── judas.test.ts    # three-gate conjunction, pierce-without-reversal, pre-killzone preRun,
│                    #   4-candle window bound, 60-day budget (dev-script, not UI selector)
├── amd.ts           # amdPhase — range + Judas + read-only SMT → { phase, reason, inputs } (D-13..D-16)
└── amd.test.ts      # time+event transitions, SMT regime tag, NY Gözlənilir branch
```

### Pattern 1: Per-candle IANA wall-clock resolution (the D-07 killzone-check template)
**What:** Every session-membership test resolves each candle's epoch timestamp through `formatInTimeZone(timeSec * 1000, NY_TZ, …)` at call time — never a fixed offset, never host-local `getHours`.
**When to use:** Killzone membership, Asia-window membership, session-date attribution — any wall-clock predicate in `asia.ts` / `judas.ts`.
**Example:**
```typescript
// Source: src/lib/ict/aggregate.ts:41-47 (verbatim template, read this session)
function nyDateOf(timeSec: number): string {
  return formatInTimeZone(timeSec * 1000, NY_TZ, 'yyyy-MM-dd');
}

function nyHourOf(timeSec: number): number {
  return Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'H'));
}
// with NY_TZ = 'America/New_York' (src/lib/ict/aggregate.ts:12)
```
Note the minute-level edge: killzone strict inequality on 02:00–05:00 needs minute resolution for 15M candles (`'H:mm'` or hour+minute format), since a 15M candle at 01:45 or 05:00 must be classified exactly. D-08's 01:47 pre-run example proves sub-hour precision is load-bearing.

### Pattern 2: Boundary re-validation + forming exclusion (T-07-01 precedent)
**What:** Each new module re-validates its inputs at its own boundary — `closedOnlyIntraday()` first, then finite-OHLC plus finite-positive-time filter — rather than trusting the parser or join layers.
**When to use:** Entry of `asiaRange`, `judasSwing` (amd.ts consumes already-validated detector outputs plus injected clock).
**Example:**
```typescript
// Source: src/lib/ict/aggregate.ts:102-108 + 31-33 (verbatim shape, read this session)
const closed = closedOnlyIntraday(rows);
const valid = closed.filter((r) => hasFiniteOhlc(r) && hasValidTime(r));
// with hasValidTime (src/lib/ict/aggregate.ts:31-33):
function hasValidTime(c: IntradayCandle): boolean {
  return Number.isFinite(c.time) && c.time > 0;
}
// closedOnlyIntraday (src/lib/ict/types.ts:64-66):
export function closedOnlyIntraday(candles: IntradayCandle[]): IntradayCandle[] {
  return candles.filter((c) => !c.forming);
}
```

### Pattern 3: Close-based sweep-then-reject (the D-11 reversal template)
**What:** A sweep counts only when the wick pierces the extreme AND a close confirms rejection — the same two-half single-candle semantics as the FVG transition, extended to a 4-candle window for Judas.
**When to use:** Gate 3 of `judasSwing`; displacement measured from the swept extreme as a multiple of Asia height.
**Example:**
```typescript
// Source: src/lib/ict/fvg.ts:160-162 (verbatim two-half semantics, read this session)
const pierced = gap.polarity === 'BULLISH' ? c.low < gap.bottom : c.high > gap.top;
if (!pierced) continue;
const rejected = gap.polarity === 'BULLISH' ? c.close >= gap.bottom : c.close <= gap.top;
```
For Judas the polarity axis is range-side (sweep of Asia high = bearish-manipulation setup; sweep of Asia low = bullish-manipulation setup), the pierce is against `AsiaRange.high`/`low`, and the rejection close must hold displacement: `|close − sweptExtreme| ≥ DISP_MULT × height` within sweep + next 3 candles (D-09/D-10/D-11).

### Pattern 4: Suppressed / honest-degrade envelopes with reason strings (the D-16 output template)
**What:** Every output that can be unavailable carries a machine-readable reason; §3 renders reasons verbatim downstream.
**When to use:** `amd.ts` NY branch (`Gözlənilir` + reason), thin/empty Asia Range (no closed candles in window), SMT pass-through of `CORR_DECOUPLED` / `rollover-week`.
**Example:**
```typescript
// Source: src/lib/ict/smt.ts:39-44 (verbatim vocabulary, read this session)
export interface SmtSuppressed {
  suppressed: true;
  reason: 'CORR_DECOUPLED' | 'rollover-week';
  corr?: number;
}
// SMT signal shape consumed read-only (src/lib/ict/smt.ts:30-37):
export interface SmtSignal {
  suppressed: false;
  direction: 'BULLISH' | 'BEARISH' | 'NO-SIGNAL';
  sweeperLeg: 'NQ' | 'ES' | null;
  nqWindow: SmtLegWindow | null;
  esWindow: SmtLegWindow | null;
  bpsGap: number;
}
```
`amd.ts` must accept `SmtOutput` (the `SmtSignal | SmtSuppressed` union) without narrowing it destructively — read `direction` only when `suppressed === false`.

### Anti-Patterns to Avoid
- **Fixed-offset sessions (`+4`/`+5`, `EST` literals):** 1-hour error twice a year, invisible for months — IANA resolution plus March/November tests, no exceptions.
- **Two-gate Judas (pierce + clock, no reversal):** never in production, not even temporarily; pierce-without-reversal stays `candidate` (D-12).
- **Post-midnight wicks in the range (D-03):** anything past 00:00 NY belongs to London's story; including it widens the range and desensitizes displacement.
- **Interpolating missing candles (D-04):** Sunday 18:00 ET open effects and holidays are correct absence — skip, never fill.
- **Re-deriving rollover or SMT comparison here (D-06/D-14):** `rollover.ts` tripwire and `smt.ts` comparator are consumed read-only; Asia/Judas windows must not re-derive either.
- **`Date.now()` / `new Date()` inside `src/lib/ict`:** grep must stay clean; `asOf` is always injected (PITFALLS P8).
- **Chicago CME clock for sessions:** `src/lib/time.ts` exports `CME_TZ = 'America/Chicago'` for display, but D-01/D-07 mandate NY wall-clock — session logic uses `America/New_York`, never `CME_TZ`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NY wall-clock resolution | UTC-offset arithmetic, `getTimezoneOffset` math | `formatInTimeZone` from `date-fns-tz` (Pattern 1) | DST transition windows drift under ms-plus-offset arithmetic; `aggregate.ts:35-40` documents exactly why |
| Civil-date rollback across DST-short/long days | `new Date(y,m,d-1)` construction | Integer civil-date arithmetic (`daysFromCivil`/`civilFromDays`/`prevCalendarDay`, `aggregate.ts:52-82`) or NY wall-clock date strings | Date construction near transitions depends on host TZ and DST day length |
| DST-correct test fixtures | Hand-computed epoch constants | `fromZonedTime` in tests (`aggregate.test.ts:32-34`) | Fixtures stay correct across both transitions without hand-rolled offsets |
| Session-date attribution | Custom bucketing | `nyDateOf` per-candle date + Asia session-date convention (session dated by its 20:00 NY open date) | One wall-clock source of truth; chart, detector, and §3 agree |
| Freshness / staleness gating | New status enums in `amd.ts` | `deriveStatus` + `formatStripAge` vocabulary (`freshness.ts`), per-leg envelopes at the Phase 9 selector boundary | No new status enum; per-leg stale refusal already decided (Phase 6 D-04) |

**Key insight:** every time-math problem in this phase is already solved in-repo (`aggregate.ts` helpers, `time.ts` Baku utils, `freshness.ts` vocabulary). New code composes those primitives; any new date arithmetic is a defect risk, not an innovation.

## Common Pitfalls

### Pitfall 1: The 19:00 text vs the 20:00 decision (conforming-edit trap)
**What goes wrong:** Plans or tests encode 19:00–00:00 from REQUIREMENTS.md ICT-12 or roadmap criterion 1, contradicting locked D-01 (20:00–00:00).
**Why it happens:** Two canonical documents still say 19:00; only CONTEXT.md carries the override.
**How to avoid:** Planning-time conforming edits to REQUIREMENTS.md ICT-12 and ROADMAP.md criterion 1 (19:00 → 20:00) before any plan references them; `asia.test.ts` pins `ASIA_START_NY_HOUR = 20` as a named constant.
**Warning signs:** Any `19` hour literal in Asia code, fixtures, or plan text.

### Pitfall 2: DST moves the killzone (PITFALLS P4, amplified)
**What goes wrong:** Asia Range captures an hour of London flow (or misses Asian flow); Judas runs in dead air; bug vanishes for six months.
**Why it happens:** Fixed-offset conversion of "02:00–05:00 EST" shorthand.
**How to avoid:** Pattern 1 for all membership checks; DST triple-test gate — March spring-forward pair, November fall-back pair (with the repeated 01:00 wall-clock hour; see `aggregate.ts:139-159` fall-back merge precedent), plus a CME maintenance-break (16:00–17:00 CT daily) `inBreak`-style case. Fixture helper: `nyHourEpoch` via `fromZonedTime` (`aggregate.test.ts:32-34`).
**Warning signs:** `+4`, `+5`, `getHours() + X`, `EST` literals; session tests covering one month only.

### Pitfall 3: Judas flags every Asia-range wick (PITFALLS P5)
**What goes wrong:** Detector fires on 01:00 pre-runs, midday drift-throughs, slow grinds — "manipulation" five times a day; operators fade genuine breakouts.
**Why it happens:** Implementing pierce + clock without the reversal/displacement leg.
**How to avoid:** Three gates, all required, strict killzone inequality both edges; 01:47-style sweeps → `preRun: true`, never candidates; displacement as Asia-height multiple tuned so the 60-day budget run confirms ≤25% of sessions (tune displacement, not the clock).
**Warning signs:** Detector with no displacement parameter; Asia Range including post-midnight wicks; signals outside 02:00–05:00 counted as hits.

### Pitfall 4: Intraday treated like D1 (PITFALLS P6)
**What goes wrong:** Detector inputs include the forming candle → signals self-update between polls with no new closed candle; weekend/break gaps rendered as displacement.
**Why it happens:** Reusing D1 business-day-string habits for epoch-second intraday data.
**How to avoid:** `IntradayCandle` epoch contract only (verbatim shape [VERIFIED: src/lib/ict/types.ts:54-62] — `time` in UTC epoch seconds plus `open/high/low/close` plus optional `forming`); `closedOnlyIntraday` at every detector boundary; no interpolation, gaps skipped. Pipe windows are bounded server-side (`RANGE_FOR_INTERVAL`: `1h → 3mo`, `15m → 1mo` [VERIFIED: src/lib/yahoo.ts:59-63]; intervals allowlisted to `['1d','1h','15m']` [VERIFIED: src/lib/yahoo.ts:48]).
**Warning signs:** Detector output changing between polls with no new closed candle; flat "filled" candles in gaps; `range=max` anywhere.

### Pitfall 5: Breaking purity + honesty contracts (PITFALLS P8)
**What goes wrong:** `Date.now()` inside detectors (snapshot tests pass locally, fail on Vercel UTC servers); derived flags stored instead of derived; confident prose on degraded inputs.
**Why it happens:** Detectors need "now," so the clock feels expedient.
**How to avoid:** Injected `asOf` everywhere; zero store imports in `src/lib/ict`; `amd.ts` emits `{ phase, reason, inputs }` with reason strings for every degraded branch (empty range, candidate-only, NY unavailable); grep `src/lib/ict` for `Date.now`/`new Date()` at the phase gate.
**Warning signs:** Any clock read in `src/lib/ict`; an AMD output branch with no reason string.

## Code Examples

### Asia Range from 1H candles (compose Pattern 1 + Pattern 2)
```typescript
// Composed from src/lib/ict/aggregate.ts:41-47 + src/lib/ict/types.ts:64-66 (verbatim pieces above)
import { formatInTimeZone } from 'date-fns-tz';
import { closedOnlyIntraday, type IntradayCandle } from '@/src/lib/ict/types';

const NY_TZ = 'America/New_York';       // D-01/D-07 — never CME_TZ, never an offset
const ASIA_START_NY_HOUR = 20;          // D-01 — pin as named constant, assert in test
const ASIA_END_NY_HOUR = 24;            // 00:00 next day; D-03 excludes 00:00–02:00

interface AsiaRange { high: number; low: number; height: number; sessionDate: string; }
// sessionDate = NY date of the 20:00 open leg (session dated by its evening open).

export function asiaRange(rows: IntradayCandle[], sessionDate: string): AsiaRange | null {
  const inWindow = closedOnlyIntraday(rows).filter((r) => {
    if (!Number.isFinite(r.time) || r.time <= 0) return false;   // hasValidTime shape
    if (![r.open, r.high, r.low, r.close].every(Number.isFinite)) return false;
    const d = formatInTimeZone(r.time * 1000, NY_TZ, 'yyyy-MM-dd');
    const h = Number(formatInTimeZone(r.time * 1000, NY_TZ, 'H'));
    const m = Number(formatInTimeZone(r.time * 1000, NY_TZ, 'm'));
    const mins = h * 60 + m;
    // Evening leg (20:00–24:00 on sessionDate) only; 00:00+ excluded per D-03.
    return d === sessionDate && mins >= 20 * 60 && mins < 24 * 60;
  });
  if (inWindow.length === 0) return null;                        // honest-degrade: no range, reason downstream
  const high = Math.max(...inWindow.map((r) => r.high));         // D-02 wick-to-wick
  const low = Math.min(...inWindow.map((r) => r.low));
  return { high, low, height: high - low, sessionDate };
}
```

### Judas three-gate detector skeleton (D-07..D-12)
```typescript
// Gate order: killzone membership → swept extreme → close-based reversal + displacement.
type SweepSide = 'HIGH' | 'LOW';
interface JudasOutput {
  candidate: boolean;        // gates 1+2 passed (sweep happened in-killzone)
  confirmed: boolean;        // gate 3 passed within sweep + next 3 candles (D-10)
  preRun: boolean;           // swept outside killzone (D-08) — analyst review only
  sweepSide: SweepSide | null;
  sweepTime: number | null;  // epoch seconds of the sweeping 15M candle
  displacementMult: number;  // realized |close − extreme| / Asia height
}
// Displacement threshold DISP_MULT (a named constant, value tuned by the 60-day
// budget run — see Open Questions) compares against AsiaRange.height (D-09).
// preRun and candidate are mutually exclusive; confirmed implies candidate.
```

### AMD classifier skeleton (D-13..D-16)
```typescript
// Time gives the skeleton, detector events give the promotions (D-13).
type AmdPhase = 'accumulation' | 'manipulation' | 'distribution';
interface AmdOutput {
  phase: AmdPhase;
  reason: string;            // Azerbaijani §3-ready sentence; rendered verbatim in Phase 9
  inputs: {                  // contributing detector references (D-16)
    asia: AsiaRange | null;
    judas: JudasOutput | null;
    smt: SmtOutput | null;   // read-only (D-14) — never mutated, never re-derived
  };
}
// Transition sketch: Asia hours + no sweep → accumulation; in-killzone sweep
// (± displacement) → manipulation; post-displacement continuation → distribution.
// NY hours → { phase: <prior>, reason: 'Gözlənilir — …', inputs } degraded branch (D-15).
// §3 prose shape target: 'Asia Range [Təmizlənib / Təmizlənməyib]. London/NY Judas
// Swing [Baş verib / Gözlənilir].' (reference/institutional_rules.md §3).
```

### DST fixture helper (reuse verbatim, do not reinvent)
```typescript
// Source: src/lib/ict/aggregate.test.ts:32-34 (verbatim, read this session)
import { fromZonedTime } from 'date-fns-tz';
function nyHourEpoch(nyDate: string, nyHour: number): number {
  return Math.floor(fromZonedTime(`${nyDate} ${String(nyHour).padStart(2, '0')}:00:00`, NY_TZ).getTime() / 1000);
}
// 2026 transitions for the triple-test: March spring-forward instant 2026-03-08
// 07:00Z; November fall-back instant 2026-11-01 06:00Z (repeated 01:00 wall hour)
// — both pinned by aggregate.test.ts:70-87 pair tests this session.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 19:00–00:00 Asia text (ICT-12, roadmap criterion 1) | 20:00–00:00 NY per D-01 (corroborated ICT education sources) | Phase 8 discuss (2026-09-07) | Conforming edits to REQUIREMENTS.md + ROADMAP.md required at planning; tests pin 20 |
| Fixed-point Judas displacement | Asia-height multiple (D-09) | Phase 8 discuss (2026-09-07) | Self-normalizing across volatility regimes; no per-regime retuning |
| Two-gate Judas (pierce + clock) | Three-gate conjunction + candidate/confirmed split (D-12) | PITFALLS P5 + D-12 | Candidates render hollow with hedge prose; confirmed needs displacement proof |

**Deprecated/outdated:**
- `CME_TZ` (`America/Chicago`) for session logic: display-only; NY wall-clock governs sessions per D-01/D-07.
- NY Judas detector in v2.0: explicitly out of scope (REQUIREMENTS.md) — NY stays `Gözlənilir`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | None. All load-bearing claims were verified by reading the cited source files this session; ICT semantics (session hours, three-gate structure) are locked user decisions (D-01..D-16) corroborated by PITFALLS.md education-source rows at MEDIUM confidence. | — | — |

## Open Questions (RESOLVED)

1. **Displacement multiple value (`DISP_MULT`) — RESOLVED**
   - What we know: D-09 locks the unit (multiple of Asia Range height); PITFALLS P5 says tune displacement, not the clock, against the ≤25% budget.
   - What's unclear: the starting numeric value (ICT sources vary; no official spec).
   - Recommendation: planner sets an initial constant (e.g. 0.5× height — a half-range follow-through is the smallest defensible "displacement" claim) and requires the 60-day budget run to confirm-or-retune before merge. This is calibration, not architecture.
   - RESOLVED: 08-02-PLAN.md seeds `DISP_MULT = 0.5` with the 60-day budget run as confirm-or-retune gate.

2. **60-day false-positive budget data source — RESOLVED**
   - What we know: 15M 1mo window holds ~2419 rows (Phase 6 probe) — about one month, not 60 days; the budget run needs ~60 sessions of 15M + 1H history.
   - What's unclear: whether the run fetches paginated history, uses a dev-script with stitched ranges, or samples fewer sessions.
   - Recommendation: planner makes the budget run a dev-script concern (per PITFALLS performance guidance: heavy backtests are dev-scripts, not UI selectors), with the exact history-stitching method left to the implementing plan.
   - RESOLVED: 08-02-PLAN.md task 2 implements the budget run as seeded offline dev-script `scripts/judas-budget.ts` (no live pagination, no UI selector).

3. **Asia `sessionDate` attribution across midnight — RESOLVED**
   - What we know: Asia 20:00–00:00 spans two NY calendar dates; D-03 excludes 00:00–02:00, so with D-01's window no 00:00+ candle should ever qualify — attribution is by the evening-open date.
   - What's unclear: nothing material — flagging only so the planner pins "session dated by 20:00 open date" in one test.
   - Recommendation: single assertion in `asia.test.ts`; no further research.
   - RESOLVED: 08-01-PLAN.md task 2 pins the "dated by 20:00 open date" assertion in `asia.test.ts`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | vitest run | ✓ | v24.11.1 | — |
| `date-fns-tz` | IANA session resolution | ✓ | 3.2.0 (installed = latest) | — |
| `date-fns` | civil-date helpers | ✓ | 4.4.0 (installed = latest) | — |
| vitest | fixture suite | ✓ | 5.x (configured, colocated tests) | — |
| Yahoo 1H/15M pipes | detector inputs | ✓ (Phase 6 shipped) | `1h → 3mo`, `15m → 1mo` | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — this phase installs nothing.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5 (`npm test` → `vitest run`) |
| Config file | `vitest.config.ts` (include `src/**/*.test.ts`, node env, 15s timeout) |
| Quick run command | `npx vitest run src/lib/ict/asia.test.ts src/lib/ict/judas.test.ts src/lib/ict/amd.ts` (narrow to phase files) |
| Full suite command | `npm test` (must stay 133+ green — no regressions) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ICT-12 | Asia Range 20:00–00:00 NY, wick-to-wick, gaps skipped, Baku edge | unit | `npx vitest run src/lib/ict/asia.test.ts` | ❌ Wave 0 |
| ICT-12 | March + November + maintenance-break DST boundaries | unit | `npx vitest run src/lib/ict/asia.test.ts -t DST` | ❌ Wave 0 |
| ICT-13 | Three-gate conjunction; pierce-without-reversal stays candidate; pre-killzone → preRun | unit | `npx vitest run src/lib/ict/judas.test.ts` | ❌ Wave 0 |
| ICT-13 | ≤25% confirmed sessions over 60 days | dev-script (not UI selector) | `npx tsx scripts/judas-budget.ts` (name TBD by planner) | ❌ Wave 0 |
| ICT-14 | Time+event transitions; SMT read-only tag; NY Gözlənilir branch | unit | `npx vitest run src/lib/ict/amd.test.ts` | ❌ Wave 0 |
| Purity | No `Date.now`/`new Date()` in `src/lib/ict` | grep gate | `grep -rn "Date.now\|new Date(" src/lib/ict/asia.ts src/lib/ict/judas.ts src/lib/ict/amd.ts` (expect no hits) | n/a |

### Sampling Rate
- **Per task commit:** narrow phase-file vitest run
- **Per wave merge:** `npm test` (full suite green)
- **Phase gate:** Full suite green + DST triple-test green + budget run ≤25% before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ict/asia.ts` + `asia.test.ts` — covers ICT-12 (clean range, DST triple, post-midnight exclusion, gap-skip, forming exclusion, empty-window null)
- [ ] `src/lib/ict/judas.ts` + `judas.test.ts` — covers ICT-13 (conjunction, candidate-vs-confirmed, preRun, 4-candle bound, forming exclusion)
- [ ] `src/lib/ict/amd.ts` + `amd.test.ts` — covers ICT-14 (transitions, SMT tag, NY branch, `{ phase, reason, inputs }` shape)
- [ ] Budget dev-script — covers the 60-day ≤25% verification (dev-script per performance guidance, never a UI selector)
- [ ] Conforming edits: REQUIREMENTS.md ICT-12 + ROADMAP.md Phase 8 criterion 1 (19:00 → 20:00) at planning time
- [ ] No shared-fixture gap: `nyHourEpoch`/`fromZonedTime` helper pattern is copy-pasteable from `aggregate.test.ts:32-34`

## Security Domain

> `security_enforcement: true`, ASVS level 1 (verified in `.planning/config.json` this session).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface in this phase |
| V3 Session Management | no | No user sessions; "sessions" here are market sessions, not auth sessions |
| V4 Access Control | no | No access boundaries crossed |
| V5 Input Validation | yes | Boundary re-validation at each detector entry (Pattern 2): forming drop, finite-OHLC, finite-positive-time; throwing on non-array input per `fvg.ts`/`smt.ts` precedent |
| V6 Cryptography | no | No crypto; never hand-roll (no opportunity arises) |

### Known Threat Patterns for pure-function ICT math

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| NaN/Infinity OHLC poisoning detector output | Tampering | `hasFiniteOhlc` + `hasValidTime` filters at every boundary (Pattern 2); NaN never reaches `Math.max`/comparators |
| Forming-candle self-updating signal | Tampering | `closedOnlyIntraday()` at every detector boundary, even if the parser regresses |
| Unsorted/out-of-order rows misattributing first/last | Tampering | Ascending sort + timestamp dedupe before grouping (aggregate T-07-04 precedent) |
| Non-finite gap/extreme bounds | Tampering | `assertFiniteGap`-style assertion helpers on detector outputs |

## Sources

### Primary (HIGH confidence)
- `src/lib/ict/aggregate.ts` (NY_TZ, nyDateOf/nyHourOf, hasValidTime, boundary re-validation, fall-back merge, civil-date arithmetic) — read this session
- `src/lib/ict/types.ts` (IntradayCandle epoch contract, closedOnlyIntraday) — read this session
- `src/lib/ict/smt.ts` (SmtSignal/SmtSuppressed shapes, SMT_TOL_BPS, gate order) — read this session
- `src/lib/ict/fvg.ts` (sweep-then-reject two-half semantics) — read this session
- `src/lib/ict/join.ts` (forming + finite-OHLC boundary re-validation) — read this session
- `src/lib/ict/rollover.ts` (ROLLOVER_ATR_MULT=3 tripwire — consumed read-only) — read this session
- `src/lib/yahoo.ts` (INTERVAL_ALLOWLIST, RANGE_FOR_INTERVAL 1h→3mo / 15m→1mo) — read this session
- `src/lib/time.ts`, `src/lib/session-line.ts`, `src/lib/freshness.ts` — read this session
- `.planning/research/PITFALLS.md` P4/P5/P6/P8 + debt table + Judas source rows (Asia 20:00–00:00, KZ 02:00–05:00 strict, 01:00 pre-run unreliable) — read this session
- `08-CONTEXT.md` (D-01..D-16 locked decisions) — read this session
- `reference/institutional_rules.md` Modul 3 + §3 prose shape — read this session
- npm registry: `date-fns-tz@3.2.0`, `date-fns@4.4.0` currency checks — run this session

### Secondary (MEDIUM confidence)
- ICT session/Judas semantics via PITFALLS.md source rows (TradingStrategyGuides, FXNX, TheICT, AronGroups — consistent session times, execution details vary; no official spec)

### Tertiary (LOW confidence)
- None relied upon. The initial `DISP_MULT` seed value (Open Question 1) is explicitly calibration, not research.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version verified against install + registry this session; zero new deps
- Architecture: HIGH — all four patterns are verbatim in-repo templates with file:line citations
- Pitfalls: HIGH for mechanics (in-repo precedents), MEDIUM for ICT semantics (education sources, no official spec — but locked as user decisions, so planner needs no further validation)

**Research date:** 2026-09-07
**Valid until:** 30+ days (stable domain: locked decisions + in-repo patterns; only the DISP_MULT calibration is time-sensitive, and it is test-tuned, not research-tuned)
