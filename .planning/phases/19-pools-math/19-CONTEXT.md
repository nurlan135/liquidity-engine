# Phase 19: Pools Math - Context

**Gathered:** 2026-09-15
**Status:** Ready for planning

## Phase Boundary

Ranked BSL/SSL stop-cluster inventory exists as pure, test-pinned math with a guarded selector. Phase 19 is math-only: detector + equality weighting + zone projection + sweep lifecycle + scorer + `selectPools`. No report prose, no chart lines, no trigger/ticket changes — those are Phases 20–21. Pools are read-only projection context that never votes.

## Implementation Decisions

### Equal-weight emphasis
- **D-01:** Equality bonus is strong — triple equal-highs outrank everything nearby (ICT engineered-pool reading).
- **D-02:** EQUAL_TOL_BPS ~25 bps, mirroring the SMT_TOL_BPS=25 idiom (`src/lib/ict/smt.ts:9`).
- **D-03:** Minimum 2 touches earns the equality bonus.
- **D-04:** Swept pools keep their equality bonus (retest magnetism preserved).
- **D-05:** Bonus scales diminishing — 4th/5th equal touches add less than the 2nd (prevents mega-pool dominance).

### Ranking philosophy
- **D-06:** Rank-1 = nearest ACTIVE pool on the DOL side (standard ICT: nearest unswept pool on DOL side is the pain threshold).
- **D-07:** DOL-side boost 2.0 (matching side doubles score; DOL alignment decides rank-1).
- **D-08:** Behind-price penalty 0.25 strong (BSL below close / SSL above close nearly drop out — pain is ahead, not behind).
- **D-09:** Proximity measured in ATR units (`distAtr = |poolMid − lastClose| / atr` via existing `computeATR`), never raw points — NQ scale-invariant.

### Seed scope
- **D-10:** Phase 19 math is D1-only per POOL-01 — swing clusters from closed D1 candles. Asia/range seeds land in Phase 20 wiring, not in the math.
- **D-11:** 60-bar trailing lookback, same as SMT SWING_LOOKBACK.
- **D-12:** Shared swing truth — reuse `isSwingHigh`/`isSwingLow` + `SWING_K=2` verbatim (extract to shared module if cleaner, zero behavior change, `smt.test.ts` green as gate). Never fork swing logic.

### Zone merge & cap
- **D-13:** ATR-merge multiple 0.25× — same-side pools within quarter-ATR merge into the more extreme one (kills wick-noise).
- **D-14:** Inventory cap 20 total (`POOL_MAP_BOUND = 20`, mirrors `FVG_MAP_BOUND`).
- **D-15:** Merged zone bounds = min-max span of the cluster (honest band, not a single flickering line).
- **D-16:** Over-cap cut keeps newest N by originDate (trailing discipline, WR-07 `applyMitigation` precedent).

### Locked from prior context (not re-asked)
- **D-17:** Pools never vote — no trigger gate, no new flaw key, no ticket derivation change in v3.1 (roadmap lock).
- **D-18:** Sweep lifecycle ACTIVE/SWEPT/CONSUMED: wick-pierce = swept, close-through = consumed, first-sweep-wins, no re-promotion (POOL-04).
- **D-19:** Pool shape `{ side, top, bottom, touches, weight, originDate, status }` with trailing cap (POOL-03).
- **D-20:** Scorer is proximity × DOL-side with provisional constants exported + boundary-tested (POOL-05).
- **D-21:** `selectPools` with refuse-null envelope + sharedEpoch + never-throws (POOL-06).
- **D-22:** All ranking constants ship CALIBRATION-PROVISIONAL + boundary-test pins; Phase 21 reviews against firing log. No tuning in Phase 19.
- **D-23:** Purity guard holds from first commit — injected `asOf`, no `Date.now`, no store imports in `src/lib/ict` (`purity.test.ts` self-scans new files).
- **D-24:** 420-test suite stays green — shared swings extraction must keep `smt.test.ts` passing.

### the agent's Discretion
None — user decided all presented areas.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract
- `.planning/ROADMAP.md` Phase 19 — goal, dependencies (Phase 18 green), requirements POOL-01–06, 4 success criteria
- `.planning/REQUIREMENTS.md` Pools Math — POOL-01–06 full text + Out of Scope table (pool-gated FIRE rejected, exact stop-price rejected, heatmap rejected)

### Domain authority
- `reference/institutional_rules.md` Modul 1.2 — Pain Threshold methodology (retail 60%+ majority → stop zones → süpürmə/tələ engineering) + §1/§2/§5 lines

