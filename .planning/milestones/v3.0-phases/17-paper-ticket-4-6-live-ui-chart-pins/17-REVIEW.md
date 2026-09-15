---
phase: 17-paper-ticket-4-6-live-ui-chart-pins
reviewed: 2026-09-14T13:30:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
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
findings:
  critical: 3
  warning: 7
  info: 4
  total: 14
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-09-14T13:30:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed all 13 phase-17 files (6 created, 7 modified) covering paper-ticket math
(`ticket.ts`), store wiring (`store.ts`), vocabulary quarantine, report-contract flip,
three live panels, report §§4–6, shell wiring plus PAPER banner, and chart T-pin plus
ticket lines. Three defects require fixes before ship: a misleading R/R refusal reason
that prints the passing threshold, chart ticket-lines that vanish entirely on a legal
partial TP ladder, and render-path selectors that mutate the firing log and evaluate
the flaw on a different trigger snapshot than the ticket. Seven warnings (stale
diagnostics, wrong-leg error attribution, guard coverage gaps, fallback pin
misplacement) and four info items follow.

## Critical Issues

### CR-01: R/R refusal reason prints the passing threshold

**File:** `src/lib/ticket.ts:361`
**Issue:** The STAND ASIDE reason interpolates `rr.toFixed(1)`. For rr = 2.99 this
renders `R/R 1:3.0 — EXECUTE bloklandı.` — byte-identical to a passing 3.0 ratio.
The operator cannot distinguish "just failed" from "just passed", and the pinned test
(`src/lib/ticket.test.ts:154`) locks in the misleading copy. The sole sanctioned
interpolation defeats its own purpose (naming the computed ratio) by rounding it to
the gate value.
**Fix:**
```ts
return standAside(`R/R 1:${rr.toFixed(2)} — EXECUTE bloklandı.`, epoch, degraded);
```
Update the pinned test expectation to `'R/R 1:2.99 — EXECUTE bloklandı.'`.

### CR-02: One null TP leg erases all five chart price lines on a valid EXECUTE

**File:** `components/charts/nq-chart.tsx:291-331` (mount), `components/charts/nq-chart.tsx:561-600` (update)
**Issue:** Both effects validate all five prices as finite up front
(`for (const p of ticketPrices) { if ... throw ... }`) and the `catch` nulls every
ref. But `computeTicket` explicitly permits TP2/TP3 null on EXECUTE
("unresolvable legs stay null", `ticket.ts:343-349`), the shell forwards those nulls
(`terminal-shell.tsx:90-92`), and the ticket test pins EXECUTE_LONG with
TP2/TP3 null (`ticket.test.ts:194-206`). Any such ticket throws inside the guard and
leaves Entry/SL/TP1 unrendered too — the chart shows zero lines for a valid EXECUTE
ticket. Partial-ladder rendering must be per-leg, not all-or-nothing.
**Fix:**
```tsx
// create each line independently; skip null legs instead of throwing
const legs = [
  { ref: entryLineRef, price: ticketEntry, title: 'Entry', style: LineStyle.Dashed },
  { ref: slLineRef, price: ticketSL, title: 'SL', style: LineStyle.Solid },
  { ref: tp1LineRef, price: ticketTP1, title: 'TP1', style: LineStyle.Dashed },
  { ref: tp2LineRef, price: ticketTP2, title: 'TP2', style: LineStyle.Dashed },
  { ref: tp3LineRef, price: ticketTP3, title: 'TP3', style: LineStyle.Dashed },
];
for (const leg of legs) {
  if (typeof leg.price !== 'number' || !Number.isFinite(leg.price)) continue;
  leg.ref.current = live.createPriceLine({ price: leg.price, color: overlayTone, lineWidth: 1, lineStyle: leg.style, title: leg.title });
}
```
Apply the same per-leg pattern in the mount effect.

### CR-03: Selectors mutate the firing log during render and skew the flaw snapshot

