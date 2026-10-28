# Phase 20 — Research: Price-Line Overlay + §1 Wiring

**Researched:** 2026-10-26
**Method:** light research — ego-browser on lightweight-charts v5.2 docs + repo pattern audit
**Scope note:** CONTEXT.md declares this phase wiring-only (no scorer constants, no boundary matrix). Research covers only the two open mechanics: price-line API confirmation and repo-pattern reuse.

## Findings

### 1. Price-line API (lightweight-charts v5.2, installed ^5.2.1)

Source: tradingview.github.io/lightweight-charts docs API reference v5.2 (`PriceLineOptions`, `IPriceLine`, `CreatePriceLineOptions`, `ISeriesApi`, `LineStyle`).

- `series.createPriceLine(options)` — `CreatePriceLineOptions = Partial<PriceLineOptions> & Pick<PriceLineOptions, "price">`. Only `price` is required; everything else optional.
- `series.removePriceLine(line: IPriceLine)` — removes a previously created line. No-op semantics for unknown lines are undocumented — repo guards with `!== null` checks before removal (keeps this discipline).
- `series.priceLines(): IPriceLine[]` — returns current lines; useful for assertion-style verification but the repo uses explicit ref registries instead (keep).
- `IPriceLine.applyOptions(Partial<PriceLineOptions>)` — live-update without remove/create cycle. **Not used by the repo today** (repo always does remove-then-create); note as an option but do not introduce a second line-management idiom in this phase.
- `IPriceLine.options(): Readonly<PriceLineOptions>` — read-back for verification.
- `LineStyle` enum: `Solid: 0, Dotted: 1, Dashed: 2, LargeDashed: 3, SparseDotted: 4`. Phase 20 uses `Dashed` (D-09, Asia precedent).
- `PriceLineOptions` defaults: `lineWidth: 1`, `lineStyle: Solid`, `lineVisible: true`, `axisLabelVisible: true`, `color: ''`, `title: ''`. Phase-relevant explicit values: `lineWidth: 1`, `lineStyle: LineStyle.Dashed`, `title: '{SIDE}-{rank}-{top|bottom}'` (D-09, Asia-H/Asia-L title precedent).
- `color` is a plain CSS string — `rgba(0,255,136,0.5)` alpha form is valid input; no special API needed for rank-2 dimming (D-10). Repo precedent resolves tokens via `resolveCssVar` on `--terminal-up/--terminal-down`; alpha variant needs an rgba literal (see §3 open point).
- `axisLabelVisible` defaults `true` — axis labels render per line. With 8 pool lines + ticket lines, axis clutter is the main visual risk. Mitigation is already locked in CONTEXT/UI-SPEC (max 8 ACTIVE lines, cap-2-per-side); no API-level suppression decided — do not add `axisLabelVisible: false` without a CONTEXT amendment.
- `axisLabelColor` defaults to the line color when unspecified — no per-line label work needed.
- `lineVisible` defaults `true` — ghost-clear is done via `removePriceLine`, not visibility toggles (D-14/D-15).

### 2. Repo pattern audit (nq-chart.tsx)

The exact remove-then-create idiom Phase 20 reuses:

- Mount path (lines 214-269): typed wrapper `{ setData, createPriceLine }`, `LineStyle.Dashed`, `lineWidth: 1`, titles `'EQ'`, `dolName`, `'Asia-H'`/`'Asia-L'` via `asiaLineInputs` (finite-guarded, try/catch leaves refs null).
- Update path (lines 420-440): every managed ref removed with `!== null` guard before re-creation. Pool pairs join this same registry (`ref` array alongside asia/ticket refs — D-09).
- Dimming discipline: `props.overlayStale ? MUTED_GRAY : accent` and `dimmed ? MUTED_GRAY : accent` where `MUTED_GRAY = '#71717A'`. Pool lines follow the identical ternary (D-13).
- Ticket lines (lines 295-304, 548-557): EXECUTE-only leg array `{ ref, price, title, style }`, created last/on top. Pool creation must sit **before** the ticket leg block so ticket stays on top (D-11).
- Version: `lightweight-charts ^5.2.1` (package.json) matches researched docs v5.2 — no version drift.

### 3. Open points for the planner (no research blockers)

1. **Rank-2 alpha color form.** D-10 says rank-2 = same hue at 50% alpha. Docs confirm `color` accepts any CSS string, so `rgba(0,255,136,0.5)` / `rgba(255,0,255,0.5)` works — but repo resolves theme via `resolveCssVar('--terminal-up')` returning hex. Planner decides: hardcode the two rgba literals next to `MUTED_GRAY`, or derive alpha from the resolved var. Prefer literals (MUTED_GRAY precedent: plain constant, no derivation).
2. **`applyOptions` vs remove-then-create.** Researched, repo uses remove/create everywhere. Planner must NOT introduce `applyOptions` for pools (second idiom, unneeded churn).
3. **No `priceLines()` reconciliation.** Registry refs are the source of truth; do not add a reconciliation pass over `series.priceLines()`.

## Approach

Tracer-first vertical slice: one end-to-end path (§1 rank-1 sentence + one BSL price-line pair on chart from `selectPools`) verified before expanding to rank-2/SL side/ghosts/empty states. Follows Phase 19's tracer precedent (19-01 thin pipeline before 19-02 matrix).

## Validation Architecture

- **Targeted:** `npm test -- src/lib/store.test.ts` (selectPools contract unchanged — no new selector logic, wiring consumes the same return).
- **New unit surface:** report branch render tests (verbatim reason, empty/stale/thin copy) + chart prop-mapping tests (pair titles, cap-2-per-side, z-order inputs) — exact files per planner, following the `report.tsx` §3 test precedent if one exists.
- **Visual backstops:** two held-out human checks per UI-SPEC (longest rank-1 sentence wrap, canvas glance) — same mechanism as Phase 19's UAT backstops (agent screenshots 2026-09-18 precedent acknowledged in audit).
- **Full suite:** `npm test` green + `tsc --noEmit` clean (Phase 19 exit bar: 458/458).

## Risks

- Axis-label clutter with 8 pool lines + ticket lines (API default `axisLabelVisible: true`). Locked cap (nearest-2-per-side) is the mitigation; suppressing labels would need a CONTEXT amendment — flag, don't freelance.
- `title` uniqueness: `{SIDE}-{rank}-{top|bottom}` must be unique per line or axis labels collide. Planner enforces via construction (same as Asia-H/Asia-L distinct titles).
- No math changes: any planner task touching `src/lib/ict/` violates D-20/purity guard — reject at plan-check.
