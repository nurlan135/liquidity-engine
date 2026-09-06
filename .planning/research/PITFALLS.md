# Pitfalls Research — v2.0 Modul 3 (SMT + Liquidity Sequencing on a Live Terminal)

**Domain:** Adding NQ-vs-ES SMT divergence, 4H/1H internal/external logic, full AMD (Asia Range + London/NY Judas Swing) and live report §3 to an existing ICT terminal (Yahoo proxy + D1 dealing-range + Baku TZ already live on Vercel Hobby)
**Researched:** 2026-09-06
**Confidence:** HIGH for dual-symbol proxy load, session/DST mechanics, lightweight-charts overlay behavior; MEDIUM for SMT/Judas ICT semantics (trading-education sources, no official spec)

> Scope note: v1.0 pitfalls (single-symbol 429, NQ=F rollover gap, UTC×chart×Baku triple-shift, lightweight-charts v5 SSR, Hobby cron/cache, stale-as-live) are validated and shipped. This file does NOT re-litigate them — it covers what breaks when you ADD a second symbol, intraday sessions, and divergence logic to that live system. Where a v1.0 pitfall gets worse in v2.0, it is marked **[AMPLIFIES v1.0-P#]**.

## Critical Pitfalls

### Pitfall 1: SMT computed on non-corresponding swings (phantom divergence)

**What goes wrong:**
SMT divergence badge fires constantly — or never fires — because the two symbols' swing highs/lows were detected independently (different lookbacks, different swing-strength params, different array lengths) and then compared by index instead of by matched time window. NQ swing #7 gets compared to ES swing #5. Every normal correlation wobble reads as "divergence."

**Why it happens:**
ICT SMT is a discrete event at *matched* swings: one market takes its prior high/low while the correlated market fails to, inside the same time window (LuxAlgo, innercircletrader, Flux Charts all agree: "only corresponding swings are comparable"). Developers reuse the D1 dealing-range swing helper per symbol with default params and zip the two swing arrays. NQ (higher beta, wider ATR) prints more/fewer swings than ES over the same window, so indices drift apart from the first mismatch onward.

**How to avoid:**
- Define ONE swing-matching contract first: `matchSwings(nqCandles, esCandles) → Array<{ windowStart, windowEnd, nqExtreme, esExtreme }>` where windows are time-anchored (same calendar window on both series), not index-anchored.
- Same swing-strength parameter (e.g. fractal k bars each side) applied to both symbols; expose it as a named constant with a test pinning it.
- SMT function signature takes *matched pairs*, never two raw candle arrays: `detectSMT(pairs, toleranceBps) → SMTSignal | null`. Tolerance in basis points of price (not raw points — NQ ≈ 5× ES point scale) so a 10-point ES non-confirmation and a 40-point NQ non-confirmation are judged equivalently.
- Unit tests: (a) synthetic fixture where NQ sweeps high + ES holds → bearish SMT with correct "sweeper = manipulated" label; (b) mirror for bullish; (c) choppy fixture with ±1-bar swing offsets → NO signal (this is the test everyone skips).
- Directional honesty: the sweeping market is the manipulated one (NQ sweeps high while ES holds = trap in NQ, authentic signal from ES). Label which leg to fade; never emit a bare "SMT detected."

**Warning signs:**
Divergence fires on >30% of swings in backtest; signal flips direction when you change one symbol's lookback by 2 bars; NQ and ES swing-count differ by >20% over the same window; code path compares `nqSwings[i]` with `esSwings[i]`.

**Phase to address:**
SMT math phase (pure functions in `src/lib/ict/smt.ts`), BEFORE any chart badge or report §3 wiring. Gate: matched-pair fixture tests green before UI consumes the signal.

---

### Pitfall 2: Second symbol doubles Yahoo load and halves the 429 headroom [AMPLIFIES v1.0-P1/P6]

**What goes wrong:**
Adding `ES=F` to the same 60s poll loop doubles upstream Yahoo calls. What was a comfortable margin under Yahoo's unofficial IP-based rate limit (~hundreds/day before soft-ban behavior; yfinance docs cite ~360/hr; community reports bans after rapid multi-symbol loops) becomes intermittent 429s — first in production (shared Vercel egress IP), exactly as v1.0-P1 warned. Worse: naive `Promise.all([fetchNQ, fetchES])` means one symbol's 429 poisons both, and the envelope's single `stale` flag can't express "NQ live, ES stale" — so SMT is computed on mixed-freshness inputs and presented as live truth.

**Why it happens:**
The v1.0 proxy (`app/api/yahoo/route.ts` → `fetchNQDaily`) was built single-symbol: one cache key, one envelope, one `stale` boolean. Bolting ES on as a second fetch inside the same handler without per-symbol envelopes, per-symbol cache keys, and staggered polling doubles the thundering herd at every cache-expiry boundary.

**How to avoid:**
- Per-symbol envelopes, always: `{ symbol, candles, lastUpdatedISO, stale, source }[]` or `{ NQ: envelope, ES: envelope }`. Never merge into one `stale` flag. SMT selector must refuse to emit when EITHER leg is stale (`smtAvailable: false`, reason string).
- Cache key includes symbol + interval + range (v1.0 rule, now load-bearing for two symbols). Validate-then-cache per symbol independently; one symbol's upstream failure serves that symbol's last-good cache without touching the other.
- Stagger polling: NQ at :00, ES at :30 (or a single `/api/quotes?symbols=NQ,ES` route that singleflights each leg independently with jitter ±5–10s). Keep each leg's cadence ≥60s; do NOT halve the interval to "keep up" with two symbols.
- Bound intraday history aggressively (see Pitfall 5): dual-symbol × intraday intervals is where GB-hour/bandwidth burn actually happens on Hobby.
- Load test with both symbols + 20 parallel clients before chart work; confirm one 429 never blanks the other symbol.

**Warning signs:**
429s reappear after months clean; both symbols go stale simultaneously on every expiry boundary; `lastUpdated` timestamps for NQ and ES always identical to the second (lockstep fetch); SMT fires during known Yahoo wobbles.

**Phase to address:**
Dual-symbol proxy phase — the FIRST v2.0 phase. Nothing downstream (SMT, AMD, §3) starts until per-symbol stale envelopes + staggered polling are verified on the live URL.

---

### Pitfall 3: NQ/ES timestamp misalignment silently corrupts every comparison

**What goes wrong:**
NQ and ES candle arrays have different lengths, different null runs, or off-by-one timestamps (halted sessions, partial forming candles, differing Yahoo truncation per symbol, contract-hint/meta differences). SMT and Asia-Range code that assumes `nq[i]` and `es[i]` are the same session compares Tuesday's NQ high with Wednesday's ES high. Signals look plausible and are completely wrong.

**Why it happens:**
`indicators.quote[0]` arrays contain nulls per symbol independently; Yahoo truncates each symbol's history at different points; intraday intervals add exchange-break gaps (daily 60-min CME maintenance 16:00–17:00 CT) that don't align across fetch windows. V1.0-P7 (null OHLC) was single-symbol and droppable-row safe — with two symbols, dropping rows per symbol *independently* is what creates the misalignment.

**How to avoid:**
- Inner-join on timestamp FIRST, then compute: build `Map<time, candle>` per symbol, intersect keys, sort ascending, then run swing matching only on the joined series. Keep a `coverage: { nq: n, es: n, joined: n, dropped: n }` diagnostic in dev logs/tests.
- Drop incomplete rows BEFORE the join (except the flagged forming candle, which is excluded from SMT entirely — SMT on a forming candle is a self-updating signal).
- Unit test with a fixture where ES is missing 3 middle candles and NQ has 2 null rows: assert joined length, assert no signal shifts vs. the clean fixture, assert `dropped` count surfaces.
- Surface coverage in the §3 debug line ("NQ 120 / ES 118 / joined 117") during development; hide or collapse in production UI but keep it in the envelope for support.

**Warning signs:**
Joined coverage <95% silently accepted; SMT signal appears/disappears when refetching the same window; backtest P&L changes when fetch order (NQ-first vs ES-first) changes; `zip by index` anywhere in SMT/AMD code.

**Phase to address:**
Same dual-symbol proxy/math phase as Pitfall 2 — the join is part of the data contract, tested with a misaligned fixture before SMT consumes it.

---

### Pitfall 4: Session hours hardcoded in a fixed offset — DST moves the Killzone [AMPLIFIES v1.0-P3]

**What goes wrong:**
Asia Range (20:00–00:00 EST) and London Killzone (02:00–05:00 EST) are coded as fixed UTC or fixed Baku offsets. Twice a year the US springs forward/falls back (EDT↔EST) while Asia/Baku stays at UTC+4 (no DST since 2016). Every session boundary shifts by one hour: Asia Range captures an hour of London flow (or misses an hour of Asian flow), Judas Swing detection runs in dead air, and the bug vanishes for six months — the exact failure shape v1.0 already proved with March + November DST tests.

**Why it happens:**
ICT session definitions are published in EST/EDT shorthand ("02:00–05:00 EST"), which reads like a fixed offset. Developers convert once to UTC (+5) or Baku (+4 math on top of ET) and hardcode it. CME equity-index futures trade near-23h (Sun–Fri with a daily 16:00–17:00 CT maintenance break), so there is no "exchange closed" error to catch the shift — the window just quietly reads the wrong hour of flow.

**How to avoid:**
- Resolve ALL session boundaries through IANA names at call time: window defined as wall-clock in `America/New_York` (handles EST↔EDT automatically) + display/bucketing in `Asia/Baku` via the existing `toBakuDate`/`formatBaku` utils. Never a hardcoded `+4`/`+5` offset; never `Date.now()` inside — inject `asOf` (the v1.0 purity constraint now covers session functions too: `getSessionWindow(asOfBakuDate, session)`).
- Reuse the v1.0 DST gate: March + November unit tests asserting Asia-Range and Killzone boundaries resolve to the correct Baku wall-clock on both sides of each US transition. Add a third test: a date inside the CME maintenance break resolves to `inBreak: true`, not to a neighboring session.
- Session function returns a window object `{ startISO, endISO, session, inKillzone }` — chart, Judas detector, and report §3 all consume the window; nobody re-derives "is it Killzone o'clock" independently.

**Warning signs:**
Any `+4`, `+5`, `getHours() + X`, or `EST` string literal in session code; session tests that only cover one month; Judas signals clustering at :00–:01 past the expected window edge after a DST weekend; Baku display label disagreeing with the detection window.

**Phase to address:**
AMD/session phase, first task before Judas logic. The DST triple-test (March, November, maintenance-break) is the phase gate.

---

### Pitfall 5: Judas Swing flags every Asia-range wick (no killzone gate, no reversal proof)

**What goes wrong:**
The Judas detector fires on any Asia high/low pierce — including 01:00 pre-runs, midday drift-throughs, and slow grinds that never reverse. The terminal cries "manipulation" five times a day; operators fade genuine breakouts and stop trusting the badge. This is the highest-noise detector in Modul 3 and the easiest to ship in a naive form.

**Why it happens:**
ICT Judas Swing is a conjunction, not a pierce: (1) Asia Range defined strictly 20:00–00:00 EST *excluding post-midnight wicks*, (2) sweep occurs STRICTLY inside the 02:00–05:00 EST London Killzone (a 01:00 sweep is documented as an unreliable "pre-run"), (3) sweep + fast reversal + displacement away, confirmed on low timeframes (15m/5m visibility; 1H/4H hide the structure), ideally with market-structure shift. Implementing only (1)+(2-lite) — "price crossed the line during London morning" — drops the reversal leg that separates Judas from breakout.

**How to avoid:**
- Three-gate detector, all gates required: `inKillzone(t) AND sweptAsiaExtreme(candle) AND reversedWithDisplacement(next N candles, min ATR-multiple)`. Ship NO two-gate version to production, not even "temporarily."
- Minimum displacement threshold as a multiple of Asia-Range height or ATR (not fixed points — NQ/ES volatility regimes differ 3–5× across months). Below threshold → `judasCandidate: true, confirmed: false`; never promote candidates to the §3 narrative.
- Killzone membership from the Pitfall-4 session window (single source of truth), strict inequality on both edges; log near-misses (sweep at 01:47 EST) as `preRun: true` for analyst review, not as signals.
- False-positive budget test: run the detector over 60+ days of history; if confirmed-Judas fires on >25% of sessions, the gates are too loose (Judas is a sometimes-food pattern, not a daily occurrence). Tune displacement, not the clock.
- Chart shows candidates (hollow marker) vs confirmed (solid marker + displacement arrow) distinctly; §3 prose uses hedge language for candidates ("Asia high swept, awaiting displacement") per the v1.0 trap-vs-genuine prose precedent.

**Warning signs:**
Detector with no displacement parameter; Asia Range including post-midnight wicks; signals outside 02:00–05:00 EST counted as hits; backtest win-rate suspiciously high because exits are measured from the sweep extreme instead of post-reversal confirmation.

**Phase to address:**
AMD phase, after the session-window gate (Pitfall 4). Order inside the phase: session windows → Asia Range → Killzone gate → Judas three-gate → false-positive-budget run.

---

### Pitfall 6: Intraday data treated like D1 (Yahoo interval limits + forming-candle churn)

**What goes wrong:**
Modul 3 needs 4H/1H structure plus 15m/5m Judas visibility, but the v1.0 proxy contract is D1 business-day strings (`YYYY-MM-DD`, no timezone adjustment per lightweight-charts guidance). Reusing the D1 pipeline for intraday — timestamps-as-dates, full-replace `setData` per poll, 6-month window per fetch — produces truncated series (Yahoo caps intraday history: 1m ≈ 7d, 5m/15m ≈ 60d), forming-candle flicker (every poll rewrites the "signal" candle), and weekend/break gaps rendered as displacement.

**Why it happens:**
The D1 contract deliberately avoided timestamps; intraday cannot avoid them (session bucketing IS timestamp math). Yahoo intraday `interval=5m&range=1mo` returns a different shape density per symbol, with `exchangeTimezoneName` metadata that must be honored, and the last candle is always forming during market hours.

**How to avoid:**
- Separate intraday contract: `{ time: epochSeconds_UTC, open, high, low, close, forming }` — UTC epoch from proxy → chart (lightweight-charts treats intraday timestamps as UTC; session labels applied in Baku at render). Keep D1 on business-day strings; do NOT unify the two contracts.
- `closedOnly()` discipline inherited from v1.0 types: SMT/Judas/AMD evaluate closed candles only; the forming candle renders on the chart but never enters a detector input. Poll updates use `series.update()` for the forming candle, `setData` full-replace only on symbol/range change.
- Bounded windows per interval (e.g. 5m ≤ 30d, 1h ≤ 3mo — inside Yahoo's caps with margin), fetched once per session then incrementally updated; never `range=max` on a 60s loop (v1.0-P12, now 2 symbols × denser intervals = 50–200× payload).
- Weekend/maintenance-break gaps are correct absence (v1.0-P11 restated for intraday): no interpolation, no forward-fill; the time scale shows the gap. Detectors skip gaps rather than bridging them.

**Warning signs:**
Intraday fetch with `range=max`; detector inputs including the forming candle; SMT/Judas signal that changes value between polls with no new closed candle; chart gaps visibly "filled" with flat candles; payload size growing linearly with poll count.

**Phase to address:**
Dual-symbol proxy phase (interval/range matrix + intraday contract) with detector-phase enforcement (`closedOnly` assertions in SMT/Judas unit tests).

---

### Pitfall 7: Asymmetric rollover weeks forge fake SMT [AMPLIFIES v1.0-P2]

**What goes wrong:**
NQ and ES roll quarterly in the same weeks (Mar/Jun/Sep/Dec) but their cost-of-carry gaps differ in size (different index yield/rate sensitivity). A roll-week chart shows NQ gapping 80 points while ES gaps 25 — the swing comparator reads "NQ made a new high, ES failed to confirm" and emits a high-confidence bearish SMT. The dealing-range anchors on both symbols are simultaneously suspect (v1.0-P2), so the fake signal arrives wrapped in wrong premium/discount context.

**Why it happens:**
SMT assumes both legs are clean continuous series; futures continuous series are NOT back-adjusted by Yahoo. The v1.0 `rolloverSuspect` flag exists for NQ D1 only — nobody extends it to ES, nobody suppresses cross-symbol signals during suspect windows, and `adjclose` misuse (v1.0-P2: never for futures) can sneak back in via a "helpful" normalization helper.

**How to avoid:**
- Extend the v1.0 rollover-tripwire to BOTH symbols: per-symbol `rolloverSuspect` (close-to-close gap > N×ATR) computed independently, raw OHLC only, never `adjclose`.
- SMT suppression rule: if EITHER leg is `rolloverSuspect` inside the comparison window → emit `smtSuppressed: true, reason: 'rollover-week'` instead of a signal. §3 renders "SMT unavailable — contract roll week" (the v1.0 honest-degrade precedent), not a weak signal.
- Synthetic-gap test per symbol + a joint test (NQ gaps, ES doesn't → suppressed, not divergent). Pin the ATR-multiple threshold as a constant shared with the D1 tripwire.
- Keep the gap visible on both charts (no interpolation); roll-proximity label ("roll week — range may re-anchor") already exists for NQ — add it for ES.

**Warning signs:**
SMT cluster exactly on third-Friday-of-Mar/Jun/Sep/Dec weeks; backtest alpha concentrated in roll weeks; any `adjclose` reference in `src/lib/ict`; per-symbol rollover flags with different thresholds.

**Phase to address:**
SMT math phase, paired with Pitfall 1: the matched-pair fixtures must include a roll-week suppression case before the signal ships.

---

### Pitfall 8: Breaking the honesty + purity contracts that v1.0 earned

**What goes wrong:**
SMT/AMD code calls `Date.now()` inside detectors, stores derived `smtSignal`/`judasFlag` in the Zustand store alongside candles, or renders a confident §3 narrative while one leg is stale/closed. Report and zones disagree after each poll (v1.0-P8 recurrence); snapshot tests pass locally and fail on Vercel UTC servers (v1.0-P3 recurrence); users act on "CONFIRMED SMT" backed by 20-minute-old ES data (v1.0-P6 recurrence, now with money-losing specificity).

**Why it happens:**
Second-milestone urgency: detectors need "now," so `Date.now()` feels expedient; derived flags feel storable; the single-`stale` envelope makes mixed-freshness invisible so nobody adds the guard.

**How to avoid:**
- Purity extends, no exceptions: every new `src/lib/ict` function (`detectSMT`, `asiaRange`, `judasSwing`, `sessionWindow`, `internalExternal`) takes injected time (`asOfBakuDate`/`asOfISO`) and explicit candle windows — zero I/O, zero `Date.now()`. The existing 133-test suite's discipline is the template; new detectors ship with the same fixture-test density.
- Store raw inputs only (both symbols' candles, asOf, per-symbol freshness); derive EVERYTHING (SMT, Asia Range, Judas, §3 model) via memoized selectors outside the store. ICT modules keep zero store imports.
- Freshness gate at the selector boundary: `selectSMT` returns `{ available: false, reason }` when either envelope is stale, market closed, coverage < threshold, or rollover-suppressed. §3 renders the reason verbatim (honest STALE/CLOSED states already proven — extend the vocabulary, don't invent a new pattern).
- Confidence meter dims/disables on any degraded input (v1.0 behavior for D1 bias, now covering SMT/Judas legs).

**Warning signs:**
`Date.now()`/`new Date()` inside `src/lib/ict`; store shape containing `smtSignal`, `judasActive`, or `bias` fields; §3 section with no `unavailable` branch; tests that construct "now" implicitly instead of injecting it.

**Phase to address:**
Every phase (contract), enforced at code review from the first Modul 3 PR. Cheapest to prevent, most expensive to retrofit.

---

## Technical Debt Patterns

Shortcuts that seem reasonable when adding Modul 3 but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse D1 business-day pipeline for intraday (strings, full `setData` per poll) | One code path, fast first demo | Truncated series, forming-candle flicker, 50–200× payload on Hobby | Never — separate intraday contract from day one |
| Compare swings by index (`nqSwings[i]` vs `esSwings[i]`) | SMT "works" on the first clean week | Permanent phantom-divergence generator; every later fix re-tunes all thresholds | Never — time-anchored matching only |
| Two-gate Judas (pierce + clock, no reversal) | Signal fires often, demo looks alive | Operator learns to ignore the badge; fading real breakouts | Never in production; candidates-only behind a debug flag at most |
| Single merged `stale` flag for both symbols | Smaller envelope diff | Mixed-freshness SMT presented as live; v1.0-P6 recurrence with leverage | Never — per-symbol envelopes |
| Fixed-offset session hours (`+4`/`+5` literals) | Readable, passes tests written in one season | 1-hour session error twice a year, invisible for months | Never — IANA resolution + March/November tests |
| Store derived SMT/Judas flags in Zustand | Fewer selector calls, simple props | Zones vs report disagreement after every poll; untestable time coupling | Never — selectors derive, store holds inputs |
| Fixed-point Judas displacement (e.g. "30 points") | Simple threshold | Threshold rots every volatility-regime change; NQ/ES need different values anyway | Only as a UI default; detector uses ATR/Asia-height multiples |
| Interpolating weekend/break gaps for "clean" series | Prettier chart, simpler swing code | Fabricated displacement corrupts anchors + SMT (v1.0-P11, intraday edition) | Never |
| `adjclose`-based normalization across NQ/ES | "Comparable" percentages feel rigorous | Equities concept applied to futures; masks roll gaps that must stay visible | Never for futures |

## Integration Gotchas

Adding to the live v1.0 system — where the new code meets the old.

| Integration | Common Mistake | Correct Approach |
|-------------|---------------|------------------|
| Yahoo proxy (`app/api/yahoo/route.ts`) | Second `fetch` in the same handler sharing one cache key / one `stale` flag; `Promise.all` coupling the legs | Per-symbol fetch + per-symbol cache key (`symbol+interval+range`) + per-symbol envelope; independent singleflight; staggered polling; one leg's 429 never touches the other |
| Zustand store (symbol, candles, asOf, confidence) | Adding `smt`, `judas`, `asiaRange` fields updated by fetchers | Store only raw inputs for BOTH symbols + per-symbol freshness; all Modul 3 outputs via memoized selectors; `src/lib/ict` keeps zero store imports |
| Chart (lightweight-charts v5, `ssr:false` island) | Asia-Range band + Judas markers + SMT arrows as full-height series that join autoscale and squash candles; new `createChart` per symbol | Price lines / bounded primitives with `autoscaleInfoProvider → null` for bands; one chart, two candle series or symbol toggle; `chart.remove()` cleanup unchanged; `update()` for forming candle only |
| Report §3 (currently unavailable-marker) | Filling §3 with a confident narrative as soon as any SMT value exists | §3 model is `{ available, reason, ...data }`; every degraded input (stale leg, roll week, low coverage, candidate-only Judas) renders its honest reason; confidence meter dims on degrade |
| Session/time utils (`toBakuDate`/`formatBaku`) | New `getKillzone()` helper doing its own offset math | All session logic routes through the one TZ util module + IANA `America/New_York` wall-clock; Baku display stays `yyyy-MM-dd HH:mm (Asia/Baku)` next to every session label |
| Dealing-range anchors (D1 NQ live) | Re-anchoring NQ range to accommodate ES alignment (trimming NQ history to ES coverage) | Never mutate the validated D1 NQ anchor path; SMT join uses its own intersected working copy; ES coverage gaps never shorten NQ's `ANCHOR_WINDOW` recompute |
| Test suite (133 green) | Intraday/SMT tests constructing "now" implicitly; DST tests covering one season | Inject `asOf` in every new test; March + November + maintenance-break session tests; misaligned-timestamp, null-row, and roll-gap fixtures for the join + suppression paths |

## Performance Traps

Patterns that work with one D1 symbol but fail at two symbols × intraday on Hobby.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Dual-symbol × intraday full-history poll every 60s | Bandwidth/GB-hour spike; dev usage dashboard climbs; slow `Response.json` | Bounded windows per interval; fetch-once-then-`update()`; ≥60s cadence per leg with stagger + jitter | Immediately at 5m/1m intervals — 2 symbols × 60s × full range exceeds Hobby comfort on day one |
| Full `setData` replace per poll for intraday series | Chart flicker; crosshair loss; GC churn | `setData` on symbol/range change only; `update()` for forming candle; closed-candle append path | Visible at 5m polling within one session |
| Overlay series per signal (Asia band, Judas arrow, SMT marker each a series) | Autoscale squash; memory growth per navigation; legend spam | Minimal series count; price lines + markers where possible; null-autoscale bands; `chart.remove()` on unmount | At 3+ overlays on one pane — the v1.0-P4 autoscale trap, doubled |
| Synchronized dual expiry (both legs refetch at :00) | Miss storm → paired 429 → both stale → SMT gap | Stagger (:00/:30) + `stale-while-revalidate` + independent singleflight | First production traffic spike after deploy |
| 60-day intraday backtest in the browser | Tab freeze; OOM on mobile; seconds-long selector recompute | Cap in-browser history for detection windows; heavy backtests are dev-scripts, not UI selectors; memoize by (symbol, range, asOf) | Beyond ~5k candles per series in a selector |

## Security Mistakes

Modul 3 adds no auth/billing surface, but the proxy widening deserves two rows.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Unvalidated `?symbol=` passthrough to Yahoo (arbitrary ticker fetch) | Upstream SSRF-adjacent abuse; cache poisoning per attacker-chosen key; egress-IP burn | Strict allowlist (`NQ=F`, `ES=F` only); unknown symbols → 400, never forwarded; cache key built from allowlisted value |
| Error payloads cached as data (per-symbol validation skipped for "speed") | Poisoned leg served for 60s+ as if live; fake SMT on error rows | Validate-then-cache per leg independently (ascending timestamps, OHLC present, symbol matches); serve last-good with `stale: true` on validation failure; never cache errors |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "SMT CONFIRMED" badge with no freshness context | Operator trades on stale ES leg believing it is live | Badge always paired with per-leg age (`NQ 12s · ES 48s`) + auto-downgrade to `STALE — SMT unavailable` when either leg degrades |
| Asia-Range band + Judas markers + SMT arrows + D1 zones all on at once | Chart becomes unreadable; D1 premium/discount (the core value) buried | Layer toggles with D1 zones default-on; Asia overlay default-on only in intraday mode; candidates hollow vs confirmed solid; one emphasis at a time |
| Candidate Judas rendered identically to confirmed | Operators fade breakouts that never reversed | Visual + verbal distinction everywhere (chart marker, §3 prose hedge, confidence contribution zero for candidates) |
| Session labels in ET only, or in an ambiguous "local" time | Baku operator misreads Killzone by 8–9h around DST | Every session label dual-stamped: `London KZ 02:00–05:00 ET · 10:00–13:00 Baku`; report header carries Baku `lastUpdated` |
| Roll-week suppression shown as blank §3 | Looks like a bug; operator refreshes into a ban | Explicit suppressed state: "SMT paused — NQ/ES roll week, ranges may re-anchor" with per-symbol gap sizes |

## "Looks Done But Isn't" Checklist

Verification gates for Modul 3 execution — check each before calling its phase done.

- [ ] **Dual-symbol proxy:** Often missing per-symbol `stale`/`lastUpdated` — verify by killing one upstream leg (or blocking one symbol) and confirming the other stays `live` while SMT shows `unavailable`, not a blended `live`.
- [ ] **SMT detector:** Often missing the negative test — verify a choppy ±1-bar-offset fixture emits NO signal, and a roll-week fixture emits `suppressed`, not divergence.
- [ ] **Swing matching:** Often missing time-anchoring — verify by shifting one symbol's lookback ±2 bars; the signal must not flip direction.
- [ ] **Session windows:** Often missing the second DST transition — verify March AND November fixtures resolve Killzone/Asia boundaries to correct Baku wall-clock, plus a maintenance-break `inBreak` case.
- [ ] **Judas detector:** Often missing the reversal gate — verify a pierce-without-reversal fixture stays `candidate`, and count confirmed signals over 60 days (alarm if >25% of sessions).
- [ ] **Intraday contract:** Often missing forming-candle exclusion — verify consecutive polls with no new closed candle produce byte-identical detector outputs.
- [ ] **Report §3:** Often missing degraded branches — verify stale-leg, closed-market, low-coverage, candidate-only, and roll-week states each render their honest reason with dimmed confidence.
- [ ] **Chart overlays:** Often missing the autoscale check — verify candles don't compress when Asia band + Judas markers + SMT arrows are all enabled (screenshot at each layer addition).
- [ ] **Purity:** Often missing injected time — grep `src/lib/ict` for `Date.now`/`new Date()`; any hit in a detector fails the phase.
- [ ] **Deploy verify:** Often missing live-URL dual checks — verify CDN headers per symbol, staggered polling visible in `lastUpdated` skew, and cold-start stale-serve for each leg independently.

## Recovery Strategies

When a pitfall fires despite prevention.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Phantom SMT (swing mismatch) | MEDIUM | Freeze §3 SMT badge to `unavailable (recalibrating)`; add the failing window as a regression fixture; reimplement matching time-anchored; re-tune tolerance in bps; replay 60 days before re-enabling |
| Dual-symbol 429 storm | LOW | Halve effective upstream rate immediately (stagger wider, jitter up); confirm per-symbol stale-serve holds; add singleflight if missing; no proxy-logic redesign needed if envelopes are per-symbol |
| DST-shifted sessions | MEDIUM | Hotfix session resolver to IANA wall-clock; backfill correct windows for the affected days; annotate §3 history if Judas signals fired in the wrong hour; add the missing transition test |
| Judas over-firing | LOW–MEDIUM | Demote detector to candidates-only behind a flag; raise displacement multiple; re-run 60-day budget; promote to confirmed only under budget |
| Intraday truncation / forming flicker | LOW | Clamp ranges to Yahoo caps; split D1 vs intraday contracts; switch poll path to `update()`-for-forming; purge any interpolated candles from history |
| Roll-week fake SMT | LOW | Suppress retroactively for the window; label affected §3 outputs; confirm per-symbol tripwires share one threshold constant |
| Purity/store entanglement | HIGH | Costliest to unwind — extract `Date.now`, move derived flags to selectors, re-green the full suite; do this before adding the next detector, never after |

## Pitfall-to-Phase Mapping

Suggested v2.0 phase order follows dependency risk: data contracts before math, math before presentation.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| P2 dual-symbol load + P3 timestamp join + P6 intraday contract | Phase 1: Dual-symbol proxy + data contracts | Per-symbol envelopes; staggered polling; join-coverage test; forming-exclusion test; 20-client 429 drill; live-URL per-leg stale check |
| P1 swing matching + P7 rollover suppression + P8 purity | Phase 2: SMT + 4H/1H sequencing math (pure `src/lib/ict`) | Matched-pair fixtures (bull/bear/no-signal/suppressed); lookback-shift stability; `Date.now` grep clean; selectors-only derivation |
| P4 session windows + P5 Judas three-gate | Phase 3: AMD (Asia Range + Killzone + Judas) | March + November + break tests; pierce-without-reversal stays candidate; 60-day false-positive budget ≤25% |
| Chart overlays + §3 honesty + deploy | Phase 4: Composition + report §3 + Vercel verify | Autoscale screenshot per layer; all five degraded §3 states render; CDN headers per symbol; Baku dual-stamp labels; cold-start per-leg drill |
| P8 Zustand/purity + allowlist/validation | Every phase (review gate) | Store holds inputs only; symbol allowlist enforced; validate-then-cache per leg; full suite green before merge |

## Sources

- SMT matched-swing semantics, trap-vs-genuine ("sweeping market is manipulated"), HTF-bias pairing: [Medium — SMT Divergence: Reading Manipulated Markets](https://medium.com/@leooinvests/smt-divergence-reading-manipulated-markets-through-correlated-assets-c4206a974a99), [innercircletrader.net — ICT SMT Divergence](https://innercircletrader.net/tutorials/ict-smt-divergence-smart-money-technique/), [LuxAlgo — SMT Divergence concept](https://www.luxalgo.com/library/concept/smart-money-technique-divergence/), [Flux Charts — How to Identify SMT](https://www.fluxcharts.com/articles/how-to-identify-and-trade-smt-divergences), [TradingView — SMT Divergence NQ vs ES script](https://www.tradingview.com/script/QDq5dTaK-SMT-Divergence-NQ-vs-ES/) — confidence MEDIUM (corroborated across 5 trading-education sources, no official ICT spec)
- Judas structure (Asia 20:00–00:00 EST excl. post-midnight wicks, KZ 02:00–05:00 EST strict, 01:00 pre-run unreliable, 15m/5m visibility, MSS + 3:1 R:R): [TradingStrategyGuides — ICT London Judas Swings](https://tradingstrategyguides.com/the-complete-guide-to-ict-london-judas-swings-in-gbp-usd/), [FXNX — Asian Range Liquidity + Judas Trap](https://fxnx.com/en/blog/ict-asian-range-liquidity-trading-london-judas-swing-trap), [TheICT — Judas Swing manipulation phase](https://www.theinnercircletraders.com/ict-judas-swing/), [AronGroups — Judas Swing strategy](https://arongroups.co/technical-analyze/judas-swing-strategy/) — confidence MEDIUM (consistent session times across sources; execution details vary by author)
- Yahoo multi-symbol rate pressure (IP-keyed limits, ~360/hr doc claim, rapid-loop bans, UA/header sensitivity): [yfinance #2128 rate-limiting](https://github.com/ranaroussi/yfinance/issues/2128), [Medium — Why yfinance Keeps Getting Blocked](https://medium.com/@trading.dude/why-yfinance-keeps-getting-blocked-and-what-to-use-instead-92d84bb2cc01), [Scrapfly — Yahoo Finance API guide](https://scrapfly.io/blog/posts/guide-to-yahoo-finance-api), [StackOverflow — Yahoo request limits](https://stackoverflow.com/questions/5888662/does-yahoo-finance-have-data-request-upper-limit-is-there-an-alternative-or-wor) — confidence HIGH for "doubling symbols doubles ban risk"; MEDIUM for exact numeric limits (unofficial, variable)
- CME session reality (near-23h Sun–Fri, daily 16:00–17:00 CT maintenance break, EST/EDT wall-clock dependence): [Tastytrade — Futures Market Hours](https://tastytrade.com/learn/trading-products/futures/futures-market-hours/), [CrossTrade — CME session table](https://crosstrade.io/learn/futures-trading/trading-hours), [CME Group — Trading Hours](https://www.cmegroup.com/trading-hours.html) — confidence HIGH
- Existing system contracts (per-symbol gap analysis): `app/api/yahoo/route.ts` single-symbol envelope, `src/lib/ict/types.ts` (`Candle.forming`, `closedOnly`), v1.0 `.planning/research/PITFALLS.md` P1–P6 — confidence HIGH (read directly from repo)

---
*Pitfalls research for: v2.0 Modul 3 — SMT + liquidity sequencing added to live ICT terminal*
*Researched: 2026-09-06*
