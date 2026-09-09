# Pitfalls Research — v3.0 Execution (WHY NOW + Fatal-Flaw Invalidation + Paper Ticket on a Live Terminal)

**Domain:** Adding a WHY NOW trigger engine, fatal-flaw invalidation logic, and a paper order-ticket UI to an existing live deterministic ICT terminal (D1 dealing range + SMT + AMD sessions + rule-based report §3, Vercel Hobby, zero budget, pure-function `src/lib/ict`, Baku-timezone sessions, no broker connection)
**Researched:** 2026-09-09
**Confidence:** HIGH for purity/store/chart/stale-envelope mechanics (proven in this codebase across v1.0–v2.1); MEDIUM for WHY NOW trigger / invalidation ICT semantics (trading-education sources, no official ICT spec; project deferred live observation so thresholds are uncalibrated)

> Scope note: v1.0 pitfalls (single-symbol 429, NQ=F rollover gap, UTC×chart×Baku triple-shift, lightweight-charts v5 SSR, Hobby cache, stale-as-live) and v2.0 pitfalls (phantom SMT on non-corresponding swings, dual-symbol 429 doubling, timestamp misalignment, DST killzone drift, Judas flagging every Asia wick, intraday-as-D1, asymmetric rollover, honesty/purity contracts) are validated and shipped. This file does NOT re-litigate them — it covers what breaks when you ADD time+structure triggers, setup-killing invalidation, and an order ticket to that live system. Where a v1/v2 pitfall gets worse in v3.0, it is marked **[AMPLIFIES]**.

## Critical Pitfalls

### Pitfall 1: Calibrating WHY NOW thresholds with zero live observation data

**What goes wrong:**
The trigger engine ships with guessed constants (e.g. "displacement ≥ 0.5 ATR within N bars of Judas sweep + SMT confirm = WHY NOW") that were tuned on the same 2–3 synthetic fixtures used to prove the mechanics. Live, the trigger either never fires (terminal looks dead for weeks) or fires on every session (see Pitfall 2). The team then "fixes" it by hand-tuning constants against one vivid week of market memory — overfitting to a single regime — and the next regime silently breaks it.

**Why it happens:**
v2.0 explicitly deferred live observation (Judas confirm rate, SMT rollover behavior, Asia live alignment are still unwatched). WHY NOW is the first feature whose correctness is a *rate*, not a boolean: a trigger is only right if it fires at a usable frequency with a usable hit quality. Developers treat threshold-picking like API-shape work — a constant to declare — instead of a measurement task requiring a log of firings vs. market follow-through.

**How to avoid:**
- Ship thresholds as named, exported, test-pinned constants (same convention as `SWING_K`, `SMT_TOL_BPS`, `CORR_MIN`) — never magic numbers inside the trigger function. Every threshold gets a `// CALIBRATION-PROVISIONAL: unobserved as of <date>` comment.
- Build the observation hook FIRST, before tuning: a trigger-firing log (timestamp ISO, session, inputs snapshot, threshold versions) rendered in the report or a debug panel, so 2–4 weeks of daily §3-vs-market notes produce a firing-rate table per threshold set.
- Define the acceptance band up front: e.g. "WHY NOW fires 1–4×/week on live NQ, not 0 and not 20." A trigger outside its band is a failing feature, not a personality trait.
- Unit tests pin *boundaries*, not just happy paths: just-below-threshold fixture → NO signal; just-above → signal. This makes future recalibration a deliberate constant change with failing-then-passing tests, not a silent edit.
- Never calibrate against the same fixtures used to prove mechanics. Keep `*.calibration.test.ts` (live-shape candles) separate from `*.test.ts` (synthetic mechanics).

**Warning signs:**
Threshold values with no comment about their origin; the same fixture file used for both "proves the math" and "proves the rate"; trigger fires 0× or 15×+ in the first live week and nobody has a pre-agreed band to call it broken; tuning happens by editing code rather than changing a named constant.

**Phase to address:**
Trigger-math phase (pure functions), with the firing-log hook built in the SAME phase — not deferred to verification. Verification phase then checks the band, not the math.

---

### Pitfall 2: False-signal spam — the WHY NOW badge becomes wallpaper

**What goes wrong:**
WHY NOW fires on every minor displacement, every Asia-session wobble, every thin-history bar. Within days the user learns to ignore the badge entirely — including the one genuine setup per month it was built for. Alert fatigue is a one-way door: once the signal is wallpaper, no amount of later recalibration restores trust.

