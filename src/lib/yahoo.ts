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
  readonly retryable: boolean;
  readonly status?: number;
  constructor(message: string, opts: { retryable?: boolean; status?: number } = {}) {
    super(message);
    this.name = 'UpstreamError';
    this.retryable = opts.retryable ?? false;
    if (opts.status !== undefined) this.status = opts.status;
  }
}

export interface Envelope {
  candles: Candle[];
  contractHint: string;
  lastUpdatedISO: string;
  stale: boolean;
  source: string;
}

// D-08: strict allowlists. Unknown symbols/intervals are rejected before any URL build.
export const SYMBOL_ALLOWLIST = ['NQ=F', 'ES=F'] as const;
export type Symbol = (typeof SYMBOL_ALLOWLIST)[number];

export const INTERVAL_ALLOWLIST = ['1d', '1h', '15m'] as const;
export type Interval = (typeof INTERVAL_ALLOWLIST)[number];

export const ENCODED_FOR: Record<Symbol, string> = {
  'NQ=F': 'NQ%3DF',
  'ES=F': 'ES%3DF',
};

// D-02: server-derived range map pinned by the Task 1 live probe
// (ES=F 1h/3mo: 1800 rows, 15m/1mo: 2419 rows, no truncation flags).
// 1d keeps the proven 182-day period window; never an unbounded range on a looped fetch.
export const RANGE_FOR_INTERVAL: Record<Interval, string> = {
  '1d': '182d',
  '1h': '3mo',
  '15m': '1mo',
};

/** D-11: composite cache key — one entry per symbol-interval-range combo. */
export function cacheKey(symbol: Symbol, interval: Interval, range: string): string {
  return `${symbol}:${interval}:${range}`;
}

function isAllowlistedSymbol(v: string): v is Symbol {
  return (SYMBOL_ALLOWLIST as readonly string[]).includes(v);
}

function isAllowlistedInterval(v: string): v is Interval {
  return (INTERVAL_ALLOWLIST as readonly string[]).includes(v);
}

interface QuoteArrays {
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function parseChartJson(
  json: unknown,
  expectedSymbol: Symbol = 'NQ=F',
): { candles: Candle[]; contractHint: string; symbol: string } {
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
  if (symbol.toLowerCase() !== expectedSymbol.toLowerCase()) {
    throw new UpstreamError(`symbol mismatch: expected ${expectedSymbol}, got ${symbol || '(missing)'}`);
  }

  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].date;
    const curr = candles[i].date;
    if (curr <= prev) {
      throw new UpstreamError(`candles out of order or duplicated at index ${i}: ${prev} -> ${curr}`);
    }
  }

  const exchangeName = typeof meta.exchangeName === 'string' ? meta.exchangeName : 'CME';
  return { candles, contractHint: `${expectedSymbol} · ${exchangeName}`, symbol };
}

export function buildEnvelope(candles: Candle[], now: Date = new Date(), contractHint = 'NQ=F · CME'): Envelope {
  return {
    candles,
    contractHint,
    lastUpdatedISO: now.toISOString(),
    stale: false,
    source: 'live',
  };
}

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
type SleepFn = (ms: number) => Promise<void>;

const realSleep: SleepFn = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const CACHE_TTL_MS = 60_000;
// WR-08 budget: 4 attempts x 4s timeouts + ~3.5s backoff ~= worst case under the route's 15s maxDuration.
const FETCH_TIMEOUT_MS = 4_000;
const MAX_RETRY_AFTER_MS = 10_000;
const BASE_DELAYS_MS = [500, 1000, 2000];
// WR-09: refuse to serve entries older than 30 min as stale; fall through to the 502 path.
const MAX_STALE_MS = 30 * 60_000;

interface CacheEntry {
  payload: Envelope;
  fetchedAt: number;
}

const payloadCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Envelope>>();

/** Test-only reset for the module-level cache and singleflight maps. */
export function __resetYahooCacheForTests(): void {
  payloadCache.clear();
  inFlight.clear();
}

function jitteredDelay(baseMs: number): number {
  return baseMs * (0.75 + Math.random() * 0.5);
}

function retryAfterMs(header: string | null, nowMs: number): number | null {
  if (header === null) return null;
  const trimmed = header.trim();
  if (trimmed === '') return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }
  const dateMs = Date.parse(trimmed);
  if (Number.isFinite(dateMs)) {
    return Math.min(Math.max(dateMs - nowMs, 0), MAX_RETRY_AFTER_MS);
  }
  return null;
}

function isValidPayload(candles: Candle[], expectedSymbol: string): boolean {
  if (!isAllowlistedSymbol(expectedSymbol)) return false;
  if (candles.length < 5) return false;
  for (const c of candles) {
    if (!Number.isFinite(c.open) || !Number.isFinite(c.high) || !Number.isFinite(c.low) || !Number.isFinite(c.close)) {
      return false;
    }
  }
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].date <= candles[i - 1].date) return false;
  }
  return true;
}

