# Phase 21: Execution Polish - Research

**Researched:** 2026-09-17
**Domain:** WHY NOW calibration review + ticket buffer math + pools-on/off parity proof + threshold slider sandbox (Next.js 16 + Zustand 5 + vitest 5 + shadcn base-nova)
**Confidence:** HIGH

## Summary

Phase 21 keeps execution calibrated and uncorrupted with pools live. The firing log already exists in the terminal (`FiringLogPanel`, quick 260917-f3m); this phase extends it with an inline 1–4/week band verdict and a pools-on-vs-off context-only proof table. Ticket SL moves 0.25× ATR beyond the pool extreme and TP partials book before the extreme, with the R/R ≥ 1:3 gate unchanged. A new pools-parity suite (existing `parity.test.ts` untouched) replays the 20-session transition table with pools toggled and demands exact verdict match on trigger + flaw + ticket. Threshold and pool-tolerance knobs render only from a newly installed shadcn slider primitive (7th allowlisted), preview in a session-scoped Zustand sandbox, and write through an explicit Apply path that re-pins boundary tests.

**Primary recommendation:** Extend, don't rebuild — FiringLogPanel extension + ticket.ts SL/TP buffer insertion + new `pools-parity.test.ts` beside `parity.test.ts` + `components/ui/slider.tsx` via the shadcn install precedent + session-scoped Zustand sandbox with explicit Apply; pools never vote anywhere.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 1–4/week fire-rate evidence lives in the extended FiringLogPanel — band status + pools-context-only verdict table alongside log entries.
- **D-02:** Band verdict renders inline in the panel, next to the entries — no separate summary block.
- **D-03:** If the band breaks, constants retune + re-pin (boundary tests updated) — review is calibration, not observation-only. Re-pinned constants stay CALIBRATION-PROVISIONAL until live evidence accrues.
- **D-04:** Pools context-only proven inside the calibration view — pools-on vs pools-off verdict comparison shown from the same firing log, not harness-output-only.
- **D-05:** SL sits 0.25× ATR beyond the pool extreme (mirrors ATR-merge 0.25× idiom).
- **D-06:** TP partials book before the extreme — the extreme itself is never a target (magnet-to-the-line rejected).
- **D-07:** Buffered placement is visible + noted — chart lines move AND ticket prose carries a verbatim buffer note; R/R ≥ 1:3 gate unchanged.
- **D-08:** Buffer multiples ship CALIBRATION-PROVISIONAL with boundary-test pins, same discipline as pool ranking constants.
- **D-09:** New pools-parity suite file — existing 5-rule `parity.test.ts` stays untouched as regression anchor.
- **D-10:** All three verdicts compared pools-on vs pools-off: trigger + flaw + ticket; identical required.
- **D-11:** Proof replays the 20-session transition table with pools toggled (live-shaped), not fixture-matrix-only.
- **D-12:** Failure bar is exact verdict match — any divergence fails the harness (buffered SL/TP deltas included, no tolerance band).
- **D-13:** Both knob families adjustable — WHY NOW gate thresholds + pool tolerance (EQUAL_TOL, merge multiple, boost/penalty).
- **D-14:** Display-only review sandbox + explicit apply — sliders preview what-if; an explicit Apply path writes constants + re-pins boundary tests. No live re-derivation on slider movement.
- **D-15:** Session-scoped Zustand state only — refresh resets to pinned constants, no localStorage persistence.
- **D-16:** shadcn slider installed as the 7th allowlisted primitive (same install pattern as the existing 6); amends the PROJECT.md shadcn allowlist.
- **D-17:** Pools never vote — no trigger gate, no new flaw key, no ticket derivation change in v3.1 (roadmap lock from Phase 19 D-17, carried through Phase 20 D-17).
- **D-18:** Pool shape `{ side, top, bottom, touches, weight, originDate, status }`, rank-1 = nearest ACTIVE on DOL side, all ranking constants CALIBRATION-PROVISIONAL awaiting this phase's review (Phase 19 D-06–D-09, D-19–D-22).
- **D-19:** Firing-log panel already renders in the terminal (`FiringLogPanel`, quick 260917-f3m 2026-09-17) — this phase extends it, not builds it.
- **D-20:** v3.0 parity precedent: 5-rule AMD/SMT-vs-trigger harness in `parity.test.ts` (Phase 19 D-24 context) — new suite follows that idiom.
- **D-21:** Purity guard holds — no new `src/lib/ict` math semantics without the guard; buffer/parity code follows injected-`asOf`, no-clock discipline.
- **D-22:** shadcn allowlist is currently 6 (button, dropdown-menu, dialog, toast, calendar, card) — slider install is the first allowlist amendment since v1.0.