**File:** `src/lib/store.ts:868-901`, `src/lib/store.ts:911-933`, `src/lib/store.ts:1014-1052`
**Issue:** Two compounding defects:
1. `selectTrigger` calls `get().appendFiringLog(out, epoch)` (line 896) on every
   invocation. Panels call selectors during render (`execution-protocol.tsx:17`,
   `ticket-panel.tsx:36`, `fatal-flaw.tsx:17`, `report.tsx:94-96`,
   `terminal-shell.tsx:83`) — rendering is now stateful. The first mounted
   component consumes the session FIRE; every later derivation in the same pass
   sees `alreadyFired=true` and gets `ARMED_ALREADY_FIRED` instead of FIRE.
   Component mount order determines verdicts.
2. `selectTicket` calls `selectTrigger()` (line 1023, returns FIRE and appends it
   to the log) and then `selectFatalFlaw()` (line 1025), which internally calls
   `selectTrigger()` again (line 918) — now past the dedup, so the flaw is judged
   on the `ARMED_ALREADY_FIRED` echo, not the FIRE the ticket prices. Flaw and
   ticket are evaluated on mismatched snapshots within a single derivation,
   contradicting the "flaw-after-trigger on the same snapshot" contract (line
   1004). SOFT flaws in particular will vote on the echo rather than the signal.
**Fix:** Separate derivation from logging — e.g. derive the trigger once per
`selectTicket` and pass the snapshot (plus `alreadyFired`) explicitly into both
`evaluateTrigger` and `checkFatalFlaw` without re-invoking the logging selector;
move `appendFiringLog` out of the render path (poll effect / explicit commit
point) so selectors are pure reads:
```ts
const trigger = get().selectTriggerPure();   // no log write
const flaw = checkFatalFlaw({ trigger, ... }); // same snapshot object
```

## Warnings

### WR-01: Bar-date fallback pins T on the newest bar when asOf predates all candles

**File:** `components/dashboard/terminal-shell.tsx:96-106`, `components/dashboard/terminal-shell.tsx:108-118`
**Issue:** When no D1 bar is at or before `ticket.asOf` (stale cache, clock skew),
`best` stays null and the fallback uses `candles[candles.length - 1].date` — the
newest bar. A trigger from before the visible window renders its T pin (and the
Judas pin, same pattern) on the latest candle, implying a fresh signal. Fall back
to the earliest bar or to null (clear the pin).
**Fix:** Replace `fireBarDate = best ?? candles[candles.length - 1].date` with
`fireBarDate = best ?? candles[0].date` (or `null` to clear on out-of-window).

### WR-02: Report §§5–6 attribute errors to the wrong leg and §5 ignores degraded dimming

**File:** `components/dashboard/report.tsx:226`, `components/dashboard/report.tsx:239`, `components/dashboard/report.tsx:262`
**Issue:** §5 reads the fallback error from `nq.lastError`, but `selectTicket`
refuses null on `nq1h`/`nq15m`/`nq` staleness (`store.ts:1016-1020`) — a stale
`nq1h` leg shows the `nq` error (usually null → generic copy), misdirecting
diagnostics. §6 reads `es.lastError` while flaw nulls come from several legs.
Separately, §5 prints EXECUTE levels at full strength with no STALE/THIN tag while
`TicketPanel` dims the same ticket — the report contradicts the D-05
false-precision guard.
**Fix:** Chain the trigger-critical legs for §5
(`nq1h.lastError ?? nq15m.lastError ?? nq.lastError ?? S3_EMPTY_COPY`), mirror the
§3 leg chain for §6, and render the degraded tag plus dimming in `s5-paper-ticket`.

### WR-03: `useDashboard.getState()` reads inside render subscribe to nothing

**File:** `components/dashboard/report.tsx:127-129`, `components/dashboard/report.tsx:199`, `components/dashboard/report.tsx:226`, `components/dashboard/report.tsx:262`
**Issue:** Leg `lastError` values are read via `getState()` during render with no
subscription. When a leg flips stale mid-session the error copy does not
re-render (it only refreshes when an unrelated subscribed value changes),
leaving stale diagnostics on screen.
**Fix:** Subscribe to the leg slices, e.g.
`const nqLeg = useDashboard((s) => s.nq);` and read `nqLeg.lastError`.

