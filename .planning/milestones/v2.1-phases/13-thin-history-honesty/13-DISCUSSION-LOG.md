# Phase 13: Thin History Honesty - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-09
**Phase:** 13-Thin History Honesty
**Areas discussed:** Indicator placement, Thin rendering behavior, Tiered vs single state, Copy and detail level

---

## Indicator placement

| Option | Description | Selected |
|--------|-------------|----------|
| Banner strip above chart (Recommended) | Reuses the existing rollover-banner pattern in terminal-shell (role=status, mono text). No canvas overlap, screen-reader friendly, sits next to MARKET CLOSED ribbon without clashing. | ✓ |
| Badge overlaid on canvas | Like the STALE badge / MARKET CLOSED ribbon inside NqChart. Always visible with the candles, but fights canvas space and Phase 11's pixel-stable chrome. | |
| Regime row only | No chart-surface change at all — degrade lives in the regime badge + report prose. Smallest diff, but invisible if the user only looks at candles. | |

**User's choice:** Banner strip above chart (Recommended)
**Notes:** None.

## Indicator placement — banner coexistence

| Option | Description | Selected |
|--------|-------------|----------|
| Stack both strips (Recommended) | Two role=status rows above chart, thin-history first. Both truths stay visible; matches how MARKET CLOSED ribbon coexists with banners today. | ✓ |
| Thin wins alone | Thin-history replaces rollover banner — extremes are unreliable anyway, so rollover math on them misleads. Simpler but hides a real signal. | |
| Single combined line | One strip merging both reasons. Compact, but copy gets long and the two conditions clear independently. | |

**User's choice:** Stack both strips (Recommended)
**Notes:** None.

## Indicator placement — persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible (Recommended) | Honesty marker persists like the STALE badge — every thin render carries it. No dismiss state to build, no risk of a dismissed warning on misleading zones. | ✓ |
| Dismissible per session | User can close it; returns on reload or when history refills. Cleaner for regulars, but adds dismiss state and a way to hide the truth. | |

**User's choice:** Always visible (Recommended)
**Notes:** None.

## Indicator placement — empty state

| Option | Description | Selected |
|--------|-------------|----------|
| Empty keeps its own (Recommended) | Zero candles stays "Məlumat yoxdur" with the Yenilə button; the thin banner only covers 1+ candles where a chart actually renders. Two distinct states, each honest about itself. | ✓ |
| Unify both states | One honesty treatment for zero and thin alike. Fewer branches, but the empty state loses its retry affordance context. | |

**User's choice:** Empty keeps its own (Recommended)
**Notes:** None.

---

## Thin rendering behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Candles + dimmed zones (Recommended) | Available candles render normally; Premium/Discount fills mute (like the stale 0.5 opacity precedent) so zones read as provisional, not authoritative. | ✓ |
| Full chart + banner only | Canvas renders exactly as today; the banner carries all the honesty. Zero chart-code change, but zones from 5 candles look fully confident. | |
| Candles only, zones hidden | Price lines and fills disappear until history fills. Strongest honesty, but chart loses its dealing-range identity — the terminal's core value. | |

**User's choice:** Candles + dimmed zones (Recommended)
**Notes:** None.

## Thin rendering — overlay scope

| Option | Description | Selected |
|--------|-------------|----------|
| Zones + levels dim, markers stay (Recommended) | Zone fills, EQ/DOL, Q1/Q3/OTE price lines mute; Judas/SMT pins and Asia lines stay full — a detected sweep is still a detected sweep even on thin history. | ✓ |
| Everything dims uniformly | Whole canvas treatment including markers. Simplest rule, but buries real Judas/SMT signals that don't depend on the range window. | |
| Only zone fills dim | Fills mute but all price lines stay full. Minimal change, yet EQ/DOL from 5 candles still read as precise levels. | |

**User's choice:** Zones + levels dim, markers stay (Recommended)
**Notes:** None.

## Thin rendering — viewport

| Option | Description | Selected |
|--------|-------------|----------|
| Render as-is, no stretching fix (Recommended) | Candles render at natural width even if sparse — 02-UI-SPEC's "without stretching" intent, and no custom viewport logic to build or break. | ✓ |
| Constrain viewport to data | Chart fits its time axis to available candles so 5 bars don't float in a 6-month axis. Tidier, but fights lightweight-charts autoscaling and Phase 11's view-preservation. | |

**User's choice:** Render as-is, no stretching fix (Recommended)
**Notes:** None.

## Thin rendering — proof method

| Option | Description | Selected |
|--------|-------------|----------|
| Both: tests + human glance (Recommended) | Unit tests assert the thin flag reaches the chart and dimming applies; a human glance confirms it looks honest. Matches Phase 11's D-05/D-06 proof pattern. | ✓ |
| Human glance only | Phase 11 precedent verbatim — visual check on thin fixture, clean console. Faster, but the flag-plumbing has no regression guard. | |
| Automated only | Tests assert banner + dimming without human review. Deterministic, but 'looks honest' is a judgment tests can't fully make. | |

