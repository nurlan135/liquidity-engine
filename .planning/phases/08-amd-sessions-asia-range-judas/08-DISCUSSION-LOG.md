# Phase 8: AMD Sessions — Discussion Log

**Date:** 2026-09-07
**Mode:** Default interactive (single-question turns, recommended option first)

## Area 1: Asia Range edges

| Question | Options | Selected |
|----------|---------|----------|
| Asia session start: 19:00 or 20:00 NY? | 19:00 NY start (Recommended) / 20:00 NY start / You decide | 20:00 NY start |
| Range high/low: wicks or bodies? | Wick-to-wick (Recommended) / Body-to-body / You decide | Wick-to-wick |
| Post-midnight (00:00–02:00) wicks? | Exclude (Recommended) / Extend to 02:00 / You decide | Exclude |
| Missing candles inside Asia? | Skip gaps (Recommended) / Degraded flag / You decide | Skip gaps |

**Notes:** 20:00 start overrides ICT-12's 19:00 text — recorded as D-01 with a conforming roadmap edit flagged for planning. User accepted every recommended option in this area.

## Area 2: Detector inputs

| Question | Options | Selected |
|----------|---------|----------|
| Range/sweep intervals? | Mixed 1H+15M (Recommended) / 1H only / 15M only / You decide | Mixed 1H+15M |
| NQ-only or both-leg confirmation? | NQ only (Recommended) / Both legs confirm / You decide | NQ only |
| Killzone membership shape? | Per-candle check (Recommended) / Session window object / You decide | Per-candle check |
| Pre-killzone sweeps? | preRun flag (Recommended) / Drop silently / You decide | preRun flag |

**Notes:** Per-candle check chosen over the shared window object Pitfalls P4 suggests — simpler, same DST safety via IANA resolution. User accepted every recommended option.

## Area 3: Judas displacement proof

| Question | Options | Selected |
|----------|---------|----------|
| Displacement denominator? | Asia-height multiple (Recommended) / ATR multiple / You decide | Asia-height multiple |
| Confirmation window length? | 4-candle window (Recommended) / Longer 6–8 / You decide | 4-candle window |
| Reversal definition? | Close-based (Recommended) / Structure shift MSS / You decide | Close-based |
| Failed setups? | Candidates persist (Recommended) / Expire to nothing / You decide | Candidates persist |

**Notes:** Close-based reversal mirrors Phase 7 D-10 FVG sweep-then-reject. No MSS machinery in v2.0. User accepted every recommended option.

## Area 4: AMD classifier fusion

| Question | Options | Selected |
|----------|---------|----------|
| Transition driver? | Time + events (Recommended) / Events only / You decide | Time + events |
| SMT fusion shape? | Regime tag (Recommended) / Read-only / You decide | Regime tag |
| NY without detector? | Unavailable marker (Recommended) / Time-only phase / You decide | Unavailable marker |
| Output shape? | Phase + reason + inputs (Recommended) | Phase + reason + inputs |

**Notes:** One question had a stray non-English label ("Reason всегда") — content was clear (phase+reason+inputs) and user confirmed; cosmetic only, correct shape recorded in CONTEXT D-16. User accepted every recommended option.

## Deferred Ideas

None — discussion stayed within phase scope.

## Claude's Discretion

None — user decided every question directly.

---

*Phase: 08-amd-sessions-asia-range-judas*
