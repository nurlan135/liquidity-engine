# Phase 7: SMT + 4H/1H Sequencing Math - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning

## Phase Boundary

Phase 7 delivers the pure-function ICT math core for Modul 3 in `src/lib/ict` — the time-anchored SMT comparator (`smt.ts`), rollover-week suppression extended to ES, the FVG map + ERL/IRL transition state, and 4H synthesis from NY-anchored 1H blocks (`aggregate.ts`). No store changes (selectors derive later), no chart overlays, no report §3 wiring — those belong to Phases 8–9 and consume what this phase produces. All functions take injected time and explicit candle windows; zero I/O, zero `Date.now`.

## Implementation Decisions

### SMT comparator inputs

- **D-01:** D1 daily candles only feed the SMT comparator. Locked by the REQUIREMENTS.md out-of-scope rule (daily SMT first; intraday SMT only after the daily comparator proves honest on the live URL). The proven D1 NQ anchor path stays the signal source; 1H/15M intraday pipes remain reserved for AMD/Phase 8.
- **D-02:** Swing detection is fractal k=2 (2 lower highs / higher lows each side) over a ~60 daily-bar window. Same `SWING_K` named constant applied to both legs, pinned by test per PITFALLS P1.
- **D-03:** Non-confirmation tolerance is a fixed 25 bps constant (`SMT_TOL_BPS=25`) on both legs. Basis points absorb the NQ≈5× ES point-scale difference (per PITFALLS P1); the correlation-regime gate absorbs volatility shifts instead of an ATR-scaled tolerance.
- **D-04:** SMT output is `{ direction: BULLISH | BEARISH | NO-SIGNAL, sweeperLeg: NQ | ES, nqWindow, esWindow, bpsGap }`. Labels which leg swept (the manipulated one — fade it) per PITFALLS P1 directional honesty; never a bare "SMT detected". Takes matched time-anchored pairs only (`detectSMT(pairs, toleranceBps)`), never two raw candle arrays.

### Correlation-regime gate

- **D-05:** Decouple is measured as rolling 20-day Pearson correlation on daily closes; SMT is suppressed below 0.70 (`CORR_MIN=0.70`, `CORR_WINDOW=20`). The 20-bar window shares vocabulary with the existing `REGIME_AVG_WINDOW=20`.
- **D-06:** The gate emits a suppressed envelope `{ suppressed: true, reason: 'CORR_DECOUPLED', corr }` — the same suppressed-envelope vocabulary as rollover-week (ICT-09), so Phase 9 §3 renders one honest pattern for both.
- **D-07:** Gate runs before swing matching; decoupled windows skip matching entirely. Cheaper, and matched-pair fixtures never need a low-correlation case.

### Rollover suppression (ICT-09, extends v1.0 tripwire)

