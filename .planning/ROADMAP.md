# Roadmap: Liquidity Engine — Institutional Execution Terminal for NQ

## Milestones

- ✅ **v1.0 Live Terminal** — Phases 1–3 + 03.1, 03.2 (shipped 2026-09-06)
- ✅ **v2.0 Modul 3 (Liquidity Sequencing & SMT)** — Phases 6–9 (shipped 2026-09-08)
- ✅ **v2.1 Cleanup & Polish** — Phases 10–13 (shipped 2026-09-09)
- ✅ **v3.0 Execution (Modul 4)** — Phases 14–18 (shipped 2026-09-15)
- 🚧 **v3.1 Pain Threshold (§1) + Execution Polish** — Phases 19–21 (in progress)

## Phases

<details>
<summary>✅ v1.0 Live Terminal (Phases 1–3 + 03.1, 03.2) — SHIPPED 2026-09-06</summary>

- [x] Phase 1: Data Foundation & ICT Core (3/3 plans) — completed 2026-09-06 (retroactive gate 10/10 via 03.2)
- [x] Phase 2: Terminal Composition (4/4 plans) — completed 2026-09-05
- [x] Phase 3: Production Deploy & Verification (4/4 plans) — completed 2026-09-06
- [x] Phase 03.1: Close gap ICT-07 banner (1/1, INSERTED) — completed 2026-09-06
- [x] Phase 03.2: Close gap Phase 1 gate + ICT-01/02 + W1/W2/F2 (4/4, INSERTED) — completed 2026-09-06

Full detail: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Modul 3 (Phases 6–9) — SHIPPED 2026-09-08</summary>

- [x] Phase 6: Dual-Symbol Proxy + Data Contracts (5/5 plans) — completed 2026-09-07
- [x] Phase 7: SMT + 4H/1H Sequencing Math (3/3 plans) — completed 2026-09-07
- [x] Phase 8: AMD Sessions (Asia Range + Judas) (3/3 plans) — completed 2026-09-07
- [x] Phase 9: Composition (§3 Live + Overlays + Verify) (3/3 plans) — completed 2026-09-08 (visual glance re-verify PASS, human-confirmed)

Full detail: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.1 Cleanup & Polish (Phases 10–13) — SHIPPED 2026-09-09</summary>

- [x] Phase 10: Type Safety Fix (1/1 plans) — completed 2026-09-08
- [x] Phase 11: Chart Rendering Polish (1/1 plans) — completed 2026-09-08
- [x] Phase 12: Deployment Hygiene (3/3 plans) — completed 2026-09-09
- [x] Phase 13: Thin History Honesty (2/2 plans) — completed 2026-09-09

Full detail: `.planning/milestones/v2.1-ROADMAP.md`

</details>

<details>
<summary>✅ v3.0 Execution (Modul 4) (Phases 14–18) — SHIPPED 2026-09-15</summary>

- [x] Phase 14: Audit Debt Cleanup + Purity Guard (3/3 plans) — completed 2026-09-10
- [x] Phase 15: WHY NOW Trigger Engine (3/3 plans) — completed 2026-09-11, verified PASS
- [x] Phase 16: Fatal-Flaw Invalidation (3/3 plans) — completed 2026-09-11
- [x] Phase 17: Paper Ticket + §§4–6 Live UI + Chart Pins (5/5 plans) — completed 2026-09-14, verified 15/15
- [x] Phase 18: Verification + Calibration Harness (3/3 plans) — completed 2026-09-15, UAT 10/10

Full detail: `.planning/milestones/v3.0-ROADMAP.md`

</details>

### 🚧 v3.1 Pain Threshold (§1) + Execution Polish (In Progress)

**Milestone Goal:** Hesabatın boş §1-i canlanır — BSL/SSL ağrı zonaları xəritələnir, trigger/ticket incə ayarlanır. Pools are read-only projection context that never votes.

- [ ] **Phase 19: Pools Math** - BSL/SSL stop-cluster projection as pure functions + guarded selector
- [ ] **Phase 20: §1 Live + Chart Overlay** - Pain Threshold report block live + pool price lines on chart
- [ ] **Phase 21: Execution Polish** - Threshold calibration, ticket buffers, parity proof, slider controls

## Phase Details

### Phase 19: Pools Math
**Goal**: Ranked BSL/SSL stop-cluster inventory exists as pure, test-pinned math with a guarded selector
**Depends on**: Phase 18 (v3.0 shipped; trigger/flaw/ticket calibration green, pools must not disturb it)
**Requirements**: POOL-01, POOL-02, POOL-03, POOL-04, POOL-05, POOL-06
**Success Criteria** (what must be TRUE):
  1. User-facing pool data derives from D1 swing highs/lows via the shared swing contract (k=2 strict fractal) — no forked swing logic
  2. Equal highs/lows rank heavier than single touches, and every pool shows side, zone bounds, weight, origin and ACTIVE/SWEPT/CONSUMED status
  3. Swept pools stay swept (wick-pierce marks SWEPT, close-through marks CONSUMED, first-sweep-wins, no re-promotion)
  4. Pool selector degrades honestly on stale/empty/thin legs (refuse-null envelope, sharedEpoch) and never throws
**Plans**: TBD

### Phase 20: §1 Live + Chart Overlay
**Goal**: Users see the live Pain Threshold map in report §1 and as chart overlays
**Depends on**: Phase 19
**Requirements**: S1-01, S1-02, S1-03, CHRT-01, CHRT-02, CHRT-03
**Success Criteria** (what must be TRUE):
  1. User can read a live §1 Pain Threshold block naming which pool, where, whether swept, and how close — with verbatim Azerbaijani reasons
  2. User sees honest §1 empty states (no pools / stale leg / thin history) instead of confident prose over a degraded banner
  3. User can see BSL/SSL zones as dashed price-line pairs on the chart, capped to nearest-2-per-side, with rank-1 highlighted and swept pools dimmed
  4. User sees pool lines dim under stale/thin tiers and sees ghost lines clear when the ticket stands aside, with ticket entry/SL/TP lines on top
**Plans**: TBD
**UI hint**: yes

### Phase 21: Execution Polish
**Goal**: Execution stays calibrated and uncorrupted with pools live — thresholds reviewed, ticket buffered, parity proven
**Depends on**: Phase 20
**Requirements**: POL-01, POL-02, POL-03, POL-04
**Success Criteria** (what must be TRUE):
  1. User (operator) can review WHY NOW fire-rate evidence (1–4/week band holds) with pools proven context-only from the firing log
  2. User sees ticket SL placed beyond the extreme plus ATR buffer and TP partials booked before the extreme — never magnet-to-the-line
  3. Parity harness proves trigger/flaw/ticket verdicts are identical with pools on vs off
  4. User can adjust threshold/pool-tolerance controls rendered from the installed slider primitive
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 19 → 20 → 21

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 19. Pools Math | 0/0 | Not started | - |
| 20. §1 Live + Chart Overlay | 0/0 | Not started | - |
| 21. Execution Polish | 0/0 | Not started | - |
