# Phase 9: Composition (§3 Live + Overlays + Verify) - Research

**Researched:** 2026-09-07
**Domain:** Next.js 16 terminal composition — Zustand selectors, lightweight-charts v5 overlays, rule-based report §3, Vercel Hobby verify
**Confidence:** HIGH

## Summary

Phase 9 wires finished Modul 3 math (Phase 7 SMT/FVG/4H + Phase 8 Asia/Judas/AMD) into the user-visible surface: live report §3 with three sub-blocks plus a conviction line, Asia high/low price-line pair plus Judas/SMT series markers on the D1 NQ chart, two new intraday Zustand legs (`nq1h`/`nq15m`), a selector-level confluence module, and a per-leg live-URL verify drill. No new detectors, no new math, no NY Judas, no intraday SMT.

The composition surface is fully mapped in-repo: `components/dashboard/report.tsx` renders `REPORT_SECTIONS` with §3 currently `unavailable`; `components/charts/nq-chart.tsx` owns the price-line create/remove lifecycle and a zone-fill primitive with stale `opacityScale`; `src/lib/store.ts` owns dual-leg stagger + per-leg envelopes; `src/lib/ict/smt.ts`, `asia.ts`, `judas.ts`, `amd.ts`, `fvg.ts` expose the exact output shapes and reason strings §3 renders verbatim. No new external packages are needed — `lightweight-charts@5.2.1`, `zustand@5.0.15`, `date-fns-tz@3.2.0` are already installed [VERIFIED: C:\Users\HP\Projects\liquidity-engine\package.json:13-28].

