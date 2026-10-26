# Phase 22: Pool Lifecycle + Decay (POOL2-04) — Research

**Researched:** 2026-10-26 · **Valid until:** 2026-11-26 (stable domain, locked decisions)
**Confidence:** HIGH

## User Constraints

**Locked Decisions (verbatim from CONTEXT.md — planner MUST honor):**

- **D-01:** Age counted in D1 bars — `ageBars` = number of closed D1 candles between `originDate` and `asOf`. Weekends/holidays never age a pool; consistent with 60-bar trailing lookback and session-based replay.
- **D-02:** Half-life 10 bars (CALIBRATION-PROVISIONAL) — `decay = 1 / (1 + ageBars / 10)`. A 10-bar-old pool gets half score; ancient archaeology fades, fresh pain stays dominant. Calibrated against firing-log band review (1–4/week), NOT tuned in this phase.
- **D-03:** Score floor 0.25 — an ancient ACTIVE pool keeps a quarter of its score; never fully removed from rank while ACTIVE. No hard relevant-to-zero cliff between bars.
- **D-04:** Decay multiplier inline in `scoreAndRank` — one more factor beside the existing `weight × dolBoost × behindPenalty / (1 + distAtr)` formula. Smallest diff, single readable formula.
- **D-05:** Fresh pool always independent — new swings outside old CONSUMED/SWEPT zones seed a fully independent ACTIVE pool (own `originDate`, own `touches`). No lineage tracking; falls out of `detectPools` naturally.
- **D-06:** Overlap → fresh seed wins — a new cluster touching an existing SWEPT zone seeds its own ACTIVE pool (non-overlap dedupe decides). SWEPT stays as a faded ghost memory; fresh pain ranks on its own merit. D-04 stored-weight immutability unbroken.
- **D-07:** CONSUMED zones never return — consumed history ignored in re-accumulation checks; a fresh pool near a consumed price is just a new pool, no extra flag.
- **D-08:** §1 prose silent — no prose change for re-accumulation; a newly winning pool appears as rank-1 in Phase 20 format.
- **D-09:** Same originDate + trailing-20 discipline — no separate expiry for ghosts; they leave only when the map cap squeezes. Phase 20 behavior unchanged.
- **D-10:** Ghosts stay originDate-ordered — decay never touches ghost order; only ACTIVE rank moves. OriginDate ordering of ranked ACTIVEs followed by ghosts stays (current behavior).
- **D-11:** No separate ghost cap — ghosts roam outside the ACTIVE 20 (as now); map cap + nearest-2-per-side ACTIVE canvas cap already binds the canvas.
- **D-12:** Ghosts stay scoreless — `scores` carry ACTIVE entries only (current behavior); decay is an ACTIVE-rank matter, ghost dimming unchanged.
- **D-13:** §1 silently names the new rank-1 — when decay flips rank, prose writes the new rank-1 in Phase 20 format, no aging note; verbatim `reason` untouched.
- **D-14:** No decay trace on chart — aged ACTIVE pools not visually differentiated; Phase 20 line + 0.5 dimming discipline unchanged.
- **D-15:** Parity triple stays exact — pools-on vs pools-off `trigger/flaw/ticket` must match exactly (Phase 21 harness idiom). Lifecycle is projection context, never a vote.
- **D-16:** Decay constants join the calibration sandbox as sliders — half-life + floor ride the Phase 21 pool-tolerance sliders (what-if preview, explicit Apply, pinned constants read). No new UI primitive.
- **D-17:** Pools never vote — no trigger-gate, flaw-key, or ticket-derivation change (roadmap lock from Phase 19 D-17, carried through Phases 20–21).
- **D-18:** Pool shape `{ side, top, bottom, touches, weight, originDate, status }`; rank-1 = nearest ACTIVE on DOL side; all constants CALIBRATION-PROVISIONAL (Phase 19 D-06–D-09, D-19–D-22).
- **D-19:** Lifecycle nucleus exists — wick-pierce → SWEPT, close-through → CONSUMED, first-sweep-wins, stored weight/touches immutable (`src/lib/ict/pools.ts` D-04, D-18).
- **D-20:** Purity discipline — injected `asOf`, no `Date.now()`, no store timer; `scoreAndRank` idiom `weight × dolBoost × behindPenalty / (1 + distAtr)` — decay joins the same line as one multiplier.
- **D-21:** Stale/thin matrix roadmap-locked — NQ-stale → null, ES-stale → ticket-degraded, rankSkipped → unbuffered.
- **D-22:** Scorer-plane principle (PITFALLS Pitfall 6): decay never mutates stored inventory, SWEPT never re-enters rank; `originDate` stays the earliest seed date.

