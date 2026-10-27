// Phase 20 pool-prose pins: rank-1 sentence shape, hedge fragment,
// labels, null-input behavior. toBe only, no component rendering
// (vitest include covers src only).

import { describe, expect, it } from 'vitest';
import {
  EMPTY_COPY,
  NO_POOLS_COPY,
  THIN_NOTE_COPY,
  formatRank1Sentence,
  HEDGE_FRAGMENT,
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

  it('pins the Agri Heddi label, the three copy literals, and the hedge', () => {
    expect(PAIN_THRESHOLD_LABEL).toBe('Ağrı Həddi');
    expect(EMPTY_COPY).toBe('Məlumat yoxdur');
    expect(NO_POOLS_COPY).toBe('Aktiv hovuz yoxdur — D1 k=2 fraktal təsdiqlənmədi.');
    expect(THIN_NOTE_COPY).toBe('İncə tarixçə — proyeksiya zəif etimadla göstərilir.');
    expect(HEDGE_FRAGMENT).toBe('(proyeksiya — k=2 D1 fraktal; dəqiq stop qiyməti deyil)');
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
      'BSL 26500.50 / 26450.25 · 0.4 ATR · SWEPT (proyeksiya — k=2 D1 fraktal; dəqiq stop qiyməti deyil)',
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

  it('banned reuse is absent from prose output and copy constants', () => {
    const sentence = formatRank1Sentence(pool(), 1.25);
    const bodies = [sentence, EMPTY_COPY, NO_POOLS_COPY, THIN_NOTE_COPY, HEDGE_FRAGMENT];
    for (const body of bodies) {
      expect(body).not.toMatch(/FIRE/);
      expect(body).not.toMatch(/heatmap/i);
      expect(body).not.toMatch(/LLM/i);
    }
    // Exact stop-price claims are banned; the hedge carries only the
    // proyeksiya qualifier (deqiq stop qiymeti deyil), never a price promise.
    for (const body of bodies) {
      expect(body).not.toMatch(/stop qiyməti \d/);
      expect(body).not.toMatch(/dəqiq .* olacaq/i);
    }
  });

  it('rank-1 output carries all tokens in one string with no footer join', () => {
    const sentence = formatRank1Sentence(pool(), 1.25);
    expect(sentence).toContain('BSL');
    expect(sentence).toContain('26500.50 / 26450.25');
    expect(sentence).toContain('1.3 ATR');
    expect(sentence).toContain('ACTIVE');
    expect(sentence).toContain(HEDGE_FRAGMENT);
    // Single-line prose: no newline join that would signal a footer split.
    expect(sentence).not.toContain('\n');
  });
});
