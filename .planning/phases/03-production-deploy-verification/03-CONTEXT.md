# Phase 3: Production Deploy & Verification - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning

## Phase Boundary

Phase 3 puts the terminal live on Vercel Hobby (zero budget) and proves resilience where it counts — in production. A new Vercel project serves the Next.js app on a `vercel.app` subdomain with CDN cache headers verified on the proxy routes; a cold-start / stale-serve drill on a preview URL proves the STALE badge path; a scripted live-URL checklist confirms cache age, Baku-time DST rendering, and the rollover banner path. No new features, no UI changes, no real sentiment/calendar APIs — those are v2.

## Implementation Decisions

### Deploy setup & method
- **D-01:** Create a NEW Vercel project (no existing project). Agent handles CLI linking + config; user confirms the Vercel account. Fastest path, keeps everything in-session.
- **D-02:** Rename branch `master` → `main` before connecting. Matches Vercel/GitHub defaults; one-time churn, conventional going forward. — **Reversibility:** one-way — renames the published default branch; every clone, open PR, and future GSD branch base follows the new name.
- **D-03:** GitHub-connected deploys (auto-deploy on push), not CLI-only. Every push to `main` goes live; branches get preview URLs.
- **D-04:** Production URL is a `vercel.app` subdomain. Zero setup, free, sufficient to prove the v1.0 milestone live. Custom domain is a future concern, not this phase.

### Update & rollback flow
- **D-05:** Auto-deploy on every push to `main`; rollback = redeploy a prior build in the Vercel dashboard. No manual promotion gate — preview URLs on branches are the pre-prod check.

### Resilience drill approach
- **D-06:** Drill runs on a PREVIEW URL with a temporary kill-switch — never on the production deployment. Reads production infra (Vercel cold-start + cache path) without degrading the live terminal.
- **D-07:** Kill-switch mechanism is a temporary flag (short-lived env var or override forcing the proxy's failure path: upstream killed → stale badge shows, cached candles served, nothing fails silently). Removed immediately after the drill; nothing drill-specific ships to prod.
- **D-08:** Drill success = upstream killed → STALE badge visible, cached candles rendered, no silent failure. This is the production proof of the Phase 1 serve-stale contract and Phase 2 status-strip states.

### Live-URL verification style
- **D-09:** Scripted, re-runnable checks (curl header assertions for `s-maxage` + SWR on proxy routes, cache-age reads) — not a manual walkthrough. Checks live in the repo so any future deploy can re-verify.
- **D-10:** DST-date rendering and rollover banner path verify as RENDERING SPOT-CHECKS on the live URL (confirm Baku-time dates render sensibly today). Unit tests already prove the logic (March/November DST, rollover-suspect flag); September has no live DST transition or rollover event to trigger. No fixture-driven preview proof — rejected as overkill.

### Claude's Discretion
Kill-switch flag shape (env var vs query override vs route-level toggle), exact CDN header values (`s-maxage`/`stale-while-revalidate` durations — roadmap says `s-maxage` + SWR, durations at planner discretion), check script location and format (shell script vs vitest integration test hitting the live URL), `vercel.json` vs dashboard-only config, branch-rename sequencing relative to first deploy. Planner's call within the decisions above.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project docs
- `.planning/PROJECT.md` — scope, constraints (zero budget, Vercel Hobby only, no LLM, Zustand-only), key decisions.
- `.planning/REQUIREMENTS.md` — DEPLOY-01 (the single Phase 3 requirement); Out-of-scope table (no real APIs, no counter-zone signals, no LLM).
- `.planning/ROADMAP.md` — Phase 3 goal + 3 success criteria (CDN headers verified, cold-start/stale-serve drill green, live-URL checklist green).
- `.planning/phases/01-data-foundation-ict-core/01-CONTEXT.md` — Phase 1 locked decisions: proxy envelope `{candles, lastUpdatedISO, stale, source}`, 502-on-empty-cache contract, `s-maxage=60, SWR=30` CDN semantics intent, Baku time util.
- `.planning/phases/02-terminal-composition/02-CONTEXT.md` — Phase 2 locked decisions: 60s poll cadence matching proxy TTL, global status strip (`LIVE/STALE/MARKET CLOSED`), honest closed state, Azerbaijani display language.

### Codebase maps
- `.planning/codebase/STACK.md` — Next.js 16.3.4 + React 19, npm, no CI pipeline (deploy wiring is Phase 3's job).
- `.planning/codebase/ARCHITECTURE.md` — App Router structure; proxy is a Route Handler at `app/api/yahoo/route.ts`.
- `.planning/codebase/INTEGRATIONS.md` — no hosting/CI configured at map time; no env vars in code; `.gitignore` covers `.env*` and `.vercel/`.

### Domain spec
- `reference/institutional_rules.md` — Azerbaijani-language domain spec; relevant only as background for what the live terminal displays (no Phase 3 implementation reads it).

## Existing Code Insights

### Reusable Assets
- `app/api/yahoo/route.ts` — Phase 1 proxy with `{candles, lastUpdatedISO, stale, source}` envelope + failover/backoff/serve-stale; the drill target and the CDN-header verification target.
- Phase 2 status strip (`LIVE/STALE/MARKET CLOSED`) — the visible drill assertion surface; drill passes when STALE shows on the preview URL.
- Phase 1 time util + DST test suite — already proves Baku-time logic; live check is rendering-only.
- `package.json` scripts (`build`, `lint`, `test`) — the CI-equivalent gates to run before first deploy.

### Established Patterns
- Empty `next.config.ts` (default/empty NextConfig) — Phase 3 adds headers/CDN config here or via `vercel.json`; planner decides.
- No `vercel.json`, no `.vercel/` linkage (verified 2026-09-06) — greenfield Vercel setup.
- Branch is `master`; Vercel/GitHub convention is `main` — rename (D-02) precedes project connection.
- Zero `process.env` references in code; no `.env*` files — drill flag (D-07) is the first env var; keep it server-side only, never `NEXT_PUBLIC_`.

### Integration Points
- New: Vercel project (GitHub-connected, `main` as production branch) serving the existing Next.js app.
- New: CDN/cache header config on proxy routes (`s-maxage` + SWR) — in `next.config.ts` headers or `vercel.json`, verified by scripted curl checks.
- New: re-runnable verification checks (script location at planner discretion) asserting headers, cache age, and live rendering.
- Touch once: branch rename `master` → `main` before Vercel connection.

## Specific Ideas

vercel.app subdomain chosen to keep v1.0 at zero cost and zero DNS setup; scripted checks chosen so every future deploy re-proves the same three success criteria without human walkthrough.

## Deferred Ideas

None — discussion stayed within phase scope. (v2 owns: custom domain, real sentiment/calendar APIs, Modules 1/3/4 live logic, multi-symbol, backtesting, alerts.)

---

*Phase: 3-Production Deploy & Verification*
*Context gathered: 2026-09-06*