**Why it happens:**
Each v2 detector (Judas, SMT, AMD phase) already has its own lenient edge cases (fallback Asia sessions, thin-tier dimming, suppressed-but-rendered SMT). A WHY NOW engine that ORs lenient inputs inherits the union of all their false positives. Developers test the trigger against clean textbook fixtures where everything aligns, never against the choppy Tuesday fixture where three weak inputs coincide.

**How to avoid:**
- Conjunctive gating by default: WHY NOW requires ALL of (session gate × structure gate × confirmation gate), never any-single-input. Each gate must expose its own `reason` so the report can print *which* gate blocked the signal — blocked signals are the product working, and visible gating rebuilds trust.
- Require closed-candle inputs only (`closedOnly` convention from v2): triggers evaluated on forming candles flicker and spam on every tick-driven re-render.
- Add a cooldown/dedup rule: one WHY NOW per setup-direction per session window, not one per bar while conditions hold. State the rule in the report ("WHY NOW already fired LONG at 15:35 Baku — suppressing repeat").
- Ship a "near-miss" tier, not binary fire/silent: FIRING / ARMED (2 of 3 gates) / QUIET. ARMED satisfies the user's "is anything developing?" need without spending the FIRING signal's credibility.
- Gate rule: the choppy-sideways fixture must produce QUIET, and the test suite must contain that fixture (the test everyone skips — same lesson as v2.0-P1).

**Warning signs:**
No ARMED tier; trigger evaluated per-bar with no dedup; demo shows the badge firing on a screenshot the developer calls "a bit noisy but fine"; no fixture test for the sideways market; report prints the signal with no gate-by-gate reasons.

**Phase to address:**
Trigger-math phase (gating + dedup + tiers as pure logic). Ticket-UI phase must NOT add its own looser trigger for demo purposes.

---

### Pitfall 3: Invalidation racing the signal — flickering LONG/INVALIDATED/ LONG

**What goes wrong:**
The fatal-flaw check and the WHY NOW trigger evaluate on different inputs, different bar windows, or different freshness states. Live result: the terminal prints WHY NOW LONG at 15:30, INVALIDATED at 15:31, LONG again at 15:32 — on the same setup, with no new market information. The user watches the terminal argue with itself and stops believing either side.

**Why it happens:**
Trigger and invalidation are built as two independent features by (possibly) two plans: trigger reads detector outputs at time T, invalidation re-derives structure at time T+1 or on a different candle slice (e.g. trigger on closed bars, invalidation on the forming bar; trigger on 1H synthesis, invalidation on 15M wicks). Stale/thin asymmetry makes it worse: trigger fires on live inputs while invalidation evaluates on a stale leg, or vice versa.

**How to avoid:**
- Single evaluation contract: `evaluateSetup({ detectors, invalidation, asOf }) → { state: 'ARMED' | 'FIRING' | 'INVALIDATED', triggerReasons, invalidationReasons }` — one function, one `asOf` instant, one candle snapshot. Invalidation NEVER re-fetches or re-slices; it consumes the exact same detector outputs the trigger consumed.
- Ordering rule, stated and pinned: invalidation is evaluated on the same snapshot AFTER the trigger, and INVALIDATED supersedes FIRING deterministically (no timestamps racing — pure function order).
- Same freshness gate for both: if any input leg is stale/thin, the whole evaluation degrades to ARMED-with-reason or UNAVAILABLE — never FIRING on live legs while INVALIDATED evaluates stale ones.
- Hysteresis, not hair-trigger invalidation: a fatal flaw must confirm on a closed candle (or N consecutive closes for wick-based flaws), so a single intra-bar spike cannot kill a setup that a single intra-bar spike created.
- Tests: (a) same-snapshot determinism — identical inputs always yield identical state across 100 runs; (b) race fixture — trigger-conditions-met + flaw-conditions-met on the same snapshot → INVALIDATED with both reason strings present; (c) freshness-split fixture → no FIRING, honest reason.

**Warning signs:**
Two separate `asOf`/`Date.now()` call sites for trigger vs. invalidation; invalidation importing raw candles while the trigger consumes detector outputs; UI polling trigger and invalidation on different intervals; any `setTimeout`/`setInterval` asymmetry between the two badges.

