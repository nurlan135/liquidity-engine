---
phase: "21"
slug: "execution-polish"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-17"
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^5.0.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- src/lib/ict/pools-parity.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- <touched-suite>`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | POL-03 | — | Parity arms run same buffered build, pools toggle only | unit | `npm test -- src/lib/ict/pools-parity.test.ts` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | POL-02 | T-21-01 | SL beyond extreme, TPs before extreme, R/R ≥ 1:3 on TP1 | unit | `npm test -- src/lib/ticket.test.ts` | ✅ | ⬜ pending |
| 21-02-01 | 02 | 2 | POL-01 | — | Band verdict degrades honestly on empty log, never throws | unit | `npm test -- src/lib/ict/trigger.test.ts` | ✅ | ⬜ pending |
| 21-02-02 | 02 | 2 | POL-01 | — | pools-on vs pools-off table from same firing log | unit | `npm test -- src/lib/ict/replay.test.ts` | ✅ | ⬜ pending |
| 21-03-01 | 03 | 2 | POL-04 | T-21-02 | Slider values clamped, never trusted into math pre-Apply | unit | `npm test -- src/lib/store.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ict/pools-parity.test.ts` — stubs for POL-03
- [ ] `components/ui/slider.tsx` — 7th primitive for POL-04
- [ ] Slider sandbox slice in `src/lib/store.ts` + slice pins — POL-04 preview/Apply/session-scope
- [ ] Buffer boundary matrix in ticket suite — POL-02
- [ ] Band-verdict helper + pins beside trigger/replay suites — POL-01

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slider renders + preview/Apply glance | POL-04 | Visual rendering check | Open terminal, move sliders, confirm BAXIŞ preview + Apply re-pins |
| Chart SL/TP lines move off extreme | POL-02 | Visual line placement | Fire ticket, confirm lines beyond/before extreme on chart |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
