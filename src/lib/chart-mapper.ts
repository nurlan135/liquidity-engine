import type { Candle } from '@/src/lib/ict/types';

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
