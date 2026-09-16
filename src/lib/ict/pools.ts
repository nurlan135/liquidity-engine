// Pools map: NQ D1 BSL/SSL stop-cluster inventory with zone projection,
// sweep lifecycle, and proximity x DOL-side scoring.
// Pure: injected candles only, zero store imports, no clock reads.
// D1 Candle[] only per D-10 (never IntradayCandle, no killzone helpers).

import type { Candle } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';
import { computeATR } from '@/src/lib/ict/regime';
import { isSwingHigh, isSwingLow, SWING_K, SWING_LOOKBACK } from '@/src/lib/ict/swings';
// Re-exported so consumers read the shared window contract from the pool
// module beside the detector (single import per D-12, zero duplicated
// fractal logic); the canonical definition stays in swings.ts.
export { SWING_K, SWING_LOOKBACK };

/** Equality-cluster tolerance in basis points (D-02, mirrors SMT_TOL_BPS). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-16, unobserved live. Phase 21 reviews against firing log.
export const EQUAL_TOL_BPS = 25;
/** Inventory cap: oldest pools drop beyond this bound (D-14, mirrors FVG_MAP_BOUND). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-16, unobserved live. Phase 21 reviews against firing log.
export const POOL_MAP_BOUND = 20;
/** Same-side merge radius as a multiple of ATR (D-13, kills wick-noise). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-16, unobserved live. Phase 21 reviews against firing log.
export const MERGE_ATR_MULT = 0.25;
/** Scorer boost when the pool side matches the DOL direction (D-07). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-16, unobserved live. Phase 21 reviews against firing log.
export const DOL_BOOST = 2.0;
/** Scorer penalty for pools behind price (D-08, pain is ahead, not behind). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-16, unobserved live. Phase 21 reviews against firing log.
export const BEHIND_PENALTY = 0.25;
/** Epsilon for tolerance-boundary compares (WR-02: divide-then-multiply float error). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-16, unobserved live. Phase 21 reviews against firing log.
export const TOL_EPS_BPS = 1e-9;
/** Diminishing equality-bonus steps per extra touch (D-05, T-19-03 mitigation). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-16, unobserved live. Phase 21 reviews against firing log.
export const EQUAL_BONUS_STEPS = [3.0, 2.0, 1.0, 0.5];

export type PoolSide = 'BSL' | 'SSL';
export type PoolStatus = 'ACTIVE' | 'SWEPT' | 'CONSUMED';

export interface LiquidityPool {
  side: PoolSide;
  top: number;
  bottom: number;
  touches: number;
  weight: number;
  originDate: string;
  status: PoolStatus;
}

export interface PoolsOutput {
  pools: LiquidityPool[];
  asOf: string;
  epoch: number;
}

/** Score ledger for one ranked pool: ATR-unit distance, applied multipliers, final score. */
export interface PoolScore {
  originDate: string;
  side: PoolSide;
  distAtr: number;
  dolBoost: number;
  behindPenalty: number;
  score: number;
}

/** Ranked result: originDate-ordered pools on refuse-to-rank, score-ordered otherwise. */
export interface RankedPools {
  pools: LiquidityPool[];
  scores: PoolScore[];
  rankSkipped: boolean;
}

function hasFiniteOhlc(c: Candle): boolean {
  return (
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
}

// CR-02 / fvg.ts originIndexOrNeg1 precedent: a stale origin is untestable,
// not an error — callers keep the pool and skip evaluation for it.
function originIndexOrNeg1(closed: Candle[], originDate: string): number {
  return closed.findIndex((c) => c.date === originDate);
}

// Exported for the Plan 02 equality clusterer (thin seed is single-touch,
// so no in-module caller yet): TOL_EPS_BPS keeps a gap exactly at
// EQUAL_TOL_BPS on the cluster side of the compare despite
// divide-then-multiply float error (WR-02 precedent).
function bpsGap(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return (Math.abs(a - b) / b) * 10000;
}

export function withinTolerance(a: number, b: number): boolean {
  return bpsGap(a, b) - EQUAL_TOL_BPS <= TOL_EPS_BPS;
}

// Diminishing equality bonus (D-01..D-05, T-19-03): the 2nd touch earns
// steps[0], the 3rd steps[1], and so on — increments shrink 3.0, 2.0, 1.0,
// 0.5. Beyond the 4 shipped steps each extra touch adds 0.5, capped at 2
// extra steps (bonus(6)=7, bonus(7+)=7). A lone touch earns no bonus.
export function equalityBonus(touches: number): number {
  if (!Number.isInteger(touches) || touches < 2) {
    return 0;
  }
  let bonus = 0;
  const extra = touches - 1;
  const capped = Math.min(extra, EQUAL_BONUS_STEPS.length + 2);
  for (let i = 0; i < capped; i++) {
    bonus += i < EQUAL_BONUS_STEPS.length ? EQUAL_BONUS_STEPS[i] : 0.5;
  }
  return bonus;
}

// Weight from raw touch count: touches plus the cumulative equality bonus.
// Per D-04 the lifecycle never edits weight — a SWEPT pool keeps its full
// bonus (reduced presence flows through scorer eligibility, never weight).
export function poolWeight(touches: number): number {
  if (!Number.isInteger(touches) || touches < 1) {
    return 1.0;
  }
  return touches + equalityBonus(touches);
}

interface SwingSeed {
  side: PoolSide;
  price: number;
  date: string;
}

function windowCandles(candles: Candle[]): Candle[] {
  if (!Array.isArray(candles)) {
    throw new Error(`detectPools requires a Candle array, got ${String(candles)}`);
  }
  return [...closedOnly(candles).filter(hasFiniteOhlc)]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-SWING_LOOKBACK);
}

