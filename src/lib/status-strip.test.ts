import { describe, expect, it } from 'vitest';
import { deriveStatus, formatStripAge } from '@/src/lib/freshness';

// 2026-09-05 is a Baku Saturday; noon Baku == 08:00 UTC (UTC+4, no DST).
const SAT_NOON = new Date('2026-09-05T08:00:00.000Z');
// 2026-09-04 is a Baku Friday; noon Baku == 08:00 UTC.
const FRI_NOON = new Date('2026-09-04T08:00:00.000Z');

function isoSecondsBefore(now: Date, seconds: number): string {
  return new Date(now.getTime() - seconds * 1000).toISOString();
}

describe('deriveStatus', () => {
  it('returns LIVE with ageSec near 12 on a fresh weekday envelope', () => {
    const result = deriveStatus(
      { stale: false, lastUpdatedISO: isoSecondsBefore(FRI_NOON, 12) },
      FRI_NOON,
    );
    expect(result.state).toBe('LIVE');
    expect(result.ageSec).toBeGreaterThanOrEqual(11);
    expect(result.ageSec).toBeLessThanOrEqual(13);
  });

  it('returns STALE regardless of age when the envelope stale flag is true', () => {
    const result = deriveStatus(
      { stale: true, lastUpdatedISO: isoSecondsBefore(FRI_NOON, 5) },
      FRI_NOON,
    );
    expect(result.state).toBe('STALE');
    expect(result.ageSec).toBeGreaterThanOrEqual(4);
    expect(result.ageSec).toBeLessThanOrEqual(6);
  });

  it('returns STALE when age reaches 120 seconds even without the flag', () => {
    const result = deriveStatus(
      { stale: false, lastUpdatedISO: isoSecondsBefore(FRI_NOON, 180) },
      FRI_NOON,
    );
    expect(result.state).toBe('STALE');
  });

  it('returns CLOSED on a Baku Saturday even when the envelope is fresh', () => {
    const result = deriveStatus(
      { stale: false, lastUpdatedISO: isoSecondsBefore(SAT_NOON, 12) },
      SAT_NOON,
    );
    expect(result.state).toBe('CLOSED');
  });

  it('throws on an unparseable lastUpdatedISO string', () => {
    expect(() =>
      deriveStatus({ stale: false, lastUpdatedISO: 'not-a-date' }, FRI_NOON),
    ).toThrow();
  });
});

describe('formatStripAge', () => {
  it('renders under 60 seconds as seconds-ago copy', () => {
    expect(formatStripAge('LIVE', 12)).toContain('san');
    expect(formatStripAge('STALE', 5)).toContain('san');
  });

  it('renders 60 seconds or more as minute copy', () => {
    expect(formatStripAge('LIVE', 90)).toContain('dəq');
    expect(formatStripAge('STALE', 240)).toContain('dəq');
  });

  it('renders the closed line for CLOSED', () => {
    expect(formatStripAge('CLOSED', 0)).toBe(
      'BAZAR BAĞLIDIR — son bağlanış şamları',
    );
  });
});
