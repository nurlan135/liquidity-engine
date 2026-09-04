---
phase: "1"
slug: "data-foundation-ict-core"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-04"
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
| 1-W0-01 | 01 | 0 | infra | — | N/A | install/config | `npx vitest run src/lib/time.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-01 | TBD | TBD | DATA-01 | T-1-01 | Validate-then-cache; errors never stored | unit (fetch mocked) | `npx vitest run src/lib/yahoo.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | TBD | TBD | DATA-02 | T-1-01 | Failover q1→q2; backoff honors Retry-After; stale-serve; 502 no-store | unit (mock fetch sequences) | `npx vitest run src/lib/yahoo.test.ts -t "resilience"` | ❌ W0 | ⬜ pending |
| 1-02-01 | TBD | TBD | ICT-01/02/03 | — | N/A (pure math) | unit (synthetic candles) | `npx vitest run src/lib/ict/` | ❌ W0 | ⬜ pending |
| 1-02-02 | TBD | TBD | ICT-04/05/06 | — | N/A (pure math) | unit | `npx vitest run src/lib/ict/bias.test.ts src/lib/ict/dol.test.ts src/lib/ict/regime.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-03 | TBD | TBD | ICT-07 | T-1-02 | Raw OHLC only — adjclose never parsed | unit (synthetic gap) | `npx vitest run src/lib/ict/rollover.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-01 | TBD | TBD | STATE-02 | — | N/A (pure time) | unit (injected clock + fake timers) | `npx vitest run src/lib/time.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-03 | TBD | TBD | DATA-01 edge | T-1-01 | Null rows dropped, never cached as valid | unit (JSON fixture) | `npx vitest run src/lib/yahoo.test.ts -t "null"` | ❌ W0 | ⬜ pending |
| 1-02-04 | TBD | TBD | D-04 | — | Forming row excluded from all ict outputs | unit | `npx vitest run src/lib/ict/range.test.ts -t "forming"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Threat refs: T-1-01 = cache poisoning via error payloads / soft-throttle misread as success (validate-before-store, `no-store` on 502, `chart.error` check before `chart.result`); T-1-02 = rollover-gap corruption absorbed silently (3×ATR tripwire, flag-and-continue).

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — node env, `@` alias, `src/**/*.test.ts` + `app/**/*.test.ts` includes
- [ ] `npm install -D vitest` + `test` / `test:watch` scripts in package.json
- [ ] `src/lib/__fixtures__/yahoo-null.json` — realistic Yahoo JSON with mid-array null run
- [ ] `src/lib/yahoo.ts` + `src/lib/yahoo.test.ts` (resilience + null-row suites)
- [ ] `src/lib/time.ts` + `src/lib/time.test.ts` (March/November DST + midnight-boundary)
- [ ] `src/lib/ict/{types,range,levels,bias,dol,regime,rollover}.ts` + co-located `*.test.ts`
- [ ] `app/api/yahoo/route.ts` — thin envelope passthrough (logic tested at lib level)

Fixture strategy: synthetic candle builders (`mkCandles(n, startPrice, drift)`) for math; one realistic Yahoo JSON fixture with mid-array null run for the parser; one 250pt-gap fixture for rollover; DST instants as literal ISO strings. No network in tests — `fetch` and `setTimeout` injected; `vi.useFakeTimers` for backoff assertions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Yahoo v8 response parses through shape-guard | DATA-01 | Fixture may drift from upstream schema; automated tests mock fetch | In dev, `curl` the local `GET /api/yahoo`, confirm `source:'live'` + 6mo D1 candles; log a sample `meta` object to lock `contractHint` field picks |
| `contractHint` fields match real `meta` payload | ICT-07 | Upstream `meta` shape is MEDIUM-confidence until observed | Compare logged `meta` against parser picks (`symbol`, `exchangeName`); adjust without changing the type |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
