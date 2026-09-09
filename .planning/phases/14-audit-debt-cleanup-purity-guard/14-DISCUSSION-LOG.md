# Phase 14: Audit Debt Cleanup + Purity Guard — Discussion Log

**Date:** 2026-09-09
**Mode:** default (interactive, single-question turns)

## Area 1: zoneBands dead-arg cleanup

**Q1:** `nq-chart.tsx` L292-299 passes a full `DealingRange` (filler `window: 0, asOf: ''` + unread `thinHistory`) but `zone-bands.ts` reads only high/low/eq. How to clean?
- Options: Narrow signature to `{high,low,eq}` (Recommended) / Keep signature, document ignore / You decide
- **Selected:** Narrow signature to `{high,low,eq}`

**Q2:** After narrowing, fate of `DealingRange.thinHistory` (`range.ts` + `types.ts` + tracer/levels/dol tests still use it)?
- Options: Keep, only zoneBands narrows (Recommended) / Remove everywhere / You decide
- **Selected:** Keep, only zoneBands narrows
- Notes: `thinTier` = display-tier truth, `thinHistory` = range-math flag; predicates must not drift.

## Area 2: Orphaned thin-tier API

**Q1:** v2.1 audit W2/T2 + W3: `thinTier(closedCount)` internal-only, `ThinBannerEntry` only in `thinBannerOrder` signature. What to do?
- Options: Unexport both (Recommended) / Document, keep exported / You decide
- **Selected:** Unexport both
- Notes: Public surface becomes `ThinTier`, `thinTierCopy`, `resolveThinTier`, `thinBannerOrder`; external-import-break check required.

**Q2:** After unexport, `thin-tier.test.ts` still calls `thinTier(19/20/…)` directly. How to adapt?
- Options: Migrate test to `resolveThinTier` (Recommended) / Keep direct calls via internal import / You decide
- **Selected:** Migrate test to `resolveThinTier`
- Notes: Boundary pins (19/20/33/34) preserved via the public entry.

## Area 3: Purity guard mechanism

**Q1:** DEBT-03 guard form?
- Options: Vitest grep-test (Recommended) / ESLint rule / You decide
- **Selected:** Vitest grep-test (co-located, e.g. `src/lib/ict/purity.test.ts`)

**Q2:** Which patterns to ban? (Verified today: zero `Date.now`/`new Date` in `src/lib/ict` — clean base.)
- Options: Minimal — `Date.now` + store imports (Recommended) / Broad — clock + I/O / You decide
- **Selected:** Minimal — avoids false positives on legitimate injected-time usage future trigger code needs.

## Area 4: Asia note scope

**Q1:** PROJECT.md mentions "Asia qeydi sənədləşməsi" but REQUIREMENTS.md (DEBT-01..03) does not. In scope?
- Options: Yes, small doc-only note (Recommended) / No, defer / You decide
- **Selected:** Yes, small doc-only note
- Notes: Explain Asia fallback (20:00–23:45 + last-completed-session, edbc70a) + why overlay frequency rises by design. Comment or short note; no behavior change.

## Close-out

**Q:** Which gray areas remain unclear? (Discussed: zoneBands-signature, orphan-API, purity-guard, Asia-note.)
- Options: Ready for context (Recommended) / More areas
- **Selected:** Ready for context

## Deferred ideas

None — discussion stayed within phase scope.

---

*Discussion log: 2026-09-09. Human reference only — not consumed by downstream agents.*
