---
phase: "07-smt-4h-1h-sequencing-math"
slug: "smt-4h-1h-sequencing-math"
status: verified
threats_open: 0
asvs_level: 1
created: "2026-09-07"
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Yahoo D1 rows → evaluateSMT | Untrusted numeric OHLC crosses here; nulls and spikes possible | OHLC floats, untrusted |
| evaluateSMT → Phase 8/9 selectors | Suppressed envelopes carry reason strings rendered verbatim | Reason strings, internal |
| NQ D1 rows → detectFVGs | Untrusted numeric OHLC crosses here; nulls possible | OHLC floats, untrusted |
| TransitionState → Phase 9 §2 prose | Sentence builder output rendered into the report | Prose sentences, internal |
| 1H epoch rows → aggregate1Hto4H | Untrusted numeric OHLC plus timestamps cross here | OHLC floats + epoch ms, untrusted |
| 4H blocks → computeRange / computeBias | Emitted blocks feed existing math unchanged | Candle structs, internal |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-07-01 | Tampering | evaluateSMT / pearsonCorr (smt.ts) | medium | mitigate | Non-finite OHLC rows dropped at module boundary (`hasFiniteOhlc`, smt.ts:83-86); bad toleranceBps throws with echoed value; non-finite correlation converts to CORR_DECOUPLED suppression (smt.ts:232-233), never divides or propagates NaN | closed |
| T-07-02 | Tampering | evaluateSMT cross-leg compare (smt.ts) | medium | mitigate | Raw OHLC plus basis-point compare only; no adjusted-close in the SMT lane (comment guard smt.ts:196, adjclose grep clean) so roll gaps stay visible | closed |
| T-07-01 | Tampering | detectFVGs / detectTransition (fvg.ts) | medium | mitigate | Non-finite OHLC rows dropped at boundary (fvg.ts:22-25); fail-fast throw with echoed value on bad input; sweep-alone never flips state so a single bad wick cannot whiplash §2 prose | closed |
| T-07-03 | Denial of Service | Active FVG map growth (fvg.ts) | low | mitigate | Hard bound FVG_MAP_BOUND 20 applied after every update (fvg.ts:110); 200-bar fixture asserts length cap | closed |
| T-07-01 | Tampering | aggregate1Hto4H boundary (aggregate.ts) | medium | mitigate | closedOnlyIntraday first, then finite-OHLC drop (aggregate.ts:20-23), ascending sort, timestamp dedupe keeping the first row (aggregate.ts:104-108); non-finite input never reaches aggregation | closed |
| T-07-04 | Tampering | Block timestamp ordering (aggregate.ts) | low | mitigate | Input sorted ascending before grouping (aggregate.ts:104) and output emitted in key order; out-of-order rows cannot misattribute first-open or last-close | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-07 | 6 | 6 | 0 | orchestrator (L1 grep-depth, short-circuit: threats_open 0 + plan-time register + ASVS L1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-07
