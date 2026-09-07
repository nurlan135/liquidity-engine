# Phase 9: Composition (§3 Live + Overlays + Verify) - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning

## Phase Boundary

Phase 9 wires the finished Modul 3 math (Phase 7 SMT/4H/FVG + Phase 8 Asia/Judas/AMD) into what users see — live report §3 with three sub-blocks, Asia Range overlay + Judas/SMT pins on the D1 chart, SMT+Judas confluence scoring — then verifies v2.0 on the live Vercel URL (ES cold-start drill, intraday payload under maxDuration, §3 render check). No new detectors, no new math, no NY Judas, no intraday SMT — those are out of scope per REQUIREMENTS.md. ES stays off-chart.

## Implementation Decisions

### §3 degraded states

- **D-01:** Each §3 sub-block (Liquidity Path, SMT Status, AMD Timing) independently renders live content or its own reason string verbatim — per-block reasons, never a single §3-level banner. Extends the suppressed-envelope + reason-verbatim vocabulary from Phases 7–8.
- **D-02:** All-degraded §3 stacks all three reasons (one per sub-block) — no whole-§3 collapse, no information loss in the worst case (rollover week + weekend + thin history).
- **D-03:** NY session renders as an inline dimmed line inside the AMD Timing sub-block (`NY: Gözlənilir — v2.0-da ölçülmür`), beneath live Asia + London content. Partial-honest inside a live block per Phase 8 D-15.
- **D-04:** Reason prose is one line + tag — single reason line reusing detector strings verbatim (e.g. `SMT Gözlənilir.`) plus regime tags (`SMT razılaşır.`). Matches the AMD `REASON_*` precedent; no multi-sentence institutional paragraphs per sub-block.

### Asia overlay form

- **D-05:** Asia Range renders as a dashed accent line pair (Asia high / Asia low price-lines, same pattern as existing EQ/Q1/Q3 lines in `nq-chart.tsx`) — no new primitive, no shaded box competing with Premium/Discount zone fills.
- **D-06:** Judas markers use shape + color split via series markers — candidates hollow/outline, confirmed solid filled. Direct canvas translation of the Phase 8 hollow-vs-solid vocabulary; legible at D1 zoom.
- **D-07:** SMT renders as a single pin (arrow/marker) on the D1 bar where the matched swing-pair confirms — minimal, matches the daily-only SMT discipline from Phase 7. Sweeper-leg detail lives in §3 prose, not on the canvas.
- **D-08:** Stale overlays dim but persist (opacity desaturation like the existing zone-fill `opacityScale 0.5` stale precedent) — never hidden on stale. Overlays carry their own leg staleness; chart never falls back to clean D1 silently.

### Confluence scoring (ICT-15)

- **D-09:** Conviction tiers, not numbers — discrete tiers (e.g. standard / yüksək inam) driven by agreement count: confirmed Judas + aligned SMT = highest tier. Nothing numeric, nothing percentage-like, honoring the no-fake-precision out-of-scope rule.
- **D-10:** Confluence renders as a conviction line inside the §3 header (under the `3. LIQUIDITY SEQUENCING` title) — the score lives where its inputs live, never in the §2-owned report title.
- **D-11:** Suppressed SMT caps confluence at the base tier with the suppression reason visible in the SMT sub-block — absence of signal never masquerades as disagreement, and no separate `qiymətləndirilməyib` state is introduced.
- **D-12:** Only confirmed Judas (solid) counts toward highest conviction; candidates (hollow) render marker + hedge prose with zero score impact. Matches the ≤25% false-positive budget discipline from Phase 8.

### Intraday plumbing

- **D-13:** New intraday store legs (`nq1h`, `nq15m`) with per-leg envelopes join the Zustand store and the staggered poll — extends the Phase 6 D-01/D-04/D-06 precedent (independent legs, per-leg `lastUpdated`/stale/`lastError`, never merged booleans). No second freshness system. — **Reversibility:** costly — two more polled legs flow into store shape, stagger offsets, selectors, and every leg-aware test
- **D-14:** Uniform 60s cadence for all legs (daily + 1H + 15M) per Phase 6 D-02 — bounded history windows keep payloads cheap, one rule to verify.
- **D-15:** Intraday legs carry the same stale/`lastError` envelope as daily legs; selectors refuse with stated reasons and §3 renders them verbatim per D-01. No daily-derived fallback approximations — wrong-exact session levels are worse than honest gaps.
- **D-16:** DEPLOY-02 maxDuration posture is verify-don't-redesign — keep the current route shape (`maxDuration = 15`, bounded ranges from the Phase 6 live probe); the live-URL drill proves the intraday payload fits, redesign only on drill failure.

