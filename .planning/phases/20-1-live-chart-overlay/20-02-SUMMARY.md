---
phase: 20-1-live-chart-overlay
plan: '02'
subsystem: ui
tags: [selectPools, report-section, honest-empty, rank-1-sentence, zustand]

# Dependency graph
requires:
  - phase: 20-1-live-chart-overlay
    provides: Tracer section 1 live branch with rank-1 sentence plus shell fan-out plus BSL pair (20-01)
provides:
  - Full section 1 state matrix (live, swept tone, no-pools, stale-null, clean-null, thin) with distinct honest copy per state
  - Rank-1 sentence polish (mono tabular numerals, verbatim reason, inline hedge, throw-safe ATR)
affects: [20-03-chart-expansion, 21-calibration]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 740
  tasks: 2
  commits: 1
  plan_head_before: 9aa227bb850911caf23863dbe9b3c69546b72187

# Tech tracking
tech-stack:
  added: []
  patterns: [honest-empty matrix with distinct copy per degraded state, throw-safe display-only derivation in render]

key-files:
  created: []
  modified: [components/dashboard/report.tsx]

key-decisions:
  - "No-pools branch inherits the thin dim plus note — pools stay visible dimmed (D-07), never hidden"
  - "All rank-1 numerals unified under one mono tabular-nums span per UI-SPEC typography lock"
  - "ATR derivation wrapped throw-safe to empty copy — a selector throw blanks the sentence, never the section"
  - "rank1 typed structurally (side/top/bottom/status/optional reason) so the branch owns polish without touching pools.ts"

patterns-established:
  - "Section-1 no-pools thin state: same opacity-45 plus thin-note wrap as the live branch"

requirements-completed: [S1-01, S1-02, S1-03]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Section 1 with zero ACTIVE pools renders the distinct no-pools line, never confident prose over the gap"
    requirement: "S1-02"
    verification:
      - kind: unit
        ref: "src/terminal-shell.test.ts (degraded suites) + src/lib/report.test.ts — 26/26 green, full suite 458/458"
        status: pass
    human_judgment: false
  - id: D2
    description: "Section 1 rank-1 live sentence names side, zone bounds, ATR distance, swept status, and the verbatim reason with the inline hedge"
    requirement: "S1-01"
    verification:
      - kind: unit
        ref: "src/lib/report.test.ts + tsc --noEmit + eslint clean"
        status: pass
    human_judgment: false
  - id: D3
    description: "Section 1 on thin history keeps pools visible dimmed at opacity-45 with the thin note, never hidden"
    requirement: "S1-02"
    verification:
      - kind: unit
        ref: "src/terminal-shell.test.ts levels-thin-honest + full suite 458/458"
        status: pass
    human_judgment: false
  - id: D4
    description: "Verbatim Azerbaijani pool reasons wrap inside panel flow without truncation or horizontal scroll"
    verification: []
    human_judgment: true
    rationale: "Held-out visual backstop per plan — no explicit evidence at verify time; needs a human glance at the longest rank-1 sentence plus hedge pair"

# Metrics
duration: 35min
completed: 2026-09-16
status: complete
---

# Phase 20 Plan 02: Section 1 State Matrix Summary

**Full section 1 honest-empty matrix plus rank-1 sentence polish on the tracer branch — distinct copy per degraded state, unified mono numerals, throw-safe ATR, verbatim reason ahead of the inline hedge**

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-16T10:52:00Z
- **Completed:** 2026-09-16T11:27:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- No-pools branch inherits the thin `opacity-45` dim plus `İncə tarixçə…` note — thin dims but stays visible on every non-null path (D-07)
- Rank-1 sentence unifies side, zone bounds, ATR distance, and status under one `font-mono tabular-nums` span per the UI-SPEC typography lock (D-01)
- ATR distance derivation wrapped throw-safe to empty copy — a selector throw blanks the sentence, never the section (D-20)
- Verbatim pool reason threads into the sentence ahead of the inline hedge; banned out-of-scope copy (pool-gated FIRE, heatmap, LLM narrative) confirmed absent
- Full suite stays green: 40 files, 458 tests — matches the Phase 19 baseline

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Section 1 honest-empty matrix plus rank-1 polish** - `37c9f6f` (feat)

Both plan tasks touch the same `section.index === 1` branch in one file, so they landed as a single atomic commit covering the no-pools thin dim (Task 1) and the sentence polish (Task 2).

## Files Created/Modified

- `components/dashboard/report.tsx` - No-pools thin dim plus note; unified mono tabular numerals; throw-safe ATR derivation; verbatim reason ahead of hedge

## Decisions Made

- No-pools branch inherits the thin dim plus note — D-07 says pools stay visible dimmed and never hidden, and the dim discipline applies to every non-null selection path, not just the live sentence.
- All rank-1 numerals unified under one mono tabular-nums span — UI-SPEC locks all numeric copy (zone bounds, ATR distance, prices) to mono tabular figures; the tracer had mono on ATR only.
- ATR derivation wrapped throw-safe to empty copy — plan Task 2 requires the derivation to throw-safe to empty copy rather than blanking the section; a single try/catch around the rank-1 derivation owns this.
- rank1 typed structurally (side/top/bottom/status/optional reason) — keeps the branch's polish local without touching the read-only `LiquidityPool` consumer contract in pools.ts (D-20 purity guard).

## Deviations from Plan

None - plan executed exactly as written. The tracer (20-01) had already shipped the skeleton / null-selector leg-error chain / no-pools line / thin dim / rank-1 sentence shape; this plan's two tasks extended that branch only: Task 1 added the missing no-pools thin dim, Task 2 unified numerals, hardened ATR, and threaded the verbatim reason.

## Issues Encountered

- First tsc pass failed: the structural `rank1` type declared `reason: string | undefined` as required, which `LiquidityPool` (no reason field) cannot satisfy. Fixed by marking `reason` optional (`reason?`). tsc plus eslint clean after.
- PowerShell environment note: `head`/`tail` pipe aliases are unavailable — used `git diff --stat` and direct `npx vitest run` output instead.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: none | — | No new surface beyond the plan's threat register: T-20-04 accepted (same NQ-leg verbatim error already prints in sections 3 and 5); T-20-05 mitigated (null renders empty copy only, confident prose unreachable over a nulled selector); no package installs (T-20-SC gate not triggered) |

## Known Stubs

None — no hardcoded empty values, placeholder text, or unwired components. The nearest-2-per-side / SSL-leg / swept-ghost chart scope stays an intentional cut for 20-03.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Section 1 prose matrix complete: 20-03 (nearest-2-per-side BSL/SSL pairs plus swept ghosts on the chart) builds directly on the unchanged prop surface and branch shape
- Visual backstop open: verbatim Azerbaijani reason wrap needs one human glance at the longest rank-1 sentence plus hedge pair (coverage D4)
- Open tie flagged in the plan assumptions (equal-distance rank tie) stays deferred to Phase 21 calibration — untouched

---
*Phase: 20-1-live-chart-overlay*
*Completed: 2026-09-16*

## Self-Check: PASSED

- `components/dashboard/report.tsx` exists; section 1 branch carries the thin-dimmed no-pools block, unified mono span, and verbatim reason
- Commit `37c9f6f` exists; full suite 458/458 green; banned-copy grep clean
- Shared orchestrator artifacts untouched (STATE.md, ROADMAP.md not staged or committed by this agent)
