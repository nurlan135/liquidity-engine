# Phase 11: Chart Rendering Polish - Research

**Researched:** 2026-09-08
**Domain:** lightweight-charts v5 canvas sizing / HiDPI rendering in a Next.js client component
**Confidence:** HIGH

## Summary

The chart component (`components/charts/nq-chart.tsx`) creates a lightweight-charts v5.2.1 chart once per mount with no width/height and no resize handling whatsoever — this is the entire bug. The library already owns every hard sub-problem: it sizes canvas backing stores from `device-pixel-content-box` (HiDPI handled internally, host must NOT touch `devicePixelRatio`), it ships a native `autoSize` container observer, and it ships a `lockVisibleTimeRangeOnResize` time-scale option that preserves pan/zoom across resizes. The fix is therefore configuration plus one forced primitive refresh, not custom canvas math.

**Primary recommendation:** Pass `autoSize: true` plus `timeScale: { lockVisibleTimeRangeOnResize: true }` at `createChart`, then call `zoneRef.current.updateBands()` after size changes so the zone-fill primitive repaints. No manual `ResizeObserver`, no window listener, no debounce code, no DPR code.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Observe the chart container itself (not just the window) so window resizes, panel changes, and sidebar toggles all redraw.
- **D-02:** Track size live during an active drag — the chart follows the new size in real time rather than redrawing only when the drag settles.
- **D-03:** Resize reframes the current view — the user's pan/zoom (visible time range) is preserved, never reset to a re-fit.
- **D-04:** Asia lines, Judas/SMT markers, and zone fills must persist through the resize exactly as before — no flicker, no dropped overlays. Overlay persistence is verified as part of every resize check.
- **D-05:** Crispness is proven by human visual check on a high-DPI display (lines and text sharp), consistent with how 03.2 judged canvas legibility.
- **D-06:** Console must be clean during resize and DPI/zoom switch — no warnings or errors. A clean console is part of the proof, not just the visuals.
- **D-07:** Phase 11 touches only the populated chart (candles present). The empty "Məlumat yoxdur" state stays as-is — honest-display work belongs to Phase 13 (HIST-01).
- **D-08:** Surrounding chrome stays pixel-stable: STALE badge, forming row, MARKET CLOSED ribbon, and the empty overlay are unaffected. Resize handling affects the canvas area only.

### Claude's Discretion

Choice of resize mechanism (ResizeObserver vs window listener vs library-native autosize), DPR handling details, debounce/throttle strategy within live tracking, and test structure.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHRT-01 | Chart renders crisply on high-DPI (Retina) displays — no blur from devicePixelRatio mismatch | Library owns DPR internally via `device-pixel-content-box` canvas observation; host must only give the chart its true CSS size (autoSize does this). No manual DPR code. |
| CHRT-02 | Chart redraws cleanly on window/container resize — no stretched, clipped, or frozen canvas | `autoSize: true` (container ResizeObserver, live during drag) + `lockVisibleTimeRangeOnResize: true` (view preservation) + `updateBands()` (zone repaint). |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Canvas backing-store sizing / DPR scaling | Library (lightweight-charts internals) | — | Library observes `device-pixel-content-box` per canvas and multiplies by live `window.devicePixelRatio`; host code cannot do this better |
| Container size observation | Library (`autoSize` ResizeObserver) | — | Observes the chart container itself, satisfying D-01 including sidebar/panel changes a window listener would miss |
| Visible-range preservation | Library (`lockVisibleTimeRangeOnResize`) | — | Declarative time-scale option; no manual `getVisibleRange`/`setVisibleRange` round-trip needed |
| Overlay persistence (price lines, markers, zone fills) | API / Backend (chart component effects) | — | Data-space anchored objects survive resize untouched; only the zone primitive needs an explicit `updateBands()` repaint nudge |
| Empty state / chrome stability | Frontend (React render block) | — | Untouched by canvas sizing; D-07/D-08 boundary |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lightweight-charts | 5.2.1 (installed; registry confirms 5.2.1, modified 2026-08-12) [VERIFIED: npm registry] | Chart engine — already the project's engine, owns DPR + autosize + view-lock | Only chart dependency; v5 APIs verified in installed typings, not recall |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | No new packages. `ResizeObserver` is a browser native, not a dependency; no polyfill needed for supported browsers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `autoSize: true` | Manual `ResizeObserver` + `chart.resize(w, h)` | Manual form is the documented fallback when `autoSizeActive()` is false (no RO in scope). Costs ~20 lines (observer, rAF-throttle, zero-size guard, disconnect) for zero behavioral gain in modern browsers |
| `autoSize: true` | `window` resize listener + `chart.resize(el.clientWidth, el.clientHeight)` | Rejected: violates D-01 (misses sidebar/panel-only changes) and D-02 needs manual throttle tuning; strictly worse |
| `lockVisibleTimeRangeOnResize: true` | Manual save/restore via `timeScale().getVisibleLogicalRange()` + `setVisibleLogicalRange()` around resize | Unnecessary round-trip; the option exists exactly for D-03 |

