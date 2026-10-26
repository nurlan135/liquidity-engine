# Stack Research — Pools P2 (v3.2)

**Domain:** ICT liquidity-engine execution-link features (pool-aware ticket, intraday pools, sentiment multiplier)
**Researched:** 2026-10-26
**Confidence:** HIGH

## Verdict Up Front

**Zero new dependencies.** All six Pools P2 features (POOL2-01 TP2 resolver, POOL2-04 age/decay, POOL2-03 15M pools, POOL2-02 sentiment multiplier, POOL2-05 proximity tag, W12 buffered-ticket live wiring) are pure-function + Zustand-selector work on the existing stack. The codebase already contains every integration point: the harness-proven buffer path in `src/lib/ticket.ts`, the ACTIVE/SWEPT/CONSUMED lifecycle in `src/lib/ict/pools.ts`, the `nq15m` intraday leg in `src/lib/store.ts`, the `trueAvg` sentiment helper in `src/lib/sentiment.ts`, and the display-only `describePool` precedent in `src/lib/report.ts`.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js App Router | 16.3.4 (installed) | App shell, `/api/yahoo` proxy, report panels | Already serves NQ/ES daily + 1H/15M with per-leg stale envelopes; no routing/data change needed for P2 |
| React | 19.2.8 (installed) | UI rendering | Stable selector-function subscription pattern proven (no `useShallow` loops); new features add no new component-state patterns |
| Zustand | 5.0.15 (installed) | Dashboard state + all selectors (`selectPools`, `selectTicket`, `selectTrigger`, `selectLevels`) | Every P2 feature lands as selector derivation or selector input — no new store slice needed except optional calibration-style preview state |
| lightweight-charts | 5.2.1 (installed) | Candlestick chart + pool price-line pairs | Nearest-2-per-side BSL/SSL lines with rank brightness already shipped (Phase 20); 15M pools reuse the same `chart-mapper.ts` price-line path, no new overlay primitive |
| date-fns-tz | 3.2.0 (installed) | Baku/NY timezone handling, pool age date math | Pool age/decay needs session-date arithmetic only — `formatInTimeZone` + plain date-string diff covers it; no duration library needed |
| TypeScript strict | ^5 (installed) | Purity + contract enforcement | The `src/lib/ict` purity guard (`purity.test.ts`, co-located) is the enforcement mechanism for all new pool math |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.4.0 (installed) | Date-string diff for pool age (POOL2-04) | Only if age math outgrows manual epoch subtraction; prefer plain `Date` arithmetic on injected `asOf` strings to keep `ict/` dependency-light |
| vitest | ^5.0.0 (installed) | Unit + harness + parity tests | Every P2 feature extends an existing suite (`pools.test.ts`, `pools-parity.test.ts`, ticket buffer matrix) — no new runner |
| Tailwind v4 + shadcn primitives | installed (button, dropdown-menu, dialog, toast, calendar, card, slider) | Proximity-tag display, §1/§5 prose suffix | POOL2-05 is a string suffix; no new component needed |
| lucide-react | ^1.41.0 (installed) | Icons | Only if a new panel badge is designed; not required by any P2 requirement |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsc --noEmit` | Type gate | Must stay green; new pool-age fields touch `LiquidityPool` shape — update all consumers in one pass |
| `purity.test.ts` (co-located ict guard) | Purity enforcement | New `ict/` math (age/decay, 15M adapter, TP2 resolver if placed in `ict/`) must inject time — no `Date.now`, no store imports |
| 20-session parity harness (`pools-parity.test.ts`) | Pools-never-vote discipline | POOL2-04 decay and POOL2-02 multiplier must NOT change trigger/flaw/ticket verdicts — extend the triple-match harness, don't bypass it |

## Installation

```bash
# Nothing to install. All six features build on installed packages:
npm ci
```

No `package.json` change is part of Pools P2 scope.

## Integration Points (per feature)

**POOL2-01 — TP2 resolver wired to nearest ACTIVE pool.**
Pure resolver (suggested home: `src/lib/ticket.ts` beside `resolveTP`, or a small `ict/` helper if methodology-owned) that takes trade direction + ranked ACTIVE pools from `selectPools` and overrides the TP2 leg (currently the DOL price) with the nearest ACTIVE pool extreme on the trade side, booked before the extreme by the existing `TICKET_TP_PULLBACK_ATR_MULT`. Consumed in `store.ts` `selectTicket` where `computeTicket` is called (~line 1351). R/R gate stays on TP1 — unchanged.

**POOL2-04 — Pool age/decay + re-accumulation.**
Extend `LiquidityPool` in `src/lib/ict/pools.ts` (or a parallel age map if the D-18 shape lock forbids field growth — check the lock before choosing) with age derived from `originDate` vs injected `asOf`, a decay factor applied in `scoreAndRank`, and re-accumulation (touch-count refresh on retest without lifecycle re-promotion — SWEPT stays SWEPT). Time must be injected; the decay constants follow the existing `CALIBRATION-PROVISIONAL` marker convention. Parity harness must prove pools-never-vote still holds.

**POOL2-03 — 15M intraday swing pools.**
`pools.ts` `windowCandles` is D1-`Candle[]`-only per D-10 (never `IntradayCandle`). Recommended: a thin adapter that projects `IntradayCandle` rows (already flowing via the `nq15m` leg + `refreshNQ15M`) into the seed pipeline, reusing the shared `SWING_K=2` contract from `swings.ts`, with its own trailing window + cap constants (15M bars are ~26× denser than D1 — do NOT reuse `SWING_LOOKBACK=60` / `POOL_MAP_BOUND=20` blindly; seed provisional values under `CALIBRATION-PROVISIONAL`). Chart overlay reuses `chart-mapper.ts` price-line pairs. Rank-after-D1-stable ordering per the milestone goal: gate 15M display on D1 rank health, don't fuse the two maps.

**POOL2-02 — Sentiment multiplier on RetailExposure.**
Pure function (suggested home: `src/lib/sentiment.ts` beside `trueAvg`, consumed selector-side like `confluence.ts` to protect `ict/` purity) mapping `TrueAvgOutput.crowded` → multiplier with neutral default `1.0` (balanced → no-op). Applies to pool weight/score at the `selectPools` scoring plane or the §1 RetailExposure prose plane — decide once, document where, and keep it out of trigger/flaw/ticket voting (parity harness covers). Fixtures (`crowded-long/short/balanced.json`) already pin all three branches.

**POOL2-05 — Proximity tag suffix.**
Pure string formatter following the `describePool` precedent in `src/lib/report.ts` (display-only, verbatim pool fields, no numeric derivation beyond formatting ATR distance). Appended read-only to WHY NOW + ticket prose. Zero voter risk by construction — suffix, never input.

**W12 — Buffered ticket live wiring.**
`computeTicket` already accepts `TicketBufferInput` (`atr` + `poolExtreme`, harness-proven with `TICKET_SL_BUFFER_ATR_MULT=0.25` / `TICKET_TP_PULLBACK_ATR_MULT=0.1`); live `selectTicket` currently passes no buffer. Wiring = derive `atr` from the existing regime read + `poolExtreme` from `selectPools` nearest-on-trade-side inside `selectTicket`, pass through. Null-degrades to unbuffered structure levels per the T-21-01 contract — the fallback path is already tested.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| No new chart code (reuse price-line pairs) | Series markers / custom canvas overlay for pools | Only if UAT proves price lines unreadable at 15M density — not before; lines are proven at D1 |
| Plain date arithmetic for pool age | `date-fns` `differenceInDays` / interval helpers | Only if age semantics grow branches (sessions vs calendar days, rollover-aware aging) — start manual, adopt on evidence |
| Selector-side sentiment multiplier (`src/lib/`) | `ict/`-resident multiplier | Only if sentiment becomes methodology (time-anchored, replayable in the 20-session harness) — today it is fixture-driven display context, keep it out of `ict/` |
| Provisional 15M window/cap constants | Shared D1 constants (`SWING_LOOKBACK`, `POOL_MAP_BOUND`) | Never without recalibration evidence — bar density differs by an order of magnitude |
| Extend `selectTicket` buffer derivation inline | New `selectTicketBuffer` selector | Only if two+ consumers need the buffer (e.g. report §5 shows buffered vs unbuffered) — YAGNI until then |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any new npm dependency (chart, date, state, math) | Zero-budget Hobby constraint + every P2 need is already covered; each new dep is audit surface with no requirement behind it | Installed stack above |
| `moment` / `dayjs` | Redundant with `date-fns-tz`; extra bundle weight on Hobby | `date-fns-tz` + injected date strings |
| `d3` / `recharts` for pool visualization | Chart primitive already proven (`lightweight-charts` price lines, UAT 14/14) | `chart-mapper.ts` price-line path |
| Redux / Context for new pool state | Zustand-only constraint; selector-function pattern already solves the subscription-shape problem | Zustand selectors |
| LLM calls for TP2 / proximity prose | Determinism is a core principle; all six features are codifiable rules | Pure functions + verbatim Azerbaijani reason constants |
| Real sentiment/calendar APIs | Out of scope (fixtures, zero budget, no keys) | `src/lib/fixtures/*.json` + `fixture-guard.ts` |
| Server-side cron / DB / KV for age tracking | Pool age derives from `originDate` vs injected `asOf` — stateless; persistence adds cost and staleness bugs | Stateless derivation per evaluation |
| New test runner / e2e framework | 513/513 green on vitest + node-env harness + human UAT glance; canvas pixels already covered by acknowledged UAT | vitest, extend `pools*.test.ts` + parity harness |

## Stack Patterns by Variant

**If the TP2 resolver needs DOL interplay (pool beyond DOL vs before DOL):**
- Resolve TP2 as min-structure(pool extreme w/ pullback, existing DOL leg) on the trade side — never beyond the pool extreme (magnet-to-the-line rejected per D-06 precedent).
- Because the R/R gate reads TP1 only, TP2 changes are verdict-safe — but still extend the parity harness.

**If 15M pools disagree with D1 pools:**
- Display both maps independently (D1 rank-1 sentence stays authoritative in §1); never average or fuse cross-timeframe geometry without a methodology decision.

**If sentiment multiplier ever leaves neutral:**
- It scales RetailExposure display/score only; any proposal to let it vote on trigger/flaw/ticket is a scope change requiring parity-harness re-proof.

## Version Compatibility

| Package | Installed | Notes |
|---------|-----------|-------|
| next@16.3.4 (latest 16.4.3 per npm registry, browser-verified 2026-10-26) + react@19.2.8 | ✅ in `node_modules` | Shipped green through v3.1 (513/513 tests, prod build); one minor behind latest — no upgrade in P2 scope |
| zustand@5.0.15 (latest 5.0.16 per npm registry, browser-verified 2026-10-26) | ✅ in `node_modules` | Selector-function subscription pattern stable; patch delta irrelevant, no middleware needed |
| lightweight-charts@5.2.1 (latest, browser-verified 2026-10-26) | ✅ in `node_modules` | Price-line pairs + HiDPI autosize shipped (v2.1 UAT 6/6); installed == latest |
| date-fns@^4.4.0 + date-fns-tz@3.2.0 (latest, browser-verified 2026-10-26) | ✅ declared | Baku/NY handling proven incl. March + November DST; installed == latest |
| vitest@^5.0.0 | ✅ declared | Harness + parity + boundary suites all run here |

Upstream currency check performed via ego-browser TaskSpace against the live npm registry (2026-10-26, `https://registry.npmjs.org/<pkg>/latest`): zustand latest = 5.0.16 (installed 5.0.15, patch delta only), lightweight-charts latest = 5.2.1 (installed == latest), date-fns-tz latest = 3.2.0 (installed == latest), next latest = 16.4.3 (installed 16.3.4, one minor behind). No upgrades are recommended as part of Pools P2; upgrade proposals belong to a hygiene milestone with their own regression proof.

## Browser-Verified Domain Norms (2026-10-26)

Ego-browser TaskSpace research against live ICT/tooling sources confirmed the P2 design choices already encoded in the codebase. Norm → feature mapping:

- **ERL = full institutional target, IRL = partials.** ERL (external range liquidity beyond the range) is where delivery completes and the remainder of the position is held; IRL (FVGs/order blocks/swings inside the range) are stepped partial-profit levels. Confirms POOL2-01: TP2 = nearest ACTIVE pool on the trade side (the ERL objective), TP1/TP3 keep structure-first legs as partials.
- **Exits set just in front of the pool** so the target does not depend on the level breaking. Confirms the Phase 21 buffer discipline (`TICKET_TP_PULLBACK_ATR_MULT` books before the extreme; the extreme itself is never a target) — W12 wiring carries this into live `selectTicket`.
- **Stacked pools / sweep extensions.** Pools layer (obvious EQH/EQL plus a denser layer beyond); the guidance is to mark both and wait for the displacement candle before entering. Supports POOL2-04 re-accumulation framing (fresh extremes beyond swept zones seed new ACTIVE pools) and cautions TP2 placement against the first-obvious-layer-only shortcut.
- **Untouched vs spent pools.** A level already traded through has largely surrendered its stops; untapped pools are the live candidates (the draw on liquidity). Confirms ACTIVE/SWEPT/CONSUMED lifecycle plus TP2 ACTIVE-only eligibility.
- **Pool ranking: equal/multi-touch outranks single swings; HTF extremes outrank intraday; round-number confluence adds weight.** Confirms the shipped scorer (equality bonus + DOL-side boost) and the P2 sequencing (D1-authoritative §1, 15M as second inventory, joint ranking only after D1 stable).
- **The sweep is the setup, never the entry; killzone timing gates probability.** Confirms pools-never-vote: proximity tag (POOL2-05) stays read-only context, FIRE still requires the three-gate path.
- **MTF pool tooling is an established category.** TradingView ORIGIN MTF Liquidity Pools (1D/1W/1M/3M/1Y, lines extend until swept then stop — the lifecycle idiom), cTrader Liquidity Heatmap (10 timeframes incl. 15min, overlapping zones intensify — density-by-overlap), LuxAlgo's 13 pool implementations incl. a Historical Liquidity Proximity Heatmap (proximity annotation is a known tool feature — supports POOL2-05 as expected, not exotic). Common display pattern: lower-TF levels hidden on higher-TF views — precedent for D1-authoritative display with 15M secondary.
- **Pools are inference, not observation.** Stop orders are invisible on chart; every pool is deduced from structure. Confirms zone (not single-tick) projection and honest-empty states over false precision.

## Sources

- `package.json` + installed `node_modules/{next,zustand,lightweight-charts}/package.json` — versions verified
- `.planning/PROJECT.md` — milestone context, validated capabilities, constraints (zero budget, Zustand-only, `ict/` purity, no LLM)
- `src/lib/ict/pools.ts` — pool math, lifecycle, scorer, D-10/D-18 shape notes
- `src/lib/ticket.ts` — `TicketBufferInput`, buffer constants, `computeTicket` contract
- `src/lib/store.ts` — `selectPools` / `selectTicket` / intraday legs / calibration precedent
- `src/lib/sentiment.ts` + `src/lib/confluence.ts` + `src/lib/report.ts` — multiplier home candidates + display-only precedent
- `src/lib/ict/swings.ts` + `src/lib/ict/types.ts` — shared k=2 contract, `Candle` vs `IntradayCandle` split
- Browser-verified 2026-10-26 via ego-browser TaskSpace (space "pools-p2-feature-research-20261026"):
  - `https://www.ictkillzone.com/ict-liquidity` — ERL/IRL target roles, AMD sequence, stacked-pool sweep extensions, killzone gating, EQH/EQL + PDH/PDL + Asian-high/low pool locations, NQ applicability
  - `https://www.luxalgo.com/library/concept/liquidity-pool/` — pool-as-inference definition, untouched-vs-spent ranking, exits-in-front-of-pool, proximity-heatmap implementations, cross-TF pool ranking (equal/multi-touch > single swing, HTF > intraday)

---
*Stack research for: Pools P2 (POOL2-01 through POOL2-05 + W12)*
*Researched: 2026-10-26*
