---
phase: "12"
slug: "deployment-hygiene"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-09"
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> This phase ships no source changes — validation is command-evidence (grep/git/curl gates + dashboard readback), not unit tests.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5 (+ node 24) — re-run only if any source file changes (unexpected) |
| **Config file** | `vitest.config.ts` (include: `src/**/*.test.ts`, `app/**/*.test.ts`) |
| **Quick run command** | Task's own gate command (grep / git / curl) with output pasted into the task summary |
| **Full suite command** | `npm test` (283/283 green at v2.0 ship) |
| **Estimated runtime** | ~seconds per gate command |

---

## Sampling Rate

- **After every task commit:** Re-run the task's own gate command (grep / git / curl) and paste output into the task summary
- **After every plan wave:** Full strict-grep + `git ls-remote --heads origin` + `verify-deploy.sh` green
- **Before `/gsd-verify-work`:** All six Phase Requirements → Test Map rows evidenced
- **Max feedback latency:** seconds (gate commands are immediate)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | DEPL-01 | T-12-01 | No token/flag strings in code/config | shell-grep gate | strict worktree grep (prints nothing, exit 1) | ✅ N/A — ad-hoc command, record output | ⬜ pending |
| 12-01-02 | 01 | 1 | DEPL-01 | T-12-01 | No token values in git history | shell-grep gate | `git log --all -S 'VERCEL_TOKEN'` (expect empty) | ✅ N/A — ad-hoc, record output | ⬜ pending |
| 12-01-03 | 01 | 1 | DEPL-03 | T-12-04 | Only `origin/main` remote ref | shell (git) | `git ls-remote --heads origin` (only `refs/heads/main`) | ✅ N/A — ad-hoc, record output | ⬜ pending |
| 12-01-04 | 01 | 1 | DEPL-03 | T-12-04 | No flag/branch refs in code/config | shell-grep gate | strict worktree grep (same as DEPL-01) | ✅ N/A — ad-hoc, record output | ⬜ pending |
| 12-01-05 | 01 | 1 | DEPL-02 | T-12-02 | Prod publicly reachable unauthenticated | shell (curl) | `scripts/verify-deploy.sh $PROD_URL` PAGE + ENVELOPE green | ✅ script exists, kept per D-08 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- None — no new test files, fixtures, or framework installs needed. If any source file is touched (unexpected), add `npm test` green + `npm run lint` clean as gate items.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Protection = Standard + Vercel Auth (dashboard readback) | DEPL-02 | No API/CLI surface available to agent | User pastes screenshot/value from Dashboard → project → Settings → Deployment Protection; agent writes it into PROJECT.md row |
| Drill-token deletion confirmation | DEPL-01 | Dashboard-created token; agent trusts user confirmation (D-05) | User confirms deletion on Tokens page; agent documents it in PROJECT.md row |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Manual-Only rows above
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (none — no Wave 0 needed)
- [ ] No watch-mode flags
- [ ] Feedback latency < seconds
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
