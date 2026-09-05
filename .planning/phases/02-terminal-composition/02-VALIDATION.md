---
phase: "02"
slug: "terminal-composition"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-05"
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.0 |
| **Config file** | vitest.config.ts (`npm run test` = `vitest run`) |
| **Quick run command** | `npm run test -- <area>` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- <area>` + `npx tsc --noEmit`
- **After every plan wave:** Run `npm run test` (full suite green)
- **Before `/gsd-verify-work`:** Full suite must be green + manual visual checklist (UI-SPEC states)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-TBD-01 | TBD | TBD | DATA-03 | Tampering | Stale envelope shows STALE strip, age derives from lastUpdatedISO | unit (selector) | `npm run test -- status-strip` | ❌ W0 | ⬜ pending |
| 02-TBD-02 | TBD | TBD | UI-02 | Tampering | Candle→series mapping; EQ/DOL price values equal range output | unit (mapper) | `npm run test -- chart-mapper` | ❌ W0 | ⬜ pending |
| 02-TBD-03 | TBD | TBD | UI-03 | — | Section 2 binds bias/DOL/regime | unit (selector) | `npm run test -- report` | ❌ W0 | ⬜ pending |
| 02-TBD-04 | TBD | TBD | UI-04 | — | Blocked side derives from bias (BULLISH→SHORT blocked) | unit | `npm run test -- blocked-side` | ❌ W0 | ⬜ pending |
| 02-TBD-05 | TBD | TBD | MOCK-01 | Tampering | True AVG excludes Insta/FiboGroup; crowded flag at ≥60% | unit | `npm run test -- sentiment` | ❌ W0 | ⬜ pending |
| 02-TBD-06 | TBD | TBD | MOCK-02 | — | Countdown formats via Baku util; pre-news flag inside window | unit (injected clock) | `npm run test -- calendar` | ❌ W0 | ⬜ pending |
| 02-TBD-07 | TBD | TBD | MOCK-03 | Tampering | Fixture shape guards pass; interpretation prose present per scenario | unit (fixture shape) | `npm run test -- fixtures` | ❌ W0 | ⬜ pending |
| 02-TBD-08 | TBD | TBD | STATE-01 | Denial of Service | Single store; refresh writes envelope; 60s cadence + singleflight | unit (store, mocked fetch) | `npm run test -- store` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs/Plans/Waves are TBD until the planner assigns them — requirement→command mapping is binding.*

---

## Wave 0 Requirements

- [ ] `src/lib/sentiment.test.ts` — trueAvg + crowded flag (MOCK-01)
- [ ] `src/lib/countdown.test.ts` — formatter + pre-news window, injected clock (MOCK-02)
- [ ] `src/lib/store.test.ts` — refresh writes envelope, singleflight guard, stale propagation (STATE-01, DATA-03)
- [ ] `components/charts/chart-mapper.test.ts` — candle→series mapping, price-line values (UI-02 logic half; rendering stays manual)
- [ ] Fixture JSON files + shape tests (MOCK-01..03)
- [ ] Framework install: none — vitest present

*Existing infrastructure covers Phase 1 ICT core + yahoo + time suites; Wave 0 adds Phase 2 selector/mapper/store coverage.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 3-panel grid + UNAVAILABLE markers per design.html | UI-01 | Visual layout | Render terminal; confirm 280px/1fr/320px grid, #0A0A0F/#14141E/#00D9FF, modules 1/3/4 dimmed with UNAVAILABLE marker |
| Premium/discount shading + EQ line + DOL marker | UI-02 | Canvas rendering | Render chart; confirm shaded zones, EQ price-line, DOL marker match range output values |
| Report sections 1,3–6 UNAVAILABLE; blocked side struck-through | UI-03, UI-04 | Visual copy | Render report; confirm section 2 live, others UNAVAILABLE, blocked side struck-through with terse label |
| Weekend-closed honest state | DATA-03 | Time-dependent visual | With stale/closed envelope: last closed candles rendered, CLOSED strip state, nothing synthesized |
| Azerbaijani copy + status strip wording | UI-01..UI-04 | Language/copy review | Read rendered terminal; report sections/labels in Azerbaijani, identifiers English |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
