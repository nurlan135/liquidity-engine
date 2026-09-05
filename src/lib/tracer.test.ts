import { describe, expect, it, vi } from 'vitest';
import { toBakuYMD } from '@/src/lib/time';
import { buildEnvelope, fetchNQDaily, parseChartJson } from '@/src/lib/yahoo';
import { ANCHOR_WINDOW, computePosition, computeRange } from '@/src/lib/ict/range';
import { closedOnly } from '@/src/lib/ict/types';

const DAY = 86400;
const BASE_TS = Math.floor(new Date('2026-01-05T00:00:00Z').getTime() / 1000);

function mockYahooJson(n: number, startPrice: number) {
  const timestamp: number[] = [];
  const open: number[] = [];
  const high: number[] = [];
  const low: number[] = [];
  const close: number[] = [];
  for (let i = 0; i < n; i++) {
    const price = startPrice + i * 10;
    timestamp.push(BASE_TS + i * DAY);
    if (i === 10) {
      open.push(null as unknown as number);
      high.push(null as unknown as number);
      low.push(null as unknown as number);
      close.push(null as unknown as number);
    } else {
      open.push(price);
      high.push(price + 15);
      low.push(price - 12);
      close.push(price + 5);
    }
  }
  return {
    chart: {
      result: [
        {
          timestamp,
          meta: { symbol: 'NQ=F', exchangeName: 'CME' },
          indicators: { quote: [{ open, high, low, close }] },
        },
      ],
      error: null,
    },
  };
}

describe('tracer: NQ=F fetch validate envelope range', () => {
  it('mocked 25-candle payload flows fetch -> envelope -> range with correct high/low/eq', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const json = mockYahooJson(25, 20000);
    const fetchFn = vi.fn(async () =>
      Response.json(json),
    );
    const envelope = await fetchNQDaily(now, fetchFn as unknown as typeof fetch, async () => {});
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(envelope.source).toBe('live');
    expect(envelope.stale).toBe(false);
    expect(envelope.candles).toHaveLength(24);

    const closed = closedOnly(envelope.candles);
    expect(closed).toHaveLength(24);

    const asOf = closed[closed.length - 1].date;
    const range = computeRange(closed, asOf, ANCHOR_WINDOW);
    const last20 = closed.slice(-20);
    const expectedHigh = Math.max(...last20.map((c) => c.high));
    const expectedLow = Math.min(...last20.map((c) => c.low));
    expect(range.high).toBe(expectedHigh);
    expect(range.low).toBe(expectedLow);
    expect(range.eq).toBeCloseTo((expectedHigh + expectedLow) / 2, 10);
    expect(range.thinHistory).toBe(false);
  });

  it('Baku date buckets the March DST instant pair to the same business day', () => {
    expect(toBakuYMD(new Date('2026-03-08T06:59:00Z'))).toBe('2026-03-08');
    expect(toBakuYMD(new Date('2026-03-08T07:01:00Z'))).toBe('2026-03-08');
  });

  it('parseChartJson drops mid-array null rows and flags only a partial last row as forming', () => {
    const json = mockYahooJson(25, 20000);
    const { candles } = parseChartJson(json);
    expect(candles).toHaveLength(24);
    expect(candles.some((c) => c.forming)).toBe(false);

    const partial = mockYahooJson(25, 20000);
    const q = partial.chart.result[0].indicators.quote[0];
    const last = q.close.length - 1;
    q.open[last] = null as unknown as number;
    q.high[last] = null as unknown as number;
    q.low[last] = null as unknown as number;
    const parsed = parseChartJson(partial);
    expect(parsed.candles).toHaveLength(24);
    expect(parsed.candles[parsed.candles.length - 1].forming).toBe(true);
  });

  it('thinHistory is false at 20 closed candles and true below', () => {
    const json = mockYahooJson(25, 20000);
    const { candles } = parseChartJson(json);
    const closed = closedOnly(candles);
    expect(computeRange(closed, closed[closed.length - 1].date, 20).thinHistory).toBe(false);
    const few = closed.slice(0, 10);
    expect(computeRange(few, few[few.length - 1].date, 20).thinHistory).toBe(true);
  });

  it('zero-height range yields position 0.5', () => {
    const flat = computeRange(
      [
        { date: '2026-01-05', open: 100, high: 100, low: 100, close: 100 },
        { date: '2026-01-06', open: 100, high: 100, low: 100, close: 100 },
      ],
      '2026-01-06',
      20,
    );
    expect(flat.thinHistory).toBe(true);
    expect(computePosition(flat, 100)).toBe(0.5);
  });

  it('buildEnvelope stamps instant ISO with live source', () => {
    const env = buildEnvelope([], new Date('2026-02-09T12:00:00Z'));
    expect(env.lastUpdatedISO).toBe('2026-02-09T12:00:00.000Z');
    expect(env.source).toBe('live');
    expect(env.stale).toBe(false);
  });
});
