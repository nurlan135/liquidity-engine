# Liquidity Engine — Institutional Execution Terminal for NQ

## What This Is

A live institutional-grade execution terminal for Nasdaq-100 futures (NQ) that reads charts through ICT liquidity-engineering methodology — not retail chart patterns. v1.0 shipped the D1 foundation (NQ=F daily proxy, dealing range, chart, report shell). v2.0 Modul 3 shipped liquidity sequencing: dual-symbol NQ+ES proxy (daily + 1H/15M intraday), time-anchored SMT divergence with correlation gate + rollover suppression, FVG map with sweep-then-reject ERL/IRL transition, NY-anchored 1H→4H synthesis, Baku-aware Asia Range + three-gate London Judas + AMD phase classifier — all fused into a live rule-based report §3 with Asia overlays and Judas/SMT markers, verified on the live Vercel URL. Built on Next.js 16 App Router with Zustand state, Baku-timezone awareness, and zero budget on Vercel free tier.

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

### Validated (continued)

- ✓ Dual-symbol Yahoo proxy (`?symbol=&interval=`): ES=F daily + NQ/ES 1H/15M intraday, per-leg stale envelopes, staggered polling, timestamp inner-join — v2.0
- ✓ SMT divergence (NQ vs ES): time-anchored swing pairs, BULLISH/BEARISH/NO-SIGNAL, correlation-regime gate, joint rollover suppression — v2.0
- ✓ FVG map + sweep-then-reject ERL/IRL transition + §2 delivery sentence — v2.0
- ✓ 4H synthesis from NY-anchored 1H blocks + `selectRange4H` §2 line — v2.0
- ✓ Asia Range (20:00–00:00 NY) + three-gate London Judas + AMD classifier fusing range+Judas+SMT — v2.0
- ✓ Live report §3 (Liquidity Path, SMT Status, Session AMD) with verbatim reasons + Asia/Judas/SMT chart overlays + conviction tiers — v2.0
- ✓ Vercel per-leg verify: drill 6/6 PASS, visual glance re-verify PASS (human-confirmed) — v2.0
- ✓ Zero-error TypeScript: LayoutProps fix in `app/layout.tsx`, clean-checkout `tsc --noEmit` green, prod build green, zero runtime change — v2.1
- ✓ Chart HiDPI/resize polish: library-native autosize with view-lock + fallback gate, overlays/chrome byte-identical, UAT 6/6 — v2.1
- ✓ Vercel hygiene: drill token deleted 2026-09-09, Standard Protection intentional + documented, drill-preview branch gone, prod 200/200, kept scripts green — v2.1
- ✓ Honest thin history: thin-tier truth + persistent banner + uniform 0.5 zone/level dimming, 17/17 verified, UAT 2/2, 298/298 tests — v2.1

### Active

- [ ] v3.0 Execution (Modul 4): WHY NOW trigger, order ticket, fatal flaw — scope after live observation
- [ ] Pain Threshold map (§1 BSL/SSL projection) — gap closure candidate for v3.0 scoping

### Out of Scope

- Modules 1, 3, 4 live logic — report shell only; deferred to later phases (why: Phase 1 is Module 2 only)
- Intraday timeframes — D1 daily only for Phase 1 (why: dealing-range foundation first)
- Real sentiment/_calendar APIs — fixtures only (why: zero budget, no API keys)
- LLM integration — rule-based deterministic output only (why: determinism is a core principle, TIME>PRICE logic is codifiable)
- Auth, multi-symbol, mobile app — not Phase 1 (why: single-terminal MVP focus)

## Context