function buildPath(symbol: Symbol, interval: Interval, now: Date): string {
  const enc = ENCODED_FOR[symbol];
  if (interval === '1d') {
    // Proven v1.0 window: byte-identical URL for the NQ daily default path.
    const period2 = Math.floor(now.getTime() / 1000);
    const period1 = period2 - 182 * 86400;
    return `/v8/finance/chart/${enc}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
  }
  const range = RANGE_FOR_INTERVAL[interval];
  return `/v8/finance/chart/${enc}?range=${range}&interval=${interval}&events=history`;
}

async function fetchWithTimeout(fetchFn: FetchFn, url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetchFn(url, { headers: HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchUpstream(
  now: Date,
  fetchFn: FetchFn,
  sleep: SleepFn,
  symbol: Symbol,
  interval: Interval,
): Promise<Envelope> {
  const path = buildPath(symbol, interval, now);

  let lastError: unknown = null;
  let failedOver = false;

  for (let attempt = 0; attempt <= BASE_DELAYS_MS.length; attempt++) {
    const host = HOSTS[attempt % HOSTS.length];
    try {
      const res = await fetchWithTimeout(fetchFn, `${host}${path}`);
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        lastError = new UpstreamError(`upstream status ${res.status}`, { retryable: true, status: res.status });
        if (attempt < BASE_DELAYS_MS.length) {
          const retryMs = retryAfterMs(res.headers.get('Retry-After'), now.getTime());
          await sleep(retryMs ?? jitteredDelay(BASE_DELAYS_MS[attempt]));
        }
        continue;
      }
      if (!res.ok) {
        // Non-429 client errors fail over once, then throw without further retry.
        if (!failedOver && attempt === 0) {
          failedOver = true;
          lastError = new UpstreamError(`upstream status ${res.status}`, { retryable: true, status: res.status });
          continue;
        }
        throw new UpstreamError(`upstream status ${res.status}`, { retryable: false, status: res.status });
      }
      const json: unknown = await res.json();
      let candles: Candle[];
      let contractHint = `${symbol} · CME`;
      try {
        const parsed = parseChartJson(json, symbol);
        candles = parsed.candles;
        contractHint = parsed.contractHint;
      } catch {
        // HTTP 200 bodies carrying a chart error are retryable throttle signals.
        lastError = new UpstreamError('upstream chart error payload', { retryable: true });
        if (attempt < BASE_DELAYS_MS.length) {
          await sleep(jitteredDelay(BASE_DELAYS_MS[attempt]));
        }
        continue;
      }
      if (!isValidPayload(candles, symbol)) {
        throw new UpstreamError('upstream payload failed validation', { retryable: false });
      }
      return buildEnvelope(candles, now, contractHint);
    } catch (err) {
      if (err instanceof UpstreamError) {
        // WR-11: branch on the structured discriminator, never message text.
        if (!err.retryable) {
          throw err;
        }
        lastError = err;
        continue;
      }
      // Network throws and abort timeouts are retryable.
      lastError = err;
      if (attempt < BASE_DELAYS_MS.length) {
        await sleep(jitteredDelay(BASE_DELAYS_MS[attempt]));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new UpstreamError('upstream fetch failed');
}

export async function fetchSymbol(
  symbol: Symbol,
  interval: Interval,
  now: Date,
  fetchFn: FetchFn = fetch,
  sleep: SleepFn = realSleep,
): Promise<Envelope> {
  // Defense in depth: the route allowlists first, but a non-allowlisted value
  // must never reach the upstream even on direct calls (T-06-01).
  if (!isAllowlistedSymbol(symbol) || !isAllowlistedInterval(interval)) {
    throw new UpstreamError(`unsupported symbol or interval: ${String(symbol)}/${String(interval)}`, {
      retryable: false,
    });
  }
  const key = cacheKey(symbol, interval, RANGE_FOR_INTERVAL[interval]);

  const cached = payloadCache.get(key);
  if (cached && now.getTime() - cached.fetchedAt < CACHE_TTL_MS) {
    return { ...cached.payload, candles: cached.payload.candles.map((c) => ({ ...c })), source: 'cache' };
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending.then((env) => ({ ...env, candles: env.candles.map((c) => ({ ...c })) }));
  }

  const task = (async (): Promise<Envelope> => {
    try {
      const envelope = await fetchUpstream(now, fetchFn, sleep, symbol, interval);
      payloadCache.set(key, { payload: envelope, fetchedAt: now.getTime() });
      return { ...envelope, candles: envelope.candles.map((c) => ({ ...c })) };
    } catch (err) {
      // D-06/D-10: serve only THIS leg's last-good within the ceiling; never
      // cross-substitute the other leg's entry.
      const warm = payloadCache.get(key);
      // WR-09: only serve stale within MAX_STALE_MS; non-retryable 4xx fail loudly (IN-07).
      const nonRetryable4xx = err instanceof UpstreamError && err.retryable === false && err.status !== undefined && err.status >= 400 && err.status < 500;
      if (warm && !nonRetryable4xx && now.getTime() - warm.fetchedAt < MAX_STALE_MS) {
        return { ...warm.payload, candles: warm.payload.candles.map((c) => ({ ...c })), stale: true, source: 'stale' };
      }
      throw err;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, task);
  return task;
}

export async function fetchNQDaily(
  now: Date,
  fetchFn: FetchFn = fetch,
  sleep: SleepFn = realSleep,
): Promise<Envelope> {
  // D-05: the bare NQ daily path delegates untouched — byte-identical output.
  return fetchSymbol('NQ=F', '1d', now, fetchFn, sleep);
}
