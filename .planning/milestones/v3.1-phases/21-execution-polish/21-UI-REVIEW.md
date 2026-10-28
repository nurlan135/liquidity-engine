# Phase 21 — UI Review

**Audited:** 2026-10-28
**Baseline:** 21-UI-SPEC.md
**Screenshots:** captured (3/3) to `.planning/ui-reviews/21-20261028-160729/` (desktop 1440×900, mobile 375×812, tablet 768×1024)
**Interaction captures:** off (`interaction_capture: false` — interaction findings are code-derived)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All four strip literals + `Atəş Həddi` / `{n} / həftə` / `Sıfırla` / `Defolta qaytar` verbatim |
| 2. Visuals | 3/4 | Control renders with hierarchy; thumb undersized (12px vs 16px spec), hit-area ~28px vs 44px |
| 3. Color | 2/4 | Slider fill uses `bg-primary` (near-white in dark) not `--terminal-accent` (#00d9ff); track `bg-muted` not `--terminal-panel` |
| 4. Typography | 4/4 | Exactly 4 sizes / 2 weights; strip, label, readout all match roles |
| 5. Spacing | 4/4 | All spacing on scale; `space-y-1` + `gap-2/3` only; no arbitrary spacing |
| 6. Experience Design | 3/4 | States, disabled lock, aria-live, persistence all coded; live drag/persist/reset UAT still pending |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **Slider fill/track map to terminal tokens, not shadcn neutrals** — accent semantics broken (white fill reads as neutral, spec reserves cyan for live/accent-only elements) — in `components/ui/slider.tsx:30-37` change `Track` to `bg-[var(--terminal-panel)]` and `Indicator` to `bg-[var(--terminal-accent)]`; verify dark screenshot shows cyan fill.
2. **Restore 16px thumb visual + 44px hit-area** — undersized thumb hurts drag usability on the single operator control — in `slider.tsx:43` change `size-3` to `size-4` and `after:-inset-2` to a 44px target; keep `data-disabled:opacity-50`.
3. **Run the pending live-browser UAT** — drag/min/mid/max readout+strip sync, reload persistence, `Sıfırla` restore, corrupt-key fallback with no throw, and §1 `aria-live` announcement — the two `human-check` rows in 21-03/21-04 SUMMARYs; record results in 21-UAT before closeout. *(Post-audit note 2026-10-28: completed in verify-work — 21-UAT.md status complete, 3/3 passed; keyboard drag, persist round-trip, corrupt fallback, live-region transitions and 320px layout all verified live in browser.)*

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

`src/lib/fire-rate.ts:64-76` returns the four locked literals verbatim (`bandda`, `banddan aşağı (sakit həftə)`, `banddan yuxarı (qızğın həftə)`, `hələ məlumat yoxdur`). `components/dashboard/threshold-control.tsx:90-92,108,111-118` renders `Atəş Həddi`, `{n} / həftə`, `Sıfırla` with `title="Defolta qaytar"`. No new CTA, no pool-tolerance copy. Live browser check confirms `4 / həftə` + `Sıfırla` beside the slider. No finding beyond pass.

### Pillar 2: Visuals (3/4)

Live-page check: clear focal hierarchy, `Atəş Həddi` label above slider, readout + ghost reset inline right, strip slot inside §5. Deviation: `components/ui/slider.tsx:43` thumb is `size-3` (12px) but UI-SPEC Spacing exception mandates a 16px thumb visual; `after:-inset-2` yields roughly a 28px target, not the specified 44px hit-area. No icon-only buttons without labels (slider carries `aria-label="Atəş Həddi"`).

### Pillar 3: Color (2/4)

`slider.tsx:32,36` uses `bg-muted` (track) + `bg-primary` (Indicator/Range). In dark mode (`app/globals.css:93-97`), `--primary` is `oklch(0.922 0 0)` (near-white) and `--muted` is neutral gray — the spec requires track = `--terminal-panel` (#14141e) and Range + thumb focus-ring = `--terminal-accent` (#00d9ff). Note: UI-SPEC assumed "shadcn slider default `bg-primary` maps to the terminal accent in dark mode" — that assumption is wrong for this theme; `bg-primary` resolves near-white, not cyan. Strip rule holds (`report.tsx:346` `text-xs text-muted-foreground`, copy-only status). `--destructive` renders nowhere. Pool tokens pinned test-only. Fix: `Track className … bg-[var(--terminal-panel)]`, `Indicator … bg-[var(--terminal-accent)]`.

### Pillar 4: Typography (4/4)

Only `text-xs`, `text-[11px]`, `text-base`, `text-xl` and `font-semibold` (+ regular) in `components/dashboard`; zero `font-medium/bold/thin` hits. Strip Body 12px + `font-mono tabular-nums` count (`report.tsx:346,358`); label `text-[11px] font-semibold uppercase tracking-[0.1em]` (`threshold-control.tsx:90`); readout `font-mono text-base font-semibold tabular-nums` (`threshold-control.tsx:104-107`); reset ghost `size="sm" variant="ghost"`. Matches §Typography exactly.

### Pillar 5: Spacing (4/4)

Control `flex flex-col gap-2` + inner `flex flex-wrap items-center gap-2` (`threshold-control.tsx:89,93`); D-15 `space-y-1` on both `s1-pain-threshold` divs (`report.tsx:191,199`); skeletons `gap-3`, shell `gap-3 p-4`. `gap-2`=8, `gap-3`=12, `space-y-1`=4, `p-4`=16 — all on the 4px scale. No `p-[…px]`/`m-[…px]` arbitrary spacing (only `text-[11px]`/`tracking-[0.1em]` typography tokens and pre-existing layout grids). 320px viewport check: no horizontal scroll, strip wraps in flow.

### Pillar 6: Experience Design (3/4)

Loading: `lastUpdatedISO === null` skeletons per section (`report.tsx:178,230,292,318,377`); strip renders nothing unresolved (dismissed-by-design, annotation inside skeletoned §5). Empty: `fireRateCopy` empty literal via `countFireRate` live-array read (`report.tsx:121-122,348`). Error: none-by-design, `readFireThreshold` validate-on-read fallback (`threshold-control.tsx:28-39`). Degraded: `degraded` (stale/thin) disables slider + reset (`threshold-control.tsx:58-59,100,115`). Persistence: lazy `useState(readPersistedThreshold)` + mount-only effect + handler-only write-through + reset (`threshold-control.tsx:65-86`). A11y: `aria-live="polite"` on §1 live section (`report.tsx:174`); `aria-label` on slider; `focus-visible:ring-3` on thumb. Gap at audit time: the plan-03 task-3 and plan-04 task-2 `human-check` rows were recorded `unknown`/`pending` — since closed via live-browser verification in 21-UAT (3/3 passed).

---

## Registry Safety

Skipped — UI-SPEC §Registry Safety declares third-party: none (`"registries": {}`); zero new packages per plan summaries, lockfile diff empty. Slider carries zero `radix` matches, imports `@base-ui/react/slider` only (pre-existing dep).

---

## Files Audited

- `components/dashboard/threshold-control.tsx`
- `components/dashboard/report.tsx`
- `components/dashboard/terminal-shell.tsx` (mount grep only, lines 374-381)
- `components/ui/slider.tsx`
- `components/ui/button.tsx` (reset affordance, existing install)
- `src/lib/fire-rate.ts`
- `src/lib/store.ts` (thresholdInputs slice, readFireThreshold, selectTicket ATR threading)
- `app/globals.css` (.dark tokens, terminal contract)
