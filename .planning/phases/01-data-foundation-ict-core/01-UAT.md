---
status: complete
phase: 01-data-foundation-ict-core
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md]
started: 2026-09-05T14:00:00Z
updated: 2026-09-05T14:55:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Tracer path — mocked NQ=F fetch flows to validated envelope plus range math
expected: Running the tracer suite proves a mocked 25-row NQ=F Yahoo payload (with one mid-array null row dropped) flows through fetch, shape-guard, envelope, and 20-candle range math to correct high/low/eq — 6/6 tracer tests green, full suite 67/67 green.
result: pass

### 2. Yahoo route returns envelope with honest cache headers
expected: GET /api/yahoo returns {candles, lastUpdatedISO, stale, source} with a 60s-TTL cache envelope; cold upstream failure returns 502 plus no-store, never a cached error. Route is force-dynamic with 15s max duration.
result: pass

### 3. Baku date bucketing across March DST boundary
expected: Adjacent daily timestamps map to adjacent Baku date strings with no merge or gap; the March spring-forward pair buckets correctly through toBakuYMD with an injected clock.
result: pass

### 4. Levels math (EQ, Q1/Q3 quadrants, bull/bear OTE pockets, position) per D-13
expected: Levels math (EQ, Q1/Q3 quadrants, bull/bear OTE pockets, position) per D-13
result: pass
source: automated
coverage_id: 01-02-D1

### 5. Re-anchor rule table (close-only retire, wick ignored, equality no-retire, idempotent, forming excluded) per D-06
expected: Re-anchor rule table (close-only retire, wick ignored, equality no-retire, idempotent, forming excluded) per D-06
result: pass
source: automated
coverage_id: 01-02-D2

### 6. Bias with mandatory rationale (thin-history, buffer, discount/premium) per D-09/D-10
expected: Bias with mandatory rationale (thin-history, buffer, discount/premium) per D-09/D-10
result: pass
source: automated
coverage_id: 01-02-D3

### 7. Single named Primary DOL (bullish->high, bearish->low, compression->nearer, tie->high) per D-11
expected: Single named Primary DOL (bullish->high, bearish->low, compression->nearer, tie->high) per D-11
result: pass
source: automated
coverage_id: 01-02-D4

### 8. ATR regime (Wilder 14 vs 20-bar average, 34-bar honest degrade) per D-12
expected: ATR regime (Wilder 14 vs 20-bar average, 34-bar honest degrade) per D-12
result: pass
source: automated
coverage_id: 01-02-D5

### 9. Rollover tripwire (strict 3xATR flag-and-continue plus quarterly proximity warning) per D-07
expected: Rollover tripwire (strict 3xATR flag-and-continue plus quarterly proximity warning) per D-07
result: pass
source: automated
coverage_id: 01-02-D6

### 10. Null-row fixture parses to exact 8-candle surviving set with ascending Baku dates per D-02
expected: Null-row fixture parses to exact 8-candle surviving set with ascending Baku dates per D-02
result: pass
source: automated
coverage_id: 01-03-D1

### 11. Failover plus jittered backoff plus singleflight plus stale-serve plus 502 chain per D-02/D-03/D-04
expected: Failover plus jittered backoff plus singleflight plus stale-serve plus 502 chain per D-02/D-03/D-04
result: pass
source: automated
coverage_id: 01-03-D2

### 12. Baku DST plus midnight plus epoch plus idempotency suite per D-17
expected: Baku DST plus midnight plus epoch plus idempotency suite per D-17
result: pass
source: automated
coverage_id: 01-03-D3

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
