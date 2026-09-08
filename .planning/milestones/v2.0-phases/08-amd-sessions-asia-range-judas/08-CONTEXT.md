# Phase 8: AMD Sessions (Asia Range + Judas) - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning

## Phase Boundary

Phase 8 delivers the pure-function session math for Modul 3 in `src/lib/ict` — the Baku-aware Asia Range window (`asiaRange`), the three-gate London Judas detector (`judasSwing`), and the AMD phase classifier (`amdPhase`) fusing range + Judas + SMT state. No store changes (selectors derive later), no chart overlays, no report §3 wiring — those belong to Phase 9 and consume what this phase produces. All functions take injected time and explicit candle windows; zero I/O, zero `Date.now`. NY Judas stays honestly Gözlənilir (out of scope per REQUIREMENTS.md).

## Implementation Decisions

### Asia Range edges

- **D-01:** Asia session is 20:00–00:00 NY wall-clock (IANA `America/New_York`, resolved per candle at call time). Chosen over the locked ICT-12 text (19:00) to match corroborated ICT education sources — the 19:00–20:00 transition hour is excluded. Roadmap success criterion needs a conforming edit (19:00 → 20:00) at planning time.
- **D-02:** Range high/low is wick-to-wick (full candle extremes, raw OHLC). Mirrors the D1 range precedent; no body-only filtering.
- **D-03:** Post-midnight wicks (00:00–02:00) are excluded from the Asia Range. Anything past 00:00 belongs to London's story, not Asia's range.
- **D-04:** Missing candles inside the window (Sunday 18:00 ET open effects, holidays) are skipped — range computed from present closed candles, never interpolated. Extends the Phase 6 no-interpolation precedent.

### Detector inputs (timeframes + symbols)

- **D-05:** Mixed intervals — Asia Range from 1H candles (5-candle window, stable edges), Judas sweep detection on 15M (finer pierce timing). Uses both Phase 6 intraday pipes; matches the 15m/5m Judas visibility in ICT sources. — **Reversibility:** costly — the 1H-range/15M-sweep split flows into detector signatures, fixtures, and Phase 9 selector inputs
- **D-06:** NQ-only detectors. Asia/Judas is an NQ-session concept; ES comparison belongs to the Phase 7 SMT comparator, never re-derived here.
- **D-07:** Killzone membership (02:00–05:00 ET, strict inequality both edges) is a per-candle IANA wall-clock check, resolved through `America/New_York` at call time. DST-safe by construction, same discipline as Phase 7 `aggregate.ts` (D-12).
- **D-08:** Pre-killzone sweeps (e.g. 01:47 ET pierce) are logged as `preRun: true` for analyst review, never promoted to candidates. Strict killzone edges per Pitfalls P5.

### Judas displacement proof

- **D-09:** Displacement threshold is a multiple of Asia Range height (not ATR, not fixed points). Self-normalizing: thin-range nights need less follow-through than wide-range nights.
- **D-10:** Confirmation window is the sweep candle + next 3 fifteen-minute candles (45 min total). Bounded, pure-function friendly, fits inside the killzone.
- **D-11:** Reversal = close-based: the sweep candle (or a candle in-window) closes back inside/through the swept extreme. Mirrors Phase 7 D-10 FVG sweep-then-reject (wick pierce + same-candle close back); no MSS/structure-shift machinery in v2.0.
- **D-12:** Sweeps without in-window displacement persist as candidates (`confirmed: false`), rendered hollow with hedge prose downstream — never silently expired, never promoted. Same candidates-vs-confirmed vocabulary as the roadmap criterion.

### AMD classifier fusion

