---
phase: 16-fatal-flaw-invalidation
reviewed: 2026-09-11T12:30:00Z
depth: deep
files_reviewed: 4
files_reviewed_list:
  - src/lib/ict/invalidation.ts
  - src/lib/ict/invalidation.test.ts
  - src/lib/store.ts
  - src/lib/store.test.ts
findings:
  critical: 1
  warning: 6
  info: 5
  total: 12
status: issues
---

# Phase 16: Code Review Report — Fatal-Flaw Invalidation

**Reviewed:** 2026-09-11T12:30:00Z
**Depth:** deep (per-file + cross-file: disjunction order, epoch sharing, purity, selector throw envelope, threat models T-16-01/T-16-02/T-16-03)
**Files Reviewed:** 4
**Status:** issues

## Summary

Reviewed the Phase 16 tracer + expansion: pure `checkFatalFlaw` disjunction (HARD rollover / HARD stale / SOFT SMT / SOFT opposite-sweep / clean), verbatim Azerbaijani prose tables, and `selectFatalFlaw` wiring on one shared epoch. Purity holds (type-only imports, no clock reads, no store imports), prose discipline holds (fixed templates, no interpolation, `0.70` fixed threshold), disjunction order is correct in the pure function, and the selector never-throw envelope is correctly built.

One Critical defect: the SOFT `OPPOSITE_SWEEP` branch is unreachable through the production selector path by construction — the trigger direction is derived from the same judas `sweepSide` the flaw compares against, so same-snapshot opposite can never be true. Six Warnings (log write-amplification, mutable prose exports, test title/coverage gaps, unexercised selector SOFT path) and five Info items follow. No security blockers: no secrets, no injection, no interpolation leak, threat-model mitigations hold except as noted.

## Critical Issues

### CR-01: SOFT OPPOSITE_SWEEP branch is dead code via selectFatalFlaw (same-snapshot tautology)

**File:** `src/lib/store.ts:890-902` + `src/lib/ict/invalidation.ts:238-245`
**Issue:** `selectFatalFlaw` derives the trigger via `get().selectTrigger()` and reads judas via `get().selectJudas()` from the identical state, then calls `checkFatalFlaw({ trigger, judas, ... })`. But `evaluateTrigger` computes `direction = directionOf(judas.sweepSide)` (trigger.ts:297-299, HIGH→SHORT / LOW→LONG) and `isOppositeSweep` computes `impliedDirection(judas.sweepSide)` with the identical mapping (invalidation.ts:228-232) and returns `trigger.direction !== implied`. On the same snapshot these are tautologically equal, so `isOppositeSweep` is always `false` in production. A `FIRE_LONG` requires a LOW sweep (purge gate + LONG direction both keyed on LOW); a `FIRE_LONG` + HIGH sweep combination — the only input that fires `OPPOSITE_SWEEP` — cannot co-occur from one judas envelope. The branch fires only in unit tests with synthetically mismatched envelopes (invalidation.test.ts:136-162). Additionally the SOFT FIRING gate means even a hypothetical ARMED opposite returns clean. Net effect: half of the SOFT taxonomy never downgrades live; Phase 17 §6 will never render an opposite-sweep downgrade.
**Fix:** Pick one: (a) define opposite against an independent basis — e.g. compare the confirmed sweep against the trigger's pre-sweep bias/AMD phase or the prior-poll direction, not the same-poll `sweepSide`; (b) if same-snapshot opposite is truly intended to be impossible, delete the branch and remove `OPPOSITE_SWEEP` from the taxonomy rather than shipping dead logic; (c) at minimum, add a selector-level test that attempts the opposite path live and documents the impossibility so Phase 17 does not depend on it:
```ts
// option (a) sketch: flaw compares sweep against trigger's carried bias, not its own sweepSide
function isOppositeSweep(trigger, judas, basis: 'LONG' | 'SHORT' | null): boolean {
  if (judas?.confirmed !== true) return false;
  const implied = impliedDirection(judas.sweepSide);
  if (implied === null || basis === null) return false;
  return basis !== implied;
}
```

## Warnings

### WR-01: selectFatalFlaw doubles firing-log appends (selector with hidden write side effect)

**File:** `src/lib/store.ts:884-906` (inner `get().selectTrigger()` at line 891; append at trigger block lines 869-870)
**Issue:** `selectTrigger` unconditionally calls `get().appendFiringLog(out, epoch)` on every derivation (except WAIT / ARMED_ALREADY_FIRED skip inside the appender). `selectFatalFlaw` calls `get().selectTrigger()` internally, so every flaw read appends a second time. A component calling both selectors per poll appends twice per 60s poll. `FIRE` dedup masks the double-append for the fire case only; every `ARMED_MISSING_*` poll appends two entries instead of one, filling `TRIGGER_LOG_CAP` (50) twice as fast and inflating `firingLogOverflow`. The flaw-coherence test never catches this because its fixture lands on `ARMED_ALREADY_FIRED` (skipped by the appender).
**Fix:** Split pure derivation from logging — e.g. a private `deriveTrigger(epoch)` with no append, called by both `selectTrigger` (which appends once) and `selectFatalFlaw` (which never appends):
```ts
const out = evaluateTrigger({ judas, amd, smt, fvg, asOf: epoch, alreadyFired });
// selectTrigger only:
get().appendFiringLog(out, epoch);
// selectFatalFlaw: call deriveTrigger, never append
```

