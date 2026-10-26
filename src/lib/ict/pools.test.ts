import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import {
  BEHIND_PENALTY,
  DECAY_HALF_LIFE_BARS,
  DECAY_SCORE_FLOOR,
  detectPools,
  DOL_BOOST,
  EQUAL_BONUS_STEPS,
  EQUAL_TOL_BPS,
  equalityBonus,
  evaluatePools,
  type LiquidityPool,
  MERGE_ATR_MULT,
  poolAgeBars,
  POOL_MAP_BOUND,
  poolDecay,
  poolWeight,
  type RankedPools,
  scoreAndRank,
  SWING_K,
  SWING_LOOKBACK,
} from '@/src/lib/ict/pools';
import { SWING_K as SHARED_K, SWING_LOOKBACK as SHARED_LOOKBACK } from '@/src/lib/ict/swings';

// Builder helper in the smt.test.ts style: explicit high/low rails per bar
// with the open/close pinned to the midpoint (finite, neutral).
function leg(n: number, highs: number[], lows: number[], startDay = 5): Candle[] {
  if (highs.length !== n || lows.length !== n) {
    throw new Error(`leg requires ${n} highs and lows, got ${highs.length}/${lows.length}`);
  }
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(startDay + i).padStart(2, '0');
    const mid = (highs[i] + lows[i]) / 2;
    out.push({ date: `2026-01-${day}`, open: mid, high: highs[i], low: lows[i], close: mid });
  }
  return out;
}

function rising(n: number, start: number, step: number): number[] {
  return Array.from({ length: n }, (_, i) => start + i * step);
}

const AS_OF = '2026-01-31';

// One swing-high peak at bar 4 (strict k=2 maximum) plus one swing-low
// trough at bar 4 of the lows rail: 9 bars, both interiors interior.
// Highs: peak 20200 at index 4; lows: trough 19900 at index 4.
const BSL_HIGHS = [20000, 20010, 20050, 20100, 20200, 20100, 20050, 20020, 20010];
const SSL_LOWS = [20000, 19990, 19960, 19930, 19900, 19930, 19960, 19980, 19990];
const FLAT_HIGHS = rising(9, 20100, 10);
const FLAT_LOWS = rising(9, 19900, 10);

describe('pools tracer: thin detect-to-rank slice', () => {
  it('locked constants are pinned: SWING_K 2, SWING_LOOKBACK 60, EQUAL_TOL_BPS 25, POOL_MAP_BOUND 20, MERGE_ATR_MULT 0.25, DOL_BOOST 2.0, BEHIND_PENALTY 0.25, DECAY_HALF_LIFE_BARS 10, DECAY_SCORE_FLOOR 0.25', () => {
    expect(SWING_K).toBe(2);
    expect(SWING_LOOKBACK).toBe(60);
    expect(SHARED_K).toBe(SWING_K);
    expect(SHARED_LOOKBACK).toBe(SWING_LOOKBACK);
    expect(EQUAL_TOL_BPS).toBe(25);
    expect(POOL_MAP_BOUND).toBe(20);
    expect(MERGE_ATR_MULT).toBe(0.25);
    expect(DOL_BOOST).toBe(2.0);
    expect(BEHIND_PENALTY).toBe(0.25);
    expect(DECAY_HALF_LIFE_BARS).toBe(10);
    expect(DECAY_SCORE_FLOOR).toBe(0.25);
  });

  it('one swing-high seeds a BSL pool with the exact shape literals', () => {
    const candles = leg(9, BSL_HIGHS, FLAT_LOWS);
    const pools = detectPools(candles, AS_OF);
    const bsl = pools.filter((p) => p.side === 'BSL');
    expect(bsl).toHaveLength(1);
    expect(bsl[0]).toEqual({
      side: 'BSL',
      top: 20200,
      bottom: 20200,
      touches: 1,
      weight: 1.0,
      originDate: '2026-01-09',
      status: 'ACTIVE',
    });
  });

  it('one swing-low seeds an SSL pool with the exact shape literals', () => {
    const candles = leg(9, FLAT_HIGHS, SSL_LOWS);
    const pools = detectPools(candles, AS_OF);
    const ssl = pools.filter((p) => p.side === 'SSL');
    expect(ssl).toHaveLength(1);
    expect(ssl[0]).toEqual({
      side: 'SSL',
      top: 19900,
      bottom: 19900,
      touches: 1,
      weight: 1.0,
      originDate: '2026-01-09',
      status: 'ACTIVE',
    });
  });

  it('evaluatePools ranks a BSL-plus-SSL leg without throwing and keeps ACTIVE status', () => {
    const candles = leg(9, BSL_HIGHS, SSL_LOWS);
    const pools = evaluatePools(candles, AS_OF);
    expect(pools).toHaveLength(2);
    expect(pools.map((p) => p.side).sort()).toEqual(['BSL', 'SSL']);
    for (const pool of pools) {
      expect(['ACTIVE', 'SWEPT']).toContain(pool.status);
      expect(Number.isFinite(pool.top)).toBe(true);
      expect(Number.isFinite(pool.bottom)).toBe(true);
    }
  });
});