- **D-13:** Transitions are time + events: Asia hours → accumulation; killzone sweep ± displacement → manipulation; post-displacement continuation → distribution. Clock gives the skeleton, detector events give the promotions. Explainable in §3 prose.
- **D-14:** SMT fuses as a regime tag, read-only: confirmed Judas + aligned Phase 7 SMT agree → highest-conviction regime tag feeding ICT-15 confluence scoring in Phase 9. The classifier never mutates SMT output.
- **D-15:** NY session renders the honest unavailable marker (`Gözlənilir` with reason — no NY detector in v2.0). The classifier covers Asia + London only; NY stays a degraded branch, not a time-only guess.
- **D-16:** AMD output is `{ phase, reason, inputs }` — phase enum plus the why plus contributing detector references, so §3 renders reasons verbatim. Extends the Phase 7 suppressed-envelope vocabulary (`CORR_DECOUPLED`, `rollover-week`, per-leg stale refusal) rather than inventing a new pattern.

### Claude's Discretion

None — user decided every question directly (no "You decide" selections).

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — ICT-12, ICT-13, ICT-14 (the three locked requirements this phase implements) + out-of-scope guardrails (NY Judas deferred, intraday SMT deferred, FVG-only IRL)
- `.planning/ROADMAP.md` — Phase 8 entry: goal, dependency (Phase 6 only), all three success criteria (note: criterion 1 says 19:00 — D-01 overrides to 20:00, conforming edit needed)
- `.planning/PROJECT.md` — Constraints (zero budget, Zustand-only, `src/lib/ict` purity, no LLM) and v2.0 milestone target features

### v2.0 research (Modul 3 pitfalls)
- `.planning/research/PITFALLS.md` — Pitfall 4 (IANA wall-clock sessions, March + November + maintenance-break DST triple-test, `{ startISO, endISO, session, inKillzone }` window shape), Pitfall 5 (three-gate Judas, Asia-height/ATR displacement multiples, preRun logging, ≤25% false-positive budget over 60 days, hollow-vs-solid markers), Pitfall 6 (intraday epoch contract, `closedOnly` discipline, no interpolation), Pitfall 8 (purity: injected time, store holds inputs only, selector-boundary freshness gate); debt table (never two-gate Judas, never fixed-point displacement, never fixed-offset sessions); Judas source rows (Asia 20:00–00:00 EST, KZ 02:00–05:00 EST strict, 01:00 pre-run unreliable)

### Domain spec
- `reference/institutional_rules.md` §Modul 3 + §3 — Session Manipulation (AMD) definition (Asia Range + London/NY Judas), §3 "Session AMD Timing" prose shape (`Asia Range [Təmizlənib / Təmizlənməyib]. London/NY Judas Swing [Baş verib / Gözlənilir]`)

### Prior phase context
- `.planning/phases/07-smt-4h-1h-sequencing-math/07-CONTEXT.md` — Suppressed-envelope vocabulary + `CORR_MIN`/`CORR_WINDOW` (D-05–D-07), FVG sweep-then-reject close-based precedent (D-10), NY-anchor IANA discipline + `closedOnly` blocks (D-12–D-14), SMT output shape `{ direction, sweeperLeg, nqWindow, esWindow, bpsGap }` consumed read-only per D-14
- `.planning/phases/06-dual-symbol-proxy-data-contracts/06-CONTEXT.md` — 1H + 15M intraday pipes with epoch contract (D-16), forming exclusion at both layers (D-15), per-leg stale envelopes consumed at the selector boundary

### Existing code (the patterns being extended)
- `src/lib/ict/aggregate.ts` — `NY_TZ = 'America/New_York'` + per-candle `formatInTimeZone` wall-clock resolution + civil-date arithmetic (the D-07 killzone-check template); `IntradayCandle` epoch-seconds input shape
- `src/lib/ict/types.ts` — `Candle` (with `forming?`), `closedOnly()`, `IntradayCandle` (UTC epoch seconds), `closedOnlyIntraday()` — detector input shapes
- `src/lib/ict/fvg.ts` — Sweep-then-reject precedent (wick pierce + close back) reused by D-11
- `src/lib/ict/smt.ts` — `detectSMT` output + suppressed envelopes (`CORR_DECOUPLED`, `rollover-week`) fused read-only per D-14
- `src/lib/ict/rollover.ts` — `detectRollover` per-symbol tripwire; Asia/Judas windows must not re-derive rollover state
- `src/lib/time.ts` — `BAKU_TZ = 'Asia/Baku'` + Baku display utils (dual-stamp labels at render); note `CME_TZ = 'America/Chicago'` here vs `America/New_York` in `aggregate.ts` — Phase 8 session logic follows the roadmap-mandated NY wall-clock (D-01/D-07), not the Chicago CME clock
- `src/lib/session-line.ts` — Header clock precedent (`Bakı … · NY …`); session labels follow the same dual-stamp shape

