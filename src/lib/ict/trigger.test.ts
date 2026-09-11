import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import {
  TRIGGER_DISP_MULT,
  TRIGGER_KZ_END_MIN,
  TRIGGER_KZ_START_MIN,
  TRIGGER_LOG_CAP,
  evaluateTrigger,
} from '@/src/lib/ict/trigger';
import type { JudasOutput, SweepSide } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { FvgGap } from '@/src/lib/ict/fvg';
import type { IntradayCandle } from '@/src/lib/ict/types';

const SESSION = '2026-06-15';

function fixtureTriggerJudas(overrides: Partial<JudasOutput> = {}): JudasOutput {
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

function signalSmt(
  direction: 'BULLISH' | 'BEARISH' | 'NO-SIGNAL' = 'BEARISH',
): SmtOutput {
  return {
    suppressed: false,
    direction,
    sweeperLeg: 'NQ',
    nqWindow: null,
    esWindow: null,
    bpsGap: 30,
  };
}

function suppressedSmt(): SmtOutput {
  return { suppressed: true, reason: 'CORR_DECOUPLED', corr: 0.4 };
}

// FVG list builder in the fvg.test.ts candle()+dated() style: dated origin
// keys plus explicit gap bounds per polarity.
function dated(day: number): string {
  return `2026-06-${String(day).padStart(2, '0')}`;
}

function fixtureFvg(
  polarity: 'BULLISH' | 'BEARISH',
  originDay: number,
  overrides: Partial<FvgGap> = {},
): FvgGap {
  return {
    polarity,
    top: polarity === 'BULLISH' ? 20060 : 20160,
    bottom: polarity === 'BULLISH' ? 20040 : 20140,
    originDate: dated(originDay),
    mitigated: false,
    ...overrides,
  };
}

// Epoch builders mirroring the judas.test.ts idiom: DST-aware conversion
// through fromZonedTime, no hand-rolled offsets, no new time builders.
function nyHourEpoch(nyDate: string, nyHour: number): number {
  return Math.floor(fromZonedTime(`${nyDate} ${String(nyHour).padStart(2, '0')}:00:00`, NY_TZ).getTime() / 1000);
}

function nyMinuteEpoch(nyDate: string, hhmm: string): number {
  return Math.floor(fromZonedTime(`${nyDate} ${hhmm}:00`, NY_TZ).getTime() / 1000);
}

// Row builder in the judas.test.ts idiom: time plus price plus overrides.
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

function fixtureRange(): { high: number; low: number; height: number } {
  return { high: 20100, low: 20000, height: 100 };
}

describe('trigger: calibrated constants pinned', () => {
  it('pins TRIGGER_DISP_MULT, the killzone window, and the log cap', () => {
    expect(TRIGGER_DISP_MULT).toBe(0.5);
    expect(TRIGGER_KZ_START_MIN).toBe(120);
    expect(TRIGGER_KZ_END_MIN).toBe(300);
    expect(TRIGGER_LOG_CAP).toBe(50);
  });

  it('carries a CALIBRATION-PROVISIONAL comment on every TRIGGER constant (TRIG-04)', async () => {
    // Source-text pin via the same eager raw-text channel the co-located
    // purity guard reads (import.meta.glob with ?raw) — no fs dependency,
    // no new module declarations.
    const modules = import.meta.glob('./trigger.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const src = Object.values(modules)[0] as string;
    for (const name of [
      'TRIGGER_KZ_START_MIN',
      'TRIGGER_KZ_END_MIN',
      'TRIGGER_DISP_MULT',
      'TRIGGER_LOG_CAP',
    ]) {
      const idx = src.indexOf(`export const ${name}`);
      expect(idx).toBeGreaterThan(-1);
      const preceding = src.slice(Math.max(0, idx - 400), idx);
      expect(preceding).toContain('CALIBRATION-PROVISIONAL');
    }
  });

  it('keeps the row and range fixture idiom honest', () => {
    const t = nyMinuteEpoch(SESSION, '02:00');
    const r = row(t, 20050);
    expect(r.time).toBe(t);
    expect(r.open).toBe(20050);
    expect(fixtureRange()).toEqual({ high: 20100, low: 20000, height: 100 });
  });
});

describe('trigger: TRIG-01 happy paths', () => {
  it('fires FIRE_LONG on a LOW sweep with 3 of 3 plus entry FVG', () => {
    const judas = fixtureTriggerJudas({
      candidate: true,
      confirmed: true,
      sweepSide: 'LOW' as SweepSide,
      sweepTime: nyMinuteEpoch(SESSION, '03:00'),
      displacementMult: 0.6,
    });
    const smt = signalSmt('BULLISH');
    const fvg = [fixtureFvg('BULLISH', 10)];
    const out = evaluateTrigger({
      judas,
      amd: null,
      smt,
      fvg,
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_LONG');
    expect(out.direction).toBe('LONG');
    expect(out.reasonKey).toBe('FIRE_LONG');
    expect(out.reason).toBe(
      'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır. SMT razılaşır.',
    );
    expect(out.gates).toEqual({ timing: true, purge: true, displacement: true });
    expect(out.entryFvg).not.toBeNull();
    expect(out.entryFvg?.polarity).toBe('BULLISH');
    expect(out.inputs.judas).toEqual(judas);
    expect(out.inputs.amd).toBeNull();
    expect(out.inputs.smt).toEqual(smt);
  });

  it('fires FIRE_SHORT on a HIGH sweep mirror', () => {
    const judas = fixtureTriggerJudas({
      candidate: true,
      confirmed: true,
      sweepSide: 'HIGH' as SweepSide,
      sweepTime: nyMinuteEpoch(SESSION, '03:00'),
      displacementMult: 0.6,
    });
    const smt = signalSmt('BEARISH');
    const out = evaluateTrigger({
      judas,
      amd: null,
      smt,
      fvg: [fixtureFvg('BEARISH', 10)],
      asOf: nyHourEpoch(SESSION, 3),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_SHORT');
    expect(out.direction).toBe('SHORT');
    expect(out.reasonKey).toBe('FIRE_SHORT');
    expect(out.reason).toBe(
      'WHY NOW SHORT: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır. SMT razılaşır.',
    );
    expect(out.gates).toEqual({ timing: true, purge: true, displacement: true });
    expect(out.entryFvg?.polarity).toBe('BEARISH');
  });
});

describe('trigger: choppy-sideways spam guard stays QUIET', () => {
  it('holds WAIT_FOR_MANIPULATION with 0 gates on null judas outside the killzone', () => {
    // Price 20050 rows sit strictly inside the 20100/20000 anchor: no sweep.
    const quiet = row(nyMinuteEpoch(SESSION, '10:00'), 20050);
    expect(quiet.high).toBeLessThan(20100);
    expect(quiet.low).toBeGreaterThan(20000);
    const out = evaluateTrigger({
      judas: null,
      amd: null,
      smt: null,
      fvg: null,
      asOf: nyMinuteEpoch(SESSION, '10:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('WAIT_FOR_MANIPULATION');
    expect(out.reasonKey).toBe('WAIT_FOR_MANIPULATION');
    expect(out.reason).toBe(
      'WAIT FOR MANIPULATION: Zaman, süpürmə və displacement razılaşmır — manipulyasiya gözlənilir.',
    );
    expect(out.gates).toEqual({ timing: false, purge: false, displacement: false });
    expect(out.entryFvg).toBeNull();
  });

  it('holds WAIT_FOR_MANIPULATION with 1 gate on unconfirmed judas inside the killzone', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: false,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.2,
      }),
      amd: null,
      smt: null,
      fvg: null,
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('WAIT_FOR_MANIPULATION');
    expect(out.gates).toEqual({ timing: true, purge: false, displacement: false });
  });
});

describe('trigger: D-01/D-02 NY sweep never fires', () => {
  it('holds purge false on a preRun-style NY-hours sweep', () => {
    // 10:00 NY is past the killzone close: judasSwing marks such sweeps
    // preRun with confirmed false by construction, so the purge gate reads
    // confirmed alone with no NY session branch in trigger.ts.
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: false,
        confirmed: false,
        preRun: true,
        sweepSide: 'HIGH' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '10:00'),
        displacementMult: 0,
      }),
      amd: null,
      smt: signalSmt('BEARISH'),
      fvg: [fixtureFvg('BEARISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '10:00'),
      alreadyFired: false,
    });
    expect(out.gates.purge).toBe(false);
    expect(out.verdict).not.toBe('FIRE_LONG');
    expect(out.verdict).not.toBe('FIRE_SHORT');
    expect(out.verdict).toBe('WAIT_FOR_MANIPULATION');
  });
});

describe('trigger: D-05 exactly-2-of-3 ARMED matrix', () => {
  it('arms ARMED_MISSING_TIMING at 06:00 NY with purge plus displacement true', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '06:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('ARMED');
    expect(out.reasonKey).toBe('ARMED_MISSING_TIMING');
    expect(out.reason).toBe(
      'WHY NOW ARMED: Quruluş hazırdır — killzone pəncərəsi gözlənilir.',
    );
    expect(out.gates).toEqual({ timing: false, purge: true, displacement: true });
    expect(out.entryFvg).toBeNull();
  });

  it('arms ARMED_MISSING_PURGE on unconfirmed judas with timing plus displacement true', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: false,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('ARMED');
    expect(out.reasonKey).toBe('ARMED_MISSING_PURGE');
    expect(out.reason).toBe(
      'WHY NOW ARMED: Quruluş hazırdır — London Judas təsdiqi gözlənilir.',
    );
    expect(out.gates).toEqual({ timing: true, purge: false, displacement: true });
    expect(out.entryFvg).toBeNull();
  });

  it('arms ARMED_MISSING_DISPLACEMENT on weak displacement with timing plus purge true', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.2,
      }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('ARMED');
    expect(out.reasonKey).toBe('ARMED_MISSING_DISPLACEMENT');
    expect(out.reason).toBe(
      'WHY NOW ARMED: Quruluş hazırdır — displacement təsdiqi və giriş FVG gözlənilir.',
    );
    expect(out.gates).toEqual({ timing: true, purge: true, displacement: false });
    expect(out.entryFvg).toBeNull();
  });
});

