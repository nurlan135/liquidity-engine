---
status: complete
phase: 21-execution-polish
source: [21-VERIFICATION.md]
started: 2026-09-18
updated: 2026-09-18
---

## Current Test

[testing complete]

## Tests

### 1. Band verdict + proof table placement and tone
expected: HOLD green inline, rate line, muted ON/OFF rows, thin opacity-45 dim, nothing over empty log
result: pass

### 2. Buffered ticket note + chart line movement
expected: Buffer note beside ticket reason, SL/TP visibly off the extreme, gate unchanged
result: blocked
blocked_by: prior-phase
reason: "Live EXECUTE ticket required — current state is STAND_ASIDE, buffer note and displaced lines not observable"

### 3. Sandbox amber BAXIŞ badge conspicuousness on the live terminal (INCLUDES POST-APPLY DRIFT RE-CHECK)
expected: Pre-Apply drift shows the amber BAXIŞ chip undimmed above a dimmed preview; Tətbiq et records the TUTULDU applied copy; post-Apply drift re-shows the badge + dimming beside the retained applied copy (code + regression leg prove this — human confirms the chip reads conspicuous, not washed out); Yenilə/refresh resets to pins with no persistence
result: pass

## Summary

total: 3
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

- gap_id: G-21-3
  truth: "Sandbox drift dims preview with visible BAXIŞ tag; Tətbiq et records the HOLD applied copy and re-seeds preview to pinned seeds"
  status: closed
  closed_by: 21-04 (hoisted badge, in-sandbox TUTULDU verdict, reactive applied flag, single thumbs)
- gap_id: CR-01
  truth: "Drift dims preview with a conspicuous BAXIŞ badge (pre- AND post-Apply)"
  status: closed
  closed_by: 21-05 (fix 3bc4448 constants-only pristine; regression leg b631f75; re-verified 13/13 2026-09-18)
