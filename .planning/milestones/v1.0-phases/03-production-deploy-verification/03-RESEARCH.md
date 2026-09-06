# Phase 3: Production Deploy & Verification - Research

**Researched:** 2026-09-06
**Domain:** Next.js 16 App Router deploy on Vercel Hobby + CDN cache verification + stale-serve drill
**Confidence:** HIGH (in-repo contracts) / MEDIUM (Vercel CDN semantics from official docs)

## Summary

Phase 3 ships no features: it connects the existing Next.js app to a new Vercel project (GitHub-connected, `main` as production branch), serves it on a `vercel.app` subdomain, and proves the Phase 1 serve-stale contract and Phase 2 status-strip states against production infrastructure. The proxy route already emits the intended CDN semantics, so Phase 3 is verification and wiring, not new caching logic.

**Primary recommendation:** Keep the `Cache-Control` header logic exactly where it is (in `app/api/yahoo/route.ts`), do all Vercel setup with zero code changes beyond an optional temporary drill flag, and verify with a checked-in shell script that curls the live preview/production URLs and asserts headers, envelope freshness, and page rendering.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Create a NEW Vercel project (no existing project). Agent handles CLI linking + config; user confirms the Vercel account. Fastest path, keeps everything in-session.
- **D-02:** Rename branch `master` → `main` before connecting. Matches Vercel/GitHub defaults; one-time churn, conventional going forward. — **Reversibility:** one-way — renames the published default branch; every clone, open PR, and future GSD branch base follows the new name.
- **D-03:** GitHub-connected deploys (auto-deploy on push), not CLI-only. Every push to `main` goes live; branches get preview URLs.
- **D-04:** Production URL is a `vercel.app` subdomain. Zero setup, free, sufficient to prove the v1.0 milestone live. Custom domain is a future concern, not this phase.
- **D-05:** Auto-deploy on every push to `main`; rollback = redeploy a prior build in the Vercel dashboard. No manual promotion gate — preview URLs on branches are the pre-prod check.
- **D-06:** Drill runs on a PREVIEW URL with a temporary kill-switch — never on the production deployment. Reads production infra (Vercel cold-start + cache path) without degrading the live terminal.
- **D-07:** Kill-switch mechanism is a temporary flag (short-lived env var or override forcing the proxy's failure path: upstream killed → stale badge shows, cached candles served, nothing fails silently). Removed immediately after the drill; nothing drill-specific ships to prod.
- **D-08:** Drill success = upstream killed → STALE badge visible, cached candles rendered, no silent failure. This is the production proof of the Phase 1 serve-stale contract and Phase 2 status-strip states.
- **D-09:** Scripted, re-runnable checks (curl header assertions for `s-maxage` + SWR on proxy routes, cache-age reads) — not a manual walkthrough. Checks live in the repo so any future deploy can re-verify.
- **D-10:** DST-date rendering and rollover banner path verify as RENDERING SPOT-CHECKS on the live URL (confirm Baku-time dates render sensibly today). Unit tests already prove the logic (March/November DST, rollover-suspect flag); September has no live DST transition or rollover event to trigger. No fixture-driven preview proof — rejected as overkill.

### Claude's Discretion
Kill-switch flag shape (env var vs query override vs route-level toggle), exact CDN header values (`s-maxage`/`stale-while-revalidate` durations — roadmap says `s-maxage` + SWR, durations at planner discretion), check script location and format (shell script vs vitest integration test hitting the live URL), `vercel.json` vs dashboard-only config, branch-rename sequencing relative to first deploy. Planner's call within the decisions above.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (v2 owns: custom domain, real sentiment/calendar APIs, Modules 1/3/4 live logic, multi-symbol, backtesting, alerts.)

## Project Constraints (from CLAUDE.md)

- This project is NOT standard Next.js — before making claims about Next.js APIs (caching, headers, route handlers), read the relevant guide in `node_modules/next/dist/docs/` [VERIFIED: C:/Users/HP/Projects/liquidity-engine/AGENTS.md:1-9]. Done this session for route handlers, caching, and deploying guides.
- `next dev` manages an AGENTS.md block via `node_modules/next/dist/server/lib/generate-agent-files.js` — do not remove it from diffs; committing it keeps the tree clean [CITED: AGENTS.md].
- No other CLAUDE.md directives found (CLAUDE.md only contains `@AGENTS.md`).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | Terminal is deployed on Vercel Hobby with CDN cache headers verified, cold-start + stale-serve drill passed, live-URL checklist green (cache age, DST dates, rollover banner path) | Vercel CDN header semantics; route-handler `force-dynamic` + function-set headers pattern; drill-flag options; scripted curl checklist pattern; existing envelope/status-strip contracts below |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CDN edge caching of `/api/yahoo` | CDN / Static (Vercel Edge Network) | API / Backend | `s-maxage` + SWR are honored by the Vercel CDN from function-set `Cache-Control`; origin only declares the policy |
| Upstream fetch / failover / serve-stale | API / Backend (Route Handler + `src/lib/yahoo`) | — | Yahoo fetch, 60s TTL, 30-min stale window already live in server code |
| Freshness badge (LIVE/STALE/CLOSED) | Browser / Client (status strip) | API / Backend (envelope `stale` + `lastUpdatedISO`) | Client derives display state from envelope fields; server never renders the badge |
| Baku-time date rendering | Browser / Client | API / Backend (Baku `date` strings in candles) | Candles already carry Baku `yyyy-MM-dd` strings; client renders them |
| Deploy wiring / rollback | API / Backend (Vercel project) | — | GitHub-connected builds, no client involvement |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.3.4 [VERIFIED: C:/Users/HP/Projects/liquidity-engine/package.json:21] | App Router build + Route Handlers + `next build/start` deploy contract | Already the project scaffold; Vercel verified adapter for Next.js [CITED: node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md:81-87] |
| Vercel platform (Hobby) | — (platform, not npm) | Hosting, CDN edge cache, GitHub auto-deploys, preview URLs | Locked decision D-01–D-04; CDN honors function-set `Cache-Control` with `s-maxage` / SWR [VERIFIED: vercel.com/docs/caching/cdn-cache] |
| curl | 8.17.0 observed locally [VERIFIED: curl --version probe 2026-09-06] | Live-URL header + body assertions in the check script | Locked decision D-09 (scripted checks); universally available, zero dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^5.0.0 [VERIFIED: C:/Users/HP/Projects/liquidity-engine/package.json:38] | Pre-deploy gate (`npm test`), existing DST/rollover/status-strip suites | Run before first deploy and at phase gate |
| date-fns-tz | ^3.2.0 [VERIFIED: C:/Users/HP/Projects/liquidity-engine/package.json:19] | Baku-time formatting already in `src/lib/time.ts` | No new usage; live check is rendering-only |
| vercel CLI (via npx, NOT a manifest dep) | [ASSUMED] | `link` + first deploy + preview inspection from session | Only if planner wants CLI path; dashboard-only setup is an equal alternative per discretion |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Function-set headers (current) | `next.config.ts` `headers()` or `vercel.json` `headers` | Config-level headers are overridden by function-set headers for the same route [VERIFIED: vercel.com/docs/caching/cdn-cache] — so keep the route as source of truth; use config only if a second static route ever needs headers |
| Shell check script | Vitest integration test hitting live URL | Shell is simpler for header assertions + `x-vercel-cache` reads and runs anywhere with curl; vitest fits JSON-envelope assertions. Planner's call (discretion) |
| Env-var kill-switch | Query-param override / route-level toggle | Env var is server-only and invisible to clients; query override risks CDN cache-key pollution unless `Vary`/no-store handled. Recommend env var |

**Installation:**
```bash
# No manifest changes required. Pre-deploy gates only:
npm run lint && npm test && npm run build
# Optional CLI path (no --save; never add to package.json):
npx vercel link && npx vercel --prod
```

**Version verification:** `next@16.3.4`, `vitest@^5.0.0`, `date-fns-tz@^3.2.0` read from package.json this session (see table). Registry re-verification (`npm view`) not run in this environment — versions are manifest facts, not freshness claims.

## Package Legitimacy Audit

> No new manifest dependencies are recommended. The only external package touched is the Vercel CLI via `npx` (not saved). The `gsd-tools package-legitimacy` seam and `npm view` were not runnable in this session, so the CLI package below stays [ASSUMED] and gated.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `vercel` (CLI, npx-only, never `--save`) | npm | [ASSUMED] | [ASSUMED] | [ASSUMED] | UNVERIFIED | Flagged — planner must add `checkpoint:human-verify` before first `npx vercel` invocation; prefer dashboard-only setup if the user declines |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious (SUS):** `vercel` CLI — unverified in-session, gate behind human checkpoint per protocol.

## Architecture Patterns

### System Architecture Diagram

```
Browser (terminal page, 60s poll)
  │  GET /api/yahoo  (poll loop, Phase 2)
  ▼
Vercel Edge CDN ── Cache-Control: public, s-maxage=60, SWR=30 ── HIT? serve edge copy
  │ MISS / STALE                                    (x-vercel-cache: HIT/MISS/STALE)
  ▼
Route Handler app/api/yahoo/route.ts (force-dynamic, maxDuration 15)
  │  fetchNQDaily(now) — 60s in-memory TTL → query1/query2 failover →
  │  backoff honoring Retry-After → serve-stale (≤30 min) → else 502 no-store
  ▼
Yahoo v8 chart API (query1 → query2)
```

Reader trace: page polls → edge serves fresh copy for 60s, revalidates in background for 30s → on miss the handler returns `{candles, lastUpdatedISO, stale, source}` with `no-store` when stale or 502-with-`Retry-After: 60` when empty [VERIFIED: C:/Users/HP/Projects/liquidity-engine/app/api/yahoo/route.ts:1-21] → status strip derives LIVE/STALE/CLOSED from `stale` + age + Baku weekday [VERIFIED: C:/Users/HP/Projects/liquidity-engine/src/lib/freshness.ts:32-46].

### Recommended Project Structure

```
scripts/
└── verify-deploy.sh   # D-09 checks: headers, envelope, x-vercel-cache (planner names/locates)
app/api/yahoo/route.ts # unchanged (header source of truth)
src/lib/yahoo.ts       # unchanged (TTL/failover/stale) + TEMP drill flag only
src/lib/freshness.ts   # unchanged (status derivation)
src/lib/time.ts        # unchanged (Baku util)
```

No new app routes, no `vercel.json` required unless planner chooses config-level headers.

### Pattern 1: Function-set CDN headers on a dynamic route
**What:** The Route Handler sets `Cache-Control` per response branch; the Vercel CDN caches the 200 branch on `s-maxage` and never caches the stale/502 branches (`no-store`) [VERIFIED: vercel.com/docs/caching/cdn-cache] [VERIFIED: C:/Users/HP/Projects/liquidity-engine/app/api/yahoo/route.ts:6-21].
**When to use:** Always for this phase — it is already implemented. Quote (verbatim, lines 10–12, 16–19):

```ts
'Cache-Control': envelope.stale ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=30',
...
return Response.json({ error: message, retryAfter: 60 }, {
  status: 502,
  headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
});
```

**Vercel cacheability preconditions already met:** GET method, 200 status on the cacheable branch, no `set-cookie`, no `private`/`no-cache`/`no-store` on that branch [VERIFIED: vercel.com/docs/caching/cdn-cache]. Note the platform strips `s-maxage`/`stale-while-revalidate` before forwarding to the browser when no `CDN-Cache-Control` is set — assert them on the first response / via `x-vercel-cache`, not from a browser-cached copy [VERIFIED: vercel.com/docs/caching/cdn-cache].

### Pattern 2: Temporary server-only kill-switch for the drill
**What:** A short-lived env var (e.g. `DRILL_FORCE_STALE=1`) checked only in server code that forces the proxy's existing failure path (throw `UpstreamError` before fetch, letting the warm-cache → stale branch run). Removed immediately after the drill; never `NEXT_PUBLIC_` (repo currently has zero `process.env` references [CITED: 03-CONTEXT.md]).
**When to use:** D-06/D-07 drill on a preview URL only. Set via `vercel env add` on the preview environment or Vercel dashboard, run drill, delete, redeploy clean.
**Example:**
```ts
// Source pattern: standard server-only env read; flag name at planner discretion
if (process.env.DRILL_FORCE_STALE === '1') {
  throw new UpstreamError('drill: upstream killed', { retryable: true });
}
```

### Pattern 3: Scripted live-URL checklist (curl + jq/node)
**What:** A re-runnable script asserting (a) `cache-control` contains `s-maxage=60` and `stale-while-revalidate=30` on fresh 200s, (b) `x-vercel-cache` transitions MISS→HIT on repeat, (c) envelope `stale:false` + ISO `lastUpdatedISO` + age < 120s, (d) page HTML 200. DST/rollover are rendering spot-checks (D-10), not assertions.
**When to use:** After production deploy and after the preview drill; re-run on every future deploy.

### Anti-Patterns to Avoid
- **Caching the stale/502 branch:** adding `s-maxage` to the `no-store` branches hides outages behind the edge. Keep the branch split exactly as-is.
- **`force-static` on the proxy route:** would freeze one response at build time. The route is correctly `force-dynamic` [VERIFIED: C:/Users/HP/Projects/liquidity-engine/app/api/yahoo/route.ts:3]; do not change. (Next.js default is uncached dynamic handlers; `force-static` is the opt-in that must be avoided here [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:49-67].)
- **Query-param kill-switch without cache handling:** an un-`Vary`d query override can pollute or split the CDN cache key. Prefer the env-var flag.
- **Committing the drill flag or `.vercel/`:** `.gitignore` already covers `.env*` and `.vercel` [VERIFIED: C:/Users/HP/Projects/liquidity-engine/.gitignore:33-37]; keep it that way.
- **Branch rename after connecting Vercel:** rename `master`→`main` FIRST (D-02), then connect with `main` as production branch; current branch is still `master` [VERIFIED: git branch --show-current probe 2026-09-06].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Edge caching / revalidation | In-app CDN or custom cache-key layer | Vercel CDN via `Cache-Control: s-maxage + SWR` | Regional eviction, HIT/MISS/STALE accounting (`x-vercel-cache`), and background revalidation are platform behavior [VERIFIED: vercel.com/docs/caching/cdn-cache] |
| Deploy pipeline / preview URLs | Custom CI + rsync/SSH deploys | GitHub-connected Vercel project (D-03) | Auto-builds per push, preview URL per branch, dashboard redeploy = rollback (D-05) |
| Timezone math | Manual UTC+4 offsets | `date-fns-tz` `formatInTimeZone(..., 'Asia/Baku', ...)` already in use | Fixed offsets break across DST-adjacent rendering; the util + injected clock is already tested |
| HTTP assertions | Custom Node fetch harness | `curl -sSI` / `-s` + grep/jq in a shell script | D-09 wants zero-dependency re-runnable checks; curl 8.17.0 is present locally |

**Key insight:** Every resilience behavior Phase 3 must prove (TTL, failover, serve-stale, badge states) already exists and is unit-tested; Phase 3 proves it *through production infrastructure*, so the only new code allowed is the temporary drill flag.

## Common Pitfalls

### Pitfall 1: Asserting `s-maxage` from a browser-cached copy
**What goes wrong:** Check passes locally via `next start` but the live assertion on `s-maxage` fails in a browser.
**Why it happens:** Vercel strips `s-maxage`/`stale-while-revalidate` before sending to the browser when no `CDN-Cache-Control` is set [VERIFIED: vercel.com/docs/caching/cdn-cache].
**How to avoid:** Assert with `curl -sSI` against the deployment URL directly and read `x-vercel-cache` for HIT/MISS/STALE.
**Warning signs:** Header present on `curl` but absent in DevTools.

### Pitfall 2: Cold-start confusion — empty CDN vs. empty origin cache
**What goes wrong:** First request after deploy returns 502 and the drill is misread as failure.
**Why it happens:** New deployments start with cold CDN *and* cold in-memory origin cache (`payloadCache` is a module-level `Map`, ephemeral on serverless [VERIFIED: C:/Users/HP/Projects/liquidity-engine/src/lib/yahoo.ts:149-156]); if Yahoo is unreachable on the very first fetch there is no warm entry, so the 502 path (correct per contract) fires [VERIFIED: C:/Users/HP/Projects/liquidity-engine/src/lib/yahoo.ts:301-307].
**How to avoid:** Warm-up sequence in the script: request once (expect MISS + live), then drill against the warmed preview.
**Warning signs:** `source:'live'` never observed before the kill-switch is set.

### Pitfall 3: Drill flag leaks to production
**What goes wrong:** `DRILL_FORCE_STALE` (or equivalent) remains set on production; terminal permanently STALE.
**Why it happens:** Vercel env vars persist per environment; forgetting removal + redeploy leaves the flag live.
**How to avoid:** Scope the var to Preview only, time-box it, and make "remove flag + redeploy clean + re-run checklist" a checklist step, verified by `source:'live'`/`stale:false` on prod.
**Warning signs:** Prod envelope `stale:true` with fresh `lastUpdatedISO` after the drill window.

### Pitfall 4: Weekend-closed misread as stale-drill success
**What goes wrong:** Drill run on Saturday/Sunday Baku time shows CLOSED, not STALE, and is scored wrong.
**Why it happens:** `deriveStatus` returns CLOSED on Baku Sat/Sun regardless of the envelope flag [VERIFIED: C:/Users/HP/Projects/liquidity-engine/src/lib/freshness.ts:36-46], with copy `BAZAR BAĞLIDIR — son bağlanış şamları` [VERIFIED: C:/Users/HP/Projects/liquidity-engine/src/lib/freshness.ts:53-61].
**How to avoid:** Run the kill-drill on a Baku weekday; on weekends assert CLOSED + cached candles instead.
**Warning signs:** `state:'CLOSED'` with `weekday 6/7` in Baku.

### Pitfall 5: Branch-rename churn mid-phase
**What goes wrong:** Open PRs, local clones, and GSD branch bases still point at `master` after the rename.
**Why it happens:** D-02 is one-way by design (CONTEXT reversibility note).
**How to avoid:** Sequence: commit clean → `git branch -m master main` → push + retarget default on remote → reconnect/verify Vercel production branch = `main` → announce to all clones. Do this before project connection.

## Code Examples

Verified patterns from official sources:

### CDN-cacheable function response (Vercel official shape)
```ts
// Source: https://vercel.com/docs/caching/cdn-cache (App Router example)
export async function GET() {
  return new Response('Cache Control example', {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=1',
      'CDN-Cache-Control': 'public, s-maxage=60',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
    },
  });
}
```
Our route already follows this shape with `public, s-maxage=60, stale-while-revalidate=30` on the fresh branch [VERIFIED: C:/Users/HP/Projects/liquidity-engine/app/api/yahoo/route.ts:10-12].

### Dynamic route handler stays uncached by default (Next.js 16 bundled docs)
```ts
// Source: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:49-67
export const dynamic = 'force-static'; // OPT-IN to cache — DO NOT add to /api/yahoo
export async function GET() { /* ... */ return Response.json({ data }); }
```
Ours correctly uses `export const dynamic = 'force-dynamic'` [VERIFIED: C:/Users/HP/Projects/liquidity-engine/app/api/yahoo/route.ts:3].

### Live-URL header assertions (recommended check skeleton)
```bash
# D-09 scripted checks — header assertions on the live proxy route
BASE="https://<project>.vercel.app"
curl -sSI "$BASE/api/yahoo" | grep -i -E 'cache-control|x-vercel-cache'
curl -sSI "$BASE/api/yahoo" | grep -i 'cache-control' | grep -E 's-maxage=60' \
  && curl -sSI "$BASE/api/yahoo" | grep -i 'cache-control' | grep -E 'stale-while-revalidate=30'
curl -s "$BASE/api/yahoo" | head -c 400  # envelope: candles, lastUpdatedISO, stale, source
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual dashboard-only deploy checks | GitHub-connected auto-deploy + preview URL per branch + dashboard redeploy-as-rollback | Vercel current model (D-03/D-05 locked) | Every push verifiable; rollback needs no code revert |
| `max-age`-only browser caching | `s-maxage` + `stale-while-revalidate` edge caching with `x-vercel-cache` observability | Vercel CDN cache model [VERIFIED: vercel.com/docs/caching/cdn-cache] | 60s fresh + 30s background revalidate matches the 60s poll cadence |
| Fixed UTC+4 Baku offset | IANA `Asia/Baku` via `date-fns-tz` with injected clock | Phase 1 (already in `src/lib/time.ts`) | DST-safe rendering; live check is spot-check only |

**Deprecated/outdated:**
- `proxy-revalidate` and `stale-if-error` for server-side caching on Vercel: not currently supported — do not add them [VERIFIED: vercel.com/docs/caching/cdn-cache].
- Static export (`output: 'export'`) for this app: would drop Route Handlers/server features; use Node/server (Vercel) deployment, which supports all features [CITED: node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md:15-31].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel Hobby tier allows `maxDuration: 15`, GitHub-connected builds, preview URLs, and `vercel.app` subdomains at zero cost | Standard Stack / Architecture | MEDIUM — if a Hobby cap bites (build minutes, function timeout), first deploy fails; mitigation: dashboard shows the exact cap, planner adds a fallback (reduce `maxDuration`, dashboard-only config). Needs user confirmation at deploy time |
| A2 | Yahoo v8 unofficial endpoint reachable from Vercel serverless region with the current UA/header set | Pitfalls (cold-start) | MEDIUM — known Phase 1 concern; serve-stale/502 contract covers it, but a region-blocked Yahoo turns the live check red. Warm-up request surfaces it immediately |
| A3 | Exact Yahoo rate-limit thresholds and Retry-After behavior from serverless IPs | Validation | LOW — backoff honoring Retry-After is already coded [VERIFIED: src/lib/yahoo.ts:225-227]; live traffic is one poll/60s/client, well under browser-test rates |
| A4 | `vercel` CLI install via `npx` is acceptable to the user (vs. dashboard-only) | Package Audit | LOW — dashboard-only path exists; planner offers both, human-verify gate covers it |
| A5 | September live date has no DST transition or rollover event, so rendering spot-checks suffice (D-10) | Validation | LOW — unit suites already prove March/November DST and rollover-suspect logic; a surprise live event would only add an unplanned banner sighting |

## Open Questions (RESOLVED)

1. **Check script location/format?**
   - What we know: D-09 mandates scripted re-runnable checks; curl present, vitest present, no `scripts/` dir yet.
   - What's unclear: Planner discretion (shell vs vitest-live).
   - Recommendation: shell script (`scripts/verify-deploy.sh`) for headers + a tiny envelope parse; keep vitest for unit logic only.
   - RESOLVED: shell script `scripts/verify-deploy.sh` (plan 03-01 creates it).

2. **Kill-switch flag shape?**
   - What we know: Must be temporary, preview-only, server-side, removed after drill (D-07).
   - What's unclear: env var vs route toggle (planner discretion).
   - Recommendation: preview-scoped env var `DRILL_FORCE_STALE`, deleted + clean redeploy after drill.
   - RESOLVED: preview-scoped env var `DRILL_FORCE_STALE` (plan 03-01 creates, 03-03 sets, 03-04 deletes).

3. **`vercel.json` vs dashboard-only config?**
   - What we know: No `vercel.json` exists (glob empty this session); function headers already suffice.
   - What's unclear: Whether planner wants header duplication in config.
   - Recommendation: dashboard-only; no `vercel.json` unless a second route needs edge headers (function headers override config anyway).
   - RESOLVED: dashboard-only, no `vercel.json` (plans 03-03/03-04).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | build/start | ✓ | v24.11.1 [VERIFIED: node --version probe] | — |
| npm | gates + optional npx vercel | ✓ | 11.6.2 [VERIFIED: npm --version probe] | — |
| curl | D-09 live checks | ✓ | 8.17.0 [VERIFIED: curl --version probe] | — |
| vercel CLI | D-01 CLI path | ✗ | — | Dashboard-only project setup, or `npx vercel` (human-verify gate) |
| gh CLI | branch-rename remote retarget | ✗ | — | Browser/remote UI retarget of default branch to `main` |
| Vercel account | D-01 project creation | [ASSUMED] user confirms | — | None — blocks deploy; planner's first checkpoint |
| GitHub repo connection | D-03 auto-deploy | [ASSUMED] | — | CLI-only deploys (rejected by D-03; escalate, don't silently switch) |

**Missing dependencies with no fallback:**
- Vercel account confirmation + GitHub connection — planner must gate the deploy wave on explicit user confirmation (D-01).

**Missing dependencies with fallback:**
- vercel CLI / gh CLI missing locally — use dashboard + `npx` + web-UI branch retarget.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^5.0.0 [VERIFIED: package.json:38] |
| Config file | `vitest.config.ts` (exists, glob-verified this session) |
| Quick run command | `npm test -- --run` (`vitest run`) |
| Full suite command | `npm test` + `npm run lint` + `npm run build` (pre-deploy gate) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | Unit logic still green (ICT, DST, freshness, rollover) | unit (existing) | `npm test` | ✅ existing suites (`src/lib/*.test.ts`, `src/lib/ict/*.test.ts`) |
| DEPLOY-01 | `Cache-Control: s-maxage=60 + SWR=30` on fresh 200; `no-store` on stale/502 | live script (new) | `bash scripts/verify-deploy.sh $BASE_URL` | ❌ Wave 0 (planner creates) |
| DEPLOY-01 | Drill: forced upstream failure → `stale:true` envelope + STALE strip, no silent 200-fresh | live drill (preview, temporary flag) | check script against preview URL with flag set, then unset | ❌ Wave 0 |
| DEPLOY-01 | Baku-date + rollover-banner rendering spot-checks | manual rendering spot-check (D-10) | open live URL, confirm dates/banner read sensibly | n/a (human-verify at end-of-phase per config) |

### Sampling Rate
- **Per task commit:** `npm test -- --run` for touched areas (fast, <30s expected for unit suites)
- **Per wave merge:** full `npm test` + `npm run lint`
- **Phase gate:** full suite green + `npm run build` green + live checklist green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `scripts/verify-deploy.sh` (or planner-chosen equivalent) — covers DEPLOY-01 header/envelope/cache-age checks
- [ ] Temporary drill flag in `src/lib/yahoo.ts` + preview env var wiring — covers DEPLOY-01 stale-serve drill (removed before prod gate)
- [ ] None — existing test infrastructure covers all unit logic (DST, rollover, freshness, ICT math)

## Security Domain

> `security_enforcement: true`, ASVS L1 per `.planning/config.json:46-49` [VERIFIED: C:/Users/HP/Projects/liquidity-engine/.planning/config.json].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface (read-only terminal; explicitly out of scope) |
| V3 Session Management | no | No sessions/cookies issued |
| V4 Access Control | no | No privileged endpoints; drill flag is deploy-time env, not a user control |
| V5 Input Validation | partial | No user input to the proxy (parameterless `GET()`); Yahoo payload validated by shape-guard + symbol/order checks [VERIFIED: src/lib/yahoo.ts:47-123]; live script must treat envelope as untrusted JSON (parse defensively, `jq`-safe) |
| V6 Cryptography | no | No crypto handled; TLS terminated by platform |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Upstream data injection (malformed Yahoo payload → wrong levels) | Tampering | Shape-guard + `isValidPayload` + symbol-mismatch rejection already in `src/lib/yahoo.ts`; errors never cached |
| Stale data presented as live | Tampering / Info disclosure | Branch-split headers (`no-store` on stale/502) + `stale` flag + age-derived STALE strip; drill proves the path |
| Drill flag left enabled (forced-stale / info integrity) | Tampering | Preview-only scope, immediate removal + clean redeploy, prod re-verification of `stale:false` |
| Secret leakage via env | Info disclosure | Drill flag is non-secret but still server-only; never `NEXT_PUBLIC_`; `.env*` gitignored |

## Sources

### Primary (HIGH confidence)
- `app/api/yahoo/route.ts:1-21` (Read this session) — header branches, `force-dynamic`, `maxDuration = 15`, 502 envelope
- `src/lib/yahoo.ts:4-12,140-156,280-315` (Read this session) — hosts/headers, 60s TTL, 30-min stale cap, singleflight + serve-stale
- `src/lib/freshness.ts:5-61` (Read this session) — `StatusState`, 120s stale age, Baku-weekend CLOSED, Azerbaijani strip copy
- `src/lib/time.ts:1-17` (Read this session) — `BAKU_TZ = 'Asia/Baku'` via `date-fns-tz`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:49-67` (Read this session) — dynamic handlers uncached by default; `force-static` opt-in
- `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md:15-31,81-87` (Read this session) — build/start contract; Vercel verified adapter
- `https://vercel.com/docs/caching/cdn-cache` (WebFetch this session) — `s-maxage`/SWR function headers, strip-before-browser, cacheable criteria, `x-vercel-cache`, `proxy-revalidate`/`stale-if-error` unsupported

### Secondary (MEDIUM confidence)
- Tool probes this session: `git branch --show-current` → `master`; `node v24.11.1`; `npm 11.6.2`; `curl 8.17.0`; vercel/gh CLIs absent; no `vercel.json`; empty `next.config.ts`; `.gitignore` covers `.env*`/`.vercel`

### Tertiary (LOW confidence)
- WebSearch queries on Vercel CDN + CLI branch workflows returned no usable excerpts this session — no claims taken from search. Hobby-tier caps, Yahoo-from-serverless reachability, and `vercel` CLI package metadata are [ASSUMED] (see Assumptions Log).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — manifest + in-repo route/lib contracts read verbatim this session.
- Architecture: HIGH — header/TTL/stale/badge chain traced file-to-file with quotes.
- Pitfalls: MEDIUM — grounded in verified contracts + official Vercel/Next docs; Hobby-cap and Yahoo-reachability edges remain assumed.

**Research date:** 2026-09-06
**Valid until:** 2026-10-06 (stable domain; re-check Vercel CDN docs only if deploy slips past 30 days)
