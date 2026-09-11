---
phase: 16-fatal-flaw-invalidation
verified: 2026-09-11T12:35:00Z
status: gaps_found
score: 11/12 must-haves verified
covered_files: [".planning/phases/16-fatal-flaw-invalidation/16-01-SUMMARY.md", ".planning/phases/16-fatal-flaw-invalidation/16-02-PLAN.md", ".planning/phases/16-fatal-flaw-invalidation/16-02-SUMMARY.md", "src/lib/ict/invalidation.test.ts", "src/lib/ict/invalidation.ts", "src/lib/store.test.ts", "src/lib/store.ts"]
covered_digest: "v1:sha256:0e75aae5df949266e8d2332b6d580520862a58be092f5c61f1d2f84d84bb3de9"
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "User sees SOFT flaws (SMT suppressed, confirmed opposite sweep) downgrading FIRING to ARMED only, each with a stated unblock condition"
    status: partial
    reason: "CR-01 CONFIRMED in code: the OPPOSITE_SWEEP SOFT branch is unreachable through the production selector path by construction, so half the SOFT taxonomy never downgrades live. SMT-suppressed SOFT works; opposite-sweep SOFT is pure-layer-only dead logic."
    artifacts:
      - path: "src/lib/store.ts"
        issue: "selectFatalFlaw (lines 890-902) derives trigger via get().selectTrigger() and reads judas via get().selectJudas() from identical state, then calls checkFatalFlaw on both"
      - path: "src/lib/ict/invalidation.ts"
        issue: "isOppositeSweep (lines 238-245) uses impliedDirection mapping identical to trigger.ts directionOf (lines 223-227), so same-snapshot comparison is tautologically equal"
    missing:
      - "Pick one per 16-REVIEW.md CR-01: (a) compare the confirmed sweep against an independent basis (pre-sweep bias/AMD phase or prior-poll direction), (b) delete the OPPOSITE_SWEEP branch and shrink the taxonomy rather than ship dead logic, or (c) add a selector-level test documenting the impossibility so Phase 17 never depends on it"
deferred:
  - truth: "User reads a falsifiable fatal-flaw sentence plus a challenge question from a fixed bank in live report §6"
    addressed_in: "Phase 17"
    evidence: "Phase 17 goal: 'User sees live report §§4–6 blocks with verbatim reasons' — Phase 16 ships the §6-ready strings (D-11), Phase 17 wires the §6 UI block"
---

# Phase 16: Fatal-Flaw Invalidation Verification Report

