# Phase 09: Composition (§3 Live + Overlays + Verify) - Pattern Map

**Mapped:** 2026-09-07
**Files analyzed:** 8 (5 extend, 1 new, 1 verify-only, test additions)
**Analogs found:** 7 / 7 (confluence.ts is new code with in-repo logic precedent)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `components/dashboard/report.tsx` (extend §3) | component | request-response (selector → render) | self (`components/dashboard/report.tsx`) | exact |
| `src/lib/report.ts` (extend §3 flip + tier copy) | config | transform (constants) | self (`src/lib/report.ts`) | exact |
| `components/charts/nq-chart.tsx` (Asia lines + markers + stale-dim) | component | streaming (canvas/poll-driven) | self (`components/charts/nq-chart.tsx`) | exact |
| `src/lib/chart-mapper.ts` (Asia line inputs) | utility | transform | self (`src/lib/chart-mapper.ts`) | exact |
| `src/lib/store.ts` (nq1h/nq15m legs + 5 selectors) | store | event-driven (poll + derive) | self (`src/lib/store.ts`) | exact |
| `src/lib/confluence.ts` (NEW tier derivation) | service (selector-level) | transform | `src/lib/ict/amd.ts` (smtTag gate) | role-match |
| `app/api/yahoo/route.ts` (verify only) | route | request-response | self (`app/api/yahoo/route.ts`) | exact |
| `src/lib/*.test.ts` additions | test | batch | existing `src/lib/store.test.ts` / `chart-mapper.test.ts` / `report.test.ts` pattern | role-match |

## Pattern Assignments

### `components/dashboard/report.tsx` (component, request-response)

**Analog:** `components/dashboard/report.tsx` (self-extend, git-tracked)

**Selector subscription pattern** (lines 35-45):
```tsx
const selectPosition = useDashboard((s) => s.selectPosition);
const selectBias = useDashboard((s) => s.selectBias);
const position = selectPosition();
const biasOutput = selectBias();
```
New §3 sub-blocks follow verbatim: `const selectSMT = useDashboard((s) => s.selectSMT)` etc., called during render. No direct store reads.

**Unavailable-block pattern** (lines 72-87) — template for per-block degrade (D-01/D-02):
```tsx
<section key={section.index} data-slot="report-section" className="pointer-events-none relative opacity-45">
  <span className="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-[0.1em]">UNAVAILABLE</span>
  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em]">{section.title}</h3>
</section>
```
§3 keeps the live `<section>` shell; each sub-block swaps live prose for its own reason string + `Məlumat yoxdur` null fallback (lines 100-101: `<p className="text-base font-semibold">Məlumat yoxdur</p>`).

**data-slot hooks:** root `data-slot="report"` (line 64), per-section `data-slot="report-section"`. New: `data-slot="s3-liquidity-path" / "s3-smt-status" / "s3-amd-timing" / "s3-conviction"`.

---

### `src/lib/report.ts` (config, transform)

**Analog:** `src/lib/report.ts` (self-extend, git-tracked)

**Section flip pattern** (lines 17-24):
```typescript
export const REPORT_SECTIONS: ReportSection[] = [
  { index: 3, title: '3. LIQUIDITY SEQUENCING & CROSS-MARKET SMT (1H/15M)', state: 'unavailable' },
];
```
Flip index 3 `'unavailable'` → `'live'`. Nothing else changes.

**Badge-copy pattern** (lines 26-32):
```typescript
export const REGIME_BADGE: Record<RegimeState, string> = {
  expansion: 'Genişlənmə',
  compression: 'Sıxılma',
};
export const PRE_NEWS_BADGE = 'Yüksək təsirli xəbər gözlənilir';
```
Conviction-tier copy lives beside these as a const record (e.g. `CONVICTION_COPY`), Azerbaijani values, discrete tiers only — never numbers. Locked `UNAVAILABLE` chip untouched.

---

### `components/charts/nq-chart.tsx` (component, streaming canvas)

**Analog:** `components/charts/nq-chart.tsx` (self-extend, git-tracked)

**Price-line create pattern** (lines 86-100):
```typescript
const inputs = priceLineInputs(props.eq, props.dolPrice);
eqLineRef.current = typed.createPriceLine({
  price: inputs.eq, color: accent, lineWidth: 1,
  lineStyle: LineStyle.Dashed, title: 'EQ',
});
```
Asia pair follows verbatim: titles `'Asia-H'` / `'Asia-L'`, `LineStyle.Dashed`, accent color, own refs (`asiaHighLineRef`, `asiaLowLineRef`).

