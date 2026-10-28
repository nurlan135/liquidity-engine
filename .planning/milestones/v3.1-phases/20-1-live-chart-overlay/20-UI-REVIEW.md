---
phase: 20-1-live-chart-overlay
plan: ui-review
status: complete
overall_score: 20
max_score: 24
baseline: 20-UI-SPEC.md
reviewed_at: "2026-10-27"
reviewer: gsd-ui-auditor
pillars:
  copywriting: 4
  visuals: 3
  color: 3
  typography: 4
  spacing: 3
  experience_design: 3
---

# Phase 20 UI Review: §1 Live + Chart Overlay

**Baseline:** `20-UI-SPEC.md` (APPROVED, 6 PASS + 1 non-blocking FLAG)
**Overall Score:** 20/24
**Screenshots:** code-only audit; live dev-server evidence (200, zero console errors, skeleton/stale/canvas states) supplied by orchestrator via Playwright during UAT
**Interaction captures:** off (`interaction_capture: false`)

## Pillar Scores

| Pillar | Score |
|--------|-------|
| Copywriting | 4/4 |
| Visuals | 3/4 |
| Color | 3/4 |
| Typography | 4/4 |
| Spacing | 3/4 |
| Experience Design | 3/4 |

## Pillar 1 — Copywriting (4/4)

All five contract literals verified verbatim in `src/lib/pool-prose.ts:13-26`:
`HEDGE_FRAGMENT='(proyeksiya — k=2 D1 fraktal; dəqiq stop qiyməti deyil)'`,
`EMPTY_COPY='Məlumat yoxdur'`,
`NO_POOLS_COPY='Aktiv hovuz yoxdur — D1 k=2 fraktal təsdiqlənmədi.'`,
`THIN_NOTE_COPY='İncə tarixçə — proyeksiya zəif etimadla göstərilir.'`,
`PAIN_THRESHOLD_LABEL='Ağrı Həddi'`.

Branch order in `components/dashboard/report.tsx:172-199` is load-bearing and
correct: skeleton → stale-verbatim (`poolsNqLastError` printed verbatim, line
179, no paraphrase) → null-empty (line 181) → no-pools Heading (line 183) →
thin-dimmed → healthy. `formatRank1Sentence` (`pool-prose.ts:62-67`) emits side
+ `top.toFixed(2)/bottom.toFixed(2)` + `distAtr.toFixed(1) ATR` + verbatim
`status` + hedge in one string; live render confirmed as
`SSL 28763.75 / 28763.75 · 1.6 ATR · ACTIVE (proyeksiya — …)` with inline hedge
and no footer element. SWEPT renders in `text-muted-foreground`
(report.tsx:155), never dropped. Banned-reuse absence (FIRE / exact stop-price /
heatmap / LLM) is test-pinned.

Non-blocking note: stale leg error prints raw `lastError` at Heading
`text-base font-semibold` — contract-correct, but a very long leg error will
visually match the rank-1 sentence; consider `text-xs text-muted-foreground`
for the stale line in a later pass (do NOT change without UI-SPEC amendment).

## Pillar 2 — Visuals (3/4)

Focal-point elevation is by typography only. Rank-1 sentence is
`text-base font-semibold` (report.tsx:155) vs Body `text-xs` context — adequate
hierarchy, and it resolves the checker's Dimension-2 FLAG (focal point unnamed
→ rank-1 sentence is the de-facto focal point). Hierarchy otherwise mirrors
locked §3 idiom: `h3` Label → `h4` Label → Heading prose → Body note. No new
CTAs, so no icon-button/aria-label gap. Ghost pairs (`SIDE-ghost-top/bottom`,
`src/lib/pool-overlay.ts:91-99`) keep retest context visible.

Deduction: the held-out long-text backstop (UI-SPEC row: verbatim AZ reasons
wrap without truncation/horizontal scroll) is human/UAT-gated and was only
corroborated by the orchestrator's `scrollWidth == clientWidth` note on one
sentence — longest-sentence wrap remains unverified in code. No truncation class
found (good), but no `break-words`/`overflow-wrap` guard either; a maximally
long verbatim reason + hedge in a narrow panel is the residual risk.

## Pillar 3 — Color (3/4)

Token drift by design. `src/lib/pool-overlay.ts:25-29` hardcodes `BSL #00FF88`,
`BSL_RANK_2 rgba(0,255,136,0.5)`, `SSL #FF00FF`, `SSL_RANK_2 rgba(255,0,255,0.5)`,
`POOL_MUTED_GRAY #71717A` — chromatically identical to the UI-SPEC contract
(`--terminal-up #00ff88`, `--terminal-down #ff00ff`, ghost/dim `#71717A`,
case/whitespace differences only). Pools never touch `--terminal-accent`;
accent stays reserved (conviction `text-[var(--terminal-accent)]` at
report.tsx:237, ticket lines). `dimmed=true` forces every color to muted gray
(`pool-overlay.ts:58`), and `nq-chart.tsx:291-292,599` derives `poolDimmed` from
`overlayStale || poolsThin || thinTier !== 'full'` — uniform 0.5 discipline per
D-13. No destructive token renders (no destructive action exists).

Deduction: the mapper deliberately bypasses `readVar('--terminal-up'/'--terminal-down')`
(literals ruling), so a future `globals.css` token change silently desyncs
canvas from CSS. Rank-1 full vs rank-2 50% literals are test-pinned
(`pool-overlay.test.ts`), which mitigates but does not eliminate drift.

## Pillar 4 — Typography (4/4)