describe('trigger: 0-to-1 gates stay WAIT_FOR_MANIPULATION', () => {
  it('waits with a lone displacement gate outside the killzone on unconfirmed sweep', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: false,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '10:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('WAIT_FOR_MANIPULATION');
    expect(out.reasonKey).toBe('WAIT_FOR_MANIPULATION');
    expect(out.reason).toBe(
      'WAIT FOR MANIPULATION: Zaman, süpürmə və displacement razılaşmır — manipulyasiya gözlənilir.',
    );
    expect(out.gates).toEqual({ timing: false, purge: false, displacement: true });
    expect(out.entryFvg).toBeNull();
  });
});

describe('trigger: D-03 boundary pins', () => {
  it('reads displacement false just below 0.5 and true just above', () => {
    const base = {
      candidate: true,
      confirmed: true,
      sweepSide: 'LOW' as SweepSide,
      sweepTime: nyMinuteEpoch(SESSION, '03:00'),
    };
    const below = evaluateTrigger({
      judas: fixtureTriggerJudas({ ...base, displacementMult: 0.499 }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(below.gates.displacement).toBe(false);
    expect(below.verdict).toBe('ARMED');
    expect(below.reasonKey).toBe('ARMED_MISSING_DISPLACEMENT');
    expect(below.entryFvg).toBeNull();
    const above = evaluateTrigger({
      judas: fixtureTriggerJudas({ ...base, displacementMult: 0.501 }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(above.gates.displacement).toBe(true);
    expect(above.verdict).toBe('FIRE_LONG');
    expect(above.reasonKey).toBe('FIRE_LONG');
  });

  it('reads displacement true at exactly 0.5 via TOL_EPS tolerance', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.5,
      }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.gates.displacement).toBe(true);
    expect(out.verdict).toBe('FIRE_LONG');
  });

  it('reads timing false on killzone edges 120 and 300, true just inside at 121 and 299', () => {
    const sweep = (mult = 0.6) =>
      fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: mult,
      });
    const at = (hhmm: string) =>
      evaluateTrigger({
        judas: sweep(),
        amd: null,
        smt: null,
        fvg: [fixtureFvg('BULLISH', 10)],
        asOf: nyMinuteEpoch(SESSION, hhmm),
        alreadyFired: false,
      });
    const open = at('02:00');
    expect(open.gates.timing).toBe(false);
    expect(open.verdict).toBe('ARMED');
    expect(open.reasonKey).toBe('ARMED_MISSING_TIMING');
    const close = at('05:00');
    expect(close.gates.timing).toBe(false);
    expect(close.verdict).toBe('ARMED');
    expect(close.reasonKey).toBe('ARMED_MISSING_TIMING');
    const insideOpen = at('02:01');
    expect(insideOpen.gates.timing).toBe(true);
    expect(insideOpen.verdict).toBe('FIRE_LONG');
    const insideClose = at('04:59');
    expect(insideClose.gates.timing).toBe(true);
    expect(insideClose.verdict).toBe('FIRE_LONG');
  });
});
describe('trigger: D-06 cooldown matrix', () => {
  it('downgrades an otherwise 3-of-3 LOW sweep to ARMED_ALREADY_FIRED with null entryFvg', () => {
    const judas = fixtureTriggerJudas({
      candidate: true,
      confirmed: true,
      sweepSide: 'LOW' as SweepSide,
      sweepTime: nyMinuteEpoch(SESSION, '03:00'),
      displacementMult: 0.6,
    });
    const out = evaluateTrigger({
      judas,
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: true,
    });
    expect(out.verdict).toBe('ARMED');
    expect(out.reasonKey).toBe('ARMED_ALREADY_FIRED');
    expect(out.reason).toBe(
      'WHY NOW ARMED: Bu sessiyada siqnal artıq verilib — təkrar giriş yoxdur.',
    );
    expect(out.verdict).not.toBe('FIRE_LONG');
    expect(out.verdict).not.toBe('FIRE_SHORT');
    expect(out.entryFvg).toBeNull();
    expect(out.gates).toEqual({ timing: true, purge: true, displacement: true });
  });

  it('fires FIRE_LONG on the alreadyFired false control', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_LONG');
    expect(out.reasonKey).toBe('FIRE_LONG');
    expect(out.entryFvg).not.toBeNull();
  });
});

