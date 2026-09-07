import type { Candle } from '@/src/lib/ict/types';
import type { LevelsOutput } from '@/src/lib/ict/levels';

export interface SeriesCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PriceLineInputs {
  eq: number;
  dol: number;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// Map proxy candles straight to lightweight-charts series rows, preserving
// business-day date strings verbatim with no conversion.
export function mapCandlesToSeries(candles: Candle[]): SeriesCandle[] {
  if (candles.length === 0) {
    throw new Error('mapCandlesToSeries requires at least one candle');
  }
  return candles.map((c) => {
    if (!isFiniteNumber(c.open) || !isFiniteNumber(c.high) || !isFiniteNumber(c.low) || !isFiniteNumber(c.close)) {
      throw new Error(`mapCandlesToSeries requires finite OHLC, got ${c.date}`);
    }
    return { time: c.date, open: c.open, high: c.high, low: c.low, close: c.close };
  });
}

// Pass range eq and DOL price through unchanged for price-line creation.
export function priceLineInputs(eq: number, dolPrice: number): PriceLineInputs {
  if (!isFiniteNumber(eq) || !isFiniteNumber(dolPrice)) {
    throw new Error('priceLineInputs requires finite eq and dolPrice');
  }
  return { eq, dol: dolPrice };
}

export interface AsiaLineInputs {
  asiaHigh: number;
  asiaLow: number;
}

// Pass the Asia range extremes through unchanged for dashed price-line
// creation (D-05). Guards with the module isFiniteNumber predicate and throws
// naming asiaLineInputs on any non-finite input; the NqChart caller wraps in
// try-catch so a throw renders no lines and never blocks the chart. The
// equal high-equals-low zero-width case is finite and passes deterministically
// as coincident values per the UI-06 adjacency predicate.
export function asiaLineInputs(high: number, low: number): AsiaLineInputs {
  if (!isFiniteNumber(high) || !isFiniteNumber(low)) {
    throw new Error(`asiaLineInputs requires finite asiaHigh and asiaLow, got ${String(high)} ${String(low)}`);
  }
  return { asiaHigh: high, asiaLow: low };
}

export interface LevelLineInputs {
  q1: number;
  q3: number;
  oteBull: number;
  oteBear: number;
}

// Pass quadrant lines through unchanged and collapse each OTE pocket to its
// mid for thin dashed price-line creation (D-03 four-line lock).
export function levelLineInputs(levels: LevelsOutput): LevelLineInputs {
  const { q1, q3, bullOTE, bearOTE } = levels;
  if (
    !isFiniteNumber(q1) ||
    !isFiniteNumber(q3) ||
    !isFiniteNumber(bullOTE.lo) ||
    !isFiniteNumber(bullOTE.hi) ||
    !isFiniteNumber(bearOTE.lo) ||
    !isFiniteNumber(bearOTE.hi)
  ) {
    throw new Error('levelLineInputs requires finite q1, q3, and OTE pocket bounds');
  }
  return {
    q1,
    q3,
    oteBull: (bullOTE.lo + bullOTE.hi) / 2,
    oteBear: (bearOTE.lo + bearOTE.hi) / 2,
  };
}
