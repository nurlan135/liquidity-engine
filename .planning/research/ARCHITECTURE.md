# Architecture Research

**Domain:** v3.0 Execution (Modul 4) on existing Liquidity Engine terminal — WHY NOW trigger + fatal-flaw invalidation + paper order ticket
**Researched:** 2026-09-09
**Confidence:** HIGH (direct codebase read: `src/lib/store.ts`, `src/lib/ict/amd.ts`, `src/lib/confluence.ts`, `components/dashboard/terminal-shell.tsx`, `components/dashboard/report.tsx`, `components/charts/nq-chart.tsx`, `src/lib/report.ts`, `app/api/yahoo/route.ts`)

## Standard Architecture

### System Overview

Existing v2.1 system — v3.0 adds no new layers, only new pure modules + selectors + panels inside the existing ones:

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ TerminalShell│  │    Report    │  │ Ticket / Exec /   │  │
│  │ (3-panel grid│  │ (§1–§6 rule- │  │ Flaw panels (NEW, │  │
│  │  + overlays) │  │  based prose)│  │  replace 3 cards) │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                   │              │
├─────────┴─────────────────┴───────────────────┴──────────────┤
│                    Zustand 5 store (`src/lib/store.ts`)      │
│   legs (nq/es/nq1h/nq15m) + selectors (selectRange…selectAMD │
│   + NEW selectTrigger/selectFatalFlaw/selectTicket)          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  `src/lib/ict` pure fns (no I/O, inject time)        │    │
│  │  range/bias/dol/regime/levels/rollover/join/smt/     │    │
│  │  asia/judas/amd/fvg/aggregate                        │    │
│  │  + NEW trigger.ts + invalidation.ts                   │    │
│  │  `src/lib` selector-level: confluence/thin-tier/      │    │
│  │  zone-bands/chart-mapper + NEW ticket.ts              │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Yahoo proxy (`app/api/yahoo`) 60s cache + serve-stale      │
│  Dual-poll 4-leg grid (:00/:15/:30/:45) + NqChart (lw-c v5) │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `src/lib/ict/trigger.ts` (NEW) | WHY NOW time+structure evaluator: Judas + AMD + SMT + regime → fired/not + verbatim reason + calibratable thresholds | Pure fn `evaluateTrigger(input): TriggerOutput`, exported `TRIGGER_*` consts, boundary validation throwing on malformed input (judasSwing/amdPhase precedent) |
| `src/lib/ict/invalidation.ts` (NEW) | Fatal-flaw checker: conditions that cancel the setup → invalidated/not + verbatim reason | Pure fn `checkFatalFlaw(input): FatalFlawOutput`, same envelope discipline as trigger |
| `src/lib/ticket.ts` (NEW, NOT in ict/) | Paper-ticket level math: entry/SL/TP from range+levels+bias+trigger direction + size/risk arithmetic | Pure fn `computeTicket(input): TicketLevels \| null`; lives beside `confluence.ts` because risk-sizing is not ICT methodology — keeps `ict/` purity narrative clean |
| `store.ts` selectors (MODIFIED) | `selectTrigger`, `selectFatalFlaw`, `selectTicket`: refuse-null-on-stale + try/catch-never-throw, shared `asOf` derivation | Same shape as `selectAMD`/`selectConfluence`; ticket returns null when trigger not fired (honest empty, never zeroes) |
| `report.ts` + `report.tsx` (MODIFIED) | Flip §4/§5/§6 `unavailable`→`live`; add three live blocks following the §3 precedent (verbatim reasons, locked fallbacks) | `REPORT_SECTIONS` state flip + per-section sub-blocks; no new composer module |
| `ExecutionProtocol` / `TicketPanel` / `FatalFlaw` (NEW components) | Replace the three `UNAVAILABLE` cards in `terminal-shell.tsx` (`data-slot="execution-protocol"`, `"ticket"`, `"fatal-flaw"`) | Thin render components, math-free, reading store selectors only |
| `NqChart` (MODIFIED, props-only) | One trigger pin + optional ticket entry/SL/TP lines | New optional props (`triggerBarDate`, `ticket`) reusing `buildOverlayMarkers` ordering + remove-then-create price-line cycle |

