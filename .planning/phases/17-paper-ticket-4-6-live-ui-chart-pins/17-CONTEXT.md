# Phase 17: Paper Ticket + §§4–6 Live UI + Chart Pins - Context

**Gathered:** 2026-09-11
**Status:** Ready for planning

## Phase Boundary

Users see the full execution picture — deterministic paper ticket, live §§4–6, chart pins — that can never be mistaken for real brokerage. Pure `src/lib/ticket.ts` derivation (outside `ict/`, brokerage math not ICT methodology) in fixed order — WHY NOW direction → OTE×FVG entry → invalidation SL → TP ladder → R/R ≥ 1:3 gate → EXECUTE / STAND ASIDE — plus three dashboard panels replacing the UNAVAILABLE cards, §§4–6 live report blocks with verbatim reasons, and chart trigger pin + entry/SL/TP lines. Population verification belongs to Phase 18.

## Implementation Decisions

### TP ladder + R/R gate
- **D-01:** Structure-first ladder — TP levels resolve from live structure, never fixed R-multiples. R-multiples are output (reported per leg), not inputs.
- **D-02:** Priority Asia → DOL → EQ — TP1 opposing Asia edge (nearest liquidity), TP2 opposing DOL/session pool, TP3 range far edge. Nearest liquidity fills TP1 first.
- **D-03:** R/R ≥ 1:3 gate blocks EXECUTE — failing ratio yields STAND ASIDE with a verbatim reason naming the computed ratio (e.g. R/R 1:1.8 — EXECUTE blocked). No warn-and-pass path; mirrors flaw-wins honesty.

### STAND ASIDE rendering
- **D-04:** STAND ASIDE with reason, never null ticket — `selectTicket` returns a STAND ASIDE verdict + verbatim failing reason on every gate fail (QUIET/ARMED/INVALIDATED/R-R fail). Matches the FEATURES.md contract; the ticket always explains its why.
- **D-05:** Degraded-with-provenance on stale/thin — ticket renders dimmed with STALE/THIN tag naming the failed leg, numbers visible but marked. Never a full-strength ticket on stale/thin inputs (VERF-03 aligned).

### PAPER chrome + inputs
- **D-06:** Terminal-top persistent banner — non-dismissible KAĞIZ/PAPER banner at terminal top plus PAPER prefix in the §5 title. Visible even when the ticket panel is scrolled away; panel-only placement hides on scroll.
- **D-07:** Risk % + NQ contracts — risk % input (default 1%) + size in NQ contracts; size = risk ÷ stop-distance. Futures-native; degenerate inputs (zero stop distance, missing levels) refuse with reason.
- **D-08:** CTA copy KAĞIZ QEYD / İMTİNA — EXECUTE-side CTA logs intent as paper note ("KAĞIZ QEYD"), STAND ASIDE side "İMTİNA". Banned-word rule holds: no Filled/Position/Submit Order/placeOrder identifiers anywhere.

### Chart pins + lines
- **D-09:** T pin + accent price lines — trigger pin 'T' arrow on the FIRE bar plus entry/SL/TP as price lines reusing the EQ/DOL create/remove lifecycle in `nq-chart.tsx`. Follows the J/S marker precedent; no new zone-band primitive.
- **D-10:** Hide on STAND ASIDE — pins/lines render on EXECUTE only; STAND ASIDE/INVALIDATED clears them via the empty-marker-set path. No ghost what-if levels that could be misread.

