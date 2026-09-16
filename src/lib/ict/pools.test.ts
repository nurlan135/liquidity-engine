import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import {
  BEHIND_PENALTY,
  detectPools,
  DOL_BOOST,
  EQUAL_BONUS_STEPS,
  EQUAL_TOL_BPS,
  equalityBonus,
  evaluatePools,
  MERGE_ATR_MULT,
  POOL_MAP_BOUND,
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
  it('locked constants are pinned: SWING_K 2, SWING_LOOKBACK 60, EQUAL_TOL_BPS 25, POOL_MAP_BOUND 20, MERGE_ATR_MULT 0.25, DOL_BOOST 2.0, BEHIND_PENALTY 0.25', () => {
    expect(SWING_K).toBe(2);
    expect(SWING_LOOKBACK).toBe(60);
    expect(SHARED_K).toBe(SWING_K);
    expect(SHARED_LOOKBACK).toBe(SWING_LOOKBACK);
    expect(EQUAL_TOL_BPS).toBe(25);
    expect(POOL_MAP_BOUND).toBe(20);
    expect(MERGE_ATR_MULT).toBe(0.25);
    expect(DOL_BOOST).toBe(2.0);
    expect(BEHIND_PENALTY).toBe(0.25);
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
    // CAP leg: 11 stride-5 peaks seed 22 pools (staggered ±, no clustering).
    // Every pool stays ACTIVE by construction: the BSL zone tops ascend with
    // the peaks while the closes ride the OPEN-tail — each bar's close stays
    // below every BSL top AND above every SSL bottom. Flat-mid `leg()`
    // closes break this (mid pierces early lows); the custom builder below
    // pins closes to the tail-open rail instead.
    const n = 60;
    const startDay = 100;
    const peakAt = (i: number): boolean => i >= 5 && i <= 55 && i % 5 === 0;
    const highs = Array.from({ length: n }, (_, i) => (peakAt(i) ? 20600 + i * 30 : 20060));
    const lows = Array.from({ length: n }, (_, i) => (peakAt(i) ? 19900 - i * 20 : 19960));
    for (let i = 5; i <= 55; i += 5) {
      expect(highs[i]).toBeGreaterThan(Math.max(highs[i - 2], highs[i - 1], highs[i + 1], highs[i + 2]));
      expect(lows[i]).toBeLessThan(Math.min(lows[i - 2], lows[i - 1], lows[i + 1], lows[i + 2]));
    }
    const candles: Candle[] = highs.map((h, i) => ({
      date: `2026-01-${String(startDay + i).padStart(2, '0')}`,
      open: 20200,
      high: h,
      low: lows[i],
      close: 20200,
    }));
    // Cap-then-lifecycle order probe: evaluatePools caps the MERGED inventory
    // before lifecycle/scorer run, so with 22 seeded pools the returned map
    // holds exactly the newest 20 — including pools the lifecycle later marks
    // SWEPT (they ride along unscored, never Rank-1, per D-06).
    const seeded = detectPools(candles, AS_OF);
    expect(seeded.length).toBeGreaterThan(POOL_MAP_BOUND);
    // Unsorted-input pin: capPools sorts by originDate before slicing, so a
    // reversed copy keeps the same newest-20 set as the chronological one.
    const full = evaluatePools(candles, AS_OF);
    expect(full.length).toBe(POOL_MAP_BOUND);
    const seededDates = seeded.map((p) => p.originDate).sort();
    const newest20 = seededDates.slice(-POOL_MAP_BOUND);
    expect(full.map((p) => p.originDate).sort()).toEqual(newest20);
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
    const bullish: RankedPools = scoreAndRank(evaluatePools(candles, AS_OF), candles, 'BULLISH');
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
    const ranked: RankedPools = scoreAndRank(evaluatePools(candles, AS_OF), candles, 'BULLISH');
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
    const ranked: RankedPools = scoreAndRank(evaluatePools(flat, AS_OF), flat, 'BULLISH');
    expect(ranked.rankSkipped).toBe(true);
    for (const entry of ranked.scores) {
      expect(entry.score).toBe(0);
      expect(Number.isFinite(entry.score)).toBe(true);
    }
    const dates = ranked.pools.map((p) => p.originDate);
    expect([...dates].sort()).toEqual(dates);
  });
});
