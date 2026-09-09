---
phase: "12"
slug: "deployment-hygiene"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-09"
---

# Phase 12 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Short-circuit path (Step 3): threats_open 0 at plan time, register authored at plan time, ASVS L1 — no auditor spawn, L1 grep-depth sufficient. All mitigations evidenced in 12-01/12-02/12-03 SUMMARYs and independently re-run by the verifier (12-VERIFICATION.md 8/8).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| agent-shell→repo worktree | Trusted local read-only scan; grep output is evidence, never executed | Gate outputs (public) |
| git-history→token strings | Committed history is untrusted input for secret traces; pickaxe reads it without checking anything out | Historical diffs (scanned, never executed) |
| agent→production URL | Unauthenticated curl baseline plus kept-script re-proof; response codes/evidence only, no credentials cross here | HTTP responses (public prod) |
| user-browser→Vercel dashboard | Account-holder-only surface; agent never touches it, proof arrives as readback plus trusted deletion confirmation | Deletion confirmation + protection strings (user-transcribed) |
| user-shell-history→agent record | Per-machine history outside agent reach; user output transcribed, never asserted clean by the agent | History check output (user-transcribed) |
| 12-02-SUMMARY→PROJECT.md | User-confirmed evidence transcribed verbatim; agent adds no claim beyond what the confirmations state | Confirmed strings (verbatim) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-12-01 | Information Disclosure | Drill-automation Vercel token remnant in worktree or history | high | mitigate | Strict tier-(a) worktree gate CLEAN (12-01, verifier re-ran) + token pickaxe empty outside .planning + user `token deleted 2026-09-09` (12-02) | closed |
| T-12-02 | Information Disclosure | Deployment Protection left disabled, previews openly reachable | high | mitigate | Standard Protection + Vercel Authentication readback (12-02) + post-change kept scripts green unauthenticated (12-03, verifier re-ran) | closed |
| T-12-03 | Elevation of privilege | Bypass secret created instead of Vercel login | medium | mitigate | D-02 rejects bypass-secret at the boundary; checkpoint instructions named Vercel Authentication explicitly; readback confirms method `Vercel Authentication`, no secret created | closed |
| T-12-04 | Tampering | Deleted drill-preview branch resurrected or stale ref trusted | medium | mitigate | Authoritative ls-remote only `refs/heads/main` + show-ref NO-DRILL-REFS (12-01, verifier re-ran); branch -r never trusted alone | closed |
| T-12-05 | Repudiation | Undocumented protection or token state drifts back unnoticed | medium | mitigate | One dated PROJECT.md row naming scope, method, deletion date, branch state (12-03, verifier confirmed line 98) | closed |
| T-12-SC | Tampering | npm/pip/cargo installs | low | accept | No installs in this phase; git/grep/curl/node/bash only, no legitimacy checkpoint required | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-12-01 | T-12-SC | No package installs in this phase; preinstalled git/grep/curl only — supply-chain surface untouched | phase plan (D-06 context) | 2026-09-09 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-09 | 6 | 6 | 0 | orchestrator (short-circuit L1, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-09
