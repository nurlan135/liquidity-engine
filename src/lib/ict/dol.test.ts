import { describe, expect, it } from 'vitest';
import type { DealingRange } from '@/src/lib/ict/types';
import { computePrimaryDOL, DOL_HIGH_NAME, DOL_LOW_NAME } from '@/src/lib/ict/dol';

const RANGE: DealingRange = {
  high: 21000,
  low: 20000,
  eq: 20500,
  window: 20,
  asOf: '2026-01-24',
  thinHistory: false,
};

describe('dol: single named Primary DOL', () => {
  it('bullish bias selects the range high labeled Range High / PDH', () => {
    const dol = computePrimaryDOL(RANGE, 'BULLISH', 20200);
    expect(dol.name).toBe('Range High / PDH');
    expect(dol.name).toBe(DOL_HIGH_NAME);
    expect(dol.price).toBe(21000);
  });

  it('bearish bias selects the range low labeled Range Low / PDL', () => {
    const dol = computePrimaryDOL(RANGE, 'BEARISH', 20800);
    expect(dol.name).toBe('Range Low / PDL');
    expect(dol.name).toBe(DOL_LOW_NAME);
    expect(dol.price).toBe(20000);
  });

  it('compression selects the nearer extreme by absolute distance', () => {
    expect(computePrimaryDOL(RANGE, 'COMPRESSION', 20800).price).toBe(21000);
    expect(computePrimaryDOL(RANGE, 'COMPRESSION', 20200).price).toBe(20000);
  });

  it('equidistant compression resolves deterministically to the high', () => {
    const dol = computePrimaryDOL(RANGE, 'COMPRESSION', 20500);
    expect(dol.price).toBe(21000);
    expect(dol.name).toBe('Range High / PDH');
  });

  it('DOL price equals the selected extreme exactly with no offset', () => {
    expect(computePrimaryDOL(RANGE, 'BULLISH', 20000).price).toBe(RANGE.high);
    expect(computePrimaryDOL(RANGE, 'BEARISH', 21000).price).toBe(RANGE.low);
  });

  it('empty range input raises an explicit error', () => {
    const empty = { ...RANGE, high: Number.NaN, low: Number.NaN };
    expect(() => computePrimaryDOL(empty, 'BULLISH', 20500)).toThrow();
  });
});