## Recommended Project Structure

```
src/
├── lib/ict/              # purity boundary: no I/O, no Date.now, inject time
│   ├── trigger.ts        # NEW — evaluateTrigger + TRIGGER_* thresholds
│   ├── trigger.test.ts   # NEW — gate table, threshold calibration pins
│   ├── invalidation.ts   # NEW — checkFatalFlaw
│   ├── invalidation.test.ts # NEW
│   ├── amd.ts            # UNCHANGED (trigger reads its output, never edits it)
│   ├── judas.ts          # UNCHANGED
│   ├── smt.ts            # UNCHANGED
│   └── types.ts          # MODIFIED only if shared Direction type needed
├── lib/
│   ├── ticket.ts         # NEW — computeTicket (selector-level, not ict/)
│   ├── ticket.test.ts    # NEW
│   ├── report.ts         # MODIFIED — §4/§5/§6 state flip
│   ├── store.ts          # MODIFIED — 3 selectors + ticket-input slice
│   └── chart-mapper.ts   # MODIFIED only if ticket-line input guard needed
components/
├── dashboard/
│   ├── terminal-shell.tsx # MODIFIED — swap 3 UNAVAILABLE cards for live panels
│   ├── report.tsx         # MODIFIED — §4/§5/§6 live blocks
│   ├── execution-protocol.tsx # NEW — trigger status + reason verbatim
│   ├── ticket-panel.tsx       # NEW — entry/SL/TP + size/risk inputs
│   └── fatal-flaw.tsx         # NEW — invalidated/not + reason verbatim
└── charts/
    └── nq-chart.tsx       # MODIFIED — trigger marker + ticket lines (props-only)
```

### Structure Rationale

- **`trigger.ts` + `invalidation.ts` inside `ict/`:** they fuse ICT detector outputs (Judas/AMD/SMT) under TIME>PRICE logic — same family as `amd.ts`/`confluence.ts` inputs. Purity constraint applies verbatim: injected `asOf`, boundary `throw`, no clock reads.
- **`ticket.ts` outside `ict/`:** position-size and risk-reward arithmetic is brokerage math, not ICT methodology. Precedent is `confluence.ts` ("selector-level scoring lives here, never inside src/lib/ict, so ict purity holds") and `thin-tier.ts`/`zone-bands.ts`. Keeps a future monorepo extraction of `ict/` clean.
- **No new route, no new poll leg, no new store file:** the four-leg grid (NQ daily, ES daily, NQ 1H, NQ 15M) already feeds every input the trigger needs. A 5M/1M leg is explicitly out (Yahoo allowlist + zero budget); the trigger is therefore **15M-close-gated by design** and §4 copy must say so honestly.

## Architectural Patterns

### Pattern 1: Detector → Evaluator → Selector → Verbatim Prose

**What:** New features copy the v2.0 §3 pipeline exactly: pure detector (`judasSwing` precedent) → pure fuser (`amdPhase` precedent) → store selector with refuse-null envelope (`selectAMD` precedent) → render component printing `.reason` verbatim with locked fallback copy (`report.tsx` S3 precedent).
**When to use:** Trigger (§4) and fatal flaw (§6) — both are reasons-first outputs.
**Trade-offs:** Pro: determinism, testability, UAT-verifiable prose; zero new data flow to invent. Con: three hops for a boolean — accepted, it is what makes §3 auditable today.

**Example:**
```typescript
// src/lib/ict/trigger.ts — shape follows amd.ts
export interface TriggerInput {
  judas: JudasOutput | null;
  amd: AmdOutput | null;
  smt: SmtOutput | null;
  regime: RegimeOutput | null;
  asOf: number; // injected, never Date.now()
}
export interface TriggerOutput {
  fired: boolean;
  reason: string; // verbatim-ready Azerbaijani sentence
  inputs: { judas: JudasOutput | null; amd: AmdOutput | null; smt: SmtOutput | null };
}
export const TRIGGER_DISP_MIN = 0.5; // calibratable — exported, pinned by test
export function evaluateTrigger(input: TriggerInput): TriggerOutput { /* gates */ }
```

