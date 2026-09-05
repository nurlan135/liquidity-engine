import { toBakuYMD } from '@/src/lib/time';
import type { Candle } from '@/src/lib/ict/types';

export const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];

export const HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://finance.yahoo.com/',
};

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export interface Envelope {
  candles: Candle[];
  lastUpdatedISO: string;
  stale: boolean;
  source: string;
}

const SYMBOL = 'NQ=F';
const ENCODED_SYMBOL = 'NQ%3DF';

interface QuoteArrays {
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function parseChartJson(json: unknown): { candles: Candle[]; contractHint: string } {
  const root = json as {
    chart?: { error?: unknown; result?: Array<Record<string, unknown>> };
  };
  if (root?.chart?.error) {
    throw new UpstreamError('upstream soft-throttle or error payload');
  }
  const r = root?.chart?.result?.[0];
  if (!r || !Array.isArray(r['timestamp'])) {
    throw new UpstreamError('missing chart result or timestamp array');
  }
  const timestamps = r['timestamp'] as unknown[];
  if (timestamps.length === 0) {
    throw new UpstreamError('empty timestamp array');
  }
  const quote = (r['indicators'] as { quote?: QuoteArrays[] } | undefined)?.quote?.[0];
  if (!quote) {
    throw new UpstreamError('missing quote arrays');
  }
  const opens = Array.isArray(quote.open) ? (quote.open as unknown[]) : [];
  const highs = Array.isArray(quote.high) ? (quote.high as unknown[]) : [];
  const lows = Array.isArray(quote.low) ? (quote.low as unknown[]) : [];
  const closes = Array.isArray(quote.close) ? (quote.close as unknown[]) : [];

  const candles: Candle[] = [];
  const lastIndex = timestamps.length - 1;
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    if (typeof ts !== 'number' || !Number.isFinite(ts)) {
      continue;
    }
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    const complete = isFiniteNumber(o) && isFiniteNumber(h) && isFiniteNumber(l) && isFiniteNumber(c);
    if (complete) {
      candles.push({
        date: toBakuYMD(ts * 1000),
        open: o as number,
        high: h as number,
        low: l as number,
        close: c as number,
      });
    } else if (i === lastIndex && isFiniteNumber(c)) {
      candles.push({
        date: toBakuYMD(ts * 1000),
        open: isFiniteNumber(o) ? (o as number) : (c as number),
        high: isFiniteNumber(h) ? (h as number) : (c as number),
        low: isFiniteNumber(l) ? (l as number) : (c as number),
        close: c as number,
        forming: true,
      });
    }
  }

  if (candles.length === 0) {
    throw new UpstreamError('no valid candles after null-row filtering');
  }

  const meta = (r['meta'] as { symbol?: unknown; exchangeName?: unknown } | undefined) ?? {};
  const symbol = typeof meta.symbol === 'string' ? meta.symbol : '';
  if (symbol.toLowerCase() !== SYMBOL.toLowerCase()) {
    throw new UpstreamError(`symbol mismatch: expected ${SYMBOL}, got ${symbol || '(missing)'}`);
  }

  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].date;
    const curr = candles[i].date;
    if (curr <= prev) {
      throw new UpstreamError(`candles out of order or duplicated at index ${i}: ${prev} -> ${curr}`);
    }
  }

  const exchangeName = typeof meta.exchangeName === 'string' ? meta.exchangeName : 'CME';
  return { candles, contractHint: `${SYMBOL} · ${exchangeName}` };
}

export function buildEnvelope(candles: Candle[], now: Date = new Date()): Envelope {
  return {
    candles,
    lastUpdatedISO: now.toISOString(),
    stale: false,
    source: 'live',
  };
}

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
type SleepFn = (ms: number) => Promise<void>;

const realSleep: SleepFn = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchNQDaily(
  now: Date,
  fetchFn: FetchFn = fetch,
  sleep: SleepFn = realSleep,
): Promise<Envelope> {
  const period2 = Math.floor(now.getTime() / 1000);
  const period1 = period2 - 182 * 86400;
  const path = `/v8/finance/chart/${ENCODED_SYMBOL}?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  const delays = [500, 1000, 2000];
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const host = HOSTS[attempt % HOSTS.length];
    try {
      const res = await fetchFn(`${host}${path}`, { headers: HEADERS });
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        lastError = new UpstreamError(`upstream status ${res.status}`);
      } else if (!res.ok) {
        throw new UpstreamError(`upstream status ${res.status}`);
      } else {
        const json: unknown = await res.json();
        const { candles } = parseChartJson(json);
        return buildEnvelope(candles, now);
      }
    } catch (err) {
      if (err instanceof UpstreamError && !String(err.message).startsWith('upstream status 5') && !String(err.message).startsWith('upstream status 429')) {
        throw err;
      }
      lastError = err;
    }
    if (attempt < delays.length) {
      const jitter = delays[attempt] * (0.75 + Math.random() * 0.5);
      await sleep(jitter);
    }
  }

  throw lastError instanceof Error ? lastError : new UpstreamError('upstream fetch failed');
}
