# Domain Pitfalls — Yahoo-Proxy ICT Liquidity Terminal (NQ Futures)

**Domain:** ICT execution terminal — NQ=F daily via Yahoo Finance proxy, D1 dealing-range math, lightweight-charts D1 chart, Asia/Baku timezone, Vercel Hobby (free) deploy
**Researched:** 2026-09-04
**Overall confidence:** HIGH for proxy/rate-limit, Vercel cron, lightweight-charts TZ; MEDIUM for NQ=F rollover specifics

## Critical Pitfalls

Mistakes that cause rewrites, wrong trading bias, IP bans, or failed deploys.

### Pitfall 1: Yahoo proxy gets 429/IP-banned (missing UA, no failover, per-client fan-out)
**What goes wrong:** `query1.finance.yahoo.com/v8/finance/chart/NQ=F` starts returning 429 / "Invalid Cookie" / empty `chart.result`, first in production (shared Vercel egress IP) then locally. Dashboard goes blank with no fallback. Yahoo aggressively rate-limits scripted user-agents (`curl`, default `fetch`/`undici`, `python-requests`) and yfinance-style burst patterns; limits are keyed on IP + User-Agent + headers/cookies.
**Why it happens:** Calling Yahoo without a browser `User-Agent`, calling it directly from the browser (every visitor = distinct uncached request from same egress pool), hammering `query1` only with no backoff, retrying 429s immediately in a tight loop.
**Consequences:** All users lose live data at once; Vercel egress IP reputation burns; exponential retry storm makes the ban longer; no cached fallback means blank chart + wrong "unavailable" report state.
**Prevention:**
- Server-side route handler only (`app/api/yahoo`), never fetch Yahoo from client components.
- Send browser headers on every upstream request: `User-Agent: Mozilla/5.0 ...`, `Accept: application/json`, `Accept-Language: en-US,en;q=0.9`, `Referer: https://finance.yahoo.com/`.
- Fail over `query1` → `query2` on 429/5xx.
- Exponential backoff with jitter on 429/5xx (e.g. 500ms → 1s → 2s, max 3 retries), honor `Retry-After` if present. Do NOT retry 4xx other than 429.
- Singleflight/dedupe concurrent requests for the same symbol+range; 60s server cache (`Cache-Control: s-maxage=60, stale-while-revalidate=30`); **serve stale cache on upstream failure** with a `stale: true` + `lastUpdated` flag instead of erroring.
- Never cache error responses. Cache key must include symbol + interval + range.
- Client polls the proxy at ≥60s cadence, not the proxy polling Yahoo per render.
**Detection (warning signs):** Intermittent 429s in dev; `chart.error.code = "Too Many Requests"` in Yahoo JSON while HTTP status is 200; production fails but localhost works (shared egress IP); chart blanks exactly at cache-expiry boundaries (thundering herd).
**Phase mapping:** Phase 1 (proxy) — must be built in from day one; verify with a backoff + stale-serve test before any chart work.

### Pitfall 2: NQ=F continuous-contract rollover gap corrupts the D1 dealing range
**What goes wrong:** NQ=F is a front-month continuous contract rolling quarterly (Mar/Jun/Sep/Dec). On roll week the new front month trades at a premium/discount (cost of carry), producing a vertical gap of tens to hundreds of points. Yahoo does NOT back-adjust futures history into a smooth series. A dealing-range swing high/low that spans the roll captures the gap as fake displacement → Premium/Discount/Equilibrium and DOL target are computed off a level that never traded.
**Why it happens:** Treating `NQ=F` history as one clean price series; anchoring range to fixed lookback (e.g. last 60 candles) that silently crosses a roll; using `adjclose` as if futures had stock splits/dividends.
**Consequences:** Core value destroyed — bias arrow and premium/discount zones are wrong for weeks until the range re-anchors; backtests look profitable on phantom levels.
**Prevention:**
- For futures use raw `close`/`open`/`high`/`low`, NEVER `adjclose` (splits/dividends are an equities concept; on NQ=F the field is noise that invites misuse).
- Record `contractHint` (e.g. front-month symbol/expiry from Yahoo `meta`) alongside cached candles; surface roll proximity ("roll week — range may re-anchor") in the report shell.
- Prefer anchoring dealing range to the current front-month regime; when a roll gap exceeding N×ATR appears between consecutive closes, flag `rolloverSuspect: true` and require re-anchor confirmation rather than silently absorbing the gap.
- Keep the gap visible on the chart (do not interpolate/fill it) so ICT displacement reads stay honest.
- Document in `ict_rules.md`: Module 2 range function takes an explicit candle window + asOf date; it never fetches or trims data itself.
**Detection:** Single-day close-to-close jump with no matching intraday range expansion; dealing-range high/low dates sitting exactly on known roll weeks; Yahoo `meta.exchangeTimezoneName` / short name changing across fetches.
**Phase mapping:** Phase 1 (ICT math + fixtures) — add rollover-flag logic and a unit test with a synthetic gap candle before trusting any bias output.

