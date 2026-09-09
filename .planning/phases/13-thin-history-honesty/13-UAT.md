---
status: testing
phase: 13-thin-history-honesty
source: [13-VERIFICATION.md]
started: 2026-09-09T13:50:00Z
updated: 2026-09-09T13:50:00Z
---

## Current Test

number: 1
name: D-08 dev glance at 5/25/40 closed candles
expected: |
  Tier-1 banner + muted zones/levels + full-strength marks at 5; Tier-2 banner + identical dimming at 25; zero banner DOM + byte-identical full chart at 40; MARKET CLOSED ribbon coexists without overlap; zero console errors/warnings across all three seeds
awaiting: user response

## Tests

### 1. D-08 dev glance at 5/25/40 closed candles
expected: Tier-1 banner + muted zones/levels + full-strength marks at 5; Tier-2 banner + identical dimming at 25; zero banner DOM + byte-identical full chart at 40; MARKET CLOSED ribbon coexists without overlap; zero console errors/warnings across all three seeds
result: [pending]

Protocol: run `npm run dev`, seed thin histories at 5, 25, and 40 closed candles.
- At 5: Tier-1 banner ("Nazik tarixçə · 5 / 20 şam …") over muted zone fills; EQ/DOL/Q1/Q3/OTE-B/OTE-S titles in muted gray (#71717A); candles, Asia-H/Asia-L, J/J?/S marks hold full strength.
- At 25: Tier-2 banner ("Sıxılma · 25 / 34 şam …") with identical dimming.
- At 40: no banner, full-strength chart byte-identical to today.
- MARKET CLOSED ribbon coexists without overlap; DevTools console shows zero errors/warnings across all three seeds.

### 2. Narrow-width banner wrap check (~360px card, thin tier)
expected: Banner copy wraps within card width, no truncation or horizontal overflow
result: [pending]

Protocol: with a thin tier seeded (5 or 25 closed candles), narrow the chart card to ~360px width and confirm the banner text wraps within the card.

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
