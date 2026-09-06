# Phase 1: Data Foundation & ICT Core - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning

## Phase Boundary

Phase 1 delivers trusted numbers with no UI: a resilient NQ=F daily proxy (`GET /api/yahoo`, 60s TTL, failover + backoff + serve-stale) plus the pure-function D1 dealing-range math core in `src/lib/ict` (range, EQ/quadrants/OTE, bias + rationale, Primary DOL, ATR regime, rollover flag), proven by a green unit suite including March/November DST tests. No chart, no panels, no fixtures routes — those are Phase 2. Everything downstream (zones, bias, DOL, report) is a deterministic function of validated candles plus an explicit asOf date.

## Implementation Decisions

### Proxy contract & failure behavior
- **D-01:** Proxy serves fixed `NQ=F` daily only — no symbol/range parameters. Matches DATA-01 exactly; multi-symbol (PROD-01) is a v2 concern. — **Reversibility:** costly — Phase 2 polling code and envelope consumers assume the fixed contract; parameterizing later touches proxy + all callers.
- **D-02:** Response envelope is `{candles, lastUpdatedISO, stale, source}` where `source: 'live'|'cache'|'stale'`. Cache only validated payloads (symbol matches, timestamps ascending, complete OHLC); never cache errors.
- **D-03:** Yahoo down + empty cache on first load → HTTP 502 structured error `{error, retryAfter}`. Never synthesize or fake candles; Phase 2 renders an honest error/closed state.
- **D-04:** Include today's still-forming daily candle, flagged `forming: true` on the last row. ICT anchor math uses closed candles only; the flag lets the chart show live feel without corrupting the range.

### Range anchor & re-anchor rules
- **D-05:** Range extremes = highest high / lowest low over an explicit N-candle window (researcher picks N, e.g. 20D). Window + asOf passed explicitly into the range function; it never fetches or trims data itself.
- **D-06:** Only a D1 **close** beyond either extreme retires the range and re-anchors. Wick piercings are liquidity raids, not breaks — no re-anchor on wick touch.
- **D-07:** Rollover-suspect gap (close-to-close jump exceeding N×ATR, multiplier at researcher discretion) sets `rolloverSuspect: true` with `contractHint` + proximity warning, but computation continues off current anchors until a real close-break confirms. No silent absorption, no freeze — flag-and-continue.
- **D-08:** Futures use raw OHLC, never `adjclose`. Gaps stay visible (never interpolated/filled). Range function takes explicit candle window + asOf date.

### Bias / DOL / Regime thresholds
- **D-09:** Equilibrium buffer band: position 0.48–0.52 reads COMPRESSION / equilibrium-fair. Outside the band, position > 0.5 = premium side, < 0.5 = discount side. Buffer prevents bias flicker when price hugs EQ.
- **D-10:** Bias derives from D1 position + regime with a mandatory rationale string on every output. BULLISH when price sits in discount, BEARISH in premium, COMPRESSION inside the buffer or on thin history (degrade honestly).
- **D-11:** Primary DOL = opposite extreme: bullish bias → range high / PDH side; bearish bias → range low / PDL side. Single named level, codified position + regime rules.
- **D-12:** Volatility regime via ATR: current ATR vs its own N-period average — elevated = Expansion, contracted = Compression. Degrades honestly on thin history (insufficient bars → COMPRESSION with rationale). Exact periods at researcher discretion.
- **D-13:** Levels derived from anchors: EQ = (Rhigh + Rlow) / 2, quadrant lines at 0.25 / 0.75, OTE pocket 0.62–0.79 of the range.

### Code shape & verification
- **D-14:** Test runner is **vitest** (new devDependency). No runner installed today; vitest fits Next/TS pure-function suites.
- **D-15:** One concept per file in `src/lib/ict`: `range.ts`, `levels.ts` (EQ/quadrants/OTE), `bias.ts`, `dol.ts`, `regime.ts`, `rollover.ts`, plus `types.ts`. Each independently testable. Migrate from root `lib/` to `src/lib/ict` now; update `@/*` alias accordingly.
- **D-16:** Strict purity: `src/lib/ict` functions do no I/O, no `Date.now()`, no `Intl`, no store imports. Time injected (`asOfBakuDate`), formatting at the display edge. Testable and monorepo-extractable.
- **D-17:** Single time util module (`src/lib/time.ts` or equivalent) for all Asia/Baku session/date logic with injected clock; March + November DST unit tests required. D1 candles travel as `YYYY-MM-DD` business-day strings proxy → store → chart. Code identifiers in English; Azerbaijani spec terms live in comments/docs only.