```typescript
// store.ts — shape follows selectAMD
selectTrigger: () => {
  try {
    const judas = get().selectJudas();
    const amd = get().selectAMD(); // shares the single asOf derivation
    const smt = get().selectSMT();
    const regime = get().selectRegime();
    if (get().nq15m.stale || get().nq1h.stale) return null;
    return evaluateTrigger({ judas, amd, smt, regime, asOf: sharedEpoch(get()) });
  } catch { return null; }
},
```

### Pattern 2: Shared `asOf` Epoch (Trigger–AMD Coherence)

**What:** Extract the `selectAMD` epoch fallback (`nq1h.lastUpdatedISO` → `Date.now()`) into one module-scope helper `sharedEpoch(get)` used by both `selectAMD` and `selectTrigger`.
**When to use:** Mandatory — trigger reads `amd` output; evaluating trigger at a different instant than AMD would let §3 say accumulation while §4 fires manipulation.
**Trade-offs:** Pro: single time truth, no torn reads. Con: touches `selectAMD` (working code) — mitigated by Phase 1 ordering (debt cleanup first, then this mechanical extract with existing `store.test.ts` green as gate).

### Pattern 3: Ticket as Derived-Null Selector + Local-Input Slice

**What:** `selectTicket` derives from `selectTrigger + selectLevels + selectBias + selectRange`; returns `null` unless trigger fired and all inputs non-null. User inputs (direction lock, risk %, size) live in a small Zustand slice (`ticketInputs: { riskPct, size }` + setters), never in `ict/`.
**When to use:** Paper ticket (§5) — levels are a pure derivation, size/risk are operator inputs.
**Trade-offs:** Pro: no phantom tickets on stale/degraded data; inputs stay out of pure math (testable). Con: ticket panel needs both selector + slice subscriptions — follow the `selectLevels` stable-function-subscription precedent to avoid `useShallow` loops on fresh nested identities.

## Data Flow

### Request Flow

```
60s staggered poll (unchanged: :00 NQ / :15 nq1h / :30 ES / :45 nq15m)
    ↓ per-leg envelope → leg state (stale isolated per leg, never merged)
Derived selectors (all during render, math-free components):
  selectJudas / selectSMT / selectAMD (existing)
    → selectTrigger (NEW: shared asOf, refuse-null on nq1h/nq15m stale)
    → selectFatalFlaw (NEW: refuse-null on nq/es stale; runs even when trigger null —
         invalidation must be able to cancel a forming setup, not just a fired one)
    → selectTicket (NEW: null unless trigger fired + levels/bias/range live)
Render:
  §4 block ← selectTrigger.reason verbatim │ ExecutionProtocol panel (center col)
  §6 block ← selectFatalFlaw.reason verbatim │ FatalFlaw panel (right col)
  §5 block ← selectTicket levels verbatim    │ TicketPanel (right col, slice inputs)
  NqChart ← trigger pin (bar-date mapped at caller, T-09-03 precedent) + ticket lines
```

### State Management

```
Zustand store (single file, single instance)
    ↓ subscribe
Components ←→ selectors (pure derivation) → leg state; ticketInputs slice → selectTicket
```

- Poll loop is untouched: no 5th timer, no 5M interval, no route change. `startDualPoll`/`stopDualPoll` and the mount-owns-first-poll discipline stay as-is.
- Bar-date mapping for the trigger pin happens in `terminal-shell.tsx` at the caller (existing Judas `sweepTime`-epoch → containing D1 bar loop precedent), so marker `time` always equals a D1 candle date.
- Overlay staleness reuses `overlayStale = nq1hStale || nq15mStale || esStale` — trigger pin desaturates to `MUTED_GRAY` with the existing tone, never clears (D-08 precedent).

### Key Data Flows