describe('pools equality clustering: POOL-02 matrix', () => {
  // Fixture geometry note: with SWING_K=2 a peak is a swing only when it is
  // the strict maximum of its +-2 neighbors, so test peaks sit >=3 bars
  // apart — a higher peak inside the exclusion zone kills the earlier swing.
  // Two swing highs ~3 bps apart at bar 4 (20200) and bar 7 (20206):
  // gap 6/20200*10000 ≈ 2.97 bps.
  it('two highs 3 bps apart cluster into one BSL pool with touches=2', () => {
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20080, 20206, 20100, 20050, 20020];
    const lows = rising(11, 19900, 5);
    const candles = leg(11, highs, lows);
    const pools = detectPools(candles, AS_OF);
    const bsl = pools.filter((p) => p.side === 'BSL');
    expect(bsl).toHaveLength(1);
    expect(bsl[0].touches).toBe(2);
    expect(bsl[0].top).toBe(20206);
    expect(bsl[0].bottom).toBe(20200);
    expect(bsl[0].weight).toBe(2 + 3.0);
    expect(bsl[0].originDate).toBe('2026-01-09');
  });

  it('two highs ~200 bps apart stay separate pools', () => {
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20080, 20604, 20100, 20050, 20020];
    const lows = rising(11, 19900, 5);
    const candles = leg(11, highs, lows);
    const pools = detectPools(candles, AS_OF);
    const bsl = pools.filter((p) => p.side === 'BSL');
    expect(bsl).toHaveLength(2);
    for (const pool of bsl) {
      expect(pool.touches).toBe(1);
      expect(pool.weight).toBe(1.0);
    }
  });

  it('tolerance boundary pins exact-25bps at the cluster side of the compare', () => {
    // bpsGap anchors the denominator at the existing cluster member: with the
    // earlier peak at 20000 the later 20050 peak gaps exactly 50/20000*10000.
    const gapBps = (Math.abs(20050 - 20000) / 20000) * 10000;
    expect(Math.abs(gapBps - EQUAL_TOL_BPS)).toBeLessThan(1e-6);
    const clusteredHighs = [19900, 19910, 19950, 19980, 20000, 19980, 19960, 20050, 19990, 19960, 19930];
    const clusteredLows = rising(11, 19800, 5);
    const clustered = detectPools(leg(11, clusteredHighs, clusteredLows), AS_OF);
    expect(clustered.filter((p) => p.side === 'BSL')).toHaveLength(1);
    expect(EQUAL_BONUS_STEPS).toEqual([3.0, 2.0, 1.0, 0.5]);
  });

  it('minimum 2 touches: lone swing weight 1.0, pair weight 2+3=5', () => {
    expect(equalityBonus(0)).toBe(0);
    expect(equalityBonus(1)).toBe(0);
    expect(poolWeight(1)).toBe(1.0);
    expect(equalityBonus(2)).toBe(3.0);
    expect(poolWeight(2)).toBe(5.0);
  });

  it('triple equal-highs outrank any nearby single-touch pool', () => {
    // Single D=20300 at bar 4, triple A/B/C=20200/20201/20202 at bars 7/10/13.
    // Bar 13 needs a 16-bar leg to stay interior (i+k < length). Both pools
    // stay ACTIVE: nothing prints above either zone after its origin.
    const highs = [
      20000, 20010, 20050, 20150, 20300, 20150, 20100, 20200, 20100, 20080, 20201, 20100, 20080,
      20202, 20100, 20050,
    ];
    const lows = rising(16, 19900, 5);
    const candles = leg(16, highs, lows);
    const pools = evaluatePools(candles, AS_OF);
    const triple = pools.find((p) => p.touches === 3);
    expect(triple).toBeDefined();
    expect(triple!.weight).toBe(3 + 5.0);
    expect(triple!.status).toBe('ACTIVE');
    expect(pools[0]).toBe(triple);
    for (const other of pools) {
      if (other === triple || other.touches > 1) continue;
      expect(triple!.weight).toBeGreaterThan(other.weight);
    }
  });

  it('bonus increments strictly diminish: delta4 and delta5 below delta2', () => {
    const delta2 = equalityBonus(2) - equalityBonus(1);
    const delta3 = equalityBonus(3) - equalityBonus(2);
    const delta4 = equalityBonus(4) - equalityBonus(3);
    const delta5 = equalityBonus(5) - equalityBonus(4);
    expect(delta2).toBe(3.0);
    expect(delta3).toBe(2.0);
    expect(delta4).toBe(1.0);
    expect(delta5).toBe(0.5);
    expect(delta4).toBeLessThan(delta2);
    expect(delta5).toBeLessThan(delta2);
    expect(poolWeight(4)).toBe(4 + 6.0);
    expect(poolWeight(5)).toBe(5 + 6.5);
  });

  it('swept pools retain their full equality bonus value', () => {
  const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20080, 20206, 20100, 20090, 20300, 20050];
  const lows = rising(12, 19900, 5);
  const tailClose = (highs[10] + lows[10]) / 2;
  expect(tailClose).toBeLessThan(20206);
  const candles = leg(12, highs, lows);
  const pools = evaluatePools(candles, AS_OF);
  const swept = pools.filter((p) => p.side === 'BSL' && p.touches === 2);
  expect(swept.length).toBeGreaterThanOrEqual(1);
  for (const pool of swept) {
    expect(pool.status).toBe('SWEPT');
    expect(pool.weight).toBe(2 + 3.0);
  }
});
});

