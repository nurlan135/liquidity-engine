import type { BiasDirection, DealingRange, DOLTarget } from '@/src/lib/ict/types';

export const DOL_HIGH_NAME = 'Range High / PDH';
export const DOL_LOW_NAME = 'Range Low / PDL';

export function computePrimaryDOL(range: DealingRange, bias: BiasDirection, lastPrice: number): DOLTarget {
  if (!Number.isFinite(range.high) || !Number.isFinite(range.low)) {
    throw new Error('computePrimaryDOL requires a non-empty range with finite high and low');
  }
  if (bias === 'BULLISH') {
    return { name: DOL_HIGH_NAME, price: range.high };
  }
  if (bias === 'BEARISH') {
    return { name: DOL_LOW_NAME, price: range.low };
  }
  const distHigh = Math.abs(lastPrice - range.high);
  const distLow = Math.abs(lastPrice - range.low);
  if (distHigh <= distLow) {
    return { name: DOL_HIGH_NAME, price: range.high };
  }
  return { name: DOL_LOW_NAME, price: range.low };
}
