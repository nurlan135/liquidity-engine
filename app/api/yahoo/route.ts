import type { NextRequest } from 'next/server';
import {
  INTERVAL_ALLOWLIST,
  SYMBOL_ALLOWLIST,
  fetchSymbol,
  UpstreamError,
  type Interval,
  type Symbol,
} from '@/src/lib/yahoo';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

function isSymbol(v: string): v is Symbol {
  return (SYMBOL_ALLOWLIST as readonly string[]).includes(v);
}

function isInterval(v: string): v is Interval {
  return (INTERVAL_ALLOWLIST as readonly string[]).includes(v);
}

export async function GET(request: NextRequest) {
  // Bare requests (no params) fall through to the exact NQ daily defaults.
  const symbolParam = request.nextUrl.searchParams.get('symbol') ?? 'NQ=F';
  const intervalParam = request.nextUrl.searchParams.get('interval') ?? '1d';

  // T-06-01: allowlist before any URL build — never forward unknowns upstream.
  if (!isSymbol(symbolParam)) {
    return Response.json({ error: `unsupported symbol: ${symbolParam}` }, { status: 400 });
  }
  if (!isInterval(intervalParam)) {
    return Response.json({ error: `unsupported interval: ${intervalParam}` }, { status: 400 });
  }

  try {
    const envelope = await fetchSymbol(symbolParam, intervalParam, new Date());
    return Response.json(envelope, {
      headers: {
        'Cache-Control': envelope.stale ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    const message = err instanceof UpstreamError ? err.message : 'upstream unavailable';
    return Response.json({ error: message, retryAfter: 60 }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
    });
  }
}
