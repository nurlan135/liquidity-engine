---
status: testing
phase: 18-verification-calibration-harness
source: 18-01-SUMMARY.md, 18-02-SUMMARY.md, 18-03-SUMMARY.md
started: 2026-09-15T15:35:00Z
updated: 2026-09-15T15:35:00Z
---

## Current Test

number: 1
name: Confirm auto-verified harnesses
expected: |
  All three Phase 18 harnesses (replay, parity, stale-drill) are green via their
  automated vitest suites plus the full npm suite. Confirm acceptance.
awaiting: user response

## Tests

### 1. Replay monotonicity over 20-session fixture (VERF-01)
expected: Bar-by-bar replay over the 20-session fixture never takes an illegal combined-state edge
result: pass
source: automated
coverage_id: D1

### 2. Replay fixture contains FIRING and INVALIDATED (VERF-01)
expected: Replay fixture contains at least one FIRING setup and at least one INVALIDATED setup
result: pass
source: automated
coverage_id: D2

### 3. Calibration summary JSON with band verdict (VERF-01)
expected: Replay run emits fires/week plus kill-rate plus INVALIDATED count as structured JSON against the 1-4/week band
result: pass
source: automated
coverage_id: D3

### 4. Trigger prose never contradicts AMD/SMT state (VERF-02)
expected: Trigger prose never contradicts AMD/SMT state on the same snapshot
result: pass
source: automated
coverage_id: D1

### 5. Direction contradiction rules (VERF-02)
expected: FIRE_SHORT plus BULLISH fails and FIRE_LONG plus BEARISH fails
result: pass
source: automated
coverage_id: D2

### 6. Suppressed-SMT SOFT downgrade pair (VERF-02)
expected: Suppressed SMT fires assert SOFT downgrade at flaw layer, never a trigger contradiction
result: pass
source: automated
coverage_id: D3

### 7. Stale leg matrix degrades with provenance (VERF-03)
expected: Every stale leg individually plus all-stale plus thin-tier yields degraded-with-provenance, never a full-strength ticket
result: pass
source: automated
coverage_id: D1

### 8. Flaw-first routing with leg provenance (VERF-03)
expected: Each stale cell routes through checkFatalFlaw first then computeTicket with leg provenance
result: pass
source: automated
coverage_id: D2

### 9. Full suite green with guards (VERF-03)
expected: Full suite stays green including banned-word quarantine and purity guard with zero new installs
result: pass
source: automated
coverage_id: D3

### 10. Confirm auto-verified harnesses
expected: All three Phase 18 harnesses green via automated suites; user confirms acceptance
result: [pending]

## Summary

total: 10
passed: 9
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

[none yet]
