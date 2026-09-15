---
status: resolved
trigger: Dashboard screenshot audit — 7 UI claims from live terminal screenshot to verify-then-fix one by one
created: 2026-09-15
updated: 2026-09-15
resolved: 2026-09-15
---

# Debug Session: terminal-screenshot-audit

## Symptoms

Screenshot of live terminal (Baku 10:24). 7 claims to VERIFY FIRST in code, fix ONLY if confirmed:

1. **Bias-vs-trigger contradiction** — §2 shows BULLISH / SHORT BLOCKED, §4 shows WAIT_FOR_MANIPULATION · SHORT on the same snapshot. Check: do selectBias/selectTrigger derive from the same snapshot? Is opposite-direction output possible by design (e.g. flaw downgrade) or a real parity bug?
2. **Marker/label overlap on chart** — left side T/J?/S markers overlap (reads as "T7"); Asia-H (29495.25) / EQ (29468.75) / Asia-L (29426.75) price-line labels overlap. Check marker spacing + price-line label density logic in nq-chart.tsx.
3. **Countdown format bug** — calendar shows "0g 6s sonra", "1g 6s sonra" (seconds shown for day-scale distances); XƏBƏR ÖNCƏSİ repeats for the same NFP event. Check formatCountdown in src/lib/countdown.ts + pre-news flag logic.
4. **Language leak** — §3 "Delivery flips IRL: the bullish gap 27155.75–27298.5 swept and rejected on 2026-04-28..." renders in English; "NY: Gözlənilir — v2.0-da ölçülmür" looks like a dev note user-facing. Check report prose sources.
5. **Scenario switcher missing active button** — header shows active "izdihamlı-long" but only two buttons (short/balanslı) visible. Check sentiment-panel switcher rendering.
6. **Duplication + placeholders** — right column ƏMR BİLETİ and FATAL FLAW panels repeat the same flaw text; §1 stays UNAVAILABLE; left column still has 5 UNAVAILABLE cards. Check whether duplication is by design (17-03 panels) and which placeholders are still legitimately pending.
7. **Weak PAPER banner + risk stepper on STAND_ASIDE** — only a small "KAĞIZ / PAPER" label at top (spec wants persistent non-dismissible banner); RISK % stepper looks active while verdict is STAND_ASIDE. Check terminal-shell banner + TicketPanel degraded/locked logic.

## Files of interest

- `components/dashboard/report.tsx` — §§1–6 blocks, prose sources
- `components/dashboard/ticket-panel.tsx` — risk stepper, degraded/locked sizing
- `components/dashboard/execution-protocol.tsx`, `components/dashboard/fatal-flaw.tsx` — thin panels
- `components/dashboard/terminal-shell.tsx` — PAPER banner, panel swap
- `components/dashboard/sentiment-panel.tsx`, `components/dashboard/calendar-panel.tsx` — switcher, countdowns
- `components/charts/nq-chart.tsx` — markers, price-line labels
- `src/lib/countdown.ts`, `src/lib/store.ts` (selectBias/selectTrigger/selectTicket selectors)

## Goal

For EACH claim in order 1→7: verify against code (confirm or refute with evidence), fix immediately if confirmed, keep fix minimal per repo conventions (pure libs + co-located tests, TDD RED/GREEN commits). Report per-claim verdict: CONFIRMED+FIXED or REFUTED+why.

## Current Focus

- hypothesis: claim 6 REFUTED — flaw-text echo is D-04 precedence by design; §1 is the sole spec-locked UNAVAILABLE, left column already live
- next_action: gather evidence for claim 7 (weak PAPER banner + risk stepper on STAND_ASIDE)
- reasoning_checkpoint: n/a

## Evidence

