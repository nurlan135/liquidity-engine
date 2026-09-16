# Phase 19: Pools Math - Research

**Researched:** 2026-09-16
**Domain:** ICT BSL/SSL stop-cluster projection math (pure functions + guarded Zustand selector)
**Confidence:** HIGH

## Summary

Phase 19 builds a ranked buy-side / sell-side liquidity (BSL/SSL) stop-cluster inventory as deterministic pure math inside the existing `src/lib/ict/` family, plus one guarded `selectPools` Zustand selector. Every downstream consumer (Phase 20 report §1 + chart lines, Phase 21 calibration) reads the same ranked array — so the detector, equality weighting, zone projection, sweep lifecycle, scorer, and selector contract must be pinned before any pixel ships.

The unanimous approach from the v3.1 research corpus (`.planning/research/SUMMARY.md`, `FEATURES.md`, `PITFALLS.md`, `ARCHITECTURE.md`) and the locked CONTEXT decisions is: **one new pure module** that reuses the proven `isSwingHigh`/`isSwingLow` + `SWING_K=2` strict-fractal contract verbatim (extracted to a shared owner with zero behavior change), clusters equal highs/lows with an `EQUAL_TOL_BPS ~25` tolerance, merges same-side pools within 0.25× ATR, caps the inventory at 20 trailing by `originDate`, tracks `ACTIVE → SWEPT → CONSUMED` with first-sweep-wins, scores by proximity × DOL-side with exported `CALIBRATION-PROVISIONAL` constants, and exposes it all through a refuse-null / `sharedEpoch` / never-throws selector. **Zero new dependencies** — everything maps onto own code plus already-installed packages. Pools are read-only projection context that never votes (no trigger gate, no new flaw key, no ticket change).

**Primary recommendation:** Create `src/lib/ict/pools.ts` (single module, BSL+SSL same scan opposite polarity) + `src/lib/ict/swings.ts` shared extraction + `selectPools` in `store.ts`, with `smt.test.ts` green as the extraction gate and `purity.test.ts` green from the first commit.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Equality bonus is strong — triple equal-highs outrank everything nearby (ICT engineered-pool reading).
- **D-02:** EQUAL_TOL_BPS ~25 bps, mirroring the SMT_TOL_BPS=25 idiom (`src/lib/ict/smt.ts:9`).
- **D-03:** Minimum 2 touches earns the equality bonus.
- **D-04:** Swept pools keep their equality bonus (retest magnetism preserved).
- **D-05:** Bonus scales diminishing — 4th/5th equal touches add less than the 2nd (prevents mega-pool dominance).
- **D-06:** Rank-1 = nearest ACTIVE pool on the DOL side (standard ICT: nearest unswept pool on DOL side is the pain threshold).
- **D-07:** DOL-side boost 2.0 (matching side doubles score; DOL alignment decides rank-1).
- **D-08:** Behind-price penalty 0.25 strong (BSL below close / SSL above close nearly drop out — pain is ahead, not behind).
- **D-09:** Proximity measured in ATR units (`distAtr = |poolMid − lastClose| / atr` via existing `computeATR`), never raw points — NQ scale-invariant.
- **D-10:** Phase 19 math is D1-only per POOL-01 — swing clusters from closed D1 candles. Asia/range seeds land in Phase 20 wiring, not in the math.
- **D-11:** 60-bar trailing lookback, same as SMT SWING_LOOKBACK.
- **D-12:** Shared swing truth — reuse `isSwingHigh`/`isSwingLow` + `SWING_K=2` verbatim (extract to shared module if cleaner, zero behavior change, `smt.test.ts` green as gate). Never fork swing logic.
- **D-13:** ATR-merge multiple 0.25× — same-side pools within quarter-ATR merge into the more extreme one (kills wick-noise).
- **D-14:** Inventory cap 20 total (`POOL_MAP_BOUND = 20`, mirrors `FVG_MAP_BOUND`).
- **D-15:** Merged zone bounds = min-max span of the cluster (honest band, not a single flickering line).
- **D-16:** Over-cap cut keeps newest N by originDate (trailing discipline, WR-07 `applyMitigation` precedent).
- **D-17:** Pools never vote — no trigger gate, no new flaw key, no ticket derivation change in v3.1 (roadmap lock).
- **D-18:** Sweep lifecycle ACTIVE/SWEPT/CONSUMED: wick-pierce = swept, close-through = consumed, first-sweep-wins, no re-promotion (POOL-04).
- **D-19:** Pool shape `{ side, top, bottom, touches, weight, originDate, status }` with trailing cap (POOL-03).
- **D-20:** Scorer is proximity × DOL-side with provisional constants exported + boundary-tested (POOL-05).
- **D-21:** `selectPools` with refuse-null envelope + sharedEpoch + never-throws (POOL-06).
- **D-22:** All ranking constants ship CALIBRATION-PROVISIONAL + boundary-test pins; Phase 21 reviews against firing log. No tuning in Phase 19.
- **D-23:** Purity guard holds from first commit — injected `asOf`, no `Date.now`, no store imports in `src/lib/ict` (`purity.test.ts` self-scans new files).
- **D-24:** 420-test suite stays green — shared swings extraction must keep `smt.test.ts` passing.

