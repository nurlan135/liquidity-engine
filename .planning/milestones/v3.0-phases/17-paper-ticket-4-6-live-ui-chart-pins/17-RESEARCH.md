# Phase 17: Paper Ticket + §§4–6 Live UI + Chart Pins - Research

**Researched:** 2026-09-11
**Domain:** Deterministic paper order-ticket derivation + live report §§4–6 + dashboard panels + chart pins on the existing NQ terminal
**Confidence:** HIGH

## Summary

Phase 17 wires the already-shipped Phase 15 trigger (`evaluateTrigger` + `selectTrigger`) and Phase 16 flaw (`checkFatalFlaw` + `selectFatalFlaw`) into a user-visible execution picture: a pure `src/lib/ticket.ts` module (deliberately **outside** `ict/`, following the `confluence.ts` precedent) that derives entry/SL/TP-ladder/R-R/verdict in one fixed order, a `ticketInputs` Zustand slice plus `selectTicket` derived selector, three thin panels replacing the `execution-protocol` / `ticket` / `fatal-flaw` UNAVAILABLE cards in `terminal-shell.tsx`, live §§4–6 blocks in `report.tsx`/`report.ts`, a terminal-top PAPER banner, and a `T` trigger pin plus entry/SL/TP price lines in `nq-chart.tsx` reusing the proven J/S marker and EQ/DOL line lifecycles.

No new external packages are needed — every capability maps to installed deps (zustand, lightweight-charts v5, shadcn card/button, lucide) or new own-code files. No external documentation lookup was required: all authority is in-repo (prior CONTEXTs, `trigger.ts`, `invalidation.ts`, `report.ts`, `store.ts`, `nq-chart.tsx`, UI-SPEC), and every discrete value below was read from its source file this session with verbatim quotes.

**Primary recommendation:** Build in strict dependency order — pure `ticket.ts` + `ticket.test.ts` first (derivation order, STAND-ASIDE-with-reason on every gate fail, R/R ≥ 1:3 gate, degenerate-input refusal), then `ticketInputs` slice + `selectTicket` + banned-word test, then panels + §§4–6 + PAPER banner, then chart `T` pin + price lines — and update `report.test.ts` literals in the same wave that flips §§4–6 live, or the suite goes red.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**TP ladder + R/R gate**
- **D-01:** Structure-first ladder — TP levels resolve from live structure, never fixed R-multiples. R-multiples are output (reported per leg), not inputs.
- **D-02:** Priority Asia → DOL → EQ — TP1 opposing Asia edge (nearest liquidity), TP2 opposing DOL/session pool, TP3 range far edge. Nearest liquidity fills TP1 first.
- **D-03:** R/R ≥ 1:3 gate blocks EXECUTE — failing ratio yields STAND ASIDE with a verbatim reason naming the computed ratio (e.g. R/R 1:1.8 — EXECUTE blocked). No warn-and-pass path; mirrors flaw-wins honesty.

**STAND ASIDE rendering**
- **D-04:** STAND ASIDE with reason, never null ticket — `selectTicket` returns a STAND ASIDE verdict + verbatim failing reason on every gate fail (QUIET/ARMED/INVALIDATED/R-R fail). Matches the FEATURES.md contract; the ticket always explains its why.
- **D-05:** Degraded-with-provenance on stale/thin — ticket renders dimmed with STALE/THIN tag naming the failed leg, numbers visible but marked. Never a full-strength ticket on stale/thin inputs (VERF-03 aligned).

**PAPER chrome + inputs**
- **D-06:** Terminal-top persistent banner — non-dismissible KAĞIZ/PAPER banner at terminal top plus PAPER prefix in the §5 title. Visible even when the ticket panel is scrolled away; panel-only placement hides on scroll.
- **D-07:** Risk % + NQ contracts — risk % input (default 1%) + size in NQ contracts; size = risk ÷ stop-distance. Futures-native; degenerate inputs (zero stop distance, missing levels) refuse with reason.
- **D-08:** CTA copy KAĞIZ QEYD / İMTİNA — EXECUTE-side CTA logs intent as paper note ("KAĞIZ QEYD"), STAND ASIDE-side "İMTİNA". Banned-word rule holds: no Filled/Position/Submit Order/placeOrder identifiers anywhere.

**Chart pins + lines**
- **D-09:** T pin + accent price lines — trigger pin 'T' arrow on the FIRE bar plus entry/SL/TP as price lines reusing the EQ/DOL create/remove lifecycle in `nq-chart.tsx`. Follows the J/S marker precedent; no new zone-band primitive.
- **D-10:** Hide on STAND ASIDE — pins/lines render on EXECUTE only; STAND ASIDE/INVALIDATED clears them via the empty-marker-set path. No ghost what-if levels that could be misread.

### The Agent's Discretion

None — user decided every area explicitly.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TICK-01 | Paper ticket derived in fixed order — direction → OTE×FVG entry → invalidation SL → TP1/TP2/TP3 ladder → R/R ≥ 1:3 gate → EXECUTE / STAND ASIDE | `## Architecture Patterns` Pattern 1 (derivation chain); `## Code Examples` ticket skeleton; input shapes from `trigger.ts`/`fvg.ts`/`levels.ts`/`dol.ts`/`asia.ts` quoted below |
| TICK-02 | Risk % + size inputs; size = risk ÷ stop-distance; refuse-with-reason on degenerate inputs | `## Code Examples` size math + refusal contract; `ticketInputs` slice pattern; Open Question OQ-1 (equity source for %-to-contracts) |
| TICK-03 | PAPER/SIMULATED vocabulary everywhere; persistent non-dismissible PAPER banner; banned-word test green | `## Common Pitfalls` Pitfall 1 (naive `Position` grep hits `computePosition`); UI-SPEC copy contract; banner `data-slot="paper-banner"` spec |
| TICK-04 | Live §§4–6 with verbatim reasons; three panels replace UNAVAILABLE cards; chart trigger pin + entry/SL/TP lines | `## Architecture Patterns` Patterns 2–4; `REPORT_SECTIONS` flip + `report.test.ts` literal update (Pitfall 2); J/S marker + EQ/DOL line reuse contracts |

## Project Constraints (from AGENTS.md)

- **Next.js agent rules:** This is NOT the Next.js you know — read the relevant guide in `node_modules/next/dist/docs/` before writing code; heed deprecation notices. Do not remove the AGENTS.md block from diffs.
- **Git worktree hygiene:** Before any `execute-phase` dispatch — `git fetch origin`, check HEAD vs `origin/HEAD` divergence, push local commits or refresh `origin/HEAD` on unexpected `shouldDegrade: true`.
- **Config warning hygiene:** Keep overlapping keys (`resolve_model_ids`/`runtime`) in only one of global `defaults.json` vs project config.

