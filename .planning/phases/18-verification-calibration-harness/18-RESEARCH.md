# Phase 18: Verification + Calibration Harness - Research

**Researched:** 2026-09-14
**Domain:** Bar-by-bar replay + reason-parity + stale-degradation verification over the Phases 15–17 execution layer (pure `evaluateTrigger` / `checkFatalFlaw` / `computeTicket` chain, vitest harness only)
**Confidence:** HIGH

## Summary

Phase 18 is a test-harness-only phase: no UI changes, no new signals, no new store slices, no new poll legs. It proves what Phases 15–17 built by driving the already-shipped pure functions (`evaluateTrigger` in `src/lib/ict/trigger.ts`, `checkFatalFlaw` in `src/lib/ict/invalidation.ts`, `computeTicket` in `src/lib/ticket.ts`) bar-by-bar over a hand-built ~20-session 15M population fixture, cross-asserting AMD/SMT-vs-trigger parity on the same snapshot, and injecting stale/thin legs with the ticket open to prove degraded-with-provenance output.

The three locked contracts this phase exercises were all read this session. The trigger is a three-gate engine (timing + purge + displacement; 3/3 fires, exactly 2 arms, 0–1 waits, fired-session downgrade) with verdicts `FIRE_LONG | FIRE_SHORT | ARMED | WAIT_FOR_MANIPULATION` [VERIFIED: src/lib/ict/trigger.ts:32-43]. The flaw is a first-match-wins disjunction (HARD rollover, HARD stale, SOFT SMT, SOFT opposite-sweep, then clean) evaluated AFTER the trigger on the exact same snapshot, where SOFT touches FIRING only [VERIFIED: src/lib/ict/invalidation.ts:305-328]. The ticket is a fixed-order derivation (direction → OTE×FVG entry → SL → TP ladder → R/R gate on TP1 → EXECUTE/STAND ASIDE) with flaw precedence by function order and a `degraded: { stale, thin, leg }` envelope carried through [VERIFIED: src/lib/ticket.ts:288-392].

**Primary recommendation:** Build three co-located vitest files (`replay.test.ts`, `parity.test.ts`, `stale-drill.test.ts`) that drive `evaluateTrigger` + `checkFatalFlaw` (+ `computeTicket` for the stale drill) directly at the pure layer with per-bar injected `asOf` epochs built via `fromZonedTime(..., NY_TZ)` — pinning the transition table, the contradiction rules, and the leg-matrix assertions with `toBe`/`toEqual` exactly like the existing `trigger.test.ts` / `invalidation.test.ts` / `ticket.test.ts` precedent — plus a replay summary emitting fires/week + kill-rate + INVALIDATED count against the 1–4/week band as structured console/JSON output.

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Replay fixture shape
- **D-01:** Hand-built 15M rows for ~20 sessions — explicit rows exercising killzone entries, sweep bars, displacement bars, choppy-QUIET stretches, and at least one FIRING path plus one INVALIDATED path. Full control and readability over generator compactness.
- **D-02:** Step at every 15M close — feed each close through trigger+flaw in order. Strictest no-flicker proof, matches the 15M-close-gated execution scope.
- **D-03:** Pinned transition table — QUIET/ARMED/FIRING/INVALIDATED forward-only legal edges (FIRING→ARMED only via SOFT downgrade) asserted per bar. Table pinned in the test; any illegal edge fails the build.

#### Parity check surface
- **D-04:** Test assertion only — cross-assert AMD phase/SMT state vs trigger gates on the same snapshot in vitest. No new UI indicator; the user sees parity as absence of failure.
- **D-05:** Exact contradiction rules pinned — e.g. FIRE_SHORT while SMT=BULLISH confirmed fails; trigger reasonKey naming a detector-disputed state fails. Strictest form; tune the rules, not the strictness, if the fixture disagrees.

#### Stale drill form
- **D-06:** Automated vitest injection — frozen Yahoo legs + thin-tier fixtures injected with ticket open, asserting degraded-with-provenance. Deterministic and CI-green; no live drill doc.
- **D-07:** Full leg matrix — every leg stale individually (NQ daily, ES daily, NQ/ES 15M) plus all-stale plus thin-tier, each asserting STALE/THIN tag with provenance and never a full-strength ticket.

#### Calibration output
- **D-08:** Replay summary output — the replay run emits fires/week + kill-rate + INVALIDATED count as structured output (JSON/console) compared against the 1–4/week band. No UI panel, no checked-in report file.
- **D-09:** Both FIRING and INVALIDATED required in the fixture — replay asserts ≥1 FIRING and ≥1 INVALIDATED per the success criteria, plus reports the band verdict.

### Agent's Discretion
None — user decided every area explicitly.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VERF-01 | Bar-by-bar replay test proves monotonic trigger/flaw transitions (no flicker) on a 20-session population fixture with ≥1 FIRING and ≥1 INVALIDATED | Transition-table section + replay driver pattern + fixture-shape guidance below; `evaluateTrigger` gate semantics and `checkFatalFlaw` SOFT-gating/HARD-kill semantics verified from source |
| VERF-02 | §3-vs-trigger reason parity — trigger prose never contradicts AMD/SMT state on the same snapshot | Contradiction-rule table + parity assertion pattern; `amdPhase` promotion/skeleton rules and `evaluateSMT`/`detectSMT` direction semantics verified from source |
| VERF-03 | Stale-serve drill with ticket open proves graceful degradation — numbers degrade visibly with provenance, never full-strength ticket on stale/thin inputs | Leg-matrix table + degraded-envelope contract (`TicketDegraded`, `selectTicket` es-stale degraded path) verified from source |

## Project Constraints (from AGENTS.md)

