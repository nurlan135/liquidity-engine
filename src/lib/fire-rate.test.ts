import { describe, expect, it } from 'vitest';
import type { FiringLogEntry, TriggerReasonKey } from '@/src/lib/ict/trigger';
import {
  FIRE_THRESHOLD_DEFAULT,
  FIRE_THRESHOLD_MAX,
  FIRE_THRESHOLD_MIN,
  countFireRate,
  fireRateCopy,
} from '@/src/lib/fire-rate';

const NOW = 1_800_000_000;
const DAY = 24 * 60 * 60;

function fire(asOf: number, verdict: FiringLogEntry['verdict'] = 'FIRE_LONG'): FiringLogEntry {
  const reasonKey = (
    verdict === 'ARMED' ? 'ARMED_MISSING_TIMING' : verdict
  ) as TriggerReasonKey;
  return {
    asOf,
    verdict,
    gates: { timing: true, purge: true, displacement: true },
    direction: 'LONG',
    reasonKey,
    sessionDate: '2026-10-27',
  };
}

describe('fire-rate band constants', () => {
  it('exports the single operator band source: min 1, max 7, default 4', () => {
    expect(FIRE_THRESHOLD_MIN).toBe(1);
    expect(FIRE_THRESHOLD_MAX).toBe(7);
    expect(FIRE_THRESHOLD_DEFAULT).toBe(4);
  });
});

describe('countFireRate', () => {
  it('empty log yields the empty status with zero count', () => {
    expect(countFireRate([], NOW, 4)).toEqual({ count7d: 0, status: 'empty' });
  });

  it('counts FIRE_LONG and FIRE_SHORT inside the inclusive 7-day window only', () => {
    const entries = [
      fire(NOW),
      fire(NOW - DAY, 'FIRE_SHORT'),
      fire(NOW - 7 * DAY), // inclusive lower bound
      fire(NOW - 7 * DAY - 1), // one second outside
      fire(NOW + 1), // future entry outside
      { ...fire(NOW - DAY), verdict: 'ARMED' as const }, // non-fire never counts
      { ...fire(NOW - DAY), verdict: 'WAIT_FOR_MANIPULATION' as const },
    ];
    expect(countFireRate(entries, NOW, 4)).toEqual({ count7d: 3, status: 'in' });
  });

  it('count equal to the threshold resolves in-band', () => {
    const entries = [fire(NOW), fire(NOW - DAY), fire(NOW - 2 * DAY), fire(NOW - 3 * DAY)];
    expect(countFireRate(entries, NOW, 4)).toEqual({ count7d: 4, status: 'in' });
  });

  it('count one above the threshold resolves above-band', () => {
    const entries = [
      fire(NOW),
      fire(NOW - DAY),
      fire(NOW - 2 * DAY),
      fire(NOW - 3 * DAY),
      fire(NOW - 4 * DAY),
    ];
    expect(countFireRate(entries, NOW, 4)).toEqual({ count7d: 5, status: 'above' });
  });

  it('history with zero fires in window resolves below-band', () => {
    const entries = [fire(NOW - 8 * DAY)];
    expect(countFireRate(entries, NOW, 4)).toEqual({ count7d: 0, status: 'below' });
  });

  it('non-finite now degrades to the empty result, never a throw', () => {
    expect(countFireRate([fire(1000)], NaN, 4)).toEqual({ count7d: 0, status: 'empty' });
    expect(countFireRate([fire(1000)], Infinity, 4)).toEqual({ count7d: 0, status: 'empty' });
  });
});

describe('fireRateCopy', () => {
  it('pins the in-band literal verbatim', () => {
    expect(fireRateCopy({ count7d: 2, status: 'in' })).toBe('WHY NOW: 2 fires / 7d — bandda');
  });

  it('pins the below-band literal verbatim', () => {
    expect(fireRateCopy({ count7d: 0, status: 'below' })).toBe(
      'WHY NOW: 0 fires / 7d — banddan aşağı (sakit həftə)',
    );
  });

  it('pins the above-band literal verbatim', () => {
    expect(fireRateCopy({ count7d: 6, status: 'above' })).toBe(
      'WHY NOW: 6 fires / 7d — banddan yuxarı (qızğın həftə)',
    );
  });

  it('pins the honest-empty literal verbatim', () => {
    expect(fireRateCopy({ count7d: 0, status: 'empty' })).toBe(
      'WHY NOW: 0 fires / 7d — hələ məlumat yoxdur',
    );
  });
});
