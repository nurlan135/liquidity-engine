import { describe, expect, it } from 'vitest';
import {
  aggregate1Hto4H,
  BLOCK_SIZE,
  DAY_OPEN_NY_HOUR,
  NY_TZ,
} from '@/src/lib/ict/aggregate';
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
import { fromZonedTime } from 'date-fns-tz';

function nyHourEpoch(nyDate: string, nyHour: number): number {
  return Math.floor(fromZonedTime(`${nyDate} ${String(nyHour).padStart(2, '0')}:00:00`, NY_TZ).getTime() / 1000);
}

// Eight consecutive closed 1H rows starting at a NY wall-clock hour.
function block8(nyDate: string, startHour: number, price = BASE): IntradayCandle[] {
  const rows: IntradayCandle[] = [];
  let t = nyHourEpoch(nyDate, startHour);
  for (let i = 0; i < 8; i++) {
    rows.push(row(t, price + i * 2));
    t += STEP;
  }
  return rows;
}

describe('aggregate: 18:00 ET boundary split', () => {
  it('splits eight rows at the day boundary into two B-labeled complete blocks', () => {
    // B1 = 18,19,20,21 ET Jun 15; B2 = 22,23,00,01 crossing into Jun 16 NY.
    const rows = block8('2026-06-15', 18);
    const blocks = aggregate1Hto4H(rows, '2026-06-16');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].date).toBe('2026-06-15-B1');
    expect(blocks[1].date).toBe('2026-06-15-B2');
    // First-open / max-high / min-low / last-close aggregation.
    expect(blocks[0].open).toBe(rows[0].open);
    expect(blocks[0].high).toBe(Math.max(...rows.slice(0, 4).map((r) => r.high)));
    expect(blocks[0].low).toBe(Math.min(...rows.slice(0, 4).map((r) => r.low)));
    expect(blocks[0].close).toBe(rows[3].close);
    expect(blocks[0].forming).toBeUndefined();
  });

  it('exposes the D-12/D-13 anchor constants', () => {
    expect(NY_TZ).toBe('America/New_York');
    expect(DAY_OPEN_NY_HOUR).toBe(18);
    expect(BLOCK_SIZE).toBe(4);
  });
});

describe('aggregate: DST transition pairs', () => {
  it('March spring-forward: identical NY wall-clock bucketing both sides', () => {
    // 2026-03-08 transition instant is 07:00Z (03:00 EDT). Pairs around it:
    // pre (EST wall clock) and post (EDT wall clock) rows in the same B-block.
    const pre = [nyHourEpoch('2026-03-07', 22), nyHourEpoch('2026-03-07', 23)];
    const post = [nyHourEpoch('2026-03-08', 0), nyHourEpoch('2026-03-08', 1)];
    const rows = [...pre, ...post].map((t, i) => row(t, BASE + i));
    const blocks = aggregate1Hto4H(rows, '2026-03-08');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].date).toBe('2026-03-07-B2');
  });

  it('November fall-back: identical NY wall-clock bucketing both sides', () => {
    // 2026-11-01 transition instant is 06:00Z (01:00 EST second occurrence).
    const pre = [nyHourEpoch('2026-10-31', 22), nyHourEpoch('2026-10-31', 23)];
    const post = [nyHourEpoch('2026-11-01', 0), nyHourEpoch('2026-11-01', 1)];
    const rows = [...pre, ...post].map((t, i) => row(t, BASE + i));
    const blocks = aggregate1Hto4H(rows, '2026-11-01');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].date).toBe('2026-10-31-B2');
  });
});

describe('aggregate: partial-block and forming exclusion', () => {
  it('seven closed rows emit exactly one block with three rows silently dropped', () => {
    const rows = block8('2026-06-15', 18).slice(0, 7);
    const blocks = aggregate1Hto4H(rows, '2026-06-16');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].date).toBe('2026-06-15-B1');
  });

  it('forming rows never enter blocks', () => {
    const rows = block8('2026-06-15', 18);
    const withForming = [
      ...rows,
      row(rows[rows.length - 1].time + STEP, BASE + 100, { forming: true }),
    ];
    const blocks = aggregate1Hto4H(withForming, '2026-06-16');
    expect(blocks).toHaveLength(2);
    expect(withForming.filter((r) => r.forming)).toHaveLength(1);
    // The forming row alone in B3 cannot complete a block.
    expect(blocks.every((b) => b.date !== '2026-06-15-B3')).toBe(true);
  });
});
