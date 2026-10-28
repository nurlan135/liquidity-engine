# Phase 21: Execution Polish - Research

**Researched:** 2026-10-27
**Domain:** Execution calibration polish — ATR-buffered ticket geometry, firing-log review surface, pools-on/off parity harness, shadcn slider control (Next.js 16 + @base-ui/react + Zustand + Vitest)
**Confidence:** HIGH

## Summary

Phase 21 is pure polish on locked surfaces: the ticket SL/TP ladder in `src/lib/ticket.ts` gains an additive 0.25×ATR buffer (no signature change), the report §5 paper-ticket area gains a fire-rate strip reading the existing `firingLog`, a new Vitest harness asserts trigger/flaw/ticket verdicts are identical with pools forced on vs off, and a single WHY NOW fire-threshold slider is installed from the shadcn Base-UI slider primitive with localStorage persistence. No new detectors, no scorer retuning, no §1/chart rework — the D-17 pools-never-vote lock holds through all four requirements.

The codebase already contains every seam: `resolveSL`/`resolveTP` (additive buffer only), `firingLog` + `firingLogToJson` (serializable evidence), `computeATR` over D1 candles (Phase 20 `rankDistAtr` precedent), a prior parity test file to copy fixture idioms from, and `@base-ui/react@1.9.0` Slider parts on disk (slider installs with zero new npm dependencies). The single sharp edge found this session: `pool-overlay.ts` literals are uppercase (`#00FF88`) while `globals.css` tokens are lowercase (`#00ff88`) — the D-16 color-sync pin test must normalize case or it fails on day one.

**Primary recommendation:** Implement as three slices — (1) ticket buffer + fire-rate strip (both touch only additive, signature-stable code), (2) parity harness + color-sync pin (test-only files), (3) slider install + threshold store wiring (one new UI primitive, thin presentational component over a store value) — reusing `npm test -- <files>` gate commands from Phase 20 verbatim.

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Ticket buffer geometry (POL-02)
- **D-01:** SL = struktur ekstremumu (hazırkı `resolveSL`: `min(entryFvg.bottom, asia.low)` LONG / `max(entryFvg.top, asia.high)` SHORT) + 0.25×ATR buffer — konservativ, mövcud məntiqə ən yaxın.
- **D-02:** TP partials pilləli (TP1 tez çıxış, TP2/TP3 ekstremuma yaxın, amma heç biri ekstremum xəttinə maqnitlənmir) — magnet-to-the-line qadağandır.
- **D-03:** ATR `computeATR` ilə eyni D1 şam dəstindən — Phase 20 `rankDistAtr` presedenti (yeni ATR mənbəyi yoxdur).

#### Parity harness (POL-03)
- **D-04:** Vitest harness — trigger/flaw/ticket verdiktləri pools on vs off müqayisəsi, tam avtomatik, CI-də işləyir. UI toggle yoxdur (operator sübutu yox, dev sübutudur).
- **D-05:** Tam əhatə: trigger + flaw + ticket — üçü də müqayisə olunur. Səbəb: D-17 lock artıq üç verdiktin heç birinə pools təsir etməməsini kilidləyib; yalnız trigger yoxlanılsa flaw/ticket sübutsuz qalardı. POL-03 açıq şəkildə üçünü də yazır.

#### Slider controls (POL-04)
- **D-06:** Tək kontrol: WHY NOW fire threshold — minimal, təhlükəsiz. Pool tolerance (cap, ATR-merge, DOL boost) bu fazada tənzimlənmir (CALIBRATION-PROVISIONAL sabitlər toxunulmaz qalır).
- **D-07:** `slider.tsx` shadcn primitivindən quraşdırılır (hazırda `components/ui/`-də yoxdur — button, calendar, card, dialog, dropdown-menu, toast var). Quraşdırma bu fazanın işidir.
- **D-08:** Slider dəyəri localStorage-da persist olunur — operator kalibrasiyası sessiyalararası qalır. Default kodda qalır (məlum baza itmir); reset imkanı tövsiyə olunur.

