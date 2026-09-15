---
status: complete
phase: 15-why-now-trigger-engine
source: 15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md
started: 2026-09-11T09:15:00Z
updated: 2026-09-11T09:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. FIRE_LONG on LOW 3-of-3 and FIRE_SHORT on HIGH 3-of-3 with verbatim Azerbaijani reasons
expected: Pure evaluateTrigger fuses three gates into FIRE verdicts with D-09 sentences
result: pass
source: automated
coverage_id: D1

### 2. Choppy-sideways yields WAIT_FOR_MANIPULATION and NY-hours sweep never fires
expected: QUIET on chop, no FIRE during NY hours
result: pass
source: automated
coverage_id: D1

### 3. TRIGGER constants pinned (KZ 120/300, DISP 0.5, LOG_CAP 50) with CALIBRATION-PROVISIONAL
expected: All four constants carry calibration comments and value pins
result: pass
source: automated
coverage_id: D1

### 4. selectTrigger end-to-end FIRE verdict plus firing-log append with shared epoch
expected: Live detectors to FIRE verdict plus one log entry, stale legs refuse null
result: pass
source: automated
coverage_id: D1

### 5. ARMED 2-of-3 matrix with matching reasonKeys plus boundary pins
expected: Exactly-2 ARMED with correct key, 0-1 WAIT, killzone/displacement edges exclusive
result: pass
source: automated
coverage_id: D2

### 6. Cooldown downgrade plus FVG downgrade plus SMT agree tag
expected: alreadyFired downgrades to ARMED_ALREADY_FIRED, no-FVG caps at ARMED, SMT suffix correct
result: pass
source: automated
coverage_id: D2

### 7. Malformed-input throws plus null-degrade WAIT plus determinism
expected: Bad envelopes throw with got-string, null detectors give honest WAIT, repeat is byte-identical
result: pass
source: automated
coverage_id: D2

### 8. Verbatim Azerbaijani reasons pinned for all seven keys plus SMT suffix matrix
expected: toBe pins on all D-09 sentences, six suffix cases correct
result: pass
source: automated
coverage_id: D3

### 9. Firing log capped at 50 with dedup, WAIT/downgrade-repeat skip
expected: 51 ARMED appends cap at 50 with overflow 1, FIRE deduped per session
result: pass
source: automated
coverage_id: D3

### 10. firingLogToJson serializer with entries plus thresholds plus exportedAt
expected: Pure JSON export, no account/risk fields, Phase 17 seam ready
result: pass
source: automated
coverage_id: D3

### 11. selectTrigger stale/empty refusal, shared-epoch coherence, FIRE log shape
expected: Stale legs force null, epoch shared with selectAMD, FIRE appends full-shape entry
result: pass
source: automated
coverage_id: D3

### 12. Confirm auto-verified trigger engine deliverables
expected: All 12 deliverables above already pass automated tests (344/344 suite, tsc clean). Confirm they match your expectation.
result: pass

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
