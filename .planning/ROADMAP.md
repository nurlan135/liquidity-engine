# Roadmap: Liquidity Engine — Institutional Execution Terminal for NQ

## Milestones

- ✅ **v1.0 Live Terminal** — Phases 1–3 + 03.1, 03.2 (shipped 2026-09-06)
- ✅ **v2.0 Modul 3 (Liquidity Sequencing & SMT)** — Phases 6–9 (shipped 2026-09-08)
- ✅ **v2.1 Cleanup & Polish** — Phases 10–13 (shipped 2026-09-09)
- ✅ **v3.0 Execution (Modul 4)** — Phases 14–18 (shipped 2026-09-15)
- ✅ **v3.1 Pain Threshold (§1) + Execution Polish** — Phases 19–21 (shipped 2026-09-18)
- 🚧 **v3.2 Pools P2** — Phases 22–26 (in progress)

## Phases

<details>
<summary>✅ v1.0 Live Terminal (Phases 1–3 + 03.1, 03.2) — SHIPPED 2026-09-06</summary>

- [x] Phase 1: Data Foundation & ICT Core (3/3 plans) — completed 2026-09-06 (retroactive gate 10/10 via 03.2)
- [x] Phase 2: Terminal Composition (4/4 plans) — completed 2026-09-05
- [x] Phase 3: Production Deploy & Verification (4/4 plans) — completed 2026-09-06
- [x] Phase 03.1: Close gap ICT-07 banner (1/1, INSERTED) — completed 2026-09-06
- [x] Phase 03.2: Close gap Phase 1 gate + ICT-01/02 + W1/W2/F2 (4/4, INSERTED) — completed 2026-09-06

Full detail: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Modul 3 (Phases 6–9) — SHIPPED 2026-09-08</summary>

- [x] Phase 6: Dual-Symbol Proxy + Data Contracts (5/5 plans) — completed 2026-09-07
- [x] Phase 7: SMT + 4H/1H Sequencing Math (3/3 plans) — completed 2026-09-07
- [x] Phase 8: AMD Sessions (Asia Range + Judas) (3/3 plans) — completed 2026-09-07
- [x] Phase 9: Composition (§3 Live + Overlays + Verify) (3/3 plans) — completed 2026-09-08 (visual glance re-verify PASS, human-confirmed)

Full detail: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.1 Cleanup & Polish (Phases 10–13) — SHIPPED 2026-09-09</summary>

- [x] Phase 10: Type Safety Fix (1/1 plans) — completed 2026-09-08
- [x] Phase 11: Chart Rendering Polish (1/1 plans) — completed 2026-09-08
- [x] Phase 12: Deployment Hygiene (3/3 plans) — completed 2026-09-09
- [x] Phase 13: Thin History Honesty (2/2 plans) — completed 2026-09-09

Full detail: `.planning/milestones/v2.1-ROADMAP.md`

</details>

<details>
<summary>✅ v3.0 Execution (Modul 4) (Phases 14–18) — SHIPPED 2026-09-15</summary>

- [x] Phase 14: Audit Debt Cleanup + Purity Guard (3/3 plans) — completed 2026-09-10
- [x] Phase 15: WHY NOW Trigger Engine (3/3 plans) — completed 2026-09-11, verified PASS
- [x] Phase 16: Fatal-Flaw Invalidation (3/3 plans) — completed 2026-09-11
- [x] Phase 17: Paper Ticket + §§4–6 Live UI + Chart Pins (5/5 plans) — completed 2026-09-14, verified 15/15
- [x] Phase 18: Verification + Calibration Harness (3/3 plans) — completed 2026-09-15, UAT 10/10

Full detail: `.planning/milestones/v3.0-ROADMAP.md`

</details>

<details>
<summary>✅ v3.1 Pain Threshold (§1) + Execution Polish (Phases 19–21) — SHIPPED 2026-09-18</summary>

- [x] Phase 19: Pools Math (3/3 plans) — completed 2026-09-18
- [x] Phase 20: §1 Live + Chart Overlay (5/5 plans) — completed 2026-09-18, UAT 14/14
- [x] Phase 21: Execution Polish (5/5 plans) — completed 2026-09-18, 14/14 verified (UAT test 2 acknowledged blocked — live EXECUTE prerequisite)

