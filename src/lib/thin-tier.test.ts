import { describe, expect, it } from 'vitest';
import type { Candle, DealingRange } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW, computeRange } from '@/src/lib/ict/range';
import { MIN_CANDLES_FULL } from '@/src/lib/ict/regime';
import {
  resolveThinTier,
  thinBannerOrder,
  thinTier,
  thinTierCopy,
} from '@/src/lib/thin-tier';

function flatCandle(date: string, price: number, overrides: Partial<Candle> = {}): Candle {
  return { date, open: price, high: price + 2, low: price - 2, close: price, ...overrides };
}

function flatSeries(n: number, price = 20000): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(i + 1).padStart(2, '0');
    out.push(flatCandle(`2026-01-${day}`, price));
  }
  return out;
}

function anyRange(): DealingRange {
  return computeRange(flatSeries(40), '2026-03-01');
}

describe('thin-tier: tier truth from math constants', () => {
  it('pins the boundary tiers: 19 thin, 20 degraded, 33 degraded, 34 full', () => {
    expect(thinTier(19)).toBe('range-thin');
    expect(thinTier(20)).toBe('regime-degraded');
    expect(thinTier(33)).toBe('regime-degraded');
    expect(thinTier(34)).toBe('full');
  });

  it('range-thin holds exactly when closed count is below ANCHOR_WINDOW (same predicate as computeRange thinHistory)', () => {
    for (const n of [1, 5, 19, 20, 25, 33, 34, 40]) {
      const range = computeRange(flatSeries(n), '2026-03-01');
      expect(thinTier(n) === 'range-thin').toBe(range.thinHistory);
    }
  });

  it('resolveThinTier returns null for a null range', () => {
    expect(resolveThinTier(flatSeries(5), null)).toBeNull();
  });

  it('resolveThinTier counts closedOnly candles (20 rows with 1 forming yields 19 closed yielding range-thin)', () => {
    const candles = [...flatSeries(19), flatCandle('2026-01-20', 20000, { forming: true })];
    expect(candles).toHaveLength(20);
    const out = resolveThinTier(candles, anyRange());
    expect(out).toEqual({ tier: 'range-thin', closedCount: 19 });
  });

  it('resolveThinTier returns full tier with the closed count for 40 closed candles', () => {
    const out = resolveThinTier(flatSeries(40), anyRange());
    expect(out).toEqual({ tier: 'full', closedCount: 40 });
  });

  it('resolveThinTier never throws and returns null on unexpected input', () => {
    expect(resolveThinTier(null as unknown as Candle[], anyRange())).toBeNull();
    expect(resolveThinTier(flatSeries(5), undefined as unknown as DealingRange)).toBeNull();
  });

  it('thinTierCopy returns the verbatim Tier-1 string for count 5', () => {
    expect(thinTierCopy('range-thin', 5)).toBe(
      'Nazik tarixçə · 5 / 20 şam — ekstremumlar etibarsızdır, zonalar və səviyyələr ilkin göstərilir.',
    );
  });

  it('thinTierCopy returns the verbatim Tier-2 string for count 25', () => {
    expect(thinTierCopy('regime-degraded', 25)).toBe(
      'Sıxılma · 25 / 34 şam — tarixçə tam deyil, zonalar və səviyyələr ilkin göstərilir.',
    );
  });

  it('thinBannerOrder stacks thin first when both show', () => {
    expect(thinBannerOrder(true, true)).toEqual(['thin', 'rollover']);
    expect(thinBannerOrder(true, false)).toEqual(['thin']);
    expect(thinBannerOrder(false, true)).toEqual(['rollover']);
    expect(thinBannerOrder(false, false)).toEqual([]);
  });

  it('pinned threshold constants match the math contract', () => {
    expect(ANCHOR_WINDOW).toBe(20);
    expect(MIN_CANDLES_FULL).toBe(34);
  });
});
