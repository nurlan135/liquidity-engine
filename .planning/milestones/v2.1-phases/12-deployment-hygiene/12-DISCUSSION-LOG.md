# Phase 12: Deployment Hygiene - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-09
**Phase:** 12-deployment-hygiene
**Areas discussed:** Protection final state, Token verification, Drill scripts fate, Documentation home

---

## Protection final state

| Option | Description | Selected |
|--------|-------------|----------|
| Public prod + protected previews | Production stays public, previews require Vercel login | ✓ |
| Full protection on | Require Vercel login everywhere including production | |
| Leave fully public | No login gates anywhere, matches current disabled state | |

**User's choice:** Public prod + protected previews

**Notes:** Target resolves the 03-03 leftover ("re-enabling is the user's call"). Previews = Require Vercel login (default, not bypass secret). Proof = agent reads back dashboard setting (screenshot/paste accepted). User flips the switch with agent-provided clicks; agent verifies after.

---

## Token verification

| Option | Description | Selected |
|--------|-------------|----------|
| You confirm deletion | User deletes token in dashboard; agent trusts confirmation and documents | ✓ |
| Agent verifies via API | Agent attempts API/dashboard readback to prove token is gone | |
| Skip, assume clean | Skip token check, assume already handled | |

**User's choice:** You confirm deletion + scan history/repo + revoke-if-live

**Notes:** Follow-ups locked: scan shell history + env exports + repo/git history for token traces; if the token is still live it gets revoked during the phase (keeping it as "intentional" rejected).

---

## Drill scripts fate

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both scripts | verify-deploy.sh + verify-phase9-drill.sh stay as standard live-URL checks | ✓ |
| Keep deploy check only | Keep generic check; archive Phase-9-specific drill script | |
| Remove both | Both are drill remnants — remove and rely on fresh checks | |

**User's choice:** Keep both scripts

**Notes:** Drill flag needs grep-proof only (removed in 03-04). Branch check = re-verify `git branch -r` shows only `main`; no dashboard preview sweep.

---

## Documentation home

| Option | Description | Selected |
|--------|-------------|----------|
| PROJECT.md note | Deployment state lives with the project record | ✓ |
| New DEPLOYMENT.md | Standalone deployment runbook at repo root or docs/ | |
| SUMMARY only, no doc | Cleanup proof lives only in the phase SUMMARY | |

**User's choice:** PROJECT.md note, compact table row

**Notes:** One row: protection setting, token deletion, branch cleanup. No prose retelling of drill history.

---

## Claude's Discretion

- Exact grep patterns for the token/flag scan, verification script structure, PROJECT.md row placement/formatting.

## Deferred Ideas

None — discussion stayed within phase scope.
