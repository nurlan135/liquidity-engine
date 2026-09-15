# Architecture Research: BSL/SSL Pain Threshold Map

**Domain:** ICT liquidity-pool projection layer on the NQ execution terminal
**Researched:** 2026-09-15
**Confidence:** HIGH (direct codebase reads: `src/lib/ict/*`, `src/lib/store.ts`, `src/lib/report.ts`, `src/lib/ticket.ts`, `src/lib/chart-mapper.ts`, `components/charts/nq-chart.tsx`, `components/dashboard/terminal-shell.tsx`, `components/dashboard/report.tsx`)

## Standard Architecture

### System Overview

The terminal is a four-layer pipeline. The BSL/SSL map slots in as a **new projection layer inside the existing `ict/` pure family** — it reads the same candle legs every other detector reads, emits a ranked pool inventory, and fans out through the exact selector → report → chart seams that §3 (§3 trigger/AMD/SMT) and §§4–6 (trigger/ticket/flaw) already proved.

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LEGS (poll layer, store-owned)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ NQ D1    │  │ ES D1    │  │ NQ 1H    │  │ NQ 15M   │         │
│  │ daily    │  │ daily    │  │ intraday │  │ intraday │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
├───────┴─────────────┴─────────────┴─────────────┴───────────────┤
│              ICT PURE LAYER (src/lib/ict, no I/O, no clock)      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │
│  │ range/   │  │ smt/     │  │ asia/    │  │ ★ liquidity-   │   │
│  │ levels/  │  │ judas/   │  │ fvg/     │  │   pools (NEW)  │   │
│  │ dol/bias │  │ amd      │  │ trigger/ │  │ BSL/SSL map    │   │
│  │ regime   │  │          │  │ invalid. │  │                │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬────────┘   │
├───────┴─────────────┴─────────────┴───────────────┴─────────────┤
│           SELECTOR LAYER (src/lib/store.ts, Zustand)             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ selectRange… selectSMT/Judas/AMD/Trigger/Flaw/Ticket      │   │
│  │ ★ selectPools (NEW) — refuse-null + sharedEpoch idiom     │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│              RENDER LAYER (components, math-free)                │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │ report.tsx   │  │ nq-chart.tsx │  │ side panels           │   │
│  │ ★ §1 live    │  │ ★ BSL/SSL    │  │ (ticket/flaw/smt-row) │   │
│  │ block (NEW)  │  │ lines (NEW)  │  │ untouched             │   │
│  └──────────────┘  └──────────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         terminal-shell.tsx = the single fan-out seam (NEW wiring only)
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `src/lib/ict/liquidity-pools.ts` (NEW) | NQ swing inventory → BSL (above) / SSL (below) pool ranking + swept-vs-resting state + verbatim Azerbaijani reason | Pure functions, injected candles + `asOf`, trailing-cap idiom, `got-string` boundary throws |
| `range.ts` + `levels.ts` (FEEDER) | D1 dealing-range anchors (high/low/eq, Q1/Q3, OTE pockets) — pools relativize to these | Unchanged; pools import types only |
| `smt.ts` (FEEDER + PATTERN DONOR) | Fractal swing primitives (`isSwingHigh`/`isSwingLow`, `SWING_K=2`) + time-anchored pairing precedent + `evaluateSMT` confirmation tag | Unchanged; pools reuses swing predicates, never duplicates tolerance math |
| `judas.ts` (FEEDER) | Confirmed sweep truth — pools consume `JudasOutput` read-only to mark pools swept vs resting | Unchanged; `judasSwing` stays the sole sweep judge |
| `fvg.ts` (PATTERN DONOR) | Trailing-20 inventory idiom (`FVG_MAP_BOUND`), close-through mitigation shape, `describeDeliveryTransition` verbatim-prose precedent | Unchanged; pools mirrors `detectFVGs`/`applyMitigation` structure |
| `asia.ts` (FEEDER) | Proximal pool edges (Asia high/low) + displacement denominator | Unchanged; pools reference Asia extremes for proximity ranking |
| `dol.ts` (FEEDER + CONSUMER-ADJACENT) | Single DOL target (range high/low) — pools refine this into a ranked ladder | Unchanged in v3.1; future TP2 upgrade reads pools (explicitly deferred) |
| `trigger.ts` / `invalidation.ts` (READ-ONLY NEIGHBORS) | WHY NOW gates + HARD/SOFT flaw — pools NEVER vote here in v3.1 (agree-tag at most) | Unchanged; pools input shape mirrors `TriggerInput` read-only fields |
| `ticket.ts` (BROKERAGE, never `ict/`) | OTE×FVG entry, SL, structure-first TP ladder (TP2 = opposing DOL) | Unchanged in v3.1; pools do not touch sizing or R/R |
| `store.ts selectPools` (NEW selector) | Refuse-null on stale/empty NQ leg, `sharedEpoch`, try/catch-never-throw, composes `selectJudas`/`selectSMT` read-only | Follows `selectTriggerPure`/`selectLiquidityPath` envelope verbatim |
| `report.tsx` §1 block (MODIFIED) | Prints `selectPools` prose verbatim + leg-`lastError` chain + skeleton/`Məlumat yoxdur` states | Copies the §3/§§4–6 branch shape, new `s1-*` sub-slots |
| `nq-chart.tsx` + `chart-mapper.ts` (MODIFIED) | BSL/SSL dashed price lines + optional pool markers; per-leg independent render, stale-desaturate, empty-set clearing | New `poolLineInputs` guard + new optional props + `buildOverlayMarkers` 4th slot |
| `terminal-shell.tsx` (MODIFIED, wiring only) | Stable-function subscription → derive during render → fan out to `Report` (via store) and `NqChart` props + containing-D1-bar date mapping | Copies the Asia/Judas/SMT wiring block + `fireBarDate` containing-bar loop |

