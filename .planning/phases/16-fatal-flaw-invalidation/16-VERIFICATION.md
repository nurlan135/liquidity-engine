---
phase: 16-fatal-flaw-invalidation
verified: 2026-09-11T15:55:00Z
status: passed
score: 12/12 must-haves verified
covered_files: [".planning/REQUIREMENTS.md", ".planning/phases/16-fatal-flaw-invalidation/16-01-PLAN.md", ".planning/phases/16-fatal-flaw-invalidation/16-01-SUMMARY.md", ".planning/phases/16-fatal-flaw-invalidation/16-02-PLAN.md", ".planning/phases/16-fatal-flaw-invalidation/16-02-SUMMARY.md", ".planning/phases/16-fatal-flaw-invalidation/16-03-PLAN.md", ".planning/phases/16-fatal-flaw-invalidation/16-03-SUMMARY.md", "src/lib/ict/invalidation.test.ts", "src/lib/ict/invalidation.ts", "src/lib/store.test.ts", "src/lib/store.ts"]
covered_digest: "v1:sha256:2858fcfd71ed96f1118394bfdcf9ae2b1b7549353d1e6616668be79f7f5fea7c"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 11/12
  gaps_closed:
    - "User sees SOFT flaws (SMT suppressed, confirmed opposite sweep) downgrading FIRING to ARMED only — CR-01 opposite-sweep dead branch closed via option (c): SMT SOFT proven live, opposite-sweep pinned synthetic-only"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "User reads a falsifiable fatal-flaw sentence plus a challenge question from a fixed bank in live report §6"
    addressed_in: "Phase 17"
    evidence: "Phase 17 goal: 'Users see the full execution picture — deterministic paper ticket, live §§4–6, chart pins' (ROADMAP.md Phase 17, SC4/TICK-04) — Phase 16 ships the §6-ready strings, Phase 17 wires the §6 UI block"
---

# Phase 16: Fatal-Flaw Invalidation Verification Report

