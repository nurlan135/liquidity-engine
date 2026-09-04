# Liquidity Engine — Institutional Execution Terminal for NQ

## What This Is

An institutional-grade execution terminal for Nasdaq-100 futures (NQ) that reads charts through ICT liquidity-engineering methodology — not retail chart patterns. Phase 1 delivers a live dark-terminal dashboard: NQ=F daily candles via a cached Yahoo Finance proxy, D1 Dealing Range (Premium/Discount) math as pure functions, a candlestick chart with zone overlays, and a rule-based (no LLM) institutional report shell. Built on Next.js 16 App Router with Zustand state, Baku-timezone awareness, and zero budget on Vercel free tier.

## Core Value

Correct D1 Premium/Discount positioning on live NQ data — if the dealing-range math is wrong, nothing else matters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Yahoo Finance proxy (`app/api/yahoo`) serves NQ=F daily candles with 60s cache and 429 exponential backoff
- [ ] D1 Dealing Range calculation (Premium/Discount/Equilibrium, DOL target, bias) as pure functions in `src/lib/ict`
- [ ] Candlestick chart (lightweight-charts, dynamic import) with Premium/Discount zone overlays
- [ ] Full 3-panel dark terminal shell per `reference/design.html` (#0A0A0F / #14141E / #00D9FF), Module 2 live
- [ ] Rule-based institutional report shell (sections 1–6, non-Module-2 sections marked unavailable)
- [ ] ForexFactory + Myfxbook sentiment mocks as JSON fixtures with True AVG (excl. Insta/FiboGroup) and 60% threshold flag
- [ ] Zustand store for symbol, timeframe, dealing-range state, confidence
- [ ] Asia/Baku timezone handling for session/date logic
- [ ] Deployed on Vercel free tier with cache, backoff, timezone verified

### Out of Scope

- Modules 1, 3, 4 live logic — report shell only; deferred to later phases (why: Phase 1 is Module 2 only)
- Intraday timeframes — D1 daily only for Phase 1 (why: dealing-range foundation first)
- Real sentiment/_calendar APIs — fixtures only (why: zero budget, no API keys)
- LLM integration — rule-based deterministic output only (why: determinism is a core principle, TIME>PRICE logic is codifiable)
- Auth, multi-symbol, mobile app — not Phase 1 (why: single-terminal MVP focus)

## Context

- Brownfield: Next.js 16.3.4 + React 19 + Tailwind v4 + shadcn/Base-UI primitives scaffold exists; home page is stock placeholder to be replaced by dashboard.
- `zustand` ^5.0.15, `lightweight-charts` ^5.2.1, `date-fns` + `date-fns-tz` installed but not yet imported — Phase 1 wires them up.
- Domain spec: `reference/institutional_rules.md` (4 ICT modules + 6-section institutional report, TIME>PRICE, SMT mandatory, WHY NOW engine). Phase 1 implements Module 2 only; write minimal `ict_rules.md` for Module 2.
- UI target: `reference/design.html` 3-panel dark terminal (#0A0A0F background, #14141E panels, #00D9FF accent).
- Shadcn usage restricted to: button, dropdown-menu, dialog, toast, calendar, card.
- `src/lib/ict` migration: move from root `lib/` to `src/lib/ict` for monorepo-ready pure functions; update `@/*` alias accordingly.
- Symbols: NQ=F daily (D1) via Yahoo; XAUUSD broker-exclusion exception noted in spec but out of Phase 1 scope.
- User language context: institutional rules doc is in Azerbaijani; Baku timezone (Asia/Baku) is the operating timezone.

## Constraints

- **Budget**: Zero — Vercel free tier only, no paid APIs
- **State**: Zustand only — no Redux/Context for dashboard state
- **Cache**: Yahoo proxy responses cached 60s
- **Purity**: `src/lib/ict` functions must be pure (no I/O, no Date.now inside — inject time) for testability and monorepo extraction
- **AI**: Rule-based, no LLM calls in Phase 1
- **Tech stack**: Next.js 16 App Router, TypeScript strict, Tailwind v4, lightweight-charts (dynamic import), date-fns-tz, allowed shadcn components only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| NQ=F daily (D1) as Phase 1 data | Dealing-range foundation needs daily structure first | — Pending |
| Full 3-panel shell, only Module 2 live | UI target visible early; other panels show unavailable state | — Pending |
| Migrate to `src/lib/ict` now | Monorepo-ready pure functions as specified | — Pending |
| Fixture files for sentiment/calendar mocks | Replaceable with real APIs later, zero budget now | — Pending |
| Full report shell (sections 1–6) with unavailable markers | Report shape stable from day one; later phases fill sections | — Pending |
| Done = deployed + verified (cache, backoff, timezone) | Live data correctness is the core value | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-04 after initialization*
