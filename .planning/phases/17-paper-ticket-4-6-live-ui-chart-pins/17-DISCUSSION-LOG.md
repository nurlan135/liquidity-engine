# Phase 17: Paper Ticket + §§4–6 Live UI + Chart Pins - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-11
**Phase:** 17-paper-ticket-4-6-live-ui-chart-pins
**Areas discussed:** TP ladder + R/R gate, STAND ASIDE rendering, PAPER chrome + inputs, Chart pins + lines

---

## TP ladder + R/R gate

| Option | Description | Selected |
|--------|-------------|----------|
| Structure-first ladder | TP1 opposing liquidity, TP2 dealing-range target, TP3 measured R-multiple fallback | ✓ |
| R-multiple ladder | TP1 = 1R, TP2 = 2R, TP3 = 3R fixed from entry/SL distance | |

**User's choice:** Structure-first ladder

| Option | Description | Selected |
|--------|-------------|----------|
| Asia → DOL → EQ | TP1 opposing Asia edge, TP2 opposing DOL/session pool, TP3 range far edge | ✓ |
| FVG → DOL → Asia | TP1 unmitigated opposing FVG, TP2 DOL, TP3 Asia edge | |

**User's choice:** Asia → DOL → EQ

| Option | Description | Selected |
|--------|-------------|----------|
| Gate blocks EXECUTE | R/R < 1:3 → STAND ASIDE with verbatim reason naming the failing ratio | ✓ |
| Gate warns only | R/R < 1:3 still EXECUTE but flagged low-R/R | |

**User's choice:** Gate blocks EXECUTE

---

## STAND ASIDE rendering

| Option | Description | Selected |
|--------|-------------|----------|
| STAND ASIDE with reason | selectTicket returns STAND ASIDE + verbatim failing reason on every gate fail | ✓ |
| Null on gate fail | selectTicket returns null, panels render Məlumat yoxdur | |

**User's choice:** STAND ASIDE with reason

| Option | Description | Selected |
|--------|-------------|----------|
| Degraded with provenance | Ticket renders dimmed with STALE/THIN tag + which leg failed | ✓ |
| Full STAND ASIDE | Stale/thin → STAND ASIDE with stale reason, no numbers shown | |

**User's choice:** Degraded with provenance

---

## PAPER chrome + inputs

| Option | Description | Selected |
|--------|-------------|----------|
| Terminal-top banner | Persistent non-dismissible KAĞIZ/PAPER banner at terminal top + PAPER prefix in §5 title | ✓ |
| Ticket-panel only | Banner lives inside the ticket panel + §5 | |

**User's choice:** Terminal-top banner

| Option | Description | Selected |
|--------|-------------|----------|
| Risk % + contracts | Risk % default 1%, size in NQ contracts, size = risk ÷ stop-distance | ✓ |
| Risk % + notional | Risk % + notional USD size input | |

**User's choice:** Risk % + contracts

| Option | Description | Selected |
|--------|-------------|----------|
| QEYD ET / İMTİNA | EXECUTE-side CTA 'KAĞIZ QEYD', STAND ASIDE side 'İMTİNA' | ✓ |
| You decide | Planner picks CTA copy within the banned-word rule | |

**User's choice:** QEYD ET / İMTİNA

---

## Chart pins + lines

| Option | Description | Selected |
|--------|-------------|----------|
| T pin + accent lines | Trigger pin 'T' arrow, entry/SL/TP as accent/muted price lines reusing EQ/DOL lifecycle | ✓ |
| Zone band for ticket | Entry→SL shaded band + TP ticks | |

**User's choice:** T pin + accent lines

| Option | Description | Selected |
|--------|-------------|----------|
| Hide on STAND ASIDE | Pins/lines render only on EXECUTE; STAND ASIDE/INVALIDATED clears them | ✓ |
| Dimmed ghost levels | STAND ASIDE shows dimmed entry/SL/TP as what-if | |

**User's choice:** Hide on STAND ASIDE

---

## the agent's Discretion

None — user decided every area explicitly.

## Deferred Ideas

None — discussion stayed within phase scope.
