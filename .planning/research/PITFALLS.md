# Pitfalls Research: BSL/SSL Pain Threshold Map

**Domain:** ICT execution terminal — adding BSL/SSL stop-cluster projection to live NQ terminal
**Researched:** 2026-09-15
**Confidence:** HIGH (codebase-grounded) / MEDIUM (ICT methodology interpretation)

> Scope: pitfalls specific to **ADDING** BSL/SSL pools to the existing system (v3.0 shipped: trigger, HARD/SOFT flaw, paper ticket, FVG/Judas/SMT live). Not generic ICT education. Every pitfall names the established pattern it would break and the phase that must prevent it.

## Critical Pitfalls

### Pitfall 1: Wick-noise false pools — every equal high becomes "liquidity"

**What goes wrong:**
`detectPools` flags every local extreme as a BSL/SSL pool. On NQ D1 this yields 15–30 "pools" in a 60-bar window; §1 reads as a wall of pain zones, chart overlay becomes horizontal-line soup, and the Pain Threshold block loses all signal value. Live UAT fails on first glance ("everything is liquidity = nothing is").

**Why it happens:**
Developers reach for a naive pivot (k=1) or, worse, `high === prevHigh` equality checks. NQ wicks are noisy; a 1-bar lookback plus equality-tolerance turns chop into pools. The codebase already solved this for SMT (`SWING_K = 2`, strict `>`/`<`, equality = no swing in `smt.ts:49-79`) — BSL/SSL re-invents it loosely.

**How to avoid:**
- Reuse the SMT swing contract verbatim: fractal `k=2` minimum, strict inequality (`high[i] >` neighbors, never `>=`), equality never a swing. Share `isSwingHigh/isSwingLow` or extract to a common swing module — do NOT write a second swing detector with different edge semantics.
- Add a significance filter on top: minimum ATR-multiple separation between adjacent pools (e.g. merge pools within 0.25× ATR into the more extreme one), pinned by boundary tests.
- Cap the live map like `FVG_MAP_BOUND = 20` (trailing-N, origin-ordered) so even a noisy regime degrades to "nearest N" instead of infinite lines.
- `closedOnly` first (forming rows never seed pools — `types.ts:47-49` precedent), drop non-finite OHLC at the boundary (`hasFiniteOhlc` precedent in `smt.ts`/`judas.ts`).

**Warning signs:**
- Pool count in fixtures exceeds ~6 per side on 60 D1 bars.
- Two pools within a few points of each other on the same side.
- Tests pass with hand-built 5-candle fixtures but explode on the 20-session replay tape.
- Review comment: "we can tune k later."

**Phase to address:**
Math phase (pool detection pure functions + boundary tests). Overlay phase must NOT compensate by hiding excess pools with CSS — fix the detector.

---

### Pitfall 2: Double-counting swept pools — raided liquidity stays on the map

**What goes wrong:**
A pool is swept (wick pierces + closes through/rejects) but remains `active`, so §1 keeps warning about pain that was already collected, the trigger fires "toward" consumed liquidity, and the ticket targets a magnet that no longer exists. Worst case: the same sweep is counted by Judas (15M), by FVG transition, AND by BSL/SSL (§1) as three independent events — triple-counting one raid.

**Why it happens:**
No consumption lifecycle. FVG has one (`applyMitigation` close-through fill + `detectTransition` sweep-then-reject in `fvg.ts:85-169`); BSL/SSL ships without an equivalent because "projection" feels informational. Also the first-sweep-wins rule (Judas `judas.ts:134-160` precedent) is forgotten, so later retests re-fire.

**How to avoid:**
- Give every pool a lifecycle: `active | swept | consumed`, with deterministic transition rules decided in the math phase and pinned:
  - `swept` = wick pierced the pool extreme AND same-candle close rejected back (Judas/FVG sweep-then-reject semantics). Pool stays visible but styled as raided (dimmed/dashed), never counted as fresh pain.
  - `consumed` = close-through beyond the pool extreme (FVG mitigation semantics). Pool leaves the active map.
  - First chronological sweep wins; later touches of a swept pool never re-promote it.
