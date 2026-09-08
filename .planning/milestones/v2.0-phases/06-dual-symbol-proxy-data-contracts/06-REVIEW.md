---
phase: 06-dual-symbol-proxy-data-contracts
reviewed: 2026-09-07T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - app/api/yahoo/route.ts
  - app/api/yahoo/route.test.ts
  - components/dashboard/status-strip.tsx
  - components/dashboard/terminal-shell.tsx
  - src/lib/__fixtures__/es-daily.json
  - src/lib/__fixtures__/intraday-1h.json
  - src/lib/__fixtures__/join-misaligned.json
  - src/lib/__fixtures__/nq-daily-baseline.json
  - src/lib/ict/join.test.ts
  - src/lib/ict/join.ts
  - src/lib/ict/types.ts
  - src/lib/store.test.ts
  - src/lib/store.ts
  - src/lib/yahoo.test.ts
  - src/lib/yahoo.ts
  - src/terminal-shell.test.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-09-07T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

Scope focus per brief: gap-closure diff (`app/api/yahoo/route.ts` dispatch branch, `app/api/yahoo/route.test.ts` new intraday tests) reviewed line-by-line; 06-01..06-04 files re-read at standard depth for regressions only. No Critical (BLOCKER) findings. 4 Warnings + 5 Info below.

## Summary

Gap-closure wiring is correct: `app/api/yahoo/route.ts:36-40` dispatches `1d` to `fetchSymbol` and `1h`/`15m` to `fetchIntraday`; allowlist gates precede any upstream call; the honest-502 path returns no `candles`/`date` payload. New route tests pin the intraday happy path and the 502 path. No injection, secret, or auth issues found. All findings below are robustness/maintainability items; none blocks the intraday lane.

## Warnings

### WR-01: Retry/timeout budget exceeds route `maxDuration`

**File:** `src/lib/yahoo.ts:285-288` + `app/api/yahoo/route.ts:13`
**Issue:** `FETCH_TIMEOUT_MS = 4_000` x 4 attempts = 16s of upstream time alone, plus up to ~4.25s of jittered backoff (`BASE_DELAYS_MS = [500,1000,2000]` with 0.75-1.25x jitter) and a 10s `Retry-After` cap. Worst case ~20s exceeds `maxDuration = 15`, so the platform can kill the handler mid-retry and surface a 504 instead of the honest JSON 502 the tests pin. The `WR-08 budget` comment claiming "worst case under the route's 15s" is arithmetically wrong.
**Fix:** reduce attempts or shorten timeout, e.g. `FETCH_TIMEOUT_MS = 2_500` and `BASE_DELAYS_MS = [400, 800, 1600]`.

### WR-02: `fetchSymbol` accepts intraday intervals with no fast fail (asymmetric guard)

**File:** `src/lib/yahoo.ts:587-601`
**Issue:** `fetchIntraday` rejects `interval === '1d'`, but `fetchSymbol` accepts `'1h'`/`'15m'`. A direct call `fetchSymbol('ES=F','1h',...)` builds the range-style URL then parses hourly epoch rows with `parseChartJson`, collapsing many rows onto one date string and throwing. That parse throw is caught as retryable, burning all 4 attempts + sleeps before failing. The route never does this today, but the library API invites the misuse and wastes ~4-8s per call.
**Fix:** throw non-retryable `UpstreamError` from `fetchSymbol` when `interval !== '1d'`.

### WR-03: Cache TTL / stale checks accept negative ages (clock skew serves future entries)

**File:** `src/lib/yahoo.ts:555,574,604,624`
**Issue:** All four freshness checks are `now.getTime() - cached.fetchedAt < TTL` / `< MAX_STALE_MS` with no lower bound. If the clock steps backward (NTP, fake-timer tests, edge runtimes), age goes negative and a future-stamped entry is served as `cache`/`stale` indefinitely until the clock catches up. Same pattern in both daily and intraday legs.
**Fix:** require `age >= 0` alongside the upper bound in all four checks.

### WR-04: Chart status and header freshness read different clocks

**File:** `components/dashboard/terminal-shell.tsx:58-74`
**Issue:** Header copy derives from the 10s-tick `now` state, but `chartStatus` calls `deriveStatus(..., new Date())` fresh every render. The two can disagree for up to 10s around LIVE/STALE/CLOSED boundaries — chart shows `live` while header shows `STALE`, or vice versa.
**Fix:** derive both from the same `now` state value.

## Info

### IN-01: Daily parser skips integer check that intraday enforces

**File:** `src/lib/yahoo.ts:205` vs `:124`
**Issue:** Intraday drops non-integer timestamps, daily only checks `typeof` + `Number.isFinite`. A fractional Yahoo timestamp would be silently multiplied to a fractional ms value on the daily path. Harmless today (Yahoo emits integer seconds) but the two parsers should agree.

### IN-02: Quote-array / timestamp length mismatch is silent

**File:** `src/lib/yahoo.ts:115-118,196-199`
**Issue:** `opens[i]` etc. are indexed without checking `quote` arrays match `timestamps.length`. A short quote array yields `undefined` rows that are silently dropped, shrinking the candle set with no diagnostic.

### IN-03: Join-coverage debug line ships in production UI

**File:** `components/dashboard/terminal-shell.tsx:132-134`
**Issue:** the `join-coverage` paragraph always renders with `text-muted-foreground` — visible, not dev-only. Internal join diagnostics should be `hidden` or behind a debug flag.

### IN-04: Strip reports `live` when one leg never landed

**File:** `components/dashboard/status-strip.tsx:71-79`
**Issue:** `states` only includes derived legs; a missing leg contributes nothing, so partial coverage reads as full health. Pinned by tests (intentional per current spec), but worth a conscious product decision.

### IN-05: `isValidCandle` accepts unparseable date strings; projection drops them silently

**File:** `src/lib/store.ts:35-46,145-160`
**Issue:** Envelope guard checks `typeof row.date === 'string'` only. `projectLegToIntraday` then skips `NaN` times, so a garbage date passes validation but vanishes from the join input, deflating coverage with no error.

## Gap-closure verdict

- `app/api/yahoo/route.ts:36-40` — dispatch correct; no orphaned lane remains.
- `app/api/yahoo/route.test.ts` — intraday epoch-shape test (`time` integer, no `date`) and honest-502 test (`status 502`, `retryAfter 60`, `no-store`, no `candles`/`date`) are well-constructed; fake-timer + 30s advance correctly exhausts the backoff chain on an empty cache.
- No findings in the new tests; Warnings above are pre-existing library/store concerns, none introduced by the gap closure.

_Reviewed: 2026-09-07T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
