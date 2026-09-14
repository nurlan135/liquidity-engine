---
phase: 17-paper-ticket-4-6-live-ui-chart-pins
verified: 2026-09-14T13:25:00Z
status: gaps_found
score: 13/15 must-haves verified
covered_files:
  - .planning/phases/17-paper-ticket-4-6-live-ui-chart-pins/17-01-PLAN.md
  - .planning/phases/17-paper-ticket-4-6-live-ui-chart-pins/17-02-PLAN.md
  - .planning/phases/17-paper-ticket-4-6-live-ui-chart-pins/17-03-PLAN.md
  - .planning/phases/17-paper-ticket-4-6-live-ui-chart-pins/17-04-PLAN.md
  - .planning/phases/17-paper-ticket-4-6-live-ui-chart-pins/17-01-SUMMARY.md
  - .planning/phases/17-paper-ticket-4-6-live-ui-chart-pins/17-02-SUMMARY.md
  - .planning/phases/17-paper-ticket-4-6-live-ui-chart-pins/17-03-SUMMARY.md
  - .planning/phases/17-paper-ticket-4-6-live-ui-chart-pins/17-04-SUMMARY.md
  - .planning/phases/17-paper-ticket-4-6-live-ui-chart-pins/17-CONTEXT.md
  - .planning/phases/17-paper-ticket-4-6-live-ui-chart-pins/17-REVIEW.md
  - src/lib/ticket.ts
  - src/lib/ticket.test.ts
  - src/lib/ticket-vocabulary.test.ts
  - src/lib/store.ts
  - src/lib/store.test.ts
  - src/lib/report.ts
  - src/lib/report.test.ts
  - components/dashboard/execution-protocol.tsx
  - components/dashboard/ticket-panel.tsx
  - components/dashboard/fatal-flaw.tsx
  - components/dashboard/report.tsx
  - components/dashboard/terminal-shell.tsx
  - components/charts/nq-chart.tsx
covered_digest: unavailable-gsd-tools-shim-missing-on-win32-manual-file-list-above
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: Flaw supersedes ticket and stale or thin inputs degrade with provenance instead of full-strength numbers
    status: failed
    reason: CR-03 selector impurity — selectTicket calls selectTrigger then selectFatalFlaw which re-invokes selectTrigger on the post-log echo, so flaw is judged on ARMED_ALREADY_FIRED not the FIRE the ticket prices; same-snapshot contract broken
    artifacts:
      - path: src/lib/store.ts
        issue: selectTrigger appends firing log during render (line 896); selectTicket line 1023 then selectFatalFlaw line 918 re-derive trigger on mismatched snapshots
    missing:
      - Separate derivation from logging (pure selectTriggerPure without appendFiringLog); evaluate flaw on the same trigger object the ticket prices; move appendFiringLog to poll effect or explicit commit point
  - truth: User sees three live panels replacing the UNAVAILABLE execution-protocol ticket fatal-flaw cards with verbatim reasons
    status: failed
    reason: Same CR-03 root cause — render-path logging makes verdicts mount-order dependent; first panel to call selectTrigger consumes the session FIRE, later derivations in the same pass see ARMED_ALREADY_FIRED; ExecutionProtocol can show FIRE while TicketPanel shows STAND ASIDE (ARMED) on the same frame
    artifacts:
      - path: src/lib/store.ts
        issue: stateful render path — store.test.ts lines 1192-1193 and 1541-1543 document the consumption as expected, masking the bug
      - path: components/dashboard/execution-protocol.tsx
        issue: calls selectTrigger during render
      - path: components/dashboard/ticket-panel.tsx
        issue: calls selectTicket during render (which re-logs)
    missing:
      - Same fix as above; add a regression test asserting back-to-back selectTrigger calls agree and selectTicket flaw snapshot equals the ticket trigger snapshot
---

# Phase 17: Paper Ticket + §§4–6 Live UI + Chart Pins Verification Report

