# Phase 21: Execution Polish - Context

**Gathered:** 2026-10-27
**Status:** Ready for planning

## Phase Boundary

Execution stays calibrated and uncorrupted with pools live — thresholds reviewed against the firing log, ticket SL/TP buffered away from the extreme, parity proven (pools context-only), and operator-facing slider controls for threshold tuning. No new detectors, no scorer retuning, no report prose changes — polish only, pools stay read-only projection context that never votes (D-17 lock carried through Phases 19–20).

## Implementation Decisions

### Ticket buffer geometry (POL-02)
- **D-01:** SL = struktur ekstremumu (hazırkı `resolveSL`: `min(entryFvg.bottom, asia.low)` LONG / `max(entryFvg.top, asia.high)` SHORT) + 0.25×ATR buffer — konservativ, mövcud məntiqə ən yaxın.
- **D-02:** TP partials pilləli (TP1 tez çıxış, TP2/TP3 ekstremuma yaxın, amma heç biri ekstremum xəttinə maqnitlənmir) — magnet-to-the-line qadağandır.
- **D-03:** ATR `computeATR` ilə eyni D1 şam dəstindən — Phase 20 `rankDistAtr` presedenti (yeni ATR mənbəyi yoxdur).

### Parity harness (POL-03)
- **D-04:** Vitest harness — trigger/flaw/ticket verdiktləri pools on vs off müqayisəsi, tam avtomatik, CI-də işləyir. UI toggle yoxdur (operator sübutu yox, dev sübutudur).
- **D-05:** Tam əhatə: trigger + flaw + ticket — üçü də müqayisə olunur. Səbəb: D-17 lock artıq üç verdiktin heç birinə pools təsir etməməsini kilidləyib; yalnız trigger yoxlanılsa flaw/ticket sübutsuz qalardı. POL-03 açıq şəkildə üçünü də yazır.

### Slider controls (POL-04)
- **D-06:** Tək kontrol: WHY NOW fire threshold — minimal, təhlükəsiz. Pool tolerance (cap, ATR-merge, DOL boost) bu fazada tənzimlənmir (CALIBRATION-PROVISIONAL sabitlər toxunulmaz qalır).
- **D-07:** `slider.tsx` shadcn примиitivindən quraşdırılır (hazırda `components/ui/`-də yoxdur — button, calendar, card, dialog, dropdown-menu, toast var). Quraşdırma bu fazanın işidir.
- **D-08:** Slider dəyəri localStorage-da persist olunur — operator kalibrasiyası sessiyalararası qalır. Default kodda qalır (məlum baza itmir); reset imkanı tövsiyə olunur.

### Fire-rate review surface (POL-01)
- **D-09:** Report sətr (§5/paper-ticket yanı): 7-günlük fire sayı + band statusu (məs. `WHY NOW: 2 fires / 7d — bandda`). Operatorun gündəlik baxdığı yerdə, ayrı panelə keçid yoxdur.
- **D-10:** Mənbə mövcud `firingLog` + `firingLogToJson` (`src/lib/store.ts:290,456`) — yeni log infrastrukturu yoxdur. Ayrı panel scope creep olardı; JSON export təkbaşına "review" deyil.

### Locked from prior context (not re-asked)
- **D-11:** Pools never vote — no trigger gate, no new flaw key, no ticket derivation change in v3.1 (roadmap lock, Phase 19 D-17 → Phase 20 D-17).
- **D-12:** Bütün scorer sabitləri CALIBRATION-PROVISIONAL qalır (EQUAL_TOL_BPS, DOL_BOOST 2.0, BEHIND_PENALTY 0.25, ATR-merge 0.25×, POOL_MAP_BOUND 20) — Phase 19 D-22; bu faza yalnız threshold/buffer/polish, retuning yoxdur.
- **D-13:** Purity guard holds — `src/lib/ict`-də yeni riyaziyyat yoxdur; parity harness test faylı, slider UI komponenti, ticket buffer `ticket.ts`-də (artıq UI tərəfdədir).
- **D-14:** Phase 20 UI mirası keçərlidir — §1 cümlə + chart overlay toxunulmazdır; bu faza onların üstündə polish qatır, onları yenidən işləmir.

### UI polish from 20-UI-REVIEW (user-approved add-on, non-blocking)
- **D-15:** §1 sub-block ritm — `div[data-slot="s1-pain-threshold"]` wrap-no `space-y-1` əlavə olunur (`components/dashboard/report.tsx:185,193`); bir class, kontrakt dəyişikliyi yoxdur (spacing scale artıq icazə verir).
- **D-16:** Rəng sink pin-i — `src/lib/pool-overlay.ts:25-29` literalları (`#00FF88/#FF00FF/#71717A`) `globals.css` `.dark` token dəyərləri ilə eyniliyi testlə pinlənir (paritet harness-lə eyni PR-də gedə bilər); canvas/theme desync riski bağlanır.
- **D-17:** Assistive-tech açıqlığı — §1 live `<section>`-ə `aria-live="polite"` əlavə olunur (`report.tsx:168`); `pool-lines`/`pool-ghosts` span-lər `aria-hidden` qalır (mətn daşımır); stale/thin/empty keçidləri elan olunur.