// Equality-clustering seed (D-01..D-05): same-side swings whose relative
// gap stays within EQUAL_TOL_BPS cluster into one pool with touches = member
// count, merged zone = min-max span of member extremes, originDate = earliest
// member date, weight via poolWeight(). Greedy chronological: each seed joins
// the earliest open cluster it tolerates, otherwise it opens a new one. A
// lone swing keeps a point zone plus single touch plus weight 1.0 (D-05:
// minimum 2 touches earns the bonus).
function seedPools(window: Candle[]): LiquidityPool[] {
  const highs = window.map((c) => c.high);
  const lows = window.map((c) => c.low);
  const seeds: SwingSeed[] = [];
  for (let i = 0; i < window.length; i++) {
    if (isSwingHigh(highs, i, SWING_K)) {
      seeds.push({ side: 'BSL', price: window[i].high, date: window[i].date });
    }
    if (isSwingLow(lows, i, SWING_K)) {
      seeds.push({ side: 'SSL', price: window[i].low, date: window[i].date });
    }
  }
  seeds.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  interface Cluster {
    side: PoolSide;
    extremes: number[];
    originDate: string;
  }
  const clusters: Cluster[] = [];
  for (const seed of seeds) {
    let joined = false;
    for (const cluster of clusters) {
      if (
        cluster.side === seed.side &&
        cluster.extremes.every((price) => withinTolerance(seed.price, price))
      ) {
        cluster.extremes.push(seed.price);
        if (seed.date < cluster.originDate) cluster.originDate = seed.date;
        joined = true;
        break;
      }
    }
    if (!joined) {
      clusters.push({ side: seed.side, extremes: [seed.price], originDate: seed.date });
    }
  }
  return clusters.map((cluster) => {
    const top = Math.max(...cluster.extremes);
    const bottom = Math.min(...cluster.extremes);
    return {
      side: cluster.side,
      top,
      bottom,
      touches: cluster.extremes.length,
      weight: poolWeight(cluster.extremes.length),
      originDate: cluster.originDate,
      status: 'ACTIVE' as PoolStatus,
    };
  });
}

// Thin lifecycle (D-18): single chronological pass strictly after originDate.
// BSL wick pierce (high > top) marks SWEPT; strictly-later close above top
// marks CONSUMED. SSL mirrors with low < bottom and close below bottom.
// Boundary touch with == is not a sweep (strict inequality per the judas
// pierce idiom). First sweep wins, no re-promotion; origin absent is kept
// and skipped. A pierce whose close stays inside yields SWEPT, never
// CONSUMED (sweep-then-reject per the fvg close-through idiom).
function applyLifecycle(pools: LiquidityPool[], closed: Candle[], asOf: string): LiquidityPool[] {
  const out: LiquidityPool[] = [];
  for (const pool of pools) {
    const origin = originIndexOrNeg1(closed, pool.originDate);
    if (origin === -1) {
      out.push({ ...pool });
      continue;
    }
    let consumed = false;
    let swept = false;
    for (let j = origin + 1; j < closed.length; j++) {
      const c = closed[j];
      if (c.date > asOf) continue;
      if (pool.side === 'BSL') {
        if (c.close > pool.top) {
          consumed = true;
          break;
        }
        if (c.high > pool.top) {
          swept = true;
        }
      } else {
        if (c.close < pool.bottom) {
          consumed = true;
          break;
        }
        if (c.low < pool.bottom) {
          swept = true;
        }
      }
    }
    if (consumed) continue;
    out.push({ ...pool, status: swept ? 'SWEPT' : 'ACTIVE' });
  }
  return out;
}