1. **Trigger evaluation flow:** nq15m (Judas) + nq1h (Asia/AMD) + NQ/ES daily (SMT) + NQ daily (regime) → `evaluateTrigger` → §4 + center execution panel + chart pin.
2. **Invalidation flow:** bias + DOL + Judas + SMT + trigger → `checkFatalFlaw` → §6 + right flaw panel; when `invalidated`, ticket panel renders the flaw reason instead of levels (explicit precedence: flaw > ticket).
3. **Ticket flow:** trigger fired + levels/bias/range + `ticketInputs` slice → `computeTicket` → §5 + right ticket panel + chart entry/SL/TP lines.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (single terminal, 4 legs × 60s) | No change needed. Trigger/flaw/ticket are O(candles) pure derivations during render — same cost class as existing selectors. |
| More polling pressure (extra symbols) | Not in v3.0 scope; per-leg singleflight + independent stale already isolate failure. Do not add legs for Modul 4. |
| Threshold calibration over live observation | Thresholds are exported consts (`TRIGGER_*`, flaw gates) pinned by tests — recalibration is a const change + test re-pin, never a shape change. |

### Scaling Priorities

1. **First bottleneck:** render-time derivation cost as selectors grow (7 → 10). Mitigation already proven: stable selector-function subscription + derivation during render (`selectLevels` precedent) — apply to all three new selectors, never `useShallow` on their outputs.
2. **Second bottleneck:** none architectural. Yahoo quota is the ceiling and v3.0 adds zero requests.

## Anti-Patterns

### Anti-Pattern 1: Trigger Math Inside Components or the Store Body

**What people do:** Compute fired/not inline in `execution-protocol.tsx` or inside the `create()` body with `Date.now()`.
**Why it's wrong:** Violates the purity constraint (untestable, unextractable), duplicates gate logic between §4 and the panel, and tears time between AMD and trigger.
**Do this instead:** `evaluateTrigger` in `src/lib/ict/trigger.ts` (injected `asOf`); store only orchestrates inputs; components only render `.reason`.

### Anti-Pattern 2: Merged Stale Boolean or Cross-Leg Substitution

**What people do:** Add a top-level `stale` covering trigger inputs, or fall back to ES rows when NQ 15M is stale.
**Why it's wrong:** D-06 violation the codebase explicitly guards per leg; a merged flag would fire triggers on half-stale data.
**Do this instead:** Refuse `null` per owning leg (`nq15m.stale` → trigger null; `es.stale` → SMT null → trigger degrades honestly); reasons ride in `leg.lastError` verbatim per the §3 pattern.

### Anti-Pattern 3: Numeric Conviction / Fake-Precision Ticket

**What people do:** Score the trigger 0–100, show percentage fill probability, or render ticket levels from thin/degraded ranges without marking.
**Why it's wrong:** `confluence.ts` no-fake-precision rule + thin-tier honesty (uniform 0.5 dimming, persistent banner). A 78% trigger or full-strength ticket on 12 candles destroys the terminal's honest-degrade contract.
**Do this instead:** Discrete states only (`fired`/`waiting`, tier words from `deriveConvictionTier`); ticket inherits thin dimming and refuses null on `range-thin` unless explicitly designed otherwise in the phase plan.

### Anti-Pattern 4: Broker-Shaped Abstractions

