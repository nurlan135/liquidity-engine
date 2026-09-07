import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/yahoo/route';
import { __resetYahooCacheForTests } from '@/src/lib/yahoo';
import esDailyFixture from '@/src/lib/__fixtures__/es-daily.json';
import nqBaseline from '@/src/lib/__fixtures__/nq-daily-baseline.json';
import intraday1hFixture from '@/src/lib/__fixtures__/intraday-1h.json';

const DAY = 86400;
const BASE_TS = Math.floor(new Date('2026-01-05T00:00:00Z').getTime() / 1000);

function nqYahooJson() {
  const timestamp: number[] = [];
  const open: unknown[] = [];
  const high: unknown[] = [];
  const low: unknown[] = [];
  const close: unknown[] = [];
  for (let i = 0; i < 10; i++) {
    const price = 20000 + i * 10;
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

function stubRequest(url: string) {
  return { nextUrl: new URL(url) } as unknown as Parameters<typeof GET>[0];
}

function stubFetch(json: unknown) {
  return vi.fn(async () => Response.json(json));
}

describe('yahoo route params', () => {
  beforeEach(() => {
    __resetYahooCacheForTests();
    vi.unstubAllGlobals();
  });

  it('bare GET returns the NQ daily shape matching the baseline', async () => {
    vi.stubGlobal('fetch', stubFetch(nqYahooJson()));
    const res = await GET(stubRequest('http://localhost/api/yahoo'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(Object.keys(nqBaseline).sort());
    expect(body.contractHint).toContain('NQ=F');
    expect(body.stale).toBe(false);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=30');
  });

  it('GET with symbol ES=F returns the ES daily envelope', async () => {
    vi.stubGlobal('fetch', stubFetch(esDailyFixture));
    const res = await GET(stubRequest('http://localhost/api/yahoo?symbol=ES%3DF'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contractHint).toContain('ES=F');
    expect(body.candles).toHaveLength(10);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=30');
  });

  it('unknown symbol returns 400 without any upstream fetch call', async () => {
    const fetchFn = stubFetch(nqYahooJson());
    vi.stubGlobal('fetch', fetchFn);
    const res = await GET(stubRequest('http://localhost/api/yahoo?symbol=AAPL%3DF'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('unsupported symbol');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('unknown interval returns 400', async () => {
    const fetchFn = stubFetch(nqYahooJson());
    vi.stubGlobal('fetch', fetchFn);
    const res = await GET(stubRequest('http://localhost/api/yahoo?interval=5m'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('unsupported interval');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('GET with symbol ES=F and interval 1h returns the intraday epoch envelope', async () => {
    vi.stubGlobal('fetch', stubFetch(intraday1hFixture));
    const res = await GET(stubRequest('http://localhost/api/yahoo?symbol=ES%3DF&interval=1h'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contractHint).toContain('ES=F');
    expect(body.candles).toHaveLength(30);
    for (const candle of body.candles) {
      expect(Number.isInteger(candle.time)).toBe(true);
      expect(candle).not.toHaveProperty('date');
    }
    expect(body.stale).toBe(false);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=30');
  });

  it('stale envelope carries no-store while fresh carries the public rule', async () => {
    // Fake timers control the route's internal new Date() so the 60s TTL can
    // expire; advanceTimersByTimeAsync drives the retry backoff sleeps.
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-02-09T12:00:00Z'));
      vi.stubGlobal('fetch', stubFetch(nqYahooJson()));
      const fresh = await GET(stubRequest('http://localhost/api/yahoo'));
      expect(fresh.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=30');

      vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));
      vi.setSystemTime(new Date('2026-02-09T12:01:01Z'));
      const pending = GET(stubRequest('http://localhost/api/yahoo'));
      await vi.advanceTimersByTimeAsync(30_000);
      const stale = await pending;
      expect(stale.headers.get('Cache-Control')).toBe('no-store');
      const body = await stale.json();
      expect(body.stale).toBe(true);
      expect(body.source).toBe('stale');
    } finally {
      vi.useRealTimers();
    }
  });
});
