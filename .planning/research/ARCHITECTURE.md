# Architecture Research

**Domain:** Pools P2 execution-link features on a pure-selector + Zustand terminal (liquidity-engine)
**Researched:** 2026-10-26
**Confidence:** HIGH (code-read: `src/lib/ict/pools.ts`, `swings.ts`, `trigger.ts`, `invalidation.ts`, `src/lib/ticket.ts`, `confluence.ts`, `sentiment.ts`, `report.ts`, `chart-mapper.ts`, `src/lib/store.ts` selectors, `components/dashboard/report.tsx`, `terminal-shell.tsx`, `nq-chart.tsx`, `ticket-panel.tsx`, `pools-parity.test.ts`)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION (client)                       │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ ┌─────────────┐ │
│ │   Report     │ │   Panels     │ │  NqChart   │ │  Sandbox    │ │
│ │ §§1–6 prose  │ │ ticket/firing│ │ overlays   │ │ calibration │ │
│ │ math-free    │ │ log/sentiment│ │ price lines│ │ preview-only│ │
│ └──────┬───────┘ └──────┬───────┘ └─────┬──────┘ └─────────────┘ │
│        │                │               │                        │
├────────┴────────────────┴───────────────┴────────────────────────┤
│                    SELECTORS (src/lib/store.ts)                  │
│  selectPools · selectTicket · selectTrigger(Pure) · selectRange  │
│  selectLevels · selectRange4H · selectSMT/Judas/AMD · sharedEpoch │
│  refuse-null + degraded envelope + try/catch-never-throw         │
├─────────────────────────────────────────────────────────────────┤
│                  PURE DOMAIN (src/lib/ict + libs)                │
│ ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────────┐  │
│ │ pools.ts   │ │ ticket.ts  │ │ trigger/ │ │ sentiment /      │  │
│ │ swings.ts  │ │ (brokerage │ │ invalid. │ │ confluence /     │  │
│ │ fvg/asia/  │ │  never ict)│ │ amd/smt  │ │ report/chart-    │  │
│ │ judas/smt  │ │            │ │          │ │ mapper formatters │  │
│ └────────────┘ └────────────┘ └──────────┘ └──────────────────┘  │
│           purity guard: no Date.now, no store imports             │
├─────────────────────────────────────────────────────────────────┤
│                    DATA (Yahoo proxy + legs)                     │
│  app/api/yahoo (symbol×interval allowlist, 60s CDN, stale-serve)│
│  legs: nq/es daily · nq1h/nq15m intraday · per-leg envelopes     │
│  coverage join · dual-poll :00/:15/:30/:45 · commitTriggerLog    │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `src/lib/ict/pools.ts` | D1 BSL/SSL inventory: seed → lifecycle → ATR-merge → cap → scoreAndRank | Pure, injected `asOf` string; `SWING_K/LOOKBACK` re-exported from `swings.ts` |
| `src/lib/ict/swings.ts` | Shared k=2 strict-fractal swing contract | Single owner; `smt.ts` re-exports, `pools.ts` re-exports |
| `src/lib/ticket.ts` | Brokerage math only (entry/SL/TP ladder, R/R gate on TP1, sizing); optional `buffer` context | Pure, never in `ict/`; null-degrades to unbuffered structure levels |
| `src/lib/ict/trigger.ts` + `invalidation.ts` | WHY NOW gates; flaw-after-trigger on same snapshot | Pure; trigger takes `amd` carried-not-voting, `smt` read-only agree-tag |
| `src/lib/store.ts` selectors | Sole wiring layer: refuse-null, `sharedEpoch`, degraded envelopes, `selectTriggerPure` + `commitTriggerLog` split | `selectPools` (NQ-D1 only, ES-stale never nulls it), `selectTicket` (single-snapshot flaw→ticket chain) |
| `src/lib/report.ts` + `chart-mapper.ts` | Display-only formatters (`describePool`, `poolLineInputs`, `shouldCreatePoolLines`, `ticketLineInputs`) | String/number pass-through, finite-guards, never numeric derivation |
| `components/dashboard/*` + `nq-chart.tsx` | Math-free render: derive-during-render, fan-out props, unconditional-removal clearing | Stable selector-function subscription; shell owns bar-date mapping + nearest-2-per-side slicing |
| Parity harness | Pools-never-vote proof: trigger/flaw/ticket triple identical pools-on vs pools-off over 20-session replay | `pools-parity.test.ts`; `parity.test.ts` stays byte-identical anchor |