- Single source of truth: the selector boundary emits the active map only; §1 prose, overlay, and any downstream consumer read the same array. Never let the chart and the report compute swept-ness independently.
- Explicit non-vote rule: a swept BSL/SSL pool is **expected path**, not a flaw — it must NOT feed `checkFatalFlaw` as HARD (see Pitfall 7).

**Warning signs:**
- §1 lists a pool above price that price already wicked through last week.
- Firing log shows FIRE toward a level the report called "swept" two sessions ago.
- Tests cover detection but have zero sweep/consumption cases.

**Phase to address:**
Math phase (lifecycle + tests). Polish phase verifies via firing-log analysis (no FIRE toward consumed pools in replay).

---

### Pitfall 3: Timeframe mixing — D1 pools, 15M sweeps, 1H displacement in one sentence

**What goes wrong:**
BSL/SSL pools are computed on D1 swing highs/lows, but sweeps are evaluated on 15M Judas rows and displacement on Asia-height multiples — and §1 prose blends them without labeling ("BSL süpürüldü") while §3 (Judas/SMT/AMD) says the opposite. Users see §1 BEARISH + §3 BULLISH on the same screen with no timeframe tag; trust collapses. Methodology reviewers flag it as the classic retail multi-timeframe soup the terminal was built to avoid.

**Why it happens:**
The dual-symbol/intraday plumbing (`join.ts`, `aggregate.ts`, 15M Judas) is already in the store, so it's tempting to "enrich" D1 pools with intraday sweep state. The D1/intraday contract split (`types.ts:51-62` — business-day strings vs epoch seconds, never unified) gets bridged ad hoc.

**How to avoid:**
- Anchor rule: **BSL/SSL pools are D1-only** (same 60-bar trailing window as SMT `SWING_LOOKBACK`, same D1 NQ anchor). Intraday Judas remains the sweep-confirmation layer for §3/trigger; §1 may *reference* a Judas confirmation as provenance ("15M təsdiq") but never recomputes sweeps on 15M inside the pool module.
- Every §1 sentence carries its timeframe token (D1 pool, 15M confirmation) — same discipline as the `selectRange4H` §2 line fix (ICT-11 closure).
- Pure-function boundary: pool module takes `Candle[]` (D1 strings) only; it never accepts `IntradayCandle[]`. The type system enforces the timeframe wall.
- Cross-section consistency test: §1 direction token vs §3/§6 direction on the same snapshot — flag contradictions in tests, resolve by precedence rule (§3 trigger path wins for execution; §1 is context).

**Warning signs:**
- A function signature taking both `Candle[]` and `IntradayCandle[]`.
- §1 copy with sweep verbs but no timeframe noun.
- `nyMinutesOf` / killzone constants imported into the pool module.

**Phase to address:**
Math phase (type-level timeframe wall + window pinning). Overlay/report phase adds timeframe tokens to copy. Polish phase adds the §1-vs-§3 parity check to the harness (parity-test precedent).

---

### Pitfall 4: Overlay clutter — pools collide with the existing chart chrome

**What goes wrong:**
BSL/SSL lines/zones are drawn on top of Premium/Discount zones, EQ/DOL, quadrant/OTE, FVG boxes, Asia range, Judas/SMT markers, ticket entry/SL/TP lines, and the T pin. At 4+ pools per side the chart is unreadable; the v2.1 HiDPI/resize work and the "overlays/chrome byte-identical" guarantee regress. Users disable the overlay — the flagship feature dies by its own ink.

**Why it happens:**
Each prior layer was added with its own color/opacity without a global z-order + budget. BSL/SSL is the 7th layer and the one that breaks the camel's back. Developers test on a clean chart (one pool) instead of the live chart (all layers).

**How to avoid:**
- Global overlay budget decided in the overlay phase, not per-layer: max ~3 active pools per side rendered (nearest un-swept), trailing-N bound shared with FVG discipline, swept pools dashed + dimmed (thin-tier 0.5 dimming precedent from v2.1), consumed pools never drawn.
- Z-order contract: candles + ticket lines on top; pools are background zones (lowest alpha, no border flicker). Document the order in one place; byte-identical overlay test extended to include pools.
- Style tokens reused from existing palette (no new neon); BSL/SSL share one hue family with lightness split, never two new competing colors.
- Resize/autosize path re-verified (v2.1 view-lock UAT 6/6 precedent) with pools on — canvas pixel behavior is UAT-covered, not unit-tested.