Shipped v1.0 Live Terminal (2026-09-06): 5 phases, 16 plans, 152 commits, +26105/−906 across 158 files. 133/133 tests green, lint clean. Live at https://liquidity-engine-nine.vercel.app.
Shipped v2.0 Modul 3 (2026-09-08): 4 phases, 14 plans, 32 tasks, 32 files +5141/−83. 283/283 tests green, tsc clean. Audit passed after remediation (ICT-11 closure + retroactive 08/09 VERIFICATIONs). Live observation period recommended before v3.0 scoping (Judas confirm rate, SMT rollover behavior, Asia live alignment, 09-07 Mandelbug recurrence watch).
Shipped v2.1 Cleanup & Polish (2026-09-09): 4 phases, 7 plans, 12 tasks, 61 files +6984/−95, 67 commits over 2 days. 298/298 tests green, tsc clean, all UAT green (1/1 + 6/6 + 6/6 + 2/2). Audit tech_debt with zero gaps (7/7 reqs, 9/9 integration, 3/3 flows); 7 non-blocking debt items carried (dead thinHistory arg, orphaned export/type, Nyquist process notes — see v2.1-MILESTONE-AUDIT.md).
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
| [v2.0] ICT-11 closure: selectRange4H + §2 4H line | aggregate1Hto4H had zero callers; §2 title already promised D1/4H | ✓ 283/283, wired end-to-end |
| [v2.0] Retroactive 08/09 VERIFICATIONs | Missing artifacts blocked formal audit, substance was green | ✓ Both passed, audit flipped to passed |
| [v2.0] Live observation before v3.0 | Synthetic fixtures prove mechanics, not methodology | — Pending (2–4 week watch: Judas rate, SMT rollover, Asia alignment, Mandelbug) |
| [12] Deploy hygiene: public prod + Vercel-login previews (Standard Protection); drill token deleted 2026-09-09; drill-preview branch gone | Intentional post-drill state, dashboard-verified | ✓ Done — DEPL-01/02/03 |
| [11] Chart autosize via lightweight-charts native autoSize + autoSizeActive fallback gate; view-lock, overlays/chrome byte-identical | No-RO path near-dead but kept as fallback; Nyquist PARTIAL intentional (canvas pixels untestable in node-env, UAT 6/6 covers) | ✓ Good — crisp + resize-clean |
| [13] Thin-tier truth module + persistent banner stacked thin-first; uniform 0.5 zone/level dimming, markers/Asia/candles full strength | Dead thinHistory arg in zoneBands call + orphaned thinTier export/type noted as minor debt; Asia fallback increases overlay frequency by design | ✓ Good — honest rendering holds |
| [13] Asia killzone 20:00–23:45 plus fallback to last completed session (edbc70a) | Per-candle wall-clock session resolution; fallback makes selectAsia non-null more often, tone stays accent/stale by design | ✓ Good — en passant fix |

## Current State: v2.1 Shipped

**Shipped 2026-09-09.** Terminal is clean: zero tsc errors, crisp resize-clean chart, documented Vercel hygiene, honest thin-history rendering. Next: live observation continues (2–4 weeks of daily §3-vs-market notes), then `/gsd-new-milestone` for v3.0 Execution with facts, not assumptions.

<details>
<summary>Previous milestone: v2.1 Cleanup & Polish (goal + targets, archived)</summary>

**Goal:** Pay down the four known-debt items left over from v1.0/v2.0 so the terminal is clean before v3.0 scoping.

**Target features:**
- tsc LayoutProps fix (`app/layout.tsx`, from 3a3a1cb) — zero tsc errors
- Chart HiDPI/resize polish — crisp high-DPI rendering, clean redraw on resize
- Vercel leftovers removal — token, Deployment Protection, drill-preview branch remnants
- thinHistory display gap closure — honest rendering for thin history

Full detail: `.planning/milestones/v2.1-ROADMAP.md`

</details>

<details>
<summary>Previous milestone: v2.0 Modul 3 (goal + targets, archived)</summary>

**Goal:** NQ vs ES SMT divergence və tam AMD (Asia Range + London/NY Judas) ilə 4H/1H likvidlik sekvensiyası — hesabat §3 canlı.

**Target features:**
- ES=F proxy genişlənməsi (NQ ilə eyni Yahoo proxy-dən, 60s cache + serve-stale)
- 4H/1H internal/external keçid məntiqi (`src/lib/ict` pure functions)
- SMT divergence: NQ vs ES swing müqayisəsi + accumulation/distribution siqnalı
- Tam AMD: Asia Range + London/NY Judas Swing detection (Baku-aware sessiya saatları)
- Hesabat §3 canlı (Modul 3 nəticələri ilə), chart-da Asia Range overlay
- Vercel deploy + verify (cache, timezone, §3 render)

</details>

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
*Last updated: 2026-09-09 after v2.1 milestone*