## Project Constraints (from PROJECT.md)

- **Budget:** Zero — Vercel free tier only, no paid APIs. No new dependencies with cost.
- **State:** Zustand only — no Redux/Context for dashboard state. Ticket inputs live in a Zustand slice.
- **Purity:** `src/lib/ict` functions must be pure (no I/O, no `Date.now` inside — inject time). `ticket.ts` lives **outside** `ict/` (brokerage math, not ICT methodology) so the purity guard never scans it — but keep it pure anyway (injected `asOf`, no store imports) so Phase 18 replay is deterministic.
- **AI:** Rule-based, no LLM calls. All prose is verbatim template strings, test-pinned with `toBe`.
- **Tech stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4, lightweight-charts (dynamic import), date-fns-tz, allowed shadcn components only (button, dropdown-menu, dialog, toast, calendar, card). Phase 17 needs only `button` + `card` (both already installed, reused — no new installs per UI-SPEC Registry Safety).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ticket derivation (entry/SL/TP/R-R/verdict) | API/Backend-equivalent: pure lib (`src/lib/ticket.ts`) | — | Deterministic math must be testable without rendering; follows `confluence.ts` selector-level precedent |
| Ticket inputs (risk %, paper-note log) | Frontend: Zustand slice | — | Operator inputs are client-ephemeral state; never inside pure math |
| §§4–6 report blocks | Frontend Server/Client render (`report.tsx`) | — | Thin render of selector prose, verbatim, math-free |
| Dashboard panels + PAPER banner | Browser/Client (`terminal-shell.tsx`) | — | DOM composition over store selectors; banner is pure chrome |
| Chart T pin + entry/SL/TP lines | Browser/Client (`nq-chart.tsx` canvas) | — | Canvas overlay via existing lightweight-charts handles |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Own code `src/lib/ticket.ts` (new) | n/a | `computeTicket` pure derivation in fixed order | Only honest shape: direction → entry → SL → TP ladder → R/R gate → verdict; testable, replayable for Phase 18 [VERIFIED: 17-CONTEXT.md:85] |
| zustand `ticketInputs` slice + `selectTicket` (new, in `src/lib/store.ts`) | `^5.0.15` [VERIFIED: package.json:27] | `{ riskPct }` + clamped setters; derived ticket with shared-epoch + refuse-null envelope | Follows `selectTrigger`/`selectFatalFlaw` precedent; avoids `useShallow` loops on fresh nested identities (03.2 lesson) [VERIFIED: src/lib/store.ts:841-906] |
| lightweight-charts v5 `createSeriesMarkers` + `createPriceLine` | `^5.2.1` [VERIFIED: package.json:19] | `T` pin via `buildOverlayMarkers`; entry/SL/TP lines via remove-then-create refs | Both APIs already owned by `nq-chart.tsx`; additive shapes/refs only, no new primitive [VERIFIED: components/charts/nq-chart.tsx:66-106, 341-449] |
| shadcn `card` + `button` (existing installs, reused) | shadcn `^4.21.0` [VERIFIED: package.json:25] | `ExecutionProtocol` / `TicketPanel` / `FatalFlaw` thin panels; risk-% steppers; KAĞIZ QEYD / İMTİNA CTAs | UI-SPEC Registry Safety: no new installs required by this phase [CITED: 17-UI-SPEC.md:163-166] |
| vitest co-located tests | `^5.0.0` [VERIFIED: package.json:41] | `ticket.test.ts` derivation table + banned-word grep test | Follows trigger/invalidation co-located precedent; purity guard pattern from `purity.test.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns-tz` `formatInTimeZone` | `^3.2.0` [VERIFIED: package.json:18] | FIRE-bar date mapping (containing D1 bar at or before `asOf`) | Reuse the `terminal-shell.tsx` judasBarDate loop precedent verbatim |
| lucide-react | `^1.41.0` [VERIFIED: package.json:20] | Panel icons if needed (RefreshCw precedent) | Only if UI-SPEC icon gaps appear; never for verdict semantics |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Own-code `ticket.ts` | New `ict/` module | Rejected — risk sizing is brokerage math, not ICT methodology; `confluence.ts` header precedent: "Selector-level scoring lives here, never inside src/lib/ict, so ict purity holds" [VERIFIED: src/lib/confluence.ts:4-12] |
| `ticketInputs` Zustand slice | URL search-params / localStorage | Rejected for v3.0 — store slice is simpler, survives re-render, matches STACK.md; localStorage persistence is P2 journal scope |
| `T` pin via `buildOverlayMarkers` | New zone-band primitive | Rejected per D-09 — J/S marker precedent covers it; zone bands are range fills, not event pins |
| Paper-note log in store | `localStorage` journal | Rejected for Phase 17 — EXEC-P2-02 owns the persistent journal; Phase 17 needs only a session-ephemeral `paperLog` array (capped, firing-log idiom) so KAĞIZ QEYD is observable without building the journal |

**Installation:**

```bash
# No installs required — all capabilities covered by installed packages:
# next 16.3.4, react 19.2.8, zustand ^5.0.15, lightweight-charts ^5.2.1,
# date-fns-tz ^3.2.0, shadcn card/button (installed), lucide-react ^1.41.0
```

**Version verification:** Versions above read from `package.json` this session [VERIFIED: package.json:13-28]. No registry lookup needed — zero new packages.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** All new code is own-code (`src/lib/ticket.ts`, `ticket.test.ts`, three thin panel components, banned-word test) composed from already-installed dependencies. No `package-legitimacy` gate to run, no new supply-chain surface. Planner must still enforce: **no PR in this phase may add a dependency** (zero-budget + paper-only constraints); if a plan proposes one, it fails review.

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious (SUS):** none.

## Architecture Patterns

### System Architecture Diagram