**Warning signs:**
- New color constants not in the design-token file.
- Overlay component reading the full pool array instead of the capped selector.
- Screenshots in review showing >6 horizontal lines.

**Phase to address:**
Overlay phase (budget + z-order + cap). Polish phase re-runs visual-glance UAT with all layers on.

---

### Pitfall 5: Methodology overreach — projection presented as resting-stop fact

**What goes wrong:**
§1 copy says "stoplar buradadır" (stops ARE here) instead of "stop yığılması proyeksiyası" (projected cluster). The terminal — whose honesty markers (unavailable labels, thin-history banner, KAĞIZ/PAPER banner, CALIBRATION-PROVISIONAL pins) are its core trust asset — starts asserting unknowable microstructure (actual book stops) from OHLC proxies. One methodology-savvy reviewer kills credibility for the whole terminal.

**Why it happens:**
"ICT teaches BSL/SSL = stops" gets transliterated into copy without the proxy hedge. Rule-based determinism (a strength) makes the overclaim look authoritative — verbatim pinned sentences amplify a false certainty.

**How to avoid:**
- House wording locked in the math/report phase: pools are always `proyeksiya` / `ehtimal zonası`, never `stop` as fact. Ban list extended: bare "BSL reydi oldu" for unconfirmed projections; require "proyeksiya" or "təsdiqsiz" qualifier unless a confirmed sweep exists.
- §1 header carries the methodology caveat in one fixed sentence (D1 swing-proxy, not book data) — same pattern as fixture/Ssenari labels and CALIBRATION-PROVISIONAL pins.
- Anti-feature gate: §1 pools NEVER vote in `evaluateTrigger` gates and NEVER move ticket entry/SL/TP. They are context (like the SMT agree-tag: read-only suffix, never blocks/passes FIRE). Any plan proposing "FIRE only if near BSL" is rejected at plan review.
- Falsifiable framing reused from §6: each §1 bias names what would disprove it (opposite-side sweep + close-through), so projection stays testable, not prophetic.

**Warning signs:**
- Copy drafts without the word "proyeksiya."
- Trigger or ticket module importing the pool selector.
- Reason strings with interpolated prices ("BSL 24,130-dədir") — breaks the no-interpolation verbatim rule AND overclaims precision.

**Phase to address:**
Math/report phase (wording lock + non-vote rule). Polish phase runs the banned-word quarantine over §1 copy (ticket quarantine precedent).

---

### Pitfall 6: Stale / thin-history / rollover pools — ghost pain from bad data

**What goes wrong:**
Pools computed from a truncated window (thin history), a stale NQ leg (serve-stale poll gap), or rollover-week corruption persist into §1 as confident zones. The terminal warns about pain derived from data it already flagged untrustworthy elsewhere — self-contradiction visible on one screen (stale banner + confident §1).

**Why it happens:**
The pool module reads raw candles instead of the selector-guarded, stale-latched snapshot every other detector consumes. Established disciplines (selector guard empty/bad → null; per-leg stale envelopes; `thinHistory` flag in `range.ts:25`; joint rollover suppression in `smt.ts:245-259`; HARD stale/rollover kill in `invalidation.ts:308-313`) are bypassed because "§1 is just context."

**How to avoid:**
- Pool selector consumes the SAME guarded snapshot: empty/bad → null (renders §1 unavailable, never an empty "no pain" that reads as safe); any stale leg → §1 degraded-with-provenance or suppressed per the stale-latch discipline; `thinHistory` → pools render with uniform 0.5 dimming + persistent banner (v2.1 precedent), never full strength.
- Rollover week: pools computed but §1 carries the corruption caveat; trigger + flaw path already HARD-kills — §1 must not contradict ("quraşdırma ləğv edildi" in §6 while §1 shows fresh targets = bug).
- Purity preserved: staleness arrives as injected booleans (invalidation `stale` envelope precedent), never age-math inside `src/lib/ict`.

