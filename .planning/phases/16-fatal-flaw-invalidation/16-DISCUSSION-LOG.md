# Phase 16: Fatal-Flaw Invalidation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-11
**Phase:** 16-fatal-flaw-invalidation
**Areas discussed:** HARD/SOFT taxonomy, Shared-snapshot shape, Sentence + challenge bank, SOFT unblock logic

---

## HARD/SOFT taxonomy

| Option | Description | Selected |
|--------|-------------|----------|
| Rollover + stale only | Rollover-week corruption + stale-leg only. Non-negotiable, never trade. | ✓ |
| Plus thin history | Adds thin-history bars as HARD. | |
| You decide | Planner proposes the HARD set at plan time. | |

**User's choice:** Rollover + stale only (Recommended)
**Notes:** Thin history already renders dimmed per Phase 13 — stays out of HARD.

| Option | Description | Selected |
|--------|-------------|----------|
| SMT conflict + opposite sweep | SMT suppressed/correlation-decoupled + opposite-direction sweep confirmed. | ✓ |
| Wider SOFT net | Plus AMD-phase contradiction and displaced-beyond-X. | |
| You decide | Planner proposes the SOFT set at plan time. | |

**User's choice:** SMT conflict + opposite sweep (Recommended)
**Notes:** Wider net rejected — permanent-QUIET risk per PITFALLS P7.

| Option | Description | Selected |
|--------|-------------|----------|
| Closed-candle confirm | Closed-candle confirmation only, like the trigger purge gate. | ✓ |
| N-close hysteresis | N consecutive closes before a flaw fires. | |
| You decide | Planner picks confirmation depth at plan time. | |

**User's choice:** Closed-candle confirm (Recommended)
**Notes:** Prevents intra-bar flicker per PITFALLS P3 hysteresis rule.

| Option | Description | Selected |
|--------|-------------|----------|
| Specific reason + class | Every verdict prints its specific reason plus HARD/SOFT class and unblock condition. | ✓ |
| You decide | Planner drafts the template at plan time. | |

**User's choice:** Specific reason + class (Recommended)
**Notes:** Generic "Invalidated" alone is banned (PITFALLS P7 rule).

---

## Shared-snapshot shape

| Option | Description | Selected |
|--------|-------------|----------|
| Trigger output + envelopes | checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf }) on the same asOf instant. | ✓ |
| Re-derive from candles | checkFatalFlaw re-derives structure from candle arrays. | |
| You decide | Planner picks the input shape at plan time. | |

**User's choice:** Trigger output + envelopes (Recommended)
**Notes:** Matches PITFALLS single-evaluation contract; re-derivation risks split-snapshot flicker.

| Option | Description | Selected |
|--------|-------------|----------|
| Flaw-after-trigger, flaw wins | Flaw evaluated AFTER trigger on the same snapshot; INVALIDATED supersedes FIRING deterministically. | ✓ |
| Flaw-first suppression | Flaw evaluated first; suppresses the trigger to WAIT before gates run. | |
| You decide | Planner picks the evaluation order at plan time. | |

**User's choice:** Flaw-after-trigger, flaw wins (Recommended)
**Notes:** No timestamp racing — pure function order.

| Option | Description | Selected |
|--------|-------------|----------|
| Pure ict module | checkFatalFlaw in src/lib/ict/invalidation.ts as a pure function under the purity guard. | ✓ |
| Selector-level only | Selector-level logic beside confluence.ts. | |
| You decide | Planner picks the module home at plan time. | |

**User's choice:** Pure ict module (Recommended)
**Notes:** Same discipline as trigger.ts.

| Option | Description | Selected |
|--------|-------------|----------|
| Same snapshot, no re-fetch | checkFatalFlaw never fetches or re-slices candles. | ✓ |
| You decide | Planner defines the snapshot-sharing mechanism at plan time. | |

**User's choice:** Same snapshot, no re-fetch (Recommended)
**Notes:** One asOf, one snapshot.

---

## Sentence + challenge bank

| Option | Description | Selected |
|--------|-------------|----------|
| Direction x unswept pool | Rule table keyed on bias direction × nearest unswept pool. | ✓ |
| Per-class generic | One generic sentence per flaw class. | |
| You decide | Planner drafts the rule table at plan time. | |

**User's choice:** Direction x unswept pool (Recommended)
**Notes:** Falsifiable like the FEATURES spec.

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed bank, trap-keyed | Small fixed bank (3–5) keyed on dominant trap: premium-chase, pre-news engineering, SMT divergence ignored. | ✓ |
| You decide | Planner sizes and keys the bank at plan time. | |

**User's choice:** Fixed bank, trap-keyed (Recommended)
**Notes:** Deterministic selection, verbatim Azerbaijani.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, Azerbaijani verbatim | Verbatim Azerbaijani templates drafted at plan time, test-pinned with toBe. | ✓ |
| You decide | Planner picks the language convention at plan time. | |

**User's choice:** Yes, Azerbaijani verbatim (Recommended)
**Notes:** Follows the trigger D-09 precedent.

| Option | Description | Selected |
|--------|-------------|----------|
| Strings here, UI in 17 | This phase ships the pure strings; Phase 17 wires the §6 UI block. | ✓ |
| You decide | Planner defines the §6 handoff at plan time. | |

**User's choice:** Strings here, UI in 17 (Recommended)
**Notes:** Delivery surface is live report §6.

---

## SOFT unblock logic

| Option | Description | Selected |
|--------|-------------|----------|
| FIRING->ARMED only | SOFT flaws downgrade FIRING to ARMED only — never touch QUIET/ARMED, never kill. | ✓ |
| SOFT blocks ARMED too | SOFT can also block ARMED from re-firing. | |
| You decide | Planner defines downgrade scope at plan time. | |

**User's choice:** FIRING->ARMED only (Recommended)
**Notes:** Matches research HARD/SOFT contract; stricter option risks permanent-QUIET drift.

| Option | Description | Selected |
|--------|-------------|----------|
| Stated per-flaw condition | Each SOFT flaw states its re-arm condition, printed with the verdict. | ✓ |
| Generic note | Generic 'conditions improve' note. | |
| You decide | Planner drafts unblock conditions at plan time. | |

**User's choice:** Stated per-flaw condition (Recommended)
**Notes:** E.g. SMT suppressed CORR_DECOUPLED 0.62 — re-arm if correlation recovers above 0.70.

| Option | Description | Selected |
|--------|-------------|----------|
| Neutral, HARD/SOFT distinct | INVALIDATED renders neutral/informative; HARD vs SOFT visually distinct in Phase 17. | ✓ |
| You decide | Planner picks the styling contract at plan time. | |

**User's choice:** Neutral, HARD/SOFT distinct (Recommended)
**Notes:** No red-error styling.

| Option | Description | Selected |
|--------|-------------|----------|
| Hold ARMED reason | A SOFT downgrade carries the underlying ARMED reason forward alongside the flaw reason. | ✓ |
| Flaw reason only | Flaw reason alone is enough. | |
| You decide | Planner picks at plan time. | |

**User's choice:** Hold ARMED reason (Recommended)
**Notes:** Phase 17 ticket knows what would complete the setup.

---

## Claude's Discretion

None — user decided every area explicitly.

## Deferred Ideas

None — discussion stayed within phase scope.
