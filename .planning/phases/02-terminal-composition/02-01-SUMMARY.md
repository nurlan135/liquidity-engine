---
phase: 02-terminal-composition
plan: 01
subsystem: terminal-tracer
tags: [zustand, lightweight-charts, store, chart, sentiment, countdown]
dependency_graph:
  requires: [01-ict-core, 01-yahoo-proxy, 01-baku-time]
  provides: [dashboard-store, chart-mapper, sentiment-lib, countdown-lib, terminal-shell]
  affects: [02-02-panels, 02-03-report, 02-04-fixtures]
tech_stack:
  added: []
  patterns: [zustand-single-store, dynamic-ssr-false-island, pure-selector-math, injected-clock]
key_files:
  created:
    - src/lib/store.ts
    - src/lib/store.test.ts
    - src/lib/chart-mapper.ts
    - src/lib/chart-mapper.test.ts
    - src/lib/sentiment.ts
    - src/lib/sentiment.test.ts
    - src/lib/countdown.ts
    - src/lib/calendar.test.ts
    - components/dashboard/terminal-shell.tsx
    - components/charts/nq-chart.tsx
    - components/ui/button.tsx
    - components/ui/card.tsx
    - components/ui/toast.tsx
    - lib/utils.ts
  modified:
    - app/page.tsx
    - app/globals.css
decisions:
  - "Store selectors call computeRange/computeBias/computePrimaryDOL/computeRegime/computeLevels; no math duplicated outside src/lib/ict"
  - "lightweight-charts loads via await import inside the creation effect; module top stays DOM free"
  - "Chart canvas colors resolve --terminal-* tokens through getComputedStyle; container references var(--terminal-canvas) literally"
  - "npm install --legacy-peer-deps for vitest 5 types-only @types/node peer conflict (Phase 1 precedent)"
metrics:
  duration: ~15 min
  completed: "2026-09-05"
  tasks: 3
  commits: 6
status: complete
actuals:
  tokens: 42000
  tasks: 3
  commits: 6
---

# Phase 02 Plan 01: Terminal Tracer Slice Summary

Zustand poll-to-pixels path proven end to end: guarded refresh writes the Yahoo envelope, selectors derive ICT range/bias/DOL/regime/levels, TerminalShell renders the 3-panel grid with LIVE/STALE strip, NqChart paints candles with EQ and DOL price-lines, plus tested True AVG sentiment and Baku-clock countdown libs for later panels.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Tracer: proxy to store to chart with status strip (RED) | b0cee84 | src/lib/store.test.ts |
| 1 | Tracer: proxy to store to chart with status strip (GREEN) | 821c7fe | src/lib/store.ts, src/lib/chart-mapper.ts, terminal-shell.tsx, nq-chart.tsx, app/page.tsx, ui primitives, lib/utils.ts, components.json |
| 2 | Chart mapper extraction plus terminal tokens (test) | 656665c | src/lib/chart-mapper.test.ts |
| 2 | Chart mapper extraction plus terminal tokens (GREEN) | c27910f | app/globals.css, components/charts/nq-chart.tsx |
| 3 | Sentiment True AVG plus countdown pure libs (RED) | 76f1f9c | src/lib/sentiment.test.ts, src/lib/calendar.test.ts |
| 3 | Sentiment True AVG plus countdown pure libs (GREEN) | d3a5167 | src/lib/sentiment.ts, src/lib/countdown.ts |

## Key Decisions

- Single `useDashboard` store holds raw envelope state only; every derived value flows through `src/lib/ict` pure functions in selectors (D-10). Components never import ict directly.
- `next/dynamic` with `ssr: false` lives in the `"use client"` TerminalShell mapping the named NqChart export; `app/page.tsx` stays a Server Component (version-pinned lazy-loading guide).
- Chart series uses v5 `addSeries(CandlestickSeries)`; price-lines re-create after `removePriceLine`; `chart.remove()` on unmount.
- Forming candles are excluded from selectors via `closedOnly` but retained in stored candles and rendered with the Formalaşan şam chip.
- Empty envelopes render Məlumat yoxdur copy plus Yenilə CTA; refresh failures preserve last-known candles with lastError.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npm run test`: 13 files, 81 tests, all green (one transient 5s worker-startup timeout on first full run, green on re-run; no logic hang).
- `npx tsc --noEmit`: clean.
- Acceptance greps: TerminalShell in page.tsx with no next/image; addSeries(CandlestickSeries with no addCandlestickSeries; data-slot status-strip with Yenilə button disabled on inFlight; store imports computeRange/computeBias/computePrimaryDOL/computeRegime; --terminal-accent under .dark; chart imports @/src/lib/chart-mapper with var(--terminal-up)/var(--terminal-down); trueAvg/CROWDED_THRESHOLD and formatCountdown/isPreNews exports with no Date.now outside defaults.

## Known Stubs

None. Left/center/right panels render placeholder copy that 02-02 owns (sentiment table, report, calendar list); no hardcoded values flow to live readouts.

## Self-Check: PASSED

- All 10 created and 2 modified key files exist on disk.
- All 6 task commits exist in git log.