**Phase Goal:** Users see the full execution picture — deterministic paper ticket, live §§4–6, chart pins — that can never be mistaken for real brokerage.
**Verified:** 2026-09-14T13:25:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees a paper ticket derived in fixed order direction to entry to SL to TP ladder to R-R gate to EXECUTE or STAND ASIDE verdict | ✓ VERIFIED | `src/lib/ticket.ts:288-392` fixed-order early-stop; tracer + boundary tests pass (`npx vitest run src/lib/ticket.test.ts` 11+ green, full suite 389/389) |
| 2 | Ticket computes size as risk divided by stop-distance in NQ contracts and refuses with verbatim reason on degenerate inputs | ✓ VERIFIED | `floor(equity*riskPct/100/(stopDist*20))` line 374; `REASON_STOP`/`REASON_SIZE`/`REASON_NULL_INPUT` refusals with null sizeContracts; zero-stop, missing-entry, non-finite riskPct tests green |
| 3 | selectTicket never returns null on gate fail; every gate fail yields STAND ASIDE plus verbatim failing reason | ✓ VERIFIED | `computeTicket` gate fails all return `standAside(reason)` never null; `selectTicket` null only on stale/empty legs (lines 1016-1020) or derivation throw — correct refuse-null envelope |
| 4 | Flaw supersedes ticket and stale or thin inputs degrade with provenance instead of full-strength numbers | ✗ FAILED | CR-03: flaw evaluated on post-log `ARMED_ALREADY_FIRED` echo, not the FIRE the ticket prices (`store.ts:1023` then `918`); same-snapshot contract broken — see Gaps |
| 5 | Banned brokerage identifiers Filled Submit Order placeOrder appear nowhere and Position appears only in pre-existing allowlisted symbols | ✓ VERIFIED | `src/lib/ticket-vocabulary.test.ts` whole-tree `.ts`+`.tsx` scan green (verified in this run); allowlist pins `computePosition`/`selectPosition`/`LevelsOutput.position` |
| 6 | Report sections 4 5 6 render live with section 5 title carrying PAPER prefix | ✓ VERIFIED | `src/lib/report.ts:23-25` indexes 4/5/6 `live`; §5 title `5. PAPER — INSTITUTIONAL ORDER TICKET` verbatim |
| 7 | Existing report tests pin the new live count and PAPER title so the flip cannot silently regress | ✓ VERIFIED | `src/lib/report.test.ts` pins live count 5 + indexes 2-6 + PAPER title; green in this run |
| 8 | User sees three live panels replacing the UNAVAILABLE execution-protocol ticket fatal-flaw cards with verbatim reasons | ✗ FAILED | Panels exist, substantive, wired with correct data-slots — but CR-03 mount-order dependence means same-frame verdicts can disagree (FIRE vs ARMED echo); deterministic picture not achieved |
| 9 | User sees live report sections 4 5 6 blocks with verbatim trigger ticket flaw prose | ✓ VERIFIED | `components/dashboard/report.tsx:198-285` §4 `selectTrigger`, §5 `selectTicket`, §6 `selectFatalFlaw` branches before generic unavailable branch; verbatim reason/sentence/challenge printing |
| 10 | PAPER banner renders non-dismissible at terminal top on every frame even when ticket panel scrolled away | ✓ VERIFIED | `components/dashboard/terminal-shell.tsx:241-247` `data-slot="paper-banner"` `role="status"` KAĞIZ/PAPER strip, no dismiss control, above StatusStrip outside scrolled grid, independent of envelope truth |
| 11 | STAND ASIDE renders verdict plus verbatim reason never a null or blank ticket | ✓ VERIFIED | `ticket-panel.tsx:80-89` always prints verdict+reason; `report.tsx:246` STAND_ASIDE prints verdict+reason; `computeTicket` STAND_ASIDE always carries non-empty reason |
| 12 | Stale or thin ticket renders dimmed with STALE or THIN tag naming the failed leg | ✓ VERIFIED | `ticket-panel.tsx:45-52,71-78` `opacity-45` + `STALE — LEG`/`THIN — LEG` tag; sizing locked with reason while degraded (lines 155-158); `store.ts:1034-1046` degraded envelope; store degraded test green |
| 13 | Chart shows T trigger pin arrow on the FIRE bar on EXECUTE only with J to S to T ordering | ✓ VERIFIED | `nq-chart.tsx:124-141` T appended after Judas then SMT blocks, EXECUTE-only, empty-marker-set clearing; shell passes `fireBarDate` via containing-bar loop with nulls on STAND ASIDE |
| 14 | Chart shows entry SL TP1 TP2 TP3 accent price lines on EXECUTE only reusing EQ DOL lifecycle | ✓ VERIFIED | CR-02 FIXED in `5485378`: mount (lines 292-315) and update (lines 546-568) now per-leg skip on null/non-finite instead of all-or-nothing throw; unconditional-removal-first preserved; accent + MUTED_GRAY stale fallback |
| 15 | STAND ASIDE or INVALIDATED clears pins and lines with no ghost what-if levels | ✓ VERIFIED | T contributes nothing on STAND ASIDE (empty-marker-set path); update effect removes all five ticket refs unconditionally first (lines 436-451); shell forwards nulls on STAND ASIDE (`terminal-shell.tsx:88-92`) |