### WR-02: Exported prose tables are mutable — verbatim pins can be tampered at runtime

**File:** `src/lib/ict/invalidation.ts:80-97,110-115,131-136`
**Issue:** `REASON_BY_KEY`, `UNBLOCK_BY_KEY`, `SENTENCE_BY_KEY`, `CHALLENGE_BY_KEY` are exported as mutable `Record` objects. Any consumer (or Phase 17 render code) can reassign `REASON_BY_KEY.ROLLOVER_WEEK = '...'`, silently breaking the `toBe` verbatim contract the tests pin and violating T-16-02 replay byte-equality. Purity guard does not cover this.
**Fix:** Freeze at definition:
```ts
export const REASON_BY_KEY: Readonly<Record<FlawReasonKey, string>> = Object.freeze({ ... });
export const CHALLENGE_BY_KEY: Readonly<Record<string, string>> = Object.freeze({ ... });
// same for UNBLOCK_BY_KEY, SENTENCE_BY_KEY
```

### WR-03: Test title contradicts its own fixture (HIGH vs LOW)

**File:** `src/lib/ict/invalidation.test.ts:136`
**Issue:** Title reads "confirmed opposite sweep downgrades FIRE_SHORT against a HIGH sweep" but the fixture passes `sweepSide: 'LOW'` with `direction: 'SHORT'`. LOW-implies-LONG vs SHORT is indeed opposite, so the body is correct and the title is wrong. Misleading title will confuse Phase 17/18 readers about which side is opposite for which direction.
**Fix:** Rename to `confirmed opposite sweep downgrades FIRE_SHORT against a LOW sweep` (and verify the companion LONG+HIGH test at line 154 keeps its correct title).

### WR-04: Boundary-throw coverage is trigger-only — malformed smt/judas/rollover/stale shapes unpinned

**File:** `src/lib/ict/invalidation.test.ts:366-388`
**Issue:** Validators `assertValidSmt` / `assertValidJudas` / `assertValidRollover` / `assertValidStale` (invalidation.ts:170-224) all throw `got`-string errors, but tests only pin malformed `trigger`, null input, and NaN/0 `asOf`. A regression that silently accepts e.g. `smt: { suppressed: 'yes' }`, `judas: { confirmed: 1 }`, `rollover: { rolloverSuspect: 1 }`, or `stale: { nq: 0 }` would pass the suite. `asOf: -1` and `Infinity` are likewise unpinned (only NaN/0 tested).
**Fix:** Add cases mirroring the trigger-malformed idiom:
```ts
expect(() => checkFatalFlaw(cleanInput({ smt: { suppressed: 'yes' } as any }))).toThrow(/got/);
expect(() => checkFatalFlaw(cleanInput({ judas: fixtureJudas({ confirmed: 1 as any }) }))).toThrow(/got/);
expect(() => checkFatalFlaw(cleanInput({ stale: { nq: 0 } as any }))).toThrow(/got/);
expect(() => checkFatalFlaw(cleanInput({ asOf: -5 }))).toThrow(/got/);
expect(() => checkFatalFlaw(cleanInput({ asOf: Number.POSITIVE_INFINITY }))).toThrow(/got/);
```

### WR-05: Two precedence pairs are unpinned (HARD-vs-HARD, SOFT-vs-SOFT)

**File:** `src/lib/ict/invalidation.test.ts:187-193`
**Issue:** Only rollover-beats-SMT is pinned. Rollover-beats-stale (both HARD true → `ROLLOVER_WEEK`) and SMT-beats-opposite-sweep (both SOFT true → `SMT_SUPPRESSED` by code order) are code-ordering facts with zero tests. A future reorder swapping stale above rollover or sweep above SMT would pass green while changing production verdicts.
**Fix:** Add two order tests:
```ts
expect(checkFatalFlaw(cleanInput({ rollover: suspect, stale: fixtureStale({ es: true }) })).reasonKey).toBe('ROLLOVER_WEEK');
expect(checkFatalFlaw(cleanInput({ smt: suppressedSmt(), judas: oppositeJudas })).reasonKey).toBe('SMT_SUPPRESSED');
```

### WR-06: Selector SOFT path is never exercised live — coherence fixture always lands clean NONE