### WR-04: R/R gate shares the Judas displacement epsilon across unrelated domains

**File:** `src/lib/ticket.ts:7`, `src/lib/ticket.ts:360`
**Issue:** `TOL_EPS` (1e-9, tuned for Judas displacement ratios in `ict/judas.ts`)
is reused for the R/R gate (`rr + TOL_EPS >= TICKET_RR_MIN`). A future retune of
the Judas tolerance silently shifts the ticket gate. Unrelated domains should not
share a float-compare constant.
**Fix:** Declare a ticket-local `const RR_EPS = 1e-9;` in `ticket.ts` and use it
at line 360.

### WR-05: Risk-% validation diverges between store clamp and ticket throw

**File:** `src/lib/store.ts:980-984`, `src/lib/ticket.ts:246-250`
**Issue:** `setRiskPct` silently clamps out-of-band input (10 → 5) while
`computeTicket` throws on the same input. Two layers own one contract with
opposite policies; a direct `computeTicket` caller (Phase 18 replay, tests) hits
throws the UI path can never produce, and silent clamping can mask operator error.
**Fix:** Document the split explicitly (clamp at the UI boundary, throw at the
pure boundary) with a comment on both sides, or make the store refuse like the
pure function instead of clamping.

### WR-06: Vocabulary quarantine has scan-coverage gaps

**File:** `src/lib/ticket-vocabulary.test.ts:15-33`
**Issue:** The guard globs only `*.ts`/`*.tsx`: brokerage copy in `.js`/`.mjs`
route files or JSON fixtures is unscanned. The self-scan exclusion filters only
`.test.ts`, so a future `.test.tsx` file's own pattern strings would trip the
guard. Coverage claims ("whole-tree") exceed what the two globs match.
**Fix:** Extend the exclusion to `.test.tsx` and either widen the globs or narrow
the header comment to the exact scanned extensions.

### WR-07: İMTİNA acknowledgment keyed on epoch seconds can collide across tickets

**File:** `components/dashboard/ticket-panel.tsx:41-43`
**Issue:** The decline key pins `ticket.asOf` in epoch seconds. Two distinct
tickets derived within the same second (re-poll, re-render derivation) share an
`asOf`, so declining one ticket hides the acknowledgment state for the next —
the ack is per-second, not per-ticket.
**Fix:** Key the decline state on a content hash (e.g. verdict + entry + sl +
asOf) instead of `asOf` alone.

## Info

### IN-01: Unused `PAPER_EQUITY_USD` import in store

**File:** `src/lib/store.ts:30`
**Issue:** `PAPER_EQUITY_USD` is imported but never referenced in `store.ts`
(sizing lives entirely in `ticket.ts`). Remove it from the import.

### IN-02: Stale "explicit equity override" comment

**File:** `src/lib/ticket.ts:369-370`
**Issue:** The Step-6 comment claims sizing runs "from PAPER_EQUITY_USD with an
explicit equity override", but no override parameter exists — `TicketInput` has
no equity field and line 373 hardcodes the constant. Delete the override phrase
or add the parameter.

### IN-03: Paper-log cap hardcodes 50 instead of reusing the cap idiom

**File:** `src/lib/store.ts:992`
**Issue:** `PAPER_LOG_CAP = 50` is a function-local literal duplicating
`TRIGGER_LOG_CAP = 50` from `trigger.ts`. Hoist to a module-level exported
constant beside the firing-log precedent so the two caps stay visibly coupled.
**Fix:** `const PAPER_LOG_CAP = 50;` at module scope (export if Phase 18 needs it).

### IN-04: Header comment contradicts the downgraded-reason interpolation

**File:** `src/lib/ticket.ts:53`, `src/lib/ticket.ts:80`, `src/lib/ticket.ts:318-321`
**Issue:** The interface and const-block comments promise reasons are "never
interpolated except the R/R ratio", but the DOWNGRADED branch interpolates
`` `${flaw.reason} ARMED-ə qayıdış: ${flaw.carriedArmedReason}.` ``. Amend the
comments to sanction both interpolations.

---

_Reviewed: 2026-09-14T13:30:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