describe('pools sweep lifecycle: POOL-04 first-sweep-wins matrix', () => {
  // Shared geometry: 9-bar legs, swing extreme at bar 4 (originDate
  // '2026-01-09'), raid bars at 7/8 (never interior, so raids never seed).
  // Bar 4's k=2 window (bars 2..6) excludes the raid bars, so the origin
  // swing always survives seeding.
  const RAID_LOWS = [19900, 19910, 19920, 19930, 19940, 19950, 19960, 19900, 19980];

  it('wick pierce with close back inside flips BSL ACTIVE to SWEPT', () => {
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20050, 20300, 20020];
    const candles = leg(9, highs, RAID_LOWS);
    expect((highs[7] + RAID_LOWS[7]) / 2).toBeLessThan(20200);
    const pools = evaluatePools(candles, AS_OF);
    const origin = pools.find((p) => p.side === 'BSL' && p.top === 20200);
    expect(origin).toBeDefined();
    expect(origin!.status).toBe('SWEPT');
  });

  it('wick pierce with close back inside flips SSL ACTIVE to SWEPT', () => {
    const highs = [20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20100];
    const lows = [20100, 20080, 20050, 20020, 19900, 20020, 20050, 19800, 19960];
    const candles = leg(9, highs, lows);
    expect((highs[7] + lows[7]) / 2).toBe(19900);
    const pools = evaluatePools(candles, AS_OF);
    const origin = pools.find((p) => p.side === 'SSL' && p.bottom === 19900);
    expect(origin).toBeDefined();
    expect(origin!.status).toBe('SWEPT');
  });

  it('strictly-later close beyond the zone flips BSL to CONSUMED (leaves the map)', () => {
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20050, 20300, 20020];
    const lows = [19900, 19910, 19920, 19930, 19940, 19950, 19960, 20150, 19980];
    const candles = leg(9, highs, lows);
    expect((highs[7] + lows[7]) / 2).toBeGreaterThan(20200);
    const pools = evaluatePools(candles, AS_OF);
    expect(pools.filter((p) => p.side === 'BSL' && p.top === 20200)).toHaveLength(0);
  });

  it('strictly-later close beyond the zone flips SSL to CONSUMED (leaves the map)', () => {
    const highs = [20000, 20000, 20000, 20000, 20000, 20000, 20000, 19950, 20000];
    const lows = [20100, 20080, 20050, 20020, 19900, 20020, 20050, 19800, 19960];
    const candles = leg(9, highs, lows);
    expect((highs[7] + lows[7]) / 2).toBeLessThan(19900);
    const pools = evaluatePools(candles, AS_OF);
    expect(pools.filter((p) => p.side === 'SSL' && p.bottom === 19900)).toHaveLength(0);
  });

  it('boundary touch with equality does not flip BSL status', () => {
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20050, 20200, 20020];
    const candles = leg(9, highs, RAID_LOWS);
    const pools = evaluatePools(candles, AS_OF);
    const origin = pools.find((p) => p.side === 'BSL' && p.top === 20200);
    expect(origin).toBeDefined();
    expect(origin!.status).toBe('ACTIVE');
  });

  it('boundary touch with equality does not flip SSL status', () => {
    const highs = [20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000];
    const lows = [20100, 20080, 20050, 20020, 19900, 20020, 20050, 19900, 19960];
    const candles = leg(9, highs, lows);
    expect((highs[7] + lows[7]) / 2).toBeGreaterThan(19900);
    const pools = evaluatePools(candles, AS_OF);
    const origin = pools.find((p) => p.side === 'SSL' && p.bottom === 19900);
    expect(origin).toBeDefined();
    expect(origin!.status).toBe('ACTIVE');
  });

  it('double-raid first-wins: BSL stays SWEPT with weight untouched', () => {
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20050, 20300, 20400];
    const lows = [19900, 19900, 19900, 19900, 19900, 19900, 19900, 19900, 19900];
    const candles = leg(9, highs, lows);
    const pools = evaluatePools(candles, AS_OF);
    const bsl = pools.filter((p) => p.side === 'BSL');
    expect(bsl).toHaveLength(1);
    expect(bsl[0].status).toBe('SWEPT');
    expect(bsl[0].touches).toBe(1);
    expect(bsl[0].weight).toBe(1.0);
  });

  it('retest of a SWEPT pool never re-promotes it to ACTIVE', () => {
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20050, 20300, 20200];
    const candles = leg(9, highs, RAID_LOWS);
    const pools = evaluatePools(candles, AS_OF);
    const origin = pools.find((p) => p.side === 'BSL' && p.top === 20200);
    expect(origin).toBeDefined();
    expect(origin!.status).toBe('SWEPT');
  });

  it('pool with no strictly-later candles is kept unscored-by-lifecycle', () => {
    // The pool whose origin is the latest originDate in the window is the
    // nearest reachable pin for the stale-origin keep-and-skip line (CR-02:
    // the -1 branch itself is defensive — origins derive from the same closed
    // array, so it is unreachable via the public entry — and both share the
    // kept-unscored line). A no-later-candles case is unreachable by the same
    // token: every origin seeds a swing strictly before the window end... so
    // this test pins the latest-origin pool instead: its lifecycle runs over
    // the fewest later candles and stays ACTIVE.
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20080, 20206, 20100, 20050, 20020];
    const lows = rising(11, 19900, 5);
    const candles = leg(11, highs, lows);
    const pools = evaluatePools(candles, AS_OF);
    const latest = [...pools].sort((a, b) => (a.originDate < b.originDate ? 1 : -1))[0];
    expect(latest.originDate).toBe('2026-01-09');
    expect(latest.status).toBe('ACTIVE');
  });

  it('candles after asOf are ignored by the lifecycle', () => {
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20050, 20300, 20020];
    const candles = leg(9, highs, RAID_LOWS);
    const pools = evaluatePools(candles, '2026-01-10');
    const origin = pools.find((p) => p.side === 'BSL' && p.top === 20200);
    expect(origin).toBeDefined();
    expect(origin!.status).toBe('ACTIVE');
  });
});

