import type { Candle } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';

// D-02: fractal swing parameter shared by both legs, pinned by test.
export const SWING_K = 2;
// D-03: fixed non-confirmation tolerance in basis points, pinned by test.
export const SMT_TOL_BPS = 25;
// D-05: rolling correlation gate window and decouple threshold, pinned by test.
export const CORR_WINDOW = 20;
export const CORR_MIN = 0.7;
// D-02: trailing daily-bar window inside which swings are paired.
export const SWING_LOOKBACK = 60;

export interface MatchedSwing {
  windowStart: string;
  windowEnd: string;
  kind: 'high' | 'low';
  nqExtreme: number;
  esExtreme: number;
}

export interface SmtLegWindow {
  start: string;
  end: string;
  extreme: number;
}

export interface SmtSignal {
  suppressed: false;
  direction: 'BULLISH' | 'BEARISH' | 'NO-SIGNAL';
  sweeperLeg: 'NQ' | 'ES' | null;
  nqWindow: SmtLegWindow | null;
  esWindow: SmtLegWindow | null;
  bpsGap: number;
}

export interface SmtSuppressed {
  suppressed: true;
  reason: 'CORR_DECOUPLED' | 'rollover-week';
  corr?: number;
}

export type SmtOutput = SmtSignal | SmtSuppressed;

// Strict fractal swing high: high[i] is the strict maximum of its k
// neighbors each side. Equality means no swing.
export function isSwingHigh(highs: number[], i: number, k: number): boolean {
  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`isSwingHigh requires a positive integer k, got ${k}`);
  }
  if (i < k || i + k >= highs.length) {
    return false;
  }
  for (let j = i - k; j <= i + k; j++) {
    if (j !== i && highs[j] >= highs[i]) {
      return false;
    }
  }
  return true;
}

// Strict fractal swing low: low[i] is the strict minimum of its k
// neighbors each side. Equality means no swing.
export function isSwingLow(lows: number[], i: number, k: number): boolean {
  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`isSwingLow requires a positive integer k, got ${k}`);
  }
  if (i < k || i + k >= lows.length) {
    return false;
  }
  for (let j = i - k; j <= i + k; j++) {
    if (j !== i && lows[j] <= lows[i]) {
      return false;
    }
  }
  return true;
}

function hasFiniteOhlc(c: Candle): boolean {
  return (
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
}

interface LegSwing {
  start: string;
  end: string;
  kind: 'high' | 'low';
  extreme: number;
}

function detectSwings(leg: Candle[], k: number): LegSwing[] {
  const out: LegSwing[] = [];
  const highs = leg.map((c) => c.high);
  const lows = leg.map((c) => c.low);
  for (let i = 0; i < leg.length; i++) {
    if (isSwingHigh(highs, i, k)) {
      out.push({ start: leg[i - k].date, end: leg[i + k].date, kind: 'high', extreme: leg[i].high });
    }
    if (isSwingLow(lows, i, k)) {
      out.push({ start: leg[i - k].date, end: leg[i + k].date, kind: 'low', extreme: leg[i].low });
    }
  }
  return out;
}

// Time-anchored swing matching on D1 daily candles only (D-01). Both legs go
// through closedOnly first, swings are detected with the same k on both legs,
// and pairs form on overlapping calendar date windows only — never by array
// index. Reads the trailing SWING_LOOKBACK closed bars per leg on copies;
// caller arrays are never mutated, so the D1 NQ anchor path stays untouched.
export function matchSwings(nq: Candle[], es: Candle[], k: number = SWING_K): MatchedSwing[] {
  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`matchSwings requires a positive integer k, got ${k}`);
  }
  // T-07-01: boundary re-validation — non-finite OHLC rows drop before
  // pairing so NaN can never poison the comparator.
  const nqLeg = closedOnly(nq).filter(hasFiniteOhlc).slice(-SWING_LOOKBACK);
  const esLeg = closedOnly(es).filter(hasFiniteOhlc).slice(-SWING_LOOKBACK);
  const nqSwings = detectSwings(nqLeg, k);
  const esSwings = detectSwings(esLeg, k);
  const used = new Set<number>();
  const pairs: MatchedSwing[] = [];
  for (const n of nqSwings) {
    for (let e = 0; e < esSwings.length; e++) {
      if (used.has(e)) {
        continue;
      }
      const s = esSwings[e];
      if (s.kind !== n.kind) {
        continue;
      }
      if (n.start <= s.end && s.start <= n.end) {
        used.add(e);
        pairs.push({
          windowStart: n.start > s.start ? n.start : s.start,
          windowEnd: n.end < s.end ? n.end : s.end,
          kind: n.kind,
          nqExtreme: n.extreme,
          esExtreme: s.extreme,
        });
        break;
      }
    }
  }
  pairs.sort((a, b) => (a.windowStart < b.windowStart ? -1 : a.windowStart > b.windowStart ? 1 : 0));
  return pairs;
}

