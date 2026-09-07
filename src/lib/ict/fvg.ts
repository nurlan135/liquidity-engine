// FVG map: NQ D1 fair-value-gap inventory with close-through mitigation.
// Pure: injected candles only, zero store imports, no clock reads.
// D-09: both polarities, fill on close-through, latest-20 bound.

import type { Candle } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';

export const FVG_MAP_BOUND = 20;

export type FvgPolarity = 'BULLISH' | 'BEARISH';

export interface FvgGap {
  polarity: FvgPolarity;
  top: number;
  bottom: number;
  originDate: string;
  mitigated: boolean;
}

function isFiniteCandle(c: Candle): boolean {
  return (
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
}

function assertFiniteGap(gap: FvgGap, caller: string): void {
  if (!Number.isFinite(gap.top) || !Number.isFinite(gap.bottom)) {
    throw new Error(
      `${caller} requires finite gap bounds, got top=${gap.top} bottom=${gap.bottom}`,
    );
  }
}

function originIndex(closed: Candle[], originDate: string, caller: string): number {
  const idx = closed.findIndex((c) => c.date === originDate);
  if (idx === -1) {
    throw new Error(`${caller}: originDate ${originDate} not found in candle window`);
  }
  return idx;
}

// 3-candle imbalance scan over closed D1 rows. Bullish gap at middle index i:
// low[i+1] strictly above high[i-1] (zone top = low[i+1], bottom = high[i-1]).
// Bearish mirror: high[i+1] strictly below low[i-1]. Boundary equality is a
// touch, not a gap, and is skipped. Rows with non-finite OHLC are dropped at
// the boundary (T-07-01); forming rows never seed gaps.
export function detectFVGs(candles: Candle[]): FvgGap[] {
  if (!Array.isArray(candles)) {
    throw new Error(`detectFVGs requires a Candle array, got ${String(candles)}`);
  }
  const closed = closedOnly(candles).filter(isFiniteCandle);
  const gaps: FvgGap[] = [];
  for (let i = 1; i + 1 < closed.length; i++) {
    const prev = closed[i - 1];
    const next = closed[i + 1];
    if (next.low > prev.high) {
      gaps.push({
        polarity: 'BULLISH',
        top: next.low,
        bottom: prev.high,
        originDate: closed[i].date,
        mitigated: false,
      });
    } else if (next.high < prev.low) {
      gaps.push({
        polarity: 'BEARISH',
        top: prev.low,
        bottom: next.high,
        originDate: closed[i].date,
        mitigated: false,
      });
    }
  }
  return gaps;
}

// D-09 fill on close-through: a bullish gap is removed once a strictly later
// candle closes below the gap bottom; a bearish gap once a strictly later
// candle closes above the gap top. A wick touch without close-through keeps
// the gap. Returns the active map only, capped to the trailing
// FVG_MAP_BOUND gaps in origin order (T-07-03).
export function applyMitigation(gaps: FvgGap[], candles: Candle[]): FvgGap[] {
  if (!Array.isArray(gaps)) {
    throw new Error(`applyMitigation requires a gap array, got ${String(gaps)}`);
  }
  if (!Array.isArray(candles)) {
    throw new Error(`applyMitigation requires a Candle array, got ${String(candles)}`);
  }
  const closed = closedOnly(candles).filter(isFiniteCandle);
  const active: FvgGap[] = [];
  for (const gap of gaps) {
    if (gap.mitigated) continue;
    assertFiniteGap(gap, 'applyMitigation');
    const origin = originIndex(closed, gap.originDate, 'applyMitigation');
    let filled = false;
    for (let j = origin + 1; j < closed.length; j++) {
      const close = closed[j].close;
      if (gap.polarity === 'BULLISH' ? close < gap.bottom : close > gap.top) {
        filled = true;
        break;
      }
    }
    if (!filled) {
      active.push({ ...gap, mitigated: false });
    }
  }
  return active.slice(-FVG_MAP_BOUND);
}
