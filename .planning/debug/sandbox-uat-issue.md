---
status: investigating
trigger: "UAT sandbox issue: preview tag invisible during dim; Apply path verdict/reset confusion; provenance of 'Tətbiq: KZ 120–300 ...' text"
created: 2026-09-17T00:00:00Z
updated: 2026-09-17T00:00:00Z
---

## Current Focus

hypothesis: Tag is rendered but perceptually invisible (dimmed muted microcopy); appliedCopy DOES render post-Apply (user saw it, judged it unrelated); the actually-missing piece is review.verdict never rendered in sandbox. Module-level applied flag is a latent reactivity hazard, not the live cause (Apply co-sets preview, which re-renders).
test: Code-reading + jsdom test assertions as oracle (no code changes per brief)
expecting: Findings file + commit, return root causes
next_action: Write findings below, commit debug file, return summary

## Symptoms

expected: Drag knob → dim + visible "BAXIŞ — tətbiq edilməyib" tag; press "Tətbiq et" → knobs re-seed to pins, HOLD applied copy (+ TUTULDU verdict) appears in sandbox.
actual (verbatim UAT, 21-UAT.md:28): "sağa sola sürüşdürəndə kölgəli olur form, amma tag çıxmır, Tətbiq et də basanda əvvəlki rəqəmlərə qayıdır. Atəş tempi 1–4/həftə bandında — TUTULDU sandbox-da görünmədi"
errors: none (no exceptions; purely presentational/state-perception)
reproduction: Kalibrləmə Sandbox card beside log panel → drag any knob → press "Tətbiq et"
started: Phase 21 UAT (21-UAT.md test 3, severity major, gap G-21-3)

## Eliminated

- hypothesis: Preview tag fails to render when !pristine (conditional logic broken)
  evidence: Tag conditional is correct (calibration-sandbox.tsx:157-162); jsdom test proves DOM presence after drift (terminal-shell.test.ts:1155-1159). Dim working proves !pristine true. Render path is fine — visibility is perceptual, not structural.
  timestamp: 2026-09-17
- hypothesis: Scalar `value={preview.kzStartMin}` mismatches base-ui Slider (expects number[]) leaving thumbs stale after Apply
  evidence: SliderRootProps accepts `Value extends number | readonly number[]`, scalar legal (SliderRoot.d.ts:13,144). Root normalizes scalar to single value (SliderRoot.mjs:128-134). KnobRow onValueChange handles array-or-scalar (calibration-sandbox.tsx:80-83). Controlled value resets on Apply, thumbs follow props. No staleness from shape mismatch.
  timestamp: 2026-09-17
- hypothesis: The visible "Tətbiq: KZ 120–300 ..." text comes from some other component/copy
  evidence: Single source — `calibrationAppliedCopy()` (store.ts:385-392) rendered ONLY at calibration-sandbox.tsx:248-252. Template matches verbatim (`Tətbiq: KZ ${120}–${300} dəq · DISP ${0.5}× ...`, constants verified trigger.ts:21-27, pools.ts:17-29). No other renderer (grep appliedCopy: only sandbox + tests).
  timestamp: 2026-09-17

## Evidence

- timestamp: 2026-09-17
  checked: calibration-sandbox.tsx:157-162 (tag placement vs dim container)
  found: `sandbox-preview-tag` <p> is a CHILD of the `opacity-45` div (line 157). Tag style is `text-xs text-muted-foreground` (muted = oklch(0.556 0 0), app/globals.css:63) further multiplied by 0.45 opacity.
  implication: Tag dims itself into near-invisibility; tiny muted microcopy at top of form while eyes track the dragged knob. Answers sub-issue 1: low-contrast styling, not push-out-of-view nor render failure.
- timestamp: 2026-09-17
  checked: calibration-sandbox.tsx full render for `review.verdict` usage
  found: Component reads `review.applied` (lines 116, 248) and `review.appliedCopy` (line 250) but NEVER renders `review.verdict` (CALIBRATION_REVIEW_HOLD_COPY = 'Atəş tempi 1–4/həftə ... TUTULDU', store.ts:382-383). Verdict renders only in FiringLogPanel `calibration-verdict` slot (firing-log-panel.tsx:105-117), and only when firingLog non-empty (null-verdict-over-empty pinned at terminal-shell.test.ts:1204).
  implication: User hunting the sandbox for TUTULDU can never find it — matches verbatim "TUTULDU sandbox-da görünmədi". The `Tətbiq: KZ...` line they saw IS the applied block working, misread as unrelated.
