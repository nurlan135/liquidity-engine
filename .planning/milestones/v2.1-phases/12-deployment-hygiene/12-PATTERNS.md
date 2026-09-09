# Phase 12: Deployment Hygiene - Pattern Map

**Mapped:** 2026-09-09
**Files analyzed:** 1 (one docs edit; zero source changes)
**Analogs found:** 1 / 1

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.planning/PROJECT.md` (append one row to `## Key Decisions` table) | docs/config | transform | `.planning/PROJECT.md` existing rows (lines 78-97) | exact |

No new files. No modifications to `src/`, `app/`, `components/`, `scripts/`, or any config. `scripts/verify-deploy.sh` and `scripts/verify-phase9-drill.sh` are KEPT as-is per D-08 (reused, not edited).

## Pattern Assignments

### `.planning/PROJECT.md` (docs, transform)

**Analog:** `.planning/PROJECT.md` — own-table convention (self-analog, git-tracked, verified via `git ls-files`)

**Row format pattern** (lines 78-97 — pipe table under `## Key Decisions`):
```markdown
| [v2.0] ICT-11 closure: selectRange4H + §2 4H line | aggregate1Hto4H had zero callers; §2 title already promised D1/4H | ✓ 283/283, wired end-to-end |
```

Convention extracted: `| [scope] Short label: what changed | Why / rationale | Outcome with evidence marker |`. Keep the new row to one line, no prose retelling (D-12).

**Exact row to append** (from 12-RESEARCH.md §Code Examples, D-11/D-12):
```markdown
| [12] Deploy hygiene: public prod + Vercel-login previews (Standard Protection); drill token deleted <YYYY-MM-DD>; drill-preview branch gone | Intentional post-drill state, dashboard-verified | ✓ Done — DEPL-01/02/03 |
```
Fill `<YYYY-MM-DD>` with the user-confirmation date at execution time. Placement: end of the `## Key Decisions` table (after line 97 row), before `## Current Milestone`.

**Edit mechanics:** single-row table append only. No new section, no new DEPLOYMENT.md, no SUMMARY-only write (locked D-11).

---

## Shared Patterns

### Prove-removal-by-grep (established 03-04, reused for DEPL-01/DEPL-03)
**Source:** `scripts/verify-deploy.sh` lines 150-158 (static `grep -q` contract assertions against `app/api/yahoo/route.ts`) + 12-RESEARCH.md §Code Examples
**Apply to:** all clean-proof tasks in this phase
```bash
# Tier (a) STRICT gate — must print nothing (exit 1 = CLEAN):
grep -rniE 'DRILL_FORCE_STALE|drill-preview|VERCEL_TOKEN|vercel[_-]?token|vercel_api' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  --exclude-dir=.planning --exclude-dir=.playwright-mcp \
  src app components scripts package.json package-lock.json .npmrc \
  .gitignore next.config.* tsconfig.* eslint* 2>/dev/null;
echo "strict-gate-exit=$? (1 = CLEAN)"
```
```bash
# Git-history token trace (expect empty for token strings; DRILL_FORCE_STALE hits are EXPECTED removal commits, not dirt):
git log --all --oneline -S 'VERCEL_TOKEN' | head -20
git log --all --oneline -S 'vercel_token' -i | head -20
git log --all --oneline -S 'DRILL_FORCE_STALE' | head -20
```
**Anti-pattern (from RESEARCH Pitfall 2):** `.planning/` hits are expected history, not dirt — scope the strict gate to code/config, exclude `.planning/`.

### Branch-state verification (DEPL-03)
**Source:** 12-RESEARCH.md §Code Examples (no prior script analog; ad-hoc git commands)
**Apply to:** DEPL-03 branch-proof task
```bash
git fetch --prune origin
git branch -r            # expect: origin/HEAD + origin/main only
git ls-remote --heads origin   # authoritative: expect only refs/heads/main
git show-ref | grep -i drill || echo "NO-DRILL-REFS"
```
Gate on `ls-remote`, not `branch -r` alone (stale remote-tracking refs — RESEARCH Pitfall 1).

### Live-URL verify-script reuse (DEPL-02 public-prod proof)
**Source:** `scripts/verify-deploy.sh` (lines 1-16 usage/contract) and `scripts/verify-phase9-drill.sh` (lines 1-12 usage/contract) — both git-tracked, unchanged
**Apply to:** final liveness task
```bash
bash scripts/verify-deploy.sh https://liquidity-engine-nine.vercel.app
bash scripts/verify-phase9-drill.sh https://liquidity-engine-nine.vercel.app
```
Script conventions to preserve: `set -u`, `pass()`/`fail()` helpers, exit 1 on first failure / 2 on bad usage, curl + node only. Do NOT modify the scripts (D-08).

### Shell-script idiom reference
**Source:** `scripts/verify-deploy.sh` lines 5-19 (`set -u`, `BASE` strip-trailing-slash, `pass`/`fail` helpers); `scripts/verify-phase9-drill.sh` lines 22-30 (ROOT resolution from script location)
Any ad-hoc verification snippet in this phase copies these idioms. No new script files are created.

### Dashboard readback as evidence (D-03/D-05)
**Source:** no codebase analog (manual process, defined in 12-RESEARCH.md Pattern 2)
Agent pastes exact click-path instructions; user returns screenshot/pasted value; agent transcribes into PROJECT.md. Trusted word alone is insufficient (D-03); token deletion uses trusted confirmation (D-05) with date recorded.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none — dashboard token/protection work) | — | — | Vercel dashboard is user-operated, outside the repo; proof is readback + curl probes per RESEARCH.md, not a code pattern |
| (none — new verification script) | — | — | Explicitly rejected by D-08 / "Don't Hand-Roll": reuse kept scripts, don't build new ones |

## Metadata

**Analog search scope:** `scripts/`, `.planning/PROJECT.md`, `.gitignore` (phase touches nothing else; RESEARCH.md already verified no `.env*`/`.vercel/`/`vercel.json` exist)
**Files scanned:** 4 (`scripts/verify-deploy.sh`, `scripts/verify-phase9-drill.sh`, `.planning/PROJECT.md`, `.gitignore`)
**Git-tracked gate:** all named analogs verified via `git ls-files` (non-empty = tracked); no mirror paths emitted
**AGENTS.md note:** Next.js-docs instruction does NOT apply — zero Next.js code/config changes in this phase; revives only if planner adds one (per RESEARCH.md)
**Pattern extraction date:** 2026-09-09
