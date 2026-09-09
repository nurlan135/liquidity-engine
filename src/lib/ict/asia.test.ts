import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { asiaRange, ASIA_END_NY_MINUTE, ASIA_START_NY_HOUR } from '@/src/lib/ict/asia';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { toBakuYMD } from '@/src/lib/time';
import type { IntradayCandle } from '@/src/lib/ict/types';

const STEP = 3600;
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

// Epoch seconds of a NY wall-clock minute on a given NY calendar date.
function nyMinuteEpoch(nyDate: string, nyHour: number, nyMinute: number): number {
  return Math.floor(
    fromZonedTime(
      `${nyDate} ${String(nyHour).padStart(2, '0')}:${String(nyMinute).padStart(2, '0')}:00`,
      NY_TZ,
    ).getTime() / 1000,
  );
}

// Consecutive closed 1H rows starting at a NY wall-clock hour.
function block(nyDate: string, startHour: number, count: number, price = BASE): IntradayCandle[] {
  const rows: IntradayCandle[] = [];
  let t = nyHourEpoch(nyDate, startHour);
  for (let i = 0; i < count; i++) {
    rows.push(row(t, price + i * 2));
    t += STEP;
  }
  return rows;
}

// Five-candle 20:00-00:00 input dates to the 20:00 NY open date; only the
// 20/21/22/23 rows sit inside the 20:00-23:45 killzone window.
const SESSION = '2026-06-15';

describe('asia: clean five-candle window', () => {
  it('resolves exact wick-to-wick high, low, and height on 20:00-23:00 rows', () => {
    // block(SESSION, 20, 5) emits 20/21/22/23 plus a 00:00 row carrying the
    // next NY calendar date — correctly excluded by the date equality.
    // In-window prices: 20000..20006; highs price+8, lows price-6.
    const rows = block(SESSION, 20, 5);
    const range = asiaRange(rows, SESSION);
    expect(range).not.toBeNull();
    expect(range!.high).toBe(BASE + 14);
    expect(range!.low).toBe(BASE - 6);
    expect(range!.height).toBe(20);
    expect(range!.sessionDate).toBe(SESSION);
  });

  it('excludes rows after the 23:45 killzone close on the same NY date', () => {
    // A 23:45 row is in-window; a 23:46 row on the same date is out.
    const inEdge = row(nyMinuteEpoch(SESSION, 23, 45), BASE);
    const outEdge = row(nyMinuteEpoch(SESSION, 23, 46), BASE + 400, {
      high: BASE + 900,
      low: BASE - 900,
    });
    const rows = block(SESSION, 20, 4);
    expect(asiaRange([...rows, inEdge], SESSION)).not.toBeNull();
    expect(asiaRange([...rows, inEdge, outEdge], SESSION)).toEqual(
      asiaRange([...rows, inEdge], SESSION),
    );
  });
});

describe('asia: constant pins', () => {
  it('pins ASIA_START_NY_HOUR to 20 and ASIA_END_NY_MINUTE to 23:45', () => {
    expect(ASIA_START_NY_HOUR).toBe(20);
    expect(ASIA_END_NY_MINUTE).toBe(23 * 60 + 45);
  });

  it('reuses NY_TZ America/New_York from the aggregate module', () => {
    expect(NY_TZ).toBe('America/New_York');
  });
});

describe('asia: post-midnight exclusion', () => {
  it('leaves high and low unchanged when 00:00-02:00 rows arrive', () => {
    const evening = block(SESSION, 20, 5);
    const without = asiaRange(evening, SESSION);
    expect(without).not.toBeNull();
    // 00:00-02:00 rows carry the next NY calendar date; they must not move
    // the range even when their wicks pierce both extremes.
    const postMidnight = block('2026-06-16', 0, 2, BASE + 100).map((r) => ({
      ...r,
      high: r.high + 500,
      low: r.low - 500,
    }));
    const withPost = asiaRange([...evening, ...postMidnight], SESSION);
    expect(withPost).toEqual(without);
  });
});

