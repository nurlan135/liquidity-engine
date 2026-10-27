// Phase 20 pool-prose pins: rank-1 sentence shape, hedge fragment,
// labels, null-input behavior. toBe only, no component rendering
// (vitest include covers src only).

import { describe, expect, it } from 'vitest';
import {
  EMPTY_POOLS_BODY,
  formatRank1Sentence,
  HEDGE_FRAGMENT,
  NO_POOLS_COPY,
  PAIN_THRESHOLD_LABEL,
  rank1Of,
  distAtrOf,
  rankDistAtr,
} from '@/src/lib/pool-prose';
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

describe('pool-prose', () => {
  it('rank1Of returns the first pool and null on empty input', () => {
    const first = pool();
    const second = pool({ side: 'SSL', top: 26600 });
    expect(rank1Of([first, second])).toBe(first);
    expect(rank1Of([])).toBeNull();
  });

  it('pins the exact hedge fragment', () => {
    expect(HEDGE_FRAGMENT).toBe('(proyeksiya — k=2 D1 fraktal; dəqiq stop qiyməti deyil)');
  });

  it('pins the Agri Heddi label, the Melumat yoxdur copy, and the no-pools body', () => {
    expect(PAIN_THRESHOLD_LABEL).toBe('Ağrı Həddi');
    expect(NO_POOLS_COPY).toBe('Məlumat yoxdur');
    expect(EMPTY_POOLS_BODY).toBe('Aktiv hovuz yoxdur — D1 k=2 fraktal təsdiqlənmədi.');
  });

  it('formats the rank-1 sentence with side, two-decimal bounds, one-decimal ATR, status, and hedge', () => {
    const sentence = formatRank1Sentence(pool(), 1.25);
    expect(sentence).toBe(
      'BSL 26500.50 / 26450.25 · 1.3 ATR · ACTIVE (proyeksiya — k=2 D1 fraktal; dəqiq stop qiyməti deyil)',
    );
  });

  it('names SWEPT status verbatim with muted rendering left to the caller', () => {
    const sentence = formatRank1Sentence(pool({ status: 'SWEPT' }), 0.44);
    expect(sentence).toBe(
      'SWEPT' === 'SWEPT'
        ? 'BSL 26500.50 / 26450.25 · 0.4 ATR · SWEPT (proyeksiya — k=2 D1 fraktal; dəqiq stop qiyməti deyil)'
        : '',
    );
  });

  it('distAtrOf computes abs pool-mid minus lastClose over atr with zero-atr guard', () => {
    // mid = (26500.50 + 26450.25) / 2 = 26475.375; |26475.375 - 26500| / 25 = 0.985
    expect(distAtrOf(pool(), 26500, 25)).toBeCloseTo(0.985, 3);
    expect(distAtrOf(pool(), 26500, 0)).toBeNull();
    expect(distAtrOf(pool(), 26500, Number.NaN)).toBeNull();
    expect(distAtrOf(pool(), Number.NaN, 25)).toBeNull();
  });

  it('rankDistAtr derives distance from the given candles via computeATR', () => {
    // computeATR needs period + 1 closed candles (ATR_PERIOD 14); closedOnly
    // drops the forming tail, so supply 16 rows.
    const candles = Array.from({ length: 16 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      open: 26400 + i * 10,
      high: 26500 + i * 10,
      low: 26350 + i * 10,
      close: 26450 + i * 10,
    }));
    const dist = rankDistAtr(pool(), candles);
    expect(dist).not.toBeNull();
    expect(Number.isFinite(dist!)).toBe(true);
    expect(rankDistAtr(pool(), [])).toBeNull();
  });
});