**Installation:**
```bash
# No installs. lightweight-charts@5.2.1 already in package.json dependencies (line 19).
```

**Version verification:** `node -p "require('./node_modules/lightweight-charts/package.json').version"` → `5.2.1`; `npm view lightweight-charts version` → `5.2.1` [VERIFIED: npm registry].

## Package Legitimacy Audit

No external packages are installed by this phase. The only library involved is the pre-existing `lightweight-charts@5.2.1` dependency.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| lightweight-charts@5.2.1 | npm | ~8 yrs (TradingView, established) | high (well-known TradingView OSS lib) | github.com/tradingview/lightweight-charts [ASSUMED] | OK | Approved (already installed; no action) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Browser window / sidebar / panel change
        │  (any container geometry change, D-01)
        ▼
div[data-slot="nq-chart"]  (observed element)
        │  ResizeObserver callback, fires live during drag (D-02)
        ▼
lightweight-charts autoSize handler (library-internal)
        ├── canvas backing stores resized via device-pixel-content-box (CHRT-01, DPR automatic)
        ├── time scale keeps visible range (lockVisibleTimeRangeOnResize, D-03)
        ├── price lines / series markers repaint in place, untouched (D-04)
        └── zone-fill primitive repaints from live priceToCoordinate (D-04, + explicit updateBands())
        ▼