### Claude's Discretion
None — user decided every area explicitly.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` (TICK-01..TICK-04) — acceptance criteria, locked scope
- `.planning/ROADMAP.md` (Phase 17 goal + success criteria) — phase boundary, fixed derivation order

### Research (v3.0 execution layer)
- `.planning/research/SUMMARY.md` (Phase 4 section) — ticket-before-flaw order note, ticket.ts placement, selectTicket null-unless-FIRING contract
- `.planning/research/FEATURES.md` — STAND ASIDE as first-class decision, ticket derivation chain, paper-only anti-feature
- `.planning/research/PITFALLS.md` (P4 ticket-before-flaw, paper-confusion) — derivation order, banned-word mitigation
- `.planning/research/ARCHITECTURE.md` — `ticket.ts` beside `confluence.ts`, `selectTicket` wiring, §5 block, ExecutionProtocol/TicketPanel/FatalFlaw thin panels, chart pin + entry/SL/TP lines
- `.planning/research/STACK.md` — ticketInputs slice (riskPct + size + setters), banned-word test, CTA gating

### Prior phases (locked contracts)
- `.planning/phases/15-why-now-trigger-engine/15-CONTEXT.md` (D-01..D-10) — three-gate engine, entry-FVG handle, ARMED matrix, firing log, sweep-side direction map
- `.planning/phases/16-fatal-flaw-invalidation/16-CONTEXT.md` (D-01..D-15) — HARD/SOFT taxonomy, shared snapshot, flaw-after-trigger order, §6 sentence + challenge bank, INVALIDATED neutral styling, ARMED-reason carry-forward
- `src/lib/ict/trigger.ts` — `TriggerOutput` shape (`verdict`, `direction`, `reasonKey`, `gates`, `entryFvg`), `TRIGGER_*` constants
- `src/lib/ict/invalidation.ts` — `FatalFlawOutput` shape (`verdict`, `class`, `reason`, `unblock`, ARMED reason)

### Level sources (ticket inputs)
- `src/lib/ict/fvg.ts` — entry-FVG handle source: `detectFVGs`, `applyMitigation`, `FvgGap`
- `src/lib/ict/asia.ts` — Asia high/low for TP1 opposing edge
- `src/lib/ict/aggregate.ts` — `NY_TZ`, wall-clock discipline, shared `asOf` helper
- `src/lib/confluence.ts` — selector-level purity precedent (ticket.ts follows: no store imports)
- `src/lib/report.ts` — `REPORT_SECTIONS` §§4–6 currently `unavailable`, exact surface to flip live
- `reference/institutional_rules.md` (Modul 4 + §§4–6) — R/R ≥ 1:3 gate, "Kağız — no broker" anti-feature

### Project constraints
- `.planning/PROJECT.md` (Constraints: Purity, Zero budget, Zustand-only, Rule-based) — ticket math pure, inputs via `ticketInputs` slice
- `.planning/phases/14-audit-debt-cleanup-purity-guard/14-CONTEXT.md` (D-05/D-06) — co-located vitest grep guard, minimal pattern set

## Existing Code Insights

### Reusable Assets
- `evaluateTrigger()` (`src/lib/ict/trigger.ts`): `TriggerOutput` + entry-FVG handle consumed directly — ticket never re-derives direction/entry
- `checkFatalFlaw()` (`src/lib/ict/invalidation.ts`): flaw output (incl. carried ARMED reason) consumed directly — ticket suppresses on INVALIDATED
- `buildOverlayMarkers()` (`components/charts/nq-chart.tsx`): Judas J/J? + SMT S marker builder — 'T' pin extends this function, empty-input-returns-[] already handles hide-on-STAND-ASIDE
- EQ/DOL/OTE/Asia price-line create/remove lifecycle (`nq-chart.tsx` line refs): entry/SL/TP lines reuse this pattern via remove-then-create
- `REPORT_SECTIONS` (`src/lib/report.ts`): §§4–6 flip `unavailable` → `live` following the §3 precedent
- Three UNAVAILABLE cards (`components/dashboard/terminal-shell.tsx` `data-slot="execution-protocol"` / `"ticket"` / `"fatal-flaw"`): exact panels the live components replace
- `selectTrigger` / `selectFatalFlaw` (`src/lib/store.ts`): shared-epoch + refuse-null envelope precedent for `selectTicket`

### Established Patterns
- Named `CALIBRATION-PROVISIONAL` exported constants pinned by boundary tests — ticket thresholds follow suit
- Co-located tests (`<module>.test.ts`) — `ticket.test.ts` follows suit
- Verbatim Azerbaijani reasons test-pinned with `toBe` (trigger D-09 / flaw D-10 precedent)
- Thin render panels, math-free, reading store selectors only (ARCHITECTURE.md component contract)
- Locked `UNAVAILABLE` chip untouched; `Məlumat yoxdur` null fallback; dimmed `opacity-45` unavailable styling

### Integration Points
- `src/lib/ticket.ts` (new, NOT under `ict/`) — `computeTicket({ trigger, flaw, levels, bias, range, riskPct })` pure derivation in fixed order
- Store `ticketInputs` slice (new) — `{ riskPct, size }` + clamped setters; never inside `ticket.ts`
- Store `selectTicket` (new) — derived selector sharing the trigger/flaw `asOf`; flaw > ticket precedence; STAND ASIDE with reason on any gate fail
- `report.tsx` §§4–6 blocks (new) — §4 ← trigger reason, §5 ← ticket levels, §6 ← flaw sentence + challenge, verbatim
- `terminal-shell.tsx` — swap 3 UNAVAILABLE cards for `ExecutionProtocol` / `TicketPanel` / `FatalFlaw` + terminal-top PAPER banner
- `nq-chart.tsx` — 'T' pin in `buildOverlayMarkers` + entry/SL/TP price lines; cleared on STAND ASIDE/INVALIDATED
- Banned-word test (new) — greps for Filled/Position/Submit Order/placeOrder identifiers, must stay green
- Phase 18 replays ticket derivation bar-by-bar — ticket entries must carry enough to reconstruct verdicts

## Specific Ideas

- CTA copy locked by user: EXECUTE-side "KAĞIZ QEYD" (logs intent as paper note), STAND ASIDE-side "İMTİNA"
- Risk % default 1%; size unit NQ contracts
- R/R fail reason must name the computed ratio verbatim

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 17-paper-ticket-4-6-live-ui-chart-pins*
*Context gathered: 2026-09-11*
