# Phase 15: WHY NOW Trigger Engine - Research

**Researched:** 2026-09-10
**Domain:** Deterministic three-gate ICT trigger fusion (killzone timing + confirmed London purge + displacement/FVG) over existing `src/lib/ict` detector outputs, plus Zustand firing-log slice
**Confidence:** HIGH (mechanics — every gate input verified by source read this session); MEDIUM (Azerbaijani prose wording — drafts need plan-time review per D-09)

## Summary

Phase 15 adds one pure fusion module (`src/lib/ict/trigger.ts`) that converts existing detector outputs — `judasSwing` confirmed sweeps, `amdPhase` context, `evaluateSMT` tag, `detectFVGs`+`applyMitigation` inventory — into a single honest verdict (`FIRE_LONG` / `FIRE_SHORT` / `ARMED` / `WAIT_FOR_MANIPULATION`) with verbatim Azerbaijani reasons, plus a capped firing-log slice in the Zustand store with a calibration-JSON serializer. No new dependencies, no new data legs, no UI panels (those belong to Phases 16–17).

The critical structural insight from this research: **all three gates can be made genuinely independent**, which is what makes the D-05 "2 of 3 → ARMED" counting meaningful. Timing is a clock check on the injected `asOf` (not derived from Judas, which would double-count the purge gate since `confirmed ⇒ candidate`). Purge is `judas.confirmed` on London rows only — D-01 falls out automatically because `judasSwing` marks any out-of-killzone sweep (including every NY-hours sweep) as `preRun`, never `candidate`/`confirmed` [VERIFIED: src/lib/ict/judas.ts:172-181]. Displacement magnitude re-checks `judas.displacementMult >= TRIGGER_DISP_MULT`, and the gate's independent contribution is resolving the entry-FVG handle (no FVG → no FIRE, downgrade to ARMED at best per D-04).

**Primary recommendation:** Build `evaluateTrigger({ judas, amd, smt, fvg, asOf, alreadyFired })` as a pure function taking detector-output types only (never raw candles), with `TRIGGER_KZ_START_MIN` / `TRIGGER_KZ_END_MIN` / `TRIGGER_DISP_MULT` / `TRIGGER_LOG_CAP` exported `CALIBRATION-PROVISIONAL` constants pinned by boundary tests in co-located `trigger.test.ts`; put cooldown state (`alreadyFired`) and the ~50-entry log in the store, keep the JSON download click-handler as a Phase 17 seam.

## User Constraints (from CONTEXT.md)

### Locked Decisions (verbatim — Implementation Decisions)

### Purge gate scope
- **D-01:** London-only — the purge gate consumes `judasSwing` confirmed output on London session rows only; NY-session sweeps never fire. No separate NY sweep detector in this phase.
- **D-02:** Confirmed-only — `judas.confirmed` is required; candidate sweeps (no displacement yet) can never satisfy the purge gate.

### Displacement gate
- **D-03:** Mirror Judas 0.5 — new `TRIGGER_DISP_MULT` constant seeded at 0.5× Asia height with `CALIBRATION-PROVISIONAL` comment, following the `DISP_MULT` precedent in `judas.ts`.
- **D-04:** Entry FVG required — the displacement gate returns the entry-FVG handle the Phase 17 ticket consumes; no resolvable FVG means no FIRE (downgrade to ARMED at best).

### ARMED + cooldown
- **D-05:** Any 2 of 3 gates passing yields ARMED; 3/3 yields FIRE; 0–1 yields QUIET/WAIT_FOR_MANIPULATION.
- **D-06:** Per-session cooldown — one FIRE per session date; same-session repeat evaluations deduped, preventing repeat-fire spam.

### Firing log
- **D-07:** Minimal entry — `asOf`, verdict, per-gate booleans, direction, reason key. Enough for the 1–4/week calibration review without snapshotting full detector outputs.
- **D-08:** JSON download export — capped ~50 entries with a calibration-JSON download; no on-table-only shortcut.

### Verdict prose + direction
- **D-09:** Planner drafts verbatim Azerbaijani templates for FIRE_LONG / FIRE_SHORT / ARMED / WAIT_FOR_MANIPULATION following the §3/AMD/SMT prose precedent; reviewed at plan time.
- **D-10:** Sweep-side direction map — Asia-HIGH sweep + bearish displacement → FIRE_SHORT; Asia-LOW sweep + bullish displacement → FIRE_LONG.

### Agent's Discretion
None — user decided every area explicitly.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRIG-01 | FIRE_LONG / FIRE_SHORT / WAIT_FOR_MANIPULATION verdict from the three-gate engine with verbatim Azerbaijani reason | Gate-independence design (§Architecture Patterns P1), direction map (§P2 — direction derives from `sweepSide` alone), prose precedent + candidate drafts (§Code Examples) |
| TRIG-02 | ARMED intermediate state + per-session cooldown/dedup | 2-of-3 counting rule (§P1), cooldown-as-input pattern (§P3 — `alreadyFired` boolean keeps `ict/` pure) |
| TRIG-03 | Firing log capped ~50 with calibration-JSON export | Minimal entry shape D-07 (§P4), store slice + pure serializer with Phase 17 download seam (§P5) |
| TRIG-04 | Exported `TRIGGER_*` constants with `CALIBRATION-PROVISIONAL` comments, pinned by tests; 1–4 fires/week band | Constant table (§Standard Stack) with seeded values + boundary-test map (§Validation Architecture) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Three-gate evaluation (`evaluateTrigger`) | ICT pure layer (`src/lib/ict/trigger.ts`) | — | Methodology fusion like `amd.ts`: detector outputs + injected `asOf` only, no clock reads, no store imports (purity guard enforced) |
| Verbatim Azerbaijani reasons | ICT pure layer | — | `amdPhase` precedent: deterministic sentence selection, tests pin strings with `toBe` |
| Cooldown key + dedup decision | Zustand store (caller) | — | Stateful (reads firing log); injected into pure fn as `alreadyFired` boolean so `ict/` stays pure |
| Firing-log entries + 50-cap | Zustand store slice | — | Client state per Zustand-only constraint; cap prevents the unbounded-store performance trap |
| Calibration-JSON serializer | Store module scope (pure fn) | — | Trivial serialization, not ICT methodology; tested without rendering |
| Download click (Blob/anchor) | Phase 17 UI panel | — | No UI in Phase 15 boundary; serializer output is the seam |
| `selectTrigger` derived selector | Zustand store | — | Derivation, never stored state — trigger can never desync from detectors |

