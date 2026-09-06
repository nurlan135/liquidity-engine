# Phase 3: Production Deploy & Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-06
**Phase:** 3-Production Deploy & Verification
**Areas discussed:** Deploy setup & method, Update & rollback flow, Resilience drill approach, Live-URL verification style

---

## Deploy setup & method

| Option | Description | Selected |
|--------|-------------|----------|
| Create new project | Agent handles CLI linking + config; user confirms account | ✓ |
| Use existing project | Adapt plan to already-wired project settings | |
| I'll set it up myself | User creates project in dashboard, hands over URL | |

**User's choice:** Create new project
**Notes:** No existing Vercel project. Single question + branch follow-up + method follow-up + URL follow-up (4 turns in this area).

| Option | Description | Selected |
|--------|-------------|----------|
| Keep master | Tell Vercel master is production; zero repo churn | |
| Rename to main | Match Vercel/GitHub defaults; one-time churn | ✓ |

**User's choice:** Rename to main
**Notes:** Repo verified on branch `master`; roadmap/STATE note the mismatch as a known concern.

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub-connected | Auto-deploy on push; preview URLs per branch | ✓ |
| CLI-only deploys | Manual `vercel deploy` from local machine | |

**User's choice:** GitHub-connected

| Option | Description | Selected |
|--------|-------------|----------|
| vercel.app subdomain | Zero setup, free, proves v1.0 live | ✓ |
| Custom domain | User provides domain + DNS; agent wires settings | |

**User's choice:** vercel.app subdomain

---

## Update & rollback flow

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-deploy + dashboard rollback | Every push to main live; rollback = redeploy prior build | ✓ |
| Manual promotion to prod | Pushes build as previews; click Promote for production | |

**User's choice:** Auto-deploy + dashboard rollback
**Notes:** Preview URLs on branches serve as the pre-prod check; no promotion gate.

---

## Resilience drill approach

| Option | Description | Selected |
|--------|-------------|----------|
| Preview URL with kill-switch | Temp break of upstream on preview; confirm STALE + cached candles, then revert | ✓ |
| Local simulation only | Failure simulation against local production build | |
| Drill on production URL | Break upstream on live deployment; most realistic | |

**User's choice:** Preview URL with kill-switch
**Notes:** Explicitly rejected drilling on production (would degrade the live terminal) and local-only (wouldn't prove Vercel's cold-start/cache path).

| Option | Description | Selected |
|--------|-------------|----------|
| Temporary flag | Short-lived env var/override forcing the proxy failure path; removed after | ✓ |
| Dead upstream URL | Preview build points at dead upstream; failover fires for real | |

**User's choice:** Temporary flag
**Notes:** (One retry after a malformed AskUserQuestion call — format error on first attempt, succeeded on retry.)

---

## Live-URL verification style

| Option | Description | Selected |
|--------|-------------|----------|
| Scripted checks | Repeatable curl/header assertions + cache-age reads, re-runnable any time | ✓ |
| Manual walkthrough | Agent prepares URL + checklist; user clicks through and signs off | |

**User's choice:** Scripted checks

| Option | Description | Selected |
|--------|-------------|----------|
| Rendering spot-check | Confirm Baku-time dates render sensibly on live URL today; unit tests cover logic | ✓ |
| Fixture-driven proof | Preview build with engineered DST/rollover fixtures proving banner path end-to-end | |

**User's choice:** Rendering spot-check
**Notes:** September has no live DST transition or rollover event; fixture-driven proof rejected as overkill.

---

## Claude's Discretion

Kill-switch flag shape, exact CDN header durations, check script location/format, `vercel.json` vs dashboard-only config, branch-rename sequencing.

## Deferred Ideas

None — discussion stayed within phase scope.