### Claude's Discretion
- Paritet əhatəsi (D-05: tam trigger+flaw+ticket) — user "layihəyə uyğun ən optimal cavabı ver" dedi, Claude POL-03 mətni + D-17 lock əsasında tam əhatəni seçdi.
- Slider persist (D-08: localStorage) — user optimal qərarı Claude-a buraxdı, kalibrasiya davamlılığı əsasında persist seçildi.
- Fire-rate səthi (D-09: report sətr) — user optimal qərarı Claude-a buraxdı, gündəlik operator axını + minimal UI dəyişikliyi əsasında report sətr seçildi.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract
- `.planning/ROADMAP.md` Phase 21 — goal, dependency (Phase 20), requirements POL-01–04, 4 success criteria, UI hint yes
- `.planning/REQUIREMENTS.md` Execution Polish — POL-01–04 full text

### Domain authority
- `reference/institutional_rules.md` Modul 1.2 — Pain Threshold methodology (retail majority → stop zones → süpürmə/tələ engineering)

### Prior phases (direct dependencies)
- `.planning/phases/19-pools-math/19-CONTEXT.md` — all pool math decisions D-01–D-24 (equality bonus, ranking, merge/cap, lifecycle, scorer, selector contract, CALIBRATION-PROVISIONAL)
- `.planning/phases/20-1-live-chart-overlay/20-CONTEXT.md` — all wiring decisions D-01–D-22 (§1 shape, chart style, degrade discipline, D-17 lock)
- `.planning/phases/19-pools-math/19-VERIFICATION.md` — verified wiring surface: `src/lib/ict/pools.ts` (evaluatePools), `src/lib/store.ts` selectPools
- `.planning/phases/20-1-live-chart-overlay/20-UI-SPEC.md` — approved UI contract (locked copy literals, color tokens, typography — polish must not violate)

### Codebase (reuse verbatim)
- `src/lib/ticket.ts` — `resolveSL` (lines 256-261) + SL/TP ladder (lines 336+) — buffer geometry lands here
- `src/lib/store.ts` — `firingLog` (line 290), `firingLogToJson` (line 456), `selectTicket` — fire-rate evidence source
- `components/ui/` — button, calendar, card, dialog, dropdown-menu, toast (slider MISSING — install from shadcn)
- `src/lib/ict/pools.ts` — scorer constants (read-only reference, DO NOT retune)
- `src/lib/pool-overlay.ts` — 0.25×ATR-adjacent idiom reference (`rankDistAtr` precedent in `pool-prose.ts`)

## Existing Code Insights

### Reusable Assets
- `firingLog` + `firingLogToJson` (`src/lib/store.ts:290,506,456`) — fire-rate evidence already logged and serializable; report strip reads this directly
- `resolveSL` (`src/lib/ticket.ts:256-261`) — entryFvg+Asia extremum logic; buffer is additive on top, no rewrite
- `computeATR` (`src/lib/ict/regime.ts`) — shared ATR source via Phase 20 `rankDistAtr` precedent
- shadcn setup (`components.json`) — slider installs via standard shadcn add flow

### Established Patterns
- Refuse-null honesty: null selector → empty copy / cleared lines, never cached (Phases 19–20)
- Uniform 0.5 dimming discipline under stale/thin (Phase 20 D-13)
- Verbatim Azerbaijani detector reasons; sweeper detail in prose, never on canvas
- Purity guard: no `Date.now`, no store imports in `src/lib/ict` (`purity.test.ts` self-scans)

### Integration Points
- `ticket.ts` SL/TP ladder: buffer additive change, signature stable
- `report.tsx` §5/paper-ticket area: fire-rate strip added alongside, no branch restructure
- New `components/ui/slider.tsx`: installed primitive, threshold control consumes it
- New parity test file (co-located, e.g. `src/lib/parity.test.ts`): pools-on vs pools-off verdict comparison
- `report.tsx:168,185,193` §1 live section: `aria-live="polite"` + `space-y-1` rhythm token (D-15, D-17 — additive attributes only, no branch restructure)
- Color sync pin test (co-located, e.g. `src/lib/pool-overlay.test.ts` extension): literal-vs-token equality assertion (D-16 — test-only, no production change)

## Specific Ideas

- Fire-rate strip copy sketch: `WHY NOW: {n} fires / 7d — bandda` (band = 1–4/week); out-of-band state gets distinct honest copy per Phase 20 D-05 precedent
- SL buffer sketch: `sl = extremum ± 0.25 × atr` (sign by direction); TP ladder keeps existing structure legs, pulled inside by the same buffer idiom
- Parity sketch: same fixture → run trigger/flaw/ticket selectors with pools forced on vs forced off → assert identical verdicts

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 21-Execution Polish*
*Context gathered: 2026-10-27*