function poolMid(pool: LiquidityPool): number {
  return (pool.top + pool.bottom) / 2;
}

// ATR merge (D-13): same-side pools whose distance to the more extreme edge
// sits within MERGE_ATR_MULT x ATR fuse into one pool. The merged pool keeps
// the more extreme edge, bounds span the min-max of both zones, touches sum,
// weight is recomputed from summed touches via poolWeight(), originDate is
// the earliest. Greedy chronological over originDate order; empty ATR history
// skips merging entirely and keeps all pools (no merge denominator).
function mergePools(pools: LiquidityPool[], atr: number): LiquidityPool[] {
  if (pools.length <= 1) return pools.map((p) => ({ ...p }));
  if (!Number.isFinite(atr) || atr <= 0) return pools.map((p) => ({ ...p }));
  const radius = MERGE_ATR_MULT * atr;
  const ordered = [...pools]
    .map((p) => ({ ...p }))
    .sort((a, b) => (a.originDate < b.originDate ? -1 : a.originDate > b.originDate ? 1 : 0));
  const merged: LiquidityPool[] = [];
  for (const pool of ordered) {
    let fused = false;
    for (const target of merged) {
      if (target.side !== pool.side) continue;
      // Distance to the more extreme edge: how far the CANDIDATE pool's edge
      // prints beyond the TARGET's held extreme. BSL extremes are tops (the
      // higher top wins); SSL extremes are bottoms (the lower bottom wins).
      // Within-radius candidates fuse into the held extreme zone.
      const heldExtreme = target.side === 'BSL' ? target.top : target.bottom;
      const candidateEdge = target.side === 'BSL' ? pool.top : pool.bottom;
      if (Math.abs(candidateEdge - heldExtreme) - radius <= TOL_EPS_BPS * Math.max(1, Math.abs(radius))) {
        target.top = Math.max(target.top, pool.top);
        target.bottom = Math.min(target.bottom, pool.bottom);
        target.touches += pool.touches;
        target.weight = poolWeight(target.touches);
        if (pool.originDate < target.originDate) target.originDate = pool.originDate;
        if (pool.status === 'CONSUMED' || target.status === 'CONSUMED') {
          target.status = 'CONSUMED';
        } else if (pool.status === 'SWEPT') {
          target.status = 'SWEPT';
        }
        fused = true;
        break;
      }
    }
    if (!fused) merged.push({ ...pool });
  }
  return merged;
}

// Trailing inventory cap (D-14/D-16, WR-07 precedent): originDate sort before
// slice(-POOL_MAP_BOUND) keeps the newest N even for unsorted input.
function capPools(pools: LiquidityPool[]): LiquidityPool[] {
  return [...pools]
    .sort((a, b) => (a.originDate < b.originDate ? -1 : a.originDate > b.originDate ? 1 : 0))
    .slice(-POOL_MAP_BOUND);
}

// DOL-side resolution for the scorer (D-07): BULLISH DOL is the range high
// (buy-side objective), BEARISH DOL is the range low. COMPRESSION resolves
// to the nearer extreme, mirroring computePrimaryDOL.
function dolSide(closed: Candle[], bias: 'BULLISH' | 'BEARISH' | 'COMPRESSION'): PoolSide {
  if (bias === 'BULLISH') return 'BSL';
  if (bias === 'BEARISH') return 'SSL';
  let high = closed[0].high;
  let low = closed[0].low;
  for (const c of closed) {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }
  const lastClose = closed[closed.length - 1].close;
  return Math.abs(lastClose - high) <= Math.abs(lastClose - low) ? 'BSL' : 'SSL';
}

