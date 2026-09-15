# Phase 16: Fatal-Flaw Invalidation - Context

**Gathered:** 2026-09-11
**Status:** Ready for planning

## Phase Boundary

Users never act on a setup that a fatal flaw already killed — invalidation supersedes fire on the same snapshot. Pure `src/lib/ict/invalidation.ts` `checkFatalFlaw` over the exact trigger snapshot plus detector envelopes, HARD-kill vs SOFT-downgrade split, falsifiable sentence + challenge question strings for §6. UI panels and ticket suppression belong to Phase 17, population verification to Phase 18.

## Implementation Decisions

### HARD/SOFT taxonomy
- **D-01:** HARD flaws are rollover-week corruption + stale leg only — kill the setup outright from any state, non-negotiable, never trade. Reuses `detectRollover` output + per-leg stale envelopes.
- **D-02:** SOFT flaws are SMT conflict (suppressed / correlation-decoupled) + confirmed opposite-direction sweep — downgrade FIRING to ARMED, wait-not-abandon. No wider net (no AMD-phase contradiction, no displaced-beyond-X) to avoid permanent-QUIET drift.
- **D-03:** Closed-candle confirmation required before any flaw kills or downgrades — prevents intra-bar flicker per the hysteresis rule. No N-close depth; single closed candle suffices.
- **D-04:** Every flaw verdict prints its specific reason plus HARD/SOFT class and unblock condition. Generic "Invalidated" alone is banned.

### Shared-snapshot shape
- **D-05:** `checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf })` — consumes the exact `TriggerOutput` + detector envelopes the trigger used, on the same `asOf` instant. Never re-fetches or re-slices candles.
- **D-06:** Flaw evaluated AFTER trigger on the same snapshot; INVALIDATED supersedes FIRING deterministically by function order. No timestamp racing.
- **D-07:** Lives in `src/lib/ict/invalidation.ts` as a pure function — injected `asOf`, boundary throws, no clock/store. Same discipline as `trigger.ts`, covered by the purity guard.

### Sentence + challenge bank
- **D-08:** Falsifiable sentence from a rule table keyed on bias direction × nearest unswept pool (e.g. bullish bias whose BSL raid never happens while price holds premium = distribution misread).
- **D-09:** Challenge question from a small fixed bank (3–5) keyed on the dominant trap: premium-chase, pre-news engineering, SMT divergence ignored. Deterministic selection.
- **D-10:** Both ship as verbatim Azerbaijani templates drafted at plan time, test-pinned with `toBe`, following the trigger D-09 precedent.
- **D-11:** Delivery surface is live report §6 — this phase ships the pure strings; Phase 17 wires the §6 UI block.

### SOFT unblock logic
- **D-12:** SOFT flaws downgrade FIRING to ARMED only — never touch QUIET/ARMED states, never kill. HARD flaws kill from any state.
- **D-13:** Each SOFT flaw states its per-flaw re-arm condition with the verdict (e.g. SMT suppressed CORR_DECOUPLED 0.62 — re-arm if correlation recovers above 0.70).
- **D-14:** INVALIDATED renders neutral/informative (methodology note, not alert); HARD vs SOFT visually distinct when Phase 17 styles them. No red-error styling.
- **D-15:** A SOFT downgrade carries the underlying ARMED reason (missing-gate key) forward alongside the flaw reason, so the Phase 17 ticket knows what would complete the setup.

