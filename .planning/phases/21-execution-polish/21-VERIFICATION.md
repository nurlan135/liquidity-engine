---
phase: 21-execution-polish
verified: 2026-09-17T17:10:00Z
status: gaps_found
score: 12/13 must-haves verified
covered_files: [".planning/REQUIREMENTS.md", ".planning/phases/21-execution-polish/21-01-PLAN.md", ".planning/phases/21-execution-polish/21-01-SUMMARY.md", ".planning/phases/21-execution-polish/21-02-PLAN.md", ".planning/phases/21-execution-polish/21-02-SUMMARY.md", ".planning/phases/21-execution-polish/21-03-PLAN.md", ".planning/phases/21-execution-polish/21-03-SUMMARY.md", ".planning/phases/21-execution-polish/21-04-PLAN.md", ".planning/phases/21-execution-polish/21-04-SUMMARY.md", "components/dashboard/calibration-sandbox.tsx", "components/ui/slider.tsx", "src/lib/store.ts", "src/terminal-shell.test.ts"]
covered_digest: "v1:sha256:c5d4706b825957a7fdade7bdbce5dc2befa264c7c9d456a476f46cb88829935e"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 10/10
  gaps_closed:
    - "BAXIŞ drift badge hoisted outside the opacity-45 dim container as a conspicuous amber chip (pre-Apply path)"
    - "TUTULDU HOLD verdict rendered in-sandbox post-Apply beside the applied copy"
    - "calibrationReviewApplied moved from module-level let into reactive zustand state"
    - "Scalar knobs render exactly one thumb (value-first derivation)"
    - "Shell beforeEach resets preview to pins plus applied flag to false; thumb/tag/verdict assertions added"
  gaps_remaining:
    - "CR-01: pristine OR-ed with review.applied hides all post-Apply preview drift (21-REVIEW.md)"
  regressions: []
gaps:
  - truth: "Drift dims preview with a conspicuous BAXIŞ badge (pre- AND post-Apply)"
    status: failed
    reason: "21-REVIEW.md CR-01 confirmed true in current code: pristine = review.applied || (preview matches pins) at calibration-sandbox.tsx:129-137. After Apply the session flag stays true, so any later knob drift never shows the BAXIŞ badge (l171) or the opacity-45 dim (l179) — the operator sees a drifted what-if as the applied set."
    artifacts:
      - path: "components/dashboard/calibration-sandbox.tsx"
        issue: "lines 129-137: review.applied disjunct defeats the constant-pinned pristine comparison post-Apply"
    missing:
      - "Drop the review.applied || disjunct so pristine compares preview against imported pinned constants only"
      - "Extend the shell sandbox test: Apply, then drift a knob, assert preview-tag reappears outside opacity-45"
---

# Phase 21: Execution Polish — Re-Verification Report