## Recommended Project Structure

```
src/
├── lib/ict/liquidity-pools.ts    # ★ NEW — BSL/SSL pure projection layer
│   # detectPools(candles) + rankPools + swept-marking + describePools reason
├── lib/ict/liquidity-pools.test.ts # ★ NEW — boundary + ranking + swept-state pins
├── lib/ict/
│   ├── smt.ts                    # UNCHANGED — swing predicate donor
│   ├── judas.ts                  # UNCHANGED — sweep-truth donor
│   ├── fvg.ts                    # UNCHANGED — inventory-idiom donor
│   ├── range.ts / dol.ts         # UNCHANGED — anchor feeders
│   ├── asia.ts                   # UNCHANGED — proximal-pool feeder
│   ├── trigger.ts                # UNCHANGED — read-only neighbor
│   └── invalidation.ts           # UNCHANGED — read-only neighbor
├── lib/
│   ├── store.ts                  # MODIFIED — add selectPools only
│   ├── report.ts                 # MODIFIED — flip §1 state to 'live'
│   ├── chart-mapper.ts           # MODIFIED — add poolLineInputs guard
│   └── ticket.ts                 # UNCHANGED in v3.1 (pools→TP2 deferred)
components/
├── dashboard/
│   ├── report.tsx                # MODIFIED — add §1 live branch
│   └── terminal-shell.tsx        # MODIFIED — pools→chart fan-out wiring
└── charts/
    └── nq-chart.tsx              # MODIFIED — BSL/SSL lines + markers
```

### Structure Rationale

