---
phase: "08"
slug: "amd-sessions-asia-range-judas"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-07"
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| None crossed | Pure functions on caller-supplied candle arrays plus injected epochs; no I/O, no user input, no store — same posture as Phase 7 plans | N/A |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-08-01 | Tampering | asiaRange boundary (`src/lib/ict/asia.ts`) | medium | mitigate | `closedOnlyIntraday` first (`asia.ts:95`), then finite-OHLC + finite-positive-time + ordered-wicks drop (`asia.ts:96`); ascending sort + first-row-wins timestamp dedupe on copies (`asia.ts:101-107`); non-array input throws with echoed value (`asia.ts:92`) | closed |
| T-08-02 | Tampering | Session-date attribution (`src/lib/ict/asia.ts`) | low | mitigate | Per-candle IANA `America/New_York` resolution at call time with minute precision (`nyMinutesOf`, `asia.ts:54-55`); 20:00 inclusive / 00:00 exclusive edges pinned by `ASIA_START_NY_HOUR = 20` (`asia.ts:14,116`); WR-02 `assertValidSessionDate` rejects malformed/non-calendar dates at the boundary (`asia.ts:71-88`); DST triple-test green | closed |
| T-08-03 | Tampering | judasSwing boundary (`src/lib/ict/judas.ts`) | medium | mitigate | `closedOnlyIntraday` first (`judas.ts:118`), then finite-OHLC + finite-positive-time drop; Asia bounds asserted finite with positive height (`judas.ts:102-108`); `dispMult` asserted finite-positive (`judas.ts:111`); non-array input throws with echoed value (`judas.ts:97`); ascending sort + dedupe so sweep-first ordering holds | closed |
| T-08-04 | Tampering | Killzone clock edge (`src/lib/ict/judas.ts`) | low | mitigate | Strict inequality on both edges — `minutes <= 120 \|\| minutes >= 300` → preRun (`judas.ts:172`); per-candle minute-precision IANA resolution (`judas.ts:61-62`); pre-killzone sweeps return `preRun: true` with `candidate: false` and are never promoted (`judas.ts:170-176`); `preRun`/`candidate` mutually exclusive | closed |
| T-08-05 | Tampering | amdPhase input handling (`src/lib/ict/amd.ts`) | low | mitigate | No candle validation by design (consumes already-validated detector outputs); malformed judas envelope throws at the boundary (`amd.ts:126-152`: non-object, non-boolean flags, non-finite/non-positive sweepTime, non-object input, non-finite asOf); SMT direction read only when unsuppressed (`amd.ts:99-103`), `CORR_DECOUPLED`/rollover-week suppression passes through to the reason; SMT input never mutated; every branch emits a reason string; NY branch replaces reason wholesale, never guesses from clock (`amd.ts:167-171`) | closed |

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
| 2026-09-07 | 5 | 5 | 0 | secure-phase (State B, short-circuit: threats_open 0, plan-authored register, ASVS L1) |

Verification evidence (all re-checked live during audit):
- `npx vitest run src/lib/ict/asia.test.ts src/lib/ict/judas.test.ts src/lib/ict/amd.test.ts` → 3 files, 41 tests, all green
- `node scripts/judas-budget.ts` → `BUDGET confirmed=10/60 (16.7%)`, exit 0 (D-09 displacement seed holds)
- No `Date.now` in any phase module/test; no network/Yahoo/store imports in phase modules or budget script
- Code-review fixes WR-01–WR-06 (committed `8281042`–`ea8611d`) hardened the exact boundaries above: sweep priority, sessionDate reality check, inverted-OHLC drop, alias containment, judas envelope validation, DST-safe budget synthesis

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-07
