import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import {
  ATR_PERIOD,
  computeATR,
  computeRegime,
  MIN_CANDLES_FULL,
  REGIME_AVG_WINDOW,
} from '@/src/lib/ict/regime';

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

function expandingSeries(): Candle[] {
  const out = flatSeries(MIN_CANDLES_FULL, 20000);
  const last = out[out.length - 1];
  out[out.length - 1] = {
    ...last,
    high: last.close + 400,
    low: last.close - 400,
    close: last.close + 350,
  };
  return out;
}

describe('regime: Wilder ATR versus its own average', () => {
  it('fewer than 34 closed candles degrades honestly to compression, never expansion', () => {
    const few = flatSeries(20);
    const out = computeRegime(few);
    expect(out.regime).toBe('compression');
    expect(out.rationale).toMatch(/insufficient history/i);
    expect(out.atr).toBe(0);
    expect(out.avg).toBe(0);
  });

  it('flat history reads compression with rationale naming both ATR values', () => {
    const out = computeRegime(flatSeries(MIN_CANDLES_FULL));
    expect(out.regime).toBe('compression');
    expect(out.rationale).toContain(String(out.atr));
    expect(out.rationale).toContain(String(out.avg));
    expect(out.atr).toBeCloseTo(out.avg, 10);
  });

  it('a late volatility burst reads expansion with double-precision ATR checks', () => {
    const out = computeRegime(expandingSeries());
    expect(out.regime).toBe('expansion');
    expect(out.atr).toBeGreaterThan(out.avg);
    const series = computeATR(expandingSeries(), ATR_PERIOD);
    expect(out.atr).toBeCloseTo(series[series.length - 1], 10);
  });

  it('identical candle order always yields identical regime output', () => {
    const candles = expandingSeries();
    expect(computeRegime(candles)).toEqual(computeRegime([...candles]));
  });

  it('each bar contributes once in chronological order with no window merging', () => {
    const candles = flatSeries(MIN_CANDLES_FULL);
    const full = computeATR(candles, ATR_PERIOD);
    expect(full).toHaveLength(candles.length - ATR_PERIOD);
    const truncated = computeATR(candles.slice(0, MIN_CANDLES_FULL - 1), ATR_PERIOD);
    expect(truncated).toHaveLength(candles.length - 1 - ATR_PERIOD);
    expect(full[0]).toBeCloseTo(truncated[0], 10);
  });

  it('forming rows are excluded before any ATR math', () => {
    const candles = flatSeries(MIN_CANDLES_FULL);
    const withForming = [
      ...candles,
      flatCandle('2026-02-04', 26000, { high: 27000, low: 19000, close: 26500, forming: true }),
    ];
    expect(computeRegime(withForming)).toEqual(computeRegime(candles));
  });

  it('pinned numeric parameters match the plan contract', () => {
    expect(ATR_PERIOD).toBe(14);
    expect(REGIME_AVG_WINDOW).toBe(20);
    expect(MIN_CANDLES_FULL).toBe(34);
  });
});