function bpsGap(sweptPrice: number, heldPrice: number, referenceExtreme: number): number {
  return (Math.abs(sweptPrice - heldPrice) / referenceExtreme) * 10000;
}

function legWindows(pair: MatchedSwing): { nqWindow: SmtLegWindow; esWindow: SmtLegWindow } {
  return {
    nqWindow: { start: pair.windowStart, end: pair.windowEnd, extreme: pair.nqExtreme },
    esWindow: { start: pair.windowStart, end: pair.windowEnd, extreme: pair.esExtreme },
  };
}

function noSignal(pair: MatchedSwing | null): SmtSignal {
  if (pair === null) {
    return {
      suppressed: false,
      direction: 'NO-SIGNAL',
      sweeperLeg: null,
      nqWindow: null,
      esWindow: null,
      bpsGap: 0,
    };
  }
  const { nqWindow, esWindow } = legWindows(pair);
  return {
    suppressed: false,
    direction: 'NO-SIGNAL',
    sweeperLeg: null,
    nqWindow,
    esWindow,
    bpsGap: 0,
  };
}

// Directional SMT compare over matched time-anchored pairs (D-04). Evaluates
// the most recent pair against its predecessor; anything that is not a clean
// sweep-vs-hold outside tolerance defaults to NO-SIGNAL. A gap exactly equal
// to tolerance is NO-SIGNAL under strict-greater-than semantics.
export function detectSMT(pairs: MatchedSwing[], toleranceBps: number = SMT_TOL_BPS): SmtSignal {
  if (!Number.isFinite(toleranceBps) || toleranceBps <= 0) {
    throw new Error(`detectSMT requires a finite positive toleranceBps, got ${toleranceBps}`);
  }
  if (pairs.length === 0) {
    return noSignal(null);
  }
  const latest = pairs[pairs.length - 1];
  const { nqWindow, esWindow } = legWindows(latest);
  if (pairs.length < 2) {
    return noSignal(latest);
  }
  const prior = pairs[pairs.length - 2];
  if (latest.kind !== prior.kind) {
    return noSignal(latest);
  }
  const extremes = [latest.nqExtreme, latest.esExtreme, prior.nqExtreme, prior.esExtreme];
  if (!extremes.every(Number.isFinite) || prior.nqExtreme <= 0 || prior.esExtreme <= 0) {
    return noSignal(latest);
  }
  if (latest.kind === 'high') {
    // Bearish SMT: NQ takes its prior high while ES holds below its own
    // prior high by more than tolerance. The sweeping leg is the manipulated
    // one — name NQ as the sweeper (fade NQ).
    if (latest.nqExtreme > prior.nqExtreme) {
      const holdGapBps = ((prior.esExtreme - latest.esExtreme) / prior.esExtreme) * 10000;
      if (holdGapBps > toleranceBps) {
        return {
          suppressed: false,
          direction: 'BEARISH',
          sweeperLeg: 'NQ',
          nqWindow,
          esWindow,
          bpsGap: bpsGap(latest.nqExtreme, latest.esExtreme, prior.esExtreme),
        };
      }
    }
    return noSignal(latest);
  }
  // Bullish mirror: ES takes its prior low while NQ holds above its own
  // prior low by more than tolerance. Sweeper is ES.
  if (latest.esExtreme < prior.esExtreme) {
    const holdGapBps = ((latest.nqExtreme - prior.nqExtreme) / prior.nqExtreme) * 10000;
    if (holdGapBps > toleranceBps) {
      return {
        suppressed: false,
        direction: 'BULLISH',
        sweeperLeg: 'ES',
        nqWindow,
        esWindow,
        bpsGap: bpsGap(latest.esExtreme, latest.nqExtreme, prior.nqExtreme),
      };
    }
  }
  return noSignal(latest);
}
