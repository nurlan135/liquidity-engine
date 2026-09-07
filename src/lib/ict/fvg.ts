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

// CR-02: gaps may come from a longer history than the evaluation window
// (trailing-20 map, truncated chart window, rolled history). A stale origin
// is untestable, not an error — callers skip it (mitigation keeps the gap,
// transition ignores it) instead of throwing.
function originIndexOrNeg1(closed: Candle[], originDate: string): number {
  return closed.findIndex((c) => c.date === originDate);
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
    const origin = originIndexOrNeg1(closed, gap.originDate);
    if (origin === -1) {
      active.push({ ...gap, mitigated: false });
      continue;
    }
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
  // WR-07: sort by originDate before the trailing-20 slice so the map and the
  // transition layer (which sorts identically) agree on what is current, even
  // for unsorted gap input.
  active.sort((a, b) => (a.originDate < b.originDate ? -1 : a.originDate > b.originDate ? 1 : 0));
  return active.slice(-FVG_MAP_BOUND);
}

export type DeliveryState = 'ERL' | 'IRL';

export interface TransitionState {
  state: DeliveryState;
  originFvg: FvgGap;
  triggerCandle: string;
}

// D-10 sweep-then-reject: starting from ERL, evaluate candles after each gap
// origin in chronological order and flip to IRL only when a single candle
// satisfies both halves — for a bullish gap the wick pierces strictly below
// the bottom while the same candle closes at or above the bottom; for a
// bearish gap the wick pierces strictly above the top while the same candle
// closes at or below the top. A pierce whose close stays outside flips
// nothing and leaves the gap active (T-07-01: one bad wick cannot whiplash
// §2 prose). asOf is an injected plain-string date; no clock reads.
export function detectTransition(
  gaps: FvgGap[],
  candles: Candle[],
  asOf: string,
): TransitionState | null {
  if (!Array.isArray(gaps)) {
    throw new Error(`detectTransition requires a gap array, got ${String(gaps)}`);
  }
  if (!Array.isArray(candles)) {
    throw new Error(`detectTransition requires a Candle array, got ${String(candles)}`);
  }
  if (typeof asOf !== 'string' || asOf.length === 0) {
    throw new Error(`detectTransition requires an asOf date string, got ${String(asOf)}`);
  }
  const closed = closedOnly(candles).filter(isFiniteCandle);
  const ordered = [...gaps].sort((a, b) => (a.originDate < b.originDate ? -1 : a.originDate > b.originDate ? 1 : 0));
  for (const gap of ordered) {
    assertFiniteGap(gap, 'detectTransition');
    const origin = originIndexOrNeg1(closed, gap.originDate);
    if (origin === -1) continue;
    for (let j = origin + 1; j < closed.length; j++) {
      const c = closed[j];
      if (c.date > asOf) continue;
      const pierced = gap.polarity === 'BULLISH' ? c.low < gap.bottom : c.high > gap.top;
      if (!pierced) continue;
      const rejected = gap.polarity === 'BULLISH' ? c.close >= gap.bottom : c.close <= gap.top;
      if (rejected) {
        return { state: 'IRL', originFvg: { ...gap }, triggerCandle: c.date };
      }
    }
  }
  return null;
}

// D-11 §2 Delivery Cycle prose: deterministic IRL-aware delivery sentence
// selected from transition state. Null (no transition) names the ERL state
// token; a transition names IRL together with the origin bounds and trigger
// date. Neutral trap-vs-genuine house wording, no new report section.
export function describeDeliveryTransition(transition: TransitionState | null): string {
  if (transition === null) {
    return 'Delivery stays ERL: price holds external range and no fair-value gap shows a sweep-then-reject, so a trap read has no trigger yet.';
  }
  const { originFvg, triggerCandle } = transition;
  assertFiniteGap(originFvg, 'describeDeliveryTransition');
  return (
    `Delivery flips IRL: the ${originFvg.polarity === 'BULLISH' ? 'bullish' : 'bearish'} gap ` +
    `${originFvg.bottom}–${originFvg.top} swept and rejected on ${triggerCandle}, ` +
    'so genuine follow-through reads through that zone first and a trap read fades only on a second failure.'
  );
}
