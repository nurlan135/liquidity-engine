import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { CHALLENGE_BY_KEY, REASON_BY_KEY, SENTENCE_BY_KEY, SENTENCE_FALLBACK, UNBLOCK_BY_KEY, checkFatalFlaw } from '@/src/lib/ict/invalidation';
import type { FatalFlawInput } from '@/src/lib/ict/invalidation';
import type { TriggerOutput } from '@/src/lib/ict/trigger';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { RolloverFlag } from '@/src/lib/ict/types';

const SESSION = '2026-06-15';

function fixtureFlawTrigger(overrides: Partial<TriggerOutput> = {}): TriggerOutput {
  return {
    verdict: 'FIRE_LONG',
    direction: 'LONG',
    reasonKey: 'FIRE_LONG',
    reason:
      'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.',
    gates: { timing: true, purge: true, displacement: true },
    entryFvg: null,
    inputs: { judas: null, amd: null, smt: null },
    ...overrides,
  };
}

function fixtureSmt(overrides: Partial<Extract<SmtOutput, { suppressed: false }>> = {}): SmtOutput {
  return {
    suppressed: false,
    direction: 'BULLISH',
    sweeperLeg: 'NQ',
    nqWindow: null,
    esWindow: null,
    bpsGap: 30,
    ...overrides,
  };
}

function suppressedSmt(): SmtOutput {
  return { suppressed: true, reason: 'CORR_DECOUPLED', corr: 0.4 };
}

function fixtureJudas(overrides: Partial<JudasOutput> = {}): JudasOutput {
  return {
    candidate: false,
    confirmed: false,
    preRun: false,
    sweepSide: null,
    sweepTime: null,
    displacementMult: 0,
    ...overrides,
  };
}

function fixtureRollover(overrides: Partial<RolloverFlag> = {}): RolloverFlag {
  return {
    rolloverSuspect: false,
    contractHint: '',
    proximityWarning: null,
    ...overrides,
  };
}

function fixtureStale(
  overrides: Partial<FatalFlawInput['stale']> = {},
): FatalFlawInput['stale'] {
  return { nq: false, es: false, nq1h: false, nq15m: false, ...overrides };
}

function nyMinuteEpoch(nyDate: string, hhmm: string): number {
  return Math.floor(fromZonedTime(`${nyDate} ${hhmm}:00`, NY_TZ).getTime() / 1000);
}

function cleanInput(overrides: Partial<FatalFlawInput> = {}): FatalFlawInput {
  return {
    trigger: fixtureFlawTrigger(),
    smt: fixtureSmt(),
    judas: fixtureJudas(),
    rollover: fixtureRollover(),
    stale: fixtureStale(),
    asOf: nyMinuteEpoch(SESSION, '03:00'),
    ...overrides,
  };
}

