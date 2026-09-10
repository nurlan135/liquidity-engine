# Phase 15: WHY NOW Trigger Engine - Discussion Log

**Date:** 2026-09-10
**Areas:** Purge gate scope, Displacement gate, ARMED + cooldown, Firing log shape, Verdict prose

## Purge gate scope

1. Q: Which sessions can produce a confirmed purge that fires the trigger?
   - Options: London-only (Recommended) / London + NY AM / You decide
   - Selected: London-only — reuses judasSwing confirmed directly; NY sweeps never fire.
2. Q: Does the purge gate require judas.confirmed, or can candidate satisfy it?
   - Options: Confirmed-only (Recommended) / Candidate allowed / You decide
   - Selected: Confirmed-only — candidate sweeps can never satisfy the purge gate.

## Displacement gate

1. Q: What displacement threshold must the trigger gate pass?
   - Options: Mirror Judas 0.5 (Recommended) / Stricter (1.0x) / You decide
   - Selected: Mirror Judas 0.5 — TRIGGER_DISP_MULT seeded at 0.5x Asia height, CALIBRATION-PROVISIONAL.
2. Q: Must the displacement gate return an entry-FVG handle, or is direction enough?
   - Options: Entry FVG required (Recommended) / Gates only
   - Selected: Entry FVG required — no resolvable FVG means no FIRE.

## ARMED + cooldown

1. Q: What gate combination produces ARMED instead of FIRE or QUIET?
   - Options: Any 2 of 3 (Recommended) / Timing+purge only
   - Selected: Any 2 of 3 — 3/3 FIRE, 2/3 ARMED, 0-1 QUIET.
2. Q: How does cooldown/dedup prevent repeat-fire spam?
   - Options: Per-session (Recommended) / Candle-count / You decide
   - Selected: Per-session — one FIRE per session date; same-session repeats deduped.

## Firing log shape

1. Q: What fields does each firing-log entry record?
   - Options: Minimal (Recommended) / Full snapshot
   - Selected: Minimal — asOf, verdict, per-gate booleans, direction, reason key.
2. Q: How is the calibration-JSON export exposed?
   - Options: JSON download (Recommended) / Table only
   - Selected: JSON download of the capped ~50 entries.

## Verdict prose

1. Q: Who drafts the verbatim Azerbaijani reason templates?
   - Options: Planner drafts (Recommended) / Dictate now
   - Selected: Planner drafts following §3/AMD/SMT prose precedent; reviewed at plan time.
2. Q: How is FIRE_LONG vs FIRE_SHORT direction derived?
   - Options: Sweep-side map (Recommended) / Bias-derived
   - Selected: Sweep-side map — HIGH sweep + bearish → FIRE_SHORT; LOW sweep + bullish → FIRE_LONG.

## Deferred Ideas

None.

## Claude's Discretion

None.
