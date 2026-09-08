# Phase 9: Composition (§3 Live + Overlays + Verify) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-07
**Phase:** 9-Composition (§3 Live + Overlays + Verify)
**Areas discussed:** §3 degraded states, Asia overlay form, Confluence scoring, Intraday plumbing

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| §3 degraded states | Three sub-blocks each degrade independently — per-block reason rendering vs single banner? | ✓ |
| Asia overlay form | Asia Range on the D1 chart via null-autoscale primitive — box, line pair, or session shading? | ✓ |
| Confluence scoring | ICT-15: SMT+Judas agreement boosts conviction — tiers vs points, placement, no-fake-precision limits? | ✓ |
| Intraday plumbing | Asia/Judas selectors need 1H + 15M NQ rows — new store legs with polling vs fetch-on-render? | ✓ |

**User's choice:** All four areas selected
**Notes:** No prior-context re-asking needed; Phases 6–8 CONTEXT.md files supplied the locked vocabulary (suppressed envelopes, AMD output shape, stagger precedent).

---

## §3 degraded states

| Option | Description | Selected |
|--------|-------------|----------|
| Per-block reasons | Each sub-block independently shows live content or its own reason string verbatim | ✓ |
| Single §3 banner | One banner at §3 top; sub-blocks dimmed without individual reasons | |
| Whole-§3 fallback (all-degraded) | Collapse to a single 'Məlumat yoxdur'-style line with dominant reason | |
| Three reasons stacked (all-degraded) | Each sub-block still renders its own reason — maximum honesty | ✓ |
| Inline NY line | AMD Timing shows Asia + London live, dimmed 'NY: Gözlənilir' line beneath | ✓ |
| Footnote marker (NY) | Live content only, plus small footnote noting NY unmeasured | |
| One line + tag (prose) | Single reason line reusing detector strings verbatim plus regime tags | ✓ |
| Paragraph prose | 2–3 sentence institutional-style explanation per sub-block | |

**User's choice:** Per-block reasons; three reasons stacked when all degraded; inline NY line; one line + tag prose (all recommended options)
**Notes:** Straight pass — 4 questions, then "Next area". No follow-up questions requested.

---

## Asia overlay form

| Option | Description | Selected |
|--------|-------------|----------|
| Line pair (Asia) | Two dashed accent price-lines at Asia high/low — reuses proven price-line pattern | ✓ |
| Shaded box (Asia) | Filled rectangle between Asia high/low via zone-primitive pattern | |
| Shape + color split (Judas) | Candidates hollow/outline markers, confirmed solid filled | ✓ |
| Text pins (Judas) | Small 'J'/'J*' text markers, hollow vs solid via weight or border | |
| Single pin at signal bar (SMT) | One arrow/marker on the D1 bar where the matched swing-pair confirms | ✓ |
| Leg-pair annotation (SMT) | Marker plus short label naming the sweeper leg | |
| Dim but persist (stale) | Overlays desaturate like zone-fill opacityScale 0.5 but stay visible | ✓ |
| Hide on stale | Remove overlays when source leg is stale, fall back to clean D1 | |

**User's choice:** Line pair; shape + color split; single SMT pin; dim but persist (all recommended options)
**Notes:** Straight pass — 4 questions, then "Next area". Sweeper-leg detail stays in §3 prose, not on canvas.

---

## Confluence scoring

| Option | Description | Selected |
|--------|-------------|----------|
| Conviction tiers | Discrete tiers (standard / yüksək inam) driven by agreement count — no numbers | ✓ |
| Count badge | Simple '2/2 təsdiq' style count of confirming factors | |
| Inside §3 header | Conviction line under the §3 title — score lives where its inputs live | ✓ |
| Report title badge | Next to '# NQ=F \| HTF BIAS' card title, alongside bias | |
| Cap at standard (suppressed SMT) | Base tier with suppression reason visible in SMT sub-block | ✓ |
| Explicit 'unrated' state | Distinct 'qiymətləndirilməyib' marker whenever either input unavailable | |
| Confirmed only (Judas) | Only confirmed Judas counts; candidates render marker + hedge prose, zero score impact | ✓ |
| Candidate half-credit | Candidates nudge conviction to a middle tier | |

**User's choice:** Conviction tiers; inside §3 header; cap at standard when suppressed; confirmed only (all recommended options)
**Notes:** Straight pass — 4 questions, then "Next area". No separate unrated state; absence of signal never masquerades as disagreement.

---

## Intraday plumbing

| Option | Description | Selected |
|--------|-------------|----------|
| New store legs + poll | Add nq1h/nq15m to Zustand with per-leg envelopes, riding :00/:30 stagger + 60s cadence | ✓ |
| Fetch-on-render hook | Hook fetches intraday envelopes on mount, cached in component state — no store changes | |
| Same 60s uniform (cadence) | All legs on proven 60s cadence; bounded windows keep payloads cheap | ✓ |
| Slower intraday lane | Intraday refreshes less often (e.g. 5 min) since sessions update slowly | |
| Per-leg stale envelope (failure) | Intraday legs carry stale/lastError; selectors refuse with stated reasons, §3 renders verbatim | ✓ |
| Fall back to daily | Degrade to daily-derived approximations when intraday missing | |
| Verify, don't redesign (maxDuration) | Keep route shape; live-URL drill proves payload fits, redesign only on failure | ✓ |
| Pre-split the route | Dedicated intraday path upfront to isolate maxDuration risk before drill | |

**User's choice:** New store legs + poll; same 60s uniform; per-leg stale envelope; verify-don't-redesign (all recommended options)
**Notes:** Straight pass — 4 questions. Explicitly rejected daily-fallback approximations (wrong-exact worse than honest gaps).

---

## Done check

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Write CONTEXT.md with the decisions captured | ✓ |
| Explore more gray areas | Additional areas (e.g. §3 sub-block order, ES cold-start drill, Baku dual-stamp labels) | |

**User's choice:** I'm ready for context
**Notes:** No additional gray areas requested.

---

## Claude's Discretion

None — user decided every question directly (no "You decide" selections).

## Deferred Ideas

None — discussion stayed within phase scope.