**Phase to address:**
Trigger-math + invalidation phases must share ONE evaluation module (same plan or strictly sequenced, never parallel-diverged). Verification phase runs the flicker test: replay one session bar-by-bar, assert state transitions are monotonic per setup (ARMED → FIRING → INVALIDATED is terminal; no resurrection without a new setup ID).

---

### Pitfall 4: Paper ticket mistaken for real execution

**What goes wrong:**
The order ticket looks, reads, and behaves like a broker ticket — price, size, submit button, confirmation toast — and the user (or a screenshot viewer, or a future integrator) believes real orders are possible. Consequences range from embarrassing (social-media screenshot implying live trading) to dangerous (a later contributor wires a "submit" handler to a real broker endpoint assuming the shape is execution-ready, inheriting paper-math fills as real fills).

**Why it happens:**
Ticket UI is built with standard trading vocabulary ("Buy/Sell", "Submit", "Filled", "Position") and standard trading styling (green/red execute buttons) because that is what ticket components look like. The "paper" qualifier lives in one subtitle the eye skips. No architectural barrier separates paper math from a future execution path — `onSubmit` sits next to fill computation, one import away from a broker call.

**How to avoid:**
- Vocabulary quarantine, enforced by lint or test: the ticket uses PAPER, SIMULATED, HYPOTHETICAL in every user-visible string — button reads "Simulate Fill (Paper — No Broker)", never "Submit Order". Ban the words "Filled", "Position", "Executed" from the ticket; use "Simulated entry", "Paper ticket", "Hypothetical".
- Persistent honesty chrome: a non-dismissible "PAPER — no broker connection" banner INSIDE the ticket panel (same pattern as v2.1's persistent thin-history banner, which correctly chose stacked-non-dismissible over toast).
- Simulated fills must print their assumptions: fill price = signal-close ± N bps simulated slippage, NO partial fills, NO rejection, sizes capped at a stated paper max. If slippage is not modeled, print "slippage NOT modeled — hypothetical".
- Architectural air gap: fill math lives in a `paper/` module whose type names (`PaperFill`, `SimulatedTicket`) cannot be mistaken for execution types. No `submitOrder`, `placeOrder`, `broker` identifiers anywhere in v3.0 — not even stubs. A stub named `placeOrder` is a loaded gun for the next milestone.
- Risk panel prints paper sizing math explicitly (risk % → contracts at paper size, stop distance in points AND ATR multiples) so a screenshot teaches methodology, not P&L fantasy.

**Warning signs:**
Green "BUY"/red "SELL" buttons with no PAPER qualifier; toast saying "Order filled"; any identifier containing `broker`, `submitOrder`, `placeOrder`, `execute`; ticket reachable without passing through an INVALIDATED-state check (paper ticket offered on a killed setup).

**Phase to address:**
Ticket-UI phase (vocabulary + banner + air-gap module). Verification phase includes the screenshot test: a stranger viewing any ticket screenshot for 3 seconds must answer "paper" not "real".

---

### Pitfall 5: Purity violations in the new trigger/invalidation math [AMPLIFIES v2.0-P8]

**What goes wrong:**
The new WHY NOW and fatal-flaw functions read `Date.now()`, import the Zustand store, or fetch candles directly — because "it's just one timestamp" or "the trigger needs the current session". Result: untestable time-dependent logic, unreproducible firing sequences, and the monorepo-extraction contract (`src/lib/ict` = pure, inject time) silently broken for all future modules. The v2.1 audit debt (dead `thinHistory` arg, orphaned export) shows how fast small purity slips accumulate.

**Why it happens:**
Triggers are inherently time-flavored ("WHY NOW") so reaching for the clock feels semantically justified. Session logic needs "now", invalidation needs "latest bar" — both tempt direct clock/store access. The v2 convention (inject `asOf`, consume detector outputs) requires one extra parameter-threading step that deadline pressure skips.

**How to avoid:**
- Hard rule, no exceptions: new files under `src/lib/ict/` take `asOf` (epoch seconds) and detector outputs as arguments. No `Date`, `Date.now`, `performance.now`, no `@/store` imports, no `fetch`. Add an automated guard: a test or lint rule grepping `src/lib/ict/(whyNow|trigger|invalidation|fatalFlaw)*` for `Date.now|new Date|performance.now|from '@/store|from '@/app` and failing the build.
- Time resolution (Baku wall-clock, NY session minutes) happens at the CALLER boundary (selector/route handler), exactly like v2's `amd.ts` (`asOf` injected, `formatInTimeZone` on pure values). The trigger never converts timezones itself — it receives resolved session flags.
- Phase 1 debt cleanup must run FIRST: kill the dead `thinHistory` arg and orphaned export/type before new code copies the pattern. New trigger code that threads a parameter nobody reads is Pitfall 5 wearing a different hat.
- Tests prove purity: same inputs + same `asOf` → byte-identical output; output changes ONLY when inputs or `asOf` change.

**Warning signs:**
A new `src/lib/ict` file importing anything outside `src/lib/ict` + `date-fns-tz` pure formatting; `asOf` optional with a `?? Date.now()` fallback; trigger tests using fake timers instead of injected instants; Phase 1 skipped "to save time".

**Phase to address:**
Phase 1 debt cleanup (remove the broken-window examples + install the purity guard) BEFORE trigger math. Trigger/invalidation phases inherit the guard; verification re-runs it.

---

### Pitfall 6: WHY NOW re-derives v2 outputs instead of consuming them (logic fork)

**What goes wrong:**
The trigger module re-implements its own swing detection, its own Asia-window check, its own SMT comparison "tuned for triggers" instead of importing `detectSMT`, `classifyAMD`, `detectJudas` outputs. For one milestone the two copies agree. Then a v3.1 fix lands on the detector (or the trigger's copy) and they silently disagree — the report §3 says "no Judas" while WHY NOW fires "on Judas sweep". Debugging requires diffing two implementations of the same methodology.

**Why it happens:**
Consuming detector outputs requires understanding their shapes (`SmtOutput` suppressed-vs-signal union, `JudasOutput` null-vs-event, AMD phase+reason) and handling every variant — more design work than writing a bespoke inline check. "Trigger needs slightly different sensitivity" rationalizes the fork.

**How to avoid:**
- Type-level enforcement: the trigger function signature accepts ONLY detector output types (`SmtOutput | null`, `JudasOutput | null`, `AmdOutput`, `AsiaRange | null`) — never raw candle arrays for already-detected phenomena. If it takes candles, it must be for genuinely new math (e.g. displacement magnitude) with a name that says so.
- Sensitivity differences go into detector parameters (named constants, caller-supplied), not into copied detector logic. One swing function (`isSwingHigh` with `SWING_K`), one Judas gate set, one SMT tolerance — parameterized, not duplicated.
- Report §3 and WHY NOW render from the SAME evaluation object (Pitfall 3's contract). If §3 says it, the trigger saw it; if the trigger fired on it, §3 shows it. Any divergence is a bug, caught by a cross-render test.
- Debt rule: a second implementation of an existing detector anywhere in the diff fails review, full stop.

**Warning signs:**
New files containing the words "swing", "sweep", "divergence" with fresh loop code instead of imports from `smt.ts`/`judas.ts`/`asia.ts`; trigger taking `nqCandles, esCandles` as arguments; §3 badge and WHY NOW badge disagreeing on any fixture.

**Phase to address:**
Trigger-math phase (signature review is the gate: reviewer checks imports before logic). Verification phase runs the agreement test (§3 inputs ≡ trigger inputs on shared fixtures).

---

### Pitfall 7: Fatal flaw defined so broadly the terminal is permanently QUIET

**What goes wrong:**
Invalidation conditions ("any SMT suppression", "any thin-history bar", "any rollover-week proximity", "displacement beyond X") each sound prudent alone; combined with AND-of-flaws logic they kill 95% of setups. The terminal's headline feature becomes a permanent "No setup — invalidated" state. Because invalidation always prints a plausible-sounding reason, nobody files it as a bug — the product just feels useless.

**Why it happens:**
Asymmetric caution: every past post-mortem ("we should have invalidated when…") adds a flaw condition, and no counter-pressure measures the kill rate. Invalidation is tested flaw-by-flaw (each condition kills its fixture — green) but never as a population (what fraction of a choppy month survives ALL flaws?).

**How to avoid:**
- Flaw conditions are individually necessary AND jointly measured: ship an invalidation-rate budget (e.g. "flaws may kill at most ~50% of ARMED setups in the calibration month; above that, the broadest flaw gets narrowed, not the trigger widened").
- Classify flaws: HARD flaws (rollover-week data corruption, stale leg — never trade, non-negotiable) vs. SOFT flaws (structure conflict — downgrade FIRING to ARMED with reason, don't kill). Most methodology "fatal flaws" are actually soft: conflicting SMT means wait, not abandon.
- Every flaw prints its SPECIFIC reason plus which class (HARD/SOFT) and what would unblock it ("SOFT-invalidated: SMT suppressed (CORR_DECOUPLED 0.62) — re-arm if correlation recovers above 0.70"). "Invalidated" alone is a banned string.
- Population test: a 20-session mixed fixture (trend, chop, thin, rollover-adjacent) must yield at least one FIRING and at least one INVALIDATED — proving both paths are reachable and neither dominates.

**Warning signs:**
Flaw list grows past 5 with no rate budget; all flaws are terminal (no ARMED-downgrade path); invalidation reasons are generic ("conditions not met"); demo never shows a FIRING state because "the market is choppy today".

**Phase to address:**
Invalidation phase (HARD/SOFT classification + reason strings). Verification phase runs the population test and checks the kill-rate budget.

---

### Pitfall 8: Ticket risk math on stale/thin inputs presented as precise numbers

**What goes wrong:**
The paper ticket prints exact entry/stop/size figures ("Entry 24,318.50, Stop 24,290.00, Size 2, Risk $140.00") computed from a stale envelope or thin-history bars — inputs the chart already dims to 0.5 opacity and banners as unreliable. False precision on unreliable inputs is worse than no ticket: it teaches the user to trust numbers the system knows are shaky.

**Why it happens:**
The ticket consumes price levels from the store without checking the envelope flags (`stale`, thin-tier) that v2.1 worked hard to propagate. Number formatting (`toFixed(2)`) implies a confidence the pipeline does not possess. "It's paper anyway" lowers the care bar.

**How to avoid:**
- Ticket reads the SAME freshness flags as the trigger evaluation: stale leg or thin tier → ticket renders in degraded mode (dimmed numbers, "levels from stale data — illustrative only" banner, size computation locked with reason) or refuses with an honest message. Never green-light precise numbers on flagged inputs.
- Risk math shows its inputs, not just outputs: "Stop = 28.5 pts (1.1× ATR 26.0, ATR from N=14 closed D1 bars, data live as of 15:32 Baku)". If ATR is guarded to null (`atr<=0 → null` convention), the ticket must refuse sizing, not divide by zero or substitute a default.
- ATR/level staleness timestamp on the ticket itself ("levels computed from data as of HH:MM Baku, 4 min old") — the ticket carries its own provenance, independent of the chart banner.
- Sizes round DOWN on degraded inputs and the rounding is printed ("thin tier: size floored to 1, not rounded").

**Warning signs:**
Ticket component subscribing to price selectors but not to `stale`/thin-tier selectors; `toFixed` on values with no freshness check upstream; ticket operable while the thin-history banner is showing; ATR null path untested in ticket code.

**Phase to address:**
Ticket-UI phase (freshness wiring is a ticket acceptance criterion, not a nice-to-have). Verification phase replays the stale-serve drill WITH the ticket open: numbers must visibly degrade, never stay crisp.

---

## Technical Debt Patterns

Shortcuts that seem reasonable when adding execution features but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip Phase 1 cleanup ("new features matter more") | Faster start on triggers | New code copies dead-arg/orphan patterns; purity guard never installed; v3.1 pays compound interest | Never — Phase 1 is the cheapest phase in the milestone |
| Hardcode WHY NOW thresholds inline | One less file/constant to name | Recalibration becomes archaeology; no test pins the boundary; observation notes can't map to code | Never |
| Trigger-specific copies of detector logic | No need to learn `SmtOutput` union shapes | Logic fork (Pitfall 6); §3 vs trigger disagreement; double maintenance forever | Never |
| `placeOrder`-shaped stubs "for later" | Ticket looks complete; future wiring "ready" | Next milestone mistakes paper shape for execution API; liability surface (Pitfall 4) | Never — use `PaperFill`/`SimulatedTicket` names only |
| Dismissible "paper trading" toast instead of persistent banner | Cleaner screenshot | User dismisses once, forgets forever; screenshots without context imply real trading | Never — persistent stacked banner (v2.1 pattern) |
| Evaluate invalidation on forming bars "for responsiveness" | Faster INVALIDATED badge | Flicker war with closed-bar trigger (Pitfall 3); intra-bar noise kills real setups | Never for HARD flaws; SOFT downgrades may note forming-bar context but never decide on it |
| Reuse one `stale` flag for trigger + ticket | Less prop threading | Mixed-freshness lies (Pitfall 8); one stale leg poisons or is hidden | Never — per-leg flags end to end (v2.0-P2 rule) |
| Defer the firing log "until we need calibration" | Smaller trigger phase | No observation data when calibration time comes; thresholds stay guesses forever | Only if the log ships in the SAME phase as the trigger (no cross-phase deferral) |

## Integration Gotchas

Adding execution to the existing live pipeline — where the seams actually break.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Report §3 → new WHY NOW section | Appending a §4 that re-derives its own reasons, drifting from §3 prose | New section renders from the shared evaluation object (Pitfall 3 contract); §3 reasons and trigger reasons are the same strings, verbatim convention preserved |
| Chart overlays (Judas/SMT/Asia) → trigger markers | New marker layer with its own time-to-x mapping or session conversion, misplacing WHY NOW arrows by a bar or an hour | Reuse the existing overlay coordinate/session helpers; trigger markers consume resolved bar indices + Baku labels from the same selectors; DST-proven path untouched |
| Zustand store → trigger + ticket state | Trigger state (`firing`, `armed`) and ticket inputs stored as independent slices updated by separate effects, racing each other | Single evaluation selector deriving trigger+invalidation state from detector slices + `asOf`; ticket subscribes to the evaluation, not to raw prices; no `useShallow` on fresh-identity outputs (v1.0 03.2 lesson: stable selector functions) |
| Yahoo intraday forming candle → trigger input | Evaluating WHY NOW on the forming 1H/15M bar so every poll moves the signal | `closedOnly` at the trigger boundary (v2.0-P6 rule); forming bar may render as "developing" context, never as trigger input |
| Rollovers/SEM → invalidation | Treating rollover week as just another soft flaw; trigger fires on spread-distorted structure | Rollover-proximity is a HARD flaw reusing `detectRollover` output (v2.0-P7 rule); joint NQ+ES suppression propagates: suppressed SMT input can never satisfy a confirmation gate |
| Thin-tier → ticket | Ticket ignoring the thin-tier flag v2.1 added | Ticket subscribes to thin-tier; degraded rendering + locked sizing (Pitfall 8); dimming convention (0.5 zones/levels) extends to ticket numbers |
| Vercel Hobby polling → trigger freshness | Shortening poll interval "so triggers are faster", doubling Yahoo load on the dual-symbol loop | Keep ≥60s per-leg cadence with stagger (v2.0-P2 rule); trigger speed comes from evaluation on arrival, not from polling faster; document that WHY NOW latency floor is the poll cadence, not a bug |

## Performance Traps

Patterns that work in dev but fail on the live Hobby deployment.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-bar trigger evaluation over unbounded history | Report render slows as intraday arrays grow; Hobby function approaches timeout on long ranges | Evaluate trigger on the rolling window only (same ANCHOR_WINDOW discipline as v2 dealing-range); bound history at the proxy (v2.0-P5 rule) | Intraday 1H/15M history beyond a few hundred bars per leg |
| Firing log unbounded in client state | Zustand store balloons over a long session; ticket/report re-renders stutter | Cap log (e.g. last 50 evaluations) with overflow counter; persist calibration export as downloadable JSON, not in-memory accumulation | Multi-hour open terminal sessions |
| Marker layer re-render per poll | Chart flickers or drops frames every 60s poll as trigger markers rebuild | Memoize marker arrays on evaluation identity (same reference unless state changed); view-lock discipline from v2.1 chart polish | Every poll cycle with markers naively rebuilt |
| Fetching extra intervals "for better triggers" | Yahoo 429s return (shared Vercel egress IP); both legs go stale simultaneously | No new intervals without a load test (both symbols + 20 parallel clients, v2.0-P2 drill); trigger uses intervals already polled | First production week with the added interval |

## Security Mistakes

Domain-specific issues for a paper-ticket terminal beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Ticket vocabulary implying real execution ("Submit", "Filled", "Position") | User believes real money moved; screenshot misrepresents the product; future broker wiring inherits paper assumptions | Vocabulary quarantine (Pitfall 4): PAPER/SIMULATED in every string, banned-word test, no `broker`/`placeOrder` identifiers |
| Paper P&L displayed like account equity | False confidence → real-money overconfidence; social screenshots showing "profits" from simulated fills with unmodeled slippage | Label all P&L HYPOTHETICAL; print unmodeled assumptions alongside (no slippage / no partials / no rejection); never persist paper P&L where it could read as a balance |
| Client-computed risk numbers trusted as advice | User sizes a real trade off paper math computed on stale data | Degraded-mode lock on stale/thin (Pitfall 8); static disclaimer that paper levels are educational, not financial advice; sizing inputs always visible, never hidden defaults |
| Future broker keys anticipated in client code | API keys/secrets drift into client bundle or Hobby env for a "paper" feature that needs none | v3.0 adds zero secrets, zero broker env vars, zero server routes beyond Yahoo proxy; any PR adding a key-shaped env var fails review |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| WHY NOW badge with no reason attached | User sees LONG but cannot answer "why now?" — the feature's own name becomes ironic | Every state (FIRING/ARMED/QUIET/INVALIDATED) prints its gate-by-gate reasons verbatim in the report; badge is a pointer to prose, not a replacement |
| INVALIDATED styled as an error (red, alarming) | User reads methodology working-as-designed as system failure; erodes trust in good invalidation | INVALIDATED styled neutral/informative (methodology note, not alert); HARD vs SOFT visually distinct; unblock condition printed alongside |
| Ticket offered on invalidated or quiet setups | User sim-fills a trade the methodology just killed — terminal contradicts itself in one screen | Ticket CTA enabled ONLY in FIRING state; ARMED shows "ticket arms when WHY NOW fires"; INVALIDATED/QUIET show disabled ticket with the reason, never an active form |
| Signal states only visible in one panel | User on the chart misses the invalidation printed in the report (or vice versa) | State + one-line reason mirrored in chart header chip AND report section; full reasons live in one canonical place (report), chip links to it |
| Thin/stale degradation invisible on the ticket | Numbers look equally crisp live vs. stale; user cannot tell which ticket to trust | Degraded ticket styling (dimming per v2.1 0.5 convention + banner + locked sizing) so freshness is visible at a glance, matching the chart |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces — verify during execution.

- [ ] **WHY NOW trigger:** Often missing the choppy-fixture QUIET test — verify a sideways week yields ARMED/QUIET, not FIRING, with gate reasons printed.
- [ ] **Thresholds:** Often missing provenance — verify every constant has a named export, a boundary test, and a CALIBRATION-PROVISIONAL comment with date.
- [ ] **Invalidation:** Often missing the SOFT path — verify at least one flaw downgrades to ARMED (not kills) and prints its unblock condition.
- [ ] **Trigger+invalidation:** Often missing the shared snapshot — verify one `asOf`, one evaluation function, and the bar-by-bar replay test with monotonic transitions.
- [ ] **Paper ticket:** Often missing the honesty chrome — verify persistent PAPER banner, banned-word test green, zero `broker`/`placeOrder` identifiers in the diff.
- [ ] **Ticket risk math:** Often missing freshness wiring — verify stale-serve drill with ticket open visibly degrades numbers (no crisp figures on stale legs).
- [ ] **Purity:** Often missing the guard — verify new `src/lib/ict` files pass the no-clock/no-store grep test and `asOf` has no `Date.now()` fallback.
- [ ] **Report integration:** Often missing reason parity — verify §3 prose and WHY NOW reasons are the same strings from the same object, not two authors.
- [ ] **Firing log:** Often missing entirely — verify the log exists, caps at N entries, and exports calibration JSON before calling calibration "done".

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Uncalibrated thresholds (P1) firing at wrong rate | MEDIUM | Freeze constants; ship the firing log if missing; collect 2 weeks of notes; adjust ONE constant per cycle with boundary tests; never retune mid-week on vivid memory |
| Alert-fatigue wallpaper (P2) | HIGH (trust is one-way) | Immediately tighten to conjunctive gating + add ARMED tier; publicly reset expectations ("signal was over-firing, now recalibrated"); dedup repeat fires; backfill the choppy-fixture test |
| Trigger/invalidation flicker (P3) | MEDIUM | Merge to single evaluation function with one `asOf`; add hysteresis on flaws; replay-test the offending session bar-by-bar until transitions are monotonic |
| Paper-taken-for-real incident (P4) | HIGH (reputational) | Same-day vocabulary + banner fix; audit all screenshots/docs for "Submit/Filled" language; add banned-word test; confirm zero broker identifiers in tree |
| Purity breach in `src/lib/ict` (P5) | LOW if caught early | Extract clock/store access to caller boundary, inject `asOf`; install the grep guard; re-pin determinism tests (100-run identical output) |
| Detector logic fork (P6) | MEDIUM | Delete the copy; rewire trigger to detector output types; add signature-review checklist to phase gates |
| Permanent-QUIET terminal (P7) | MEDIUM | Measure kill rate over calibration month; split HARD/SOFT; narrow the broadest flaw first; add the population test (≥1 FIRING + ≥1 INVALIDATED per 20 sessions) |
| False-precision ticket (P8) | LOW | Wire freshness flags into ticket; add degraded mode + provenance line; re-run stale-serve drill with ticket open |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| P1 uncalibrated thresholds | Trigger-math phase (named constants + boundary tests + firing log hook) | Calibration band check: 1–4 fires/week target reviewed against log; every constant has provenance comment |
| P5 purity violations + Phase 1 dead-arg/orphan debt | Phase 1 debt cleanup (remove dead `thinHistory` arg + orphan export/type; install no-clock/no-store guard) | Grep guard green on all new `src/lib/ict` files; determinism tests pass; no `Date.now()` fallback |
| P2 spam + P6 logic fork | Trigger-math phase (conjunctive gates + ARMED tier + detector-output-only signatures) | Choppy-fixture QUIET test; import-review (no fresh swing/sweep loops); dedup rule demonstrated |
| P3 invalidation race + P7 permanent-QUIET | Invalidation phase (shared evaluation object, HARD/SOFT split, hysteresis, specific reasons) | Bar-by-bar replay monotonic; race fixture → INVALIDATED with both reasons; population test (≥1 FIRING + ≥1 INVALIDATED) |
| P4 paper-as-real + P8 false precision | Ticket-UI phase (vocabulary quarantine, persistent banner, air-gap types, freshness-degraded mode) | Screenshot test (3-second "paper" read); banned-word + no-broker-identifier tests; stale-drill with ticket open degrades |
| Cross-cutting (report parity, marker reuse, store shape, poll cadence) | Verification phase (agreement tests, marker reuse review, stale-serve drill, load check before any new interval) | §3-vs-trigger reason parity; overlays reuse helpers; single evaluation selector; ≥60s per-leg cadence held |

## Sources

- This codebase (HIGH): `src/lib/ict/smt.ts` (SWING_K/SMT_TOL_BPS/CORR_MIN named-constant + test-pinned convention), `src/lib/ict/amd.ts` (injected-`asOf`, read-only detector fusion, no clock/store), v2.1 thin-tier work (persistent banner + 0.5 dimming + stale-serve drill), v1.0 03.2 `useShallow` loop lesson, v2.0-P1 matched-pair + choppy-fixture lesson, v2.0-P2 per-leg stale envelopes + staggered polling, v2.0-P7 joint rollover suppression.
- PROJECT.md v3.0 scope (HIGH): Phase 1 debt items (dead `thinHistory` arg, orphaned export/type), deferred live observation as known risk, paper-ticket-no-broker constraint, purity + Baku-TZ + zero-budget constraints.
- ICT methodology education (MEDIUM — no official spec): LuxAlgo / innercircletrader / Flux Charts SMT-as-matched-swings semantics; ICT WHY NOW / displacement / invalidation concepts from trading-education literature — treated as semantics to encode, not authority to cite for exact thresholds.
- Alert-fatigue / false-positive-rate practice (MEDIUM): general signal-design wisdom that uncalibrated conjunctive thresholds either spam or starve, and that blocked-signal transparency preserves trust — applied here as ARMED tier + reason printing.
- Paper-vs-live execution gap (MEDIUM): general trading-systems wisdom that simulated fills without modeled slippage/partials/rejection build false confidence — applied here as assumption-printing + vocabulary quarantine.

---
*Pitfalls research for: v3.0 Execution (WHY NOW + fatal-flaw invalidation + paper ticket on live ICT terminal)*
*Researched: 2026-09-09*