Full detail: `.planning/milestones/v3.1-ROADMAP.md`

</details>

## v3.2 Pools P2 (Phases 22–26) — IN PROGRESS

**Goal:** BSL/SSL ağrı xəritəsini icra qərarlarına bağla — pools-never-vote disiplini ilə. Hər phase parity harness-i yenidən sübut edir.

- [ ] Phase 22: Pool Lifecycle + Decay (POOL2-04)
- [ ] Phase 23: TP2 Resolver (POOL2-01)
- [ ] Phase 24: Read-Only Context Pair (POOL2-05 + POOL2-02)
- [ ] Phase 25: 15M Intraday Pools (POOL2-03)
- [ ] Phase 26: Buffered Ticket Live Wiring + Parity Re-Proof (W12)

### Phase 22: Pool Lifecycle + Decay (POOL2-04)

**Goal:** Pool age/decay + re-accumulation — eligibility and decay semantics locked before any consumer reads rank.

**Plans:** TBD at plan time

**Requirements:**
- POOL2-04: Pool age/decay + re-accumulation — ACTIVE-only eligibility predicate + status transition table; scorer-plane decay multiplier (CALIBRATION-PROVISIONAL half-life, stored weight/touches immutable, SWEPT never re-enters rank); re-accumulation via fresh-seed; injected `asOf`, no store timer. Stale/thin matrix pinned (NQ-stale → null, ES-stale → ticket-degraded, rankSkipped → unbuffered).

**Plans:** 3 plans

Plans:
- [ ] 22-01-PLAN.md — Decay constants + pure helpers + scoreAndRank multiplier + decay boundary tests
- [ ] 22-02-PLAN.md — Immutability/determinism/ghost pins + parity re-run green + purity + selector matrix
- [ ] 22-03-PLAN.md — Sandbox half-life/floor preview sliders (preview-vs-applied, no derivation reads preview)

**Success criteria:**
1. User sees §1 Pain Threshold naming only live, relevant pools — stale archaeology no longer ranks (SWEPT/CONSUMED excluded, decay demotes aged pools on the scorer plane with stored weight untouched)
2. User sees honest-degrade on every stale/thin leg combination: NQ-stale yields null inventory, ES-stale yields ticket-degraded, skipped rank yields unbuffered — never a laundered rank
3. Developer re-runs the parity harness pools-on vs pools-off and the triple (trigger/flaw/ticket) matches exactly — lifecycle is projection context, not a vote
4. Developer injects two different `asOf` times and gets deterministic, time-ordered decay — no `Date.now()` in pool math, no store timer

### Phase 23: TP2 Resolver (POOL2-01)

**Goal:** Ticket TP2-si trade-side nearest ACTIVE pool-a bağlansın — closes the printed §5 promise with buffered pullback and honest null fallback.

**Plans:** TBD at plan time

**Requirements:**
- POOL2-01: Ticket TP2 wired to nearest ACTIVE pool on trade side — ACTIVE-only → trade-side → strictly-beyond-entry → nearest by ATR distance, buffered pullback (`beforeExtreme` 0.10×ATR), honest null fallback (swept/behind-price → structure fixture). TP1/TP3 + TP1-only R/R gate unchanged.

**Success criteria:**
1. User sees a §5 ticket whose TP2 names a real ACTIVE pool on the trade side, inset 0.10×ATR before the extreme — never magnet-to-the-line, never a swept or behind-price pool
2. User sees an honest structure-fixture TP2 (null fallback) when no ACTIVE pool sits strictly beyond entry — the ticket still prints, R/R gate still judges TP1 only
3. Developer runs the parity harness and trigger/flaw verdicts are byte-identical pools-on vs pools-off — the resolver never feeds `evaluateTrigger`/`checkFatalFlaw` and the gate stays `|tp1 − entry| / stopDist ≥ 3`
4. Developer checks pinned boundary rows: buffered TP rows hold (`rr === 5` / `rr === 9` idiom intact) and `tp2` never equals the raw extreme

