// Phase 20 pool-overlay pins: cap, rank colors, ghosts, dim, guards.
// toBe only, no component rendering (vitest include covers src only).

import { describe, expect, it } from 'vitest';
import {
  isGhost,
  MAX_ACTIVE_PER_SIDE,
  poolLineColor,
  POOL_MUTED_GRAY,
  poolPriceLines,
  rankOf,
  withoutGhosts,
} from '@/src/lib/pool-overlay';
import type { LiquidityPool } from '@/src/lib/ict/pools';

let seq = 0;
function pool(overrides: Partial<LiquidityPool> = {}): LiquidityPool {
  seq += 1;
  return {
    side: 'BSL',
    top: 26500.5,
    bottom: 26450.25,
    touches: 3,
    weight: 2.5,
    originDate: `2026-09-${String(seq).padStart(2, '0')}`,
    status: 'ACTIVE',
    ...overrides,
  };
}

// 3 ACTIVE BSL + 3 ACTIVE SSL: ranked input order, distinct bounds.
function sixActive(): LiquidityPool[] {
  return [
    pool({ side: 'BSL', top: 26500, bottom: 26450, originDate: '2026-09-01' }),
    pool({ side: 'BSL', top: 26400, bottom: 26350, originDate: '2026-09-02' }),
    pool({ side: 'BSL', top: 26300, bottom: 26250, originDate: '2026-09-03' }),
    pool({ side: 'SSL', top: 26700, bottom: 26650, originDate: '2026-09-04' }),
    pool({ side: 'SSL', top: 26800, bottom: 26750, originDate: '2026-09-05' }),
    pool({ side: 'SSL', top: 26900, bottom: 26850, originDate: '2026-09-06' }),
  ];
}