### The agent's Discretion
None — user decided all presented areas.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (P2 queue POOL2-01–05 — TP2 resolver, sentiment multiplier, 15M pools, age/decay, proximity tag — already deferred at milestone level in STATE.md.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POOL-01 | BSL/SSL pools detected from D1 swing highs/lows (shared swings.ts, k=2 strict fractal) | Shared swing contract (`isSwingHigh`/`isSwingLow`, `SWING_K=2`) + `closedOnly` + 60-bar trailing window; see Standard Stack + Pattern 1 |
| POOL-02 | Equal highs/lows get extra weight (EQUAL_TOL_BPS provisional, test-pinned) | `EQUAL_TOL_BPS ~25` tolerance clustering, min-2-touches, strong + diminishing bonus, swept-keeps-bonus; see Pattern 2 + Code Examples |
| POOL-03 | Pools project as zones (side, top, bottom, touches, weight, originDate, status), trailing cap | Locked `LiquidityPool` shape, min-max merged spans, `POOL_MAP_BOUND=20` newest-N cut; see Pattern 3 |
| POOL-04 | Sweep-status lifecycle ACTIVE/SWEPT/CONSUMED (wick-pierce=swept, close-through=consumed, first-sweep-wins) | Judas strict-pierce idiom + FVG close-through idiom, single chronological pass, no re-promotion; see Pattern 4 |
| POOL-05 | Proximity × DOL-side scorer ranks pools (provisional constants exported, boundary-tested) | `score = weight × dolBoost / (1 + distAtr)`, dolBoost 2.0, behind-penalty 0.25, ATR denominator; see Pattern 5 |
| POOL-06 | selectPools selector with refuse-null envelope + sharedEpoch + never-throws | `selectTriggerPure`/`selectSMT` envelope precedent, NQ-leg guards, `sharedEpoch(get)`; see Pattern 6 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Swing detection + pool clustering + zone projection | Client pure lib (`src/lib/ict/`) | — | Deterministic math on closed D1 rows; no I/O, no clock, test-pinned like every other `ict/` detector |
| Sweep lifecycle evaluation (ACTIVE/SWEPT/CONSUMED) | Client pure lib (`src/lib/ict/`) | — | Same chronological closed-candle pass as detection; Judas/FVG idioms consumed read-only, never re-implemented |
| Proximity × DOL-side scoring + ranking | Client pure lib (`src/lib/ict/`) | — | Pure function of pools + lastClose + ATR + DOL direction; provisional constants exported for Phase 21 calibration |
| Guarded pool delivery (stale/empty/thin handling) | Client store (Zustand selector) | — | Only the selector sees leg `stale`/`lastError` envelopes and `sharedEpoch`; `ict/` stays time-blind per purity guard |
| Phase 20+ rendering (§1 prose, chart lines) | Client render components | — | Out of scope for Phase 19; render reads `selectPools` output only, never computes swept-ness independently |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Own code: `src/lib/ict/pools.ts` (NEW) | n/a (new file) | detect → cluster → zone → lifecycle → score pools | One new module, BSL+SSL same scan opposite polarity — mirrors `detectFVGs` handling both polarities in one pass [VERIFIED: src/lib/ict/fvg.ts:50-78] |
| Own code: `src/lib/ict/swings.ts` (NEW, shared extraction) | n/a (moved, zero behavior change) | Single owner of `isSwingHigh`/`isSwingLow` + `SWING_K` | D-12 locked; `smt.ts` and pools import from it — never two swing definitions [VERIFIED: src/lib/ict/smt.ts:7-14,49-79] |
| Own code: `smt.ts` swing contract | existing | Strict fractal predicates + `SWING_K=2`, `SMT_TOL_BPS=25`, `SWING_LOOKBACK=60` | Proven, boundary-pinned donor; equality = no swing [VERIFIED: src/lib/ict/smt.ts:7-14] |
| Own code: `regime.ts` `computeATR` | existing | Scorer distance denominator + 0.25× merge unit | Standard ATR (Wilder smoothing, period 14); returns `[]` when history short — caller must handle [VERIFIED: src/lib/ict/regime.ts:4-40] |
| Own code: `dol.ts` `computePrimaryDOL` | existing | Boosted-side direction for scorer | BULLISH → range high, BEARISH → range low, COMPRESSION → nearer extreme [VERIFIED: src/lib/ict/dol.ts:1-22] |
| Own code: `types.ts` `Candle` + `closedOnly` | existing | D1 input contract + forming-row exclusion | Pool module takes `Candle[]` only — never `IntradayCandle`; the type wall enforces D1-only [VERIFIED: src/lib/ict/types.ts:1-8,47-49,54-62] |
| zustand | ^5.0.15 [VERIFIED: package.json:27] | `selectPools` derived selector | House selector contract lives here; pools derive from the NQ D1 leg, never stored — cannot desync |
| vitest | ^5.0.0 [VERIFIED: package.json:41] | Boundary + lifecycle + ranking + selector tests | `include: ['src/**/*.test.ts', 'app/**/*.test.ts']`, `testTimeout: 15000` [VERIFIED: vitest.config.ts:1-13] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fvg.ts` idioms (read-only reference) | existing | `FVG_MAP_BOUND=20` cap + close-through mitigation + WR-07 origin-sort-before-slice | Copy the cap discipline and close-through semantics; do not import FVG state [VERIFIED: src/lib/ict/fvg.ts:8,80-119] |
| `judas.ts` idioms (read-only reference) | existing | Strict wick-pierce (`>`, `<`) + first-chronological-sweep-wins | Copy pierce semantics for SWEPT transitions; pool module never takes intraday rows [VERIFIED: src/lib/ict/judas.ts:134-160] |
| `range.ts` `thinHistory` | existing | Thin-history signal for selector degrade path | `thinHistory: closed.length < window` [VERIFIED: src/lib/ict/range.ts:19-26]; selector dims/degrades, math stays pure |
| `trigger.ts` provisional-constant convention | existing | `CALIBRATION-PROVISIONAL` comment format | Copy the exact comment idiom for every ranking constant [VERIFIED: src/lib/ict/trigger.ts:20-30] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shared `swings.ts` extraction | Direct import of predicates from `smt.ts` | Direct import is acceptable per D-12 ("if cleaner"); extraction is preferred so a cross-market module (SMT) does not own single-market pool geometry — either way, zero behavior change with `smt.test.ts` green as gate |
| Single `pools.ts` module | Separate `bsl.ts` / `ssl.ts` files | Rejected — same scan opposite polarity; split files double the swing-scan drift surface |
| New npm packages | — | Rejected — unanimous v3.1 finding across three milestones: pure own-code + installed primitives only |

**Installation:**
```bash
# No new packages. Phase 19 is own-code + installed zustand/vitest only.
npm install
```

**Version verification:** No registry lookup needed — no new external packages are recommended. Installed versions above were read from `package.json` this session [VERIFIED: package.json:13-42].

## Package Legitimacy Audit

> No external packages are installed by this phase. The audit is recorded explicitly so the planner does not infer otherwise.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| *(none)* | — | — | — | — | — | No new dependencies; own-code + installed zustand/vitest only |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
60s poll tick (unchanged: NQ D1 leg refreshes, envelope guard, coverage recompute)
    ↓
store.nq leg (candles + stale + lastError + lastUpdatedISO)
    ↓
selectPools() — NEW, render-pure derivation
  │  1. refuse-null on nq.stale / empty closed NQ leg (reason rides nq.lastError)
  │  2. one sharedEpoch(get) call (single time truth, caller boundary only)
  │  3. derive: swings → clusters → zones → lifecycle → score → rank → cap
  │     (single chronological pass over closed D1 rows; ATR/DOL/bias read-only)
  │  4. try/catch → null (never throws into render)
    ↓
PoolsOutput { pools: LiquidityPool[] (ranked), asOf }  →  Phase 20 fans out
  │  to report §1 prose + chart price lines (same array, no independent swept-ness)
```

Data-flow direction: legs → `ict/` pure → `selectPools` → (Phase 20) render. `trigger` / `invalidation` / `ticket` are read-only neighbors — Phase 19 adds no edge from pools to any of them (D-17 roadmap lock).

### Recommended Project Structure
```
src/
├── lib/ict/
│   ├── swings.ts              # ★ NEW — shared isSwingHigh/isSwingLow + SWING_K (moved verbatim, zero behavior change)
│   ├── pools.ts               # ★ NEW — detect → cluster → zone → lifecycle → score → rank → cap (pure)
│   ├── pools.test.ts          # ★ NEW — boundary + equality + merge + lifecycle + scorer + cap pins
│   ├── swings.test.ts         # ★ NEW (optional) — re-home of swing predicate pins; smt.test.ts stays green regardless
│   ├── smt.ts                 # MODIFIED (imports only) — predicates re-exported from swings.ts, logic untouched
│   ├── judas.ts               # UNCHANGED — sweep-truth idiom donor (read-only reference)
│   ├── fvg.ts                 # UNCHANGED — inventory-cap + mitigation idiom donor (read-only reference)
│   ├── regime.ts              # UNCHANGED — computeATR donor
│   ├── dol.ts / bias.ts       # UNCHANGED — scorer input donors
│   └── purity.test.ts         # UNCHANGED — self-scans pools.ts/swings.ts automatically, green from first commit
├── lib/
│   ├── store.ts               # MODIFIED — add selectPools only (+ store tests)
│   ├── trigger.ts / invalidation.ts / ticket.ts  # UNCHANGED — explicitly non-integrated (D-17)
```

### Pattern 1: Shared swing truth (D-12, POOL-01)
**What:** `isSwingHigh`/`isSwingLow` strict fractal with `k=2` — a bar is a swing high only if its high strictly exceeds all `k` neighbors each side; equality means no swing. Pools run these predicates over closed, finite, chronologically-sorted NQ D1 rows sliced to the trailing 60 (`SWING_LOOKBACK` precedent).
**When to use:** always — this is the pool seed inventory. Swing highs → BSL candidates above price; swing lows → SSL candidates below.
**Example:**
```typescript
// Source: src/lib/ict/smt.ts:49-79 (donor — move verbatim to swings.ts, zero behavior change)
export function isSwingHigh(highs: number[], i: number, k: number): boolean {
  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`isSwingHigh requires a positive integer k, got ${k}`);
  }
  if (i < k || i + k >= highs.length) {
    return false;
  }
  for (let j = i - k; j <= i + k; j++) {
    if (j !== i && highs[j] >= highs[i]) {  // strict: equality = no swing
      return false;
    }
  }
  return true;
}
```
Boundary discipline to copy: `closedOnly` first, drop non-finite OHLC (`hasFiniteOhlc` [VERIFIED: src/lib/ict/smt.ts:81-88]), sort chronological copies (never mutate caller arrays), slice trailing window (`matchSwings` precedent [VERIFIED: src/lib/ict/smt.ts:117-131]).

### Pattern 2: Equality clustering with strong diminishing bonus (D-01–D-05, POOL-02)
**What:** Same-side swings whose relative price gap ≤ `EQUAL_TOL_BPS` (~25 bps, mirrors `SMT_TOL_BPS = 25` [VERIFIED: src/lib/ict/smt.ts:9]) cluster into one pool. Minimum 2 touches earns the bonus; bonus is strong (triple equal-highs outrank everything nearby) but diminishing (4th/5th touches add less than the 2nd); swept pools keep the bonus (D-04, retest magnetism).
**When to use:** always — this is what separates engineered pools from lone wicks.
**Float discipline:** copy the `TOL_EPS_BPS = 1e-9` epsilon idiom for tolerance-boundary compares so divide-then-multiply float error cannot flip a boundary fixture [VERIFIED: src/lib/ict/smt.ts:293-297]. Gap exactly equal to tolerance (within epsilon) resolves per strict-greater-than semantics — pin the choice in a test either way.

### Pattern 3: Zone projection + ATR-merge + trailing cap (D-13–D-16, POOL-03)
**What:** Merged zone bounds = min-max span of the cluster (D-15). Same-side pools within 0.25× ATR merge into the more extreme one (D-13; ATR from `computeATR`, which returns `[]` on short history — treat empty ATR as "no merge denominator, skip merge, keep all" and pin it). Inventory capped at `POOL_MAP_BOUND = 20` total (D-14, mirrors `FVG_MAP_BOUND = 20` [VERIFIED: src/lib/ict/fvg.ts:8]); over-cap cut keeps newest N by `originDate` — sort by `originDate` **before** slicing so map and prose agree even for unsorted input (WR-07 precedent [VERIFIED: src/lib/ict/fvg.ts:114-118]).
**Locked shape (D-19):** `{ side, top, bottom, touches, weight, originDate, status }` where `side: 'BSL' | 'SSL'`, `status: 'ACTIVE' | 'SWEPT' | 'CONSUMED'` (quote values verbatim — planner must use these exact literals).

### Pattern 4: Sweep lifecycle, first-sweep-wins, no re-promotion (D-18, POOL-04)
**What:** Single chronological pass over closed candles strictly after each pool's origin: wick-pierce of the zone edge marks `SWEPT`; close-through beyond the zone marks `CONSUMED` (leaves the active map). First sweep wins; later touches of a swept pool never re-promote it; swept pools keep equality bonus with reduced effective presence (they stay visible for Phase 20 dimming, never counted as fresh pain).
**Pierce semantics (copy verbatim):** strict inequality — `r.high > extreme` / `r.low < extreme`, with the both-extremes-pierced deterministic resolution as reference [VERIFIED: src/lib/ict/judas.ts:134-160]. **Close-through semantics (copy verbatim):** strictly-later candle closes beyond the bound; wick touch without close-through keeps the pool [VERIFIED: src/lib/ict/fvg.ts:80-119]. **Stale-origin rule:** an origin date absent from the candle array is untestable, not an error — keep the pool, skip evaluation for it (`originIndexOrNeg1` precedent [VERIFIED: src/lib/ict/fvg.ts:41-43,98-100]).
**`asOf` discipline:** lifecycle evaluation honors an injected `asOf` date string and skips candles after it (`detectTransition` precedent [VERIFIED: src/lib/ict/fvg.ts:157-159]); `asOf` is a plain-string parameter, never a clock read.

### Pattern 5: Proximity × DOL-side scorer (D-06–D-09, D-20, POOL-05)
**What:** `distAtr = |poolMid − lastClose| / atr`; `score = weight × dolBoost / (1 + distAtr)` where `dolBoost = 2.0` when the pool side matches the DOL direction (BSL when DOL = range high, SSL when DOL = range low — `computePrimaryDOL` mapping [VERIFIED: src/lib/ict/dol.ts:6-22]), else `1.0`. Pools behind price (BSL below lastClose, SSL above) get `behindPenalty = 0.25` multiplicative. Rank-1 = nearest ACTIVE pool on the DOL side (D-06). All multipliers exported + boundary-tested + `CALIBRATION-PROVISIONAL` comment (trigger.ts idiom [VERIFIED: src/lib/ict/trigger.ts:20-30]). No tuning in Phase 19 (D-22).
**ATR edge:** `computeRegime` degrades to `atr: 0` on short history [VERIFIED: src/lib/ict/regime.ts:42-50] and `computeATR` returns `[]` below `period + 1` rows [VERIFIED: src/lib/ict/regime.ts:20-23] — scorer must define the zero/empty-ATR behavior explicitly (recommended: refuse-to-rank → selector returns null via try/catch or explicit guard; pin with a test, never divide by zero).

### Pattern 6: Guarded `selectPools` envelope (D-21, POOL-06)
**What:** Copy the `selectTriggerPure` / `selectSMT` envelope verbatim: refuse `null` on stale or empty owning leg (reason rides `nq.lastError`), one `sharedEpoch(get)` call, derive via pure functions, try/catch returning `null`, zero `set` calls.
**Reference envelope:**
```typescript
// Source: src/lib/store.ts:886-914 (selectTriggerPure) + :810-819 (selectSMT guard shape)
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
// sharedEpoch: single time truth, caller boundary only [VERIFIED: src/lib/store.ts:465-469]
function sharedEpoch(get: () => DashboardState): number {
  const iso = get().nq1h.lastUpdatedISO;
  const parsed = iso === null ? NaN : new Date(iso).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : Math.floor(new Date().getTime() / 1000);
}
```
**Pools adaptation:** guard on the **NQ D1 leg only** (`nq.stale`, empty closed NQ candles) — pools are D1-NQ geometry; ES-stale must not null pools (ES confirms only, never pool geometry input). Thin history (`thinHistory` from `computeRange` [VERIFIED: src/lib/ict/range.ts:19-26]) is a degrade signal for Phase 20 dimming, not a null — but the selector should surface it (recommended: include a `degraded`/`thin` flag in the selector output, `computeTicket` degraded-precedent [VERIFIED: src/lib/store.ts:1085-1097]). Null means degraded — never a throw into render ("Null means degraded — never a throw into render" [VERIFIED: src/lib/store.ts:806-809]).

### Anti-Patterns to Avoid
- **Forked swing logic:** a second fractal loop with different `k` or `>=` edge semantics — SMT says no swing, §1 says pool at the same bar. Reuse/share, never duplicate.
- **Swept-state as display concern:** chart dims but data stays active — every consumer re-implements swept-ness differently. Lifecycle lives in the data layer; display reads `status`.
- **Uncapped pool array ("cap in the UI"):** selector/overlay divergence — cap at the selector boundary (`POOL_MAP_BOUND`), render cap is Phase 20's separate layer.
- **Pools voting in trigger/flaw/ticket "temporarily":** parity harness red, calibration band broken. Read-only agree-tag is the maximum, and even that is Phase 20+ scope — Phase 19 wires nothing.
- **Interpolated reasons / bare "stoplar buradadır" copy:** Phase 19 emits no prose at all (no `describePools` renderer — that is Phase 20); keep numbers in structured fields so Phase 20 can stay verbatim.
- **Clock/store reads in `ict/`:** trips `purity.test.ts`, which self-scans every non-test `./*.ts` via `import.meta.glob` and fails on `Date.now(` or zustand/store imports [VERIFIED: src/lib/ict/purity.test.ts:8-44]. Inject `asOf`; pass judas/ATR/DOL outputs as parameters.
- **Intraday imports in the pool module:** `IntradayCandle`, killzone constants, `nyMinutesOf` inside `pools.ts` = timeframe soup. Type-wall it: `Candle[]` only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Strict fractal swing detection | New pivot/equality logic | `isSwingHigh`/`isSwingLow` + `SWING_K=2` (moved to `swings.ts`) | Equality-boundary (`>=` vs `>`) semantics already pinned by `smt.test.ts`; a second implementation diverges within one milestone |
| ATR computation | Own true-range/smoothing loop | `computeATR` from `regime.ts` | Wilder smoothing + short-history `[]` contract already tested; scorer inherits the edge behavior |
| Wick-pierce sweep decision | New pierce comparator | Judas strict `>`/`<` idiom + first-chronological-wins loop | Killzone-edge and both-extremes resolution already reasoned through; pools apply it to D1 zone edges |
| Close-through consumption | New fill/mitigation check | FVG `applyMitigation` idiom (strictly-later close beyond bound) | Wick-touch-without-close-through keeps-pool rule already pinned |
| Inventory cap discipline | Ad-hoc slice/take | `FVG_MAP_BOUND` trailing-N + origin-sort-before-slice (WR-07) | Guarantees map/prose agreement on unsorted input |
| Provisional-constant marking | Silent magic numbers | `CALIBRATION-PROVISIONAL` exported-constant convention from `trigger.ts` | Phase 21 calibration review depends on every multiplier being exported + pinned |
| Time truth in selector | `Date.now()` in math or selector | `sharedEpoch(get)` (nq1h `lastUpdatedISO`, Date fallback at caller boundary) | Single time truth — no torn reads between selectors |

**Key insight:** Phase 19 is 90% precedent composition — every hard decision (swing edges, pierce vs close-through, cap discipline, selector envelope, purity, provisional marking) already has a tested house answer. The only genuinely new logic is equality clustering + the scorer formula, and both ship provisional with boundary pins rather than tuned.

## Common Pitfalls

### Pitfall 1: Wick-noise false pools
**What goes wrong:** 15–30 "pools" per 60 D1 bars; Phase 20 §1 becomes a wall of pain, overlay becomes line soup.
**Why it happens:** Naive pivot (`k=1`) or `>=` equality checks turn NQ chop into pools.
**How to avoid:** Shared `k=2` strict contract + 0.25× ATR merge + cap-20 + `closedOnly` + finite-guard. Assert pool count on a 60-bar fixture (expect ~≤6 per side as tripwire).
**Warning signs:** Two same-side pools within a few points; tests pass on 5-candle fixtures but explode on a 20-session tape.

### Pitfall 2: Swept-pool double-counting
**What goes wrong:** Raided zones advertised as fresh pain; same raid counted by Judas, FVG transition, and pools as three events.
**Why it happens:** No consumption lifecycle; first-sweep-wins forgotten so retests re-fire.
**How to avoid:** `ACTIVE → SWEPT → CONSUMED`, first chronological sweep wins, no re-promotion, single active-map source of truth. Tests: sweep→swept, close-through→gone, retest-never-repromotes.

### Pitfall 3: Timeframe mixing
**What goes wrong:** D1 pools blended with 15M sweep state; §1 contradicts §3 with no timeframe label.
**Why it happens:** Intraday plumbing is nearby and tempting to "enrich" pools with.
**How to avoid:** `pools.ts` takes `Candle[]` only; never imports `IntradayCandle`/killzone/`nyMinutesOf`. Sweep inputs (if any) arrive as pre-computed read-only outputs, never recomputed on intraday rows inside the pool module.

### Pitfall 4: Stale/thin/rollover ghosts
**What goes wrong:** Confident pools derived from data the terminal already flagged untrustworthy (stale banner + confident §1 = self-contradiction).
**Why it happens:** Pool selector reads raw candles, bypassing the guarded snapshot.
**How to avoid:** `selectPools` consumes the same guarded NQ leg: empty/bad → null; stale → null (reason in `nq.lastError`); thin → surfaced flag for Phase 20 dimming. Staleness arrives as injected booleans, never age-math inside `ict/`.

### Pitfall 5: Integration misfire (trigger/flaw/ticket corruption)
**What goes wrong:** 4th trigger gate collapses FIRE rate; swept-BSL wired HARD downgrades best setups; SL at pool edge donates to stop-hunts.
**Why it happens:** Pools feel actionable, so consumers grab them directly instead of through fixed-order contracts.
**How to avoid:** D-17 lock — Phase 19 changes **zero** signatures in `trigger.ts`/`invalidation.ts`/`ticket.ts`. Parity is proven in Phase 21; Phase 19's contribution is simply not touching them.

### Pitfall 6: Purity + suite-green regression
**What goes wrong:** `purity.test.ts` red (clock/store import) or `smt.test.ts` red (extraction changed behavior).
**Why it happens:** Pools "need now" (tempts `Date.now`) and extraction edits shared code (tempts drive-by fixes).
**How to avoid:** Purity green from first commit; swings extraction is move-only with `smt.test.ts` green as the gate; full 420-test suite green at phase exit (D-24).

### Pitfall 7: Zero/empty-ATR divide
**What goes wrong:** `distAtr` divides by zero (short history → `atr: 0` / `[]`), producing `Infinity`/`NaN` scores that poison ranking silently.
**Why it happens:** `computeATR` returns `[]` below `period + 1` rows and `computeRegime` degrades to `atr: 0` — both honest signals the scorer must handle, not numbers to divide by.
**How to avoid:** Explicit zero/empty-ATR branch (refuse-to-rank or defined fallback), pinned by a thin-history test. Never let `NaN` flow into a sort comparator.

## Code Examples

Verified patterns from sources read this session:

### Swing-window slicing (trailing-60 discipline)
```typescript
// Source: src/lib/ict/smt.ts:126-131
const nqLeg = [...closedOnly(nq).filter(hasFiniteOhlc)]
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  .slice(-SWING_LOOKBACK);   // SWING_LOOKBACK = 60 [VERIFIED: src/lib/ict/smt.ts:14]
```
Pools copy this shape exactly: `closedOnly` → finite-drop → chronological sort on copies → trailing slice. (Pools use the NQ leg only — the ES leg and time-anchored pairing in `matchSwings` are SMT-specific and do not transfer.)

### Tolerance constant idiom (EQUAL_TOL_BPS precedent)
```typescript
// Source: src/lib/ict/smt.ts:7-14
export const SWING_K = 2;
export const SMT_TOL_BPS = 25;   // EQUAL_TOL_BPS ~25 mirrors this line (D-02)
export const CORR_WINDOW = 20;
export const CORR_MIN = 0.7;
export const SWING_LOOKBACK = 60;
```
New pool constants (`EQUAL_TOL_BPS`, `POOL_MAP_BOUND = 20`, `MERGE_ATR_MULT = 0.25`, `DOL_BOOST = 2.0`, `BEHIND_PENALTY = 0.25`) follow the same exported-constant + `CALIBRATION-PROVISIONAL` comment shape as `TRIGGER_DISP_MULT` [VERIFIED: src/lib/ict/trigger.ts:25-27].

### Strict pierce (SWEPT transition reference)
```typescript
// Source: src/lib/ict/judas.ts:141-142 — strict inequality, touch is not a sweep
const highPierced = r.high > (asiaHigh as number);
const lowPierced = r.low < (asiaLow as number);
```
Pool translation: BSL zone swept when a strictly-later closed candle's `high > zone.top`; SSL swept when `low < zone.bottom`. Boundary touch (`==`) is not a sweep — pin it.

### Close-through (CONSUMED transition reference)
```typescript
// Source: src/lib/ict/fvg.ts:103-109 — strictly-later close beyond the bound fills
for (let j = origin + 1; j < closed.length; j++) {
  const close = closed[j].close;
  if (gap.polarity === 'BULLISH' ? close < gap.bottom : close > gap.top) {
    filled = true;
    break;
  }
}
```
Pool translation: BSL zone consumed when a strictly-later close prints above `zone.top` (buy-side stops run through); SSL consumed on close below `zone.bottom`. Wick pierce with close back inside = SWEPT (sweep-then-reject), never consumed.

### Test builder idiom (explicit high/low rails, midpoint open/close)
```typescript
// Source: src/lib/ict/smt.test.ts:18-29 — rollover.test.ts-style builders
function leg(n: number, highs: number[], lows: number[], startDay = 5): Candle[] {
  if (highs.length !== n || lows.length !== n) {
    throw new Error(`leg requires ${n} highs and lows, got ${highs.length}/${lows.length}`);
  }
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(startDay + i).padStart(2, '0');
    const mid = (highs[i] + lows[i]) / 2;
    out.push({ date: `2026-01-${day}`, open: mid, high: highs[i], low: lows[i], close: mid });
  }
  return out;
}
```
Pool tests reuse this builder shape for: equality-cluster fixtures (two highs 3 bps apart cluster; 200 bps apart do not), ATR-merge boundary, lifecycle (pierce vs close-through vs touch), scorer ordering (DOL-side nearest ACTIVE ranks first), and over-cap newest-N cut.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Swing predicates owned by `smt.ts` | Shared `swings.ts` owner (this phase) | Phase 19 (D-12) | One swing truth for SMT + pools; SMT retunes surface loudly in pool tests |
| §1 `REPORT_SECTIONS[0]` unavailable | §1 goes live (Phase 20, not here) | v3.1 | Phase 19 emits data only — no report flip, no prose renderer |
| Trigger/flaw/ticket calibration without pools | Same calibration, pools context-only | v3.1 lock (D-17) | Phase 21 parity harness proves verdicts identical pools on/off |

**Deprecated/outdated:**
- Direct `smt.ts` predicate import for pools: acceptable fallback per D-12, but shared-module extraction is the preferred end state — planner picks one, not both.
- Any plan proposing pool-gated FIRE, new flaw keys, or ticket derivation changes in Phase 19: rejected at plan review (roadmap lock, STATE.md blocker list).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Test-suite baseline is 420/420 green (project STATE.md record dated 2026-09-15; suite not re-run in this research session) | Validation Architecture | If the baseline drifted, the "stays green" gate mismeasures — planner opens with a full `npm test` baseline run |
| A2 | Exact diminishing-bonus curve is unspecified (D-05 locks the principle — later touches add less — not the formula) | Architecture Patterns (Pattern 2) | Planner must define the curve + test-pin it; a linear bonus risks mega-pool dominance the decision explicitly forbids |
| A3 | `node_modules` install state not verified this session (relied on `package.json` + research corpus, not a live `npm ls`) | Environment Availability | If installs drifted, first task becomes `npm install` before the baseline test run |

## Open Questions

1. **New-file naming: `pools.ts` vs `liquidity-pools.ts`?**
   - What we know: v3.1 research corpus uses `liquidity-pools.ts`/`liquidity.ts` interchangeably; house files favor short names (`fvg.ts`, `dol.ts`, `smt.ts`).
   - What's unclear: no locked decision; either satisfies purity self-scan.
   - Recommendation: planner picks `pools.ts` (matches house brevity) and moves on — zero behavioral consequence.

2. **Shared extraction vs direct `smt.ts` import?**
   - What we know: D-12 permits either ("extract to shared module if cleaner"); ARCHITECTURE.md prefers extraction so SMT (cross-market) does not own pool (single-market) geometry.
   - What's unclear: whether extraction or import yields the cleaner diff against current `smt.ts`.
   - Recommendation: planner attempts extraction first with `smt.test.ts` green as gate; falls back to direct import if the diff touches anything beyond imports.

3. **Does `selectPools` need DOL/bias/ATR reads inside the selector, or pre-composed pure inputs?**
   - What we know: scorer needs lastClose + ATR + DOL direction; existing selectors compose freely (`selectTriggerPure` derives FVG inline + reads judas/smt [VERIFIED: src/lib/store.ts:891-910]).
   - What's unclear: exact `PoolsInput` shape (raw candles + epoch vs pre-derived values).
   - Recommendation: selector passes raw NQ candles + `sharedEpoch` into one pure `evaluatePools`-style entry (keeps `ict/` composable and testable without the store); DOL/ATR derivation stays inside pure functions on the same candle array — same snapshot, no race.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js runtime | `npm test` (vitest) | ✓ | v24.11.1 (probed this session) | — |
| npm | install / test scripts | ✓ | 11.6.2 (probed this session) | — |
| vitest + existing suite | Baseline + new tests | ✓ (declared) | ^5.0.0 [VERIFIED: package.json:41] | `npm install` first (see A3) |
| Yahoo / network / browsers | Phase 19 math | n/a | — | None needed — pure functions + fixtures only; no polling, no chart, no DOM |

**Missing dependencies with no fallback:** none — Phase 19 is network-independent.
**Missing dependencies with fallback:** none.

Step 2.6 note: no external services, CLIs, or databases beyond the Node toolchain, all present.

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | vitest ^5.0.0 [VERIFIED: package.json:41] |
| Config file | `vitest.config.ts` — `include: ['src/**/*.test.ts', 'app/**/*.test.ts']`, node environment, `testTimeout: 15000` [VERIFIED: vitest.config.ts:1-13] |
| Quick run command | `npm test -- src/lib/ict/pools.test.ts` (< 30s expected — pure math, no store import) |
| Full suite command | `npm test` (420-test baseline must stay green per D-24) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POOL-01 | Swings → BSL/SSL inventory via shared k=2 contract; empty/single-bar/unsorted/non-finite boundaries | unit | `npm test -- src/lib/ict/pools.test.ts` | ❌ Wave 0 |
| POOL-02 | Equal-highs cluster (3 bps yes / 200 bps no); min-2-touches; triple outranks singles; diminishing 4th/5th; swept keeps bonus | unit | `npm test -- src/lib/ict/pools.test.ts` | ❌ Wave 0 |
| POOL-03 | Zone = min-max span; `POOL_MAP_BOUND=20` newest-N by originDate; exact shape literals | unit | `npm test -- src/lib/ict/pools.test.ts` | ❌ Wave 0 |
| POOL-04 | Wick-pierce → SWEPT; close-through → CONSUMED; first-sweep-wins; retest never re-promotes; touch ≠ sweep | unit | `npm test -- src/lib/ict/pools.test.ts` | ❌ Wave 0 |
| POOL-05 | Rank-1 = nearest ACTIVE on DOL side; 2.0 boost; 0.25 behind-penalty; ATR units; zero-ATR branch; constants exported | unit | `npm test -- src/lib/ict/pools.test.ts` | ❌ Wave 0 |
| POOL-06 | `selectPools`: null on stale/empty NQ leg; ES-stale does not null; never throws on garbage; single sharedEpoch | unit (store) | `npm test -- src/lib/store.test.ts` (extended) | ❌ Wave 0 (extend existing) |
| D-12 gate | `smt.test.ts` green after swings extraction (zero behavior change) | unit (regression) | `npm test -- src/lib/ict/smt.test.ts` | ✅ exists |
| D-23 gate | `purity.test.ts` green with new files (no exclusions added) | unit (guard) | `npm test -- src/lib/ict/purity.test.ts` | ✅ exists |
| D-24 gate | Full suite green at phase exit | full suite | `npm test` | ✅ exists (baseline per A1) |

### Sampling Rate
- **Per task commit:** `npm test -- src/lib/ict/pools.test.ts src/lib/ict/smt.test.ts src/lib/ict/purity.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ict/pools.ts` (+ `swings.ts`) — implementation; tests cannot precede the module contract
- [ ] `src/lib/ict/pools.test.ts` — covers POOL-01–05 (boundary + equality + merge + lifecycle + scorer + cap matrix)
- [ ] `src/lib/ict/swings.test.ts` (optional) — re-homed predicate pins if extraction chosen
- [ ] `src/lib/store.test.ts` extension — covers POOL-06 refuse-null matrix + never-throws + ES-stale independence

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface — local pure math |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No multi-user state |
| V5 Input Validation | yes | Boundary validation at pure-function entry: `closedOnly` forming-row drop, finite-OHLC drop, array-type `got-string` throws (fvg/smt precedent), chronological-sort copies, zero/empty-ATR branch — never trust caller arrays |
| V6 Cryptography | no | No crypto; never hand-roll (n/a) |
| V14 Configuration | partial | `CALIBRATION-PROVISIONAL` exported constants — misconfiguration risk is calibration drift, contained by Phase 21 review, not by tuning here |

### Known Threat Patterns for pure-math projection

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Projection presented as resting-stop fact | — (honesty, not STRIDE) | Phase 19 emits no prose; structured numeric fields only, so Phase 20 can keep the `proyeksiya` hedge + verbatim pins |
| Silent empty array read as "no pain" (absence = safe) | — (honesty) | Selector guard: bad/empty/stale → `null` → explicit unavailable marker downstream, never silent `[]` |
| `NaN`/`Infinity` scores poisoning rank order | Tampering (data integrity) | Finite-guards at every numeric boundary; zero-ATR branch pinned; try/catch → null at selector |

## Sources

### Primary (HIGH confidence)
- Codebase reads this session: `src/lib/ict/smt.ts` (swing contract, tolerance, lookback, float epsilon, window slicing), `src/lib/ict/types.ts` (Candle/intraday wall, `closedOnly`), `src/lib/ict/judas.ts` (strict pierce, first-wins), `src/lib/ict/fvg.ts` (cap, mitigation, transition, WR-07 sort, stale-origin), `src/lib/ict/regime.ts` (ATR + short-history edges), `src/lib/ict/dol.ts` (DOL mapping), `src/lib/ict/bias.ts`, `src/lib/ict/range.ts` (`thinHistory`), `src/lib/ict/trigger.ts` (provisional convention, read-only SMT tag), `src/lib/ict/invalidation.ts` (HARD stale/rollover, D-12 FIRING-only SOFT), `src/lib/ict/purity.test.ts` (self-scan guard), `src/lib/ict/smt.test.ts` (builder idiom), `src/lib/store.ts` (`sharedEpoch`, `selectSMT`/`selectTriggerPure`/`selectLiquidityPath` envelopes, degraded flag), `vitest.config.ts`, `package.json`, `reference/institutional_rules.md` (Modul 1.2 Pain Threshold + §1/§5 lines)
- Locked decisions: `19-CONTEXT.md` D-01–D-24 (verbatim in User Constraints)

### Secondary (MEDIUM confidence)
- `.planning/research/{SUMMARY,FEATURES,PITFALLS,ARCHITECTURE}.md` (2026-09-15, codebase-anchored synthesis — unanimous one-module + shared-swings + selector approach, 8-pitfall catalog, cap/scorer precedents)
- `.planning/{REQUIREMENTS,ROADMAP,STATE}.md` (POOL-01–06 text, phase contract, P2 deferrals, non-vote lock)

### Tertiary (LOW confidence)
- None — no finding rests on training data alone; open formulas are flagged ASSUMED (A2), not asserted.

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — every donor symbol read line-level this session; zero new packages by unanimous corpus + locked scope.
- Architecture: HIGH — selector envelope, cap, lifecycle, and purity idioms copied from verified sources with line citations.
- Pitfalls: HIGH (codebase mechanics) / MEDIUM (ICT methodology reading — deliberately conservative projection framing per corpus).

**Research date:** 2026-09-16
**Valid until:** 30 days (stable domain: house precedents + locked user decisions; provisional constants intentionally uncalibrated until Phase 21)
