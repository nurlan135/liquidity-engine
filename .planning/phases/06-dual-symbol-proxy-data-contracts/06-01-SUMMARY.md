---
phase: 06-dual-symbol-proxy-data-contracts
plan: 01
subsystem: proxy-data-contracts
tags: [yahoo-proxy, dual-symbol, ES-F, cache, singleflight, data-contracts]
dependency_graph:
  requires: [phase-3-nq-proxy]
  provides: [fetchSymbol-param-proxy, es-daily-path, intraday-epoch-type, nq-baseline-fixture]
  affects: [06-02-intraday-parser, 06-03-timestamp-join, 06-04-dual-store]
tech_stack:
  added: []
  patterns: [composite-cache-key, per-key-singleflight, allowlist-400, validate-then-cache-per-leg]
key_files:
  created: [src/lib/__fixtures__/es-daily.json, src/lib/__fixtures__/nq-daily-baseline.json, app/api/yahoo/route.test.ts]
  modified: [src/lib/yahoo.ts, src/lib/ict/types.ts, src/lib/yahoo.test.ts, app/api/yahoo/route.ts]
decisions:
  - RANGE_FOR_INTERVAL pinned from live probe: 1d 182d window, 1h 3mo, 15m 1mo
  - Shared module Map with composite symbol-interval-range keys per D-11
  - Separate IntradayCandle epoch type per D-16, Candle and closedOnly untouched
metrics:
  duration: ~25 min
  completed: 2026-09-06
  tasks: 3
  commits: 3
status: complete
requirements-completed: [DATA-04]
actuals:
  tokens: 30000
  tasks: 3
  commits: 3
  plan_head_before: c8e67f7~1
  commits_actual: 3
coverage:
  DATA-04:
    - truth: Live Yahoo probe for ES=F at 1h and 15m pasted row counts and pinned server-derived ranges
      verified_by: Task 1 probe — ES=F 1h/3mo 1800 rows, 15m/1mo 2419 rows, no truncation, CME
    - truth: Bare GET /api/yahoo byte-identical NQ daily; ?symbol=ES=F returns ES daily
      verified_by: route.test.ts bare-GET baseline shape test + ES envelope test; yahoo.test.ts NQ baseline shape test
    - truth: Unknown symbol or interval gets 400, never forwarded to Yahoo
      verified_by: route.test.ts 400 tests assert zero fetch calls; fetchSymbol defense-in-depth guard
    - truth: Per-combo cache key + singleflight, uniform 60s TTL, 30-min stale ceiling
      verified_by: yahoo.test.ts isolation + concurrent-miss tests; full suite 143/143
    - truth: Daily server Envelope JSON shape frozen, zero new top-level keys
      verified_by: baseline key-equality assertions in both test files
---

# Phase 06 Plan 01: Tracer ES=F Daily Proxy Summary

Parameterized ES=F daily proxy proven end to end through fetchSymbol plus route allowlist plus per-combo cache, with the NQ pipe byte-identical and the intraday epoch row shape locked for Plans 02 and 03.

## Live Probe Results (Task 1)

Dev-curl against the real Yahoo chart endpoint with production headers:

| Leg | URL params | Rows | Null closes | Truncation | Meta |
|-----|-----------|------|-------------|------------|------|
| ES=F 1h | range=3mo interval=1h | 1800 | 338 (overnight gaps) | none, error null | ES=F, CME |
| ES=F 15m | range=1mo interval=15m | 2419 | 468 (overnight gaps) | none, error null | ES=F, CME |

No truncation flags on either leg, so the proposed bounds hold with margin. Null closes are expected overnight/session gaps, not data loss.

**RANGE_FOR_INTERVAL pinned:** 1d to the existing 182-day period window, 1h to 3mo, 15m to 1mo. No unbounded range on any looped fetch per D-02.

