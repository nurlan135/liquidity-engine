---
phase: 15-why-now-trigger-engine
plan: '03'
subsystem: ict-trigger
tags: [trigger, prose-lock, firing-log, serializer, calibration, zustand, vitest]

# Dependency graph
requires:
  - phase: 15-why-now-trigger-engine
    provides: [evaluateTrigger pure three-gate fusion, ARMED matrix plus cooldown plus FVG downgrade, selectTrigger with firing log]
provides:
  - Verbatim D-09 Azerbaijani prose locked with toBe pins plus full SMT suffix matrix
  - Hardened firing-log slice: cap 50 plus oldest-drop plus overflow, FIRE per-session dedup, already-fired downgrade-repeat skip
  - Pure firingLogToJson calibration serializer with threshold versions plus exportedAt (Phase 17 Blob seam)
  - Live end-to-end store tests: stale plus empty refusal, shared-epoch coherence, FIRE path with log entry, cap plus dedup plus serializer shape
  - TRIG-04 CALIBRATION-PROVISIONAL source-comment pins on every TRIGGER constant
affects: [16-flaw-snapshot, 17-ticket-plus-ui, 18-verification-plus-calibration]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 6132
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [verbatim-prose-lock-with-suffix-matrix, bounded-log-with-overflow-counter, pure-calibration-serializer-seam, live-selector-fixture]

key-files:
  created:
    - .planning/phases/15-why-now-trigger-engine/15-03-SUMMARY.md
  modified:
    - src/lib/ict/trigger.test.ts
    - src/lib/store.ts
    - src/lib/store.test.ts

key-decisions:
  - "No trigger.ts source changes — the 15-01 tracer constants already carry the locked D-09 sentences byte-for-byte, so Task 1 is pin-only"
  - "FiringLogEntry stays defined in trigger.ts with a store re-export — moving it would force trigger.ts to import from the store, a purity-guard violation"
  - "firingLogToJson is a module-scope pure function in store.ts, not a store member — Phase 17 Blob/anchor click consumes the string without reshaping"
  - "appendFiringLog owns all log policy (WAIT skip, FIRE dedup, downgrade-repeat skip) — selectTrigger delegates unconditionally instead of re-implementing a verdict filter"
  - "Coherence test asserts gate-behavior difference under epoch move, not verdict-name equality — WAIT is verdict-stable across the killzone edge on quiet fixtures"

patterns-established:
  - "Suffix-matrix prose pins: bare FIRE_LONG on null SMT, bare FIRE_SHORT on discordant plus suppressed SMT, agree suffix on ARMED_MISSING_TIMING plus ARMED_ALREADY_FIRED, bare ARMED plus WAIT on suppressed SMT"
  - "seedTriggerFire live fixture: Asia-anchored 1H plus killzone 15M sweep-plus-reversal plus D1 BULLISH gap plus 03:00 NY shared epoch yields FIRE_LONG end to end"
  - "TRIG-04 source pins via the eager raw-text import.meta.glob channel the purity guard already uses — no fs dependency, no new module declarations"

requirements-completed: [TRIG-02, TRIG-03, TRIG-04]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Verbatim Azerbaijani reasons pinned with toBe for all seven keys plus SMT suffix present and absent cases"
    requirement: "TRIG-02"
    verification:
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: D-09 verbatim prose lock with suffix matrix"
        status: pass
    human_judgment: false
  - id: D2
    description: "Firing log capped at 50 with oldest-drop plus overflow counter, FIRE deduped per NY-date session, WAIT and downgrade repeats never appended"
    requirement: "TRIG-03"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#trigger-cap: 51 ARMED appends cap at 50 with oldest dropped and overflow counted"
        status: pass
      - kind: unit
        ref: "src/lib/store.test.ts#trigger-fire: live London LOW sweep fires FIRE_LONG and appends one log entry"
        status: pass
    human_judgment: false
  - id: D3
    description: "firingLogToJson pure serializer with entries plus threshold versions plus exportedAt, no account/risk/position fields"
    requirement: "TRIG-03"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#trigger-serializer: firingLogToJson holds entries plus thresholds plus exportedAt"
        status: pass
    human_judgment: false
  - id: D4
    description: "selectTrigger stale plus empty refusal, shared-epoch coherence with selectAMD, FIRE path with full log entry shape"
    requirement: "TRIG-02"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#trigger-stale: stale nq15m or nq1h forces selectTrigger null"
        status: pass
      - kind: unit
        ref: "src/lib/store.test.ts#trigger-coherence: selectTrigger shares its epoch with selectAMD on the same poll"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every TRIGGER constant carries a CALIBRATION-PROVISIONAL comment plus value pins"
    requirement: "TRIG-04"
    verification:
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: calibrated constants pinned"
        status: pass
    human_judgment: false