```
60s staggered poll (unchanged: :00 NQ / :15 nq1h / :30 ES / :45 nq15m)
    ↓ per-leg envelopes → leg state (stale isolated per leg, never merged)
Derived selectors (during render, components stay math-free):
    selectTrigger ──→ selectFatalFlaw (same snapshot, flaw supersedes fire)
        │                    │
        └────────┬───────────┘
                 ↓
    selectTicket = computeTicket({ trigger, flaw, levels, bias, range,
                                   asia, dol, riskPct })   ← NEW
        │  fixed order: direction → entry → SL → TP1/TP2/TP3 → R/R → verdict
        │  any gate fail → STAND ASIDE + verbatim reason (never null) [D-04]
        │  stale/thin   → degraded opacity-45 + STALE/THIN tag naming leg [D-05]
        ↓
Render:
    §4 ← trigger.reason verbatim        │ ExecutionProtocol panel (center col)
    §5 ← ticket levels verbatim + PAPER │ TicketPanel (right col) + risk inputs
    §6 ← flaw sentence + challenge      │ FatalFlaw panel (right col)
    PAPER banner (terminal top, always) │ data-slot="paper-banner"
    NqChart ← 'T' pin (FIRE bar) + entry/SL/TP1/TP2/TP3 lines (EXECUTE only)
```

File-to-implementation mapping is in Component Responsibilities below, not in this diagram.

### Recommended Project Structure

```
src/
├── lib/
│   ├── ticket.ts          # NEW — computeTicket + TICKET_RR_MIN + TicketOutput
│   ├── ticket.test.ts     # NEW — derivation table, R/R boundary, refusal, banned words
│   ├── report.ts          # MODIFIED — §§4–6 'unavailable' → 'live'; §5 PAPER-prefix title
│   ├── store.ts           # MODIFIED — ticketInputs slice + selectTicket + paperLog
│   └── chart-mapper.ts    # MODIFIED only if ticketLineInputs guard needed
components/
├── dashboard/
│   ├── terminal-shell.tsx     # MODIFIED — 3 UNAVAILABLE cards → live panels + PAPER banner
│   ├── report.tsx             # MODIFIED — §§4–6 live blocks (§3 precedent)
│   ├── execution-protocol.tsx # NEW — trigger status + reason verbatim (thin)
│   ├── ticket-panel.tsx       # NEW — entry/SL/TP + risk inputs + CTAs (thin)
│   └── fatal-flaw.tsx         # NEW — flaw verdict + sentence + challenge (thin)
└── charts/
    └── nq-chart.tsx       # MODIFIED — 'T' pin + entry/SL/TP refs (props-only, additive)
```

### Component Responsibilities

| Component | Responsibility | Contract |
|-----------|----------------|----------|
| `src/lib/ticket.ts` | Fixed-order derivation; owns `TICKET_RR_MIN = 3` exported constant; per-leg R-multiple outputs; degenerate-input refusal with reason | Pure: injected `asOf`, no store imports, no `Date.now`; boundary throws on malformed envelopes (trigger/invalidation precedent) |
| `store.ts` `ticketInputs` | `{ riskPct }` (default 1) + clamped setters + session-ephemeral `paperLog` array (capped, firing-log idiom) | Plain state with setters, never derived; riskPct clamps to a sane band (e.g. 0.1–5), setter refuses NaN/negative |
| `store.ts` `selectTicket` | One `sharedEpoch(get)` call; refuse-null on stale/empty legs; flaw > ticket precedence; STAND ASIDE + reason on every gate fail | Never throws into render (try/catch → null); carries `asOf` + reason keys for Phase 18 replay |
| `report.tsx` §§4–6 | §4 ← `selectTrigger().reason`; §5 ← ticket levels + PAPER prefix title; §6 ← `flaw.sentence` + `flaw.challenge`, all verbatim | Follows §3 block pattern (locked fallbacks, `Məlumat yoxdur` null copy, skeleton pulse while `lastUpdatedISO === null`) |
| `terminal-shell.tsx` | Swap 3 UNAVAILABLE cards for live panels; terminal-top `data-slot="paper-banner"` strip | Banner renders on every frame independent of envelope truth [CITED: 17-UI-SPEC.md:154] |
| `nq-chart.tsx` | `T` pin 3rd in J→S→T ordering; entry/SL/TP1/TP2/TP3 price lines; empty-marker-set + line-removal on STAND ASIDE/INVALIDATED | Reuse `buildOverlayMarkers` + remove-then-create refs; accent tone, `MUTED_GRAY` when `overlayStale` |

### Pattern 1: Fixed-Order Ticket Derivation (TICK-01)

**What:** `computeTicket` resolves exactly one step at a time and stops at the first failure, returning STAND ASIDE with that step's verbatim reason: (1) direction from FIRE verdict, else STAND ASIDE/QUIET-or-ARMED reason; (2) entry = OTE pocket ∩ entry-FVG (LONG → `bullOTE` + BULLISH gap; SHORT → `bearOTE` + BEARISH gap), else refuse; (3) SL from invalidation structure (planner locks the rule table — see OQ-2), else refuse; (4) TP1/TP2/TP3 structure-first per D-02, unresolvable legs omitted with reason (never fixed-R fillers); (5) R/R gate on the resolved ladder (which leg gates EXECUTE — see OQ-3); (6) verdict EXECUTE or STAND ASIDE.

**When to use:** Always — this order is the phase's honesty invariant (SL is an input to R/R; R/R gates EXECUTE).

**Example:**

```typescript
// Source: 17-CONTEXT.md D-01..D-04 + FEATURES.md ticket-before-flaw order
// (skeleton — planner locks SL table OQ-2 and R/R gate leg OQ-3)
export const TICKET_RR_MIN = 3; // R/R ≥ 1:3 gate [VERIFIED: institutional_rules.md:93]
export type TicketVerdict = 'EXECUTE_LONG' | 'EXECUTE_SHORT' | 'STAND_ASIDE';
export interface TicketOutput {
  verdict: TicketVerdict;
  direction: 'LONG' | 'SHORT' | null;
  entry: number | null;
  sl: number | null;
  tp: { tp1: number | null; tp2: number | null; tp3: number | null };
  rMultiples: { tp1: number | null; tp2: number | null; tp3: number | null };
  rr: number | null;            // the gated ratio, named in the R/R-fail reason
  reason: string;               // verbatim — R/R fail MUST name ratio, e.g. "R/R 1:1.8 — EXECUTE blocked"
  sizeContracts: number | null; // risk ÷ stop-distance in NQ contracts
  degraded: { stale: boolean; thin: boolean; leg: string | null };
  asOf: number;                 // Phase 18 replay reconstruction
}
export function computeTicket(input: TicketInput): TicketOutput { /* fixed order */ }
```

### Pattern 2: §§4–6 Live Flip Following the §3 Precedent (TICK-04)

