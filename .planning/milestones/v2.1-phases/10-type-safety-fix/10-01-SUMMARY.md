---
phase: 10-type-safety-fix
plan: 01
subsystem: infra
tags: [typescript, nextjs, type-safety, root-layout]

# Dependency graph
requires:
  - phase: 03.2
    provides: deliberate deferral record of the pre-existing LayoutProps tsc error (commit 3a3a1cb residual)
provides:
  - Clean-checkout-safe root layout props annotation (tsc --noEmit exits zero with .next/ removed)
  - Production build success plus live-page parity proof for the annotation-only fix
affects: [future phases relying on tsc-clean gates, v3.0 execution scoping]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 30
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns: [plain inline props object type for root layout, clean-checkout verification via .next removal]

key-files:
  created: []
  modified: [app/layout.tsx]

key-decisions:
  - "Swapped LayoutProps global for the plain inline children ReactNode form per version-pinned Next docs — no generated-types dependency"
  - "Proved parity with production build plus live HTTP page markers instead of a dev-server visual glance"

patterns-established:
  - "Clean-checkout verification: every tsc proof runs with .next/ removed — never trust the warm tree"
  - "Annotation-only discipline: props type line changes; imports, JSX, metadata, lang stay byte-identical"

requirements-completed: [TYPE-01]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Root layout with clean-checkout-safe props annotation (tsc --noEmit exits zero with .next/ removed)"
    requirement: "TYPE-01"
    verification:
      - kind: other
        ref: "rm -rf .next && node node_modules/typescript/bin/tsc --noEmit (exit 0, no error TS)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Identical rendering proven via production build plus live root-page shell markers"
    requirement: "TYPE-01"
    verification:
      - kind: other
        ref: "node node_modules/next/dist/bin/next build (exit 0, .next regenerated) + HTTP 200 with lang az, title, body shell markers"
        status: pass
    human_judgment: true
    rationale: "Byte-level shell markers (lang, title, body class) confirm the layout shell, but full visual parity of fonts and chrome needs a human glance — automation cannot judge rendered pixels."

# Metrics
duration: 12min
completed: 2026-09-08
status: complete
---

# Phase 10 Plan 01: Type Safety Fix Summary

**Root layout props swapped to the plain children ReactNode form — clean-checkout tsc exits zero with zero runtime change.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-08T08:31:05Z
- **Completed:** 2026-09-08T08:42:53Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Reproduced the clean-checkout failure (`app/layout.tsx(20,50): error TS2304: Cannot find name 'LayoutProps'`) with `.next/` absent, then fixed it with a one-line annotation swap
- Proved zero remaining type errors: `tsc --noEmit` exits 0 with `.next/` removed (run twice — post-fix and final re-proof)
- Proved parity: `next build` exits 0 with `.next/` regenerated, and the live root page returns HTTP 200 with identical shell markers (`lang="az"`, Geist font classes, title, body classes)
- Kept the diff to exactly one line — imports, metadata, JSX, and `lang="az"` byte-identical; no package.json, CI, or lint changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Reproduce clean-checkout tsc failure and swap props annotation** - `c51c427` (fix)
2. **Task 2: Sweep remaining type errors and prove parity via build plus visual glance** - covered by `c51c427` (no source change needed — sweep found zero extra errors, build + probe are verification-only artifacts)

**Plan metadata:** pending orchestrator commit (docs: complete plan)

## Files Created/Modified
- `app/layout.tsx` - Root layout props annotation swapped from `LayoutProps<"/">` to `{ children: React.ReactNode }` (line 20 only)

## Decisions Made
- Swapped to the plain inline props form per the version-pinned Next docs (`node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` lines 57-62) rather than importing a helper — zero reliance on gitignored `.next/types` generated globals, works on any clean checkout.
- Proved rendering parity with `next build` plus live HTTP page-marker comparison (status, `lang`, font classes, title, body shell) instead of a `next dev` visual glance: the annotation change cannot alter runtime output, and the served production page confirms the shell is intact. No HTML diff was required per D-04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree had no node_modules — used main-checkout toolchain via local copy**
- **Found during:** Task 1 (Reproduce clean-checkout tsc failure and swap props annotation)
- **Issue:** The isolated worktree shipped without `node_modules/` or `.next/`, so `npx tsc` / `npm run build` from the plan could not run directly; installing fresh would have risked lockfile drift.
- **Fix:** Populated the worktree's `node_modules/` from the main checkout's installed tree (same lockfile, same commit base) and invoked the local binaries directly (`node node_modules/typescript/bin/tsc`, `node node_modules/next/dist/bin/next`). Both dirs are gitignored, so the tree stays clean.
- **Files modified:** none (gitignored runtime dirs only)
- **Verification:** `tsc --version` reports 5.9.3; reproduction error and exit-zero proofs ran against this toolchain
- **Committed in:** n/a (no tracked files touched)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Toolchain-only workaround for worktree isolation. No source-scope change, no behavior change, no manifest edits.

## Issues Encountered
- Plan's `<verify>` commands assume repo-root `npx`/`npm run` scripts; worktree equivalents used instead (`node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/next/dist/bin/next build`). Same binaries, same flags, same exit-code semantics.
- The plan's `<human-check>` visual glance could not be performed by this executor (no browser/operator in this environment). Substituted with production-server HTTP proof: HTTP 200 plus byte-level shell markers identical to the pre-fix layout source (`lang="az"`, Geist variable classes, `h-full antialiased`, title `Liquidity Engine — NQ Terminal`, body `min-h-full flex flex-col`). Marked as `human_judgment: true` in coverage so verify-work still routes a human glance.
- Task 2 required no commit: the D-03 sweep surfaced zero extra errors and the build/probe steps produce only gitignored output, so the working tree was already clean after Task 1's commit. Single production commit `c51c427` carries the plan's full source change.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `tsc --noEmit` exits zero on clean-checkout simulation; TYPE-01 satisfied pending orchestrator verification.
- `.next/` regenerated via production build — tree left warm for later phases.
- Residual for orchestrator/human: one visual glance at the live root page (fonts, chrome) to close the D-04 parity loop fully.

---
*Phase: 10-type-safety-fix*
*Completed: 2026-09-08*

## Self-Check: PASSED
- `app/layout.tsx` exists with `children: React.ReactNode` on line 20, zero `LayoutProps` occurrences — FOUND
- Commit `c51c427` exists (`git log` confirms) — FOUND
- `git diff --stat HEAD` clean; `git status --porcelain --untracked-files=all` empty — no stray files
- Acceptance re-run: `tsc --noEmit` with `.next/` removed exits 0; `next build` exits 0 with `.next/` restored; `git diff` for the plan shows only the one-line annotation change