describe('invalidation: taxonomy disjunction table', () => {
  it('rollover-suspect kills an ARMED trigger as HARD ROLLOVER_WEEK', () => {
    const out = checkFatalFlaw(
      cleanInput({
        trigger: fixtureFlawTrigger({
          verdict: 'ARMED',
          reasonKey: 'ARMED_MISSING_TIMING',
          reason: 'WHY NOW ARMED: Quruluş hazırdır — killzone pəncərəsi gözlənilir.',
        }),
        rollover: fixtureRollover({ rolloverSuspect: true }),
      }),
    );
    expect(out.invalidated).toBe(true);
    expect(out.downgraded).toBe(false);
    expect(out.flawClass).toBe('HARD');
    expect(out.reasonKey).toBe('ROLLOVER_WEEK');
    expect(out.unblock.length).toBeGreaterThan(0);
  });

  it('any single stale leg kills a WAIT trigger as HARD STALE_LEG', () => {
    for (const leg of ['nq', 'es', 'nq1h', 'nq15m'] as const) {
      const out = checkFatalFlaw(
        cleanInput({
          trigger: fixtureFlawTrigger({
            verdict: 'WAIT_FOR_MANIPULATION',
            direction: null,
            reasonKey: 'WAIT_FOR_MANIPULATION',
            reason: 'WAIT FOR MANIPULATION: Zaman, süpürmə və displacement razılaşmır — manipulyasiya gözlənilir.',
          }),
          stale: fixtureStale({ [leg]: true }),
        }),
      );
      expect(out.invalidated).toBe(true);
      expect(out.downgraded).toBe(false);
      expect(out.flawClass).toBe('HARD');
      expect(out.reasonKey).toBe('STALE_LEG');
      expect(out.unblock.length).toBeGreaterThan(0);
    }
  });

  it('suppressed SMT downgrades a FIRE trigger to SOFT with carried reason', () => {
    const out = checkFatalFlaw(cleanInput({ smt: suppressedSmt() }));
    expect(out.invalidated).toBe(false);
    expect(out.downgraded).toBe(true);
    expect(out.flawClass).toBe('SOFT');
    expect(out.reasonKey).toBe('SMT_SUPPRESSED');
    expect(out.unblock.length).toBeGreaterThan(0);
    expect(out.carriedArmedReason).toBe('FIRE_LONG');
  });

  // The two opposite-sweep tests below use synthetically mismatched
  // trigger-plus-judas envelopes unreachable via selectFatalFlaw — they pin
  // pure-layer precedence only (first-match-wins order and SOFT gating).
  it('confirmed opposite sweep downgrades FIRE_SHORT against a LOW sweep', () => {
    const out = checkFatalFlaw(
      cleanInput({
        trigger: fixtureFlawTrigger({
          verdict: 'FIRE_SHORT',
          direction: 'SHORT',
          reasonKey: 'FIRE_SHORT',
        }),
        judas: fixtureJudas({ candidate: true, confirmed: true, sweepSide: 'LOW', displacementMult: 0.6 }),
      }),
    );
    expect(out.invalidated).toBe(false);
    expect(out.downgraded).toBe(true);
    expect(out.flawClass).toBe('SOFT');
    expect(out.reasonKey).toBe('OPPOSITE_SWEEP');
    expect(out.carriedArmedReason).toBe('FIRE_SHORT');
  });

  it('confirmed HIGH sweep against LONG FIRE downgrades as opposite sweep', () => {
    const out = checkFatalFlaw(
      cleanInput({
        judas: fixtureJudas({ candidate: true, confirmed: true, sweepSide: 'HIGH', displacementMult: 0.6 }),
      }),
    );
    expect(out.downgraded).toBe(true);
    expect(out.reasonKey).toBe('OPPOSITE_SWEEP');
  });

  it('suppressed SMT on an ARMED trigger leaves the verdict standing', () => {
    const armed = fixtureFlawTrigger({
      verdict: 'ARMED',
      reasonKey: 'ARMED_MISSING_TIMING',
      reason: 'WHY NOW ARMED: Quruluş hazırdır — killzone pəncərəsi gözlənilir.',
    });
    const out = checkFatalFlaw(cleanInput({ trigger: armed, smt: suppressedSmt() }));
    expect(out.invalidated).toBe(false);
    expect(out.downgraded).toBe(false);
    expect(out.flawClass).toBeNull();
    expect(out.reasonKey).toBe('NONE');
    expect(out.reason).toBe('Qüsur yoxdur: trigger hökmü qüvvədədir.');
  });

  it('clean envelopes leave FIRE standing', () => {
    const out = checkFatalFlaw(cleanInput());
    expect(out.invalidated).toBe(false);
    expect(out.downgraded).toBe(false);
    expect(out.flawClass).toBeNull();
    expect(out.reasonKey).toBe('NONE');
    expect(out.carriedArmedReason).toBeNull();
  });

  it('HARD rollover beats SOFT SMT on identical inputs by order', () => {
    const out = checkFatalFlaw(
      cleanInput({ smt: suppressedSmt(), rollover: fixtureRollover({ rolloverSuspect: true }) }),
    );
    expect(out.reasonKey).toBe('ROLLOVER_WEEK');
    expect(out.invalidated).toBe(true);
  });

  it('race fixture: FIRE plus flaw on the same snapshot carries both reasons', () => {
    const trigger = fixtureFlawTrigger();
    const out = checkFatalFlaw(cleanInput({ trigger, smt: suppressedSmt() }));
    expect(out.downgraded).toBe(true);
    expect(out.carriedArmedReason).toBe(trigger.reasonKey);
    expect(out.reason.length).toBeGreaterThan(0);
    expect(out.reason).not.toBe(trigger.reason);
  });

  it('bans the generic single-word label on every non-clean verdict', () => {
    const verdicts = [
      checkFatalFlaw(cleanInput({ rollover: fixtureRollover({ rolloverSuspect: true }) })),
      checkFatalFlaw(cleanInput({ stale: fixtureStale({ nq15m: true }) })),
      checkFatalFlaw(cleanInput({ smt: suppressedSmt() })),
      checkFatalFlaw(
        cleanInput({
          judas: fixtureJudas({ candidate: true, confirmed: true, sweepSide: 'HIGH', displacementMult: 0.6 }),
        }),
      ),
    ];
    for (const out of verdicts) {
      expect(out.reasonKey).not.toBe('NONE');
      expect(out.unblock.length).toBeGreaterThan(0);
      expect(out.reason).not.toBe('Invalidated');
      expect(out.flawClass).not.toBeNull();
    }
  });
});