describe('asia: gap-skip', () => {
  it('yields the extremes of the four present rows when the 22:00 candle is missing', () => {
    const full = block(SESSION, 20, 5);
    // Remove the 22:00 row (index 2) — no interpolation, extremes recompute
    // from the surviving in-window rows. block() index 4 is the 00:00 row
    // (next NY date, excluded), so the gapped window holds 20/21/23 only.
    const gapped = full.filter((_, i) => i !== 2);
    expect(gapped).toHaveLength(4);
    const range = asiaRange(gapped, SESSION);
    expect(range).not.toBeNull();
    // Surviving in-window prices: 20000, 20002, 20006.
    expect(range!.high).toBe(BASE + 14);
    expect(range!.low).toBe(BASE - 6);
    expect(range!.height).toBe(20);
  });
});

describe('asia: forming exclusion', () => {
  it('never lets forming-flagged rows enter the range', () => {
    const closed = block(SESSION, 20, 5);
    const without = asiaRange(closed, SESSION);
    expect(without).not.toBeNull();
    const formingPierce = row(nyHourEpoch(SESSION, 21), BASE + 400, {
      forming: true,
      high: BASE + 900,
      low: BASE - 900,
    });
    const withForming = asiaRange([...closed, formingPierce], SESSION);
    expect(withForming).toEqual(without);
  });
});

describe('asia: empty window', () => {
  it('returns null on input with no in-window rows instead of throwing', () => {
    // Rows exist but land outside 20:00-23:45 (afternoon session).
    const outside = block(SESSION, 14, 4);
    expect(asiaRange(outside, SESSION)).toBeNull();
    expect(asiaRange([], SESSION)).toBeNull();
  });
});

describe('asia: determinism', () => {
  it('returns deep-equal output on consecutive polls of identical input', () => {
    const rows = block(SESSION, 20, 5);
    const first = asiaRange(rows, SESSION);
    const second = asiaRange(rows, SESSION);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });
});

describe('asia: sessionDate attribution', () => {
  it('carries the 20:00 open date over the evening window', () => {
    const rows = block('2026-06-17', 20, 5);
    const range = asiaRange(rows, '2026-06-17');
    expect(range).not.toBeNull();
    expect(range!.sessionDate).toBe('2026-06-17');
  });

  it('maps the 20:00 open instant to the expected Baku calendar date', () => {
    // 20:00 NY on 2026-06-15 (EDT, UTC-4) is 00:00+1 in Baku (UTC+4).
    const openEpoch = nyHourEpoch('2026-06-15', 20);
    expect(toBakuYMD(openEpoch * 1000)).toBe('2026-06-16');
  });
});