**File:** `src/lib/store.test.ts:1210-1243`
**Issue:** `seedTriggerFire` builds agreeing LOW-sweep + LONG-fire legs with mirroring ES (SMT unsuppressed), and the coherence test consumes the session FIRE first so both flaw derivations read post-fire `ARMED_ALREADY_FIRED`. With an ARMED trigger the SOFT FIRING gate forces clean, so `first.reasonKey === 'NONE'` and the `carriesContext` assertion passes via the `|| reasonKey === 'NONE'` disjunct. No store test proves a SOFT downgrade with `carriedArmedReason` survives the selector path. Combined with CR-01, the selector SOFT family is effectively untested end to end.
**Fix:** Seed a selector fixture where SMT is suppressed yet FIRE still occurs (e.g. ES legs that decouple corr while preserving the FVG/displacement gates), assert `selectFatalFlaw().downgraded === true` and `carriedArmedReason === 'FIRE_LONG'` without pre-consuming the fire, or explicitly document that selector SOFT is SMT-only.

## Info

### IN-01: "One sharedEpoch call only" comment is inaccurate — flaw path calls it twice

**File:** `src/lib/store.ts:890-891` (comment at 881-883)
**Issue:** `selectFatalFlaw` calls `sharedEpoch(get)` once directly, then `get().selectTrigger()` calls it again internally (line 847). Values cohere because both read the same unmutated `nq1h.lastUpdatedISO` synchronously, so behavior is correct, but the "never a second epoch" claim is false as written and will mislead the Phase 18 replay audit.
**Fix:** Reword to "one direct call; the inner trigger derivation re-reads the same state key synchronously so both epochs cohere" or thread the epoch: `deriveTrigger(epoch)` per WR-01.

### IN-02: Weak `Record<string, string>` typing on sentence/challenge banks

**File:** `src/lib/ict/invalidation.ts:110,131`
**Issue:** `SENTENCE_BY_KEY` and `CHALLENGE_BY_KEY` accept arbitrary keys; a typo'd lookup returns `undefined` at runtime despite the `string` return type on `sentenceFor`/`challengeFor` (direct index at lines 121-122 with no fallback on missing key — fallback only covers direction mismatch, not a deleted key). `REASON_BY_KEY`/`UNBLOCK_BY_KEY` are correctly keyed by `FlawReasonKey`.
**Fix:** `export const SENTENCE_BY_KEY: Record<'LONG-LOW' | 'SHORT-HIGH' | 'LONG-HIGH' | 'SHORT-LOW', string>` and `Record<'premium-chase' | 'pre-news-engineering' | 'smt-divergence-ignored', string>`.

### IN-03: `sharedEpoch` wall-clock fallback breaks replay determinism when ISO is missing

**File:** `src/lib/store.ts:439-443`
**Issue:** When `nq1h.lastUpdatedISO` is null/unparseable, epoch falls back to `new Date().getTime()`. Two back-to-back flaw calls across a second boundary then yield different `asOf` values, breaking the byte-identical determinism the coherence test pins (test passes only because the seed pins the ISO). Pre-existing pattern shared with trigger/AMD, flagged here because flaw `asOf` feeds Phase 18 replay.
**Fix:** Document the fallback as degraded-mode only, or return `null` from `selectFatalFlaw` when the ISO is missing instead of stamping wall-clock time.

### IN-04: `assertValidTrigger` permits `direction: undefined`, outside the `TriggerDirection` type

**File:** `src/lib/ict/invalidation.ts:160`
**Issue:** `TriggerDirection` is `'LONG' | 'SHORT' | null` (trigger.ts:34) but the validator explicitly allows `undefined`. A trigger with `direction: undefined` slides through validation, then `isOppositeSweep` treats it like null (returns false) and `sentenceFor` hits the fallback. Permissive but inconsistent with the type the store actually produces (always LONG/SHORT/null).
**Fix:** Drop `&& t.direction !== undefined` so undefined throws with a `got`-string, matching the declared type.

### IN-05: Intraday-stale masks HARD STALE_LEG as degraded null — pure vs selector divergence undocumented

**File:** `src/lib/store.ts:886-888` vs `src/lib/ict/invalidation.ts:307-309`
**Issue:** Pure `checkFatalFlaw` returns HARD `STALE_LEG` kill for any of the four stale legs including `nq1h`/`nq15m`, but `selectFatalFlaw` early-returns `null` on intraday stale/empty before reaching the disjunction, so the HARD kill for those two legs never surfaces via the selector (daily `nq`/`es` stale does surface as HARD kill). This matches the "HARD-on-null is planner-confirmed null" decision and is safe (null never presents stale data at full strength per T-16-01), but the divergence between pure-table behavior and selector behavior is pinned only implicitly by flaw-stale; no test pins daily-stale → HARD kill through the selector.
**Fix:** Add a selector case seeding `nq.stale = true` with live intraday legs asserting `selectFatalFlaw().reasonKey === 'STALE_LEG'`, and note the intraday-null vs daily-kill split in the selector comment so Phase 17 handles both.

---

_Reviewed: 2026-09-11T12:30:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