**What:** Flip `REPORT_SECTIONS` §§4–6 `state` to `'live'`, add three live blocks in `report.tsx` mirroring the §3 block (stable selector-function subscription + derivation during render, verbatim reasons, `S3_EMPTY_COPY` fallback, skeleton pulse while `lastUpdatedISO === null`), and update `report.test.ts` literals **in the same plan**.

**When to use:** The §§4–6 plan — never split the constant flip from the test-literal update.

**Example:**

```typescript
// Source: src/lib/report.ts:17-24 (current — flip 'unavailable' → 'live' on 4/5/6)
export const REPORT_SECTIONS: ReportSection[] = [
  { index: 1, title: '1. RETAIL EXPOSURE & SENTIMENT ENGINEERING', state: 'unavailable' },
  { index: 2, title: '2. MACRO DEALING RANGE & VOLATILITY REGIME (D1/4H)', state: 'live' },
  { index: 3, title: '3. LIQUIDITY SEQUENCING & CROSS-MARKET SMT (1H/15M)', state: 'live' },
  { index: 4, title: '4. "WHY NOW?" EXECUTION PROTOCOL (5M/1M)', state: 'unavailable' },  // → 'live'
  { index: 5, title: '5. INSTITUTIONAL ORDER TICKET', state: 'unavailable' },              // → 'live' + PAPER prefix per D-06
  { index: 6, title: '6. FATAL FLAW CHECK & CHALLENGE QUESTION', state: 'unavailable' },  // → 'live'
];
```

### Pattern 3: Chart Pin + Lines as Additive Props (TICK-04, D-09/D-10)

**What:** Extend `buildOverlayMarkers` with an optional trigger input appended **after** Judas then SMT (J→S→T ordering per UI-SPEC), and add entry/SL/TP1/TP2/TP3 price-line refs following the Asia-pair remove-then-create cycle. On STAND ASIDE/INVALIDATED pass empty/undefined so the existing empty-marker-set path clears pins and removed refs clear lines — no new clearing machinery.

**When to use:** The chart plan — props-only, existing overlays untouched.

**Example:**

```typescript
// Source: components/charts/nq-chart.tsx:63-106 (J/S builder — append T third)
// Existing contract: "Null, unresolved, NO-SIGNAL, or suppressed inputs contribute
// nothing; empty input returns [] so the caller clears via an empty marker set."
// T-pin rule: push { time: fireBarDate, position: dir==='LONG'?'belowBar':'aboveBar',
//   shape: 'arrowUp'|'arrowDown', color: tone, text: 'T' } only when ticket
// verdict is EXECUTE_* — caller passes null otherwise (D-10 hide-on-STAND-ASIDE).
```

### Pattern 4: Thin Panels Reading Selectors Only (TICK-04)

**What:** `ExecutionProtocol` / `TicketPanel` / `FatalFlaw` contain zero math — they subscribe to `selectTrigger` / `selectTicket` / `selectFatalFlaw` (stable selector-function subscription, derive during render) and print `.reason` verbatim with the locked `Məlumat yoxdur` null copy, `opacity-45` degraded treatment, and `UNAVAILABLE`-chip-free live styling.

**When to use:** All three panel builds — ARCHITECTURE.md component contract.

### Anti-Patterns to Avoid

- **Ticket math inside components or the store body:** derivation lives in `ticket.ts`; the selector only wires inputs. (ARCHITECTURE.md Anti-Pattern 1.)
- **`useShallow` on `selectTicket()` output:** fresh nested identities (`tp`, `rMultiples`) retrigger update loops — stable-function subscription + derive during render (03.2 `selectLevels` lesson).
- **Fixed R-multiple TP fillers:** unresolvable TP legs omit with reason; never synthesize levels to complete the ladder (D-01).
- **Warn-and-pass R/R:** failing ratio yields STAND ASIDE, never a degradable EXECUTE (D-03).
- **`placeOrder`-shaped stubs "for later":** banned identifiers include stubs; use `PaperTicket`/`paperLog` names only (PITFALLS.md P4).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trigger verdict/direction/entry-FVG | Re-derive gates in ticket.ts | `TriggerOutput` from `selectTrigger` (consume `verdict`, `direction`, `entryFvg` directly) | Re-implementation forks logic; §4 and ticket would disagree (PITFALLS.md P6) |
| Flaw verdict/sentence/challenge | Re-evaluate flaw in ticket.ts | `FatalFlawOutput` from `selectFatalFlaw` (consume `invalidated`/`downgraded`/`reason`/`sentence`/`challenge`/`carriedArmedReason`) | Single evaluation object; flaw > ticket precedence by function order |
| OTE pockets / dealing range / DOL | Recompute from candles | `selectLevels()` (`LevelsOutput`), `selectRange()`, `selectDOL()` | Proven pure math with boundary tests; ticket reads outputs only |
| Asia extremes | Re-scan 1H rows | `selectAsia()` (`AsiaRange`) | Killzone + fallback logic is subtle (20:00–23:45 NY, last-completed-session fallback) |
| FVG inventory | Re-scan D1 rows | `selectLiquidityPath` inputs / `detectFVGs` + `applyMitigation` via trigger's `entryFvg` handle | Mitigation + trailing-20-bound logic already pinned |
| NY wall-clock / session dates | Custom timezone math | `NY_TZ`, `nyDateOf`, `formatInTimeZone` (aggregate/trigger idiom) | DST-safe per-candle discipline; never fixed UTC offsets |
| Freshness/thin truth | New staleness checks | Per-leg `stale` flags + `resolveThinTier(candles, range)` | v2.1 honesty system; ticket degrades on the same truth the chart shows |
| Chart markers / price lines | New overlay primitive | `buildOverlayMarkers` + `createPriceLine` remove-then-create refs | v5 plugin form + lifecycle already own every overlay |
| Banned-word enforcement | Manual review | Co-located vitest grep test (purity.test.ts idiom) | Build-time gate; see Pitfall 1 for the `Position` allowlist nuance |

**Key insight:** Phase 17 is a composition phase, not an invention phase. Every input the ticket needs already exists as a tested output; the only new math is entry∩SL∩TP resolution, R/R division, and risk÷distance sizing. If a plan invents a detector, a clock, or a broker-shaped type, it is out of scope.

## Consumed Input Shapes (verbatim, read this session)

Planner and executor work from these exact shapes — no paraphrase, no drift:

**`TriggerOutput`** [VERIFIED: src/lib/ict/trigger.ts:32-69] — quote:

```typescript
export type TriggerVerdict = 'FIRE_LONG' | 'FIRE_SHORT' | 'ARMED' | 'WAIT_FOR_MANIPULATION';
export type TriggerDirection = 'LONG' | 'SHORT' | null;
export interface TriggerOutput {
  verdict: TriggerVerdict;
  direction: TriggerDirection;
  reasonKey: TriggerReasonKey;
  /** Verbatim Azerbaijani sentence, test-pinned with toBe — never interpolated. */
  reason: string;
  gates: { timing: boolean; purge: boolean; displacement: boolean };
  /** D-04 handle the Phase 17 ticket consumes; non-null only on FIRE verdicts. */
  entryFvg: FvgGap | null;
  inputs: { judas: JudasOutput | null; amd: AmdOutput | null; smt: SmtOutput | null };
}
```

`TriggerReasonKey` values [VERIFIED: src/lib/ict/trigger.ts:36-43]: `'FIRE_LONG' | 'FIRE_SHORT' | 'ARMED_MISSING_TIMING' | 'ARMED_MISSING_PURGE' | 'ARMED_MISSING_DISPLACEMENT' | 'ARMED_ALREADY_FIRED' | 'WAIT_FOR_MANIPULATION'`.

**`FatalFlawOutput`** [VERIFIED: src/lib/ict/invalidation.ts:47-68] — quote:

```typescript
export interface FatalFlawOutput {
  /** HARD kill — the setup is dead from any state. Mutually exclusive with downgraded. */
  invalidated: boolean;
  /** SOFT FIRING-to-ARMED downgrade — wait, not abandon. Mutually exclusive with invalidated. */
  downgraded: boolean;
  /** HARD or SOFT class of the applied flaw; null when clean. Phase 17 styles HARD vs SOFT distinctly. */
  flawClass: FlawClass | null;
  /** Specific flaw key; NONE when clean. The banned generic single-word label never appears. */
  reasonKey: FlawReasonKey;
  /** Verbatim Azerbaijani reason, test-pinned with toBe — never interpolated. */
  reason: string;
  /** Per-flaw re-arm condition (D-13); fixed template, empty when clean. */
  unblock: string;
  /** Falsifiable §6 sentence (D-08) ... */
  sentence: string;
  /** §6 challenge question (D-09) ... */
  challenge: string;
  /** The trigger reasonKey the SOFT downgrade resumes from (D-15); null unless downgraded. */
  carriedArmedReason: TriggerReasonKey | null;
  /** Carried for Phase 18 replay reconstruction. */
  asOf: number;
}
```

`FlawReasonKey` values [VERIFIED: src/lib/ict/invalidation.ts:25-30]: `'ROLLOVER_WEEK' | 'STALE_LEG' | 'SMT_SUPPRESSED' | 'OPPOSITE_SWEEP' | 'NONE'`. **Live-SOFT note:** the `OPPOSITE_SWEEP` branch fires only on synthetically mismatched envelopes and never through `selectFatalFlaw` on the same snapshot — Phase 17 must treat live SOFT as SMT-only [VERIFIED: src/lib/ict/invalidation.ts:13-16].

**`FvgGap`** [VERIFIED: src/lib/ict/fvg.ts:12-18]:

```typescript
export interface FvgGap {
  polarity: FvgPolarity;   // 'BULLISH' | 'BEARISH'
  top: number;
  bottom: number;
  originDate: string;
  mitigated: boolean;
}
```

**`LevelsOutput`** [VERIFIED: src/lib/ict/levels.ts:9-16]:

```typescript
export interface LevelsOutput {
  eq: number;
  q1: number;
  q3: number;
  bullOTE: OTEPocket;   // { lo: number; hi: number }
  bearOTE: OTEPocket;
  position: number;
}
```

**DOL names** [VERIFIED: src/lib/ict/dol.ts:3-4]: `DOL_HIGH_NAME = 'Range High / PDH'`, `DOL_LOW_NAME = 'Range Low / PDL'`.

**Asia killzone** [VERIFIED: src/lib/ict/asia.ts:14-16]: `ASIA_START_NY_HOUR = 20`, `ASIA_END_NY_MINUTE = 23 * 60 + 45`.

**`REPORT_SECTIONS`** current state [VERIFIED: src/lib/report.ts:17-24] — quoted in Pattern 2 above; §§4–6 are `'unavailable'` today.

**UNAVAILABLE cards to replace** [VERIFIED: components/dashboard/terminal-shell.tsx:340-350, 356-366, 368-378]: `data-slot="execution-protocol"`, `data-slot="ticket"`, `data-slot="fatal-flaw"` — each `pointer-events-none relative opacity-45` with a locked `UNAVAILABLE` chip.

**Purity guard idiom** (for the banned-word test to copy) [VERIFIED: src/lib/ict/purity.test.ts:31-44]: `import.meta.glob` raw-text scan over sibling sources, `violations` array, `expect(violations).toEqual([])`.

## Common Pitfalls

### Pitfall 1: Naive banned-word grep for `Position` goes red on existing code

**What goes wrong:** A grep for `Position` (one of the four banned identifiers) matches `computePosition` (`range.ts`), `selectPosition` (`store.ts`), and dealing-range `position` fields — all pre-existing methodology vocabulary, all green today. The TICK-03 test fails on code Phase 17 must not touch.
**Why it happens:** The ban targets *brokerage* vocabulary (a position you hold at a broker), but the dealing-range "position" (0–1 Premium/Discount location) is legitimate ICT vocabulary.
**How to avoid:** Scope the banned-word test to (a) whole-word/case-sensitive matches of `Filled`, `Submit Order`, `placeOrder` across `src/` + `components/` + `app/` with zero allowlist, plus (b) `Position` matched only inside Phase 17's new files (`ticket.ts`, `ticket-panel.tsx`, `execution-protocol.tsx`, `fatal-flaw.tsx`, ticket chart props) — or whole-tree with an explicit allowlist pinning the three pre-existing `*Position*` symbols (`computePosition`, `selectPosition`, `LevelsOutput.position`). Test the allowlist itself: assert the pre-existing symbols still exist so a future rename can't silently widen the ban.
**Warning signs:** Banned-word test written as a single four-pattern whole-tree grep with no allowlist.

### Pitfall 2: Flipping §§4–6 live without updating `report.test.ts` literals

