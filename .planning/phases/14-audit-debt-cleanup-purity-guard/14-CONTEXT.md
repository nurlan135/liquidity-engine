# Phase 14: Audit Debt Cleanup + Purity Guard - Context

**Gathered:** 2026-09-09
**Status:** Ready for planning

## Phase Boundary

New execution code inherits a clean `ict/` surface — no dead args, no orphaned exports, purity enforced by a guard. Mechanical cleanup, **zero behavior change**: terminal renders identically, dimming still flows via `opacityScale`, all 298 tests stay green.

## Implementation Decisions

### zoneBands dead-arg cleanup
- **D-01:** Narrow `zoneBands()` signature from full `DealingRange` to minimal `{ high, low, eq }` — filler literals (`window: 0, asOf: ''`) and the unread `thinHistory` key disappear from the `nq-chart.tsx` L292-299 call; `zone-bands.test.ts` switches to minimal objects.
- **D-02:** `DealingRange.thinHistory` stays in `range.ts` / `types.ts` (and `tracer` / `levels` / `dol` tests keep using it) — only the `zoneBands` input narrows. `thinTier` remains the display-tier truth; `thinHistory` remains the range-math flag. No drift between the two predicates.

### Orphaned thin-tier API
- **D-03:** Unexport `thinTier(closedCount)` and `ThinBannerEntry` — public surface becomes `ThinTier`, `thinTierCopy`, `resolveThinTier`, `thinBannerOrder` only (`terminal-shell.tsx` already imports just those three). External-import-break check required (grep must show zero external importers before unexport).
- **D-04:** `thin-tier.test.ts` boundary pins migrate from direct `thinTier(19/20/33/34)` calls to `resolveThinTier(candles, range)` — public-API-from-test principle; internal `thinTier` no longer tested directly.

### Purity guard mechanism
- **D-05:** Vitest grep-test (co-located, e.g. `src/lib/ict/purity.test.ts`) that reads `src/lib/ict/*.ts` sources and fails on violations — NOT an eslint rule. Must pass green on existing code (verified today: zero `Date.now`/`new Date` in `src/lib/ict`).
- **D-06:** Minimal pattern set only — `Date.now(` + store imports (`zustand`, `@/store`-style paths). No `new Date(`, `performance.now(`, `fetch(` — avoids false positives on legitimate injected-time usage that future trigger code needs.

### Asia note scope
- **D-07:** In scope as a small doc-only addition — explain the Asia fallback (20:00–23:45 killzone + last-completed-session fallback, edbc70a) and why it increases overlay frequency by design. Code comment at the fallback site or a short note; no behavior change, no new logic.

### Claude's Discretion
None — user decided every area explicitly.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Debt source of truth
- `.planning/milestones/v2.1-MILESTONE-AUDIT.md` (W1/T1 dead `thinHistory` arg, W2/T2 orphaned `thinTier` export, W3 orphaned `ThinBannerEntry` type, Asia-frequency note) — exact audit wording for all three debt items
- `.planning/milestones/v2.1-phases/13-thin-history-honesty/13-PATTERNS.md` (Dead-flag cleanup §, thinTier/thinHistory same-predicate note) — why the dead literal is a landmine, predicate-equivalence constraint

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` (DEBT-01, DEBT-02, DEBT-03) — acceptance criteria, locked scope
- `.planning/ROADMAP.md` (Phase 14 goal + success criteria) — phase boundary, zero-behavior-change anchor

### Project constraints
- `.planning/PROJECT.md` (Constraints: Purity — `src/lib/ict` pure, no I/O, inject time) — the rule the guard enforces
- `.planning/research/PITFALLS.md` (P5 purity violations) — why the guard must land BEFORE Phase 15 trigger code

### Code under cleanup
- `components/charts/nq-chart.tsx` L285-306 (zone-fill getter + opacityScale dimming) — the dead-arg call site; dimming path that must keep working
- `src/lib/thin-tier.ts` (full module, 47 lines) + `src/lib/thin-tier.test.ts` — orphan surface + tests to migrate
- `src/lib/zone-bands.ts` + `src/lib/zone-bands.test.ts` — signature to narrow + tests to update
- `src/lib/ict/range.ts` + `src/lib/ict/types.ts` — `thinHistory` owner files, read-only for this phase

## Existing Code Insights

### Reusable Assets
- `zoneBands()` (`src/lib/zone-bands.ts`): pure geometry on high/low/eq only — narrowing the input type is safe, no logic change needed
- `resolveThinTier(candles, range)` (`src/lib/thin-tier.ts`): null-safe public entry already used by `terminal-shell.tsx` — becomes the test entry point for boundary pins
- `opacityScale` dimming (`nq-chart.tsx` L305): the live dimming path (`stale` or thin → 0.5) — untouched by this phase, proves DEBT-01's "dimming still flows" criterion

### Established Patterns
- Co-located tests (`<module>.test.ts` next to source, 298/298 green) — purity guard test follows the same convention
- Named-only exports for shared modules; App Router default-export exception — unexport keeps this intact
- Boundary-pin style (`thinTier.test.ts` L31-34: exactly 19/20/33/34) — migrated pins must keep the same exact-boundary assertions via `resolveThinTier`

### Integration Points
- `terminal-shell.tsx` L17/99/120/284: imports `resolveThinTier` + `thinTierCopy` + `thinBannerOrder` only — confirms `thinTier`/`ThinBannerEntry` have zero external importers (verify by grep at plan time)
- Phase 15 trigger code will edit the same chart effect blocks — debt lands first to avoid merge-shape conflicts (per `.planning/research/ARCHITECTURE.md`)

## Specific Ideas

No specific requirements — open to standard approaches. Mechanical cleanup; planner picks file/task split.

## Deferred Ideas

None — discussion stayed within phase scope. (REQUIREMENTS.md v2 items — Pain Threshold map, confidence score, journal, pre-news lock — already tracked as deferred in the requirements doc, not raised here.)

---

*Phase: 14-Audit Debt Cleanup + Purity Guard*
*Context gathered: 2026-09-09*
