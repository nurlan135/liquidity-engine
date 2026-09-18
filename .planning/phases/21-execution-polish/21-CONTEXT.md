# Phase 21: Execution Polish - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning

## Phase Boundary

Execution stays calibrated and uncorrupted with pools live — WHY NOW thresholds reviewed against firing-log evidence (1–4/week band holds, pools proven context-only), ticket SL/TP buffered off pool extremes (never magnet-to-the-line), parity harness proving trigger/flaw/ticket verdicts identical pools on vs off, and threshold/pool-tolerance slider controls rendered from the installed slider primitive. No trigger-gate changes, no flaw-key changes, no ticket-derivation-order changes — pools stay read-only projection context that never votes (roadmap lock).

## Implementation Decisions

### Calibration review shape
- **D-01:** 1–4/week fire-rate evidence lives in the extended FiringLogPanel — band status + pools-context-only verdict table alongside log entries.
- **D-02:** Band verdict renders inline in the panel, next to the entries — no separate summary block.
- **D-03:** If the band breaks, constants retune + re-pin (boundary tests updated) — review is calibration, not observation-only. Re-pinned constants stay CALIBRATION-PROVISIONAL until live evidence accrues.
- **D-04:** Pools context-only proven inside the calibration view — pools-on vs pools-off verdict comparison shown from the same firing log, not harness-output-only.

### Ticket buffer sizing
- **D-05:** SL sits 0.25× ATR beyond the pool extreme (mirrors ATR-merge 0.25× idiom).
- **D-06:** TP partials book before the extreme — the extreme itself is never a target (magnet-to-the-line rejected).
- **D-07:** Buffered placement is visible + noted — chart lines move AND ticket prose carries a verbatim buffer note; R/R ≥ 1:3 gate unchanged.
- **D-08:** Buffer multiples ship CALIBRATION-PROVISIONAL with boundary-test pins, same discipline as pool ranking constants.

### Parity harness scope
- **D-09:** New pools-parity suite file — existing 5-rule `parity.test.ts` stays untouched as regression anchor.
- **D-10:** All three verdicts compared pools-on vs pools-off: trigger + flaw + ticket; identical required.
- **D-11:** Proof replays the 20-session transition table with pools toggled (live-shaped), not fixture-matrix-only.
- **D-12:** Failure bar is exact verdict match — any divergence fails the harness (buffered SL/TP deltas included, no tolerance band).

### Slider controls
- **D-13:** Both knob families adjustable — WHY NOW gate thresholds + pool tolerance (EQUAL_TOL, merge multiple, boost/penalty).
- **D-14:** Display-only review sandbox + explicit apply — sliders preview what-if; an explicit Apply path writes constants + re-pins boundary tests. No live re-derivation on slider movement.
- **D-15:** Session-scoped Zustand state only — refresh resets to pinned constants, no localStorage persistence.
- **D-16:** shadcn slider installed as the 7th allowlisted primitive (same install pattern as the existing 6); amends the PROJECT.md shadcn allowlist.

### Locked from prior context (not re-asked)
- **D-17:** Pools never vote — no trigger gate, no new flaw key, no ticket derivation change in v3.1 (roadmap lock from Phase 19 D-17, carried through Phase 20 D-17).
- **D-18:** Pool shape `{ side, top, bottom, touches, weight, originDate, status }`, rank-1 = nearest ACTIVE on DOL side, all ranking constants CALIBRATION-PROVISIONAL awaiting this phase's review (Phase 19 D-06–D-09, D-19–D-22).
- **D-19:** Firing-log panel already renders in the terminal (`FiringLogPanel`, quick 260917-f3m 2026-09-17) — this phase extends it, not builds it.
- **D-20:** v3.0 parity precedent: 5-rule AMD/SMT-vs-trigger harness in `parity.test.ts` (Phase 19 D-24 context) — new suite follows that idiom.
- **D-21:** Purity guard holds — no new `src/lib/ict` math semantics without the guard; buffer/parity code follows injected-`asOf`, no-clock discipline.
- **D-22:** shadcn allowlist is currently 6 (button, dropdown-menu, dialog, toast, calendar, card) — slider install is the first allowlist amendment since v1.0.

