// FVG map tests: polarity, mitigation, bound, constant pin.
// Builder style per rollover.test.ts: candle() + trend() with Partial overrides.

import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import { applyMitigation, detectFVGs, FVG_MAP_BOUND } from '@/src/lib/ict/fvg';

function candle(date: string, price: number, overrides: Partial<Candle> = {}): Candle {
  return { date, open: price, high: price + 15, low: price - 12, close: price + 5, ...overrides };
}

function dated(day: number): string {
  return `2026-01-${String(day).padStart(2, '0')}`;
}

describe('fvg: bullish polarity', () => {
  it('records a bullish gap with top = low[i+1] and bottom = high[i-1]', () => {
    const prev = candle(dated(5), 20000);
    const mid = candle(dated(6), 20010);
    const next = candle(dated(7), 20060, { low: prev.high + 10 });
    const gaps = detectFVGs([prev, mid, next]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].polarity).toBe('BULLISH');
    expect(gaps[0].top).toBe(next.low);
    expect(gaps[0].bottom).toBe(prev.high);
    expect(gaps[0].originDate).toBe(dated(6));
    expect(gaps[0].mitigated).toBe(false);
  });
});

describe('fvg: bearish polarity', () => {
  it('records a bearish gap with top = low[i-1] and bottom = high[i+1]', () => {
    const prev = candle(dated(5), 20000);
    const mid = candle(dated(6), 19990);
    const next = candle(dated(7), 19940, { high: prev.low - 10 });
    const gaps = detectFVGs([prev, mid, next]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].polarity).toBe('BEARISH');
    expect(gaps[0].top).toBe(prev.low);
    expect(gaps[0].bottom).toBe(next.high);
    expect(gaps[0].originDate).toBe(dated(6));
    expect(gaps[0].mitigated).toBe(false);
  });
});

describe('fvg: boundary equality is a touch, not a gap', () => {
  it('skips triples with equality on the boundary', () => {
    const prev = candle(dated(5), 20000);
    const mid = candle(dated(6), 20010);
    const next = candle(dated(7), 20060, { low: prev.high });
    expect(detectFVGs([prev, mid, next])).toHaveLength(0);
  });
});

describe('fvg: close-through mitigation', () => {
  it('removes a bullish gap once a later candle closes below the bottom', () => {
    const prev = candle(dated(5), 20000);
    const mid = candle(dated(6), 20010);
    const next = candle(dated(7), 20060, { low: prev.high + 10 });
    const candles = [prev, mid, next];
    const gaps = detectFVGs(candles);
    expect(gaps).toHaveLength(1);
    const bottom = gaps[0].bottom;
    const fill = candle(dated(8), 20000, { close: bottom - 5 });
    expect(applyMitigation(gaps, [...candles, fill])).toHaveLength(0);
  });

  it('keeps the gap on a wick touch without close-through', () => {
    const prev = candle(dated(5), 20000);
    const mid = candle(dated(6), 20010);
    const next = candle(dated(7), 20060, { low: prev.high + 10 });
    const candles = [prev, mid, next];
    const gaps = detectFVGs(candles);
    expect(gaps).toHaveLength(1);
    const touch = candle(dated(8), 20000, { low: gaps[0].bottom - 5, close: gaps[0].bottom + 5 });
    const active = applyMitigation(gaps, [...candles, touch]);
    expect(active).toHaveLength(1);
    expect(active[0].mitigated).toBe(false);
  });
});

describe('fvg: map bound', () => {
  it('stays bounded to the latest 20 gaps over a 200-bar history', () => {
    const candles: Candle[] = [];
    for (let i = 0; i < 200; i++) {
      const price = 20000 + i * 100;
      candles.push(
        candle(dated(1 + (i % 28)), price, {
          date: `hist-${String(i).padStart(3, '0')}`,
          high: price + 60,
          low: price + 40,
          close: price + 50,
        }),
      );
    }
    const gaps = detectFVGs(candles);
    expect(gaps.length).toBeGreaterThan(FVG_MAP_BOUND);
    const active = applyMitigation(gaps, candles);
    expect(active.length).toBeLessThanOrEqual(20);
    expect(active.length).toBe(FVG_MAP_BOUND);
    expect(active[active.length - 1].originDate).toBe(gaps[gaps.length - 1].originDate);
  });

  it('pins FVG_MAP_BOUND at 20', () => {
    expect(FVG_MAP_BOUND).toBe(20);
  });
});

describe('fvg: closedOnly discipline', () => {
  it('ignores forming candles when scanning', () => {
    const prev = candle(dated(5), 20000);
    const mid = candle(dated(6), 20010, { forming: true });
    const next = candle(dated(7), 20060, { low: prev.high + 10 });
    expect(detectFVGs([prev, mid, next])).toHaveLength(0);
  });
});
