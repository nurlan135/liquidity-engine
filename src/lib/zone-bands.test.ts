import { describe, expect, it } from 'vitest';
import { zoneBands } from '@/src/lib/zone-bands';

describe('zoneBands', () => {
  it('splits a 100/0/50 range into premium 50-100 and discount 0-50 halves', () => {
    const bands = zoneBands({ high: 100, low: 0, eq: 50, window: 20, asOf: '2026-09-04', thinHistory: false });
    expect(bands.premiumBottom).toBe(50);
    expect(bands.premiumTop).toBe(100);
    expect(bands.discountBottom).toBe(0);
    expect(bands.discountTop).toBe(50);
  });

  it('throws on non-finite high low or eq', () => {
    expect(() =>
      zoneBands({ high: NaN, low: 0, eq: 50, window: 20, asOf: '2026-09-04', thinHistory: false }),
    ).toThrow();
    expect(() =>
      zoneBands({ high: 100, low: Infinity, eq: 50, window: 20, asOf: '2026-09-04', thinHistory: false }),
    ).toThrow();
    expect(() =>
      zoneBands({ high: 100, low: 0, eq: NaN, window: 20, asOf: '2026-09-04', thinHistory: false }),
    ).toThrow();
  });

  it('throws when eq lies outside the high low span', () => {
    expect(() =>
      zoneBands({ high: 100, low: 0, eq: 150, window: 20, asOf: '2026-09-04', thinHistory: false }),
    ).toThrow();
    expect(() =>
      zoneBands({ high: 100, low: 0, eq: -10, window: 20, asOf: '2026-09-04', thinHistory: false }),
    ).toThrow();
  });
});
