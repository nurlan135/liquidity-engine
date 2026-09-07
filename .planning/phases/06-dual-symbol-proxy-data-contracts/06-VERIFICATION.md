---
phase: 06-dual-symbol-proxy-data-contracts
verified: 2026-09-07T10:00:00Z
status: passed
score: 16/17 must-haves verified (1 deferred to Phase 7)
covered_files:
  - .planning/phases/06-dual-symbol-proxy-data-contracts/06-01-PLAN.md
  - .planning/phases/06-dual-symbol-proxy-data-contracts/06-02-PLAN.md
  - .planning/phases/06-dual-symbol-proxy-data-contracts/06-03-PLAN.md
  - .planning/phases/06-dual-symbol-proxy-data-contracts/06-04-PLAN.md
  - .planning/phases/06-dual-symbol-proxy-data-contracts/06-05-PLAN.md
  - .planning/phases/06-dual-symbol-proxy-data-contracts/06-01-SUMMARY.md
  - .planning/phases/06-dual-symbol-proxy-data-contracts/06-02-SUMMARY.md
  - .planning/phases/06-dual-symbol-proxy-data-contracts/06-03-SUMMARY.md
  - .planning/phases/06-dual-symbol-proxy-data-contracts/06-04-SUMMARY.md
  - .planning/phases/06-dual-symbol-proxy-data-contracts/06-05-SUMMARY.md
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - src/lib/yahoo.ts
  - src/lib/ict/types.ts
  - src/lib/ict/join.ts
  - src/lib/ict/join.test.ts
  - src/lib/__fixtures__/join-misaligned.json
  - src/lib/__fixtures__/intraday-1h.json
  - src/lib/__fixtures__/es-daily.json
  - src/lib/__fixtures__/nq-daily-baseline.json
  - app/api/yahoo/route.ts
  - app/api/yahoo/route.test.ts
  - src/lib/store.ts
  - src/lib/store.test.ts
  - components/dashboard/status-strip.tsx
  - components/dashboard/terminal-shell.tsx
  - src/terminal-shell.test.ts
covered_digest: "v1:sha256:a36fb2db7f4c81c632d5d6ee79d4df7a14dc963095c69d818b1029b1b1b3d393"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 15/17
  gaps_closed:
    - "User receives NQ + ES 1H/15M candles through the parameterized proxy (roadmap SC2 serving dimension)"
    - "NQ and ES 1H and 15M candles arrive with UTC epoch-seconds rows wired end to end (plan 06-02 truth 1, via fetchIntraday lane)"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "SMT refuses with a stated reason when either leg is stale (second half of roadmap SC3)"
    addressed_in: "Phase 7"
    evidence: "Phase 7 success criteria: 'User sees SMT divergence status (BULLISH / BEARISH / NO-SIGNAL) with swing references in output, suppressed by the correlation-regime gate' — no SMT comparator exists in Phase 6 scope; Phase 6 plans scoped DATA-06 to refuse-ready per-leg envelopes only"
---

# Phase 06: Dual-Symbol Proxy + Data Contracts Verification Report