**Warning signs:**
- Pool function importing fetch timestamps or computing `Date.now() - candleTime`.
- §1 rendering pools while the stale banner is up.
- Tests with full 60-bar fixtures only; zero thin-history or stale-leg cases.

**Phase to address:**
Math phase (guarded selector + stale/thin/rollover tests). Overlay phase (dimming + banner stacking). Polish phase (stale-leg matrix drill extended to §1 — stale-drill precedent).

---

### Pitfall 7: Integration misfire — pools corrupt trigger / flaw / ticket semantics

**What goes wrong (three sub-cases):**
1. **Trigger gate creep:** BSL proximity becomes a 4th gate or displaces the FVG entry handle. FIRE rate collapses or explodes; CALIBRATION-PROVISIONAL acceptance band (1–4 fires/week, TRIG-04) breaks; the 5-rule parity harness goes red.
2. **Flaw misclassification:** a swept BSL (expected bullish path: sell-side raided, then long) is wired as HARD invalidation ("liquidity taken = setup dead") or as SOFT downgrade on every FIRE. The terminal downgrades its own best setups.
3. **Ticket magnet SL:** stop-loss placed exactly at/inside the SSL pool edge — the classic stop-hunt donation. Or TP placed exactly at BSL (never filled, wick-touched). Paper R/R ≥ 1:3 gate passes on paper, fails on live microstructure.

**Why it happens:**
Pools feel actionable, so each consumer grabs them directly instead of through the fixed-order contracts (`evaluateTrigger` input shape, `checkFatalFlaw` first-match-wins order, ticket direction → OTE×FVG → SL → TP ladder).

**How to avoid:**
- Trigger: pools are read-only context, max an agree-suffix like `smtSuffix` (`trigger.ts:132-157`). No gate, no vote, never blocks FIRE. Parity harness covers it: pools on/off must not change verdicts.
- Flaw: swept-pool-toward-direction is CONFIRMATION, never flaw. Opposite-side confirmed sweep stays SOFT-downgrade-only-on-FIRING (invalidation D-12 precedent); pools add no new flaw key. If a new key is proposed, default answer is no — the 4-key table is closed.
- Ticket: SL goes beyond the pool extreme plus ATR-regime buffer (regime `atr` already computed), never at the edge; TP ladders toward the pool but books partials before the extreme (wick-touch reality). Fixed order preserved: pools may inform the TP ladder description, never reorder derivation or bypass the R/R gate.
- Same-snapshot discipline: flaw judges the same trigger snapshot (invalidation header precedent) — §1 pools computed on a different snapshot/asOf than trigger = race bug. Inject one `asOf`, share it.

**Warning signs:**
- `evaluateTrigger` or ticket derivation importing pool types.
- New `FlawReasonKey` proposed.
- SL == pool extreme in any test fixture.
- Firing-log calibration shifting >1σ after pools land (polish-phase tripwire).

**Phase to address:**
Math phase (non-vote contract + same-asOf rule). Polish phase (parity harness + firing-log calibration + ticket UX buffer review).

---

### Pitfall 8: Purity + verbatim-reason regression — pools break the two house guards

**What goes wrong:**
Pool math reads clocks (`Date.now()`), imports the Zustand store, or formats dates with local timezone instead of injected `asOf` + NY/Baku helpers — the co-located purity guard (`purity.test.ts`) goes red and the whole `src/lib/ict` extraction story regresses. Simultaneously §1 Azerbaijani copy interpolates prices/dates into "verbatim" sentences, breaking `toBe` pins and smuggling banned vocabulary past quarantine.

**Why it happens:**
Pools need "now" (nearest pool to live price) and "session" (Baku/NY labels) — both tempt clock reads and store imports. Copy needs to name levels — tempts interpolation.