#### Fire-rate review surface (POL-01)
- **D-09:** Report sətr (§5/paper-ticket yanı): 7-günlük fire sayı + band statusu (məs. `WHY NOW: 2 fires / 7d — bandda`). Operatorun gündəlik baxdığı yerdə, ayrı panelə keçid yoxdur.
- **D-10:** Mənbə mövcud `firingLog` + `firingLogToJson` (`src/lib/store.ts:290,456`) — yeni log infrastrukturu yoxdur. Ayrı panel scope creep olardı; JSON export təkbaşına "review" deyil.

#### Locked from prior context (not re-asked)
- **D-11:** Pools never vote — no trigger gate, no new flaw key, no ticket derivation change in v3.1 (roadmap lock, Phase 19 D-17 → Phase 20 D-17).
- **D-12:** Bütün scorer sabitləri CALIBRATION-PROVISIONAL qalır (EQUAL_TOL_BPS, DOL_BOOST 2.0, BEHIND_PENALTY 0.25, ATR-merge 0.25×, POOL_MAP_BOUND 20) — Phase 19 D-22; bu faza yalnız threshold/buffer/polish, retuning yoxdur.
- **D-13:** Purity guard holds — `src/lib/ict`-də yeni riyaziyyat yoxdur; parity harness test faylı, slider UI komponenti, ticket buffer `ticket.ts`-də (artıq UI tərəfdədir).
- **D-14:** Phase 20 UI mirası keçərlidir — §1 cümlə + chart overlay toxunulmazdır; bu faza onların üstündə polish qatır, onları yenidən işləmir.

#### UI polish from 20-UI-REVIEW (user-approved add-on, non-blocking)
- **D-15:** §1 sub-block ritm — `div[data-slot="s1-pain-threshold"]` wrap-nə `space-y-1` əlavə olunur (`components/dashboard/report.tsx:185,193`); bir class, kontrakt dəyişikliyi yoxdur (spacing scale artıq icazə verir).
- **D-16:** Rəng sink pin-i — `src/lib/pool-overlay.ts:25-29` literalları (`#00FF88/#FF00FF/#71717A`) `globals.css` `.dark` token dəyərləri ilə eyniliyi testlə pinlənir (paritet harness-lə eyni PR-də gedə bilər); canvas/theme desync riski bağlanır.
- **D-17:** Assistive-tech açıqlığı — §1 live `<section>`-ə `aria-live="polite"` əlavə olunur (`report.tsx:168`); `pool-lines`/`pool-ghosts` span-lər `aria-hidden` qalır (mətn daşımır); stale/thin/empty keçidləri elan olunur.

