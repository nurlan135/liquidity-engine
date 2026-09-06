import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetYahooCacheForTests, fetchNQDaily, fetchSymbol, parseChartJson } from '@/src/lib/yahoo';
import nullFixture from '@/src/lib/__fixtures__/yahoo-null.json';
import esDailyFixture from '@/src/lib/__fixtures__/es-daily.json';
import nqBaseline from '@/src/lib/__fixtures__/nq-daily-baseline.json';

const DAY = 86400;
const BASE_TS = Math.floor(new Date('2026-01-05T00:00:00Z').getTime() / 1000);

function mockYahooJsonFor(symbol: 'NQ=F' | 'ES=F', n: number, startPrice: number) {
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
          meta: { symbol, exchangeName: 'CME' },
          indicators: { quote: [{ open, high, low, close }] },
        },
      ],
      error: null,
    },
  };
}

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

function okResponse(json: unknown) {
  return Response.json(json);
}

function statusResponse(status: number, headers?: Record<string, string>) {
  return new Response(null, { status, headers });
}

const noSleep = async () => {};

describe('yahoo null-row fixture', () => {
  it('null: mid-array null run drops to exact surviving candle set', () => {
    const { candles } = parseChartJson(nullFixture);
    expect(candles).toHaveLength(8);
    expect(candles.map((c) => c.date)).toEqual([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-10',
      '2026-01-11',
      '2026-01-12',
      '2026-01-13',
      '2026-01-14',
    ]);
    const dates = candles.map((c) => c.date);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] > dates[i - 1]).toBe(true);
    }
    for (const c of candles) {
      expect(Number.isFinite(c.open)).toBe(true);
      expect(Number.isFinite(c.high)).toBe(true);
      expect(Number.isFinite(c.low)).toBe(true);
      expect(Number.isFinite(c.close)).toBe(true);
    }
    expect(candles.some((c) => c.forming)).toBe(false);
    expect(candles[0]).toMatchObject({ open: 20100, high: 20115, low: 20088, close: 20105 });
    expect(candles[candles.length - 1]).toMatchObject({
      open: 20200,
      high: 20215,
      low: 20188,
      close: 20205,
    });
  });
});