### Claude's Discretion
Numeric parameters left to researcher/planner: N-candle anchor window length, ATR periods for regime, rollover N×ATR multiplier, `Retry-After`/backoff schedule details, rationale-string language (English vs Azerbaijani). User selected "I'm ready for context" — these are researcher-discretion items, not open questions.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Domain spec (normative — Module 2 rules, report shape)
- `reference/institutional_rules.md` — 4 ICT modules + 6-section institutional report, TIME>PRICE, True-AVG excl. Insta/FiboGroup, 60% crowded threshold. Phase 1 implements Module 2 (Macro Dealing Range & Volatility Regime) + report section 2 shape only. Azerbaijani language — code identifiers stay English.

### Project docs
- `.planning/PROJECT.md` — Phase 1 scope, constraints (zero budget, Zustand-only, 60s cache, pure functions, no LLM), key decisions (NQ=F D1, `src/lib/ict` migration, fixture strategy).
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: DATA-01, DATA-02, ICT-01…ICT-07, STATE-02. Traceability table maps each to Phase 1.
- `.planning/ROADMAP.md` — Phase 1 goal + 5 success criteria (proxy envelope, failover/backoff/stale, pure-function math + re-anchor + rollover flag, bias/DOL/regime rules, Baku time util + DST tests).
- `.planning/research/SUMMARY.md` — backend-first rationale, stack (no new deps), component breakdown, research flags (Yahoo upstream MEDIUM confidence → plan proxy-resilience research).
- `.planning/research/PITFALLS.md` — pitfalls 1, 2, 3, 6, 7, 8, 9, 10 apply to Phase 1 (429/ban, rollover gap, TZ triple-shift, stale-as-live, null OHLC, derived-state-in-store, tz-package confusion, fixture drift).

### Codebase maps
- `.planning/codebase/STACK.md` — Next.js 16.3.4 + React 19 + TS strict; zustand, lightweight-charts v5, date-fns + date-fns-tz installed but not yet imported; no test runner; `@/*` → repo root.
- `.planning/codebase/ARCHITECTURE.md` — client/server boundary (`"use client"` in `components/`, never convert `app/layout.tsx`); `cn` imported from `"cn"`; domain logic belongs in `lib/`, never `components/ui/`.
- `.planning/codebase/STRUCTURE.md` — where to add code: domain logic `lib/<domain>/`, tests co-located `<module>.test.ts` when a runner is added.

## Existing Code Insights

### Reusable Assets
- `lib/utils.ts` (`export { cn } from "cn"`): class-merging helper — not directly needed in Phase 1 (no UI), but the `@/*` alias + `cn` import convention constrains later phases.
- Installed-but-unwired deps (`package.json`): `zustand ^5.0.15`, `lightweight-charts ^5.2.1`, `date-fns` + `date-fns-tz` — Phase 1 wires only `date-fns-tz` (time util); zustand/lightweight-charts activate in Phase 2.
- `components/ui/*` (button, dialog, toast, calendar, card, dropdown-menu): presentational primitives — off-limits for domain logic; untouched in Phase 1.

### Established Patterns
- Server-first App Router: `app/` routes are Server Components by default; the proxy will be a Route Handler (`app/api/yahoo/route.ts`) with `force-dynamic` — never fetch Yahoo from client code.
- `data-slot` + `cva` component pattern in `components/ui/`: irrelevant to Phase 1, but confirms `components/ui/` stays pure-presentational.
- Path alias `@/*` → repo root (`tsconfig.json`): use for `src/lib/ict` imports; update alias mapping when migrating from root `lib/`.

### Integration Points
- New: `app/api/yahoo/route.ts` — sole Yahoo caller (server-only), browser UA + Accept/Referer headers, query1→query2 failover, backoff honoring Retry-After, singleflight dedupe, 60s module-level Map cache + `s-maxage=60, SWR=30` CDN semantics.
- New: `src/lib/ict/*` — pure math core, zero imports from store/fetch/Intl; consumed by Phase 2 Zustand selectors.
- New: time util module — single Asia/Baku rule via date-fns-tz, injected clock, consumed by both proxy (`lastUpdated` stamping) and ict functions (`asOfBakuDate`).
- No test infra exists: Phase 1 adds vitest + co-located `<module>.test.ts` (synthetic-gap test, null-row fixture test, March/November DST tests, backoff + stale-serve test).

## Specific Ideas

No specific requirements — open to standard approaches. Research SUMMARY.md recommends: hand-rolled 60s Map cache with stale-on-429 fallback, explicit `force-dynamic`, poll jitter + singleflight, bounded 6mo D1 window, `maxDuration` + response-size caps.

## Deferred Ideas

None — discussion stayed within phase scope. (Phase 2 owns: chart, terminal shell, report shell, fixture routes, Zustand store, weekend-closed state, DATA-03 freshness badges. Phase 3 owns: Vercel deploy, CDN header verification, cold-start/stale-serve drill, live-URL checklist.)

---

*Phase: 1-Data Foundation & ICT Core*
*Context gathered: 2026-09-04*