### Claude's Discretion
- Paritet əhatəsi (D-05: tam trigger+flaw+ticket) — user "layihəyə uyğun ən optimal cavabı ver" dedi, Claude POL-03 mətni + D-17 lock əsasında tam əhatəni seçdi.
- Slider persist (D-08: localStorage) — user optimal qərarı Claude-a buraxdı, kalibrasiya davamlılığı əsasında persist seçildi.
- Fire-rate səthi (D-09: report sətr) — user optimal qərarı Claude-a buraxdı, gündəlik operator axını + minimal UI dəyişikliyi əsasında report sətr seçildi.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POL-01 | WHY NOW thresholds reviewed against firing-log (1–4/week band holds) | `firingLog` + `firingLogToJson` seams verified in store.ts; §5 paper-ticket insertion point verified in report.tsx; band provenance traced to trigger.ts comments |
| POL-02 | Ticket SL beyond extreme + ATR buffer, TP partials before extreme | `resolveSL`/`resolveTP` quoted verbatim; `computeATR` precedent (`rankDistAtr`) verified; additive-only change confirmed — no signature impact |
| POL-03 | Parity harness proves trigger/flaw/ticket identical pools on/off | Prior `src/lib/ict/parity.test.ts` fixture idioms verified; key structural insight: pools never enter trigger/flaw/ticket inputs, so harness asserts input-independence, not flag-threading |
| POL-04 | slider.tsx threshold/pool-tolerance controls from installed primitive | `@base-ui/react@1.9.0` Slider parts verified on disk; shadcn install flow + API cited; zero new npm deps; risk-stepper + store-slice precedents verified |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ticket SL/TP buffer math | API / Backend (`src/lib/ticket.ts`, pure functions) | — | Brokerage math beside confluence.ts, never inside `src/lib/ict`; UI renders verbatim numbers (ticket-panel precedent) |
| Fire-rate review strip | Frontend (report.tsx §5) over Backend state | API / Backend (store selectors) | Strip reads `firingLog` via Zustand selector; counting/windowing is a pure helper beside the component, not in `ict/` |
| Parity harness | Backend (Vitest, node env) | — | Dev proof, no UI toggle per D-04; asserts pure-function verdict equality |
| Threshold slider control | Frontend (`components/ui/slider.tsx` + panel) | API / Backend (store slice) | Thin presentational primitive; value lives in Zustand (testable in node env), persisted to localStorage at the component/store boundary |
| Color-sync pin + aria/space-y polish | Frontend | — | Test-only assertion + additive attributes; zero behavior change |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @base-ui/react (Slider parts) | 1.9.0 | Headless Slider primitive backing `slider.tsx` | Project's shadcn base-nova preset peer (package.json deps); Slider parts verified on disk at `node_modules/@base-ui/react/slider/` |
| shadcn CLI | 4.23.0 | Generates `components/ui/slider.tsx` | Already a project dependency; standard `add slider` flow per official docs (ui.shadcn.com/docs/components/slider) |
| vitest | 5.0.0 | Parity harness + pin tests | Project test runner; node env; 15s timeout in vitest.config.ts |
| zustand | ^5.0.15 | Threshold value store slice | Only state primitive allowed (PROJECT.md constraint) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| date-fns-tz | ^3.2.0 | 7-day fire-rate windowing on `asOf`/`sessionDate` | Fire-rate strip helper (nyDateOf idiom precedent in trigger.ts) |
| lucide-react | ^1.41.0 | Slider reset affordance icon (if any) | Only if reset button needs an icon; RefreshCw precedent exists |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn slider.tsx | Hand-rolled `<input type="range">` | Loses keyboard/ARIA + terminal styling parity; violates Don't Hand-Roll |
| @base-ui/react Slider | @radix-ui/react-slider | WRONG peer for this preset — base-nova is Base-UI-based; do NOT install Radix |
| `firingLogToJson` re-parse | Direct `firingLog` selector read | Strip reads the live store array; the JSON export stays the calibration-download seam (unchanged) |

**Installation:**
```bash
npx shadcn@latest add slider
```
Expected output: `components/ui/slider.tsx` only. Zero new runtime dependencies (@base-ui/react already installed). If the CLI cannot reach the network in the executor environment, fallback: hand-author `slider.tsx` wrapping the on-disk `@base-ui/react/slider` parts (Root/Track/Thumb/Control/Indicator/Value) following the `button.tsx` cva + `data-slot` idiom — still no new package.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none — phase installs zero new packages) | — | — | — | — | — | — |

**Packages removed due to SLOP verdict:** none.

## Architecture Patterns

### System Architecture Diagram

```
D1 NQ candles (store nq leg)
  │  ┌─ computeATR (regime.ts) ── 0.25×ATR buffer ──┐
  │                                                  ▼
  │  entryFvg + asia ──► resolveSL/resolveTP ──► computeTicket ──► §5 strip + TicketPanel
  │         (extremes, UNCHANGED)      (+buffer, NEW)
  │
  ├─ selectTriggerPure / selectFatalFlaw / selectTicket (pools NEVER in inputs)
  │       │                              │
  │       ▼                              ▼
  │  firingLog (append-only, cap 50)   parity harness (pools on/off ──► identical verdicts)
  │       │
  │       ▼
  │  §5 fire-rate strip (7d count + band status)
  │
  └─ NEW threshold store slice ◄── slider.tsx (Base-UI) ── localStorage persist
        (default = code constant, reset restores it)
```

