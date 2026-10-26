# Phase 22: Pool Lifecycle + Decay (POOL2-04) - Context

**Gathered:** 2026-10-26
**Status:** Ready for planning

## Phase Boundary

Pool age/decay + re-accumulation işləyir — eligibility və decay semantikası kilidlənir, hər hansı istehlakçı (Phase 23 TP2 resolver) rank-ı oxumamışdan əvvəl. Phase 22 yalnız math + selector qatındadır: heç bir report proza dəyişimi, heç bir chart xətt dəyişimi, heç bir trigger/flaw/ticket derivation dəyişimi yoxdur — lifecycle proyeksiya kontekstidir, səs vermir (roadmap kilidi).

## Implementation Decisions

### Decay saatı
- **D-01:** Yaş D1 barları ilə sayılır — `ageBars` = `originDate` və `asOf` arasında bağlı D1 şamlarının sayı. Həftəsonu/tətil günləri pool-u qocaltmır; 60-bar trailing lookback və session-based replay ilə uyğundur.
- **D-02:** Yarım-həyat 10 bar (CALIBRATION-PROVISIONAL) — `decay = 1 / (1 + ageBars / 10)`. 10 barlıq pool skorunun yarısını alır; köhnə arxeologiya sönür, təzə pain dominant qalır. Firing-log band review (1–4/week) qarşısında kalibrasiya olunur, bu phase-də tune edilmir.
- **D-03:** Skor floor-u 0.25 — qədim ACTIVE pool skorunun dörddə birini saxlayır; ACTIVE ikən rank-dan tam silinmir. İki bar arasında relevant-dan sıfıra sərt keçid olmur.
- **D-04:** Decay multiplier `scoreAndRank` içində inline — mövcud `weight × dolBoost × behindPenalty / (1 + distAtr)` formulu yanında bir faktor daha. Ən kiçik diff, oxunacaq tək formula.

### Re-akkumulyasiya kimliyi
- **D-05:** Təzə pool həmişə müstəqil — köhnə CONSUMED/SWEPT zonadan kənarda yaranan yeni swing-lər tam müstəqil ACTIVE pool seed edir (öz `originDate`, öz `touches`). Lineage tracking yoxdur; `detectPools`-dan təbii çıxır.
- **D-06:** Overlap-də fresh seed qazanır — yeni klaster mövcud SWEPT zona ilə toxunursa, öz ACTIVE pool-unu seed edir (non-overlap dedupe qərar verir). SWEPT yaddaş solğun ghost kimi qalır, təzə pain öz qiyməti ilə rank-a girir. D-04 stored-weight immutability pozulmur.
- **D-07:** CONSUMED zonalar geri qayıtmır — consumed tarixçə re-akkumulyasiya yoxlamasında nəzərə alınmır; consumed qiymət yaxınlığında təzə pool sadəcə yeni pooldur, ayrıca flag yoxdur.
- **D-08:** §1 proza səssizdir — re-akkumulyasiya üçün proza dəyişimi yoxdur; yeni pool qazananda Phase 20 formatında rank-1 kimi görünür.

### Kölgə saxlama (SWEPT ghosts)
- **D-09:** Eyni originDate + trailing-20 disiplini — kölgələr üçün ayrı expiry yoxdur; yalnız map cap sıxışdıranda çıxırlar. Phase 20 davranışı dəyişmir.
- **D-10:** Kölgələr originDate sırasında qalır — decay kölgə sırasına təsir etmir; yalnız ACTIVE rank hərəkət edir. `scoreAndRank`-də rank-lanmış ACTIVE-lərdən sonra originDate düzümü (indiki davranış) qalır.
- **D-11:** Ayrı ghost cap yoxdur — kölgələr ACTIVE 20-likdən kənarda gəzir (indiki kimi); map cap + nearest-2-per-side ACTIVE sayımı canvas-ı onsuz da bağlayır.
- **D-12:** Kölgələr skorsuz qalır — `scores` yalnız ACTIVE girişləri daşıyır (indiki davranış); decay ACTIVE-rank məsələsidir, ghost dimming dəyişmir.