**What people do:** `submitOrder()`, `OrderStatus`, broker adapter interfaces "for later".
**Why it's wrong:** Paper ticket is explicitly no-broker (PROJECT.md out-of-scope lineage: fixtures over real APIs, rule-based over LLM). Dead abstraction rots and confuses the audit.
**Do this instead:** `computeTicket` returns display levels + risk arithmetic only; panel copy says paper explicitly; no submit path, no status enum.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Yahoo proxy (`app/api/yahoo`) | No change — existing `?symbol=&interval=` legs reused | Do NOT add `5m`/`1m` intervals; allowlist + quota + zero-budget all forbid it. §4 copy must disclose 15M-close gating. |
| Vercel Hobby | No change — zero new routes, zero new fetch volume | Trigger evaluation is client-side derivation; no `maxDuration` or cache-header work. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| trigger.ts ↔ amd/judas/smt | Reads output objects, never mutates (amd `smtTag` read-only precedent) | Boundary `throw` on malformed Judas (amd `assertValidJudas` precedent, WR-05 lesson). |
| invalidation.ts ↔ trigger | Reads `TriggerOutput`; flaw precedence over ticket decided in render, not inside either pure fn | Keeps both fns independently testable; precedence is a 3-line render branch. |
| ticket.ts ↔ store | `computeTicket` takes plain inputs; `selectTicket` wires legs + slice | No store import inside `ticket.ts` (confluence precedent). |
| report.tsx §4/§5/§6 ↔ selectors | Verbatim reasons + locked `Məlumat yoxdur`-family fallbacks + per-leg `lastError` | Copy the §3 block structure; add `S4_/S5_/S6_` constants, do not reuse `S3_EMPTY_COPY` across sections (grep-ability). |
| nq-chart.tsx ↔ shell | New optional props only; `buildOverlayMarkers` gains trigger 3rd (Judas→SMT→Trigger order); ticket lines reuse remove-then-create cycle | Phase 1 FIRST fixes the dead `thinHistory` arg in the `zoneBands` getter call + orphaned `thinTier` export/type so new overlay work lands on clean code. `zoneBands()` itself ignores thin history (takes only high/low/eq) — dimming stays via `opacityScale`, never compounded. |
| store.test.ts / selector tests | New gate tables for trigger thresholds, flaw precedence, ticket null-matrix | Threshold consts pinned by tests so live-observation recalibration is deliberate. |

## Suggested Build Order (with v2.1 debt + dependencies)

1. **Phase 1 — Debt cleanup (unblocks everything touching the chart):** dead `thinHistory` arg in `nq-chart.tsx` zone-fill getter + orphaned `thinTier` export/type in `thin-tier.ts` (+ Asia note docs). Rationale: trigger pin + ticket lines edit the same effect blocks; landing debt first avoids merge-shape conflicts.
2. **Trigger core:** `trigger.ts` + tests → `selectTrigger` (with `sharedEpoch` extract) → §4 live block → execution panel (replaces `data-slot="execution-protocol"` card) → chart pin. Rationale: everything else keys off `fired`.
3. **Fatal flaw:** `invalidation.ts` + tests → `selectFatalFlaw` → §6 live block → flaw panel (replaces `data-slot="fatal-flaw"` card) + ticket-suppression branch. Rationale: independent pure fn but render precedence needs trigger present.
4. **Paper ticket:** `ticket.ts` + tests → `ticketInputs` slice + `selectTicket` → §5 live block → ticket panel (replaces `data-slot="ticket"` card) → chart entry/SL/TP lines. Rationale: terminal step; depends on trigger + flaw precedence.
5. **Calibration + UAT:** threshold review against live observation notes (Judas confirm rate, SMT rollover behavior per PROJECT.md), `REPORT_SECTIONS` flip verification, overlay staleness drill (stale leg → gray pin, never cleared).

## Sources

- Codebase direct reads (HIGH): `src/lib/store.ts` (selectors, 4-leg poll grid, refuse-null envelopes), `src/lib/ict/amd.ts` (fusion + boundary-throw precedent), `src/lib/confluence.ts` (selector-level purity precedent), `src/lib/report.ts` (§4/§5/§6 currently `unavailable`), `components/dashboard/report.tsx` (§3 verbatim prose precedent), `components/dashboard/terminal-shell.tsx` (3 replaceable UNAVAILABLE cards, bar-date mapping, `overlayStale`), `components/charts/nq-chart.tsx` (marker ordering, price-line cycle, dead `thinHistory` arg site), `src/lib/thin-tier.ts` (orphaned export site), `app/api/yahoo/route.ts` (allowlist, 60s cache).
- `.planning/PROJECT.md` (HIGH): v3.0 goal, Phase 1 debt list, zero-budget/purity/Zustand constraints, no-broker scope.

---
*Architecture research for: v3.0 Execution (Modul 4) — WHY NOW + fatal flaw + paper ticket*
*Researched: 2026-09-09*