### Research (v3.1, 2026-09-15)
- `.planning/research/SUMMARY.md` — unanimous approach: one new pure module + shared swings + selectPools + provisional constants; pitfall-to-phase mapping
- `.planning/research/FEATURES.md` — detector/clusterer/zone/lifecycle/scorer contracts, `LiquidityPool` shape, seed list, dependency tree, MVP checklist
- `.planning/research/PITFALLS.md` — 8 critical pitfalls with phase mapping; Phase 19 owns wick-noise, double-count, timeframe wall, stale/thin/rollover, purity half, non-vote contract
- `.planning/research/ARCHITECTURE.md` — four-layer pipeline, seven house patterns, new-module seams

### Codebase (reuse verbatim)
- `src/lib/ict/smt.ts` — `isSwingHigh`/`isSwingLow` strict fractal, `SWING_K=2`, `SMT_TOL_BPS=25`, `SWING_LOOKBACK=60`, time-anchored pairing, corr + rollover gates
- `src/lib/ict/types.ts` — `Candle` (D1 strings) vs `IntradayCandle` (epoch seconds) contract split; `closedOnly`
- `src/lib/ict/judas.ts` — strict wick-pierce sweep idiom + first-sweep-wins (lifecycle source)
- `src/lib/ict/fvg.ts` — close-through mitigation + `FVG_MAP_BOUND` cap + sweep-then-reject transition (lifecycle + cap source)
- `src/lib/ict/regime.ts` — `computeATR` (scorer distance denominator)
- `src/lib/ict/dol.ts` + `src/lib/ict/bias.ts` — DOL direction (boosted side) + bias context for scoring
- `src/lib/ict/purity.test.ts` — house purity guard (no clocks, no store imports; self-scans new files)

## Existing Code Insights

### Reusable Assets
- `isSwingHigh`/`isSwingLow` + `SWING_K=2` (`src/lib/ict/smt.ts:49-79`): strict fractal predicates — shared swing truth for pool detection, never forked
- `SMT_TOL_BPS=25` idiom (`src/lib/ict/smt.ts:9`): equality-tolerance precedent for `EQUAL_TOL_BPS`
- `computeATR` (`src/lib/ict/regime.ts`): scorer distance denominator + merge-multiple unit
- Judas pierce + FVG mitigation idioms: sweep-lifecycle semantics source (wick-pierce → SWEPT, close-through → CONSUMED)
- `FVG_MAP_BOUND=20` precedent: inventory cap discipline (trailing-N, origin-ordered, WR-07)
- Refuse-null selector envelopes + sharedEpoch + never-throws: `selectPools` follows the house selector contract

### Established Patterns
- Purity: `src/lib/ict` functions take injected `(candles, asOf)` — no I/O, no `Date.now`, no store imports; `purity.test.ts` enforces
- Provisional constants: exported multipliers + boundary-test pins + `CALIBRATION-PROVISIONAL` convention (`trigger.ts` precedent); calibration happens in Phase 21, never in math phase
- Selector-derived state: pools derive from the NQ D1 leg, never stored — cannot desync
- D1/intraday type wall: pool module takes `Candle[]` only, never `IntradayCandle[]`; no killzone imports

### Integration Points
- `smt.ts`: swing donor (shared predicates); pools read swings, SMT logic untouched
- `judas.ts` / `fvg.ts`: sweep-truth idioms (read-only reference, no signature changes)
- `dol.ts` / `bias.ts` / `regime.ts` / `asia.ts` / `range.ts`: scorer + seed inputs (selector-level reads, no signature changes)
- `trigger.ts` / `invalidation.ts` / `ticket.ts`: read-only neighbors in v3.1 — explicitly non-integrated; parity harness in Phase 21 proves verdicts identical pools on/off
- Phase 20 consumes: `selectPools` output → `report.tsx` §1 block + `nq-chart.tsx` price lines (same array, no independent swept-ness computation)

## Specific Ideas

No specific requirements — open to standard approaches. Research flags `/gsd-plan-phase --research-phase` for scorer constants + boundary-test matrix (ATR-merge multiple, EQUAL_TOL_BPS, dolBoost/behind-penalty, decay half-life all provisional).

## Deferred Ideas

None — discussion stayed within phase scope. (P2 queue POOL2-01–05 — TP2 resolver, sentiment multiplier, 15M pools, age/decay, proximity tag — already deferred at milestone level in STATE.md.)

---

*Phase: 19-Pools Math*
*Context gathered: 2026-09-15*