### Phase 24: Read-Only Context Pair (POOL2-05 + POOL2-02)

**Goal:** Proximity tag + sentiment multiplier as zero-voter-risk display-only suffixes on already-derived outputs.

**Plans:** TBD at plan time

**Requirements:**
- POOL2-05: Read-only proximity suffix in WHY NOW/ticket prose — `describeProximity` formatter (rank-1 + lastClose + regime ATR), verbatim `reason` fields untouched (separate suffix field), throw-safe empty string.
- POOL2-02: Neutral-default sentiment multiplier on RetailExposure contract — pure `retailExposureMultiplier` beside `sentiment.ts`, neutral 1.0 + `genuine` flag; advisory-only consumption (prose suffix / sizing note, never gate/SL/TP input, never verdict).

**Success criteria:**
1. User reads a WHY NOW/ticket line with a proximity suffix (how close price sits to the rank-1 pool in ATR terms) that never alters the FIRE/ARMED/QUIET verdict or any verbatim `reason` text
2. User sees sentiment context as an advisory note (neutral 1.0 default, `genuine` flag visible under fixtures) that never touches gate, SL/TP, sizing math, or verdict
3. Developer runs the banned-word quarantine + verbatim-`toBe` pins green — no proximity/sentiment text interpolated into `reason` fields, throw paths yield empty string
4. Developer runs the parity harness and the triple matches exactly — both features consume only derived outputs, zero detector/lifecycle/gate code touched

### Phase 25: 15M Intraday Pools (POOL2-03)

**Goal:** 15M intraday swing pool inventory D1-dən sonra gəlsin — second inventory on an isolated path, D1 path byte-stable.

**Plans:** TBD at plan time

**Requirements:**
- POOL2-03: 15M intraday swing pools after D1 — separate `evaluateIntradayPools` path (shared k=2 predicates, own lookback/bound/cap — no blind D1-constant reuse); source-tagged inventory + merge/dedupe + joint ranking; D1 `selectPools` path byte-stable (Rank-1 snapshots unchanged). New `selectPools15M` (stale → null, never touches `selectPools`).

**Success criteria:**
1. User sees intraday (15M) stop-cluster context alongside D1 pools — jointly ranked, source-tagged — with D1 Rank-1 lines unchanged by the diff
2. User sees honest null from `selectPools15M` on stale 15M legs — never a polluted D1 rank, never D1 constants blindly reused on 26× bar density
3. Developer diffs the D1 `selectPools` path byte-stable — Rank-1 snapshots identical before/after, shared `swings.ts` k=2 contract read-only, no SMT `SWING_K` side effects
4. Developer runs the parity harness (extended for the second inventory) and trigger/flaw/ticket verdicts still match exactly pools-on vs pools-off

### Phase 26: Buffered Ticket Live Wiring + Parity Re-Proof (W12)

**Goal:** Buffered ticket math live `selectTicket`-ə köçürülsün — single-snapshot wiring with full 84-bar parity re-proof as exit evidence. LANDS LAST.

**Plans:** TBD at plan time

**Requirements:**
- W12: Buffered ticket math live-wired — `TicketBufferInput` from regime ATR + resolver-chosen trade-side extreme on the SAME epoch/closed window; null-degrades to unbuffered structure; single nearest-ACTIVE resolution shared between buffer and TP2; full 84-bar parity re-proof + stale-leg matrix + chart-line/panel agreement.

**Success criteria:**
1. User sees a live ticket whose SL sits 0.25×ATR beyond the extreme and TP sits 0.10×ATR before it — magnet-to-the-line gone in production, not just in the harness
2. User sees the ticket degrade to unbuffered structure (not a crash, not a silent wrong number) whenever buffer inputs are unavailable — with chart lines and panels agreeing on the same numbers
3. Developer proves live-vs-harness field identity: one `sharedEpoch`, one trigger object, flaw judged on the identical object, buffer from the same closed-only window — no double `selectTriggerPure`, no split-epoch derivation
4. Developer runs the full 84-bar parity re-proof + stale-leg matrix green as the phase exit gate — every P2 consumer stable, pools still never vote
