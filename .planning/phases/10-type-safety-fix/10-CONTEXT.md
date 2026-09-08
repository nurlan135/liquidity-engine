# Phase 10: Type Safety Fix - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

## Phase Boundary

`tsc --noEmit` exits zero on a clean checkout by fixing the pre-existing `LayoutProps` error in `app/layout.tsx` (introduced in 3a3a1cb, deliberately deferred in Phase 03.2) — with zero runtime behavior change. TYPE-01 is the only requirement in scope.

## Implementation Decisions

### Fix approach
- **D-01:** Replace `LayoutProps<"/">` with plain `{ children: React.ReactNode }` in `app/layout.tsx`, exactly as the version-pinned Next docs show for layouts — no reliance on `.next/types` generated globals, works on any clean checkout.
- **D-02:** Annotation-only diff — change just the props type annotation. Imports, JSX, metadata, `lang="az"` all stay byte-identical. No JSX or behavior change is in scope for this file.

### Extra-errors policy
- **D-03:** If a clean-checkout `tsc` run surfaces errors beyond the known `LayoutProps` one, fix every error found so the exit-zero criterion holds — but each additional fix stays annotation/type-only, no JSX or behavior change.

### Runtime-parity proof
- **D-04:** Prove identical rendering via `next build` success plus a quick visual glance at the live page (same pattern as the v2.0 human-confirmed visual re-verify). No before/after HTML diff; tsc-clean plus lint alone is not sufficient.

### Gate hardening
- **D-05:** Strictly tsc-only per TYPE-01 — fix the error, prove exit-zero, prove parity. No new package.json scripts, no CI changes, no lint/build gates added in this phase.

### Claude's Discretion
None — user decided every area directly.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked scope
- `.planning/REQUIREMENTS.md` TYPE-01 — the single locked requirement (`tsc` zero errors via LayoutProps fix, no runtime change)
- `.planning/ROADMAP.md` Phase 10 section — goal, success criteria (`tsc --noEmit` exits zero on clean checkout; layout renders identically)

### Prior decision that created this phase
- `.planning/PROJECT.md` Key Decisions table, row "[03.2] Pre-existing tsc LayoutProps error left untouched" — records the deliberate deferral from commit 3a3a1cb; this phase is the designated later phase

### Framework authority (per AGENTS.md — version-pinned docs override training data)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` §Route Props Helpers + layout examples — root layout takes `{ children: React.ReactNode }`; `LayoutProps`/`PageProps` are generated globals that only exist after `next dev`/`build`/`typegen`

### Error site and type plumbing
- `app/layout.tsx:20` — the error site (`LayoutProps<"/">` with no import; resolves only via generated globals)
- `tsconfig.json` — includes `.next/types/**/*.ts`; `strict: true`, `noEmit: true`
- `next-env.d.ts` — imports `./.next/types/routes.d.ts` + `root-params.d.ts` (generated, gitignored)

## Existing Code Insights

### Reusable Assets
- None needed — this phase removes a type dependency; no components, hooks, or utilities are consumed.

### Established Patterns
- Scout finding: `tsc --noEmit` exits 0 on the current machine because `.next/types/` (generated, gitignored) already exists — the failure reproduces only on a clean checkout without generated types. Verification MUST simulate a clean checkout (delete `.next/` or clone fresh), never trust the local warm tree.
- Convention note (`.planning/codebase/CONVENTIONS.md`): `LayoutProps<"/">` is recorded as the root-layout prop convention — this phase intentionally replaces that convention with the plain props form; do not "fix" it by re-adding a `LayoutProps` import.
- Commit 3a3a1cb changed only metadata strings + `lang="en"`→`"az"` in `app/layout.tsx`; the `LayoutProps` usage predates it (scaffold origin). The annotation swap preserves all of that commit's runtime output.

### Integration Points
- `app/layout.tsx` is the root layout wrapping every route — blast radius is total if JSX changes, which is why D-02 locks the diff to the annotation line.

## Specific Ideas

No specific requirements — open to standard approaches within the annotation-only constraint.

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 10-Type Safety Fix*
*Context gathered: 2026-09-08*
