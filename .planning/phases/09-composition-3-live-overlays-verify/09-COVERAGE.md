# Phase 9 API Coverage Decision — 09-COVERAGE.md

**Phase:** 09-composition-3-live-overlays-verify (Plan 03)
**Date:** 2026-09-07
**Status:** Declared; drill outcome pending live-URL run (Task 2 blocking-human checkpoint)

## Declaration

**No new external API integration.** Phase 9 adds no new upstream host, no new route, and no new query surface. The `nq1h` and `nq15m` legs reuse the Phase 6 parameterized Yahoo proxy (`app/api/yahoo`) with already-allowlisted symbol `NQ=F` and intervals `1h` and `15m` over the pinned bounded ranges (`1h: 3mo`, `15m: 1mo` per `RANGE_FOR_INTERVAL` in `src/lib/yahoo.ts`). `app/api/yahoo/route.ts` stays byte-identical per the D-16 verify-don't-redesign rule — redesign only on drill failure with the failure pasted.

## Leg-to-allowlist map

| Leg | Symbol | Interval | Range (bounded) | Allowlist entry |
|-----|--------|----------|-----------------|-----------------|
| ES daily (cold-start drill, step 1) | `ES=F` | `1d` | `182d` | `SYMBOL_ALLOWLIST` includes `ES=F` [VERIFIED: src/lib/yahoo.ts:45]; `INTERVAL_ALLOWLIST` includes `1d` [VERIFIED: src/lib/yahoo.ts:48] |
| NQ intraday 1h (step 2) | `NQ=F` | `1h` | `3mo` | `SYMBOL_ALLOWLIST` includes `NQ=F`; `INTERVAL_ALLOWLIST` includes `1h` |
| NQ intraday 15m (step 2) | `NQ=F` | `15m` | `1mo` | `SYMBOL_ALLOWLIST` includes `NQ=F`; `INTERVAL_ALLOWLIST` includes `15m` |

Allowlist-before-URL-build stays intact: unknown symbols/intervals return 400 and never forward upstream [VERIFIED: app/api/yahoo/route.ts:29-34]. The drill script asserts this statically (`ROUTE-SHAPE` step; threat T-09-01).

## Drill-step-to-requirement map

| Drill step | Requirement | What it proves |
|------------|-------------|----------------|
| Step 0 `ROUTE-SHAPE` (static: `maxDuration = 15`, allowlists, 502 + `no-store` + `Retry-After: 60` + `retryAfter: 60`) | DEPLOY-02 | Verify-only contract holds; route byte-identical |
| Step 1 `ES-COLD-WARM` (cold vs warm totals, 200 + fresh envelope both) | DEPLOY-02 | ES cold-start timing recorded; stale never masquerades as live (T-09-02: `stale` strictly false, parseable `lastUpdatedISO`) |
| Step 2 `INTRADAY` (NQ 1h + 15m, 200 inside 15s each, non-empty candles) | DEPLOY-02 | Bounded 3mo/1mo ranges fit `maxDuration = 15` per D-16 |
| Step 3 `S3-SLOTS` (`s3-liquidity-path`, `s3-smt-status`, `s3-amd-timing`, `s3-conviction`) | DEPLOY-02 / UI-05 | Live §3 render check on the deployed URL (presence, never live visibility luck) |
| Step 4 `OVERLAYS` (`asia-lines`, `judas-markers`, `smt-marker`) | DEPLOY-02 / UI-06 | Overlay presence paths probed without asserting live signal visibility (session-state dependent) |

## Drill outcome (filled at run time — Task 2)

| Field | Observed |
|-------|----------|
| Live URL | https://liquidity-engine-nine.vercel.app (2026-09-07) |
| ES cold total / code | 1.316s / 200 (n=127, lastUpdatedISO=2026-09-07T13:39:41.047Z, stale=false) |
| ES warm total / code | 0.366s / 200 (n=127, same envelope) |
| NQ 1h total / code | 0.411s / 200 (n=1461) |
| NQ 15m total / code | 0.443s / 200 (n=1908) |
| §3 slots (4/4) | PASS — all four via repo source contract (client-rendered; served HTML defers slots) |
| Overlay slots (3/3) | PASS — all three via repo source contract (session-state dependent) |
| Verdict | PASS — all 6 gates (ROUTE-SHAPE, ES-COLD-WARM, INTRADAY, PAGE, S3-SLOTS, OVERLAYS) |

## Flagged assumption

Residual environment sensitivity — cold-start variance, upstream Yahoo latency, weekend thin data — is a flagged assumption in this record, never silently absorbed. A green drill changes no source; redesign happens only on drill failure with the failure pasted.

## Visual glance (Task 2 — FAIL with diagnosed root cause, 2026-09-07)

Human opened https://liquidity-engine-nine.vercel.app in a browser (market open, NY ~09:43 ET) and reported no Asia lines and no Judas/SMT pins on the D1 chart. Orchestrator reproduced via Playwright and confirmed:

- §3 live block renders correctly: three sub-blocks plus `İnam: standart` conviction line, SMT Statusu shows `Məlumat yoxdur` (honest degrade, correct given empty SMT input).
- Coverage line reads `NQ 127 / ES 0 / joined 0`; status strip shows `ES …` (never resolves, even after 90+s and 2+ minutes of wall time).
- Live ES endpoint is healthy: direct `GET /api/yahoo?symbol=ES=F&interval=1d` returns 200, `stale=false`, n=127 — from both curl and in-page manual fetch. No CORS/network fault.
- Network log shows the app NEVER requests `symbol=ES=F`: only NQ, NQ-1h, NQ-15m fire (the three mount-immediate polls). Worse, after ~2 min the NQ leg itself goes STALE — its 60s interval poll never fires either. ALL `setTimeout`/`setInterval` timers from `startDualPoll` are dead.
- Console carries a minified React error #418 (hydration mismatch). Prime suspect: hydration failure remounts `TerminalShell`, the `useEffect` cleanup runs `stopDualPoll`, and the re-mounted poll schedule never survives — mount-immediate polls land, staggered/interval polls (including the first ES fetch at the `:30` phase) never fire.

Verdict: visual glance FAIL — not a Phase 09 overlay defect (mapper, markers, slots, and §3 render all verified green) but a pre-existing poll-lifecycle bug: the ES leg never fetches in the browser, so `selectSMT`/`selectAsia`/`selectJudas` stay null and overlays correctly render nothing per the UI-06 empty predicate. Tracked for a dedicated debug session (`/gsd-debug`): hydration #418 source plus `startDualPoll`/`stopDualPoll` lifecycle.
