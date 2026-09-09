# Stack Research: v3.0 Execution (Modul 4) — WHY NOW Trigger + Fatal Flaw + Paper Order Ticket

**Domain:** Execution layer on existing NQ terminal (trigger engine, invalidation, paper ticket UI) — subsequent milestone, brownfield only
**Researched:** 2026-09-09
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `src/lib/ict` pure functions (extended: `trigger.ts`, `invalidation.ts`, `ticket.ts`) | no version (own code) | WHY NOW time+structure condition, fatal-flaw invalidation condition, paper position-size math | Purity constraint (no I/O, inject time) is what made v1.0/v2.0 testable with 298 green tests; trigger evaluation is deterministic candle arithmetic over data the store already holds (Judas confirmed + SMT aligned + AMD phase + dealing-range position). Same shape as `amd.ts`/`confluence.ts` — a fusion function over existing detector outputs, not a new detector. Fatal flaw is the mirror: a disjunction of invalidation predicates (e.g. opposite sweep, SMT flip, range break) returning `{ invalidated, reason }` verbatim for §3 |
| Zustand derived selectors (`selectTrigger`, `selectFatalFlaw`, ticket slice) | ^5.0.15 (installed, verified in node_modules) | Trigger/flaw evaluation + ticket state as derived selectors over existing legs | v2.0 proved the pattern: `selectAMD`/`selectConfluence` derive from `nq`/`es`/`nq1h`/`nq15m` legs without storing derived state, so trigger can never desync from detectors. Thresholds (calibratable per milestone goal) live as plain store fields with setters — not derived — so UI sliders write them and selectors read them in the same render pass |
| Calibratable thresholds as store fields + Base UI slider/number-field wrapper | `@base-ui/react` ^1.8.0 (installed; `slider/` and `number-field/` component dirs verified present) | UI control for trigger sensitivity (e.g. agreement-count gate, sweep-confirmation window) | Zero new installs: `@base-ui/react` already ships `slider` and `number-field`. Add one `components/ui/slider.tsx` wrapper following the existing `button.tsx`/`dialog.tsx` pattern (primitive re-export with `data-slot` + Tailwind classes). Thresholds stay numeric in the store with clamped setters; the slider is a thin view over them. This satisfies "kalibrlənəbilən threshold" with no form library |
| Existing `dialog` + `card` + `button` + `toast` primitives | own wrappers over `@base-ui/react` (installed) | Paper order ticket modal (entry/SL/TP, size, risk panel) + WHY NOW alert toast | Ticket is a read mostly-modal: levels come from `selectLevels()` + trigger output, size is one division (risk $ ÷ stop distance). `dialog.tsx` already exists and is proven; `toast.tsx` is already wired in `app/page.tsx` (`<Toaster>`) and used for poll-failure alerts in `terminal-shell.tsx` (`toast.add(...)`), so the WHY NOW fire path is `toast.add({ title, description })` with zero new plumbing |
| lightweight-charts v5 `createSeriesMarkers` + `createPriceLine` | ^5.2.1 (installed, verified) | Trigger/fire + fatal-flaw pins on chart; entry/SL/TP price lines on ticket confirm | `nq-chart.tsx` already owns both APIs: the v5 `createSeriesMarkers` import pattern (line ~232) drives Judas/SMT pins, and `createPriceLine` refs drive EQ/DOL/Asia lines. Trigger marker + flaw marker reuse the same markers handle (new shape/color only); ticket levels reuse `createPriceLine` refs. No chart-lib change, no new overlay primitive |
| Manual `localStorage` helpers (`src/lib/ticket-storage.ts`, own code) | no version (own code) | Persist ticket drafts + threshold calibration across reloads | A 30-line guarded JSON read/write (try/catch parse, schema-version key, client-only access) avoids the zustand `persist` middleware SSR rehydration trap (Next.js 16 App Router renders server-first; `persist` needs `skipHydration` + rehydration dance). Ticket/threshold state is client-ephemeral by nature — manual helpers with lazy `useState` init keep hydration deterministic |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | **No new dependencies.** Every v3.0 capability maps onto an installed package or pure own-code. Headline finding, same as v2.0: the existing stack already covers the milestone. The only new *file* (not package) is `components/ui/slider.tsx` composed from the already-installed `@base-ui/react/slider` |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| vitest | ^5.0.0 (installed) | Pin trigger truth-table (all Judas×SMT×AMD×position combos), fatal-flaw predicate table, ticket math (size = risk ÷ stop-distance, divide-by-zero → refuse), threshold-boundary cases — same pure-function style as `amd.test.ts`/`confluence.test.ts` |
| Existing store test harness | own code (`store.test.ts`) | Add selector tests: trigger derives from legs (never stored), threshold setter clamps, stale-leg → trigger refuses null with owning-leg `lastError` verbatim (same refuse-with-reason envelope as Phase 9 §3 selectors) |