**What goes wrong:** `report.test.ts` pins `REPORT_SECTIONS` with `toHaveLength(2)` live / indexes `[2, 3]`, and pins all six titles verbatim including `'5. INSTITUTIONAL ORDER TICKET'`. Flipping §§4–6 (and PAPER-prefixing the §5 title per D-06) breaks two tests in a file the plan didn't list.
**Why it happens:** The flip looks like a one-constant change; the test file isn't in the plan's file list.
**How to avoid:** The §§4–6 plan MUST list `src/lib/report.test.ts` as a touched file: live count 2 → 5 (indexes `[2, 3, 4, 5, 6]`), §5 title literal updated to the PAPER-prefixed form. Verbatim quote of the pinned test [VERIFIED: src/lib/report.test.ts:8-14, 23-32]:
```typescript
expect(live).toHaveLength(2);
expect(live.map((s) => s.index)).toEqual([2, 3]);
```
**Warning signs:** Plan touches `report.ts` but not `report.test.ts`.

### Pitfall 3: Ticket offered on INVALIDATED or QUIET setups

**What goes wrong:** `selectTicket` derives EXECUTE-capable levels whenever trigger inputs exist, ignoring `selectFatalFlaw` — the terminal shows a live ticket on a setup the methodology just killed.
**Why it happens:** Flaw wiring is one `if` the tracer plan defers "to the panel plan."
**How to avoid:** Flaw > ticket precedence inside `selectTicket` (not in render): `invalidated === true` → STAND ASIDE + flaw reason; `downgraded === true` → STAND ASIDE + flaw reason + `carriedArmedReason` context. Non-negotiable in the tracer plan.

### Pitfall 4: Full-strength ticket on stale/thin inputs (false precision)

**What goes wrong:** Ticket prints crisp entry/SL/size from a stale envelope or thin-history bars — the exact failure PITFALLS.md P8 and VERF-03 exist to prevent.
**Why it happens:** `selectTicket` subscribes to price selectors but not to per-leg `stale` flags or `resolveThinTier`.
**How to avoid:** `selectTicket` refuses null when trigger-critical legs are stale/empty (same legs as `selectTrigger`: `nq1h`/`nq15m` refuse-null [VERIFIED: src/lib/store.ts:842-844] plus `nq` for FVG/levels), and returns `degraded: { stale/thin, leg }` otherwise so panels render `opacity-45` + `STALE`/`THIN` tag naming the failed leg (D-05). Numbers stay visible but marked; sizing locks with reason on degraded inputs.

### Pitfall 5: `.test.tsx` panel tests are invisible to vitest

**What goes wrong:** New component tests (`ticket-panel.test.tsx`) never run — the vitest `include` is `['src/**/*.test.ts', 'app/**/*.test.ts']` [VERIFIED: vitest.config.ts:8], which does **not** match `.test.tsx`.
**Why it happens:** Convention assumes all tests are `.test.ts`.
**How to avoid:** Either extend `include` with `src/**/*.test.tsx` (one-line config change, own risk: none — additive glob) or keep panel coverage in `.test.ts` selector tests + UAT visual glance. Planner must pick one explicitly; never silently add `.test.tsx` files that CI ignores.

### Pitfall 6: `T` pin on the wrong bar / ghost lines after STAND ASIDE

**What goes wrong:** The `T` marker lands on the sweep bar instead of the FIRE bar, or entry/SL/TP lines persist after the verdict flips to STAND ASIDE — ghost what-if levels (D-10 violation).
**Why it happens:** Reusing `judasBarDate` (sweep-time mapping) for the trigger pin instead of mapping the ticket's own `asOf`; forgetting the update-effect must remove ticket lines, not just skip creating them.
**How to avoid:** Map `fireBarDate` from `ticket.asOf` with the same containing-bar loop as `judasBarDate` [VERIFIED: components/dashboard/terminal-shell.tsx:74-84]; add ticket line refs to BOTH the mount effect and the update effect's remove-then-create cycle, with the update effect removing refs first unconditionally (Asia-pair precedent [VERIFIED: components/charts/nq-chart.tsx:354-361]).

### Pitfall 7: R/R measured against the wrong leg

**What goes wrong:** R/R gate passes on TP3's generous ratio while TP1 — the first exit — doesn't cover risk; or the gate leg is chosen per-render and flickers.
**Why it happens:** D-03 locks the 1:3 floor but not the measurement leg (see OQ-3).
**How to avoid:** Planner locks one rule (recommendation: gate on **TP1**, the nearest exit — the first place risk can come off must justify the trade; report all three per-leg multiples regardless). Pin with boundary tests: TP1 R exactly 3.0 passes, 2.99 STAND ASIDE with the ratio named.

## Code Examples

Verified patterns from in-repo sources (no external docs needed — all APIs are already owned by this codebase):

### Ticket size math (TICK-02)

```typescript
// Source: CONTEXT D-07 + STACK.md ticket-math precedent (refuse, never clamp-to-fake)
// sizeContracts = floor(equity * riskPct / 100 / (|entry - sl| * NQ_POINT_VALUE))
// Refuse-with-reason (never compute) when:
//   - entry/sl null or non-finite (missing levels)
//   - |entry - sl| <= 0 (zero stop distance) or below epsilon (TOL_EPS precedent)
//   - riskPct non-finite, <= 0, or above the clamp band
// NQ_POINT_VALUE and paper equity source: planner locks per OQ-1 (recommendation below).
```

### Banned-word test skeleton (TICK-03)

```typescript
// Source: src/lib/ict/purity.test.ts:31-44 (import.meta.glob raw-text idiom)
import { describe, expect, it } from 'vitest';
const sources = import.meta.glob('./**/*.ts', { query: '?raw', import: 'default', eager: true });
// Whole-tree zero-tolerance: Filled, Submit Order, placeOrder (case-sensitive, whole-word).
// 'Position': scoped to Phase 17 files OR whole-tree with pinned allowlist for
// computePosition / selectPosition / LevelsOutput.position (see Pitfall 1).
describe('paper-ticket vocabulary quarantine', () => {
  it('contains no brokerage identifiers', () => {
    const violations: string[] = []; /* fill per Pitfall 1 rule */
    expect(violations).toEqual([]);
  });
});
```

### Degraded ticket rendering (D-05, TICK-04)

```tsx
// Source: terminal-shell.tsx thin/rollover banner idiom + UI-SPEC state table
// Stale/thin ticket: `opacity-45` + visible STALE/THIN tag naming the failed leg,
// e.g. "STALE — nq15m" / "THIN — 12 closed"; numbers stay visible but dimmed;
// sizing locked with reason. Never full-strength on stale/thin inputs.
```

### Chart ticket lines (D-09)

