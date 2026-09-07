import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import {
  CORR_MIN,
  CORR_WINDOW,
  SMT_TOL_BPS,
  SWING_K,
  detectSMT,
  matchSwings,
} from '@/src/lib/ict/smt';

// Builder helpers in the rollover.test.ts style: explicit high/low rails per
// bar with the open/close pinned to the midpoint (finite, neutral).
function leg(n: number, highs: number[], lows: number[], startDay = 5): Candle[] {
  if (highs.length !== n || lows.length !== n) {
    throw new Error(`leg requires ${n} highs and lows, got ${highs.length}/${lows.length}`);
  }
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(startDay + i).padStart(2, '0');
    const mid = (highs[i] + lows[i]) / 2;
    out.push({ date: `2026-01-${day}`, open: mid, high: highs[i], low: lows[i], close: mid });
  }
  return out;
}

function rising(n: number, start: number, step: number): number[] {
  return Array.from({ length: n }, (_, i) => start + i * step);
}

// Bear fixture: both legs print swing highs at bar 4 and bar 10. NQ takes its
// prior high (20200 -> 20300) while ES holds below its own (6100 -> 6080,
// hold gap ~32.8 bps > 25 bps) => BEARISH with sweeperLeg NQ.
const BEAR_NQ_HIGHS = [20000, 20010, 20050, 20100, 20200, 20100, 20050, 20080, 20120, 20180, 20300, 20180, 20120, 20080, 20050];
const BEAR_ES_HIGHS = [6000, 6010, 6030, 6060, 6100, 6060, 6030, 6040, 6050, 6065, 6080, 6065, 6050, 6040, 6030];

// Bull fixture (mirror on swing lows): both legs print swing lows at bar 4
// and bar 10. ES takes its prior low (5900 -> 5880) while NQ holds above its
// own (19900 -> 19960, hold gap ~30.2 bps > 25 bps) => BULLISH, sweeperLeg ES.
const BULL_NQ_LOWS = [20000, 19990, 19960, 19930, 19900, 19930, 19960, 19970, 19965, 19962, 19960, 19962, 19965, 19970, 19975];
const BULL_ES_LOWS = [6000, 5980, 5940, 5920, 5900, 5920, 5940, 5930, 5920, 5900, 5880, 5900, 5920, 5930, 5940];

describe('smt tracer: bull/bear happy path end to end', () => {
  it('bearish mirror: NQ sweeps its prior high while ES holds => BEARISH, sweeperLeg NQ', () => {
    const nq = leg(15, BEAR_NQ_HIGHS, rising(15, 19900, 10));
    const es = leg(15, BEAR_ES_HIGHS, rising(15, 5900, 5));
    const pairs = matchSwings(nq, es);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].kind).toBe('high');
    expect(pairs[1].kind).toBe('high');
    const signal = detectSMT(pairs);
    expect(signal.suppressed).toBe(false);
    if (signal.suppressed) {
      throw new Error('expected a directional signal, got suppressed');
    }
    expect(signal.direction).toBe('BEARISH');
    expect(signal.sweeperLeg).toBe('NQ');
    expect(signal.nqWindow).not.toBeNull();
    expect(signal.esWindow).not.toBeNull();
    expect(signal.bpsGap).toBeGreaterThan(SMT_TOL_BPS);
  });

  it('bullish case: ES sweeps its prior low while NQ holds => BULLISH, sweeperLeg ES', () => {
    const nq = leg(15, rising(15, 20100, 10), BULL_NQ_LOWS);
    const es = leg(15, rising(15, 6050, 5), BULL_ES_LOWS);
    const pairs = matchSwings(nq, es);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].kind).toBe('low');
    expect(pairs[1].kind).toBe('low');
    const signal = detectSMT(pairs);
    expect(signal.suppressed).toBe(false);
    if (signal.suppressed) {
      throw new Error('expected a directional signal, got suppressed');
    }
    expect(signal.direction).toBe('BULLISH');
    expect(signal.sweeperLeg).toBe('ES');
    expect(signal.nqWindow).not.toBeNull();
    expect(signal.esWindow).not.toBeNull();
    expect(signal.bpsGap).toBeGreaterThan(SMT_TOL_BPS);
  });

  it('default NO-SIGNAL: a single matched pair carries no divergence', () => {
    const nq = leg(7, [20000, 20050, 20100, 20200, 20100, 20050, 20000], rising(7, 19900, 10));
    const es = leg(7, [6000, 6020, 6050, 6100, 6050, 6020, 6000], rising(7, 5900, 5));
    const pairs = matchSwings(nq, es);
    expect(pairs).toHaveLength(1);
    const signal = detectSMT(pairs);
    if (signal.suppressed) {
      throw new Error('expected NO-SIGNAL, got suppressed');
    }
    expect(signal.direction).toBe('NO-SIGNAL');
    expect(signal.sweeperLeg).toBeNull();
    expect(signal.nqWindow).not.toBeNull();
    expect(signal.esWindow).not.toBeNull();
  });

  it('default NO-SIGNAL: empty input returns null legs, never a bare flag', () => {
    const signal = detectSMT([]);
    if (signal.suppressed) {
      throw new Error('expected NO-SIGNAL, got suppressed');
    }
    expect(signal.direction).toBe('NO-SIGNAL');
    expect(signal.sweeperLeg).toBeNull();
    expect(signal.nqWindow).toBeNull();
    expect(signal.esWindow).toBeNull();
  });

  it('locked constants are pinned: SWING_K 2, SMT_TOL_BPS 25, CORR_WINDOW 20, CORR_MIN 0.70', () => {
    expect(SWING_K).toBe(2);
    expect(SMT_TOL_BPS).toBe(25);
    expect(CORR_WINDOW).toBe(20);
    expect(CORR_MIN).toBe(0.7);
  });
});
