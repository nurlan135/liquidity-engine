import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import {
  BEHIND_PENALTY,
  detectPools,
  DOL_BOOST,
  EQUAL_TOL_BPS,
  evaluatePools,
  MERGE_ATR_MULT,
  POOL_MAP_BOUND,
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