**Claude's Discretion:** None — user discussed all presented areas.

**Deferred Ideas (OUT OF SCOPE):** None in phase (P2 queue POOL2-01/02/03/05 + W12 deferred at milestone level; pool-gated FIRE stays rejected per REQUIREMENTS.md Out of Scope).

## Key Findings

1. **Zero new dependencies; single-file math change.** All decay work lands in `src/lib/ict/pools.ts` (new exported `DECAY_HALF_LIFE_BARS = 10` + `DECAY_SCORE_FLOOR = 0.25` constants, a pure `poolDecay(originDate, asOf)` helper, one extra multiplier + one `PoolScore.decayFactor` ledger field in `scoreAndRank`). Verified against `src/lib/ict/pools.ts:319-397` [VERIFIED: src/lib/ict/pools.ts:319-397].
2. **Age must be counted in D1 bars via string comparison, never date arithmetic.** The codebase's canonical idiom is `originIndexOrNeg1` + `c.date > asOf` string compare (`pools.ts:84-86`, `210-244`) — no weekend/holiday problem because only closed D1 candles exist in the window [VERIFIED: src/lib/ict/pools.ts:84-86]. `weekday`/`parseISO` arithmetic is the trap: Yahoo D1 `date` is a `YYYY-MM-DD` string (`types.ts:1`), and calendar-day subtraction would age pools over weekends [VERIFIED: src/lib/ict/types.ts:1].
3. **Locked formula `decay = 1/(1+ageBars/10)`, floor 0.25, multiplier in scorer.** Monotone decreasing in age, `decay(0)=1`, `decay(10)=0.5`, asymptote 0; effective multiplier `max(decay, 0.25)` keeps ancient ACTIVE pools at quarter strength per D-03. Extends the exact Phase 19 formula line `score = weight*dolBoost*behindPenalty/(1+distAtr)` [VERIFIED: src/lib/ict/pools.ts:374] — no trigger/flaw/ticket/selector signature changes, so parity holds by construction.
4. **SWEPT ghosts ride along unscored; CONSUMED leave the map; stored weight/touches immutable.** `scoreAndRank` already filters `status === 'ACTIVE'` for scoring and appends non-ACTIVE pools unscored in originDate order [VERIFIED: src/lib/ict/pools.ts:346,359-391]. `applyLifecycle` already implements wick-pierce → SWEPT / close-through → CONSUMED with strict inequality (`==` is not a sweep) and first-sweep-wins [VERIFIED: src/lib/ict/pools.ts:210-245]. Decay reads these structures read-only — no lifecycle edits needed for D-05..D-12 (re-accumulation falls out of `detectPools` natural seeding; D-07 CONSUMED-ignore needs no code since CONSUMED rows are dropped, not flagged).
5. **Stale/thin matrix is already pinned in `selectPools`; Phase 22 adds zero selector logic.** NQ-stale → null, empty → null, finite-geometry probe, thin → `degraded {thin:true}` wrap, one `sharedEpoch`, try/catch → null [VERIFIED: src/lib/store.ts:953-973]. Decay needs no `es.stale` read and no `rankSkipped` handling change in the selector — `scoreAndRank`'s refuse-to-rank path (zero/empty ATR, non-finite ATR/lastClose, empty input) already returns zero-scores + `rankSkipped:true` [VERIFIED: src/lib/ict/pools.ts:332-361], and the decay helper must return 1.0-neutral on that path so the ledger stays finite.
6. **Calibration sandbox sliders for half-life/floor follow the preview-vs-applied idiom, not live knobs.** `calibration-sandbox.tsx` renders KnobRows from `preview` session state, compares `pristine` against imported pinned constants, Apply re-seeds from pinned constants (never rewrites them) [VERIFIED: components/dashboard/calibration-sandbox.tsx:129-136; src/lib/store.ts:1235-1251]. Decay sliders (D-16) add two preview fields + setters + pristine comparisons + knob bounds; no derivation reads preview state.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POOL2-04 | Pool age/decay + re-accumulation — ACTIVE-only eligibility + transition table; scorer-plane decay multiplier (provisional half-life, immutable weight/touches, SWEPT never re-ranks); fresh-seed re-accumulation; injected `asOf`, no store timer; stale/thin matrix pinned | Eligibility predicate + transition table already implemented in `pools.ts` (verified); decay = one multiplier + ledger field + 2 constants + pure age helper; no selector/prose/chart/trigger changes; parity harness re-run green is the exit gate |