**Remove-then-create cycle** (lines 206-215) — mandatory anti-leak precedent:
```typescript
if (eqLineRef.current !== null) live.removePriceLine(eqLineRef.current);
if (dolLineRef.current !== null) live.removePriceLine(dolLineRef.current);
// ... null all refs, then re-create
```
Add Asia refs to both the remove block and the cleanup block (lines 182-187). Guard-throw renders no lines, never blocks chart (lines 103-140 try/catch → null refs).

**Stale-dim precedent** (lines 163, 272-275):
```typescript
zoneRef.current.opacityScale = props.status === 'stale' ? 0.5 : 1;
zoneRef.current.updateBands();
```
Overlays dim-but-persist per D-08: marker colors desaturate on stale + existing `data-slot="stale-badge"` (lines 294-298); never conditional-return-null the overlays. Chart shell already carries `data-slot="chart-block" data-overlay={status}` (line 281).

**Marker integration (no in-repo precedent — v5 plugin API per RESEARCH):**
```typescript
import { createSeriesMarkers } from 'lightweight-charts';
const markers = createSeriesMarkers(series, judasAndSmtMarkers);
// update: markers.setMarkers(next); markers.setMarkers([]) clears.
```
Marker `time` MUST equal a D1 candle `date` string; map Judas `sweepTime` epoch → containing D1 date, SMT `windowEnd` pins directly. Lazy-import inside the update effect like `LineStyle` (line 200) to keep module top DOM-free.

---

### `src/lib/chart-mapper.ts` (utility, transform)

**Analog:** `src/lib/chart-mapper.ts` (self-extend, git-tracked)

**Pass-through mapper pattern** (lines 36-41):
```typescript
export function priceLineInputs(eq: number, dolPrice: number): PriceLineInputs {
  if (!isFiniteNumber(eq) || !isFiniteNumber(dolPrice)) {
    throw new Error('priceLineInputs requires finite eq and dolPrice');
  }
  return { eq, dol: dolPrice };
}
```
New `asiaLineInputs(high: number, low: number)` copies this shape verbatim: `isFiniteNumber` guard, throw on bad input, caller (nq-chart) renders no lines on throw. Level-mapper collapse precedent at lines 52-70 (`levelLineInputs`).

---

### `src/lib/store.ts` (store, event-driven poll + derive)

**Analog:** `src/lib/store.ts` (self-extend, git-tracked)

**Leg shape** (lines 68-75) — intraday legs reuse `LegState` with `IntradayCandle` rows:
```typescript
export interface LegState {
  candles: Candle[]; contractHint: string;
  lastUpdatedISO: string | null; stale: boolean;
  source: string; lastError: string | null;
}
```
`nq1h`/`nq15m: LegState` added beside `nq`/`es` (lines 100-101); empty via `emptyLeg()` (lines 77-86).

**Envelope guard** (lines 51-64): `isValidEnvelope` — finite OHLC, non-empty contractHint, parseable ISO, boolean stale, ascending dates. Intraday legs get the same boundary validation (epoch-ascending variant); malformed leg rejected without touching healthy legs.

**Per-leg refresher** (lines 321-341 `refreshES` is the copy template):
```typescript
if (get().inFlightES) return;
set({ inFlightES: true });
try {
  const json = await fetchLegEnvelope('/api/yahoo?symbol=ES=F&interval=1d');
  set({ es: legFromEnvelope(json), inFlightES: false, coverage: computeCoverage(...) });
} catch (err) {
  const message = err instanceof Error ? err.message : 'refresh failed';
  set({ es: { ...get().es, stale: true, lastError: message }, inFlightES: false });
}
```
New `refreshNQ1H` (`/api/yahoo?symbol=NQ=F&interval=1h`) + `refreshNQ15M` (`...&interval=15m`) copy this; uniform 60s cadence (D-14); independent failure marks only its own leg stale.

**Stagger-in-state** (lines 343-387): offsets computed from wall clock, stored in `lastSchedule`, NQ at :00 / ES at :30 + 5–10s jitter. Intraday legs join the same grid (offsets in state, never module cells).

**Selector precedent** (lines 401-459): pure derivation, null on insufficient/closed data:
```typescript
selectRange: () => {
  const { candles, asOfBaku } = get();
  if (closedCount(candles) < 1) return null;
  return computeRange(candles, asOfBaku, ANCHOR_WINDOW);
},
```
New `selectAsia` (nq1h) → `AsiaRange | null`; `selectJudas` (nq15m + asia) → `JudasOutput`; `selectAMD` ({asia, judas, smt, asOf}) → `AmdOutput`; `selectSMT` (joined daily legs + coverage) → `SmtOutput`; `selectConfluence` → tier. Refuse-with-reason on stale legs per D-15 (return null + `lastError` carries the reason §3 renders verbatim).

---

### `src/lib/confluence.ts` NEW (service/selector-level, transform)

**Analog:** `src/lib/ict/amd.ts` `smtTag` gate (lines 95-111), git-tracked