### Pitfall 3: Timezone triple-shift — Yahoo UTC × chart UTC × Baku display
**What goes wrong:** The same daily candle renders on the wrong date, or "today's" bias flips a day early/late. Three clocks collide: Yahoo timestamps are UTC seconds anchored to the exchange session, lightweight-charts interprets every timestamp as UTC, and the operator thinks in Asia/Baku (UTC+04:00, no DST since 2016) while CME (America/Chicago) observes US DST — so the Baku↔Chicago offset shifts by an hour twice a year.
**Why it happens:** Applying a fixed +4h offset everywhere; converting twice (once in the proxy, once in the formatter); using `Date.now()` / server-local time inside ICT math; feeding D1 candles as intraday timestamps instead of business-day dates.
**Consequences:** Session/date logic off by one; dealing range re-anchors on the wrong "daily close"; report says one bias in Baku morning, another after US DST change with no code change.
**Prevention:**
- D1 candles travel as business-day strings (`YYYY-MM-DD`), not timestamps, from proxy → store → chart. lightweight-charts explicitly advises: business-day data usually needs NO timezone adjustment.
- Single TZ rule: all session/date bucketing in `Asia/Baku` via `date-fns-tz` (`toZonedTime`/`fromZonedTime`, `getTimezoneOffset` with an explicit date param — never a hardcoded offset). ICT pure functions take injected time (`asOfBakuDate: string`), never call `Date.now()`.
- Resolve DST on the exchange side with IANA names (`America/Chicago` for CME), not fixed offsets; Baku side stays stable at +4 but still use the IANA name so the code survives any future policy change.
- Display format is `yyyy-MM-dd (Asia/Baku)` next to every candle date and the report header; include `lastUpdated` in Baku time so staleness is unambiguous.
**Detection:** Candles shifted ±1 day vs finance.yahoo.com chart; bug appears only around US DST transitions (March/November) or only for users in a different browser timezone; snapshot tests that pass locally fail on Vercel (UTC server).
**Phase mapping:** Phase 1 (proxy + ICT utils) — lock the date-string contract and DST unit tests (a March and a November date) before building the chart.