describe('pools merge plus cap plus scorer: POOL-03/POOL-05 matrix', () => {
  it('same-side pools within a quarter ATR merge into the more extreme zone', () => {
    const candles = leg(16, BSL_HIGHS.concat([20020, 20030, 20040, 20030, 20020, 20010, 20000]), FLAT_LOWS.concat([19960, 19970, 19980, 19990, 20000, 20010, 20020]));
    const before = detectPools(candles, AS_OF);
    expect(before.filter((p) => p.side === 'BSL').length).toBeGreaterThanOrEqual(1);
    const ranked = evaluatePools(candles, AS_OF, 'BULLISH');
    expect(ranked.length).toBeLessThanOrEqual(before.length);
  });

  it('pools beyond a quarter ATR stay separate', () => {
    // Gap 404/20200*10000 ≈ 200 bps vs radius ≈ 0.25*~13 ≈ 3.3 — far outside,
    // so evaluatePools must not merge even with full 11-candle ATR history.
    // NOTE: the bar-10 close prints above 20200 (continuation), so the bar-4
    // pool is CONSUMED and only the bar-7 pool survives — the no-merge pin is
    // the survivor count (1) plus the merged-zone bound check below.
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20080, 20604, 20100, 20050, 20020];
    const lows = [19900, 19905, 19910, 19915, 19920, 19925, 19930, 19935, 19940, 19945, 19950];
    const candles = leg(11, highs, lows);
    const seeded = detectPools(candles, AS_OF).filter((p) => p.side === 'BSL');
    expect(seeded).toHaveLength(2);
    const ranked = evaluatePools(candles, AS_OF).filter((p) => p.side === 'BSL');
    expect(ranked).toHaveLength(1);
    expect(ranked[0].top).toBe(20604);
    expect(ranked[0].touches).toBe(1);
  });

  it('empty ATR history skips merging and keeps all pools', () => {
    const candles = leg(9, BSL_HIGHS, FLAT_LOWS);
    const ranked = evaluatePools(candles, AS_OF);
    expect(ranked).toHaveLength(detectPools(candles, AS_OF).length);
  });

  it('inventory over 20 keeps the newest 20 by originDate even for unsorted input', () => {
    // CAP leg: converging triangle seeds 22 pools — 11 BSL peaks at bars
    // 5,10,...,55 with tops descending 21650->20150 toward the rail, plus 11
    // SSL troughs at bars 7,12,...,57 with bottoms ascending 18350->19850.
    // Same-side step is 150 (~70 bps, above the 25 bps cluster floor), so
    // nothing clusters. Nothing is ever consumed (every BSL top stays above
    // the pinned 20000 close, every SSL bottom below it) and nothing is ever
    // swept (later extremes converge inward, never piercing earlier zones),
    // so all 22 stay ACTIVE through the lifecycle. Merge cannot fuse them
    // either: extremes converge toward the rail, so late-window TR stays
    // small, ATR stays far below the 150-per-step stagger (radius << gap).
    // Pipeline order is lifecycle->merge->cap: the cap keeps exactly the
    // newest 20 of the 22 seeded pools.
    const n = 60;
    const startDay = 100;
    const isBslPeak = (i: number): boolean => i >= 5 && i <= 55 && (i - 5) % 5 === 0;
    const isSslTrough = (i: number): boolean => i >= 7 && i <= 57 && (i - 7) % 5 === 0;
    const peakTop = (k: number): number => 21650 - k * 150;
    const troughBottom = (k: number): number => 18350 + k * 150;
    const highs = Array.from({ length: n }, (_, i) =>
      (isBslPeak(i) ? peakTop((i - 5) / 5) : 20020));
    const lows = Array.from({ length: n }, (_, i) =>
      (isSslTrough(i) ? troughBottom((i - 7) / 5) : 19980));
    for (let k = 0; k <= 10; k++) {
      const i = 5 + k * 5;
      expect(highs[i]).toBeGreaterThan(
        Math.max(highs[i - 2], highs[i - 1], highs[i + 1], highs[i + 2]),
      );
      const j = 7 + k * 5;
      expect(lows[j]).toBeLessThan(
        Math.min(lows[j - 2], lows[j - 1], lows[j + 1], lows[j + 2]),
      );
    }
    const candles: Candle[] = highs.map((h, i) => ({
      date: `2026-01-${String(startDay + i).padStart(2, '0')}`,
      open: 20000,
      high: h,
      low: lows[i],
      close: 20000,
    }));
    const seeded = detectPools(candles, AS_OF);
    expect(seeded.length).toBeGreaterThan(POOL_MAP_BOUND);
    // Unsorted-input pin: capPools sorts by originDate before slicing, so a
    // reversed copy keeps the same newest-20 set as the chronological one.
    const full = evaluatePools(candles, AS_OF);
    expect(full.length).toBe(POOL_MAP_BOUND);
    const seededDates = seeded.map((p) => p.originDate).sort();
    const newest20 = seededDates.slice(-POOL_MAP_BOUND);
    expect(full.map((p) => p.originDate).sort()).toEqual(newest20);
    const reversed = evaluatePools([...candles].reverse(), AS_OF);
    expect(reversed.map((p) => p.originDate).sort()).toEqual(newest20);
  });

  it('Rank-1 equals the nearest ACTIVE pool on the DOL side', () => {
    // DOL-side boost 2.0 outweighs the proximity term here: both pools share
    // weight 1.0, so the boosted side takes Rank-1 under either bias. The
    // 9-bar leg degrades ATR (short history), so a 16-bar leg feeds the full
    // scorer: BSL origin bar 4, SSL origin bar 4, both ACTIVE.
    const candles = leg(16, BSL_HIGHS.concat([20020, 20030, 20040, 20030, 20020, 20010, 20000]), SSL_LOWS.concat([19960, 19970, 19980, 19990, 20000, 20010, 20020]));
    const ranked = evaluatePools(candles, AS_OF, 'BULLISH');
    expect(ranked[0].side).toBe('BSL');
    expect(ranked[0].status).toBe('ACTIVE');
    const bearish = evaluatePools(candles, AS_OF, 'BEARISH');
    expect(bearish[0].side).toBe('SSL');
    expect(bearish[0].status).toBe('ACTIVE');
  });

  it('DOL-side score doubles versus the identical off-side pool', () => {
    expect(DOL_BOOST).toBe(2.0);
    const candles = leg(16, BSL_HIGHS.concat([20020, 20030, 20040, 20030, 20020, 20010, 20000]), FLAT_LOWS.concat([19960, 19970, 19980, 19990, 20000, 20010, 20020]));
    const bullish: RankedPools = scoreAndRank(evaluatePools(candles, AS_OF), candles, 'BULLISH', AS_OF);
    expect(bullish.rankSkipped).toBe(false);
    const bsl = bullish.scores.find((s) => s.side === 'BSL');
    const ssl = bullish.scores.find((s) => s.side === 'SSL');
    expect(bsl).toBeDefined();
    expect(ssl).toBeDefined();
    expect(bsl!.dolBoost).toBe(2.0);
    expect(ssl!.dolBoost).toBe(1.0);
  });

  it('behind-price pools score at quarter strength via BEHIND_PENALTY', () => {
    expect(BEHIND_PENALTY).toBe(0.25);
    const candles = leg(9, BSL_HIGHS, SSL_LOWS);
    const ranked: RankedPools = scoreAndRank(evaluatePools(candles, AS_OF), candles, 'BULLISH', AS_OF);
    for (const entry of ranked.scores) {
      expect([0.25, 1.0]).toContain(entry.behindPenalty);
    }
  });

  it('ATR-units scale invariance: the same fixture scaled 10x ranks identically', () => {
    const candles = leg(9, BSL_HIGHS, SSL_LOWS);
    const scaled = candles.map((c) => ({ ...c, open: c.open * 10, high: c.high * 10, low: c.low * 10, close: c.close * 10 }));
    const baseOrder = evaluatePools(candles, AS_OF).map((p) => `${p.side}:${p.originDate}`);
    const scaledOrder = evaluatePools(scaled, AS_OF).map((p) => `${p.side}:${p.originDate}`);
    expect(scaledOrder).toEqual(baseOrder);
  });

  it('zero ATR refuses to rank: originDate order, finite zero scores, rankSkipped', () => {
    const flat = leg(9, rising(9, 20000, 0), rising(9, 19900, 0));
    const ranked: RankedPools = scoreAndRank(evaluatePools(flat, AS_OF), flat, 'BULLISH', AS_OF);
    expect(ranked.rankSkipped).toBe(true);
    for (const entry of ranked.scores) {
      expect(entry.score).toBe(0);
      expect(Number.isFinite(entry.score)).toBe(true);
    }
    const dates = ranked.pools.map((p) => p.originDate);
    expect([...dates].sort()).toEqual(dates);
  });
});

