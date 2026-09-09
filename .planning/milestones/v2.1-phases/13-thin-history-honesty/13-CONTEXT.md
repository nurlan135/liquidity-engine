# Phase 13: Thin History Honesty - Context

**Gathered:** 2026-09-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 13 closes the known W-NEW-1 gap from the v1.0 audit: `selectRange()` already computes `thinHistory` (closed candles < 20-bar window) and the regime path already degrades to `Sıxılma` below 34 candles, but neither signal reaches the user's eyes on the chart. Today a 5-candle history renders as a confident-looking full chart with Premium/Discount zones. This phase makes that rendering honest: a persistent banner strip, dimmed zones/levels, full-strength markers. No new ICT math, no new overlays, no report-prose rework — purely surfacing what the math already knows.

</domain>

<decisions>
## Implementation Decisions

### Indicator placement
- **D-01:** Thin-history signal lives as a banner strip above the chart, reusing the existing `rollover-banner` pattern in `terminal-shell.tsx` (`role="status"`, mono text). No canvas overlap, screen-reader friendly.
- **D-02:** When thin-history and rollover-suspect are both true, both strips stack — thin-history first. Both truths stay visible; matches how the MARKET CLOSED ribbon coexists with banners today.
- **D-03:** Banner is always visible on every thin render. No dismiss state — a dismissible honesty marker risks a dismissed warning sitting over misleading zones. Persists like the STALE badge.
- **D-04:** The empty (0-candle) state keeps its own "Məlumat yoxdur" + Yenilə message. The thin banner covers only 1+ candles where a chart actually renders. Two distinct states, each honest about itself.