### Pitfall 4: lightweight-charts v5 API + SSR + overlay autoscale traps
**What goes wrong:** Chart never renders in Next.js 16 (`window is not defined` / ResizeObserver errors), or renders but Premium/Discount zones squash the candles into a flat line, or the app leaks a new chart on every navigation.
**Why it happens:** (a) v5 removed `chart.addLineSeries()` — it is now `chart.addSeries(LineSeries, opts)`; old tutorials/snippets silently break. (b) The library is canvas/DOM-only and must be dynamically imported with `ssr: false`. (c) Zone overlays added as full-height histogram/line series participate in autoscaling and crush the price scale. (d) `setData` requires strictly ascending unique times; unsorted or duplicate-time candles throw away the whole series.
**Consequences:** Blank chart panel in production while dev (client-only test page) looks fine; unreadable price action; growing memory use and duplicated crosshairs after route changes.
**Prevention:**
- `const { createChart, LineSeries, CandlestickSeries } = await import('lightweight-charts')` inside a client component with `next/dynamic(..., { ssr: false })` or equivalent; create chart in `useEffect`, call `chart.remove()` in cleanup.
- Overlays: prefer `candlestickSeries.createPriceLine()` for Equilibrium/DOL and `createPriceLine`/bounded box primitives for Premium/Discount; if a band series is needed, put it on a separate overlay scale with `scaleMargins` and a custom `autoscaleInfoProvider` that returns `null` so it never affects price autoscale.
- Feed D1 as `{ time: 'YYYY-MM-DD', open, high, low, close }` sorted ascending, deduped; full replace via `setData` on symbol/range change, `update` only for the forming candle.
- Handle container resize with `ResizeObserver` → `chart.applyOptions({ width, height })`; set `timeScale: { timeVisible: false }` for D1 so midnight timestamps don't show phantom hours.
**Detection:** TS error `addCandlestickSeries does not exist`; chart works on hard refresh but duplicates after navigation; candles compress to a line the moment zones are enabled; console `Assertion failed: data must be in ascending order`.
**Phase mapping:** Chart phase — build the minimal candle-only chart first, add one overlay at a time with an autoscale screenshot check.

### Pitfall 5: Vercel Hobby platform limits — cron daily-only, cache is per-instance, usage caps are hard
**What goes wrong:** Team designs 5-minute server refresh via Vercel Cron or a long-running poller, deploy fails with "Hobby accounts are limited to daily cron jobs"; or the 60s cache "works locally" but production shows different prices per refresh (per-region instances each hold their own in-memory Map, cold starts wipe it); or a usage spike suspends the site until next month with no way to buy more on Hobby.
**Why it happens:** Assuming server memory persists, assuming cron can run sub-daily on Hobby, assuming background work survives function suspension. Current Hobby limits: cron expressions more frequent than once/day fail deployment; functions cap at 300s and metered GB-hours/bandwidth are capped monthly with no overage purchase on Hobby.
**Consequences:** Failed deploys late in the milestone; inconsistent data across users/regions; surprise downtime at month-end; burnt budget of free invocations by polling Yahoo server-side every few seconds.
**Prevention:**
- No sub-daily Vercel Cron on Hobby — client-side 60s polling of the cached proxy IS the refresh mechanism. Reserve the single daily cron (if any) for a warmup/health ping, not data ingestion.
- Treat in-memory cache as best-effort L1 only; set proper CDN semantics (`Cache-Control: public, s-maxage=60, stale-while-revalidate=30`) so the edge, not the function, absorbs fan-out. Never store correctness-critical state (range anchors, bias) in function memory — derive from cached candles + explicit asOf date.
- Keep the proxy fast and light (single upstream fetch, small JSON, no headless browser) to stay far under duration/GB-hour limits; add `maxDuration` explicitly and a response-size cap.
- Show cache age in UI (`updated Xs ago · stale` badge) so per-region skew is visible, not mysterious.
**Detection:** `vercel.json` cron deploy error mentioning daily limit; different `lastUpdated` values on simultaneous hard refreshes; function logs showing cold starts on every poll; usage dashboard climbing steeply during development (dev polling counts too).
**Phase mapping:** Deploy/verification phase — verify cron absence, CDN headers, and cold-start behavior on the live URL, not localhost.

### Pitfall 6: Cache staleness presented as live truth (cached errors, no age signal, herd on expiry)
**What goes wrong:** Proxy caches a Yahoo error page or partial candle array for 60s and serves it as if live; or every client refetches at the same second after expiry → synchronized miss storm → instant 429 → another minute of errors. Users make bias reads off 20-minute-old data believing it is live.
**Why it happens:** Caching by status-200-only-ignored, no `lastUpdated`/`stale` metadata, client poll intervals phase-aligned (all mount at :00), no jitter, no stale-while-revalidate.
**Consequences:** False confidence in stale premium/discount levels; cascading ban (Pitfall 1) triggered by own clients; "works after refresh" heisenbugs.
**Prevention:**
- Cache only validated payloads (schema-check: symbol matches, timestamps ascending, required OHLC present, no null runs); on validation failure serve previous good cache with `stale: true`.
- Response envelope always includes `{ candles, lastUpdatedISO, stale: boolean, source: 'live'|'cache'|'stale' }`; UI renders age + stale badge and disables the bias-confidence meter when stale.
- Add poll jitter (±5–10s) and `stale-while-revalidate` so expiry never synchronizes a herd; dedupe in-flight upstream requests (singleflight) so 50 concurrent misses produce 1 Yahoo call.
**Detection:** Chart timestamp frozen while badge says "LIVE"; error responses with `Cache-Control: hit`; Yahoo outage of 30s becomes a 5-minute site outage; load test with 20 parallel clients triggers immediate 429.
**Phase mapping:** Proxy phase (same PR as Pitfall 1) — ship the envelope + validation + jitter together; test by killing upstream and confirming stale-serve.

