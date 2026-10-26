# Requirements: Liquidity Engine — v3.2 Pools P2

**Defined:** 2026-10-26
**Core Value:** Correct D1 Premium/Discount positioning on live NQ data — if the dealing-range math is wrong, nothing else matters.

## v3.2 Requirements

Pools P2: BSL/SSL ağrı xəritəsini icra qərarlarına bağla — pools-never-vote disiplini ilə. Hər phase parity harness-i yenidən sübut edir.

### TP2 Resolver (POOL2-01)

- [ ] **POOL2-01**: Ticket TP2-si trade-side nearest ACTIVE pool-a bağlansın — ACTIVE-only → trade-side → strictly-beyond-entry → nearest by ATR distance, buffered pullback (`beforeExtreme` 0.10×ATR), honest null fallback (swept/behind-price → structure fixture). TP1/TP3 + TP1-only R/R gate dəyişməz.

### Proximity Tag (POOL2-05)

- [ ] **POOL2-05**: WHY NOW/ticket prose-unda read-only proximity suffix görünsün — `describeProximity` formatter (rank-1 + lastClose + regime ATR), verbatim `reason` field-lərinə interpolasiya olunmadan (ayrı suffix field), throw-safe empty string.

### Pool Lifecycle (POOL2-04)

- [ ] **POOL2-04**: Pool age/decay + re-accumulation işləsin — ACTIVE-only eligibility predicate + status transition table; scorer-plane decay multiplier (CALIBRATION-PROVISIONAL half-life, stored weight/touches immutable, SWEPT never re-enters rank); re-accumulation via fresh-seed; injected `asOf`, store-da taymer yoxdur. Stale/thin matrix pinned (NQ-stale → null, ES-stale → ticket-degraded, rankSkipped → unbuffered).

### Sentiment Multiplier (POOL2-02)

- [ ] **POOL2-02**: RetailExposure contract-ında neutral-default sentiment multiplier olsun — pure `retailExposureMultiplier` beside `sentiment.ts`, neutral 1.0 + `genuine` flag; advisory-only consumption (prose suffix / sizing note, never gate/SL/TP input, never verdict).

### Intraday Pools (POOL2-03)

- [ ] **POOL2-03**: 15M intraday swing pool inventory D1-dən sonra gəlsin — ayrı `evaluateIntradayPools` path (shared k=2 predicates, öz lookback/bound/cap — D1 konstantları blind reuse yoxdur); source-tagged inventory + merge/dedupe + joint ranking; D1 `selectPools` path byte-stable (Rank-1 snapshots diff-dən dəyişməz). Yeni `selectPools15M` (stale → null, `selectPools`-a toxunmur).

### Buffered Ticket Live (W12)

- [ ] **W12**: Buffered ticket math live `selectTicket`-ə köçürülsün — `TicketBufferInput` regime ATR + resolver-chosen trade-side extreme-dən, SAME epoch/closed window üzərində; null-degrades to unbuffered structure; buffer və TP2 üçün single nearest-ACTIVE resolution; full 84-bar parity re-proof + stale-leg matrix + chart-line/panel agreement.

## v3.3+ Requirements (deferred)

Deferred to future milestones. Tracked but not in current roadmap.

### Calibration & Validation

- **CAL-01**: Decay half-life / `NEAR_ATR_MULT` / sentiment boost üçün calibration-sandbox knob-ları (operator what-if surface) — v3.2.x validation trigger: konstantlar firing-log review-dən keçəndən sonra.
- **CAL-02**: §6 falsification sentences-də TP2 pool naming (§1 → §5 → §6 narrative loop) — resolver live replay-də stabil olandan sonra.

### Future Inventory

- **POOLX-01**: 5M microstructure pools — yalnız 15M calibration-da coarse çıxdıqdan sonra.
- **POOLX-02**: Real retail-sentiment feed — budget + determinism posture; contract-first swap mexanikidir.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Pool-gated FIRE trigger | Öz calibration band + population test lazımdır; v3.2-də qəti rədd edilir (pools-never-vote) |
| Magnet-to-the-line TP/SL | Known-bad behavior; buffer məhz bunu öldürmək üçün var |
| R/R-shopping across pools | R/R gate TP1-only qalır; TP2-yə köçürülməsi parity-i pozur |
| Auto-alerts on pool touch | Nə infrastructure, nə calibration var; false-positive sel yaradar |
| Pool heatmaps / 15M-dən artıq timeframe | Render + calibration yükü; proximity tag kifayətdir |
| LLM narrative for pools | Determinizm prinsipi; verbatim Azerbaijani prose qalır |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| POOL2-04 | Phase 22 | Pending |
| POOL2-01 | Phase 23 | Pending |
| POOL2-05 | Phase 24 | Pending |
| POOL2-02 | Phase 24 | Pending |
| POOL2-03 | Phase 25 | Pending |
| W12 | Phase 26 | Pending |

**Coverage:**
- v3.2 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-26*
*Last updated: 2026-10-26 after initial definition*