## Installation

```bash
# No installs required — all capabilities are covered by installed packages:
# next 16.3.4, react 19.2.8, zustand ^5.0.15, lightweight-charts ^5.2.1,
# date-fns ^4.4.0, date-fns-tz ^3.2.0, @base-ui/react ^1.8.0
# (slider + number-field primitives verified present in node_modules/@base-ui/react)
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Trigger as pure fusion over existing detector outputs (`trigger.ts` reads Judas/SMT/AMD/position) | New independent detector re-reading candles | Never for v3.0 — re-reading candles duplicates swing/session logic and the two copies will disagree. The trigger answers "WHY NOW" by fusing answers the terminal already computed; disagreement between trigger and §3 prose would destroy institutional credibility |
| Thresholds as plain numeric store fields + slider view | URL search-params for thresholds | Only if shareable calibrated setups become a requirement (link-sharing a threshold config). For v3.0, store + localStorage is simpler and survives reload; URL params add parse/validate surface for zero milestone payoff |
| Manual localStorage helpers | zustand `persist` middleware | Only if ticket state grows into a multi-slice domain needing cross-tab sync or versioned migrations. `persist` is built into zustand v5 (no new dep) but buys SSR rehydration complexity; a guarded 30-line helper is the smaller blast radius |
| Uncontrolled/controlled inputs with one division for size | `react-hook-form` + `zod` for the ticket form | Never for a paper ticket with ~3 numeric fields — RHF+zod add two dependencies and a schema layer to validate what is essentially `risk ÷ distance`. Clamp + refuse-null on invalid input matches the codebase's existing honest-degrade contract |
| `toast.add()` for WHY NOW fire alert | Browser Notification API / push service | Only if background alerts (tab closed) become a requirement — that needs a service worker + permission flow + (for mobile) a push service, all out of zero-budget scope. In-terminal toast is the honest scope: the terminal is an observation instrument, not an alerting service |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any broker/trading SDK (`ccxt`, broker REST clients) | Milestone is explicitly paper-only ("real broker bağlantısı yoxdur"); a broker dep invites credential handling, order-state machines, and fill reconciliation — an entire hidden milestone | Pure `ticket.ts` math (entry/SL/TP/size/risk-reward) rendered in the dialog; label every surface "Kağız" |
| React Query / SWR / any server-state lib | Same verdict as v2.0: fights the proven 60s CDN TTL + per-leg singleflight; trigger reads from the store, not from a second cache | Existing legs + derived selectors |
| `react-hook-form`, `zod`, any form/validation lib | Three numeric fields do not justify two dependencies; validation here is domain clamping (stop ≠ entry, risk > 0), not schema parsing | Controlled inputs + pure clamp/refuse helpers in `ticket.ts` |
| WebSocket / streaming feed for "live" triggers | Vercel Hobby has no cheap socket story; trigger conditions evolve on closed-candle structure (1H/15M legs already poll at 60s), not tick data | Existing staggered four-leg poll; trigger re-derives on each store update for free |
| LLM calls for WHY NOW narration | Determinism is a project constraint; "niyə indi" is a verbatim-reason render of which predicates fired (same locked-copy contract as §3 D-01/D-03/D-04) | Pure `trigger.ts` returning `{ fired, reasons[] }` rendered verbatim |
| Backend DB (Prisma/Supabase/Neon) for ticket history | Zero-budget + no-auth project; a database buys a schema, migrations, and an auth story for a paper ticket log | `localStorage` ticket log (append-only array, bounded to last N) — exportable later if v3.1 wants it |
| Auth / sessions / user accounts | Out of scope per PROJECT.md; paper tickets are single-operator local state | Nothing — local state only |
| New charting library or drawing plugin | v5 markers + price lines already drive every overlay; trigger/flaw pins are new marker shapes, not a new rendering capability | Existing `nq-chart.tsx` handles |

## Stack Patterns by Variant

**If trigger fires too often on live data (nuisance rate high during observation):**
- Tighten via the calibratable threshold (require confirmed Judas + unsuppressed aligned SMT + AMD continuation, i.e. the `yüksək inam` tier as the fire gate) rather than adding hysteresis machinery
- Because the observation period exists precisely to calibrate this; code the gate as a threshold, not as fixed logic

**If fatal-flaw predicates disagree with the trigger (flaw fires on the same bar as trigger):**
- Flaw wins, always: evaluate flaw first in the selector and return `{ fired: false, suppressedBy: flawReason }` — a suppressed trigger renders as "Gözlənilir", never as a flip-flop
- Because alternating fire/flaw on consecutive polls destroys trust faster than a missed setup

**If ticket size math hits edge inputs (stop distance → 0, risk → 0/negative):**
- Refuse with reason (return null + reason string), never clamp to a fake size — same honest-degrade contract as every Phase 9 selector
- Because a paper ticket that invents a size when the math is undefined teaches the operator to distrust the risk panel

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@base-ui/react` ^1.8.0 `slider` / `number-field` | Existing `components/ui/*` wrapper pattern (`button.tsx`, `dialog.tsx` import from `@base-ui/react/*`) | New `slider.tsx` follows the identical re-export + `data-slot` + Tailwind recipe; no version bump, no new package |
| zustand ^5.0.15 + React 19.2.8 | New selector + threshold-field additions to `useDashboard` | Same `create<DashboardState>()` store; stable selector-function subscription (per 03.2 lesson — no `useShallow` over fresh-object selectors) |
| lightweight-charts ^5.2.1 | New marker shapes + 3 ticket price lines on existing handles | Markers handle and price-line refs already exist in `nq-chart.tsx`; additive only, existing overlays untouched |
| Next 16.3.4 App Router | Ticket dialog + slider are client components (`'use client'`, like `report.tsx`) | No route changes; no API changes — Yahoo proxy legs are untouched by v3.0 |