**Phase Goal:** Users never act on a setup that a fatal flaw already killed — invalidation supersedes fire on the same snapshot
**Verified:** 2026-09-11T15:55:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (16-03, commits c09628d + 0880a1f + 1cbaca4)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees an invalidated verdict from checkFatalFlaw on the same snapshot as the trigger, where flaw deterministically supersedes fire and never flickers across polls with no new market information (16-01 T1; SC1; FLAW-01) | ✓ VERIFIED | `checkFatalFlaw` first-match-wins disjunction (`invalidation.ts:305-328`); 100-run byte-identical determinism test green; race fixture carries trigger + flaw reasons; flaw-coherence back-to-back byte-equality green; re-ran 21/21 invalidation + 37/37 store |
| 2 | User sees HARD flaws (rollover-week corruption, stale leg) killing the setup from any state versus SOFT flaws downgrading FIRING to ARMED only, each with a stated unblock condition — SOFT taxonomy honest as shipped: SMT SOFT live, opposite-sweep synthetic-only documented (16-01 T2; 16-03 gap closure; SC2; FLAW-02) | ✓ VERIFIED | HARD kills ✓ both legs (taxonomy tests green). **SMT SOFT now proven LIVE**: `flaw-soft-live-smt` (`store.test.ts:1187-1207`) seeds London LOW-sweep FIRE state, first `selectFatalFlaw()` derivation yields downgraded=true, invalidated=false, SOFT, SMT_SUPPRESSED, carriedArmedReason=FIRE_LONG, unblock contains `0.70`, reason equals REASON_BY_KEY — green in 37/37 re-run. **Opposite-sweep documented synthetic-only**: `flaw-opposite-impossible-live` (`store.test.ts:1212-1239`) pins trigger.direction equals sweep-implied direction on identical state and never-OPPOSITE_SWEEP on both derivations — green; header SYNTHETIC-ONLY NOTE (`invalidation.ts:13-16`) + synthetic-envelope comments (`invalidation.test.ts:136-138`) committed; zero verdict-logic diff (+4/-0 comment-only in `invalidation.ts` per `git diff c09628d^..0880a1f`). Unblocks + ban still green. Gap-closure option (c) as prescribed by prior gap `missing` — closed |
| 3 | Every flaw verdict prints its specific Azerbaijani reason plus HARD/SOFT class and unblock; the banned generic single-word label never appears as a reason (16-01 T3; FLAW-02) | ✓ VERIFIED | 5-entry `REASON_BY_KEY` + 5-entry `UNBLOCK_BY_KEY`, `toBe`-pinned; ban assertions green in taxonomy + prose suites; re-ran 21/21 |
| 4 | checkFatalFlaw consumes the exact TriggerOutput plus smt/judas/rollover/stale envelopes plus injected asOf, never raw candles or clocks (16-01 K1) | ✓ VERIFIED | `FatalFlawInput` shape (`invalidation.ts:32-45`); type-only imports, no `Date.now`, no store import (rg clean); purity guard 2/2 green on re-run |
| 5 | selectFatalFlaw derives the trigger first on one sharedEpoch call then applies the flaw by function order, never a second clock read (16-01 K2) | ✓ VERIFIED (with note) | Trigger-first + function order confirmed (`store.ts:890-902`); flaw `asOf` equals trigger seed epoch (coherence test). NOTE IN-01 carried forward: the "one call" comment is letter-inaccurate — inner `selectTrigger()` re-reads `sharedEpoch` — but both read the same unmutated key synchronously so values cohere; behavior correct, comment misleading; unchanged by 16-03, not blocking |
| 6 | SOFT branches consult trigger verdict and carry trigger reasonKey forward as carriedArmedReason per D-15 (16-01 K3) | ✓ VERIFIED | FIRING gate + `trigger.reasonKey` carry (`invalidation.ts:316-326`); pinned `carriedArmedReason === 'FIRE_LONG'/'FIRE_SHORT'` in pure tests AND now live in `flaw-soft-live-smt` (`carriedArmedReason === 'FIRE_LONG'` through the real selector); SOFT-on-ARMED returns clean standing verdict |
| 7 | User reads a falsifiable fatal-flaw sentence selected from a fixed rule table keyed on bias direction and nearest unswept pool, test-pinned verbatim (16-02 T1; SC3-strings; FLAW-03) | ✓ VERIFIED | 4-cell `SENTENCE_BY_KEY` (`invalidation.ts:114-119`, LONG-LOW / SHORT-HIGH live cells + neutral fallback) with `toBe` pins on every cell incl. null-side fallback; 16-03 changed no strings (byte-identical per diff) |
| 8 | User reads a challenge question from a fixed 3-entry bank selected deterministically by the dominant trap, test-pinned verbatim (16-02 T2; FLAW-03) | ✓ VERIFIED | `CHALLENGE_BY_KEY` exactly 3 entries, bank-size + repeat-call determinism green, all entries `toBe`-pinned; unchanged by 16-03 |
| 9 | Selector-level flaw behavior is coherent: stale legs refuse with null and the flaw output shares the trigger epoch with no second clock read (16-02 T3; FLAW-01) | ✓ VERIFIED | flaw-stale (stale nq15m → null, no throw, trigger null too) + flaw-coherence (byte-identical, shared epoch) green in `store.test.ts`; 37/37 on re-run (35 prior + 2 new, no loss) |
| 10 | Sentence table resolves purely from trigger.direction plus judas.sweepSide on the D-05 snapshot, never new row reads (16-02 K1) | ✓ VERIFIED | `sentenceFor` (`invalidation.ts:121-128`) reads only the two envelope fields; no imports beyond types; unchanged |
| 11 | Challenge selection priority (SMT flaw, then opposite-sweep, else standing caution) is a code-ordering fact (16-02 K2) | ✓ VERIFIED | `challengeFor` (`invalidation.ts:142-146`) order + tests pinning SMT→smt-divergence-ignored, sweep→premium-chase, HARD/clean→pre-news-engineering; unchanged |
| 12 | store.test.ts flaw cases copy the trigger-stale and trigger-coherence idiom line-for-line (16-02 K3) | ✓ VERIFIED | flaw-stale + flaw-coherence present, same resetDualState/seed/setState-stale/back-to-back shape; two new cases (`flaw-soft-live-smt`, `flaw-opposite-impossible-live`) beside them in the same idiom; 37/37 green on re-run |
| 13 | 16-03 T1: SMT-suppressed SOFT downgrades FIRING to ARMED live through selectFatalFlaw with stated unblock and carried ARMED reason (FLAW-01/FLAW-02) | ✓ VERIFIED | `flaw-soft-live-smt` as in #2; first-derivation discipline (never pre-call selectTrigger) with explanatory comment (`store.test.ts:1192-1194`) + seed-decoupling comment (1184-1186); green |
| 14 | 16-03 T2a: confirmed opposite-sweep SOFT documented as unreachable through the production selector so Phase 17 never depends on it, pure-layer branch stays pinned for synthetic inputs (FLAW-02) | ✓ VERIFIED | `flaw-opposite-impossible-live` as in #2; header note (`invalidation.ts:13-16`); synthetic-only comments (`invalidation.test.ts:136-138`); corrected line-139 title now names LOW sweep matching its SHORT+LOW fixture; companion HIGH title verified correct (line 157); pure-layer OPPOSITE_SWEEP precedence still pinned (both synthetic tests green in 21/21) |
| 15 | 16-03 T2b: SOFT taxonomy as shipped behaves live exactly as tested, no dead logic presented as live capability (FLAW-02) | ✓ VERIFIED | Zero verdict-logic diff (only +4 comment lines in `invalidation.ts`, +57 test lines in `store.test.ts`, +5/-1 title+comment in `invalidation.test.ts` per `git diff ed21da4..HEAD --stat`); FlawReasonKey union unchanged with OPPOSITE_SWEEP retained per D-02; reason/unblock/sentence/challenge strings byte-identical so verbatim pins re-run green |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

