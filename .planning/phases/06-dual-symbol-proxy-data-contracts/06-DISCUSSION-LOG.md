# Phase 6: Dual-Symbol Proxy + Data Contracts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-06
**Phase:** 6-Dual-Symbol Proxy + Data Contracts
**Areas discussed:** Poll orchestration, NQ compatibility, Cache TTL policy, Coverage visibility

---

## Poll orchestration

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side loops | Two independent refresh timers in the store/hook with offset + jitter. Server stays dumb per-leg fetch; one leg's failure never blocks the other. | ✓ |
| Single server route | One /api/quotes?symbols=NQ,ES that fans out with independent singleflight per leg. Client keeps one timer; server owns the stagger. | |

**User's choice:** Client-side loops
**Notes:** Keeps failure isolation at the timer level; server remains a per-leg fetch.

---

## Poll cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Same 60s all legs | Uniform cadence keeps the polling code simple; intraday payloads are bounded by short history windows so Hobby cost stays flat. | ✓ |
| Tiered cadence | Daily slower (e.g. 120s+), intraday at 60s. Less upstream traffic for data that barely changes, but two cadence paths to maintain. | |
| You decide | Let researcher measure payload sizes and let planner pick the cadence split. | |

**User's choice:** Same 60s all legs
**Notes:** Uniformity preferred over traffic micro-optimization.

---

## Hidden-tab / closed-market polling

| Option | Description | Selected |
|--------|-------------|----------|
| Pause when hidden/closed | Stop timers on hidden tab and over weekends/maintenance breaks. Saves Hobby upstream calls and matches the existing CLOSED status-strip semantics. | |
| Keep polling always | Poll regardless; serve-stale + CLOSED markers already handle closed-market honestly. Simpler code, no resume-edge bugs. | ✓ |
| You decide | Planner weighs Hobby budget against resume-edge complexity. | |

**User's choice:** Keep polling always
**Notes:** Simplicity wins; honesty already covered by serve-stale + CLOSED markers.

---

## Stagger visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Per-leg age visible | Status strip shows NQ 12s · ES 48s style ages. Research already calls for this pairing with SMT badges; Phase 6 lays the data groundwork even if §3 consumes it later. | ✓ |
| Envelope-only | Per-leg timestamps stay in the envelope/store for Phase 7+ selectors, but Phase 6 shows no new UI. Keeps this phase pure-backend. | |
| You decide | Planner decides how much of the freshness UI lands in this phase vs Phase 9. | |

**User's choice:** Per-leg age visible
**Notes:** Phase 6 lays the groundwork even though §3 consumes it later.

---

## Area checkpoint

**Question:** More questions about Poll orchestration, or move to next? (Remaining: NQ compatibility, Cache TTL policy, Coverage visibility)
**User's choice:** Next area

---

## Bare GET behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Byte-identical default | No params = NQ daily, exactly today's shape. Every existing consumer (store, tests, Vercel drill) keeps working with zero changes; new params are purely additive. | ✓ |
| Redirect to params | Bare GET redirects or maps to ?symbol=NQ=F&interval=1d internally. Same data, but the code path is unified — one path to maintain, slightly bigger blast radius. | |
| You decide | Planner picks based on how tangled the current route handler is. | |

**User's choice:** Byte-identical default
**Notes:** Core value is NQ correctness — zero-churn guarantee for the existing pipe.

---

## Cross-symbol fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Never substitute | ES failure serves ES last-good as stale or 502s; NQ data never fills an ES envelope. Cross-symbol substitution would corrupt every downstream SMT comparison silently. | ✓ |
| You decide | Planner confirms the failure contract per leg. | |

**User's choice:** Never substitute
**Notes:** Explicitly protects SMT integrity downstream.

---

## NQ anchor independence

| Option | Description | Selected |
|--------|-------------|----------|
| Fully independent | Range/bias/DOL/levels keep reading the NQ-only path exactly as today; the ES leg and timestamp join live in separate modules. Research explicitly warns never to trim NQ history to ES coverage. | ✓ |
| Shared parser, separate flow | One chart-JSON parser parameterized by symbol, but the NQ anchor computation itself is untouched. Less duplication, slightly wider touch on the Yahoo module. | |
| You decide | Researcher maps the duplication-vs-touch tradeoff in the actual code. | |

**User's choice:** Fully independent
**Notes:** Aligns with research warning against re-anchoring NQ to ES coverage.

---

## Invalid symbol handling

| Option | Description | Selected |
|--------|-------------|----------|
| 400, never forward | Strict allowlist (NQ=F, ES=F only); anything else gets 400 and is never forwarded to Yahoo. Blocks SSRF-adjacent abuse and cache poisoning per research. | ✓ |
| Fall back to NQ | Unknown symbol silently serves NQ daily. Forgiving for callers, but masks client bugs and widens the response contract. | |
| You decide | Planner picks the validation posture. | |

**User's choice:** 400, never forward
**Notes:** Security posture from research adopted directly.

---

## Area checkpoint

**Question:** More questions about NQ compatibility, or move to next? (Remaining: Cache TTL policy, Coverage visibility)
**User's choice:** Next area

---

## TTL tiering

