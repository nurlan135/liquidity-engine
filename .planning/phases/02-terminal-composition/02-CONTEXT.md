# Phase 2: Terminal Composition - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning

## Phase Boundary

Phase 2 composes the full dark-terminal shell on top of Phase 1's trusted numbers: a 3-panel layout per `reference/design.html` (#0A0A0F / #14141E / #00D9FF) with Module 2 live and other modules dimmed-unavailable, a live candlestick chart (lightweight-charts v5, dynamic `ssr:false`) with premium/discount shading + EQ price-line + DOL marker and honest stale/closed states, the 6-section institutional report shell with section 2 live, sentiment/calendar fixture panels with a rotating scenario set, all state in a single Zustand store. No deploy, no real APIs — those are Phase 3 / v2.

## Implementation Decisions

### Refresh & freshness behavior
- **D-01:** Terminal auto-polls `GET /api/yahoo` every 60s (matching the proxy's 60s TTL — faster polling would only re-read cache) plus a manual refresh button.
- **D-02:** Freshness surfaces in a global status strip under the terminal header (`LIVE · 12s ago` / `STALE · 4m` / `MARKET CLOSED`), visible across all three panels — not just a chart-header badge. Covers DATA-03 (cache age, never silent staleness).
- **D-03:** Weekend/closed state is honest: last closed candles stay rendered with the CLOSED strip state; today's still-forming candle (Phase 1 `forming: true` flag) may show but nothing is ever synthesized.

### Report display language
- **D-04:** Rendered terminal reads Azerbaijani (report sections, labels, rationale strings — matching `reference/institutional_rules.md`); code identifiers and comments stay English per Phase 1 D-17. No bilingual duplication.

### Fixture depth & interpretation
- **D-05:** Sentiment + calendar fixtures ship as a small rotating set of 2–3 snapshots (crowded-long, crowded-short, balanced), selectable or rotating — so the 60% crowded flag and the pre-news flag visibly respond rather than sitting on one static scenario.
- **D-06:** Fixture shapes mirror Myfxbook/ForexFactory payloads (symbol, long%, short% per broker; True AVG excluding Insta/FiboGroup; high-impact events with countdown timestamps). Trap-vs-genuine interpretation text is per-scenario prose fusing calendar + regime + position (MOCK-03), not computed logic.
- **D-07:** Fixtures served as local JSON (imported or via static route — planner's call); no new API routes required beyond what the chart needs.

### Unavailable & blocked-side presentation
- **D-08:** Non-live modules (1/3/4) and report sections (1, 3–6) render dimmed in place with an explicit UNAVAILABLE marker — the full 3-panel terminal shape is visible from day one, per `reference/design.html`.
- **D-09:** Blocked side (UI-04) is struck-through with a terse label (`BLOCKED — premium` / `BLOCKED — discount`); no one-line why — the strike plus label teaches at a glance.

### Code shape & verification
- **D-10:** Dashboard state (symbol, candles, dealing-range state, confidence) lives in a single Zustand store with memoized selectors; `src/lib/ict` pure functions never touch the store — selectors call math, math stays pure (STATE-01).
- **D-11:** Chart component uses lightweight-charts v5 via dynamic import (`ssr:false`); zone shading (premium/discount), EQ price-line, and DOL marker derive from the ICT range output. Zone-fill primitive is unspiked — planner time-boxes a spike with a bounded-box fallback.
- **D-12:** Candles travel proxy → store → chart as `YYYY-MM-DD` business-day strings; all session/date display runs through the Phase 1 Baku time util with injected clock.

### Claude's Discretion
Fixture snapshot contents (exact percentages, event names/offsets), status-strip wording details, UNAVAILABLE marker styling, poll jitter/singleflight details, and component file breakdown (`components/charts/` vs `components/dashboard/`) — researcher/planner discretion within the decisions above.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Domain spec (normative — Module 2 rules, report shape, sentiment math)
- `reference/institutional_rules.md` — 4 ICT modules + 6-section institutional report, TIME>PRICE, True-AVG excl. Insta/FiboGroup, 60% crowded threshold, Azerbaijani language (code identifiers stay English). Phase 2 implements Module 2 display + report section 2 live + fixtures for Module 1/calendar inputs.
- `reference/design.html` — 3-panel dark terminal mock (#0A0A0F / #14141E / #00D9FF), grid layout (280px / 1fr / 320px), header status line pattern. Layout target for UI-01.

### Project docs
- `.planning/PROJECT.md` — scope, constraints (zero budget, Zustand-only, pure functions, no LLM), key decisions.
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: DATA-03, UI-01…UI-04, MOCK-01…MOCK-03, STATE-01. Out-of-scope table (no LLM, no real APIs, no counter-zone signals).
- `.planning/ROADMAP.md` — Phase 2 goal + 4 success criteria + UI hint.
- `.planning/phases/01-data-foundation-ict-core/01-CONTEXT.md` — Phase 1 locked decisions: proxy envelope `{candles, lastUpdatedISO, stale, source}`, `forming: true` flag, close-only re-anchor, English identifiers, Baku time util. Phase 2 consumes all of these.

### Codebase maps
- `.planning/codebase/STACK.md` — Next.js 16.3.4 + React 19 + TS strict; zustand, lightweight-charts v5, date-fns-tz installed (wiring is Phase 2's job); `@/*` → repo root.
- `.planning/codebase/ARCHITECTURE.md` — client/server boundary (`"use client"` in `components/`, never convert `app/layout.tsx`); domain logic in `lib/`, never `components/ui/`.
- `.planning/codebase/STRUCTURE.md` — where to add code: `components/dashboard/`, `components/charts/`, `lib/<domain>/`; tests co-located.
- `.planning/codebase/CONVENTIONS.md` — `cn` from `"cn"`, tokens via `app/globals.css` (no hardcoded hex), `data-slot` attributes, named exports, no barrels.

## Existing Code Insights

### Reusable Assets
- `src/lib/ict/*` (range, levels, bias, dol, regime, rollover + types): pure math core with green test suite — Phase 2 selectors call these, never reimplement.
- `app/api/yahoo/route.ts`: Phase 1 proxy with `{candles, lastUpdatedISO, stale, source}` envelope — the poll target and freshness source.
- Phase 1 time util (`src/lib/time.ts` or equivalent): Asia/Baku logic with injected clock — reused for countdowns and session display.
- `components/ui/*` (button, dialog, toast, calendar, card, dropdown-menu): presentational primitives for panels/badges; shadcn-allowed list only.
- `lib/utils.ts` (`export { cn } from "cn"`): class-merging convention for new components.

### Established Patterns
- Server-first App Router: `app/` routes are Server Components by default; chart/store components are `"use client"`; Yahoo is fetched server-side only.
- Styling contract: theme tokens in `app/globals.css`, components reference tokens + `data-slot`, never hardcoded hex.
- Path alias `@/*` → repo root for `src/lib/ict` and store imports.

### Integration Points
- New: terminal shell in `app/page.tsx` (replaces stock placeholder) composing three panels per `reference/design.html`.
- New: chart component (`components/charts/` or `components/dashboard/`) — dynamic lightweight-charts import, reads candles + range state from Zustand.
- New: report component — 6 sections, section 2 wired to bias/DOL/regime selectors, others UNAVAILABLE.
- New: fixture data (local JSON) + sentiment/calendar panels with scenario switching.
- New: `lib/store.ts` (or equivalent) — single Zustand store; math never touches the store.

## Specific Ideas

60s auto-poll cadence chosen to match the proxy TTL exactly; global status strip chosen over chart-header-only badges so staleness is unmissable; rotating fixture set chosen so flags demonstrably respond.

## Deferred Ideas

None — discussion stayed within phase scope. (Phase 3 owns: Vercel deploy, CDN header verification, cold-start/stale-serve drill, live-URL checklist. v2 owns: real sentiment/calendar APIs, Modules 1/3/4 live logic.)

---

*Phase: 2-Terminal Composition*
*Context gathered: 2026-09-05*
