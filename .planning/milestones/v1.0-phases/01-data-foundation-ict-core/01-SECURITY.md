---
phase: "01"
slug: "data-foundation-ict-core"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-05"
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| yahoo-upstream to proxy | Untrusted upstream JSON crosses here and must pass shape-guard before cache or envelope | Untrusted JSON, throttle signals, Retry-After values |
| proxy-cache to envelope | Only validated payloads enter the 60-second Map; failures bypass the cache and surface as stale or 502 | Validated candles; UpstreamError on failure |
| proxy to ict-math | Only validated closed candles plus explicit asOf date enter these pure modules | Closed candles, asOf date string |
| ict-math to phase-2-selectors | Range bias DOL regime rollover outputs leave here as typed data plus rationale strings | Typed outputs, deterministic English rationale |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Tampering | src/lib/yahoo.ts parseChartJson | high | mitigate | chart.error checked before result; symbol match + ascending dates + complete OHLC validated; UpstreamError on drift; failures never cached (yahoo.ts:52-110) | closed |
| T-01-02 | Denial of Service | src/lib/yahoo.ts fetchNQDaily + HOSTS | high | mitigate | Browser UA + Accept + Referer constants; query1 primary + query2 fallback hosts; jittered backoff + singleflight completed in 01-03 (yahoo.ts:144-145,155,290-313) | closed |
| T-01-03 | Tampering | app/api/yahoo/route.ts envelope | high | mitigate | Validate-before-store only; success carries honest stale:false source:live; cold failure returns 502 with no-store + Retry-After 60 (route.ts:6-21); proven live via curl (source:live, ~130 candles) | closed |
| T-01-SC | Tampering | npm installs | high | mitigate | Only vitest 5.0.0 installed (approved legitimacy audit, no postinstall script — verified absent in package.json); date-fns/date-fns-tz/vite restored --no-save, manifests untouched | closed |
| T-02-01 | Tampering | src/lib/ict/range.ts + levels.ts | medium | mitigate | Close-only re-anchor (checkReanchor, range.ts:36), forming exclusion, zero-width 0.5 guard (range.ts:30); proven by range + levels suites | closed |
| T-02-02 | Tampering | src/lib/ict/rollover.ts | high | mitigate | Strict greater-than 3xATR tripwire (ROLLOVER_ATR_MULT=3, rollover.ts:4,43) with flag-and-continue; adjclose array never parsed (zero hits in src) | closed |
| T-02-03 | Information Disclosure | src/lib/ict/bias.ts + dol.ts + regime.ts rationale | low | accept | Rationale strings are deterministic English rule traces with no upstream payload echo (bias.ts:13-30); output honesty outweighs negligible fingerprinting surface | closed |
| T-02-SC | Tampering | npm installs | low | accept | No package installs in plan 01-02; vitest toolchain approved in 01-01 | closed |
| T-03-01 | Tampering | src/lib/yahoo.ts cache gate | high | mitigate | Validate-before-store on symbol + ascending + complete OHLC + minimum 5 candles (yahoo.ts:184); errors never stored; 502 carries no-store; proven by null + resilience suites (13 tests) | closed |
| T-03-02 | Denial of Service | src/lib/yahoo.ts fetch path | high | mitigate | 500/1000/2000ms jittered backoff (yahoo.ts:145), Retry-After capped at 10s (yahoo.ts:144,173), 8s abort timeout, singleflight dedupe (yahoo.ts:290-313), 60s TTL; non-429 4xx fail over once then throw (yahoo.ts:303) | closed |
| T-03-03 | Spoofing | src/lib/time.ts Baku bucketing | medium | mitigate | Single IANA Asia/Baku rule via formatInTimeZone with injected clock, no hand offsets (time.ts:3,7); March + November + midnight suites green (11/11) | closed |
| T-03-SC | Tampering | npm installs | low | accept | No installs in plan 01-03; toolchain approved in 01-01 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-01 | T-02-03 | Rationale strings are deterministic rule traces with no payload echo; fingerprinting surface negligible vs output-honesty value | plan 01-02 threat model | 2026-09-05 |
| R-02 | T-02-SC | No installs in plan 01-02; toolchain already approved in 01-01 | plan 01-02 threat model | 2026-09-05 |
| R-03 | T-03-SC | No installs in plan 01-03; toolchain already approved in 01-01 | plan 01-03 threat model | 2026-09-05 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-05 | 12 | 12 | 0 | secure-phase (L1 grep-depth, short-circuit: threats_open 0 + plan-time register + ASVS L1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-05
