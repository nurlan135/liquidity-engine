import { describe, expect, it } from 'vitest';
import { formatCountdown, isPreNews } from '@/src/lib/countdown';

describe('calendar: countdown formatter and pre-news window', () => {
  it('renders a future target as day and hour parts from an injected now', () => {
    const now = new Date('2026-02-09T12:00:00.000Z');
    expect(formatCountdown('2026-02-11T16:00:00.000Z', now)).toBe('2g 4s sonra');
    expect(formatCountdown('2026-02-09T15:00:00.000Z', now)).toBe('0g 3s sonra');
  });

  it('returns zero parts for past or current targets', () => {
    const now = new Date('2026-02-09T12:00:00.000Z');
    expect(formatCountdown('2026-02-09T12:00:00.000Z', now)).toBe('0g 0s sonra');
    expect(formatCountdown('2026-02-08T12:00:00.000Z', now)).toBe('0g 0s sonra');
  });

  it('returns true inside the 24 hour window and false outside it', () => {
    const now = new Date('2026-02-09T12:00:00.000Z');
    expect(isPreNews('2026-02-10T11:00:00.000Z', now)).toBe(true);
    expect(isPreNews('2026-02-10T13:00:00.000Z', now)).toBe(false);
    expect(isPreNews('2026-02-08T12:00:00.000Z', now)).toBe(false);
  });
});