## Recommended Project Structure

```
src/
├── lib/ict/            # pure methodology math (purity guard green)
│   ├── pools.ts        # POOL2-01 resolver + POOL2-04 lifecycle live here (MODIFY)
│   ├── swings.ts       # shared k=2 contract, untouched (READ-ONLY)
│   ├── trigger.ts      # untouched — pools never enter TriggerInput (READ-ONLY)
│   └── invalidation.ts # untouched — pools never enter FatalFlawInput (READ-ONLY)
├── lib/
│   ├── ticket.ts       # buffer + TP2 pool-price consumption (MODIFY)
│   ├── sentiment.ts    # trueAvg untouched; multiplier lives beside it (NEW file)
│   ├── confluence.ts   # conviction untouched or display-only suffix input (READ/MODIFY-minor)
│   ├── report.ts       # describeProximity + sentiment-multiplier copy (MODIFY-additive)
│   ├── chart-mapper.ts # 15M line inputs reuse poolLineInputs; no new math (REUSE)
│   └── store.ts        # selectPools enrichment, selectTicket buffer/TP2 wiring,
│                       # NEW selectPools15M, preview-safe calibration (MODIFY)
components/
├── dashboard/report.tsx          # §1 age/proximity/sentiment suffixes, §§4–5 proximity tag (MODIFY)
├── dashboard/terminal-shell.tsx   # fan-out: 15M pool props, buffer already fanned (MODIFY)
├── dashboard/ticket-panel.tsx     # TP2 + buffer note prose (MODIFY-prose only)
└── charts/nq-chart.tsx            # 15M pool lines via existing pool-line path (MODIFY-props only)
```

### Structure Rationale

