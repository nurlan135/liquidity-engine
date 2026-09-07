import { describe, expect, it } from 'vitest';
import { asiaLineInputs, levelLineInputs, mapCandlesToSeries, priceLineInputs } from '@/src/lib/chart-mapper';
import type { LevelsOutput } from '@/src/lib/ict/levels';

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

describe('chart-mapper: Asia line inputs', () => {
  it('passes a finite high-low pair through unchanged', () => {
    expect(asiaLineInputs(20215.5, 20100.25)).toEqual({ asiaHigh: 20215.5, asiaLow: 20100.25 });
  });

  it('throws naming asiaLineInputs on a NaN high', () => {
    expect(() => asiaLineInputs(Number.NaN, 20100.25)).toThrow(/asiaLineInputs/);
  });

  it('throws naming asiaLineInputs on a positive-Infinity low', () => {
    expect(() => asiaLineInputs(20215.5, Number.POSITIVE_INFINITY)).toThrow(/asiaLineInputs/);
  });

  it('returns coincident values without throwing on equal high-low (zero-width)', () => {
    expect(asiaLineInputs(20150, 20150)).toEqual({ asiaHigh: 20150, asiaLow: 20150 });
  });
});

describe('chart-mapper: quadrant/OTE level lines', () => {
  const levelsFixture: LevelsOutput = {
    eq: 20500,
    q1: 20250,
    q3: 20750,
    bullOTE: { lo: 20210, hi: 20380 },
    bearOTE: { lo: 20620, hi: 20790 },
    position: 0.6,
  };

  it('mids-derive: passes quadrants through and collapses each OTE pocket to (lo + hi) / 2', () => {
    expect(levelLineInputs(levelsFixture)).toEqual({
      q1: 20250,
      q3: 20750,
      oteBull: (20210 + 20380) / 2,
      oteBear: (20620 + 20790) / 2,
    });
  });

  it('nan-bound-throws: throws naming levelLineInputs on a NaN OTE bound', () => {
    expect(() =>
      levelLineInputs({ ...levelsFixture, bullOTE: { lo: Number.NaN, hi: 20380 } }),
    ).toThrow(/levelLineInputs/);
  });

  it('infinite-bound-throws: throws naming levelLineInputs when bullOTE.hi is positive Infinity', () => {
    expect(() =>
      levelLineInputs({ ...levelsFixture, bullOTE: { lo: 20210, hi: Number.POSITIVE_INFINITY } }),
    ).toThrow(/levelLineInputs/);
  });
});
