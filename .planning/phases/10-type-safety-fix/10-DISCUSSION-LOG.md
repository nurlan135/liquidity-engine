# Phase 10: Type Safety Fix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 10-Type Safety Fix
**Areas discussed:** Fix approach, Extra-errors policy, Runtime-parity proof, Gate hardening

---

## Fix approach

| Option | Description | Selected |
|--------|-------------|----------|
| Plain props type | Use { children: React.ReactNode } exactly as the version-pinned Next docs show for layouts — zero reliance on .next/types, works on any clean checkout. | ✓ |
| Keep LayoutProps, add typegen | Keep LayoutProps<"/"> and make clean checkouts run `next typegen` (or dev/build) before tsc — generated globals stay, but every fresh clone needs that step. | |
| You decide | Let the planner pick the option the research supports — you'll review it in PLAN.md before execution. | |

**User's choice:** Plain props type
**Notes:** Follow-up locked the diff to annotation-only — imports, JSX, metadata, lang="az" stay byte-identical.

| Option | Description | Selected |
|--------|-------------|----------|
| Annotation only | Change just the type annotation — smallest blast radius, no runtime change possible. | ✓ |
| Tidy while there | Allow the planner to also clean related type nits in the same file if found — still no JSX or behavior change. | |
| You decide | Let researcher/planner define the minimal diff — you'll review it in PLAN.md. | |

**User's choice:** Annotation only
**Notes:** None.

---

## Extra-errors policy

| Option | Description | Selected |
|--------|-------------|----------|
| Fix all, stay tiny | Fix every tsc error found so the exit-zero criterion holds — but each fix stays annotation/type-only, no JSX or behavior change. | ✓ |
| LayoutProps only, report rest | Fix only the known LayoutProps error; stop and report any additional errors for a follow-up decision. | |
| You decide | Let the researcher assess whatever is found and recommend — you'll review in PLAN.md. | |

**User's choice:** Fix all, stay tiny
**Notes:** None.

---

## Runtime-parity proof

| Option | Description | Selected |
|--------|-------------|----------|
| Build + visual glance | `next build` succeeds plus a quick visual check of the live page — matches how v2.0 verified (human-confirmed glance). | ✓ |
| Before/after HTML diff | Capture rendered HTML before and after, diff them — strongest proof, but heavier for a type-only edit. | |
| tsc + lint only | tsc-clean plus lint is sufficient proof — a type-annotation change cannot alter runtime output. | |

**User's choice:** Build + visual glance
**Notes:** None.

---

## Gate hardening

| Option | Description | Selected |
|--------|-------------|----------|
| tsc-only, no extras | Strictly TYPE-01: fix the error, prove exit-zero, prove parity. No new scripts, no CI changes, no lint/build gates. | ✓ |
| Add typecheck script | Also add an explicit typecheck step (e.g. a package.json script) so clean-checkout verification is one command. | |
| tsc + lint + build gates | Verify all three (tsc, lint, next build) as phase gates — strongest signal, but expands a one-line fix into broader verification. | |

**User's choice:** tsc-only, no extras
**Notes:** None.

---

## Claude's Discretion

None — user decided every area directly.

## Deferred Ideas

None — discussion stayed within phase scope.
