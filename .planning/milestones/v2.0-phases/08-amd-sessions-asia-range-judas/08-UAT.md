---
status: complete
phase: 08-amd-sessions-asia-range-judas
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md]
started: 2026-09-07T10:48:04Z
updated: 2026-09-07T10:55:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Conforming D-01 edits (ICT-12 / criterion 1 state 20:00-00:00 NY)
expected: REQUIREMENTS.md ICT-12 and ROADMAP.md criterion 1 state 20:00–00:00 NY
result: pass
source: automated
coverage_id: D1

### 2. Asia Range module (20:00-00:00 NY wick-to-wick, gap-skip, post-midnight exclusion)
expected: asiaRange resolves 20:00-00:00 NY wick-to-wick extremes from 1H closed rows
result: pass
source: automated
coverage_id: D2

### 3. DST triple-test (spring-forward, fall-back, maintenance-break)
expected: March spring-forward, November fall-back, and maintenance-break fixtures green
result: pass
source: automated
coverage_id: D3

### 4. Three-gate London Judas detector (sweep + close-based reversal + Asia-height displacement)
expected: judasSwing confirms only on in-killzone sweep plus reversal with displacement conjunction; candidate/preRun vocabulary intact
result: pass
source: automated
coverage_id: D4

### 5. Seeded 60-session budget run at/under 25% confirmed ceiling
expected: node scripts/judas-budget.ts prints BUDGET confirmed share at or under 25%, exit 0, deterministic rerun
result: pass
source: automated
coverage_id: D5

### 6. AMD phase classifier (time-plus-event transitions, exact Azerbaijani reasons)
expected: amdPhase walks accumulation → manipulation → distribution with deterministic reason sentences
result: pass
source: automated
coverage_id: D6

### 7. Read-only SMT regime tag (agreement / suppression appends, input never mutated)
expected: SmtOutput envelope fused read-only; agreement and suppression tags appended correctly
result: pass
source: automated
coverage_id: D7

### 8. NY unavailable + empty-range degraded branches with exact reasons
expected: NY-unavailable preserves prior phase with honest marker; empty range takes degraded branch
result: pass
source: automated
coverage_id: D8

### 9. End-to-end asiaRange → judasSwing → amdPhase fusion proof
expected: Full fusion path from Asia range through Judas swing to AMD phase resolves correctly
result: pass
source: automated
coverage_id: D9

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
