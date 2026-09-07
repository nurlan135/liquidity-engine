import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import {
  CONFIRM_WINDOW,
  DISP_MULT,
  KILLZONE_END_MIN,
  KILLZONE_START_MIN,
  judasSwing,
} from '@/src/lib/ict/judas';
import type { AsiaRange } from '@/src/lib/ict/asia';
import type { IntradayCandle } from '@/src/lib/ict/types';

const STEP = 900;
const BASE = 20000;

function row(time: number, price: number, overrides: Partial<IntradayCandle> = {}): IntradayCandle {
  return {
    time,
    open: price,
    high: price + 8,
    low: price - 6,
    close: price + 3,
    ...overrides,
  };
}

// Epoch seconds of a NY wall-clock hour on a given NY calendar date. Built
// from date-fns-tz's own DST-aware zone conversion (fromZonedTime interprets
// the wall time in NY_TZ), so fixtures stay correct across both transitions
// without hand-rolled offsets.
function nyHourEpoch(nyDate: string, nyHour: number): number {
  return Math.floor(fromZonedTime(`${nyDate} ${String(nyHour).padStart(2, '0')}:00:00`, NY_TZ).getTime() / 1000);
}

// Minute-precision epoch helper mirroring the nyHourEpoch shape: epoch
// seconds of a NY wall-clock HH:MM on a given NY calendar date, resolved
// through the same DST-aware conversion.
function nyMinuteEpoch(nyDate: string, hhmm: string): number {
  return Math.floor(fromZonedTime(`${nyDate} ${hhmm}:00`, NY_TZ).getTime() / 1000);
}

// Eight consecutive closed 15M rows starting at a NY wall-clock hour.
function block8(nyDate: string, startHour: number, price = BASE): IntradayCandle[] {
  const rows: IntradayCandle[] = [];
  let t = nyHourEpoch(nyDate, startHour);
  for (let i = 0; i < 8; i++) {
    rows.push(row(t, price + i * 2));
    t += STEP;
  }
  return rows;
}

// Twelve consecutive closed 15M rows starting at a NY wall-clock HH:MM —
// the full 02:00-05:00 killzone strip.
function block15(nyDate: string, startHhmm: string, price = BASE): IntradayCandle[] {
  const rows: IntradayCandle[] = [];
  let t = nyMinuteEpoch(nyDate, startHhmm);
  for (let i = 0; i < 12; i++) {
    rows.push(row(t, price));
    t += STEP;
  }
  return rows;
}

// Quiet rows strictly inside the fixture range: price 20050 gives high
// 20058 and low 20044, both clear of the 20100/20000 extremes.
const SESSION = '2026-06-15';

function fixtureRange(): AsiaRange {
  return { high: 20100, low: 20000, height: 100, sessionDate: SESSION };
}

describe('judas: HIGH-side full conjunction', () => {
  it('confirms with sweepSide HIGH and displacementMult at or above 0.5', () => {
    const range = fixtureRange();
    const rows = block15(SESSION, '02:00', 20050);
    // 02:30 sweep: wick pierces strictly above the Asia high.
    rows[2] = row(rows[2].time, 20090, { high: 20120, low: 20060, close: 20105 });
    // 02:45 reversal: closes back through the high with 60/100 displacement.
    rows[3] = row(rows[3].time, 20030, { close: 20040 });
    const out = judasSwing(rows, range);
    expect(out.candidate).toBe(true);
    expect(out.confirmed).toBe(true);
    expect(out.preRun).toBe(false);
    expect(out.sweepSide).toBe('HIGH');
    expect(out.sweepTime).toBe(rows[2].time);
    expect(out.displacementMult).toBeGreaterThanOrEqual(0.5);
  });
});