### the agent's Discretion
None — user decided all presented areas.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (P2 queue POOL2-01–05 already deferred at milestone level in STATE.md; pool-gated FIRE stays rejected per REQUIREMENTS.md Out of Scope.)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POL-01 | WHY NOW thresholds reviewed against firing-log (1–4/week band holds, pools context-only) | Calibration-verdict derivation from firing log + boundary-test re-pin discipline; FiringLogPanel extension pattern |
| POL-02 | Ticket SL sits beyond extreme + ATR buffer, TP partials before extreme | 0.25× ATR SL buffer insertion at ticket.ts SL step + TP-leg pullback; R/R gate position unchanged |
| POL-03 | Parity harness proves trigger/flaw/ticket verdicts identical pools on/off | New pools-parity suite mirroring parity.test.ts idiom over 20-session replay table with exact-match bar |
| POL-04 | slider.tsx threshold/pool-tolerance controls render from installed primitive | shadcn slider as 7th primitive on @base-ui/react; session Zustand sandbox + explicit Apply |

## Project Constraints (from AGENTS.md)

- This is NOT standard Next.js — APIs/conventions may differ from training data; read the relevant guide in `node_modules/next/dist/docs/` before writing code and heed deprecation notices [VERIFIED: AGENTS.md:1-9].
- Git worktree hygiene before execute-phase: `git fetch origin`, check HEAD vs origin/HEAD divergence, handle shouldDegrade per config [VERIFIED: AGENTS.md:10-24].
- Config warning hygiene: keep overlapping keys (`resolve_model_ids`/`runtime`) in only one config (project config vs global defaults.json) [VERIFIED: AGENTS.md:26-31].
- PROJECT.md shadcn allowlist is currently 6 (button, dropdown-menu, dialog, toast, calendar, card); slider install amends it — planner must include the PROJECT.md edit [VERIFIED: .planning/PROJECT.md:73,79].
- `src/lib/ict` purity: pure functions only, no I/O, no `Date.now` inside — inject time; enforced by co-located `purity.test.ts` grep guard [VERIFIED: src/lib/ict/purity.test.ts:1-45].
- State: Zustand only, no Redux/Context for dashboard state [VERIFIED: .planning/PROJECT.md:86-91].
- Determinism: rule-based only, no LLM calls; verbatim Azerbaijani reasons test-pinned with `toBe`, never interpolated (sole sanctioned exception: R/R-fail ratio) [VERIFIED: src/lib/ticket.ts:79-90].

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Band verdict + pools context-only proof table | API / Backend (pure selector math) rendered in Frontend | — | Verdict math must stay pure/injectable for replay; panel only reads store |
| Ticket SL/TP buffer placement | API / Backend (`src/lib/ticket.ts` beside ict) | Frontend (prose + chart lines move) | Brokerage math lives beside confluence.ts, never inside `src/lib/ict` so ict purity holds |
| Pools on/off parity proof | API / Backend (vitest harness) | — | Test-only surface; no UI indicator, no new exports per parity precedent |
| Threshold / tolerance slider sandbox | Frontend (session Zustand + shadcn slider) | — | Display-only preview; explicit Apply writes constants, no live re-derivation |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.3.4 [VERIFIED: package.json:21] | App Router terminal shell | Locked project scaffold; AGENTS.md warns APIs differ from training data |
| react / react-dom | 19.2.8 [VERIFIED: package.json:22,24] | Panel rendering | Locked pair with Next 16 |
| zustand | ^5.0.15 [VERIFIED: package.json:27] | firingLog + ticketInputs + new session slider sandbox | Existing store idiom: direct subscriptions, derivation during render, no useShallow on fresh-identity outputs |
| vitest | ^5.0.0 [VERIFIED: package.json:41] | parity + replay + boundary pins | `npm test` = `vitest run`; node env, 15s timeout [VERIFIED: vitest.config.ts:1-13] |
| lightweight-charts | ^5.2.1 [VERIFIED: package.json:19] | SL/TP line movement surface | Ticket lines stay on top (z-order lock from Phase 20) |
| date-fns-tz | ^3.2.0 [VERIFIED: package.json:18] | NY wall-clock killzone + session dates | `nyMinutesOf`/`nyDateOf` injected-epoch idiom, never clock reads |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @base-ui/react | ^1.8.0 [VERIFIED: package.json:14] | Slider primitive under shadcn wrapper | POL-04 knobs render ONLY from `components/ui/slider.tsx` wrapping this |
| class-variance-authority | ^0.7.1 [VERIFIED: package.json:15] | shadcn variant styling | Reuse existing button/card idiom for Apply path |
| cn | ^0.2.5 [VERIFIED: package.json:16] | classnames | Existing ui/* precedent [VERIFIED: components/ui/button.tsx:1-3] |
| lucide-react | ^1.41.0 [VERIFIED: package.json:20] | Icons only | No new icon family; RefreshCw precedent in shell header |
| shadcn | ^4.21.0 [VERIFIED: package.json:25] | Primitive installer (CLI copies file, no new npm dep) | Slider installs same pattern as existing 6; UI-SPEC confirms 6 files on disk 2026-09-17 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn slider wrapper | Raw @base-ui/react Slider inline | Rejected — POL-04 requires the installed primitive; allowlist audit expects `components/ui/slider.tsx` |
| Session Zustand sandbox | localStorage persistence | Rejected per D-15 — refresh resets to pinned constants |
| Live re-derivation on slider move | Preview-only + Apply | Rejected per D-14 — sliders never rewrite derivation live |
| Fixture-matrix-only parity | 20-session replay with pools toggled | Rejected per D-11 — proof must be live-shaped |

**Installation:**
```bash
npx shadcn@4.21.0 add slider
npm test -- src/lib/ict/pools-parity.test.ts
```

**Version verification:** `next` 16.3.4, `zustand` ^5.0.15, `vitest` ^5.0.0 all confirmed by Read of package.json this session [VERIFIED: package.json:13-42]. shadcn 6-component inventory confirmed on disk (button, calendar, card, dialog, dropdown-menu, toast; slider absent pre-phase) [VERIFIED: glob components/ui/*.tsx].

## Package Legitimacy Audit

> No new npm registry dependency is required. The slider is a shadcn file-install over the already-declared `@base-ui/react` peer — the same pattern as the existing 6 primitives.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| @base-ui/react (already declared ^1.8.0) | npm | mature | high [ASSUMED] | github.com/mui/base-ui [ASSUMED] | OK (already in package.json, no install) | Approved — reuse, no new install |
| shadcn CLI (installer only) | npm | mature | high [ASSUMED] | github.com/shadcn-ui/ui [ASSUMED] | OK (code-copy tool, not a runtime dep) | Approved — `npx shadcn add slider` |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
*Slider file provenance: UI-SPEC enumerates 6 components on disk via `Get-ChildItem components/ui/*.tsx -Name` with shadcn@4.21.0 on 2026-09-17; slider is the documented 7th install this phase [CITED: 21-UI-SPEC.md Component Inventory].*

## Architecture Patterns

### System Architecture Diagram

```
Yahoo legs (nq/nq1h/nq15m/es)
  → store selectors (selectTriggerPure / selectFatalFlaw / selectTicket / selectPools)
  → evaluateTrigger (3 gates) → checkFatalFlaw (HARD/SOFT) → computeTicket (fixed order)
  → firingLog append (poll-tick commit only) → FiringLogPanel + band verdict + pools ON/OFF proof table
  → buffered SL/TP → ticket-panel prose note + chart lines move (ticket on top)
  → slider sandbox (session Zustand, preview-only) → explicit Apply → constants + boundary re-pin

Parity harness (test-only, off-UI):
  20-session replay bars × {pools ON, pools OFF} → trigger/flaw/ticket triple → exact-match assert
```

### Recommended Project Structure
```
src/
├── lib/ict/           # pure math only — trigger.ts, pools.ts, replay.test.ts, NEW pools-parity.test.ts
├── lib/ticket.ts      # brokerage math — buffer insertion point (SL/TP steps, gate position unchanged)
├── lib/store.ts       # firingLog + ticketInputs + NEW session slider sandbox slice
components/
├── dashboard/firing-log-panel.tsx  # EXTEND with band verdict + proof table
├── dashboard/ticket-panel.tsx      # EXTEND with buffer note
└── ui/slider.tsx                   # NEW 7th primitive (only knob renderer)
```

### Pattern 1: CALIBRATION-PROVISIONAL + boundary-test pins + Phase 21 review
**What:** Every tunable ships provisional with a pinned boundary test; Phase 21 reviews against firing-log evidence and re-pins on retune [VERIFIED: src/lib/ict/trigger.ts:20-30][VERIFIED: src/lib/ict/pools.ts:15-35].
**When to use:** Threshold retune (D-03), buffer multiples (D-08), pool tolerance knobs (D-13).
**Example:**
```typescript
// Source: trigger.ts pattern, pools.ts follows — new buffer constants copy this comment shape
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1-4 fires/week (TRIG-04).
export const TRIGGER_KZ_START_MIN = 120; // [VERIFIED: src/lib/ict/trigger.ts:20-21]
```

### Pattern 2: Refuse-null / never-throws selector envelopes
**What:** Selectors return null on stale/empty/thin with reason on owning-leg `lastError`; try/catch never throws into render. `selectPools` ignores es.stale (NQ-D1 geometry only) [VERIFIED: src/lib/store.ts:846-866]. Calibration reads degrade honestly, never throw on empty log.
**When to use:** Band verdict over empty log (renders empty body, verdict renders nothing), thin-history dimming.

### Pattern 3: Fixed-order ticket derivation with flaw precedence
**What:** direction from FIRE → OTE×FVG entry → invalidation SL → structure-first TP ladder (TP1 gate leg) → R/R gate on TP1 only → EXECUTE/STAND ASIDE; flaw INVALIDATED/DOWNGRADED supersedes by function order [VERIFIED: src/lib/ticket.ts:284-388]. Buffers insert at SL/TP steps without reordering (D-05–D-07).
**When to use:** POL-02 implementation; parity triple must reuse the identical trigger object for flaw and ticket (single-snapshot contract).

### Pattern 4: Parity harness idiom (untouched anchor + new suite)
**What:** `parity.test.ts` 5-rule contradiction/predicate shape with shared-triple identity asserts (`toBe` reference checks) stays untouched; new pools-parity suite copies the shape with pools toggled [VERIFIED: src/lib/ict/parity.test.ts:139-153,389-423]. Replay driver owns session-scoped alreadyFired and asserts legal combined-state edges [VERIFIED: src/lib/ict/replay.test.ts:191-223].
**When to use:** POL-03; any divergence (including buffered SL/TP deltas) fails — no tolerance band.

### Pattern 5: Session-scoped Zustand sandbox + explicit Apply
**What:** firingLog/paperLog trailing-cap + overflow precedent (`TRIGGER_LOG_CAP = 50` [VERIFIED: src/lib/ict/trigger.ts:28-30]; appendFiringLog dedup: WAIT skip, one FIRE per NY date, already-fired echo skip [VERIFIED: src/lib/store.ts:1027-1061]). Slider sandbox follows the same session-ephemeral shape: preview dims at `opacity-45` + `BAXIŞ` tag, Apply writes constants + re-pins, refresh resets.
**When to use:** POL-04 controls.

### Anti-Patterns to Avoid
- **Pools voting:** trigger gate on pools, new flaw key from pools, ticket derivation change keyed on pools — rejected by roadmap lock (D-17); parity would then diverge by construction.
- **Magnet-to-the-line:** SL/TP exactly on the pool extreme, or TP targeting the extreme — rejected (D-05/D-06); SL goes beyond + buffer, TPs book before.
- **Live re-derivation on slider movement:** sliders rewriting constants per keystroke — rejected (D-14); preview-only until Apply.
- **localStorage persistence of sandbox:** rejected (D-15); session scope only.
- **New ict math without the purity guard:** any `Date.now`/store import inside `src/lib/ict` fails `purity.test.ts` — buffer/parity code uses injected `asOf`/epochs only.
- **Paraphrased verdict prose:** detector reasons render verbatim; buffer notes follow the same `toBe`-pinned idiom — never interpolate numbers into reason strings (R/R ratio is the sole sanctioned interpolation).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slider control | Custom range input + drag math | shadcn `slider` wrapping `@base-ui/react` (7th primitive) | Keyboard/ARIA/focus-ring/44px hit-area discipline already settled; UI-SPEC locks thumb exception |
| ATR denominator | Custom volatility measure | `computeATR` in `src/lib/ict/regime.ts` (Wilder smoothing, period 14) [VERIFIED: src/lib/ict/regime.ts:16-40] | Same denominator as MERGE_ATR_MULT 0.25 idiom; zero-or-empty ATR already has refuse-to-rank precedent |
| NY wall-clock/session keys | Hand-rolled TZ offsets | `nyMinutesOf`/`nyDateOf` via date-fns-tz + NY_TZ [VERIFIED: src/lib/ict/trigger.ts:116-126] | Killzone exclusive-edge (120/300) + per-session FIRE dedup depend on it |
| Fires/week math | Ad-hoc counting | `summarizeReplay` 4-NY-week denominator + IN-BAND/OUT-OF-BAND verdict [VERIFIED: src/lib/ict/replay.test.ts:249-264] | Single definition of the 1–4/week band; panel verdict must reuse it, not redefine |
| Firing-log cap/overflow | Custom history store | `appendFiringLog` trailing-slice + overflow counter idiom [VERIFIED: src/lib/store.ts:1027-1061] | Overflow line (`+N köhnə qeyd`) already pinned in panel |

**Key insight:** Calibration is a discipline (provisional → pinned → reviewed → re-pinned), not a tuning session. The repo already encodes the discipline in comments, boundary tests, and replay summaries — Phase 21 plugs buffers and knobs into it.

## Common Pitfalls

### Pitfall 1: Pools accidentally voting via ticket inputs
**What goes wrong:** Passing pools into trigger/flaw/ticket as an input that changes a verdict; parity suite goes red and the roadmap lock breaks.
**Why it happens:** The proof table needs pools-on vs pools-off data, tempting a pools param on the derivation path.
**How to avoid:** Pools stay read-only projection context; the toggle exists only in the harness driver and the calibration-view comparison, never in `evaluateTrigger`/`checkFatalFlaw`/`computeTicket` signatures.
**Warning signs:** New pools-typed field on TriggerInput/TicketInput; parity diff on trigger verdict (not just ticket prices).

### Pitfall 2: Buffered ticket breaks exact-match parity by design
**What goes wrong:** SL/TP deltas from the new buffer read as parity divergence.
**Why it happens:** D-12 includes buffered deltas in the exact-match bar with no tolerance band.
**How to avoid:** Both harness arms run the same buffered code; the toggle is pools presence only. Pin buffer multiples first (boundary tests), then assert triple equality.
**Warning signs:** Ticket-only divergence while trigger+flaw match — check that both arms share the buffer build.

### Pitfall 3: R/R gate position drift after buffer insertion
**What goes wrong:** Buffer widens stop distance, TP1 no longer covers 3×, EXECUTE rate collapses — or the gate is "fixed" by moving it, violating D-07.
**Why it happens:** SL beyond extreme + TP pulled back squeezes the ratio from both ends.
**How to avoid:** Gate stays on TP1 at `TICKET_RR_MIN = 3` [VERIFIED: src/lib/ticket.ts:19-21] in the same step order; buffer multiples ship provisional and the band review (not gate movement) absorbs the effect.
**Warning signs:** Sudden STAND ASIDE surge with R/R-fail reasons post-buffer.

### Pitfall 4: Empty-log confident HOLD
**What goes wrong:** Band verdict prints HOLD over zero entries.
**Why it happens:** Reusing the IN-BAND string without an entries guard.
**How to avoid:** Band verdict renders NOTHING until the log has entries; empty state keeps existing copy plus calibration body per UI-SPEC. Verbatim values: `TriggerVerdict = 'FIRE_LONG' | 'FIRE_SHORT' | 'ARMED' | 'WAIT_FOR_MANIPULATION'` [VERIFIED: src/lib/ict/trigger.ts:32] and `FiringLogEntry { asOf; verdict; gates; direction; reasonKey; sessionDate }` [VERIFIED: src/lib/ict/trigger.ts:72-80].
**Warning signs:** HOLD with `firingLog.length === 0`; UAT long-text backstop on longest buffer note.

### Pitfall 5: Slider writes leaking into live derivation
**What goes wrong:** Sandbox values flow into selectors before Apply; refresh doesn't reset.
**Why it happens:** Sharing one Zustand slice between preview and pinned constants.
**How to avoid:** Separate preview slice (session scope, no persistence) from pinned constants; selectors read pinned only until Apply commits + re-pins boundary tests.
**Warning signs:** Verdicts change on slider drag without Apply; values survive refresh.

### Pitfall 6: Purity guard violation from buffer/parity helpers
**What goes wrong:** `Date.now()`, `new Date()` clock reads, or zustand/store imports inside `src/lib/ict` turn `purity.test.ts` red.
**Why it happens:** Buffer needs ATR/epoch context; parity driver needs session state.
**How to avoid:** Inject `asOf`/epochs/ATR from callers; keep session fired-state in the driver (replay precedent), never in ict math.
**Warning signs:** `purity.test.ts` violations list non-empty.

## Code Examples

Verified patterns from this repo (read this session):

### Firing-log band summary (reuse, don't redefine)
```typescript
// Source: src/lib/ict/replay.test.ts — single definition of the band verdict
const verdict = firesPerWeek >= 1 && firesPerWeek <= 4 ? 'IN-BAND' : 'OUT-OF-BAND';
// [VERIFIED: src/lib/ict/replay.test.ts:249-264] full summarizeReplay with
// firesPerWeek = fires / weeks (4 NY weeks), killRate, band '1-4/week'
```

### SL buffer insertion shape (ticket.ts SL step)
```typescript
// Source: src/lib/ticket.ts resolveSL — insertion point for the 0.25× ATR buffer
function resolveSL(direction, entry, entryFvg, asia) {
  const sl = direction === 'LONG'
    ? Math.min(entryFvg.bottom, asia.low)
    : Math.max(entryFvg.top, asia.high);
  // POL-02: push beyond pool extreme by 0.25× ATR here; keep wrong-side + STOP_EPS refuses
} // [VERIFIED: src/lib/ticket.ts:252-257]; STOP_EPS floor [VERIFIED: src/lib/ticket.ts:32]
```

### TP legs pull back before the extreme (ticket.ts TP step)
```typescript
// Source: src/lib/ticket.ts resolveTP — structure-first ladder, TP1 is the gate leg
tp1: asia.high > entry ? asia.high : null, // LONG; SHORT mirrors
// POL-02: TP legs resolve before the pool extreme; unresolvable legs stay null, never fillers
// [VERIFIED: src/lib/ticket.ts:263-282]; TP1-null refuses [VERIFIED: src/lib/ticket.ts:343-345]
```

### Parity triple identity (copy for pools-parity suite)
```typescript
// Source: src/lib/ict/parity.test.ts — identical references feed both sides
expect(out.inputs.judas).toBe(triple.judas);
expect(out.inputs.smt).toBe(triple.smt);
// [VERIFIED: src/lib/ict/parity.test.ts:139-153]; parity.test.ts stays untouched (D-09)
```

### Replay driver with session fired-state (copy for pools toggle)
```typescript
// Source: src/lib/ict/replay.test.ts runReplay — session-scoped alreadyFired + legal-edge asserts
const trigger = evaluateTrigger({ judas: bar.judas, amd: null, smt: bar.smt, fvg: bar.fvg, asOf: bar.asOf, alreadyFired: firedThisSession });
// [VERIFIED: src/lib/ict/replay.test.ts:191-223]; 20-session population [VERIFIED: src/lib/ict/replay.test.ts:598-743]
```

### Pool constants under review (slider knob ranges seed here)
```typescript
// Source: src/lib/ict/pools.ts — all CALIBRATION-PROVISIONAL awaiting this phase's review
export const EQUAL_TOL_BPS = 25;      // [VERIFIED: src/lib/ict/pools.ts:15-17]
export const MERGE_ATR_MULT = 0.25;   // [VERIFIED: src/lib/ict/pools.ts:21-23]
export const DOL_BOOST = 2.0;         // [VERIFIED: src/lib/ict/pools.ts:24-26]
export const BEHIND_PENALTY = 0.25;   // [VERIFIED: src/lib/ict/pools.ts:27-29]
export const EQUAL_BONUS_STEPS = [3.0, 2.0, 1.0, 0.5]; // [VERIFIED: src/lib/ict/pools.ts:33-35]
export type PoolSide = 'BSL' | 'SSL'; // [VERIFIED: src/lib/ict/pools.ts:37]
export type PoolStatus = 'ACTIVE' | 'SWEPT' | 'CONSUMED'; // [VERIFIED: src/lib/ict/pools.ts:38]
```

### Panel extension shell (FiringLogPanel reader precedent)
```tsx
// Source: components/dashboard/firing-log-panel.tsx — store-subscribed reader, newest-first at render
const firingLog = useDashboard((s) => s.firingLog);
const entries = firingLog.slice().reverse();
// [VERIFIED: components/dashboard/firing-log-panel.tsx:18-22]
// D-02: band verdict renders inline next to entries — no separate summary block
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Render-path trigger logging (selectTrigger appends) | Render-pure `selectTriggerPure` + explicit `commitTriggerLog` at poll tick | Phase 17-05 (CR-03) [VERIFIED: src/lib/store.ts:933-985] | Panels never mutate log state; calibration reads are stable |
| Fixture-matrix parity only | 20-session replay + 5-rule parity harness | v3.0 Phase 18 [VERIFIED: src/lib/ict/replay.test.ts; src/lib/ict/parity.test.ts] | Live-shaped proof precedent POL-03 follows |
| 6-primitive shadcn allowlist | 7th primitive (slider) amends allowlist + PROJECT.md | This phase (D-16/D-22) | First allowlist amendment since v1.0; planner must include docs edit |
| Unbuffered SL/TP on structure levels | 0.25× ATR beyond extreme + TPs before extreme | This phase (D-05/D-06) | Chart lines move + verbatim prose note; gate unchanged |

**Deprecated/outdated:**
- Direct `@base-ui/react` Slider usage in panels: use `components/ui/slider.tsx` wrapper only (POL-04).
- Cached band verdicts over stale legs: print verbatim NQ-leg `lastError` inline, never cached verdicts.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@base-ui/react` Slider sub-module API mirrors the Button precedent (`@base-ui/react/slider` or `/slider`) — exact export path confirmed at install time via shadcn CLI output | Standard Stack / POL-04 | Low — installer generates the wrapper; executor reads it rather than guessing |
| A2 | 0.25× ATR default seeds both SL buffer and boundary matrix (CONTEXT suggests research seeding; exact TP pullback fraction set at plan time from boundary pins) | Architecture Patterns | Medium — planner sets TP-pullback multiple as provisional + pins; discuss-phase confirms |
| A3 | Slider knob bounds seed from existing boundary tests (killzone minutes, disp mult, EQUAL_TOL_BPS, MERGE_ATR_MULT, DOL_BOOST/BEHIND_PENALTY) — planner defines numeric ranges | Code Examples | Low — bounds are UI ranges, not math changes; Apply path re-pins |
| A4 | Download-volume/age figures for @base-ui/react + shadcn CLI left unstated (no network probe this session) | Package Legitimacy Audit | Low — both already declared/used in-repo; no new registry trust introduced |

## Open Questions

1. **TP pullback multiple numeric default**
   - What we know: SL is locked at 0.25× ATR beyond extreme (D-05, mirrors merge idiom [VERIFIED: src/lib/ict/pools.ts:21-23]); TP books before extreme (D-06) with no numeric multiple in CONTEXT.
   - What's unclear: Whether TP pullback is a second ATR multiple, a fixed-bps inset, or a structural-leg step-back.
   - Recommendation: Planner proposes one provisional default + boundary matrix; discuss-phase confirms before execution.
2. **Band verdict counting rule (overflow + ARMED inclusion)**
   - What we know: Cap is 50 with overflow counter [VERIFIED: src/lib/ict/trigger.ts:28-30]; UI-SPEC says verdict counts the full log including overflow; replay band divides by NY weeks.
   - What's unclear: Whether ARMED entries count toward fires/week or FIRE-only.
   - Recommendation: Planner locks FIRE-only counting (replay `fires` counts FIRE bars [VERIFIED: src/lib/ict/replay.test.ts:250-252]) unless discuss-phase overrides.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | vitest + next build | ✓ | 24.11.1 (probed this session) | — |
| npm | installs + test runs | ✓ | 11.6.2 (probed this session) | — |
| vitest config + node env | parity/replay/boundary suites | ✓ | vitest.config.ts present, `npm test` = `vitest run` [VERIFIED: vitest.config.ts:1-13] | — |
| components/ui 6 primitives | slider install precedent | ✓ | 6 files on disk, slider absent | Install via shadcn CLI |
| shadcn CLI (npx) | slider file install | [ASSUMED] available via npx | ^4.21.0 declared [VERIFIED: package.json:25] | Vendor wrapper manually following button.tsx precedent |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none (slider file is created by the phase itself)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^5.0.0 [VERIFIED: package.json:41] |
| Config file | vitest.config.ts (node env, include src/**/*.test.ts + app/**/*.test.ts, 15s timeout) [VERIFIED: vitest.config.ts:1-13] |
| Quick run command | `npm test -- src/lib/ict/pools-parity.test.ts` |
| Full suite command | `npm test` (must hold 420/420 green baseline + new pins) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POL-01 | 1–4/week band verdict from firing log; pools context-only table; retune re-pins boundaries | unit (summarize idiom + boundary pins) | `npm test -- src/lib/ict/trigger.test.ts` + `npm test -- src/lib/ict/replay.test.ts` | ✅ (extend; new verdict helper pins beside) |
| POL-02 | SL beyond extreme + 0.25× ATR; TPs before extreme; R/R ≥ 1:3 gate on TP1 unchanged | unit (ticket boundary matrix) | `npm test -- src/lib/ticket.test.ts` | ✅ (extend with buffer matrix) |
| POL-03 | trigger/flaw/ticket identical pools on/off over 20-session replay; any divergence fails | unit (new parity suite) | `npm test -- src/lib/ict/pools-parity.test.ts` | ❌ Wave 0 (new file; parity.test.ts untouched) |
| POL-04 | Threshold/tolerance sliders render from installed primitive; preview-only until Apply; session scope | unit (store slice) + visual glance | `npm test -- src/lib/store.test.ts` (if exists) else new slice pins | ❌ Wave 0 (slider.tsx + sandbox slice) |