**Phase Goal:** Users never act on a setup that a fatal flaw already killed — invalidation supersedes fire on the same snapshot (ROADMAP.md Phase 16; Success Criteria 1–3)
**Verified:** 2026-09-11T12:35:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees an invalidated verdict from checkFatalFlaw on the same snapshot as the trigger, where flaw deterministically supersedes fire and never flickers across polls with no new market information (16-01 T1; SC1; FLAW-01) | ✓ VERIFIED | `checkFatalFlaw` first-match-wins disjunction (`invalidation.ts:301-324`); 100-run byte-identical determinism test green; race fixture carries trigger + flaw reasons; flaw-coherence back-to-back byte-equality green; re-ran 21/21 + 35/35 |
| 2 | User sees HARD flaws (rollover-week corruption, stale leg) killing the setup from any state versus SOFT flaws (SMT suppressed, confirmed opposite sweep) downgrading FIRING to ARMED only, each with a stated unblock condition (16-01 T2; SC2; FLAW-02) | ✗ FAILED (partial) | HARD kills ✓, SMT-SOFT downgrade ✓, unblocks ✓ — but **CR-01 CONFIRMED**: OPPOSITE_SWEEP branch unreachable via `selectFatalFlaw` (see CR-01 adjudication). Half the SOFT taxonomy never downgrades live |
| 3 | Every flaw verdict prints its specific Azerbaijani reason plus HARD/SOFT class and unblock; the banned generic single-word label never appears as a reason (16-01 T3; FLAW-02) | ✓ VERIFIED | 5-entry `REASON_BY_KEY` + 5-entry `UNBLOCK_BY_KEY`, `toBe`-pinned; ban assertions (`reason !== 'Invalidated'`, non-empty unblock) green in both taxonomy and prose suites |
| 4 | checkFatalFlaw consumes the exact TriggerOutput plus smt/judas/rollover/stale envelopes plus injected asOf, never raw candles or clocks (16-01 K1) | ✓ VERIFIED | `FatalFlawInput` shape (`invalidation.ts:28-41`); type-only imports, no `Date.now(`, no store import (node check); purity guard 2/2 green |
| 5 | selectFatalFlaw derives the trigger first on one sharedEpoch call then applies the flaw by function order, never a second clock read (16-01 K2) | ✓ VERIFIED (with note) | Trigger-first + function order confirmed (`store.ts:890-902`); flaw `asOf` equals trigger seed epoch (coherence test pins `2026-02-09T08:00:00Z`). NOTE IN-01: the "one call" comment is letter-inaccurate — inner `selectTrigger()` re-reads `sharedEpoch` (`store.ts:847`) — but both read the same unmutated key synchronously so values cohere; behavior correct, comment misleading |
| 6 | SOFT branches consult trigger verdict and carry trigger reasonKey forward as carriedArmedReason per D-15 (16-01 K3) | ✓ VERIFIED | FIRING gate + `trigger.reasonKey` carry (`invalidation.ts:312-323`); pinned (`carriedArmedReason === 'FIRE_LONG'/'FIRE_SHORT'`); SOFT-on-ARMED returns clean standing verdict |
| 7 | User reads a falsifiable fatal-flaw sentence selected from a fixed rule table keyed on bias direction and nearest unswept pool, test-pinned verbatim (16-02 T1; SC3-strings; FLAW-03) | ✓ VERIFIED | 4-cell `SENTENCE_BY_KEY` (`invalidation.ts:110-115`, LONG-LOW / SHORT-HIGH live cells + neutral fallback per plan) with `toBe` pins on every cell incl. null-side fallback |
| 8 | User reads a challenge question from a fixed 3-entry bank selected deterministically by the dominant trap, test-pinned verbatim (16-02 T2; FLAW-03) | ✓ VERIFIED | `CHALLENGE_BY_KEY` exactly 3 entries, bank-size + repeat-call determinism tests green, all entries `toBe`-pinned |
| 9 | Selector-level flaw behavior is coherent: stale legs refuse with null and the flaw output shares the trigger epoch with no second clock read (16-02 T3; FLAW-01) | ✓ VERIFIED | flaw-stale (stale nq15m → null, no throw, trigger null too) + flaw-coherence (byte-identical, shared epoch) green in `store.test.ts` |
| 10 | Sentence table resolves purely from trigger.direction plus judas.sweepSide on the D-05 snapshot, never new row reads (16-02 K1) | ✓ VERIFIED | `sentenceFor` (`invalidation.ts:117-124`) reads only the two envelope fields; no imports beyond types |
| 11 | Challenge selection priority (SMT flaw, then opposite-sweep, else standing caution) is a code-ordering fact (16-02 K2) | ✓ VERIFIED | `challengeFor` (`invalidation.ts:138-142`) order + tests pinning SMT→smt-divergence-ignored, sweep→premium-chase, HARD/clean→pre-news-engineering |
| 12 | store.test.ts flaw cases copy the trigger-stale and trigger-coherence idiom line-for-line (16-02 K3) | ✓ VERIFIED | flaw-stale + flaw-coherence present (`store.test.ts:1184-1243`), same resetDualState/seed/setState-stale/back-to-back shape; 35/35 green on re-run |

**Score:** 11/12 truths verified (0 present, behavior-unverified)

### CR-01 Adjudication (required: confirm as gap or refute with evidence)

**Claim:** SOFT `OPPOSITE_SWEEP` is dead code via `selectFatalFlaw` — same-snapshot tautology, half the SOFT taxonomy never downgrades live.

**Verdict: CONFIRMED — real gap.** Traced end to end in code:

