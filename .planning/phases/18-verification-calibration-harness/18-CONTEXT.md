# Phase 18: Verification + Calibration Harness - Context

**Gathered:** 2026-09-14
**Status:** Ready for planning

## Phase Boundary

Users can trust the execution layer's rates and cross-cutting honesty — fire band, kill rate, reason parity, stale degradation all proven on integrated pieces. Bar-by-bar replay over a hand-built 20-session 15M population with a pinned transition table (VERF-01), automated vitest parity assertions on the same snapshot (VERF-02), automated stale/thin injection proving degraded-with-provenance ticket (VERF-03), and a replay summary emitting fires/week + kill-rate against the 1–4 band. No UI changes, no new signals — this phase proves what Phases 15–17 built.

## Implementation Decisions

### Replay fixture shape
- **D-01:** Hand-built 15M rows for ~20 sessions — explicit rows exercising killzone entries, sweep bars, displacement bars, choppy-QUIET stretches, and at least one FIRING path plus one INVALIDATED path. Full control and readability over generator compactness.
- **D-02:** Step at every 15M close — feed each close through trigger+flaw in order. Strictest no-flicker proof, matches the 15M-close-gated execution scope.
- **D-03:** Pinned transition table — QUIET/ARMED/FIRING/INVALIDATED forward-only legal edges (FIRING→ARMED only via SOFT downgrade) asserted per bar. Table pinned in the test; any illegal edge fails the build.

### Parity check surface
- **D-04:** Test assertion only — cross-assert AMD phase/SMT state vs trigger gates on the same snapshot in vitest. No new UI indicator; the user sees parity as absence of failure.
- **D-05:** Exact contradiction rules pinned — e.g. FIRE_SHORT while SMT=BULLISH confirmed fails; trigger reasonKey naming a detector-disputed state fails. Strictest form; tune the rules, not the strictness, if the fixture disagrees.

### Stale drill form
- **D-06:** Automated vitest injection — frozen Yahoo legs + thin-tier fixtures injected with ticket open, asserting degraded-with-provenance. Deterministic and CI-green; no live drill doc.
- **D-07:** Full leg matrix — every leg stale individually (NQ daily, ES daily, NQ/ES 15M) plus all-stale plus thin-tier, each asserting STALE/THIN tag with provenance and never a full-strength ticket.

### Calibration output
- **D-08:** Replay summary output — the replay run emits fires/week + kill-rate + INVALIDATED count as structured output (JSON/console) compared against the 1–4/week band. No UI panel, no checked-in report file.
- **D-09:** Both FIRING and INVALIDATED required in the fixture — replay asserts ≥1 FIRING and ≥1 INVALIDATED per the success criteria, plus reports the band verdict.

### Claude's Discretion
None — user decided every area explicitly.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` (VERF-01..VERF-03) — acceptance criteria, locked scope
- `.planning/ROADMAP.md` (Phase 18 goal + success criteria) — phase boundary, 20-session population, fire band

### Research (v3.0 execution layer)
- `.planning/research/SUMMARY.md` — phase ordering rationale, verification-last position
- `.planning/research/PITFALLS.md` (P3 flicker, P7 permanent-QUIET) — shared snapshot, hysteresis, kill-rate budget
- `.planning/research/ARCHITECTURE.md` — selector wiring, flaw > ticket precedence

### Prior phases (locked contracts)
- `.planning/phases/15-why-now-trigger-engine/15-CONTEXT.md` (D-01..D-10) — three-gate engine, ARMED matrix, per-session cooldown, firing log, sweep-side direction map
- `.planning/phases/16-fatal-flaw-invalidation/16-CONTEXT.md` (D-01..D-15) — HARD/SOFT taxonomy, shared snapshot, closed-candle confirmation, sentence + challenge bank
- `.planning/phases/17-paper-ticket-4-6-live-ui-chart-pins/17-CONTEXT.md` (D-01..D-10) — fixed derivation order, STAND ASIDE with reason, degraded-with-provenance, PAPER chrome
- `src/lib/ict/trigger.ts` — `TriggerOutput` shape (`verdict`, `direction`, `reasonKey`, `gates`, `entryFvg`), `TRIGGER_*` constants
- `src/lib/ict/invalidation.ts` — `FatalFlawOutput` shape (`verdict`, `class`, `reason`, `unblock`, ARMED reason)
- `src/lib/ticket.ts` — `computeTicket` fixed-order derivation, STAND ASIDE verdicts

### Replay precedents
- `src/lib/ict/judas.ts` — Phase 8 seeded 60-session run pattern (budget ≤25% precedent for population tests)
- `src/lib/ict/asia.ts` — Asia killzone 20:00–23:45 + fallback; per-candle wall-clock session resolution
- `src/lib/ict/aggregate.ts` — `NY_TZ`, `nyMinutesOf` wall-clock discipline, shared `asOf` helper

### Project constraints
- `.planning/PROJECT.md` (Constraints: Purity, Zero budget, Zustand-only, Rule-based) — replay drives pure functions with injected `asOf`
- `.planning/phases/14-audit-debt-cleanup-purity-guard/14-CONTEXT.md` (D-05/D-06) — co-located vitest grep guard, minimal pattern set
- `reference/institutional_rules.md` (Modul 4) — WAIT default, R/R ≥ 1:3, "Kağız — no broker"

## Existing Code Insights

### Reusable Assets
- `evaluateTrigger()` (`src/lib/ict/trigger.ts`): three-gate engine driven per bar — replay feeds hand-built rows through it directly
- `checkFatalFlaw()` (`src/lib/ict/invalidation.ts`): flaw-after-trigger on the same snapshot — replay asserts supersession ordering per bar
- `computeTicket()` (`src/lib/ticket.ts`): fixed-order derivation — stale drill asserts degraded-with-provenance paths
- `detectRollover` output + per-leg stale envelopes: HARD-flaw sources reused as stale-injection inputs
- `evaluateSMT()` (`src/lib/ict/smt.ts`): suppression + correlation state for parity contradiction rules
- Firing log (Phase 15, capped ~50, calibration-JSON export): calibration summary extends its vocabulary, not its UI

### Established Patterns
- Co-located tests (`<module>.test.ts`) — replay/parity/drill tests follow suit (new `replay.test.ts` / `parity.test.ts` / `stale-drill.test.ts` or equivalent)
- Named `CALIBRATION-PROVISIONAL` exported constants pinned by boundary tests — replay asserts the 1–4/week band against them
- Purity: injected `asOf`, no `Date.now`, no store imports — enforced by `purity.test.ts` grep guard; replay constructs `asOf` per bar
- Choppy-sideways fixture must yield QUIET (spam-guard pattern) — replay includes QUIET stretches in the 20 sessions
- Verbatim Azerbaijani reasons test-pinned with `toBe` — parity asserts reasonKey-level agreement, not prose re-derivation

### Integration Points
- New replay harness test file(s) — bar-by-bar driver over the 20-session fixture, transition-table assertion, fires/week + kill-rate summary emission
- Parity assertions — same-snapshot AMD/SMT vs trigger cross-checks, exact contradiction rules pinned
- Stale-drill test file — full leg-matrix injection (each leg, all-stale, thin-tier) with ticket-open provenance assertions
- No store/UI/chart changes — this phase is test-harness only; §§3–6, panels, pins untouched

## Specific Ideas

No specific requirements — open to standard approaches. Planner picks file/task split; transition table edges and contradiction rules drafted at plan time.

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 18-verification-calibration-harness*
*Context gathered: 2026-09-14*