# Metrics
duration: 30min
completed: 2026-09-11
status: complete
---

# Phase 15 Plan 03: Polish Summary

**Verbatim prose locked with suffix matrix, firing log hardened with cap plus dedup plus pure calibration serializer, live selector tests green — 344/344 full suite with purity guard clean**

## Performance

- **Duration:** 30 min
- **Started:** 2026-09-11T09:25:00Z
- **Completed:** 2026-09-11T09:55:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- All seven D-09 Azerbaijani sentences verified byte-for-byte against the plan text (15-01 constants already locked) and pinned with `toBe`, plus a six-case SMT suffix matrix: bare FIRE_LONG on null SMT, bare FIRE_SHORT on discordant and suppressed SMT, agree suffix on ARMED_MISSING_TIMING and ARMED_ALREADY_FIRED, bare ARMED plus WAIT on suppressed SMT
- `firingLogToJson` pure serializer ships entries plus threshold versions (`TRIGGER_DISP_MULT` 0.5, kz 120/300) plus caller `exportedAt`, with a T-15-07 guard asserting no account/risk/position fields — Phase 17 Blob/anchor click consumes the string without reshaping
- Firing-log slice hardened: WAIT never appends, FIRE deduped per NY-date session, already-fired downgrade repeats skipped (no per-poll spam), 51 ARMED appends cap at 50 with oldest dropped and overflow counter at 1
- `selectTrigger` delegates all log policy to `appendFiringLog` unconditionally — no selector-side verdict filter to drift
- Live `seedTriggerFire` fixture (Asia-anchored 1H, killzone 15M LOW sweep plus reversal, D1 BULLISH gap, 03:00 NY shared epoch) fires FIRE_LONG end to end with one full-shape log entry; same-session repeat poll downgrades to ARMED_ALREADY_FIRED with no second append
- TRIG-04: each TRIGGER constant pinned by value (`toBe`) plus a source-read `CALIBRATION-PROVISIONAL` comment assertion via the raw-text glob channel
- Gates green: trigger 38/38, store 33/33, purity 2/2, full suite 32 files / 344 tests, `npx tsc --noEmit` clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Verbatim Azerbaijani prose plus reasonKey mapping per D-09** - `9b24b1e` (feat)
2. **Task 2: Firing-log slice hardening plus firingLogToJson serializer per D-07 D-08** - `6d74738` (feat)
3. **Task 3: Store selector plus serializer tests plus TRIG-04 calibration pins plus purity green** - `aa8aefe` (feat)

**Plan metadata:** orchestrator-owned (STATE.md/ROADMAP.md writes excluded per execution brief)

## Files Created/Modified

- `src/lib/ict/trigger.test.ts` - +172 lines: D-09 suffix-matrix describe (6 tests) plus TRIG-04 source-comment pin (31 baseline + 7 new = 38)
- `src/lib/store.ts` - +55/−6: `FiringLogEntry` re-export, `FiringLogCalibration` interface, pure `firingLogToJson`, downgrade-repeat skip, unconditional `appendFiringLog` delegation in `selectTrigger`, `TRIGGER_*` threshold imports
- `src/lib/store.test.ts` - +275 lines: `seedTriggerFire` live fixture plus trigger-stale, trigger-empty, trigger-coherence, trigger-fire, trigger-cap, trigger-serializer (27 baseline + 6 new = 33)

## Decisions Made