1. `selectFatalFlaw` (`store.ts:890-894`) derives `trigger` via `get().selectTrigger()` and reads `judas` via `get().selectJudas()` from the identical state, then calls `checkFatalFlaw({ trigger, judas, … })` (`store.ts:902`).
2. `evaluateTrigger` computes `direction = directionOf(judas.sweepSide)` (`trigger.ts:297-299`): HIGH→SHORT, LOW→LONG.
3. `isOppositeSweep` (`invalidation.ts:238-245`) computes `implied = impliedDirection(judas.sweepSide)` (`invalidation.ts:228-232`) with the **identical** mapping and returns `trigger.direction !== implied`.
4. Same snapshot ⇒ same `sweepSide` ⇒ `direction === implied` ⇒ always `false` in production. A `FIRE_LONG` requires a LOW sweep (purge gate + LONG direction both keyed on LOW); the FIRE_LONG + confirmed-HIGH combination that fires `OPPOSITE_SWEEP` cannot co-occur from one judas envelope.
5. The branch fires only in unit tests with synthetically mismatched envelopes (`invalidation.test.ts:136-162` — note the line-136 title even names the wrong side, WR-03).
6. The SMT-SOFT half is NOT dead: the trigger never gates FIRE on SMT (read-only agree-tag, `trigger.ts:132-157`), so FIRE + suppressed SMT co-occurs live. The dead half is specifically opposite-sweep.

Net effect as claimed: Phase 17 §6 will never render an opposite-sweep downgrade; the shipped taxonomy over-promises. Gap recorded above with the review's three fix options (independent basis / delete branch / document impossibility). This is a **design decision for the developer** — hence `gaps_found`, not a silent pass.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Live report §6 rendering of the sentence + challenge bank (SC3's delivery surface) | Phase 17 | Phase 17 goal: "User sees live report §§4–6 blocks with verbatim reasons"; 16-CONTEXT D-11 scopes Phase 16 to shipping the pure strings |

### Advisory (New Scope, Unevidenced)

