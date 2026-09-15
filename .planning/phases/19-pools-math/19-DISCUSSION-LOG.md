# Phase 19: Pools Math - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-15
**Phase:** 19-pools-math
**Areas discussed:** Equal-weight emphasis, Ranking philosophy, Seed scope, Zone merge & cap

---

## Equal-weight emphasis

| Option | Description | Selected |
|--------|-------------|----------|
| Strong bonus | Triple equal-highs outrank everything nearby (ICT engineered-pool reading) | ✓ |
| Moderate bonus | Equality adds weight but proximity can still win | |
| Tiebreak only | Equality only breaks ties between same-distance pools | |

**User's choice:** Strong bonus
**Notes:** D-01

| Option | Description | Selected |
|--------|-------------|----------|
| ~25 bps | Mirrors SMT_TOL_BPS=25 idiom already pinned | ✓ |
| Looser (~50 bps) | Wider net, more clusters merge — risks lumping distinct zones | |
| Tighter (~10 bps) | Only near-identical ticks cluster — fewer, sharper pools | |

**User's choice:** ~25 bps
**Notes:** D-02

| Option | Description | Selected |
|--------|-------------|----------|
| 2 touches | Two equal touches already earn the bonus — densest signal early | ✓ |
| 3+ touches | Needs triple confirmation — fewer but higher-conviction pools | |

**User's choice:** 2 touches
**Notes:** D-03

| Option | Description | Selected |
|--------|-------------|----------|
| Keep bonus | Swept pools keep equality weight for retest magnetism | ✓ |
| Reduce on sweep | Raid drains the bonus; pool re-earns only via fresh touches | |

**User's choice:** Keep bonus
**Notes:** D-04

| Option | Description | Selected |
|--------|-------------|----------|
| Linear scaling | Each extra equal touch adds the same bonus — simple, test-pinned | |
| Diminishing | Bonus grows then flattens — prevents 5-touch mega-pool dominance | ✓ |

**User's choice:** Diminishing
**Notes:** D-05, raised on "More questions" continuation

---

## Ranking philosophy

| Option | Description | Selected |
|--------|-------------|----------|
| DOL-side first | Nearest ACTIVE pool on the DOL side is §1's named zone (standard ICT) | ✓ |
| Pure proximity | Closest pool regardless of side — simplest §1 prose | |
| Weight first | Heaviest pool wins even if farther — engineered liquidity first | |

**User's choice:** DOL-side first
**Notes:** D-06

| Option | Description | Selected |
|--------|-------------|----------|
| Strong 0.25 | Behind-price pools nearly drop out — pain is ahead not behind | ✓ |
| Mild 0.6 | Behind pools stay competitive — contrarian §1 | |

**User's choice:** Strong 0.25
**Notes:** D-08 (asked before D-07 in flow)

| Option | Description | Selected |
|--------|-------------|----------|
| 2.0 boost | Doubles matching-side score — DOL alignment decides rank-1 | ✓ |
| 1.5 boost | Gentler tilt — weight and distance dominate | |

**User's choice:** 2.0 boost
**Notes:** D-07

| Option | Description | Selected |
|--------|-------------|----------|
| ATR units | ATR-normalized distance — NQ scale-invariant | ✓ |
| Raw points | Simpler but regime-blind | |

**User's choice:** ATR units
**Notes:** D-09

---

## Seed scope

| Option | Description | Selected |
|--------|-------------|----------|
| D1 only | POOL-01 contract: D1 swing clusters only in Phase 19; Asia seeds land in Phase 20 wiring | ✓ |
| D1 + seeds now | Add Asia/range seeds in the math too — fuller map sooner | |

**User's choice:** D1 only
**Notes:** D-10

| Option | Description | Selected |
|--------|-------------|----------|
| 60 bars | Same as SMT SWING_LOOKBACK — consistent | ✓ |
| 100 bars | Wider memory — more pools, more staleness risk | |

**User's choice:** 60 bars
**Notes:** D-11

| Option | Description | Selected |
|--------|-------------|----------|
| Shared import | Reuse isSwingHigh/isSwingLow + k=2 verbatim — never fork swing logic | ✓ |
| Fork copy | Copy predicates into pools module — faster now, divergence risk later | |

**User's choice:** Shared import
**Notes:** D-12

---

## Zone merge & cap

| Option | Description | Selected |
|--------|-------------|----------|
| 0.25x ATR | Merge pools within quarter-ATR into the more extreme — kills wick-noise | ✓ |
| 0.5x ATR | Wider merge — fewer, chunkier zones | |

**User's choice:** 0.25x ATR
**Notes:** D-13

| Option | Description | Selected |
|--------|-------------|----------|
| 20 total | Mirrors FVG_MAP_BOUND=20 — bounded inventory | ✓ |
| 10 total | Tighter map — only strongest survive | |

**User's choice:** 20 total
**Notes:** D-14

| Option | Description | Selected |
|--------|-------------|----------|
| Min-max span | Merged zone spans min-to-max extreme of cluster — honest band | ✓ |
| Extreme only | Anchor on the most extreme wick only — tighter but flickers | |

**User's choice:** Min-max span
**Notes:** D-15

| Option | Description | Selected |
|--------|-------------|----------|
| Newest first | Keep newest N by origin date — WR-07 discipline | ✓ |
| Strongest first | Keep highest-weight N — strongest survive regardless of age | |

**User's choice:** Newest first
**Notes:** D-16

---

## the agent's Discretion

None — user decided all presented areas.

## Deferred Ideas

None — discussion stayed within phase scope.