### Thin rendering behavior
- **D-05:** Available candles render normally; Premium/Discount zone fills mute (extending the stale 0.5-opacity precedent) so zones read as provisional, not authoritative.
- **D-06:** Zones + levels dim (zone fills, EQ/DOL, Q1/Q3/OTE price lines); Judas/SMT pins and Asia lines stay full strength — a detected sweep is still a detected sweep even on thin history.
- **D-07:** No viewport constraining to fit sparse data. Candles render at natural width even if sparse (02-UI-SPEC's "without stretching" intent); no custom viewport logic to build or break against Phase 11's view-preservation.
- **D-08:** Proof is both automated and human: unit tests assert the thin flag reaches the chart and dimming applies, plus a human visual glance confirming it looks honest (Phase 11 D-05/D-06 pattern).

### Tiered vs single state
- **D-09:** Three user-visible tiers mirroring the math exactly: range-thin (<20 closed candles, extremes unreliable) vs regime-degraded (20–33, Sıxılma) vs full (34+). Each tier gets its own banner copy.
- **D-10:** Dimming is uniform across both thin tiers — one muted treatment. The banner copy carries the tier distinction; tiering lives in text, not pixels (single-branch canvas logic).
- **D-11:** Tier thresholds reuse the math constants — range window (20) from `computeRange`, `MIN_CANDLES_FULL` (34) from `regime.ts`. One source of truth; UI-local cutoffs are rejected so display can never drift from what the math considers thin.
- **D-12:** Tiering stays chart-local (banner + dimming). Report §2/§3 prose keeps its existing textual degrade (Sıxılma + rationale) untouched — no report-copy rework; chart honesty is the gap the audit flagged.

### Copy and detail level
- **D-13:** Banner copy is Azerbaijani with candle counts — terminal voice ("Məlumat yoxdur", "Formalaşan şam") plus the house pattern of counts in reason strings (e.g. "12 / 20 şam"). Precise and native.
- **D-14:** Distinct wording per tier: range-thin warns extremes are unreliable; regime-degraded notes Sıxılma. Each state says what it means so the user learns why 8 candles differ from 25.
- **D-15:** Copy names the consequence (zones/levels provisional, extremes may shift) — tells the user what not to trust, not just that data is short.

### Claude's Discretion
- Exact Azerbaijani banner strings (direction locked: Azerbaijani, counts, consequence, per-tier — phrasing follows terminal voice at implementation time).
- Flag-plumbing mechanics (new `NqChart` prop vs derived signal, selector shape), dimming value within the stale-opacity precedent, and test structure.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — HIST-01 (thin history renders honestly: indicator or fallback, no silent empty/misleading display).
- `.planning/ROADMAP.md` — Phase 13 goal, success criteria, HIST-01 mapping; depends on Phase 11 (shares chart area).

### The gap being closed
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — W-NEW-1: `selectRange().thinHistory` produced but never surfaced; accepted as tracked tech debt for this milestone.
- `.planning/milestones/v1.0-phases/02-terminal-composition/02-UI-SPEC.md` §partial (E2) — original intent: thin history renders available candles without stretching, regime badge degrades honestly; chart half never built.

### Phase 11 boundary (what Phase 13 owns)
- `.planning/phases/11-chart-rendering-polish/11-CONTEXT.md` — D-07: Phase 11 touched only the populated chart; empty/thin display deferred here. D-05/D-06: human-glance + clean-console proof pattern reused by D-08.

### Chart implementation (what changes)
- `components/charts/nq-chart.tsx` — Receives `rangeHigh/Low/eq` but no thin flag today; zone-fill getter hardcodes `thinHistory: false` (~line 286); `chart-empty` overlay only for zero candles (~line 511).
- `components/dashboard/terminal-shell.tsx` — `rollover-banner` pattern (~line 245), two `chart-empty` states (zero candles ~line 255; range/dol null ~line 283), `NqChart` invocation (~line 264) where the thin signal must be threaded through.

### Math constants (single source of truth per D-11)
- `src/lib/ict/range.ts` — `thinHistory: closed.length < window` (window 20).
- `src/lib/ict/regime.ts` — `MIN_CANDLES_FULL = 34`, honest-degrade rationale pattern with `(actual of required)` counts.
- `src/lib/ict/types.ts` — `DealingRange.thinHistory: boolean` field.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `rollover-banner` block (`components/dashboard/terminal-shell.tsx` ~line 245): `role="status"`, mono tracked text, conditional on selector output — the exact pattern the thin banner follows (D-01), including stacking order.
- `chart-empty` states (~lines 255, 283): shared "Məlumat yoxdur" copy with Yenilə retry — stays untouched per D-04; thin path is a third branch between these and the full chart.
- Stale 0.5 zone opacity (`components/charts/nq-chart.tsx` ~line 293, `zoneRef.current.opacityScale`): the dimming precedent D-05 extends.
- `attachZoneFill` getter (`components/charts/zone-primitive.ts`): reads live props for zone geometry — dimming hooks into the same live read.
- Remove-then-create price-line cycle in the data effect (~line 332): where per-line dimming (D-06) applies without touching marker logic.

### Established Patterns
- Azerbaijani UI copy throughout ("Məlumat yoxdur", "Formalaşan şam", "Sıxılma") — D-13 continues it; English mono caps reserved for ROLLOVER/MARKET CLOSED chrome.
- Honest-degrade reason strings carry counts ("Insufficient history (N of 34 closed candles)") — D-13 extends this to the banner.
- Dynamic import keeps the module top DOM-free; any thin-related chart code follows the same lazy pattern (no top-level `window` access).
- Marker/overlay failures never block candles (try/catch with empty-array fallback) — thin-plumbing failures must degrade the same way (banner missing must never blank the chart).
- Disposal is explicit in the mount-effect cleanup — any thin-related observer/listener tears down there.
- Marker plugin (`createSeriesMarkers`) and Asia lines operate independently of the range window — the reason D-06 keeps them full strength.

### Integration Points
- `terminal-shell.tsx` render chain (`lastUpdatedISO → candles.length → range/dol`): the thin branch slots between the zero-candle `chart-empty` and the full `NqChart` render.
- `NqChart` props: needs a new thin-tier input (planner's call on shape); `levels`, `asiaHigh/Low`, `judas`, `smt` props already flow through the same invocation.
- `data-slot` markers (`chart-empty`, `rollover-banner`, `stale-badge`, `closed-ribbon`, `forming-row`): existing hooks for asserting banner coexistence (D-02) and chrome stability.

</code>

<specifics>
## Specific Ideas

No specific requirements — user selected recommended options throughout. Direction locked (Azerbaijani, counts, consequence, per-tier); exact banner strings at Claude's discretion.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-Thin History Honesty*
*Context gathered: 2026-09-09*
