---
phase: 20-1-live-chart-overlay
plan: '01'
subsystem: ui
tags: [selectPools, report-section, price-lines, lightweight-charts, zustand, tracer]

# Dependency graph
requires:
  - phase: 19-pools-math
    provides: selectPools refuse-null envelope + rank-ordered LiquidityPool array (458 tests green)
provides:
  - REPORT_SECTIONS index 1 live contract + section-state lock at six live
  - Section 1 live branch with rank-1 sentence (side, zone bounds, ATR distance, swept status, inline hedge)
  - Pool prop fan-out (rank-1 BSL top/bottom plus degraded flags) from terminal-shell to NqChart
  - BSL rank-1 price-line pair plus pool-lines test slot on the chart
affects: [20-02-section-expansion, 20-03-chart-expansion, 21-calibration]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 5729
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [stable selector-function subscription with derivation during render, remove-then-create price-line cycle with unconditional removal, finite-guarded line inputs with per-leg try/catch]

key-files:
  created: []
  modified: [src/lib/report.ts, src/lib/report.test.ts, components/dashboard/report.tsx, components/dashboard/terminal-shell.tsx, components/charts/nq-chart.tsx]

key-decisions:
  - "ATR distance derives display-only from selectRegime().atr + selectLastClose() during render — same class as the §2 midpoint derivation, no new ict math (D-20)"
  - "Rank-1 is the first ACTIVE pool in selector return order (D-18); report names rank-1 any-side, chart draws first ACTIVE BSL per the tracer-slice plan literal"
  - "Finite guard reuses the existing asiaLineInputs(top, bottom) helper — plan explicitly permits inline reuse, so no chart-mapper signature change"
  - "Null-selector copy stays Məlumat yoxdur via the NQ leg-error chain (D-06/D-08); no-pools gets the distinct Aktiv hovuz yoxdur line (D-05) — fixed post-verify as a Rule 2 auto-fix"

patterns-established:
  - "Section-1 live branch shape: section.index === 1 before the generic unavailable branch, h3 + skeleton + s1-pain-threshold sub-block with fixed Ağrı Həddi h4"
  - "Pool prop fan-out: single selectPools() return derived during render into rank-1 BSL top/bottom plus degraded flags, fanned through optional nullable NqChart props"
  - "Pool price-line pair: dashed width-1 BSL-1-top/BSL-1-bottom legs, color from the up-terminal token, degraded to MUTED_GRAY, created after Asia before ticket (D-11)"

requirements-completed: [S1-01, CHRT-01]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Report section index 1 renders as a live section with a rank-1 pain-threshold sentence instead of an UNAVAILABLE badge"
    requirement: "S1-01"
    verification:
      - kind: unit
        ref: "src/lib/report.test.ts#holds exactly 6 entries with all six sections live"
        status: pass
    human_judgment: false
  - id: D2
    description: "Chart renders one BSL pool price-line pair from live selector output without blocking candles"
    requirement: "CHRT-01"
    verification:
      - kind: integration
        ref: "src/terminal-shell.test.ts + src/lib/chart-mapper.test.ts (32 passed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Loading state shows skeleton rows and renders no pool prose or lines before the envelope resolves"
    requirement: "S1-01"
    verification:
      - kind: integration
        ref: "src/terminal-shell.test.ts#shows the chart skeleton before the first envelope lands"
        status: pass
    human_judgment: false
  - id: D4
    description: "Rank-1 sentence typography and hedge wording match the UI-SPEC contract (mono numerals, inline hedge, SWEPT tone, thin note)"
    verification: []
    human_judgment: true
    rationale: "Visual/typographic fidelity (font rendering, dimming tone, Azerbaijani copy layout) cannot be proven by unit tests — needs a human glance at the running terminal"

# Metrics
duration: 19min
completed: 2026-09-16
status: complete
---

# Phase 20 Plan 01: Tracer Live Chart Overlay Summary

**Live §1 rank-1 pain-threshold sentence plus single BSL price-line pair, both wired end-to-end from the proven selectPools envelope — no math, no verdict changes**

## Performance

- **Duration:** 19 min
- **Started:** 2026-09-16T14:20:00Z
- **Completed:** 2026-09-16T14:39:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- REPORT_SECTIONS index 1 flipped from unavailable to live; section-state lock test now expects six live entries
- Section 1 live branch renders rank-1 (first ACTIVE pool) with side, zone bounds, ATR distance, swept status, and the inline projection hedge; skeleton / null-selector / no-pools / thin states each render distinct honest copy
- Terminal-shell fans rank-1 ACTIVE BSL top/bottom plus degraded flags to NqChart via optional nullable props
- Chart draws the BSL-1-top/BSL-1-bottom dashed pair through the Asia remove-then-create cycle with unconditional removal, per-leg try/catch, terminal-up color, and a pool-lines test slot
- Full suite stays green: 40 files, 458 tests — matches the Phase 19 baseline
- End-to-end fan-out proven with a throwaway k=2 swing-high probe (selector → shell → chart stub props equal), then deleted

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer report contract flip plus minimal live rank-1 branch** - `86b4aad` (feat)
2. **Task 2: Tracer shell fan-out plus single chart pool pair** - `710f61a` (feat)
3. **Rule 2 fix: distinct no-pools copy for section 1 empty state** - `edc84b8` (fix)