Entry points: poll tick (`commitTriggerLog`), operator slider drag, §5 render. Pools flow only into §1 prose + chart lines — never leftward into trigger/flaw/ticket (D-11/D-17).

### Recommended Project Structure
```
src/lib/
├── ticket.ts                 # buffer lands here (resolveSL/resolveTP, additive)
├── fire-rate.ts (NEW)        # pure 7d count + band-status helper (or co-located in strip)
├── pools-parity.test.ts (NEW)# pools-on/off verdict-equality harness (NOT in ict/)
└── ict/parity.test.ts        # existing — fixture idioms to copy, do not extend
components/
├── ui/slider.tsx (NEW)       # shadcn-generated, Base-UI-backed
└── dashboard/
    ├── report.tsx            # §5 strip + D-15/D-17 additive attrs (§1 untouched otherwise)
    └── threshold-control.tsx (NEW) # thin slider consumer (or inside ticket-panel area)
```

### Pattern 1: Additive buffer on locked resolvers
**What:** `resolveSL` keeps its exact extremum selection, then shifts one 0.25×ATR step outward by direction; `resolveTP` keeps its structure legs, each pulled one buffer-step toward entry. R/R gate, sizing, and reason strings are untouched.
**When to use:** POL-02 implementation.

### Pattern 2: Input-independence parity (not flag-threading)
**What:** The harness does NOT thread a pools flag through `evaluateTrigger`/`checkFatalFlaw`/`computeTicket` — pools never appear in their inputs, so there is nothing to toggle. Instead it runs the full selector chain twice (pools selector returning data vs forced null/empty) and asserts the three verdicts are `toEqual`-identical. Copy fixture idioms from `src/lib/ict/parity.test.ts:18-95`.
**When to use:** POL-03. This is the correct reading of D-05 "pools on vs off": vary the pools selector output, assert trigger/flaw/ticket invariance.

### Pattern 3: Thin slider over store value (risk-stepper precedent)
**What:** `slider.tsx` is presentational only; the threshold value + default + clamp live in a Zustand slice (mirroring `ticketInputs.riskPct` + `setRiskPct` clamping, store.ts:1063-1070; consumed by stepper buttons in ticket-panel.tsx:127-150). localStorage read happens once via lazy `useState` initializer + write in the setter path — never during render, never in `ict/`, SSR-safe (no hydration mismatch).
**When to use:** POL-04.

### Anti-Patterns to Avoid
- **Threshold inside `src/lib/ict`:** trigger thresholds are `CALIBRATION-PROVISIONAL` constants read by pure functions; an operator-tunable value must NOT become a function parameter that breaks the purity guard or replay determinism. Keep it in the store; decide explicitly whether the live trigger reads it (planner call — D-06 says "fire threshold" but wiring it into `evaluateTrigger` changes calibration semantics; safest is display/calibration-review only unless the plan specifies the threading).
- **Case-sensitive color pin:** `#00FF88` (overlay literal) vs `#00ff88` (CSS token) — normalize case in the assertion.
- **Caching pools in the strip:** null selector → honest empty copy (Phases 19–20 refuse-null honesty), never last-known values.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slider primitive | Custom range input + ARIA | `slider.tsx` from shadcn CLI over @base-ui/react | Keyboard behavior, focus rings, `data-slot` + cva idiom, terminal styling; custom build regresses a11y |
| ATR source | New ATR over other candles | `computeATR` from `src/lib/ict/regime.ts` over the same D1 set (`rankDistAtr` precedent) | Scorer-consistent distance; a second ATR source desyncs buffer from prose |
| 7-day windowing | Hand date math | `nyDateOf`/`sessionDate` + date-fns-tz (existing dep) | Session-boundary bugs already solved in-repo |
| Verdict-equality assertion | Snapshot files | `toEqual` on the three outputs with shared fixtures | Snapshots rot; structural equality pins the contract |

**Key insight:** Every hard sub-problem in this phase (ATR sourcing, session dates, fixture idioms, store clamping) already has a pinned in-repo precedent — the phase is wiring, and any new invention is a smell.