describe('judas: LOW-side mirror', () => {
  it('confirms with sweepSide LOW on the mirrored conjunction', () => {
    const range = fixtureRange();
    const rows = block15(SESSION, '02:00', 20050);
    // 03:00 sweep: wick pierces strictly below the Asia low.
    rows[4] = row(rows[4].time, 20010, { high: 20040, low: 19980, close: 19995 });
    // 03:15 reversal: closes back through the low with 60/100 displacement.
    rows[5] = row(rows[5].time, 20060, { close: 20060 });
    const out = judasSwing(rows, range);
    expect(out.candidate).toBe(true);
    expect(out.confirmed).toBe(true);
    expect(out.sweepSide).toBe('LOW');
    expect(out.sweepTime).toBe(rows[4].time);
    expect(out.displacementMult).toBeGreaterThanOrEqual(0.5);
  });
});

describe('judas: double-sided sweep priority', () => {
  it('resolves a both-extremes candle by penetration distance (larger violation wins)', () => {
    const range = fixtureRange();
    // Deeper LOW penetration (120 below) than HIGH (20 above) resolves LOW.
    const lowWins = block15(SESSION, '02:00', 20050);
    lowWins[2] = row(lowWins[2].time, 20050, { high: 20120, low: 19880, close: 19900 });
    const lowOut = judasSwing(lowWins, range);
    expect(lowOut.candidate).toBe(true);
    expect(lowOut.preRun).toBe(false);
    expect(lowOut.sweepSide).toBe('LOW');
    expect(lowOut.sweepTime).toBe(lowWins[2].time);
    // Deeper HIGH penetration mirrors: resolves HIGH.
    const highWins = block15(SESSION, '02:00', 20050);
    highWins[2] = row(highWins[2].time, 20050, { high: 20220, low: 19980, close: 20150 });
    const highOut = judasSwing(highWins, range);
    expect(highOut.sweepSide).toBe('HIGH');
    expect(highOut.sweepTime).toBe(highWins[2].time);
  });

  it('prefers HIGH on an exact penetration tie for determinism', () => {
    const range = fixtureRange();
    // high 20120 is +20 above, low 19980 is -20 below: exact tie -> HIGH.
    const tied = block15(SESSION, '02:00', 20050);
    tied[2] = row(tied[2].time, 20050, { high: 20120, low: 19980, close: 20105 });
    const out = judasSwing(tied, range);
    expect(out.candidate).toBe(true);
    expect(out.sweepSide).toBe('HIGH');
    expect(judasSwing(tied, range)).toEqual(out);
  });
});

describe('judas: pierce without reversal persists as candidate', () => {
  it('holds candidate true with confirmed false when no in-window close reverses', () => {
    const range = fixtureRange();
    const rows = block15(SESSION, '02:00', 20050);
    rows[2] = row(rows[2].time, 20090, { high: 20120, low: 20060, close: 20105 });
    // Every in-window close stays above the Asia high: pierce, never reject.
    rows[3] = row(rows[3].time, 20090, { high: 20110, low: 20080, close: 20108 });
    rows[4] = row(rows[4].time, 20095, { high: 20112, low: 20085, close: 20110 });
    rows[5] = row(rows[5].time, 20085, { high: 20108, low: 20075, close: 20102 });
    const out = judasSwing(rows, range);
    expect(out.candidate).toBe(true);
    expect(out.confirmed).toBe(false);
    expect(out.preRun).toBe(false);
    expect(out.sweepSide).toBe('HIGH');
  });
});

describe('judas: pre-killzone sweep flags preRun', () => {
  it('returns preRun true with candidate false on the 01:47 fixture', () => {
    const range = fixtureRange();
    // Strip opens at 01:32 so index 1 lands on 01:47 — a textbook
    // pre-killzone sweep under the strict 02:00 edge.
    const rows = block15(SESSION, '01:32', 20050);
    // 01:47 sweep with a textbook reversal one candle later — still preRun,
    // never promoted: strict 02:00 edge per D-08.
    rows[1] = row(rows[1].time, 20090, { high: 20120, low: 20060, close: 20105 });
    rows[2] = row(rows[2].time, 20030, { close: 20040 });
    expect(rows[1].time).toBe(nyMinuteEpoch(SESSION, '01:47'));
    const out = judasSwing(rows, range);
    expect(out.preRun).toBe(true);
    expect(out.candidate).toBe(false);
    expect(out.confirmed).toBe(false);
    expect(out.sweepSide).toBe('HIGH');
    expect(out.sweepTime).toBe(rows[1].time);
    expect(out.displacementMult).toBe(0);
  });
});