Exactly the 4 locked sizes, 2 locked weights. §1 uses: `h3`/`h4` Label
`text-[11px] font-semibold uppercase tracking-[0.1em]` (report.tsx:169,186,194),
sentence/empty/stale/no-pools Heading `text-base font-semibold` (lines
155,179,181,183), thin note Body `text-xs text-muted-foreground` (line 190).
Numerals wrapped in `font-mono tabular-nums` spans via the split-map (lines
156-164) while the sentence stays one `<p>` — matches the plan decision. No
`font-medium`/`font-bold` in §1; `text-xl` appears only in the pre-existing §3
conviction/ticket paths, not §1. `geist` mono for numerics per contract.

## Pillar 5 — Spacing (3/4)

Skeleton rows use `flex flex-col gap-3` (report.tsx:173) — contract-sanctioned
12px exception. No arbitrary `[Npx]` spacing, no new touch targets, thin wrapper
is bare `opacity-45` (line 185) per the dimming discipline.

Deduction: the healthy/thin sub-block (`div[data-slot="s1-pain-threshold"]` →
`h4` → sentence `<p>` → optional note `<p>`) has **no gap/space-y wrapper** —
vertical rhythm depends entirely on inherited `CardContent`/section flow, so
the `h4` label sits flush against the 16px semibold sentence. All other
sub-blocks share this inheritance (locked precedent, not a Phase-20 invention),
but the §1 sentence is the visual focal point and earns one explicit rhythm
token.

## Pillar 6 — Experience Design (3/4)

State matrix is complete in code: skeleton (`lastUpdatedISO === null`),
stale-verbatim, null-empty (refuse-null, never cached), no-pools distinct line,
thin-dimmed `opacity-45` + visible note (never hidden like stale), healthy.
Chart: null clears ALL lines via unconditional removal (nq-chart.tsx:483-487,
D-14), STAND_ASIDE drops ghosts via `withoutGhosts` while ACTIVE pairs remain
(lines 295,601, D-15), pool creation strictly before ticket EXECUTE legs (D-11,
z-order ticket-on-top). Interaction capture off — no post-interaction states
captured.

Gap 1: state transitions are silent to assistive tech — the §1
`<section data-slot="report-section">` has no `aria-live`, and the chart
presence flags are explicitly `aria-hidden="true"` (nq-chart.tsx:724-725).
Sighted users get the STALE badge + dimming; screen-reader users get no
announcement.

Gap 2: canvas has no skeleton/shimmer path — on cold load the chart renders
with zero pool lines until the envelope resolves while §1 shows pulse rows;
correct honesty behavior (no lines before envelope), but the asymmetry is
unacknowledged (no `aria-busy` or loading hint on the chart region).

No disabled-state or destructive-confirmation gap: N/A, correctly — read-only
phase, no CTAs built.

## Registry Audit

Skipped — `components.json` carries `"registries": {}`, UI-SPEC Registry Safety
declares third-party `none`. No third-party blocks to vet. Reused `card` is a
pre-existing install.

## Top 3 Priority Fixes

1. **§1 sub-block has no explicit vertical rhythm** — `h4` label sits flush on
   the 16px semibold sentence — add one spacing token to the sub-block wrapper
   in `components/dashboard/report.tsx:185,193` (e.g. `space-y-1` on
   `div[data-slot="s1-pain-threshold"]`); user impact: cramped focal point vs
   the airy §3 sub-blocks; concrete fix is one class, no contract change
   (spacing scale already allows it).
2. **Pool color literals can drift from CSS tokens** —
   `src/lib/pool-overlay.ts:25-29` hardcodes `#00FF88/#FF00FF/#71717A` while
   `nq-chart.tsx:65-69` resolves the same names via `readVar` — add a sync pin
   (test asserting literal equality against the `globals.css` `.dark` token
   values, or a comment with the token source line); user impact: silent
   canvas/theme desync after any future token tweak.
3. **Silent state transitions for assistive tech** — add `aria-live="polite"`
   to the §1 live `<section>` (report.tsx:168) so stale/thin/empty transitions
   announce; keep `pool-lines`/`pool-ghosts` spans `aria-hidden` (they carry no
   text); user impact: screen-reader users miss degrade banners entirely today.

## Minor Recommendations (not top-3)

- Consider `break-words` on the rank-1 sentence `<p>` as cheap insurance for
  the long-text backstop (maximal verbatim reason + hedge in narrow panels).
- Consider demoting the stale-verbatim line to `text-xs text-muted-foreground`
  so a long `lastError` never visually masquerades as the Heading-role rank-1
  sentence (requires UI-SPEC copy-contract amendment first).
- The `poolPriceLines` union overload (opts object OR legacy color function,
  `pool-overlay.ts:75`) is dead weight post-migration — both `nq-chart.tsx`
  call sites use `{ dimmed }`; remove the function-form overload in a cleanup
  pass.

## Files Audited

- `.planning/phases/20-1-live-chart-overlay/20-UI-SPEC.md`
- `.planning/phases/20-1-live-chart-overlay/20-CONTEXT.md`
- `.planning/phases/20-1-live-chart-overlay/20-01-SUMMARY.md`
- `.planning/phases/20-1-live-chart-overlay/20-02-SUMMARY.md`
- `.planning/phases/20-1-live-chart-overlay/20-03-SUMMARY.md`
- `.planning/phases/20-1-live-chart-overlay/20-01-PLAN.md` (partial)
- `.planning/phases/20-1-live-chart-overlay/20-02-PLAN.md` (partial)
- `.planning/phases/20-1-live-chart-overlay/20-03-PLAN.md` (partial)
- `src/lib/pool-prose.ts`
- `src/lib/pool-overlay.ts`
- `components/dashboard/report.tsx`
- `components/charts/nq-chart.tsx`
- `components.json`
