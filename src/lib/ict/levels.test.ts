import { describe, expect, it } from 'vitest';
import type { Candle, DealingRange } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW, computeRange } from '@/src/lib/ict/range';
import { computeLevels } from '@/src/lib/ict/levels';

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

describe('levels: EQ quadrants OTE plus position', () => {
  it('EQ equals half sum of high and low', () => {
    const range: DealingRange = { high: 21000, low: 20000, eq: 20500, window: 20, asOf: '2026-01-24', thinHistory: false };
    const out = computeLevels(range, 20500);
    expect(out.eq).toBeCloseTo((21000 + 20000) / 2, 10);
  });

  it('quadrant lines sit at quarter and three-quarter fractions', () => {
    const range: DealingRange = { high: 21000, low: 20000, eq: 20500, window: 20, asOf: '2026-01-24', thinHistory: false };
    const out = computeLevels(range, 20500);
    expect(out.q1).toBeCloseTo(20000 + 0.25 * 1000, 10);
    expect(out.q3).toBeCloseTo(20000 + 0.75 * 1000, 10);
  });

  it('bull pocket measured down from the high, bear mirror measured up from the low', () => {
    const range: DealingRange = { high: 21000, low: 20000, eq: 20500, window: 20, asOf: '2026-01-24', thinHistory: false };
    const out = computeLevels(range, 20500);
    expect(out.bullOTE.lo).toBeCloseTo(21000 - 0.79 * 1000, 10);
    expect(out.bullOTE.hi).toBeCloseTo(21000 - 0.62 * 1000, 10);
    expect(out.bearOTE.lo).toBeCloseTo(20000 + 0.62 * 1000, 10);
    expect(out.bearOTE.hi).toBeCloseTo(20000 + 0.79 * 1000, 10);
  });

  it('price exactly at range high yields position 1.0 and at range low yields 0.0', () => {
    const range: DealingRange = { high: 21000, low: 20000, eq: 20500, window: 20, asOf: '2026-01-24', thinHistory: false };
    expect(computeLevels(range, 21000).position).toBe(1.0);
    expect(computeLevels(range, 20000).position).toBe(0.0);
  });

  it('zero-width range guards position at 0.5 with no clamping elsewhere', () => {
    const flat: DealingRange = { high: 100, low: 100, eq: 100, window: 20, asOf: '2026-01-06', thinHistory: true };
    expect(computeLevels(flat, 100).position).toBe(0.5);
  });

  it('derives anchors plus close from live-shaped candles end to end', () => {
    const candles = trend(25, 20000);
    const closed = candles.filter((c) => !c.forming);
    const range = computeRange(closed, closed[closed.length - 1].date, ANCHOR_WINDOW);
    const out = computeLevels(range, closed[closed.length - 1].close);
    expect(out.eq).toBeCloseTo((range.high + range.low) / 2, 10);
    expect(out.position).toBeGreaterThanOrEqual(0);
    expect(out.position).toBeLessThanOrEqual(1);
  });
});
