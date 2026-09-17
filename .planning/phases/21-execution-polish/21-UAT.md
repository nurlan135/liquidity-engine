---
status: testing
phase: 21-execution-polish
source: [21-VERIFICATION.md]
started: 2026-09-17
updated: 2026-09-17
---

## Current Test

number: 1
name: Band verdict + proof table placement and tone
expected: |
  Open the terminal with a populated firing log (2+ FIRE entries across 2 weeks) and look at the Atəş Jurnalı card. HOLD line (Atəş tempi 1–4/həftə bandında — TUTULDU) in green terminal-up at Heading size inline next to entries (no separate summary block); rate line N atəş / M həftə in mono below it; Hovuz sübutu — ON/OFF rows in muted mono; overflow +N köhnə qeyd retained above entries; thin history dims the block at opacity-45 with the thin note (never hidden); empty log shows the empty heading + calibration body and NO verdict line.
awaiting: user response

## Tests

### 1. Band verdict + proof table placement and tone
expected: HOLD green inline, rate line, muted ON/OFF rows, thin opacity-45 dim, nothing over empty log
result: [pending]

### 2. Buffered ticket note + chart line movement
expected: Buffer note beside ticket reason, SL/TP visibly off the extreme, gate unchanged
result: [pending]

### 3. Sandbox placement, dimming, Apply result
expected: Sandbox once beside log panel, drift dims with BAXIŞ tag and changes zero verdicts, Tətbiq et records HOLD copy, refresh resets
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
