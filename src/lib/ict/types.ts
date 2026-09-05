export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  forming?: boolean;
}

export interface DealingRange {
  high: number;
  low: number;
  eq: number;
  window: number;
  asOf: string;
  thinHistory: boolean;
}

export type BiasDirection = 'BULLISH' | 'BEARISH' | 'COMPRESSION';
export type RegimeState = 'expansion' | 'compression';

export interface BiasOutput {
  bias: BiasDirection;
  rationale: string;
  position: number;
  regime: RegimeState;
}

export interface DOLTarget {
  name: string;
  price: number;
}

export interface RegimeOutput {
  regime: RegimeState;
  rationale: string;
  atr: number;
  avg: number;
}

export interface RolloverFlag {
  rolloverSuspect: boolean;
  contractHint: string;
  proximityWarning: string | null;
}

export function closedOnly(candles: Candle[]): Candle[] {
  return candles.filter((c) => !c.forming);
}