```typescript
// Source: components/charts/nq-chart.tsx Asia-pair cycle (lines 428-449, 354-361)
// Add entryLineRef/slLineRef/tp1LineRef/tp2LineRef/tp3LineRef; remove-then-create
// in both mount and update effects; accent tone (overlayStale → MUTED_GRAY);
// titles 'Entry' / 'SL' / 'TP1' / 'TP2' / 'TP3'. Optional: ticketLineInputs guard
// in chart-mapper.ts following asiaLineInputs (finite-guard + throw → caller
// try/catch renders no lines, never blocks).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| §§4–6 `unavailable` + 3 UNAVAILABLE cards | §§4–6 `live` + ExecutionProtocol/TicketPanel/FatalFlaw | This phase | Terminal becomes execution-readable; `report.test.ts` literals must move with it |
| No ticket concept | `TicketOutput` + `selectTicket` + `ticketInputs` | This phase | Fixed-order derivation; STAND ASIDE with reason is the default, EXECUTE the exception |
| J/S markers only | J → S → T ordering | This phase | `T` appended third in `buildOverlayMarkers`; cleared via empty-marker-set on STAND ASIDE |
| Trigger/flaw invisible on canvas | Entry/SL/TP1/TP2/TP3 accent lines (EXECUTE only) | This phase | Full execution picture on chart; no ghost levels (D-10) |

**Deprecated/outdated:**
- `selectTicket`-returns-null-on-gate-fail: superseded by D-04 (STAND ASIDE with reason on every gate fail; null only for unavailable inputs).
- Fixed-R-multiple TP synthesis: banned by D-01 (structure-first; R-multiples are output).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | NQ futures point value $20/pt (standard NQ spec) for risk-% → contracts conversion | Code Examples / OQ-1 | Wrong contract counts by 2–4×; mitigated by exporting the constant + planner confirmation |
| A2 | Gating R/R on TP1 (nearest exit) is the intended reading of D-03 | Pitfall 7 / OQ-3 | Planner may prefer TP2 (FEATURES.md precedent); either is implementable — needs one-line lock before coding |
| A3 | `paperLog` (session-ephemeral store array) satisfies "logs intent as paper note" without building the EXEC-P2-02 journal | Architecture / OQ-4 | If user expects persistence, KAĞIZ QEYD feels lossy; cheap fallback is localStorage append |
| A4 | SL rule table (sweep-origin / displacement-origin / FVG-edge / Asia-extreme) can be locked at plan time from ICT judgment, no new research needed | Patterns / OQ-2 | If ICT-correct SL needs finer granularity than D1/15M structure, derivation stalls — escalate to discuss-phase |

**If this table is empty:** n/a — four assumptions above need planner/user confirmation.

## Open Questions

1. **OQ-1: What equity funds the risk-% → contracts conversion?**
   - What we know: D-07 locks risk-% input (default 1%) + size in NQ contracts + size = risk ÷ stop-distance. Contracts = (equity × risk%) ÷ (stopDistance × pointValue) needs equity and NQ $20/pt, neither in-repo.
   - What's unclear: Is there a paper-equity input (new field), a fixed exported `PAPER_EQUITY` constant (e.g. $25,000 paper), or is "risk" in points (no equity needed)?
   - Recommendation: Fixed exported `PAPER_EQUITY_USD` (default $25,000 [ASSUMED] — confirm) + `NQ_POINT_VALUE = 20` [ASSUMED] as named constants beside `TICKET_RR_MIN`; size = floor(...); show equity + point value on the panel so screenshots teach the math. One-line user confirmation.

2. **OQ-2: What is the exact invalidation-SL rule table?**
   - What we know: "invalidation SL" — the SL is the structure whose break kills the setup (Modul 4.3). Candidates: entry-FVG far edge, displacement-origin extreme, swept Asia extreme reclaimed.
   - What's unclear: Priority order LONG vs SHORT, and which structure wins when several exist.
   - Recommendation: Planner locks at plan time: LONG SL = min(entryFVG.bottom, sweep-low) i.e. below the structure that must hold; SHORT mirror; single rule, boundary-tested. ICT judgment call — confirm in discuss/plan review, not research.

3. **OQ-3: Which TP leg gates the R/R ≥ 1:3 EXECUTE decision?**
   - What we know: D-03 locks the floor + verbatim-ratio reason; FEATURES.md precedent measured `riskReward({ entry, sl, tp2 }}`.
   - What's unclear: TP1 vs TP2 as the gate leg under the new structure-first ladder.
   - Recommendation: Gate on TP1 (nearest exit must justify risk — most conservative, matches "no warn-and-pass"); report per-leg multiples for TP1/TP2/TP3 regardless. Confirm at plan time.

4. **OQ-4: Where does KAĞIZ QEYD persist the paper note?**
   - What we know: D-08 — EXECUTE-side CTA "logs intent as paper note"; STAND ASIDE-side İMTİNA dismisses without logging.
   - What's unclear: Session-ephemeral store array vs localStorage append vs firing-log-adjacent export.
   - Recommendation: Store `paperLog` array, capped like `TRIGGER_LOG_CAP` (`TRIGGER_LOG_CAP = 50` [VERIFIED: src/lib/ict/trigger.ts:30]), entries `{ asOf, verdict, direction, entry, sl, tp, sizeContracts }` — observable, replayable for Phase 18, zero journal scope creep. Confirm at plan time.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | build/test | ✓ | v24.11.1 | — |
| npm | installs (none needed) | ✓ | 11.6.2 | — |
| zustand | ticketInputs slice + selectTicket | ✓ (installed) | ^5.0.15 | — |
| lightweight-charts v5 | T pin + ticket lines | ✓ (installed) | ^5.2.1 | — |
| shadcn card/button | panels + CTAs | ✓ (installed) | shadcn ^4.21.0 | — |
| vitest | ticket + banned-word + selector tests | ✓ (installed) | ^5.0.0 | — |
| Knowledge graph (`.planning/graphs/graph.json`) | cross-doc relationships | ✗ (absent) | — | Manual CONTEXT chain (15→16→17), already read |

**Missing dependencies with no fallback:** none — zero new packages, zero services.
**Missing dependencies with fallback:** knowledge graph absent → manual prior-phase reads substituted (done this session).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^5.0.0 [VERIFIED: package.json:41] |
| Config file | `vitest.config.ts` — `environment: 'node'`, `include: ['src/**/*.test.ts', 'app/**/*.test.ts']`, `testTimeout: 15000` [VERIFIED: vitest.config.ts:4-13] |
| Quick run command | `npx vitest run src/lib/ticket.test.ts` |
| Full suite command | `npm test` (`vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| TICK-01 | Fixed-order derivation; STAND ASIDE + reason per gate fail; TP structure-first; R/R gate | unit | `npx vitest run src/lib/ticket.test.ts` | ❌ Wave 0 |
| TICK-01 | `selectTicket` wiring: shared epoch, flaw precedence, refuse-null, degraded envelope | unit (store) | `npx vitest run src/lib/store.test.ts` (extend) | ✅ extend |
| TICK-02 | risk÷distance sizing; refusal on zero stop-distance / missing levels; riskPct clamp | unit | `npx vitest run src/lib/ticket.test.ts` | ❌ Wave 0 |
| TICK-03 | Banned-word grep green (Filled/Position/Submit Order/placeOrder) | unit (grep guard) | `npx vitest run src/lib/ticket-vocabulary.test.ts` (or inside ticket.test.ts) | ❌ Wave 0 |
| TICK-04 | `REPORT_SECTIONS` §§4–6 live + §5 PAPER title | unit | `npx vitest run src/lib/report.test.ts` (update literals) | ✅ update |
| TICK-04 | Panels render verdict + verbatim reason; banner persistent; chart pin/lines | manual-only (jsdom absent; `.test.tsx` not in vitest include — see Pitfall 5) | UAT visual glance (chart-empty/skeleton precedents) | ❌ UAT plan |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/ticket.test.ts src/lib/report.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/ticket.ts` + `src/lib/ticket.test.ts` — covers TICK-01, TICK-02 (derivation table, R/R boundaries 3.0/2.99, refusal cases, per-leg multiples)
- [ ] Banned-word vocabulary test — covers TICK-03 (Pitfall 1 allowlist rule)
- [ ] `src/lib/store.test.ts` extensions — `ticketInputs` clamps, `selectTicket` flaw-precedence + refuse-null + degraded envelope
- [ ] `src/lib/report.test.ts` literal updates — live count 2→5, §5 PAPER title (Pitfall 2)
- [ ] Planner decision: extend vitest `include` with `src/**/*.test.tsx` OR keep panels manual-UAT-only (Pitfall 5)
- [ ] Framework install: none — `npm test` runs today

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No users, no sessions, no broker — nothing to authenticate |
| V3 Session Management | No | Stateless terminal; `paperLog` is in-memory client state |
| V4 Access Control | No | Single-operator local terminal |
| V5 Input Validation | **Yes** | `riskPct` clamped setters (refuse NaN/negative/oversize); `computeTicket` boundary throws on malformed envelopes; finite-guards on all price inputs (chart-mapper idiom) |
| V6 Cryptography | No | No secrets, no broker keys — v3.0 adds zero env vars; any PR adding a key-shaped env var fails review (PITFALLS.md Security) |

### Known Threat Patterns for Paper-Ticket Terminal

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Paper mistaken for real execution (screenshot, future wiring) | Spoofing | PAPER/SIMULATED vocabulary everywhere; persistent non-dismissible banner; banned-word test; `PaperTicket`/`paperLog` type names — never `broker`/`placeOrder`/`Filled` |
| False-precision numbers on stale/thin inputs | Tampering (integrity) | Degraded-with-provenance (D-05): dimmed + STALE/THIN tag naming leg; sizing locked with reason |
| Client-computed risk sized into a real trade | Repudiation / trust | Panel shows inputs (equity, risk %, point value) explicitly; paper levels are educational, not advice; assumptions printed alongside |
| Ghost levels misread after verdict flips | Tampering | D-10: pins/lines cleared via empty-marker-set + line-removal on STAND ASIDE/INVALIDATED |

## Sources

### Primary (HIGH confidence)

- `src/lib/ict/trigger.ts` (`TriggerOutput`, `TriggerVerdict`, `TriggerReasonKey`, `TRIGGER_LOG_CAP`) — read this session, quoted verbatim
- `src/lib/ict/invalidation.ts` (`FatalFlawOutput`, `FlawReasonKey`, live-SOFT note) — read this session, quoted verbatim
- `src/lib/report.ts` (`REPORT_SECTIONS` current state) — read this session, quoted verbatim
- `src/lib/store.ts` (`selectTrigger`/`selectFatalFlaw`/`sharedEpoch`/`appendFiringLog` contracts) — read this session
- `components/charts/nq-chart.tsx` (`buildOverlayMarkers`, remove-then-create lifecycle) — read this session
- `components/dashboard/terminal-shell.tsx` (3 UNAVAILABLE data-slots, judasBarDate loop, banner idioms) — read this session
- `components/dashboard/report.tsx` (§3 block precedent, locked fallbacks) — read this session
- `src/lib/ict/fvg.ts`, `asia.ts`, `levels.ts`, `dol.ts`, `confluence.ts`, `chart-mapper.ts`, `purity.test.ts`, `report.test.ts`, `package.json`, `vitest.config.ts` — read this session
- `17-CONTEXT.md` (D-01..D-10 locked decisions), `17-UI-SPEC.md` (approved design contract), `15-CONTEXT.md`, `16-CONTEXT.md`, REQUIREMENTS.md (TICK-01..04), ROADMAP.md, PROJECT.md, STATE.md
- `.planning/research/{ARCHITECTURE,FEATURES,STACK,PITFALLS}.md` (v3.0 execution layer, HIGH-confidence codebase-anchored research)

### Secondary (MEDIUM confidence)

- `reference/institutional_rules.md` Modul 4 + §§4–6 (R/R Min 1:3 [VERIFIED: institutional_rules.md:93], ticket schema EXECUTE LONG / EXECUTE SHORT / STAND ASIDE, TP1 internal / TP2 external / TP3 HTF DOL) — project domain authority, read this session

### Tertiary (LOW confidence)

- NQ $20/pt point value + $25,000 paper-equity default — industry-standard futures spec, NOT verified in-repo; tagged [ASSUMED], logged as A1, gated by OQ-1 confirmation
- No web/documentation lookup was performed: all search providers are disabled in project config and the domain authority is entirely in-repo. No external claim in this file depends on training data except A1/A2.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; every version read from `package.json` this session
- Architecture: HIGH — every integration point read from its source file this session with verbatim quotes
- Pitfalls: HIGH — each pitfall names the exact file + line contract it guards, verified by reading

**Research date:** 2026-09-11
**Valid until:** 2026-10-11 (stable domain — in-repo contracts; re-verify only if Phases 15/16 outputs change shape)
