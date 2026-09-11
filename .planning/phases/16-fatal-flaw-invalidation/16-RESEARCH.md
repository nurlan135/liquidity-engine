# Phase 16: Fatal-Flaw Invalidation - Research

**Researched:** 2026-09-11
**Domain:** Pure-function fatal-flaw invalidation over the WHY NOW trigger snapshot (HARD-kill vs SOFT-downgrade, falsifiable §6 sentence + challenge bank)
**Confidence:** HIGH

## Summary

Phase 16 adds one new pure module — `src/lib/ict/invalidation.ts` with `checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf })` — evaluated AFTER `evaluateTrigger` on the exact same snapshot and epoch, plus one derived Zustand selector (`selectFatalFlaw`) sharing the trigger's `asOf`. HARD flaws (rollover-week corruption, stale leg) kill from any state; SOFT flaws (SMT suppressed/decoupled, confirmed opposite-direction sweep) downgrade FIRING to ARMED only, each carrying a per-flaw re-arm condition. The phase also ships fixed verbatim Azerbaijani templates: a falsifiable sentence from a rule table keyed on trigger direction × sweep side, and a 3–5 question challenge bank with deterministic selection. No UI work (Phase 17), no population verification (Phase 18), no new dependencies.

Every input the flaw needs already exists as a typed, tested output: `TriggerOutput` (`src/lib/ict/trigger.ts`), `SmtOutput` with its `suppressed` union (`src/lib/ict/smt.ts`), `JudasOutput` with `confirmed`/`sweepSide` (`src/lib/ict/judas.ts`), `RolloverFlag` (`src/lib/ict/rollover.ts` + `types.ts`), per-leg `stale` booleans (`src/lib/store.ts`), and the `sharedEpoch`/`nyDateOf` time truth (`src/lib/store.ts`, `src/lib/ict/trigger.ts`). The trigger D-09 verbatim-prose precedent, the `CALIBRATION-PROVISIONAL` constant convention, the co-located vitest pattern, and the `purity.test.ts` grep guard all transfer verbatim.

**Primary recommendation:** Implement `checkFatalFlaw` as a first-match-wins disjunction (HARD rollover → HARD stale → SOFT SMT → SOFT opposite-sweep → clean) returning a serializable verdict with class, reason key, verbatim reason, unblock condition, sentence, challenge, and carried ARMED reason; apply supersession in `selectFatalFlaw` by function order on the trigger's own epoch — never a second clock read, never re-sliced candles.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** HARD flaws are rollover-week corruption + stale leg only — kill the setup outright from any state, non-negotiable, never trade. Reuses `detectRollover` output + per-leg stale envelopes. [VERIFIED: 16-CONTEXT.md:13]
- **D-02:** SOFT flaws are SMT conflict (suppressed / correlation-decoupled) + confirmed opposite-direction sweep — downgrade FIRING to ARMED, wait-not-abandon. No wider net (no AMD-phase contradiction, no displaced-beyond-X) to avoid permanent-QUIET drift. [VERIFIED: 16-CONTEXT.md:14]
- **D-03:** Closed-candle confirmation required before any flaw kills or downgrades — prevents intra-bar flicker per the hysteresis rule. No N-close depth; single closed candle suffices. [VERIFIED: 16-CONTEXT.md:15]
- **D-04:** Every flaw verdict prints its specific reason plus HARD/SOFT class and unblock condition. Generic "Invalidated" alone is banned. [VERIFIED: 16-CONTEXT.md:16]
- **D-05:** `checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf })` — consumes the exact `TriggerOutput` + detector envelopes the trigger used, on the same `asOf` instant. Never re-fetches or re-slices candles. [VERIFIED: 16-CONTEXT.md:20]
- **D-06:** Flaw evaluated AFTER trigger on the same snapshot; INVALIDATED supersedes FIRING deterministically by function order. No timestamp racing. [VERIFIED: 16-CONTEXT.md:21]
- **D-07:** Lives in `src/lib/ict/invalidation.ts` as a pure function — injected `asOf`, boundary throws, no clock/store. Same discipline as `trigger.ts`, covered by the purity guard. [VERIFIED: 16-CONTEXT.md:22]
- **D-08:** Falsifiable sentence from a rule table keyed on bias direction × nearest unswept pool (e.g. bullish bias whose BSL raid never happens while price holds premium = distribution misread). [VERIFIED: 16-CONTEXT.md:26]
- **D-09:** Challenge question from a small fixed bank (3–5) keyed on the dominant trap: premium-chase, pre-news engineering, SMT divergence ignored. Deterministic selection. [VERIFIED: 16-CONTEXT.md:27]
- **D-10:** Both ship as verbatim Azerbaijani templates drafted at plan time, test-pinned with `toBe`, following the trigger D-09 precedent. [VERIFIED: 16-CONTEXT.md:28]
- **D-11:** Delivery surface is live report §6 — this phase ships the pure strings; Phase 17 wires the §6 UI block. [VERIFIED: 16-CONTEXT.md:29]
- **D-12:** SOFT flaws downgrade FIRING to ARMED only — never touch QUIET/ARMED states, never kill. HARD flaws kill from any state. [VERIFIED: 16-CONTEXT.md:32]
- **D-13:** Each SOFT flaw states its per-flaw re-arm condition with the verdict (e.g. SMT suppressed CORR_DECOUPLED 0.62 — re-arm if correlation recovers above 0.70). [VERIFIED: 16-CONTEXT.md:33]
- **D-14:** INVALIDATED renders neutral/informative (methodology note, not alert); HARD vs SOFT visually distinct when Phase 17 styles them. No red-error styling. [VERIFIED: 16-CONTEXT.md:34]
- **D-15:** A SOFT downgrade carries the underlying ARMED reason (missing-gate key) forward alongside the flaw reason, so the Phase 17 ticket knows what would complete the setup. [VERIFIED: 16-CONTEXT.md:35]