- **Next.js agent-rules block:** This repo's Next.js version has breaking changes vs training data — read the relevant guide in `node_modules/next/dist/docs/` before writing any code, and heed deprecation notices. (No new app code in this phase, so impact is nil, but the planner must not assume classic Next.js conventions if any harness-adjacent file touches app code — it should not.)
- **Git worktree hygiene:** Before any `execute-phase` dispatch — `git fetch origin`, check HEAD vs origin/HEAD divergence, handle `shouldDegrade`. Branching strategy is `none` (entire history on main) — planner must not create feature branches.
- **Config warning hygiene:** Keep overlapping keys (`resolve_model_ids`/`runtime`) in only one config layer to avoid #3532 warnings. No action for this phase.
- **PROJECT.md constraints (binding for this phase):** Purity (`src/lib/ict` pure — injected `asOf`, no `Date.now`, no store imports), Zero budget (no new services/APIs), Zustand-only state (irrelevant — no store changes), Rule-based (no LLM; calibration summary is arithmetic + string compare, not narration).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bar-by-bar replay driver + transition-table assertion | Test harness (vitest, co-located `*.test.ts`) | — | Pure-function replay needs no runtime tier; existing precedent is co-located unit tests driving `judasSwing`/`evaluateTrigger`/`checkFatalFlaw` directly |
| Fires/week + kill-rate calibration summary | Test harness (structured console/JSON emission) | — | D-08 explicitly forbids UI panel and checked-in report file; emission lives in the replay test run |
| AMD/SMT-vs-trigger parity assertions | Test harness (vitest, same-snapshot cross-checks) | — | D-04 is test-assertion-only; no UI indicator |
| Stale/thin degradation proof | Test harness (vitest injection at pure layer) | API/Backend (frozen Yahoo leg envelopes as fixture inputs) | D-06 mandates automated vitest injection, not a live drill; fixtures stand in for the Yahoo proxy envelopes |
| Ticket degraded-with-provenance rendering | Already shipped (Phase 17 panels) | — | Phase 18 asserts the existing `degraded` envelope behavior; no panel changes |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | `^5.0.0` (`5.0.0` installed [VERIFIED: package.json:41 + `npx vitest --version` → `vitest/5.0.0` this session]) | Test runner for all three harness files; `describe/it/expect` with `toBe` verbatim pins and `toEqual` structural asserts | Already the repo standard (`"test": "vitest run"`, 300+ green co-located tests); config `vitest.config.ts` includes `src/**/*.test.ts` with node environment [VERIFIED: vitest.config.ts:1-13] |
| `date-fns-tz` (`fromZonedTime`, `formatInTimeZone`) | `^3.2.0` [VERIFIED: package.json:18] | DST-aware NY wall-clock epoch construction (`nyMinuteEpoch`/`nyHourEpoch` fixture helpers) and NY wall-clock reads (`NY_TZ = 'America/New_York'` [VERIFIED: src/lib/ict/aggregate.ts:11-16]) | Every existing detector/test file uses this idiom; hand-rolled UTC offsets are banned by the Asia/Judas wall-clock discipline |
| `evaluateTrigger` + `checkFatalFlaw` + `computeTicket` (in-repo, no install) | Current tree (Phases 15–17 shipped) | Units under replay/parity/drill | Locked contracts; replay must consume them, never re-implement gates |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | `^4.4.0` [VERIFIED: package.json:17] | Date arithmetic if the replay summary needs session-week bucketing | Only if needed; prefer `nyDateOf` epoch helpers already in `trigger.ts` |
| Existing fixture idioms (`row()`, `block15()`, `fixtureFvg()`, `nyMinuteEpoch()`) | In-repo test code | Row builders for the 20-session fixture | Copy the `judas.test.ts` / `trigger.test.ts` builders verbatim rather than inventing new ones |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-built 20-session rows (D-01 locked) | Seeded generator (judas.ts 60-session precedent) | Generator is compact but unreadable for transition-table debugging; user explicitly chose hand-built — do not revisit |
| Pure-layer replay (recommended) | Store-level replay via `selectTrigger`/`selectFatalFlaw` seeding | Store path adds poll-state setup cost and already-fired log coupling; pure layer gives per-bar `alreadyFired` control. Store coherence is already covered by `store.test.ts` snapshot-agreement tests |
| Console/JSON summary emission (D-08 locked) | Checked-in markdown/JSON report file | Forbidden by D-08; emission must be run output, not a repo artifact |

**Installation:**
```bash
# No new packages. Phase 18 installs nothing — vitest + date-fns-tz already in tree.
npm test -- --run src/lib/ict/replay.test.ts
```

## Package Legitimacy Audit

No external packages are installed in this phase. All harnesses use in-tree `vitest` + `date-fns-tz` (both long-standing entries in `package.json` dependencies/devDependencies, already imported across dozens of shipped files). Audit skipped with reason: zero new installs.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Hand-built 20-session 15M fixture (IntradayCandle rows, per-session AsiaRange + FVG inventory)
  │ per 15M close, in chronological order
  ▼
