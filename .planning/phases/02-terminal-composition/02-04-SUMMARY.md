---
phase: 02-terminal-composition
plan: 04
subsystem: ui
tags: [report, blocked-side, terminal-shell, poll-loop, toast, zustand]

# Dependency graph
requires:
  - phase: 02-02
    provides: [status-strip, freshness-derivation, chart-overlays]
  - phase: 02-03
    provides: [sentiment-panel, calendar-panel, scenario-fixtures]
provides:
  - blocked-side-helper
  - report-contract
  - report-component
  - shell-integration
affects: [phase-03-deploy-verify, terminal-verification]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 8150
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-contract-constants, store-selector-report, visibility-gated-poll, coalesced-error-toast]

key-files:
  created:
    - src/lib/blocked-side.ts
    - src/lib/blocked-side.test.ts
    - src/lib/report.ts
    - src/lib/report.test.ts
    - components/dashboard/report.tsx
  modified:
    - components/dashboard/terminal-shell.tsx

key-decisions:
  - "Toast copy is a locked Azerbaijani literal; lastError text never reaches the toast surface (T-02-08)"
  - "Chart error row renders the same locked copy, not raw upstream text"
  - "Baku-clock pre-news override computed in Report via fixture resolver plus isPreNews"

patterns-established:
  - "Contract constants as pure modules with co-located tests (blocked-side, report)"
  - "Single poll owner: TerminalShell mounts refresh plus 60s visibility-gated interval; panels never fetch"
  - "Coalesced toast via lastError ref guard; one toast per error value, never stacked"

requirements-completed: [UI-01, UI-03, UI-04, DATA-03]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Report renders exactly 6 sections in fixed order with section 2 live and the rest dimmed UNAVAILABLE"
    requirement: "UI-03"
    verification:
      - kind: unit
        ref: "src/lib/report.test.ts#holds exactly 6 entries with only index 2 live (3 passed)"
        status: pass
      - kind: other
        ref: "grep data-slot report-section plus UNAVAILABLE in components/dashboard/report.tsx"
        status: pass
    human_judgment: true
    rationale: "No component render test exists; section order, dimming, and chip placement need dev-time visual confirmation"
  - id: D2
    description: "Blocked side derives from bias with struck-through magenta row and terse BLOCKED label"
    requirement: "UI-04"
    verification:
      - kind: unit
        ref: "src/lib/blocked-side.test.ts (3 passed: BULLISH/BEARISH/COMPRESSION)"
        status: pass
      - kind: other
        ref: "grep line-through in components/dashboard/report.tsx"
        status: pass
    human_judgment: true
    rationale: "Strike styling and label placement on the correct row are visual judgments requiring a dev render"
  - id: D3
    description: "Terminal shell composes header plus strip plus three panels with poll loop and coalesced toasts"
    requirement: "UI-01"
    verification:
      - kind: unit
        ref: "npm run test (18 files, 103 tests, all green)"
        status: pass
      - kind: other
        ref: "grep setInterval 60_000 plus visibilityState in components/dashboard/terminal-shell.tsx"
        status: pass
    human_judgment: true
    rationale: "Grid composition, single-column collapse below 1024px, and toast behavior need dev-time confirmation"

# Metrics
duration: ~35min
completed: 2026-09-05
status: complete
---

# Phase 02 Plan 04: Report plus Shell Integration Summary

**Six-section report with live section 2 and struck-through blocked side, composed into a fully wired TerminalShell owning the 60s visibility-gated poll loop with coalesced Azerbaijani failure toasts — full suite green at 103 tests.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-05T19:30:00Z
- **Completed:** 2026-09-05T20:05:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Blocked-side helper (`deriveBlockedSide`) plus report contract (`REPORT_SECTIONS`, `REGIME_BADGE`, `PRE_NEWS_BADGE`) pinned by 6 passing tests
- Report component with live section 2 (regime badge with pre-news override, position line, delivery-cycle line, DOL line, bias readout plus rationale, struck blocked side) and five dimmed UNAVAILABLE sections
- TerminalShell as single composition owner: StatusStrip plus SentimentPanel plus CalendarPanel plus Report plus NqChart, 60s visibility-gated poll effect, coalesced failure toasts with locked copy
- Full suite green: 18 files, 103 tests; typecheck clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Blocked-side helper plus report contract (RED)** - `5a562e8` (test)
2. **Task 1: Blocked-side helper plus report contract (GREEN)** - `4976622` (feat)
3. **Task 2: Report component with live section 2** - `3afa6bf` (feat)
4. **Task 3: Shell integration with poll loop and failure toasts** - `c57df57` (feat)