| Option | Description | Selected |
|--------|-------------|----------|
| Uniform 60s | One TTL everywhere, same as v1.0 proven. Simplest to reason about and verify on the live URL; daily data just revalidates cheaply. | ✓ |
| Tiered TTL | Daily longer (e.g. 300s), intraday at 60s. Halves upstream calls for slow-moving data, but adds a TTL matrix the deploy-verify must cover per leg. | |
| You decide | Researcher estimates upstream volume per combo and planner picks. | |

**User's choice:** Uniform 60s
**Notes:** Proven v1.0 value kept; simplicity over traffic savings.

---

## Serve-stale ceiling

| Option | Description | Selected |
|--------|-------------|----------|
| Same 30 min all legs | One MAX_STALE everywhere. Intraday candles go stale fast semantically, but the honest STALE flag already communicates that — uniform rule, uniform verify. | ✓ |
| Shorter for intraday | Intraday refuses stale sooner (e.g. 5–10 min) since a 25-min-old 15M candle misleads more than a 25-min-old daily. More honest, but per-leg verify matrix. | |
| You decide | Planner weighs staleness semantics per interval. | |

**User's choice:** Same 30 min all legs
**Notes:** STALE flag carries the honesty burden, not the ceiling.

---

## Cache structure

| Option | Description | Selected |
|--------|-------------|----------|
| Shared map, composite keys | Keep the existing module-level Map, keyed by symbol:interval(:range). Least code churn; one leg's eviction logic can't silently diverge from the other's. | ✓ |
| Isolated per-leg caches | Separate Map (or module) per symbol so NQ and ES can never collide or evict each other. Stronger isolation, more scaffolding. | |
| You decide | Planner picks the cache structure that fits the parameterized module. | |

**User's choice:** Shared map, composite keys
**Notes:** Least churn on the proven cache module.

---

## CDN headers

| Option | Description | Selected |
|--------|-------------|----------|
| Same headers all legs | public, s-maxage=60, stale-while-revalidate=30 everywhere, matching v1.0. One verify path on the live URL. | ✓ |
| Vary by interval | Daily gets longer edge caching, intraday shorter. Saves edge egress, but Vercel Hobby edge behavior must be verified per combo. | |
| You decide | Planner decides during deploy-verify planning. | |

**User's choice:** Same headers all legs
**Notes:** Single verify path preferred.

---

## Area checkpoint

**Question:** More questions about Cache TTL policy, or move to next? (Remaining: Coverage visibility)
**User's choice:** Next area

---

## Coverage surface

| Option | Description | Selected |
|--------|-------------|----------|
| Envelope field + debug line | Coverage object rides in the envelope for selectors/support, plus a small §3-adjacent debug line during development. Production can collapse it, but the data is always there. | ✓ |
| Envelope only | Coverage stays in the data contract for Phase 7+ selectors; no UI surface in Phase 6. Keeps this phase backend-pure. | |
| You decide | Planner decides how much debug surface Phase 6 owns vs Phase 9. | |

**User's choice:** Envelope field + debug line
**Notes:** Data always present; production may collapse the line.

---

## Low-coverage policy

| Option | Description | Selected |
|--------|-------------|----------|
| Warn, keep joined rows | Join always returns the intersected rows plus coverage counts; downstream selectors (Phase 7) own the refuse/NO-SIGNAL call. Phase 6 reports honestly, never decides. | ✓ |
| Refuse below threshold | Join returns unavailable + reason when coverage < X% (e.g. 95%). Fails fast, but bakes a policy number into the data layer that Phase 7 might want to own. | |
| You decide | Researcher/planner places the threshold ownership. | |

**User's choice:** Warn, keep joined rows
**Notes:** Clean layering: data layer reports, selectors decide.

---

## Forming-candle enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Both layers | Parser flags forming:true as today; join drops forming rows before intersecting. Belt-and-suspenders: SMT can never see a self-updating candle even if one layer regresses. | ✓ |
| Join only | Parser keeps flagging, join owns exclusion. Single enforcement point, but a direct parser consumer could leak a forming candle. | |
| You decide | Planner places the enforcement boundary. | |

**User's choice:** Both layers
**Notes:** Defense in depth for the self-updating-signal hazard.

---

## Intraday timestamp shape

| Option | Description | Selected |
|--------|-------------|----------|
| UTC epochs for intraday | Intraday contract uses epoch-seconds UTC; D1 stays on business-day strings. Matches research + lightweight-charts expectations; session labels applied in Baku at render. | ✓ |
| Baku strings everywhere | One date representation across daily and intraday. Uniform, but session bucketing on strings is fragile across March/November DST. | |
| You decide | Researcher confirms the chart-library timestamp contract. | |

**User's choice:** UTC epochs for intraday
**Notes:** DST-safe session bucketing; D1 contract untouched.

---

## Final checkpoint

**Question:** We've discussed Poll orchestration, NQ compatibility, Cache TTL policy, Coverage visibility. Which gray areas remain unclear?
**User's choice:** I'm ready for context

---

## Claude's Discretion

No "You decide" selections — user decided every question directly.

## Deferred Ideas

None — discussion stayed within phase scope.
