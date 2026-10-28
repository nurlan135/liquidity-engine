---
phase: "21"
slug: "execution-polish"
status: verified
threats_open: 0
asvs_level: 2
created: "2026-10-28"
---

# Phase 21 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| D1 candles to ticket math | ATR value crosses here into SL and TP geometry | ATR number / derived indicator |
| ticket output to panel and report | buffered numbers cross here into operator prose | SL/TP/RR display numbers |
| pools selector to harness | pools data versus null crosses here into the on and off modes | pools arrays / test-only |
| harness verdicts to CI | equality proof crosses here as the D-17 lock evidence | toEqual assertions / test-only |
| firingLog array to strip | live verdict entries cross here into operator copy | firing-log entries / live store array |
| localStorage value to store | persisted operator threshold crosses here through validate-on-read | display number 1..7 |
| selector copy to report | verbatim Azerbaijani band copy crosses here into Body prose | locked UI literals |
| shadcn registry to components/ui | generated primitive code crosses here into the repo | generated TSX / own-code reviewed |
| slider drag to store | operator threshold crosses here through clamp-on-write | display number 1..7 |
| localStorage to control | persisted value crosses here through validate-on-read | display number 1..7 |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-21-01 | Tampering | resolveSL/resolveTP buffer shift | medium | mitigate | `bufferOf` + 0.25x pins, SL beyond extreme, TP inside, null guards re-applied; R/R-edge flips STAND ASIDE (ticket.ts:260-285, ticket.test.ts:233-305) | closed |
| T-21-02 | Information Disclosure (overclaim) | buffered levels as predictions | medium | mitigate | No new reason strings; TP never magnetized to extreme; projection hedge honesty (ticket.ts:85-93,292-318; ticket.test.ts reason pins) | closed |
| T-21-03 | Tampering | parity harness vacuous pass | medium | mitigate | Non-empty on-mode assertion + independent recompute + toEqual on all three verdicts (pools-parity.test.ts:231-309) | closed |
| T-21-04 | Information Disclosure (overclaim) | color pin token drift | low | mitigate | Exact globals.css dark lines, case-normalized comparison — token change fails loudly (pool-overlay.test.ts:156-174; globals.css:122-123) | closed |
| T-21-05 | Tampering | localStorage threshold hydration | medium | mitigate | `readFireThreshold` finite-integer-in-band else default, never throws; lazy-useState hydrate, try-caught SSR guard (store.ts:491-497; threshold-control.tsx:28-39; store.test.ts:1737-1780). Live browser-confirmed: corrupt "zzz"→4, OOB 99→4 fallback | closed |
| T-21-06 | Information Disclosure (stale-as-current) | fire-rate strip over cached counts | medium | mitigate | Live store array every render, honest-empty copy, no cache layer (fire-rate.ts:39-76; report.tsx:121-122,346-349; fire-rate.test.ts empty/below/non-finite pins) | closed |
| T-21-07 | Tampering | slider install supply chain + value injection | medium | mitigate | Generated file vs button idiom, no Radix peer, empty lockfile diff; clamp-on-write + validate-on-read (slider.tsx:1,19-45; T-21-05 pins close the value path) | closed |
| T-21-SC | Tampering | npm/pip/cargo installs | high | mitigate | No new packages across all four plans; `@base-ui/react` pre-exists; package.json/package-lock.json diff empty; 21-04 legitimacy gate satisfied | closed |

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
| 2026-10-28 | 8 | 8 | 0 | gsd-security-auditor (ASVS L2) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-28

