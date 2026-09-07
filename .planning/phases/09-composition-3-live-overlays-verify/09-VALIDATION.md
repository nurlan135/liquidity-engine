---
phase: "09"
slug: "composition-3-live-overlays-verify"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-07"
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5 (`npm test` → `vitest run`) |
| **Config file** | `vitest.config.ts` (include `src/**/*.test.ts`, node env, 15s timeout) |
| **Quick run command** | `npx vitest run src/lib/confluence.test.ts src/lib/store.test.ts src/lib/chart-mapper.test.ts` |
| **Full suite command** | `npm test` (must stay green — no regressions) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run narrow phase-file vitest run (quick command above)
- **After every plan wave:** Run `npm test` (full suite green)
- **Before `/gsd-verify-work`:** Full suite green + live-URL drill green (§3 slots present)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-XX | 01 | 1 | ICT-15 | — | Tier derivation: confirmed Judas + aligned SMT → highest tier; suppressed SMT caps at base; candidate scores zero; prose-only tiers (no numeric precision) | unit | `npx vitest run src/lib/confluence.test.ts` | ❌ W0 | ⬜ pending |
| 09-XX | 01 | 1 | UI-05 | — | Per-block reasons verbatim; all-degraded stacks three; NY dimmed line inside AMD block | unit (selector/prose) | `npx vitest run src/lib/store.test.ts src/lib/report.test.ts` | ❌ W0 | ⬜ pending |
| 09-XX | 02 | 2 | UI-06 | — | Asia H/L lines created/removed; Judas/SMT markers pinned; stale dims never hides; ES off-chart | unit (mapper) | `npx vitest run src/lib/chart-mapper.test.ts` | ❌ W0 | ⬜ pending |
| 09-XX | 03 | 3 | DEPLOY-02 | T-09-01/T-09-02 | Intraday legs (`15m`/`1h`) pass allowlist-before-URL-build; errors never cached; stale never masquerades as live | manual-only (live URL drill) | drill script (see below) | ❌ W0 | ⬜ pending |
| 09-XX | all | all | purity | — | No `Date.now` in any new phase module/test/script; injected time only (Phase 6–8 precedent) | grep gate | `grep -rn "Date.now" src/lib/confluence.ts src/lib/store.ts` (no hits) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/confluence.test.ts` — covers ICT-15 (highest-tier, suppression cap, candidate-zero-impact)
- [ ] Selector fixtures — per-block degraded, all-degraded, suppressed-SMT confluence cap, stale-leg refusal (UI-05 / D-01 / D-15)
- [ ] Asia-input mapper test — finite-guard + throw-never-blocks-chart (UI-06)
- [ ] Drill steps — ES cold-start + intraday payload timing + §3 `data-slot` render check on live URL (DEPLOY-02)

*Existing infrastructure covers the framework: vitest 5 configured, lightweight-charts 5.2.1 + zustand 5.0.15 + date-fns-tz 3.2.0 installed, zero new deps.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ES cold-start drill on live URL | DEPLOY-02 | Live Vercel cold-start timing cannot be simulated locally | `curl -s -o /dev/null -w '%{time_total}' "$LIVE/api/yahoo?symbol=ES=F&interval=15m"` — record cold vs warm total |
| Intraday payload under maxDuration | DEPLOY-02 | Live route timing with real upstream | Request intraday legs on live URL; confirm 200 within `maxDuration = 15` |
| §3 render check (sub-blocks + conviction line) | DEPLOY-02 / UI-05 | Canvas/DOM render needs a live browser glance | Open live URL; confirm §3 three sub-blocks + conviction line + `data-slot` hooks present |
| Hollow-marker emulation glance | UI-06 | Canvas legibility at D1 zoom is visual | Open chart; confirm candidate hollow vs confirmed solid distinction is legible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