> Rows 13–15 are the 16-03 gap-closure acceptance proofs, recorded explicitly so the gap truth (#2) is auditable; the headline score stays on the 12 phase truths per the re-verification instruction.

### CR-01 Re-adjudication (gap-closure check)

**Prior verdict:** CONFIRMED — real gap. `isOppositeSweep` used the identical sweepSide→direction mapping as the trigger, so same-snapshot comparison was tautologically false in production; SMT SOFT was live-capable but unproven live (WR-06).

**Closure required (prior gap `missing`):** pick one of (a) independent basis, (b) delete branch, or (c) selector-level test documenting the impossibility.

**Now: CLOSED via option (c), verified in code (not SUMMARY claims):**

1. `flaw-soft-live-smt` exists (`store.test.ts:1187`) and passes — first `selectFatalFlaw()` on seeded London LOW-sweep state yields `downgraded=true / SOFT / SMT_SUPPRESSED / carriedArmedReason=FIRE_LONG / unblock∋0.70` through the real selector path. SMT SOFT is live, not merely live-capable.
2. `flaw-opposite-impossible-live` exists (`store.test.ts:1212`) and passes — asserts `trigger.direction === implied` (LOW→LONG) on identical state, first derivation is SMT_SUPPRESSED (first-match-wins), second ARMED derivation is never OPPOSITE_SWEEP, with the Phase-17 SMT-only comment. The impossibility is pinned at the selector level.
3. Source honesty: SYNTHETIC-ONLY NOTE in `invalidation.ts:13-16` names the branch synthetic-only and directs Phase 17 to treat live SOFT as SMT-only; synthetic-envelope comments in `invalidation.test.ts:136-138` scope both opposite-sweep tests to pure-layer precedence; line-139 title corrected to LOW sweep (WR-03 closed).
4. No logic smuggling: `git diff` on `invalidation.ts` between gap-closure commits is +4/-0 comment-only; strings, thresholds, input shape, branch order all byte-identical; `FlawReasonKey` union retains OPPOSITE_SWEEP per D-02 (no blast radius).
5. Full behavior re-run by the verifier (own process, not SUMMARY narration): invalidation 21/21, store 37/37, purity 2/2, `tsc --noEmit` clean.

Net: the shipped taxonomy no longer over-promises — Phase 17 can only read live SOFT as SMT-only, with the pin to prove it.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Live report §6 rendering of the sentence + challenge bank (SC3's delivery surface) | Phase 17 | Phase 17 goal: "Users see the full execution picture — deterministic paper ticket, live §§4–6, chart pins" (ROADMAP.md Phase 17; TICK-04). 16-CONTEXT D-11 scopes Phase 16 to shipping the pure strings |

### Advisory (New Scope, Unevidenced)

None — re-verification; no new-scope findings raised. Prior warnings below are scoped follow-up material, not blockers.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ict/invalidation.ts` | FlawClass, FlawReasonKey, FatalFlawInput/Output (10 fields), checkFatalFlaw, prose tables + synthetic-only note | ✓ VERIFIED | 329 lines (+4 comment-only vs prior), substantive; all exports present; purity holds; zero logic diff |
| `src/lib/ict/invalidation.test.ts` | Taxonomy + determinism + prose + boundary + synthetic-only comments + corrected title | ✓ VERIFIED | 391 lines; 21/21 green on verifier re-run |
| `src/lib/store.ts` (`selectFatalFlaw`) | Interface entry + selector, trigger-first, never-throw | ✓ VERIFIED | Lines 884-906; imported AND used; never-throw envelope; untouched by 16-03 (no production change, as planned) |
| `src/lib/store.test.ts` (flaw cases) | flaw-stale + flaw-coherence + flaw-soft-live-smt + flaw-opposite-impossible-live | ✓ VERIFIED | Lines 1187-1239 new cases beside 1241+ stale/coherence; 37/37 green on verifier re-run |

Level 4 data-flow: N/A (no UI rendering in this phase; strings are fixed templates by design, Phase 17 renders them). No hollow props, no static-fallback-for-live-data.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `checkFatalFlaw` | trigger/smt/judas/rollover/stale envelopes + asOf | `FatalFlawInput` destructuring, boundary validators | WIRED | No candle/clock inputs; purity guard green |
| `selectFatalFlaw` | `selectTrigger` | `get().selectTrigger()` first inside try (`store.ts:891`) | WIRED | Trigger-null → null; SOFT never evaluated on null |
| SMT SOFT live | `selectFatalFlaw` downgrade + `carriedArmedReason` + `0.70` unblock | First-derivation fixture through the real selector (`flaw-soft-live-smt`) | WIRED (live) | downgraded/SOFT/SMT_SUPPRESSED/FIRE_LONG carry pinned live — closes WR-06 |
| Opposite-sweep impossibility | direction-equals-implied + never-OPPOSITE_SWEEP | Identical-state selector assertions (`flaw-opposite-impossible-live`) | WIRED (proof) | Pure `isOppositeSweep` still wired for synthetic inputs; production path pinned impossible |
| SOFT downgrade | `carriedArmedReason` | `trigger.reasonKey` forwarded (`invalidation.ts:320,326`) | WIRED | Pinned pure + live |
| Flaw output | `asOf` epoch | Single `sharedEpoch` truth, coherence-pinned | WIRED | See IN-01 note |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Invalidation suite green | `npx vitest run src/lib/ict/invalidation.test.ts` | 21 passed | ✓ PASS |
| Store suite green (incl. 2 new 16-03 cases) | `npx vitest run src/lib/store.test.ts` | 37 passed | ✓ PASS |
| Purity guard green (auto-covers invalidation.ts via glob) | `npx vitest run src/lib/ict/purity.test.ts` | 2 passed | ✓ PASS |
| Typecheck clean | `npx tsc --noEmit` | clean (no output) | ✓ PASS |

All four commands run by the verifier in its own process. Commits `c09628d`, `0880a1f`, `1cbaca4` confirmed present in `git log`.

### Probe Execution

No probes declared for this phase (pure lib + selector; vitest is the contract). Skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FLAW-01 | 16-01, 16-02, 16-03 | Invalidated/not verdict on the same snapshot as trigger — deterministically supersedes fire, never flickers | ✓ SATISFIED | Disjunction order + 100-run determinism + race fixture + flaw-stale/coherence epoch sharing + live SMT downgrade through the selector |
| FLAW-02 | 16-01, 16-03 | HARD (rollover/stale — kill) distinguished from SOFT (downgrade FIRING→ARMED with unblock) | ✓ SATISFIED (honest taxonomy) | HARD kills ✓ both legs; SMT-SOFT ✓ proven live with carried FIRE_LONG + 0.70 unblock; opposite-sweep documented + pinned synthetic-only (option (c) closure, no longer presented as live); unblocks + ban ✓ |
| FLAW-03 | 16-02 | Falsifiable sentence + challenge from fixed bank in live §6 | ✓ SATISFIED (strings) | 4-cell table + 3-entry bank verbatim-pinned, byte-identical through 16-03; §6 rendering deferred to Phase 17 (see Deferred) |

No orphaned requirements: all three Phase 16 IDs (FLAW-01/02/03) claimed across 16-01 (FLAW-01, FLAW-02) + 16-02 (FLAW-01, FLAW-03) + 16-03 (FLAW-01, FLAW-02). 16-VALIDATION.md is `status: draft` (validate-phase not yet run) — noted, not blocking.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | `TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER` debt markers | — | None found (rg clean on all three touched files) |
| `src/lib/ict/invalidation.ts` | — | `Date.now` / store imports / `console.log` | — | None (rg clean; purity guard green) |
| `src/lib/ict/invalidation.test.ts` | 139 (was 136) | WR-03: test title said HIGH sweep, fixture used LOW | ✅ Closed | Title now names LOW sweep matching SHORT+LOW fixture; companion HIGH title verified correct |
| `src/lib/store.test.ts` | 1187-1207 | WR-06: selector SOFT never exercised live | ✅ Closed | `flaw-soft-live-smt` pins SMT downgrade live through the selector |
| `src/lib/store.ts` | 884-906 + firing log | WR-01: `selectFatalFlaw` → `selectTrigger()` double firing-log appends | ⚠️ Warning | Real but out-of-goal (Phase 15 log integrity); recommend split pure `deriveTrigger(epoch)` in follow-up — not a Phase 16 gap |
| `src/lib/ict/invalidation.ts` | 84-140 | WR-02: exported prose records mutable | ⚠️ Warning | Recommend `Object.freeze` + `Readonly<>`; follow-up |
| `src/lib/ict/invalidation.test.ts` | boundary block | WR-04: boundary throws pin trigger-only; other malformed shapes unpinned | ⚠️ Warning | Validators exist and throw; coverage gap only |
| `src/lib/ict/invalidation.test.ts` | taxonomy order | WR-05: only rollover-beats-SMT pinned; other precedence pairs unpinned | ⚠️ Warning | Reorder would pass green; add two order tests in follow-up |
| `src/lib/store.ts` | 881-883 | IN-01: "one sharedEpoch call only" comment inaccurate (inner trigger re-reads) | ℹ️ Info | Behavior correct; reword comment or thread epoch |
| others | — | IN-02…IN-05 (weak bank typing, wall-clock fallback, `direction: undefined` permitted, intraday-stale null vs daily-stale kill divergence) | ℹ️ Info | Documented in 16-REVIEW.md; follow-up material |

### Human Verification Required

None — automation + code trace decide everything here. The CR-01 fix choice is settled (option (c) executed and pinned); no runtime behavior needs human eyes. No visual, real-time, or external-service surface in this phase.

### Gaps Summary

No gaps. The single prior gap (CR-01 opposite-sweep dead branch, FLAW-02 partial) is closed: SMT SOFT is proven live through `selectFatalFlaw` with carried FIRE_LONG reason and 0.70 unblock (`flaw-soft-live-smt` green), and opposite-sweep is documented plus selector-pinned as synthetic-only with a Phase-17 SMT-only directive (`flaw-opposite-impossible-live` green, header note + test comments committed, zero verdict-logic diff). All 12 phase truths verify green on verifier re-runs (21/21 + 37/37 + 2/2 + tsc clean), all three requirement IDs satisfied (FLAW-03 strings with §6 rendering deferred to Phase 17), no debt markers, no regressions. Phase goal achieved: users never act on a setup a fatal flaw already killed — invalidation supersedes fire on the same snapshot, and the SOFT taxonomy no longer over-promises what live state can produce.

---

_Verified: 2026-09-11T15:55:00Z_
_Verifier: the agent (gsd-verifier)_
