# Feature Research

**Domain:** ICT execution layer (WHY NOW trigger engine + fatal-flaw invalidation + paper order ticket) for an NQ liquidity-engineering terminal
**Researched:** 2026-09-09
**Confidence:** HIGH (behavior anchored in the project's own domain spec `reference/institutional_rules.md` Modul 4 + report §§4–6; signal inventory verified against `src/lib/ict` sources)

## Feature Landscape

### Table Stakes (Users Expect These)

An ICT execution terminal that cannot answer "why now", cannot say where the idea dies, and cannot express the trade as a ticket is not an execution terminal — it is still an observation terminal. Missing any of these = v3.0 goal unmet.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| WHY NOW three-gate trigger (timing + purge + urgency) | Spec Modul 4.2 mandates exactly these three gates; every ICT entry model (Silver Bullet, Turtle Soup, OTE) is a timing+sweep+displacement conjunction. A single-gate "signal" is a retail trap. | MEDIUM | Pure function `evaluateWhyNow({ killzoneGate, purgeGate, urgencyGate })` → `FIRE_LONG / FIRE_SHORT / WAIT_FOR_MANIPULATION`. Each gate boolean + verbatim reason string (same deterministic-sentence pattern as `amdPhase`). All three must pass; otherwise the output is literally `WAIT FOR MANIPULATION` per spec. Thresholds (killzone windows, displacement multiple, purge definition) must be exported constants so they are calibratable during live observation. |
| Killzone timing gate (TIME>PRICE) | Rule #1 of the spec: correct price at the wrong time is a Dead Zone execution. London (02:00–05:00 NY) and NY AM/PM killzones are the only windows where market-maker urgency can exist. | LOW | Reuse the proven `nyMinutesOf` wall-clock discipline from `judas.ts`/`amd.ts` (formatInTimeZone, per-candle, DST-safe). New constants e.g. `LONDON_KZ_*`, `NY_AM_KZ_*`, `NY_PM_KZ_*`. Purity: injected epoch, no clock reads. Depends on existing session-time utilities, not on new data. |
| Liquidity-purge gate (sweep completed) | No ICT entry fires into an unswept pool — entry is always *after* the purge (Judas sweep of Asia high/low, BSL/SSL raid, prior-day high/low sweep). Firing before the sweep is chasing inducement. | LOW | Direct consumer of existing `JudasOutput` (`candidate`/`confirmed`/`sweepSide`) + Asia range extremes. Purge = confirmed sweep on the tradable side; candidate-only = gate held with reason "təsdiq gözlənilir". No new detector needed for London; NY-session sweep needs a decision (see Dependencies). |
| Urgency / displacement gate (market maker forced to move) | A sweep without displacement is just a wick — smart money has not committed. Displacement (body-beyond + FVG creation, `DISP_MULT`-style multiple of range) is the proof of commitment and the origin of the entry FVG. | MEDIUM | Extends the existing displacement concept (`DISP_MULT = 0.5 × Asia height` in `judas.ts`) to a tradable-side displacement check on 15M rows. Calibratable constant. Produces the entry FVG reference (top/bottom/polarity) that the ticket consumes. |
| Hard invalidation level with rationale (Modul 4.3) | Spec: "Which 5M/15M swing break kills this bias immediately and without discussion?" Every ticket needs a named SL level plus *why that exact level* (the structure whose break proves the algorithm, not the trader, is wrong). | LOW | `invalidateLevel({ direction, swings, entryFvg })` → `{ price, structure: 'sweep-origin' \| 'displacement-origin' \| 'fvg-midpoint' \| 'asia-extreme', rationale }`. Deterministic rule table (e.g. long invalidated by close-through of the displacement origin / swept Asia low reclaimed). Same fail-at-boundary discipline as `assertValidJudas`. |
| Paper order ticket UI (report §5 shape) | The spec fixes the ticket schema: decision EXECUTE LONG / EXECUTE SHORT / STAND ASIDE, refined entry zone, hard SL, TP1/TP2/TP3 ladder, R/R ≥ 1:3, confidence score. Users expect the terminal to render exactly this. | MEDIUM | UI panel (shadcn `card` + `dialog` for confirm) bound to Zustand; all numbers derived from pure-function outputs, never hand-typed. Ticket is *derived, not authored*: entry = OTE pocket ∩ entry-FVG confluence, SL = invalidation level, TP1 = internal liquidity/BPR, TP2 = external BSL/SSL, TP3 = HTF DOL. No broker wiring, no order routing — paper only. |
| R/R ≥ 1:3 enforcement gate | Spec mandates minimum 1:3; a ticket that cannot clear it must degrade to STAND ASIDE, not stretch targets. This is the terminal's honesty mechanism at execution time. | LOW | Pure `riskReward({ entry, sl, tp2 })` check inside ticket derivation: if min-R/R fails, decision flips to STAND ASIDE with reason "R/R şərti ödənmir". Non-negotiable, unit-pinned. |
| Fatal-flaw sentence + challenge question (report §6) | Spec §6: "If level X is not swept today, my entire analysis is wrong because [institutional reason]" + one hard retail-trap question to the trader. This is what makes invalidation falsifiable instead of decorative. | LOW | Pure `fatalFlaw({ bias, dol, unsweptPool })` → deterministic sentence from a rule table keyed on bias direction × nearest unswept liquidity (e.g. bullish bias whose BSL raid never happens while price holds premium = distribution misread). Challenge question selected from a small fixed bank keyed on the dominant trap of the current state (premium-chase, pre-news engineering, SMT divergence ignored). |
| STAND ASIDE as a first-class decision | Most of the time the correct execution decision is *no trade* (wrong killzone, unconfirmed sweep, SMT suppressed, R/R fails). If the ticket can only say EXECUTE, traders will force trades. | LOW | Every derivation path that fails a gate returns STAND ASIDE with the verbatim failing reason — never a null/empty ticket. Report §§4–6 render the reason, mirroring the existing UNAVAILABLE-honesty pattern. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Confidence score from Timing + SMT + sweep confluence | Spec §5 requires a % score grounded in exactly these three inputs. A transparent, auditable score (not a black box) fits the rule-based determinism principle and is rare in ICT indicator suites. | MEDIUM | `confidence({ killzoneHit, smtAgree, sweepConfirmed, dealingRangeSide })` → 0–100 via fixed weights (e.g. timing 40 / sweep 35 / SMT 25), pinned by tests, rendered with its component breakdown so the trader sees *why*. Depends on SMT envelope (incl. suppressed states) + AMD phase + dealing-range position. |
| TP ladder wired to live terminal levels (TP1 internal / TP2 external / TP3 HTF DOL) | Generic ICT tools make the trader hand-place targets. Here TP1/TP2/TP3 resolve automatically from `FvgGap` inventory, Asia extremes / PDH-PDL equivalents, and existing `DOLTarget` — targets move when structure moves. | MEDIUM | Resolver functions over existing outputs: TP1 = nearest unmitigated opposing FVG / BPR, TP2 = swept-side external pool (Asia extreme, session high/low), TP3 = `DOLTarget` from bias module. Falls back honestly (target omitted + reason) when the pool does not exist. |
| OTE × FVG entry-zone confluence refinement | Entry zone = hard OTE pocket (62–79%, already computed by `computeLevels`) intersected with the displacement FVG. When both agree the zone is tight; when they disagree the ticket says so instead of hiding it. | LOW | Pure set-intersection on two existing outputs (`OTEPocket` + `FvgGap`). No new math. High trust value for almost free. |
| Calibratable thresholds with live-observation tuning path | v3.0 goal explicitly says thresholds must be calibratable. Exported, documented, single-owner constants (killzone windows, `DISP_MULT`-style multiples, confidence weights, R/R floor) let 2–4 weeks of §3-vs-market notes tune the engine without rewrites. | LOW | Convention + discipline, not code volume: one `thresholds.ts` (or per-module const blocks as today), every magic number named/exported/test-pinned, calibration notes recorded in milestone docs. Differentiator because retail ICT tools hardcode magic numbers. |
| Pre-news execution lock (Modul 2.3 × Modul 4) | Spec Modul 2.3: approaching NFP/CPI/FOMC makes price action "pre-news liquidity engineering". An execution layer that auto-downgrades to STAND ASIDE (or blocks EXECUTE) near high-impact news prevents the most expensive trap. | MEDIUM | Builds on the existing `PRE_NEWS_BADGE` concept: a calendar-awareness input (fixture today, real feed later) that forces WHY NOW → WAIT with reason "Yüksək təsirli xəbər gözlənilir". Needs the calendar input contract defined even while fixtures feed it. |
| Paper-trade journal (ticket history + outcome vs invalidation) | Paper tickets that vanish after render teach nothing. A local log of fired tickets (entry/SL/TPs/confidence) resolved against later price (hit TP2? stopped? invalidated?) turns live observation into calibration data. | MEDIUM | Local-only (localStorage or in-memory + export), no backend (zero-budget constraint). Resolution logic is pure (given candles + ticket → outcome). Fuels the threshold-tuning loop. P2 — launch without it, add once triggers fire correctly. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real broker execution / order routing | "One-click trade from the signal" feels like the natural endpoint. | Capital risk, API keys, regulatory surface, and order-state reconciliation blow up scope; a wrong D1 range math bug would cost real money. Zero-budget + determinism constraints forbid it. | Paper ticket only, explicitly labeled "kağız — real broker bağlantısı yoxdur". Revisit only after months of paper-ticket calibration prove the engine. |
| Auto long/short on every trigger without killzone filter | More signals feels more valuable. | Violates TIME>PRICE (spec rule #1); off-hours triggers are Dead Zone executions with negative expectancy. | WHY NOW gates default-closed: outside killzones the engine outputs WAIT, and the UI shows *why* (session clock + next killzone countdown, cheap to render from existing time utils). |
| LLM-generated entry reasoning / narrative tickets | "AI explains the trade" sounds premium. | Breaks the determinism core principle; non-reproducible tickets cannot be backtested, calibrated, or trusted for invalidation. PROJECT.md explicitly scopes LLM out. | Deterministic sentence selection (one base sentence + suffix tags), exactly like `amdPhase` reasons — every ticket reason renderable verbatim and unit-pinned. |
| Martingale / averaging-down controls on the ticket | Losing paper trades invite "add to winner/loser" buttons. | ICT invalidation is binary — a broken structure means the idea is dead, not cheaper. Averaging contradicts the fatal-flaw contract. | Single-entry ticket; if SL hits, the ticket resolves to DONE and the engine re-arms only on a fresh WHY NOW event. Journal records the outcome for calibration. |
| Push alerts / sound alarms on trigger | Feels pro to get pinged. | No notification infra on Vercel free tier; background polling + push turns a pull-based terminal into a stateful service with battery/permission/Hz costs. | Polling UI badge on the terminal itself (staggered polling already exists per-leg); trader watches during killzones, which is also the correct ICT behavior (be present at the killzone). |
| Multi-symbol execution (ES tickets alongside NQ) | ES data already flows for SMT. | ES is the *confirmation leg*, not the traded instrument; two tickets doubles invalidation bookkeeping and invites hedging logic the methodology does not support. | Execute NQ only; ES appears on the ticket solely as the SMT-agree/suppressed tag feeding confidence. |

## Feature Dependencies

```
WHY NOW trigger (FIRE/WAIT)
    ├──requires──> AMD phase (accumulation/manipulation/distribution + reason)
    │                  ├──requires──> AsiaRange (existing)
    │                  ├──requires──> JudasOutput (existing)
    │                  └──requires──> SmtOutput read-only tag (existing)
    ├──requires──> Dealing-range position (Premium/Discount/EQ + OTE pockets)
    │                  └──requires──> computeLevels (existing) + bias (existing)
    ├──requires──> Displacement/entry-FVG on 15M rows (EXTEND existing judas/FVG)
    └──requires──> Killzone clock (new consts, existing nyMinutesOf discipline)

Invalidation level + fatal-flaw sentence
    ├──requires──> WHY NOW direction (no ticket without a fired direction)
    ├──requires──> Entry-FVG + displacement origin (from urgency gate)
    └──requires──> DOL target + nearest unswept pool (existing bias/dol outputs)

Paper order ticket (EXECUTE / STAND ASIDE)
    ├──requires──> WHY NOW verdict
    ├──requires──> Invalidation level (SL leg)
    ├──requires──> TP ladder resolvers (FVG inventory + Asia extremes + DOLTarget)
    ├──requires──> R/R ≥ 1:3 gate
    └──requires──> SMT envelope state (confidence input; suppressed handled honestly)

Confidence score ──enhances──> ticket (ticket valid without it, trusted with it)

Paper-trade journal ──enhances──> calibration loop (needs fired tickets first)

Pre-news lock ──conflicts──> EXECUTE verdict (forces STAND ASIDE; must run BEFORE ticket derivation)
```

### Dependency Notes

- **WHY NOW requires AMD phase:** The manipulation/distribution distinction *is* the post-sweep state machine (Judas confirmed ± 45-min confirm window + SMT tag). WHY NOW adds only the killzone clock + displacement-proof + direction resolution on top. Do not rebuild sweep detection.
- **WHY NOW requires dealing-range position:** Direction without HTF context is a coin flip — longs only resolve in Discount / at bearish-OTE reaction, shorts mirror. `computeLevels` OTE pockets + bias already exist; the trigger reads them.
- **Urgency gate extends (not duplicates) existing displacement:** `DISP_MULT`/`CONFIRM_WINDOW` in `judas.ts` prove the pattern; the execution displacement check reuses the multiple-of-range idiom on the tradable side's 15M rows and returns the entry-FVG handle the ticket needs.
- **Ticket requires invalidation first:** SL is an input to R/R, and R/R gates the EXECUTE decision — so `invalidateLevel` must resolve before the ticket verdict, not after. Order: WHY NOW → invalidation → targets → R/R → verdict → confidence.
- **Pre-news lock conflicts with EXECUTE:** It must short-circuit before ticket derivation (cheapest correct place), reusing the `PRE_NEWS_BADGE` input contract; calendar stays fixture-fed per zero-budget constraint.
- **5M/1M microstructure gap:** Spec §§4–6 are written for 5M/1M, but the terminal ingests only 1H/15M (intraday proxy legs). Either (a) execute the urgency/invalidation gates off 15M displacement + fractal swings (recommended: no new data leg, matches existing `SWING_K` idiom), or (b) add a 5M Yahoo leg (more rows, more polling, free-tier risk). This is the single biggest scope decision of v3.0 and must be settled in the first phase.

## MVP Definition

### Launch With (v3.0)

Minimum viable execution layer — trigger, kill-switch, ticket, all paper, all deterministic.

- [ ] WHY NOW three-gate engine (killzone + purge + displacement) → FIRE_LONG / FIRE_SHORT / WAIT_FOR_MANIPULATION with verbatim reasons — the core v3.0 promise; everything else consumes it
- [ ] Invalidation level resolver (SL + structure rationale) — without it no ticket can print an SL and R/R cannot be computed
- [ ] Paper order ticket derivation (entry zone via OTE×FVG, SL, TP1/TP2/TP3 resolvers, R/R ≥ 1:3 gate, EXECUTE/STAND ASIDE verdict) — the §5 deliverable
- [ ] Fatal-flaw sentence + challenge question (§6) — makes every ticket falsifiable; cheap rule-table + question bank
- [ ] Report §§4–6 flipped live + ticket UI panel (shadcn card/dialog, Zustand-bound, derived numbers only) — the visible terminal surface
- [ ] Calibratable threshold constants (killzones, displacement multiple, confidence weights, R/R floor) — explicit v3.0 goal, near-zero cost if done as convention from day one

### Add After Validation (v3.x)

- [ ] Confidence score with component breakdown — trigger: WHY NOW firing correctly on live observation; score weights need real fire events to calibrate against
- [ ] Paper-trade journal + outcome resolution — trigger: tickets rendering reliably; journal needs a stable ticket schema first
- [ ] Pre-news execution lock wired to a real calendar input contract — trigger: calendar source decision (fixture shape first, feed later); fixtures keep v3.0 honest in the meantime

### Future Consideration (v4+)

- [ ] 5M microstructure leg (if 15M execution proves too coarse after calibration) — why defer: free-tier polling cost + the 15M-first decision must be tested before paying for finer rows
- [ ] Pain Threshold map (§1 BSL/SSL projection) feeding TP2 precision — why defer: already scoped to v3.1, independent of the execution chain
- [ ] Any broker connectivity — why defer: requires months of calibrated paper evidence plus budget/security posture the project does not have

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| WHY NOW three-gate engine | HIGH | MEDIUM | P1 |
| Invalidation level + rationale | HIGH | LOW | P1 |
| Paper ticket derivation (entry/SL/TPs/R/R/verdict) | HIGH | MEDIUM | P1 |
| Fatal-flaw sentence + challenge question | HIGH | LOW | P1 |
| Report §§4–6 live + ticket UI panel | HIGH | MEDIUM | P1 |
| Calibratable thresholds convention | MEDIUM | LOW | P1 |
| Confidence score | MEDIUM | MEDIUM | P2 |
| Paper-trade journal | MEDIUM | MEDIUM | P2 |
| Pre-news execution lock | MEDIUM | MEDIUM | P2 |
| 5M microstructure leg | LOW (until proven needed) | MEDIUM | P3 |
| Real broker execution | LOW (paper terminal) | HIGH | P3 — anti-feature for v3.0 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Generic ICT indicator suites (TradingView scripts, LuxAlgo-style SMT/FVG packs) | Retail signal-bot channels (Telegram/Discord alerts) | Our Approach |
|---------|----------------------------------------------------------------------------------|------------------------------------------------------|--------------|
| WHY NOW trigger | Fragmented: separate sweep/displacement/FVG indicators, trader fuses mentally | Opaque "BUY NOW" call, no gates shown | Single deterministic three-gate engine; every FIRE shows which gates passed with verbatim reasons |
| Invalidation | Manual: trader draws their own SL | Rarely published; losers quietly deleted | Named structural level + rationale derived before the ticket; R/R gate enforces honesty |
| Order ticket | None — indicators plot, trader tickets by hand | Entry/SL/TP text with no provenance | Derived ticket: every number traces to a terminal output (OTE pocket, FVG, Asia extreme, DOL); paper-only label |
| Fatal flaw | None | None | Falsifiable sentence naming the level that kills the idea + challenge question on the dominant retail trap |
| Calibration | Hardcoded lengths/multipliers | No calibration surface at all | Exported, test-pinned threshold constants tuned against the paper journal during live observation |

## Sources

- `reference/institutional_rules.md` — Modul 4 (Execution Protocol & WHY NOW engine: three gates, WAIT FOR MANIPULATION default, 5M/15M invalidation) and report §§4–6 (ticket schema, TP ladder, R/R ≥ 1:3, confidence inputs, fatal-flaw sentence, challenge question) — HIGH confidence, project domain authority
- `src/lib/ict/amd.ts` — AMD phase classifier (accumulation/manipulation/distribution + SMT tag + NY-unavailable honesty) — HIGH, verified source
- `src/lib/ict/judas.ts` — three-gate Judas detector, killzone/NY wall-clock discipline, `DISP_MULT`/`CONFIRM_WINDOW` idiom — HIGH, verified source
- `src/lib/ict/smt.ts` — SMT envelope (`SWING_K`, `SMT_TOL_BPS`, `CORR_MIN` gate, suppressed states) — HIGH, verified source
- `src/lib/ict/levels.ts` + `range.ts` + `bias.ts` + `dol.ts` — OTE pockets (62–79%), position, bias, DOL targets feeding direction + TP3 — HIGH, verified sources
- `src/lib/ict/fvg.ts` + `asia.ts` — unmitigated FVG inventory (TP1/entry) and Asia extremes (TP2/purge reference) — HIGH, verified sources
- `src/lib/report.ts` — §§4–6 currently `unavailable`, the exact surface v3.0 flips live — HIGH, verified source
- `.planning/PROJECT.md` — v3.0 goal (WHY NOW + fatal flaw + paper ticket, thresholds calibratable, no broker), constraints (pure `src/lib/ict`, Zustand, zero budget, no LLM) — HIGH

---
*Feature research for: ICT execution layer (v3.0 Modul 4)*
*Researched: 2026-09-09*