**How to avoid:**
- Purity: pool functions take `(candles, asOf)` injected; price is a parameter, never a store read. Timezone via `formatInTimeZone` + `NY_TZ` idiom (judas/trigger precedent), never `new Date()` arithmetic. Run `purity.test.ts` in the math phase — it self-scans new files automatically.
- Reasons: one fixed sentence per reason key, `toBe`-pinned, no template placeholders (trigger D-09 / invalidation D-04+10 precedent). Pool extremes live in structured fields (`{ price, side, state }`), never inside the sentence string. Banned-word list enforced on §1 copy before merge.

**Warning signs:**
- `Date.now`, `new Date()`, `zustand`, `@/src/lib/store` in any new `src/lib/ict/*.ts` file.
- Template literals with `${price}` inside reason constants.
- Purity test excluded or edited to skip the new file.

**Phase to address:**
Math phase (purity green from first commit). Report/overlay phase (verbatim pins). Polish phase (quarantine sweep).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Second swing detector just for pools (`k=1`, own edge rules) | Ships math phase faster | Divergent swing semantics: SMT says no swing, §1 says pool at same bar — cross-section contradiction, double maintenance | Never — reuse/share `isSwingHigh/isSwingLow` contract |
| Swept-state as a display concern (chart dims, data stays active) | No lifecycle design needed | Ghost pain + double-counting; every consumer re-implements swept-ness differently | Never — lifecycle in the data layer, display reads state |
| Uncapped pool array ("we'll cap in the UI") | Fewer math-phase decisions | Overlay soup + selector/overlay divergence (chart shows X, §1 lists Y) | Never — cap at the selector boundary like `FVG_MAP_BOUND` |
| Pools voting in trigger "temporarily for calibration" | Feels like faster learning | Parity harness red, calibration band broken, methodology overreach baked in | Never — read-only agree-tag max, gated by plan review |
| Interpolated §1 reasons ("show the price, users want it") | Richer-looking copy | Breaks toBe pins, banned-word leakage, false precision | Never — structured fields carry numbers, sentences stay verbatim |
| Local-time date math in pool code | One fewer import | DST bugs (March/November Baku/NY proven pain), purity red | Never — `formatInTimeZone` idiom only |
| Skipping thin/stale/rollover cases ("§1 is context, not execution") | Smaller test matrix | Self-contradicting terminal (confident §1 + stale banner), audit gap | Only as explicitly-marked Nyquist PARTIAL with UAT cover — otherwise never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|---------------|------------------|
| Trigger (`trigger.ts`) | Add BSL proximity as 4th gate or replace FVG entry handle | Read-only agree-suffix max (`smtSuffix` precedent); parity harness asserts verdicts unchanged with pools on/off |
| Fatal flaw (`invalidation.ts`) | Swept pool → new HARD key; or SOFT downgrade on ARMED/WAIT | No new key (4-key table closed); swept-toward-direction = confirmation; SOFT only on FIRING (D-12) |
| Ticket (fixed-order derivation) | SL at pool edge; TP exactly at pool; pools reorder derivation | SL beyond extreme + ATR buffer; TP partials before extreme; order direction → OTE×FVG → SL → TP → R/R gate untouched |
| FVG map (`fvg.ts`) | Pools and FVGs computed on different snapshots/windows | Same guarded snapshot, same `asOf`; shared trailing-window discipline; cross-module consistency test |
| Judas/SMT (§3) | §1 claims sweep Judas hasn't confirmed (or vice versa) | §1 references Judas confirmations by provenance, never recomputes; §1-vs-§3 parity check in polish |
| §6 falsifiable sentences | §1 duplicates §6 BSL/SSL raid sentences with different wording | §1 is projection vocabulary; §6 raid sentences stay canonical — cross-link, don't duplicate |
| Selectors/store | Pool selector reading raw candles, bypassing stale latch | Consume the same guarded snapshot; empty/bad → null; stale → degraded-with-provenance |
| Chart overlay | Pool layer with own cap/colors/z-order | Global budget (≤3/side), shared tokens, documented z-order, byte-identical overlay test extended |
| Report §1 copy | Interpolated prices, missing timeframe tokens, missing proyeksiya hedge | Verbatim toBe-pinned sentences + structured level fields + timeframe token + methodology caveat |
| Replay/parity harness | Pools excluded from replay ("display only") | Pools in the replay tape + parity assertions; firing-log analysis flags FIRE-toward-consumed-pool |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| O(n²) pool-vs-candle sweep scan on every render | Chart jank on timeframe switch, slow report render | Compute pools + lifecycle in memoized selector on closed-candle change only; overlay renders cached array | Live terminal with full D1 + intraday legs on low-end hardware |
| Unbounded pool history (all swings since inception) | Selector output grows, chart draws dozens of lines, replay harness slows | Trailing-window slice (60-bar SMT precedent) + map bound (FVG 20 precedent) + render cap (3/side) at three distinct layers | First long-history session / extended replay tape |
| Per-candle wall-clock formatting in pool loop | Report render latency, DST-window flakiness | Resolve wall-clock once per evaluation (asOf idiom), never per-candle-per-render | Asia/Baku DST transition weeks |