Crisp refilled container, chrome (badges/ribbon/forming-row) untouched (D-08)
```

### Recommended Project Structure

No new files. All change is inside the mount effect of `components/charts/nq-chart.tsx` (~line 133):

```
components/charts/
├── nq-chart.tsx         # ADD: autoSize + lockVisibleTimeRangeOnResize options; zone updateBands() nudge
└── zone-primitive.ts    # NO CHANGE (already recomputes geometry per draw)
```

### Pattern 1: Library-native autosize (recommended)
**What:** Pass `autoSize: true` in `createChart` options. The chart watches its own container with an internal `ResizeObserver` and refits on every size change, live during drags.
**When to use:** Always in modern browsers — this is the D-01/D-02 answer with zero custom observer code.
**Example:**
```typescript
// Source: node_modules/lightweight-charts/dist/typings.d.ts:933-948 (installed v5.2.1)
const chart = createChart(el, {
  autoSize: true, // "will make the chart watch the chart container's size and
                  // automatically resize the chart to fit its container whenever
                  // the size changes" — requires ResizeObserver in global scope
  layout: { background: { color: 'transparent' }, textColor: '#71717A' },
  timeScale: { lockVisibleTimeRangeOnResize: true },
});
```

### Pattern 2: View-lock on resize (D-03)
**What:** `lockVisibleTimeRangeOnResize: true` prevents the visible time range from changing during resize.
**When to use:** Set once at creation (or via `chart.timeScale().applyOptions()`); no per-resize code.
**Example:**
```typescript
// Source: node_modules/lightweight-charts/dist/typings.d.ts:1394-1399 (installed v5.2.1)
// "Prevent changing the visible time range during chart resizing."
// "@defaultValue `false`" — must be explicitly enabled.
timeScale: { lockVisibleTimeRangeOnResize: true },
```

### Pattern 3: Zone repaint nudge (D-04)
**What:** After a size change, call `zoneRef.current.updateBands()`, which invokes the primitive's `requestUpdate` and forces a repaint from live scale coordinates.
**When to use:** With `autoSize` there is no resize callback of our own; the cheap robust form is calling `updateBands()` in the existing data/overlay effect (which already does exactly this on range change at `nq-chart.tsx:446-449`) — resize then needs no dedicated hook because the renderer's `draw()` already recomputes `priceToCoordinate` every frame [VERIFIED: components/charts/zone-primitive.ts:46-71].
**Example:**
```typescript
// Existing pattern, nq-chart.tsx:446-449 — reuse, do not invent a new one:
if (zoneRef.current !== null) {
  zoneRef.current.opacityScale = status === 'stale' ? 0.5 : 1;
  zoneRef.current.updateBands();
}
```

### Anti-Patterns to Avoid
- **Manual DPR scaling (`canvas.width = cssWidth * devicePixelRatio`):** the library already sizes every canvas from `device-pixel-content-box` (bundle `Dn()` helper) and reads `window.devicePixelRatio || 1` live at draw/layout time. Host DPR code double-scales and CAUSES blur.
- **Window-only resize listener:** misses panel/sidebar-only geometry changes (violates D-01); also forces manual throttle tuning for D-02.
- **Re-creating the chart or calling `fitContent()`/`setData()` on resize:** destroys pan/zoom (violates D-03) and risks marker/primitive flicker (violates D-04). Resize is a size notification, never a data operation.
- **Top-level `window`/`ResizeObserver` access:** breaks the lazy/DOM-free module-top pattern; all access stays inside the dynamic-import mount effect.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HiDPI backing-store sizing | DPR multiplier / canvas width juggling | Library internals (`device-pixel-content-box` observation) | Per-canvas DPR boxes, zoom/monitor-switch transitions, and conflation thresholds are handled inside the bundle; host code will lag or double-scale |
| Container observation | Custom `ResizeObserver` + rAF throttle + zero-guard | `autoSize: true` | Library already implements exactly this, including RO-absent fallback warning; custom code adds cleanup-ordering bugs |
| View preservation | Save/restore visible range around resize | `lockVisibleTimeRangeOnResize: true` | One boolean vs a race-prone get/set round-trip |
| Resize debounce | `setTimeout` debounce on resize events | Nothing (live RO callbacks) | D-02 mandates live tracking; debouncing visibly lags and can cause the "frozen canvas" symptom CHRT-02 forbids |

**Key insight:** Every hard part of this phase (DPR boxes, live observation, view-lock) already exists inside lightweight-charts v5. The current blur/frozen-canvas symptoms come from the host never telling the chart its size — the chart was created once at mount size and abandoned. Configuration, not engineering, is the fix.

## Common Pitfalls

### Pitfall 1: CSS-stretched canvas mistaken for a DPR bug (the actual CHRT-01 cause here)
**What goes wrong:** Container grows via CSS but chart backing store stays at mount size → browser upscales the bitmap → blur blamed on `devicePixelRatio`.
**Why it happens:** `createChart(el, {...})` with no `width`/`height` snapshots container size at mount; nothing ever updates it (`nq-chart.tsx:144-146` has zero resize handling — confirmed by repo grep: no `autoSize`/`ResizeObserver`/`resize` outside node_modules).
**How to avoid:** `autoSize: true` keeps backing store glued to the container content box.
**Warning signs:** Blur that appears only after a resize, sharp on first paint.

### Pitfall 2: Mixing `autoSize` with explicit `resize()`/`width`/`height`
**What goes wrong:** Calls silently ignored; developer thinks resize is broken.
**Why it happens:** Documented behavior — "If chart has the `autoSize` option enabled, and the ResizeObserver is available then the width and height values will be ignored" [VERIFIED: typings.d.ts:1609-1616].
**How to avoid:** Choose one path. Primary: `autoSize`. Fallback (RO absent): `chart.resize(w, h)` with `forceRepaint` only for screenshot tests.
**Warning signs:** `autoSizeActive()` returns true while manual `resize()` appears to do nothing.

### Pitfall 3: DPR/monitor-switch blur regressions
**What goes wrong:** Chart crisp on one monitor, blurry after dragging window to a different-DPR monitor or browser zoom change.
**Why it happens:** Only if the host caches DPR. The library reads `window.devicePixelRatio || 1` live (6 occurrences in the production bundle) and observes `device-pixel-content-box` with `allowResizeObserver: true`, so DPR transitions repaint automatically — no host code needed, but also no host DPR caching allowed.
**How to avoid:** Never read or store `devicePixelRatio` in component code; D-06 console check during a zoom switch proves it.
**Warning signs:** Blur appearing only after zoom/monitor change, fixed by reload.

### Pitfall 4: Zone-fill opacityScale snapshot (adjacent pre-existing defect — DO NOT FIX in Phase 11)
**What goes wrong:** Setting `zoneRef.current.opacityScale` after attach has no visual effect.
**Why it happens:** `attached()` snapshots the value into the view: `this.views.push(new ZoneFillView(param.series, this.getBands, this.opacityScale))` [VERIFIED: components/charts/zone-primitive.ts:102-108] while `ZoneFillRenderer` stores it as a constructor `readonly` [VERIFIED: components/charts/zone-primitive.ts:36-44]. Later assignments (`nq-chart.tsx:282,447`) mutate the primitive field the renderer never re-reads.
**How to avoid:** Out of scope (stale-desaturation look, not resize correctness). Flagged so the executor does not "fix" it as drive-by scope creep; Phase 13 or a later cleanup may address it.
**Warning signs:** Stale vs live zone alpha looking identical.

### Pitfall 5: SSR / module-top DOM access
**What goes wrong:** `ReferenceError` during prerender or test import.
**Why it happens:** `ResizeObserver`/`window` do not exist in Node (probed: `typeof ResizeObserver === 'undefined'` in Node 24) or at module top during SSR.
**How to avoid:** Keep the established pattern — all chart code inside the dynamic-import mount effect (`nq-chart.tsx:133-140`); `autoSize` needs no top-level code at all.
**Warning signs:** Build/prerender crash mentioning `ResizeObserver` or `window`.

### Pitfall 6: Cleanup ordering with observers
**What goes wrong:** Resize callback fires after `chart.remove()` → exception or leak; React 18 StrictMode double-mount amplifies it.
**Why it happens:** Observer/listener outliving the chart.
**How to avoid:** With `autoSize`, the library owns its internal observer and `chart.remove()` (already in cleanup at `nq-chart.tsx:298`) tears it down — no extra code. If the executor adds a manual fallback observer, it must be disconnected BEFORE `chart.remove()` in the same cleanup, and guarded by the existing `disposed` flag.
**Warning signs:** Console errors on unmount/remount (violates D-06).

### Pitfall 7: Zero-size container at mount
**What goes wrong:** Chart created while container is `0×0` (hidden tab, collapsed panel) renders nothing and never recovers.
**Why it happens:** Initial size snapshot of an unlaid-out container.
**How to avoid:** `autoSize` recovers automatically when the container gains size (RO fires). A manual `resize()` path must guard `w > 0 && h > 0`. Current layout (`min-h-[400px] w-full`, `nq-chart.tsx:464-471`) makes zero-height unlikely but zero-width possible in collapsed sidebars.
**Warning signs:** Empty canvas area that only appears after a data refresh.

## Code Examples

### Creating the chart with autosize + view-lock (v5.2.1)
```typescript
// Source: node_modules/lightweight-charts/dist/typings.d.ts:933-948 (autoSize),
//         :1394-1399 (lockVisibleTimeRangeOnResize)
const { createChart, CandlestickSeries, LineStyle } = await import('lightweight-charts');
const chart = createChart(el, {
  autoSize: true,
  layout: { background: { color: 'transparent' }, textColor: '#71717A' },
  timeScale: { lockVisibleTimeRangeOnResize: true },
});
```

### Checking whether autosize is active (fallback gate)
```typescript
// Source: node_modules/lightweight-charts/dist/typings.d.ts:1794-1799
if (!chart.autoSizeActive()) {
  // ResizeObserver unavailable: fall back to manual sizing
  const w = el.clientWidth, h = el.clientHeight;
  if (w > 0 && h > 0) chart.resize(w, h);
}
```

### Manual resize signature (fallback only)
```typescript
// Source: node_modules/lightweight-charts/dist/typings.d.ts:1609-1616
chart.resize(width, height, forceRepaint?); // forceRepaint=true only to force immediate repaint (screenshots)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| v4 `series.setMarkers()` | v5 `createSeriesMarkers(series, markers)` plugin + `plugin.setMarkers()` | v5 (already adopted in `nq-chart.tsx:209-219,423-443`) | Resize work must use the plugin handle, never the removed v4 API |
| Manual `chart.resize()` on window events | `autoSize: true` container observer | v4.2+/v5 (present in installed 5.2.1) | Removes all custom observer/throttle code |
| Manual visible-range save/restore | `lockVisibleTimeRangeOnResize` | v5 time-scale options (present in installed 5.2.1) | D-03 via one boolean |

