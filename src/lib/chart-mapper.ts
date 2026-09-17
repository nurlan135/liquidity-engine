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

export interface PoolLineInputs {
  top: number;
  bottom: number;
}

// Pass one pool zone through unchanged for dashed price-line creation
// (Phase 20 D-09). Mirrors the asiaLineInputs finite guard: throws naming
// poolLineInputs on any non-finite input; the NqChart caller wraps in
// try-catch so a throw renders no lines for that leg and never blocks the
// chart. A throw nulls only the failing leg — sibling legs still render.
export function poolLineInputs(top: number, bottom: number): PoolLineInputs {
  if (!isFiniteNumber(top) || !isFiniteNumber(bottom)) {
    throw new Error(`poolLineInputs requires finite pool top and bottom, got ${String(top)} ${String(bottom)}`);
  }
  return { top, bottom };
}

// Local verdict view for the pool overlay gate (Phase 20 D-15). The
// dependency direction stays component-ward per D-20: the mapper owns no
// ticket types — the chart passes its already-bound ticketVerdict prop, and
// the gate answers whether pool and swept-ghost creation may run. STAND_ASIDE
// suppresses creation while the shared unconditional-removal paths still
// clear; every other verdict (EXECUTE_LONG, EXECUTE_SHORT, null, undefined)
// preserves current rendering behavior.
export type PoolVerdict = 'EXECUTE_LONG' | 'EXECUTE_SHORT' | 'STAND_ASIDE' | null | undefined;

export function shouldCreatePoolLines(verdict: PoolVerdict): boolean {
  return verdict !== 'STAND_ASIDE';
}

export interface TicketLineInputs {
  entry: number;
  sl: number;
  tp1: number;
  tp2: number | null;
  tp3: number | null;
}

// Pass the buffered ticket legs through unchanged for EXECUTE-only price
// line creation (Phase 21 D-07): the shell fans ticket.sl plus ticket.tp
// from the buffered computeTicket output, so the SL/TP lines move off the
// extreme with the buffer note in prose. Guards with the module
// isFiniteNumber predicate and throws naming ticketLineInputs on any
// non-finite entry, SL, or TP1 (TP2/TP3 stay nullable legs —
// unresolvable legs are legal nulls, never fillers); the NqChart caller
// wraps in try-catch so a throw renders no lines and never blocks the
// chart. Z-order unchanged: ticket legs create after Asia and before pool
// lines per the existing D-11 order.
export function ticketLineInputs(
  entry: number | null,
  sl: number | null,
  tp1: number | null,
  tp2: number | null,
  tp3: number | null,
): TicketLineInputs {
  if (!isFiniteNumber(entry) || !isFiniteNumber(sl) || !isFiniteNumber(tp1)) {
    throw new Error(
      `ticketLineInputs requires finite entry, sl, and tp1, got ${String(entry)} ${String(sl)} ${String(tp1)}`,
    );
  }
  if (tp2 !== null && tp2 !== undefined && !isFiniteNumber(tp2)) {
    throw new Error(`ticketLineInputs requires finite tp2 or null, got ${String(tp2)}`);
  }
  if (tp3 !== null && tp3 !== undefined && !isFiniteNumber(tp3)) {
    throw new Error(`ticketLineInputs requires finite tp3 or null, got ${String(tp3)}`);
  }
  return { entry, sl, tp1, tp2: tp2 ?? null, tp3: tp3 ?? null };
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