## Standard Stack

### Core (consumed detectors — all verified in-repo, zero new installs)

| Module | Verified export / value | Purpose in trigger | Why standard |
|--------|------------------------|-------------------|--------------|
| `src/lib/ict/judas.ts` | `export const KILLZONE_START_MIN = 120;` [VERIFIED: src/lib/ict/judas.ts:17], `export const KILLZONE_END_MIN = 300;` [VERIFIED: src/lib/ict/judas.ts:19], `export const DISP_MULT = 0.5;` [VERIFIED: src/lib/ict/judas.ts:21], `export const CONFIRM_WINDOW = 4;` [VERIFIED: src/lib/ict/judas.ts:23], `export const TOL_EPS = 1e-9;` [VERIFIED: src/lib/ict/judas.ts:25] | Purge-gate source; killzone window seeds `TRIGGER_KZ_*` aliases; `DISP_MULT` seeds `TRIGGER_DISP_MULT` | D-01/D-02/D-03 locked decisions point here directly |
| `src/lib/ict/judas.ts` types | `export interface JudasOutput { candidate: boolean; confirmed: boolean; preRun: boolean; sweepSide: SweepSide \| null; sweepTime: number \| null; displacementMult: number; }` [VERIFIED: src/lib/ict/judas.ts:29-36] | `TriggerInput.judas` type; `confirmed` + `sweepSide` + `displacementMult` drive gates 2–3 and direction | Type-level enforcement against logic fork (Pitfall 6) |
| `src/lib/ict/amd.ts` | `export const NY_SESSION_START_MIN = 570;` [VERIFIED: src/lib/ict/amd.ts:19], `export const NY_SESSION_END_MIN = 960;` [VERIFIED: src/lib/ict/amd.ts:21]; reasons e.g. `'Asia Range Təmizlənməyib. London Judas Swing Gözlənilir.'` [VERIFIED: src/lib/ict/amd.ts:48], `'Asia Range Təmizlənib. London Judas Swing Baş verib.'` [VERIFIED: src/lib/ict/amd.ts:53] | Timing context + prose precedent; NY branch preserves phase with `'Gözlənilir — NY sessiyası v2.0-da ölçülmür.'` [VERIFIED: src/lib/ict/amd.ts:56] | §3-vs-trigger parity (Phase 18 VERF-02) starts from shared vocabulary |
| `src/lib/ict/fvg.ts` | `export const FVG_MAP_BOUND = 20;` [VERIFIED: src/lib/ict/fvg.ts:8], `export type FvgPolarity = 'BULLISH' \| 'BEARISH';` [VERIFIED: src/lib/ict/fvg.ts:10], `export interface FvgGap { polarity: FvgPolarity; top: number; bottom: number; originDate: string; mitigated: boolean; }` [VERIFIED: src/lib/ict/fvg.ts:12-18] | Entry-FVG handle source: `detectFVGs` + `applyMitigation` run at the selector boundary; trigger selects by polarity | D-04 handle is a `FvgGap` — the exact shape Phase 17 ticket consumes (top/bottom/polarity/originDate) |
| `src/lib/ict/smt.ts` | `export const SMT_TOL_BPS = 25;` [VERIFIED: src/lib/ict/smt.ts:9], `export const CORR_MIN = 0.7;` [VERIFIED: src/lib/ict/smt.ts:12], `export type SmtOutput = SmtSignal \| SmtSuppressed;` [VERIFIED: src/lib/ict/smt.ts:45] | Read-only agree-tag suffix in FIRE prose; carried in output for parity | Never a 4th gate — would break D-05 counting |
| `src/lib/ict/asia.ts` | `export const ASIA_START_NY_HOUR = 20;` [VERIFIED: src/lib/ict/asia.ts:14], `export interface AsiaRange { high: number; low: number; height: number; sessionDate: string; }` [VERIFIED: src/lib/ict/asia.ts:18-23] | Displacement denominator context (already inside `judas.displacementMult`) | No direct trigger use — flows through JudasOutput |
| `src/lib/ict/aggregate.ts` | `export const NY_TZ = 'America/New_York';` [VERIFIED: src/lib/ict/aggregate.ts:12] | Wall-clock discipline for timing gate + session-date key (`formatInTimeZone`) | Single timezone source; DST-safe per-candle precedent |
| `src/lib/ict/types.ts` | `export interface IntradayCandle { time: number; open: number; high: number; low: number; close: number; forming?: boolean; }` [VERIFIED: src/lib/ict/types.ts:54-62] | Test-fixture row shape only — trigger takes detector outputs, never candle arrays | Keeps the anti-fork signature review checkable |

### New constants (to be created, seeded values prescribed)

| Constant | Seeded value | Purpose | Calibration note |
|----------|-------------|---------|------------------|
| `TRIGGER_KZ_START_MIN` | `120` (mirrors `KILLZONE_START_MIN`) | Timing-gate window open, exclusive | `CALIBRATION-PROVISIONAL` — alias (not import) so the fire-rate band can be tuned without touching Judas detection semantics |
| `TRIGGER_KZ_END_MIN` | `300` (mirrors `KILLZONE_END_MIN`) | Timing-gate window close, exclusive | Same as above |
| `TRIGGER_DISP_MULT` | `0.5` (mirrors `DISP_MULT`) | Displacement re-check vs `judas.displacementMult` | D-03 locked; `CALIBRATION-PROVISIONAL` |
| `TRIGGER_LOG_CAP` | `50` | Firing-log cap | D-08 locked (~50); overflow drops oldest with counter |