// Full scorer (D-06/D-07/D-08/D-09, D-20, T-19-01): distAtr = |poolMid -
// lastClose| / atr; score = weight x dolBoost x behindPenalty / (1 + distAtr)
// with dolBoost = DOL_BOOST on the DOL side else 1.0 and behindPenalty =
// BEHIND_PENALTY for pools behind price (BSL below lastClose, SSL above).
// Rank-1 is the nearest ACTIVE pool on the DOL side by construction: only
// ACTIVE pools are eligible for rank, and proximity in ATR units breaks ties.
// Zero-or-empty ATR refuses to rank — pools return in originDate order with
// scores of 0 and rankSkipped true, never NaN or Infinity (T-19-01).
export function scoreAndRank(
  pools: LiquidityPool[],
  closed: Candle[],
  bias: 'BULLISH' | 'BEARISH' | 'COMPRESSION',
): RankedPools {
  const ordered = [...pools]
    .sort((a, b) => (a.originDate < b.originDate ? -1 : a.originDate > b.originDate ? 1 : 0));
  const zeroScores = (list: LiquidityPool[]): PoolScore[] =>
    list.map((pool) => ({
      originDate: pool.originDate,
      side: pool.side,
      distAtr: 0,
      dolBoost: 1.0,
      behindPenalty: 1.0,
      score: 0,
    }));
  if (ordered.length === 0) {
    return { pools: [], scores: [], rankSkipped: true };
  }
  const active = ordered.filter((p) => p.status === 'ACTIVE');
  const series = computeATR(closed);
  if (series.length === 0) {
    return { pools: ordered, scores: zeroScores(ordered), rankSkipped: true };
  }
  const atr = series[series.length - 1];
  if (!Number.isFinite(atr) || atr <= 0) {
    return { pools: ordered, scores: zeroScores(ordered), rankSkipped: true };
  }
  const lastClose = closed[closed.length - 1].close;
  if (!Number.isFinite(lastClose)) {
    return { pools: ordered, scores: zeroScores(ordered), rankSkipped: true };
  }
  if (active.length === 0) {
    return { pools: ordered, scores: zeroScores(ordered), rankSkipped: false };
  }
  const boosted = dolSide(closed, bias);
  // D-06 eligibility: only ACTIVE pools rank. CONSUMED pools left the map in
  // the lifecycle; SWEPT pools keep weight per D-04 but sit out of Rank-1 —
  // they ride along unscored so Phase 20 can dim them, never counted as
  // fresh pain.
  const scored = active.map((pool) => {
    const mid = poolMid(pool);
    const distAtr = Math.abs(mid - lastClose) / atr;
    const dolBoost = pool.side === boosted ? DOL_BOOST : 1.0;
    const behind =
      (pool.side === 'BSL' && mid < lastClose) || (pool.side === 'SSL' && mid > lastClose);
    const behindPenalty = behind ? BEHIND_PENALTY : 1.0;
    const score = (pool.weight * dolBoost * behindPenalty) / (1 + distAtr);
    return {
      pool,
      entry: {
        originDate: pool.originDate,
        side: pool.side,
        distAtr,
        dolBoost,
        behindPenalty,
        score,
      } as PoolScore,
    };
  });
  scored.sort((a, b) => b.entry.score - a.entry.score);
  const rankedActive = scored.map((s) => s.pool);
  // SWEPT pools ride along unscored in originDate order behind the ranked
  // ACTIVE pools (visible for Phase 20 dimming, never Rank-1 per D-06).
  const inactive = ordered.filter((p) => p.status !== 'ACTIVE');
  return {
    pools: [...rankedActive, ...inactive],
    scores: scored.map((s) => s.entry),
    rankSkipped: false,
  };
}

// Thin entry: detect pools from the trailing-60 closed window. asOf is an
// injected plain-string date; no clock reads.
export function detectPools(candles: Candle[], asOf: string): LiquidityPool[] {
  if (typeof asOf !== 'string' || asOf.length === 0) {
    throw new Error(`detectPools requires an asOf date string, got ${String(asOf)}`);
  }
  const window = windowCandles(candles);
  if (window.length === 0) return [];
  return seedPools(window);
}

// Full pipeline: detect (equality-clustering seed) plus lifecycle honoring
// asOf plus ATR-merge plus originDate trailing cap plus scorer. CONSUMED
// pools leave the active map in the lifecycle; only ACTIVE pools are rank
// eligible (SWEPT pools keep weight per D-04 but sit out of Rank-1 per D-06).
// bias defaults to COMPRESSION (nearer-extreme DOL) when the caller has no
// bias read.
export function evaluatePools(
  candles: Candle[],
  asOf: string,
  bias: 'BULLISH' | 'BEARISH' | 'COMPRESSION' = 'COMPRESSION',
): LiquidityPool[] {
  if (typeof asOf !== 'string' || asOf.length === 0) {
    throw new Error(`evaluatePools requires an asOf date string, got ${String(asOf)}`);
  }
  const window = windowCandles(candles);
  if (window.length === 0) return [];
  const seeded = seedPools(window);
  const lived = applyLifecycle(seeded, window, asOf);
  const series = computeATR(window);
  const atr = series.length === 0 ? 0 : series[series.length - 1];
  const merged = mergePools(lived, atr);
  // D-16 / WR-07: sort by originDate before the trailing-20 slice so the map
  // and Phase 20 prose agree on what is current, even for unsorted input.
  // The cap keeps the newest N by originDate, then the kept set is ranked so
  // the returned array is rank-ordered. Cap BEFORE rank: the inventory bound
  // is a map-plane concern (newest wins), ranking is a view-plane concern.
  const kept = capPools(merged);
  return scoreAndRank(kept, window, bias).pools;
}
