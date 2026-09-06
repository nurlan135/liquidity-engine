import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW, computeRange } from '@/src/lib/ict/range';

function candle(date: string, price: number, overrides: Partial<Candle> = {}): Candle {
  return { date, open: price, high: price + 15, low: price - 12, close: price + 5, ...overrides };
}

function trend(n: number, startPrice: number, startDay = 5): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(startDay + i).padStart(2, '0');
    out.push(candle(`2026-01-${day}`, startPrice + i * 10));
  }
  return out;
}

// Rolling-recompute rule table: computeRange takes extremes over the trailing
// window rows including wicks, so re-anchoring is carried by recomputation —
// there is no separate close-only detector. A wick pierce with close inside
// extends the recomputed extreme (rolling-extremes semantic), which supersedes
// the old close-only detector expectation.
describe('range: D-08 rolling-recompute rule table', () => {
  it('close-break-extends: strict close beyond either extreme extends the recomputed range', () => {
    const candles = trend(20, 20000);
    const prior = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    const breakoutUp = candle('2026-01-25', prior.high + 500);
    const breakoutDown = candle('2026-01-25', prior.low - 500);
    const extendedUp = computeRange([...candles.slice(1), breakoutUp], breakoutUp.date, ANCHOR_WINDOW);
    expect(extendedUp.high).toBeGreaterThanOrEqual(breakoutUp.high);
    expect(extendedUp.asOf).toBe(breakoutUp.date);
    const extendedDown = computeRange([...candles.slice(1), breakoutDown], breakoutDown.date, ANCHOR_WINDOW);
    expect(extendedDown.low).toBeLessThanOrEqual(breakoutDown.low);
    expect(extendedDown.asOf).toBe(breakoutDown.date);
  });

  it('wick-pierce-extends-rolling-extremes: wick pierce with close inside extends the recomputed extreme', () => {
    const candles = trend(20, 20000);
    const prior = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    // Rolling-extremes semantic supersedes the old close-only detector: the
    // recomputed window includes wick highs and lows, so a pierce extends the
    // extreme even when the close stays inside the prior range.
    const raid = candle('2026-01-25', prior.high - 100, {
      high: prior.high + 300,
      close: prior.high - 50,
    });
    expect(raid.high).toBeGreaterThan(prior.high);
    const recomputedHigh = computeRange([...candles.slice(1), raid], raid.date, ANCHOR_WINDOW);
    expect(recomputedHigh.high).toBeGreaterThanOrEqual(raid.high);
    const lowRaid = candle('2026-01-25', prior.low + 100, {
      low: prior.low - 300,
      close: prior.low + 50,
    });
    expect(lowRaid.low).toBeLessThan(prior.low);
    const recomputedLow = computeRange([...candles.slice(1), lowRaid], lowRaid.date, ANCHOR_WINDOW);
    expect(recomputedLow.low).toBeLessThanOrEqual(lowRaid.low);
  });

  it('equality-holds: close exactly equal to either extreme leaves extremes unchanged', () => {
    const candles = trend(20, 20000);
    const prior = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    const touchHigh = candle('2026-01-25', prior.high - 5, { close: prior.high, high: prior.high });
    const touchLow = candle('2026-01-25', prior.low + 5, { close: prior.low, low: prior.low });
    const nextHigh = computeRange([...candles.slice(1), touchHigh], touchHigh.date, ANCHOR_WINDOW);
    expect(nextHigh.high).toBe(prior.high);
    const nextLow = computeRange([...candles.slice(1), touchLow], touchLow.date, ANCHOR_WINDOW);
    expect(nextLow.low).toBe(prior.low);
  });

  it('idempotent-recompute: repeated evaluation on identical input returns identical ranges', () => {
    const candles = trend(20, 20000);
    const first = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    const second = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    expect(second).toEqual(first);
    const probe = candle('2026-01-25', first.high + 500);
    const recomputedFirst = computeRange([...candles.slice(1), probe], probe.date, ANCHOR_WINDOW);
    const recomputedSecond = computeRange([...candles.slice(1), probe], probe.date, ANCHOR_WINDOW);
    expect(recomputedSecond).toEqual(recomputedFirst);
  });

  it('forming-excluded: forming rows never affect the recomputed range', () => {
    const candles = trend(20, 20000);
    const prior = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    const formingBreak = candle('2026-01-25', prior.high + 500, { forming: true });
    const withForming = [...candles, formingBreak];
    expect(computeRange(withForming, prior.asOf, ANCHOR_WINDOW)).toEqual(prior);
  });
});
