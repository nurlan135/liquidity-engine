---
quick: 260917-ejc-detectrollover-yalniz-son-pencereye-baxs
plan: 260917-ejc-PLAN
type: execute
tasks: 2
autonomous: true
files_modified:
  - src/lib/ict/rollover.ts
  - src/lib/ict/rollover.test.ts
---

<objective>
`detectRollover` yalniz trailing pəncərəyə baxsin — bütün tarix skani qaldirilsin,
köhnə gap bayraği yapishib qalmasin.

Purpose: Köhnə keçid gap-i (məs: NQ 1462pt) seriyada qaldiqca `rolloverSuspect=true`
yapishib qalir və real bazar hərəkətini (məs: 17 Sep 2026 NQ +429 / ES +105,
triple witching ərəfəsi volatillik) kontrakt keçidi kimi işarələyir. Yanliş pozitiv
`rollover-week` suppression-u (SMT + fatal-flaw) trigərləyir.
Output: Trailing-window tripwire + stale-gap / fresh-gap testləri, bütün aidiyyəti
suitlər yaşil.
</objective>

<context>
- `src/lib/ict/rollover.ts:33-55` — mövcud implementasiya (bütün tarix skani, sətir 45-49)
- `src/lib/ict/rollover.test.ts` — mövcud testlər (hamisi gap-i seriyanin SONUNDA qoyur)
- `src/lib/ict/smt.ts:14` — `CORR_WINDOW = 20` presedenti; `evaluateSMT` rollover-u
  `detectRollover` üzərindən çağirir (sətir 220-224), dəyişiklik avtomatik yayilir
- `src/lib/store.ts:818` — `selectRollover` birbaşa `detectRollover`-u çağirir,
  araliq qat yoxdur, imza dəyişikliyi lazım deyil
- `src/lib/__fixtures__/smt-rollweek.json` — 25 şam, gap idx 20-də (2026-01-25);
  son-20 pəncərəsində qalir, fixture qirilmir
- `isNearRolloverWeek` + `PROXIMITY_DAYS=10` — TOXUNULMASIN (tarix bazlidir, düzgündür)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Trailing-window tripwire</name>
  <files>src/lib/ict/rollover.ts</files>
  <action>Export edilmiş `ROLLOVER_WINDOW = 20` konstanti əlavə et (CORR_WINDOW
  presedenti, `src/lib/ict/smt.ts:14`; dəyəri test ilə pinlə). `detectRollover`-da
  bütün-tarix skanini (hazirki sətir 45-49 dövrü) trailing pəncərə ilə əvəz et:
  `closedOnly` nəticəsindən son `ROLLOVER_WINDOW + 1` şami götür (+1 ona görədir ki,
  pəncərənin ilk şami ilə ondan əvvəlki şam arasindaki gap də sayilsin — kəsilmiş
  slice-in kənar effekti olmasin), close-to-close `> 3xATR` yoxlamasini YALNIZ bu
  slice daxilində apar. Tripwire (`ROLLOVER_ATR_MULT * atr`), strict-greater-than
  sərhədi, ATR validation throw-u, `contractHint` və `proximityWarning` məntiqi
  dəyişməz qalir. Funksiya imzasi dəyişmir — `smt.ts` və `store.ts` çağirişçilari
  toxunulmur.</action>
  <verify>
    <automated>npx vitest run src/lib/ict/rollover.test.ts</automated>
  </verify>
  <done>Mövcud 6 test yaşil qalir (hamisinin gap-i seriya sonundadir, pəncərə
  daxilindədir); `ROLLOVER_WINDOW` export olunur və dəyəri 20-dir.</done>
</task>

<task type="auto">
  <name>Task 2: Stale-gap vs fresh-gap testləri + reqressiya</name>
  <files>src/lib/ict/rollover.test.ts</files>
  <action>Mövcud `trend`/`candle` helper-lərindən istifadə edərək 2 yeni test əlavə et:
  (1) STALE — 20+ təmiz şamdan ƏVVƏL böyük gap (məs: 30 şamliq seriya, gap idx ~5-də,
  son 20 şam təmiz), ATR=10: `rolloverSuspect === false` gözlənilir — bu, bug-un
  reproduksiyasidir (köhnə kodda true qaytarirdi). (2) FRESH — eyni uzunluqda seriya,
  gap son pəncərə daxilində (məs: sonuncu cüt): `rolloverSuspect === true` gözlənilir.
  Hər iki testdə series uzunluğu `ROLLOVER_WINDOW`-dan açiq şəkildə böyük olsun ki,
  pəncərə məntiqi həqiqətən sınağa çəkilsin, həm də `false`-mənfi riski olmasin.
  Sonra tam aidiyyəti suitləri işə sal: rollover, smt (rollover-week suppression),
  store (selectRollover), invalidation, replay.</action>
  <verify>
    <automated>npx vitest run src/lib/ict/rollover.test.ts src/lib/ict/smt.test.ts src/lib/store.test.ts src/lib/ict/invalidation.test.ts src/lib/ict/replay.test.ts</automated>
  </verify>
  <done>Yeni stale test false, fresh test true qaytarir; sadalanan 5 suite-in hamisi
  yaşildir; `isNearRolloverWeek` testi toxunulmamış və yaşildir.</done>
</task>

</tasks>

<verification>
`npx vitest run src/lib/ict/rollover.test.ts src/lib/ict/smt.test.ts src/lib/store.test.ts src/lib/ict/invalidation.test.ts src/lib/ict/replay.test.ts` — hamisi yaşil.
`npx tsc --noEmit` (əgər repo-da aktivdirsə) təmiz.
</verification>

<success_criteria>
- Köhnə gap + təmiz son pəncərə → `rolloverSuspect === false` (bug aradan qalxib)
- Təzə gap son pəncərədə → `rolloverSuspect === true` (tripwire hələ tutur)
- `isNearRolloverWeek` davranışı dəyişməyib
- SMT `rollover-week` suppression-u təzə gap-lərdə işləməyə davam edir
</success_criteria>

<output>
Dəyişikliklər işçi ağacda qalir (quick-fix, commit plan icraçisina aiddir).
</output>
