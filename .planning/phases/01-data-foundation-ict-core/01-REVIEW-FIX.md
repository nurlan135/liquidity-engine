---
phase: 01-data-foundation-ict-core
fixed_at: 2026-09-05T00:00:00Z
review_path: C:\Users\HP\Projects\liquidity-engine\.planning\phases\01-data-foundation-ict-core\01-REVIEW.md
iteration: 1
findings_in_scope: 12
fixed: 12
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-09-05T00:00:00Z
**Source review:** `01-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 12 (WR-01 through WR-12)
- Fixed: 12
- Skipped: 0

**Verification environment:** All gates (`npx tsc --noEmit`, `npm test` / vitest)
ran in the main checkout. No isolated worktree was used in this run.
Final result: `tsc` clean, 9 test files / 67 tests passed.

## Fixed Issues

### WR-01: NaN position falls through to BEARISH instead of degrading

**Files modified:** `src/lib/ict/bias.ts`
**Commit:** 13bf422
**Applied fix:** `computeBias` now returns honest-degrade COMPRESSION when
`position` is non-finite (`!Number.isFinite(position)` added to the existing
thin-history guard), closing the NaN-to-BEARISH path.

### WR-02: COMPRESSION DOL with NaN lastPrice silently selects the low

**Files modified:** `src/lib/ict/dol.ts`
**Commit:** 38c2c64
**Applied fix:** `computePrimaryDOL` validates `lastPrice` alongside
`range.high`/`range.low` and throws on any non-finite input.

### WR-03: computeLevels has no finite-input guard, inconsistent with dol

**Files modified:** `src/lib/ict/levels.ts`
**Commit:** 547e626
**Applied fix:** `computeLevels` throws on non-finite `range.high`,
`range.low`, or `lastClose`, matching the `dol.ts` boundary contract.

### WR-04: computeATR accepts non-positive periods (divide-by-zero / NaN)

**Files modified:** `src/lib/ict/regime.ts`
**Commit:** 69aa6e6
**Applied fix:** `computeATR` throws unless `period` is a positive integer,
before any length guard or division.

### WR-05: detectRollover has no ATR guard; negative/NaN ATR always trips

**Files modified:** `src/lib/ict/rollover.ts`
**Commit:** 7788212
**Applied fix:** `detectRollover` throws on non-finite or negative `atr`
before computing the tripwire.

### WR-06: Parsed contractHint is discarded; Envelope cannot carry it

**Files modified:** `src/lib/yahoo.ts`
**Commit:** 2656305
**Applied fix:** `Envelope` gained a `contractHint: string` field;
`fetchUpstream` threads `parsed.contractHint` through `buildEnvelope`.
`buildEnvelope` signature is `(candles, now = new Date(), contractHint =
'NQ=F · CME')` — `now` kept second so the existing tracer call
`buildEnvelope([], date)` keeps working with a default hint.

### WR-07: Cache, stale-serve, and singleflight share mutable candle arrays

**Files modified:** `src/lib/yahoo.ts`
**Commit:** 2656305
**Applied fix:** Fresh cache hits, stale recovery, singleflight joiners, and
freshly fetched envelopes all return deep-cloned candle arrays
(`candles.map((c) => ({ ...c }))`), so in-place consumer mutation can no
longer poison the module-level cache or sibling callers.

### WR-08: Retry budget can exceed the route's 15s maxDuration

**Files modified:** `src/lib/yahoo.ts`
**Commit:** 2656305
**Applied fix:** `FETCH_TIMEOUT_MS` lowered from 8s to 4s. Worst case is now
4 attempts x 4s + ~3.5s backoff, fitting the route's 15s `maxDuration`
(comment records the arithmetic). Attempt count unchanged, so existing
retry tests still pass.

### WR-09: Unbounded-age stale served as cacheable 200

**Files modified:** `src/lib/yahoo.ts`, `app/api/yahoo/route.ts`
**Commits:** 2656305 (library), 03c33a8 (route)
**Applied fix:** Library caps stale-serve at `MAX_STALE_MS` (30 min) and
falls through to the 502 path beyond that; route emits
`Cache-Control: no-store` when `envelope.stale` is true instead of the
cacheable `public, s-maxage=60` header.

### WR-10: Error path sets body retryAfter but no Retry-After header

**Files modified:** `app/api/yahoo/route.ts`
**Commit:** 03c33a8
**Applied fix:** 502 response now includes the `Retry-After: 60` HTTP header
alongside the existing body field and `no-store` directive.

### WR-11: Retry routing by message-prefix matching; throw caught by own catch

**Files modified:** `src/lib/yahoo.ts`
**Commit:** 2656305
**Applied fix:** `UpstreamError` carries a structured `retryable: boolean`
plus optional `status: number` discriminator; the `fetchUpstream` catch
block branches on `err.retryable` only. All `throw`/`lastError` sites set
the flags explicitly (429/5xx + chart-error + network = retryable;
non-429 4xx after failover + validation = non-retryable).

### WR-12: Symbol re-validated via display-string round-trip

**Files modified:** `src/lib/yahoo.ts`
**Commit:** 2656305
**Applied fix:** `parseChartJson` returns the validated `symbol` directly
(new `symbol` field alongside `contractHint`); `fetchUpstream` uses
`parsed.symbol` with no string surgery on the display string.

## Notes

- The WR-09 library change also resolves IN-07's latent concern:
  non-retryable 4xx errors now bypass the warm-cache stale fallback and fail
  loudly (documented in code comment). No test was added for this per
  critical_warning scope (Info findings out of scope).
- Info findings IN-01 through IN-07 were out of scope and left untouched.

---

_Fixed: 2026-09-05T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
