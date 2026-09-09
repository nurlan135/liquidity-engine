# Phase 13: Thin History Honesty - Research

**Researched:** 2026-09-09
**Domain:** Surfacing existing ICT thin-history signals in the NQ D1 chart (banner + dimming, no new math)
**Confidence:** HIGH (in-repo wiring) / MEDIUM (lightweight-charts recolor API)

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Thin-history signal lives as a banner strip above the chart, reusing the existing `rollover-banner` pattern in `terminal-shell.tsx` (`role="status"`, mono text). No canvas overlap, screen-reader friendly.
- **D-02:** When thin-history and rollover-suspect are both true, both strips stack — thin-history first. Both truths stay visible; matches how the MARKET CLOSED ribbon coexists with banners today.
- **D-03:** Banner is always visible on every thin render. No dismiss state — persists like the STALE badge.
- **D-04:** The empty (0-candle) state keeps its own "Məlumat yoxdur" + Yenilə message. The thin banner covers only 1+ candles where a chart actually renders.
- **D-05:** Available candles render normally; Premium/Discount zone fills mute (extending the stale 0.5-opacity precedent) so zones read as provisional, not authoritative.
- **D-06:** Zones + levels dim (zone fills, EQ/DOL, Q1/Q3/OTE price lines); Judas/SMT pins and Asia lines stay full strength.
- **D-07:** No viewport constraining to fit sparse data. Candles render at natural width even if sparse; no custom viewport logic against Phase 11's view-preservation.
- **D-08:** Proof is both automated and human: unit tests assert the thin flag reaches the chart and dimming applies, plus a human visual glance confirming it looks honest (Phase 11 D-05/D-06 pattern).
- **D-09:** Three user-visible tiers mirroring the math exactly: range-thin (<20 closed candles) vs regime-degraded (20–33, Sıxılma) vs full (34+). Each tier gets its own banner copy.
- **D-10:** Dimming is uniform across both thin tiers — one muted treatment. Tier distinction lives in text, not pixels (single-branch canvas logic).
- **D-11:** Tier thresholds reuse the math constants — range window (20) from `computeRange`, `MIN_CANDLES_FULL` (34) from `regime.ts`. UI-local cutoffs rejected.
- **D-12:** Tiering stays chart-local (banner + dimming). Report §2/§3 prose keeps its existing textual degrade untouched.
- **D-13:** Banner copy is Azerbaijani with candle counts plus the house pattern of counts in reason strings.
- **D-14:** Distinct wording per tier: range-thin warns extremes are unreliable; regime-degraded notes Sıxılma.
- **D-15:** Copy names the consequence (zones/levels provisional, extremes may shift).

### Claude's Discretion

Exact Azerbaijani banner strings (direction locked); flag-plumbing mechanics (new `NqChart` prop vs derived signal, selector shape), dimming value within the stale-opacity precedent, and test structure.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Project Constraints (from CLAUDE.md → AGENTS.md)

The repo `CLAUDE.md` delegates to `AGENTS.md`, which contains only the Next.js agent-rules block [VERIFIED: `AGENTS.md:1-9`]. Directives:

1. This is NOT standard Next.js — APIs/conventions/file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. (Relevant guides for this phase: none — this phase touches no App Router APIs; chart + shell are existing client components.)
2. Heed deprecation notices.
3. The agent-rules block is re-added by `next dev` — never remove it in a diff; committing it keeps the tree clean.

No `.claude/skills/` or `.agents/skills/` directories exist (probed this session — both absent).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | Thin history renders honestly — indicator or fallback shown when history is too thin for full chart, no silent empty/misleading display | Banner strip (D-01–D-04) + uniform dimming (D-05/D-06/D-10) + 3-tier truth table; tier helper unit tests + human glance (D-08) |

## Summary

`selectRange()` already returns a `thinHistory` flag and `computeRegime()` already degrades below 34 candles, but neither signal reaches the chart: `nq-chart.tsx` hardcodes `thinHistory: false` in its zone-fill getter and receives decomposed `rangeHigh/Low/eq` numbers with no thin input, while `terminal-shell.tsx` renders either the full `NqChart` or `chart-empty` with nothing in between. The fix is pure plumbing plus presentation: derive a 3-tier value from the closed-candle count using the two math constants, render the locked banner strip above the chart, and dim zones/levels through the existing stale precedents while leaving candles, Asia lines, and Judas/SMT markers at full strength.

