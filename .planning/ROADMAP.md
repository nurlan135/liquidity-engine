# Roadmap: Liquidity Engine — v1.0 Live Terminal

## Overview

v1.0 proves one thing: correct D1 Premium/Discount positioning on live NQ data. We build backend-first — a resilient Yahoo proxy plus pure-function ICT math proven by tests — then compose the dark terminal (shell, chart, report, fixtures) on top of trusted numbers, and finally prove it all live on Vercel Hobby where rate limits and cold starts actually bite. Three linear phases: every phase gates on observable truth before the next begins.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Foundation & ICT Core** - Resilient NQ proxy plus pure-function dealing-range math, proven by tests (no UI yet)
- [ ] **Phase 2: Terminal Composition** - Full dark-terminal shell with live chart, report, and fixture panels
- [ ] **Phase 3: Production Deploy & Verification** - Live on Vercel Hobby with resilience drills green

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

**Plans**: 3 plans

Plans:
**Wave 1**

- [ ] 01-01-PLAN.md — Tracer slice: vitest harness plus canonical types plus mocked NQ=F fetch-validate-envelope-range path plus thin route

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02-PLAN.md — ICT math expansion: levels plus bias plus DOL plus regime plus rollover with re-anchor table
- [ ] 01-03-PLAN.md — Proxy resilience plus Baku time: failover plus backoff plus singleflight plus serve-stale plus null fixture plus DST suite

### Phase 2: Terminal Composition

**Goal**: Users can read live NQ positioning in a full dark-terminal composition
**Depends on**: Phase 1
**Requirements**: DATA-03, UI-01, UI-02, UI-03, UI-04, MOCK-01, MOCK-02, MOCK-03, STATE-01
**Success Criteria** (what must be TRUE):

  1. User sees the 3-panel dark terminal per `reference/design.html` with Module 2 live and other modules marked unavailable
  2. User sees live candlesticks with premium/discount shading, EQ price-line, and DOL marker plus freshness/stale badges — and an honest weekend-closed state that never synthesizes candles
  3. User sees the 6-section institutional report with section 2 live, other sections marked unavailable, and the blocked side struck-through
  4. User sees the sentiment exposure table (True AVG, 60% crowded flag) and the high-impact calendar (countdown, pre-news flag) with trap-vs-genuine interpretation

**Plans**: TBD
**UI hint**: yes

### Phase 3: Production Deploy & Verification

**Goal**: Terminal is live on Vercel Hobby and proven resilient where it counts — in production
**Depends on**: Phase 2
**Requirements**: DEPLOY-01
**Success Criteria** (what must be TRUE):

  1. Terminal is deployed on Vercel Hobby with CDN cache headers (`s-maxage` + SWR) verified on the proxy routes
  2. Cold-start and stale-serve drill passes: upstream killed → stale badge shows, nothing fails silently
  3. Live-URL checklist is green: cache age, DST-date rendering, rollover banner path

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation & ICT Core | 0/TBD | Not started | - |
| 2. Terminal Composition | 0/TBD | Not started | - |
| 3. Production Deploy & Verification | 0/TBD | Not started | - |
