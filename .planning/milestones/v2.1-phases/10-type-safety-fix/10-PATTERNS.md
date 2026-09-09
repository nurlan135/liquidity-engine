# Phase 10: type-safety-fix - Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 1
**Analogs found:** 1 / 1

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/layout.tsx` | route (root layout) | request-response (server component shell) | `app/page.tsx` (local plain-props convention) + version-pinned Next docs `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` lines 57-62 | role-match (local) + exact (framework authority) |

## Pattern Assignments

### `app/layout.tsx` (route, request-response)

**Analog (local, git-tracked):** `app/page.tsx`

**Plain props pattern** (lines 4-5):
```tsx
export default function Home() {
  return (
```

Local convention: route-segment components take plain or no props — no generated-global helpers (`LayoutProps`/`PageProps`), no extra imports for the props type. The fix applies the same convention to the root layout: drop `LayoutProps<"/">`, use an inline object type.

**Imports pattern** (lines 1-2, unchanged by this phase):
```tsx
import { TerminalShell } from '@/components/dashboard/terminal-shell';
import { Toaster } from '@/components/ui/toast';
```

Relevant carry-over: `app/layout.tsx` keeps its existing import block byte-identical (`next`, `next/font/google`, `./globals.css`). D-02 locks the diff to the annotation on line 20 only.

**Framework authority (version-pinned, per AGENTS.md — overrides training data):** `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` lines 57-62:
```tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
```

Target state for `app/layout.tsx` line 20 (preserving the existing `RootLayout` name and JSX):
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
```

Notes from the same doc (lines 335-361): `LayoutProps<'/dashboard'>` is a global helper that requires generated types (only exists after `next dev`/`build`/`typegen`) — it is the correct pattern only when generated types are guaranteed present. On a clean checkout (no `.next/types/`, which is gitignored), the global is unresolvable and `tsc --noEmit` fails. The plain inline type has zero reliance on generated globals.

**Error handling / verification pattern:**
No try/catch or runtime error handling applies — annotation-only diff. Verification per CONTEXT.md D-04:
1. Simulate clean checkout (`rm -rf .next` or fresh clone), run `tsc --noEmit` — must exit zero.
2. `next build` must succeed plus a visual glance at the live page (parity proof; tsc-clean plus lint alone is insufficient).
3. Never trust the local warm tree (`.next/types/` already exists on this machine, masking the error).

---

## Shared Patterns

### Annotation-only discipline
**Source:** CONTEXT.md D-02
**Apply to:** `app/layout.tsx` and any extra-error fixes under D-03
Only props type annotations change. Imports, JSX, metadata, `lang="az"` stay byte-identical. No new scripts, no CI changes (D-05).

### Clean-checkout verification
**Source:** CONTEXT.md Existing Code Insights (Scout finding)
**Apply to:** All verification steps
`tsc --noEmit` exits 0 on warm trees because `.next/types/` (generated, gitignored) exists. Every verification MUST delete `.next/` or use a fresh clone first.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | None. Single-file phase; local + framework patterns cover it. |

## Metadata

**Analog search scope:** `app/` (only `layout.tsx` + `page.tsx` exist as route files); repo-wide grep for `children: React.ReactNode` (hits only in `.planning/` docs, confirming no in-source analog — the docs example is the authority).
**Files scanned:** 2 (`app/layout.tsx`, `app/page.tsx`)
**Pattern extraction date:** 2026-09-08