**Primary recommendation:** Extend existing patterns verbatim — price-line pair for Asia, `createSeriesMarkers` for Judas/SMT pins, per-leg Zustand legs + pure selectors, `src/lib/confluence.ts` tier derivation, `data-slot` hooks for the live-URL §3 render check — and verify (don't redesign) `maxDuration = 15` with the live drill.

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### §3 degraded states
- **D-01:** Each §3 sub-block (Liquidity Path, SMT Status, AMD Timing) independently renders live content or its own reason string verbatim — per-block reasons, never a single §3-level banner. Extends the suppressed-envelope + reason-verbatim vocabulary from Phases 7–8.
- **D-02:** All-degraded §3 stacks all three reasons (one per sub-block) — no whole-§3 collapse, no information loss in the worst case (rollover week + weekend + thin history).
- **D-03:** NY session renders as an inline dimmed line inside the AMD Timing sub-block (`NY: Gözlənilir — v2.0-da ölçülmür`), beneath live Asia + London content. Partial-honest inside a live block per Phase 8 D-15.
- **D-04:** Reason prose is one line + tag — single reason line reusing detector strings verbatim (e.g. `SMT Gözlənilir.`) plus regime tags (`SMT razılaşır.`). Matches the AMD `REASON_*` precedent; no multi-sentence institutional paragraphs per sub-block.

#### Asia overlay form
- **D-05:** Asia Range renders as a dashed accent line pair (Asia high / Asia low price-lines, same pattern as existing EQ/Q1/Q3 lines in `nq-chart.tsx`) — no new primitive, no shaded box competing with Premium/Discount zone fills.
- **D-06:** Judas markers use shape + color split via series markers — candidates hollow/outline, confirmed solid filled. Direct canvas translation of the Phase 8 hollow-vs-solid vocabulary; legible at D1 zoom.
- **D-07:** SMT renders as a single pin (arrow/marker) on the D1 bar where the matched swing-pair confirms — minimal, matches the daily-only SMT discipline from Phase 7. Sweeper-leg detail lives in §3 prose, not on the canvas.
- **D-08:** Stale overlays dim but persist (opacity desaturation like the existing zone-fill `opacityScale 0.5` stale precedent) — never hidden on stale. Overlays carry their own leg staleness; chart never falls back to clean D1 silently.

#### Confluence scoring (ICT-15)
- **D-09:** Conviction tiers, not numbers — discrete tiers (e.g. standard / yüksək inam) driven by agreement count: confirmed Judas + aligned SMT = highest tier. Nothing numeric, nothing percentage-like, honoring the no-fake-precision out-of-scope rule.
- **D-10:** Confluence renders as a conviction line inside the §3 header (under the `3. LIQUIDITY SEQUENCING` title) — the score lives where its inputs live, never in the §2-owned report title.
- **D-11:** Suppressed SMT caps confluence at the base tier with the suppression reason visible in the SMT sub-block — absence of signal never masquerades as disagreement, and no separate `qiymətləndirilməyib` state is introduced.
- **D-12:** Only confirmed Judas (solid) counts toward highest conviction; candidates (hollow) render marker + hedge prose with zero score impact. Matches the ≤25% false-positive budget discipline from Phase 8.

#### Intraday plumbing
- **D-13:** New intraday store legs (`nq1h`, `nq15m`) with per-leg envelopes join the Zustand store and the staggered poll — extends the Phase 6 D-01/D-04/D-06 precedent (independent legs, per-leg `lastUpdated`/stale/`lastError`, never merged booleans). No second freshness system.
- **D-14:** Uniform 60s cadence for all legs (daily + 1H + 15M) per Phase 6 D-02 — bounded history windows keep payloads cheap, one rule to verify.
- **D-15:** Intraday legs carry the same stale/`lastError` envelope as daily legs; selectors refuse with stated reasons and §3 renders them verbatim per D-01. No daily-derived fallback approximations — wrong-exact session levels are worse than honest gaps.
- **D-16:** DEPLOY-02 maxDuration posture is verify-don't-redesign — keep the current route shape (`maxDuration = 15`, bounded ranges from the Phase 6 live probe); the live-URL drill proves the intraday payload fits, redesign only on drill failure.

### Claude's Discretion
None — user decided every question directly (no "You decide" selections).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ICT-15 | SMT+Judas confluence boosts confidence — highest-conviction when both confirm, rule-based, no fake precision | Confluence tier pattern (§Architecture Patterns), `amd.ts` SMT agree/suppressed tags, Judas `confirmed` gate |
| UI-05 | Live report §3 (Engineered Liquidity Path, SMT Divergence Status, Session AMD Timing) — every degraded state renders its reason, missing families keep unavailable markers | §3 sub-block pattern, suppressed-envelope + `REASON_*` verbatim rendering, `REPORT_SECTIONS` index-3 flip |
| UI-06 | Asia Range overlay (lightweight-charts v5 primitive, null-autoscale) + Judas/SMT pins via series markers — ES off-chart | Price-line pair + `createSeriesMarkers` patterns, zone-primitive `autoscaleInfo() → null` precedent |
| DEPLOY-02 | v2.0 on Vercel Hobby with per-leg verify — ES cold-start drill, intraday payload under `maxDuration`, §3 render check on live URL | Vercel duration limits, `RANGE_FOR_INTERVAL` bounded windows, `data-slot` render-check hooks |

## Project Constraints (from CLAUDE.md)

- This project uses a MODIFIED Next.js (breaking changes vs training data) — read the relevant guide in `node_modules/next/dist/docs/` before writing any code; heed deprecation notices [CITED: C:\Users\HP\Projects\liquidity-engine\AGENTS.md:1-9].
- `next dev` re-adds the agent-rules block via `node_modules/next/dist/server/lib/generate-agent-files.js` — never remove it from a diff to "clean up"; committing it keeps the tree clean [CITED: AGENTS.md].
- Effective stack contract: Next.js 16 App Router + TypeScript strict + Tailwind v4 + Zustand-only dashboard state + `src/lib/ict` purity (no I/O, no `Date.now` inside — inject time) + rule-based output, no LLM + zero budget (Vercel free/Hobby only) [VERIFIED: C:\Users\HP\Projects\liquidity-engine\.planning\PROJECT.md:54-61].
- shadcn usage restricted to: button, dropdown-menu, dialog, toast, calendar, card [VERIFIED: .planning/PROJECT.md:49].

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| §3 prose + conviction tiers | API/Backend-shaped client selectors (`src/lib` + Zustand selectors) | — | Pure derivation from leg data; no server rendering needed, no browser-only APIs |
| Asia/Judas/SMT derivation inputs | API/Backend (Zustand legs + `src/lib/ict` pure math) | — | Store holds inputs only; math stays pure with injected time |
| Asia lines + Judas/SMT pins | Browser/Client (lightweight-charts canvas) | — | Canvas overlays render from selector outputs; ES never added as a series |
| Intraday fetch + cache | API/Backend (`app/api/yahoo` route) | CDN/Static (`s-maxage=60`) | Server proxy owns Yahoo failover/cache; CDN caches fresh envelopes only |
| Live-URL verify | CDN/Static (deployed Vercel URL) | — | Cold-start, payload, render checks only meaningful against production |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `16.3.4` [VERIFIED: package.json:21] | App Router host, `/api/yahoo` route | Project scaffold; route already exports `maxDuration = 15` [VERIFIED: app/api/yahoo/route.ts:13] |
| `zustand` | `^5.0.15` (installed `5.0.15`) [VERIFIED: package.json:27 + runtime probe] | Dashboard legs + selectors | Existing `useDashboard` owns stagger, envelopes, all ICT selectors — extend, don't replace |
| `lightweight-charts` | `^5.2.1` (installed `5.2.1`) [VERIFIED: package.json:19 + runtime probe] | D1 candles + overlays + markers | Existing chart + zone primitive; v5 `createSeriesMarkers(series, markers)` is the marker API [CITED: https://github.com/tradingview/lightweight-charts/blob/master/website/tutorials/how_to/series-markers.mdx] |
| `date-fns-tz` | `^3.2.0` (installed `3.2.0`) [VERIFIED: package.json:18 + runtime probe] | IANA wall-clock (`formatInTimeZone`) | All session math resolves NY wall-clock per-candle at call time; Baku display at edge |
| `vitest` | `^5.0.0` [VERIFIED: package.json:41] | Unit/fixture tests (`src/**/*.test.ts`) | Existing suite density (smt/asia/judas/amd/join/store/report); 15s timeout for parallel store import [VERIFIED: vitest.config.ts:1-13] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | `^4.4.0` [VERIFIED: package.json:17] | Date arithmetic alongside tz | Session-date helpers, dual-stamp labels |
| `react` / `react-dom` | `19.2.8` [VERIFIED: package.json:22-24] | Terminal shell rendering | Report §3 sub-blocks, `data-slot` hooks |
| `tailwindcss` | `^4` [VERIFIED: package.json:39] | Dimmed/unavailable styling | `opacity-45`, dimmed NY line, stale badge |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Price-line pair (Asia) | Shaded box primitive / second LineSeries pair | Box competes with Premium/Discount fills; LineSeries pair needs manual `autoscaleInfoProvider → null` wiring — price lines already do this and match D-05 |
| Series markers (Judas/SMT) | Custom `ISeriesPrimitive` pins | Custom primitive is more code + more autoscale risk; markers position from bar high/low automatically [CITED: series-markers tutorial] |
| `src/lib/confluence.ts` (new) | Fold tiers into `src/lib/ict/amd.ts` | Scoring is selector-level agreement counting, not session math — keeps `src/lib/ict` purity boundary clean per CONTEXT |
| New freshness system | Extend per-leg envelopes | Second system diverges; per-leg `stale`/`lastError`/`lastUpdatedISO` already proven |

**Installation:**
```bash
# No new packages — all Phase 9 deps already installed.
npm ls lightweight-charts zustand date-fns-tz
```

**Version verification:** `lightweight-charts 5.2.1`, `zustand 5.0.15`, `date-fns-tz 3.2.0` confirmed via `package.json` read + `node -e require(.../package.json).version` probe this session [VERIFIED]; Node runtime `v24.11.1` probed this session [VERIFIED: `node --version`].

## Package Legitimacy Audit

No external packages are installed by this phase — composition reuses the existing stack, and `src/lib/confluence.ts` is new first-party code.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none — no new installs) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*No `checkpoint:human-verify` needed for installs. All marker/overlay APIs below come from Context7 + in-repo code, not new packages.*

## Architecture Patterns

### System Architecture Diagram

```
Yahoo chart API ──▶ app/api/yahoo?symbol=&interval= ──▶ per-leg envelopes (daily NQ/ES + nq1h/nq15m)
(query1→query2 failover, 60s TTL, serve-stale)          (candles + lastUpdatedISO + stale + lastError, never merged)
        │
        ▼
Zustand useDashboard ── :00/:30 stagger + jitter ──▶ selectors (selectSMT / selectAsia / selectJudas / selectAMD / selectConfluence)
        │                                              (refuse with stated reason on stale leg; closedOnly* at boundary)
        ├─▶ Report §3 ── three sub-blocks + conviction line ──▶ per-block reason verbatim / stacked when all-degraded
        └─▶ NqChart D1 ── Asia H/L price lines + Judas/SMT series markers ──▶ stale dims (opacity), never hides; ES off-chart
        │
        ▼
Vercel Hobby live URL ── per-leg drill (ES cold-start, intraday payload < maxDuration, §3 data-slot render check)
```

### Recommended Project Structure
```
src/
├── lib/                 # Selector-level: confluence.ts (NEW — tier derivation, not ict math)
├── lib/ict/             # Pure math only — UNTOUCHED this phase (smt/asia/judas/amd/fvg/aggregate)
├── lib/store.ts         # EXTEND — nq1h/nq15m legs + staggered timers + selectSMT/selectAsia/selectJudas/selectAMD/selectConfluence
├── lib/report.ts        # EXTEND — §3 index 3 unavailable→live + conviction-tier copy
├── lib/chart-mapper.ts  # EXTEND — Asia line inputs (same pass-through shape as priceLineInputs/levelLineInputs)
components/
├── dashboard/report.tsx # EXTEND — live §3 block: 3 sub-blocks + conviction line + data-slot hooks
├── charts/nq-chart.tsx  # EXTEND — props + Asia line pair + markers + stale-dim
└── charts/zone-primitive.ts # PRECEDENT — autoscaleInfo() → null template (overlays must not rescale)
app/api/yahoo/route.ts   # VERIFY ONLY — maxDuration = 15 unchanged unless drill fails
```

### Pattern 1: Per-block verbatim reasons (UI-05)
**What:** Each §3 sub-block independently renders live prose or its detector reason string verbatim; all-degraded stacks all three. NY renders as an inline dimmed line inside AMD Timing.
**When to use:** Every §3 state — never a section-level banner, never whole-§3 collapse.
**Example:**
```typescript
// Source: in-repo precedent — src/lib/ict/amd.ts:48-58 (Read this session)
const REASON_ACCUMULATION = 'Asia Range Təmizlənməyib. London Judas Swing Gözlənilir.';
const REASON_EMPTY_RANGE =
  'Asia Range Təmizlənməyib — aralıq tapılmadı. London Judas Swing Gözlənilir.';
const REASON_CANDIDATE =
  'Asia Range Təmizlənib. London Judas Swing Gözlənilir — təsdiq gözlənilir.';
const REASON_CONFIRMED = 'Asia Range Təmizlənib. London Judas Swing Baş verib.';
const REASON_DISTRIBUTION =
  'Asia Range Təmizlənib. London Judas Swing Baş verib — davam mərhələsi.';
const REASON_NY_UNAVAILABLE = 'Gözlənilir — NY sessiyası v2.0-da ölçülmür.';
const SMT_AGREE_TAG = 'SMT razılaşır.';
const SMT_SUPPRESSED_TAG = 'SMT Gözlənilir.';
// SMT envelopes: { suppressed: true, reason: 'CORR_DECOUPLED' | 'rollover-week' } [VERIFIED: src/lib/ict/smt.ts:39-43]
```
SMT sub-block renders `evaluateSMT`/`detectSMT` output or the suppression reason; Liquidity Path renders FVG `describeDeliveryTransition` prose; AMD Timing renders `amdPhase(...).reason` + SMT tag suffix + dimmed NY line per D-03.

### Pattern 2: Asia price-line pair, null-autoscale (UI-06, D-05)
**What:** Asia high/low as two dashed accent price-lines reusing the EQ/Q1/Q3 create/remove lifecycle; price lines never affect autoscale.
**When to use:** Always for Asia — no shaded box, no LineSeries.
**Example:**
```typescript
// Source: in-repo lifecycle — components/charts/nq-chart.tsx:87-140,206-270 (Read this session)
typed.createPriceLine({ price: inputs.eq, color: accent, lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'EQ' });
// Asia follows verbatim: titles 'Asia-H' / 'Asia-L', LineStyle.Dashed, accent color;
// remove old lines before re-creating on input change; guard-throw renders no lines, never blocks chart.
```
Stale dims overlays but persists per D-08 — mirror `zoneRef.current.opacityScale = status === 'stale' ? 0.5 : 1` [VERIFIED: nq-chart.tsx:163,272-275]. Custom primitives that must not rescale return `autoscaleInfo(): null` [VERIFIED: zone-primitive.ts:121-124] — price lines already behave this way, which is why D-05 picks them.

### Pattern 3: Judas/SMT pins via series markers (UI-06, D-06/D-07)
**What:** `createSeriesMarkers` on the D1 candle series. Judas: shape+color split (candidate hollow/outline vs confirmed solid). SMT: single pin on the confirming D1 bar (sweeper-leg detail stays in prose).
**When to use:** Judas + SMT only; ES stays off-chart; marker `time` must equal a D1 candle `date` string.
**Example:**
```javascript
// Source: Context7 /tradingview/lightweight-charts — series-markers tutorial
import { createSeriesMarkers } from 'lightweight-charts';
createSeriesMarkers(series, [
  { time: '2026-09-05', position: 'aboveBar', color: '#f68410', shape: 'circle', text: 'J' },
]);
// v5 shapes include arrowUp/arrowDown/circle/square; positions aboveBar/belowBar/inBar [CITED: series-markers tutorial].
// Hollow-vs-solid: markers carry a single `color` — implement hollow candidates via
// outline-contrast color choice + `text` hedge (e.g. 'J?'), solid confirmed via filled accent + 'J' [ASSUMED —
// marker border-fill split is not in the fetched docs; planner confirms exact color/text mapping].
```
Marker vertical position derives from the bar high/low + `position` automatically — no price value needed [CITED: series-markers tutorial]. Refresh markers on data/selector change; empty array clears.

### Pattern 4: Intraday legs + selector boundary (D-13/D-15)
**What:** `nq1h`/`nq15m` as full `LegState` legs (`candles` as `IntradayCandle[]` epoch contract, `lastUpdatedISO`, `stale`, `lastError`) with independent refreshers on the uniform 60s grid; selectors (`selectAsia` ← 1H, `selectJudas` ← 15M + Asia, `selectAMD` ← asia+judas+read-only SMT, `selectSMT` ← daily joined legs, `selectConfluence` ← confirmed-Judas + unsuppressed-aligned-SMT) refuse with stated reasons on stale legs.
**When to use:** All session derivation — never daily-derived fallback approximations.
**Example:**
```typescript
// Source: in-repo leg shape — src/lib/store.ts:68-75 (Read this session)
export interface LegState {
  candles: Candle[]; contractHint: string; lastUpdatedISO: string | null;
  stale: boolean; source: string; lastError: string | null;
}
// Intraday legs reuse this shape with IntradayCandle rows + epoch contract (Phase 6 D-16).
// Stagger offsets live in Zustand state (`lastSchedule`), never module cells [VERIFIED: store.ts:107-108,372].
// Intraday envelope guard precedent: symbol match, min rows, finite OHLC, ascending epoch [VERIFIED: yahoo.ts:338-351].
```
Detector input contracts: `asiaRange(rows, sessionDate)` 20:00–00:00 NY, wick-to-wick, gaps skipped [VERIFIED: asia.ts:14-16,90-140]; `judasSwing(rows, range)` killzone `120/300` strict, `DISP_MULT = 0.5`, `CONFIRM_WINDOW = 4` [VERIFIED: judas.ts:17-25]; `amdPhase({asia, judas, smt, asOf})` → `{ phase, reason, inputs }` [VERIFIED: amd.ts:38-46]; `evaluateSMT(nq, es, asOf)` gate order correlation → rollover → matching [VERIFIED: smt.ts:196-262].

### Pattern 5: Rule-based conviction tiers (ICT-15, D-09–D-12)
**What:** `src/lib/confluence.ts` derives discrete tiers (e.g. standard / `yüksək inam`) from agreement count: confirmed Judas + aligned unsuppressed SMT = highest tier; suppressed SMT caps at base; candidates score zero. Rendered as a conviction line under the §3 title.
**When to use:** Always rule-based — nothing numeric, nothing percentage-like.
**Example:**
```typescript
// Agreement read (Read this session — amd.ts:95-111 smtTag precedent):
// HIGH sweep + BEARISH SMT → 'SMT razılaşır.'; LOW sweep + BULLISH SMT → agree;
// suppressed SMT → 'SMT Gözlənilir.' (cap at base per D-11); candidate (confirmed:false) → zero impact per D-12.
// JudasOutput: { candidate, confirmed, preRun, sweepSide, sweepTime, displacementMult } [VERIFIED: judas.ts:29-36]
```

### Anti-Patterns to Avoid
- **Whole-§3 banner/collapse:** loses information in the worst case — stack three per-block reasons instead (D-02).
- **Shaded Asia box or ES on-chart:** competes with Premium/Discount fills; ES stays off-chart per locked scope.
- **Numeric confidence %:** out-of-scope fake precision — discrete tiers only (D-09).
- **Candidate Judas scoring:** hollow candidates render marker + hedge prose with zero score impact (D-12, ≤25% budget discipline).
- **Merged `stale` boolean / second freshness system:** per-leg envelopes only; chart never falls back to clean D1 silently (D-08/D-15).
- **Daily-derived session fallback:** wrong-exact Asia levels worse than honest gaps — refuse with reason (D-15).
- **New math in `src/lib/ict`:** Phase 9 adds selectors + prose only; purity grep (`Date.now` in `src/lib/ict`) must stay clean.
- **Module-level stagger cells:** offsets in Zustand `lastSchedule` state (Phase 6 precedent).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart pins | Custom canvas overlay | `createSeriesMarkers` (v5) | Time→bar anchoring, auto vertical placement, trivial clear-on-update [CITED: series-markers tutorial] |
| Non-rescaling overlay | Manual scale hacks | Price lines / primitive with `autoscaleInfo() → null` | Candles must own autoscale; zone primitive proves the pattern [VERIFIED: zone-primitive.ts:121-124] |
| NY wall-clock | Fixed UTC offsets | `formatInTimeZone(ts, 'America/New_York', …)` per candle | DST-safe by construction (March/November/break triple-test precedent) |
| Session date math | `Date` construction | Civil-date arithmetic (`daysFromCivil`/`prevCalendarDay` in `aggregate.ts`) | Exact across DST-short/long days [VERIFIED: aggregate.ts:52-82] |
| Correlation / ATR / regime | Custom stats | In-repo `pearsonCorr`, `computeATR`/`computeRegime` | `CORR_WINDOW=20`, `CORR_MIN=0.7` pinned by test [VERIFIED: smt.ts:10-12] |
| Fetch resilience | Custom retry | Existing `yahoo.ts` spine (failover, jittered backoff, singleflight, validate-then-cache, serve-stale) | Budget math already fits `maxDuration`: 4 attempts × 4s timeouts + ~3.5s backoff [VERIFIED: yahoo.ts:285-290] |
| Conviction % | Custom scoring model | Tier derivation from confirmed-Judas + unsuppressed-aligned-SMT | No-fake-precision rule; absence never masquerades as disagreement (D-11) |

**Key insight:** Every hard problem in this phase already has a proven in-repo answer — price-line lifecycle, stale-dim, suppressed envelopes, stagger-in-state, epoch-vs-string contracts. Phase 9's risk is deviation from precedent, not missing machinery.

## Common Pitfalls

### Pitfall 1: Marker `time` doesn't match a D1 bar date
**What goes wrong:** Judas/SMT pins vanish or snap to the wrong bar.
**Why it happens:** SMT windows are date strings (`windowStart/windowEnd`), Judas `sweepTime` is an epoch; markers need the D1 `date` string of the confirming bar.
**How to avoid:** Map sweep/confirm instants → containing D1 `date` (Baku/NY date discipline per contract) and pin exactly; fixture-test a known sweep date.
**Warning signs:** Markers render on mount but disappear after `setData` refresh.

### Pitfall 2: Price-line leak on re-render
**What goes wrong:** Duplicate Asia-H/Asia-L lines stack on every poll.
**Why it happens:** Creating lines without removing old refs first.
**How to avoid:** Reuse the EQ/DOL/Q1/Q3 remove-then-create cycle verbatim (`removePriceLine` on all line refs, null them, then create) [VERIFIED: nq-chart.tsx:206-215].
**Warning signs:** Line titles render with doubled labels at D1 zoom.

### Pitfall 3: Overlay rescales the price axis
**What goes wrong:** Asia lines or pins squash candles.
**Why it happens:** Using a LineSeries overlay without disabling autoscale.
**How to avoid:** Use price lines (no autoscale effect) per D-05; any custom primitive returns `autoscaleInfo(): null` [VERIFIED: zone-primitive.ts:121-124].
**Warning signs:** Price range jumps when Asia session closes.

### Pitfall 4: Hollow-vs-solid lost at D1 zoom
**What goes wrong:** Candidates and confirmed look identical on canvas.
**Why it happens:** Single-`color` markers + small sizes blur together.
**How to avoid:** Split shape + color + text (`J?` hollow-contrast vs `J` solid accent); keep sweeper detail in prose; human UAT glance at D1 zoom [ASSUMED — exact palette pending planner choice].
**Warning signs:** UAT can't tell candidate from confirmed without reading prose.

### Pitfall 5: Stale overlays hidden instead of dimmed
**What goes wrong:** Chart silently shows clean D1 on stale legs.
**Why it happens:** Conditional `return null` on stale.
**How to avoid:** Dim-but-persist (`opacityScale 0.5` for fills; desaturated marker colors + stale badge), overlays carry own leg staleness (D-08).
**Warning signs:** `data-overlay` shows stale but canvas looks live.

### Pitfall 6: Intraday payload blows `maxDuration`
**What goes wrong:** Live drill fails on 15M legs.
**Why it happens:** Unbounded ranges on looped fetches.
**How to avoid:** Keep `RANGE_FOR_INTERVAL` (`1d: 182d`, `1h: 3mo`, `15m: 1mo`) [VERIFIED: yahoo.ts:59-63] + probe-pinned densities (ES 1H 1800 rows, 15M 2419 rows per STATE.md); verify-don't-redesign per D-16, redesign only on drill failure.
**Warning signs:** Route latency approaches 15s on cold start.

### Pitfall 7: Confluence rewards absence
**What goes wrong:** Suppressed SMT reads as disagreement or, worse, as agreement.
**Why it happens:** Treating `suppressed:true` as a direction.
**How to avoid:** D-11 — suppressed caps at base tier, reason visible in SMT sub-block; no separate state; fixture-test CORR_DECOUPLED + rollover-week caps.
**Warning signs:** Highest tier renders while SMT sub-block shows a suppression reason.

## Code Examples

### Asia line inputs (pass-through mapper)
```typescript
// Source: in-repo shape — src/lib/chart-mapper.ts:36-41,52-70 (Read this session)
// Asia mapper follows priceLineInputs/levelLineInputs verbatim: finite-guard, throw on bad input,
// caller renders no lines on throw and never blocks the chart.
export function priceLineInputs(eq: number, dolPrice: number) { /* finite-guard, passthrough */ }
```

### Series markers update cycle
```javascript
// Source: Context7 /tradingview/lightweight-charts — series-markers tutorial + primitive.ts recalculation pattern
import { createSeriesMarkers } from 'lightweight-charts';
const markersPlugin = createSeriesMarkers(series, judasAndSmtMarkers);
// On data/selector change: markersPlugin.setMarkers(nextMarkers); setMarkers([]) clears.
// Marker time MUST equal a series bar time (D1 `date` string here); position aboveBar/belowBar/inBar
// derives vertical placement from bar high/low — no price needed except atPrice* positions.
```

### Selector + §3 render skeleton
```typescript
// Source: in-repo selector precedent — src/lib/store.ts:401-459 (Read this session)
// New: selectSMT (joined daily legs + coverage + envelopes) → SmtOutput;
// selectAsia (nq1h) → AsiaRange | null; selectJudas (nq15m + asia) → JudasOutput;
// selectAMD ({asia, judas, smt, asOf}) → AmdOutput; selectConfluence (judas.confirmed + unsuppressed SMT) → tier.
// §3 flips REPORT_SECTIONS index 3: { index: 3, title: '3. LIQUIDITY SEQUENCING…', state: 'unavailable' }
// → 'live' [VERIFIED: src/lib/report.ts:17-24]; conviction-tier copy lives beside REGIME_BADGE.
```

### Live-URL drill hooks
```tsx
// Source: in-repo data-slot precedent — report.tsx + nq-chart.tsx (Read this session)
// §3 sub-blocks: data-slot="s3-liquidity-path" / "s3-smt-status" / "s3-amd-timing" + data-slot="s3-conviction";
// chart: data-slot="chart-block" data-overlay={status} already exists [VERIFIED: nq-chart.tsx:281].
// Drill: ES cold-start (clear cache → first ES leg), intraday payload timing < 15s, §3 slots present on live URL.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `series.setMarkers/markers` API (v4) | `createSeriesMarkers(series, markers)` plugin API (v5) | lightweight-charts v5 | Import from `lightweight-charts`; old call sites break — use the plugin form [CITED: v5 series-markers tutorial] |
| Whole-section UNAVAILABLE chip | Per-block reasons + stacked degrade + inline NY dimmed line | Phases 7–9 vocabulary | §3 stays informative in rollover-week + weekend + thin-history worst case |
| Merged `stale` boolean | Per-leg envelopes + per-leg strip ages | Phase 6 D-01/D-04/D-06 | SMT refuses with stated reason; overlays dim per-leg |
| Vercel Hobby 10s/60s function cap (stale memory) | Fluid compute: Hobby default + max 300s (5 min) | 2026 docs | `maxDuration = 15` is valid on Hobby with wide headroom — verify, don't redesign [CITED: https://vercel.com/docs/functions/configuring-functions/duration] |

**Deprecated/outdated:**
- ICT-12 text "19:00" — superseded by Phase 8 D-01 Asia 20:00–00:00 NY (conforming roadmap edit at planning).
- `series.setMarkers` (v4 form) — replaced by `createSeriesMarkers` in v5; grep must not reintroduce it [ASSUMED — verify at plan-check via repo grep].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Hollow candidates achievable via outline-contrast color + text split (no marker border-fill API) | Architecture Patterns P3 | Medium — UAT legibility fails; fallback is shape+text split only |
| A2 | Exact conviction tier names (e.g. standard / `yüksək inam`) left to planner | Patterns P5 | Low — copy choice, Azerbaijani prose precedent guides |
| A3 | Asia line titles (`Asia-H`/`Asia-L`) fit title vocabulary | Specific Ideas | Low — cosmetic, planner fits |
| A4 | Intraday payload fits `maxDuration = 15` on live URL (bounded ranges hold) | Pitfalls P6 | Medium — drill failure triggers redesign per D-16 reversibility |
| A5 | No `series.setMarkers` remnants; v5 plugin API is the only marker path | State of the Art | Low — plan-check grep confirms |

## Open Questions (RESOLVED at plan time — dispositions recorded 2026-09-07)

1. **Conviction tier names + header copy — RESOLVED:** Planner picked discrete tiers `standart` (base) / `yüksək inam` (highest, confirmed Judas + aligned unsuppressed SMT only) per 09-01-PLAN.md Task 1 (`src/lib/confluence.ts` `ConvictionTier`); conviction line under the §3 title per 09-02-PLAN.md. No numeric scores (D-09).
2. **Judas/SMT marker shape-color-text mapping — RESOLVED:** 09-02-PLAN.md pins the mapping — solid `J` (confirmed), hollow `J?` (candidate, zero score impact), single `S` pin on the confirming D1 bar via `createSeriesMarkers`; aboveBar/belowBar encodes sweep side.
3. **§3 render-check mechanics on live URL — RESOLVED:** 09-03-PLAN.md defines scripted drill `scripts/verify-phase9-drill.sh` (ES cold-start, intraday payload under `maxDuration = 15`, §3 four-slot + overlay-slot render check) with a blocking human checkpoint supplying `LIVE_URL`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test/dev | ✓ | `v24.11.1` [VERIFIED: probe] | — |
| Yahoo Finance chart API | All legs (daily + intraday) | ✓ (via proxy failover) | — | Serve-stale + 502 + `Retry-After: 60` [VERIFIED: route.ts:36-53] |
| Vercel Hobby deploy | DEPLOY-02 verify | ✓ [ASSUMED — prior v1.0 live URL] | — | Local `next build` + drill against preview URL |
| Function `maxDuration = 15` | Intraday payload | ✓ valid | Hobby max 300s [CITED: duration docs] | Redesign only on drill failure (D-16) |
| Browser canvas (lightweight-charts) | Overlays/markers | ✓ (client component, dynamic import) | v5.2.1 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Yahoo upstream outage → serve-stale envelope / honest 502 (existing spine).

Step 2.6 intraday note: `nq1h`/`nq15m` need no new OS tooling — they ride the existing `fetchIntraday` + `RANGE_FOR_INTERVAL` bounded windows [VERIFIED: yahoo.ts:59-63].

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^5.0.0 [VERIFIED: package.json:41] |
| Config file | `vitest.config.ts` (node env, `src/**/*.test.ts` + `app/**/*.test.ts`, 15s timeout) [VERIFIED: vitest.config.ts:1-13] |
| Quick run command | `npx vitest run src/lib/confluence.test.ts src/lib/store.test.ts` |
| Full suite command | `npm test` (`vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ICT-15 | Confirmed Judas + aligned SMT → highest tier; suppressed SMT caps at base; candidate scores zero | unit | `npx vitest run src/lib/confluence.test.ts` | ❌ Wave 0 (new `confluence.ts` + test) |
| UI-05 | Per-block reasons render verbatim; all-degraded stacks three; NY dimmed line inside AMD block | unit (selector/prose) + manual UAT glance | `npx vitest run src/lib/store.test.ts src/lib/report.test.ts` | ❌ Wave 0 (selector fixtures; report test exists [VERIFIED: glob]) |
| UI-06 | Asia H/L lines created/removed; Judas/SMT markers pinned to D1 dates; stale dims, never hides; ES off-chart | unit (mapper) + manual canvas glance | `npx vitest run src/lib/chart-mapper.test.ts` | ❌ Wave 0 (Asia-input mapper test; chart-mapper test exists) |
| DEPLOY-02 | ES cold-start drill; intraday payload under maxDuration; §3 slots on live URL | manual-only (live URL) | `curl -s -o /dev/null -w '%{time_total}' "$LIVE/api/yahoo?symbol=ES=F&interval=15m"` + slot check | ❌ Wave 0 (drill script/steps) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/confluence.test.ts src/lib/store.test.ts src/lib/chart-mapper.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/confluence.test.ts` — covers ICT-15 (highest-tier, suppression cap, candidate-zero-impact)
- [ ] Selector fixtures — per-block degraded, all-degraded, suppressed-SMT, stale-leg refusal (UI-05/D-01/D-15)
- [ ] Asia-input mapper test — finite-guard + throw-never-blocks-chart (UI-06)
- [ ] Drill steps — ES cold-start + intraday payload timing + §3 `data-slot` render check (DEPLOY-02)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth surface (read-only terminal, out of scope per REQUIREMENTS.md) |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | No privileged endpoints |
| V5 Input Validation | Yes | Strict allowlists `SYMBOL_ALLOWLIST = ['NQ=F','ES=F']`, `INTERVAL_ALLOWLIST = ['1d','1h','15m']` + 400 before URL build [VERIFIED: yahoo.ts:45-49; route.ts:29-34]; per-leg shape guards (`isValidPayload`/`isValidIntradayPayload`, `isValidEnvelope`, coverage guard) |
| V6 Cryptography | No | No crypto handling; no secrets |
| V14 Configuration | Yes | `force-dynamic`, `Cache-Control` fresh vs `no-store`-when-stale [VERIFIED: route.ts:12,42-44]; never cache errors; SSRF-adjacent block via allowlist-first |

### Known Threat Patterns for Next.js proxy + canvas stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF via `?symbol=` / upstream URL injection | Tampering | Allowlist-before-URL-build; unknown → 400, never forwarded [VERIFIED: route.ts:29-34] |
| Cache poisoning (one leg's error served as fresh) | Tampering | Validate-then-cache per leg, never cache errors; composite `symbol:interval:range` keys [VERIFIED: yahoo.ts:65-68 + Phase 6 context] |
| Stale-data masquerading as live | Information disclosure (integrity) | Per-leg `stale` + `lastError` + strip ages; selectors refuse with reasons; overlays dim, never hide |
| Upstream throttle cascade (dual-symbol 429 storm) | Denial of service | query1→query2 failover, jittered backoff, per-key singleflight, :00/:30 stagger + jitter, 4s fetch timeout budget [VERIFIED: yahoo.ts:285-290] |

## Sources

### Primary (HIGH confidence)
- In-repo reads this session: `src/lib/ict/smt.ts` (constants, envelopes, gate order), `src/lib/ict/amd.ts` (REASON_*/tags, gates), `src/lib/ict/asia.ts` (window, wick-to-wick), `src/lib/ict/judas.ts` (killzone, displacement, window), `src/lib/ict/fvg.ts` (sweep-then-reject, prose), `src/lib/ict/aggregate.ts` (NY_TZ, civil-date math), `src/lib/ict/types.ts` (Candle/IntradayCandle contracts), `src/lib/store.ts` (legs, stagger, selectors), `src/lib/yahoo.ts` (allowlists, ranges, guards, retry budget), `src/lib/report.ts` (§3 unavailable), `src/lib/chart-mapper.ts` (pass-through mappers), `components/charts/nq-chart.tsx` (price-line lifecycle, stale-dim, data-slots), `components/charts/zone-primitive.ts` (`autoscaleInfo → null`), `app/api/yahoo/route.ts` (`maxDuration = 15`, cache headers), `package.json` + runtime version probes, `vitest.config.ts`, `.planning` CONTEXT/REQUIREMENTS/ROADMAP/PROJECT/STATE
- Context7 `/tradingview/lightweight-charts` — `createSeriesMarkers` tutorial + marker position/shape docs + primitive recalculation pattern

### Secondary (MEDIUM confidence)
- Vercel docs `functions/configuring-functions/duration` (Hobby max 300s, `maxDuration = 15` valid) + `functions/runtimes` (archiving/cold-start) — [CITED: https://vercel.com/docs/functions/configuring-functions/duration]

### Tertiary (LOW confidence)
- WebSearch-only marker border-fill/hollow emulation and `series.setMarkers` deprecation shape — marked [ASSUMED], planner confirms via grep + UAT

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions probed from installed `package.json` + runtime; marker/deploy claims backed by Context7 + Vercel docs
- Architecture: HIGH — every integration point read in-repo this session; locked D-01–D-16 decisions map 1:1 to extension points
- Pitfalls: HIGH — each pitfall names the in-repo guard or doc it extends; hollow-emulation + tier names honestly flagged [ASSUMED]

**Research date:** 2026-09-07
**Valid until:** 2026-10-07 (stable domain; lightweight-charts v5 + Vercel limits change slowly; re-probe Yahoo densities if drill fails)
