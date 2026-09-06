# Liquidity Engine — Institutional Execution Terminal for NQ

## What This Is

A live institutional-grade execution terminal for Nasdaq-100 futures (NQ) that reads charts through ICT liquidity-engineering methodology — not retail chart patterns. v1.0 shipped: NQ=F daily candles via a resilient Yahoo Finance proxy (failover, backoff, serve-stale, 60s CDN TTL), D1 Dealing Range (Premium/Discount + EQ, quadrant/OTE levels, bias/DOL/regime, rollover tripwire) as pure functions, a live candlestick chart with zone overlays + level lines + rollover banner, and a rule-based (no LLM) institutional report shell — all in a dark 3-panel terminal, live on Vercel Hobby. Built on Next.js 16 App Router with Zustand state, Baku-timezone awareness, and zero budget on Vercel free tier.

## Core Value

Correct D1 Premium/Discount positioning on live NQ data — if the dealing-range math is wrong, nothing else matters.

## Requirements

### Validated

- ✓ Yahoo Finance proxy (`app/api/yahoo`) serves NQ=F daily candles with 60s CDN TTL, query1→query2 failover, backoff, serve-stale — v1.0
- ✓ D1 Dealing Range calculation (Premium/Discount/Equilibrium, quadrant/OTE, DOL target, bias, ATR regime, rollover tripwire) as pure functions in `src/lib/ict` — v1.0
- ✓ Candlestick chart (lightweight-charts v5, dynamic import) with Premium/Discount zones, EQ/DOL lines, quadrant/OTE levels, rollover banner — v1.0
- ✓ Full 3-panel dark terminal shell per `reference/design.html` (#0A0A0F / #14141E / #00D9FF), Module 2 live — v1.0
- ✓ Rule-based institutional report shell (sections 1–6, non-Module-2 sections marked unavailable) — v1.0
- ✓ Sentiment + calendar fixtures with True AVG (excl. Insta/FiboGroup), 60% flag, trap-vs-genuine prose — v1.0
- ✓ Zustand store for symbol, timeframe, dealing-range state, confidence — v1.0
- ✓ Asia/Baku timezone handling for session/date logic (March + November DST proven) — v1.0
- ✓ Deployed on Vercel Hobby with cache headers, stale-serve drill, live-URL checklist green — v1.0

### Active

- [ ] v2 scope to be defined via `/gsd-new-milestone` (candidates: Modules 3–4 structure/execution, real sentiment/calendar APIs, intraday LTF, multi-symbol)

### Out of Scope

- Modules 1, 3, 4 live logic — report shell only; deferred to later phases (why: Phase 1 is Module 2 only)
- Intraday timeframes — D1 daily only for Phase 1 (why: dealing-range foundation first)
- Real sentiment/_calendar APIs — fixtures only (why: zero budget, no API keys)
- LLM integration — rule-based deterministic output only (why: determinism is a core principle, TIME>PRICE logic is codifiable)
- Auth, multi-symbol, mobile app — not Phase 1 (why: single-terminal MVP focus)

## Context

Shipped v1.0 Live Terminal (2026-09-06): 5 phases, 16 plans, 152 commits, +26105/−906 across 158 files. 133/133 tests green, lint clean. Live at https://liquidity-engine-nine.vercel.app.
Tech stack: Next.js 16 App Router, Zustand 5, lightweight-charts v5 (dynamic ssr:false), date-fns-tz, Tailwind v4, shadcn primitives (button, dropdown-menu, dialog, toast, calendar, card).
Known debt for next milestone: chart HiDPI/resize polish, pre-existing tsc LayoutProps error (app/layout.tsx), Vercel token + Deployment Protection + drill-preview branch leftovers, thinHistory display gap.
- Brownfield origin: Next.js 16.3.4 + React 19 scaffold; home page was stock placeholder, replaced by dashboard in Phase 2.
- `zustand` ^5.0.15, `lightweight-charts` ^5.2.1, `date-fns` + `date-fns-tz` — all wired up (store, chart, Baku time).
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
| NQ=F daily (D1) as Phase 1 data | Dealing-range foundation needs daily structure first | ✓ Good — range math proven on live data |
| Full 3-panel shell, only Module 2 live | UI target visible early; other panels show unavailable state | ✓ Good — terminal readable, honesty markers hold |
| Migrate to `src/lib/ict` now | Monorepo-ready pure functions as specified | ✓ Good — purity constraint kept testability high |
| Fixture files for sentiment/calendar mocks | Replaceable with real APIs later, zero budget now | ✓ Good — labeled Ssenari, replaceable shape |
| Full report shell (sections 1–6) with unavailable markers | Report shape stable from day one; later phases fill sections | ✓ Good — shape stable, §2 live |
| Done = deployed + verified (cache, backoff, timezone) | Live data correctness is the core value | ✓ Good — Vercel drill green, nothing silent |
| [03.1] Inline conditional banner block, NqChart props untouched | Smallest blast radius for gap closure | ✓ Good — F5 flow exists, chart untouched |
| [03.1] selectRollover guards atr<=0 to null | Thin history must never false-flag | ✓ Good — honest degrade holds |
| [03.2] Stable selector-function subscription over useShallow for selectLevels | useShallow loops on fresh OTE pocket identity | ✓ Levels render, no update-depth errors |
| [03.2] D-08 delete checkReanchor, rule-table rewritten on rolling recompute | Zero callers outside tests; rolling window carries re-anchoring | ✓ 5 rewritten cases green |
| [03.2] Retroactive Phase 1 gate instead of rework | Code was wired; only the gate was missing | ✓ 10/10, all 8 partials resolved |
| [03.2] Stable selector-function subscription over useShallow for selectLevels | useShallow on selectLevels() output loops forever (fresh nested OTE pocket identity per call); deriving during render gives the same outcome stub tests pin | ✓ Levels render, no update-depth errors |
| [03.2] D-08 delete checkReanchor, rule-table rewritten on rolling recompute | Zero callers outside tests; rolling ANCHOR_WINDOW recompute carries re-anchoring (wick pierce extends with supersede comment) | ✓ 5 rewritten cases green |
| [03.2] Pre-existing tsc LayoutProps error left untouched | From commit 3a3a1cb in app/layout.tsx, outside every 03.2 plan's files and scope | ⚠ Noted residual for a later phase |
| [03.2] UAT visual glance passes: Q1/OTE lines legible | Canvas legibility judged by human per plan coverage D3 | ✓ 03.2-UAT 1/1 pass |

## Current Milestone: v1.0 Live Terminal

**Goal:** Live dark-terminal dashboard proving correct D1 Premium/Discount positioning on real NQ data.

**Target features:**
- Yahoo Finance proxy with 60s cache + 429 backoff
- D1 Dealing Range pure-function core in `src/lib/ict`
- Candlestick chart with zone overlays
- 3-panel terminal shell + rule-based report shell
- Sentiment/calendar fixtures, Zustand store, Baku timezone
- Vercel deployment with cache/backoff/timezone verified

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
*Last updated: 2026-09-06 after Phase 03.2*
