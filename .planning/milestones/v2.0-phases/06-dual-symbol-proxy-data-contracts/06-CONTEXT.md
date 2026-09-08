# Phase 6: Dual-Symbol Proxy + Data Contracts - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning

## Phase Boundary

Phase 6 extends the proven single-symbol NQ proxy into a dual-symbol (NQ + ES) daily + intraday data pipe with honest per-leg freshness and a timestamp-joined data contract. It delivers the pipe only — parameterized proxy, per-symbol stale envelopes, staggered polling, intraday epoch contract, inner-join with coverage diagnostics. No SMT math, no AMD sessions, no report §3, no chart overlays — those belong to Phases 7–9 and consume what this phase produces.

## Implementation Decisions

### Poll orchestration

- **D-01:** Stagger lives in client-side loops — two independent refresh timers in the store/hook layer (NQ at :00, ES at :30, jitter ±5–10s). The server route stays a dumb per-leg fetch; one leg's failure never blocks the other.
- **D-02:** Uniform 60s cadence for all legs (daily + 1H + 15M). Intraday payloads stay cheap via bounded history windows, so one cadence keeps the polling code simple.
- **D-03:** Keep polling always — hidden tabs and closed market do not pause timers. Serve-stale + the existing CLOSED status-strip semantics already handle closed-market honesty; no resume-edge bugs.
- **D-04:** Per-leg `lastUpdated` age is visible in the status strip (`NQ 12s · ES 48s` style). Phase 6 lays the data groundwork that Phase 7 SMT badges and Phase 9 §3 will consume.

### NQ compatibility

- **D-05:** Bare `GET /api/yahoo` (no params) returns byte-identical NQ daily shape. New `?symbol=` / `?interval=` params are purely additive — existing store, tests, and Vercel drill keep working with zero changes.
- **D-06:** Never substitute NQ data for a failed ES leg. ES upstream failure serves ES last-good as stale or 502s — cross-symbol substitution would silently corrupt every downstream SMT comparison.
- **D-07:** The D1 NQ dealing-range anchor path stays fully independent of ES/join code. The timestamp join works on its own intersected working copy; ES coverage gaps never shorten NQ's `ANCHOR_WINDOW` recompute.
- **D-08:** Strict symbol allowlist (`NQ=F`, `ES=F` only). Unknown `?symbol=` values get 400 and are never forwarded to Yahoo (blocks SSRF-adjacent abuse and cache poisoning).

### Cache TTL policy

- **D-09:** Uniform 60s TTL for every symbol×interval combo — same as v1.0 proven. Daily data revalidates cheaply; one rule to verify.
- **D-10:** Same 30-minute serve-stale ceiling (`MAX_STALE_MS`) for all legs including intraday. The honest STALE flag communicates intraday staleness; uniform rule, uniform verify.
- **D-11:** Shared module-level Map with composite `symbol:interval(:range)` keys (extends the existing `payloadCache`). Least churn; one leg's eviction logic can't silently diverge. — **Reversibility:** costly — splitting to per-leg caches later touches every fetch/cache/singleflight call site
- **D-12:** Same CDN `Cache-Control` headers on all combos (`public, s-maxage=60, stale-while-revalidate=30`, `no-store` when stale). One verify path on the live URL.

### Coverage visibility

- **D-13:** Join-coverage diagnostics (`{ nq, es, joined, dropped }`) ride in the envelope for selectors/support, plus a small debug line (`NQ 120 / ES 118 / joined 117`) during development. Collapsible/hidden in production UI, always present in data.
- **D-14:** The join warns, never refuses — it always returns intersected rows plus coverage counts. Refuse/NO-SIGNAL policy (e.g. coverage < 95%) belongs to Phase 7 selectors, not the data layer.
- **D-15:** Forming-candle exclusion at both layers — parser flags `forming: true` (as today), join drops forming rows before intersecting. SMT can never see a self-updating candle even if one layer regresses.
- **D-16:** Intraday contract uses UTC epoch seconds; D1 stays on business-day strings. Session labels are applied in Baku at render; the two contracts are never unified. — **Reversibility:** costly — the epoch-vs-string shape flows into the parser, join, chart mapper, and every intraday test fixture

### Claude's Discretion

