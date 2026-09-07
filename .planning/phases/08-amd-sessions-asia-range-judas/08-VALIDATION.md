---
phase: "08"
slug: "amd-sessions-asia-range-judas"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-07"
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5 (`npm test` → `vitest run`) |
| **Config file** | `vitest.config.ts` (include `src/**/*.test.ts`, node env, 15s timeout) |
| **Quick run command** | `npx vitest run src/lib/ict/asia.test.ts src/lib/ict/judas.test.ts src/lib/ict/amd.test.ts` |
| **Full suite command** | `npm test` (must stay 133+ green — no regressions) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run narrow phase-file vitest run
- **After every plan wave:** Run `npm test` (full suite green)
- **Before `/gsd-verify-work`:** Full suite green + DST triple-test green + budget run ≤25%
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | ICT-12 | — | N/A (pure math, no trust boundary) | unit | `npx vitest run src/lib/ict/asia.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | ICT-12 | — | DST triple-test green | unit | `npx vitest run src/lib/ict/asia.test.ts -t DST` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | ICT-13 | — | Three-gate conjunction; candidate-vs-confirmed | unit | `npx vitest run src/lib/ict/judas.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 2 | ICT-13 | — | ≤25% confirmed over 60 days | dev-script | `npx tsx scripts/judas-budget.ts` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 3 | ICT-14 | — | Time+event transitions; SMT read-only; NY Gözlənilir | unit | `npx vitest run src/lib/ict/amd.test.ts` | ❌ W0 | ⬜ pending |
| 08-XX | all | all | purity | — | No Date.now/new Date() in new modules | grep gate | `grep -rn "Date.now\|new Date(" src/lib/ict/asia.ts src/lib/ict/judas.ts src/lib/ict/amd.ts` (expect no hits) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ict/asia.ts` + `asia.test.ts` — covers ICT-12 (clean range, DST triple, post-midnight exclusion, gap-skip, forming exclusion, empty-window null)
- [ ] `src/lib/ict/judas.ts` + `judas.test.ts` — covers ICT-13 (conjunction, candidate-vs-confirmed, preRun, 4-candle bound, forming exclusion)
- [ ] `src/lib/ict/amd.ts` + `amd.test.ts` — covers ICT-14 (transitions, SMT tag, NY branch, `{ phase, reason, inputs }` shape)
- [ ] Budget dev-script — covers the 60-day ≤25% verification (dev-script per performance guidance, never a UI selector)
- [ ] Conforming edits: REQUIREMENTS.md ICT-12 + ROADMAP.md Phase 8 criterion 1 (19:00 → 20:00) at planning time
- [ ] No shared-fixture gap: `nyHourEpoch`/`fromZonedTime` helper pattern copy-pasteable from `aggregate.test.ts:32-34`

*Existing infrastructure covers the framework: vitest 5 configured, date-fns-tz 3.2.0 installed, zero new deps.*

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