## Common Pitfalls

### Pitfall 1: Buffer flips a passing R/R gate or sizing
Widening SL lowers TP1-distance/stop-distance, so a previously EXECUTE ticket can drop below `TICKET_RR_MIN` or size to zero — correct behavior, but tests pinning EXECUTE fixtures break. Recompute expected values from the buffered formula; add explicit boundary tests (buffer pushes marginal R/R 3.0 → STAND ASIDE is the honest outcome, pin it).

### Pitfall 2: Case-mismatch color pin (D-16)
`POOL_MUTED_GRAY = '#71717A'` and rank literals are uppercase in `pool-overlay.ts:25-29`, while `globals.css` tokens are lowercase — a naive `toBe` fails despite semantic equality. Normalize (`toLowerCase()`) both sides in the pin test.

### Pitfall 3: localStorage SSR crash / hydration mismatch
Reading `localStorage` at module scope or during render throws on the server and mismatches hydration. Use lazy `useState(() => readLocalStorage() ?? DEFAULT)` initializer + write-through in the event handler. No existing localStorage precedent in `components/` — follow the React lazy-init pattern and validate on read.

### Pitfall 4: Parity harness accidentally imports the store
Place the harness OUTSIDE `src/lib/ict/` (e.g. `src/lib/pools-parity.test.ts`); the purity guard only scans `./*.ts` inside `ict/`. Drive `evaluateTrigger`/`checkFatalFlaw`/`computeTicket` directly with fixtures.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `npx shadcn@latest add slider` emits Base-UI-backed `slider.tsx` with zero new deps | Standard Stack | If the CLI pulls a Radix peer, executor must reject it and hand-author on @base-ui/react |
| A2 | localStorage lazy-init + write-through is SSR-safe | Patterns/Pitfalls | Standard React idiom but no in-repo precedent — executor must verify with `next build` |
| A3 | Parity harness varies pools-selector output rather than threading a flag | Patterns | If the planner threads a pools flag into pure functions, it violates D-11/D-13 — plan-checker must reject |
| A4 | Whether the slider threshold re-threads into `evaluateTrigger` vs display-only | Patterns | D-06 under-specifies wiring; planner must decide explicitly |

## Open Questions (RESOLVED)

> Resolution: calibration-display only — decided in 21-UI-SPEC.md Interaction Model; plans 21-03 (band annotation in strip only) and 21-04 (prohibition on threading into `src/lib/ict`) implement it.

1. **Does the WHY NOW threshold slider re-wire `evaluateTrigger`'s gates, or is it calibration-display only?**
   - What we know: D-06 locks a single fire-threshold control; D-12/D-13 freeze scorer math and `ict/` purity.
   - What's unclear: Whether operator threshold adjusts live trigger behavior or only annotates the review strip.
   - Recommendation: Planner decides explicitly; if live-wired, the value must be an injected parameter (purity-safe) with replay fixtures pinned, and the parity harness must cover both settings.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | build/test | ✓ | v24.11.1 | — |
| npm | install/test | ✓ | 11.6.2 | — |
| vitest | harness/pins | ✓ | 5.0.0 | — |
| @base-ui/react Slider parts | slider.tsx | ✓ (on disk) | 1.9.0 | — |
| Network for `shadcn add` | slider install | ? (unverified) | — | Hand-author slider.tsx on on-disk parts, zero new deps |
| External services/DBs | — | n/a | — | Phase is code/config-only |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.0.0 |
| Config file | `vitest.config.ts` (env node, include `src/**/*.test.ts`, 15s timeout) |
| Quick run command | `npm test -- <files>` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POL-01 | 7d fire count + band status copy | unit | `npm test -- src/lib/fire-rate.test.ts` (or co-located strip-helper test) | ❌ Wave 0 |
| POL-02 | SL buffered beyond extreme; TP inside; R/R-edge honesty | unit | `npm test -- src/lib/ticket.test.ts` (extend) | ✅ (extend) |
| POL-03 | trigger/flaw/ticket identical pools on/off | unit | `npm test -- src/lib/pools-parity.test.ts` | ❌ Wave 0 |
| POL-03 | boundary pins still green (regression) | unit | Phase-20 gate commands verbatim | ✅ |
| POL-04 | threshold clamp/persist/reset; slider renders | unit (store) + manual (DOM) | store-slice test in node env; visual UAT for drag | ❌ Wave 0 (store test) |
| D-16 | overlay literals == CSS tokens (case-normalized) | unit | extend `src/lib/pool-overlay.test.ts` | ✅ (extend) |

