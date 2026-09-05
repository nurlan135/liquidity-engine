---
phase: "1"
slug: "data-foundation-ict-core"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-04"
validated: "2026-09-05"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from 01-RESEARCH.md Validation Architecture (2026-09-04).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.0 (new devDependency — Wave 0 installs) |
| **Config file** | `vitest.config.ts` (new — node env, `@` alias, `src/**/*.test.ts` + `app/**/*.test.ts`) |
| **Quick run command** | `npx vitest run <touched-file>` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds (pure functions only, no network — all fetch mocked) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched-module>` (targeted, <5s)
- **After every plan wave:** Run `npx vitest run` (full suite)
- **Before `/gsd-verify-work`:** Full suite green + `npx tsc --noEmit` + `npm run lint`
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-W0-01 | 01-01 | 1 | infra | — | N/A | install/config | `node node_modules/vitest/vitest.mjs run` | ✅ | ✅ green (9 files, 67/67) |
| 1-01-01 | 01-01 | 1 | DATA-01 | T-01-01 | Validate-then-cache; errors never stored | unit (fetch mocked) | `node node_modules/vitest/vitest.mjs run src/lib/yahoo.test.ts src/lib/tracer.test.ts` | ✅ | ✅ green |
| 1-01-02 | 01-03 | 2 | DATA-02 | T-03-02 | Failover q1→q2; backoff honors Retry-After; stale-serve; 502 no-store | unit (mock fetch sequences) | `node node_modules/vitest/vitest.mjs run src/lib/yahoo.test.ts -t "resilience"` | ✅ | ✅ green (12 tests) |
| 1-02-01 | 01-02 | 2 | ICT-01/02/03 | T-02-01 | N/A (pure math) | unit (synthetic candles) | `node node_modules/vitest/vitest.mjs run src/lib/ict/levels.test.ts src/lib/ict/range.test.ts` | ✅ | ✅ green (11 tests) |
| 1-02-02 | 01-02 | 2 | ICT-04/05/06 | T-02-03 | N/A (pure math) | unit | `node node_modules/vitest/vitest.mjs run src/lib/ict/bias.test.ts src/lib/ict/dol.test.ts src/lib/ict/regime.test.ts` | ✅ | ✅ green |
| 1-02-03 | 01-02 | 2 | ICT-07 | T-02-02 | Raw OHLC only — adjclose never parsed | unit (synthetic gap) | `node node_modules/vitest/vitest.mjs run src/lib/ict/rollover.test.ts` | ✅ | ✅ green |
| 1-03-01 | 01-03 | 2 | STATE-02 | T-03-03 | N/A (pure time) | unit (injected clock) | `node node_modules/vitest/vitest.mjs run src/lib/time.test.ts` | ✅ | ✅ green (11 tests) |
| 1-01-03 | 01-03 | 2 | DATA-01 edge | T-03-01 | Null rows dropped, never cached as valid | unit (JSON fixture) | `node node_modules/vitest/vitest.mjs run src/lib/yahoo.test.ts -t "null"` | ✅ | ✅ green (exact 8-candle set) |
| 1-02-04 | 01-02 | 2 | D-04 | — | Forming row excluded from all ict outputs | unit | `node node_modules/vitest/vitest.mjs run src/lib/ict/range.test.ts` | ✅ | ✅ green (forming test, range.test.ts:65) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Threat refs: T-1-01 = cache poisoning via error payloads / soft-throttle misread as success (validate-before-store, `no-store` on 502, `chart.error` check before `chart.result`); T-1-02 = rollover-gap corruption absorbed silently (3×ATR tripwire, flag-and-continue).

---

## Wave 0 Requirements

- [x] `vitest.config.ts` — node env, `@` alias, `src/**/*.test.ts` + `app/**/*.test.ts` includes
- [x] `npm install -D vitest` + `test` / `test:watch` scripts in package.json
- [x] `src/lib/__fixtures__/yahoo-null.json` — realistic Yahoo JSON with mid-array null run
- [x] `src/lib/yahoo.ts` + `src/lib/yahoo.test.ts` (resilience + null-row suites)
- [x] `src/lib/time.ts` + `src/lib/time.test.ts` (March/November DST + midnight-boundary)
- [x] `src/lib/ict/{types,range,levels,bias,dol,regime,rollover}.ts` + co-located `*.test.ts`
- [x] `app/api/yahoo/route.ts` — thin envelope passthrough (logic tested at lib level)

Fixture strategy: synthetic candle builders (`mkCandles(n, startPrice, drift)`) for math; one realistic Yahoo JSON fixture with mid-array null run for the parser; one 250pt-gap fixture for rollover; DST instants as literal ISO strings. No network in tests — `fetch` and `setTimeout` injected; `vi.useFakeTimers` for backoff assertions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Yahoo v8 response parses through shape-guard | DATA-01 | Fixture may drift from upstream schema; automated tests mock fetch | In dev, `curl` the local `GET /api/yahoo`, confirm `source:'live'` + 6mo D1 candles; log a sample `meta` object to lock `contractHint` field picks — **PROVEN 2026-09-05 during UAT: live curl returned `source:live`, `stale:false`, ~130 candles Mar→Sep** |
| `contractHint` fields match real `meta` payload | ICT-07 | Upstream `meta` shape is MEDIUM-confidence until observed | Compare logged `meta` against parser picks (`symbol`, `exchangeName`); adjust without changing the type — **PROVEN 2026-09-05 during UAT: live `contractHint` = `"NQ=F · CME"`** |

*All other phase behaviors have automated verification. Both manual-only items were proven live during UAT (01-UAT.md test 2).*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-09-05

---

## Validation Audit 2026-09-05

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Full suite: 9 files, 67/67 green. All 9 Per-Task Map rows COVERED by existing tests. Both manual-only items proven live during UAT. No auditor spawn needed; no new test files generated.
