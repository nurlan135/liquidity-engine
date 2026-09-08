import { describe, expect, it } from 'vitest';
import { formatSessionLine } from '@/src/lib/session-line';

describe('formatSessionLine', () => {
  it('formats Baku and NY HH:MM from an injected instant', () => {
    // 2026-09-06T12:00:00Z -> Baku 16:00 (UTC+4), NY 08:00 (EDT, UTC-4).
    const now = new Date('2026-09-06T12:00:00Z');
    expect(formatSessionLine(now)).toBe('Bakı 16:00 · NY 08:00');
  });

  it('zero-pads single-digit hours and minutes', () => {
    // 2026-09-06T00:05:00Z -> Baku 04:05, NY 20:05 previous day.
    const now = new Date('2026-09-06T00:05:00Z');
    expect(formatSessionLine(now)).toBe('Bakı 04:05 · NY 20:05');
  });
});
