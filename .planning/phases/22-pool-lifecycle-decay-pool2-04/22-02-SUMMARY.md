---
phase: 22-pool-lifecycle-decay-pool2-04
plan: '02'
subsystem: pools-scorer
tags: [pools, decay, lifecycle-invariants, parity, purity, vitest]

requires:
  - phase: 22-01
    provides: DECAY_HALF_LIFE_BARS=10 and DECAY_SCORE_FLOOR=0.25 plus poolAgeBars/poolDecay plus scoreAndRank asOf threading plus decayFactor ledger
provides:
  - Stored-weight/touches identity, double-run determinism, SWEPT-ghost-order, and time-order pins in pools.test.ts
  - Green pools-parity exit gate proving decay never votes on trigger/flaw/ticket
  - Green purity gate proving no clock reads or store imports in new helpers
  - Green selectPools stale/thin envelope matrix proving the selector contract byte-stable
affects: [22-03-sandbox, 23-tp2-resolver]

actuals:
  tokens: 1712
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns: ["stored-inventory identity pin (pre/post weight+touches compare)", "double-run JSON.stringify determinism pin", "ghost-order pin (SWEPT unscored, inactive originDate-sorted tail)", "two-asOf time-order pin (earlier date outscores later date)"]

key-files:
  created: []
  modified: [src/lib/ict/pools.test.ts]

key-decisions:
  - "Tasks 2 and 3 are verify-only gates: zero source edits, so they carry no commits — the single test-file commit is the plan's only code change"
  - "Time-order pin uses two injected asOf dates on the same pool rather than clock reads, keeping the purity discipline intact"

patterns-established:
  - "Invariant pins sit inside the existing describe('pool decay') block beside the Wave 1 boundary pins — one block, full lifecycle semantics"
  - "Gate tasks (parity/purity/selector) re-run the harness green without fixture or tolerance edits; any red would have stopped the plan, not retuned the gate"

requirements-completed: [POOL2-04]

coverage:
  - id: D1
    description: "Lifecycle invariant pins — stored-weight identity, double-run determinism, SWEPT ghost order, two-date time ordering"
    requirement: "POOL2-04"
    verification:
      - kind: unit
        ref: "src/lib/ict/pools.test.ts#pool decay"
        status: pass
    human_judgment: false
  - id: D2
    description: "Parity exit gate — pools-on vs pools-off trigger/flaw/ticket triple matches exactly with decay live"
    requirement: "POOL2-04"
    verification:
      - kind: integration
        ref: "src/lib/ict/pools-parity.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Purity gate — no Date.now reads, no store imports in ict helpers"
    requirement: "POOL2-04"
    verification:
      - kind: unit
        ref: "src/lib/ict/purity.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Selector envelope gate — selectPools stale/thin matrix unchanged with decay live"
    requirement: "POOL2-04"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#selectPools matrix"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-10-26
status: complete
---

# Phase 22 Plan 02: Lifecycle Invariants Summary

**Decay lifecycle pinned by test: stored-weight identity, double-run determinism, SWEPT-ghost ordering, and injected-asOf time ordering — with parity, purity, and selector gates all green on the full 528-test suite.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-10-26T09:58:00Z
- **Completed:** 2026-10-26T10:10:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Four lifecycle invariant pins added to the `pool decay` block: stored identity (young + ancient), double-run `JSON.stringify` equality, SWEPT-ghost order (no score entry, originDate-sorted tail), two-date time ordering (earlier asOf outscores later)
- Pools-parity harness re-run green with decay live: 6/6 tests, trigger/flaw/ticket triple exact match, zero source edits
- Purity guard green: 2/2, no `Date.now` reads, no zustand/store imports in new helpers
- selectPools matrix green unchanged: 48/48 in store.test.ts, full suite 528/528 across 42 files

## Task Commits

Each task was committed atomically:

1. **Task 1: Pin stored-weight identity plus double-run determinism plus ghost order** - `95e0fbc` (test)
2. **Task 2: Re-run parity harness and purity guard green with decay live** - verify-only, no commit (zero edits by design)
3. **Task 3: Verify selectPools stale thin envelope unchanged plus purity scan** - verify-only, no commit (zero edits by design)

## Files Created/Modified

- `src/lib/ict/pools.test.ts` - Four invariant pins appended to the `describe('pool decay')` block (68 insertions, no implementation changes)

## Decisions Made

- Tasks 2 and 3 are verify-only gates per the plan: they re-run existing harnesses without editing derivation, trigger, flaw, ticket, prose, chart, or selector code. A green run with a clean tree means no commit is owed — the single test-file commit from Task 1 is the plan's only code change.
- The time-order pin compares two injected `asOf` dates on the same pool and candle leg, so it proves decay time-ordering while the purity guard stays green (no clock reads introduced).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The first pools.test.ts run after the new pins passed 45/45 immediately — the Wave 1 scorer implementation needed no fixes. Parity (6/6), purity (2/2), store matrix (48/48), and the full suite (528/528) all passed on first run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 22-03 (sandbox sliders): decay semantics are fully pinned by unit tests, parity proves decay never votes, and the selector envelope is byte-stable.
- Phase 23 TP2 resolver inherits a locked decayed rank: `evaluatePools` threads `asOf` end-to-end and `scoreAndRank` stays a pure function of pools plus window plus `asOf`.
- No stubs, no skipped tests, no unrun verifies. No new threat surface: one test-file change, zero implementation files touched.

## Threat Flags

None - no new network endpoints, auth paths, file access, or schema changes. Only `src/lib/ict/pools.test.ts` changed; implementation files (`pools.ts`, `store.ts`, trigger/flaw/ticket/prose/chart/selector) untouched. T-22-02 pins hold (identity + determinism tests green); T-22-SC not applicable (zero new packages).

## Self-Check: PASSED

---
*Phase: 22-pool-lifecycle-decay-pool2-04*
*Completed: 2026-10-26*