describe('trigger: D-04 no-FVG downgrade', () => {
  it('caps null inventory at ARMED even at 3-of-3 otherwise', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: null,
      fvg: null,
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('ARMED');
    expect(out.reasonKey).toBe('ARMED_MISSING_DISPLACEMENT');
    expect(out.entryFvg).toBeNull();
    expect(out.gates).toEqual({ timing: true, purge: true, displacement: false });
  });

  it('caps empty inventory at ARMED', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: null,
      fvg: [],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('ARMED');
    expect(out.entryFvg).toBeNull();
  });

  it('caps wrong-polarity-only inventory at ARMED with the displacement key', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BEARISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('ARMED');
    expect(out.reasonKey).toBe('ARMED_MISSING_DISPLACEMENT');
    expect(out.entryFvg).toBeNull();
    expect(out.gates.displacement).toBe(false);
  });

  it('caps mitigated-only inventory at ARMED', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 10, { mitigated: true })],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('ARMED');
    expect(out.entryFvg).toBeNull();
  });

  it('selects the most recent originDate BULLISH gap on FIRE preserving the ticket handle', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 8), fixtureFvg('BULLISH', 12)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_LONG');
    expect(out.entryFvg).not.toBeNull();
    expect(out.entryFvg?.originDate).toBe(dated(12));
    expect(out.entryFvg?.polarity).toBe('BULLISH');
    expect(out.entryFvg?.top).toBe(20060);
    expect(out.entryFvg?.bottom).toBe(20040);
  });
});

