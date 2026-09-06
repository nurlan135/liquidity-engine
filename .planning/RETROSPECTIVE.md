# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Live Terminal

**Shipped:** 2026-09-06
**Phases:** 5 (1, 2, 3 + inserted 03.1, 03.2) | **Plans:** 16 | **Commits:** 152 | **Timeline:** 3 days (2026-09-04 → 2026-09-06)

### What Was Built
- Resilient NQ=F Yahoo proxy: query1→query2 failover, jittered backoff honoring Retry-After, serve-stale fallback, 60s CDN TTL — never silent
- Pure-function ICT core (`src/lib/ict`): range/EQ + position, quadrant/OTE levels, bias with rationale, single named DOL, ATR regime, 3×ATR rollover tripwire — closed-only basis throughout
- Full dark terminal: 3-panel shell, live lightweight-charts v5 chart (zones + EQ/DOL + Q1/Q3/OTE lines + rollover banner + stale/closed overlays), 6-section institutional report, sentiment/calendar fixture panels
- Live on Vercel Hobby: edge cache verified, stale-serve drill green, live-URL checklist passed (https://liquidity-engine-nine.vercel.app)
- Retroactive Phase 1 gate 10/10 + ICT-01 claim + ICT-02 render + W1/W2/F2 honesty fixes (closure phases 03.1, 03.2)

### What Worked
- Backend-first phasing (proxy+math → composition → deploy-verify): Phase 2/3 built on trusted numbers, no rework of math after UI
- Truth-row verification style (file:line + test:line + command per row) made the retroactive gate credible instead of ceremonial
- Inserted decimal phases (03.1, 03.2) closed audit gaps surgically without replanning the milestone
- Integration checker re-run at re-audit confirmed all 5 prior gaps resolved in code + found only 1 display-only warning

### What Was Inefficient
- Phase 1 shipped without its VERIFICATION.md — the most expensive gap in the milestone (required a full 4-plan retroactive closure phase)
- Two `human_needed` gates lingered on completed UAT evidence — status fields not flipped at UAT time, flagged scanners at close
- Pre-close audit surfaced a stale scanner hit (02-UAT `[passed]` with 0 pending) requiring an acknowledge cycle

### Patterns Established
- Selector guard: empty/bad input returns null before math (honest degrade, never false-flag)
- Closed-only basis: every close derivation filters through closedOnly; forming candle renders but never computes
- Stale latch discipline: catch sets stale:true + lastError, preserves candles; success restores envelope truth
- Deploy steps assert contracts statically (502 shape, date shape, slot hooks) — never live-kill drills
- Shell stub-prop tests pin selector-to-prop mapping instead of canvas inspection under jsdom

### Key Lessons
1. Write the verification gate in the same phase as the work — a retroactive gate costs a full closure phase.
2. Flip verification status at UAT time — stale `human_needed` fields compound into close-time friction.
3. Small inserted phases beat milestone replanning for audit gaps — decimal numbering kept history legible.

### Cost Observations
- Sessions: milestone spanned ~3 days, 16 plans, 152 commits
- Notable: closure phases (03.1: 1 plan, 03.2: 4 plans) were ~30% of plan count — all attributable to the missing Phase 1 gate

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~3 days | 5 | Baseline: backend-first + truth-row gates + decimal insertions |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 133/133 green, lint clean | 20/20 reqs, 5/5 flows | 0 new deps (chart-mapper helper only) |

### Top Lessons (Verified Across Milestones)

1. (Single milestone — cross-validation starts at v1.1)
