// Confluence tracer suite: single happy path plus nearest neighbors for the
// Phase 9 tracer trunk. Builder helpers keep fixtures small; tier-boundary
// one-step-either-side plus discreteness predicates land in Task 3.

import { describe, expect, it } from 'vitest';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import { deriveConvictionTier } from '@/src/lib/confluence';

const BASE_SWEEP_TIME = 1770500000;

function judas(overrides: Partial<JudasOutput> = {}): JudasOutput {
  return {
    candidate: true,
    confirmed: true,
    preRun: false,
    sweepSide: 'HIGH',
    sweepTime: BASE_SWEEP_TIME,
    displacementMult: 0.6,
    ...overrides,
  };
}

function smtSignal(
  overrides: Partial<Extract<SmtOutput, { suppressed: false }>> = {},
): SmtOutput {
  return {
    suppressed: false,
    direction: 'BEARISH',
    sweeperLeg: 'NQ',
    nqWindow: { start: '2026-02-02', end: '2026-02-06', extreme: 20500 },
    esWindow: { start: '2026-02-02', end: '2026-02-06', extreme: 6200 },
    bpsGap: 40,
    ...overrides,
  };
}

function smtSuppressed(): SmtOutput {
  return { suppressed: true, reason: 'CORR_DECOUPLED', corr: 0.4 };
}

function smtNoSignal(): SmtOutput {
  return {
    suppressed: false,
    direction: 'NO-SIGNAL',
    sweeperLeg: null,
    nqWindow: null,
    esWindow: null,
    bpsGap: 0,
  };
}

describe('confluence: single happy path plus nearest neighbors', () => {
  it('confirmed HIGH plus BEARISH yields the highest tier', () => {
    expect(deriveConvictionTier(judas({ sweepSide: 'HIGH' }), smtSignal({ direction: 'BEARISH' }))).toBe(
      'yüksək inam',
    );
  });

  it('confirmed LOW plus BULLISH yields the highest tier', () => {
    expect(
      deriveConvictionTier(judas({ sweepSide: 'LOW' }), smtSignal({ direction: 'BULLISH' })),
    ).toBe('yüksək inam');
  });

  it('candidate (confirmed false) plus aligned SMT yields base', () => {
    expect(
      deriveConvictionTier(
        judas({ confirmed: false, sweepSide: 'HIGH' }),
        smtSignal({ direction: 'BEARISH' }),
      ),
    ).toBe('standart');
  });

  it('confirmed plus misaligned SMT yields base', () => {
    expect(
      deriveConvictionTier(judas({ sweepSide: 'HIGH' }), smtSignal({ direction: 'BULLISH' })),
    ).toBe('standart');
  });

  it('confirmed plus suppressed SMT yields base', () => {
    expect(deriveConvictionTier(judas({ sweepSide: 'HIGH' }), smtSuppressed())).toBe('standart');
  });

  it('null judas yields base', () => {
    expect(deriveConvictionTier(null, smtSignal({ direction: 'BEARISH' }))).toBe('standart');
  });

  it('null smt yields base', () => {
    expect(deriveConvictionTier(judas({ sweepSide: 'HIGH' }), null)).toBe('standart');
  });

  it('NO-SIGNAL SMT yields base', () => {
    expect(deriveConvictionTier(judas({ sweepSide: 'HIGH' }), smtNoSignal())).toBe('standart');
  });
});

describe('confluence: ICT-15 tier boundary one step either side', () => {
  it('two agreements (confirmed plus aligned) yield highest', () => {
    expect(
      deriveConvictionTier(judas({ sweepSide: 'HIGH' }), smtSignal({ direction: 'BEARISH' })),
    ).toBe('yüksək inam');
    expect(deriveConvictionTier(judas({ sweepSide: 'LOW' }), smtSignal({ direction: 'BULLISH' }))).toBe(
      'yüksək inam',
    );
  });

  it('one agreement — confirmed plus misaligned — yields base', () => {
    expect(
      deriveConvictionTier(judas({ sweepSide: 'HIGH' }), smtSignal({ direction: 'BULLISH' })),
    ).toBe('standart');
    expect(
      deriveConvictionTier(judas({ sweepSide: 'LOW' }), smtSignal({ direction: 'BEARISH' })),
    ).toBe('standart');
  });

  it('one agreement — confirmed plus suppressed — yields base', () => {
    expect(deriveConvictionTier(judas({ sweepSide: 'HIGH' }), smtSuppressed())).toBe('standart');
  });

  it('one agreement — candidate plus aligned — yields base', () => {
    expect(
      deriveConvictionTier(
        judas({ confirmed: false, sweepSide: 'LOW' }),
        smtSignal({ direction: 'BULLISH' }),
      ),
    ).toBe('standart');
  });

  it('zero agreements yield base', () => {
    expect(deriveConvictionTier(null, null)).toBe('standart');
    expect(deriveConvictionTier(judas({ confirmed: false }), smtNoSignal())).toBe('standart');
  });
});

describe('confluence: ICT-15 precision — tiers are discrete words only', () => {
  it('every tier value is exactly one of the two word literals', () => {
    const tiers = [
      deriveConvictionTier(judas({ sweepSide: 'HIGH' }), smtSignal({ direction: 'BEARISH' })),
      deriveConvictionTier(judas({ sweepSide: 'LOW' }), smtSignal({ direction: 'BULLISH' })),
      deriveConvictionTier(judas({ confirmed: false }), smtSignal({ direction: 'BEARISH' })),
      deriveConvictionTier(judas(), smtSuppressed()),
      deriveConvictionTier(null, null),
    ];
    for (const tier of tiers) {
      expect(tier === 'standart' || tier === 'yüksək inam').toBe(true);
    }
  });

  it('numeric coercion of each tier is NaN', () => {
    expect(Number('standart' as string)).toBeNaN();
    expect(Number('yüksək inam' as string)).toBeNaN();
  });

  it('no tier string contains a digit or percent sign', () => {
    for (const tier of ['standart', 'yüksək inam'] as const) {
      expect(tier).not.toMatch(/[0-9%]/);
    }
  });
});