- **`liquidity-pools.ts` lives in `src/lib/ict/`, not beside `ticket.ts`:** it is ICT methodology math (swing projection), not brokerage math. The `ticket.ts` header rule ("brokerage math, never ICT methodology… never inside `src/lib/ict`") cuts the other way here — pools belong with `smt/judas/fvg`. This also keeps the `purity.test.ts` grep guard covering the new file for free (no `Date.now`, no store imports).
- **One new module, not two:** BSL and SSL are the same scan with opposite polarity (mirrors how `detectFVGs` handles BULLISH/BEARISH in one pass and how `directionOf` is a total function of one input). Splitting buy-side/sell-side into separate files doubles the swing-scan drift surface.
- **No new leg, no new poll timer:** pools read the existing NQ D1 leg (primary) with optional read-only ES/Judas context. The four-leg grid (`:00/:15/:30/:45`) and per-leg envelope guards stay untouched — pools add zero network, zero cache, zero Vercel-cost surface.
- **No new chart primitive:** BSL/SSL lines reuse the `createPriceLine` remove-then-create cycle (Asia pair precedent) and any markers reuse the `createSeriesMarkers` plugin (J-S-T order precedent). No `zone-primitive` change — zone bands stay range-owned.

## Architectural Patterns

### Pattern 1: NQ-only swing inventory with imported predicates

**What:** the pool scan runs `isSwingHigh`/`isSwingLow` (imported from `smt.ts`, same `ict/` family — allowed) over closed NQ D1 rows, trailing `SWING_LOOKBACK`-style window, collecting swing highs (→ BSL pools above price) and swing lows (→ SSL pools below price). Proximity ranking relativizes each pool to last close + range position + Asia extremes.
**When to use:** this is the v3.1 pools core — always.
**Trade-offs:** importing from `smt.ts` couples pools to SMT's `SWING_K=2` tuning (pro: single swing-truth, no drift; con: K retunes ripple). Alternative — duplicating the fractal loop in pools — is rejected: two swing definitions will diverge within one milestone.

**Example:**
```typescript
// src/lib/ict/liquidity-pools.ts — pure, injected candles only
import { isSwingHigh, isSwingLow, SWING_K } from '@/src/lib/ict/smt';
import { closedOnly } from '@/src/lib/ict/types';

export type PoolSide = 'BSL' | 'SSL';
export interface LiquidityPool {
  side: PoolSide;
  price: number;        // swing extreme: stop resting place
  originDate: string;   // swing-bar date (D1 business-day string)
  swept: boolean;       // resolved at the selector boundary via judas (read-only)
  strength: number;     // rank score: confluence count, never a price
}
export interface PoolsOutput {
  bsl: LiquidityPool[];   // above last close, nearest-first
  ssl: LiquidityPool[];   // below last close, nearest-first
  reason: string;         // verbatim Azerbaijani, toBe-pinned, never interpolated
  asOf: string;           // injected date string, never a clock read
}
```

### Pattern 2: Trailing-cap inventory (FVG idiom reuse)

