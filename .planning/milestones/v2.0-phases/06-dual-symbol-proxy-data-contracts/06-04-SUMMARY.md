---
phase: 06-dual-symbol-proxy-data-contracts
plan: 04
subsystem: proxy-data-contracts
tags: [dual-store, staggered-polling, per-leg-stale, coverage-debug-line, DATA-06, DATA-05, DATA-07]
dependency_graph:
  requires: [06-02-fetchIntraday-leg, 06-03-timestamp-inner-join]
  provides: [dual-leg-store, staggered-timers, per-leg-strip, coverage-line]
  affects: [phase-07-smt-selectors]
tech_stack:
  added: []
  patterns: [per-leg-singleflight, state-held-schedule-probe, warn-never-refuse, vocabulary-reuse-strip]
key_files:
  created: []
  modified: [src/lib/store.ts, src/lib/store.test.ts, components/dashboard/status-strip.tsx, components/dashboard/terminal-shell.tsx, src/terminal-shell.test.ts]
decisions:
  - ES :30 offset uses ((60 - sec) % 60) + 30 phase form, not (90 - sec) % 60 which zero-traps at :30
  - Stagger offsets recorded in zustand state (lastSchedule), never a module-level probe cell
  - Strip per-leg segments reuse deriveStatus plus formatStripAge vocabulary; no new status enum
metrics:
  duration: ~60 min
  completed: 2026-09-06
  tasks: 3
  commits: 2
status: complete
requirements-completed: [DATA-06, DATA-05, DATA-07]
actuals:
  tokens: 41250
  tasks: 3
  commits: 2
  plan_head_before: aec6b56b24d62e5d980dcf2d23b7b0c35871107
  commits_actual: 2
coverage:
  DATA-06:
    - truth: Dual-symbol polling staggers with NQ at second 00 and ES at second 30 plus 5 to 10 second jitter on independent store timers, never a coupled fetch
      verified_by: stagger test pins schedule windows plus end-to-end fire sweep showing ~30s separation; no Promise.all anywhere in store.ts
    - truth: One leg failing marks only that leg stale and preserves its last-known rows while the other leg stays live, with no merged stale boolean anywhere
      verified_by: independent-failure test — ES throw sets es.stale true with rows preserved, nq.stale false, top-level stale false, no staleMerged key
    - truth: Existing single-leg shell, strip, and poll-loop assertions keep passing with the NQ daily path unchanged
      verified_by: all 14 pre-existing store tests plus W2 header/closed, rollover, levels, toast, and grid suites green unmodified in behavior
  DATA-05:
    - truth: Coverage diagnostics ride in the data with a dev debug line
      verified_by: coverage field in store state plus join-coverage line rendering NQ 20 / ES 17 / joined 14 on fixture legs
    - truth: The join warns never refuses
      verified_by: computeCoverage always returns counts via innerJoinOnTimestamp; invalid coverage degrades to zeroed object, never throws
  DATA-07:
    - truth: Comparisons use joined rows via the Plan 03 join
      verified_by: store coverage test joins fixture legs to joined 14 dropped 7; join consumed unmodified with date-string projection solely for the join call
---

# Phase 06 Plan 04: Dual-Leg Store Summary

Dual-leg Zustand store with staggered always-on timers (NQ at :00, ES at :30, 5–10s jitter), independent per-leg stale envelopes with no cross-substitution, paired per-leg strip ages in the existing Azerbaijani vocabulary, and a dev coverage debug line — with every pre-existing shell and poll assertion still green.

## What Was Built

**Task 1 — dual-leg store with staggered refreshers and per-leg envelopes (4fcf919):** `src/lib/store.ts` keeps every legacy top-level NQ field (`candles`, `contractHint`, `lastUpdatedISO`, `stale`, `source`, `inFlight`, `refresh`) with exact current semantics and adds `nq`/`es` leg states (candles, contractHint, lastUpdatedISO, stale, source, lastError), `inFlightNQ`/`inFlightES` booleans, `refreshNQ`/`refreshES` (bare `/api/yahoo` and `?symbol=ES=F&interval=1d`, each with own singleflight, own `isValidEnvelope` guard, own catch marking only that leg stale), `startDualPoll`/`stopDualPoll` (two always-on 60s timers, offsets from wall clock, no visibility gating, no Promise.all), `coverage` (Plan 03 `innerJoinOnTimestamp` over a date-string-to-midnight-UTC projection used solely for the join call; T-06-02 guard keeps joined bounded by the smaller leg), and `lastSchedule` (offsets in state so tests read the same instance that started the timers). All D1 anchor selectors read the raw NQ array exactly as before. `src/lib/store.test.ts` gains 5 stubbed-fetch fake-timer cases: stagger windows plus end-to-end ~30s fire separation, ES-only stale with NQ live and rows preserved, same-leg coalescing with cross-leg independence, fixture-leg coverage joined 14 dropped 7, stopDualPoll halting all fetches.