- timestamp: 2026-09-17
  checked: store.ts:90 `let calibrationReviewApplied`, selectCalibrationReview (1221-1227), applyCalibrationPreview (1228-1244); sandbox subscriptions (lines 96, 106, 112)
  found: Flag lives OUTSIDE zustand; selector reads module variable. Component subscribes to `selectCalibrationReview` fn reference (never changes → never re-fires) but ALSO to `calibrationPreview` (line 96). Apply flips flag AND set()s preview in the same tick → preview subscription re-renders → review re-read fresh → applied block appears. Store-level Apply mechanics proven green by tests (store.test.ts:1632-1692, terminal-shell.test.ts:1169-1176).
  implication: Module flag is a LATENT reactivity/isolation hazard, not the live cause of (b). Works today only by coupling (flag flip piggybacks the preview set). Any review-only subscriber, or flag flip without set, silently fails to re-render.
- timestamp: 2026-09-17
  checked: components/ui/slider.tsx:12-16 thumb-count derivation
  found: `_values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]` — sandbox passes scalar `value`, no `defaultValue` → `_values=[min,max]`, length 2 → TWO thumbs rendered per knob (lines 39-45). Base-ui root treats scalar as single value so both thumbs share index 0 (SliderThumb.mjs:147-149) — functional but doubled-thumb visual anomaly on all 7 knobs.
  implication: Real visual defect that can read as "knobs wrong"; not Apply-staleness but fix alongside.
- timestamp: 2026-09-17
  checked: pristine check literals (calibration-sandbox.tsx:117-123) vs pinned constants
  found: Literals 120/300/0.5/25/0.25/2.0/0.25 match constants TODAY (trigger.ts:21-27, pools.ts:17-29) but duplicate them; preview seeds (store.ts:601-607) use the constants. Constant change breaks pristine silently.
  implication: Latent drift risk; compare against imported constants.
- timestamp: 2026-09-17
  checked: terminal-shell.test.ts beforeEach (169-195) + store.test.ts resetDualState (691-698)
  found: Shell beforeEach does `vi.resetModules()` but keeps the already-imported useDashboard binding → module flag + calibrationPreview leak across tests in-file; beforeEach never resets calibrationPreview nor the applied flag. store.test.ts re-imports (fresh flag) but shell tests don't. Green today only because a single test touches preview/apply.
  implication: Test-isolation hazard; tag-visibility (contrast) and verdict-in-sandbox untestable/absent by construction (jsdom has no contrast; verdict never rendered in sandbox).
- timestamp: 2026-09-17
  checked: Brief-vs-verbatim discrepancy
  found: Verbatim UAT says Apply "əvvəlki rəqəmlərə qayıdır" (returns to earlier numbers = reset OBSERVED) while the task brief glosses it as "does NOT reset, knobs stay drifted (425/70)". The 425/70 values match a mid-drag observation, not post-Apply state. Paradox check: appliedCopy visible ⟹ review.applied true ⟹ re-render post-Apply occurred ⟹ store preview is at seeds in that same render — knobs cannot simultaneously display 425 with the applied line from one render.
  implication: (b)-as-"no reset" is likely a conflation of two moments (drift vs post-Apply); the confirmed user-visible defects are the invisible tag and the missing in-sandbox verdict. Recommend a live re-check of post-Apply knob values before treating "stays drifted" as fact.

## Resolution

root_cause:
  (a) Preview tag perceptually invisible — rendered inside the opacity-45 dim container as text-xs muted microcopy (calibration-sandbox.tsx:157-162; muted token app/globals.css:63). Render logic correct; contrast/placement wrong.
  (b) No in-sandbox HOLD verdict — `review.verdict` never rendered in CalibrationSandbox (only `applied`/`appliedCopy`); verdict lives solely in FiringLogPanel behind non-empty-log gate. User saw the working appliedCopy (`calibrationAppliedCopy()`, store.ts:385-392) and judged it unrelated. Store Apply mechanics (flag flip + preview re-seed) verified working by green tests; module-level flag is a latent reactivity hazard, not the live cause.
  (c, contributing visual) Slider wrapper renders 2 thumbs per scalar knob (`[min,max]` fallback, slider.tsx:12-16,39-45). Latent: pristine literals duplicate constants (117-123); module flag + preview leak across shell tests (beforeEach 169-195).
fix: (read-only session — direction only)
  1. Hoist `sandbox-preview-tag` OUT of the opacity-45 div; style as conspicuous badge (e.g. font-semibold amber/warning chip, not muted microcopy).
  2. Render `review.verdict` in the sandbox applied block (lines 248-252) so TUTULDU HOLD copy appears in-sandbox post-Apply.
  3. Move `calibrationReviewApplied` into zustand state (reactive `applied` boolean in store shape); derive review from state.
  4. Fix slider wrapper: derive thumb count from `value` (`Array.isArray(value) ? value : [value]`) so scalar knobs render one thumb.
  5. Compare pristine against imported TRIGGER_*/EQUAL_TOL_*/MERGE_*/DOL_*/BEHIND_* constants, not literals.
  6. Reset calibrationPreview + applied flag in shell-test beforeEach; add thumb-count assertion; note contrast is manual-QA-only.
verification: not run (read-only brief); evidence is code-reading + existing green suites cited per line
files_changed: []
