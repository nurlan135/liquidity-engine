import { describe, expect, it } from 'vitest';
import { mapCandlesToSeries, priceLineInputs } from '@/src/lib/chart-mapper';

describe('chart-mapper: candle to series mapping', () => {
  it('maps each candle to time open high low close with date untouched', () => {
    const rows = mapCandlesToSeries([
      { date: '2026-01-05', open: 20000, high: 20015, low: 19988, close: 20005 },
      { date: '2026-01-06', open: 20005, high: 20025, low: 19995, close: 20010 },
    ]);
    expect(rows).toEqual([
      { time: '2026-01-05', open: 20000, high: 20015, low: 19988, close: 20005 },
      { time: '2026-01-06', open: 20005, high: 20025, low: 19995, close: 20010 },
    ]);
  });

  it('throws on an empty array and on any non-finite OHLC value', () => {
    expect(() => mapCandlesToSeries([])).toThrow();
    expect(() =>
      mapCandlesToSeries([
        { date: '2026-01-05', open: 20000, high: Number.NaN, low: 19988, close: 20005 },
      ]),
    ).toThrow();
    expect(() =>
      mapCandlesToSeries([
        { date: '2026-01-05', open: 20000, high: 20015, low: Number.POSITIVE_INFINITY, close: 20005 },
      ]),
    ).toThrow();
  });

  it('returns the range eq and DOL price unchanged for line creation', () => {
    expect(priceLineInputs(20100.5, 20215)).toEqual({ eq: 20100.5, dol: 20215 });
  });
});
