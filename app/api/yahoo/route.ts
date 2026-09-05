import { fetchNQDaily, UpstreamError } from '@/src/lib/yahoo';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET() {
  try {
    const envelope = await fetchNQDaily(new Date());
    return Response.json(envelope, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    const message = err instanceof UpstreamError ? err.message : 'upstream unavailable';
    return Response.json({ error: message, retryAfter: 60 }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
