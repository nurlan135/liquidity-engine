import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { checkFatalFlaw } from '@/src/lib/ict/invalidation';
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

  it('confirmed opposite sweep downgrades FIRE_SHORT against a HIGH sweep', () => {
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
    expect(out.reason).toBe(armed.reason);
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
