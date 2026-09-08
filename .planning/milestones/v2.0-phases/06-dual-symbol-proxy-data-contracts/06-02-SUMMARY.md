---
phase: 06-dual-symbol-proxy-data-contracts
plan: 02
subsystem: proxy-data-contracts
tags: [yahoo-proxy, intraday, epoch-contract, forming-flag, bounded-range, ES-F]
dependency_graph:
  requires: [06-01-fetchSymbol-spine, intraday-epoch-type]
  provides: [intraday-parser-branch, fetchIntraday-leg, intraday-1h-fixture]
  affects: [06-03-timestamp-join, 06-04-dual-store]
tech_stack:
  added: []
  patterns: [separate-intraday-cache, range-style-upstream-path, parser-side-forming-flag]
key_files:
  created: [src/lib/__fixtures__/intraday-1h.json]
  modified: [src/lib/yahoo.ts, src/lib/yahoo.test.ts]
decisions:
  - Intraday path is a separate parse/fetch/cache lane, not a branch inside the daily functions
  - Gap-step test asserts a 3-step jump for the 2-row null run, not 2-step
  - fetchIntraday rejects interval 1d explicitly, keeping the D1 lane single-owner
metrics:
  duration: ~20 min
  completed: 2026-09-06
  tasks: 2
  commits: 2
status: complete
requirements-completed: [DATA-05]
actuals:
  tokens: 11000
  tasks: 2
  commits: 2
  plan_head_before: df1bc7d~1
  commits_actual: 2
coverage:
  DATA-05:
    - truth: NQ and ES 1H and 15M candles arrive through fetchSymbol with UTC epoch-seconds rows per D-16 while D1 output shape is unchanged
      verified_by: fetchIntraday ES 1h live test (30 epoch rows, ES contractHint); NQ daily deep-equals baseline test; full suite 148/148
    - truth: The last-row partial candle is flagged forming at the parser per D-15 and incomplete non-last rows are dropped before any join
      verified_by: fixture parse test — 30 rows, rows 10-11 absent, exactly one forming tail row, non-tail rows unflagged
    - truth: Intraday upstream paths use bounded server-derived ranges only, never range=max on a loop per D-02
      verified_by: fetchIntradayUpstream built on buildPath range-style legs from RANGE_FOR_INTERVAL (3mo/1mo); no unbounded range literal in code
    - truth: D1 NQ anchor selectors read the raw NQ array exactly as before with no join parameters per D-07
      verified_by: parseChartJson daily branch untouched, range.ts untouched, no caller changes; D1 range tests green in full suite
---

# Phase 06 Plan 02: Intraday Expansion Summary

Intraday 1H/15M legs proven through a dedicated parse/fetch/cache lane emitting the locked epoch-seconds contract, with the forming tail flagged at the parser, bounded server-derived ranges only, and the D1 path byte-identical.

## What Was Built

**Task 1 — synthetic intraday 1H fixture (df1bc7d):** `src/lib/__fixtures__/intraday-1h.json` is hand-built synthetic (no network in any test): 32 ascending epoch-second timestamps at exact 3600 multiples from whole-hour base 1767621600, meta ES=F/CME, rows 10-11 full nulls across OHLC, every other non-last row finite OHLC drifting upward from 6020 in steps of 2, last row close-only (open/high/low null, close 6085) so the parser must flag it forming per D-15. Existing 18-test suite stayed green at commit time.

**Task 2 — intraday lane plus tests (ef409fc):** `src/lib/yahoo.ts` gains `parseIntradayChartJson` (epoch-seconds `IntradayCandle` rows, same null-row drop plus last-row close-only forming rule as daily, allowlisted-symbol match, strictly-ascending-time UpstreamError), `isValidIntradayPayload` (exported per-leg guard: allowlisted symbol, min 5 rows, finite OHLC, integer finite ascending time), `IntradayEnvelope` + `buildIntradayEnvelope` (companion to `Envelope`, D1 shape untouched), `fetchIntradayUpstream` (range-style `buildPath` legs from the Plan 01 `RANGE_FOR_INTERVAL` map — no new range literals, no max range on any loop; identical failover/4s-timeout/jittered-backoff/Retry-After-cap machinery), and `fetchIntraday` (own composite-key cache + singleflight maps, 60s TTL, 30-min stale ceiling, serve-only-this-leg stale, explicit rejection of interval `1d` so the D1 lane stays single-owner). `parseChartJson`, `isValidPayload`, `fetchSymbol`, `fetchNQDaily`, `buildPath` daily branch, and `range.ts` are untouched. Five new mocked-fetch test cases in `src/lib/yahoo.test.ts`: fixture yields 30 rows with integer epoch times, 3-step gap jump, exactly one forming tail; ES 1h envelope live with ES contractHint; symbol mismatch (NQ request vs ES payload) rejects UpstreamError; swapped-timestamp disorder throws UpstreamError; NQ daily deep-equals baseline with string dates.

## Verification

- `npx vitest run src/lib/yahoo.test.ts`: 23/23 green (18 baseline + 5 new)
- `npm test` full suite: 21 files, 148/148 green (143 baseline + 5 new)
- `npx tsc --noEmit`: zero output lines — no error in any file, including the pre-existing app/layout.tsx residual noted in 06-01
- No unit test performs a live network call; all intraday cases use the hand-built fixture or mocked fetch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gap-step assertion expected a 2-step jump for a 2-row hole**
- **Found during:** Task 2, first vitest run (1 failed / 22 passed)
- **Issue:** Test asserted the post-gap survivor jumps 7200s, but rows 10-11 null means row 12 follows row 9 — a 3-step (10800s) jump
- **Fix:** Corrected the expected jump to 10800 with a comment explaining the 2-row hole arithmetic; production code untouched
- **Files modified:** src/lib/yahoo.test.ts
- **Commit:** ef409fc

Design note (not a deviation): the plan's acceptance language says "fetchSymbol ES 1h returns source live"; the implementation exposes the intraday leg as `fetchIntraday` (a dedicated entry point sharing `buildPath`/resilience machinery) rather than overloading `fetchSymbol`'s daily `Envelope` return type. This keeps the D1 `Envelope` contract frozen per the plan's own D-07/D-16 constraints; the join in Plan 03 consumes `fetchIntraday` output in the locked `IntradayCandle` shape.

## Decisions Made

- Separate intraday lane (own parse/fetch/cache functions and maps) over branching daily internals — the D1 path stays auditable as byte-identical, and per-leg stale can never merge (D-03 goal, D-06)
- `fetchIntraday` explicitly rejects `1d` so exactly one function owns the daily contract
- `isValidIntradayPayload` exported for Plan 03's reuse; integer-time check added beyond the plan text (epoch contract is integer seconds)

## Known Stubs

None.

## Threat Flags

None — no new surface beyond the plan threat model. T-06-02 mitigated by `isValidIntradayPayload` before cache write plus errors never cached. T-06-04 mitigated by range-style paths from the pinned `RANGE_FOR_INTERVAL` map only, no max-range literal anywhere. T-06-SC: no new packages; package.json unchanged.

## Self-Check: PASSED

- intraday-1h.json exists on disk with 32 timestamps at 3600 steps, ES=F meta, null rows 10-11, close-only tail
- Commits df1bc7d, ef409fc exist in git log
- Full suite 148/148 green at commit time; post-commit deletion check clean