**Deprecated/outdated:**
- `chart.resize()` while `autoSize` is active: explicitly ignored — not a bug, documented behavior.
- Host-side `devicePixelRatio` canvas scaling with lightweight-charts: obsolete; the library observes `device-pixel-content-box` per canvas.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `chart.remove()` tears down the internal `autoSize` ResizeObserver (no separate disconnect needed) | Pitfall 6 | Low — executor verifies via D-06 console check on unmount/remount; fallback is one explicit line if a warning appears |
| A2 | `autoSize` ResizeObserver callbacks fire continuously during a drag (live tracking, D-02) rather than only on settle | Pattern 1 | Low — RO spec fires per geometry change; human resize-drag check in Validation confirms |
| A3 | Zone primitive + price lines + markers plugin repaint correctly under library-driven resize with only an `updateBands()` nudge (no re-attach) | Pattern 3 | Medium — covered by D-04 overlay-persistence check on every resize verification |
| A4 | Zone overlay fallback (`buildZoneOverlayFallback`, D-11 sanction) is untouched by this phase | Zone-primitive | Low — fallback builder is pure data mapping with no size dependence |

## Open Questions (RESOLVED)

1. **Does the executor prefer pure-`autoSize` or `autoSize` + manual-RO belt-and-braces?** — RESOLVED: plan 11-01 adopts the recommendation below (pure `autoSize` with an `autoSizeActive()` gate + guarded manual `resize()` fallback).
   - What we know: `autoSize` covers all modern browsers; typings document the RO-absent warning + width/height fallback path.
   - What's unclear: the project's minimum browser matrix (no browserslist found in repo).
   - Recommendation: pure `autoSize` with an `autoSizeActive()` gate that falls back to one manual `resize()` only when false — 5 lines, no permanent observer code.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/test/dev server | ✓ | v24.11.1 | — |