## Security Mistakes

No new attack surface (rule-based, no LLM, no auth, Yahoo proxy unchanged). Domain-specific honesty risks only:

| Mistake | Risk | Prevention |
|---------|------|------------|
| §1 presented as book-stop fact | Users size positions on false certainty; trust loss = product death | `proyeksiya` hedge locked + methodology caveat + paper-only banner retained |
| Interpolated "precise" pool prices in copy | False precision → limit orders at hunted levels | Numbers in structured fields with ATR-buffer guidance; sentences stay verbatim |
| Silent §1 suppression failure (empty array = "no pain") | Absence of warning read as safe | Selector guard: bad/empty → null → explicit unavailable marker, never silent empty |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| §1 lists 10+ zones with equal visual weight | Alert fatigue; real near-price pain buried | Sort by distance-to-price, cap visible, nearest-first; swept dimmed; Azerbaijani distance wording ("ən yaxın") |
| Swept vs active pools look identical | User braces for already-collected pain | Distinct styles: active solid, swept dashed+dimmed, consumed gone; legend in §1 header |
| §1 contradicts §3/§6 on the same screen | "Terminal disagrees with itself" — confidence collapse | Precedence note (execution §§3–6 win; §1 is context) + parity-tested consistency |
| Pool lines obscure entry/SL/TP + T pin | Execution chrome unreadable at the moment of use | Pools background-lowest z; ticket lines + pins always on top; UAT with ticket open |
| New jargon without glossary ("BSL reydi", "SSL ovu") | Azerbaijani retail users guess meaning | One-line §1 header gloss + fixed vocabulary shared with §6 sentences |

## "Looks Done But Isn't" Checklist

- [ ] **Pool detection:** Often missing strict-inequality + equality-is-no-swing tests — verify `>=`/`<=` boundary cases pinned (SMT T-07 precedent).
- [ ] **Consumption lifecycle:** Often missing swept/consumed transitions — verify a swept pool never re-promotes + a close-through pool leaves the active map.
- [ ] **Cap chain:** Often missing one of window-slice → map-bound → render-cap — verify all three layers with an over-limit fixture.
- [ ] **Timeframe wall:** Often missing type-level separation — verify pool module never imports `IntradayCandle` / killzone constants.
- [ ] **Non-vote contract:** Often missing parity proof — verify trigger verdicts identical with pools on/off across the replay tape.
- [ ] **Stale/thin/rollover:** Often missing degraded rendering — verify §1 null/dimmed/caveated on each leg of the stale matrix + thin history + rollover week.
- [ ] **Verbatim pins:** Often missing `toBe` locks — verify §1 sentences pinned byte-for-byte, numbers only in structured fields.
- [ ] **Purity:** Often missing self-scan coverage — verify `purity.test.ts` green with the new files (no exclusions added).
- [ ] **Overlay budget:** Often missing byte-identical extension — verify overlay test + visual-glance UAT with all layers + ticket open.
- [ ] **Firing-log proof:** Often missing calibration check — verify FIRE-toward-consumed-pool count is zero in replay + acceptance band (1–4/week) holds.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wick-noise pools shipped | MEDIUM | Raise k to 2 + strict inequality + ATR-merge; add over-limit fixture; re-run replay; overlay cap as stopgap only |
| Swept pools double-counted | MEDIUM | Add lifecycle states + first-sweep-wins; migrate selector output; backfill tests; audit firing log for ghost-pain FIREs |
| Timeframe soup in §1 | MEDIUM | Split pool (D1) from confirmation (15M provenance tag); type-wall the module; rewrite §1 copy with timeframe tokens |
| Overlay soup | LOW | Apply render cap + z-order + dimming; extend byte-identical test; visual UAT; no detector change needed |
| Methodology overreach copy | LOW | Reword to proyeksiya + caveat; quarantine sweep; no code change beyond strings |
| Stale/thin ghosts | MEDIUM | Rewire selector to guarded snapshot; add matrix/thin/rollover tests; stack dimming + banners |
| Trigger/flaw/ticket corruption | HIGH | Revert gate/key/derivation change; restore parity harness green; recalibrate firing log; plan-review gate on re-attempt |
| Purity/verbatim regression | LOW | Remove clock/store imports, inject asOf; de-interpolate reasons; purity + toBe green |