### Sampling Rate
- **Per task commit:** `npm test -- <touched-suite>` (parity, replay, ticket, or store slice)
- **Per wave merge:** `npm test` (full suite green — pools must not disturb the 420 baseline)
- **Phase gate:** Full suite green + `tsc --noEmit` clean before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ict/pools-parity.test.ts` — covers POL-03 (new suite; mirrors parity.test.ts + replay.test.ts idioms)
- [ ] `components/ui/slider.tsx` — covers POL-04 (7th primitive via `npx shadcn add slider`)
- [ ] Slider sandbox slice in `src/lib/store.ts` + slice pins — covers POL-04 preview/Apply/session-scope
- [ ] Buffer boundary matrix in ticket suite — covers POL-02 (0.25× default + TP-pullback multiple)
- [ ] Band-verdict helper + pins beside trigger/replay suites — covers POL-01 (FIRE-only counting, overflow inclusion, empty-log guard)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | None — local terminal, no auth surface |
| V3 Session Management | no | Session scope is in-memory Zustand only, no tokens |
| V4 Access Control | no | No roles; operator-only terminal |
| V5 Input Validation | yes | Got-string boundary throws on malformed envelopes (trigger/ticket/pools precedents); riskPct band 0.1–5 refuse [VERIFIED: src/lib/ticket.ts:242-246]; slider values clamped to knob bounds, never trusted into math pre-Apply |
| V6 Cryptography | no | None — no secrets in this phase |

### Known Threat Patterns for Next.js + Zustand + vitest stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed detector envelope → fake FIRE/ticket | Tampering | Boundary assertValid* with got-string throws; null degrades to WAIT/STAND ASIDE, never a throw on null |
| Stale leg rendered as confident verdict | Information disclosure | Refuse-null + verbatim lastError; dimmed degraded tags; never cached verdicts |
| Sandbox preview mistaken for pinned truth | Spoofing | `BAXIŞ` tag + opacity-45 until Apply; refresh resets; Apply re-pins boundary tests |

## Sources

### Primary (HIGH confidence)
- Repo reads this session: trigger.ts, ticket.ts, pools.ts, store.ts, regime.ts, invalidation.ts (partial), parity.test.ts, replay.test.ts, firing-log-panel.tsx, ticket-panel.tsx, purity.test.ts, vitest.config.ts, package.json, components.json, button.tsx, PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, 21-CONTEXT.md, 21-UI-SPEC.md, AGENTS.md
- UI-SPEC Component Inventory (shadcn@4.21.0, 6 components enumerated 2026-09-17) + checker sign-off 7/7

### Secondary (MEDIUM confidence)
- None — no web fetch needed; in-repo precedent is authoritative for this phase

### Tertiary (LOW confidence)
- A1–A4 in Assumptions Log (marked for plan-time confirmation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package.json + on-disk inventory read this session
- Architecture: HIGH — trigger/ticket/pools/store/replay/parity sources read verbatim
- Pitfalls: HIGH — derived from locked D-constraints + purity/boundary precedents

**Research date:** 2026-09-17
**Valid until:** 2026-10-17 (stable domain; slider CLI output is the only fresh variable at execution)
