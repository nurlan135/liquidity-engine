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

// Thin scorer (D-06/D-07/D-08/D-09): score = weight x dolBoost / (1 + distAtr)
// with distAtr in ATR units (NQ scale-invariant). DOL-side boost 2.0,
// behind-price penalty 0.25 multiplicative. Zero-or-empty ATR refuses to
// rank — unscored ACTIVE order is returned, never a divide by zero (T-19-01).
function scoreAndRank(
  pools: LiquidityPool[],
  closed: Candle[],
  bias: 'BULLISH' | 'BEARISH' | 'COMPRESSION',
): LiquidityPool[] {
  if (pools.length === 0) return [];
  const series = computeATR(closed);
  if (series.length === 0) {
    return pools;
  }
  const atr = series[series.length - 1];
  if (!Number.isFinite(atr) || atr <= 0) {
    return pools;
  }
  const lastClose = closed[closed.length - 1].close;
  if (!Number.isFinite(lastClose)) {
    return pools;
  }
  const boosted = dolSide(closed, bias);
  const scored = pools.map((pool) => {
    const mid = poolMid(pool);
    const distAtr = Math.abs(mid - lastClose) / atr;
    const dolBoost = pool.side === boosted ? DOL_BOOST : 1.0;
    const behind =
      (pool.side === 'BSL' && mid < lastClose) || (pool.side === 'SSL' && mid > lastClose);
    const penalty = behind ? BEHIND_PENALTY : 1.0;
    return { pool, score: (pool.weight * dolBoost * penalty) / (1 + distAtr) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.pool);
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

// Full thin pipeline: detect plus thin lifecycle honoring asOf plus thin
// scorer plus WR-07 origin-sort-before-slice cap (POOL_MAP_BOUND newest-N).
// bias defaults to COMPRESSION (nearer-extreme DOL) when the caller has no
// bias read; the Plan 02 selector composes the real bias thread.
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
  const ranked = scoreAndRank(lived, window, bias);
  // D-16 / WR-07: sort by originDate before the trailing-20 slice so the map
  // and Phase 20 prose agree on what is current, even for unsorted input.
  // Rank orders first (D-06), then the cap keeps the newest N by originDate,
  // then the kept set is re-ranked so the returned array is rank-ordered.
  const kept = [...ranked]
    .sort((a, b) => (a.originDate < b.originDate ? -1 : a.originDate > b.originDate ? 1 : 0))
    .slice(-POOL_MAP_BOUND);
  return scoreAndRank(kept, window, bias);
}