**Fixtures:** `es-daily.json` is hand-built synthetic (12 timestamps, 2-row mid-array null run, 10 surviving rows, meta ES=F/CME). `nq-daily-baseline.json` is the verbatim bare-GET body captured from dev server (126 candles, NQ=F CME, fresh headers `public, s-maxage=60, stale-while-revalidate=30`). No unit test performs a network call.

## What Was Built

**Task 1 — probe + fixtures (c8e67f7):** probe row counts recorded, ranges pinned, both fixtures written, existing 13-test suite green.

**Task 2 — fetchSymbol parameterization (e486d31):** `src/lib/yahoo.ts` gains `SYMBOL_ALLOWLIST` (NQ=F, ES=F), `INTERVAL_ALLOWLIST` (1d, 1h, 15m), `ENCODED_FOR`, `RANGE_FOR_INTERVAL`, `cacheKey`, and `fetchSymbol(symbol, interval, now, fetch?, sleep?)` with composite-key cache lookup, per-key singleflight via the existing inFlight map, unchanged query1 to query2 alternation with 4s abort timeout and jittered backoff honoring Retry-After capped at 10s, per-leg validate-then-cache (allowlist symbol match, min 5 rows, finite OHLC, ascending dates), per-leg serve-stale within the 30-minute ceiling, never caching errors. `fetchNQDaily` keeps its exact signature and delegates to `fetchSymbol('NQ=F', '1d')`. `parseChartJson` takes an `expectedSymbol` param defaulting to NQ=F. `src/lib/ict/types.ts` gains `IntradayCandle` (numeric epoch-seconds `time` plus OHLC plus optional `forming`) and `closedOnlyIntraday`; `Candle` and `closedOnly` untouched. Five new mocked-fetch test cases in `src/lib/yahoo.test.ts`.

**Task 3 — route params (a3c149d):** `app/api/yahoo/route.ts` GET now accepts the Next.js request object with type-only `NextRequest` import (re-checked against the vendored route-handler guide per AGENTS.md), reads `symbol` default NQ=F and `interval` default 1d from `nextUrl.searchParams`, 400s unknowns before any upstream contact, delegates bare requests to the frozen NQ daily path, preserves force-dynamic, maxDuration 15, stale-aware Cache-Control, and the 502 shape. New `route.test.ts` with 5 cases: bare-GET baseline shape, ES envelope, 400 unknown symbol with zero fetch calls, 400 unknown interval, fresh-vs-stale header semantics.

## Verification

- `npx vitest run src/lib/yahoo.test.ts`: 18/18 green (13 existing + 5 new)
- `npx vitest run app/api/yahoo/route.test.ts`: 5/5 green
- `npm test` full suite: 21 files, 143/143 green (133 baseline + 10 new)
- `npx tsc --noEmit`: no error naming any file outside the pre-existing app/layout.tsx LayoutProps residual
- `src/lib/ict` purity: no new Date.now/new Date in types.ts; yahoo.ts default param predates this plan

## Deviations from Plan

None — plan executed exactly as written.

One test-authoring fix (not a plan deviation): the route stale-header test initially hung because fake timers froze the retry backoff sleeps; fixed by driving `advanceTimersByTimeAsync` explicitly. Production code untouched.

## Decisions Made

- RANGE_FOR_INTERVAL pinned from observed probe data, not assumed caps
- fetchSymbol throws UpstreamError non-retryable on non-allowlisted direct calls (defense in depth behind the route 400)
- IntradayCandle as a separate interface rather than extending Candle, per D-16 non-unification

## Known Stubs

None.

## Threat Flags

None — no new surface beyond the plan threat model. T-06-01 mitigated by route allowlist plus fetchSymbol guard, cache key built from allowlisted values only. T-06-02 mitigated by per-leg validate-then-cache, errors never cached, per-leg stale-or-502. No new packages; package.json unchanged.

## Self-Check: PASSED

- es-daily.json, nq-daily-baseline.json, route.test.ts exist on disk
- Commits c8e67f7, e486d31, a3c149d exist in git log
- Full suite 143/143 green at commit time
