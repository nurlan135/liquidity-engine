# External Integrations

**Analysis Date:** 2026-09-04

## APIs & External Services

**None wired up:**
- No `fetch`/`axios`/route-handler calls in `app/`, `lib/`, `components/` (grep for `fetch(|axios|process.env` returns zero matches)
- No API routes: no `app/api/` directory, no `src/server.*`, no Route Handlers
- No third-party SDK imports (stripe, supabase, firebase, openai, anthropic, aws) anywhere in source
- Installed-but-unused candidates for future integration work: `zustand` ^5.0.15 (client state), `lightweight-charts` ^5.2.1 (market-data visualization), `date-fns` ^4.4.0 + `date-fns-tz` ^3.2.0 (time handling)

**Planned / reference only:**
- `reference/design.html` + `reference/institutional_rules.md` - Design/spec reference material, not a runtime integration

## Data Storage

**Databases:**
- None. No ORM/client (`prisma`, `drizzle`, `supabase`, `mongoose`) in `package.json`; no connection strings or DB clients in code.

**File Storage:**
- Local filesystem only: static assets in `public/` (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`, `favicon.ico`)

**Caching:**
- None. No Redis/memory-cache library; relies on Next.js default fetch/router cache only.

## Authentication & Identity

**Auth Provider:**
- None (custom or third-party). No auth library (`next-auth`, `clerk`, `lucia`), no session/JWT handling, no middleware (`middleware.ts` absent).

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry/posthog/datadog SDK.

**Logs:**
- No logging framework. No `console.*` usage pattern established; no structured logging.

## CI/CD & Deployment

**Hosting:**
- Not configured. Scaffold defaults to Vercel (`app/page.tsx` links to `vercel.com/new` templates); no Dockerfile, no `docker-compose*`, no `.vercel/` dir.

**CI Pipeline:**
- None. No `.github/workflows/`, no CI config files detected.

## Environment Configuration

**Required env vars:**
- None. Zero `process.env` references in source; no `.env*` files present.

**Secrets location:**
- No secrets management configured. `.gitignore` pre-emptively ignores `.env*`, `*.pem`, `.vercel/`. Existence only noted per policy; no secret file contents read.

## Webhooks & Callbacks

**Incoming:**
- None. No webhook endpoints (`app/api/` absent).

**Outgoing:**
- None. No event dispatch, queue, or callback URLs in code.

---

*Integration audit: 2026-09-04*
