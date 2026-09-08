# Roadmap: Liquidity Engine — Institutional Execution Terminal for NQ

## Milestones

- ✅ **v1.0 Live Terminal** — Phases 1–3 + 03.1, 03.2 (shipped 2026-09-06)
- ✅ **v2.0 Modul 3 (Liquidity Sequencing & SMT)** — Phases 6–9 (shipped 2026-09-08)
- 🔄 **v2.1 Cleanup & Polish** — Phases 10–13 (in planning)

## Phases

- [ ] **Phase 10: Type Safety Fix** - Zero tsc errors via LayoutProps fix
- [ ] **Phase 11: Chart Rendering Polish** - Crisp HiDPI chart with clean resize
- [ ] **Phase 12: Deployment Hygiene** - Vercel leftovers removed and documented
- [ ] **Phase 13: Thin History Honesty** - Honest rendering for thin history

## Phase Details

### Phase 10: Type Safety Fix

**Goal**: TypeScript compiles cleanly with zero errors and no runtime change
**Depends on**: Nothing (isolated fix, first phase)
**Requirements**: TYPE-01
**Success Criteria** (what must be TRUE):

  1. `tsc --noEmit` exits zero on a clean checkout
  2. Layout page renders identically before and after the fix (no runtime behavior change)

**Plans**: 1 plan

Plans:

- [x] 10-01-PLAN.md — Clean-checkout tsc fix plus build and parity proof

### Phase 11: Chart Rendering Polish

**Goal**: Users see a crisp chart on any display that redraws cleanly on resize
**Depends on**: Nothing (independent of Phase 10; touches chart component only)
**Requirements**: CHRT-01, CHRT-02
**Success Criteria** (what must be TRUE):

  1. User sees crisp chart lines and text on a high-DPI (Retina/2x) display with no blur
  2. User can resize the browser window and the chart refills its container with no stretch, clipping, or frozen canvas
  3. No console errors or warnings appear during resize or DPI switch

**Plans**: TBD
**UI hint**: yes

### Phase 12: Deployment Hygiene

**Goal**: Vercel project is free of stale credentials, flags, and dead branches
**Depends on**: Nothing (verification + removal work, independent)
**Requirements**: DEPL-01, DEPL-02, DEPL-03
**Success Criteria** (what must be TRUE):

  1. No stale Vercel token remains in env, config, or committed files
  2. Deployment Protection state is intentional and its setting is documented
  3. No drill-preview branch, flag, or reference remains in repo, config, or dashboard

**Plans**: TBD

### Phase 13: Thin History Honesty

**Goal**: Users always get an honest chart when history is too thin for full rendering
**Depends on**: Phase 11 (shares the chart component area — polish first, then the thin-history path)
**Requirements**: HIST-01
**Success Criteria** (what must be TRUE):

  1. User with thin/insufficient history sees an honest indicator or fallback state
  2. Thin history never renders as a silent empty chart or a misleading full chart

**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 10. Type Safety Fix | 1/1 | Complete   | 2026-09-08 |
| 11. Chart Rendering Polish | 0/0 | Not started | - |
| 12. Deployment Hygiene | 0/0 | Not started | - |
| 13. Thin History Honesty | 0/0 | Not started | - |

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