### Claude's Discretion
None — user decided every area explicitly.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` (FLAW-01..FLAW-03) — acceptance criteria, locked scope
- `.planning/ROADMAP.md` (Phase 16 goal + success criteria) — phase boundary, HARD/SOFT split, §6 sentence + challenge

### Research (v3.0 execution layer)
- `.planning/research/SUMMARY.md` (Phase 2/3 sections) — flaw-before-ticket ordering, flaw-wins, HARD/SOFT classification
- `.planning/research/FEATURES.md` — invalidation level, fatal-flaw sentence + challenge bank, ticket-before-flaw order
- `.planning/research/PITFALLS.md` (P3 flicker, P5 purity, P7 permanent-QUIET) — shared snapshot, hysteresis, kill-rate budget
- `.planning/research/ARCHITECTURE.md` — `invalidation.ts` pure `checkFatalFlaw`, flaw > ticket render precedence, §6 block
- `.planning/research/STACK.md` — flaw-wins ordering in selector, INVALIDATED neutral styling, ticket CTA gating

### Prior phase (trigger contract)
- `.planning/phases/15-why-now-trigger-engine/15-CONTEXT.md` (D-01..D-10) — three-gate engine, ARMED matrix, firing log, verbatim prose precedent
- `src/lib/ict/trigger.ts` — `TriggerOutput` shape (`verdict`, `direction`, `reasonKey`, `gates`, `entryFvg`, `inputs`), `TRIGGER_*` constants, `evaluateTrigger` gate logic

### Gate inputs (existing detectors)
- `src/lib/ict/judas.ts` — opposite-sweep source: `JudasOutput` (`confirmed`, `sweepSide`), killzone + displacement precedent
- `src/lib/ict/smt.ts` — SOFT-flaw source: suppression flag, correlation regime, rollover suppression
- `src/lib/ict/asia.ts` — unswept-pool reference for the sentence rule table
- `src/lib/ict/aggregate.ts` — `NY_TZ`, wall-clock discipline, shared `asOf` helper
- `src/lib/ict/fvg.ts` — entry-FVG handle carried through the flaw decision into Phase 17

### Project constraints
- `.planning/PROJECT.md` (Constraints: Purity, Zero budget, Zustand-only, Rule-based) — flaw takes trigger output + envelopes + `asOf` only
- `.planning/phases/14-audit-debt-cleanup-purity-guard/14-CONTEXT.md` (D-05/D-06) — co-located vitest grep guard, minimal pattern set

## Existing Code Insights

### Reusable Assets
- `evaluateTrigger()` (`src/lib/ict/trigger.ts`): `TriggerOutput` consumed directly — flaw never re-implements gates
- `detectRollover` output: HARD-flaw source for rollover-week corruption (v2.0-P7 rule)
- Per-leg stale envelopes: HARD-flaw source for stale-leg detection
- `evaluateSMT()` (`src/lib/ict/smt.ts`): suppression + correlation state for SOFT flaws
- `judasSwing()` (`src/lib/ict/judas.ts`): confirmed opposite-sweep detection for SOFT flaws

### Established Patterns
- Named `CALIBRATION-PROVISIONAL` exported constants pinned by boundary tests (`TRIGGER_*` precedent) — flaw thresholds follow suit
- Co-located tests (`<module>.test.ts`, 300/300 green after Phase 14) — `invalidation.test.ts` follows suit
- Purity: injected `asOf`, no `Date.now`, no store imports — enforced by `purity.test.ts` grep guard
- Verbatim Azerbaijani reasons test-pinned with `toBe`, one base sentence per key + fixed suffix (trigger D-09 precedent)
- Population test in Phase 18 (≥1 FIRING + ≥1 INVALIDATED per 20 sessions) bounds the kill rate — no rate budget enforced here

### Integration Points
- `src/lib/ict/invalidation.ts` (new) — `checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf })` + flaw reason-key constants
- Store `selectFatalFlaw` (new, Phase 16) — derived selector sharing the trigger's `asOf`; `selectTicket` attaches in Phase 17 with flaw > ticket precedence
- Phase 17 consumes the flaw output shape for ticket suppression + §6 live block — keep the output serializable (verdict, class, reason, unblock, ARMED reason)
- Phase 18 replays evaluations bar-by-bar for monotonicity — flaw entries must carry enough to reconstruct verdicts

## Specific Ideas

No specific requirements — open to standard approaches. Planner picks file/task split; prose templates drafted at plan time per D-10.

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 16-fatal-flaw-invalidation*
*Context gathered: 2026-09-11*