## Existing Code Insights

### Reusable Assets
- `nyDateOf` / `nyHourOf` per-candle wall-clock helpers (`src/lib/ict/aggregate.ts:41-47`) — the template for killzone-membership checks; never fixed UTC offsets
- `closedOnlyIntraday()` (`src/lib/ict/types.ts`) — forming exclusion already exists; Asia/Judas tests assert it
- `hasValidTime` boundary predicate (`src/lib/ict/aggregate.ts:31-33`) — epoch-validity separated from OHLC-validity; session functions reuse the shape
- `toBakuYMD` / Baku format utils (`src/lib/time.ts`) — dual-stamp session labels build on these
- FVG sweep-then-reject logic (`src/lib/ict/fvg.ts`) — close-based reversal precedent for D-11

### Established Patterns
- Pure functions with injected time in `src/lib/ict` (no `Date.now` inside) — grep must stay clean; every new test injects `asOf`
- Honest degrade: suppressed envelopes with `reason` strings, `preRun`-style near-miss flags, `Gözlənilir` unavailable markers — AMD outputs extend this vocabulary
- Azerbaijani prose precedent (trap-vs-genuine, status-strip copy, §3 `Təmizlənib/Gözlənilir`) — AMD reason strings and §3 inputs follow suit
- Fixture-test density of the existing suite (smt/aggregate/fvg/join tests) — new detectors ship with fixtures: clean Asia range, DST-boundary weeks (March + November + break), pierce-without-reversal (stays candidate), pre-killzone sweep (preRun, never candidate), 60-day false-positive budget run (≤25% confirmed)

### Integration Points
- `src/lib/ict/asia.ts` (new) — Asia Range from 1H NQ closed candles (20:00–00:00 NY, wick-to-wick, gaps skipped), emits `{ high, low, height, sessionDate }`
- `src/lib/ict/judas.ts` (new) — three-gate London detector on 15M NQ (in-killzone per-candle + swept-Asia-extreme + close-based reversal with Asia-height displacement inside 4-candle window); emits `{ candidate, confirmed, preRun, sweepSide, displacementMult }`
- `src/lib/ict/amd.ts` (new) — phase classifier fusing range + Judas + read-only SMT tag; emits `{ phase: accumulation | manipulation | distribution, reason, inputs }` with NY as unavailable branch
- Future (Phase 9, not this phase): selectors derive AMD state + per-leg envelopes; §3 renders reasons verbatim; Asia overlay + hollow/solid Judas markers on chart

## Specific Ideas

- Asia window: 20:00–00:00 NY (D-01 override of ICT-12's 19:00 — conforming roadmap edit at planning)
- Killzone: 02:00–05:00 ET strict inequality; pre-killzone sweeps → `preRun: true`
- Mixed intervals: 1H range + 15M sweep; NQ-only detectors
- Displacement: Asia-height multiple; 4-candle (45 min) confirmation window; close-based reversal
- AMD: time+events transitions; SMT as read-only regime tag; NY `Gözlənilir`; `{ phase, reason, inputs }` output
- Session-label shape: dual-stamped (`London KZ 02:00–05:00 ET · 10:00–13:00 Baku`) per pitfalls UX guidance

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 08-amd-sessions-asia-range-judas*
*Context gathered: 2026-09-07*