- **`ict/` stays vote-free:** every Pools P2 price that reaches execution crosses the boundary as a *price input* to `ticket.ts` (like today's `buffer: { atr, poolExtreme }`), never as a new gate inside `trigger.ts`/`invalidation.ts`. The purity grep guard enforces this mechanically.
- **Selectors stay the only wiring:** nearest-ACTIVE resolution, age display values, sentiment multiplier application, and 15M inventory mapping all resolve in `store.ts` from already-derived selector outputs — components keep deriving during render and never import `ict/` math beyond the shipped formatters.
- **Display-only stays display-only:** proximity suffixes, age copy, and sentiment-multiplier copy are string formatters in `report.ts` (the `describePool` precedent: D-18 shape lock, D-20 no-new-ict-math), so they cannot flip verdicts by construction.

## Architectural Patterns

### Pattern 1: Pools-never-vote (projection-context discipline)

**What:** Pools are read-only context. `evaluateTrigger`, `checkFatalFlaw`, and `computeTicket` take **no pools input** in their vote path; pool prices enter `computeTicket` only through the optional `buffer`/`pool-price` argument that moves SL/TP placement while the EXECUTE gate (R/R on TP1) and all gate-fail reasons keep their verbatim shape. Proof is mechanical: `pools-parity.test.ts` replays the full 20-session transition table with the toggle living **only in driver fixtures** and asserts the (trigger verdict, flaw reasonKey, ticket verdict + buffered SL/TP) triple is identical with zero tolerance.
**When to use:** Every POOL2 feature — TP2, age/decay, 15M, sentiment, proximity, W12.
**Trade-offs:** Pro: verdict stability is provable, not promised. Con: every new pool consumption needs a parity-harness extension proving the same triple (budget this per feature, not once).

**Example:**
```typescript
// GOOD: pools enter as an already-resolved price, gate logic untouched
computeTicket({ trigger, flaw, levels, range, dol, asia, riskPct, asOf,
  buffer: { atr, poolExtreme },           // W12: stop beyond extreme, TPs before
  poolTp2: nearestActiveOnTradeSide ?? null, // POOL2-01: TP2 price only, TP1 still gates
});
// BAD: pools enter the vote path
evaluateTrigger({ judas, amd, smt, fvg, asOf, alreadyFired, pools }); // FORBIDDEN
checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf, pools }); // FORBIDDEN
```

### Pattern 2: Pure core + refuse-null selector + math-free render

**What:** `ict/` + `ticket.ts` are pure (injected `asOf`/epoch, no clock, no store). Selectors own all degradation: stale/empty/thin/non-finite → `null` with the reason on the owning leg's `lastError`, wrapped in try/catch that never throws into render. Components subscribe to the stable selector *function* and derive during render (the `selectLevels` precedent — avoids `useShallow` loops on fresh nested identity).
**When to use:** All new selectors (`selectPools15M`), all enriched derivations (buffer/TP2 context, age values).
**Trade-offs:** Pro: render never crashes on bad data; honesty markers (`Məlumat yoxdur`, thin dimming) are free. Con: every new selector must replicate the guard verbatim (stale check → closed-only check → try/catch → null), which is boilerplate by design.

**Example:**
```typescript
// selectPools15M follows the selectPools/selectJudas shape exactly:
selectPools15M: () => {
  const { nq15m, asOfBaku } = get();
  if (nq15m.stale) return null;
  if (closedOnlyIntraday(nq15m.candles).length === 0) return null;
  try {
    const epoch = sharedEpoch(get);
    const pools = evaluateIntradayPools(nq15m.candles, asOfBaku /* or epoch */);
    return { pools, asOf: asOfBaku, epoch, degraded: { stale: false, thin: false, leg: null } };
  } catch { return null; }
},
```

### Pattern 3: Display-only suffix formatter (D-20 precedent)

**What:** New prose (proximity tag, age copy, sentiment-multiplier note) is a string formatter over already-derived selector outputs (`selectPools` + `selectLastClose` + `selectRegime` ATR), living in `report.ts` beside `describePool`, consuming pool fields verbatim with zero recomputed swept-ness and zero new `ict/` math.
**When to use:** POOL2-05 proximity tag, POOL2-04 age display, POOL2-02 multiplier note.
**Trade-offs:** Pro: cannot affect verdicts; needs no parity proof, only copy-pinning tests. Con: must resist the urge to "just" derive one number inside the formatter — ATR distance in §1 is already at the limit of what this pattern allows.

## Data Flow

### Request Flow

```
Poll tick (:00/:15/:30/:45, jittered) → refreshNQ/ES/NQ1H/NQ15M (per-leg envelope, independent failure)
    ↓
commitTriggerLog (single logging path: selectTriggerPure once → appendFiringLog; render reads selectTrigger only)
    ↓
Selectors derive on demand during render: selectPools (NQ-D1) · selectPools15M (NEW) · selectTicket (+buffer/TP2 context)
    ↓
Report §§1/4/5/6 + panels + NqChart props (nearest-2-per-side ACTIVE + swept ghosts + ticket T/entry/SL/TP lines)
```

### State Management

```
Zustand useDashboard (sole state; calibrationPreview session-scoped, Apply re-pins to seeded constants — never rewrites them)
    ↓ subscribe (stable selector-function identity; useShallow only for flat coverage/status strips)
Components derive during render → pure formatter prose → dimmed degraded rendering (opacity-45 + STALE/THIN tag naming leg)
```

### Key Data Flows

1. **TP2-from-pool (POOL2-01):** `selectPools` ACTIVE list → NEW pure `nearestActiveOnTradeSide(pools, direction, entry)` (in `pools.ts`, price-only) → `selectTicket` passes resolved price as `poolTp2` into `computeTicket.resolveTP` (TP2 leg only; TP1 gate + R/R unchanged) → `report.tsx` §5 + `ticket-panel` print `ticket.tp.tp2` verbatim → chart `ticketLineInputs` moves the TP2 line. Parity: TP2 is not a gate leg, so EXECUTE/STAND_ASIDE is provably unchanged — extend `pools-parity.test.ts` to assert verdict triple + TP1/SL identical while TP2 differs by design.
2. **Age/decay/re-accumulation (POOL2-04):** `evaluatePools` lifecycle gains pure age input (`asOf` already injected; age = bars/days since `originDate` from the window, never a clock read). Decay = pure weight transform (e.g. diminished `weight` with floor, or scorer-side `distAtr`-style penalty — prefer scorer-side so stored `weight` keeps the D-04 lifecycle-never-edits-weight invariant). Re-accumulation = lifecycle extension only (e.g. SWEPT + N closes back inside + new touch → ACTIVE with documented rule; never silent re-promotion). Selector change: none beyond passing through the already-returned array (age rides as a NEW optional field, consumed verbatim by the §1 suffix formatter). Store holds no timers, no age state.
3. **15M pools (POOL2-03):** NEW `evaluateIntradayPools(candles: IntradayCandle[], asOf)` reusing `isSwingHigh/isSwingLow` + `SWING_K`/`SWING_LOOKBACK` verbatim (D1 path byte-identical, no signature change to `detectPools`/`evaluatePools` per the D-10 contract split). NEW `selectPools15M` reading the `nq15m` leg (stale → null, never touching `selectPools`). Chart reuses `poolLineInputs` + the nearest-2-per-side + ghost + `shouldCreatePoolLines` gate with separate `pool15m*` props so D1 and 15M lines clear independently.
4. **Sentiment multiplier (POOL2-02):** NEW pure `retailExposureMultiplier(trueAvg, direction)` beside `sentiment.ts`/`confluence.ts` (never in `ict/`), neutral default `1.0`, discrete display words only (no-fake-precision rule: tiers/words, never percentages-as-scores). Consumed display-only in §1 prose suffix (and optionally as a carried note on the ticket `degraded`-style envelope — never as a `computeTicket` gate input). Fixture shape (`fixtures/*.json` + `fixture-guard`) unchanged; multiplier reads the already-computed `trueAvg` output.
5. **Proximity tag (POOL2-05):** NEW `describeProximity(pool, lastClose, atr)` in `report.ts` returning a read-only suffix (e.g. `· Ağrı yaxınlığı …`), appended in `report.tsx` §§4–5 and `execution-protocol.tsx`/`ticket-panel.tsx` beside `data-slot` reason nodes. Inputs are the already-derived `selectPools` rank-1 + `selectLastClose` + `selectRegime().atr`; throw-safe to empty string (a selector throw blanks the suffix, never the section — the §1 `rank1AtrCopy` precedent).
6. **W12 live buffer wiring:** `selectTicket` gains the buffer derivation it currently lacks: `atr` from `selectRegime()`, `poolExtreme` = nearest ACTIVE extreme on the **trigger-resolved** trade side (LONG → BSL extreme below entry / SHORT → SSL extreme above; wrong-side extreme degrades that leg to unbuffered per the `resolveSL`/`resolveTP` side guards already shipped). Null/degenerate context → `buffer: null` → today's unbuffered path, zero behavior change. Chart + panel already handle buffered legs (`ticketLineInputs`, `BUFFER_NOTE_COPY`); no prop changes. Parity: extend the harness with a live-wiring arm asserting buffered triple ≡ harness triple.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (4 legs × 60s poll, 60-bar D1 window, ≤20-pool cap) | No change — all Pools P2 work is O(window) pure derivation per render; no new timers, no new poll legs (15M reuses the existing `nq15m` leg). |
| If 15M chart overlay doubles line count | Cap 15M lines with the same nearest-2-per-side + ghost split already shipped; no new ref machinery (fixed per-pair refs + unconditional-removal clearing scale by constant). |
| If firing-log replay grows (parity × N arms) | Keep replay builders shared (the `pools-parity` verbatim-builder precedent); add arms as fixture-toggle rows, not new harnesses — `parity.test.ts` stays the untouched anchor. |

### Scaling Priorities

1. **First bottleneck:** `selectTicket` re-derivation cost as buffer/TP2/15M derivations stack — mitigate by resolving nearest-ACTIVE **once** per `selectTicket` call and sharing the resolved extreme between buffer and TP2 (single helper, single pass).
2. **Second bottleneck:** Parity-harness runtime as arms multiply — mitigate with the skeleton single-bar arm for iteration + full 20-session table only at gate time (both shapes already exist in `pools-parity.test.ts`).

## Anti-Patterns

### Anti-Pattern 1: Pools voting

**What people do:** Pass pools into `evaluateTrigger`/`checkFatalFlaw`, or add a pool gate inside `computeTicket` that flips EXECUTE→STAND_ASIDE.
**Why it's wrong:** Breaks the parity proof (the one property Phase 21 locked: 84 bars exact match, `parity.test.ts` untouched anchor) and silently turns a pain-map projection into a trade veto.
**Do this instead:** Pool prices cross as price inputs to non-gate legs only (TP2 price, buffer insets); gate legs (TP1, R/R, flaw precedence) never read pools. Extend the parity harness per feature.

### Anti-Pattern 2: Age state in the store

**What people do:** Add `poolAge`/`decayFactor` fields to zustand state with timer-driven updates.
**Why it's wrong:** Duplicates the injected-`asOf` time truth (`sharedEpoch`), creates torn reads between age and pool geometry, and trips the `ict` purity guard the moment math reaches for it.
**Do this instead:** Age derives purely inside `evaluatePools`/`evaluateIntradayPools` from `(window, asOf)`; the store passes through what the pure function returns. No timers, no age slice.

### Anti-Pattern 3: Unifying D1 and intraday candle contracts

**What people do:** Change `detectPools`/`evaluatePools` to accept `Candle | IntradayCandle` or convert 15M rows to date strings for reuse.
**Why it's wrong:** Violates the D-10/D-16 contract split (D1 = business-day strings, intraday = epoch seconds); date-string synthesis for 15M rows destroys session/killzone mapping and poisons the join diagnostics.
**Do this instead:** New `evaluateIntradayPools` entry point sharing only the swing predicates + constants; D1 signatures stay byte-identical.

### Anti-Pattern 4: Formatting numbers inside prose formatters

**What people do:** Compute a new score/ratio inside `describeProximity`/sentiment note (e.g. a "pool strength %" from weight × sentiment).
**Why it's wrong:** Fake precision + a shadow scorer that drifts from `scoreAndRank` without tests; violates the no-new-`ict`-math rule that keeps §1 honest.
**Do this instead:** Formatters print verbatim selector outputs (`weight.toFixed(2)`, ATR distance, `crowded` word) and the neutral-default multiplier value — derivation lives in the tested pure layer.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Yahoo proxy (`app/api/yahoo?symbol=&interval=`) | No change — 15M pools reuse the existing `nq15m` leg (`interval=15m` allowlisted) | No new fetch path, no new poll timer; `startDualPoll` grid unchanged |
| Sentiment fixtures (`fixtures/*.json`) | No change — multiplier reads `trueAvg` output, never the fixture rows directly | Guard (`fixture-guard`) + 60% `CROWDED_THRESHOLD` untouched |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `pools.ts` → `store.ts` (NEW helper) | `nearestActiveOnTradeSide(pools, direction, entry): number \| null` pure export; `selectTicket` is the sole caller; TP2 + buffer share one call | Price-only; ACTIVE-only; wrong-side → null → unbuffered/unresolved leg, never a throw |
| `pools.ts` lifecycle (MODIFY) | Age/decay/re-accumulation inside `applyLifecycle` + scorer; `LiquidityPool` gains optional `ageBars?: number` (additive, D-18 shape lock holds — `describePool` keeps compiling) | Weight invariant (D-04) preserved by putting decay in the scorer, not the lifecycle |
| `ticket.ts` (MODIFY) | `TicketInput` gains `poolTp2?: number \| null`; `resolveTP` TP2 leg prefers it when on the trade side of entry, else falls back to DOL price | TP1 gate, R/R, sizing, and all verbatim reasons unchanged; boundary asserts mirror `assertValidBuffer` |
| `store.ts` selectors (MODIFY + NEW) | `selectTicket` wires buffer + TP2 context; NEW `selectPools15M`; `selectPools` unchanged (D1 ranking stable first per milestone ordering) | One `sharedEpoch` call per selector preserved; NQ-D1 `selectPools` never reads `es.stale` (POOL-06 guard holds) |
| `report.ts` (MODIFY-additive) | NEW `describeProximity`, age copy, sentiment-multiplier note; `describePool` untouched | Copy-pinned tests (`toBe`) per the §1 precedent; throw-safe to empty string |
| `report.tsx` §§1/4/5 + `execution-protocol.tsx` + `ticket-panel.tsx` (MODIFY-prose) | Append read-only suffixes beside existing `data-slot` reason nodes; no derivation touched (D-17 holds) | New `data-slot`s only if UAT needs to pin the suffix (prefer one: `data-slot="proximity-tag"`) |
| `terminal-shell.tsx` → `nq-chart.tsx` (MODIFY-props) | NEW `pool15m*Pairs`/`pool15m*Ghosts` props fanned from `selectPools15M` with the same nearest-2-ACTIVE + ghost-outside-cap slicing; D1 fan-out untouched | Verdict gate (`shouldCreatePoolLines`) applies to both; thin/stale clearing via existing unconditional-removal paths |
| Parity harness (MODIFY-extend) | Each feature adds an arm asserting the vote triple unchanged (TP2/buffer arms assert placement deltas only where designed) | `parity.test.ts` never edited; `pools-parity.test.ts` is the extension point |

### Suggested Build Order (dependency-driven)

1. **POOL2-04 lifecycle (pure `pools.ts` only)** — no selector/store/render touch; lands the ACTIVE-set semantics every later feature reads. Gate: existing pool tests + new age/decay/re-accumulation rows keep `weight`/`status` literals pinned.
2. **Shared `nearestActiveOnTradeSide` helper + W12 live buffer wiring (`pools.ts` + `selectTicket`)** — one helper serves both buffer extreme and TP2; W12 proves it live with the harness arm before TP2 depends on it.
3. **POOL2-01 TP2 resolver (`ticket.ts` `resolveTP` + `selectTicket` + §5/chart prose)** — reads the now-stable ACTIVE set through the W12-proven helper; verdict-neutral by construction (TP2 is not a gate leg).
4. **POOL2-03 15M pools (`evaluateIntradayPools` + `selectPools15M` + chart props)** — parallelizable after (1); deliberately after D1 ranking stable per milestone constraint; reuses the k=2 contract without touching the D1 path.
5. **POOL2-02 sentiment multiplier + POOL2-05 proximity tag (display-only)** — either order, last; no `ict/` math, no selector-shape change, copy-pinned tests only. Proximity tag depends on nothing but shipped selectors, so it can slip earlier if prose needs it — but batching both display-only items in one review keeps the verdict-surface audit clean.

## Sources

- Code-read (primary): `src/lib/ict/pools.ts` (seed/lifecycle/merge/cap/rank pipeline, D-01–D-21 comments), `src/lib/ict/swings.ts` (k=2 single-owner), `src/lib/ticket.ts` (buffer context, TP ladder, R/R gate), `src/lib/store.ts` (`selectPools` POOL-06 guard, `selectTicket` single-snapshot chain, `sharedEpoch`, calibration preview discipline), `src/lib/report.ts` (`describePool` D-20 precedent), `src/lib/chart-mapper.ts` (pool/ticket line inputs, verdict gate), `src/lib/confluence.ts` + `src/lib/sentiment.ts` (selector-level scoring, True AVG), `components/dashboard/report.tsx` (§1 rank-1 block, §§4–6 math-free branches), `terminal-shell.tsx` (nearest-2-per-side + ghost fan-out), `nq-chart.tsx` (ref + unconditional-removal clearing), `src/lib/ict/pools-parity.test.ts` (triple-identity discipline, driver-only toggle).
- Milestone context: `.planning/PROJECT.md` (v3.2 Pools P2 targets POOL2-01–05 + W12; pools-never-vote; buffered-ticket WARNING).
- Browser verification (ego-browser TaskSpace, v2.1.0 guide): Zustand `useShallow` rerender-avoidance contract (computed selector + `Object.is`, shallow-equal guard) confirms the stable-selector-function + derive-during-render precedent used by all new selectors; lightweight-charts v5.2 `PriceLineOptions` (price/color/lineWidth/lineStyle/title/axisLabel fields) and `ISeriesMarkersPluginApi.setMarkers` confirm the existing `poolLineInputs`/`ticketLineInputs` pass-through + J-S-T marker + unconditional-removal clearing path needs no API change for 15M pool lines.

---
*Architecture research for: Pools P2 execution links (TP2 resolver, age/decay, 15M pools, sentiment multiplier, proximity tag, W12 live wiring)*
*Researched: 2026-10-26*