**User's choice:** Both: tests + human glance (Recommended)
**Notes:** None.

---

## Tiered vs single state

| Option | Description | Selected |
|--------|-------------|----------|
| Three tiers (Recommended) | Range-thin (<20: extremes unreliable) vs regime-degraded (20–33: Sıxılma) vs full (34+) — mirrors the math exactly (window=20, MIN_CANDLES_FULL=34). Each tier gets its own banner copy. | ✓ |
| Single thin state | One banner whenever history is below full. Simpler UI and fewer branches, but a 25-candle chart warns as loudly as a 3-candle one. | |
| Two tiers | Thin (<20) vs full-ready (20+), ignoring the regime-degrade band. Collapses the Sıxılma nuance the regime path already computes. | |

**User's choice:** Three tiers (Recommended)
**Notes:** None.

## Tiers — dimming strength

| Option | Description | Selected |
|--------|-------------|----------|
| Uniform dimming (Recommended) | One muted treatment for both thin tiers; the banner copy carries the tier distinction. Canvas logic stays single-branch — tiering lives in text, not pixels. | ✓ |
| Graduated dimming | Range-thin dims harder than regime-degraded. Visually expressive, but two opacity levels to tune and verify for a nuance words already convey. | |

**User's choice:** Uniform dimming (Recommended)
**Notes:** None.

## Tiers — threshold source

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse math constants (Recommended) | Range window (20) from computeRange and MIN_CANDLES_FULL (34) from regime.ts drive the tiers. One source of truth; UI can never drift from what the math considers thin. | ✓ |
| UI-local thresholds | Chart defines its own cutoffs independent of the math. Decouples display from computation, but the two can disagree about what 'thin' means. | |

**User's choice:** Reuse math constants (Recommended)
**Notes:** None.

## Tiers — report scope

| Option | Description | Selected |
|--------|-------------|----------|
| Chart-local only (Recommended) | Banner + dimming carry the tiers; report keeps its existing textual degrade (Sıxılma + rationale). No report-prose rework in this phase — chart honesty is the gap. | ✓ |
| Report tiers too | §2/§3 wording distinguishes range-thin from regime-degraded. Fuller honesty, but expands scope into report copy the audit never flagged. | |

**User's choice:** Chart-local only (Recommended)
**Notes:** None.

---

## Copy and detail level

| Option | Description | Selected |
|--------|-------------|----------|
| Azerbaijani + counts (Recommended) | Matches the terminal's voice ('Məlumat yoxdur', 'Formalaşan şam') and the house pattern of counts in reason strings — e.g. '12 / 20 şam — diapazon etibarsız'. Precise and native. | ✓ |
| Azerbaijani, no counts | Plain warning in terminal voice without numbers. Simpler copy, but the user can't tell 19 candles from 3. | |
| English technical | 'THIN HISTORY · 12 of 20 candles' in mono caps like the ROLLOVER copy. Consistent with banner chrome, but breaks the Azerbaijani voice elsewhere. | |

**User's choice:** Azerbaijani + counts (Recommended)
**Notes:** None.

## Copy — per-tier wording

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct per tier (Recommended) | Range-thin warns extremes are unreliable; regime-degraded notes Sıxılma. Each state says what it means — the user learns why 8 candles differ from 25. | ✓ |
| Shared line, counts differ | One template, tier visible only in the numbers. Less copy to write and translate, but the qualitative difference stays implicit. | |

**User's choice:** Distinct per tier (Recommended)
**Notes:** None.

## Copy — consequence

| Option | Description | Selected |
|--------|-------------|----------|
| Name the consequence (Recommended) | Banner says zones and levels are provisional — e.g. range-thin notes extremes may shift. Tells the user what not to trust, not just that data is short. | ✓ |
| State thinness only | Banner reports the counts and stops there. Shorter, but leaves the user to infer why thin history matters for their levels. | |

**User's choice:** Name the consequence (Recommended)
**Notes:** None.

## Copy — final wording

| Option | Description | Selected |
|--------|-------------|----------|
| Claude's discretion (Recommended) | Direction is locked (Azerbaijani, counts, consequence, per-tier); exact phrasing left to the planner/implementer following terminal voice. No wordsmithing session needed. | ✓ |
| Lock exact strings now | Decide the literal banner text in this discussion. Precise, but spends discussion time on copy the implementer could draft from locked direction. | |

**User's choice:** Claude's discretion (Recommended)
**Notes:** None.

---

## Claude's Discretion

- Exact Azerbaijani banner strings (D-13/14/15 direction locked; phrasing at implementation)
- Flag-plumbing mechanics (new NqChart prop vs derived signal, selector shape), dimming value, test structure

## Deferred Ideas

None — discussion stayed within phase scope.
