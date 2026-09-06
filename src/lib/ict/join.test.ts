import { describe, expect, it } from 'vitest';
import { innerJoinOnTimestamp } from '@/src/lib/ict/join';
import type { IntradayCandle } from '@/src/lib/ict/types';
import misaligned from '@/src/lib/__fixtures__/join-misaligned.json';

const NQ_BASE = 20100;
const ES_BASE = 6020;
const STEP = 3600;

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

describe('join: misaligned fixture inner-joins on timestamp only', () => {
  it('joins exactly 14 rows with coverage nq 20 es 17 joined 14 dropped 7', () => {
    const nq = misaligned.nq as unknown as IntradayCandle[];
    const es = misaligned.es as unknown as IntradayCandle[];
    expect(nq).toHaveLength(21);
    expect(es).toHaveLength(18);
    const { joined, coverage } = innerJoinOnTimestamp(nq, es);
    expect(joined).toHaveLength(14);
    expect(coverage).toEqual({ nq: 20, es: 17, joined: 14, dropped: 7 });
  });

  it('emits no index-zipped pairing: every row carries its own shared time on both legs', () => {
    const nq = misaligned.nq as unknown as IntradayCandle[];
    const es = misaligned.es as unknown as IntradayCandle[];
    const { joined } = innerJoinOnTimestamp(nq, es);
    for (const j of joined) {
      expect(j.nq.time).toBe(j.time);
      expect(j.es.time).toBe(j.time);
    }
    expect(joined.every((j) => !j.nq.forming && !j.es.forming)).toBe(true);
  });

  it('output times are strictly ascending with one row per shared timestamp', () => {
    const nq = misaligned.nq as unknown as IntradayCandle[];
    const es = misaligned.es as unknown as IntradayCandle[];
    const { joined } = innerJoinOnTimestamp(nq, es);
    const times = joined.map((j) => j.time);
    expect(new Set(times).size).toBe(times.length);
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sorted);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
  });
});

describe('join: forming exclusion at the boundary even on parser regress', () => {
  it('drops forming rows passed directly, never emitting a forming leg', () => {
    const t = 1767600000;
    const { joined, coverage } = innerJoinOnTimestamp(
      [row(t, NQ_BASE, { forming: true }), row(t + STEP, NQ_BASE + 3)],
      [row(t, ES_BASE, { forming: true }), row(t + STEP, ES_BASE + 2)],
    );
    expect(joined).toHaveLength(1);
    expect(joined[0].time).toBe(t + STEP);
    expect(joined.every((j) => !j.nq.forming && !j.es.forming)).toBe(true);
    expect(coverage).toEqual({ nq: 1, es: 1, joined: 1, dropped: 0 });
  });
});

describe('join: empty and clean edges', () => {
  it('empty inputs return empty joined with zeroed coverage', () => {
    expect(innerJoinOnTimestamp([], [])).toEqual({
      joined: [],
      coverage: { nq: 0, es: 0, joined: 0, dropped: 0 },
    });
    const solo = [row(1767600000, NQ_BASE)];
    const oneSided = innerJoinOnTimestamp(solo, []);
    expect(oneSided.joined).toHaveLength(0);
    expect(oneSided.coverage).toEqual({ nq: 1, es: 0, joined: 0, dropped: 1 });
  });

  it('clean fully-overlapping inputs return every row with dropped 0', () => {
    const t = 1767600000;
    const nq = [row(t, NQ_BASE), row(t + STEP, NQ_BASE + 3), row(t + 2 * STEP, NQ_BASE + 6)];
    const es = [row(t, ES_BASE), row(t + STEP, ES_BASE + 2), row(t + 2 * STEP, ES_BASE + 4)];
    const { joined, coverage } = innerJoinOnTimestamp(nq, es);
    expect(joined).toHaveLength(3);
    expect(coverage).toEqual({ nq: 3, es: 3, joined: 3, dropped: 0 });
  });
});
