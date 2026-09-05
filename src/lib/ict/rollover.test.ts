import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW, computeRange } from '@/src/lib/ict/range';
import { detectRollover, ROLLOVER_ATR_MULT } from '@/src/lib/ict/rollover';

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

describe('rollover: strict 3xATR tripwire with flag-and-continue', () => {
  it('a 250-point synthetic gap against a small ATR fires the suspect flag', () => {
    const candles = trend(20, 20000);
    const gapped = [...candles, candle('2026-01-25', 20250, { close: candles[candles.length - 1].close + 250 })];
    const flag = detectRollover(gapped, 10, '2026-01-25', 'NQ H6 -> M6');
    expect(flag.rolloverSuspect).toBe(true);
    expect(flag.contractHint).toBe('NQ H6 -> M6');
  });

  it('gap exactly equal to 3xATR leaves the flag clear', () => {
    const base = candle('2026-01-05', 20000);
    const edge = candle('2026-01-06', 20000, { close: base.close + ROLLOVER_ATR_MULT * 10 });
    const flag = detectRollover([base, edge], 10, '2026-01-06', 'NQ H6 -> M6');
    expect(flag.rolloverSuspect).toBe(false);
  });

  it('flag-and-continue: anchors keep computing off current extremes', () => {
    const candles = trend(20, 20000);
    const before = computeRange(candles, candles[candles.length - 1].date, ANCHOR_WINDOW);
    const gapped = [...candles, candle('2026-01-25', 20250)];
    const flag = detectRollover(gapped, 10, '2026-01-25', 'NQ H6 -> M6');
    expect(flag.rolloverSuspect).toBe(true);
    const after = computeRange(gapped, '2026-01-25', ANCHOR_WINDOW);
    expect(after.high).toBeGreaterThanOrEqual(before.high);
    expect(after.low).toBeGreaterThanOrEqual(before.low);
  });

  it('proximity warning appears near roll week and stays null elsewhere', () => {
    const candles = trend(5, 20000);
    const near = detectRollover(candles, 10, '2026-03-19', 'NQ H6 -> M6');
    expect(near.proximityWarning).toMatch(/rollover week/i);
    const far = detectRollover(candles, 10, '2026-01-25', 'NQ H6 -> M6');
    expect(far.proximityWarning).toBeNull();
  });

  it('parallel evaluations are stateless and identical for identical input', () => {
    const candles = trend(20, 20000);
    const first = detectRollover(candles, 10, '2026-01-25', 'NQ H6 -> M6');
    const second = detectRollover([...candles], 10, '2026-01-25', 'NQ H6 -> M6');
    expect(second).toEqual(first);
  });

  it('tripwire multiplier is exactly 3', () => {
    expect(ROLLOVER_ATR_MULT).toBe(3);
  });
});