describe('yahoo resilience', () => {
  beforeEach(() => {
    __resetYahooCacheForTests();
  });

  it('resilience: 429 twice then 200 succeeds with query1/query2 alternation', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const json = mockYahooJson(10, 20000);
    const urls: string[] = [];
    const fetchFn = vi.fn(async (url: string) => {
      urls.push(url);
      if (urls.length <= 2) return statusResponse(429);
      return okResponse(json);
    });
    const sleeps: number[] = [];
    const envelope = await fetchNQDaily(
      now,
      fetchFn as unknown as typeof fetch,
      async (ms: number) => {
        sleeps.push(ms);
      },
    );
    expect(envelope.source).toBe('live');
    expect(envelope.candles).toHaveLength(10);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(urls[0]).toContain('query1.finance.yahoo.com');
    expect(urls[1]).toContain('query2.finance.yahoo.com');
    expect(urls[2]).toContain('query1.finance.yahoo.com');
    expect(sleeps).toHaveLength(2);
    expect(sleeps[0]).toBeGreaterThanOrEqual(375);
    expect(sleeps[0]).toBeLessThanOrEqual(625);
    expect(sleeps[1]).toBeGreaterThanOrEqual(750);
    expect(sleeps[1]).toBeLessThanOrEqual(1250);
  });

  it('resilience: Retry-After delta seconds honored within 500ms jitter band', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const json = mockYahooJson(10, 20000);
    const fetchFn = vi.fn(async (url: string) => {
      void url;
      if (fetchFn.mock.calls.length === 1) return statusResponse(429, { 'Retry-After': '2' });
      return okResponse(json);
    });
    const sleeps: number[] = [];
    const envelope = await fetchNQDaily(
      now,
      fetchFn as unknown as typeof fetch,
      async (ms: number) => {
        sleeps.push(ms);
      },
    );
    expect(envelope.source).toBe('live');
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0]).toBeGreaterThanOrEqual(1500);
    expect(sleeps[0]).toBeLessThanOrEqual(2500);
  });

  it('resilience: Retry-After HTTP-date honored and capped at 10s', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const json = mockYahooJson(10, 20000);
    const future = new Date(now.getTime() + 60_000).toUTCString();
    const fetchFn = vi.fn(async (url: string) => {
      void url;
      if (fetchFn.mock.calls.length === 1) return statusResponse(429, { 'Retry-After': future });
      return okResponse(json);
    });
    const sleeps: number[] = [];
    const envelope = await fetchNQDaily(
      now,
      fetchFn as unknown as typeof fetch,
      async (ms: number) => {
        sleeps.push(ms);
      },
    );
    expect(envelope.source).toBe('live');
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0]).toBeGreaterThanOrEqual(7500);
    expect(sleeps[0]).toBeLessThanOrEqual(12500);
  });

  it('resilience: persistent 500 with warm cache serves identical stale payload', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const json = mockYahooJson(10, 20000);
    const warmFetch = vi.fn(async () => okResponse(json));
    const warm = await fetchNQDaily(now, warmFetch as unknown as typeof fetch, noSleep);
    expect(warm.source).toBe('live');

    const failing = vi.fn(async () => statusResponse(500));
    const stale = await fetchNQDaily(
      new Date('2026-02-09T12:01:01Z'),
      failing as unknown as typeof fetch,
      noSleep,
    );
    expect(stale.source).toBe('stale');
    expect(stale.stale).toBe(true);
    expect(stale.candles).toEqual(warm.candles);
    expect(stale.lastUpdatedISO).toBe(warm.lastUpdatedISO);
  });

  it('resilience: fresh cache hit within TTL makes no upstream call', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const json = mockYahooJson(10, 20000);
    const first = vi.fn(async () => okResponse(json));
    const warm = await fetchNQDaily(now, first as unknown as typeof fetch, noSleep);
    expect(warm.source).toBe('live');

    const second = vi.fn(async () => okResponse(json));
    const hit = await fetchNQDaily(
      new Date('2026-02-09T12:00:30Z'),
      second as unknown as typeof fetch,
      noSleep,
    );
    expect(hit.source).toBe('cache');
    expect(hit.stale).toBe(false);
    expect(hit.candles).toEqual(warm.candles);
    expect(hit.lastUpdatedISO).toBe(warm.lastUpdatedISO);
    expect(second).not.toHaveBeenCalled();
  });

  it('resilience: empty-cache failure throws UpstreamError and caches nothing', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const failing = vi.fn(async () => statusResponse(500));
    await expect(
      fetchNQDaily(now, failing as unknown as typeof fetch, noSleep),
    ).rejects.toMatchObject({ name: 'UpstreamError' });
    expect(failing).toHaveBeenCalledTimes(4);

    const json = mockYahooJson(10, 20000);
    const recovery = vi.fn(async () => okResponse(json));
    const envelope = await fetchNQDaily(now, recovery as unknown as typeof fetch, noSleep);
    expect(envelope.source).toBe('live');
    expect(envelope.candles).toHaveLength(10);
  });

  it('resilience: non-429 4xx fails over once then throws', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const urls: string[] = [];
    const fetchFn = vi.fn(async (url: string) => {
      urls.push(url);
      return statusResponse(404);
    });
    await expect(
      fetchNQDaily(now, fetchFn as unknown as typeof fetch, noSleep),
    ).rejects.toMatchObject({ name: 'UpstreamError' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(urls[0]).toContain('query1.finance.yahoo.com');
    expect(urls[1]).toContain('query2.finance.yahoo.com');
  });

  it('resilience: chart error payload is retryable across attempts', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const throttled = { chart: { result: null, error: { code: '429', description: 'throttled' } } };
    const json = mockYahooJson(10, 20000);
    const fetchFn = vi.fn(async (url: string) => {
      void url;
      if (fetchFn.mock.calls.length === 1) return okResponse(throttled);
      return okResponse(json);
    });
    const envelope = await fetchNQDaily(
      now,
      fetchFn as unknown as typeof fetch,
      noSleep,
    );
    expect(envelope.source).toBe('live');
    expect(envelope.candles).toHaveLength(10);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('resilience: soft-throttle error payload never cached as valid', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const throttled = { chart: { result: null, error: { code: '429', description: 'throttled' } } };
    const failing = vi.fn(async () => okResponse(throttled));
    await expect(
      fetchNQDaily(now, failing as unknown as typeof fetch, noSleep),
    ).rejects.toMatchObject({ name: 'UpstreamError' });

    const json = mockYahooJson(10, 20000);
    const recovery = vi.fn(async () => okResponse(json));
    const envelope = await fetchNQDaily(now, recovery as unknown as typeof fetch, noSleep);
    expect(envelope.source).toBe('live');
    expect(envelope.candles).toHaveLength(10);
    expect(recovery).toHaveBeenCalledTimes(1);
  });

  it('resilience: network throw is retryable then succeeds', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const json = mockYahooJson(10, 20000);
    const fetchFn = vi.fn(async (url: string) => {
      void url;
      if (fetchFn.mock.calls.length === 1) throw new TypeError('fetch failed');
      return okResponse(json);
    });
    const envelope = await fetchNQDaily(
      now,
      fetchFn as unknown as typeof fetch,
      noSleep,
    );
    expect(envelope.source).toBe('live');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('resilience: concurrent cache misses join one in-flight upstream call', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const json = mockYahooJson(10, 20000);
    let calls = 0;
    const fetchFn = vi.fn(async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return okResponse(json);
    });
    const [a, b, c] = await Promise.all([
      fetchNQDaily(now, fetchFn as unknown as typeof fetch, noSleep),
      fetchNQDaily(now, fetchFn as unknown as typeof fetch, noSleep),
      fetchNQDaily(now, fetchFn as unknown as typeof fetch, noSleep),
    ]);
    expect(calls).toBe(1);
    expect(a.candles).toEqual(b.candles);
    expect(b.candles).toEqual(c.candles);
    expect(a.lastUpdatedISO).toBe(b.lastUpdatedISO);
  });

  it('params: ES daily returns live envelope with ES contractHint', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const fetchFn = vi.fn(async () => okResponse(esDailyFixture));
    const envelope = await fetchSymbol('ES=F', '1d', now, fetchFn as unknown as typeof fetch, noSleep);
    expect(envelope.source).toBe('live');
    expect(envelope.candles).toHaveLength(10);
    expect(envelope.contractHint).toContain('ES=F');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('params: NQ default output deep-equals the baseline fixture body', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const json = mockYahooJson(10, 20000);
    const fetchFn = vi.fn(async () => okResponse(json));
    const envelope = await fetchNQDaily(now, fetchFn as unknown as typeof fetch, noSleep);
    // Baseline carries the frozen daily envelope shape; the fresh fetch must
    // match its body keys, and equal candle values for identical upstream rows.
    expect(Object.keys(envelope).sort()).toEqual(Object.keys(nqBaseline).sort());
    expect(envelope.contractHint).toContain('NQ=F');
    expect(envelope.stale).toBe(false);
  });

  it('params: per-combo keys isolate NQ and ES entries', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const nqFetch = vi.fn(async () => okResponse(mockYahooJson(10, 20000)));
    const warm = await fetchNQDaily(now, nqFetch as unknown as typeof fetch, noSleep);
    expect(warm.source).toBe('live');

    const esFetch = vi.fn(async () => okResponse(esDailyFixture));
    const es = await fetchSymbol('ES=F', '1d', now, esFetch as unknown as typeof fetch, noSleep);
    expect(es.source).toBe('live');
    expect(es.contractHint).toContain('ES=F');
    // NQ was warm yet the ES leg fetched upstream exactly once — no sharing.
    expect(esFetch).toHaveBeenCalledTimes(1);

    // NQ still served from its own entry without a second upstream call.
    const nqAgain = vi.fn(async () => okResponse(mockYahooJson(10, 20000)));
    const hit = await fetchNQDaily(now, nqAgain as unknown as typeof fetch, noSleep);
    expect(hit.source).toBe('cache');
    expect(nqAgain).not.toHaveBeenCalled();
  });

  it('params: concurrent same-combo misses join one call, other combo independent', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    let esCalls = 0;
    const esFetch = vi.fn(async () => {
      esCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return okResponse(esDailyFixture);
    });
    let nqCalls = 0;
    const nqFetch = vi.fn(async () => {
      nqCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return okResponse(mockYahooJsonFor('NQ=F', 10, 20000));
    });
    const [a, b, c, d] = await Promise.all([
      fetchSymbol('ES=F', '1d', now, esFetch as unknown as typeof fetch, noSleep),
      fetchSymbol('ES=F', '1d', now, esFetch as unknown as typeof fetch, noSleep),
      fetchSymbol('ES=F', '1d', now, esFetch as unknown as typeof fetch, noSleep),
      fetchSymbol('NQ=F', '1d', now, nqFetch as unknown as typeof fetch, noSleep),
    ]);
    expect(esCalls).toBe(1);
    expect(nqCalls).toBe(1);
    expect(a.candles).toEqual(b.candles);
    expect(b.candles).toEqual(c.candles);
    expect(d.contractHint).toContain('NQ=F');
  });

  it('params: empty-cache ES failure throws UpstreamError and caches nothing', async () => {
    const now = new Date('2026-02-09T12:00:00Z');
    const failing = vi.fn(async () => statusResponse(500));
    await expect(
      fetchSymbol('ES=F', '1d', now, failing as unknown as typeof fetch, noSleep),
    ).rejects.toMatchObject({ name: 'UpstreamError' });
    expect(failing).toHaveBeenCalledTimes(4);

    const recovery = vi.fn(async () => okResponse(esDailyFixture));
    const envelope = await fetchSymbol('ES=F', '1d', now, recovery as unknown as typeof fetch, noSleep);
    expect(envelope.source).toBe('live');
    expect(envelope.candles).toHaveLength(10);
  });

  it('resilience: expired TTL refetches upstream', async () => {
    const first = new Date('2026-02-09T12:00:00Z');
    const json = mockYahooJson(10, 20000);
    const fetchOne = vi.fn(async () => okResponse(json));
    const warm = await fetchNQDaily(first, fetchOne as unknown as typeof fetch, noSleep);
    expect(warm.source).toBe('live');

    const fetchTwo = vi.fn(async () => okResponse(json));
    const refetched = await fetchNQDaily(
      new Date('2026-02-09T12:01:01Z'),
      fetchTwo as unknown as typeof fetch,
      noSleep,
    );
    expect(fetchTwo).toHaveBeenCalledTimes(1);
    expect(refetched.source).toBe('live');
  });
});