## Integration Points with Existing Code

| Existing piece | v3.0 touchpoint | Change shape |
|---------------|-----------------|--------------|
| `src/lib/ict/amd.ts`, `judas.ts`, `smt.ts` | `src/lib/ict/trigger.ts` (new) | Fusion function over existing outputs: `evaluateTrigger({ judas, smt, amd, position, thresholds })` → `{ fired, reasons[] }`; imports types only, re-derives nothing from candles |
| `src/lib/ict/*` | `src/lib/ict/invalidation.ts` (new) | Disjunction of flaw predicates over the same inputs → `{ invalidated, reason }`; flaw-first ordering enforced in the selector, not in render |
| `src/lib/ict/levels.ts` (`LevelsOutput`) | `src/lib/ict/ticket.ts` (new) | `size = riskAmount ÷ |entry − stop|` + R-multiple table from levels + trigger direction; pure, refuse-with-reason on degenerate inputs |
| `src/lib/confluence.ts` (`deriveConvictionTier`) | Trigger fire gate | `yüksək inam` tier as the default fire gate — trigger fires only on the tier §3 already displays, so chart pin, §3 prose, and toast can never disagree |
| `src/lib/store.ts` (`useDashboard`) | `selectTrigger`, `selectFatalFlaw`, threshold fields + setters, ticket draft fields | Derived selectors with the Phase 9 refuse-null envelope (stale/empty leg → null, reason in owning-leg `lastError`); thresholds as plain state with clamped setters |
| `components/dashboard/report.tsx` (§3) | New WHY NOW / flaw block beside the five existing §3 blocks | Same locked-copy contract: detector reasons verbatim, `S3_EMPTY_COPY` fallback; flaw-suppressed trigger renders "Gözlənilir"-style copy, never a banner |
| `components/charts/nq-chart.tsx` | Trigger + flaw markers; ticket entry/SL/TP price lines | Reuse `createSeriesMarkers` handle + `createPriceLine` refs; additive shapes/colors only |
| `components/ui/dialog.tsx` + `card.tsx` + `button.tsx` | Order ticket modal | Compose existing primitives; add `components/ui/slider.tsx` (from installed `@base-ui/react/slider`) for threshold calibration + risk-amount input |
| `components/ui/toast.tsx` (`toast.add`, wired in `app/page.tsx`) | WHY NOW fire alert | `toast.add({ title, description })` on fire-transition (edge-trigger in the component, not in the selector — selectors stay pure-derivation, fire-edge detection is view logic) |
| `src/lib/ticket-storage.ts` (new, own code) | Ticket draft + threshold persistence | Guarded localStorage JSON helpers, client-only, versioned key; no `persist` middleware, no hydration risk |

## Sources

- Codebase (HIGH confidence) — `package.json` deps; `node_modules` verified: zustand 5.0.15, lightweight-charts 5.2.1, `@base-ui/react` with `slider/` + `number-field/` dirs; `src/lib/store.ts` selector patterns; `src/lib/confluence.ts` tier gate; `components/charts/nq-chart.tsx` markers + price-line handles; `components/ui/toast.tsx` + `app/page.tsx` `<Toaster>` wiring; `components/dashboard/report.tsx` §3 locked-copy contract
- `.planning/research/STACK.md` v2.0 (HIGH confidence for "no new deps" precedent) — same headline finding transfers: installed stack covers the milestone
- PROJECT.md v3.0 scope (HIGH) — paper-only ticket, calibratable thresholds, zero budget, no LLM, no broker

---
*Stack research for: v3.0 Execution (Modul 4) — WHY NOW trigger + fatal flaw + paper order ticket*
*Researched: 2026-09-09*
