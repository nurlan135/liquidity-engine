import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import {
  CORR_MIN,
  CORR_WINDOW,
  SMT_TOL_BPS,
  SWING_K,
  SWING_LOOKBACK,
  detectSMT,
  evaluateSMT,
  matchSwings,
  pearsonCorr,
} from '@/src/lib/ict/smt';
import rollweek from '@/src/lib/__fixtures__/smt-rollweek.json';

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
    expect(SWING_LOOKBACK).toBe(60);
  });

  it('throws on non-finite or non-positive tolerance while echoing the value', () => {
    const pairs = matchSwings(
      leg(7, [20000, 20050, 20100, 20200, 20100, 20050, 20000], rising(7, 19900, 10)),
      leg(7, [6000, 6020, 6050, 6100, 6050, 6020, 6000], rising(7, 5900, 5)),
    );
    expect(() => detectSMT(pairs, 0)).toThrow(/got 0/);
    expect(() => detectSMT(pairs, -5)).toThrow(/got -5/);
    expect(() => detectSMT(pairs, Number.NaN)).toThrow(/got NaN/);
  });
});

describe('smt hardening: gates, negative fixtures, purity', () => {
  // NQ and ES both trend cleanly for 25 bars; correlation stays coupled and
  // neither leg trips the rollover wire => a directional or NO-SIGNAL output,
  // never a suppressed envelope.
  function coupledPair(): { nq: Candle[]; es: Candle[] } {
    const nq: Candle[] = [];
    const es: Candle[] = [];
    for (let i = 0; i < 25; i++) {
      const day = String(5 + i).padStart(2, '0');
      const nc = 20000 + 25 * i;
      const ec = 6000 + 8 * i;
      nq.push({ date: `2026-01-${day}`, open: nc - 5, high: nc + 10, low: nc - 10, close: nc });
      es.push({ date: `2026-01-${day}`, open: ec - 2, high: ec + 6, low: ec - 6, close: ec });
    }
    return { nq, es };
  }

  it('choppy plus-or-minus-1-bar offset pair asserts NO-SIGNAL', () => {
    const base = rising(15, 20000, 20);
    const chop = [0, 12, -8, 15, -10, 9, -12, 11, -9, 13, -11, 8, -7, 10, -6];
    const nqHighs = base.map((v, i) => v + chop[i] + 60);
    const nqLows = base.map((v, i) => v + chop[i] - 60);
    const esHighs = base.map((v, i) => (v + chop[(i + 14) % 15]) / 3.32 + 30);
    const esLows = base.map((v, i) => (v + chop[(i + 14) % 15]) / 3.32 - 30);
    const nq = leg(15, nqHighs, nqLows);
    const es = leg(15, esHighs, esLows);
    const pairs = matchSwings(nq, es);
    const signal = detectSMT(pairs);
    if (signal.suppressed) {
      throw new Error('expected NO-SIGNAL, got suppressed');
    }
    expect(signal.direction).toBe('NO-SIGNAL');
    expect(signal.sweeperLeg).toBeNull();
  });

  it('lookback shift: shifting one leg by 2 bars does not flip direction', () => {
    const nq = leg(15, BEAR_NQ_HIGHS, rising(15, 19900, 10));
    const es = leg(15, BEAR_ES_HIGHS, rising(15, 5900, 5));
    const before = detectSMT(matchSwings(nq, es));
    if (before.suppressed) {
      throw new Error('expected a signal before the shift, got suppressed');
    }
    // Drop the first 2 ES bars (dates 2026-01-05/06) so the shared window
    // shortens by 2 bars without touching extremes — matched windows must
    // still resolve to the same kind and never flip direction.
    const shifted = es.slice(2);
    const after = detectSMT(matchSwings(nq, shifted));
    if (after.suppressed) {
      throw new Error('expected a signal after the shift, got suppressed');
    }
    expect(after.direction).toBe(before.direction);
  });

  it('decoupled low-correlation pair asserts suppressed CORR_DECOUPLED with corr below 0.70', () => {
    const nq: Candle[] = [];
    const es: Candle[] = [];
    for (let i = 0; i < 25; i++) {
      const day = String(5 + i).padStart(2, '0');
      const nc = 20000 + 40 * i;
      // ES alternates direction every bar so Pearson r against the steady NQ
      // climb collapses well under the 0.70 floor.
      const ec = i % 2 === 0 ? 6000 + 8 * i : 6200 - 8 * i;
      nq.push({ date: `2026-01-${day}`, open: nc - 5, high: nc + 10, low: nc - 10, close: nc });
      es.push({ date: `2026-01-${day}`, open: ec - 2, high: ec + 6, low: ec - 6, close: ec });
    }
    const out = evaluateSMT(nq, es, '2026-01-29');
    expect(out.suppressed).toBe(true);
    if (!out.suppressed) {
      throw new Error('expected CORR_DECOUPLED suppression, got a signal');
    }
    expect(out.reason).toBe('CORR_DECOUPLED');
    expect(out.corr).toBeDefined();
    expect(out.corr as number).toBeLessThan(0.7);
  });

  it('thin history: fewer than CORR_WINDOW paired closes suppresses without a corr field', () => {
    const { nq, es } = coupledPair();
    const out = evaluateSMT(nq.slice(0, 10), es.slice(0, 10), '2026-01-14');
    expect(out.suppressed).toBe(true);
    if (!out.suppressed) {
      throw new Error('expected thin-history suppression, got a signal');
    }
    expect(out.reason).toBe('CORR_DECOUPLED');
    expect(out.corr).toBeUndefined();
  });

  it('flat-ES 20-close window asserts suppressed output with no throw', () => {
    const { nq, es } = coupledPair();
    const flat = es.map((c) => ({ ...c, open: 6000, high: 6000, low: 6000, close: 6000 }));
    let out;
    expect(() => {
      out = evaluateSMT(nq, flat, '2026-01-29');
    }).not.toThrow();
    expect(out!.suppressed).toBe(true);
    if (!out!.suppressed) {
      throw new Error('expected zero-variance suppression, got a signal');
    }
    expect(out!.reason).toBe('CORR_DECOUPLED');
    expect(pearsonCorr(Array.from({ length: 20 }, (_, i) => i), Array(20).fill(6000))).toBeNaN();
  });

  it('joint roll-week fixture asserts suppressed rollover-week rather than divergence', () => {
    const nq = rollweek.nq as unknown as Candle[];
    const es = rollweek.es as unknown as Candle[];
    expect(nq).toHaveLength(25);
    expect(es).toHaveLength(25);
    const out = evaluateSMT(nq, es, '2026-01-29');
    expect(out.suppressed).toBe(true);
    if (!out.suppressed) {
      throw new Error('expected rollover-week suppression, got a signal');
    }
    expect(out.reason).toBe('rollover-week');
  });

  it('exact-tolerance edge: gap equal to SMT_TOL_BPS asserts NO-SIGNAL', () => {
    // Prior high pair at 20200 (NQ) / 6100 (ES), latest NQ takes to 20300
    // while ES holds at 6084.75 — hold gap exactly 25 bps under
    // strict-greater-than semantics => NO-SIGNAL.
    const priorHigh = { windowStart: '2026-01-05', windowEnd: '2026-01-09', kind: 'high' as const, nqExtreme: 20200, esExtreme: 6100 };
    const latestHigh = { windowStart: '2026-01-20', windowEnd: '2026-01-24', kind: 'high' as const, nqExtreme: 20300, esExtreme: 6084.75 };
    expect(((6100 - 6084.75) / 6100) * 10000).toBeCloseTo(25, 10);
    const signal = detectSMT([priorHigh, latestHigh]);
    if (signal.suppressed) {
      throw new Error('expected NO-SIGNAL, got suppressed');
    }
    expect(signal.direction).toBe('NO-SIGNAL');
    expect(signal.sweeperLeg).toBeNull();
  });

  it('forming-exclusion: forming-flagged rows never enter pairs', () => {
    const nq = leg(15, BEAR_NQ_HIGHS, rising(15, 19900, 10));
    const es = leg(15, BEAR_ES_HIGHS, rising(15, 5900, 5));
    const clean = matchSwings(nq, es);
    expect(clean.length).toBeGreaterThan(0);
    // Flag the swing-center bars themselves (index 4 and 10) plus every other
    // bar as forming; the surviving closed set cannot form the k=2 fractal,
    // so no pair may reference the removed dates.
    const flaggedNQ = nq.map((c, i) => (i % 2 === 0 ? { ...c, forming: true } : c));
    const flaggedES = es.map((c, i) => (i % 2 === 0 ? { ...c, forming: true } : c));
    const pairs = matchSwings(flaggedNQ, flaggedES);
    const removed = new Set(
      nq.filter((_, i) => i % 2 === 0).map((c) => c.date),
    );
    for (const p of pairs) {
      expect(removed.has(p.windowStart)).toBe(false);
      expect(removed.has(p.windowEnd)).toBe(false);
    }
    expect(pairs.length).toBeLessThanOrEqual(clean.length);
  });

  it('coupled clean pair passes all gates without suppression', () => {
    const { nq, es } = coupledPair();
    const out = evaluateSMT(nq, es, '2026-01-29');
    expect(out.suppressed).toBe(false);
  });

  it('evaluateSMT drops non-finite OHLC rows at the boundary without throwing', () => {
    const { nq, es } = coupledPair();
    const poisoned = nq.map((c, i) =>
      i === 3 ? { ...c, high: Number.NaN, close: Number.NaN } : c,
    );
    let out;
    expect(() => {
      out = evaluateSMT(poisoned, es, '2026-01-29');
    }).not.toThrow();
    expect(out).toBeDefined();
  });

  it('evaluateSMT never mutates caller arrays', () => {
    const { nq, es } = coupledPair();
    const nqJson = JSON.stringify(nq);
    const esJson = JSON.stringify(es);
    evaluateSMT(nq, es, '2026-01-29');
    expect(JSON.stringify(nq)).toBe(nqJson);
    expect(JSON.stringify(es)).toBe(esJson);
  });
});
