# Phase 1 — External API Coverage: Yahoo Finance v8 Chart

**Scope:** Phase 1 integrates exactly one external API: the Yahoo Finance v8 chart endpoint (unofficial, undocumented since 2017).
**Default disposition:** INTEGRATE. Every OPT-OUT carries a one-line reason.
**Locked constraint:** D-01 — proxy serves fixed `NQ=F` daily only; request URL is a constant, no caller params parsed (SSRF killed by construction).

## Capability Matrix

| Capability | Disposition | Plan | Notes |
|------------|-------------|------|-------|
| Chart endpoint `v8/finance/chart/NQ=F` with `period1`/`period2` unix + `interval=1d` | INTEGRATE | 01-01 (direct fetch + parse), 01-03 (failover/backoff) | Absolute timestamps (182-day window), never relative `range=` |
| `events=history` param | INTEGRATE | 01-01 | Standard history param; harmless if ignored upstream |
| query1 → query2 host failover (alternate hosts across attempts) | INTEGRATE | 01-03 | 429/5xx/network/soft-throttle fail over; other 4xx fail over once then throw |
| Browser UA + `Accept` + `Accept-Language` + `Referer` header set | INTEGRATE | 01-01 | Default fetch UA gets throttled; headers are fixed constants |
| `meta` fields for `contractHint` (`symbol`, `exchangeName`, `exchangeTimezoneName`) | INTEGRATE | 01-01 (defensive pick), 01-03 (rollover hint) | Parsed defensively with fallback; dev must log one live `meta` sample to lock picks without changing the type |
| Retry-After honoring (seconds or HTTP-date, cap 10s) + 500ms→1s→2s jittered backoff | INTEGRATE | 01-03 | Retryable: 429/5xx/network/soft-throttle-in-200 only |
| 60s TTL cache + singleflight + serve-stale + 502 honesty chain | INTEGRATE | 01-03 | Validate-before-store; errors never cached; 502 carries `no-store` |
| `adjclose` indicator array | OPT-OUT | — | D-08 forbids adjusted closes for futures; parser must never read the array so contract rolls stay visible as gaps |
| Multi-symbol / range query params on the proxy | OPT-OUT | — | D-01 locks fixed `NQ=F` daily; multi-symbol is PROD-01 (v2) |
| Cookie/crumb flow | OPT-OUT | — | Crumb issues belong to v7 quote/download endpoints, not v8 chart; on a 401 treat as retryable-on-fallback-host once, then stale/502 |
| Intraday intervals / `includePrePost` semantics | OPT-OUT | — | Phase 1 is D1 daily only; param sent as inert default, never consumed |

## Manual-Only Verifications (upstream drift)

Automated tests mock fetch, so two behaviors can only be proven against live Yahoo in dev: (1) a real v8 response parses through the shape-guard (`curl` local `GET /api/yahoo`, confirm `source:'live'` + ~6mo D1 candles); (2) the logged live `meta` object matches the `contractHint` field picks. Both are recorded in 01-VALIDATION.md and asserted as plan tasks where automatable.