**Score:** 13/15 truths verified (0 present, behavior-unverified)

### Deferred Items

None — no later milestone phase covers the CR-03 selector-impurity defect. Phase 18 replays ticket derivation bar-by-bar and will inherit the skew, not fix it.

### Advisory (New Scope, Unevidenced)

Initial verification — no re-verification advisory section required.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ticket.ts` | pure computeTicket + constants | ✓ VERIFIED | 392 lines, substantive, fixed-order, no store imports, no Date.now |
| `src/lib/ticket.test.ts` | derivation + boundary + refusal table | ✓ VERIFIED | Tracer, 3.0/2.99, zero-stop, missing-entry, riskPct throw, partial-TP tests green |
| `src/lib/store.ts` | ticketInputs + selectTicket + paperLog | ⚠️ PRESENT BUT IMPURE | Exists + substantive + wired, but render-path `appendFiringLog` mutates state (CR-03 BLOCKER) |
| `src/lib/store.test.ts` | clamp + precedence + refuse-null + degraded + coherence | ✓ VERIFIED (tests pass, but coherence test normalizes the bug) | 43+ tests green; flaw-precedence via live HARD STALE_LEG; coherence pre-consumes FIRE per D-12 note |
| `src/lib/ticket-vocabulary.test.ts` | banned-word quarantine | ✓ VERIFIED | Green in this run; Position allowlist pinned |
| `src/lib/report.ts` | §§4–6 live + PAPER title | ✓ VERIFIED | Indexes 4/5/6 live, §5 PAPER prefix |
| `src/lib/report.test.ts` | pinned literals | ✓ VERIFIED | Green in this run |
| `components/dashboard/execution-protocol.tsx` | trigger thin panel | ✓ VERIFIED | Stable selector subscription, verbatim reason, gates line |
| `components/dashboard/ticket-panel.tsx` | ticket thin panel | ✓ VERIFIED | EXECUTE ladder, risk stepper ±0.5 clamped, KAĞIZ QEYD/İMTİNA, degraded tag |
| `components/dashboard/fatal-flaw.tsx` | flaw thin panel | ✓ VERIFIED | Verbatim sentence + challenge, neutral styling |
| `components/dashboard/report.tsx` | §§4–6 live blocks | ✓ VERIFIED | Three live branches, §1 stays unavailable |
| `components/dashboard/terminal-shell.tsx` | swap + banner + chart wiring | ✓ VERIFIED | Three UNAVAILABLE cards replaced keeping data-slots; banner; exact Plan-04 prop names with STAND ASIDE nulls |
| `components/charts/nq-chart.tsx` | T pin + 5 lines + clearing | ✓ VERIFIED | J-S-T order, per-leg lines (post-5485378), unconditional removal, unmount cleanup |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| computeTicket | TriggerOutput + FatalFlawOutput | consumed without re-deriving gates | ✓ WIRED | `directionOf` + flaw-precedence-first; assertValid boundary throws |
| selectTicket | selectTrigger + selectFatalFlaw | one sharedEpoch + asOf carried | ⚠️ WIRED BUT TORN | `selectTicket` calls `sharedEpoch` once but callees re-call it; values agree in practice (coherence test green) yet snapshot objects diverge via re-logging |
| Panels | stable selector functions | derive during render, never useShallow on nested output | ✓ WIRED | All three panels + report + shell use stable-function subscription |
| terminal-shell | NqChart | exact optional prop names with nulls on STAND ASIDE | ✓ WIRED | `ticketVerdict ticketDirection ticketEntry ticketSL ticketTP1 ticketTP2 ticketTP3 fireBarDate` match; nulls on STAND ASIDE |
| T pin/lines | empty-marker-set + unconditional-removal | clear on STAND ASIDE | ✓ WIRED | Marker rebuild every input change; lines removed first unconditionally |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ticket-panel.tsx | `ticket` | `selectTicket()` → `computeTicket` (trigger/flaw/levels/range/dol/asia live selectors) | Yes — entry/SL/TP/rr/size from live structure, no static fallback | ✓ FLOWING |
| execution-protocol.tsx | `trigger` | `selectTrigger()` → `evaluateTrigger` | Yes — verdict/direction/gates/reason | ✓ FLOWING |
| fatal-flaw.tsx | `flaw` | `selectFatalFlaw()` → `checkFatalFlaw` | Yes — sentence/challenge/reason | ✓ FLOWING |
| report.tsx §§4–6 | `trigger`/`ticket`/`flaw` | same selectors | Yes — verbatim prose, no hardcoded filler | ✓ FLOWING |
| nq-chart.tsx | `ticketEntry…TP3`/`fireBarDate` | shell from `selectTicket().asOf` + levels | Yes — finite-guarded live prices; nulls on STAND ASIDE clear | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| ticket + report + vocabulary suites green | `npx vitest run src/lib/ticket.test.ts src/lib/report.test.ts src/lib/ticket-vocabulary.test.ts src/lib/store.test.ts` | 4 files, 61 tests passed | ✓ PASS |
| Full workspace suite green | `npm test` | 35 files, 389 tests passed | ✓ PASS |
| Chart T pin / line clearing | visual render check | Cannot verify without running dev server — routed to human verification | ? SKIP |

### Probe Execution

No probes declared for this phase (`scripts/*/tests/probe-*.sh` absent; PLAN/SUMMARY mention no probe paths). Step 7c: SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TICK-01 | 17-01 | Fixed-order paper ticket → EXECUTE/STAND ASIDE | ✓ SATISFIED (pure layer) but UI determinism broken by CR-03 | `ticket.ts` + tests green; `selectTicket` snapshot skew gaps the user-visible picture |
| TICK-02 | 17-01 | Risk % sizing risk÷distance + refusal with reason | ✓ SATISFIED | Sizing math + refusal table + clamp tests green; risk stepper wired |
| TICK-03 | 17-02, 17-03 | PAPER vocabulary + banner + banned-word test | ✓ SATISFIED | Vocabulary test green; `paper-banner` persistent; §5 PAPER prefix; KAĞIZ QEYD/İMTİNA copy |
| TICK-04 | 17-02, 17-03, 17-04 | Live §§4–6 + three panels + chart pins/lines | ⚠️ BLOCKED by CR-03 | All surfaces exist and flow real data, but same-frame panel agreement not guaranteed; chart visuals need human glance |

No orphaned requirements: all four TICK IDs claimed across the four plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none in phase files) | — | `TODO/FIXME/XXX/TBD/PLACEHOLDER/console.log` | — | Clean — no debt markers in any of the 13 phase files |
| `components/dashboard/status-strip.tsx` | 21 | `return null` | ℹ️ Info | Pre-existing, outside phase scope, not a stub |

### Code Review Assessment (17-REVIEW.md)

| Finding | Verdict | Rationale |
|---------|---------|-----------|
| CR-01 R/R reason rounding (`rr.toFixed(1)` prints `1:3.0` for a 2.99 fail) | Polish, NOT a gap | Gate itself is correct (3.0 passes, 2.99 STAND ASIDE — pinned by test); verdict never misleads; only the diagnostic copy rounds to the threshold. Fix to `toFixed(2)` + test update recommended but phase goal holds. |
| CR-02 one null TP leg erases all five chart lines | FIXED, NOT a gap | Commit `5485378` implements the recommended per-leg skip in both mount and update effects (verified lines 292-315, 546-568); partial-ladder EXECUTE now renders finite legs. |
| CR-03 selectors mutate firing log during render + skew flaw snapshot | 🛑 BLOCKER — gaps the phase goal | Breaks determinism the phase promises: mount-order verdicts + flaw judged on echo, contradicting flaw-after-trigger same-snapshot contract. Recorded as gaps above. |
| WR-01 bar-date fallback to newest bar | ⚠️ Warning | Misleading T/J pin on out-of-window asOf; rare edge (stale cache/clock skew); recommend `candles[0]` or null fallback in follow-up. |
| WR-02 report §§5–6 wrong-leg errors + §5 ignores degraded dimming | ⚠️ Warning | §5 reads `nq.lastError` while refuse-null legs are `nq1h/nq15m/nq`; §5 EXECUTE prints full-strength with no STALE/THIN tag while TicketPanel dims — contradicts D-05 on the report surface. Recommend leg-chain + degraded tag in follow-up. |
| WR-03 `getState()` reads subscribe to nothing | ⚠️ Warning | Stale diagnostics may not re-render mid-session; recommend subscribing to leg slices. |
| WR-04 shared `TOL_EPS` across Judas/ticket domains | Polish | Recommend ticket-local `RR_EPS`. |
| WR-05 risk-% clamp vs throw divergence | Polish (documented split) | Clamp at UI boundary + throw at pure boundary is defensible; recommend a comment on both sides. |
| WR-06 vocabulary guard `.js`/`.mjs` + `.test.tsx` gaps | Polish | Recommend widening globs or narrowing the header claim. |
| WR-07 İMTİNA ack keyed on epoch seconds | ⚠️ Warning | Per-second not per-ticket ack; recommend content-hash key. |
| IN-01..IN-04 | Info | Unused import, stale comment, local cap literal, header-vs-interpolation comment drift — cleanup items. |

### Human Verification Required

Automated checks pass but the phase ships user-visible surfaces that grep cannot judge. Because `status` is `gaps_found` (CR-03 takes precedence per the decision tree), these items are recorded here for the gap-closure round rather than driving a separate `human_needed` status:

1. **EXECUTE visual glance — panels + report + chart** — Render the terminal on a FIRE poll with clean flaw and resolvable structure. Expected: ExecutionProtocol shows FIRE + verbatim reason; TicketPanel shows EXECUTE direction, OTE×FVG entry, SL, TP1/TP2/TP3 ladder with per-leg R, R/R, size NQ, KAĞIZ QEYD; FatalFlaw shows TƏMİZ; report §§4–6 show live verbatim prose with §5 PAPER title; chart shows single T arrow on FIRE bar after J/S plus Entry/SL/TP1/TP2/TP3 accent lines. Why human: jsdom absent, `.test.tsx` not in vitest include — canvas/DOM rendering unverifiable programmatically.
2. **STAND ASIDE clearing glance** — Flip to STAND ASIDE (QUIET/ARMED/R-R fail) and INVALIDATED. Expected: TicketPanel shows verdict + verbatim reason + İMTİNA (never blank); chart T pin and all five lines clear with no ghost levels; candles and existing overlays intact. Why human: same canvas reason.
3. **PAPER banner persistence glance** — Scroll the ticket panel out of view. Expected: KAĞIZ/PAPER banner stays pinned at terminal top on every frame, non-dismissible. Why human: scroll-position visual.
4. **Stale/thin degraded glance** — Force a stale `es` leg or thin D1 history with ticket open. Expected: TicketPanel dims `opacity-45` with STALE/THIN tag naming the leg, numbers dimmed, sizing locked with reason. Why human: visual treatment + provenance tag.

### Gaps Summary

One root cause, two failed truths: `selectTrigger` performs a stateful `appendFiringLog` on every call, and every Phase 17 panel calls selectors during render — so verdicts depend on component mount order and `selectTicket`'s flaw is evaluated on the `ARMED_ALREADY_FIRED` echo instead of the FIRE the ticket prices. The pure ticket math (fixed order, TP1-only R/R gate, risk÷distance sizing, refusal table), the PAPER guard (vocabulary test, banner, §5 prefix), the report constants, the three panels, the shell wiring, and the chart overlays (including the CR-02 per-leg fix in `5485378`) are all present, substantive, wired, and data-flowing with the full 389-test suite green. But the user-visible execution picture is not deterministic until derivation is separated from logging. CR-01 is a copy-polish item (gate correct, reason rounds) and CR-02 is already fixed — neither gaps the goal. Close CR-03 (pure derivation + log at commit point + snapshot-equality regression test), re-run `npm test`, and re-verify.

---

_Verified: 2026-09-14T13:25:00Z_
_Verifier: the agent (gsd-verifier)_
