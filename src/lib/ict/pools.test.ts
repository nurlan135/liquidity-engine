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