### Supporting (already installed — verified)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns-tz` | `^3.2.0` [VERIFIED: package.json:17] | `formatInTimeZone` / `fromZonedTime` for timing gate, session-date key, test fixtures | Every wall-clock operation; never hand-rolled offsets |
| `vitest` | `^5.0.0` [VERIFIED: package.json:41], runner `vitest/5.0.0` (verified via `npx vitest --version` this session) | `trigger.test.ts` + store selector/log tests | `include: ['src/**/*.test.ts', ...]` [VERIFIED: vitest.config.ts:8]; node environment, 15s timeout |
| `zustand` | `^5.0.15` [VERIFIED: package.json:27] | `selectTrigger` + firing-log slice | Derived selectors only, never stored trigger state |

**Installation:** None. `npm install` runs zero new packages in this phase.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `TRIGGER_KZ_*` aliases | Direct import of `KILLZONE_*` | Import is a single source of truth but couples fire-rate tuning to Judas detection; aliases chosen so the 1–4/week band is tunable without touching detection semantics. Tests pin both values so drift is deliberate |
| `alreadyFired` input boolean | Log lookup inside `evaluateTrigger` | Lookup would need store/clock access inside `ict/` — purity violation. Boolean injection keeps the fn pure and unit-testable |
| WAIT output on degraded inputs | `null` on any null detector input | `null` hides *why*; WAIT with per-gate booleans preserves the blocked-signal transparency rule and gives Phase 18 replay a verdict on every bar. `null` reserved for the throw-path only (try/catch-never-throw precedent [VERIFIED: src/lib/store.ts:695-704]) |

## Package Legitimacy Audit

No external packages are installed in this phase. Standard stack is 100% in-repo modules plus already-installed `date-fns-tz` / `vitest` / `zustand` (versions verified against `package.json` above). Legitimacy gate skipped with reason: zero new registry lookups required.

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious (SUS):** none.

## Architecture Patterns

### System Architecture Diagram

```
60s staggered poll (unchanged: :00 NQ / :15 nq1h / :30 ES / :45 nq15m)
  │  per-leg envelopes, per-leg stale flags (never merged)
  ▼
Existing selectors: selectJudas (nq15m+asia) · selectSMT (nq/es) · selectAMD (shared asOf)
  │  + inline FVG derivation: detectFVGs(nq) → applyMitigation (try/catch, stale→null)
  ▼
selectTrigger (NEW): sharedEpoch(get) → evaluateTrigger({ judas, amd, smt, fvg, asOf, alreadyFired })
  │  refuse-WAIT (not null) on null detector inputs; null only on throw-path
  ├─ verdict + reason + entryFvg ──► firing-log slice (append iff ARMED-or-better,
  │                                   FIRE deduped by NY session date, cap 50)
  └─ TriggerOutput ──► Phase 16 flaw snapshot input (serializable: no class instances,
                        FvgGap is plain data) + Phase 17 ticket entry handle
```

A reader traces the primary use case: London sweep confirms on 15M → next poll `selectJudas` returns `confirmed` → `selectTrigger` evaluates 3/3 inside killzone with a resolvable bullish/bearish FVG → `FIRE_LONG`/`FIRE_SHORT` + entry handle → one log entry for the session → repeat polls return ARMED (already-fired).

### Recommended Project Structure

```
src/
├── lib/ict/
│   ├── trigger.ts        # NEW — TriggerInput/Output, TriggerVerdict, TRIGGER_* consts, evaluateTrigger
│   ├── trigger.test.ts   # NEW — gate table, boundary pins, choppy-QUIET, cooldown, prose pins
│   ├── judas.ts          # UNCHANGED (trigger reads JudasOutput, never edits)
│   ├── amd.ts            # UNCHANGED
│   ├── smt.ts / fvg.ts   # UNCHANGED
├── lib/
│   ├── store.ts          # MODIFIED — sharedEpoch helper, selectTrigger, firingLog slice + serializer
│   ├── store.test.ts     # MODIFIED — selector + log-cap + dedup + serializer tests
```

### Pattern 1: Independent three-gate counting (D-05 made meaningful)
**What:** Gate 1 = killzone clock membership of `asOf` (`TRIGGER_KZ_START_MIN < nyMinutes < TRIGGER_KZ_END_MIN`, strict inequality mirroring the Judas edge discipline [VERIFIED: src/lib/ict/judas.ts:172]); Gate 2 = `judas !== null && judas.confirmed === true && sweepSide !== null`; Gate 3 = `judas.displacementMult >= TRIGGER_DISP_MULT` AND a resolvable entry FVG of the direction polarity exists. Count passes → 3 FIRE, 2 ARMED, 0–1 WAIT_FOR_MANIPULATION.
**When to use:** Always — this is the TRIG-01/TRIG-02 core.
**Why independent:** `confirmed ⇒ candidate` inside Judas, so a timing gate derived from `candidate` would double-count Gate 2 and make "2 of 3" collapse. The clock check is the only gate Judas cannot satisfy on its own.

### Pattern 2: Direction from `sweepSide` alone (D-10)
**What:** `HIGH → FIRE_SHORT`, `LOW → FIRE_LONG`. `JudasOutput` carries displacement as magnitude only (`Math.max(0, maxDist) / height` [VERIFIED: src/lib/ict/judas.ts:215]) — there is no separate displacement-direction signal to consult. HIGH sweeps confirm via closes back *below* the Asia high (bearish displacement); LOW mirrors. So the D-10 map reduces to a total function of `sweepSide`, with `null` sweepSide forcing the purge gate false (no direction without a side).
**When to use:** Direction resolution inside `evaluateTrigger` after the 3/3 check.

