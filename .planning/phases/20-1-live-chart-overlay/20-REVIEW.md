---
phase: 20-1-live-chart-overlay
plan: review
status: clean
files_reviewed: 9
critical: 0
warning: 0
info: 2
total: 2
depth: standard
reviewed_at: "2026-10-27"
reviewer: inline-orchestrator (Agent-spawn unavailable in this session; standard-depth pass per code-review.md)
---

# Phase 20 Code Review: §1 Live + Chart Overlay

**Scope:** 9 files from plan SUMMARYs (pool-prose, pool-overlay, report.ts, report tests, report.tsx, terminal-shell.tsx, nq-chart.tsx). Standard depth. Full suite 480/480 green, tsc clean at review time.

**Verdict:** clean — no Critical, no Warning. Two Info-level observations, neither blocking.

## Findings

### INF-1: `nq.candles` subscription re-renders Report on every candle refresh

- **File:** `components/dashboard/report.tsx:115`
- **Severity:** Info
- **What:** `useDashboard((s) => s.nq.candles)` subscribes the whole Report component to the candles array. Every `refreshNQ` produces a new array identity, so Report re-renders on each candle refresh even when pools are unchanged.
- **Why not a problem:** Report already re-renders on every refresh via `lastUpdatedISO` and selector subscriptions; the candles subscription adds no new render pass. The subscription is required for `rankDistAtr` to see fresh candles (a `getState()` read would risk stale geometry). The §3 block uses `getState()` because it only needs `lastError` strings, not arrays.
- **Action:** None required. If Report render cost ever matters, memoize the §1 derivation behind the pools epoch.

### INF-2: Ghost detection in render flags parses title strings

- **File:** `components/charts/nq-chart.tsx:719-720`
- **Severity:** Info
- **What:** `hasPoolLines` / `hasPoolGhosts` distinguish ghosts via `title.includes('-ghost-')`, coupling render logic to the mapper's title format. `PoolLineInput` carries no status field, so the title string is the only ghost signal at the call site.
- **Why not a problem:** Titles are produced by the same module (`poolPriceLines`) with pinned `toBe` tests on the exact `-ghost-` format; a format change breaks tests before it breaks render. The mount/update effects do not branch on titles — only the presence spans do.
- **Action:** None required. If the title contract ever changes, add a `ghost: boolean` field to `PoolLineInput` instead.

## Dead Code Noted (not filed)

- `poolPriceLines` function-overload (`colorOverride`) is no longer called by any site — all three call sites use `{ dimmed }`. Kept intentionally as migration safety; harmless. Remove in a future cleanup if desired.

## Security Notes

- `poolsNqLastError` renders as a JSX text node (React-escaped) — no XSS vector from verbatim leg errors.
- No `dangerouslySetInnerHTML`, no `eval`/`new Function`, no dynamic imports beyond the existing lightweight-charts/zone-primitive pattern.
- No new packages, no network calls, no store writes from render paths.
- Threat mitigations T-20-01 through T-20-06 hold: skeleton on null envelope, verbatim stale, dimmed-not-hidden thin, null-clears-all, STAND_ASIDE ghost skip, banned-reuse absence pinned.

## Verification

- `npm test`: 480/480 passed (42 files)
- `npx tsc --noEmit`: clean
- `src/lib/ict/`: untouched (D-20 holds)
- Evaluation scope: all task commits on this branch, subjects follow `feat(20-NN)` / `docs(20-NN)` convention