### the agent's Discretion
None — user decided all presented areas.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract
- `.planning/ROADMAP.md` Phase 21 — goal, dependency (Phase 20), requirements POL-01–04, 4 success criteria, UI hint yes
- `.planning/REQUIREMENTS.md` Execution Polish — POL-01–04 full text + Out of Scope table (pool-gated FIRE rejected, exact stop-price rejected, heatmap rejected)

### Domain authority
- `reference/institutional_rules.md` Modul 1.2 + WHY NOW engine — Pain Threshold methodology + trigger gating rules the calibration review must not violate

### Prior phases (direct dependencies)
- `.planning/phases/19-pools-math/19-CONTEXT.md` — all pool math decisions D-01–D-24 (provisional constants, lifecycle, scorer, selector contract)
- `.planning/phases/20-1-live-chart-overlay/20-CONTEXT.md` — §1 wiring D-01–D-22 (pools-never-vote lock, verbatim prose, ghost/z-order idioms)

### Codebase (reuse verbatim)
- `components/dashboard/firing-log-panel.tsx` — existing log reader panel (extend with band verdict + context-only table per D-01/D-02/D-04)
- `src/lib/ict/trigger.ts` — three-gate FIRE/ARMED/QUIET engine + FiringLogEntry + thresholds under review (POL-01)
- `src/lib/ticket.ts` — fixed-order derivation (entry → SL → TP ladder → R/R gate); buffer insertion point per D-05–D-07
- `src/lib/ict/parity.test.ts` — 5-rule parity harness precedent; stays untouched, new pools-parity suite mirrors it (D-09)
- `src/lib/ict/replay.test.ts` — 20-session replay transition table reused with pools toggled (D-11)
- `components/dashboard/ticket-panel.tsx` — buffered placement prose surface (D-07)
- `src/lib/store.ts` — firingLog state + session-scoped slider state home (D-15); selectPools envelope untouched
- `src/lib/ict/pools.ts` — CALIBRATION-PROVISIONAL constants under review (EQUAL_TOL_BPS, merge multiple, dolBoost/behind-penalty)

## Existing Code Insights

### Reusable Assets
- `FiringLogPanel` (`components/dashboard/firing-log-panel.tsx`): store-subscribed log reader with overflow handling — calibration verdict + proof table extend this component
- `parity.test.ts` 5-rule harness idiom: verdict-comparison structure — new pools-parity suite copies the shape with pools toggled
- 20-session replay table (`replay.test.ts`): pinned transition fixtures — pools on/off replay reuses the same bars
- `computeATR` (`src/lib/ict/regime.ts`): buffer unit denominator (0.25× ATR, same as merge multiple)
- shadcn install precedent (6 primitives in `components/ui/`): slider installs the same way as the 7th

### Established Patterns
- CALIBRATION-PROVISIONAL + boundary-test pins + Phase 21 review (trigger.ts precedent, pools.ts follows) — buffers join the same discipline
- Refuse-null / never-throws selector envelopes — calibration reads degrade honestly, never throw on empty log
- Verbatim Azerbaijani detector reasons in prose — buffer notes follow the same idiom
- Session-scoped Zustand (firingLog pattern) — slider sandbox state follows, no persistence layer
- Fixed-order ticket derivation — buffers insert at SL/TP steps without reordering

### Integration Points
- `firing-log-panel.tsx`: band-verdict + pools on/off table added to existing entries render
- `ticket.ts` SL/TP steps: 0.25× ATR buffer insertion, R/R gate position unchanged
- New `pools-parity` test file alongside `parity.test.ts`: trigger/flaw/ticket triple compared pools-on vs pools-off over replay bars
- New slider controls block (terminal layout near FiringLogPanel): threshold + pool-tolerance knobs → session Zustand → explicit Apply path
- `components/ui/slider.tsx` (new): 7th shadcn primitive; PROJECT.md allowlist amended

## Specific Ideas

No specific requirements — open to standard approaches. Research note: `/gsd-plan-phase --research-phase` recommended for buffer-multiple seeding (0.25× ATR default + boundary matrix) and slider-range bounds.

## Deferred Ideas

None — discussion stayed within phase scope. (P2 queue POOL2-01–05 already deferred at milestone level in STATE.md; pool-gated FIRE stays rejected per REQUIREMENTS.md Out of Scope.)

---

*Phase: 21-Execution Polish*
*Context gathered: 2026-09-17*