## Moderate Pitfalls

### Pitfall 7: Null/misaligned OHLC arrays from Yahoo chart JSON
**What goes wrong:** `indicators.quote[0]` arrays contain `null` (halted sessions, partial forming candle); zipping `timestamp[i]` with `close[i]` without null handling shifts all later candles or crashes the chart.
**Prevention:** Zip by index, drop rows where OHLC is incomplete (except allow the last forming candle flagged `forming: true`), then re-validate ascending order. Unit test with a fixture containing null runs.

### Pitfall 8: Zustand stores derived bias instead of deriving it
**What goes wrong:** Store holds `{ candles, bias }` and an updater forgets to recompute bias after new candles → report and zones disagree.
**Prevention:** Store only raw inputs (symbol, timeframe, candles, asOfBakuDate, confidence inputs); compute dealing range via memoized selectors outside the store. ICT functions stay in `src/lib/ict` with zero store imports.

### Pitfall 9: `date-fns` vs `date-fns-tz` vs `@date-fns/tz` import confusion
**What goes wrong:** v4 split moved TZ helpers (`toZonedTime`, `fromZonedTime`) across package names; mixing versions yields double-converted times or `getTimezoneOffset` sign errors (note: `@date-fns/tz` `tzOffset` returns mirrored sign vs `Date.getTimezoneOffset`).
**Prevention:** Pin one TZ package, import TZ helpers from exactly one place, wrap in two project utils (`toBakuDate`, `formatBaku`) so nothing else touches offsets. Test both a winter and summer date.

### Pitfall 10: Fixture drift — sentiment/calendar mocks silently diverge from future real APIs
**What goes wrong:** ForexFactory/Myfxbook JSON fixtures grow ad-hoc fields; later replacement with real fetches breaks the True-AVG (excl. Insta/FiboGroup) and 60% threshold logic.
**Prevention:** Type fixtures with the exact future API contract (zod schema shared by mock and fetcher), keep broker-exclusion list as a constant, unit-test True AVG + threshold flag against fixtures now.

### Pitfall 11: Weekend/holiday gaps treated as missing data to "fill"
**What goes wrong:** NQ trades Sun–Fri; Saturday absence is correct. Interpolating weekends or forward-filling holidays fabricates candles that corrupt range anchors and show phantom Sunday/Monday displacement.
**Prevention:** Never synthesize candles; business-day time scale already handles gaps visually. Report shows "market closed — last close bias" state instead of inventing a candle.

## Minor Pitfalls

### Pitfall 12: Fetching too much history per poll
**What goes wrong:** Requesting `range=max` every 60s wastes bandwidth/GB-hours and risks truncation. **Prevention:** Fetch a bounded window (e.g. 6mo D1) and rely on cache; extend window only when range-anchor lookback demands it.

### Pitfall 13: Over-permissioned shadcn / chart-in-server-component bloat
**What goes wrong:** Importing the full component library or rendering the chart inside a server component bloats the bundle and breaks SSR. **Prevention:** Allowed shadcn components only (button, dropdown-menu, dialog, toast, calendar, card); chart isolated in a small `ssr:false` client island.

