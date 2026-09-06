# Phase 3: Production Deploy & Verification - Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** 4 (1 new, 1 temporary modify, 2 reference/unchanged)
**Analogs found:** 3 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/verify-deploy.sh` (new) | utility (shell check script) | request-response (live-HTTP assertions) | — none in repo | no-analog |
| `src/lib/yahoo.ts` (temporary modify: drill flag) | service | request-response + serve-stale | `src/lib/yahoo.ts` (itself) | exact |
| `app/api/yahoo/route.ts` (reference, unchanged) | route (Route Handler) | request-response | `app/api/yahoo/route.ts` (itself) | exact |
| `next.config.ts` (reference, unchanged/empty) | config | n/a | `next.config.ts` (itself) | exact |

## Pattern Assignments

### `scripts/verify-deploy.sh` (utility, request-response) — NEW, no analog

**Analog:** none. Repo has no `scripts/` directory and no checked-in shell scripts (only `node_modules/**/scripts/*.sh`, which are install mirrors, not patterns). Planner should use RESEARCH.md §"Live-URL header assertions" skeleton instead.

**Conventions the script must follow (from verified repo facts):**
- Zero-dependency: `curl` + `grep` only (curl 8.17.0 present; D-09 wants re-runnable anywhere). Parse envelope defensively — treat live JSON as untrusted (RESEARCH.md Security V5).
- Assert against the deployment URL directly with `curl -sSI` (not browser DevTools): Vercel strips `s-maxage`/`stale-while-revalidate` before forwarding to browsers when no `CDN-Cache-Control` is set.
- Warm-up first (cold CDN + cold module-level `payloadCache` → first request may 502 correctly per contract), then assert MISS→HIT via `x-vercel-cache`.
- Expected values: `s-maxage=60`, `stale-while-revalidate=30`, envelope `{candles, lastUpdatedISO, stale, source}`, age < 120s (`STALE_AFTER_SEC`), page HTML 200.
- Vitest boundary: keep vitest for unit logic only (`npm test` = `vitest run`, include `src/**/*.test.ts`, `app/**/*.test.ts` per `vitest.config.ts` lines 8). Shell script covers live-HTTP; do not add a vitest-live suite unless planner explicitly chooses the discretion alternative.

---

### `src/lib/yahoo.ts` (service, request-response + serve-stale) — TEMPORARY drill-flag edit

**Analog:** `src/lib/yahoo.ts` (itself, git-tracked)

**Imports pattern** (lines 1-2):
```ts
import { toBakuYMD } from '@/src/lib/time';
import type { Candle } from '@/src/lib/ict/types';
```
Path alias `@` → repo root (see `vitest.config.ts` line 5: `resolve: { alias: { '@': path.resolve(__dirname, '.') } }`). New code in this file needs no new imports for the drill flag (`process.env` is global; `UpstreamError` is defined in-file).

**Error-type pattern** (lines 14-23):
```ts
export class UpstreamError extends Error {
  readonly retryable: boolean;
  readonly status?: number;
  constructor(message: string, opts: { retryable?: boolean; status?: number } = {}) {
    super(message);
    this.name = 'UpstreamError';
    this.retryable = opts.retryable ?? false;
    if (opts.status !== undefined) this.status = opts.status;
  }
}
```
Branch on the structured `retryable` discriminator, never message text (in-file comment line 262: `// WR-11: branch on the structured discriminator, never message text.`).

**Drill-flag insertion point** — top of `fetchNQDaily`, before the cache lookup (lines 280-288):
```ts
export async function fetchNQDaily(
  now: Date,
  fetchFn: FetchFn = fetch,
  sleep: SleepFn = realSleep,
): Promise<Envelope> {
  const cached = payloadCache.get(CACHE_KEY);
  ...
```
Recommended temporary edit (server-only, preview-scoped, removed after drill; never `NEXT_PUBLIC_` — repo has zero `process.env` references):
```ts
if (process.env.DRILL_FORCE_STALE === '1') {
  throw new UpstreamError('drill: upstream killed', { retryable: true });
}
```
Placed before fetch it forces the existing failure path: warm cache → stale branch (lines 300-307) returns `{...warm.payload, stale: true, source: 'stale'}`; cold cache → throw → route 502. Do NOT place inside `fetchUpstream` retry loop (would multiply sleeps: 4 attempts × 4s timeouts + backoff, line 142 budget comment).

**Serve-stale contract** (lines 300-307) — what the drill exercises, do not modify:
```ts
} catch (err) {
  const warm = payloadCache.get(CACHE_KEY);
  // WR-09: only serve stale within MAX_STALE_MS; non-retryable 4xx fail loudly (IN-07).
  const nonRetryable4xx = err instanceof UpstreamError && err.retryable === false && err.status !== undefined && err.status >= 400 && err.status < 500;
  if (warm && !nonRetryable4xx && now.getTime() - warm.fetchedAt < MAX_STALE_MS) {
    return { ...warm.payload, candles: warm.payload.candles.map((c) => ({ ...c })), stale: true, source: 'stale' };
  }
  throw err;
}
```
Constants: `CACHE_TTL_MS = 60_000` (line 141), `MAX_STALE_MS = 30 * 60_000` (line 147). `retryable: true` on the drill error is load-bearing — `retryable: false` + 4xx status would bypass the warm-cache branch.