None — user decided every question directly (no "You decide" selections).

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — DATA-04, DATA-05, DATA-06, DATA-07 (the four locked requirements this phase implements)
- `.planning/ROADMAP.md` — Phase 6 entry: goal, dependencies (Phase 3), all four success criteria
- `.planning/PROJECT.md` — Constraints (zero budget, Zustand-only, 60s cache, `src/lib/ict` purity, no LLM) and v2.0 milestone target features

### v2.0 research (Modul 3 pitfalls)
- `.planning/research/PITFALLS.md` — Pitfall 1 (dual-symbol 429 storm: per-symbol envelopes, stagger :00/:30, independent singleflight), Pitfall 2 (timestamp inner-join + coverage diagnostics + misaligned fixture), Pitfall 5 (intraday treated like D1: separate epoch contract, bounded windows, no `range=max` on loop), Pitfall 6/validation rows (allowlist 400s, validate-then-cache per leg, never cache errors), phased-fix table (Phase 1 = proxy + contracts first)

### Existing code (the pattern being parameterized)
- `src/lib/yahoo.ts` — v1.0 proxy core: `fetchNQDaily`, `parseChartJson`, query1→query2 failover, jittered backoff, `Retry-After` honor, singleflight `inFlight` map, `payloadCache` with 60s TTL + 30-min serve-stale, validate-then-cache, hardcoded `NQ=F` (the surgery site)
- `app/api/yahoo/route.ts` — route handler: `force-dynamic`, `maxDuration = 15`, stale-aware `Cache-Control` headers, 502 + `Retry-After: 60` error shape
- `src/lib/store.ts` — Zustand store: single `refresh()` + `inFlight` client singleflight, `isValidEnvelope` client guard, ICT selectors — the file gaining the second leg + staggered timers
- `src/lib/freshness.ts` — `deriveStatus` LIVE/STALE/CLOSED vocabulary + `STALE_AFTER_SEC = 120` — extend, don't reinvent
- `src/lib/ict/types.ts` — `Candle` (with `forming?`), `closedOnly()` — the shape intraday extends

## Existing Code Insights

### Reusable Assets
- `parseChartJson` null-row filtering + forming-candle flagging (`src/lib/yahoo.ts:47-123`) — parameterize by symbol, keep the last-row forming convention for intraday
- Failover/backoff/singleflight/serve-stale machinery (`src/lib/yahoo.ts:140-315`) — the exact pattern each new symbol×interval leg reuses
- `deriveStatus` + `formatStripAge` (`src/lib/freshness.ts`) — per-leg age display builds on this; add per-leg inputs, not a new system
- `isValidEnvelope` client guard (`src/lib/store.ts:48-60`) — extend to per-leg envelopes / coverage object
- `closedOnly()` (`src/lib/ict/types.ts:47-49`) — detector-side forming exclusion already exists; join-side exclusion is new

### Established Patterns
- Validate-then-cache per payload, never cache errors; non-retryable 4xx fails loudly (`src/lib/yahoo.ts:256-258,303`)
- Pure functions with injected time in `src/lib/ict` (no `Date.now` inside) — join/coverage helpers follow the same discipline
- Honest degrade: stale flags, CLOSED weekends, `proximityWarning`-style reason strings — SMT-refusal reasons extend this vocabulary
- Azerbaijani status-strip copy (`STALE · … — son keş göstərilir`) — per-leg age strings follow suit

### Integration Points
- `app/api/yahoo/route.ts` — gains `?symbol=` / `?interval=` params; bare GET delegates to the NQ-daily default path
- `src/lib/store.ts` `refresh()` — splits into per-leg refreshers with :00/:30 offset + jitter; state gains per-leg envelopes
- Future (Phases 7–9, not this phase): `selectSMT`-style selectors consume per-leg envelopes + joined rows + coverage; §3 debug line consumes coverage

## Specific Ideas

- Per-leg age format in status strip: `NQ 12s · ES 48s` (paired with SMT availability badges downstream)
- Coverage debug line format: `NQ 120 / ES 118 / joined 117` (dev-visible, collapsible in production)
- Stagger scheme: NQ at :00, ES at :30, jitter ±5–10s, each leg ≥60s cadence
- Intraday scope for this phase: 1H and 15M only (bounded windows inside Yahoo lookback caps — STATE.md flags a live probe test first since ES=F 1H density is a low-confidence web claim)

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 6-Dual-Symbol Proxy + Data Contracts*
*Context gathered: 2026-09-06*
