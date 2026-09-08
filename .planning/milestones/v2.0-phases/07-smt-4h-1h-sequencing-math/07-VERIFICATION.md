---
phase: 07-smt-4h-1h-sequencing-math
verified: 2026-09-07T11:15:00Z
status: passed
score: 16/16 must-haves verified
behavior_unverified: 0
overrides_applied: 0
note: "Repo has no gsd-tools fingerprint verb; covered_digest omitted. File note: on disk, 07-01-PLAN.md holds summary content and 07-01-SUMMARY.md holds plan content (names swapped); both were read, no coverage lost."
follow_ups:
  - finding: "CR-01 bpsGap cross-scale value"
    severity: critical
    verdict: deferrable
    fix_before: "Phase 9 report §3 (must not render bpsGap verbatim until fixed)"
  - finding: "CR-02 originIndex throw on stale origins"
    severity: critical
    verdict: deferrable
    fix_before: "Phase 8 selectors / Phase 9 wiring (any truncated-window caller)"
---

# Phase 07: SMT + 4H/1H Sequencing Math Verification Report

**Phase Goal:** Users see SMT divergence status and engineered-liquidity transition state from pure-function math
**Verified:** 2026-09-07T11:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SMT comparator returns BULLISH / BEARISH / NO-SIGNAL with swing references (nqWindow, esWindow) and names the sweeping leg (sweeperLeg NQ \| ES), never a bare detected flag | VERIFIED | `src/lib/ict/smt.ts:30-37` SmtSignal shape; `detectSMT` returns BEARISH/sweeperLeg NQ (`smt.ts:315-322`) and BULLISH/sweeperLeg ES (`smt.ts:331-339`); tests assert direction + sweeperLeg + non-null windows (`smt.test.ts:60-64,79-83`) |
| 2 | Rolling 20-day correlation below 0.70 suppresses SMT with reason CORR_DECOUPLED before any swing matching runs | VERIFIED | `evaluateSMT` gate order corr-first (`smt.ts:224-234`), returns before `matchSwings`; tests: decoupled w/ corr<0.70 (`smt.test.ts:184-204`), thin-history no-corr-field (`206-215`), flat-ES no-throw (`217-230`) |
| 3 | Either-leg rollover-suspect inside the comparison window suppresses SMT with reason rollover-week instead of a divergent signal | VERIFIED | Joint per-leg `detectRollover` + either-suspect suppression (`smt.ts:240-250`); JSON-backed joint fixture 25+25 bars (`src/lib/__fixtures__/smt-rollweek.json`); test asserts `rollover-week` (`smt.test.ts:232-243`) |
| 4 | [Flagged assumption ICT-08-unclassified] No hidden edge contract beyond D-01..D-07 governs the SMT happy path; bull/bear/choppy fixtures define truth | VERIFIED | Fixtures define truth as stipulated: bull, bear, choppy NO-SIGNAL (`smt.test.ts:148-164`), lookback-shift stability (`166-182`), exact-25bp edge (`245-258`) — all green |
| 5 | [Flagged assumption ICT-09-unclassified] No hidden edge contract beyond D-08 governs joint suppression; the roll-week fixture defines truth | VERIFIED | Fixture exists on disk (25 NQ + 25 ES bars, confirmed via node); single test pins suppressed-not-divergent (`smt.test.ts:232-243`) |
| 6 | FVG map detects both bullish and bearish gaps on NQ D1 and drops a gap when a later candle closes through it | VERIFIED | 3-candle scan both polarities (`fvg.ts:50-78`); close-through fill (`fvg.ts:85-111`); polarity tests with exact zones (`fvg.test.ts:22-50`), fill vs wick-touch tests (`61-86`) |
| 7 | Active map stays bounded to the latest ~20 gaps even over multi-year D1 history | VERIFIED | `FVG_MAP_BOUND = 20` (`fvg.ts:8`), `slice(-FVG_MAP_BOUND)` (`fvg.ts:110`); 200-bar fixture asserts length exactly 20 + constant pin (`fvg.test.ts:88-113`) |
| 8 | ERL/IRL transition fires only when one candle both pierces an FVG boundary with its wick and closes back inside on the same candle; pierce alone changes nothing | VERIFIED | Same-candle pierce+reject rule (`fvg.ts:129-160`); IRL flip with bounds+date (`fvg.test.ts:123-135`), sweep-alone null + gap untouched (`137-147`), boundary-close reject (`149-155`), touch-no-pierce null (`157-162`), bearish mirror (`164-176`) |
| 9 | A pure delivery-sentence builder returns an IRL-aware string from transition state for the §2 Delivery Cycle upgrade, with no new report section | VERIFIED | `describeDeliveryTransition` (`fvg.ts:166-177`); ERL token test, IRL bounds+date test, determinism test (`fvg.test.ts:179-217`) |
| 10 | [Flagged assumption ICT-10-unclassified] No hidden edge contract beyond D-09..D-11 governs gap identity and mitigation; polarity, mitigation, bound fixtures define truth | VERIFIED | Fixtures define truth as stipulated (polarity, mitigation, bound, sweep-vs-reject, sentence suites — 16 tests green) |
| 11 | Closed 1H rows bucket into 4H blocks on the 18:00 ET grid resolved per candle through IANA America/New_York, stable across March and November DST transitions | VERIFIED | `NY_TZ`/`DAY_OPEN_NY_HOUR`/`BLOCK_SIZE` (`aggregate.ts:12-16`), per-candle `formatInTimeZone` (`33-39`), anchor split B-labels (`aggregate.test.ts:47-61`), March + November DST pairs (`70-91`) |
| 12 | Only complete 4-candle blocks are emitted; trailing partial excluded until 4th hour closes; output byte-identical between polls with no new closed candle | VERIFIED | `!== BLOCK_SIZE` skip (`aggregate.ts:131-134`); 7-row → 1 block (`aggregate.test.ts:175-180`), forming exclusion (`182-193`), consecutive-poll deep-equal (`94-100`) |
| 13 | Emitted blocks carry the reused D1 Candle shape and feed computeRange plus computeBias unchanged | VERIFIED | Blocks pushed as `{date, open, high, low, close}` (`aggregate.ts:141-147`); reuse test feeds `computeRange`/`computeBias` with no module changes (`aggregate.test.ts:102-113`) |
| 14 | [Flagged assumption ICT-11-adjacency] A 1H row exactly on a 4H boundary belongs to the block starting there under floor semantics, never duplicated | VERIFIED | Floor `Math.floor(dist / BLOCK_SIZE)` (`aggregate.ts:84-85`); exact-boundary test asserts single membership (`aggregate.test.ts:127-135`) |
| 15 | [Flagged assumption ICT-11-empty] Empty, single-row, or sub-block input returns empty array, never partial, never throw | VERIFIED | Empty (`117-119`) and 3-row no-throw (`121-125`) tests green |
| 16 | [Flagged assumption ICT-11-ordering] Blocks emit ascending with first-open / last-close regardless of input order; input sorted ascending first | VERIFIED | Sort + dedupe-first-wins (`aggregate.ts:104-112`); out-of-order test asserts identical ascending output (`137-146`) |

