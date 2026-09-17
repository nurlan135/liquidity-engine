# Phase 20: §1 Live + Chart Overlay - Context

**Gathered:** 2026-09-16
**Status:** Ready for planning

## Phase Boundary

Users see the live Pain Threshold map in report §1 and as chart overlays. Phase 20 is wiring-only: `selectPools` (verified Phase 19, 458 tests green) feeds a §1 report block plus BSL/SSL price-line pairs on the chart. No math changes, no trigger/ticket derivation changes — pools stay read-only projection context that never votes (roadmap lock).

## Implementation Decisions

### §1 block shape
- **D-01:** §1 names rank-1 pool only — side + zone bounds + distance in ATR + swept status, with verbatim Azerbaijani reason.
- **D-02:** Swept pools are named with SWEPT status in dimmed tone — retest-magnetism story preserved, never silently dropped.
- **D-03:** §1 mirrors the §3/§§4-6 branch shape: fixed Azerbaijani sub-block labels + verbatim selector reason, same `lastUpdatedISO === null` skeleton vs null-selector `Məlumat yoxdur` idiom, `data-slot="report-section"` + per-block sub-slot.
- **D-04:** Proyeksiya hedge + methodology caveat live inline in the rank-1 sentence (S1-03) — no separate footer element.

### §1 empty states
- **D-05:** Distinct honest copy per state: no-pools vs stale vs thin each get their own line — never confident prose over a degraded banner (S1-02).
- **D-06:** Stale leg prints the NQ leg `lastError` verbatim, mirroring the §3/§§4-6 leg-error chain.
- **D-07:** Thin history shows pools dimmed with a thin note — never hidden like stale (matches zone/level 0.5-dimming discipline).
- **D-08:** Null selector renders empty copy only — never last-known/cached pools.

### Chart line style
- **D-09:** Pool zones render as dashed price-line pairs following the Asia-H/Asia-L precedent (remove-then-create cycle, finite-guarded `createPriceLine`), BSL accent-up / SSL accent-down tones.
- **D-10:** Rank-1 pair renders full width/brightness, rank-2 dimmer — pain threshold pops, context stays quiet (CHRT-02).
- **D-11:** Z-order: ticket entry/SL/TP lines stay on top; pools sit below ticket, above zones (CHRT-02).
- **D-12:** Swept pools render as dimmed ghosts — still visible for retest context, never removed.

### Degrade + ghost clear
- **D-13:** Stale/thin dimming uses the uniform 0.5 factor — same discipline as zones/levels, no special stronger dim for pools (CHRT-03).
- **D-14:** Null selector clears all pool lines — no stale leftovers on canvas (refuse-null honesty).
- **D-15:** STAND_ASIDE verdict clears pool ghost lines via the ticket remove-then-create cycle (CHRT-03).
- **D-16:** Nearest-2-per-side cap counts ranked ACTIVE pools only; swept ghosts ride outside the cap (CHRT-01).

### Locked from prior context (not re-asked)
- **D-17:** Pools never vote — no trigger gate, no new flaw key, no ticket derivation change in v3.1 (roadmap lock from Phase 19 D-17).
- **D-18:** Pool shape `{ side, top, bottom, touches, weight, originDate, status }`, scorer rank-1 = nearest ACTIVE on DOL side, all constants CALIBRATION-PROVISIONAL (Phase 19 D-06–D-09, D-19–D-22).
- **D-19:** `selectPools` refuse-null envelope + sharedEpoch + never-throws; ES-stale independent, thin flagged not nulled (Phase 19 D-21, verified 7-leg matrix).
- **D-20:** Purity guard holds — no new `src/lib/ict` math in this phase; wiring lives in components/store only.
- **D-21:** Stable selector-function subscription with derivation during render (selectLevels precedent — avoids useShallow loops on fresh nested identities).
- **D-22:** REPORT_SECTIONS index 1 flips from `unavailable` to `live`; UNAVAILABLE badge + `opacity-45` branch removed for §1 only.