```typescript
function smtTag(judas, smt): string {
  if (smt.suppressed) return ` ${SMT_SUPPRESSED_TAG}`;   // 'SMT Gözlənilir.'
  if (judas?.confirmed && judas.sweepSide !== null) {
    if (judas.sweepSide === 'HIGH' && smt.direction === 'BEARISH') return ` ${SMT_AGREE_TAG}`;
    if (judas.sweepSide === 'LOW' && smt.direction === 'BULLISH') return ` ${SMT_AGREE_TAG}`;
  }
  return '';
}
```
Tier derivation copies this agreement read verbatim:
- confirmed Judas + unsuppressed aligned SMT → highest tier
- suppressed SMT → cap at base tier (D-11), reason stays visible in SMT sub-block
- candidate (`confirmed: false`) → zero score impact (D-12)
Judas shape: `{ candidate, confirmed, preRun, sweepSide, sweepTime, displacementMult }` (`src/lib/ict/judas.ts:29-36`). NOT in `src/lib/ict/` — scoring is selector-level, keeps ict purity (no `Date.now` inside ict). Discrete Azerbaijani tier words, never numbers.

---

### `app/api/yahoo/route.ts` VERIFY ONLY (route, request-response)

**Analog:** `app/api/yahoo/route.ts` (self, git-tracked) — do not redesign per D-16.

```typescript
export const dynamic = 'force-dynamic';
export const maxDuration = 15;   // line 13 — unchanged
// allowlist before URL build (lines 29-34) → 400, never forwarded
// intraday: fetchIntraday(symbol, interval, new Date()) (lines 37-40)
// cache: envelope.stale ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=30' (lines 42-44)
// errors never cache: 502 + no-store + Retry-After: 60 (lines 46-52)
```
Bounded ranges `RANGE_FOR_INTERVAL` (`src/lib/yahoo.ts:59-63`: 1d→182d, 1h→3mo, 15m→1mo); guard `isValidIntradayPayload` (`yahoo.ts:338-351`). Live drill only: ES cold-start timing, intraday payload < 15s, §3 data-slot presence.

---

## Shared Patterns

### Suppressed-envelope + reason-verbatim rendering
**Source:** `src/lib/ict/smt.ts:39-43` (`{ suppressed: true, reason: 'CORR_DECOUPLED' | 'rollover-week' }`), `src/lib/ict/amd.ts:48-58` (`REASON_*` + `SMT_AGREE_TAG`/`SMT_SUPPRESSED_TAG`)
**Apply to:** All three §3 sub-blocks + `selectConfluence`
```typescript
const REASON_CONFIRMED = 'Asia Range Təmizlənib. London Judas Swing Baş verib.';
const REASON_NY_UNAVAILABLE = 'Gözlənilir — NY sessiyası v2.0-da ölçülmür.';
const SMT_AGREE_TAG = 'SMT razılaşır.';
const SMT_SUPPRESSED_TAG = 'SMT Gözlənilir.';
```
One reason line + tag per sub-block (D-04); all-degraded stacks three (D-02); NY as inline dimmed line in AMD block (D-03).

### Per-leg stale envelope + refuse-with-reason
**Source:** `src/lib/store.ts:51-75` (guard + `LegState`), `refreshES` failure branch (lines 334-340)
**Apply to:** `nq1h`/`nq15m` legs, all five new selectors, chart overlays (dim, never hide)

### NY wall-clock discipline
**Source:** `src/lib/ict/amd.ts:63-67` (`formatInTimeZone(ts, NY_TZ, ...)` per call)
**Apply to:** Any session-date mapping (sweep epoch → D1 date for markers); Baku display at edge only.

### Test fixture density
**Source:** existing `src/lib/*.test.ts` suite (vitest, `src/**/*.test.ts`, 15s timeout)
**Apply to:** `confluence.test.ts` (highest-tier / suppression-cap / candidate-zero-impact), selector fixtures (per-block degraded, all-degraded, stale refusal), Asia-mapper test (finite-guard throw). Per-task: `npx vitest run src/lib/confluence.test.ts src/lib/store.test.ts src/lib/chart-mapper.test.ts`; per-wave: `npm test`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | `createSeriesMarkers` has no in-repo call site yet; RESEARCH Pattern 3 (Context7 v5 tutorial) is the reference. Everything else extends a tracked self-analog. |

## Metadata

**Analog search scope:** `components/dashboard`, `components/charts`, `src/lib`, `src/lib/ict`, `app/api/yahoo`
**Files scanned:** 10 (all Read this session or cited from RESEARCH in-repo reads)
**Git-track check:** all 10 analog paths verified via `git ls-files` (non-empty, tracked)
**Pattern extraction date:** 2026-09-07