**Phase Goal:** Execution stays calibrated and uncorrupted with pools live — thresholds reviewed, ticket buffered, parity proven
**Verified:** 2026-09-17T17:10:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure plan 21-04 (G-21-3) plus 21-REVIEW.md cross-check

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `summarizeFiringLog` helper: FIRE-only counting, overflow conservative, weeks = unique NY-week Mondays min 1, null on empty, 1–4/week band | ✓ VERIFIED (regression) | Code unchanged since prior verification; `calibration.test.ts` green in scoped run (part of 38/38 batch) |
| 2 | Buffered ticket multiples `CALIBRATION-PROVISIONAL`: SL 0.25×ATR beyond extreme, TP 0.10×ATR before extreme, R/R gate unchanged | ✓ VERIFIED (regression) | `ticket.test.ts` green in scoped run (part of 38/38 batch) |
| 3 | Pools-parity exact match: trigger+flaw+ticket triple identical pools-on vs pools-off, skeleton + 20-session replay, zero tolerance | ✓ VERIFIED (regression) | `pools-parity.test.ts` green in scoped run (part of 38/38 batch) |
| 4 | Proof table + buffer note + chart lines: band verdict + ON/OFF table from same `firingLog`, verbatim buffer note, SL/TP lines track buffered values | ✓ VERIFIED (regression) | No plan-04 touch; shell suite 79/79 green covers render slots |
| 5 | Slider sandbox with preview/Apply: 7th primitive, both knob families, dimmed what-if preview with visible tag, explicit Apply, session-scoped, refresh resets | ✓ VERIFIED (regression, partial — see #11) | Pre-Apply mechanics intact; post-Apply drift path broken (truth #11) |
| 6 | `parity.test.ts` byte-identical (untouched regression anchor, D-09) | ✓ VERIFIED (regression) | `git hash-object` worktree = `9ecd782e…` = `git show HEAD:` blob hash (verifier-run 2026-09-17) |
| 7 | `tsc` clean | ✓ VERIFIED (regression) | `npx tsc --noEmit` exit 0 (verifier-run 2026-09-17) |
| 8 | `.planning/PROJECT.md` allowlist reads seven primitives with slider appended | ✓ VERIFIED (regression) | Untouched by plan 04 (4-file diff only); prior evidence stands |
| 9 | Selectors read pinned constants only; preview movement changes zero verdicts; pools never vote | ✓ VERIFIED (regression) | Store setters/slices unchanged in derivation semantics; store+shell 79/79 green |
| 10 | Apply records reviewed HOLD verdict + applied-set copy and re-pins preview; constants keep markers | ✓ VERIFIED (regression) | `store.ts:1227-1251` selector reads `get().calibrationReviewApplied`, Apply flips flag + re-seeds in one `set()`; `store.test.ts` calibration-apply green |
| 11 | Gap-closure: drift dims preview with a conspicuous BAXIŞ badge rendered outside the dim container | ✗ FAILED | Badge hoisting itself is VERIFIED (`calibration-sandbox.tsx:171-178` sibling before `div` l179; shell test asserts `closest('.opacity-45')` null). BUT `pristine` at l129-137 is `review.applied \|\|`-gated, so post-Apply drift never renders the badge or dimming at all — see Gaps Summary |
| 12 | Gap-closure: Apply records HOLD verdict copy with TUTULDU visible inside the sandbox and re-seeds knobs to pins | ✓ VERIFIED | `calibration-sandbox.tsx:265-270` applied block renders `review.verdict` + `appliedCopy`; `store.ts:1239-1250` one-`set()` flag flip + re-seed; shell test asserts applied block contains `TUTULDU`, `KZ 120–300 dəq`, re-confirmation line, and `kzStartMin === 120` |
| 13 | Gap-closure: each scalar knob renders exactly one thumb | ✓ VERIFIED | `slider.tsx:15-21` value-first `_values` derivation; shell test loops all 7 knob slots asserting exactly 1 `[data-slot="slider-thumb"]` each |

**Score:** 12/13 truths verified (0 present-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `components/dashboard/calibration-sandbox.tsx` | Hoisted badge + verdict + constant-pinned pristine | ⚠️ SUBSTANTIVE BUT LOGIC-FAULTED | Exists, substantive, wired; badge hoist + verdict render + constant imports verified — but `pristine` OR-gate (l129-137) defeats the comparison post-Apply |
| `src/lib/store.ts` | Reactive applied flag in zustand state | ✓ VERIFIED | `calibrationReviewApplied: boolean` on state (l359), seeded false (l615), read via `get()` (l1228), set with re-seed in one `set()` (l1239-1250) |
| `components/ui/slider.tsx` | Scalar single-thumb derivation | ✓ VERIFIED | Value-first derivation (l15-21); all 7 knobs pass scalar `value={preview.*}` (sandbox l89,184-258) |
| `src/terminal-shell.test.ts` | Isolated preview + thumb/tag/verdict assertions | ✓ VERIFIED | `beforeEach` resets preview + flag (l195-200); sandbox test asserts 1 thumb/knob, hoisted tag, in-sandbox TUTULDU (l1166-1191) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Sandbox preview tag | Dim container | Sibling-before placement, not nested | ✓ WIRED | Tag `p` (l171-178) precedes `div.opacity-45` (l179); test pins `closest('.opacity-45') === null` |
| Sandbox applied block | `review.verdict` TUTULDU copy | Render inside `data-slot="sandbox-applied"` | ✓ WIRED | l265-270 renders verdict + appliedCopy; test asserts both |
| Apply | zustand applied flag + preview re-seed | One `set()` call | ✓ WIRED | `store.ts:1239-1250` single `set()` with both fields |
| Post-Apply drift | BAXIŞ badge + dimming | `!pristine` render gate | ✗ NOT_WIRED (logic-gated) | `review.applied \|\|` at l130 forces `pristine=true` forever post-Apply; gate never re-opens |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `calibration-sandbox.tsx` preview values | `preview.*` | `useDashboard(s => s.calibrationPreview)` session slice | ✓ FLOWING | Knob drift writes slice; badge/dim gate on comparison (faulted post-Apply only) |
| `calibration-sandbox.tsx` applied block | `review` | `selectCalibrationReview()` (reactive flag + constant copies) | ✓ FLOWING | Post-Apply render verified with TUTULDU + applied copy |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Store + shell suites (gap-closure surface) | `npx vitest run src/lib/store.test.ts src/terminal-shell.test.ts` | 2 files, 79 passed | ✓ PASS |
| Calibration + parity + ticket suites (regression) | `npx vitest run src/lib/ict/calibration.test.ts src/lib/ict/pools-parity.test.ts src/lib/ticket.test.ts` | 3 files, 38 passed | ✓ PASS |
| Type safety | `npx tsc --noEmit` | clean, exit 0 | ✓ PASS |
| Regression anchor identity | `git hash-object` worktree vs HEAD blob for `parity.test.ts` | both `9ecd782e…` | ✓ PASS |

### Requirements Coverage

Plans claim: 21-01 `[POL-01, POL-02, POL-03]`, 21-02 `[POL-01, POL-02, POL-03]`, 21-03 `[POL-04]`, 21-04 `[POL-04]` — union covers all 4 phase IDs; REQUIREMENTS.md maps POL-01–04 to Phase 21. No orphaned IDs.

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| POL-01 | 21-01, 21-02 | WHY NOW thresholds reviewed against firing-log (1–4/week band holds, pools context-only) | ✓ SATISFIED | Unchanged; calibration suite + proof-table slots green |
| POL-02 | 21-01, 21-02 | Ticket SL beyond extreme + ATR buffer, TP partials before extreme | ✓ SATISFIED | Unchanged; ticket boundary matrix green |
| POL-03 | 21-01, 21-02 | Parity harness proves trigger/flaw/ticket identical pools on/off | ✓ SATISFIED | Unchanged; parity harness green, anchor hash-identical |
| POL-04 | 21-03, 21-04 | `slider.tsx` threshold/pool-tolerance controls render from installed primitive | ⚠️ SATISFIED WITH GAP | All gap-closure mechanics verified EXCEPT post-Apply drift badge (truth #11) |

REQUIREMENTS.md traceability still reads POL-01–04 `Pending` — eligible for flip to `Complete` only after the CR-01 gap closes (verifier makes no file edit here).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `components/dashboard/calibration-sandbox.tsx` | 129-137 | `review.applied \|\|` defeats constant-pinned pristine comparison (CR-01) | 🛑 Blocker | Post-Apply knob drift never re-shows BAXIŞ tag or dimming — recorded under `gaps` |
| `components/ui/slider.tsx` | 28 | Raw scalar `value` forwarded to primitive while thumb-count uses normalized `_values` (WR-01) | ⚠️ Warning | Thumb positioning/keyboard stepping suspect if primitive expects `number[]`; `tsc` currently clean so latent, not blocking |
| `components/ui/slider.tsx` | 44-50 | Thumbs rendered without index binding; both-undefined fallback yields two colliding thumbs (WR-02) | ⚠️ Warning | Fallback path unreachable from sandbox (all knobs pass scalar value); latent fragility only |
| `components/dashboard/calibration-sandbox.tsx` | 271-283 | Apply/Reset lack `disabled={degraded}` while knobs disable honestly (WR-03) | ⚠️ Warning | HOLD verdict recordable over stale/thin data the panel refuses to preview; contract gap, out of 21-04 scope |
| `src/lib/store.ts` setters | 1183-1192 | No `kzStart <= kzEnd` cross-validation (WR-04) | ⚠️ Warning | Inverted killzone window previewable and Apply-recordable; no error surface |
| `components/dashboard/calibration-sandbox.tsx` | 117-123 | `selectTicket`/`selectCalibrationReview` subscribed by function identity (WR-05) | ⚠️ Warning | Apply re-render currently happens by coincidence (preview replaced in same `set()`); degraded-disable path can go stale on screen |
| `src/lib/store.ts` | 572-576 | `sharedEpoch` wall-clock fallback inside selector (WR-06) | ⚠️ Warning | Pre-existing nondeterminism on empty legs; out of Phase 21 scope |
| `src/terminal-shell.test.ts` | 169-201 | `beforeEach` never resets `firingLog`/`paperLog`/`ticketInputs` (WR-07) | ⚠️ Warning | Calibration state leaks across suites by execution order; 21-04 fixed only the calibration slice |
| `components/dashboard/calibration-sandbox.tsx` | 7, 252 | `CALIBRATION_BEHIND_MIN` imported but knob uses literal `min={0}` (IN-01) | ℹ️ Info | Behavior-identical today; future-retune divergence hazard |
| `src/lib/store.ts` | 110-111 | Mid-file imports (IN-02) | ℹ️ Info | Convention break only |
| `src/lib/store.ts` | 1227-1234 | `selectCalibrationReview` fresh object identity per call (IN-03) | ℹ️ Info | Trap for future subscribers; current usage dodges via WR-05 pattern |

No `TODO/FIXME/XXX/TBD/placeholder` markers or `console.log`-only handlers in phase files (grep clean).

### Human Verification Required

Automated checks are green except the CR-01 gap. The prior visual-glance items persist (slot presence is test-pinned; placement/tone needs a human eye). Item 3 is extended with the post-Apply drift re-check that currently FAILS in code:

### 1. Band verdict + proof table placement and tone

**Test:** Open the terminal with a populated firing log (2+ FIRE entries across 2 weeks) and look at the `Atəş Jurnalı` card.
**Expected:** HOLD line in green terminal-up at Heading size inline next to entries; rate line in mono below; `Hovuz sübutu — ON/OFF` rows in muted mono; overflow retained above entries; thin history dims at opacity-45 (never hidden); empty log shows empty heading + body, NO verdict.
**Why human:** jsdom pins slots and classes, not visual hierarchy, color tone, or Azeri copy wrapping.

### 2. Buffered ticket note + chart line movement

**Test:** On an EXECUTE ticket with buffered context, read the ticket panel and the NQ chart.
**Expected:** Buffer note in muted mono beside the ticket reason; chart SL/TP lines visibly off the pool extreme; R/R gate copy and position unchanged; ghost/pool-line z-order unchanged.
**Why human:** Line displacement and prose placement need a live-chart glance; mapper tests pin values, not pixels.

### 3. Sandbox badge conspicuousness + post-Apply drift (INCLUDES OPEN GAP)

**Test:** Find the `Kalibrləmə Sandbox` card; drag any knob (pre-Apply); press `Tətbiq et`; then drag a knob again.
**Expected:** Pre-Apply drift shows the amber BAXIŞ chip undimmed above a dimmed preview; `Tətbiq et` records the TUTULDU applied copy; post-Apply drift MUST re-show the badge + dimming (currently does NOT — CR-01 gap — so this step documents the failure until fixed); `Yenilə`/refresh resets to pins with no persistence.
**Why human:** Chip contrast legibility is perceptual (21-04 SUMMARY coverage D1, `human_judgment: true`); the post-Apply half additionally needs a live re-check after the code fix.

### Gaps Summary

One blocking gap — the 21-REVIEW.md critical finding verified TRUE against current code:

**CR-01 (21-REVIEW.md) confirmed:** `components/dashboard/calibration-sandbox.tsx:129-137` computes `pristine` as `review.applied || (preview matches all pinned seeds)`. The gap-closure plan moved the applied flag into reactive zustand state and re-seeds the preview on Apply (both verified working), but left the `review.applied ||` disjunct in place. Since `calibrationReviewApplied` stays `true` for the rest of the session, `pristine` is permanently `true` post-Apply: dragging a knob afterward never renders the BAXIŞ badge (l171) or the `opacity-45` dim container (l179). The operator is misled into believing a drifted what-if is still the applied set — directly against the phase goal "execution stays calibrated and uncorrupted."

Everything else from gap-closure plan 21-04 holds at full 3-level verification: hoisted badge placement (test-pinned outside the dim container), in-sandbox TUTULDU verdict, reactive flag flipped in the same `set()` as the re-seed, single-thumb knobs, constant-pinned pristine literals, isolated shell-test state. The fix is a 2-line deletion plus a regression test:

```tsx
const pristine =
  preview.kzStartMin === TRIGGER_KZ_START_MIN &&
  preview.kzEndMin === TRIGGER_KZ_END_MIN &&
  preview.dispMult === TRIGGER_DISP_MULT &&
  preview.equalTolBps === EQUAL_TOL_BPS &&
  preview.mergeAtrMult === MERGE_ATR_MULT &&
  preview.dolBoost === DOL_BOOST &&
  preview.behindPenalty === BEHIND_PENALTY;
```

plus a shell-test leg (Apply → drift → badge reappears outside `opacity-45`). The seven warnings and three info items from 21-REVIEW.md are recorded above as non-blocking advisories; none were in 21-04 scope and none independently fail a must-have truth.

Structured gap in this report's frontmatter for `/gsd-plan-phase --gaps`.

---

_Verified: 2026-09-17T17:10:00Z_
_Verifier: the agent (gsd-verifier — goal-backward; SUMMARY.md claims re-checked against code; 21-REVIEW.md CR-01 independently confirmed)_