**What:** cap the active pool map to a trailing bound (`POOL_MAP_BOUND`, FVG's `FVG_MAP_BOUND = 20` precedent — recommend 20, same order of magnitude as the dealing-range `ANCHOR_WINDOW = 20`), sorted by `originDate` before slicing so map and prose agree on what is current even for unsorted input (fvg.ts WR-07 precedent).
**When to use:** always — unbounded pool lists grow DOM lines and dilute the §1 sentence.
**Trade-offs:** capping drops deep-history pools (pro: chart stays legible, §1 names 2–4 pools max; con: a far pool that later matters is absent — acceptable, rolling recompute re-surfaces it as price approaches).

### Pattern 3: Swept-vs-resting resolved OUTSIDE pools (Judas owns sweeps)

**What:** `liquidity-pools.ts` detects *where stops rest*; whether a pool has been *swept* is resolved at the selector boundary (or a thin `markSwept(pools, judas)` pure helper) consuming `JudasOutput` read-only — exactly how `amdPhase` consumes judas for promotion and `evaluateTrigger` consumes it for the purge gate without re-implementing sweep detection.
**When to use:** always — never put wick-pierce/close-through logic inside pools.
**Trade-offs:** pools output is "resting inventory" until composed (pro: single sweep-truth in `judasSwing`; con: pools unit tests need a judas stub for the swept branch — cheap, `amd.test.ts` already does this).

### Pattern 4: Read-only tag into trigger prose, never a gate (v3.1 scope lock)

**What:** pools do NOT vote in `evaluateTrigger`'s 3-gate count and do NOT feed `computeTicket`. At most, a fixed agree-suffix (trigger.ts `smtSuffix` / amd.ts `smtTag` precedent: `HIGH+BEARISH → SMT razılaşır.`) — e.g. FIRE_SHORT toward a ranked SSL pool appends a fixed tag. No numbers interpolated, no gate math touched.
**When to use:** v3.1 — keeps the CALIBRATION-PROVISIONAL trigger thresholds (`TRIGGER_DISP_MULT`, killzone, `TICKET_RR_MIN`) valid without recalibration.
**Trade-offs:** pools feel "display-only" in v3.1 (pro: zero recalibration risk, trigger parity harness stays green; con: full pools→entry-confluence must wait — correctly deferred to a later milestone with its own replay data).

### Pattern 5: Selector refuse-null envelope + sharedEpoch (store idiom)

**What:** `selectPools` copies the `selectTriggerPure`/`selectLiquidityPath` envelope: refuse `null` on stale or empty NQ leg (owning-leg `lastError` carries the verbatim reason), one `sharedEpoch(get)` call, derive judas/smt via existing selectors read-only, try/catch returning `null`, zero `set` calls.
**When to use:** every new selector — no exceptions.
**Trade-offs:** none — this is house law; deviating breaks the render-never-throws contract.

**Example:**
```typescript
// store.ts — NEW selector beside selectLiquidityPath
selectPools: () => {
  const { nq } = get();
  if (nq.stale) return null;
  if (closedOnly(nq.candles).length === 0) return null;
  try {
    const epoch = sharedEpoch(get);
    const judas = get().selectJudas();   // read-only swept context
    const smt = get().selectSMT();       // read-only agree context
    return evaluatePools({ candles: nq.candles, judas, smt, asOf: epoch });
  } catch {
    return null;
  }
},
```

### Pattern 6: §1 branch copies the §3/§§4–6 report shape

**What:** `report.ts` flips index-1 to `state: 'live'`; `report.tsx` adds a `section.index === 1` branch with the locked shape: `lastUpdatedISO === null` skeleton → `null`-selector `Məlumat yoxdur` (or leg-`lastError` verbatim) → live block with `data-slot="s1-pools"` prose. Fuses pool reason + existing sentiment-fixture crowded side (True AVG precedent in `module-1.tsx`): pools name *where* stops rest, sentiment names *which side is crowded* → pain direction sentence.
**When to use:** the §1 build step.
**Trade-offs:** §1 keeps the Module-1 fixture dependency (pro: crowded-long/short pain reading works day one with zero budget; con: §1 inherits the fixture-replaceable caveat — label it, as §3's `S3_NY_LINE` labels its unmeasured part).

### Pattern 7: Chart BSL/SSL as Asia-pair lines + 4th marker slot

**What:** `chart-mapper.ts` gains `poolLineInputs(pools)` (finite-guard, throws naming itself, caller wraps in try/catch — `asiaLineInputs` precedent). `nq-chart.tsx` gains optional `pools` props (arrays of finite prices, or the `PoolsOutput` directly), renders each leg independently (null/non-finite skipped, finite still render — ticket-legs precedent), `removePriceLine` unconditionally first (ghost-line precedent, D-10), stale-desaturate to `MUTED_GRAY`, thin-tier `opacityScale` untouched. Marker order extends J-S-T → J-S-T-P only if a pool-sweep pin is wanted; otherwise lines only (recommend lines-only in v3.1 — markers are for *events*, pools are *levels*).
**When to use:** the overlay build step; lines-only is the opinionated default.
**Trade-offs:** lines-only avoids marker crowding on the D1 canvas (pro: Asia-H/L + EQ/DOL + OTE + Entry/SL/TP1-3 already crowd the price axis; con: no at-a-glance swept-pool event — covered by Judas J pins + §1 prose instead).

## Data Flow

### Request Flow (poll → selector → §1 + overlay)

```
60s dual-poll tick (unchanged: NQ D1 leg refreshes at :00)
    ↓
store.nq leg updated (envelope guard, coverage recompute — unchanged)
    ↓
selectPools() — NEW, render-pure derivation, same snapshot discipline as
  selectTriggerPure/selectFatalFlaw (one sharedEpoch, read-only judas/smt)
    ↓
    ├→ report.tsx §1 branch — prints pools.reason verbatim + crowded-side
    │   fusion (fixture True AVG) + s1 sub-slots; null → Məlumat yoxdur
    └→ terminal-shell.tsx fan-out — pools prices → NqChart props
        (containing-D1-bar mapping only if markers chosen; lines need no
        bar dates) + overlayStale desaturation (nq.stale joins the OR)
```

### State Management

```
Zustand store (sole dashboard state — no Redux/Context)
    ↓ subscribe (stable selector-function + derive-during-render;
    │            useShallow only for flat shapes — selectLevels precedent)
Report / NqChart / panels ←→ selectors → ict pure functions → leg candles
Firing log / paper log untouched (pools never append — commitTriggerLog
  remains the single logging path; pools add no log, no cap, no export)
```

### Key Data Flows

1. **Pools derivation (NEW):** `nq.candles` → `selectPools` → `evaluatePools` (+ read-only `selectJudas`/`selectSMT`) → `PoolsOutput` → §1 prose + chart lines. ES leg never feeds pool geometry (ES confirms only, via the SMT tag — D1-anchor discipline from `selectRange` D-07).
2. **Swept-state (NEW, composed):** `selectJudas` confirmed sweep → pools at/beyond the swept extreme flip `swept: true` → §1 names "swept vs resting" and the chart optionally dims swept lines. Never the reverse (pools never invalidate judas).
3. **TP-ladder (DEFERRED, not v3.1):** `resolveTP` TP2 currently reads `dol.price`; a future milestone may read ranked pools as TP2 candidates. v3.1 wires nothing — the seam is documented, not built.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (20–60 D1 bars, 1 symbol) | Nothing — pool scan is O(n·k) over closed rows, trivially under frame budget; trailing-20 cap bounds DOM lines |
| 1H/15M pool projection (if ever) | Reuse the same module with intraday rows (asia/judas precedent: separate selector, NY wall-clock session scoping) — do NOT widen the D1 scan to intraday implicitly |
| Multi-symbol (if ever) | Pools stay per-symbol pure; ES pools would be a second `selectPoolsES` call, never a merged cross-symbol inventory (dual-leg D-01/D-06 precedent) |

### Scaling Priorities

1. **First bottleneck:** price-line count on the D1 canvas (Asia 2 + EQ/DOL 2 + Q1/Q3/OTE 4 + ticket 5 = 13 already). Cap rendered pool lines to nearest-2-per-side (4 max) — rank in math, truncate at the shell→chart prop boundary with a named constant, test-pinned.
2. **Second bottleneck:** §1 prose length. Name at most 2 BSL + 2 SSL pools with prices; full inventory stays in the `PoolsOutput` object for tests/replay, never on screen.

## Anti-Patterns

### Anti-Pattern 1: Re-implementing swing or sweep detection inside pools

**What people do:** write a second fractal loop with different `k`, or a second wick-pierce sweep check, because "pools feel different."
**Why it's wrong:** two swing truths diverge on equality-boundary bars (strict `>`/`>=` discipline in `isSwingHigh`/`isSwingLow`); two sweep truths disagree on killzone edges and the trigger/flaw chain (which reads judas, not pools) contradicts §1 prose on the same snapshot.
**Do this instead:** import swing predicates from `smt.ts`; consume `JudasOutput` read-only for swept-state. One swing truth, one sweep truth.

### Anti-Pattern 2: Making pools a 4th trigger gate or ticket input in v3.1

**What people do:** wire `pools` into `TriggerInput` gates or `TicketInput` TP-resolution "while we're here."
**Why it's wrong:** invalidates every CALIBRATION-PROVISIONAL threshold, breaks the 5-rule parity harness and 20-session replay baselines, and re-opens the §§4–6 UAT that just passed 10/10. Scope creep with a calibration bill.
**Do this instead:** read-only agree-tag at most; gate/TP integration is a later milestone with its own replay + calibration plan.

### Anti-Pattern 3: Interpolating prices into verbatim reasons

**What people do:** template pool prices into the Azerbaijani reason string for "precision."
**Why it's wrong:** breaks the `toBe`-pinned verbatim contract (trigger.ts D-09, invalidation.ts D-04/D-10) — every poll tick with a new price becomes a new string, untestable and untranslatable. Prices render in dedicated numeric slots (`toFixed(2)` — ticket-panel precedent), prose stays fixed.
**Do this instead:** fixed reason templates keyed by pool-state (e.g. `BSL_RESTING` / `SSL_SWEPT` / `BALANCED`), prices in adjacent numeric lines.

### Anti-Pattern 4: Chart markers for resting levels

**What people do:** pin a marker per pool on the canvas.
**Why it's wrong:** markers denote *events at a bar time* (J/S/T pins with containing-bar mapping); resting pools are *levels across time* — markers would need fake bar dates, lie on the time axis, and crowd the J-S-T order into alphabet soup.
**Do this instead:** dashed price lines for pools (Asia-pair precedent); reserve markers for a pool-*sweep event* only, and only if §1 prose needs canvas backup (it doesn't — Judas J pins already mark sweeps).

### Anti-Pattern 5: Reading clocks or the store inside `liquidity-pools.ts`

**What people do:** call `Date.now()` for `asOf` or import the store "for judas."
**Why it's wrong:** trips the co-located `purity.test.ts` grep guard, kills monorepo extraction, makes replay non-deterministic.
**Do this instead:** `asOf` (epoch or date string) and judas/smt envelopes are parameters — time at the caller boundary only (`sharedEpoch` precedent).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Yahoo proxy (`/api/yahoo`, NQ D1 leg) | Unchanged — pools read `store.nq` post-envelope-guard | No new symbol, interval, or TTL; 60s CDN + serve-stale + backoff untouched |
| Yahoo ES D1 leg | Read-only confirmation context via `selectSMT` only | Never pool geometry input (D1-anchor discipline); stale ES degrades the agree-tag, never nulls pools unless the design explicitly says so (recommend: ES-stale dims tag, pools still render — document the choice) |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `liquidity-pools.ts` ↔ `smt.ts` | Direct import of `isSwingHigh`/`isSwingLow`/`SWING_K` | Same-family reuse; pin K-behavior in pools tests so SMT retunes surface loudly |
| `liquidity-pools.ts` ↔ `judas.ts` | Type-only + read-only `JudasOutput` param (never calls `judasSwing`) | Selector composes; pools never imports Asia/session clocks |
| `selectPools` ↔ `selectJudas`/`selectSMT`/`selectRange`/`selectAsia` | Selector-to-selector reads inside one try/catch, one `sharedEpoch` | Follows `selectTicket` single-snapshot chain; report reads `selectPools` only, never detectors directly |
| `selectPools` ↔ `report.tsx` §1 | `PoolsOutput.reason` verbatim + leg-`lastError` fallback chain | New `s1-*` data-slots (`s1-pain-direction`, `s1-bsl`, `s1-ssl`); locked `UNAVAILABLE` chip pattern untouched elsewhere |
| `terminal-shell.tsx` ↔ `nq-chart.tsx` | New optional `pools*` props (nullable arrays or `PoolsOutput`), `poolLineInputs` guard | Remove-then-create + unconditional-removal clearing (STAND-ASIDE ghost-line precedent); `overlayStale` OR-gate gains `nq.stale` if not already covered |
| `pools` ↔ `trigger`/`ticket`/`invalidation` | NONE in v3.1 (agree-tag at most, no type change to `TriggerInput`/`TicketInput`/`FatalFlawInput`) | Explicit non-integration is the decision — recalibration deferred by design |
| `REPORT_SECTIONS` §1 | `{ index: 1, … state: 'live' }` + title kept (`1. RETAIL EXPOSURE & SENTIMENT ENGINEERING`) | Title unchanged (report shape stable since v1.0); pools + sentiment fixtures fuse inside the live block |

## Suggested Build Order (dependency-respecting)

1. **Pools math** — `src/lib/ict/liquidity-pools.ts` + `liquidity-pools.test.ts`: swing inventory → BSL/SSL split → proximity rank → trailing cap → fixed verbatim reasons. Boundary tests first (empty, single-bar, equality-touch-is-not-a-swing, unsorted-input, non-finite rows drop). No store, no UI.
2. **`selectPools` selector** — `store.ts` addition + store tests: refuse-null matrix (stale NQ, empty NQ, ES-stale tag-dim), sharedEpoch single-call, never-throws, read-only judas/smt composition. No render yet.
3. **§1 live report** — `report.ts` flip + `report.tsx` §1 branch + report tests: skeleton/empty/leg-error/live states, `s1-*` slots, sentiment-crowded fusion copy, banned-word quarantine. Chart untouched.
4. **Chart overlay** — `chart-mapper.ts` `poolLineInputs` + `nq-chart.tsx` lines (+ shell fan-out) + chart/mapper tests: per-leg independence, ghost-line clearing, stale-dim, 4-line render cap, null-clears. Verbatim prose untouched.
5. **Execution polish** — WHY NOW threshold calibration review (firing-log JSON analysis — pools add context rows only if the calibration plan says so), ticket UX micro-tuning, firing-log analysis docs. No math changes without replay evidence.

Each step ships independently verifiable (unit + UAT slice) and step N+1 never re-opens step N's green tests — the v3.0 phase discipline (17 plans, 420/420) applied to v3.1 scope.

## Sources

- `src/lib/ict/smt.ts` — swing predicates, `SWING_K`/`SWING_LOOKBACK`/`SMT_TOL_BPS`, time-anchored pairing, correlation + rollover gate order
- `src/lib/ict/judas.ts` — three-gate sweep, killzone edges, displacement denominator, preRun/candidate/confirmed states
- `src/lib/ict/fvg.ts` — trailing-20 inventory, mitigation shape, verbatim prose precedent
- `src/lib/ict/range.ts`, `levels.ts`, `dol.ts`, `asia.ts`, `amd.ts` — anchors, pockets, DOL, proximal pools, fusion/tag idioms
- `src/lib/ict/trigger.ts`, `invalidation.ts` — single-snapshot chain, read-only SMT tag, HARD/SOFT flaw, verbatim + challenge-bank contracts
- `src/lib/store.ts` — selector envelopes, `sharedEpoch`, pure-vs-commit split, per-leg stale discipline, four-leg poll grid
- `src/lib/ticket.ts` — brokerage/ict boundary, structure-first TP ladder (pools→TP2 deferred seam)
- `src/lib/report.ts`, `src/lib/chart-mapper.ts`, `src/lib/thin-tier.ts` — section contract, line-input guards, honesty dimming
- `components/dashboard/terminal-shell.tsx`, `report.tsx`, `components/charts/nq-chart.tsx` — fan-out seam, branch shapes, overlay cycles
- `src/lib/ict/purity.test.ts` — purity guard covering the new module for free

---
*Architecture research for: BSL/SSL Pain Threshold map (v3.1 §1 + overlay)*
*Researched: 2026-09-15*
