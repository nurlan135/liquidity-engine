import type { DealingRange } from '@/src/lib/ict/types';
import { computePosition } from '@/src/lib/ict/range';

export interface OTEPocket {
  lo: number;
  hi: number;
}

export interface LevelsOutput {
  eq: number;
  q1: number;
  q3: number;
  bullOTE: OTEPocket;
  bearOTE: OTEPocket;
  position: number;
}

const QUARTER = 0.25;
const THREE_QUARTER = 0.75;
const OTE_INNER = 0.62;
const OTE_OUTER = 0.79;

export function computeLevels(range: DealingRange, lastClose: number): LevelsOutput {
  if (!Number.isFinite(range.high) || !Number.isFinite(range.low) || !Number.isFinite(lastClose)) {
    throw new Error('computeLevels requires finite high, low, and lastClose');
  }
  const width = range.high - range.low;
  const eq = (range.high + range.low) / 2;
  const q1 = range.low + QUARTER * width;
  const q3 = range.low + THREE_QUARTER * width;
  const bullOTE: OTEPocket = {
    lo: range.high - OTE_OUTER * width,
    hi: range.high - OTE_INNER * width,
  };
  const bearOTE: OTEPocket = {
    lo: range.low + OTE_INNER * width,
    hi: range.low + OTE_OUTER * width,
  };
  return { eq, q1, q3, bullOTE, bearOTE, position: computePosition(range, lastClose) };
}
