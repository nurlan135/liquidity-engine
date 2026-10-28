---
phase: 21
review: 21-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "`countFireRate` accepts any finite threshold, diverging from the 1-7 integer band"
  - id: WR-02
    severity: warning
    disposition: open
    title: "`countFireRate` throws on null entries instead of degrading to empty"
  - id: WR-03
    severity: warning
    disposition: open
    title: "`fireRateCopy` has no default branch and returns `undefined` on corrupt status"
  - id: WR-04
    severity: warning
    disposition: open
    title: "R/R-fail reason rounds 2.99 to `1:3.0` while blocked"
  - id: WR-05
    severity: warning
    disposition: open
    title: "Fire-rate strip uses `Date.now()` in render instead of envelope time"
  - id: WR-06
    severity: warning
    disposition: open
    title: "Report reads leg `lastError` via `getState()` during render, breaking reactivity"
  - id: WR-07
    severity: warning
    disposition: open
    title: "ThresholdControl degraded write-lock never updates live"
  - id: WR-08
    severity: warning
    disposition: open
    title: "Containing-bar fallback pins T/Judas markers to the wrong bar"
  - id: IN-01
    severity: info
    disposition: open
    title: "Slider thumb count mishandles a numeric `value`"
  - id: IN-02
    severity: info
    disposition: open
    title: "Setter floors fractions while validate-on-read rejects them"
  - id: IN-03
    severity: info
    disposition: open
    title: "Pools-parity harness compares a verdict set against itself"
  - id: IN-04
    severity: info
    disposition: open
    title: "`resolveSL` side-of-entry refusal is unreachable and untested"
open: 12
total: 12
recorded: 2026-10-28T00:00:00.000Z
---

# Phase 21: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| WR-04 | warning | open | - |
| WR-05 | warning | open | - |
| WR-06 | warning | open | - |
| WR-07 | warning | open | - |
| WR-08 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently.