### Pattern 3: Cooldown as an injected boolean (D-06 without purity breach)
**What:** `evaluateTrigger` takes `alreadyFired: boolean`. Caller (`selectTrigger`) derives it from the firing log: any `FIRE_*` entry whose session key equals the current evaluation's NY-date key. When `alreadyFired` is true and gates are 3/3, verdict is ARMED with an already-fired reason variant (not FIRE), and no log append occurs.
**Session key:** NY calendar date of `asOf` via `formatInTimeZone(asOf*1000, NY_TZ, 'yyyy-MM-dd')` — one FIRE per NY date. Chosen over Asia `sessionDate` because the cooldown is about evaluation cadence (poll-driven, ~daily), not the 20:00 Asia open anchor [ASSUMED — needs planner confirmation; see A2].
**When to use:** Every `selectTrigger` call; unit-tested with `alreadyFired: true/false` matrix.

### Pattern 4: Minimal firing-log entry (D-07)
**What:** `{ asOf: number, verdict: TriggerVerdict, gates: { timing: boolean, purge: boolean, displacement: boolean }, direction: 'LONG' | 'SHORT' | null, reasonKey: string, sessionDate: string }`. No detector-output snapshots — Phase 18 replay reconstructs verdicts from gate booleans + constant versions. Append only ARMED-or-better; cap at `TRIGGER_LOG_CAP` (drop oldest); FIRE deduped by `sessionDate`.
**When to use:** Store slice `firingLog` + `appendFiringLog` with the cap/dedup logic in one place.

### Pattern 5: Serializer/log-click seam with Phase 17 (D-08)
**What:** Phase 15 delivers `firingLogToJson(entries): string` (pure, module scope in `store.ts`, unit-tested incl. cap-shape). The Blob/`createObjectURL`/anchor-click wiring lives in Phase 17's panels — no component or DOM code in Phase 15. (Repo has no existing download precedent — grep for `createObjectURL|Blob` in `components/` returned nothing this session — so Phase 17 establishes the pattern fresh.)
**When to use:** Calibration export; the JSON includes constant versions (`TRIGGER_DISP_MULT`, kz window) so reviews map fires to threshold sets.

### Anti-Patterns to Avoid
- **Trigger taking candle arrays:** any `rows: IntradayCandle[]` parameter on `evaluateTrigger` is a logic fork (Pitfall 6) — detector-output types only. The sole exception path is none: FVG inventory arrives precomputed as `FvgGap[] | null`.
- **`asOf` optional with `?? Date.now()` fallback inside `ict/`:** fails the purity guard (`text.includes('Date.now(')` [VERIFIED: src/lib/ict/purity.test.ts:33]). The `selectAMD` epoch fallback (`nq1h.lastUpdatedISO` → `Date.now()` [VERIFIED: src/lib/ict/../store.ts:750-766], i.e. `src/lib/store.ts:755-761`) lives at the caller boundary where it is legal — extract it into `sharedEpoch(get)` and reuse, don't duplicate.
- **SMT as a gate or a veto:** suppressed SMT must never block FIRE (it is a read-only tag); otherwise every `CORR_DECOUPLED` window permanently quiets the terminal.
- **AMD phase as a gate:** `manipulation` requires Judas candidate/confirmed, so it is purge-coupled like `candidate`. Carry `amd` in input/output for parity and downstream context, but it does not vote.
- **Reason-string interpolation with numbers/prices:** breaks verbatim `toBe` pins and §3-parity. Deterministic sentence selection only — one base sentence plus at most one fixed SMT suffix (the `amdPhase` assembly precedent: base reason + at most one SMT suffix [VERIFIED: src/lib/ict/amd.ts:163]).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sweep detection / killzone membership | Custom sweep loop in trigger | `judasSwing` + `JudasOutput.confirmed` | First-sweep-wins, dual-pierce resolution, strict killzone edges, confirm-window displacement — all pinned by 264 lines of judas tests; a copy diverges (Pitfall 6) |
| NY wall-clock minutes | `getHours()` arithmetic, fixed UTC offsets | `formatInTimeZone(ts, NY_TZ, 'H'/'m')` per-call | DST-transition drift; the per-candle IANA discipline is proven across March + November transitions |
| Session-date key | String-slicing ISO timestamps | `formatInTimeZone(..., 'yyyy-MM-dd')` in `NY_TZ` | Same DST/host-TZ hazard as above |
| FVG detection / mitigation | Inline gap scan | `detectFVGs` + `applyMitigation` at selector boundary | Boundary-equality-is-touch, close-through fill, trailing-20 bound, stale-origin tolerance — all pinned |
| SMT agreement | Fresh correlation math | `SmtOutput` read + amd-style agree-tag | `CORR_MIN` gate + rollover suppression already encoded; trigger only reads |
| Purity enforcement | Reviewer eyeballing | Existing `purity.test.ts` glob guard (fails on `Date.now(`, zustand/store imports [VERIFIED: src/lib/ict/purity.test.ts:18-44]) | Automatic; new `trigger.ts` is scanned with zero config change |
| Test epoch fixtures | Hand-computed epoch ints | `fromZonedTime` + `nyMinuteEpoch`/`block15` builder idiom from `judas.test.ts` | DST-correct by construction; copy the builders, don't invent new ones |

**Key insight:** Phase 15 invents no detection math — it is a counting and selection layer over outputs whose edge cases (dual-pierce ties, preRun windows, wick-vs-close mitigation, suppressed SMT) are already pinned by ~300 green tests [CITED: 15-CONTEXT.md §Existing Code Insights]. Every line of re-implemented detection is a future §3-vs-trigger disagreement.

## Common Pitfalls

### Pitfall 1: Coupled gates make ARMED meaningless
**What goes wrong:** Timing derived from `judas.candidate`, displacement assumed from `confirmed` — then any confirmed sweep inside the window is trivially 3/3, and ARMED never appears except on pathological inputs.
**Why it happens:** `confirmed ⇒ candidate ⇒ displacement ≥ dispMult` is a chain inside one detector; gating three times on one chain counts one fact thrice.
**How to avoid:** Pattern 1 — timing is the independent clock check; displacement gate's independent work is FVG resolution (which fails on its own whenever the required-polarity inventory is empty/mitigated).
**Warning signs:** Gate table tests where no fixture yields exactly-2-of-3; ARMED branch uncovered.

