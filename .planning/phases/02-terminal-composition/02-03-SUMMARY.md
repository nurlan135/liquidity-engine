---
phase: 02-terminal-composition
plan: 03
subsystem: terminal-fixtures
tags: [fixtures, sentiment, calendar, shape-guard, true-avg, countdown]

# Dependency graph
requires:
  - phase: 02-01
    provides: [dashboard-store, sentiment-lib, countdown-lib]
provides:
  - scenario-fixtures
  - fixture-guard
  - scenario-resolver
  - sentiment-panel
  - calendar-panel
affects: [02-04-fixtures, terminal-shell-integration]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 4122
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [static-json-import, hand-rolled-shape-guard, injected-clock-resolver, store-driven-scenario]

key-files:
  created:
    - src/lib/fixtures/crowded-long.json
    - src/lib/fixtures/crowded-short.json
    - src/lib/fixtures/balanced.json
    - src/lib/fixture-guard.ts
    - src/lib/fixtures.test.ts
    - components/dashboard/sentiment-panel.tsx
    - components/dashboard/calendar-panel.tsx
  modified: []

key-decisions:
  - "Fixture events store startsAtOffsetHours, resolved to ISO at render with injected now — countdowns stay fresh forever"
  - "Unknown scenario values fall back to crowded-long in both panels, matching the store default"
  - "Calendar ticker lives isolated in CalendarPanel on a 30s interval; no store or global re-render"

patterns-established:
  - "Static JSON import plus hand-rolled guard before render (Phase 1 Yahoo shape-guard precedent)"
  - "Scenario selection reads store scenario id only; panels never rewrite the store"

requirements-completed: [MOCK-01, MOCK-02, MOCK-03]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Three scenario snapshots with guard plus resolver, crowded outcomes pinned"
    requirement: "MOCK-01"
    verification:
      - kind: unit
        ref: "src/lib/fixtures.test.ts (5 tests: crowded-long LONG>=60, crowded-short SHORT, balanced null, rejection paths, resolver anchoring, prose plus high-only)"
        status: pass
    human_judgment: false
  - id: D2
    description: "SentimentPanel with Broker rows, True AVG footer, crowded chip, three-button switcher"
    requirement: "MOCK-01"
    verification:
      - kind: unit
        ref: "npm run test -- sentiment (3 passed); npx tsc --noEmit (clean)"
        status: pass
    human_judgment: true
    rationale: "No component render test exists; visual scenario switching (footer swap, chip clear) needs dev-time confirmation per plan verification"
  - id: D3
    description: "CalendarPanel with countdowns, pre-news flags, static interpretation block"
    requirement: "MOCK-02"
    verification:
      - kind: unit
        ref: "npm run test -- calendar (3 passed); npx tsc --noEmit (clean)"
        status: pass
    human_judgment: true
    rationale: "No component render test exists; countdown ticking and flag display need dev-time confirmation per plan verification"
  - id: D4
    description: "Static Azerbaijani interpretation prose per scenario, never computed"
    requirement: "MOCK-03"
    verification:
      - kind: unit
        ref: "src/lib/fixtures.test.ts#every snapshot carries non-empty interpretation prose"
        status: pass
    human_judgment: false

# Metrics
duration: ~50min
completed: 2026-09-05
status: complete
---

# Phase 02 Plan 03: Fixture Panels Summary

**Three rotating scenario snapshots with a tested shape guard plus resolver, a SentimentPanel with True AVG footer plus crowded chip plus scenario switcher, and a CalendarPanel with Baku countdowns plus pre-news flags plus verbatim trap-vs-genuine prose.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-05T15:00:00Z
- **Completed:** 2026-09-05T15:50:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- crowded-long / crowded-short / balanced JSON snapshots with OANDA, Forex.com, IG rows plus InstaForex/FiboGroup exclusion rows, hour-offset high-impact events, and 2–4 sentence Azerbaijani interpretation prose
- `isScenarioFixture` guard (finite 0–100 percentages, rows summing to 100 within 0.01, high-only impact) plus `resolveScenario` anchoring offsets to any injected now, covered by 5 passing tests
- SentimentPanel reading store scenario with crowded-long fallback, mono percentages, exact True AVG footer copy, İZDİHAMLI chip, and Ssenari switcher with active indicator
- CalendarPanel with isolated 30s ticker, mono countdowns, XƏBƏR ÖNCƏSİ flags inside 24h, zero-events copy, and verbatim interpretation block
- Full suite green: 14 files, 86 tests; typecheck clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Fixture snapshots plus shape guard and resolver (RED)** - `4ac2dfd` (test)
2. **Task 1: Fixture snapshots plus shape guard and resolver (GREEN)** - `9875b49` (feat)
3. **Task 2: SentimentPanel with True AVG and scenario switcher** - `3fec4f7` (feat)
4. **Task 3: CalendarPanel with countdowns and interpretation prose** - `d41bb66` (feat)

