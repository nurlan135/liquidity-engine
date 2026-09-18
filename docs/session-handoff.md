# Session Handoff — liquidity-engine

Branch: `gsd/phase-21-execution-polish` (bütün iş burdadır, main-ə merge olunmayıb)

## Current State

- Phase 21 (Execution Polish): BAĞLIDIR — 14/14 verified, UAT 2 passed + 1 blocked-acknowledged (test 2, EXECUTE bileti önşərti).
- Phase 19 (Pools Math): BAĞLIDIR — re-verified 6/6 passed (commit `e09976a`).
- Phase 20 (§1 Live + Chart Overlay): plan işi bitib (5/5 SUMMARY), amma **VERIFICATION heç vaxt yazılmayıb** (`missing`). Növbəti addım budur.
- Full suite: 513/513 yaşıl, `tsc` təmiz, `parity.test.ts` toxunulmayıb.
- POL-01–04 `Complete` (REQUIREMENTS.md). POOL-01–06 `Complete`. S1/CHRT hələ `Pending` — Phase 20 bağlananda yenilənəcək.

## Recent Changes (bu sessiya)

- `3bc4448` fix(21-05): pristine gate yalnız pin konstantlara baxır (CR-01).
- `b631f75` test(21-05): Apply-then-drift reqressiya.
- `fd9b0c6` fix(21): Yenilə reset-i applied bayrağını da təmizləyir (UAT feedback-i).
- `b50d703` + `d371c77` docs(19): re-verifikasiya 6/6 + digest təzələməsi.
  (Digest dərsi: REQUIREMENTS.md dəyişəndə köhnə VERIFICATION-ların fingerprint-i köhnəlir — `computeCoveredDigest` ilə yenidən hesabla.)
- `e09976a` docs(phase-19): Phase 19 bağlanışı.

## Open Issues

- UAT test 2 (Phase 21): live EXECUTE bileti görünəndə buffer note + chart xətt displasmanı fürsətcəsinə yoxlanmalı.
- Phase 20 VERIFICATION yoxdur — başlanmalı.
- Untracked: `.planning/phases/21-execution-polish/21-{CONTEXT,PATTERNS,VALIDATION}.md` (verifier artefaktları, zərərsiz).

## Next Steps

1. `/clear` sonrası: bu faylı oxu, `git log --oneline -5` ilə təsdiqlə.
2. Phase 20 verifikasiyası üçün `gsd-verifier` subagentini işə sal:
   - Phase dir: `.planning/phases/20-section-1-live-chart-overlay` (dəqiq ad üçün `ls .planning/phases/`).
   - Məqsəd (ROADMAP-dən): Users see the live Pain Threshold map in report §1 and as chart overlays.
   - Req-lər: S1-01, S1-02, S1-03, CHRT-01, CHRT-02, CHRT-03.
   - 5 PLAN + 5 SUMMARY-i oxutdur, must_have-ləri kodla yoxlatdır, `20-VERIFICATION.md`-ni yazdır, `vitest` + `tsc` işlətdir.
3. Status `passed`/`human_needed` olarsa → UAT (vizual bəndlər üçün `/gsd-verify-work 20`).
4. Sonra `phase.complete "20"` + ROADMAP/STATE/REQUIREMENTS commit-i (Phase 19 nümunəsi: `e09976a`).
5. S1/CHRT statusları `Pending` → nəticəyə görə `Complete`-ə çevir.

## Useful Commands

- `git log --oneline -5` — son vəziyyət
- `git status --short` — çirkli fayllar
- `node "$env:USERPROFILE/.config/opencode/gsd-core/bin/gsd-tools.cjs" query verification status ".planning/phases/<dir>"` — faza statusu
- `npx vitest run` — tam suit (~30s)
- `npx tsc --noEmit` — tip yoxlaması

## Accepted Decisions

- Sandbox `Tətbiq et` strategiyanı dəyişmir — yalnız HOLD hökmünün audit qeydidir (istifadəçi təsdiqli, dəyişdirilməyəcək).
- Test 2 blocked-acknowledged ilə faza bağlamaq olar — presedent yaradıldı (21-VERIFICATION.md `Acknowledged Gaps`).