describe('trigger: SMT read-only agree tag', () => {
  it('appends the agree suffix on concordant unsuppressed SMT without changing the verdict', () => {
    const low = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: signalSmt('BULLISH'),
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(low.verdict).toBe('FIRE_LONG');
    expect(low.reason).toBe(
      'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır. SMT razılaşır.',
    );
    const high = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'HIGH' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: signalSmt('BEARISH'),
      fvg: [fixtureFvg('BEARISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(high.verdict).toBe('FIRE_SHORT');
    expect(high.reason).toBe(
      'WHY NOW SHORT: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır. SMT razılaşır.',
    );
  });

  it('fires without the suffix on discordant SMT and on every ARMED and WAIT verdict entryFvg stays null', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: signalSmt('BEARISH'),
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_LONG');
    expect(out.reason).toBe(
      'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.',
    );
    const armed = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: false,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: signalSmt('BULLISH'),
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(armed.verdict).toBe('ARMED');
    expect(armed.entryFvg).toBeNull();
    const wait = evaluateTrigger({
      judas: null,
      amd: null,
      smt: signalSmt('BULLISH'),
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '10:00'),
      alreadyFired: false,
    });
    expect(wait.verdict).toBe('WAIT_FOR_MANIPULATION');
    expect(wait.entryFvg).toBeNull();
  });

  it('fires without the agree suffix when SMT is suppressed', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: suppressedSmt(),
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_LONG');
    expect(out.reason).toBe(
      'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.',
    );
  });
});

