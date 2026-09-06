---
phase: 01-data-foundation-ict-core
plan: 01
subsystem: data-foundation
tags: [yahoo-proxy, ict-core, vitest, tracer, baku-time]
dependency_graph:
  requires: []
  provides: [vitest-harness, canonical-ict-types, baku-time-util, yahoo-fetch-parse, range-anchor-math, yahoo-route]
  affects: [01-02, 01-03]
tech_stack:
  added: [vitest-5.0.0-dev]
  patterns: [tracer-slice, pure-ict-functions, injected-clock, validate-before-store]
key_files:
  created:
    - vitest.config.ts
    - src/lib/ict/types.ts
    - src/lib/time.ts
    - src/lib/yahoo.ts
    - src/lib/ict/range.ts
    - src/lib/tracer.test.ts
    - app/api/yahoo/route.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "vitest 5.0.0 installed with --legacy-peer-deps: peerOptional @types/node ^22||>=24 conflicts with scaffold @types/node ^20; types-only conflict, no runtime impact"
  - "date-fns 4.4.0 + date-fns-tz 3.2.0 + vite 8.2.2 restored on disk via --no-save after npm prune: RESEARCH documents them as installed-but-unwired ground truth; manifests untouched per plan's single-approved-package rule"
metrics:
  duration: ~25 min
  completed: 2026-09-05
status: complete
actuals:
  tokens: 12000
  tasks: 3
  commits: 3
---

# Phase 01 Plan 01: Tracer Slice Summary

Mocked 25-candle NQ=F Yahoo payload flows through fetch, shape-guard, envelope, and 20-candle range math to correct high/low/eq with zero network calls.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Establish vitest harness and canonical ICT types | 1545cb4 | vitest.config.ts, package.json, package-lock.json, src/lib/ict/types.ts |
| 2 | End-to-end NQ=F fetch validate envelope range | 4f519ec | src/lib/time.ts, src/lib/yahoo.ts, src/lib/ict/range.ts, src/lib/tracer.test.ts |
| 3 | Thin Yahoo route passthrough with honest cache headers | 1729691 | app/api/yahoo/route.ts |

## Key Decisions

- vitest 5.0.0 installed with `--legacy-peer-deps` (peerOptional `@types/node` major conflict with scaffold's `@types/node@20`; types-only, no runtime impact).
- `date-fns` 4.4.0 + `date-fns-tz` 3.2.0 + `vite` 8.2.2 restored on disk with `--no-save` after npm's dependency prune removed them; package.json/package-lock.json carry only the approved vitest addition per threat model T-01-SC.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest ERESOLVE on @types/node peerOptional**
- Found during: Task 1 install
- Issue: `npm install -D vitest@5.0.0` failed; vitest 5 peerOptional `@types/node@^22||>=24` conflicts with scaffold `@types/node@20`
- Fix: Same package installed with `--legacy-peer-deps`; no alternative package substituted
- Commit: 1545cb4

**2. [Rule 3 - Blocking] npm prune removed unwired scaffold deps from disk**
- Found during: Task 1 verify
- Issue: vitest install pruned `date-fns`, `date-fns-tz`, `zustand`, `lightweight-charts` from node_modules (they were never in package.json dependencies)
- Fix: Restored only the runtime-needed pair (`date-fns`, `date-fns-tz`) plus vitest's `vite` peer on disk via `npm install --no-save --legacy-peer-deps`; manifests untouched; zustand/lightweight-charts stay unwired until Phase 2 per research
- Commit: 1545cb4 (install-time side effect, verified present at each subsequent task)

**3. [Rule 1 - Bug] Tracer test wrote 25-candle count for a 24-valid-row fixture**
- Found during: Task 2 verify
- Issue: Mock fixture contains one mid-array null row that the parser correctly drops, so the envelope holds 24 candles, not 25
- Fix: Corrected assertion to 24 with closed-only count unchanged at 24
- Commit: 4f519ec

## Verification

- `vitest run src/lib/tracer.test.ts`: 6/6 passed (fetch-through-range, DST bucketing, null-row drop, forming flag, thinHistory, zero-height position, envelope stamp)
- Full suite `vitest run`: green
- `tsc --noEmit`: zero errors in all plan files; remaining errors are pre-existing untracked scaffold files (`components/ui/*`, missing UI deps) untouched by this plan
- Route handler: `dynamic = force-dynamic`, `maxDuration = 15`, no URL params read, no `use client` directive

## Known Stubs

None — stub scan over all plan files returned zero TODO/FIXME/placeholder markers. Full ICT core (levels, bias, DOL, regime, rollover) and proxy resilience (failover, backoff, singleflight, stale-serve) are owned by plans 01-02/01-03.

## Threat Flags

None — new surface matches the plan threat model exactly: shape-guard checks `chart.error` before `result`, validates symbol + ascending dates, never caches failures; route returns 502 + `no-store` on cold failure. Full jittered backoff, singleflight, and serve-stale land in 01-03 per the model.

## Requirements

- DATA-01 (tracer skeleton): envelope + Baku bucketing + 6mo window params proven with mocked fetch
- ICT-01 (anchor math subset): 20-candle high/low/eq + thin flag + zero-height guard proven
- STATE-02 (time core subset): `toBakuYMD` + March DST pair proven; November/midnight cases land with 01-03 time tests

## Self-Check: PASSED

- All 7 created files exist on disk; package.json carries `test`/`test:watch` scripts + vitest devDependency
- All 3 commits exist in git log (1545cb4, 4f519ec, 1729691)
- Tracer suite green after final commit; full suite green
