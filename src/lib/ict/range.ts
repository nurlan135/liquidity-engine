import type { Candle, DealingRange } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';

export const ANCHOR_WINDOW = 20;

export function computeRange(candles: Candle[], asOf: string, window: number = ANCHOR_WINDOW): DealingRange {
  const closed = closedOnly(candles);
  const rows = closed.slice(Math.max(0, closed.length - window));
  if (rows.length === 0) {
    throw new Error('computeRange requires at least one closed candle');
  }
  let high = rows[0].high;
  let low = rows[0].low;
  for (const c of rows) {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }
  const eq = (high + low) / 2;
  return {
    high,
    low,
    eq,
    window,
    asOf,
    thinHistory: closed.length < window,
  };
}

export function computePosition(range: DealingRange, price: number): number {
  if (range.high === range.low) {
    return 0.5;
  }
  return (price - range.low) / (range.high - range.low);
}

export function checkReanchor(prev: DealingRange, candle: Candle): boolean {
  if (candle.forming) {
    return false;
  }
  return candle.close > prev.high || candle.close < prev.low;
}