### the agent's Discretion
None — user decided all presented areas.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract
- `.planning/ROADMAP.md` Phase 20 — goal, dependency (Phase 19), requirements S1-01–03 + CHRT-01–03, 4 success criteria, UI hint yes
- `.planning/REQUIREMENTS.md` §1 Live Report + Chart Overlay — S1-01–03, CHRT-01–03 full text + Out of Scope table (pool-gated FIRE rejected, exact stop-price rejected, heatmap rejected, LLM narrative rejected)

### Domain authority
- `reference/institutional_rules.md` Modul 1.2 — Pain Threshold methodology (retail majority → stop zones → süpürmə/tələ engineering) + §1/§2/§5 lines

### Prior phase (direct dependency)
- `.planning/phases/19-pools-math/19-CONTEXT.md` — all pool math decisions D-01–D-24 (equality bonus, ranking, merge/cap, lifecycle, scorer, selector contract)
- `.planning/phases/19-pools-math/19-VERIFICATION.md` — verified wiring surface: `src/lib/ict/pools.ts` (evaluatePools), `src/lib/store.ts:846-866` (selectPools), 458/458 tests green

### Codebase (reuse verbatim)
- `components/dashboard/report.tsx` — §3 branch (lines 126-192) + §§4-6 branches (lines 198-285) + unavailable branch (lines 286-301); §1 mirrors this shape
- `components/charts/nq-chart.tsx` — Asia-H/Asia-L dashed pair precedent (remove-then-create refs), Judas/SMT marker builder (J-S-T order), ticket EXECUTE-only price lines, thin/stale 0.5 dimming
- `components/dashboard/terminal-shell.tsx` — Asia/Judas/SMT selector subscription + bar-date resolution + NqChart prop wiring (pool props follow this path)
- `src/lib/report.ts` — REPORT_SECTIONS (index 1 `unavailable` → `live`), CONVICTION_LABEL idiom
- `src/lib/store.ts:846-866` — selectPools guarded envelope (single sharedEpoch, thin flag, never-throws)
- `src/lib/ict/pools.ts` — LiquidityPool shape, RankedPools output (read-only consumer contract, no signature changes)

## Existing Code Insights

### Reusable Assets
- §3/§§4-6 report branches (`components/dashboard/report.tsx:126-285`): verbatim-reason + leg-error-chain + skeleton/empty idiom — §1 copies this shape directly
- Asia dashed price-line pair (`components/charts/nq-chart.tsx`): remove-then-create ref cycle + finite guard — pool pairs follow the same cycle
- Ticket price lines (entry/SL/TP1-3, EXECUTE-only): z-order precedent — ticket created last/on top, pools below
- `selectPools` (`src/lib/store.ts:846-866`): single sharedEpoch, thin-flag, refuse-null — §1 block + chart consume the same return, no independent swept-ness computation

### Established Patterns
- Stable selector-function subscription with derivation during render (selectLevels/selectSMT precedent — avoids useShallow loops)
- Verbatim Azerbaijani detector reasons in prose; sweeper-leg detail in prose, never on canvas
- Uniform 0.5 zone/level dimming under stale/thin; markers/Asia/candles full strength
- Refuse-null honesty: null selector → empty copy / cleared lines, never cached last-known

### Integration Points
- `report.tsx` REPORT_SECTIONS map: new `section.index === 1` live branch before the generic unavailable branch
- `terminal-shell.tsx` → `NqChart` props: pool arrays + degraded flags flow through existing selector-subscription path
- `nq-chart.tsx` line-ref registry: pool pair refs added alongside Asia/ticket refs in the same remove-then-create cycle

## Specific Ideas

No specific requirements — open to standard approaches. Research note: `/gsd-plan-phase --research-phase` NOT needed (wiring-only phase, no scorer constants or boundary-test matrix open).

## Deferred Ideas

None — discussion stayed within phase scope. (P2 queue POOL2-01–05 already deferred at milestone level in STATE.md.)

---

*Phase: 20-§1 Live + Chart Overlay*
*Context gathered: 2026-09-16*