describe('trigger: malformed-input throws at the boundary', () => {
  it('rejects a null input object', () => {
    expect(() => evaluateTrigger(null as unknown as never)).toThrow(
      'evaluateTrigger requires an input object, got',
    );
  });

  it('rejects non-finite and non-positive asOf with got-string messages', () => {
    const base = {
      judas: fixtureTriggerJudas(),
      amd: null,
      smt: null,
      fvg: null,
      alreadyFired: false,
    };
    for (const asOf of [NaN, Infinity, 0, -1, 'abc']) {
      expect(() =>
        evaluateTrigger({ ...base, asOf: asOf as unknown as number }),
      ).toThrow('evaluateTrigger requires a finite positive asOf epoch, got');
    }
  });

  it('rejects malformed judas envelopes: candidate 1, string sweepTime, BOTH side', () => {
    const asOf = nyMinuteEpoch(SESSION, '03:00');
    expect(() =>
      evaluateTrigger({
        judas: { ...fixtureTriggerJudas({ candidate: true }), candidate: 1 } as unknown as JudasOutput,
        amd: null,
        smt: null,
        fvg: null,
        asOf,
        alreadyFired: false,
      }),
    ).toThrow('evaluateTrigger requires boolean judas candidate/confirmed, got');
    expect(() =>
      evaluateTrigger({
        judas: fixtureTriggerJudas({
          candidate: true,
          confirmed: true,
          sweepTime: 'abc' as unknown as number,
        }),
        amd: null,
        smt: null,
        fvg: null,
        asOf,
        alreadyFired: false,
      }),
    ).toThrow('evaluateTrigger requires a finite positive judas sweepTime or null, got');
    expect(() =>
      evaluateTrigger({
        judas: fixtureTriggerJudas({ candidate: true, sweepSide: 'BOTH' as unknown as SweepSide }),
        amd: null,
        smt: null,
        fvg: null,
        asOf,
        alreadyFired: false,
      }),
    ).toThrow('evaluateTrigger requires judas sweepSide HIGH, LOW, or null, got');
  });

  it('rejects non-boolean alreadyFired', () => {
    expect(() =>
      evaluateTrigger({
        judas: fixtureTriggerJudas(),
        amd: null,
        smt: null,
        fvg: null,
        asOf: nyMinuteEpoch(SESSION, '03:00'),
        alreadyFired: 'yes' as unknown as boolean,
      }),
    ).toThrow('evaluateTrigger requires a boolean alreadyFired, got');
  });

  it('rejects non-finite FvgGap top or bottom', () => {
    const asOf = nyMinuteEpoch(SESSION, '03:00');
    expect(() =>
      evaluateTrigger({
        judas: fixtureTriggerJudas(),
        amd: null,
        smt: null,
        fvg: [fixtureFvg('BULLISH', 10, { top: NaN })],
        asOf,
        alreadyFired: false,
      }),
    ).toThrow('evaluateTrigger requires finite gap bounds, got');
    expect(() =>
      evaluateTrigger({
        judas: fixtureTriggerJudas(),
        amd: null,
        smt: null,
        fvg: [fixtureFvg('BULLISH', 10, { bottom: Infinity })],
        asOf,
        alreadyFired: false,
      }),
    ).toThrow('evaluateTrigger requires finite gap bounds, got');
  });

  it('degrades null detectors to honest WAIT without throwing', () => {
    const out = evaluateTrigger({
      judas: null,
      amd: null,
      smt: null,
      fvg: null,
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('WAIT_FOR_MANIPULATION');
    expect(out.reasonKey).toBe('WAIT_FOR_MANIPULATION');
    expect(out.gates).toEqual({ timing: true, purge: false, displacement: false });
    expect(out.entryFvg).toBeNull();
  });
});

describe('trigger: D-09 verbatim prose lock with suffix matrix', () => {
  it('pins the bare FIRE_LONG base sentence on null SMT (suffix absent)', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_LONG');
    expect(out.reasonKey).toBe('FIRE_LONG');
    expect(out.reason).toBe(
      'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.',
    );
  });

  it('pins the bare FIRE_SHORT base sentence on discordant SMT (suffix absent)', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'HIGH' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: signalSmt('BULLISH'),
      fvg: [fixtureFvg('BEARISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_SHORT');
    expect(out.reasonKey).toBe('FIRE_SHORT');
    expect(out.reason).toBe(
      'WHY NOW SHORT: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.',
    );
  });

  it('pins the bare FIRE_SHORT base sentence on suppressed SMT (suffix absent)', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'HIGH' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: suppressedSmt(),
      fvg: [fixtureFvg('BEARISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_SHORT');
    expect(out.reasonKey).toBe('FIRE_SHORT');
    expect(out.reason).toBe(
      'WHY NOW SHORT: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.',
    );
  });

  it('appends the agree suffix to an ARMED_MISSING_TIMING reason on concordant SMT', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: signalSmt('BULLISH'),
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '06:00'),
      alreadyFired: false,
    });
    expect(out.verdict).toBe('ARMED');
    expect(out.reasonKey).toBe('ARMED_MISSING_TIMING');
    expect(out.reason).toBe(
      'WHY NOW ARMED: Quruluş hazırdır — killzone pəncərəsi gözlənilir. SMT razılaşır.',
    );
    expect(out.entryFvg).toBeNull();
  });

  it('appends the agree suffix to an ARMED_ALREADY_FIRED reason on concordant SMT', () => {
    const out = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: signalSmt('BULLISH'),
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: true,
    });
    expect(out.verdict).toBe('ARMED');
    expect(out.reasonKey).toBe('ARMED_ALREADY_FIRED');
    expect(out.reason).toBe(
      'WHY NOW ARMED: Bu sessiyada siqnal artıq verilib — təkrar giriş yoxdur. SMT razılaşır.',
    );
    expect(out.entryFvg).toBeNull();
  });

  it('holds ARMED and WAIT reasons bare on suppressed SMT (suffix absent beyond FIRE)', () => {
    const armed = evaluateTrigger({
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: false,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: suppressedSmt(),
      fvg: [fixtureFvg('BULLISH', 10)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    });
    expect(armed.verdict).toBe('ARMED');
    expect(armed.reasonKey).toBe('ARMED_MISSING_PURGE');
    expect(armed.reason).toBe(
      'WHY NOW ARMED: Quruluş hazırdır — London Judas təsdiqi gözlənilir.',
    );
    const wait = evaluateTrigger({
      judas: null,
      amd: null,
      smt: suppressedSmt(),
      fvg: null,
      asOf: nyMinuteEpoch(SESSION, '10:00'),
      alreadyFired: false,
    });
    expect(wait.verdict).toBe('WAIT_FOR_MANIPULATION');
    expect(wait.reasonKey).toBe('WAIT_FOR_MANIPULATION');
    expect(wait.reason).toBe(
      'WAIT FOR MANIPULATION: Zaman, süpürmə və displacement razılaşmır — manipulyasiya gözlənilir.',
    );
  });
});

describe('trigger: determinism', () => {
  it('yields byte-identical verdict plus reason plus gates plus entryFvg on repeat evaluation', () => {
    const input = {
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW' as SweepSide,
        sweepTime: nyMinuteEpoch(SESSION, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: signalSmt('BULLISH'),
      fvg: [fixtureFvg('BULLISH', 8), fixtureFvg('BULLISH', 12)],
      asOf: nyMinuteEpoch(SESSION, '03:00'),
      alreadyFired: false,
    };
    const first = evaluateTrigger(input);
    const second = evaluateTrigger({ ...input, fvg: [...(input.fvg ?? [])] });
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second.verdict).toBe(first.verdict);
    expect(second.reason).toBe(first.reason);
    expect(second.gates).toEqual(first.gates);
    expect(second.entryFvg).toEqual(first.entryFvg);
  });
});