### Pitfall 2: NY sweep fires through the purge gate
**What goes wrong:** A 10:00 NY sweep confirms and FIREs, violating D-01.
**Why it happens:** Forgetting that `judasSwing` is London-windowed — any sweep at minutes ≤120 or ≥300 returns `preRun` with `candidate: false, confirmed: false` [VERIFIED: src/lib/ict/judas.ts:172-181], so `confirmed` can only be true for London rows *by construction*. No extra session filter is needed, but a planner-added "NY handling" branch could accidentally bypass it.
**How to avoid:** Trust the `confirmed` check alone; add an explicit test: NY-hours sweep fixture → `confirmed === false` → purge gate false → never FIRE. Do NOT add session-branch code in trigger.
**Warning signs:** Any `NY_SESSION` import in `trigger.ts`.

### Pitfall 3: Direction resolved from prose or from SMT instead of `sweepSide`
**What goes wrong:** LONG/SHORT flickers or contradicts the swept side when SMT is suppressed/NO-SIGNAL.
**Why it happens:** Treating D-10's "bearish/bullish displacement" as a separate signal to detect, when `JudasOutput` only carries magnitude.
**How to avoid:** Pattern 2 — total map `HIGH→SHORT, LOW→LONG`; SMT only appends an agree-suffix when unsuppressed and direction agrees (mirror `smtTag` concordance: HIGH+BEARISH, LOW+BULLISH [VERIFIED: src/lib/ict/amd.ts:102-110]).
**Warning signs:** Direction logic referencing `smt.direction` in a non-suffix position.

### Pitfall 4: FVG-timeframe mismatch (D1 gaps vs 15M trigger)
**What goes wrong:** `detectFVGs`/`applyMitigation` run on D1 daily candles while evaluation is intraday — a gap mitigated intraday-after-close still reads active, or the selector passes an empty inventory and FIRE becomes unreachable.
**Why it happens:** Two candle contracts (D1 date-strings vs intraday epochs) meeting in one selector.
**How to avoid:** Derive FVG strictly from the same `nq.candles` + `asOfBaku` the `selectLiquidityPath` precedent uses (`detectFVGs` → `applyMitigation` → `detectTransition` chain [VERIFIED: src/lib/store.ts:770-781]); empty/stale → `fvg: null` → displacement gate fails honestly to ARMED, never throws. Selection rule: most recent `originDate` of the required polarity (deterministic, testable).
**Warning signs:** Trigger importing `IntradayCandle` for FVG work; origin-date comparisons against epoch ints.

### Pitfall 5: Cooldown implemented with clock reads or stored verdicts
**What goes wrong:** `evaluateTrigger` reads the log or `Date.now()` → purity violation + untestable time logic.
**Why it happens:** "One FIRE per session" feels stateful, so state creeps into the pure layer.
**How to avoid:** Pattern 3 — boolean injection; session-key computation at the caller boundary with `formatInTimeZone`.
**Warning signs:** `firingLog` or `Date` identifiers in `trigger.ts`; fake timers in `trigger.test.ts` (injected instants are the established idiom instead).

### Pitfall 6: Unbounded log / per-bar FIRE spam
**What goes wrong:** Log grows every 60s poll while conditions hold; store balloons; Phase 18 replay drowns.
**Why it happens:** Appending FIRE on every passing evaluation instead of once per session; no cap.
**How to avoid:** D-06 dedup (session key) + `TRIGGER_LOG_CAP` with oldest-drop; ARMED repeats: append (they are calibration signal) but bounded by the same cap. Document the overflow-counter behavior in the slice.
**Warning signs:** No cap test; log-length assertions missing; `firingLog.length` unbounded in long-session manual test.

## Code Examples

### Trigger I/O shape (follows `amd.ts` envelope precedent)

```typescript
// src/lib/ict/trigger.ts — new module (naming follows evaluateTrigger per CONTEXT integration points)
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { AmdOutput } from '@/src/lib/ict/amd';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { FvgGap } from '@/src/lib/ict/fvg';

export type TriggerVerdict = 'FIRE_LONG' | 'FIRE_SHORT' | 'ARMED' | 'WAIT_FOR_MANIPULATION';
export type TriggerDirection = 'LONG' | 'SHORT' | null;
export type TriggerReasonKey =
  | 'FIRE_LONG' | 'FIRE_SHORT'
  | 'ARMED_MISSING_TIMING' | 'ARMED_MISSING_PURGE' | 'ARMED_MISSING_DISPLACEMENT' | 'ARMED_ALREADY_FIRED'
  | 'WAIT_FOR_MANIPULATION';

export interface TriggerInput {
  judas: JudasOutput | null;
  amd: AmdOutput | null;          // carried for parity + downstream; does NOT vote (see Anti-Patterns)
  smt: SmtOutput | null;          // read-only agree-tag only; never a gate
  fvg: FvgGap[] | null;           // active unmitigated inventory from selector boundary
  asOf: number;                   // injected epoch seconds — never a clock read
  alreadyFired: boolean;          // cooldown state injected by caller (D-06)
}

export interface TriggerOutput {
  verdict: TriggerVerdict;
  direction: TriggerDirection;
  reasonKey: TriggerReasonKey;
  reason: string;                 // verbatim Azerbaijani, test-pinned with toBe
  gates: { timing: boolean; purge: boolean; displacement: boolean };
  entryFvg: FvgGap | null;        // D-04 handle Phase 17 consumes; null unless FIRE
  inputs: { judas: JudasOutput | null; amd: AmdOutput | null; smt: SmtOutput | null };
}
```

### Gate evaluation sketch (strict killzone edges mirror Judas T-08-04)

