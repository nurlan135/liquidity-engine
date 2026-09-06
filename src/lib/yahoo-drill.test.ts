import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetYahooCacheForTests, fetchNQDaily } from '@/src/lib/yahoo';

const DAY = 86400;
const BASE_TS = Math.floor(new Date('2026-01-05T00:00:00Z').getTime() / 1000);

function mockYahooJson(n: number, startPrice: number) {
  const timestamp: number[] = [];
  const open: unknown[] = [];
  const high: unknown[] = [];
  const low: unknown[] = [];
  const close: unknown[] = [];
  for (let i = 0; i < n; i++) {
    const price = startPrice + i * 10;
    timestamp.push(BASE_TS + i * DAY);
    open.push(price);
    high.push(price + 15);
    low.push(price - 12);
    close.push(price + 5);
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

const noSleep = async () => {};

// TEMPORARY drill proof (D-07, plan 03-01): deleted in plan 03-04.
describe('yahoo drill kill-switch', () => {
  beforeEach(() => {
    __resetYahooCacheForTests();
  });

  it('drill: warmed cache plus flag returns warm candles with stale true', async () => {
    const prior = process.env.DRILL_FORCE_STALE;
    try {
      const now = new Date('2026-02-09T12:00:00Z');
      const json = mockYahooJson(10, 20000);
      const fetchFn = vi.fn(async () => Response.json(json));
      const warm = await fetchNQDaily(now, fetchFn as unknown as typeof fetch, noSleep);
      expect(warm.stale).toBe(false);

      process.env.DRILL_FORCE_STALE = '1';
      const fetchExplode = vi.fn(async () => {
        throw new Error('must not fetch while drill flag is set');
      });
      const drilled = await fetchNQDaily(
        new Date(now.getTime() + 61_000),
        fetchExplode as unknown as typeof fetch,
        noSleep,
      );
      expect(drilled.stale).toBe(true);
      expect(drilled.source).toBe('stale');
      expect(drilled.candles).toEqual(warm.candles);
      expect(fetchExplode).not.toHaveBeenCalled();
    } finally {
      if (prior === undefined) {
        delete process.env.DRILL_FORCE_STALE;
      } else {
        process.env.DRILL_FORCE_STALE = prior;
      }
    }
  });

  it('drill: cold cache plus flag throws instead of fabricating candles', async () => {
    const prior = process.env.DRILL_FORCE_STALE;
    try {
      process.env.DRILL_FORCE_STALE = '1';
      const fetchExplode = vi.fn(async () => {
        throw new Error('must not fetch while drill flag is set');
      });
      await expect(
        fetchNQDaily(new Date('2026-02-09T12:00:00Z'), fetchExplode as unknown as typeof fetch, noSleep),
      ).rejects.toThrow();
      expect(fetchExplode).not.toHaveBeenCalled();
    } finally {
      if (prior === undefined) {
        delete process.env.DRILL_FORCE_STALE;
      } else {
        process.env.DRILL_FORCE_STALE = prior;
      }
    }
  });

  it('drill: flag unset restores the normal fetch path', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const json = mockYahooJson(10, 20000);
    const fetchFn = vi.fn(async () => Response.json(json));
    const envelope = await fetchNQDaily(now, fetchFn as unknown as typeof fetch, noSleep);
    expect(envelope.stale).toBe(false);
    expect(envelope.source).toBe('live');
    expect(envelope.candles).toHaveLength(10);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