**Primary recommendation:** Add a tiny pure helper `thinTier(closedCount)` importing `ANCHOR_WINDOW` and `MIN_CANDLES_FULL` (single source of truth per D-11); thread the tier into `NqChart` as one new prop; in the shell render the locked banner (`data-slot="thin-history-banner"`) stacked thin-first over rollover inside `flex flex-col gap-2` only when both show; in the chart compute one `dimmed = tier !== 'full'` boolean driving zone `opacityScale = 0.5` and level-line color `MUTED_GRAY #71717A` — but first fix the `ZoneFillPrimitive` opacity snapshot defect (see Pitfall 1), otherwise the dimming is a no-op.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tier truth (how thin is thin) | API / Backend (pure ICT lib + store selector) | — | `computeRange`/`computeRegime` own the thresholds; UI must reuse, never redefine |
| Honesty signal (banner) | Frontend Server (SSR shell render) | — | DOM banner in `terminal-shell.tsx` CardContent; screen-reader `role="status"` |
| Provisional rendering (dimming) | Browser / Client (canvas effect) | — | lightweight-charts price-line colors + zone primitive opacity inside `nq-chart.tsx` effects |
| Authoritative marks (sweeps) | Browser / Client (canvas, untouched) | — | Judas/SMT/Asia stay full strength per D-06 |
| Degrade prose (§2/§3) | Frontend (report, untouched) | — | D-12 keeps report out of scope |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lightweight-charts | 5.2.1 (installed) | Chart engine — price lines, zone primitive host, markers | Already the project engine; Phase 11 verified v5 APIs in installed typings |
| zustand | ^5.0.15 | Store selectors (`selectRange`, `selectRegime`) | Existing state layer; derived-value `useShallow` precedent in shell |
| vitest | 5.0.0 | Unit tests for tier helper + selector passthrough | Repo framework; node env, `src/**/*.test.ts` include |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | No new packages. Banner is a plain `div` per UI-SPEC; dimming is canvas-option changes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `thinTier` prop on `NqChart` | Derive inside chart from `candles.length` | Rejected — `candles.length` includes the forming candle; tier must count **closed** candles (`closedOnly`), so the caller should pass it down |
| `removePriceLine` + `createPriceLine` recolor | `IPriceLine.applyOptions({ color })` in place | Both verified in installed typings. Recommend staying with the existing remove-then-create cycle (matches overlayStale precedent, zero new pattern) |
| New zustand selector `selectThinTier` | Compute tier inline in shell from `range.thinHistory` + `closedOnly(candles).length` | Either is fine (planner's call per D-discretion); selector is more testable, inline is fewer files. Both must import the two constants |

**Installation:**

```bash
# No installs. All dependencies pre-existing in package.json.
```

## Package Legitimacy Audit

No external packages installed by this phase. Sole library involved is pre-existing `lightweight-charts@5.2.1` (TradingView OSS, established, no install step).

**Packages removed due to [SLOP] verdict:** none

## Architecture Patterns

### System Architecture Diagram

```
store.selectRange() ──DealingRange{thinHistory}──┐
store candles ──closedOnly() count N─────────────┼── tier = range-thin (N<20) / regime-degraded (20–33) / full (34+)
                                                 │   (constants: ANCHOR_WINDOW, MIN_CANDLES_FULL)
        ┌────────────────────────────────────────┴─────────────────────┐
        ▼                                                              ▼
terminal-shell CardContent                                 NqChart (new thinTier prop)
 thin-history-banner (role=status,                        ┌─ dimmed = tier!==full
 data-tier, data-closed-count)                             │   zones opacityScale 0.5 (ONE branch)
 stacked thin-first over rollover                         │   EQ/DOL/Q1/Q3/OTE → MUTED_GRAY
 in flex flex-col gap-2 (both) / bare (single)            │   Asia/Judas/SMT/markers/candles UNTOUCHED
 0 candles → chart-empty owns state (no banner)           └── data-thin-tier attr on div[data-slot="nq-chart"]
```

### Recommended Project Structure

```
src/lib/
  thin-tier.ts          # NEW (recommended): pure thinTier(closedCount) → tier; imports ANCHOR_WINDOW + MIN_CANDLES_FULL
  thin-tier.test.ts     # NEW: boundary pins 19/20/33/34, forming-exclusion via closedOnly
  ict/range.ts          # READ ONLY: ANCHOR_WINDOW, thinHistory predicate
  ict/regime.ts         # READ ONLY: MIN_CANDLES_FULL
components/
  dashboard/terminal-shell.tsx  # EDIT: banner block + NqChart prop threading
  charts/nq-chart.tsx           # EDIT: thinTier prop, dim branches, data-thin-tier attr
  charts/zone-primitive.ts      # EDIT (required): opacityScale live-read fix (Pitfall 1)
```

### Pattern 1: Tier derivation from math constants (D-11)

**What:** One pure function; UI imports both thresholds, defines none.
**When to use:** Every tier decision in shell + chart.
**Example:**

```typescript
// Sources: src/lib/ict/range.ts:4,25 + src/lib/ict/regime.ts:6
import { ANCHOR_WINDOW } from '@/src/lib/ict/range';       // "export const ANCHOR_WINDOW = 20;"
import { MIN_CANDLES_FULL } from '@/src/lib/ict/regime';   // "export const MIN_CANDLES_FULL = 34;"
// Truth table: range-thin ⟺ thinHistory===true (same predicate, no drift);
// 20→regime-degraded, 33→regime-degraded, 34→full; 0 handled by chart-empty, never bannered.
export type ThinTier = 'range-thin' | 'regime-degraded' | 'full';
export function thinTier(closedCount: number): ThinTier {
  if (closedCount < ANCHOR_WINDOW) return 'range-thin';
  if (closedCount < MIN_CANDLES_FULL) return 'regime-degraded';
  return 'full';
}
```

### Pattern 2: Banner stack reusing rollover-banner (D-01/D-02)

**What:** Byte-identical box `rounded px-3 py-2 font-mono text-[11px] tracking-widest text-muted-foreground` with `role="status"`; wrapper `flex flex-col gap-2` only when both banners show; thin first.
**When to use:** In `CardContent` above the chart render branch.
**Example (existing pattern to copy):**

```tsx
// Source: components/dashboard/terminal-shell.tsx:245-252
{rollover !== null && (rollover.rolloverSuspect || rollover.proximityWarning !== null) ? (
  <div data-slot="rollover-banner" role="status" className="rounded px-3 py-2 font-mono text-[11px] tracking-widest text-muted-foreground">
```

New block mirrors it with `data-slot="thin-history-banner"`, `data-tier`, `data-closed-count="{N}"`; condition `candles.length >= 1 && tier !== 'full'` (D-04). Verbatim copy per tier from UI-SPEC §Copywriting Contract (locked):

- range-thin: `Nazik tarixçə · {N} / 20 şam — ekstremumlar etibarsızdır, zonalar və səviyyələr ilkin göstərilir.`
- regime-degraded: `Sıxılma · {N} / 34 şam — tarixçə tam deyil, zonalar və səviyyələr ilkin göstərilir.`

### Pattern 3: Single-branch dimming (D-10)

**What:** One `dimmed = tier !== 'full'` boolean; stale + thin never compound (`opacityScale = 0.5` in every non-full case).
**When to use:** Zone fills + EQ/DOL/Q1/Q3/OTE lines; never markers/Asia/candles.
**Example (existing precedents to extend):**

```typescript
// Precedent 1 — nq-chart.tsx:293:
zoneRef.current.opacityScale = props.status === 'stale' ? 0.5 : 1;
// Becomes: zoneRef.current.opacityScale = (props.status === 'stale' || dimmed) ? 0.5 : 1;
// Precedent 2 — Asia stale tone, nq-chart.tsx:196: "const asiaColor = props.overlayStale ? MUTED_GRAY : accent;"
// Level-line analog: const levelColor = dimmed ? MUTED_GRAY : accent; // MUTED_GRAY = '#71717A' (nq-chart.tsx:59)
```

Mount-effect initial line creation (EQ/DOL/Q1/Q3/OTE, ~lines 175-270) and the update-effect recreate cycle (~lines 356-406) both need the `levelColor` swap; Asia/marker code paths (~lines 193-230, 410-454) must not be touched (D-06). `propsRef` sync (line 124-129) + dep array (line 461) must gain the new prop or the getter/effects read stale tier.

### Anti-Patterns to Avoid

- **UI-local threshold literals (`closed < 20`, `closed < 34`):** display drifts from math on the next constant change. Violates D-11; always import.
- **`candles.length` as the tier count:** includes the forming candle; tier counts **closed** only (`closedOnly` filters `!c.forming`). A 20-row array with 1 forming = 19 closed = range-thin.
- **Fixing dimming by only setting `opacityScale`:** no-op until Pitfall 1 is fixed (renderer snapshots the value at attach).
- **Top-level `window` access for thin code:** breaks the lazy/DOM-free module-top pattern; all thin logic sits inside effects/render like existing code.
- **Touching marker/Asia branches for thin:** violates D-06; Judas/SMT/Asia stay full strength on every tier.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Thin-history detection | Custom candle counter / window math | `range.thinHistory` + `closedOnly().length` + `MIN_CANDLES_FULL` | Predicate already tested; duplicating it creates drift |
| Zone dimming | Custom canvas alpha compositing | `ZoneFillPrimitive.opacityScale = 0.5` (stale precedent) | Single muted treatment already established |
| Level muting | New line styles/widths per tier | Same lines, color → `MUTED_GRAY` | Width/style/title unchanged per contract; color-only diff is reviewable |
| Banner a11y | Custom live-region | `role="status"` on the banner div (rollover pattern) | Screen-reader friendly, zero new a11y code |

**Key insight:** Every signal this phase needs already exists (`thinHistory`, `Sıxılma` degrade, stale dim precedents, rollover banner). The phase is surfacing work, not invention work.

## Common Pitfalls

### Pitfall 1: Zone opacityScale snapshot — dimming silently does nothing (MUST FIX)

**What goes wrong:** Setting `zoneRef.current.opacityScale = 0.5` after attach has no visual effect; thin zones render full-strength and the phase silently fails its core criterion.
**Why it happens:** `attached()` snapshots the value into the view — `this.views.push(new ZoneFillView(param.series, this.getBands, this.opacityScale))` (`components/charts/zone-primitive.ts:102-108`) — while `ZoneFillRenderer` stores it as constructor `readonly` (`zone-primitive.ts:36-44`). `updateBands()` only fires `requestUpdate`, never re-reads the primitive field. (Phase 11 research already flagged this as an adjacent defect, deferred.)
**How to avoid:** Fix the primitive first: make the view/renderer read `primitive.opacityScale` live (e.g., pass a scale-getter or the primitive reference instead of a number snapshot). Small, contained change; plan must order it before any dimming task and add a unit/render assertion that mutating the field changes draw alpha.
**Warning signs:** Stale-vs-live zones look identical today — same root cause.

### Pitfall 2: `thinHistory: false` hardcode in the zone getter

**What goes wrong:** Zone bands ignore the real flag even after prop threading.
**Why it happens:** The attach getter builds `zoneBands({ high, low, eq, window: 0, asOf: '', thinHistory: false })` (`nq-chart.tsx:280-287`). (Note `zoneBands()` currently ignores the flag — pure geometry — so the hardcode is harmless today but a landmine if the function ever branches on it.)
**How to avoid:** Pass through the live thin state or drop the dead field from the call; never leave a literal `false` beside real thin logic.

### Pitfall 3: `selectRange()` null vs thin confusion

**What goes wrong:** Treating `selectRange() === null` as "thin" shows the banner over `chart-empty`.
**Why it happens:** `selectRange` refuses null when `closedCount(candles) < 1` (`src/lib/store.ts:607-611`). Null = empty/unknown, not thin.
**How to avoid:** Banner condition is `range !== null && tier !== 'full'` (with `candles.length >= 1`); null range renders the existing second `chart-empty` (shell ~line 283), unchanged.

### Pitfall 4: propsRef staleness

**What goes wrong:** Banner shows the right tier but canvas stays full-strength (or vice versa).
**Why it happens:** The zone getter reads `propsRef.current` synced in an effect (`nq-chart.tsx:124-129`); any new prop missing from that object literal and the update-effect dep array (~line 461) goes stale.
**How to avoid:** Add the thin prop in all three places (type, sync object, dep array); tests assert flag-reaches-chart.

### Pitfall 5: Thin-plumbing failure blanking the chart

**What goes wrong:** A throw in tier derivation removes candles.
**Why it happens:** New code in the render path without the established guard.
**How to avoid:** Follow the file's `try/catch` + empty-fallback convention; banner-missing must never block candles per UI-SPEC interaction rule 5.

### Pitfall 6: Viewport "helpfulness" against D-07

**What goes wrong:** Sparse candles get stretched/fit to fill width, violating 02-UI-SPEC "without stretching" intent and fighting Phase 11 `lockVisibleTimeRangeOnResize`.
**How to avoid:** No `setVisibleLogicalRange`/`fitContent`/time-scale changes in this phase; candles render at natural width.

## Code Examples

### Deriving closed count + tier in the shell

```typescript
// Sources: src/lib/ict/types.ts:47-49 (closedOnly) + range.ts:25 + regime.ts:44-50
import { closedOnly } from '@/src/lib/ict/types';
import { thinTier } from '@/src/lib/thin-tier'; // NEW helper (Pattern 1)

const range = useDashboard(useShallow((s) => s.selectRange()));
const closedCount = closedOnly(candles).length;
const tier = range === null ? null : thinTier(closedCount);
```

### Threading into NqChart + assertion hook

```tsx
// Container hook per UI-SPEC (binding): div[data-slot="nq-chart"] carries data-thin-tier
<div ref={containerRef} data-slot="nq-chart" data-thin-tier={thinTierProp} ... />
<NqChart ... thinTier={tier ?? 'full'} />
```

### Mount-effect line color with dimming (update-effect analog identical)

```typescript
// Precedent: nq-chart.tsx:196 "const asiaColor = props.overlayStale ? MUTED_GRAY : accent;"
const dimmed = props.thinTier !== undefined && props.thinTier !== 'full';
const levelColor = dimmed ? MUTED_GRAY : accent;
eqLineRef.current = typed.createPriceLine({ price: inputs.eq, color: levelColor, lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'EQ' });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| v4 `series.setMarkers()` | v5 `createSeriesMarkers(series, markers)` plugin + `plugin.setMarkers()` | v5 (adopted `nq-chart.tsx:219-230, 434-454`) | Thin work must not touch marker code at all (D-06) |
| No resize handling | `autoSize: true` + `lockVisibleTimeRangeOnResize` | Phase 11 | No viewport/time-scale changes in Phase 13 (D-07) |
| Silent full chart on 5 candles | Banner + uniform dimming (this phase) | Phase 13 (HIST-01) | Closes audit W-NEW-1 |

**Deprecated/outdated:**

- Leaving `thinHistory: false` literal in the zone getter: dead today, misleading tomorrow — pass live state or remove.
- Per-tier pixel treatments: rejected by D-10; tiering lives in copy only.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `chart.remove()` tears down the internal `autoSize` observer (no extra disconnect for thin work) | Patterns | Low — inherited from Phase 11 research; D-08 console check covers it |
| A2 | Fixing the opacity snapshot (getter/reference form) preserves stale behavior byte-identically | Pitfall 1 | Low — stale path uses the same field; existing suite + visual glance guard it |
| A3 | `IPriceLine.applyOptions` exists as an alternative recolor path but the plan stays with remove-then-create | Patterns | Low — both verified in installed typings; choice is stylistic |

## Open Questions (RESOLVED at plan time — 13-01-PLAN.md Task 2 implements both recommendations)

1. **Prop shape: `thinTier` string vs `thinHistory + closedCount` pair?** → RESOLVED: single `thinTier: 'full' | 'range-thin' | 'regime-degraded'` string — one prop, impossible to desync.
2. **New `selectThinTier` selector vs inline derivation?** → RESOLVED: inline derivation in shell via `resolveThinTier` helper; follows the refuse-null envelope (`range === null → null`) and never throws.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/test/dev | ✓ | v24.11.1 | — |
| npm | installs (none needed) | ✓ | 11.6.2 | — |
| lightweight-charts | chart runtime | ✓ | 5.2.1 | — |
| tsc | type gate | ✓ | 5.9.3 | — |
| vitest | unit tests | ✓ | 5.0.0 | — |
| High-DPI display / human glance | D-08 visual proof | needs human | — | Browser zoom ≥150% approximates; final sign-off stays human |

**Missing dependencies with no fallback:** none — no new tools or packages.

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 5, `environment: 'node'`, `include: ['src/**/*.test.ts', 'app/**/*.test.ts']` |
| Config file | `vitest.config.ts` (repo root) |
| Quick run command | `npm test -- --run src/lib/thin-tier.test.ts` (new tier-helper file) |
| Full suite command | `npm test` (`vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | Tier boundaries: 19→range-thin, 20→regime-degraded, 33→regime-degraded, 34→full; forming excluded | unit | `npm test -- --run src/lib/thin-tier.test.ts` | ❌ Wave 0 (new file) |
| HIST-01 | `thinHistory===true ⟺ tier==='range-thin'` (no drift; same predicate) | unit | same file | ❌ Wave 0 |
| HIST-01 | Banner copy per tier renders; coexistence thin-first over rollover; absent at 0 and full | unit (pure copy/order helper) | `npm test -- --run src/lib/thin-tier.test.ts` | ❌ Wave 0 |
| HIST-01 | Dimming applies (zones 0.5 single-branch; level color muted) / markers-untouched | manual-only (human glance per D-08) | `npm run dev` → seed thin histories, confirm dim + full-strength markers | n/a — canvas unavailable in node vitest env |
| (guard) | No regression in touched files | automated | `npx tsc --noEmit` + `npm test` + `npm run build` | ✅ existing suite |

Test-structure precedent: `store.test.ts` builds deterministic candle fixtures (21 closed + forming) and stubs fetch per leg — copy for thin-count fixtures (5, 19, 20, 25, 33, 34, 40 closed).

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npm test`
- **Phase gate:** full suite green + D-08 human glance (honest look + clean console) before verify-work

### Wave 0 Gaps

- [ ] `src/lib/thin-tier.ts` — pure `thinTier()` + tier copy map (covers HIST-01 tier/copy unit surface)
- [ ] `src/lib/thin-tier.test.ts` — boundary pins, forming-exclusion, copy-per-tier, banner-order predicate
- [ ] Framework install: none (`vitest` present)

## Security Domain

> `security_enforcement: true`, ASVS level 1 — section required. Phase touches banner DOM + canvas options only: no auth, sessions, secrets, crypto, or user-input parsing.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — no auth surface |
| V3 Session Management | no | n/a — no sessions |
| V4 Access Control | no | n/a — no access decisions |
| V5 Input Validation | no | Chart inputs are internal ICT math outputs, not user input; banner counts are derived integers, never interpolated HTML |
| V6 Cryptography | no | n/a — nothing to encrypt |

### Known Threat Patterns for banner + canvas dimming

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DOM-clobbering via container ref | Tampering | No `innerHTML` on banner/chart containers; keep it that way |
| Count-driven layout break (huge N) | Denial of service (layout) | Counts are bounded integers from `closedOnly().length`; banner wraps within card width |

## Sources

### Primary (HIGH confidence)

- `src/lib/ict/range.ts:4,25` — `ANCHOR_WINDOW = 20`, `thinHistory` predicate
- `src/lib/ict/regime.ts:6,44-50` — `MIN_CANDLES_FULL = 34`, honest-degrade rationale with counts
- `src/lib/ict/types.ts:10-17,47-49` — `DealingRange.thinHistory: boolean`, `closedOnly`
- `src/lib/store.ts:607-611` — `selectRange` null-guard
- `components/charts/nq-chart.tsx` — hardcoded `thinHistory: false` (:286), stale opacity precedent (:293), remove-then-create cycle (:332-461), `MUTED_GRAY` (:59)
- `components/dashboard/terminal-shell.tsx:245-290` — rollover-banner, skeleton/empty/NqChart render chain
- `components/charts/zone-primitive.ts:35-44,102-108` — opacity snapshot defect
- `.planning/phases/13-thin-history-honesty/13-CONTEXT.md`, `13-UI-SPEC.md` — locked decisions, tier table, verbatim copy
- Phase 11 `11-RESEARCH.md`/`11-CONTEXT.md` — boundary D-07, proof pattern D-05/D-06, snapshot-defect flag

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — versions probed live, zero new packages
- Architecture: HIGH — every integration point cited to files read with verbatim quotes
- Pitfalls: HIGH — snapshot defect root-caused to exact lines

**Research date:** 2026-09-09
**Valid until:** 30 days (stable domain: installed v5.2.1 APIs, in-repo math constants)

---

## RESEARCH COMPLETE

**Phase:** 13 - Thin History Honesty
**Confidence:** HIGH
