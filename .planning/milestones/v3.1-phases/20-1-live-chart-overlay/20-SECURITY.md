---
phase: "20"
slug: "1-live-chart-overlay"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-27"
---

# Phase 20 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| store leg to selectPools | stale, empty, thin NQ leg state crosses here into render | leg state (stale flags, candles) — freshness signals |
| caller array to pool-prose and pool-overlay | untrusted pool arrays with non-finite top and bottom cross here | pool geometry (top/bottom bounds) — untrusted numerics |
| caller array to pool-overlay | untrusted pool arrays with non-finite bounds cross here | pool geometry — untrusted numerics |
| store leg to chart props | stale, thin, null, STAND_ASIDE states cross here onto canvas | overlay state flags — render-state signals |
| store leg to section 1 | stale, empty, thin, null NQ leg states cross here into prose | prose state flags — render-state signals |
| selector reason to sentence | verbatim Azerbaijani reason crosses here into Heading prose | selector prose (verbatim, trusted source) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-20-01 | Information Disclosure (honesty) | report section 1 rank-1 sentence | high | mitigate | Skeleton on null envelope (`lastUpdatedISO === null` → pulse rows); null selector renders `Məlumat yoxdur` only, never cached pools; pinned in pool-prose.test; UAT-1 live-verified (skeleton pulse rows + stale-verbatim path) | closed |
| T-20-02 | Denial of Service (render crash) | pool-overlay price creation | high | mitigate | Finite guard naming poolPriceLines (`isFiniteNumber` top/bottom throw); per-leg try-catch nulls only that ref; null/empty input yields zero lines; chart never blocks; pinned in pool-overlay.test; full suite 480/480 green | closed |
| T-20-03 | Tampering | pool-overlay cap and rank | high | mitigate | Cap counts ACTIVE only (max 8 lines, 2-per-side), ghosts ride outside the cap; rank from input ranked order; `withoutGhosts` helper; pinned in pool-overlay.test; UAT-5 canvas glance verified titles BSL-1/2, SSL-1 | closed |
| T-20-04 | Information Disclosure (honesty) | chart stale, thin, null, STAND_ASIDE paths | high | mitigate | Stale/thin force MUTED_GRAY (#71717A) with 0.5 dim discipline; null removes ALL lines (unconditional-removal); STAND_ASIDE skips ghosts via `withoutGhosts`; pinned in pool-overlay.test; UAT-2 live-verified (stale: span absent + STALE badge + verbatim error) | closed |
| T-20-05 | Information Disclosure (honesty) | section 1 empty and degraded states | high | mitigate | Distinct no-pools (`Aktiv hovuz yoxdur — …`) vs stale-verbatim vs thin-dimmed (`opacity-45` + note) vs null-empty copy; verbatim lastError never paraphrased; pinned in pool-prose.test; UAT-3 live-verified stale-verbatim branch | closed |
| T-20-06 | Information Disclosure (overclaim) | rank-1 sentence hedge and banned reuse | high | mitigate | Hedge fragment inline in sentence, no footer element (grep-clean); banned pool-gated FIRE / exact stop-price / heatmap / LLM strings asserted absent; pinned in pool-prose.test; UAT-4 wrap check passed, no footer in DOM | closed |
| T-20-SC | Tampering | npm/pip/cargo installs | high | mitigate | No new packages in any of the 3 plans — own-code plus installed lightweight-charts only; no install step; package.json/package-lock.json unchanged on this branch (branch diff empty) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-27 | 7 | 7 | 0 | gsd-verify-work secure-phase (ASVS L1 grep-depth + live UAT evidence) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-27