Prior gate commands (reuse verbatim): `npm test -- src/lib/pool-prose.test.ts src/lib/report.test.ts`; `npm test -- src/lib/pool-overlay.test.ts src/lib/chart-mapper.test.ts`; `npm test -- src/lib/pool-overlay.test.ts src/lib/store.test.ts`; full `npm test`.

### Sampling Rate
- **Per task commit:** quick run of the touched area's command above
- **Per wave merge:** `npm test` (full suite must stay green)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/pools-parity.test.ts` — POL-03 harness (fixtures copied from `src/lib/ict/parity.test.ts:18-95`)
- [ ] Fire-rate helper + test (`src/lib/fire-rate.*` or co-located) — POL-01 counting/banding
- [ ] Threshold store slice + test (clamp/persist-shape/reset) — POL-04 logic (node-env testable; DOM drag is manual UAT)
- [ ] Framework install: none — vitest present; no jsdom needed if slider stays presentational-over-store

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a (local terminal, no auth surface) |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | yes | Clamp-on-write; validate-on-read for localStorage threshold; slider min/max/step props |
| V6 Cryptography | no | n/a (no secrets; localStorage holds a display threshold only) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tampered localStorage threshold (crafted value) | Tampering | Validate-on-read: finite number within band, else fall back to code default |
| Verbatim Azerbaijani copy injection via new strings | Tampering | Fire-rate strip copy follows the toBe-pinned precedent; banned-vocabulary quarantine extends to new copy |

## Sources

### Primary (HIGH confidence — read this session)
- `src/lib/ticket.ts` (`resolveSL`, `resolveTP`, risk band, R/R gate)
- `src/lib/store.ts` (firingLog, `firingLogToJson`, appendFiringLog dedup/cap)
- `src/lib/ict/trigger.ts` (1–4/week TRIG-04 band constants, FiringLogEntry, nyDateOf)
- `src/lib/ict/regime.ts` (`computeATR`), `src/lib/pool-prose.ts` (`rankDistAtr` precedent)
- `src/lib/pool-overlay.ts` (color literals), `app/globals.css` (`.dark` tokens)
- `src/lib/ict/purity.test.ts` (guard scope/mechanics), `src/lib/ict/parity.test.ts` (fixture idioms)
- `components/dashboard/report.tsx` (§5 insertion point, §1 D-15/D-17 targets)
- `components/dashboard/ticket-panel.tsx` (risk-stepper store precedent); `components/ui/` Glob (slider MISSING confirmed)
- Toolchain: node v24.11.1, npm 11.6.2, vitest 5.0.0; `@base-ui/react@1.9.0` Slider parts on disk

### Secondary (MEDIUM confidence — official docs via direct fetch)
- [ui.shadcn.com/docs/components/slider](https://ui.shadcn.com/docs/components/slider) — install + usage, Base-UI basis
- [radix-ui.com/primitives/docs/components/slider](https://www.radix-ui.com/primitives/docs/components/slider) — value-array API shape only (wrong peer for install)

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — versions verified via registry + on-disk; install flow officially cited
- Architecture: HIGH — every seam read verbatim with locked-decision traceability
- Pitfalls: HIGH — derived from verified code; single no-precedent area flagged

**Research date:** 2026-10-27
**Valid until:** 2026-11-26 (stable domain; shadcn CLI behavior is the only fast-moving piece)

---

## RESEARCH COMPLETE

**Phase:** 21 - Execution Polish
**Confidence:** HIGH