### Pitfall 14: Azeri-language spec terms leaking untranslated into code
**What goes wrong:** Institutional-rules doc is Azerbaijani; transliterated identifiers (`dovr`, `qərəz`) confuse future contributors. **Prevention:** Code identifiers in English (`dealingRange`, `bias`, `equilibrium`); Azeri terms live in comments/docs mapping tables only.

## Phase-Specific Warnings

| Phase topic | Likely pitfall | Mitigation |
|-------------|---------------|------------|
| Yahoo proxy + cache (Phase 1 backend) | 1 (429/ban), 6 (stale-as-live), 7 (null candles) | Browser UA + q1/q2 failover + backoff + singleflight; validate-then-cache; envelope with `stale`/`lastUpdated`; null-row fixture test |
| ICT dealing-range math (Phase 1 lib) | 2 (rollover gap), 3 (asOf date), 8 (derived state) | Pure fns with injected `asOfBakuDate`; rollover-suspect flag + synthetic-gap test; selectors-not-store |
| Chart + terminal shell (Phase 2 UI) | 4 (v5 API/SSR/autoscale), 11 (weekend fill) | `ssr:false` island + `addSeries` API + `chart.remove()`; priceLines for zones with null autoscale; never synthesize candles |
| Timezone/session logic | 3 (double-shift/DST), 9 (tz package mix) | Business-day strings end-to-end; one TZ util module; March + November DST tests |
| Sentiment fixtures + report shell | 10 (fixture drift) | Shared zod contract; broker-exclusion constant; True-AVG + 60% threshold tests now |
| Vercel deploy + verify | 5 (cron/cache-per-instance), 12 (history size) | No sub-daily cron; CDN `s-maxage` + SWR headers; cold-start + staleness check on live URL; bounded range |

## Sources

- Yahoo 429 / User-Agent / retry guidance: [SoftHints — Fix Yahoo Finance API 429](https://softhints.com/how-to-fix-yahoo-finance-api-429-too-many-requests-error/), [scheb/yahoo-finance-api #42](https://github.com/scheb/yahoo-finance-api/issues/42), [Scrapfly — Yahoo Finance API guide](https://scrapfly.io/blog/posts/guide-to-yahoo-finance-api) — confidence HIGH (multiple corroborating, docs-adjacent)
- Yahoo chart endpoint shape (`query1/query2/v8/finance/chart`, `result[0].timestamp` + `indicators.quote`): [Scrapfly guide](https://scrapfly.io/blog/posts/guide-to-yahoo-finance-api) — confidence MEDIUM (single detailed source, matches known API shape)
- Continuous-futures rollover gaps / back-adjustment: [Sierra Chart docs](https://www.sierrachart.com/index.php?page=doc/ContinuousFuturesContractCharts.html), [EBC rollover explainer](https://www.ebc.com/forex/futures-contract-rollover-explained) — confidence MEDIUM (general futures mechanics applied to NQ=F)
- lightweight-charts has no native timezone support, timestamps processed as UTC, business-day data usually needs no adjustment: [official Time zones doc](https://tradingview.github.io/lightweight-charts/docs/time-zones) — confidence HIGH
- lightweight-charts v5 `addSeries(LineSeries)` API: [npm lightweight-charts](https://www.npmjs.com/package/lightweight-charts) — confidence HIGH
- Vercel Hobby cron limited to once/day (deploy fails otherwise): [Vercel cron usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Crontap Hobby caps writeup](https://crontap.com/blog/vercel-cron-hourly-limit-and-how-to-beat-it) — confidence HIGH
- Vercel Functions duration/caching metered usage: [Vercel Functions limits](https://vercel.com/docs/functions/limitations), [Vercel limits](https://vercel.com/docs/limits), [Vercel pricing](https://vercel.com/pricing) — confidence HIGH
- date-fns-tz `toZonedTime`/`fromZonedTime`/`getTimezoneOffset` semantics: [date-fns-tz npm](https://www.npmjs.com/package/date-fns-tz), [@date-fns/tz GitHub](https://github.com/date-fns/tz) — confidence HIGH
- Asia/Baku UTC+4 no-DST and CME US-DST shift applied from general IANA knowledge — confidence MEDIUM (verify with `tzScan("America/Chicago")` + Baku offset check during build)
