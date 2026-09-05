import { describe, expect, it } from 'vitest';
import { CROWDED_THRESHOLD, trueAvg } from '@/src/lib/sentiment';

describe('sentiment: True AVG with crowded flag', () => {
  it('excludes insta and fibogroup brokers and averages kept longPct values', () => {
    const result = trueAvg([
      { broker: 'BrokerA', longPct: 70, shortPct: 30 },
      { broker: 'InstaForex', longPct: 90, shortPct: 10 },
      { broker: 'FiboGroup', longPct: 10, shortPct: 90 },
      { broker: 'BrokerB', longPct: 50, shortPct: 50 },
    ]);
    expect(result.buy).toBeCloseTo(60, 10);
    expect(result.sell).toBeCloseTo(40, 10);
    expect(result.excludedCount).toBe(2);
  });

  it('returns crowded LONG at 60 buy and SHORT at 60 sell, null otherwise', () => {
    expect(CROWDED_THRESHOLD).toBe(60);
    const long = trueAvg([
      { broker: 'A', longPct: 65, shortPct: 35 },
      { broker: 'B', longPct: 55, shortPct: 45 },
    ]);
    expect(long.crowded).toBe('LONG');
    const short = trueAvg([
      { broker: 'A', longPct: 30, shortPct: 70 },
      { broker: 'B', longPct: 40, shortPct: 60 },
    ]);
    expect(short.crowded).toBe('SHORT');
    const balanced = trueAvg([
      { broker: 'A', longPct: 55, shortPct: 45 },
      { broker: 'B', longPct: 45, shortPct: 55 },
    ]);
    expect(balanced.crowded).toBeNull();
  });

  it('throws when no included broker remains or any percentage is non-finite', () => {
    expect(() =>
      trueAvg([{ broker: 'InstaForex', longPct: 80, shortPct: 20 }]),
    ).toThrow();
    expect(() =>
      trueAvg([{ broker: 'A', longPct: Number.NaN, shortPct: 50 }]),
    ).toThrow();
    expect(() =>
      trueAvg([{ broker: 'A', longPct: 120, shortPct: -20 }]),
    ).toThrow();
  });
});