### Decay görünürlüyü
- **D-13:** §1 səssizcə yeni rank-1-i adlandırır — decay səbəbli rank dəyişəndə proza Phase 20 formatında yeni rank-1-i yazır, köhnəlmə qeydi düşmür; verbatim `reason` toxunulmur.
- **D-14:** Chart-da decay izi yoxdur — köhnəlmiş ACTIVE pullar vizual fərqlənmir; Phase 20 xətt + 0.5 dimming disiplini dəyişmir.
- **D-15:** Parity üçlüyü tam eyni qalır — pools-on vs pools-off `trigger/flaw/ticket` tam match tələb olunur (Phase 21 harness idiomu). Lifecycle proyeksiya kontekstidir, səs vermir.
- **D-16:** Decay konstantları kalibrasiya sandbox-na slider kimi düşür — yarım-həyat + floor Phase 21-dəki pool tolerance slider-larına qoşulur (what-if preview, explicit Apply, pinned konstantlar oxunur). Yeni UI primitivi yoxdur.

### Əvvəlki kontekstdən kilidli (yenidən soruşulmadı)
- **D-17:** Pools never vote — trigger gate, flaw key, ticket derivation dəyişimi yoxdur (Phase 19 D-17-dən roadmap kilidi, Phase 20–21-də daşınıb).
- **D-18:** Pool shape `{ side, top, bottom, touches, weight, originDate, status }`; rank-1 = DOL tərəfində nearest ACTIVE; bütün konstantlar CALIBRATION-PROVISIONAL (Phase 19 D-06–D-09, D-19–D-22).
- **D-19:** Lifecycle nüvəsi mövcuddur — wick-pierce → SWEPT, close-through → CONSUMED, first-sweep-wins, stored weight/touches immutable (`src/lib/ict/pools.ts` D-04, D-18).
- **D-20:** Purity disiplini — injected `asOf`, `Date.now()` yoxdur, store timer yoxdur; `scoreAndRank` idiomu `weight × dolBoost × behindPenalty / (1 + distAtr)` — decay eyni cərgəyə bir multiplier kimi qoşulur.
- **D-21:** Stale/thin matrix roadmap-kilidlidir — NQ-stale → null, ES-stale → ticket-degraded, rankSkipped → unbuffered.
- **D-22:** Scorer-plane prinsipi (PITFALLS Pitfall 6): decay stored inventory-ni mutate etmir, SWEPT heç vaxt rank-a qayıtmır; `originDate` ən erkən seed tarixi olaraq qalır.

### Claude's Discretion
None — istifadəçi təqdim olunan bütün sahələri müzakirə etdi.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract
- `.planning/ROADMAP.md` Phase 22 — goal, requirements (POOL2-04), 4 success criteria
- `.planning/REQUIREMENTS.md` Pool Lifecycle (POOL2-04) — full text + Phase mapping table (POOL2-04 → Phase 22 Pending)

### Domain authority
- `reference/institutional_rules.md` Modul 1.2 — Pain Threshold methodology (retail majority → stop zones → süpürmə/tələ engineering)

### Research (v3.2 P2, roadmap-öncəsi)
- `.planning/research/FEATURES.md` — POOL2-04 row: `ageBars = asOfDate − originDate` D1 barlarında; `decay = 1 / (1 + ageBars / DECAY_HALF_LIFE)` half-life ~10 provisional, score multiplier only; re-accumulation via fresh-seed; scorer-formula genişlənməsi
- `.planning/research/PITFALLS.md` Pitfall 6 — age/decay weight history-ni mutate etməməlidir, swept pool re-promote olunmur; decay scorer-plane multiplier; vaxt injected `asOf`; lifecycle purity phase FIRST (phase-ordering linchpin)
- `.planning/research/SUMMARY.md` — unanimous approach: scorer-only decay + exported provisional constants + firing-log calibration

### Prior phases (direct dependencies)
- `.planning/milestones/v3.1-phases/19-pools-math/19-CONTEXT.md` — bütün pool math qərarları D-01–D-24 (equality bonus, ranking, merge/cap, lifecycle, scorer, selector contract)
- `.planning/milestones/v3.1-phases/20-1-live-chart-overlay/20-CONTEXT.md` — §1 wiring D-01–D-22 (pools-never-vote lock, verbatim prose, ghost/z-order idioms)
- `.planning/milestones/v3.1-phases/21-execution-polish/21-CONTEXT.md` — parity harness D-09–D-12 (pools-parity suite, exact triple match), calibration sandbox D-13–D-16 (7 slider, preview-vs-applied, session Zustand)