describe('judas: confirmation window bound', () => {
  it('leaves confirmed false when the reversal lands on the fifth candle after the sweep', () => {
    const range = fixtureRange();
    // Strip opens at 02:15 so the index-0 sweep is strictly inside the
    // killzone; the window covers indices 0-3 and the reversal at index 4
    // (03:15) is the fifth candle — outside the bound.
    const rows = block15(SESSION, '02:15', 20050);
    rows[0] = row(rows[0].time, 20090, { high: 20120, low: 20060, close: 20105 });
    // Window covers indices 0-3 (sweep plus next 3): closes hold above high.
    rows[1] = row(rows[1].time, 20090, { high: 20110, low: 20080, close: 20108 });
    rows[2] = row(rows[2].time, 20090, { high: 20110, low: 20080, close: 20106 });
    rows[3] = row(rows[3].time, 20090, { high: 20110, low: 20080, close: 20104 });
    // Index 4 is the fifth candle after the sweep start — outside the bound.
    rows[4] = row(rows[4].time, 20030, { close: 20040 });
    const out = judasSwing(rows, range);
    expect(out.candidate).toBe(true);
    expect(out.confirmed).toBe(false);
    expect(CONFIRM_WINDOW).toBe(4);
  });
});

describe('judas: killzone edge strictness', () => {
  it('flags preRun on a sweep at exactly the 05:00 edge', () => {
    const range = fixtureRange();
    const rows = block15(SESSION, '04:00', 20050);
    // Index 4 lands on 05:00 — at or above the 300 edge is outside per D-07.
    rows[4] = row(rows[4].time, 20090, { high: 20120, low: 20060, close: 20105 });
    expect(rows[4].time).toBe(nyMinuteEpoch(SESSION, '05:00'));
    const out = judasSwing(rows, range);
    expect(out.preRun).toBe(true);
    expect(out.candidate).toBe(false);
    expect(out.confirmed).toBe(false);
    expect(KILLZONE_START_MIN).toBe(120);
    expect(KILLZONE_END_MIN).toBe(300);
  });
});

describe('judas: forming exclusion', () => {
  it('never lets forming-flagged rows seed or confirm a sweep', () => {
    const range = fixtureRange();
    const rows = block15(SESSION, '02:00', 20050);
    const formingSweep = row(rows[2].time, 20090, {
      high: 20120,
      low: 20060,
      close: 20040,
      forming: true,
    });
    const withForming = judasSwing([...rows, formingSweep], range);
    expect(withForming).toEqual(judasSwing(rows, range));
    expect(withForming.candidate).toBe(false);
    expect(withForming.confirmed).toBe(false);
    expect(withForming.preRun).toBe(false);
  });
});

describe('judas: empty input', () => {
  it('returns all-false states with null side, null time, and zero displacement', () => {
    const out = judasSwing([], fixtureRange());
    expect(out).toEqual({
      candidate: false,
      confirmed: false,
      preRun: false,
      sweepSide: null,
      sweepTime: null,
      displacementMult: 0,
    });
  });
});

describe('judas: determinism', () => {
  it('returns deep-equal output on consecutive evaluations of identical input', () => {
    const range = fixtureRange();
    const rows = block15(SESSION, '02:00', 20050);
    rows[2] = row(rows[2].time, 20090, { high: 20120, low: 20060, close: 20105 });
    rows[3] = row(rows[3].time, 20030, { close: 20040 });
    const first = judasSwing(rows, range);
    const second = judasSwing(rows, range);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });
});

describe('judas: constant pins', () => {
  it('pins DISP_MULT to the 0.5 budget seed', () => {
    expect(DISP_MULT).toBe(0.5);
  });
});