**Task 2 — per-leg strip ages plus coverage debug line in shell (994c7cb):** `components/dashboard/status-strip.tsx` derives status independently per leg with `deriveStatus` plus `formatStripAge` (no new enum): paired line `NQ <age> · ES <age>` with tabular-nums, LIVE legs showing the locked `LIVE · …` copy inline, STALE legs the locked `STALE · … — son keş göstərilir` copy inline, either-leg CLOSED keeping the weekend ribbon, overall freshness worst-of-legs, legacy single-leg copy only when neither leg has landed. `components/dashboard/terminal-shell.tsx` replaces the visibility-gated 60s loop with `startDualPoll` on mount / `stopDualPoll` on unmount, keeps the Yenilə button on the NQ path and mount-owns-first-poll, and adds the dev-only `join-coverage` line (`NQ n / ES e / joined j`, muted styling, always present in data). `src/terminal-shell.test.ts`: dual-loop ownership suite replaces the visibility-gated suite (mount NQ fetch, staggered timers fire with no visibility gating, stopDualPoll halts), W2 header cases re-pinned to per-leg segments, plus 3 new D-04/D-13 cases (paired ages, stale-leg independence with no merged boolean, coverage line pinned counts).

**Task 3 — phase gate (no commit, evidence only):** full suite 22 files 163/163 green; `tsc --noEmit` shows zero output lines (no error in any file, including the previously-noted `app/layout.tsx` residual which did not appear in this run); purity grep over join files exits 1 (no wall-clock reads); smoke against the running dev server: bare NQ 200 (NQ=F · CME, 126 rows, cache), ES daily 200 (ES=F · CME, 126 rows, cache), ES 1h 502 honest `upstream chart error payload` with `retryAfter 60` (Yahoo-side outage, envelope shape honest — no stale fabrication).

## Verification

- `npx vitest run src/lib/store.test.ts`: 19/19 green (14 pre-existing + 5 new)
- `npx vitest run src/terminal-shell.test.ts src/lib/status-strip.test.ts src/lib/store.test.ts`: 47/47 green
- `npm test` full suite: 22 files, 163/163 green (154 baseline + 9 new: 5 store + 4 shell; one shell case replaced, net suite restructure covered)
- `npx tsc --noEmit`: zero output — no error in any file
- Purity grep over `src/lib/ict/join.ts` + `join.test.ts`: no match (exit 1)
- Smoke: bare NQ 200, ES daily 200, ES 1h 502 (honest upstream-error envelope)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ES stagger offset zero-trapped at :30**
- **Found during:** Task 1, stagger test probe (`delayES` ~7s instead of ~67s at :30)
- **Issue:** `(30 - sec + 60) % 60` evaluates to 0 at sec 30, so the ES timer fired immediately instead of a full 60s out
- **Fix:** `(((60 - sec) % 60) + 30)` phase form — keeps the +30s phase without the zero-trap
- **Files modified:** src/lib/store.ts
- **Commit:** 4fcf919

**2. [Rule 1 - Bug] Test-only clock reads under fake timers**
- **Found during:** Task 1, stagger schedule assertions reading wall-clock seconds instead of the injected pin
- **Issue:** `getUTCSeconds()` on the injected Date still reflected mocked time inconsistently across setup orderings
- **Fix:** epoch-derived `sec`/`ms` from `getTime()` with positive-modulo guard, plus injectable `nowArg` clock and jitter pinned via `Math.random` spy in tests
- **Files modified:** src/lib/store.ts, src/lib/store.test.ts
- **Commit:** 4fcf919

**3. [Rule 3 - Blocking] Shell visibility-gated poll suite obsolete under D-03**
- **Found during:** Task 2, `polls once per 60s while visible and pauses while hidden` failing against always-on timers
- **Issue:** Plan mandates always-on polling (D-03); the old pause-while-hidden test contradicts the new contract
- **Fix:** replaced with a dual-loop ownership suite (mount NQ fetch, staggered timers fire hidden-or-visible, stopDualPoll halts); W2 header cases re-pinned to per-leg segments
- **Files modified:** src/terminal-shell.test.ts
- **Commit:** 994c7cb

## Decisions Made

- ES :30 offset uses the `((60 - sec) % 60) + 30` phase form — the naive `(90 - sec) % 60` zero-traps exactly at :30
- Stagger offsets recorded in zustand state (`lastSchedule`), never a module-level probe — `vi.resetModules` re-imports would hand back a stale cell
- Strip per-leg segments reuse `deriveStatus` + `formatStripAge` vocabulary inline (LIVE/STALE copies per segment) — no new status enum, weekend ribbon preserved
- ES 1h 502 during smoke is an honest upstream outage (`retryAfter 60`), not a plan failure — the route never fabricates stale intraday data

## Known Stubs

None.

## Threat Flags

None — no new surface beyond the plan threat model. T-06-03 mitigated by per-leg singleflight plus :00/:30 stagger plus jitter with uniform 60s cadence and always-on timers (no coupled fetch). T-06-02 mitigated by per-leg `isValidEnvelope` application plus the coverage guard (finite non-negative integers, joined bounded by the smaller leg), malformed legs rejected without touching the healthy leg. T-06-SC: no new packages; package.json unchanged.

## Self-Check: PASSED

- store.ts, store.test.ts, status-strip.tsx, terminal-shell.tsx, terminal-shell.test.ts exist on disk
- Commits 4fcf919, 994c7cb exist in git log
- Full suite 163/163 green at gate time; post-commit deletion check clean; no untracked files left
