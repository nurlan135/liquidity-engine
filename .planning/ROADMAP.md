# Roadmap: Liquidity Engine — Institutional Execution Terminal for NQ

## Milestones

- ✅ **v1.0 Live Terminal** — Phases 1–3 + 03.1, 03.2 (shipped 2026-09-06)
- 🚧 **v2.0 Modul 3 (Liquidity Sequencing & SMT)** — Phases 6–9 (in progress)

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

### 🚧 v2.0 Modul 3 (Liquidity Sequencing & SMT) (In Progress)

**Milestone Goal:** NQ vs ES SMT divergence və tam AMD (Asia Range + London Judas) ilə 4H/1H likvidlik sekvensiyası — hesabat §3 canlı.

- [x] **Phase 6: Dual-Symbol Proxy + Data Contracts** - Parameterized ES=F + intraday proxy with per-symbol stale envelopes and timestamp join (completed 2026-09-07)
- [ ] **Phase 7: SMT + 4H/1H Sequencing Math** - Time-anchored SMT comparator, rollover suppression, FVG/IRL transition, 4H synthesis
- [ ] **Phase 8: AMD Sessions (Asia Range + Judas)** - Baku-aware Asia Range, three-gate London Judas, AMD phase classifier
- [ ] **Phase 9: Composition (§3 Live + Overlays + Verify)** - Live rule-based report §3, Asia overlay + markers, Vercel per-leg verify

## Phase Details

### Phase 6: Dual-Symbol Proxy + Data Contracts

**Goal**: Terminal serves dual-symbol daily + intraday candles through honest per-symbol stale envelopes
**Depends on**: Phase 3 (v1.0 NQ proxy is the pattern being parameterized)
**Requirements**: DATA-04, DATA-05, DATA-06, DATA-07
**Success Criteria** (what must be TRUE):

  1. User receives ES=F daily candles via parameterized `?symbol=&interval=` proxy while the NQ pipe behaves exactly as before
  2. User receives NQ + ES 1H/15M candles with forming candle excluded, incomplete pre-join rows dropped, and coverage diagnostics visible
  3. Dual-symbol polling staggers load (NQ :00 / ES :30 + jitter) and SMT refuses with a stated reason when either leg is stale — never a merged `stale` boolean
  4. Cross-symbol comparisons operate on timestamp inner-joined rows only; misaligned rows are never compared

**Plans**: 5/5 plans executed
Plans:

- [x] 06-05-PLAN.md

**Wave 1**

- [x] 06-01-PLAN.md — Tracer: live ES=F probe plus parameterized ES=F daily proxy with byte-identical NQ default

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md — Intraday parser branch with epoch contract plus bounded ranges
- [x] 06-03-PLAN.md — Pure timestamp inner-join with coverage diagnostics

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-04-PLAN.md — Dual-leg staggered store plus per-leg strip ages plus phase gate

### Phase 7: SMT + 4H/1H Sequencing Math

**Goal**: Users see SMT divergence status and engineered-liquidity transition state from pure-function math
**Depends on**: Phase 6
**Requirements**: ICT-08, ICT-09, ICT-10, ICT-11
**Success Criteria** (what must be TRUE):

  1. User sees SMT divergence status (BULLISH / BEARISH / NO-SIGNAL) with swing references in output, suppressed by the correlation-regime gate when the pair decouples
  2. Rollover-week fake SMT is suppressed when either leg is rollover-suspect
  3. User sees FVG map + ERL/IRL transition state that fires only on sweep-then-reject (never sweep alone), with §2 Delivery Cycle upgraded
  4. User sees 4H structure synthesized from NY-anchored 1H blocks under closed-only discipline

**Plans**: TBD

### Phase 8: AMD Sessions (Asia Range + Judas)

**Goal**: Users see session-aware AMD timing — Asia range, London Judas, phase classifier
**Depends on**: Phase 6
**Requirements**: ICT-12, ICT-13, ICT-14
**Success Criteria** (what must be TRUE):

  1. User sees Asia Range computed on IANA `America/New_York` wall-clock (19:00–00:00 NY) with correct Baku display across March, November, and maintenance-break boundaries
  2. User sees London Judas Swing only on three-gate conjunction (in-killzone AND swept-Asia-extreme AND reversal-with-displacement), with candidates hollow vs confirmed solid and ≤25% confirmed sessions over 60 days
  3. User sees AMD phase (accumulation / manipulation / distribution) fusing range + Judas + SMT state, with NY honestly marked Gözlənilir

**Plans**: TBD

### Phase 9: Composition (§3 Live + Overlays + Verify)

**Goal**: Users read live report §3 and see session overlays on a verified Vercel deploy
**Depends on**: Phase 7, Phase 8
**Requirements**: ICT-15, UI-05, UI-06, DEPLOY-02
**Success Criteria** (what must be TRUE):

  1. User sees live report §3 (Engineered Liquidity Path, SMT Divergence Status, Session AMD Timing) where every degraded state renders its reason and missing families keep unavailable markers
  2. User sees Asia Range overlay on the chart (null-autoscale) plus Judas/SMT pins via series markers, with ES off-chart
  3. Highest-conviction setups score higher only when SMT and Judas both confirm — rule-based, no fake precision
  4. v2.0 is verified on the live Vercel URL: ES cold-start drill, intraday payload under `maxDuration`, §3 render check

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9 (Phases 7 and 8 both depend only on Phase 6 and may interleave, but 9 needs both)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Foundation & ICT Core | v1.0 | 3/3 | Complete | 2026-09-06 |
| 2. Terminal Composition | v1.0 | 4/4 | Complete | 2026-09-05 |
| 3. Production Deploy & Verification | v1.0 | 4/4 | Complete | 2026-09-06 |
| 03.1 Close gap ICT-07 banner | v1.0 | 1/1 | Complete | 2026-09-06 |
| 03.2 Close gap gate + fixes | v1.0 | 4/4 | Complete | 2026-09-06 |
| 6. Dual-Symbol Proxy + Data Contracts | v2.0 | 5/5 | Complete    | 2026-09-07 |
| 7. SMT + 4H/1H Sequencing Math | v2.0 | 0/TBD | Not started | - |
| 8. AMD Sessions (Asia Range + Judas) | v2.0 | 0/TBD | Not started | - |
| 9. Composition (§3 Live + Overlays + Verify) | v2.0 | 0/TBD | Not started | - |
