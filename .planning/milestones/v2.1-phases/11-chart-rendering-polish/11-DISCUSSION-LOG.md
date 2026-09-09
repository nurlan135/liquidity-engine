# Phase 11: Chart Rendering Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 11-Chart Rendering Polish
**Areas discussed:** Resize trigger scope, View preservation, HiDPI proof method, Phase 13 boundary

---

## Resize Trigger Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Container observer | Observe the chart container itself — window resizes, panel changes, and sidebar toggles all redraw. Most robust. | ✓ |
| Window resize only | Only redraws on browser window resize. Simpler, but misses layout changes like panel toggles. | |

**User's choice:** Container observer (Recommended)
**Notes:** None — selected recommended option directly.

---

## Resize Drag Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Live tracking | Chart resizes smoothly while dragging — tracks the new size in real time. | ✓ |
| Redraw when settled | Chart only redraws once resizing pauses — can feel laggy but avoids mid-drag flicker. | |

**User's choice:** Live tracking (Recommended)
**Notes:** None — selected recommended option directly.

---

## View Preservation

| Option | Description | Selected |
|--------|-------------|----------|
| Keep pan/zoom | Resizing stretches/compresses what's visible — user keeps exactly what they were looking at, just reframed. | ✓ |
| Re-fit on resize | Chart re-fits all candles into view on every resize — always full, but loses the user's zoomed position. | |

**User's choice:** Keep pan/zoom (Recommended)
**Notes:** None — selected recommended option directly.

---

## Overlay Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Must persist | Overlays, markers, and zone fills must survive the resize exactly as before — verified as part of every resize check. | ✓ |
| Brief rebuild OK | Overlays may briefly flicker or rebuild as long as the final state is correct. | |

**User's choice:** Must persist (Recommended)
**Notes:** None — selected recommended option directly.

---

## HiDPI Proof Method

| Option | Description | Selected |
|--------|-------------|----------|
| Human visual check | Look at the chart on a high-DPI screen and confirm lines and text are sharp. Fastest path, matches how 03.2 judged canvas legibility. | ✓ |
| Automated check | Add an automated check (2x screenshot or pixel-ratio assertion) so crispness is proven by the test run, not by eye. | |

**User's choice:** Human visual check (Recommended)
**Notes:** None — selected recommended option directly.

---

## Console Cleanliness

| Option | Description | Selected |
|--------|-------------|----------|
| Console must be clean | No warnings or errors in the console while resizing and switching zoom/DPI — clean console is part of the proof. | ✓ |
| Visual only | Console output doesn't matter as long as the chart looks right. | |

**User's choice:** Console must be clean (Recommended)
**Notes:** None — selected recommended option directly.

---

## Phase 13 Boundary (Empty State)

| Option | Description | Selected |
|--------|-------------|----------|
| Populated only | Phase 11 only touches the populated chart (candles present). The empty 'Məlumat yoxdur' state stays as-is for Phase 13's honest-display work. | ✓ |
| Include empty state | Also resize-proof the empty-state overlay so it stays centered and legible at any container size. | |

**User's choice:** Populated only (Recommended)
**Notes:** None — selected recommended option directly.

---

## Chrome Stability

| Option | Description | Selected |
|--------|-------------|----------|
| Canvas only | No changes to forming row, status badges, or empty overlay — resize only affects the canvas area. | ✓ |
| Chrome may shift | Resize handling may adjust surrounding chrome (badges, forming row, empty overlay) if needed for layout correctness. | |

**User's choice:** Canvas only (Recommended)
**Notes:** None — selected recommended option directly.

---

## Done Check

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Decisions captured are enough — write CONTEXT.md. | ✓ |
| Explore more gray areas | There are more gray areas to explore first. | |

**User's choice:** I'm ready for context
**Notes:** All four areas covered in 8 questions; user confirmed readiness.

---

## Claude's Discretion

- Choice of resize mechanism (ResizeObserver vs window listener vs library-native autosize), DPR handling details, debounce/throttle strategy within live tracking, and test structure.

## Deferred Ideas

None — discussion stayed within phase scope.