- timestamp: 2026-09-15T09:00:00Z
- claim: 1 (bias-vs-trigger contradiction)
- check: selectBias (store.ts:766-775) derives from D1 NQ daily candles via computeRange/computePosition/computeRegime/computeBias; selectTriggerPure (store.ts:886-914) derives from intraday nq1h/nq15m legs via judas+smt+amd+fvg+evaluateTrigger on sharedEpoch — different legs, different inputs, same epoch but no shared direction input
- check: evaluateTrigger directionOf (trigger.ts:223-227) is total function of sweepSide alone (HIGH→SHORT, LOW→LONG); amd carried for parity/context, does NOT vote (trigger.ts:49 D-05); smt read-only agree-tag, never a gate (trigger.ts:50)
- check: invalidation.ts:13-16 SYNTHETIC-ONLY NOTE — OPPOSITE_SWEEP SOFT branch fires only on synthetically mismatched envelopes, never through selectFatalFlaw on same snapshot where trigger direction = f(sweep side)
- verdict: REFUTED — BULLISH bias (HTF D1 discount, SHORT BLOCKED per blocked-side.ts:22-24) coexisting with WAIT_FOR_MANIPULATION · SHORT (LTF London sweep direction tag, 0-1 gate pass) is layered-design output, not a parity bug; no fix applied

- timestamp: 2026-09-15T09:15:00Z
- claim: 2 (marker/label overlap on chart)
- check: buildOverlayMarkers (nq-chart.tsx:82-143) emits at most one pin per signal per bar in J-S-T order (Judas circle J/J?, SMT arrow S, ticket arrow T) with zero dedup/spacing/collision logic — none exists; greedy same-bar stacking ("T7" read) is the 09-02-PLAN UI-06 ordering predicate ("Multiple markers on the same D1 bar stack with one pin per signal per bar"), i.e. confirmed Judas + SMT + Trigger legitimately firing on one bar by design
- check: lightweight-charts v5.2.1 createSeriesMarkers stacks same-bar/same-side markers vertically (offsets._internal_aboveBar/_internal_belowBar accumulate per marker, reset per bar — development.mjs fillSizeAndY + SeriesMarkersPaneView loop); the library itself separates co-located markers, so any residual glyph crowding is canvas legibility, not a spacing bug in our code
- check: Asia-H (29495.25) / EQ (29468.75) / Asia-L (29426.75) labels ~26-68pts apart on a ~1600pt visible range; all lines created unconditionally with titles (nq-chart.tsx:230-265, 464-534) and chart-mapper.ts:54-59 passes Asia pair through unchanged including zero-width coincidence — no density/dedup logic by design; library price-axis runs recalculateOverlapping() to shift colliding axis labels apart (development.mjs), so label crowding is library-managed data density, not our bug
- verdict: REFUTED — (a) same-bar markers stack by UI-06 design + library vertical stacking; (b) no spacing bug exists in our code; (c) price-line crowding is close-level data density with library de-collision, not an app bug; no fix applied

- timestamp: 2026-09-15T09:30:00Z
- claim: 3 (countdown format bug)
- check: formatCountdown (countdown.ts:7-15) renders `${days}g ${hours}s sonra` where `s` = saat (hour, from differenceInHours), NOT seconds — "0g 6s sonra" = 0 gün 6 saat = correct 6h NFP offset; "1g 6s sonra" = 30h CPI offset (fixture crowded-long.json:16-17: NFP 6h, CPI 30h, FOMC 72h). calendar.test.ts:7-8 encodes the exact "Ng Ns" day+hour contract, passing (3/3). The format drops minutes but that is unit-abbreviation legibility, not a day-vs-second mixup
- check: XƏBƏR ÖNCƏSİ repetition is per-plan-03-spec rendering (02-03-PLAN.md:125) — calendar-panel.tsx:64-72 renders countdown line once, then appends flag `XƏBƏR ÖNCƏSİ — {event} {countdown}` when isPreNews (24h window) is true; NFP at 6h trips the flag by design. Duplicated event name in flag is intentional context, not a double-render bug
- verdict: REFUTED — (a) no seconds-unit bug: `s` is saat/hour, values match fixture offsets exactly; (b) XƏBƏR ÖNCƏSİ echo is spec'd flag copy, not duplication; no fix applied

