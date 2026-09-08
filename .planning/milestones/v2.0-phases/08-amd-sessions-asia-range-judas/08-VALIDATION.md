---
phase: "08"
slug: "amd-sessions-asia-range-judas"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
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
| 08-01-01 | 01 | 1 | ICT-12 | T-08-01/T-08-02 | Wick-to-wick extremes; gap-skip; forming exclusion; empty-window null | unit | `npx vitest run src/lib/ict/asia.test.ts` | ✅ | ✅ green (18 tests) |
| 08-01-02 | 01 | 1 | ICT-12 | T-08-02 | DST triple-test green (March, November, maintenance-break) | unit | `npx vitest run src/lib/ict/asia.test.ts -t DST` | ✅ | ✅ green (3 passed, 15 skipped) |
| 08-02-01 | 02 | 2 | ICT-13 | T-08-03/T-08-04 | Three-gate conjunction; candidate-vs-confirmed; preRun strict edges | unit | `npx vitest run src/lib/ict/judas.test.ts` | ✅ | ✅ green (12 tests) |
| 08-02-02 | 02 | 2 | ICT-13 | — | ≤25% confirmed over 60 days | dev-script | `node scripts/judas-budget.ts` | ✅ | ✅ green (BUDGET confirmed=10/60, 16.7%, exit 0, deterministic rerun) |
| 08-03-01 | 03 | 3 | ICT-14 | T-08-05 | Time+event transitions; SMT read-only; NY Gözlənilir; end-to-end fusion | unit | `npx vitest run src/lib/ict/amd.test.ts` | ✅ | ✅ green (11 tests) |
| 08-XX | all | all | purity | — | No `Date.now` in any phase module/test/script; `new Date(` only in deterministic calendar-reality validation (`asia.ts:78` WR-02) and fixed-base budget synthesis (`judas-budget.ts:53`) — no clock reads | grep gate | `grep -rn "Date.now" src/lib/ict/asia.ts src/lib/ict/judas.ts src/lib/ict/amd.ts` (no hits) | ✅ | ✅ green |

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-09-07

## Validation Audit 2026-09-07

Retroactive Nyquist audit of executed Phase 8 (validate-phase, State A — VALIDATION.md existed in draft seed form).

| Metric | Count |
|--------|-------|
| Requirements audited | 4 (ICT-12, ICT-13, ICT-14, purity) |
| COVERED | 4 |
| PARTIAL | 0 |
| MISSING | 0 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Evidence (all re-run live during audit):
- `npx vitest run src/lib/ict/asia.test.ts src/lib/ict/judas.test.ts src/lib/ict/amd.test.ts` → 3 files, 41 tests, all green
- `npx vitest run src/lib/ict/asia.test.ts -t DST` → 3 passed, 15 skipped
- `node scripts/judas-budget.ts` → `BUDGET confirmed=10/60 (16.7%)`, exit 0, identical on rerun
- `npm test` (full suite) → 28 files, 254 tests, all green (no regressions)
- Purity: no `Date.now` in any phase module/test; `new Date(` appears only in deterministic calendar-reality validation (`asia.ts:78`, WR-02) and fixed-base budget synthesis (`judas-budget.ts:53`) — zero clock reads
- Conforming D-01 edits confirmed: REQUIREMENTS.md ICT-12 line and ROADMAP.md criterion 1 line state 20:00–00:00 NY

No auditor spawn needed — zero gaps, nothing to fill. Manual-Only stays empty: all phase behaviors have automated verification.
