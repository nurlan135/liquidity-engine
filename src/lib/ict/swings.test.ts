import { describe, expect, it } from 'vitest';
import {
  isSwingHigh,
  isSwingLow,
  SWING_K,
  SWING_LOOKBACK,
} from '@/src/lib/ict/swings';

// Phase 19-03 regression pins (D-12, POOL-01): the shared swings extraction
// was move-only, so these pins plus the unmodified smt.test.ts gate prove
// zero behavior change. Mirror of the smt.test.ts leg() builder shape for
// the positive cases.
describe('swings: shared fractal contract pins', () => {
  it('locked constants are pinned: SWING_K 2, SWING_LOOKBACK 60', () => {
    expect(SWING_K).toBe(2);
    expect(SWING_LOOKBACK).toBe(60);
  });

  it('positive swing-high: strict k=2 maximum at the interior peak', () => {
    // Peak 20200 at index 2 with 2 strict lower neighbors each side.
    const highs = [20000, 20050, 20200, 20100, 20050];
    expect(isSwingHigh(highs, 2, SWING_K)).toBe(true);
  });

  it('positive swing-low: strict k=2 minimum at the interior trough', () => {
    // Trough 19900 at index 2 with 2 strict higher neighbors each side.
    const lows = [20000, 19950, 19900, 19950, 20000];
    expect(isSwingLow(lows, 2, SWING_K)).toBe(true);
  });

  it('strict-fractal edge: equal neighbor high means no swing high', () => {
    const highs = [20000, 20050, 20200, 20200, 20050];
    expect(isSwingHigh(highs, 2, SWING_K)).toBe(false);
    expect(isSwingHigh(highs, 3, SWING_K)).toBe(false);
  });

  it('strict-fractal edge: equal neighbor low means no swing low', () => {
    const lows = [20000, 19950, 19900, 19900, 20000];
    expect(isSwingLow(lows, 2, SWING_K)).toBe(false);
    expect(isSwingLow(lows, 3, SWING_K)).toBe(false);
  });

  it('k validation throws on zero, negative, and non-integer', () => {
    const highs = [20000, 20050, 20200, 20100, 20050];
    const lows = [20000, 19950, 19900, 19950, 20000];
    expect(() => isSwingHigh(highs, 2, 0)).toThrow(/got 0/);
    expect(() => isSwingHigh(highs, 2, -1)).toThrow(/got -1/);
    expect(() => isSwingHigh(highs, 2, 1.5)).toThrow(/got 1.5/);
    expect(() => isSwingLow(lows, 2, 0)).toThrow(/got 0/);
    expect(() => isSwingLow(lows, 2, -1)).toThrow(/got -1/);
    expect(() => isSwingLow(lows, 2, 1.5)).toThrow(/got 1.5/);
  });

  it('boundary indices: i below k and i+k beyond length return false', () => {
    const highs = [20000, 20050, 20200, 20100, 20050];
    const lows = [20000, 19950, 19900, 19950, 20000];
    // i < k: no full left window.
    expect(isSwingHigh(highs, 0, SWING_K)).toBe(false);
    expect(isSwingHigh(highs, 1, SWING_K)).toBe(false);
    expect(isSwingLow(lows, 0, SWING_K)).toBe(false);
    expect(isSwingLow(lows, 1, SWING_K)).toBe(false);
    // i + k >= length: no full right window.
    expect(isSwingHigh(highs, 3, SWING_K)).toBe(false);
    expect(isSwingHigh(highs, 4, SWING_K)).toBe(false);
    expect(isSwingLow(lows, 3, SWING_K)).toBe(false);
    expect(isSwingLow(lows, 4, SWING_K)).toBe(false);
  });
});