- No trigger.ts source changes in this plan — the 15-01 tracer shipped the locked D-09 sentences byte-for-byte, so Task 1 pins rather than rewrites (verified with a codepoint comparison script before editing).
- `FiringLogEntry` stays defined in trigger.ts with a store re-export — moving the definition would force trigger.ts to import from the store, violating the purity guard the plan requires green.
- `firingLogToJson` is a module-scope pure function, not a store member — Phase 17's download click consumes the string without reshaping, per the RESEARCH Pattern 5 seam.
- `appendFiringLog` owns all log policy — selectTrigger calls it unconditionally so the WAIT skip, FIRE dedup, and downgrade-repeat skip live in exactly one place.
- Coherence test asserts gate-behavior difference under an epoch move (not verdict-name equality): WAIT is verdict-stable across the killzone edge on quiet fixtures — one fix attempt taught this, see Issues Encountered.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed `trigger.ts?raw` TS2307 type error in the TRIG-04 pin**
- **Found during:** Task 3 (tsc gate after adding the source-comment pin)
- **Issue:** `import('./trigger.ts?raw')` has no type declarations, failing `npx tsc --noEmit`
- **Fix:** Reused the eager raw-text `import.meta.glob('./trigger.ts', { query: '?raw', import: 'default', eager: true })` channel the co-located purity guard already typechecks with — no fs dependency, no new module declarations
- **Files modified:** src/lib/ict/trigger.test.ts
- **Verification:** `npx tsc --noEmit` clean, trigger suite still 38/38
- **Committed in:** aa8aefe (part of task commit)

**2. [Rule 3 - Blocking] Fixed `typeof import(...)` constraint error on seedTriggerFire param**
- **Found during:** Task 3 (tsc gate after adding the live fixture helper)
- **Issue:** `Awaited<ReturnType<typeof import('@/src/lib/store')>>` misuses a module namespace as a function type, failing `npx tsc --noEmit`
- **Fix:** Indexed the store hook directly: `typeof import('@/src/lib/store')['useDashboard']`
- **Files modified:** src/lib/store.test.ts
- **Verification:** `npx tsc --noEmit` clean
- **Committed in:** aa8aefe (part of task commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes are test-typing repairs with zero behavior impact. No scope creep.

## Issues Encountered

- Coherence test first draft asserted a verdict-name flip (WAIT → ARMED_MISSING_TIMING) when moving the shared epoch out of the killzone — but the quiet `stubFourLegs` fixtures hold WAIT (1 gate) on both sides of the edge, so the assertion failed with `expected false to be true`. Repaired by asserting the honest signal instead: the carried AMD snapshot equals the same-poll direct `selectAMD()` derivation before and after the move (desync-proof), plus the timing-gate flip is covered where it is observable. One fix attempt, then green.
- Scratch verification files (`store-1503-scratch.test.ts` twice) were created to prove the fixture chain and Task 2 behavior, then deleted before committing — no scratch artifacts in any task commit.
- Windows/PowerShell environment: `head`/`tail`/`wc` unavailable — used `Select-Object -Last` and file-redirect idioms for output slicing. Vitest log lines carry ANSI escapes that wrap `Select-String` matches; summary-line extraction via saved log files plus `Out-String` fallbacks. No impact on deliverables.
- HEAD is on `main`, but project config sets `git.branching_strategy: "none"` and the 15-01/15-02 waves committed directly to `main` — per-project convention, committing here is intended, not drift.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for Phase 16 (fatal-flaw invalidation): `TriggerOutput` stays serializable (plain `FvgGap` data, verdict plus gates plus reasonKey), the firing log carries per-session FIRE keys the flaw snapshot can join against, and `firingLogToJson` exports the threshold versions flaw reviews map fires to.
- Ready for Phase 17 (paper ticket plus §§4–6 UI): `entryFvg` preserves the full ticket handle (polarity, top/bottom, originDate, mitigated false) on every FIRE, and the serializer string is the untouched download-click seam.
- Ready for Phase 18 (verification plus calibration): gate booleans plus reasonKeys plus session keys on every entry reconstruct verdicts bar-by-bar; the 1–4 fires/week band is checkable from the log plus JSON export.
- Threat posture unchanged: no new network endpoints, auth paths, file access, or schema changes — T-15-06 holds (deterministic sentences, `toBe` pins, single fixed SMT suffix), T-15-07 holds (serializer payload plus no-account-fields guard), T-15-08 holds (purity 2/2 green), T-15-SC holds (zero new packages).

---
*Phase: 15-why-now-trigger-engine*
*Completed: 2026-09-11*

## Self-Check: PASSED

- Task commits exist: `9b24b1e`, `6d74738`, `aa8aefe` (all in `git log`)
- Trigger suite 38/38, store suite 33/33, purity 2/2 at commit time; full suite 344/344; tsc clean
- SUMMARY.md on disk at `.planning/phases/15-why-now-trigger-engine/15-03-SUMMARY.md`
- No modifications to STATE.md or ROADMAP.md (orchestrator-owned)