### Codebase (reuse verbatim)
- `src/lib/ict/pools.ts` — `LiquidityPool` shape, `seedPools`, `applyLifecycle`, `mergePools`, `capPools`, `scoreAndRank` (decay insertion point D-04), `evaluatePools`, `detectPools`
- `src/lib/ict/pools.test.ts` — 30 boundary-test precedent (equality bonus, ATR-merge, lifecycle, scorer pins)
- `src/lib/ict/pools-parity.test.ts` — pools-on vs pools-off triple-match harness idiom (Phase 21 D-09–D-12); lifecycle dəyişimi bu harness-i yenidən yaşıl saxlamalıdır
- `src/lib/ict/swings.ts` — shared k=2 swing predicates (read-only, `smt.test.ts` gate)
- `src/lib/ict/regime.ts` — `computeATR` (scorer denominator; buffer/decay vahidi)
- `src/lib/ict/purity.test.ts` — house purity guard (no clocks, no store imports; yeni faylları self-scan edir)
- `components/dashboard/firing-log-panel.tsx` — calibration review səthi (decay slider-ları D-16 üçün ev)

## Existing Code Insights

### Reusable Assets
- `scoreAndRank` (`src/lib/ict/pools.ts:327-397`): ACTIVE-only eligibility + `weight × dolBoost × behindPenalty / (1 + distAtr)` — decay D-04 ilə eyni formulaya bir faktor kimi qoşulur
- `applyLifecycle` (`src/lib/ict/pools.ts:210-242`): wick-pierce → SWEPT, close-through → CONSUMED, first-sweep-wins — toxunulmur, re-akkumulyasiya `detectPools` təbii axınından çıxır
- `originIndexOrNeg1` + `asOf` string müqayisəsi: D1-bar yaşı üçün hazır date-comparison idiomu — yaş hesablaması eyni cərgədə
- `pools-parity.test.ts` harness idiomu: 20-session replay + triple exact match — lifecycle dəyişiminin exit gate-i
- Phase 21 calibration sandbox (7 slider, preview-vs-applied, session Zustand): decay half-life/floor slider-ları D-16 ilə eyni panelə düşür

### Established Patterns
- CALIBRATION-PROVISIONAL + boundary-test pins + firing-log review (trigger.ts precedenti, pools daşıyır) — decay half-life/floor eyni disiplinə qoşulur
- Scorer-plane-only dəyişim: stored `weight`/`touches` seed-dən sonra heç vaxt dəyişmir (D-04 invariant — comment-level yox, test-level pinlənməlidir)
- Injected `asOf`, no-clock discipline — iki fərqli `asOf` deterministik, time-ordered decay verir
- Refuse-null selector envelopes + sharedEpoch + never-throws — lifecycle selector qatında saxlanılır

### Integration Points
- `scoreAndRank`: decay multiplier insertion (D-04) — detector, lifecycle, ticket, trigger toxunulmur
- `selectPools` (`src/lib/store.ts`): refuse-null envelope olduğu kimidir; rankSkipped → unbuffered matrix-i saxlanılır
- Phase 23 (TP2 resolver) istehlakçısı: bu phase-in kilidlədiyi decay-li rank-ı oxuyur — ona görə lifecycle-before-consumers sıralaması roadmap kilididir
- Calibration sandbox paneli: decay slider-ları (D-16) mövcud Apply-record / Yenilə-reset yolunu izləyir

## Specific Ideas

No specific requirements — open to standard approaches. Research note: `/gsd-plan-phase --research-phase` decay half-life seeding (10-bar default + floor 0.25) və boundary-test matrix (score-ordering properties, Rank-1-flip assert yoxdur — PITFALLS xəbərdarlığı) üçün tövsiyə olunur.

## Deferred Ideas

None — discussion stayed within phase scope. (P2 queue POOL2-01/02/03/05 + W12 already deferred at milestone level; pool-gated FIRE stays rejected per REQUIREMENTS.md Out of Scope.)

---

*Phase: 22-Pool Lifecycle + Decay (POOL2-04)*
*Context gathered: 2026-10-26*