```typescript
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1–4 fires/week (TRIG-04).
export const TRIGGER_KZ_START_MIN = 120; // mirrors KILLZONE_START_MIN
export const TRIGGER_KZ_END_MIN = 300;   // mirrors KILLZONE_END_MIN
export const TRIGGER_DISP_MULT = 0.5;    // D-03: mirrors DISP_MULT
export const TRIGGER_LOG_CAP = 50;       // D-08: firing-log cap

function timingGate(asOf: number): boolean {
  const mins = nyMinutesOf(asOf); // formatInTimeZone(ts, NY_TZ, 'H'/'m') — judas.ts:60-64 idiom
  return mins > TRIGGER_KZ_START_MIN && mins < TRIGGER_KZ_END_MIN;
}

function purgeGate(judas: JudasOutput | null): judas is JudasOutput & { sweepSide: 'HIGH' | 'LOW' } {
  return judas !== null && judas.confirmed === true && judas.sweepSide !== null;
  // D-01 falls out: out-of-killzone sweeps are preRun (candidate/confirmed false) by construction.
  // D-02 falls out: candidate-only (confirmed false) fails here.
}

function displacementGate(judas: ..., fvg: FvgGap[] | null, direction: ...): { pass: boolean; entryFvg: FvgGap | null } {
  if (!(judas.displacementMult >= TRIGGER_DISP_MULT)) return { pass: false, entryFvg: null };
  const needPolarity = direction === 'LONG' ? 'BULLISH' : 'BEARISH'; // D-10 via sweepSide map
  const pick = (fvg ?? []).filter((g) => g.polarity === needPolarity).sort(byOriginDate).at(-1) ?? null;
  return pick === null ? { pass: false, entryFvg: null } : { pass: true, entryFvg: pick }; // D-04
}
```

### Candidate prose drafts (Azerbaijani — planner reviews/locks at plan time per D-09) [ASSUMED]

```typescript
// Suffix precedent: ` ${SMT_AGREE_TAG}` appended only on concordance ('SMT razılaşır.' [VERIFIED: src/lib/ict/amd.ts:57])
const REASON_FIRE_LONG  = 'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.';
const REASON_FIRE_SHORT = 'WHY NOW SHORT: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.';
const REASON_ARMED_MISSING_TIMING       = 'WHY NOW ARMED: Quruluş hazırdır — killzone pəncərəsi gözlənilir.';
const REASON_ARMED_MISSING_PURGE        = 'WHY NOW ARMED: Quruluş hazırdır — London Judas təsdiqi gözlənilir.';
const REASON_ARMED_MISSING_DISPLACEMENT = 'WHY NOW ARMED: Quruluş hazırdır — displacement təsdiqi və giriş FVG gözlənilir.';
const REASON_ARMED_ALREADY_FIRED        = 'WHY NOW ARMED: Bu sessiyada siqnal artıq verilib — təkrar giriş yoxdur.';
const REASON_WAIT = 'WAIT FOR MANIPULATION: Zaman, süpürmə və displacement razılaşmır — manipulyasiya gözlənilir.';
```

### `selectTrigger` shape (follows `selectJudas`/`selectAMD` refuse + try/catch precedent)

```typescript
// store.ts — NEW selector beside selectAMD; shares one epoch helper (ARCHITECTURE Pattern 2)
selectTrigger: () => {
  try {
    const judas = get().selectJudas();   // null on nq15m stale [VERIFIED: src/lib/store.ts:736-748]
    const smt = get().selectSMT();       // null on nq/es stale, carried honestly
    const amd = get().selectAMD(sharedEpoch(get)); // single time truth — no torn reads
    const fvg = deriveActiveFvg(get());  // detectFVGs+applyMitigation on nq.candles; null on stale/empty
    const asOf = sharedEpoch(get);
    const alreadyFired = hasFireForSession(get().firingLog, nyDateOf(asOf));
    return evaluateTrigger({ judas, amd, smt, fvg, asOf, alreadyFired });
  } catch {
    return null; // throw-path only; degraded inputs yield honest WAIT, not null
  }
},
```

### Firing-log slice + serializer (D-07/D-08)

```typescript
export interface FiringLogEntry {
  asOf: number;
  verdict: TriggerVerdict;
  gates: { timing: boolean; purge: boolean; displacement: boolean };
  direction: TriggerDirection;
  reasonKey: TriggerReasonKey;
  sessionDate: string; // NY-date key, D-06 dedup + replay reconstruction
}
// appendFiringLog: append iff verdict !== 'WAIT_FOR_MANIPULATION';
//   FIRE_* skipped when a FIRE_* with same sessionDate exists (D-06);
//   drop oldest beyond TRIGGER_LOG_CAP (with overflow counter, cf. PITFALLS performance trap).
// firingLogToJson(entries): string — includes { entries, thresholds: { TRIGGER_DISP_MULT, TRIGGER_KZ_START_MIN, TRIGGER_KZ_END_MIN }, exportedAt: <caller ISO> }.
//   Pure + unit-tested; Blob/anchor download wiring is the Phase 17 seam.
```

### Test-fixture idiom (copy from `judas.test.ts`, don't invent)