_Note: TDD task 1 has separate test → feat commits per the RED/GREEN cycle_

## Files Created/Modified
- `src/lib/fixtures/crowded-long.json` - Crowded LONG snapshot (True AVG buy ~62.3, NFP at +6h pre-news)
- `src/lib/fixtures/crowded-short.json` - Crowded SHORT snapshot (True AVG sell ~62.3, NFP at +6h pre-news)
- `src/lib/fixtures/balanced.json` - Balanced snapshot (both sides below 60, no crowded flag)
- `src/lib/fixture-guard.ts` - SCENARIO_IDS, isScenarioFixture, resolveScenario, ResolvedEvent types
- `src/lib/fixtures.test.ts` - 5 tests covering crowded outcomes, rejection paths, resolver anchoring, prose
- `components/dashboard/sentiment-panel.tsx` - Sentiment table with True AVG footer, chip, switcher
- `components/dashboard/calendar-panel.tsx` - Calendar list with countdowns, flags, interpretation block

## Decisions Made
- Fixture events carry `startsAtOffsetHours` (6h near event trips pre-news, 30h/72h far events) instead of ISO literals, so countdowns stay fresh forever and no fixture file contains a `startsAt` literal.
- Both panels fall back to crowded-long for unknown scenario values, matching the store default from plan 01.
- The 30s countdown ticker is isolated inside CalendarPanel via local `now` state, so ticking never re-renders the sentiment panel or store subscribers.
- English identifiers with Azerbaijani rendered copy per D-04; Azerbaijani prose lives only inside JSON strings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed locked dependencies in the worktree**
- **Found during:** Task 1 (fixture test run)
- **Issue:** Worktree shipped without node_modules, so every verify command failed; even known-good suites errored identically, proving an environment gap rather than a code bug
- **Fix:** Ran `npm install --legacy-peer-deps --no-audit --no-fund` (lockfile only, zero new packages; legacy-peer-deps per 02-01 precedent)
- **Files modified:** none tracked (node_modules is gitignored)
- **Verification:** Fixture suite then ran 5/5 green
- **Committed in:** n/a (environment setup, no tracked change)

---

**Total deviations:** 1 auto-fixed (1 blocking environment setup)
**Impact on plan:** Setup only; no scope change, no new packages, threat T-02-SC unaffected.

## Issues Encountered
- Vitest prints a `configLoader: native` warning about ESM syntax in vitest.config.ts; it is cosmetic (exit code still 0, JSON report confirms pass counts). ANSI escapes garble Bash display, so results were verified via `--reporter=json` file output.
- `npx tsc --noEmit` initially failed on pre-existing `app/layout.tsx` LayoutProps error because the worktree lacked Next generated types (`next-env.d.ts`/`.next` absent). Regenerated via `npx next typegen`, confirmed clean, then removed the generated files. No source change needed.

## Threat Flags

None. No new network endpoints, auth paths, or installs. Fixture JSON crosses into render only through the tested guard (mitigates T-02-05); the scenario label renders beside every derived number (mitigates T-02-06).

## Known Stubs

None. No hardcoded empty values or placeholder copy flow to live readouts; guard-failure paths render the documented `Məlumat yoxdur` copy.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SentimentPanel and CalendarPanel are ready to be composed into the terminal shell left/right panels; both read the existing store scenario with no store changes needed.
- Visual scenario-switching confirmation (footer swap, chip clear, countdown move, prose swap) remains a dev-time manual check for the verifier.

---
*Phase: 02-terminal-composition*
*Completed: 2026-09-05*
