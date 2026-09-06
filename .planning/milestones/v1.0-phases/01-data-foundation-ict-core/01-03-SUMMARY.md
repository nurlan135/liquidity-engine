---
phase: 01-data-foundation-ict-core
plan: 03
subsystem: data-foundation
tags: [yahoo-proxy, resilience, failover, backoff, singleflight, serve-stale, baku-time, dst, vitest]
dependency_graph:
  requires:
    - phase: 01-01
      provides: [vitest-harness, yahoo-fetch-parse, baku-time-util, yahoo-route]
  provides: [null-row-fixture, jittered-backoff, host-failover, stale-serve, singleflight, dst-time-suite]
  affects: [phase-2-selectors]
actuals:
  tokens: 15500
  tasks: 3
  commits: 3
tech_stack:
  added: []
  patterns: [injectable-fetch-sleep, singleflight-dedupe, validate-before-store, retry-after-cap, injected-clock]
key_files:
  created:
    - src/lib/__fixtures__/yahoo-null.json
    - src/lib/yahoo.test.ts
    - src/lib/time.test.ts
  modified:
    - src/lib/yahoo.ts
    - src/lib/time.ts
key-decisions:
  - "Task 1 landed via a parallel agent as 0398ab9 with byte-identical test content; adopted as-is after diff verification"
  - "bakuOffsetMinutes now divides getTimezoneOffset by 60000 so the named unit matches the ms-returning library"
  - "Stale-serve test advances past the 60s TTL so upstream failure exercises the stale path instead of the fresh-cache hit"
  - "Route left thin and untouched: lib already returns stale envelopes and throws UpstreamError for the 502 mapping"
requirements-completed: [DATA-01, DATA-02, STATE-02]
coverage:
  - id: D1
    description: "Null-row fixture parses to exact 8-candle surviving set with ascending Baku dates per D-02"
    requirement: "DATA-01"
    verification:
      - kind: unit
        ref: "src/lib/yahoo.test.ts (null suite)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Failover plus jittered backoff plus singleflight plus stale-serve plus 502 chain per D-02/D-03/D-04"
    requirement: "DATA-02"
    verification:
      - kind: unit
        ref: "src/lib/yahoo.test.ts (resilience suite, 12 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Baku DST plus midnight plus epoch plus idempotency suite per D-17"
    requirement: "STATE-02"
    verification:
      - kind: unit
        ref: "src/lib/time.test.ts (11 tests)"
        status: pass
    human_judgment: false
duration: ~40 min
completed: 2026-09-05
status: complete
---

# Phase 01 Plan 03: Proxy Resilience plus Baku Time Summary

**Hardened NQ=F proxy with query1/query2 failover, jittered backoff honoring capped Retry-After, singleflight dedupe, 60s cache with stale-serve and honest 502s, plus the null-row fixture and the full Baku DST suite — 67/67 tests green.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-09-05T13:03:57Z
- **Completed:** 2026-09-05
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Null-row fixture with a 10-timestamp v8 chart result and a mid-array null run across all four OHLC arrays parses to the exact 8-candle surviving set with ascending Baku dates and finite numbers
- Fetch path retries initial plus 3 with 500/1000/2000ms delays each jittered plus-minus 25 percent, honoring Retry-After delta-seconds and HTTP-date forms capped at 10s, alternating query1 then query2 per attempt
- Retryable signals are 429, 5xx, network throws, 8s abort timeouts, and HTTP 200 chart-error bodies; other 4xx fail over once then throw
- Module-level 60s Map cache serves fresh hits as cache source; upstream failure with warm cache serves the identical payload with stale true and unchanged lastUpdatedISO; empty-cache failure throws UpstreamError for the route 502 mapping
- Singleflight in-flight Map joins concurrent misses into one upstream call with finally cleanup; errors never enter the cache
- Baku suite proves the March spring-forward pair, the November window with Chicago flipping while Baku holds +240, the June midnight boundary pair, epoch minimum input, repeat-call idempotency, ASCII-only outputs, parallel batch correctness, fractional-millisecond bucketing, and far-past/far-future backstops

## Task Commits

Each task was committed atomically:

1. **Task 1: Null-row fixture plus parser edge proof** - `0398ab9` (test)
2. **Task 2: Failover plus backoff plus singleflight plus serve-stale** - `00ee56a` (feat)
3. **Task 3: Baku time suite with DST plus midnight boundary** - `8245698` (feat)

## Files Created/Modified

