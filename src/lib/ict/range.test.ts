import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW, checkReanchor, computeRange } from '@/src/lib/ict/range';

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

describe('range: D-06 close-only re-anchor rule table', () => {
  it('strict close beyond either extreme retires and re-anchors over the trailing window', () => {
    const candles = trend(20, 20000);
    const prior = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    const breakoutUp = candle('2026-01-25', prior.high + 500);
    const breakoutDown = candle('2026-01-25', prior.low - 500);
    expect(checkReanchor(prior, breakoutUp)).toBe(true);
    expect(checkReanchor(prior, breakoutDown)).toBe(true);
    const extended = [...candles.slice(1), breakoutUp];
    const next = computeRange(extended, breakoutUp.date, ANCHOR_WINDOW);
    expect(next.high).toBeGreaterThanOrEqual(breakoutUp.high);
    expect(next.asOf).toBe(breakoutUp.date);
  });

  it('wick pierce with close inside does nothing', () => {
    const candles = trend(20, 20000);
    const prior = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    const raid = candle('2026-01-25', prior.high - 100, {
      high: prior.high + 300,
      close: prior.high - 50,
    });
    expect(raid.high).toBeGreaterThan(prior.high);
    expect(checkReanchor(prior, raid)).toBe(false);
    const lowRaid = candle('2026-01-25', prior.low + 100, {
      low: prior.low - 300,
      close: prior.low + 50,
    });
    expect(lowRaid.low).toBeLessThan(prior.low);
    expect(checkReanchor(prior, lowRaid)).toBe(false);
  });

  it('close exactly equal to either extreme does not re-anchor', () => {
    const candles = trend(20, 20000);
    const prior = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    expect(checkReanchor(prior, candle('2026-01-25', prior.high - 5, { close: prior.high }))).toBe(false);
    expect(checkReanchor(prior, candle('2026-01-25', prior.low + 5, { close: prior.low }))).toBe(false);
  });

  it('repeated evaluation on same input returns identical flags and anchors', () => {
    const candles = trend(20, 20000);
    const first = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    const second = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    expect(second).toEqual(first);
    const probe = candle('2026-01-25', first.high + 500);
    expect(checkReanchor(first, probe)).toBe(checkReanchor(second, probe));
  });

  it('forming rows never affect anchors or retire checks', () => {
    const candles = trend(20, 20000);
    const prior = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    const formingBreak = candle('2026-01-25', prior.high + 500, { forming: true });
    expect(checkReanchor(prior, formingBreak)).toBe(false);
    const withForming = [...candles, formingBreak];
    expect(computeRange(withForming, prior.asOf, ANCHOR_WINDOW)).toEqual(prior);
  });
});