```typescript
// Builders verified in-repo: nyMinuteEpoch/fromZonedTime DST-aware conversion,
// block15(SESSION, '02:00') full-killzone strip, row(t, price, overrides),
// fixtureRange() { high: 20100, low: 20000, height: 100 }.
// Trigger gate-table tests reuse these + fixtureJudas()/signalSmt() builders
// from amd.test.ts (Partial-override style), plus FVG builders from fvg.test.ts
// candle()/dated() and judas full-conjunction rows (sweep + reversal close).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-detector badges (§3 Judas/SMT markers fire independently) | Three-gate conjunctive fusion with ARMED tier | Phase 15 (this phase) | FIRE means timing+purge+displacement agree; near-miss reads ARMED instead of silence or spam |
| Thresholds as magic numbers | Exported `CALIBRATION-PROVISIONAL` constants pinned by boundary tests (`DISP_MULT`, `SMT_TOL_BPS` precedent) | v2.0 convention, extended here with `TRIGGER_*` | Recalibration is a deliberate constant change with failing-then-passing tests |
| Per-feature `asOf` derivation | Shared epoch helper for AMD + trigger | Phase 15 (`sharedEpoch` extract) | §3-vs-trigger can never disagree on time (parity prerequisite for Phase 18 VERF-02) |

**Deprecated/outdated:**
- `candidate`-based timing: superseded — timing is the clock check (Pattern 1); `candidate` stays inside Judas where it belongs.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Candidate Azerbaijani prose drafts (wording, not structure) | Code Examples | LOW — D-09 explicitly routes prose review to plan time; structure (4 templates + ARMED variants + SMT suffix rule) is the load-bearing part and follows verified precedent |
| A2 | Cooldown session key = NY calendar date of `asOf` (not Asia `sessionDate`) | Patterns P3 | MEDIUM — affects D-06 dedup boundary around midnight NY; planner confirms, test pins whichever is locked |
| A3 | `TRIGGER_KZ_*` as aliases (not direct `KILLZONE_*` imports) | Standard Stack | LOW — both work mechanically; alias choice optimizes for independent fire-rate tuning. Tests pin values either way |
| A4 | Null detector inputs → honest WAIT (not selector `null`) | Alternatives | MEDIUM — Phase 16's shared-snapshot design inherits this; if planner prefers strict refuse-null, parity/replay implications must be re-checked |
| A5 | Entry-FVG selection = most recent `originDate` of required polarity | Pitfall 4 / Examples | MEDIUM — Phase 17 ticket consumes the handle; alternative (nearest-to-price) changes ticket entry semantics. Locked by test either way |
| A6 | No Blob/download precedent exists in repo (grep found nothing) | Pattern P5 | LOW — even if a helper exists elsewhere, Phase 17 seam (pure serializer now, click later) is still the correct split |

## Open Questions

1. **FVG staleness intraday**
   - What we know: D1 gaps + `applyMitigation` on closed D1 rows is the established inventory (selector precedent verified in store).
   - What's unclear: Whether a gap mitigated by this morning's 15M price action (invisible to D1 closes) should fail the displacement gate same-day.
   - Recommendation: Ship D1-only per precedent; log the question for the calibration loop — the firing log will reveal if stale-FVG FIREs cluster.

2. **ARMED log volume**
   - What we know: TRIG-03 logs every evaluation reaching ARMED-or-better; cap is ~50.
   - What's unclear: Whether every 60s-poll ARMED repeat should append (noisy but honest rate signal) or be deduped like FIRE.
   - Recommendation: Append all ARMED (rate signal is the calibration asset), rely on cap + overflow counter; revisit only if manual testing shows the cap churning within one session.

3. **1–4 fires/week band ownership**
   - What we know: Band is pre-agreed acceptance (TRIG-04); measurement needs live fires.
   - What's unclear: Nothing for Phase 15 to decide — verification belongs to Phase 18.
   - Recommendation: Phase 15 ships the log + serializer that make the band checkable; no tuning in this phase.

## Environment Availability

Pure code/config phase — no external services, no new runtimes, no browser APIs in Phase 15 scope (download click is Phase 17).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vitest + tsc | ✓ | v24.11.1 (verified this session) | — |
| npm | test scripts | ✓ | 11.6.2 (verified this session) | — |
| vitest | `trigger.test.ts`, store tests | ✓ | 5.0.0 (verified this session) | — |
| `date-fns-tz` | wall-clock gate + fixtures | ✓ (installed) | ^3.2.0 [VERIFIED: package.json:17] | — |
| TypeScript | `npm run build` / tsc gate | ✓ (installed) | ^5 [VERIFIED: package.json:40] | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.0.0 |
| Config file | `vitest.config.ts` (node env, `src/**/*.test.ts`, 15s timeout) |
| Quick run command | `npx vitest run src/lib/ict/trigger.test.ts` |
| Full suite command | `npm test` (must stay 300/300-green baseline + new tests) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRIG-01 | 3/3 gates → FIRE_LONG (LOW sweep) / FIRE_SHORT (HIGH sweep) with verbatim reason | unit (gate table) | `npx vitest run src/lib/ict/trigger.test.ts` | ❌ Wave 0 — create |
| TRIG-01 | Boundary: disp just-below 0.5 → ARMED; just-above → FIRE; killzone edge minutes 120/300 exclusive → timing false | unit (boundary pins) | same | ❌ Wave 0 — create |
| TRIG-01 | Choppy-sideways fixture (no sweep) → WAIT_FOR_MANIPULATION, 0–1 gates | unit (spam-guard fixture) | same | ❌ Wave 0 — create |
| TRIG-01 | Constants pinned: `TRIGGER_DISP_MULT === 0.5`, kz window `120/300`, `TRIGGER_LOG_CAP === 50` | unit (constant pins) | same | ❌ Wave 0 — create |
| TRIG-02 | Exactly-2-of-3 matrix (each missing gate) → ARMED + matching reasonKey | unit | same | ❌ Wave 0 — create |
| TRIG-02 | `alreadyFired: true` + 3/3 → ARMED_ALREADY_FIRED, no FIRE | unit | same | ❌ Wave 0 — create |
| TRIG-02 | No-FVG → max ARMED even at 3/3 otherwise (D-04 downgrade) | unit | same | ❌ Wave 0 — create |
| TRIG-02 | NY-hours sweep → purge false → never FIRE (D-01) | unit | same | ❌ Wave 0 — create |
| TRIG-03 | Log append/cap-50/oldest-drop/FIRE-session-dedup; serializer shape incl. threshold versions | unit (store tests) | `npx vitest run src/lib/store.test.ts` | ❌ Wave 0 — extend |
| TRIG-04 | Every `TRIGGER_*` has `CALIBRATION-PROVISIONAL` + boundary test | convention check (grep + pins) | same commands | ❌ Wave 0 — create |
| Purity | `trigger.ts` passes no-clock/no-store guard; determinism (same inputs → byte-identical) | unit (existing guard + new test) | `npx vitest run src/lib/ict/purity.test.ts` | ✅ guard exists |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/ict/trigger.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ict/trigger.test.ts` — gate table + boundaries + choppy-QUIET + cooldown matrix + prose pins + constant pins (covers TRIG-01/02/04)
- [ ] `src/lib/store.test.ts` additions — `selectTrigger` derivation incl. shared-epoch coherence with `selectAMD`, firing-log cap/dedup, `firingLogToJson` shape (covers TRIG-02/03)
- [ ] Framework install: none — vitest 5.0.0 present