describe('asia: boundary edges', () => {
  it('includes the 20:00 inclusive edge and excludes the 00:00 exclusive edge', () => {
    const rows = block(SESSION, 20, 5);
    const withMidnight = [
      ...rows,
      row(nyHourEpoch('2026-06-16', 0), BASE + 50),
    ];
    expect(asiaRange(withMidnight, SESSION)).toEqual(asiaRange(rows, SESSION));
  });

  it('drops non-finite OHLC and non-finite time rows at the boundary', () => {
    const rows = block(SESSION, 20, 5);
    const poisoned: IntradayCandle[] = [
      ...rows,
      row(nyHourEpoch(SESSION, 21), BASE, { high: Number.NaN }),
      { ...row(nyHourEpoch(SESSION, 22), BASE), time: Number.NaN },
    ];
    expect(asiaRange(poisoned, SESSION)).toEqual(asiaRange(rows, SESSION));
  });

  it('drops inverted-OHLC rows so one bad tick never yields a negative height', () => {
    const rows = block(SESSION, 20, 5);
    const without = asiaRange(rows, SESSION);
    expect(without).not.toBeNull();
    // Inverted row with extreme wicks: dropped at the boundary, range unchanged.
    const inverted = row(nyHourEpoch(SESSION, 21), BASE, {
      high: BASE - 500,
      low: BASE + 500,
    });
    expect(inverted.high).toBeLessThan(inverted.low);
    expect(asiaRange([...rows, inverted], SESSION)).toEqual(without);
    // Window of only inverted rows degrades honestly to null, never a
    // negative-height range that would throw downstream in judasSwing.
    expect(asiaRange([inverted], SESSION)).toBeNull();
  });

  it('throws with the echoed value on non-array rows input', () => {
    expect(() => asiaRange('nope' as unknown as IntradayCandle[], SESSION)).toThrow(
      'asiaRange requires an IntradayCandle array, got nope',
    );
  });

  it('throws on missing, malformed, or non-calendar sessionDate instead of returning null', () => {
    const rows = block(SESSION, 20, 5);
    expect(() => asiaRange(rows, undefined as unknown as string)).toThrow(
      'asiaRange requires a sessionDate in yyyy-MM-dd format, got undefined',
    );
    expect(() => asiaRange(rows, null as unknown as string)).toThrow(
      'asiaRange requires a sessionDate in yyyy-MM-dd format, got null',
    );
    expect(() => asiaRange(rows, '15-06-2026')).toThrow(
      'asiaRange requires a sessionDate in yyyy-MM-dd format, got 15-06-2026',
    );
    expect(() => asiaRange(rows, '2026-02-30')).toThrow(
      'asiaRange requires a real calendar sessionDate, got 2026-02-30',
    );
    expect(() => asiaRange(rows, '2026-13-01')).toThrow(
      'asiaRange requires a real calendar sessionDate, got 2026-13-01',
    );
  });
});

describe('asia: DST March spring-forward pair', () => {
  it('DST March spring-forward resolves both sides of the 2026-03-08 07:00Z instant through per-candle NY wall clock', () => {
    // 20:00 NY on 2026-03-07 (EST, UTC-5) through 23:00 NY; the transition
    // instant 07:00Z on 2026-03-08 (03:00 EDT) sits past the window, but the
    // epoch arithmetic on both sides must bucket by wall clock, not offset.
    const rows = block('2026-03-07', 20, 4);
    const range = asiaRange(rows, '2026-03-07');
    expect(range).not.toBeNull();
    expect(range!.high).toBe(Math.max(...rows.map((r) => r.high)));
    expect(range!.low).toBe(Math.min(...rows.map((r) => r.low)));
  });
});

describe('asia: DST November fall-back pair', () => {
  it('DST November fall-back resolves both sides of the 2026-11-01 06:00Z instant through per-candle NY wall clock', () => {
    // 20:00 NY on 2026-10-31 (EDT, UTC-4) through 23:00 NY; the transition
    // instant 06:00Z on 2026-11-01 (01:00 EST) sits past the window. Wall-clock
    // bucketing must hold across the repeated-hour night.
    const rows = block('2026-10-31', 20, 4);
    const range = asiaRange(rows, '2026-10-31');
    expect(range).not.toBeNull();
    expect(range!.high).toBe(Math.max(...rows.map((r) => r.high)));
    expect(range!.low).toBe(Math.min(...rows.map((r) => r.low)));
  });
});

describe('asia: DST maintenance-break window', () => {
  it('DST maintenance-break admits only the 20:00-plus rows from 16:00-21:00 NY input', () => {
    // Six rows 16:00-21:00 NY; the four pre-20:00 rows carry extreme wicks and
    // must not move the range — only 20:00 and 21:00 contribute.
    const all = block(SESSION, 16, 6);
    const early = all.slice(0, 4).map((r) => ({ ...r, high: r.high + 700, low: r.low - 700 }));
    const late = all.slice(4);
    const range = asiaRange([...early, ...late], SESSION);
    expect(range).not.toBeNull();
    expect(range!.high).toBe(Math.max(...late.map((r) => r.high)));
    expect(range!.low).toBe(Math.min(...late.map((r) => r.low)));
  });
});
