---
phase: "06"
slug: "dual-symbol-proxy-data-contracts"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-06"
validated: "2026-09-08"
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from 06-RESEARCH.md ## Validation Architecture (2026-09-06).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^5.0.0 |
| **Config file** | `vitest.config.ts` (`include: ['src/**/*.test.ts', 'app/**/*.test.ts']`, `testTimeout: 15000`) |
| **Quick run command** | `npx vitest run src/lib/yahoo.test.ts src/lib/store.test.ts` |
| **Full suite command** | `npm test` (must stay 133/133 green baseline + new tests) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched-file>.test.ts` (targeted file plus `join.test.ts` when contracts change)
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01 | 06-01 | 1 | DATA-04 | T-06-01 | Unknown `?symbol=` → 400, never forwarded to Yahoo; cache key from allowlisted value only | unit | `npx vitest run app/api/yahoo/route.test.ts src/lib/yahoo.test.ts` | ✅ | ✅ green (7 route + 23 yahoo tests) |
| 06-01 | 06-01 | 1 | DATA-04 | T-06-02 | Error payload never cached; last-good served stale or 502 | unit | `npx vitest run app/api/yahoo/route.test.ts` | ✅ | ✅ green (honest-502 test pins shape) |
| 06-02 | 06-02 | 2 | DATA-05 | — | Intraday parser emits epoch contract; forming flagged; incomplete pre-join rows dropped | unit | `npx vitest run src/lib/ict/join.test.ts src/lib/yahoo.test.ts` | ✅ | ✅ green (join 6 + intraday parser tests) |
| 06-04 | 06-04 | 3 | DATA-06 | T-06-03 | One leg's failure marks only that leg stale; no merged `stale` boolean; timers fire independently | unit + integration | `npx vitest run src/lib/store.test.ts` | ✅ | ✅ green (stagger + independent-failure + stale-refusal tests) |
| 06-03 | 06-03 | 2 | DATA-07 | — | Inner-join on timestamp only; misaligned fixture joins with exact `dropped` count; D1 NQ anchor tests untouched | unit | `npx vitest run src/lib/ict/join.test.ts src/lib/ict/range.test.ts` | ✅ | ✅ green (misaligned fixture + zero diff on range.ts) |
| 06-05 | 06-05 | 3 | DATA-04/05 | — | Interval dispatch 1d→fetchSymbol, 1h/15m→fetchIntraday after allowlist guards | unit | `npx vitest run app/api/yahoo/route.test.ts` | ✅ | ✅ green (2 intraday route tests pin dispatch) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Cross-cutting gates (every plan): `npm test` full green; `npx tsc --noEmit` no-new-errors (pre-existing `app/layout.tsx` LayoutProps error is noted residual — do not fix or worsen); `grep -rn "Date.now\|new Date()" src/lib/ict` clean for new join code (purity); `isValidEnvelope`-style guard rejects malformed per-leg payloads.

---

## Wave 0 Requirements

- [x] `src/lib/ict/join.test.ts` — covers DATA-07 + DATA-05 join side (misaligned fixture, forming-drop, coverage counts, warn-never-refuse) — 6 tests green
- [x] `src/lib/__fixtures__/es-daily.json` + `intraday-1h.json` + `join-misaligned.json` — cover DATA-04/DATA-05/DATA-07 (synthetic Yahoo payloads; live-probe density informs sizes, fixtures stay hand-built) — consumed by green tests
- [x] `src/lib/yahoo.test.ts` extensions — cover DATA-04 (allowlist 400s, per-combo keys, per-key singleflight, NQ default byte-identical) — 23 tests green
- [x] `src/lib/store.test.ts` extensions — cover DATA-06 (dual timers, independent failure, per-leg ages) — green incl. stagger + stale-refusal tests
- [x] Live-probe task (manual, not a test file) — covers A1/A2: hit real Yahoo for ES=F 1h/15m density, paste row counts, pin ranges (`RANGE_FOR_INTERVAL` in `src/lib/yahoo.ts`). **No unit test may hit Yahoo.**

*(Existing `src/lib/yahoo.test.ts`, `src/lib/store.test.ts`, `src/lib/ict/range.test.ts`, `src/lib/time.test.ts` already cover the v1.0 baseline and must stay green.)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ES=F 1H/15M live row density + truncation behavior; pin `range` values | DATA-05 (A1/A2) | Requires live Yahoo upstream; unit tests must never hit network | Run dev-script against real Yahoo `ES=F` at `1h`/`3mo` and `15m`/`1mo`; paste returned row counts into plan/verification log; pin `range` from observed data |
| Bare `GET /api/yahoo` byte-identical NQ daily shape vs v1.0 | DATA-04 | Byte-identity is a diff judgment, not an assertion | Diff bare-GET response body against v1.0 NQ daily fixture; confirm identical |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** granted (retroactive reconcile, 2026-09-08)

---

## Validation Audit 2026-09-08

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 (no new tests needed — all COVERED) |
| Escalated | 0 |

State A reconcile: VALIDATION.md was seeded by plan-phase (`status: draft`) but never reconciled. Retroactive audit maps all 5 Wave-0 rows to executed plans 06-01..06-05 and green suites (route 7 + yahoo 23 + join 6 tests, plus store stagger/refusal coverage). No auditor subagent spawned — zero gaps per workflow §3. Frontmatter set to `status: validated`, `nyquist_compliant: true`, `wave_0_complete: true`. No impl files touched.