**Phase Goal:** Terminal serves dual-symbol daily + intraday candles through honest per-symbol stale envelopes
**Verified:** 2026-09-07T10:00:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 06-05, commits d368a3d + a5c4608)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User receives ES=F daily via parameterized `?symbol=&interval=` proxy while NQ pipe is byte-identical (SC1 / DATA-04) | ✓ VERIFIED | `route.test.ts` 7/7 green: bare-GET body key-equals `nq-daily-baseline.json`, ES daily 200 with `ES=F` hint + 10 candles, 400s assert zero fetch calls; full suite 165/165 |
| 2 | Live probe pinned server-derived ranges, no unbounded range on loops (plan 01 truth 1) | ✓ VERIFIED | `RANGE_FOR_INTERVAL` in `src/lib/yahoo.ts` (1d 182d window, 1h 3mo, 15m 1mo); untouched by gap-closure diff |
| 3 | Per-combo cache key + singleflight, uniform 60s TTL, 30-min stale ceiling, frozen daily Envelope (plan 01 truths 4-5) | ✓ VERIFIED | Unchanged since prior verification; regression suite green |
| 4 | Unknown symbol/interval gets 400, never forwarded upstream | ✓ VERIFIED | Allowlist guards run before lane dispatch (`route.ts:29-34`); 400 tests assert zero fetch calls; dispatch branch sits strictly after guards |
| 5 | Intraday parser emits epoch-seconds rows, flags forming tail, drops incomplete rows (plan 02 truths 2-3) | ✓ VERIFIED | Unchanged since prior verification; yahoo intraday unit tests green within 165/165 |
| 6 | NQ and ES 1H/15M candles served through the parameterized proxy (SC2 serving dimension — PREVIOUS GAP) | ✓ VERIFIED | `route.ts:37-40`: `intervalParam === '1d'` → `fetchSymbol`, else → `fetchIntraday` with identical args; new test `GET with symbol ES=F and interval 1h` returns 200, 30 candles, every `time` integer, no `date` key, `stale: false`, fresh Cache-Control — observed passing in `npx vitest run app/api/yahoo/route.test.ts` (7/7) |
| 7 | Epoch-rows contract wired end to end via fetchIntraday (plan 06-02 truth 1 as built — PREVIOUS GAP) | ✓ VERIFIED | `fetchIntraday` imported and called in `route.ts:5,40`; no longer orphaned — grep-wired route→lane; 1h happy-path test pins epoch-integer times on all 30 rows through the route boundary |
| 8 | Intraday uses bounded server-derived ranges only; D1 anchor path untouched (plan 02 truths 3b-4) | ✓ VERIFIED | `git diff e36f378 HEAD -- src/lib/ict/range.ts src/lib/store.ts src/lib/ict/join.ts` empty — zero diff; `RANGE_FOR_INTERVAL` read-only in gap-closure diff |
| 9 | NQ/ES candles inner-join on timestamp only; misaligned rows never compared (SC4 / DATA-07) | ✓ VERIFIED | Unchanged since prior verification; join tests green within 165/165 |
| 10 | Forming rows dropped at join boundary; coverage always returned, never refuses | ✓ VERIFIED | Unchanged; regression suite green |
| 11 | Join is pure (no wall-clock) and D1 anchor selectors unchanged | ✓ VERIFIED | Join files untouched by gap-closure diff; suite green |
| 12 | Polling staggers NQ :00 / ES :30 + jitter on independent always-on 60s timers, never coupled (DATA-06) | ✓ VERIFIED | `store.ts` untouched by gap-closure diff (per D-01, intraday polling belongs to Phase 7; route stays dumb per-leg fetch); stagger tests green |
| 13 | One leg failing marks only that leg stale, rows preserved, no merged stale boolean | ✓ VERIFIED | Unchanged; plus new intraday 502 test pins honest-error shape on the new lane (502, `retryAfter: 60`, `no-store` + `Retry-After: 60`, body free of `candles`/`date` keys) |
| 14 | Strip shows per-leg ages `NQ xs · ES ys`; coverage debug line rides in data | ✓ VERIFIED | Unchanged; shell tests green |
| 15 | Existing single-leg shell/strip/poll assertions keep passing, NQ daily path unchanged | ✓ VERIFIED | Full suite 165/165 across 22 files (was 163/163 — delta is exactly the 2 new route tests, zero regressions) |
| 16 | Prohibitions hold: no cross-substitution, no merged stale, no unknown forwarding, no ES-shortened anchor; gap-plan prohibitions (no stale-labeled-fresh, no daily-shaped intraday) | ✓ VERIFIED | Separate `payloadCache`/`intradayPayloadCache` maps; shared stale-aware Cache-Control ternary (`route.ts:43`) applies identically to both lanes; 1h test asserts `stale: false` + fresh header; failure test asserts no `candles`/`date` keys |
| 17 | SMT refuses with stated reason when either leg stale (SC3 second half) | DEFERRED | No SMT comparator exists in Phase 6 scope; Phase 7 owns SMT status output — see Deferred Items |
| 18 | Coverage diagnostics visible to selectors/support (DATA-05 second half) | ✓ VERIFIED | Unchanged; coverage tests green |

**Score:** 16/17 truths verified + 1 correctly deferred to Phase 7 (2 previous gaps closed, 0 remaining, 0 regressions)

### Gap Closure Confirmation

Both prior gaps shared one root cause (route funneled 1h/15m through daily `fetchSymbol`, `fetchIntraday` orphaned). Closure verified at three levels:

1. **Exists:** `route.ts` imports `fetchIntraday` (line 5) and branches on `intervalParam === '1d'` (lines 37-40) — read directly, not inferred from SUMMARY.
2. **Substantive:** Branch passes identical `(symbolParam, intervalParam, new Date())` args; allowlist guards precede dispatch; shared stale/header/502 shapes reused unchanged. No stub, no placeholder, no `TODO`/`FIXME` in `app/api/yahoo/`.
3. **Wired:** Two pinning route tests observed passing in own vitest run (7/7): happy path (200, 30 epoch-integer rows, ES hint, fresh headers) and failure path (502, honest error shape, no daily-shaped keys). `fetchIntraday` now has a production caller.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | SMT refuses with stated reason when either leg stale | Phase 7 | Phase 7 SC: SMT divergence status with swing references, suppressed by correlation-regime gate |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/yahoo/route.ts` | Param proxy with interval dispatch | ✓ VERIFIED | Dispatch branch present after allowlist guards; daily lane byte-identical |
| `app/api/yahoo/route.test.ts` | 7 route tests incl. 2 intraday | ✓ VERIFIED | 7/7 observed passing; intraday happy-path + honest-502 |
| `src/lib/yahoo.ts` | fetchSymbol spine + fetchIntraday lane | ✓ VERIFIED | Lane now WIRED (was ORPHANED); file read-only in gap plan, signature confirmed `(symbol, interval, now, ...)` |
| `src/lib/ict/types.ts` | IntradayCandle epoch contract | ✓ VERIFIED | Unchanged, regression green |
| `src/lib/__fixtures__/*.json` | es-daily, nq-baseline, intraday-1h, join-misaligned | ✓ VERIFIED | Unchanged, consumed by passing tests |
| `src/lib/ict/join.ts` + `join.test.ts` | Pure join + coverage | ✓ VERIFIED | Untouched by gap diff, tests green |
| `src/lib/store.ts` | Dual-leg staggered store | ✓ VERIFIED | Untouched by gap diff (by design, D-01); tests green |
| `status-strip.tsx` / `terminal-shell.tsx` | Per-leg ages + coverage line | ✓ VERIFIED | Untouched, tests green |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| route.ts | fetchSymbol (daily) | `intervalParam === '1d'` branch | WIRED | Bare + ES daily + stale tests green |
| route.ts | fetchIntraday (1h/15m) | else branch after allowlist guards | WIRED (was NOT_WIRED) | 1h happy-path + 502 tests green; observed |
| store.ts | route (daily legs) | `/api/yahoo`, daily intervals | WIRED | Unchanged, green |
| store.ts | join.ts coverage | `computeCoverage` via projection | WIRED | Unchanged, green |
| strip/shell | store legs + coverage | zustand subscriptions | WIRED | Unchanged, green |
| D1 selectors | raw NQ array | `selectRange` → `computeRange` | WIRED, UNCONTAMINATED | `range.ts` zero diff |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| route.ts bare/ES-daily | `envelope` | `fetchSymbol` → Yahoo parse | Yes (tests pin shapes) | FLOWING |
| route.ts 1h/15m | `envelope` | `fetchIntraday` → intraday parse | Yes — 30 epoch-integer rows pinned at route boundary (was DISCONNECTED) | FLOWING |
| route.ts intraday failure | 502 body | shared catch → `UpstreamError`/static | Yes — honest error, no daily-shaped keys | FLOWING |
| store coverage | `coverage` | join over projected legs | Yes | FLOWING |
| strip paired ages | `nq`/`es` leg state | per-leg refreshers | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Intraday route surface | `npx vitest run app/api/yahoo/route.test.ts` | 7/7 passed (5 pre-existing + 2 new) | ✓ PASS |
| Full suite | `npm test` | 22 files, 165/165 passed | ✓ PASS |
| Type gate | `npx tsc --noEmit` | exit 0, zero output | ✓ PASS |
| Gap-closure scope | `git diff` stat + untouched-files check | 2 source files changed (`route.ts`, `route.test.ts`); `range.ts`/`store.ts`/`join.ts` zero diff | ✓ PASS |

### Probe Execution

No probes declared for this phase (no migration/CLI/tooling; no `probe-*.sh` referenced in plans). Skipped.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DATA-04 | 06-01, 06-05 | ES=F daily via parameterized proxy, NQ untouched | SATISFIED | Bare/ES-daily/400 tests green; 1d lane byte-identical after dispatch |
| DATA-05 | 06-02, 06-04, 06-05 | NQ+ES 1H/15M epoch contract, forming excluded, coverage surfaced | SATISFIED (was PARTIAL) | Parser + coverage held; proxy serving closed by dispatch + 1h route test |
| DATA-06 | 06-04, 06-05 | Staggered polling, per-leg stale, no merged boolean | SATISFIED (refusal deferred) | Stagger + independence green; intraday 502 honesty pinned; SMT refusal is Phase 7 |
| DATA-07 | 06-03, 06-04 | Timestamp inner-join before comparison | SATISFIED | Join tests + store coverage consumption, anchor untouched |

No orphaned requirements: all four Phase 6 IDs (DATA-04–DATA-07) are claimed across plans 06-01–06-05. REQUIREMENTS.md traceability table marks all four Complete — consistent with this verdict.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None | — | `TODO/FIXME/XXX/TBD/placeholder/console.log` grep over `app/api/yahoo/` clean; no stub returns; gap diff is +6/-1 in `route.ts`, test-only otherwise |

### Human Verification Required

None. All truths verified programmatically (route behavior pinned by mocked-fetch vitest tests observed passing in this session). Live-Yahoo smoke is covered by Phase 9 DEPLOY-02 (ES cold-start drill, intraday payload under `maxDuration` on the live URL), not this phase.

### Gaps Summary

No gaps. The single prior root cause (orphaned `fetchIntraday` lane) is closed: dispatch exists in `route.ts`, is substantive (correct args, guards-first ordering, shared honesty shapes), and is wired (production caller + 2 pinning tests observed green). Full suite delta 163→165 is exactly the 2 new tests with zero regressions; `tsc` clean; `range.ts`/`store.ts`/`join.ts` provably untouched. The SMT-refusal half of SC3 remains correctly deferred to Phase 7, which owns the comparator.

---

_Verified: 2026-09-07T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