None — initial verification; review warnings below are scoped as warnings, not blockers.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ict/invalidation.ts` | FlawClass, FlawReasonKey, FatalFlawInput/Output (10 fields), checkFatalFlaw, prose tables | ✓ VERIFIED | 326 lines, substantive; all exports present; purity holds |
| `src/lib/ict/invalidation.test.ts` | Taxonomy + determinism + prose + boundary describes | ✓ VERIFIED | 388 lines; 21/21 green on re-run |
| `src/lib/store.ts` (`selectFatalFlaw`) | Interface entry + selector, trigger-first, never-throw | ✓ VERIFIED | Lines 257, 884-906; imported AND used; never-throw envelope |
| `src/lib/store.test.ts` (flaw cases) | flaw-stale + flaw-coherence | ✓ VERIFIED | Lines 1184-1243; 35/35 green on re-run |

Level 4 data-flow: N/A (no UI rendering in this phase; strings are fixed templates by design, Phase 17 renders them). No hollow props, no static-fallback-for-live-data.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `checkFatalFlaw` | trigger/smt/judas/rollover/stale envelopes + asOf | `FatalFlawInput` destructuring, boundary validators | WIRED | No candle/clock inputs; purity guard green |
| `selectFatalFlaw` | `selectTrigger` | `get().selectTrigger()` first inside try (`store.ts:891`) | WIRED | Trigger-null → null; SOFT never evaluated on null |
| SOFT downgrade | `carriedArmedReason` | `trigger.reasonKey` forwarded (`invalidation.ts:316,322`) | WIRED (pure layer) | Selector SOFT path untested live (WR-06) but structurally wired |
| Flaw output | `asOf` epoch | Single `sharedEpoch` truth, coherence-pinned | WIRED | See IN-01 note on the "one call" comment |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Invalidation suite green | `npx vitest run src/lib/ict/invalidation.test.ts` | 21 passed | ✓ PASS |
| Store suite green (incl. flaw-stale + flaw-coherence) | `npx vitest run src/lib/store.test.ts` | 35 passed | ✓ PASS |
| Purity guard green (auto-covers invalidation.ts via glob) | `npx vitest run src/lib/ict/purity.test.ts` | 2 passed | ✓ PASS |
| Typecheck clean | `npx tsc --noEmit` | clean (no output) | ✓ PASS |

Full suite 367/367 claim from 16-02-SUMMARY not re-run (scoped re-runs only); no regressions in touched suites.

### Probe Execution

No probes declared for this phase (pure lib + selector; vitest is the contract). Skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FLAW-01 | 16-01, 16-02 | Invalidated/not verdict on the same snapshot as trigger — deterministically supersedes fire, never flickers | ✓ SATISFIED | Disjunction order + 100-run determinism + race fixture + flaw-stale/coherence epoch sharing |
| FLAW-02 | 16-01 | HARD (rollover/stale — kill) distinguished from SOFT (downgrade FIRING→ARMED with unblock) | ⚠️ PARTIAL | HARD kills ✓ both legs; SMT-SOFT ✓ live-capable; **opposite-sweep SOFT dead live (CR-01 gap)**; unblocks + ban ✓ |
| FLAW-03 | 16-02 | Falsifiable sentence + challenge from fixed bank in live §6 | ✓ SATISFIED (strings) | 4-cell table + 3-entry bank verbatim-pinned; §6 rendering deferred to Phase 17 (see Deferred) |

No orphaned requirements: all three Phase 16 IDs (FLAW-01/02/03) claimed across 16-01 (FLAW-01, FLAW-02) + 16-02 (FLAW-01, FLAW-03). 16-VALIDATION.md is `status: draft` (validate-phase not yet run) — noted per instructions, not blocking.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | `TBD/FIXME/XXX` debt markers | — | None found (rg clean) |
| `src/lib/ict/invalidation.ts` | — | `Date.now` / store imports / `console.log` | — | None (node check clean) |
| `src/lib/store.ts` | 884-906 + 869 | WR-01: `selectFatalFlaw` → `selectTrigger()` double firing-log appends (ARMED polls append 2×/poll, cap fills 2× fast; FIRE masked by dedup) | ⚠️ Warning | Real but out-of-goal (Phase 15 log integrity); recommend split pure `deriveTrigger(epoch)` in follow-up — not a Phase 16 gap |
| `src/lib/ict/invalidation.ts` | 80-136 | WR-02: exported prose records mutable — `toBe` contract tamperable at runtime | ⚠️ Warning | Recommend `Object.freeze` + `Readonly<>`; follow-up |
| `src/lib/ict/invalidation.test.ts` | 136 | WR-03: test title says HIGH sweep, fixture uses LOW | ⚠️ Warning | Body correct, title wrong; rename |
| `src/lib/ict/invalidation.test.ts` | 366-388 | WR-04: boundary throws pin trigger-only; smt/judas/rollover/stale malformed shapes + `asOf: -1/Infinity` unpinned | ⚠️ Warning | Validators exist and throw; coverage gap only |
| `src/lib/ict/invalidation.test.ts` | 187-193 | WR-05: only rollover-beats-SMT pinned; rollover-beats-stale + SMT-beats-sweep unpinned | ⚠️ Warning | Reorder would pass green; add two order tests |
| `src/lib/store.test.ts` | 1210-1243 | WR-06: coherence fixture lands post-fire ARMED → always clean NONE; selector SOFT never exercised live | ⚠️ Warning | Related to CR-01 gap; SMT-live fixture or explicit SMT-only documentation |
| `src/lib/store.ts` | 881-883 | IN-01: "one sharedEpoch call only" comment inaccurate (inner trigger re-reads) | ℹ️ Info | Behavior correct; reword comment or thread epoch |
| others | — | IN-02…IN-05 (weak bank typing, wall-clock fallback, `direction: undefined` permitted, intraday-stale null vs daily-stale kill divergence) | ℹ️ Info | Documented in 16-REVIEW.md; follow-up material |

### Human Verification Required

None — automation + code trace decide everything here. The CR-01 fix choice (independent basis vs delete branch vs document) is a developer planning decision carried by the structured gap above, not a runtime behavior needing human eyes.

### Gaps Summary

One gap blocks the phase goal: **the OPPOSITE_SWEEP SOFT branch can never fire through `selectFatalFlaw`** (CR-01, confirmed by tracing `store.ts:890-902` → `trigger.ts:297-299` → `invalidation.ts:228-245`). Everything else in the phase is genuinely achieved — HARD kills from any state, SMT SOFT downgrade with carried reason and unblock, deterministic same-snapshot supersession, verbatim Azerbaijani tables pinned by 21 unit tests, selector stale-refusal and epoch coherence pinned by store tests, purity + tsc clean on re-run. The six warnings and five infos from code review are real but out-of-goal (log amplification, mutable exports, test-title/coverage gaps, comment accuracy) and belong in follow-up work, not in this phase's exit gate. The §6-render remainder of SC3 is explicitly Phase 17 scope (deferred, not a gap). Close the gap by choosing the review's option (a)/(b)/(c); until then the shipped SOFT taxonomy over-promises what users can ever see.

---

_Verified: 2026-09-11T12:35:00Z_
_Verifier: the agent (gsd-verifier)_
