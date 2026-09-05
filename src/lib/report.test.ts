// Report contract tests: six sections in fixed order, section 2 live.
// English identifiers; locked English chip UNAVAILABLE untouched.

import { describe, expect, it } from 'vitest';
import { PRE_NEWS_BADGE, REGIME_BADGE, REPORT_SECTIONS } from '@/src/lib/report';

describe('report', () => {
  it('holds exactly 6 entries with only index 2 live', () => {
    expect(REPORT_SECTIONS).toHaveLength(6);
    expect(REPORT_SECTIONS.map((s) => s.index)).toEqual([1, 2, 3, 4, 5, 6]);
    const live = REPORT_SECTIONS.filter((s) => s.state === 'live');
    expect(live).toHaveLength(1);
    expect(live[0].index).toBe(2);
  });

  it('matches the institutional rules CIXIS FORMATI literals', () => {
    expect(REPORT_SECTIONS.map((s) => s.title)).toEqual([
      '1. RETAIL EXPOSURE & SENTIMENT ENGINEERING',
      '2. MACRO DEALING RANGE & VOLATILITY REGIME (D1/4H)',
      '3. LIQUIDITY SEQUENCING & CROSS-MARKET SMT (1H/15M)',
      '4. "WHY NOW?" EXECUTION PROTOCOL (5M/1M)',
      '5. INSTITUTIONAL ORDER TICKET',
      '6. FATAL FLAW CHECK & CHALLENGE QUESTION',
    ]);
  });

  it('maps regime states to Azerbaijani badges with a pre-news override', () => {
    expect(REGIME_BADGE.expansion).toBe('Genişlənmə');
    expect(REGIME_BADGE.compression).toBe('Sıxılma');
    expect(PRE_NEWS_BADGE).toBe('Yüksək təsirli xəbər gözlənilir');
  });
});
