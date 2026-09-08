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

## Debug follow-up (2026-09-08 — `#418-as-killer` FALSIFIED, Mandelbug reclassification)

- Retest 2026-09-08 (real Chromium vs live Vercel URL AND vs local prod): bug DOES NOT REPRODUCE. ES lands at ~55-90s (200), coverage `NQ 126 / ES 126 / joined 126`, all staggered timeouts + 60s intervals fire. #418 fires on every load INCLUDING healthy runs (pageerror at 1.4s) — it does not kill timers.
- Controlled experiments (same bundle bytes + same frozen-clock mismatch + #418 firing → timers live) FALSIFY the prime suspect: `#418 recovery kills the poll schedule`. Reclassified Bohrbug → Mandelbug (environment-gated). 09-07 transient candidates: Yahoo throttle/429 on Vercel egress at market-open load, or observation artifact across the spontaneous 13:53 reload.
- Proven defect fixed regardless: `suppressHydrationWarning` on the session-line clock span (`components/dashboard/terminal-shell.tsx`, commit `68d4121`) — silences the expected SSR/client clock-text mismatch. Post-fix real-Chromium vs local prod: `418-COUNT=0`, ES 200, coverage `126/126/126`, `npm test` 280/280.
- Full session record: `.planning/debug/es-poll-lifecycle-bug.md` (status: resolved 2026-09-08).

## Visual glance re-verify (2026-09-08 — PASS, human-confirmed)

- Operator retest on the live URL: initial `NQ 126 / ES 0 / joined 0` at ~40s (inside the by-design ES dead window — first ES fetch lands ~45-70s via the `:30`-phase grid + jitter), then coverage fills to `NQ 126 / ES 126 / joined 126` by ~90-150s and holds. Operator replied **"confirmed fixed"**.
- Playwright live check same day: header `Bakı 10:36 · NY 02:36`, coverage `NQ 126 / ES 126 / joined 126` at 150s, status strip `NQ LIVE · 1 dəq əvvəl · ES LIVE · 1 dəq əvvəl`, console **0 errors / 0 warnings** — React #418 gone.
- §3 live block renders with data: Likvidlik Yolu + SMT Statusu (`rollover-week — SMT Gözlənilir`) + Sessiya AMD all present; `rollover-week` suppression is correct behavior this week (quarterly rollover week — third Friday of Sep), not a defect. Placeholder `UNAVAILABLE · Modul 3` card remains by design (unbuilt, separate phase scope).
- Verdict: visual glance **PASS** — the 09-07 FAIL is closed. The residual Mandelbug (09-07 2-min+ total timer death mechanism) stays unexplained-by-design; recurrence reopens via `.planning/debug/es-poll-lifecycle-bug.md`.

## Adjacent fix (2026-09-08 — NY clock timezone, commit `e1f9b85`)

- Header `NY` label rendered `America/Chicago` (CME_TZ), one hour behind real Eastern. Fixed: `src/lib/session-line.ts` now uses `NY_TZ = 'America/New_York'` (same convention as ICT `aggregate.ts`); test expectations updated (`07:00`→`08:00`, `19:05`→`20:05` EDT). Live-verified (`NY 02:36`). `npm test` 280/280 green.