┌──────────────┐   same snapshot    ┌────────────────┐
│ judasSwing / │ ── JudasOutput ──▶ │ evaluateTrigger │ ── TriggerOutput (verdict/direction/reasonKey/gates/entryFvg)
│ asiaRange /  │    AmdOutput  ──▶ │  (timing×purge   │         │
│ amdPhase /   │    SmtOutput  ──▶ │   ×displacement) │         │ same object
│ evaluateSMT  │    FvgGap[]   ──▶ │                  │         ▼
└──────────────┘   + asOf epoch    └────────────────┘  ┌────────────────┐
       (fixed per-bar inputs;       ▲ alreadyFired     │ checkFatalFlaw │ ── FatalFlawOutput
        alreadyFired from prior      │ (replay-owned    │  (HARD kill /  │    (invalidated/downgraded/
        bar's verdict, session-      │  firing log)     │   SOFT ARMED-  │     flawClass/reasonKey/
        scoped, mirroring            └──────────────────│   only / clean)│     carriedArmedReason)
        appendFiringLog dedup)                         └───────┬────────┘
                                                       trigger+flaw+levels+range+dol+asia+riskPct+degraded+asOf
                                                               ▼ (stale-drill only)
                                                        ┌──────────────┐
                                                        │ computeTicket │ ── TicketOutput (EXECUTE/STAND_ASIDE + degraded)
                                                        └──────────────┘
  Per-bar asserts: transition-table legality (VERF-01) · AMD/SMT contradiction rules (VERF-02) · degraded envelope (VERF-03)
  End-of-run: fires/week + kill-rate + INVALIDATED count vs 1–4/week band (structured console/JSON emission)
```

### Recommended Project Structure

```
src/lib/ict/
├── replay.test.ts        # VERF-01 — 20-session fixture + bar-by-bar driver + transition table + calibration summary
├── parity.test.ts        # VERF-02 — same-snapshot AMD/SMT vs trigger contradiction rules
├── stale-drill.test.ts   # VERF-03 — leg-matrix injection (pure computeTicket + checkFatalFlaw level)
src/lib/
├── ticket.test.ts        # UNCHANGED (existing EXECUTE/STAND_ASIDE + degraded pins stay green)
```

Co-location is the locked convention ("Co-located tests (`<module>.test.ts`) — replay/parity/drill tests follow suit" per 18-CONTEXT.md). Do not create a `tests/` directory, a `scripts/` harness, or a `.planning/` report artifact.

### Pattern 1: Bar-by-bar replay driver with replay-owned `alreadyFired`
**What:** The replay loop owns session-scoped cooldown state itself: iterate each session's 15M closes in order, call `judasSwing(rows-so-far, asiaRange)` (or inject precomputed `JudasOutput` per bar for hand-built precision), then `evaluateTrigger({ judas, amd, smt, fvg, asOf: barEpoch, alreadyFired })`, then `checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf: barEpoch })`. After each bar, update the replay-owned fired-set exactly like `appendFiringLog`'s dedup: one FIRE per NY-date session; `ARMED_ALREADY_FIRED` echoes never re-append [VERIFIED: src/lib/store.ts:980-1014].
**When to use:** VERF-01, every session in the fixture.
**Example:**
```typescript
// Fixture idiom: DST-aware epoch builders + row builder (judas.test.ts / trigger.test.ts precedent)
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
// NY_TZ = 'America/New_York' [VERIFIED: src/lib/ict/aggregate.ts:11-16]
function nyMinuteEpoch(nyDate: string, hhmm: string): number {
  return Math.floor(fromZonedTime(`${nyDate} ${hhmm}:00`, NY_TZ).getTime() / 1000);
}
// Row builder (judas.test.ts:17-26 verbatim shape):
// { time, open: price, high: price + 8, low: price - 6, close: price + 3, ...overrides }
// Per bar:
//   const trigger = evaluateTrigger({ judas, amd, smt, fvg, asOf: barEpoch, alreadyFired });
//   const flaw = checkFatalFlaw({ trigger, smt, judas, rollover, stale, asOf: barEpoch });
//   assertLegalTransition(prevCombined, nextCombined, flaw); // D-03 table
```

### Pattern 2: Pinned transition table over the combined state
**What:** The combined per-bar state is `(trigger.verdict, flaw.invalidated, flaw.downgraded)` rendered as one of QUIET (`WAIT_FOR_MANIPULATION` + clean), ARMED (`ARMED` + clean), FIRING (`FIRE_*` + clean), INVALIDATED (HARD `invalidated`), plus the SOFT transient (`FIRE_*` + `downgraded` → renders ARMED). Legal forward-only edges, pinned as a lookup the test consults per bar [ASSUMED — table drafted at plan time per CONTEXT "transition table edges drafted at plan time"; the underlying verdict/flaw shapes it encodes are VERIFIED above]:

| From → To | Legal? | Condition |
|-----------|--------|-----------|
| QUIET → ARMED / FIRING | ✅ | Gates newly pass (2/3 → ARMED; 3/3 → FIRING) |
| ARMED → FIRING | ✅ | Third gate completes |
| ARMED → QUIET | ✅ | Gate(s) lost before firing (e.g. bar leaves killzone timing) — forward means "no resurrection of a spent FIRE", not "gates never drop" |
| FIRING → INVALIDATED | ✅ | HARD flaw arrives (rollover/stale) on a later bar |
| FIRING → ARMED | ✅ ONLY via SOFT downgrade | `downgraded === true` with `carriedArmedReason` set; any FIRING→ARMED with a clean flaw is flicker and fails |
| FIRING → QUIET | ❌ | A fired session must go ARMED_ALREADY_FIRED / INVALIDATED, never silently QUIET |
| INVALIDATED → FIRING / ARMED / QUIET | ❌ within one setup | INVALIDATED is terminal per setup; a new setup (new sweep/confirmed event) starts a new chain |
| Any → same | ✅ | Steady-state hold is always legal |

**How to avoid the ambiguous case:** ARMED→QUIET gate-drop vs flicker is distinguished by the trigger's own counting rule — `passes <= 1 → WAIT`, `passes === 2 → ARMED` [VERIFIED: src/lib/ict/trigger.ts:304-341]. The test asserts the *combined-state* edge, and separately asserts that edge's trigger/flaw cause (e.g. ARMED→QUIET must show reduced gate count, never a vanished FIRE).

### Pattern 3: Same-snapshot parity assertions (VERF-02)
**What:** For every bar that reaches ARMED-or-better, feed the *identical* `judas`/`smt`/`amd` objects into both `evaluateTrigger` and the parity cross-check — never re-derived copies. Contradiction rules pinned as boolean predicates over `(trigger, amd, smt, judas)` [ASSUMED as exact rule list — CONTEXT pins the form ("e.g. FIRE_SHORT while SMT=BULLISH confirmed fails") and leaves the roster to plan time; the detector semantics each rule reads are VERIFIED below]:
- `FIRE_SHORT` + unsuppressed SMT `direction === 'BULLISH'` (with concordant sweep-side pairing LOW+BULLISH [VERIFIED: src/lib/ict/trigger.ts:132-157]) → fail. Mirror for `FIRE_LONG` + `BEARISH`.
- `FIRE_*` while SMT `suppressed === true` with reason `CORR_DECOUPLED`/`rollover-week` (the `SmtOutput = SmtSignal | SmtSuppressed` union [VERIFIED: src/lib/ict/smt.ts:30-45]) is *allowed* at the trigger layer (SMT never blocks FIRE — read-only agree-tag) but the flaw layer must show `SMT_SUPPRESSED` SOFT downgrade; parity asserts the *pair*, not the trigger alone.
- `reasonKey` naming a missing gate while `gates` says it passed (e.g. `ARMED_MISSING_PURGE` with `gates.purge === true`) → fail. The ARMED key is a total function of the missing gate [VERIFIED: src/lib/ict/trigger.ts:314-321].
- AMD `phase === 'accumulation'` ("`Asia Range Təmizlənməyib. London Judas Swing Gözlənilir.`" [VERIFIED: src/lib/ict/amd.ts:48-58]) on the same snapshot where trigger `gates.purge === true` (confirmed sweep) → fail: accumulation means `!judas.candidate` [VERIFIED: src/lib/ict/amd.ts:73-89], purge means `confirmed === true` — mutually exclusive inputs.
- NY-session bars: AMD returns the wholesale `REASON_NY_UNAVAILABLE` replacement [VERIFIED: src/lib/ict/amd.ts:166-172] while trigger timing still votes on killzone minutes 120–300; parity must exempt NY-hours bars from AMD-phase agreement (clock skeleton vs killzone gate measure different windows).

### Pattern 4: Stale/thin leg-matrix injection (VERF-03)
**What:** Freeze one FIRE-capable snapshot (FIRE trigger + clean flaw + resolvable `computeTicket` structure — the `ticket.test.ts` tracer: range 20260/20010, bullOTE [20062.5, 20105], BULLISH gap [20090, 20120] → entry 20097.5, SL 20085, TP1 20210, RR 9, EXECUTE_LONG), then run the matrix below. Each cell asserts (a) no full-strength ticket and (b) provenance naming the leg [ASSUMED as test layout; every contract it asserts is VERIFIED]:

| Injected staleness | `checkFatalFlaw` expects | `computeTicket` expects |
|--------------------|--------------------------|-------------------------|
| `stale.nq = true` only | `invalidated=true`, `flawClass='HARD'`, `reasonKey='STALE_LEG'` (any single true leg kills [VERIFIED: src/lib/ict/invalidation.ts:311-313]) | `STAND_ASIDE` with `flaw.reason` (invalidated → standAside [VERIFIED: src/lib/ticket.ts:315-316]) |
| `stale.es = true` only | Same HARD STALE_LEG | `STAND_ASIDE` + `degraded = { stale: true, thin: false, leg: 'es' }` (selectTicket precedent [VERIFIED via store.test.ts ticket-degraded case, src/lib/store.ts:1085-1097]) |
| `stale.nq1h = true` only | Same HARD STALE_LEG | `STAND_ASIDE` (trigger-critical legs refuse) |
| `stale.nq15m = true` only | Same HARD STALE_LEG | `STAND_ASIDE` |
| All four stale | HARD STALE_LEG (first-match-wins; rollover absent so stale is the winner) | `STAND_ASIDE`, never EXECUTE (note: pure `computeTicket` does NOT read stale flags itself — staleness reaches it only via the flaw object; the drill must route through `checkFatalFlaw` first, mirroring `selectTicket`'s flaw-before-ticket order [VERIFIED: src/lib/store.ts:1066-1099]) |
| Thin-tier (closed D1 count < `ANCHOR_WINDOW = 20` [VERIFIED: src/lib/ict/range.ts:4] → `range-thin`; < `MIN_CANDLES_FULL = 34` [VERIFIED: src/lib/ict/regime.ts:6] → `regime-degraded`) | Clean flaw (thin is not a flaw input) | `degraded = { stale: false, thin: true, leg: 'nq' }` via `resolveThinTier` (selectTicket precedent [VERIFIED: src/lib/store.ts:1088-1097]); numbers dimmed with provenance, sizing locked or floored downstream |

### Pattern 5: Calibration summary emission (D-08)
**What:** After the replay loop, bucket FIRE verdicts by NY session week (`nyDateOf` epoch → `yyyy-MM-dd` via `formatInTimeZone(..., NY_TZ, ...)` — the `trigger.ts:124-126` idiom), count INVALIDATED bars/sessions, compute kill-rate = invalidated-setups / fired-setups, and `console.log` (plus optional `process.stdout.write`) a single JSON object `{ fires, sessions, firesPerWeek, invalidated, killRate, band: '1-4/week', verdict: 'IN-BAND' | 'OUT-OF-BAND' }`. Compare against the acceptance band 1–4 fires/week (TRIG-04; `CALIBRATION-PROVISIONAL` band seeded 2026-09-10 [VERIFIED: src/lib/ict/trigger.ts:19-30]). The band verdict is informational (OUT-OF-BAND logs, does not throw) unless the plan pins it as failing — decide at plan time; PITFALLS.md says "a trigger outside its band is a failing feature" [CITED: .planning/research/PITFALLS.md P1].
**Firing-log note:** The replay must NOT write the real `firingLog` store (render-pure rule: log commits only at the poll tick via `commitTriggerLog` [VERIFIED: src/lib/store.ts:924-938]). Replay-owned counting only.

### Anti-Patterns to Avoid
- **Replaying through the Zustand store:** seeding four legs + lastUpdatedISO per bar is slow, couples the replay to poll cadence, and trips the already-fired log coupling (`ticket-flaw-precedence` trap documented in store.test.ts:1501-1506). Drive pure functions directly.
- **Re-deriving detector outputs between trigger and flaw calls:** the shared-snapshot contract (`checkFatalFlaw` consumes "the exact trigger snapshot object" [VERIFIED: src/lib/ict/invalidation.ts:32-45]) is the entire no-flicker proof — one `judas`/`smt` object per bar, passed to both.
- **Evaluating on forming bars:** `closedOnly`/`closedOnlyIntraday` at every detector boundary [VERIFIED: src/lib/ict/types.ts:47-66]; replay steps at 15M closes only (D-02).
- **Hand-rolled timezone offsets:** all epochs via `fromZonedTime(..., NY_TZ)`; all wall-clock reads via `formatInTimeZone`. Fixed offsets drift across DST (judas.ts:60-64 discipline).
- **Live OPPOSITE_SWEEP fixtures:** the opposite-sweep SOFT branch "fires only on synthetically mismatched trigger-plus-judas envelopes and never through selectFatalFlaw on the same snapshot" [VERIFIED: src/lib/ict/invalidation.ts:13-16]. Do NOT build the replay INVALIDATED path on opposite-sweep — use HARD stale/rollover or SOFT SMT-suppressed (SMT SOFT is proven live; invalidation.test.ts pins it).
- **Checked-in calibration report files:** D-08 forbids them. Console/JSON emission only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 15M candle row construction | Custom candle factory | `row()`/`block15()`/`block8()` builders from `judas.test.ts:17-64` + `fixtureFvg()` from `trigger.test.ts:53-66` | DST-safe, killzone-aligned, reviewed across 3 phases; new builders reintroduce off-by-one killzone edges (120/300 exclusive) |
| NY wall-clock session bucketing | String slicing on ISO dates | `nyDateOf`/`nyMinutesOf` via `formatInTimeZone(..., NY_TZ, ...)` (aggregate.ts/trigger.ts idiom) | Host-TZ-dependent bucketing silently misattributes sessions; the IANA path is DST-proven (March + November) |
| Firing-rate / kill-rate math | Ad-hoc counters in each test | One shared summary helper in `replay.test.ts` consuming the replay log | Single definition of fires/week + kill-rate prevents three divergent denominators |
| Stale/thin provenance strings | New copy | `REASON_BY_KEY.STALE_LEG`, `UNBLOCK_BY_KEY`, `thinTierCopy` (`src/lib/thin-tier.ts:14-19`) | Verbatim pins already exist; duplicated prose drifts |
| Purity enforcement for new files | New lint rule | Existing `purity.test.ts` glob guard (fails on `Date.now(` + store imports [VERIFIED: src/lib/ict/purity.test.ts:31-45]) | New harness files under `src/lib/ict/` are auto-covered; just keep them pure (injected `asOf`, no store imports) |

**Key insight:** The replay harness's only novel code is the *fixture rows* and the *assertion tables*. Every driver, builder, epoch helper, and reason string already exists — the phase is proven by composition, and any new math is a scope breach.

## Common Pitfalls

### Pitfall 1: FIRING→ARMED clean downgrade misread as legal (flicker hole)
**What goes wrong:** The transition table allows FIRING→ARMED, and a buggy replay passes a clean-flaw ARMED bar as "the allowed edge".
**Why it happens:** The D-03 allowance is specifically "FIRING→ARMED *only via SOFT downgrade*" — the `downgraded === true` + `carriedArmedReason` carrier [VERIFIED: src/lib/ict/invalidation.ts:317-327] is the whole edge. A clean-flaw ARMED after FIRE means the trigger silently lost a gate — textbook flicker.
**How to avoid:** Assert the triple `(trigger.verdict, flaw.downgraded, flaw.carriedArmedReason)` on every FIRING exit, not the verdict alone.
**Warning signs:** Transition assertion that only compares `verdict` strings.

### Pitfall 2: Opposite-sweep INVALIDATED path that can never fire live
**What goes wrong:** Fixture engineers a confirmed opposite-direction sweep to get the ≥1 INVALIDATED count, the test greens, and the population proof is vacuous.
**Why it happens:** `directionOf` is a total function of `sweepSide` (HIGH→SHORT, LOW→LONG [VERIFIED: src/lib/ict/trigger.ts:223-227]), so same-snapshot trigger-vs-judas can never disagree — the branch is reachable only via synthetic mismatch.
**How to avoid:** INVALIDATED bars must come from HARD stale (`stale.* = true`), HARD rollover (`rolloverSuspect === true` [VERIFIED: src/lib/ict/invalidation.ts:308-310]), or SOFT SMT-suppressed on a FIRING bar. Assert the winning `reasonKey` is one of `ROLLOVER_WEEK` / `STALE_LEG` / `SMT_SUPPRESSED`.

### Pitfall 3: Replay-owned `alreadyFired` drifting from store semantics
**What goes wrong:** Replay implements per-bar cooldown differently from `appendFiringLog` (e.g. per-bar instead of per-session, or forgetting the `ARMED_ALREADY_FIRED` echo skip), so the replay's fire count disagrees with live behavior.
**Why it happens:** The dedup rule has three clauses: ARMED-or-better only, FIRE-per-NY-date dedup, already-fired-downgrade repeats never append [VERIFIED: src/lib/store.ts:980-996].
**How to avoid:** Mirror all three clauses in the replay loop; unit-pin the replay counter against `appendFiringLog` on a shared sequence (or import the predicate logic if extracted).

### Pitfall 4: Parity rules that contradict the SMT read-only contract
**What goes wrong:** A parity rule like "FIRE requires SMT agreement" fails every suppressed-SMT fire — but suppressed SMT firing is *correct* trigger behavior (SMT "never a gate, never blocks FIRE" [VERIFIED: src/lib/ict/trigger.ts:48-57]).
**Why it happens:** Confusing trigger-layer parity (direction must not *contradict* SMT) with flaw-layer handling (suppressed SMT must *downgrade* FIRE to SOFT).
**How to avoid:** Frame every SMT rule as contradiction (FIRE_SHORT + BULLISH), never as requirement (FIRE requires BULLISH). Suppressed SMT asserts the flaw output, not the trigger verdict.

### Pitfall 5: Pure-`computeTicket` stale test that passes vacuously
**What goes wrong:** `computeTicket({ ..., stale leg inputs })` still returns EXECUTE because staleness is not a `TicketInput` field — `TicketInput` carries staleness only inside `flaw` (via HARD STALE_LEG) and the `degraded` envelope [VERIFIED: src/lib/ticket.ts:62-77].
**Why it happens:** Testing the ticket without routing through `checkFatalFlaw` first.
**How to avoid:** Every stale-drill cell constructs the flaw via `checkFatalFlaw` with the injected `stale` object, then feeds that flaw into `computeTicket` — the `selectTicket` order (trigger → flaw → ticket [VERIFIED: src/lib/store.ts:1066-1099]).

### Pitfall 6: Killzone-edge rows that silently test nothing
**What goes wrong:** Fixture sweep/timing bars land exactly on minutes 120/300 (exclusive edges — both read false [VERIFIED: src/lib/ict/trigger.ts:282-285]) or Asia-window edges, flipping gates the author didn't intend.
**Why it happens:** Hand-built rows use round hours (02:00 = minute 120 = OUTSIDE).
**How to avoid:** Pin every fixture bar's `nyMinutesOf` explicitly in a comment; use 02:01/04:59-style just-inside probes (trigger.test.ts:417-449 precedent) for firing bars and 02:00/05:00 for negative controls.

### Pitfall 7: NY-hours bars breaking AMD parity
**What goes wrong:** Parity suite fails on mid-day bars where AMD says "NY sessiyası v2.0-da ölçülmür" while the trigger fires.
**Why it happens:** The NY-unavailable branch replaces the reason wholesale but preserves phase [VERIFIED: src/lib/ict/amd.ts:166-172]; killzone timing (02:00–05:00 NY) never overlaps NY session (09:30–16:00 NY), so firing bars shouldn't be NY-hours bars — but choppy-QUIET stretches in the fixture may span them.
**How to avoid:** Exempt NY-session bars (minutes 570–960 [VERIFIED: src/lib/ict/amd.ts:18-21]) from AMD-phase agreement asserts; still assert SMT-direction parity there.

## Code Examples

Verified patterns from in-repo sources (all quotes verbatim, read this session):

### Replay loop skeleton (compose, don't invent)
```typescript
// Gate counting the replay asserts against [VERIFIED: src/lib/ict/trigger.ts:304-341]:
// "const passes = (timing ? 1 : 0) + (purged ? 1 : 0) + (displacement ? 1 : 0);"
// 3 passes fire (or ARMED_ALREADY_FIRED when fired), exactly 2 arm, 0-1 wait.
import { evaluateTrigger } from '@/src/lib/ict/trigger';
import { checkFatalFlaw } from '@/src/lib/ict/invalidation';

// Flaw precedence the replay asserts [VERIFIED: src/lib/ict/invalidation.ts:305-313]:
// "if (rollover !== null && ... rolloverSuspect === true) return flawOutput('ROLLOVER_WEEK', 'HARD', ...)"
// "if (stale.nq === true || stale.es === true || stale.nq1h === true || stale.nq15m === true) return flawOutput('STALE_LEG', 'HARD', ...)"
// SOFT gating [VERIFIED: src/lib/ict/invalidation.ts:314-327]:
// "SOFT branches gate on FIRING only (D-12): on ARMED/WAIT the trigger verdict stands"
for (const bar of session.barsInOrder) {
  const trigger = evaluateTrigger({ judas: bar.judas, amd: bar.amd, smt: bar.smt, fvg: bar.fvg, asOf: bar.epoch, alreadyFired: firedThisSession });
  const flaw = checkFatalFlaw({ trigger, smt: bar.smt, judas: bar.judas, rollover: bar.rollover, stale: FRESH, asOf: bar.epoch });
  assertLegalEdge(prevCombined, combinedOf(trigger, flaw), flaw);
  if (trigger.verdict === 'FIRE_LONG' || trigger.verdict === 'FIRE_SHORT') firedThisSession = true;
}
```

### Parity same-snapshot construction
```typescript
// Trigger carry-through the parity test reads [VERIFIED: src/lib/ict/trigger.ts:343-351]:
// "return { verdict, direction, reasonKey, reason: REASON_BY_KEY[reasonKey] + smtSuffix(judas, smt), ... inputs: { judas, amd, smt } }"
// share ONE object triple per bar:
const shared = { judas, amd, smt };
const trigger = evaluateTrigger({ ...shared, fvg, asOf: epoch, alreadyFired: false });
// Contradiction example (rule form per D-05): FIRE_SHORT + unsuppressed BULLISH fails.
if (!shared.smt?.suppressed && (trigger.verdict === 'FIRE_SHORT' || trigger.verdict === 'FIRE_LONG')) {
  const expectAgree = trigger.direction === 'LONG' ? 'BULLISH' : 'BEARISH';
  expect(shared.smt.direction === expectAgree || shared.smt.direction === 'NO-SIGNAL').toBe(true);
}
```

### Stale-drill cell (flaw-first routing)
```typescript
// Ticket flaw precedence [VERIFIED: src/lib/ticket.ts:311-323]:
// "if (flaw.invalidated === true) { return standAside(flaw.reason, epoch, degraded); }"
// Stale-leg envelope shape [VERIFIED: src/lib/ict/invalidation.ts:41-45]:
// "stale: { nq: boolean; es: boolean; nq1h: boolean; nq15m: boolean }"
const flaw = checkFatalFlaw({ trigger: fireTrigger, smt, judas, rollover: null, stale: { nq: false, es: true, nq1h: false, nq15m: false }, asOf });
expect(flaw.reasonKey).toBe('STALE_LEG');
const ticket = computeTicket({ trigger: fireTrigger, flaw, levels, range, dol, asia, riskPct: 1, degraded: { stale: true, thin: false, leg: 'es' }, asOf });
expect(ticket.verdict).toBe('STAND_ASIDE');
expect(ticket.degraded).toEqual({ stale: true, thin: false, leg: 'es' });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Seeded 60-session generator run (judas.ts Phase 8 precedent) | Hand-built ~20-session fixture (D-01) | Phase 18 discuss (2026-09-14) | Readability + transition-table debuggability over compactness |
| Store-level verification via seeded legs | Pure-layer replay + store coherence already pinned | Phase 17-05 gap closure (render-pure `selectTriggerPure` + explicit `commitTriggerLog`) | Replay drives pure fns; store path needs no new tests |
| Live stale-serve drill doc | Automated vitest injection (D-06) | Phase 18 discuss (2026-09-14) | Deterministic, CI-green, no human drill run |

**Deprecated/outdated:**
- `selectTrigger` with inline log writes: replaced by `selectTriggerPure` + `commitTriggerLog` (Phase 17-05) — replay must never depend on log side effects.
- Opposite-sweep live expectations: documented synthetic-only (invalidation.ts header) — never a replay path.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact contradiction-rule roster is left to plan time (CONTEXT gives the form + 1 example, not the list) | Parity Pattern 3 | LOW — planner drafts rules from the verified detector semantics; discuss-phase explicitly allows tuning rules at plan time |
| A2 | Transition-table ARMED→QUIET gate-drop legality reading (forward = no spent-FIRE resurrection) | Pattern 2 | MEDIUM — if the planner reads "forward-only" as "no backward edge at all", choppy stretches need session-split fixtures instead; flag at plan review |
| A3 | Calibration band OUT-OF-BAND is informational vs failing — plan-time call | Pattern 5 | LOW — either way the emission exists; only the assertion strictness changes |
| A4 | `firesPerWeek` denominator = NY-session weeks spanned by the fixture (not fixed 4-week divisor) | Pattern 5 | LOW — affects the band verdict arithmetic; planner pins the denominator with the fixture calendar |
| A5 | No new test-infra config needed (existing `vitest.config.ts` include covers new co-located files) | Validation Architecture | LOW — include pattern `src/**/*.test.ts` already matches; verified by read |

## Open Questions

1. **Fixture session calendar: consecutive trading days or hand-picked dates?**
   - What we know: 20 sessions, needs ≥1 FIRING + ≥1 INVALIDATED path plus QUIET stretches; `nyDateOf` bucketing is date-string based so any dates work.
   - What's unclear: Whether to use 20 consecutive NY dates (realistic week bucketing for fires/week) vs sparse hand-picked dates.
   - Recommendation: Consecutive trading days across ~4 weeks (Mon–Fri × 4) so fires/week divides naturally; skip weekends explicitly (no rows, no asserts).

2. **Should the replay use `judasSwing` on rows or injected `JudasOutput` per bar?**
   - What we know: D-02 says "feed each close through trigger+flaw in order" — trigger+flaw are named, judas is not.
   - What's unclear: Whether each bar's `judas` is recomputed from cumulative rows (end-to-end proof incl. confirmation-window dynamics) or hand-set (precise gate control).
   - Recommendation: Hybrid — hand-set `JudasOutput` for ARMED/QUIET/edge bars (precision), cumulative `judasSwing` for the FIRING path (proves sweep→confirm→fire dynamics end-to-end). Planner decides the split; both are pure and cheap.

3. **INVALIDATED path source: stale, rollover, or SMT-suppressed?**
   - What we know: All three are live-reachable; opposite-sweep is synthetic-only.
   - What's unclear: Which the fixture engineers (D-09 requires ≥1 INVALIDATED, source unspecified).
   - Recommendation: At least one HARD STALE_LEG invalidation (doubles as VERF-03 material at pure layer) plus one SOFT SMT-suppressed downgrade on a FIRING bar (proves the FIRING→ARMED legal edge with carrier). Rollover optional third.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vitest run | ✓ | `v24.11.1` (checked this session) | — |
| npm | test scripts | ✓ | `11.6.2` (checked this session) | — |
| vitest | all harness files | ✓ | `5.0.0` (checked this session) | — |
| Yahoo proxy / network | none (frozen fixtures per D-06) | n/a | — | No network needed — deterministic fixtures by design |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.
Step 2.6 outcome: full local availability; no external service, no new install, no polling, no browser needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.0.0 |
| Config file | `vitest.config.ts` (node env, `src/**/*.test.ts` + `app/**/*.test.ts`, 15s timeout) |
| Quick run command | `npx vitest run src/lib/ict/replay.test.ts` (per-file; <30s expected — pure fns over ~20×12 rows) |
| Full suite command | `npm test` (`vitest run`, whole tree) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VERF-01 | Per-bar combined-state edges legal; ≥1 FIRING + ≥1 INVALIDATED; summary emits fires/week + kill-rate vs band | unit (pure replay) | `npx vitest run src/lib/ict/replay.test.ts` | ❌ Wave 0 (new file) |
| VERF-02 | Same-snapshot AMD/SMT vs trigger contradiction predicates hold on all ARMED-or-better bars | unit (pure cross-assert) | `npx vitest run src/lib/ict/parity.test.ts` | ❌ Wave 0 (new file) |
| VERF-03 | Leg-matrix (4 single + all-stale + thin) yields STAND_ASIDE/degraded with provenance, never EXECUTE | unit (pure flaw→ticket chain) | `npx vitest run src/lib/ict/stale-drill.test.ts` | ❌ Wave 0 (new file) |
| Purity (guard) | New harness files introduce no `Date.now`/store imports | unit (existing guard) | `npx vitest run src/lib/ict/purity.test.ts` | ✅ exists (auto-covers new files via glob) |

### Sampling Rate
- **Per task commit:** quick run of the touched harness file (`npx vitest run src/lib/ict/<file>.test.ts`)
- **Per wave merge:** `npm test` full suite (must stay green incl. existing trigger/invalidation/ticket/store suites)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ict/replay.test.ts` — covers VERF-01 (fixture + driver + table + summary)
- [ ] `src/lib/ict/parity.test.ts` — covers VERF-02 (contradiction rules)
- [ ] `src/lib/ict/stale-drill.test.ts` — covers VERF-03 (leg matrix + thin-tier)
- [ ] Shared epoch/fixture helpers — inline per file following existing `nyMinuteEpoch`/`row`/`fixtureFvg` precedent (or one `replay-fixture.ts` helper co-located under `src/lib/ict/` if the planner prefers; must stay pure so the guard holds)
- [ ] Framework install: none — `vitest@5.0.0` present

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in scope; zero secrets added |
| V3 Session Management | No | No sessions; replay-owned cooldown is test-local state |
| V4 Access Control | No | No access boundaries; local test files |
| V5 Input Validation | Yes | Boundary `got-string` throws on malformed envelopes (`assertValidJudas`/`assertValidFvg`/`assertValidTrigger`/`assertValidSmt`/`assertValidRollover`/`assertValidStale`); null degrades honestly — replay fixtures must cover both (malformed-throw + null-degrade) |
| V6 Cryptography | No | No crypto; never hand-roll (n/a) |

### Known Threat Patterns for paper-ticket verification harness

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| False-precision ticket on stale/thin inputs (P8) | Information disclosure (misleading) | Degraded-with-provenance envelope + STAND_ASIDE on HARD flaws — asserted per leg-matrix cell, never assumed |
| Paper-taken-for-real (P4) | Spoofing | Banned-word test + PAPER chrome already shipped; Phase 18 adds no identifiers, must add none (`broker`/`placeOrder`/`Filled` grep stays green) |
| Flicker eroding trust (P3) | Tampering (signal integrity) | Transition-table + determinism (100-run byte-identical precedent from invalidation.test.ts) |

## Sources

### Primary (HIGH confidence)
- `src/lib/ict/trigger.ts` (read this session) — `TriggerOutput`/`TriggerReasonKey`/gate counting/cooldown/FVG selection/SMT suffix
- `src/lib/ict/invalidation.ts` (read this session) — `FatalFlawOutput`/first-match-wins order/SOFT-gating/D-12/D-15 carrier/synthetic-only opposite-sweep note
- `src/lib/ticket.ts` (read this session) — fixed derivation order/flaw precedence/`TicketDegraded`/R/R gate/sizing refusals
- `src/lib/ict/judas.ts`, `asia.ts`, `aggregate.ts`, `smt.ts`, `amd.ts`, `fvg.ts`, `levels.ts`, `types.ts`, `rollover.ts`, `thin-tier.ts` (read this session) — detector shapes, constants, wall-clock discipline
- `src/lib/store.ts` selectTriggerPure/selectFatalFlaw/selectTicket/commitTriggerLog/appendFiringLog (read this session) — single-snapshot order, refuse-null sets, degraded derivation
- `src/lib/ict/trigger.test.ts`, `invalidation.test.ts`, `ticket.test.ts` (`src/lib/ticket.test.ts`), `purity.test.ts`, `judas.test.ts`, `store.test.ts` (read this session) — fixture idioms, verbatim pins, determinism + coherence precedents
- `.planning/phases/15/15-CONTEXT.md`, `16/16-CONTEXT.md`, `17/17-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md`, `.planning/research/PITFALLS.md`, `.planning/research/ARCHITECTURE.md` (read this session)

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` P1 band-failure norm ("a trigger outside its band is a failing feature") — cited for the calibration-verdict decision

### Tertiary (LOW confidence)
- None — no web sources used; all providers disabled in project config. Anything not read above is tagged [ASSUMED].

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — runner + versions + config verified by direct read and version commands this session; zero new installs.
- Architecture: HIGH — all three units-under-test plus selectors plus fixture idioms read verbatim this session; replay/parity/drill patterns compose existing precedents.
- Pitfalls: HIGH — P1–P8 + recovery strategies + "Looks Done" checklist from in-repo PITFALLS.md, cross-checked against the flaw/trigger/ticket sources.

**Research date:** 2026-09-14
**Valid until:** 30 days (stable domain — locked in-repo contracts, no fast-moving deps)