- timestamp: 2026-09-15T09:45:00Z
- claim: 4 (language leak — split verdict)
- check: (a) English delivery sentence CONFIRMED as never-localized leak — `describeDeliveryTransition` (fvg.ts:175-186) returns English-only copy ("Delivery flips IRL: the bullish gap ... swept and rejected on ..."), renders user-facing verbatim via selectLiquidityPath (store.ts:1107-1118) into s3-liquidity-path (report.tsx:168); 07-RESEARCH recommended Azerbaijani-aware wording but 07-02-PLAN locked an English template with no localization gate, and sentence tests only asserted token containment (ERL/IRL), never copy language. No Azerbaijani copy was ever specified for this string.
- check: (b) "NY: Gözlənilir — v2.0-da ölçülmür" REFUTED as dev note — verbatim-locked UI copy by design: S3_NY_LINE fixed constant (report.tsx:38, DIMMED opacity-45 inside AMD Timing per D-03), source REASON_NY_UNAVAILABLE Azerbaijani (amd.ts:56), exact copy pinned in 09-UI-SPEC:116 + 09-02-PLAN:157 + 09-CONTEXT D-03, renders beneath live Asia+London content as partial-honest degraded marker. Azerbaijani copy + dimmed placement = spec'd, not a leak.
- fix: localized describeDeliveryTransition to Azerbaijani per house rule (English identifiers, Azerbaijani rendered copy — report.ts header, trigger.ts D-09 precedent): ERL → "Çatdırılma ERL qalır..."; IRL → "Çatdırılma IRL-ə keçdi: {yüksəliş|düşüş} boşluq {bottom}–{top} {date} tarixində süpürülüb rədd edildi..."; polarity words bullish→yüksəliş, bearish→düşüş. TDD RED (3 new verbatim toBe pins failing on English actual) then GREEN (19/19 fvg.test.ts, 83/83 store+trigger suites). tsc: 2 errors in src/terminal-shell.test.ts:382-383 pre-exist on clean tree (verified via stash), unrelated. Committed 175a68b.
- verdict: SPLIT — (a) CONFIRMED+FIXED (never-localized English sentence builder, now Azerbaijani with verbatim pins); (b) REFUTED (NY line is locked spec'd copy, not a dev note)

- timestamp: 2026-09-15T10:00:00Z
- claim: 5 (scenario switcher missing active button)
- check: sentiment-panel.tsx:91-105 renders ALL 3 SCENARIOS (crowded-long/crowded-short/balanced, labels izdihamlı-long/izdihamlı-short/balanslı per lines 13-17) via unconditional `.map` — no filter, no conditional skip of the active id; active option gets `variant='default'` (filled `bg-primary`, button.tsx:10) vs outline for the other two, plus `is-active` class + `data-active` (lines 97-100). No CSS anywhere targets `is-active`/`data-active` to hide (grep: only hits are sentiment-panel.tsx itself) — grep spans whole repo, only stale worktree copy duplicates
- check: SCENARIO_IDS (fixture-guard.ts:7) = all 3 ids, matching SCENARIOS 1:1; the "header shows active izdihamlı-long" in the claim is the ACTIVE BUTTON ITSELF — filled primary-style button (bg-primary text) reads as header/label text in a screenshot, while the two outline buttons read as "the buttons". Alternative "active blends into header" hypothesis also rejected on styling grounds: default variant is a filled high-contrast button (bg-primary text-primary-foreground), visually distinct from header text, not camouflaged
- check: most likely screenshot misread — reviewer saw the filled active button as a status label and counted only the two outline controls as "buttons"; DOM always contains 3 <button> elements (each with data-slot="button" from button.tsx:51)
- verdict: REFUTED — no missing-button bug: all 3 buttons render unconditionally, active is the filled one, no hide logic exists; no fix applied

- timestamp: 2026-09-15T10:15:00Z
- claim: 6 (duplication + placeholders)
- check: (a) flaw-text echo is D-04 flaw-precedence by design, not a composition bug — computeTicket (ticket.ts:311-323) returns standAside(flaw.reason) on INVALIDATED/DOWNGRADED, so selectTicket (store.ts:1059-1103) evaluates checkFatalFlaw inline on the identical trigger object (store.ts:1079) and its ticket.reason IS the flaw reason whenever the flaw fires; TicketPanel renders ticket.reason verbatim (ticket-panel.tsx:87-89) while FatalFlaw renders flaw.reason + sentence + challenge verbatim (fatal-flaw.tsx:42-50) — same reason string in both is correct layered output (ticket = actionable consequence, flaw = diagnostic detail), distinct selectors (selectTicket vs selectFatalFlaw on same epoch) per 17-03-PLAN:74, shell fans out once with no shared component (terminal-shell.tsx:362,367)
- check: (b) only ONE live UNAVAILABLE chip remains — §1 RETAIL EXPOSURE (report.ts:20 state unavailable, report.tsx:286-301 generic branch); §§4-6 flipped live in Phase 17 (report.ts:24-25) and the 3 right-column UNAVAILABLE cards were swapped 1:1 for ExecutionProtocol/TicketPanel/FatalFlaw keeping data-slots (terminal-shell.tsx:349-367). Left column has ZERO UNAVAILABLE: liquidity-map/module-1/module-3/module-4/smt-row are all live panels with no UNAVAILABLE literal anywhere (grep components/dashboard: only hit is report.tsx:294 §1 branch + historical comments) — the "5 UNAVAILABLE left cards" describes the pre-Phase-17 screenshot, refuted on current tree; terminal-shell.test.ts:308 asserts all five left slots render live with no UNAVAILABLE
- verdict: REFUTED — (a) duplication is spec'd D-04 precedence consequence, not a bug; (b) §1 is the sole legitimately-pending placeholder (spec-locked unavailable per 17-02-PLAN:75 "keep section 1 unavailable"), zero stale leftovers; no fix applied

- timestamp: 2026-09-15T10:30:00Z
- claim: 7 (weak PAPER banner + risk stepper on STAND_ASIDE)
- check: (a) PAPER banner is the spec'd persistent strip, not a weak label — terminal-shell.tsx:246-252 renders unconditional `data-slot="paper-banner"` `role="status"` KAĞIZ/PAPER div on every frame (no envelope condition, no dismiss control/state), outside the scrolled grid so it survives ticket-panel scroll, exactly per D-06 + 17-UI-SPEC:126 + 17-PATTERNS:366; the "small" 11px-mono-tracking-widest look IS the locked Label-role copy contract (17-UI-SPEC:83), not a downgrade. Minor doc drift only: shell comment (terminal-shell.tsx:242-245) claims "placed above StatusStrip" but the div sits below `<StatusStrip />` (line 240 vs 246) — still terminal-top outside grid, functionally spec-compliant, comment-only
- check: (b) risk stepper active on clean STAND_ASIDE is by design — ticket-panel.tsx:129-149 disables ±0.5 steppers via `disabled={degraded}` where degraded = stale||thin only (lines 45-46); the sizing-lock spec (17-03-SUMMARY:29, 17-03-PLAN:74, D-05) locks sizing while DEGRADED, never while STAND_ASIDE. On clean STAND_ASIDE there is no size to lock (size line + KAĞIZ QEYD render only when isExecute, lines 90/154; STAND_ASIDE shows İMTİNA instead, lines 178-194), and riskPct is a session input for the next setup — disabling it on STAND_ASIDE would freeze legitimate operator input. Degraded STAND_ASIDE still locks the stepper via the same flag
- verdict: REFUTED — (a) banner meets the persistent non-dismissible spec, small styling is locked copy contract (comment-vs-placement drift is cosmetic, no fix); (b) stepper enabled on clean STAND_ASIDE is spec'd, degraded-only lock works as specified; no fix applied

## Resolution

- root_cause: 6 of 7 screenshot claims were misreads of spec'd layered/degraded output (HTF-vs-LTF legs, UI-06 stacking, saat abbreviation, locked copy, filled-active button, D-04 precedence, D-06 banner, degraded-only sizing lock); the single real defect was claim 4a, a never-localized English sentence builder with no localization gate
- files_changed: commit 175a68b only (claim 4a) — describeDeliveryTransition Azerbaijani localization (fvg.ts) + 3 verbatim toBe pins (fvg.test.ts); claims 1-3, 4b, 5-7 code-unchanged
- verdict_table:
  - 1 bias-vs-trigger: REFUTED (layered HTF/LTF design, no parity bug)
  - 2 marker/label overlap: REFUTED (UI-06 stacking + library de-collision by design)
  - 3 countdown format: REFUTED (`s` = saat/hour, XƏBƏR ÖNCƏSİ flag per spec)
  - 4 language leak: SPLIT — (a) CONFIRMED+FIXED 175a68b (English delivery sentence → Azerbaijani); (b) REFUTED (NY line is locked spec'd copy)
  - 5 switcher missing button: REFUTED (all 3 render, active is the filled one)
  - 6 duplication + placeholders: REFUTED (D-04 precedence echo; §1 sole spec-locked placeholder, zero stale leftovers)
  - 7 banner + stepper: REFUTED (banner meets D-06 persistent spec; stepper lock is degraded-only by design)
