import type { Candle, RegimeOutput, RegimeState } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';

export const ATR_PERIOD = 14;
export const REGIME_AVG_WINDOW = 20;
export const MIN_CANDLES_FULL = 34;

export function trueRange(current: Candle, previous: Candle): number {
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previous.close),
    Math.abs(current.low - previous.close),
  );
}

export function computeATR(candles: Candle[], period: number = ATR_PERIOD): number[] {
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`computeATR requires a positive integer period, got ${period}`);
  }
  const closed = closedOnly(candles);
  if (closed.length < period + 1) {
    return [];
  }
  const ranges: number[] = [];
  for (let i = 1; i < closed.length; i++) {
    ranges.push(trueRange(closed[i], closed[i - 1]));
  }
  const smoothed: number[] = [];
  let atr = 0;
  for (let i = 0; i < period; i++) {
    atr += ranges[i];
  }
  atr /= period;
  smoothed.push(atr);
  for (let i = period; i < ranges.length; i++) {
    atr = (atr * (period - 1) + ranges[i]) / period;
    smoothed.push(atr);
  }
  return smoothed;
}

export function computeRegime(candles: Candle[]): RegimeOutput {
  const closed = closedOnly(candles);
  if (closed.length < MIN_CANDLES_FULL) {
    return {
      regime: 'compression',
      rationale: `Insufficient history (${closed.length} of ${MIN_CANDLES_FULL} closed candles): honest degrade to compression until the ATR window fills.`,
      atr: 0,
      avg: 0,
    };
  }
  const series = computeATR(closed, ATR_PERIOD);
  const window = series.slice(-REGIME_AVG_WINDOW);
  const current = window[window.length - 1];
  let sum = 0;
  for (const value of window) {
    sum += value;
  }
  const avg = sum / window.length;
  let regime: RegimeState = 'compression';
  let rationale = `ATR ${current} at or below its ${REGIME_AVG_WINDOW}-bar average ${avg}: volatility compressed.`;
  if (current > avg) {
    regime = 'expansion';
    rationale = `ATR ${current} exceeds its ${REGIME_AVG_WINDOW}-bar average ${avg}: volatility expanding.`;
  }
  return { regime, rationale, atr: current, avg };
}