## Pitfall-to-Phase Mapping

Suggested v3.1 phase split: **P1 Math** (pure pool detection + lifecycle + guarded selector + tests) → **P2 Overlay** (§1 report block + chart overlay + z-order/budget) → **P3 Polish** (threshold calibration, ticket UX buffers, firing-log analysis, parity + stale drills).

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Wick-noise false pools | P1 Math | Boundary tests (equality, k, ATR-merge) + pool-count assertion on 60-bar fixture |
| Swept double-counting | P1 Math | Lifecycle tests (sweep → swept, close-through → gone, no re-promotion) |
| Timeframe mixing | P1 Math (+ copy in P2) | Type check (no intraday imports) + timeframe tokens in §1 + §1-vs-§3 parity test |
| Stale/thin/rollover ghosts | P1 Math (+ dimming in P2) | Stale-matrix + thin + rollover-week tests; banner/dim UAT |
| Purity + verbatim guards | P1 Math (+ pins in P2) | `purity.test.ts` green, `toBe` pins, quarantine sweep |
| Overlay clutter | P2 Overlay | Window→map→render cap chain test + byte-identical overlay extension + visual-glance UAT |
| Methodology overreach | P2 Overlay (wording lock) | Copy review: proyeksiya hedge + caveat + no interpolation + no new trigger/ticket imports |
| Trigger/flaw/ticket misfire | P1 contract + P3 proof | Parity harness (pools on/off identical verdicts) + no-new-flaw-key + SL-buffer tests |
| Calibration drift | P3 Polish | Firing-log analysis: 1–4/week band holds, zero FIRE-toward-consumed-pool |
| Ticket UX (magnet SL/TP) | P3 Polish | SL-beyond-extreme + ATR buffer tests; TP-partial-before-extreme; UAT with ticket open |

## Sources

- Codebase (HIGH confidence): `src/lib/ict/smt.ts` (SWING_K, strict swings, time-anchored pairing, corr + rollover gates), `src/lib/ict/fvg.ts` (closedOnly, close-through mitigation, sweep-then-reject transition, MAP_BOUND), `src/lib/ict/judas.ts` (three-gate sweep, first-wins, preRun vs candidate, Asia-height displacement), `src/lib/ict/trigger.ts` (three gates, FVG handle, verbatim reasons, SMT read-only suffix, CALIBRATION-PROVISIONAL), `src/lib/ict/invalidation.ts` (HARD/SOFT split, first-match-wins, FIRING-only SOFT, §6 sentences), `src/lib/ict/types.ts` (closedOnly, D1/intraday contract split), `src/lib/ict/range.ts` (thinHistory), `src/lib/ict/purity.test.ts` (house guards), `.planning/PROJECT.md` (v3.0 shipped surface, v3.1 targets, established patterns).
- ICT methodology (MEDIUM confidence): BSL/SSL as resting-stop projection above/below swing extremes; sweep-then-displacement sequencing; ERL/IRL delivery context. Interpreted conservatively — projection framing, never book-fact claims.
- Terminal history (HIGH confidence): v2.1 overlay/chrome byte-identical + dimming + banner discipline; v3.0 parity harness + stale-drill matrix + banned-word quarantine precedents reused above.
