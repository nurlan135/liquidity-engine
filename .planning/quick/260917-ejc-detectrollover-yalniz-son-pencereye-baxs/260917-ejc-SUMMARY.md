---
quick: 260917-ejc-detectrollover-yalniz-son-pencereye-baxs
plan: 260917-ejc
status: complete
tasks_completed: 2
tasks_total: 2
commits:
  - 7d4ea27
  - 3d87797
duration: ~10 min
completed: 2026-09-17
---

# Quick 260917-ejc: detectRollover trailing-window Summary

`detectRollover` scans only the trailing `ROLLOVER_WINDOW` (20) candles instead of
full history, so a stale roll gap no longer sticks `rolloverSuspect=true` forever and
false `rollover-week` suppression (SMT + fatal-flaw) is eliminated.

## Tasks

1. **Trailing-window tripwire** (`src/lib/ict/rollover.ts`, commit `7d4ea27`):
   exported `ROLLOVER_WINDOW = 20` (CORR_WINDOW precedent); `detectRollover` probes
   only the last `ROLLOVER_WINDOW + 1` closed candles (+1 keeps the boundary gap
   countable). Tripwire, strict-greater-than, ATR validation, `contractHint`,
   `proximityWarning` unchanged; signature unchanged — `smt.ts` / `store.ts` untouched.
2. **Stale-gap vs fresh-gap tests + regression** (`src/lib/ict/rollover.test.ts`,
   commit `3d87797`): added STALE test (30-candle series, gap at idx 5, clean last
   20 → `false`; reproduces the bug — old code returned `true`), FRESH test
   (same length, gap at final pair → `true`), plus a `ROLLOVER_WINDOW === 20` pin.
   Also fixed the `trend()` helper to emit real ISO dates (old day-padding produced
   invalid `2026-01-32…` dates for series longer than 27 days; existing short-series
   outputs unchanged).

## Verification

- `npx vitest run src/lib/ict/rollover.test.ts src/lib/ict/smt.test.ts
  src/lib/store.test.ts src/lib/ict/invalidation.test.ts src/lib/ict/replay.test.ts`
  → 5 files, 101 tests, all green.
- `npx tsc --noEmit` → clean.
- `isNearRolloverWeek` + `PROXIMITY_DAYS` untouched; rollover-week suppression
  still fires on fresh gaps (SMT suite green).

## Deviations

None — plan executed exactly as written. (Minor: `trend()` date fix required by the
30-candle tests; existing dates unchanged, Rule 1 adjacent fix, covered by same tests.)

## Self-Check: PASSED

- `src/lib/ict/rollover.ts` exports `ROLLOVER_WINDOW = 20` — FOUND.
- Commits `7d4ea27`, `3d87797` exist on `quick/260917-ejc-rollover-trailing-window`.
- 101/101 tests green, `tsc` clean.