## Files Created/Modified

- `src/lib/report.ts` - REPORT_SECTIONS index 1 `unavailable` → `live` plus module comment update
- `src/lib/report.test.ts` - Section-state lock flipped to six live entries `[1,2,3,4,5,6]`
- `components/dashboard/report.tsx` - `section.index === 1` live branch (rank-1 sentence, skeleton/null/no-pools/thin states, mono tabular numerals, hedge)
- `components/dashboard/terminal-shell.tsx` - `selectPools` subscription, rank-1 ACTIVE BSL derivation, four pool props fanned to NqChart
- `components/charts/nq-chart.tsx` - Pool prop surface, BSL pair refs, mount/update creation, unconditional removal, unmount cleanup, pool-lines slot

## Decisions Made

- ATR distance is display-only: `|poolMid − lastClose| / regime.atr` computed during render from two existing selector outputs (`selectRegime().atr`, `selectLastClose()`), formatted to 2dp, `ATR —` when the ATR is missing/non-finite/non-positive. Same class as the §2 `(high+low)/2` precedent — not a detector, so D-20 holds.
- Rank-1 = first ACTIVE pool in selector return order (D-18). Report names rank-1 any-side (BSL or SSL); chart draws the first ACTIVE BSL per the tracer-slice plan literal (nearest-2-per-side plus SSL/ghosts land in expansion).
- Finite guard reuses `asiaLineInputs(top, bottom)` inline — the plan explicitly permits reuse, so `chart-mapper.ts` is untouched. Plan's `files_modified` listed only nq-chart/terminal-shell/report/report.ts/report.test.ts, and no chart-mapper change was needed.
- Null-selector copy reuses `S3_EMPTY_COPY` (`Məlumat yoxdur`) through the NQ leg-error chain; thin wraps the sub-block in `opacity-45` with the `İncə tarixçə…` note; stale-selector pools are unreachable by construction (stale NQ refuses null), so no stale branch exists in §1 — D-08 holds via the single null path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Distinct no-pools copy for the rank-1-absent state**
- **Found during:** Tracer feedback gate (post-Task 2 verification review)
- **Issue:** Rank-1-absent selector fell through to the generic `Məlumat yoxdur` null-selector copy, collapsing two UI-SPEC-distinct states (D-05 no-pools vs D-08 null) into one line and violating must_have truth 1's "rank-1 pain-threshold sentence" contract shape
- **Fix:** Added `S1_NO_POOLS_COPY = 'Aktiv hovuz yoxdur — D1 k=2 fraktal təsdiqlənmədi.'` rendered in the `s1-pain-threshold` sub-block when the selector resolves with zero ACTIVE pools; null selector keeps the leg-error/`Məlumat yoxdur` path
- **Files modified:** components/dashboard/report.tsx
- **Verification:** tsc + eslint clean; report/terminal-shell/chart-mapper suites green (36/36)
- **Committed in:** edc84b8 (fix)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Copy-only correction required by the UI-SPEC contract; no scope creep, no math, no store changes.

## Issues Encountered

- Throwaway tracer probe initially used a synthetic zigzag fixture that produced zero ACTIVE BSL pools (no bar was the strict k=2 maximum of its ±2 neighbors), so the strict proof assertion failed. Fixed the probe fixture with a genuine interior swing-high peak (16 closed bars, peak 20200 at index 8); probe passed with stub props equal to the selector's rank-1 BSL values. Probe deleted after verification — never committed.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: none | — | No new surface beyond the plan's threat register: T-20-02 mitigated via finite-guarded inputs with per-leg try/catch (a throw nulls only that leg, chart never blocks); T-20-01/T-20-03 accepted per plan; no package installs (T-20-SC gate not triggered) |

## Known Stubs

None — no hardcoded empty values, placeholder text, or unwired components. The single-pair scope (nearest-2-per-side, SSL legs, swept ghosts) is an intentional tracer cut documented in the plan, landing in the 20-02/20-03 expansion plans.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Proven slice ready for expansion: 20-02 (full §1 states — stale/thin/no-pools/swept rank-1 sentence matrix) and 20-03 (nearest-2-per-side BSL/SSL pairs plus swept ghosts) build directly on the prop surface and branch shape shipped here
- Open tie flagged in the plan assumptions (equal-distance rank tie at the nearest-2 cut line) stays deferred to Phase 21 calibration — untouched
- Visual backstop: rank-1 sentence typography/hedge layout needs one human glance at the running terminal (coverage D4)

---
*Phase: 20-1-live-chart-overlay*
*Completed: 2026-09-16*

## Self-Check: PASSED

- All 5 modified files exist on disk; REPORT_SECTIONS index 1 reads `live`
- All 3 commits exist (`86b4aad`, `710f61a`, `edc84b8`); full suite 458/458 green
- Shared orchestrator artifacts untouched (STATE.md, ROADMAP.md not staged or committed)