**Score:** 16/16 truths verified (0 present-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ict/smt.ts` | SMT comparator: match, bps compare, corr gate, rollover suppression | VERIFIED | Exists (344 lines), substantive, wired; exports SWING_K/SMT_TOL_BPS/CORR_WINDOW/CORR_MIN/SWING_LOOKBACK, matchSwings, pearsonCorr, detectSMT, evaluateSMT, sweeperLeg |
| `src/lib/ict/smt.test.ts` | Bull/bear/choppy/gate/edge/closedOnly tests | VERIFIED | Exists (307 lines), 17 tests green |
| `src/lib/__fixtures__/smt-rollweek.json` | Joint roll-week D1 pair with nq/es arrays | VERIFIED | Exists, 25 NQ + 25 ES bars confirmed via node |
| `src/lib/ict/fvg.ts` | FVG map + transition + sentence builder | VERIFIED | Exists (178 lines), substantive, wired; exports FVG_MAP_BOUND, detectFVGs, applyMitigation, detectTransition, describeDeliveryTransition, originFvg |
| `src/lib/ict/fvg.test.ts` | Polarity/mitigation/bound/sweep-vs-reject/sentence tests | VERIFIED | Exists (227 lines), 16 tests green |
| `src/lib/ict/aggregate.ts` | NY-anchored 1H→4H synthesis | VERIFIED | Exists (151 lines), substantive, wired; exports NY_TZ, DAY_OPEN_NY_HOUR, BLOCK_SIZE, aggregate1Hto4H, America/New_York |
| `src/lib/ict/aggregate.test.ts` | Anchor/DST/partial/determinism/reuse tests | VERIFIED | Exists (195 lines), 15 tests green |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `smt.ts` | `rollover.ts` | evaluateSMT calls detectRollover per leg with shared ROLLOVER_ATR_MULT | WIRED | `smt.ts:4,244,247` — import + both call sites |
| `smt.ts` | `regime.ts` | per-leg tripwire ATR from computeATR(legD1).at(-1) | WIRED | `smt.ts:3,240-241` — import + last-element usage |
| `smt.test.ts` | `smt-rollweek.json` | joint suppression test imports roll-week pair via @ alias | WIRED | `smt.test.ts:14,232-243` |
| `fvg.ts` | `types.ts` | closedOnly first line plus finite-OHLC boundary guard | WIRED | `fvg.ts:6,54,92,143` — all three entry points |
| `fvg.test.ts` | `range.test.ts` | wick-pierce contrast (range extends extremes, FVG flips state) | WIRED | Conceptual link; pinned by touch-vs-pierce tests (`fvg.test.ts:157-162`) against range rolling-extremes semantic |
| `aggregate.ts` | `types.ts` | closedOnlyIntraday boundary + Candle-shaped emission | WIRED | `aggregate.ts:3,99,141-147` |
| `aggregate.test.ts` | `range.ts` | reuse test feeds blocks into computeRange | WIRED | `aggregate.test.ts:29,102-107` |
| `aggregate.test.ts` | `bias.ts` | reuse test feeds derived position into computeBias | WIRED | `aggregate.test.ts:30,108-112` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `smt.ts` | direction/sweeperLeg/nqWindow/esWindow | matchSwings pairs from real closed D1 closes + holdGapBps compare | Yes | FLOWING |
| `smt.ts` | bpsGap | bpsGap(latest.nqExtreme, latest.esExtreme, prior.esExtreme) — absolute cross-instrument price difference (~23311 bps on bear fixture vs ~33 bps true hold gap) | No — semantically wrong value | HOLLOW (see CR-01; gate decision itself uses holdGapBps correctly, direction unaffected) |
| `smt.ts` | corr / suppression reason | pearsonCorr over trailing-20 paired closes | Yes | FLOWING |
| `fvg.ts` | gaps / active map | 3-candle scan + close-through mitigation over real closed D1 rows | Yes | FLOWING |
| `fvg.ts` | TransitionState | same-candle pierce+reject over real rows | Yes | FLOWING |
| `aggregate.ts` | 4H blocks | 1H epoch rows → NY wall-clock bucketing → OHLC aggregation | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SMT/FVG/aggregate suites | `npm test -- src/lib/ict/smt.test.ts src/lib/ict/fvg.test.ts src/lib/ict/aggregate.test.ts` | 3 files, 48/48 passed | PASS |
| Roll-week fixture shape | node require fixture, print lengths | nq:25 es:25 | PASS |
| Purity/stub scan | grep TODO/FIXME/placeholder/console.log/Date.now/new Date/Math.random/adjclose over all 7 phase files | zero matches (exit 1) | PASS |
| Wiring grep | detectRollover/computeATR/closedOnly/smt-rollweek/computeRange/computeBias/sweeperLeg/originFvg/America/New_York all present at cited lines | all found | PASS |

Probe Execution: SKIPPED (no probes declared; pure-math phase, no migration/tooling).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ICT-08 | 07-01 | SMT divergence BULLISH/BEARISH/NO-SIGNAL + corr gate | SATISFIED | Truths 1,2,4; 17 SMT tests green |
| ICT-09 | 07-01 | Rollover-week fake SMT suppressed either-leg-suspect | SATISFIED | Truth 3,5; joint fixture + suppression test green |
| ICT-10 | 07-02 | FVG map + ERL/IRL on sweep-then-reject only + §2 sentence | SATISFIED | Truths 6-10; 16 FVG tests green |
| ICT-11 | 07-03 | 4H from NY-anchored 1H blocks, closedOnly | SATISFIED | Truths 11-16; 15 aggregate tests green |

Orphaned requirements check: REQUIREMENTS.md maps ICT-08..ICT-11 to Phase 7; all four claimed across the three plans (01: ICT-08+ICT-09; 02: ICT-10; 03: ICT-11). No orphans.

### Anti-Patterns Found

None. Zero debt markers, zero placeholders, zero console.log, zero clock reads, zero adjclose across all 7 files. No `return null/[]/{}` stubs; no hardcoded empty props.

### Code Review Adjudication (07-REVIEW.md, 2 critical + 7 warnings + 3 info)

Neither critical finding falsifies any phase-07 success criterion (direction, sweeperLeg, windows, both suppression gates, FVG map/transition, 4H synthesis are all correct in code and pinned by tests), so neither blocks the phase goal. Both are real defects that must be fixed before downstream consumption. Per-finding verdicts:

| Finding | Severity | Verdict | Rationale |
|---------|----------|---------|-----------|
| CR-01 bpsGap mixes NQ/ES price scales (~23311 bps reported vs ~33 bps true hold gap; `smt.ts:155-157,321,338`) | critical | DEFERRABLE — fix before Phase 9 §3 | Gate decision uses `holdGapBps` correctly so direction/sweeperLeg/suppression are all right and SC1/SC2 hold. Only the reported `bpsGap` field is garbage. Confirmed by code read: `bpsGap(latest.nqExtreme, latest.esExtreme, prior.esExtreme)` takes \|NQ-ES\| over one leg's extreme. Fix: report `holdGapBps` (review's suggested patch). Must land before any prose/chart renders the field. |
| CR-02 originIndex throws on stale origins (`fvg.ts:37-43,97,147`) | critical | DEFERRABLE — fix before Phase 8 selectors | All in-phase callers pass same-window gaps so no must-have truth fails. But any truncated-window caller (trailing-20 map, Phase 8/9 selectors) crashes instead of degrading, violating the honest-degrade house rule. Fix: skip-on-missing (review's `originIndexOrNeg1` patch). |
| WR-01 asymmetric sweep matrix (BEARISH/ES and BULLISH/NQ unreachable, `smt.ts:308-342`) | warning | DEFERRABLE | Implemented diagonals match locked D-04 examples; type over-promises both legs per direction. Behavior gap, not a broken SC. Mirror arms belong in a follow-up (also needs new fixtures). |
| WR-02 exact-tolerance float edge without epsilon (`smt.ts:313-314,330-331`) | warning | DEFERRABLE | Passes today; hardening only. Add EPS + document equal-within-epsilon ⇒ NO-SIGNAL. |
| WR-03 fall-back 5-member blocks dropped via `!== BLOCK_SIZE` (`aggregate.ts:131-133`) | warning | DEFERRABLE | Loses at most one block/year on the repeated 01:00 hour; existing DST tests avoid it. Decide merge-vs-split + regression test in follow-up. |
| WR-04 forming-exclusion assertion only fails on double overlap (`smt.test.ts:271-276`) | warning | DEFERRABLE | Weak assertion but the wired code (`closedOnly` first line of `matchSwings`, verified `smt.ts:123-124`) is real; split into two assertions in follow-up. |
| WR-05 aggregate never validates `time` (NaN epochs reach timezone math) | warning | DEFERRABLE | Add `Number.isFinite(c.time) && c.time > 0` filter; no in-scope input triggers it. |
| WR-06 SMT correlation window assumes sorted input, never sorts | warning | DEFERRABLE | In-scope feeds are chronological (Phase 6 join sorts); sort-a-copy for robustness in follow-up. |
| WR-07 applyMitigation slices trailing-20 unsorted while detectTransition sorts | warning | DEFERRABLE | In practice gaps arrive in origin order from detectFVGs; sort before slice in follow-up. |
| IN-01 Map insertion order instead of explicit sort; IN-02 five missing regression cases; IN-03 raw-float prose interpolation | info | DEFERRABLE | Hygiene/test-coverage items; IN-02's five cases are the natural vehicle for pinning CR/WR fixes. |

### Human Verification Required

None. Pure-math phase by design (no store, no rendering, no network per CONTEXT boundary); all behaviors pinned by 48 automated tests. No visual, real-time, or external-service surface exists to verify.

### Gaps Summary

No gaps. All four success criteria are TRUE in the codebase: (1) SMT status + swing refs + CORR_DECOUPLED suppression verified; (2) rollover-week joint suppression verified on the JSON fixture; (3) FVG map + sweep-then-reject-only transition + §2 sentence verified; (4) NY-anchored 1H→4H synthesis under closed-only discipline verified. The two critical review findings are recorded above as deferrable follow-ups with explicit fix-before gates (CR-01 before Phase 9 §3; CR-02 before Phase 8 selectors), not phase-07 blockers.

---
_Verified: 2026-09-07T11:15:00Z_
_Verifier: Claude (gsd-verifier)_