| npm + installed `lightweight-charts` | chart runtime | ✓ | 5.2.1 | — |
| `tsc` | TYPE-01 gate / typecheck | ✓ | 5.9.3 | — |
| vitest | unit tests | ✓ | 5.x (devDep) | — |
| ResizeObserver | `autoSize` at runtime | browser-only (absent in Node, as expected) | native | `autoSizeActive()` gate → manual `resize()` |
| High-DPI display | D-05 human visual check | needs human | — | Browser zoom (e.g. 200%) approximates DPR change for the console-clean half of the proof |

**Missing dependencies with no fallback:** none — this phase needs no new tools or packages.
**Missing dependencies with fallback:** physical Retina display (approximate with OS/browser zoom for functional checks; final D-05 sign-off stays human per locked decision).

## Validation Architecture

> nyquist_validation is enabled (`.planning/config.json` → `workflow.nyquist_validation: true`), so this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5 (devDependency), `environment: 'node'`, `include: ['src/**/*.test.ts', 'app/**/*.test.ts']` |
| Config file | `vitest.config.ts` (repo root) |
| Quick run command | `npm test -- --run src/lib/chart-mapper.test.ts` (representative unit file) |
| Full suite command | `npm test` (`vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHRT-01 | Crisp lines/text at DPR 2x, no DPR-mismatch blur | manual-only (human visual check per locked D-05) | `npm run dev` → open chart on HiDPI/zoomed display, inspect candle edges, axis glyphs, `EQ`/`Asia-H` titles | n/a — canvas pixels not assertable in node/jsdom; see human protocol below |
| CHRT-02 | Container refill on resize, no stretch/clip/freeze; overlays persist; view preserved; console clean | manual-only (human resize protocol per D-02/D-03/D-04/D-06) | `npm run dev` → drag-resize window + toggle sidebar/panel; assert `data-slot` hooks + console | n/a — `ResizeObserver` + real canvas unavailable in vitest node env |
| (guard) | No type/logic regression in touched files | automated | `npx tsc --noEmit` and `npm test` and `npm run build` | ✅ existing suite (28 `src/**/*.test.ts` files; no chart-component tests exist or are required) |

No new automated test files are recommended: the change surface is two chart options plus a repaint nudge inside a browser-only mount effect — untestable under the repo's node-environment vitest config (no canvas, no `ResizeObserver`), and widening the harness (jsdom + canvas mocks) for one phase would be cost without signal. The automated gate is `tsc` + full `npm test` + `npm run build` green.

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (fast type gate on touched files)
- **Per wave merge:** `npm test` (full unit suite, ~seconds)
- **Phase gate:** `npm run build` green + human visual protocol below signed off before `/gsd-verify-work`

### Wave 0 Gaps
- None — existing test infrastructure covers all automatable phase requirements. No new test files, fixtures, or framework installs needed.

### Human visual protocol (D-05/D-06 — the actual proof for CHRT-01/CHRT-02)
1. `npm run dev`, open the populated chart (D-07: empty state NOT in scope — verify with candles present).
2. **CHRT-01:** on a high-DPI display (or browser zoom ≥150% as approximation), confirm candle edges, price-line titles (`EQ`, DOL, `Q1/Q3`, `OTE-B/S`, `Asia-H/L`), axis text (`#71717A`), and `J`/`J?`/`S` markers are sharp with no blur.
3. **CHRT-02:** drag-resize the window live (D-02) → canvas refills `div[data-slot="nq-chart"]` every frame with no stretch, clipping, or freeze; toggle sidebar/resize panel (D-01) → same. Pan/zoom first, then resize → visible range preserved, never re-fit (D-03). Asia lines, Judas/SMT markers, zone fills persist with no flicker frame (D-04 — assert `asia-lines`, `judas-markers`, `smt-marker` hooks still present).
4. **D-06:** DevTools console open through steps 2–3 plus a zoom/DPR switch → zero errors/warnings.
5. **D-08:** STALE badge, forming row, MARKET CLOSED ribbon positions/sizes unchanged by resize.

## Security Domain

> `security_enforcement` is enabled (absent `false` in config), ASVS level 1. This phase touches only canvas sizing in a client component: no auth, sessions, secrets, crypto, or user-input parsing.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — no auth surface |
| V3 Session Management | no | n/a — no sessions |
| V4 Access Control | no | n/a — no access decisions |
| V5 Input Validation | no | n/a — chart inputs are internal ICT math outputs, not user input; resize dimensions come from the browser layout engine, not parseable input |
| V6 Cryptography | no | n/a — never hand-roll; nothing to encrypt here |

### Known Threat Patterns for lightweight-charts canvas sizing

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Untrusted-size-driven layout (zero/negative dimensions) | Denial of service (render loop) | Guard `w > 0 && h > 0` in any manual fallback path; `autoSize` path needs no guard |
| DOM-clobbering via container ref | Tampering | No `innerHTML` on chart containers (existing code uses none); keep it that way |

## Sources

### Primary (HIGH confidence)
- `node_modules/lightweight-charts/dist/typings.d.ts:933-948` — `autoSize` option contract (installed v5.2.1, read this session)
- `node_modules/lightweight-charts/dist/typings.d.ts:1394-1399` — `lockVisibleTimeRangeOnResize` contract (installed v5.2.1, read this session)
- `node_modules/lightweight-charts/dist/typings.d.ts:1609-1616` — `resize(w,h,forceRepaint?)` vs `autoSize` precedence (installed v5.2.1, read this session)
- `node_modules/lightweight-charts/dist/typings.d.ts:1794-1799` — `autoSizeActive()` fallback gate (installed v5.2.1, read this session)
- `lightweight-charts` v5.0 API docs via Context7 (`/websites/tradingview_github_io_lightweight-charts_5_0`) — `autoSize`, `resize`, `lockVisibleTimeRangeOnResize` semantics
- Production bundle probes (this session): `device-pixel-content-box` canvas sizing, 6 live `window.devicePixelRatio || 1` reads, internal `ResizeObserver` usage
- `components/charts/nq-chart.tsx` (read this session) — mount effect, overlay effect, render block, `data-slot` hooks
- `components/charts/zone-primitive.ts` (read this session) — per-draw geometry recompute, `updateBands()`/`requestUpdate` path

### Secondary (MEDIUM confidence)
- `npm view lightweight-charts version` → 5.2.1 (registry confirms installed version is current)

### Tertiary (LOW confidence)
- None. No claim in the recommended approach rests on unverified recall.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — installed version read from package.json + node_modules, registry-confirmed, APIs verified verbatim in installed typings and Context7 v5 docs
- Architecture: HIGH — recommendation is library-native configuration; every API cited with file/line evidence
- Pitfalls: HIGH for documented behaviors (typings + bundle probes); MEDIUM only for A1 (cleanup teardown internals) — mitigated by the D-06 console check

**Research date:** 2026-09-08
**Valid until:** 30 days (stable domain: installed v5.2.1 APIs, no fast-moving dependencies)