- `src/lib/__fixtures__/yahoo-null.json` - recorded v8 chart result with mid-array null run and NQ=F meta
- `src/lib/yahoo.test.ts` - null suite (exact surviving set) plus resilience suite (12 tests, all mocked fetch)
- `src/lib/yahoo.ts` - cache, singleflight, jittered backoff, Retry-After cap, failover, stale-serve, abort timeout
- `src/lib/time.test.ts` - March/November/midnight/epoch/idempotency/ASCII/concurrency/backstop suites
- `src/lib/time.ts` - bakuOffsetMinutes unit fix (ms to minutes)

## Decisions Made

- Adopted the parallel agent Task 1 commit 0398ab9 after byte-diff verification instead of recommitting identical content.
- Fixed bakuOffsetMinutes to divide the date-fns-tz millisecond offset by 60000 so the function name tells the truth.
- Advanced the stale-serve test past the 60s TTL so it exercises stale recovery rather than the fresh-cache fast path.
- Left app/api/yahoo/route.ts untouched: the existing thin handler already maps warm failure to the stale envelope and cold failure to 502 plus no-store.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] bakuOffsetMinutes returned milliseconds despite its name**
- Found during: Task 3 verify
- Issue: getTimezoneOffset returns milliseconds (14400000); the helper passed it through so +240 assertions failed
- Fix: Divide by 60000 in src/lib/time.ts; tests assert library-computed 240 minutes
- Commit: 8245698

**2. [Rule 1 - Bug] Stale test timestamp sat inside the 60s TTL**
- Found during: Task 2 verify
- Issue: Failure probe at +30s hit the fresh-cache fast path and returned source cache instead of stale
- Fix: Moved the probe to +61s so upstream failure triggers the stale-serve branch
- Commit: 00ee56a

## Issues Encountered

- A parallel agent committed Task 1 (0398ab9) mid-execution with byte-identical file content; verified via diff and adopted rather than duplicated.
- Vitest output carries ANSI escapes on this shell; stripped with tr before grepping summary lines. No code impact.

## Verification

- `yahoo.test.ts -t "null"`: 1 passed, 12 skipped
- `yahoo.test.ts -t "resilience"`: 12 passed, 1 skipped
- `time.test.ts`: 11/11 passed
- Full suite `vitest run`: 9 files, 67/67 passed
- `tsc --noEmit`: zero errors in all plan files
- `npm run lint`: 0 errors, 1 pre-existing warning in sibling plan 01-02 levels.test.ts (unused import, out of scope)

## Known Stubs

None - stub scan over all plan files returned zero TODO/FIXME/placeholder markers. No hardcoded empty values flow to any UI; all outputs derive from upstream payloads or injected instants.

## Threat Flags

None - new surface matches the plan threat model exactly: validate-before-store on symbol plus ascending plus minimum 5 complete candles with errors never stored (T-03-01), jittered backoff with capped Retry-After plus host failover plus 8s abort plus singleflight plus 60s TTL (T-03-02), single IANA Baku rule with injected clock and DST suites (T-03-03). No installs (T-03-SC).

## Requirements

- DATA-01 (concurrency explicit): concurrent cache misses join one in-flight upstream promise via singleflight with a single upstream call
- DATA-01 (adjacency explicit): adjacent daily timestamps map to adjacent Baku date strings with no merge or gap
- DATA-02 (idempotency explicit): repeating a failed upstream sequence with warm cache returns the identical stale payload with unchanged lastUpdatedISO
- DATA-02 (concurrency explicit): parallel requests during one upstream fetch share the single in-flight promise
- STATE-02 (concurrency explicit): concurrent formatting of distinct instants returns per-instant Baku dates with no shared mutable state
- STATE-02 (empty explicit): epoch formats to 1970-01-01 with no throw
- STATE-02 (encoding explicit): all time outputs are ASCII YYYY-MM-DD strings plus numeric minute offsets
- STATE-02 far-future/far-past backstop, DATA-02 Retry-After 10s cap backstop, STATE-02 fractional-millisecond backstop: all covered as flat unit assertions

## Next Phase Readiness

Phase 1 data foundation is complete: tracer slice (01-01), ICT math core (01-02), and proxy resilience plus time (01-03) are all green. Ready for Phase 2 composition. No blockers.

## Self-Check: PASSED

- All 5 plan files exist on disk
- All 3 task commits exist in git log (0398ab9, 00ee56a, 8245698)
- Full suite green after final task commit; typecheck and lint clean for plan files