describe('invalidation: determinism', () => {
  it('same inputs plus same asOf run 100 times produce byte-identical output', () => {
    const input = cleanInput({ smt: suppressedSmt() });
    const first = JSON.stringify(checkFatalFlaw(input));
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(checkFatalFlaw(cleanInput({ smt: suppressedSmt() })))).toBe(first);
    }
  });
});

describe('invalidation: prose verbatim pins plus bank discipline', () => {
  it('pins every flaw reason with toBe equality against the locked strings', () => {
    expect(
      checkFatalFlaw(cleanInput({ rollover: fixtureRollover({ rolloverSuspect: true }) })).reason,
    ).toBe(
      'FATAL FLAW (HARD): Rollover həftəsi korrupsiyası — kotirovka strukturu etibarsızdır, quraşdırma ləğv edildi.',
    );
    expect(checkFatalFlaw(cleanInput({ stale: fixtureStale({ nq15m: true }) })).reason).toBe(
      'FATAL FLAW (HARD): Ayaq bayatdır — qiymət axını köhnəlib, quraşdırma ləğv edildi.',
    );
    expect(checkFatalFlaw(cleanInput({ smt: suppressedSmt() })).reason).toBe(
      'FATAL FLAW (SOFT): SMT basdırılıb — korrelyasiya pozulub, atəş ARMED-ə endirildi.',
    );
    expect(
      checkFatalFlaw(
        cleanInput({
          judas: fixtureJudas({ candidate: true, confirmed: true, sweepSide: 'HIGH', displacementMult: 0.6 }),
        }),
      ).reason,
    ).toBe('FATAL FLAW (SOFT): Əks istiqamətli süpürmə təsdiqləndi — atəş ARMED-ə endirildi.');
    expect(checkFatalFlaw(cleanInput()).reason).toBe('Qüsur yoxdur: trigger hökmü qüvvədədir.');
  });

  it('pins every sentence-table cell including the null-sweepSide fallback', () => {
    const longLow = checkFatalFlaw(cleanInput({ judas: fixtureJudas({ sweepSide: 'LOW' }) }));
    expect(longLow.sentence).toBe(
      'FALSİFİKASİYA LONG: BSL reydi baş verməyibsə və qiymət premiumda qalırsa, LONG oxunuşu yanlışdır — BSL süpürməsi bu ssenarini təsdiqləyir.',
    );
    const shortHigh = checkFatalFlaw(
      cleanInput({
        trigger: fixtureFlawTrigger({ verdict: 'FIRE_SHORT', direction: 'SHORT', reasonKey: 'FIRE_SHORT' }),
        judas: fixtureJudas({ candidate: true, confirmed: false, sweepSide: 'HIGH' }),
      }),
    );
    expect(shortHigh.sentence).toBe(
      'FALSİFİKASİYA SHORT: SSL reydi baş verməyibsə və qiymət discountda qalırsa, SHORT oxunuşu yanlışdır — SSL süpürməsi bu ssenarini təsdiqləyir.',
    );
    const offDiagonal = checkFatalFlaw(
      cleanInput({
        trigger: fixtureFlawTrigger({ verdict: 'ARMED', direction: 'LONG', reasonKey: 'ARMED_MISSING_TIMING' }),
        judas: fixtureJudas({ candidate: true, confirmed: false, sweepSide: 'HIGH' }),
      }),
    );
    expect(offDiagonal.sentence).toBe(
      'FALSİFİKASİYA: təsdiqlənmiş süpürmə istiqaməti qərəzlə uzlaşmır — əks istiqamətli qapanış bu ssenarini puç edir.',
    );
    const nullSide = checkFatalFlaw(cleanInput({ judas: fixtureJudas({ sweepSide: null }) }));
    expect(nullSide.sentence).toBe(
      'FALSİFİKASİYA: təsdiqlənmiş süpürmə istiqaməti qərəzlə uzlaşmır — əks istiqamətli qapanış bu ssenarini puç edir.',
    );
    expect(SENTENCE_BY_KEY['LONG-LOW']).toBe(longLow.sentence);
    expect(SENTENCE_BY_KEY['SHORT-HIGH']).toBe(shortHigh.sentence);
    expect(SENTENCE_BY_KEY['LONG-HIGH']).toBe(SENTENCE_FALLBACK);
    expect(SENTENCE_BY_KEY['SHORT-LOW']).toBe(SENTENCE_FALLBACK);
  });

  it('pins every challenge-bank entry with dominant-trap priority', () => {
    expect(checkFatalFlaw(cleanInput({ smt: suppressedSmt() })).challenge).toBe(
      'Sual: SMT fərqliliyini görməzdən gəlmirsənmi — korrelyasiya 0.70-i bərpa etməyibsə, niyə indi?',
    );
    expect(
      checkFatalFlaw(
        cleanInput({
          judas: fixtureJudas({ candidate: true, confirmed: true, sweepSide: 'HIGH', displacementMult: 0.6 }),
        }),
      ).challenge,
    ).toBe('Sual: premium zonada qovmursanmı — giriş FVG-yə qayıdışı gözlədinmi?');
    expect(checkFatalFlaw(cleanInput()).challenge).toBe(
      'Sual: bu hərəkət xəbər-öncəsi mühəndislik deyilmi — təqvim pəncərəsini yoxladınmı?',
    );
    expect(
      checkFatalFlaw(cleanInput({ rollover: fixtureRollover({ rolloverSuspect: true }) })).challenge,
    ).toBe('Sual: bu hərəkət xəbər-öncəsi mühəndislik deyilmi — təqvim pəncərəsini yoxladınmı?');
    expect(CHALLENGE_BY_KEY['smt-divergence-ignored']).toBe(
      'Sual: SMT fərqliliyini görməzdən gəlmirsənmi — korrelyasiya 0.70-i bərpa etməyibsə, niyə indi?',
    );
    expect(CHALLENGE_BY_KEY['premium-chase']).toBe(
      'Sual: premium zonada qovmursanmı — giriş FVG-yə qayıdışı gözlədinmi?',
    );
    expect(CHALLENGE_BY_KEY['pre-news-engineering']).toBe(
      'Sual: bu hərəkət xəbər-öncəsi mühəndislik deyilmi — təqvim pəncərəsini yoxladınmı?',
    );
  });

  it('holds exactly 3 bank entries and selects deterministically on repeat calls', () => {
    expect(Object.keys(CHALLENGE_BY_KEY)).toHaveLength(3);
    const smtFirst = checkFatalFlaw(cleanInput({ smt: suppressedSmt() })).challenge;
    const smtSecond = checkFatalFlaw(cleanInput({ smt: suppressedSmt() })).challenge;
    expect(smtSecond).toBe(smtFirst);
    const sweepInput = () =>
      cleanInput({
        judas: fixtureJudas({ candidate: true, confirmed: true, sweepSide: 'HIGH', displacementMult: 0.6 }),
      });
    expect(checkFatalFlaw(sweepInput()).challenge).toBe(checkFatalFlaw(sweepInput()).challenge);
  });

  it('bans the generic label and keeps a non-empty unblock on every non-clean verdict', () => {
    const verdicts = [
      checkFatalFlaw(cleanInput({ rollover: fixtureRollover({ rolloverSuspect: true }) })),
      checkFatalFlaw(cleanInput({ stale: fixtureStale({ nq15m: true }) })),
      checkFatalFlaw(cleanInput({ smt: suppressedSmt() })),
      checkFatalFlaw(
        cleanInput({
          judas: fixtureJudas({ candidate: true, confirmed: true, sweepSide: 'HIGH', displacementMult: 0.6 }),
        }),
      ),
    ];
    for (const out of verdicts) {
      expect(out.reason).not.toBe('Invalidated');
      expect(out.reason).toBe(REASON_BY_KEY[out.reasonKey]);
      expect(out.unblock.length).toBeGreaterThan(0);
      expect(out.unblock).toBe(UNBLOCK_BY_KEY[out.reasonKey]);
    }
    expect(checkFatalFlaw(cleanInput()).unblock).toBe('');
  });

  it('names the fixed 0.70 threshold and never interpolates a live reading', () => {
    expect(UNBLOCK_BY_KEY.SMT_SUPPRESSED).toContain('0.70');
    const lowCorr = checkFatalFlaw(
      cleanInput({ smt: { suppressed: true, reason: 'CORR_DECOUPLED', corr: 0.4 } }),
    );
    const highishCorr = checkFatalFlaw(
      cleanInput({ smt: { suppressed: true, reason: 'CORR_DECOUPLED', corr: 0.62 } }),
    );
    expect(lowCorr.unblock).toBe(highishCorr.unblock);
    expect(lowCorr.unblock).not.toContain('0.4');
    expect(lowCorr.unblock).not.toContain('0.62');
    expect(lowCorr.challenge).not.toContain('0.4');
    expect(lowCorr.sentence).not.toContain('0.4');
  });
});

describe('invalidation: boundary throws', () => {
  it('null input throws with a got-string', () => {
    expect(() => checkFatalFlaw(null as unknown as FatalFlawInput)).toThrow(/got/);
  });

  it('non-finite asOf throws with a got-string', () => {
    expect(() => checkFatalFlaw(cleanInput({ asOf: Number.NaN }))).toThrow(/got/);
    expect(() => checkFatalFlaw(cleanInput({ asOf: 0 }))).toThrow(/got/);
  });

  it('malformed trigger envelope throws with a got-string', () => {
    expect(() =>
      checkFatalFlaw(cleanInput({ trigger: { verdict: 'BOGUS' } as unknown as TriggerOutput })),
    ).toThrow(/got/);
  });

  it('null smt judas rollover degrade without throwing', () => {
    const out = checkFatalFlaw(cleanInput({ smt: null, judas: null, rollover: null }));
    expect(out.invalidated).toBe(false);
    expect(out.downgraded).toBe(false);
    expect(out.reasonKey).toBe('NONE');
  });
});