- **D-08:** The v1.0 rollover tripwire (`ROLLOVER_ATR_MULT = 3`, raw OHLC only, never `adjclose`, per-symbol independent flags) is extended to ES with the same shared threshold constant. If EITHER leg is `rolloverSuspect` inside the comparison window → `{ suppressed: true, reason: 'rollover-week' }`, rendered by §3 as "SMT unavailable — contract roll week", not a weak signal. Matched-pair fixtures must include a roll-week suppression case (NQ gaps, ES doesn't → suppressed, not divergent).

### FVG map + ERL/IRL transition (ICT-10)

- **D-09:** FVG map detects both polarities on NQ D1; mitigation is fill on close-through; the map is bounded to the latest ~20 gaps so output stays small and forward-compatible with STRUCT-03 quality grading.
- **D-10:** Sweep-then-reject = wick pierces the FVG boundary AND the same candle closes back inside/through the origin zone. Pure-function friendly on D1 closes; no displacement proof required. Transitions fire only on sweep-then-reject, never on sweep alone.
- **D-11:** The transition state `{ state: ERL | IRL, originFvg, triggerCandle }` upgrades §2 Delivery Cycle prose — §2 gains an IRL-aware delivery sentence, no new section. §2 Delivery Cycle upgrade ships in this phase as prose logic; §3 composition stays in Phase 9.

### 4H synthesis (ICT-11)

- **D-12:** The 1H→4H block grid anchors at 18:00 ET daily open (CME equity-index day boundary), resolved via IANA `America/New_York` wall-clock. Aligns 4H structure with futures session reality per PITFALLS CME sources; Baku display at the edge.
- **D-13:** Only complete 4-candle blocks are emitted (`closedOnly` discipline); the partial trailing block is excluded until its 4th hour closes. Detector outputs never self-update; the forming 1H candle still renders on the chart. — **Reversibility:** costly — the complete-blocks-only shape flows into aggregate tests, selector inputs, and Phase 8 session consumers
- **D-14:** `aggregate.ts` emits the reused D1 `Candle` shape for 4H blocks so `computeRange` / `computeBias` / regime helpers consume it unchanged — internal/external sequencing reads off existing math.

### Claude's Discretion

None — user decided every question directly (no "You decide" selections).

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — ICT-08, ICT-09, ICT-10, ICT-11 (the four locked requirements this phase implements) + out-of-scope guardrails (daily SMT first, FVG-only IRL, NY Judas deferred)
- `.planning/ROADMAP.md` — Phase 7 entry: goal, dependency (Phase 6), all four success criteria
- `.planning/PROJECT.md` — Constraints (zero budget, Zustand-only, `src/lib/ict` purity, no LLM) and v2.0 milestone target features

### v2.0 research (Modul 3 pitfalls)
- `.planning/research/PITFALLS.md` — Pitfall 1 (time-anchored swing matching, bps tolerance, sweeper-label honesty, choppy ±1-bar NO-SIGNAL test), Pitfall 7 (per-symbol rollover tripwire + joint suppression test, shared ATR-multiple constant, never `adjclose`), Pitfall 8 (purity: injected time, store holds inputs only, selector-boundary freshness gate), integration rows (never mutate D1 NQ anchor path; join's intersected working copy; `closedOnly` assertions in detector tests)

### Prior phase context
- `.planning/phases/06-dual-symbol-proxy-data-contracts/06-CONTEXT.md` — Per-leg stale envelopes + stagger (D-01–D-04), inner-join with coverage diagnostics + warn-never-refuse (D-13–D-15), epoch-vs-string contract split (D-16); Phase 7 SMT selectors consume per-leg envelopes + joined rows + coverage

### Existing code (the math core being extended)
- `src/lib/ict/types.ts` — `Candle` (with `forming?`), `closedOnly()`, `IntradayCandle` (UTC epoch seconds), `closedOnlyIntraday()` — the shapes SMT/aggregate build on
- `src/lib/ict/join.ts` — `innerJoinOnTimestamp` + `JoinCoverage` (`{ nq, es, joined, dropped }`) — SMT consumes joined rows, never raw leg arrays
- `src/lib/ict/rollover.ts` — `detectRollover` (`ROLLOVER_ATR_MULT = 3`), `isNearRolloverWeek`, `closedOnly` discipline — the pattern extended to ES per D-08
- `src/lib/ict/range.ts` — `computeRange` (`ANCHOR_WINDOW = 20`) + `computePosition` — 4H blocks reuse this via D-14
- `src/lib/ict/bias.ts` — `computeBias` (0.48–0.52 buffer, COMPRESSION degrade) — 4H sequencing reads off this
- `src/lib/ict/regime.ts` — `computeATR` / `computeRegime` (`ATR_PERIOD = 14`, `REGIME_AVG_WINDOW = 20`, `MIN_CANDLES_FULL = 34`) — correlation-gate window shares the 20-bar vocabulary
- `src/lib/ict/dol.ts` — `computePrimaryDOL` — §2 Delivery Cycle prose anchor for the D-11 upgrade

## Existing Code Insights

### Reusable Assets
- `closedOnly()` / `closedOnlyIntraday()` (`src/lib/ict/types.ts:47-66`) — detector-side forming exclusion already exists; SMT/aggregate tests assert it
- `innerJoinOnTimestamp` re-validation at the join boundary (`src/lib/ict/join.ts:55-58`) — SMT trusts joined rows; forming can never leak in even if the parser regresses
- `detectRollover` tripwire loop + proximity warning (`src/lib/ict/rollover.ts:33-55`) — parameterize per symbol for ES, share `ROLLOVER_ATR_MULT`
- `computeRange` / `computeBias` / `computeRegime` pure-function style (injected inputs, rationale strings, honest-degrade branches) — the template every new `src/lib/ict` function follows

### Established Patterns
- Pure functions with injected time in `src/lib/ict` (no `Date.now` inside) — grep must stay clean; every new test injects `asOf`
- Honest degrade: `thinHistory`, COMPRESSION-on-insufficient-history, `proximityWarning`-style reason strings — SMT suppressed envelopes extend this vocabulary
- Azerbaijani prose precedent (trap-vs-genuine, status-strip copy) — §2 IRL delivery sentence follows suit
- Fixture-test density of the existing suite (range/bias/dol/regime/rollover/join tests) — new detectors ship with matched-pair fixtures: bull, bear, choppy NO-SIGNAL (±1-bar offsets), roll-week suppressed, lookback-shift stability

### Integration Points
- `src/lib/ict/smt.ts` (new) — `matchSwings` (time-anchored, `SWING_K=2`) + `detectSMT(pairs, SMT_TOL_BPS)` + correlation gate (`CORR_WINDOW=20`, `CORR_MIN=0.70`) + per-symbol rollover suppression; consumes `JoinResult` from `join.ts`
- `src/lib/ict/aggregate.ts` (new) — NY-anchored 1H→4H synthesis (18:00 ET anchor, complete-blocks-only), emits `Candle`-shaped blocks
- FVG/IRL module (new, in `src/lib/ict`) — FVG map (both polarities, fill mitigation, latest ~20) + sweep-then-reject transition feeding the §2 Delivery Cycle prose upgrade
- Future (Phases 8–9, not this phase): `selectSMT`-style selectors consume SMT output + per-leg envelopes + coverage; §3 renders suppressed reasons verbatim; chart pins arrive later

## Specific Ideas

- SMT output field names: `{ direction, sweeperLeg, nqWindow, esWindow, bpsGap }` with `sweeperLeg: 'NQ' | 'ES'`
- Suppression reasons share one vocabulary: `'CORR_DECOUPLED'` and `'rollover-week'` (plus per-leg stale refusal inherited from Phase 6 envelopes)
- Correlation gate constants: `CORR_WINDOW = 20`, `CORR_MIN = 0.70`
- Swing constants: `SWING_K = 2`, 60-bar D1 window, `SMT_TOL_BPS = 25`
- 4H anchor: 18:00 ET (`America/New_York` wall-clock), complete 4-candle blocks only
- FVG bound: latest ~20 gaps; sweep-then-reject = wick pierce + same-candle close back inside

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 7-smt-4h-1h-sequencing-math*
*Context gathered: 2026-09-07*