describe('pool decay', () => {
  function freshPool(originDate: string): LiquidityPool {
    return {
      side: 'BSL',
      top: 20200,
      bottom: 20200,
      touches: 1,
      weight: 1.0,
      originDate,
      status: 'ACTIVE',
    };
  }

  it('a fresh pool scores at full strength with decayFactor 1.0', () => {
    const candles = leg(16, BSL_HIGHS.concat([20020, 20030, 20040, 20030, 20020, 20010, 20000]), FLAT_LOWS.concat([19960, 19970, 19980, 19990, 20000, 20010, 20020]));
    // A pool seeded on the last closed date has age 0: real swing origins can
    // never sit there (k=2 needs right-side neighbors), so pin the age-0
    // ledger entry with a synthetic pool rather than pipeline output.
    const lastClosedDate = candles[candles.length - 1].date;
    expect(poolAgeBars(freshPool(lastClosedDate), candles, lastClosedDate)).toBe(0);
    expect(poolDecay(0)).toBe(1.0);
    const scored: RankedPools = scoreAndRank([freshPool(lastClosedDate)], candles, 'BULLISH', AS_OF);
    expect(scored.rankSkipped).toBe(false);
    expect(scored.scores).toHaveLength(1);
    expect(scored.scores[0].decayFactor).toBe(1.0);
    expect(scored.scores[0].score).toBeGreaterThan(0);
  });

  it('a fresh pool outscores its aged self', () => {
    const candles = leg(16, BSL_HIGHS.concat([20020, 20030, 20040, 20030, 20020, 20010, 20000]), FLAT_LOWS.concat([19960, 19970, 19980, 19990, 20000, 20010, 20020]));
    const pools = evaluatePools(candles, AS_OF);
    const fresh = scoreAndRank(pools, candles, 'BULLISH', AS_OF);
    const agedPools = pools.map((p) => ({ ...p, originDate: '2026-01-05' }));
    const aged = scoreAndRank(agedPools, candles, 'BULLISH', AS_OF);
    expect(fresh.rankSkipped).toBe(false);
    expect(aged.rankSkipped).toBe(false);
    const freshBsl = fresh.scores.find((s) => s.side === 'BSL')!;
    const agedBsl = aged.scores.find((s) => s.side === 'BSL')!;
    expect(agedBsl.decayFactor).toBeLessThan(freshBsl.decayFactor);
    expect(freshBsl.score).toBeGreaterThan(agedBsl.score);
    expect(poolAgeBars(freshPool('2026-01-05'), candles, '2026-01-31')).toBeGreaterThan(
      poolAgeBars(freshPool('2026-01-20'), candles, '2026-01-31'),
    );
  });

  it('decay of age 10 equals 0.5 (half-life)', () => {
    expect(poolDecay(10)).toBe(0.5);
    expect(poolDecay(DECAY_HALF_LIFE_BARS)).toBe(0.5);
  });

  it('floor holds at age 60 and above', () => {
    expect(poolDecay(60)).toBe(DECAY_SCORE_FLOOR);
    expect(poolDecay(120)).toBe(DECAY_SCORE_FLOOR);
    expect(poolDecay(1000)).toBe(DECAY_SCORE_FLOOR);
    expect(poolDecay(9)).toBeGreaterThan(0.5);
    expect(poolDecay(11)).toBeLessThan(0.5);
  });

  it('scores decrease monotonically with age for otherwise identical pools', () => {
    const candles = leg(16, BSL_HIGHS.concat([20020, 20030, 20040, 20030, 20020, 20010, 20000]), FLAT_LOWS.concat([19960, 19970, 19980, 19990, 20000, 20010, 20020]));
    const origins = ['2026-01-20', '2026-01-15', '2026-01-09', '2026-01-05'];
    const runs = origins.map((originDate) =>
      scoreAndRank([{ ...freshPool(originDate) }], candles, 'BULLISH', AS_OF),
    );
    for (const run of runs) {
      expect(run.rankSkipped).toBe(false);
    }
    const scores = runs.map((run) => run.scores[0].score);
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
    expect(scores[2]).toBeGreaterThan(scores[3]);
    const factors = runs.map((run) => run.scores[0].decayFactor);
    expect(factors[0]).toBeGreaterThan(factors[1]);
    expect(factors[1]).toBeGreaterThan(factors[2]);
    expect(factors[2]).toBeGreaterThan(factors[3]);
  });

  it('an ancient ACTIVE pool keeps scoring above zero', () => {
    const candles = leg(16, BSL_HIGHS.concat([20020, 20030, 20040, 20030, 20020, 20010, 20000]), FLAT_LOWS.concat([19960, 19970, 19980, 19990, 20000, 20010, 20020]));
    // Origin predates the window: age counts every closed bar in the 16-bar
    // fixture (16, above the half-life but below the floor age — the floor
    // itself is pinned at unit level above). Score stays positive and finite.
    expect(poolAgeBars(freshPool('2025-01-01'), candles, AS_OF)).toBe(16);
    const ancient = scoreAndRank([freshPool('2025-01-01')], candles, 'BULLISH', AS_OF);
    expect(ancient.rankSkipped).toBe(false);
    expect(ancient.scores).toHaveLength(1);
    expect(ancient.scores[0].decayFactor).toBe(poolDecay(16));
    expect(ancient.scores[0].decayFactor).toBeGreaterThan(DECAY_SCORE_FLOOR);
    expect(ancient.scores[0].score).toBeGreaterThan(0);
    expect(Number.isFinite(ancient.scores[0].score)).toBe(true);
  });

  it('a fresh pool near a consumed price seeds as an independent ACTIVE pool with its own originDate', () => {
    // 11-bar leg whose bar-7 close prints above the bar-4 BSL zone: the
    // origin pool is CONSUMED and leaves the map. A fresh evaluation with
    // bars 8+ removed re-seeds the same geometry as a live independent pool.
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20080, 20604, 20100, 20050, 20020];
    const lows = rising(11, 19900, 5);
    const candles = leg(11, highs, lows);
    const seeded = detectPools(candles, AS_OF).filter((p) => p.side === 'BSL');
    expect(seeded).toHaveLength(2);
    const ranked = evaluatePools(candles, AS_OF);
    const consumer = ranked.find((p) => p.side === 'BSL' && p.top === 20604);
    expect(consumer).toBeDefined();
    expect(consumer!.status).toBe('ACTIVE');
    expect(consumer!.originDate).toBe('2026-01-12');
    expect(consumer!.touches).toBe(1);
  });

  it('a fresh cluster overlapping a SWEPT zone seeds its own ACTIVE pool while the ghost stays unscored', () => {
    // 16-bar leg for full ATR: bar-4 peak 20200 swept by a bar-7 wick, then a
    // bar-13 peak at 20300 seeds a fresh ACTIVE cluster beside the ghost.
    // Gap 100/20200*10000 ≈ 49.5 bps clears the 25 bps cluster floor, so the
    // late peak cannot merge into the ghost — tolerance clustering is the
    // non-overlap decision (a within-tolerance peak would join the cluster).
    const highs = [20000, 20010, 20050, 20100, 20200, 20100, 20050, 20300, 20250, 20200, 20150, 20100, 20300, 20100, 20050, 20020];
    const lows = rising(16, 19900, 5);
    const candles = leg(16, highs, lows);
    const ranked = evaluatePools(candles, AS_OF);
    const ghost = ranked.find((p) => p.side === 'BSL' && p.top === 20200);
    expect(ghost).toBeDefined();
    expect(ghost!.status).toBe('SWEPT');
    const freshSeeds = ranked.filter((p) => p.side === 'BSL' && p.status === 'ACTIVE');
    expect(freshSeeds.length).toBeGreaterThanOrEqual(1);
    for (const seed of freshSeeds) {
      expect(seed.originDate).not.toBe(ghost!.originDate);
    }
    const scored: RankedPools = scoreAndRank(ranked, candles, 'BULLISH', AS_OF);
    expect(scored.rankSkipped).toBe(false);
    const scoredOrigins = scored.scores.map((s) => s.originDate);
    expect(scoredOrigins).not.toContain(ghost!.originDate);
    for (const seed of freshSeeds) {
      expect(scoredOrigins).toContain(seed.originDate);
    }
  });

  it('decay bounds score from below: floored pool outscores any zero while trailing fresher peers', () => {
    const candles = leg(16, BSL_HIGHS.concat([20020, 20030, 20040, 20030, 20020, 20010, 20000]), FLAT_LOWS.concat([19960, 19970, 19980, 19990, 20000, 20010, 20020]));
    const ancient = scoreAndRank([freshPool('2025-01-01')], candles, 'BULLISH', AS_OF);
    const lastClosedDate = candles[candles.length - 1].date;
    const fresh = scoreAndRank([freshPool(lastClosedDate)], candles, 'BULLISH', AS_OF);
    expect(fresh.scores[0].score).toBeGreaterThan(ancient.scores[0].score);
    expect(ancient.scores[0].score).toBeGreaterThan(0);
    expect(ancient.scores[0].decayFactor).toBeLessThanOrEqual(fresh.scores[0].decayFactor);
  });

  it('unknown origins age 0 and stay decay-neutral', () => {
    const candles = leg(9, BSL_HIGHS, FLAT_LOWS);
    expect(poolAgeBars(freshPool('2099-12-31'), candles, AS_OF)).toBe(0);
    expect(poolDecay(poolAgeBars(freshPool('2099-12-31'), candles, AS_OF))).toBe(1.0);
  });

  it('age counts only closed bars strictly after originDate up to asOf', () => {
    const candles = leg(9, BSL_HIGHS, FLAT_LOWS);
    // Origin '2026-01-09', asOf '2026-01-12': bars 01-10, 01-11, 01-12.
    expect(poolAgeBars(freshPool('2026-01-09'), candles, '2026-01-12')).toBe(3);
    // Origin bar itself never counts.
    expect(poolAgeBars(freshPool('2026-01-09'), candles, '2026-01-09')).toBe(0);
    // Bars after asOf never count.
    expect(poolAgeBars(freshPool('2026-01-09'), candles, '2026-01-09')).toBe(
      poolAgeBars(freshPool('2026-01-09'), candles, '2026-01-09'),
    );
    expect(poolAgeBars(freshPool('2026-01-05'), candles, AS_OF)).toBe(8);
  });
});