### Agent's Discretion
None — user decided every area explicitly. [VERIFIED: 16-CONTEXT.md:36]

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. UI panels and ticket suppression belong to Phase 17, population verification to Phase 18. [VERIFIED: 16-CONTEXT.md:8,94]

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FLAW-01 | User sees an invalidated/not verdict from `checkFatalFlaw` evaluated on the same snapshot as the trigger — flaw deterministically supersedes fire, never flickers | Same-snapshot contract (§ Architecture Patterns, Pattern 1); function-order supersession in `selectFatalFlaw` on the shared epoch; determinism + race tests (§ Validation Architecture) |
| FLAW-02 | User sees HARD flaws (rollover/stale — kill the setup) distinguished from SOFT flaws (downgrade FIRING to ARMED with a stated unblock condition) | First-match-wins disjunction with `FlawClass` (§ Code Examples); per-flaw unblock strings; SOFT-gated-on-FIRING-only rule with HARD-kills-any-state |
| FLAW-03 | User reads a falsifiable fatal-flaw sentence plus a challenge question from a fixed bank in live report §6 | Direction × sweep-side rule table + 3-question deterministic bank (§ Architecture Patterns, Pattern 3); verbatim `toBe`-pinned templates; serializable output Phase 17 consumes |

## Project Constraints (from AGENTS.md)

The repo-root `AGENTS.md` contains only two blocks, neither of which constrains pure `ict/` math directly, but both bind the plan:
- **Next.js agent-rules block:** this is not stock Next.js — read `node_modules/next/dist/docs/` before writing framework code and heed deprecations. Impact on Phase 16: minimal (no framework code; pure lib + selector only), but any Phase 17-adjacent shape choices must not assume stock conventions. [VERIFIED: AGENTS.md:1-9]
- **Git worktree hygiene:** before `execute-phase` dispatch — `git fetch origin`, divergence check via `gsd-tools.cjs query worktree.base-check`, push or re-resolve on unexpected `shouldDegrade: true`. [VERIFIED: AGENTS.md:10-23]
- **Config warning hygiene:** keep overlapping keys (`resolve_model_ids`/`runtime`) in only one of global `defaults.json` vs project config; not a code constraint. [VERIFIED: AGENTS.md:25-31]

Project-level constraints from `.planning/PROJECT.md` that DO bind this phase: **Purity** (`src/lib/ict` pure, inject time), **Zero budget** (no new deps), **Zustand-only** state, **Rule-based** deterministic output (no LLM). [VERIFIED: PROJECT.md:80-86]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Flaw evaluation (`checkFatalFlaw`) | Pure lib (`src/lib/ict`) | — | Deterministic methodology math; must stay clock-free and store-free for testability and Phase 18 replay |
| Snapshot sharing + supersession (`selectFatalFlaw`) | Client store (Zustand selector) | — | Derivation during render from detector slices + shared epoch; never stored state, so flaw can never desync from trigger |
| Falsifiable sentence + challenge strings | Pure lib (string tables in `invalidation.ts`) | — | Rule-based verbatim output pinned by `toBe`; Phase 17 renders them verbatim into §6 |
| §6 live block + INVALIDATED styling + ticket suppression | — (Phase 17) | — | Explicitly out of scope; this phase only guarantees a serializable output shape Phase 17 can consume |

## Standard Stack