**Test pattern** (`src/lib/yahoo.test.ts` lines 1-4, 44):
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetYahooCacheForTests, fetchNQDaily, parseChartJson } from '@/src/lib/yahoo';
import nullFixture from '@/src/lib/__fixtures__/yahoo-null.json';
...
const noSleep = async () => {};
```
Injectable `fetchFn`/`sleep` params + `__resetYahooCacheForTests()` + `noSleep` stub. If planner wants a unit test for the drill flag, copy this shape (mock fetchFn, `noSleep`, reset cache in `beforeEach`). Note: drill flag reads `process.env` — test must set/unset `process.env.DRILL_FORCE_STALE` around the case to avoid leaking into other suites.

---

### `app/api/yahoo/route.ts` (route, request-response) — REFERENCE, do not modify

**Analog:** `app/api/yahoo/route.ts` (itself, git-tracked, 21 lines — full file)

```ts
import { fetchNQDaily, UpstreamError } from '@/src/lib/yahoo';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET() {
  try {
    const envelope = await fetchNQDaily(new Date());
    return Response.json(envelope, {
      headers: {
        'Cache-Control': envelope.stale ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    const message = err instanceof UpstreamError ? err.message : 'upstream unavailable';
    return Response.json({ error: message, retryAfter: 60 }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
    });
  }
}
```
Planner notes: header branches are the CDN source of truth (function-set headers override `next.config.ts`/`vercel.json` for the same route). `force-dynamic` is correct — never add `force-static`. `maxDuration = 15` matches the WR-08 fetch budget comment in `yahoo.ts` line 142. `UpstreamError` message surfaces to the 502 body — drill message text is client-visible; keep it neutral.

---

### `next.config.ts` (config) — REFERENCE, leave empty unless planner chooses config headers

**Analog:** `next.config.ts` (itself, git-tracked):
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```
Default/empty `NextConfig`, ESM `export default`. RESEARCH.md recommendation is dashboard-only (no `vercel.json`; no `vercel.json` exists in repo) since function-set headers already suffice. If planner adds `headers()` here, it must not conflict with the route's branch-split headers.

---

## Shared Patterns

### Status derivation (drill assertion surface)
**Source:** `src/lib/freshness.ts` (lines 32-46, 53-61)
**Apply to:** verify script expectations + drill success criteria
```ts
export function deriveStatus(
  envelope: EnvelopeFreshness,
  now: Date = new Date(),
): DerivedStatus {
  // Weekend closure wins over envelope flags: Baku Sat/Sun (D-03, RESEARCH A6).
  const weekday = bakuWeekday(now);
  const ageSec = parseAgeSec(envelope.lastUpdatedISO, now);
  if (weekday === '6' || weekday === '7') {
    return { state: 'CLOSED', ageSec };
  }
  if (envelope.stale || ageSec >= STALE_AFTER_SEC) {
    return { state: 'STALE', ageSec };
  }
  return { state: 'LIVE', ageSec };
}
```
```ts
export function formatStripAge(state: StatusState, ageSec: number): string {
  if (state === 'CLOSED') {
    return 'BAZAR BAĞLIDIR — son bağlanış şamları';
  }
  if (state === 'STALE') {
    return `STALE · ${ageCopy(ageSec)} — son keş göstərilir`;
  }
  return `LIVE · ${ageCopy(ageSec)}`;
}
```
Pitfall: run the kill-drill on a Baku weekday — on Sat/Sun the strip shows CLOSED regardless of the envelope flag. `STALE_AFTER_SEC = 120` (line 8).

### Baku time util (rendering spot-check background)
**Source:** `src/lib/time.ts` (lines 1-8)
**Apply to:** live-URL DST-date spot-check (D-10, rendering-only; logic already unit-tested)
```ts
import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';

export const BAKU_TZ = 'Asia/Baku';
export const CME_TZ = 'America/Chicago';

export function toBakuYMD(d: Date | number): string {
  return formatInTimeZone(d, BAKU_TZ, 'yyyy-MM-dd');
}
```

### Pre-deploy gate (CI-equivalent)
**Source:** `package.json` (lines 5-12)
**Apply to:** run before first deploy and at phase gate
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```
Gate: `npm run lint && npm test && npm run build`. No manifest changes in this phase; Vercel CLI only via `npx` (never `--save`).

### Gitignore boundaries (drill hygiene)
**Source:** `.gitignore` (lines 33-37)
**Apply to:** drill flag + Vercel linkage
```
# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel
```
Never commit the drill env var, `.env*`, or `.vercel/`. Vercel env var for the drill must be Preview-scoped, deleted + clean redeploy after the drill.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/verify-deploy.sh` | utility (shell script) | request-response (live-HTTP) | No `scripts/` dir, no checked-in `.sh` files in repo (only node_modules install mirrors, which are not valid analogs). Planner uses RESEARCH.md §"Live-URL header assertions" skeleton |

Non-code steps with no file analog (planner handles as process steps, not code actions): `master`→`main` branch rename (D-02, do before Vercel connection), Vercel project creation + GitHub connection + `vercel.app` subdomain (D-01/D-03/D-04, dashboard or `npx vercel` behind human-verify checkpoint), dashboard redeploy-as-rollback (D-05).

## Metadata

**Analog search scope:** repo root (`scripts/**`, `src/lib/*.ts`, `app/api/yahoo/route.ts`, `next.config.ts`, `package.json`, `vitest.config.ts`, `.gitignore`, `**/*.sh` glob)
**Files scanned:** 20+ lib files via `src/lib/*.ts` glob; full reads: route (21 lines), yahoo.ts (head 1-140 + 140-200 + 240-315), freshness.ts, time.ts, next.config.ts, package.json, vitest.config.ts, .gitignore, yahoo.test.ts (head 60)
**Git-tracked verification:** `git ls-files` confirms all 8 cited paths tracked (non-empty output)
**Pattern extraction date:** 2026-09-06