### Claude's Discretion

None — user decided every question directly (no "You decide" selections).

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — ICT-15, UI-05, UI-06, DEPLOY-02 (the four locked requirements this phase implements) + out-of-scope guardrails (no NY Judas, no intraday SMT, no fake precision, FVG-only IRL)
- `.planning/ROADMAP.md` — Phase 9 entry: goal, dependencies (Phases 7 + 8), all four success criteria (per-block reasons, null-autoscale overlay + markers with ES off-chart, rule-based confluence, per-leg Vercel verify)
- `.planning/PROJECT.md` — Constraints (zero budget, Zustand-only, 60s cache, `src/lib/ict` purity, no LLM) and v2.0 milestone target features

### Prior phase context
- `.planning/phases/07-smt-4h-1h-sequencing-math/07-CONTEXT.md` — SMT output shape `{ direction, sweeperLeg, nqWindow, esWindow, bpsGap }`, suppressed envelopes (`CORR_DECOUPLED`, `rollover-week`), daily-only discipline, FVG sweep-then-reject precedent, 4H NY-anchored synthesis
- `.planning/phases/08-amd-sessions-asia-range-judas/08-CONTEXT.md` — Asia 20:00–00:00 NY (1H range + 15M sweep, NQ-only), killzone 02:00–05:00 ET strict, candidates hollow vs confirmed solid + ≤25% budget, AMD `{ phase, reason, inputs }` + `REASON_*` Azerbaijani strings, NY `Gözlənilir`, SMT as read-only regime tag
- `.planning/phases/06-dual-symbol-proxy-data-contracts/06-CONTEXT.md` — Per-leg stale envelopes + :00/:30 stagger + 60s uniform cadence (D-01–D-04, D-06), inner-join + coverage diagnostics + warn-never-refuse (D-13–D-15), epoch-vs-string contract split (D-16), `NQ 12s · ES 48s` strip vocabulary

### Domain spec
- `reference/institutional_rules.md` §Modul 3 + §3 — Session Manipulation (AMD) definition, §3 "Session AMD Timing" prose shape (`Asia Range [Təmizlənib / Təmizlənməyib]. London/NY Judas Swing [Baş verib / Gözlənilir]`)

### Existing code (the composition surface)
- `components/dashboard/report.tsx` — Report component: `REPORT_SECTIONS` map, §2 live prose, dimmed UNAVAILABLE blocks (§3 is index 3, currently dimmed) — the file gaining the live §3 block with three sub-blocks + conviction line
- `src/lib/report.ts` — `REPORT_SECTIONS` contract (six fixed sections, `live`/`unavailable` states, locked UNAVAILABLE chip) + `REGIME_BADGE` / `PRE_NEWS_BADGE` copy precedent
- `components/charts/nq-chart.tsx` — D1 chart: price-line pattern (EQ/DOL/Q1/Q3/OTE), zone-fill primitive with stale `opacityScale`, series-marker-free today — gains Asia line pair + Judas/SMT markers
- `src/lib/chart-mapper.ts` — `mapCandlesToSeries` + `priceLineInputs` / `levelLineInputs` pass-through mappers — Asia line inputs follow the same shape
- `src/lib/store.ts` — Zustand store: daily NQ/ES legs, `:00/:30` stagger + jitter, per-leg envelopes, `selectRange/selectBias/selectDOL/selectRegime/selectLevels/selectRollover` selector precedent — gains `nq1h`/`nq15m` legs + `selectSMT/selectAMD`-style selectors
- `src/lib/ict/amd.ts` — `AmdOutput { phase, reason, inputs }` + `REASON_*` strings + `SMT_AGREE_TAG`/`SMT_SUPPRESSED_TAG` — §3 AMD Timing renders these verbatim
- `src/lib/ict/smt.ts` — `detectSMT` output + suppressed envelopes — §3 SMT Status renders these verbatim