describe('pool-overlay', () => {
  it('caps at 2 ACTIVE per side: 3+3 ACTIVE yields 4 pools and 8 lines', () => {
    const lines = poolPriceLines(sixActive());
    expect(lines).toHaveLength(8);
    expect(lines.map((l) => l.title)).toEqual([
      'BSL-1-top',
      'BSL-1-bottom',
      'BSL-2-top',
      'BSL-2-bottom',
      'SSL-1-top',
      'SSL-1-bottom',
      'SSL-2-top',
      'SSL-2-bottom',
    ]);
  });

  it('pins the cap constant at 2 per side', () => {
    expect(MAX_ACTIVE_PER_SIDE).toBe(2);
  });

  it('pins single-pair tracer titles BSL-1-top and BSL-1-bottom', () => {
    const lines = poolPriceLines([pool()], { dimmed: false });
    expect(lines).toHaveLength(2);
    expect(lines[0].title).toBe('BSL-1-top');
    expect(lines[1].title).toBe('BSL-1-bottom');
  });

  it('pins Dashed style and width 1 on every emitted line', () => {
    for (const line of poolPriceLines(sixActive())) {
      expect(line.lineStyle).toBe('Dashed');
      expect(line.lineWidth).toBe(1);
    }
  });

  it('rides ghosts outside the cap: 2 ACTIVE plus 2 SWEPT yields 4 pools', () => {
    const pools = [
      pool({ side: 'BSL', originDate: '2026-09-01' }),
      pool({ side: 'SSL', originDate: '2026-09-02' }),
      pool({ side: 'BSL', status: 'SWEPT', originDate: '2026-09-03' }),
      pool({ side: 'SSL', status: 'SWEPT', originDate: '2026-09-04' }),
    ];
    const lines = poolPriceLines(pools);
    expect(lines).toHaveLength(8);
  });

  it('pins rank-1 full hex versus rank-2 rgba 0.5 literals', () => {
    expect(poolLineColor(pool({ side: 'BSL' }), 1, false)).toBe('#00FF88');
    expect(poolLineColor(pool({ side: 'BSL' }), 2, false)).toBe('rgba(0, 255, 136, 0.5)');
    expect(poolLineColor(pool({ side: 'SSL' }), 1, false)).toBe('#FF00FF');
    expect(poolLineColor(pool({ side: 'SSL' }), 2, false)).toBe('rgba(255, 0, 255, 0.5)');
  });

  it('pins ghost lines to MUTED_GRAY', () => {
    expect(POOL_MUTED_GRAY).toBe('#71717A');
    expect(poolLineColor(pool({ status: 'SWEPT' }), null, false)).toBe('#71717A');
    const lines = poolPriceLines([pool({ side: 'BSL', status: 'SWEPT' })]);
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line.color).toBe('#71717A');
    }
  });

  it('dimmed true forces every color to MUTED_GRAY', () => {
    const lines = poolPriceLines(sixActive(), { dimmed: true });
    expect(lines).toHaveLength(8);
    for (const line of lines) {
      expect(line.color).toBe('#71717A');
    }
  });

  it('throws naming poolPriceLines on non-finite top or bottom', () => {
    expect(() => poolPriceLines([pool({ top: Number.NaN })])).toThrow(/poolPriceLines/);
    expect(() => poolPriceLines([pool({ bottom: Number.POSITIVE_INFINITY })])).toThrow(
      /poolPriceLines/,
    );
  });

  it('withoutGhosts keeps ACTIVE while dropping SWEPT for STAND_ASIDE', () => {
    const pools = [
      pool({ side: 'BSL', status: 'ACTIVE' }),
      pool({ side: 'SSL', status: 'SWEPT' }),
    ];
    const kept = withoutGhosts(pools);
    expect(kept).toHaveLength(1);
    expect(kept[0].status).toBe('ACTIVE');
    expect(poolPriceLines(kept)).toHaveLength(2);
  });

  it('yields zero lines on null-empty and empty input', () => {
    expect(poolPriceLines([])).toEqual([]);
  });

  it('isGhost names SWEPT pools only', () => {
    expect(isGhost(pool({ status: 'SWEPT' }))).toBe(true);
    expect(isGhost(pool({ status: 'ACTIVE' }))).toBe(false);
  });

  it('rankOf resolves 1-indexed per-side rank and null outside the cap', () => {
    const pools = sixActive();
    expect(rankOf(pools[0], pools)).toBe(1);
    expect(rankOf(pools[1], pools)).toBe(2);
    expect(rankOf(pools[2], pools)).toBeNull();
    expect(rankOf(pool({ status: 'SWEPT' }), pools)).toBeNull();
  });
});

// Phase 21 D-16 color-sync pin: overlay rank literals equal the globals.css
// .dark terminal tokens with case-normalized comparison (overlay literals
// are uppercase, CSS tokens lowercase). Token values cited from
// app/globals.css dark block lines 118-123:
//   --terminal-up: #00ff88; --terminal-down: #ff00ff.
// Gray carries no hex token — the dark block exposes only rgba whites and
// #0e0e12 canvas, so POOL_MUTED_GRAY is pinned as a literal with that note.
describe('pool-overlay D-16 color-sync pin', () => {
  it('pins BSL rank-1 literal to the terminal-up dark token case-insensitively', () => {
    expect(poolLineColor(pool({ side: 'BSL' }), 1, false).toLowerCase()).toBe('#00ff88');
  });

  it('pins SSL rank-1 literal to the terminal-down dark token case-insensitively', () => {
    expect(poolLineColor(pool({ side: 'SSL' }), 1, false).toLowerCase()).toBe('#ff00ff');
  });

  it('pins rank-2 rgba literals to the same rgb triple at half alpha', () => {
    expect(poolLineColor(pool({ side: 'BSL' }), 2, false)).toBe('rgba(0, 255, 136, 0.5)');
    expect(poolLineColor(pool({ side: 'SSL' }), 2, false)).toBe('rgba(255, 0, 255, 0.5)');
  });

  it('pins the muted gray literal with the no-hex-token note', () => {
    // Gray carries no hex token in the globals.css dark block — pinned here
    // so a literal change fails loudly instead of desyncing canvas/theme.
    expect(POOL_MUTED_GRAY).toBe('#71717A');
  });
});