### Core (all existing — zero new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `src/lib/ict/trigger.ts` (`TriggerOutput`, `evaluateTrigger`) | in-repo (Phase 15) | Flaw consumes the exact trigger verdict + gates + direction | D-05/D-06 mandate the real trigger snapshot, not a re-derivation [VERIFIED: src/lib/ict/trigger.ts:59-69] |
| `src/lib/ict/smt.ts` (`SmtOutput`, `CORR_MIN`) | in-repo | SOFT-flaw source: `suppressed` flag + `CORR_DECOUPLED` + `corr` value for the unblock sentence | Suppression union already typed; `CORR_MIN = 0.7` is the re-arm reference [VERIFIED: src/lib/ict/smt.ts:11-12,39-45] |
| `src/lib/ict/judas.ts` (`JudasOutput`) | in-repo | SOFT-flaw source: `confirmed` + `sweepSide` for opposite-direction sweep | Close-confirmed by construction; first-sweep-wins deterministic [VERIFIED: src/lib/ict/judas.ts:29-36] |
| `src/lib/ict/rollover.ts` (`detectRollover`, `RolloverFlag`) | in-repo | HARD-flaw source: `rolloverSuspect` + `contractHint` + `proximityWarning` | v2.0-P7 joint-suppression precedent; `ROLLOVER_ATR_MULT = 3` [VERIFIED: src/lib/ict/rollover.ts:4,33-55; src/lib/ict/types.ts:41-45] |
| `src/lib/store.ts` per-leg `stale` + `sharedEpoch` | in-repo (Phase 15) | HARD-flaw source (stale envelopes) + single time truth for `selectFatalFlaw` | `selectTrigger` already refuse-nulls on `nq1h.stale \|\| nq15m.stale` and derives one epoch both selectors share [VERIFIED: src/lib/store.ts:92-129,434-438,836-869] |
| vitest (co-located `<module>.test.ts`) | `^5.0.0` [VERIFIED: package.json via `node -e`] | Boundary pins, gate table, verbatim `toBe` prose pins, determinism tests | 300/300 green convention after Phase 14; `invalidation.test.ts` follows suit |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/ict/aggregate.ts` (`NY_TZ`) | in-repo | Wall-clock discipline if any date rendering is needed | Only if the flaw module formats dates; prefer carrying epoch through and formatting at the selector boundary (trigger `nyMinutesOf`/`nyDateOf` precedent) [VERIFIED: src/lib/ict/aggregate.ts:12; src/lib/ict/trigger.ts:116-126] |
| `src/lib/ict/asia.ts` (`AsiaRange`) | in-repo | Unswept-pool reference for the D-08 sentence table | Read via `trigger.inputs` / `amd.inputs` envelopes — never re-slice rows [VERIFIED: src/lib/ict/asia.ts:18-23] |
| `src/lib/ict/fvg.ts` (`FvgGap`) | in-repo | Entry-FVG handle carried through the flaw decision into Phase 17 | Already on `TriggerOutput.entryFvg`; flaw passes it through untouched [VERIFIED: src/lib/ict/trigger.ts:66-67] |
| `src/lib/report.ts` (`REPORT_SECTIONS`) | in-repo | §6 contract: `'6. FATAL FLAW CHECK & CHALLENGE QUESTION'` currently `'unavailable'` | Read-only reference this phase; Phase 17 flips it live [VERIFIED: src/lib/report.ts:17-24] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| First-match-wins disjunction inside `checkFatalFlaw` | Separate `evaluateSetup()` fusion module (PITFALLS.md P3 sketch) | Rejected per D-07: flaw lives in `invalidation.ts` and runs AFTER trigger by call order; a second fusion module would re-introduce the parallel-divergence risk the phase exists to kill [ASSUMED — structural recommendation honoring D-06/D-07] |
| Sentence keyed on direction × sweepSide from D-05 inputs | Threading live `bias` + `asia` pools as extra flaw inputs | Rejected: D-05 fixes the input shape; direction is the bias proxy and `trigger.inputs.judas.sweepSide` plus `amd.inputs.asia` name the pools without widening the boundary [ASSUMED — boundary-minimal reading of D-05/D-08] |
| Re-arm thresholds as new `FLAW_*` constants | Reusing `CORR_MIN` as the SMT re-arm reference | Prefer reuse: the D-13 example ("re-arm if correlation recovers above 0.70") IS `CORR_MIN` [VERIFIED: src/lib/ict/smt.ts:12]; only genuinely new thresholds (if any) get `FLAW_*` + `CALIBRATION-PROVISIONAL` treatment |

**Installation:** None. Zero-budget constraint holds — no external packages.

**Version verification:** N/A (no registry packages). Toolchain verified present: Node `v24.11.1`, npm `11.6.2`, vitest `^5.0.0` [VERIFIED: `node --version && npm --version` + package.json read, 2026-09-11].

## Package Legitimacy Audit

Not applicable — this phase installs zero external packages. All flaw inputs are in-repo modules; the only test dependency (vitest) is already installed and pinned. No `package-legitimacy` gate to run, no `postinstall` surface, no cross-ecosystem confusion vector. [VERIFIED: no new imports beyond `src/lib/ict/*` + `date-fns-tz` (already a dependency per trigger.ts/judas.ts/asia.ts/amd.ts usage)]

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious (SUS):** none.

## Architecture Patterns

### System Architecture Diagram

```
60s staggered poll (unchanged: :00 NQ / :15 nq1h / :30 ES / :45 nq15m)
    ↓ per-leg envelopes (stale isolated per leg, never merged)
Derived selectors (all during render):
  selectJudas / selectSMT / selectAMD (existing)
    → selectTrigger (Phase 15: sharedEpoch, refuse-null on nq1h/nq15m stale)
        → checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf })  [NEW, pure]
            ├── HARD rollover (detectRollover output)  → INVALIDATED from ANY state
            ├── HARD stale (per-leg envelopes)         → INVALIDATED from ANY state
            ├── SOFT SMT suppressed/decoupled          → FIRING→ARMED + unblock
            ├── SOFT confirmed opposite sweep         → FIRING→ARMED + unblock
            └── clean                                 → trigger verdict stands
        → selectFatalFlaw (NEW: same epoch, try/catch-never-throw,
                           serializable output for Phase 17 §6 + ticket gate)
Phase 17 consumes: { verdict, flawClass, reasonKey, reason, unblock,
                     sentence, challenge, carriedArmedReason, entryFvg, asOf }
Phase 18 replays: flaw entries carry asOf + reasonKey + inputs-refs for verdict reconstruction
```

File-to-implementation mapping: `src/lib/ict/invalidation.ts` (pure flaw + string tables), `src/lib/ict/invalidation.test.ts` (co-located tests), `src/lib/store.ts` (one selector + optional rollover derivation at the boundary).

### Recommended Project Structure

```
src/
├── lib/ict/
│   ├── invalidation.ts      # NEW — checkFatalFlaw + FLAW_* (if any) + sentence/challenge tables
│   ├── invalidation.test.ts # NEW — disjunction table, class pins, toBe prose pins, determinism
│   ├── trigger.ts           # UNCHANGED (flaw reads TriggerOutput, never edits it)
│   ├── smt.ts               # UNCHANGED
│   ├── judas.ts             # UNCHANGED
│   ├── rollover.ts          # UNCHANGED
│   └── purity.test.ts       # UNCHANGED (auto-covers invalidation.ts via glob)
└── lib/
    └── store.ts             # MODIFIED — selectFatalFlaw only (+ boundary rollover derivation)
```

### Pattern 1: Same-Snapshot Flaw-After-Trigger (P3 mitigation, D-05/D-06)

**What:** The selector derives the trigger first on `sharedEpoch(get)`, then passes the trigger's own output object plus the identical detector envelopes into `checkFatalFlaw` with the same epoch. INVALIDATED wins by function order — no timestamps, no second poll, no re-sliced candles.
**When to use:** Mandatory for FLAW-01 — this is the entire flicker fix.
**Example:**
```typescript
// Source: selectTrigger precedent, src/lib/store.ts:836-869 (verified shape)
// selectFatalFlaw follows the same envelope discipline:
selectFatalFlaw: () => {
  try {
    const epoch = sharedEpoch(get);          // ONE epoch — the trigger's own truth
    const trigger = get().selectTrigger();   // real snapshot, never re-derived
    if (trigger === null) return null;       // throw-path or stale legs: honest null
    const smt = get().selectSMT();           // identical envelopes the trigger saw
    const judas = get().selectJudas();
    const rollover = /* boundary derivation, fvg.ts precedent */;
    const stale = { nq: get().nq.stale, es: get().es.stale,
                    nq1h: get().nq1h.stale, nq15m: get().nq15m.stale };
    return checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf: epoch });
  } catch { return null; }
},
```
[ASSUMED — recommended selector shape modeled on the verified `selectTrigger` precedent; planner confirms exact rollover-derivation call]

**Supersession rule (D-06/D-12, planner must pin):** HARD flaw → `INVALIDATED` from any trigger verdict including ARMED/WAIT; SOFT flaw + trigger FIRING → `ARMED` (downgrade, carry `trigger.reasonKey`); SOFT flaw + non-FIRING trigger → trigger verdict stands (SOFT never touches QUIET/ARMED). Whether the downgrade application lives inside `checkFatalFlaw` or in the selector is planner's call — recommendation is inside `checkFatalFlaw` so Phase 18 replay needs only one function [ASSUMED].

### Pattern 2: First-Match-Wins Disjunction with Class (P7 mitigation, D-01/D-02)

**What:** Ordered predicate chain — HARD rollover, HARD stale, SOFT SMT, SOFT opposite-sweep, clean. First hit returns; evaluation order IS the precedence (HARD always beats SOFT, deterministic on identical inputs). No wider net: exactly the four locked predicates, no AMD-phase or displacement-magnitude clauses.
**When to use:** The body of `checkFatalFlaw`.
**Why this shape:** It makes the HARD/SOFT taxonomy (FLAW-02) a code-ordering fact rather than a comment, and it bounds the kill rate structurally — the P7 permanent-QUIET failure mode cannot creep in via a fifth predicate without a visible diff.

### Pattern 3: Direction × Sweep-Side Sentence Table + Fixed Challenge Bank (D-08/D-09)

**What:** The falsifiable sentence is a 4-cell lookup on `(trigger.direction, judas.sweepSide)` — LONG/LOW-sweep, SHORT/HIGH-sweep are the two live cells (direction is a total function of sweepSide per `directionOf`, [VERIFIED: src/lib/ict/trigger.ts:223-227]); the off-diagonal cells and null-side rows resolve to a neutral fallback naming the missing confirmation. The challenge bank has exactly the three locked keys — `premium-chase`, `pre-news-engineering`, `smt-divergence-ignored` — selected deterministically by dominant trap: SMT SOFT flaw → `smt-divergence-ignored`; opposite-sweep SOFT flaw → `premium-chase`; HARD flaw or clean-with-context → `pre-news-engineering` as the standing caution. [ASSUMED — recommended table geometry; prose itself drafted at plan time per D-10]
**When to use:** String construction inside `checkFatalFlaw`; both strings ride the serializable output into Phase 17 §6.
**Constraints inherited from the trigger D-09 precedent:** one base sentence per key, no number/price interpolation, fixed suffixes only, `toBe`-pinned verbatim Azerbaijani [VERIFIED: src/lib/ict/trigger.ts:82-111].

### Anti-Patterns to Avoid
- **Flaw re-slicing candles or importing raw legs:** `checkFatalFlaw` accepts ONLY the six D-05 inputs. Any `candles` parameter is a P6 logic fork and fails review — same gate as the trigger signature review. [VERIFIED P6: .planning/research/PITFALLS.md:125-145]
- **Second clock read for the flaw:** no `sharedEpoch` re-derivation, no `Date.now()` fallback inside `ict/` — the epoch arrives as `asOf`. The purity guard auto-covers the new file via its `./*.ts` glob [VERIFIED: src/lib/ict/purity.test.ts:14-16,31-44].
- **SOFT acting on non-FIRING states:** the single most likely D-12 violation. Pin with a test: ARMED + SMT-suppressed → ARMED with the trigger's reason, flaw noted but not applied.
- **Generic "Invalidated" string:** banned by D-04; every verdict carries reason + class + unblock. Enforce with a test asserting `reason !== 'Invalidated'` shape (specific reasonKey + non-empty unblock on every non-clean verdict) [ASSUMED — recommended test].
- **Red-error styling or ticket gating in this phase:** D-14 styling and all suppression UI belong to Phase 17. This phase guarantees only that `flawClass` is on the output so Phase 17 can style HARD vs SOFT distinctly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sweep detection for the opposite-sweep SOFT flaw | Fresh wick/sweep loop over 15M rows | `judas.confirmed === true` + `sweepSide` vs `trigger.direction` | Close-confirmed, first-sweep-wins, DST-safe killzone edges — a copy re-introduces the P6 fork and §3-vs-flaw disagreement [VERIFIED: src/lib/ict/judas.ts:191-216] |
| Correlation health for the SMT SOFT flaw | Inline Pearson re-computation | `smt.suppressed` + `reason` (`'CORR_DECOUPLED' \| 'rollover-week'`) + `corr` | Windowed, NaN-safe, rollover-aware; the `corr` value feeds the D-13 unblock sentence verbatim [VERIFIED: src/lib/ict/smt.ts:200-243] |
| Rollover corruption for the HARD flaw | Date-proximity arithmetic in the flaw module | `detectRollover(closed, atr, asOfDate, hint)` output at the selector boundary | Tripwire (`ROLLOVER_ATR_MULT = 3`) + quarterly-Friday proximity already tested; duplicating either half silently halves the check [VERIFIED: src/lib/ict/rollover.ts:4,33-55] |
| Staleness detection | Timestamp-age math inside `ict/` | Per-leg `stale` booleans threaded as the `stale` input | Freshness is an envelope concern owned by the poll layer; age math in pure code is a purity breach and a clock read [VERIFIED: src/lib/store.ts:92-129] |
| Time handling | New `nyMinutesOf`/`asOf` helpers | `sharedEpoch(get)` + trigger's `nyDateOf` | Single time truth; a second derivation is the P3 torn-read by another name [VERIFIED: src/lib/store.ts:434-438; src/lib/ict/trigger.ts:124-126] |
| Azerbaijani prose convention | New prose architecture | Trigger D-09: base sentence per key + at most one fixed suffix, `toBe`-pinned | Determinism is a core principle; interpolated numbers/prices break replay equality [VERIFIED: src/lib/ict/trigger.ts:82-111] |

**Key insight:** Phase 16 is a fusion-and-strings phase, not a detection phase. Every phenomenon it names is already detected, typed, and tested elsewhere — the flaw module's only novel content is the precedence order, the class taxonomy, and the sentence/challenge tables. Any new detection loop in the diff is by definition a bug.

## Common Pitfalls

### Pitfall 1: Invalidation racing the signal — flickering LONG/INVALIDATED/LONG (P3)
**What goes wrong:** Flaw and trigger evaluate on different instants or candle slices; the terminal argues with itself across polls with no new market information.
**Why it happens:** Two `asOf` derivations, flaw re-slicing rows, or UI polling flaw on a different interval.
**How to avoid:** D-05/D-06 as coded contract — one epoch, flaw-after-trigger, supersession by function order; closed-candle confirmation inherited (all consumed outputs are closed-only by construction: `closedOnly`/`closedOnlyIntraday` at every detector boundary [VERIFIED: src/lib/ict/types.ts:47-49,64-66], close-based judas confirmation [VERIFIED: src/lib/ict/judas.ts:191-206]). Bar-by-bar replay test asserts monotonic transitions (ARMED → FIRING → INVALIDATED terminal; no resurrection without a new setup).
**Warning signs:** Any `Date`/`Date.now` in the flaw path; a `candles` parameter on `checkFatalFlaw`; flaw importing `asia`/`judas` row functions instead of output types.

### Pitfall 2: Permanent-QUIET via flaw creep (P7)
**What goes wrong:** HARD/SOFT plus "just one more prudent check" kills nearly every setup; the terminal's headline state is eternal INVALIDATED with plausible-sounding reasons.
**Why it happens:** Asymmetric caution with no kill-rate counter-pressure; flaw-by-flaw tests all green while the population is dead.
**How to avoid:** Exactly four predicates (D-01/D-02 locked set); SOFT downgrades instead of killing; kill-rate budget enforced in Phase 18's population test (≥1 FIRING + ≥1 INVALIDATED per 20 sessions — CONTEXT notes no rate budget is enforced HERE [VERIFIED: 16-CONTEXT.md:82], so this phase must keep both paths reachable, not measure them).
**Warning signs:** Flaw list growing past four; all flaws terminal (no ARMED-downgrade path); demo never shows FIRING.

### Pitfall 3: SOFT flaw applied to QUIET/ARMED (D-12 violation)
**What goes wrong:** A suppressed-SMT afternoon downgrades an already-WAIT morning into something stranger, or an ARMED setup loses its missing-gate reason to a flaw note.
**Why it happens:** The disjunction returns SOFT without consulting `trigger.verdict`.
**How to avoid:** Gate every SOFT branch on `trigger.verdict === 'FIRE_LONG' || trigger.verdict === 'FIRE_SHORT'`; carry `trigger.reasonKey` forward as `carriedArmedReason` (D-15) so Phase 17 knows what would complete the setup.
**Warning signs:** Tests only cover FIRING + flaw; no ARMED/WAIT + flaw fixture.

### Pitfall 4: Purity breach — clock or store in `invalidation.ts` (P5)
**What goes wrong:** `asOf` made optional with `?? Date.now()`, or a store import "just for the stale flags."
**Why it happens:** "WHY NOW" time-flavor and freshness-flag convenience.
**How to avoid:** `asOf` required finite-positive epoch with boundary throw (trigger `eMF` precedent [VERIFIED: src/lib/ict/trigger.ts:271-273]); stale arrives as plain booleans; `purity.test.ts` glob auto-covers the new file [VERIFIED: src/lib/ict/purity.test.ts:14-16].
**Warning signs:** Fake timers in flaw tests (injected instants need none); `asOf` optional in the signature.

### Pitfall 5: Prose interpolation breaking determinism + replay
**What goes wrong:** Sentence templates interpolating live prices or correlation decimals; Phase 18 replay on identical inputs yields different strings.
**Why it happens:** The D-13 example shows "0.62" and "0.70" — tempting to interpolate the live `corr`.
**How to avoid:** Fixed templates only (trigger D-09 precedent: no number or price interpolation [VERIFIED: src/lib/ict/trigger.ts:82-84]); the unblock sentence names the threshold (`CORR_MIN`-derived "0.70") as a fixed string, never the live reading. Same-inputs → byte-identical output test (100-run determinism per P5).
**Warning signs:** Template literals with `${}` in the sentence table; `toBe` pins failing across fixtures with identical keys.

### Pitfall 6: Research-vs-CONTEXT tension — ARCHITECTURE.md says flaw "runs even when trigger null"
**What goes wrong:** Planner follows the v3.0 research note ("`selectFatalFlaw` … runs even when trigger null — invalidation must be able to cancel a forming setup" [VERIFIED: .planning/research/ARCHITECTURE.md:153-154]) and evaluates SOFT downgrades with no trigger.
**Why it happens:** Stale guidance predating the locked D-12.
**How to avoid:** CONTEXT wins — SOFT never touches non-FIRING states, and with trigger null there is no FIRING to downgrade. HARD-on-null is the only open sub-case (stale legs force trigger null via refuse-null AND signal HARD stale): recommend the selector return the HARD verdict when determinable from `stale`/`rollover` alone even with trigger null, else null. Planner confirms this reading [ASSUMED — reconciliation recommendation].
**Warning signs:** `selectFatalFlaw` returning SOFT downgrades while `selectTrigger` returns null.

## Code Examples

### Flaw input/output shape (recommended — planner locks)
```typescript
// Source shapes verified: TriggerOutput src/lib/ict/trigger.ts:59-69;
// SmtOutput src/lib/ict/smt.ts:30-45; JudasOutput src/lib/ict/judas.ts:29-36;
// RolloverFlag src/lib/ict/types.ts:41-45.
import type { TriggerOutput, TriggerReasonKey } from '@/src/lib/ict/trigger';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { RolloverFlag } from '@/src/lib/ict/types';

export type FlawClass = 'HARD' | 'SOFT';
export type FlawReasonKey =
  | 'ROLLOVER_WEEK'      // HARD — detectRollover.rolloverSuspect
  | 'STALE_LEG'          // HARD — any per-leg stale envelope
  | 'SMT_SUPPRESSED'     // SOFT — smt.suppressed (either reason)
  | 'OPPOSITE_SWEEP'     // SOFT — confirmed judas against trigger direction
  | 'NONE';              // clean — trigger verdict stands

export interface FatalFlawInput {
  trigger: TriggerOutput;                       // the exact snapshot object
  smt: SmtOutput | null;
  judas: JudasOutput | null;
  rollover: RolloverFlag | null;
  stale: { nq: boolean; es: boolean; nq1h: boolean; nq15m: boolean };
  asOf: number;                                 // injected epoch, never a clock read
}

export interface FatalFlawOutput {
  invalidated: boolean;          // HARD kill
  downgraded: boolean;           // SOFT FIRING→ARMED (mutually exclusive with invalidated)
  flawClass: FlawClass | null;   // null when clean
  reasonKey: FlawReasonKey;
  reason: string;                // verbatim Azerbaijani, toBe-pinned
  unblock: string;               // per-flaw re-arm condition (D-13); fixed template
  sentence: string;              // falsifiable §6 sentence (D-08)
  challenge: string;             // §6 challenge question (D-09)
  carriedArmedReason: TriggerReasonKey | null;  // D-15 — the ARMED key Phase 17 resumes from
  asOf: number;                  // carried for Phase 18 replay reconstruction
}
```
[ASSUMED — recommended shape; every referenced input type is VERIFIED above, field semantics follow D-01..D-15]

### Opposite-sweep SOFT predicate (direction discipline)
```typescript
// directionOf precedent: HIGH→SHORT, LOW→LONG, null→null
// [VERIFIED: src/lib/ict/trigger.ts:223-227].
// Opposite sweep = confirmed judas whose side implies the counter-direction:
// trigger LONG (swept LOW) killed only by a confirmed HIGH sweep, and mirror.
// In practice the trigger's own judas envelope is the sweep source, so this
// fires when trigger.direction disagrees with judas.sweepSide's implication —
// i.e. a newly confirmed counter-sweep arrived on the same snapshot.
function isOppositeSweep(trigger: TriggerOutput, judas: JudasOutput | null): boolean {
  if (judas === null || judas.confirmed !== true) return false;  // D-03: confirmed only
  if (judas.sweepSide === null) return false;
  const implied = judas.sweepSide === 'HIGH' ? 'SHORT' : 'LONG';
  return trigger.direction !== null && trigger.direction !== implied;
}
```
[ASSUMED — recommended predicate; closed-candle confirmation inherited from `confirmed`]

### Verbatim prose pin test (trigger D-09 precedent)
```typescript
// Precedent: REASON_BY_KEY record + toBe pins, one base sentence per key plus
// at most one fixed suffix [VERIFIED: src/lib/ict/trigger.ts:85-111].
// Every FLAW reasonKey/sentence/challenge gets the same treatment:
expect(out.reason).toBe('…verbatim Azerbaijani drafted at plan time…');
expect(out.sentence).toBe('…falsifiable sentence…');
expect(out.challenge).toBe('…challenge-bank entry…');
```

### Boundary-throw discipline (trigger precedent)
```typescript
// Precedent: finite-positive asOf + got-string errors, null degrades downstream
// [VERIFIED: src/lib/ict/trigger.ts:162-190, 266-280].
// checkFatalFlaw mirrors it: malformed trigger/smt/judas envelopes throw with
// got-strings; null envelopes degrade to clean-or-specific-honest (never throw
// on null — null means "detector had nothing to say", not "input malformed").
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Research-phase `evaluateSetup()` single-fusion sketch (P3) | Flaw-after-trigger by call order in `selectFatalFlaw` (D-06) | 2026-09-11 discuss (16-CONTEXT D-06/D-07) | No second fusion module; ordering is a call sequence, not a merged object |
| Broad flaw-net thinking (AMD contradiction, displacement-beyond-X) | Locked 4-predicate set, HARD/SOFT split (D-01/D-02) | 2026-09-11 discuss | Permanent-QUIET risk bounded structurally; Phase 18 measures, this phase builds |
| §6 as decorative copy | Falsifiable sentence (bias × unswept pool) + fixed challenge bank (D-08/D-09) | v3.0 research FEATURES.md → locked 2026-09-11 | Every invalidation states what market event would prove the read wrong |
| Trigger carrying SMT as agree-tag only | SMT suppression promoted to SOFT flaw input | Phase 15 trigger (read-only tag [VERIFIED: src/lib/ict/trigger.ts:132-157]) → Phase 16 | Same envelope, opposite role: never blocks FIRE at trigger time, can downgrade after |

**Deprecated/outdated:**
- ARCHITECTURE.md "selectFatalFlaw runs even when trigger null … cancel a forming setup" — superseded by locked D-12 for SOFT flaws; HARD-on-null is the only surviving sub-case (see Pitfall 6).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `FatalFlawInput/Output` field shape as sketched | Code Examples | LOW — planner locks shape at plan time; all input types verified, only the wrapper is recommended |
| A2 | Sentence table keyed on `(trigger.direction × judas.sweepSide)` satisfies D-08's "bias × unswept pool" | Architecture Patterns P3 | MEDIUM — if plan-time prose needs live bias/asia rows, input shape widens beyond D-05; confirm during planning |
| A3 | Challenge selection priority (SMT→smt-ignored, sweep→premium-chase, else pre-news) satisfies "keyed on dominant trap" | Architecture Patterns P3 | LOW — deterministic either way; mapping confirmed at plan time with prose |
| A4 | Downgrade application inside `checkFatalFlaw` (not selector) | Architecture Patterns P1 | LOW — either location honors D-06/D-12; affects Phase 18 replay surface only |
| A5 | HARD verdict returnable with trigger null (stale/rollover determinable alone), else null | Pitfalls P6 | MEDIUM — touches FLAW-01 "invalidated/not" on degraded snapshots; planner must decide, Phase 17 renders it |
| A6 | No new `FLAW_*` constants needed (reuse `CORR_MIN` as re-arm reference) | Standard Stack | LOW — if plan-time unblocks need new thresholds, they get `CALIBRATION-PROVISIONAL` + boundary pins like any other |

**Handling:** A2 and A5 need planner/user confirmation before becoming locked; the rest are planner's discretion within locked D-01..D-15.

## Open Questions

1. **Rollover derivation at the `selectFatalFlaw` boundary**
   - What we know: `detectRollover(candles, atr, asOf, hint)` needs closed D1 candles + ATR + date string [VERIFIED: src/lib/ict/rollover.ts:33-43]; `selectTrigger` already derives FVG inline from `nq.candles` with try/catch [VERIFIED: src/lib/store.ts:846-853]; SMT internally runs its own joint rollover check [VERIFIED: src/lib/ict/smt.ts:245-259].
   - What's unclear: whether a `selectRollover`-style selector already exists for reuse, or the flaw selector derives NQ (+ES?) rollover inline.
   - Recommendation: grep for existing rollover selectors at plan time; else derive inline following the FVG precedent (NQ leg minimum; ES leg if cheap), try/catch → `rollover: null` degrades to "no HARD rollover signal" honestly.

2. **Exact HARD-stale leg set**
   - What we know: per-leg `stale` booleans exist for nq/es/nq1h/nq15m [VERIFIED: src/lib/store.ts:92-129]; trigger refuse-nulls only on nq1h/nq15m [VERIFIED: src/lib/store.ts:838].
   - What's unclear: whether ANY stale leg (including nq daily) is HARD, or only legs feeding the flaw predicates.
   - Recommendation: any-of-four HARD — simplest, matches "kill the setup outright, non-negotiable," and stale daily already degrades trigger displacement honestly so the two can never disagree into flicker.

3. **D-08 "nearest unswept pool" naming without live asia rows**
   - What we know: `amd.inputs.asia` and `trigger.inputs.judas` ride the envelopes [VERIFIED: src/lib/ict/trigger.ts:69; src/lib/ict/amd.ts:38-46].
   - What's unclear: whether the plan-time sentence templates need pool-side vocabulary (BSL/SSL) resolvable purely from sweepSide + asia extremes on the envelope.
   - Recommendation: resolve at plan time when drafting prose (D-10); if a template needs more than the envelopes carry, widen via `trigger.inputs.amd.inputs.asia` (already on the snapshot — not a new fetch), never via new row reads.

## Environment Availability

Phase 16 is pure code + co-located tests: no external services, no new CLIs, no new runtimes.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vitest + tsc | ✓ | v24.11.1 | — |
| npm | install/run scripts | ✓ | 11.6.2 | — |
| vitest | `invalidation.test.ts`, purity guard | ✓ | ^5.0.0 (devDep) | — |
| TypeScript (`tsc --noEmit`) | phase gate | ✓ (repo ships clean per PROJECT.md) | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^5.0.0 (co-located `src/lib/ict/*.test.ts`) |
| Config file | repo vitest config (existing; no new config) |
| Quick run command | `npx vitest run src/lib/ict/invalidation.test.ts` |
| Full suite command | `npx vitest run` (300/300 green baseline post-Phase 14) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLAW-01 | Same inputs + same asOf → byte-identical output (100-run determinism); race fixture (FIRE + flaw, same snapshot → INVALIDATED with both reasons); freshness-split → no FIRE, honest reason | unit | `npx vitest run src/lib/ict/invalidation.test.ts -t "determinism"` | ❌ Wave 0 |
| FLAW-02 | Disjunction table: rollover→HARD kill from ARMED/WAIT too; stale→HARD; SMT suppressed→SOFT downgrade FIRING→ARMED + unblock; opposite sweep→SOFT; SOFT on ARMED/WAIT→untouched + carried reason; generic-"Invalidated" ban | unit | `npx vitest run src/lib/ict/invalidation.test.ts -t "taxonomy"` | ❌ Wave 0 |
| FLAW-03 | Every reasonKey/sentence/challenge `toBe`-pinned verbatim; 4-cell sentence table incl. null-side fallback; bank size 3–5 with deterministic selection | unit | `npx vitest run src/lib/ict/invalidation.test.ts -t "prose"` | ❌ Wave 0 |
| (guard) | New file passes no-clock/no-store grep; every new constant (if any) carries `CALIBRATION-PROVISIONAL` source-text pin (trigger.test.ts precedent [VERIFIED: src/lib/ict/trigger.test.ts:102-120]) | unit | `npx vitest run src/lib/ict/purity.test.ts` | ✅ exists (auto-covers via glob) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/ict/invalidation.test.ts`
- **Per wave merge:** `npx vitest run src/lib/ict/`
- **Phase gate:** Full suite green (`npx vitest run`) + `tsc --noEmit` clean before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ict/invalidation.test.ts` — covers FLAW-01/02/03 (disjunction table, determinism, prose pins)
- [ ] `src/lib/ict/invalidation.ts` — the module under test (TDD: tests first per repo convention)
- [ ] Store selector coverage — extend `src/lib/store.test.ts` trigger-block idiom (`trigger-stale`, `trigger-coherence` [VERIFIED: src/lib/store.test.ts:1110-1173]) with flaw-stale / flaw-coherence cases

## Security Domain

Applicable: `security_enforcement: true`, ASVS L1 in `.planning/config.json` [VERIFIED: config.json:47-50]. No routes, no secrets, no broker surface in this phase.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface; pure math + derived selector |
| V3 Session Management | no | No sessions; per-poll derivation only |
| V4 Access Control | no | No roles; single-operator terminal |
| V5 Input Validation | yes | Boundary throws with got-string errors on malformed envelopes (trigger `assertValidJudas`/`assertValidFvg` precedent [VERIFIED: src/lib/ict/trigger.ts:162-218]); null degrades honestly, never throws |
| V6 Cryptography | no | No crypto; never hand-roll (no crypto need exists) |

### Known Threat Patterns for pure-`ict/` + Zustand selector

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale-data flaw verdict presented at full strength | Tampering (data integrity) | HARD-stale kill + selector refuse-null; Phase 17 renders class-distinct neutral copy (D-14), never crisp numbers on flagged inputs |
| Verdict-string confusion (INVALIDATED read as system error) | Information disclosure (misleading) | Neutral/informative copy with class + unblock always attached (D-04/D-14); no red-error styling |
| Future broker wiring mistaking flaw output for execution clearance | Elevation (liability) | Output carries no order-shaped fields; vocabulary quarantine stays in force (no `broker`/`placeOrder` identifiers — P4 rule [VERIFIED: PITFALLS.md:80-100]) |

## Sources

### Primary (HIGH confidence)
- `src/lib/ict/trigger.ts` (TriggerOutput, TRIGGER_* consts, D-09 prose, boundary discipline, nyMinutesOf/nyDateOf) — read this session
- `src/lib/ict/smt.ts` (SmtOutput union, CORR_MIN/CORR_WINDOW, suppression order) — read this session
- `src/lib/ict/judas.ts` (JudasOutput, confirmation window, first-sweep-wins) — read this session
- `src/lib/ict/rollover.ts` + `types.ts` (RolloverFlag, ROLLOVER_ATR_MULT, closedOnly contracts) — read this session
- `src/lib/ict/asia.ts`, `aggregate.ts` (NY_TZ), `fvg.ts` (FvgGap), `amd.ts` (AmDuOutput envelope, SMT tags) — read this session
- `src/lib/store.ts` (sharedEpoch, selectTrigger, stale leg interfaces) + `store.test.ts` (trigger-stale/coherence idioms) — read/grepped this session
- `src/lib/report.ts` (§6 contract), `src/lib/ict/purity.test.ts` (grep guard), `src/lib/ict/trigger.test.ts` (constant/prose pin idioms) — read this session
- `.planning/phases/16-fatal-flaw-invalidation/16-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/PROJECT.md`, `AGENTS.md`, `.planning/config.json` — read this session

### Secondary (MEDIUM confidence)
- `.planning/research/{SUMMARY,ARCHITECTURE,PITFALLS,FEATURES}.md` — v3.0 execution-layer decisions (flaw-wins ordering, HARD/SOFT split, sentence/challenge bank, P3/P5/P7 mitigations); one noted tension (ARCHITECTURE.md flaw-on-null) reconciled in Pitfall 6

### Tertiary (LOW confidence)
- None — no external sources consulted and none needed: zero new dependencies, all contracts in-repo. Every recommendation not directly verified is tagged [ASSUMED] and logged above.

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — every consumed module read this session, versions/values quoted verbatim, zero registry lookups needed
- Architecture: HIGH — selector precedent (`selectTrigger`) and time-truth helper read line-level; only the new disjunction order and output shape are recommendations
- Pitfalls: HIGH — P3/P5/P7 transfer directly from shipped-codebase research; D-12/D-04/D-14 ban-classes pinned by new tests

**Research date:** 2026-09-11
**Valid until:** 2026-10-11 (stable domain — in-repo contracts; re-verify only if Phase 15 trigger shape changes before planning)