_Note: TDD task 1 has separate test → feat commits per the RED/GREEN cycle_

## Files Created/Modified

- `src/lib/blocked-side.ts` - BlockedSide union, BLOCKED label constants, deriveBlockedSide pure derivation
- `src/lib/blocked-side.test.ts` - 3 tests: BULLISH/BEARISH/COMPRESSION outcomes
- `src/lib/report.ts` - ReportSection interface, REPORT_SECTIONS (6 fixed, index 2 live), REGIME_BADGE, PRE_NEWS_BADGE
- `src/lib/report.test.ts` - 3 tests: length/order/live-at-2, title literals, badge mapping
- `components/dashboard/report.tsx` - Named Report export: header bias line, live section 2, struck blocked side, five dimmed UNAVAILABLE sections, skeletons plus Məlumat yoxdur states
- `components/dashboard/terminal-shell.tsx` - StatusStrip plus fixture panels plus Report composition, mount-plus-60s visibility-gated poll, coalesced error toasts, dimmed module rows, grid-cols-1 lg:grid-cols-[280px_1fr_320px]

## Decisions Made

- Toast copy is the locked Azerbaijani error string as a module constant; the raw `lastError` value drives only the coalescing guard, never the rendered copy (T-02-08 mitigation).
- The chart error row renders the same locked copy instead of the raw store error — consistent with the never-silent, never-raw-text rule.
- Report computes the pre-news badge override via the fixture resolver plus `isPreNews` at render, so section 2 reflects the active scenario's calendar window without touching the store.
- COMPRESSION renders both side rows dimmed with no strike since the bias rationale string already states both sides stand down (plan assumption A-u4).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Regenerated missing Next route types so tsc exits 0**
- **Found during:** Task 2 (Report component verify)
- **Issue:** `npx tsc --noEmit` failed with `app/layout.tsx(20,50): error TS2304: Cannot find name 'LayoutProps'` — pre-existing error on the base commit (untouched file), caused by the fresh worktree having no `.next` generated types. Same failure 02-02 and 02-03 recorded.
- **Fix:** Ran `npx next typegen` (generates gitignored `.next` types, modifies no source). No unrelated source files touched — scope boundary respected.
- **Files modified:** none (generated artifacts only, gitignored)
- **Verification:** `npx tsc --noEmit` exits 0 afterwards
- **Committed in:** n/a (no source change; documented here)

**2. [Rule 1 - Bug] Fixed toast manager call to the base-ui add API**
- **Found during:** Task 3 (Shell integration typecheck)
- **Issue:** First draft called `toast(message, { type })` as if the manager were callable — `ToastManager` exposes `.add(options)` with `title`/`description` fields, so tsc rejected the call.
- **Fix:** Replaced with `toast.add({ title: 'Xəta', description: POLL_FAILURE_COPY, type: 'error' })` after reading the installed `@base-ui/react` toast type definitions (never from recall).
- **Files modified:** components/dashboard/terminal-shell.tsx
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** c57df57 (part of task commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for typecheck/verification. No scope creep. Zero new installs (T-02-SC upheld).

## Issues Encountered

- Vitest prints a `configLoader: native` ESM warning banner on every run; harmless, tests execute and report normally. ANSI escapes garble Bash display, so results were verified via log files.
- No node_modules inside the worktree; tooling resolves from the parent repo's `node_modules` (verified via `node -e require.resolve`). No install was run.

## Threat Flags

None. No new network endpoints, auth paths, or installs. The poll effect reuses the existing `refresh` path at the proxy-matching 60s cadence with visibility gate plus singleflight (T-02-07 mitigation intact); toasts render locked copy only, never raw upstream text (T-02-08 mitigation intact).

## Known Stubs

None. Grep over new/modified files finds no TODO/FIXME/placeholder text; loading states render pulse skeletons and empty states render the documented Məlumat yoxdur copy.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 composition is complete: tracer store plus freshness strip plus zone overlays plus fixture panels plus report plus shell with poll loop — ready for end-of-phase verification.
- Visual confirmation still owed to the verifier per the validation strategy: 3-panel grid with dimmed modules, live chart zones plus EQ plus DOL, section 2 with struck blocked side, sentiment plus calendar scenario switching, STALE and CLOSED states, Azerbaijani copy throughout.

## Self-Check: PASSED

- All 5 created and 1 modified key files exist on disk.
- All 4 task commits exist in git log (5a562e8, 4976622, 3afa6bf, c57df57).

---
*Phase: 02-terminal-composition*
*Completed: 2026-09-05*
