# Phase 15: WHY NOW Trigger Engine - Context

**Gathered:** 2026-09-10
**Status:** Ready for planning

## Phase Boundary

Users get an honest "why now" verdict — FIRE only when killzone timing, confirmed London purge, and displacement all agree. Pure `src/lib/ict/trigger.ts` fusion over existing detector outputs plus firing log; UI panels and ticket derivation belong to Phases 16–17, verification to Phase 18.

## Implementation Decisions

### Purge gate scope
- **D-01:** London-only — the purge gate consumes `judasSwing` confirmed output on London session rows only; NY-session sweeps never fire. No separate NY sweep detector in this phase.
- **D-02:** Confirmed-only — `judas.confirmed` is required; candidate sweeps (no displacement yet) can never satisfy the purge gate.

### Displacement gate
- **D-03:** Mirror Judas 0.5 — new `TRIGGER_DISP_MULT` constant seeded at 0.5× Asia height with `CALIBRATION-PROVISIONAL` comment, following the `DISP_MULT` precedent in `judas.ts`.
- **D-04:** Entry FVG required — the displacement gate returns the entry-FVG handle the Phase 17 ticket consumes; no resolvable FVG means no FIRE (downgrade to ARMED at best).

### ARMED + cooldown
- **D-05:** Any 2 of 3 gates passing yields ARMED; 3/3 yields FIRE; 0–1 yields QUIET/WAIT_FOR_MANIPULATION.
- **D-06:** Per-session cooldown — one FIRE per session date; same-session repeat evaluations deduped, preventing repeat-fire spam.

### Firing log
- **D-07:** Minimal entry — `asOf`, verdict, per-gate booleans, direction, reason key. Enough for the 1–4/week calibration review without snapshotting full detector outputs.
- **D-08:** JSON download export — capped ~50 entries with a calibration-JSON download; no on-table-only shortcut.

### Verdict prose + direction
- **D-09:** Planner drafts verbatim Azerbaijani templates for FIRE_LONG / FIRE_SHORT / ARMED / WAIT_FOR_MANIPULATION following the §3/AMD/SMT prose precedent; reviewed at plan time.
- **D-10:** Sweep-side direction map — Asia-HIGH sweep + bearish displacement → FIRE_SHORT; Asia-LOW sweep + bullish displacement → FIRE_LONG.

### Claude's Discretion
None — user decided every area explicitly.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` (TRIG-01..TRIG-04) — acceptance criteria, locked scope
- `.planning/ROADMAP.md` (Phase 15 goal + success criteria) — phase boundary, 1–4 fires/week band

### Research (v3.0 execution layer)
- `.planning/research/SUMMARY.md` (Phase 2 section) — trigger-before-flaw ordering, firing log in same phase, 15M-close-gated scope
- `.planning/research/FEATURES.md` — three-gate engine, ARMED tier, calibratable-threshold convention
- `.planning/research/PITFALLS.md` (P1 uncalibrated thresholds, P2 spam) — provisional-constant + boundary-test mitigations
- `.planning/research/ARCHITECTURE.md` — `trigger.ts` pure fusion, `selectTrigger` derived selector, shared `asOf` helper

### Gate inputs (existing detectors)
- `src/lib/ict/judas.ts` — purge-gate source: `JudasOutput` (`confirmed`, `sweepSide`, `sweepTime`, `displacementMult`), `KILLZONE_START_MIN/END_MIN`, `DISP_MULT`, `CONFIRM_WINDOW`
- `src/lib/ict/amd.ts` — timing/phase input: `AmdOutput`, `amdPhase` gate order, NY session constants
- `src/lib/ict/smt.ts` — tag input: `SmtOutput`, correlation gate, rollover suppression
- `src/lib/ict/asia.ts` — Asia range + `ASIA_START_NY_HOUR` / `ASIA_END_NY_MINUTE` killzone + fallback
- `src/lib/ict/fvg.ts` — entry-FVG handle source: `detectFVGs`, `applyMitigation`, `FvgGap`
- `src/lib/ict/aggregate.ts` — `NY_TZ`, `nyMinutesOf` wall-clock discipline, 15M row shape
- `reference/institutional_rules.md` (Modul 4 + §§4–6) — three gates, WAIT default, R/R ≥ 1:3 downstream

### Project constraints
- `.planning/PROJECT.md` (Constraints: Purity, Zero budget, Zustand-only, Rule-based) — trigger takes detector outputs + `asOf` only
- `.planning/phases/14-audit-debt-cleanup-purity-guard/14-CONTEXT.md` (D-05/D-06) — co-located vitest grep guard, minimal pattern set

## Existing Code Insights

### Reusable Assets
- `judasSwing()` (`src/lib/ict/judas.ts`): confirmed/candidate/preRun outputs consumed directly — trigger never re-implements sweeps
- `amdPhase()` (`src/lib/ict/amd.ts`): AMD phase + conviction tier for the timing gate context
- `evaluateSMT()` (`src/lib/ict/smt.ts`): read-only SMT tag, correlation-gated
- `detectFVGs()` + `applyMitigation()` (`src/lib/ict/fvg.ts`): unmitigated-gap inventory for the entry-FVG handle
- `asiaRange()` (`src/lib/ict/asia.ts`): Asia high/low/datetime anchor for killzone + displacement denominator

### Established Patterns
- Named `CALIBRATION-PROVISIONAL` exported constants pinned by boundary tests (`KILLZONE_*`, `DISP_MULT`, `SMT_TOL_BPS` precedent)
- Co-located tests (`<module>.test.ts`, 300/300 green after Phase 14) — `trigger.test.ts` follows suit
- Purity: injected `asOf`, no `Date.now`, no store imports — enforced by `purity.test.ts` grep guard
- Choppy-sideways fixture must yield QUIET (spam-guard pattern from research P2)

### Integration Points
- `src/lib/ict/trigger.ts` (new) — `evaluateTrigger({ judas, amd, smt, fvg, asOf })` + exported `TRIGGER_*` constants
- Store `selectTrigger` (new, Phase 15) — derived selector with shared `asOf` helper; `selectFatalFlaw`/`selectTicket` attach in Phases 16–17
- Phase 16 consumes the trigger snapshot shape for flaw-supersedes-fire ordering — keep the output serializable
- Phase 18 replays evaluations bar-by-bar for monotonicity — log entries must carry enough to reconstruct verdicts

## Specific Ideas

No specific requirements — open to standard approaches. Planner picks file/task split; prose templates drafted at plan time per D-09.

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 15-why-now-trigger-engine*
*Context gathered: 2026-09-10*
