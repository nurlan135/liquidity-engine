// Phase 20 pool-overlay pins: thin single-BSL pair titles, Dashed style,
// width 1, finite-guard throw naming. toBe only, no component rendering.

import { describe, expect, it } from 'vitest';
import { poolPriceLines } from '@/src/lib/pool-overlay';
import type { LiquidityPool } from '@/src/lib/ict/pools';

function pool(overrides: Partial<LiquidityPool> = {}): LiquidityPool {
  return {
    side: 'BSL',
    top: 26500.5,
    bottom: 26450.25,
    touches: 3,
    weight: 2.5,
    originDate: '2026-09-01',
    status: 'ACTIVE',
    ...overrides,
  };
}

const resolveColor = (side: 'BSL' | 'SSL') => (side === 'BSL' ? '#00FF88' : '#FF00FF');

describe('pool-overlay', () => {
  it('maps the first BSL ACTIVE pool to a top/bottom pair with locked titles', () => {
    const lines = poolPriceLines([pool()], resolveColor);
    expect(lines).toHaveLength(2);
    expect(lines[0].title).toBe('BSL-1-top');
    expect(lines[1].title).toBe('BSL-1-bottom');
    expect(lines[0].price).toBe(26500.5);
    expect(lines[1].price).toBe(26450.25);
  });

  it('pins Dashed style (numeric 2) and width 1 with the BSL full color', () => {
    const lines = poolPriceLines([pool()], resolveColor);
    for (const line of lines) {
      expect(line.lineStyle).toBe('Dashed');
      expect(line.lineWidth).toBe(1);
      expect(line.color).toBe('#00FF88');
    }
  });

  it('skips non-BSL and non-ACTIVE pools, yielding no lines', () => {
    expect(poolPriceLines([pool({ side: 'SSL' })], resolveColor)).toEqual([]);
    expect(poolPriceLines([pool({ status: 'SWEPT' })], resolveColor)).toEqual([]);
    expect(poolPriceLines([], resolveColor)).toEqual([]);
  });

  it('throws naming poolPriceLines on non-finite top or bottom', () => {
    expect(() => poolPriceLines([pool({ top: Number.NaN })], resolveColor)).toThrow(
      /poolPriceLines/,
    );
    expect(() => poolPriceLines([pool({ bottom: Number.POSITIVE_INFINITY })], resolveColor)).toThrow(
      /poolPriceLines/,
    );
  });

  it('picks the first BSL ACTIVE pool when earlier pools are ineligible', () => {
    const lines = poolPriceLines(
      [pool({ side: 'SSL', top: 26700, bottom: 26650 }), pool({ top: 26500.5, bottom: 26450.25 })],
      resolveColor,
    );
    expect(lines).toHaveLength(2);
    expect(lines[0].title).toBe('BSL-1-top');
  });
});
