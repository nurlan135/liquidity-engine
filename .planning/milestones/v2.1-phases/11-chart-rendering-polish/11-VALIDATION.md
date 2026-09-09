---
phase: "11"
slug: "chart-rendering-polish"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-08"
validated: "2026-09-08"
validation_result: partial-manual-only
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 11-RESEARCH.md `## Validation Architecture` (2026-09-08).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5 (`environment: 'node'`, `include: ['src/**/*.test.ts', 'app/**/*.test.ts']`) |
| **Config file** | `vitest.config.ts` (repo root) |
| **Quick run command** | `npx tsc --noEmit` (fast type gate per task commit) |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green + `npm run build` green + human visual protocol signed off
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | CHRT-01, CHRT-02 | — | N/A (canvas sizing/DPR options only; no user input, no auth, no crypto) | type + suite (options wiring) + manual-only (runtime pixels) | `npx tsc --noEmit` + `npm test` ✅ green (283 pass) + human UAT 6/6 | ✅ existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files: the change surface is chart options plus a repaint nudge inside a browser-only mount effect — untestable under the repo's node-environment vitest config (no canvas, no `ResizeObserver`). Automated gate is `tsc` + full `npm test` + `npm run build` green.

---

## Manual-Only Verifications

> Audited 2026-09-08 via /gsd-validate-phase (State A). Both requirements classified
> MISSING-for-automation: runtime canvas pixels + ResizeObserver are untestable under the
> repo's node-environment vitest config (no `canvas` package installed; `jsdom` present
> only as a transitive dep, not a configured environment). No automated test was generated
> deliberately — a mocked canvas would assert the mock, not the GPU behavior. Operator
> decision recorded: keep manual-only, covered by human UAT 6/6 (11-UAT.md, status: complete).

| Behavior | Requirement | Why Manual | Test Instructions | UAT Result |
|----------|-------------|------------|-------------------|------------|
| Crisp lines/text at DPR 2x, no DPR-mismatch blur | CHRT-01 | Canvas pixels not assertable in node/jsdom; human visual check per locked D-05 | `npm run dev`, open populated chart (candles present; empty state out of scope). On HiDPI display (or browser zoom ≥150% as approximation): confirm candle edges, price-line titles (`EQ`, DOL, `Q1/Q3`, `OTE-B/S`, `Asia-H/L`), axis text, `J`/`J?`/`S` markers are sharp with no blur | ✅ pass (UAT 1) |
| Container refill on resize, no stretch/clip/freeze; overlays persist; view preserved; console clean | CHRT-02 | `ResizeObserver` + real canvas unavailable in vitest node env | `npm run dev`, populated chart: drag-resize window live (D-02) → canvas refills `div[data-slot="nq-chart"]` every frame, no stretch/clip/freeze; toggle sidebar/resize panel (D-01) → same. Pan/zoom first, then resize → visible range preserved, never re-fit (D-03). Asia lines, Judas/SMT markers, zone fills persist with no flicker (D-04 — assert `asia-lines`, `judas-markers`, `smt-marker` hooks). Console clean during resize and DPR/zoom switch (D-06) | ✅ pass (UAT 2–6) |

---

## Validation Audit 2026-09-08

| Metric | Count |
|--------|-------|
| Gaps found | 2 (CHRT-01, CHRT-02 — no automated coverage possible) |
| Resolved (automated) | 0 |
| Escalated to manual-only | 2 |
| Manual-only coverage | 6/6 UAT pass |

Rationale for no generated tests: the change surface is three chart options
(`autoSize`, `lockVisibleTimeRangeOnResize`, fallback gate) inside a browser-only
mount effect. The only automatable assertion — "options object contains keys" —
is already covered by tsc (typed against `lightweight-charts@^5.2.1`) and the
green suite; a pixel-level test would need a real canvas + compositor, which this
repo deliberately does not ship (no playwright/cypress/puppeteer). Adding a mock
would create false confidence, not Nyquist coverage.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (tsc + suite green, build green)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (single-task phase, gates green)
- [x] Wave 0 covers all MISSING references (node-env coverage complete; canvas gap explicit, not silent)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter — intentionally false: 2 requirements manual-only by operator decision

**Approval:** validated-partial (2 automated-green via gates, 2 manual-only via UAT 6/6)