## Standard Stack

No new packages. Installed stack verified [VERIFIED: node_modules/package.json reads]: Next.js 16.3.4, React 19.2.8, Zustand 5.0.15, lightweight-charts 5.2.1, date-fns-tz 3.2.0, vitest 5.0.0, Node v24.11.1. Pure-function + Zustand-selector work only. Package Legitimacy Audit: **not applicable — zero installs** (no new external packages; `date-fns` already installed but MUST NOT be used for age math — string-compare idiom is the locked approach).

## Architecture Patterns

- **Data flow:** `nq.candles` → `windowCandles` (closed-only, sorted, trailing-60) → `seedPools` → `applyLifecycle(asOf)` → `mergePools(ATR)` → `capPools(newest 20)` → `scoreAndRank` (+decay) → `selectPools` envelope → §1 prose + chart lines. Decay touches only the `scoreAndRank` stage [VERIFIED: src/lib/ict/pools.ts:416-438].
- **Recommended structure:** no new files. `pools.ts`: 2 constants + `poolDecay()` + `poolAgeBars()` (private or exported-pure for tests) + 1 ledger field + 1 formula factor. `pools.test.ts`: new `describe('pool decay')` block (~10 boundary tests). `pools-parity.test.ts`: unchanged (re-run green). Sandbox: 2 preview fields + setters + 2 KnobRows + pristine lines.
- **Pattern — scorer-plane multiplier:** `score = weight × dolBoost × behindPenalty × decayFactor / (1 + distAtr)` with `decayFactor = max(1/(1+ageBars/10), 0.25)`; ledger entry gains `decayFactor` beside `dolBoost`/`behindPenalty` [extends VERIFIED: src/lib/ict/pools.ts:367-385].
- **Pattern — age in D1 bars:** `ageBars = closed.filter(c => c.date > originDate && c.date <= asOf).length`, reusing the `closed` window already in scope; `originIndexOrNeg1`-style `-1 → age 0, decay 1.0` guard for unknown origins [idiom VERIFIED: src/lib/ict/pools.ts:84-86,220-223].
- **Anti-patterns:** (1) mutating `.weight`/`.touches` for decay — breaks replay determinism; (2) `Date.now()`/`new Date()` in `ict/` — purity guard fails the suite [VERIFIED: src/lib/ict/purity.test.ts:31-44]; (3) calendar-day age arithmetic — weekends age pools; (4) Rank-1-flip assertions — assert score-ordering properties, never a specific flip (Pitfall 6 warning sign); (5) `CONSUMED` handling outside `pools.ts`; (6) reading `calibrationPreview` in derivation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic for age | `parseISO`/day-diff helper | String compare `c.date > originDate && c.date <= asOf` over the closed window | Weekend/holiday-proof; matches `applyLifecycle` idiom [VERIFIED: src/lib/ict/pools.ts:220-223] |
| Fresh-seed lineage tracker | origin-link map | Existing `detectPools` natural seeding (new swings → new ACTIVE pools) | D-05 locks no-lineage; CONSUMED rows are dropped so D-07 needs no code |
| Live decay timer | store interval / tick | Injected `asOf` (`asOfBaku` string already in `selectPools`) | D-20/D-22 purity; two `asOf` values give deterministic time-ordered decay [VERIFIED: src/lib/store.ts:953-965] |
| Ghost expiry/cap logic | `GHOST_TTL`/`GHOST_CAP` | Existing `capPools` trailing-20 + nearest-2-per-side ACTIVE canvas cap | D-09/D-11 locked; Phase 20 behavior unchanged |
| New slider primitive | custom slider | Installed `Slider` wrapper + `KnobRow` + preview/Apply/Reset path | D-16 locks no-new-UI-primitive [VERIFIED: components/dashboard/calibration-sandbox.tsx:180-224] |