## Existing Code Insights

### Reusable Assets
- Price-line create/remove lifecycle (`components/charts/nq-chart.tsx:87-140,206-270`) — Asia high/low lines reuse this verbatim; null-autoscale keeps them off the price scale
- Zone-fill primitive with stale desaturation (`components/charts/nq-chart.tsx:143-164,272-275`, `opacityScale 0.5`) — the D-08 dim-but-persist template for overlays
- Suppressed-envelope vocabulary (`CORR_DECOUPLED`, `rollover-week`, per-leg stale refusal from Phases 6–8) — §3 sub-blocks render one honest pattern for all degradations
- AMD `REASON_*` + tag strings (`src/lib/ict/amd.ts:48-58`) — the one-line + tag prose template for all §3 sub-blocks
- Stagger + jitter + `lastSchedule` in state (`src/lib/store.ts:195-387`) — intraday legs extend the same grid; offsets stay in Zustand state, never module cells
- `isValidEnvelope` per-leg guard + `computeCoverage` (`src/lib/store.ts:51-64,173-182`) — intraday legs get the same boundary validation

### Established Patterns
- Pure `src/lib/ict` functions with injected time (no `Date.now` inside) — Phase 9 adds selectors + prose, no new math modules
- Honest degrade: stale flags, CLOSED weekends, `Gözlənilir` unavailable markers, `Məlumat yoxdur` null fallback — §3 three-reason stacking extends this vocabulary
- Azerbaijani prose precedent (trap-vs-genuine, status-strip copy, `Təmizlənib/Gözlənilir`, `Formalaşan şam`) — §3 conviction tiers + sub-block prose follow suit
- `data-slot` attributes on report/chart DOM (`report.tsx`, `nq-chart.tsx`) — §3 sub-blocks + markers need stable slots for the live-URL render check
- Fixture-test density of the existing suite — new selectors ship with fixtures: per-block degraded, all-degraded, suppressed-SMT confluence cap, candidate-zero-impact, stale-overlay-dim

### Integration Points
- `components/dashboard/report.tsx` §3 block (new) — three sub-blocks (Liquidity Path ← FVG/ERL-IRL state, SMT Status ← `selectSMT`, AMD Timing ← `selectAMD`) + conviction line in §3 header; `REPORT_SECTIONS` index 3 flips `unavailable` → `live`
- `src/lib/report.ts` — section-state flip for §3; conviction-tier copy constants live alongside `REGIME_BADGE`
- `components/charts/nq-chart.tsx` (extended props) — Asia high/low price-lines + Judas/SMT series markers + stale-dim; ES stays off-chart
- `src/lib/store.ts` (extended) — `nq1h`/`nq15m` legs with envelopes + staggered timers; `selectSMT` / `selectAsia` / `selectJudas` / `selectAMD` / `selectConfluence` selectors deriving from legs + pure math
- `src/lib/confluence.ts` (new, in `src/lib` — scoring is selector-level, not `src/lib/ict` math) — tier derivation from confirmed-Judas + unsuppressed-aligned-SMT, capped at base on suppression
- Future (this phase, verify): live-URL drill — ES cold-start, intraday payload under `maxDuration`, §3 render check via `data-slot` hooks

## Specific Ideas

- Conviction tiers in Azerbaijani (e.g. standard / `yüksək inam`) as a line under the §3 title — exact tier names open to planner, but discrete words, never numbers
- Asia lines titled like existing levels (e.g. `Asia-H`, `Asia-L`) in dashed accent — planner fits the title vocabulary
- SMT pin as a single arrow/marker on the confirming D1 bar; sweeper-leg (`NQ`/`ES`) detail stays in §3 prose
- Session-label dual-stamp shape (`London KZ 02:00–05:00 ET · 10:00–13:00 Baku`) from Phase 8 specifics carries into §3 AMD Timing where space allows

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 09-composition-3-live-overlays-verify*
*Context gathered: 2026-09-07*
