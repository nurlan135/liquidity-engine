import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW, computeRange } from '@/src/lib/ict/range';
import { detectRollover, ROLLOVER_ATR_MULT, ROLLOVER_WINDOW } from '@/src/lib/ict/rollover';

function candle(date: string, price: number, overrides: Partial<Candle> = {}): Candle {
  return { date, open: price, high: price + 15, low: price - 12, close: price + 5, ...overrides };
}

function trend(n: number, startPrice: number, startDay = 5): Candle[] {
  const out: Candle[] = [];
  const base = Date.UTC(2026, 0, startDay);
  for (let i = 0; i < n; i++) {
    const iso = new Date(base + i * 86400000).toISOString().slice(0, 10);
    out.push(candle(iso, startPrice + i * 10));
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

  it('trailing window is pinned at 20', () => {
    expect(ROLLOVER_WINDOW).toBe(20);
  });

  it('STALE gap older than the trailing window leaves the flag clear', () => {
    // 30 candles > ROLLOVER_WINDOW: the big gap sits at idx 5, the last 20
    // candles are clean — old code (full-history scan) returned true here.
    const candles = trend(30, 20000);
    candles[5] = candle('2026-01-10', 20000, { close: candles[4].close + 250 });
    const flag = detectRollover(candles, 10, '2026-02-03', 'NQ H6 -> M6');
    expect(flag.rolloverSuspect).toBe(false);
  });

  it('FRESH gap inside the trailing window fires the suspect flag', () => {
    // Same 30-candle length: the gap is the final pair, inside the window.
    const candles = trend(30, 20000);
    const last = candles.length - 1;
    candles[last] = candle('2026-02-03', 20300, { close: candles[last - 1].close + 250 });
    const flag = detectRollover(candles, 10, '2026-02-03', 'NQ H6 -> M6');
    expect(flag.rolloverSuspect).toBe(true);
  });
});
