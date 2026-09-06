# Roadmap: Liquidity Engine — v1.0 Live Terminal

## Overview

v1.0 proves one thing: correct D1 Premium/Discount positioning on live NQ data. We build backend-first — a resilient Yahoo proxy plus pure-function ICT math proven by tests — then compose the dark terminal (shell, chart, report, fixtures) on top of trusted numbers, and finally prove it all live on Vercel Hobby where rate limits and cold starts actually bite. Three linear phases: every phase gates on observable truth before the next begins.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Foundation & ICT Core** - Resilient NQ proxy plus pure-function dealing-range math, proven by tests (no UI yet)
- [x] **Phase 2: Terminal Composition** - Full dark-terminal shell with live chart, report, and fixture panels (completed 2026-09-05)
- [x] **Phase 3: Production Deploy & Verification** - Live on Vercel Hobby with resilience drills green (completed 2026-09-06)

## Phase Details

### Phase 1: Data Foundation & ICT Core

**Goal**: Every downstream number is trusted — validated NQ candles and correct dealing-range math, verified without any UI
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, ICT-01, ICT-02, ICT-03, ICT-04, ICT-05, ICT-06, ICT-07, STATE-02
**Success Criteria** (what must be TRUE):

  1. `GET /api/yahoo` returns NQ=F daily candles (bounded 6mo D1 window) with a 60s-TTL cache envelope of `{candles, lastUpdatedISO, stale, source}`
  2. Proxy survives upstream failure via query1→query2 failover, exponential backoff honoring Retry-After, and serve-stale fallback — errors are never cached
  3. Range, Equilibrium, quadrant/OTE levels compute as pure functions, re-anchor on range-breaking closes, and flag rollover-suspect gaps from raw OHLC (never adjclose)
  4. Bias (with mandatory rationale), single named Primary DOL, and Expansion/Compression regime derive from codified rules and degrade honestly on thin history
  5. All date logic runs through the Baku time util with injected clock; March and November DST tests pass

**Plans**: 3/3 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Tracer slice: vitest harness plus canonical types plus mocked NQ=F fetch-validate-envelope-range path plus thin route

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — ICT math expansion: levels plus bias plus DOL plus regime plus rollover with re-anchor table
- [x] 01-03-PLAN.md — Proxy resilience plus Baku time: failover plus backoff plus singleflight plus serve-stale plus null fixture plus DST suite

### Phase 2: Terminal Composition

**Goal**: Users can read live NQ positioning in a full dark-terminal composition
**Depends on**: Phase 1
**Requirements**: DATA-03, UI-01, UI-02, UI-03, UI-04, MOCK-01, MOCK-02, MOCK-03, STATE-01
**Success Criteria** (what must be TRUE):

  1. User sees the 3-panel dark terminal per `reference/design.html` with Module 2 live and other modules marked unavailable
  2. User sees live candlesticks with premium/discount shading, EQ price-line, and DOL marker plus freshness/stale badges — and an honest weekend-closed state that never synthesizes candles
  3. User sees the 6-section institutional report with section 2 live, other sections marked unavailable, and the blocked side struck-through
  4. User sees the sentiment exposure table (True AVG, 60% crowded flag) and the high-impact calendar (countdown, pre-news flag) with trap-vs-genuine interpretation

**Plans**: 4/4 plans executed
**UI hint**: yes

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Tracer slice: store plus shell plus chart with sentinel pure libs (status-strip, chart-mapper, sentiment, calendar)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Freshness strip plus zone-fill primitive plus stale/closed chart overlays
- [x] 02-03-PLAN.md — Fixture snapshots plus sentiment table plus calendar with interpretation prose

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-04-PLAN.md — Report section 2 plus blocked side plus shell integration with poll loop and toasts

### Phase 3: Production Deploy & Verification

**Goal**: Terminal is live on Vercel Hobby and proven resilient where it counts — in production
**Depends on**: Phase 2
**Requirements**: DEPLOY-01
**Success Criteria** (what must be TRUE):

  1. Terminal is deployed on Vercel Hobby with CDN cache headers (`s-maxage` + SWR) verified on the proxy routes
  2. Cold-start and stale-serve drill passes: upstream killed → stale badge shows, nothing fails silently
  3. Live-URL checklist is green: cache age, DST-date rendering, rollover banner path

**Plans**: 4/4 plans executed

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Tracer: gates plus verify script plus local production proof plus temporary drill flag
- [x] 03-02-PLAN.md — One-way master to main rename before Vercel connection

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-03-PLAN.md — Vercel connection plus edge headers plus preview stale-serve drill

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-04-PLAN.md — Drill removal plus production gate plus rendering spot-checks (drill flag gone, production script green, D-10 rendering spot-checks recorded)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation & ICT Core | 3/3 | In Progress|  |
| 2. Terminal Composition | 4/4 | Complete    | 2026-09-05 |
| 3. Production Deploy & Verification | 4/4 | Complete    | 2026-09-06 |

### Phase 03.2: Close gap: Phase 1 retroactive gate + ICT-01 claim + ICT-02 render/descope + W1/W2/F2 fixes (INSERTED)

**Goal:** Phase 1 is trusted on written evidence and the chart shows the full level set — retroactive Phase 1 gate recorded, quadrant/OTE levels rendered, W1/W2/F2 fixes applied, deploy script extended
**Requirements**: DATA-01, DATA-02, DATA-03, ICT-01, ICT-02, ICT-03, ICT-04, ICT-05, ICT-06, STATE-02, DEPLOY-01
**Depends on:** Phase 3
**Plans:** 4 plans

Plans:

**Wave 1**

- [ ] 03.2-01-PLAN.md — ICT-02 render slice: levelLineInputs helper plus shell subscription plus four dashed quadrant/OTE price-lines
- [ ] 03.2-02-PLAN.md — Store fixes plus dead-code decision: closed-only last close plus immediate STALE plus checkReanchor deletion with rule-table rewrite

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 03.2-03-PLAN.md — Header freshness copy plus verify-deploy extension: three-state chart-freshness span plus stale/502, DST-date, rollover-banner steps plus gates

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 03.2-04-PLAN.md — Retroactive Phase 1 gate: green-baseline confirm plus 10-truth VERIFICATION.md scoring ICT-01 and all 8 partials

### Phase 03.1: Close gap ICT-07 banner (INSERTED)

**Goal:** Close the ICT-07 functional gap: wire detectRollover into a store selector (selectRollover) + banner component (flag-and-continue made visible), so E2E flow F5 (rollover week → flagged banner) exists. Scope is banner-only.
**Requirements**: ICT-07
**Depends on:** Phase 3
**Plans:** 1/1 plans executed

Plans:

- [x] 03.1-01-PLAN.md — Tracer slice: selectRollover selector plus rollover banner plus edge-case lock plus gates