## Security Domain

ASVS Level 1 (per `.planning/config.json`: `security_enforcement: true`, `security_asvs_level: 1`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface in this phase |
| V3 Session Management | no | No user sessions; "session" here is a market-session date key, not a login session |
| V4 Access Control | no | No roles/resources |
| V5 Input Validation | **yes** | Fail-at-boundary `throw` on malformed inputs (`assertValidJudas` in `amd.ts` is the verbatim precedent [VERIFIED: src/lib/ict/amd.ts:121-144]); finite/positive checks on `asOf`; `FvgGap` finiteness via `assertFiniteGap` precedent; selector try/catch-never-throw envelope |
| V6 Cryptography | no | No secrets, no broker keys (paper-only; zero new env vars per PITFALLS security table) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed Yahoo rows (NaN/Infinity/negative epochs) poison wall-clock math | Tampering | `hasFiniteOhlc` + `hasValidTime` drop-filters at every detector boundary (established); trigger inherits clean outputs only |
| Unbounded client state (log growth) | Denial of service (client) | `TRIGGER_LOG_CAP` = 50 + oldest-drop + overflow counter |
| Calibration JSON exfiltrates position/P&L | Information disclosure | Entries carry verdicts + gate booleans only — no prices beyond the entry-FVG bounds the ticket needs, no account/risk numbers (those are Phase 17 slice inputs, never logged) |

## Project Constraints (from AGENTS.md + PROJECT.md)

- **AGENTS.md this repo:** single Next.js agent-rules block (breaking-change warning + `node_modules/next/dist/docs/` guide reference). Impact on Phase 15: **none** — this phase writes zero Next.js/component code (pure `ict/` + store). Flagged so the planner does not route UI work here.
- **Purity** (`src/lib/ict` pure, inject time, no `Date.now`, no store imports) — enforced by `purity.test.ts` glob guard; `trigger.ts` inherits it automatically.
- **State: Zustand only** — firing log + `selectTrigger` live in `src/lib/store.ts`; no new store library, no Context.
- **Budget: Zero** — no new packages, no new Yahoo legs/intervals (15M-close-gated execution is honest scope; §4 copy states it — Phase 17's concern, noted here).
- **AI: Rule-based, no LLM** — deterministic sentence selection only; banned vocabulary ("məncə", "ehtimal") stays out of reason strings.
- **Tech stack:** TypeScript strict, Tailwind v4, lightweight-charts (untouched this phase), `date-fns-tz` for time.

## Sources

### Primary (HIGH confidence — read this session, values quoted verbatim)
- `src/lib/ict/judas.ts` — killzone/disp/conf-window constants, `JudasOutput`, preRun branch, displacement calc
- `src/lib/ict/amd.ts` — NY constants, reason strings, `smtTag` concordance, NY branch, `assertValidJudas`
- `src/lib/ict/fvg.ts` — `FVG_MAP_BOUND`, `FvgGap`, `detectFVGs`/`applyMitigation` semantics
- `src/lib/ict/smt.ts` — `SmtOutput` union, tolerance/correlation constants
- `src/lib/ict/asia.ts` — `AsiaRange`, killzone window constants
- `src/lib/ict/aggregate.ts` — `NY_TZ`, wall-clock discipline
- `src/lib/ict/types.ts` — `Candle`/`IntradayCandle` contracts
- `src/lib/ict/purity.test.ts` — guard patterns
- `src/lib/store.ts` — `selectJudas`/`selectAMD`/epoch-fallback/`selectLiquidityPath` precedents
- `src/lib/ict/judas.test.ts`, `amd.test.ts`, `fvg.test.ts` — fixture/builder idioms
- `package.json`, `vitest.config.ts` — toolchain versions, test include
- `reference/institutional_rules.md` — Modul 4 three gates + WAIT default (spec authority, Azerbaijani original)
- `15-CONTEXT.md` — D-01..D-10 locked decisions, gate-input inventory

### Secondary (MEDIUM confidence — prior project research, cited by path)
- [CITED: .planning/research/SUMMARY.md] — trigger-before-flaw ordering, firing log in same phase, 1–4/week band, 15M-close-gated scope
- [CITED: .planning/research/FEATURES.md] — three-gate engine, ARMED tier, calibratable-threshold convention, 15M-vs-5M scope settlement
- [CITED: .planning/research/PITFALLS.md] — P1 uncalibrated thresholds, P2 spam/ARMED/cooldown/choppy-fixture, P5 purity, P6 logic fork, log-cap + vocabulary-quarantine mitigations
- [CITED: .planning/research/ARCHITECTURE.md] — `trigger.ts` pure fusion, `selectTrigger` derived selector, shared `asOf` helper, ticket-outside-`ict/` precedent

### Tertiary (LOW confidence)
- None drive a decision — all thresholds ship provisional; prose drafts are [ASSUMED] pending plan-time review.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every consumed export verified by in-session source read with verbatim quotes; zero new packages.
- Architecture: HIGH — gate-independence argument checked against actual `judasSwing` control flow (preRun branch, confirm-window logic); store-selector shape copied from verified `selectJudas`/`selectAMD` code.
- Pitfalls: HIGH — scoped subset of the project's own shipped-lessons research (P1/P2/P5/P6) plus trigger-specific mechanisms (NY-preRun, magnitude-only displacement) verified in code.

**Research date:** 2026-09-10
**Valid until:** 30 days (stable domain — pure-function mechanics over frozen v2.0 detectors; prose drafts expire at plan review by design)
