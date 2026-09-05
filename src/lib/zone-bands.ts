import type { DealingRange } from '@/src/lib/ict/types';

// Premium/discount halves of a dealing range (D-11): premium runs eq to
// high, discount runs low to eq.
export interface ZoneBands {
  premiumTop: number;
  premiumBottom: number;
  discountTop: number;
  discountBottom: number;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function zoneBands(range: DealingRange): ZoneBands {
  if (!isFiniteNumber(range.high) || !isFiniteNumber(range.low) || !isFiniteNumber(range.eq)) {
    throw new Error('zoneBands requires finite high, low, and eq');
  }
  if (range.high < range.low) {
    throw new Error('zoneBands requires high >= low');
  }
  if (range.eq < range.low || range.eq > range.high) {
    throw new Error('zoneBands requires eq inside the high/low span');
  }
  return {
    premiumTop: range.high,
    premiumBottom: range.eq,
    discountTop: range.eq,
    discountBottom: range.low,
  };
}