## Common Pitfalls (phase-specific additions to PITFALLS.md Pitfall 6)

1. **Weight-mutation decay** — any assignment to `.weight`/`.touches` outside `seedPools`/`mergePools`. Prevent: scorer-only multiplier; pin with stored-weight-identity test + double-run `JSON.stringify` determinism check.
2. **SWEPT re-promotion** — any `status = 'ACTIVE'` outside seeding. Prevent: no lifecycle edits in this phase at all.
3. **Clock reads** — `Date.now()`/`new Date()` in new helpers. Prevent: purity guard self-scans new `ict/*.ts` files [VERIFIED: src/lib/ict/purity.test.ts:8-12].
4. **Rank-1-flip test assertions** — brittle, tune-bait. Assert instead: fresh pool outscores its aged self; floor bounds score from below; ancient pools never score 0 while ACTIVE; ghost order unchanged by decay.
5. **Sandbox live-wiring** — derivation reading `calibrationPreview`. Preview is what-if only; `scoreAndRank` reads pinned constants.

## Code Examples (patterns for planner task actions)

```typescript
// Source: extends src/lib/ict/pools.ts:24-35 constant idiom [VERIFIED]
/** Scorer half-life in D1 bars (D-02). */
// CALIBRATION-PROVISIONAL: seeded 2026-10-26, unobserved live. Phase 21-style firing-log review.
export const DECAY_HALF_LIFE_BARS = 10;
/** Score floor for ancient ACTIVE pools (D-03). */
export const DECAY_SCORE_FLOOR = 0.25;
```

```typescript
// Source: extends src/lib/ict/pools.ts:367-385 scorer idiom [VERIFIED]
// Age counted in D1 bars over the already-closed window — string compare,
// same as applyLifecycle's `c.date > asOf` guard (pools.ts:222).
const ageBars = closed.filter((c) => c.date > pool.originDate && c.date <= asOf).length;
const decayFactor = Math.max(1 / (1 + ageBars / DECAY_HALF_LIFE_BARS), DECAY_SCORE_FLOOR);
const score = (pool.weight * dolBoost * behindPenalty * decayFactor) / (1 + distAtr);
```

```typescript
// Source: mirrors pools.test.ts leg()/AS_OF builder idiom [VERIFIED: src/lib/ict/pools.test.ts:23-40]
// Boundary pins: decay(0)=1, decay(10)=0.5, floor holds at age 60+,
// fresh-outscores-aged-self, weight/touches byte-identical pre/post,
// double-run JSON determinism, ghost originDate order unchanged.
```

## State of the Art / Current Approach

`scoreAndRank` without decay is the current locked approach (Phase 19 D-06..D-09); this phase extends it by one factor — not a replacement. No deprecations. External sources on time-decay weighting for liquidity levels: none usable found — all constants ship CALIBRATION-PROVISIONAL per house convention [ASSUMED: half-life 10 and floor 0.25 have no live evidence — firing-log review calibrates later, never tune to pass tests].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `closed` window in `scoreAndRank` scope suffices for age counting (needs `asOf` param added — signature change is additive, parity-safe) | Architecture | Planner must confirm signature threading; alternative is parallel age map |
| A2 | Sandbox knob bounds (half-life 1–30 step 1; floor 0–0.9 step 0.05) acceptable | Architecture | Operator UX only; planner/user confirm at plan time |
| A3 | Half-life 10 / floor 0.25 need no live evidence before shipping as provisional | State of the Art | House convention covers this (CALIBRATION-PROVISIONAL + boundary pins + firing-log review) |

## Open Questions

None blocking. Minor plan-time confirmations: (1) `scoreAndRank` gains `asOf: string` param vs. internal age-map — recommend the param (purity-consistent, test-visible); (2) sandbox knob bounds (A2); (3) whether `PoolScore.decayFactor` or another ledger name — recommend `decayFactor` beside `dolBoost`/`behindPenalty`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vitest run | ✓ | v24.11.1 | — |
| npm + installed deps | test/build | ✓ | npm 11.6.2, next 16.3.4, vitest 5.0.0 | — |
| Python | none (no Python tooling in this phase) | n/a | 3.14.2 present | — |

