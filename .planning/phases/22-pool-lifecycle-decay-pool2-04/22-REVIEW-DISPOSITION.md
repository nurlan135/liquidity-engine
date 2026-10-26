---
phase: 22
review: 22-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "Self-comparison assertion (pools.test.ts:637-639) can never fail; post-asOf exclusion untested"
  - id: WR-02
    severity: warning
    disposition: open
    title: "Preview-independence test (store.test.ts) proves determinism only, not scorer ignoring preview"
  - id: WR-03
    severity: warning
    disposition: open
    title: "Zero-ACTIVE branch returns rankSkipped:false inconsistent with scored-elsewhere convention"
  - id: WR-04
    severity: warning
    disposition: open
    title: "calibrationAppliedCopy() omits two new decay pins despite Apply re-seeding them"
  - id: IN-01
    severity: info
    disposition: open
    title: "equalityBonus cap comment (7.0) disagrees with code (7.5)"
  - id: IN-02
    severity: info
    disposition: open
    title: "Behind-penalty knob hardcodes min=0 instead of CALIBRATION_BEHIND_MIN"
  - id: IN-03
    severity: info
    disposition: open
    title: "scoreAndRank has no explicit empty-closed guard; relies on computeATR early-return"
open: 7
total: 7
recorded: 2026-10-26T00:00:00.000Z
---

# Phase 22: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| WR-04 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