No missing dependencies, no fallbacks needed.

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | vitest 5.0.0 [VERIFIED: package.json scripts + node_modules read] |
| Config file | `vitest.config.ts` (node env, `src/**/*.test.ts`, 15s timeout) [VERIFIED: vitest.config.ts:1-14] |
| Quick run command | `npx vitest run src/lib/ict/pools.test.ts` |
| Full suite command | `npm test` (`vitest run`) |

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POOL2-04 | decay math boundary pins (fresh=1, half-life=0.5, floor, monotonicity, weight-immutability, determinism, ghost order) | unit | `npx vitest run src/lib/ict/pools.test.ts` | ❌ Wave 0 (new `describe` block) |
| POOL2-04 | parity triple exact match pools-on/off (lifecycle+decay consume rank safely) | integration | `npx vitest run src/lib/ict/pools-parity.test.ts` | ✅ (re-run green, file untouched) |
| POOL2-04 | purity guard (no clocks/store imports in new code) | unit | `npx vitest run src/lib/ict/purity.test.ts` | ✅ (self-scans new files) |
| POOL2-04 | selectPools stale/thin matrix unchanged | unit | `npx vitest run src/lib/store.test.ts` | ✅ (covers healthy/es-stale/thin/empty/garbage/determinism) |
| POOL2-04 | sandbox sliders preview-only, pristine-vs-pinned | unit/component | existing sandbox tests if any; else manual | [ASSUMED] — planner checks for sandbox test file |

**Sampling rate:** per task commit → pools.test.ts file run; per wave merge → `npm test`; phase gate → full suite green + parity green.
**Wave 0 gaps:** new `describe('pool decay')` block in `pools.test.ts`; 2 sandbox preview fields + setters + knob bounds + pristine lines (store + panel). No new test files, no framework install.

## Security Domain (`security_enforcement: true` in config [VERIFIED: .planning/config.json:47])

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (pure math, no auth surface) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Existing guards reused: `detectPools`/`evaluatePools` throw on empty `asOf`; `windowCandles` throws on non-array; `scoreAndRank` refuse-to-rank → finite zero scores, never NaN; `selectPools` try/catch → null |
| V6 Cryptography | no | — (no crypto; never hand-roll) |

**Known threat patterns:** none new. Decay output flows into already-verbatim §1 prose and dimmed chart lines; no new DOM injection surface; no calibration-export shape change.

## Sources

**Primary (HIGH):** `src/lib/ict/pools.ts` (lifecycle 210-245, scorer 327-397, pipeline 416-438); `src/lib/store.ts` selectPools 953-973, Apply 1235-1251, preview bounds 1195-1219; `src/lib/ict/pools.test.ts` builder + scorer pins (51-61, 414-468); `src/lib/ict/pools-parity.test.ts` triple-match harness; `src/lib/ict/purity.test.ts` guard; `src/lib/ict/swings.ts` k=2 contract; `src/lib/ict/types.ts` Candle/closedOnly; `src/lib/ict/regime.ts` computeATR; `components/dashboard/calibration-sandbox.tsx` KnobRow/pristine idiom; CONTEXT 19/20/21 D-locks; FEATURES.md POOL2-04 row; PITFALLS.md Pitfall 6; SUMMARY.md; ROADMAP.md Phase 22 contract; REQUIREMENTS.md POOL2-04.
**Secondary (MEDIUM):** `src/lib/store.test.ts` selectPools matrix (grep-verified, not Read — planner should open before citing line ranges).
**Tertiary (LOW):** none relied upon.

## Metadata

- Standard stack: HIGH (installed versions read from node_modules; zero-dep verdict follows directly)
- Architecture: HIGH (all touch points read this session; formula extension is single-line)
- Pitfalls: HIGH (grounded in Pitfall 6 + lifecycle/scorer code reads)

---

*Phase: 22-Pool Lifecycle + Decay (POOL2-04)*
*Research completed: 2026-10-26*
