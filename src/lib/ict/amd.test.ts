import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { amdPhase } from '@/src/lib/ict/amd';
import { asiaRange } from '@/src/lib/ict/asia';
import type { AsiaRange } from '@/src/lib/ict/asia';
import { judasSwing } from '@/src/lib/ict/judas';
import type { JudasOutput, SweepSide } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { IntradayCandle } from '@/src/lib/ict/types';

const SESSION = '2026-06-15';

function fixtureAsia(): AsiaRange {
  return { high: 20100, low: 20000, height: 100, sessionDate: SESSION };
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

// Epoch seconds of a NY wall-clock hour on a given NY calendar date. Built
// from date-fns-tz's own DST-aware zone conversion (fromZonedTime interprets
// the wall time in NY_TZ), mirroring the nyHourEpoch shape in the asia and
// judas suites — no clock reads, no hand-rolled offsets.
function nyHourEpoch(nyDate: string, nyHour: number): number {
  return Math.floor(fromZonedTime(`${nyDate} ${String(nyHour).padStart(2, '0')}:00:00`, NY_TZ).getTime() / 1000);
}

// Asia-hours evaluation instant: 21:00 NY on the session date (1260 minutes,
// past the 1200 Asia open and clear of the 570-960 NY branch).
function asiaHourEpoch(): number {
  return nyHourEpoch(SESSION, 21);
}

describe('amd: accumulation on Asia hours with null Judas', () => {
  it('returns accumulation with the exact accumulation reason', () => {
    const out = amdPhase({ asia: fixtureAsia(), judas: null, smt: null, asOf: asiaHourEpoch() });
    expect(out.phase).toBe('accumulation');
    expect(out.reason).toBe('Asia Range Təmizlənməyib. London Judas Swing Gözlənilir.');
    expect(out.inputs.asia).toEqual(fixtureAsia());
    expect(out.inputs.judas).toBeNull();
    expect(out.inputs.smt).toBeNull();
  });
});

describe('amd: candidate-only manipulation', () => {
  it('returns manipulation with the exact təsdiq-gözlənilir reason', () => {
    const sweepTime = nyHourEpoch(SESSION, 3);
    const judas = fixtureJudas({
      candidate: true,
      confirmed: false,
      sweepSide: 'HIGH' as SweepSide,
      sweepTime,
      displacementMult: 0.2,
    });
    const out = amdPhase({ asia: fixtureAsia(), judas, smt: null, asOf: asiaHourEpoch() });
    expect(out.phase).toBe('manipulation');
    expect(out.reason).toBe(
      'Asia Range Təmizlənib. London Judas Swing Gözlənilir — təsdiq gözlənilir.',
    );
  });
});

describe('amd: confirmed manipulation inside the window', () => {
  it('returns manipulation with the exact Baş-verib reason', () => {
    const sweepTime = nyHourEpoch(SESSION, 3);
    const asOf = sweepTime + 600;
    const judas = fixtureJudas({
      candidate: true,
      confirmed: true,
      sweepSide: 'HIGH' as SweepSide,
      sweepTime,
      displacementMult: 0.6,
    });
    const out = amdPhase({ asia: fixtureAsia(), judas, smt: null, asOf });
    expect(out.phase).toBe('manipulation');
    expect(out.reason).toBe('Asia Range Təmizlənib. London Judas Swing Baş verib.');
  });
});

describe('amd: distribution past the confirmation window', () => {
  it('promotes only past sweepTime plus 2700 with the exact davam-mərhələsi reason', () => {
    const sweepTime = nyHourEpoch(SESSION, 3);
    const judas = fixtureJudas({
      candidate: true,
      confirmed: true,
      sweepSide: 'HIGH' as SweepSide,
      sweepTime,
      displacementMult: 0.7,
    });
    const inside = amdPhase({ asia: fixtureAsia(), judas, smt: null, asOf: sweepTime + 2700 });
    expect(inside.phase).toBe('manipulation');
    const past = amdPhase({ asia: fixtureAsia(), judas, smt: null, asOf: sweepTime + 2701 });
    expect(past.phase).toBe('distribution');
    expect(past.reason).toBe(
      'Asia Range Təmizlənib. London Judas Swing Baş verib — davam mərhələsi.',
    );
  });
});

describe('amd: NY unavailable branch', () => {
  it('preserves the prior phase with the exact NY unavailable reason', () => {
    const sweepTime = nyHourEpoch(SESSION, 3);
    const judas = fixtureJudas({
      candidate: true,
      confirmed: true,
      sweepSide: 'HIGH' as SweepSide,
      sweepTime,
      displacementMult: 0.7,
    });
    // 10:00 NY (600 minutes) sits strictly inside the 570-960 NY session.
    const out = amdPhase({
      asia: fixtureAsia(),
      judas,
      smt: null,
      asOf: nyHourEpoch('2026-06-16', 10),
    });
    expect(out.phase).toBe('distribution');
    expect(out.reason).toBe('Gözlənilir — NY sessiyası v2.0-da ölçülmür.');
  });
});

describe('amd: empty-range degraded branch', () => {
  it('returns accumulation with the exact aralıq-tapılmadı reason', () => {
    const out = amdPhase({ asia: null, judas: null, smt: null, asOf: asiaHourEpoch() });
    expect(out.phase).toBe('accumulation');
    expect(out.reason).toBe(
      'Asia Range Təmizlənməyib — aralıq tapılmadı. London Judas Swing Gözlənilir.',
    );
  });
});

describe('amd: SMT agreement tag', () => {
  it('appends the exact agreement sentence on aligned confirmation', () => {
    const sweepTime = nyHourEpoch(SESSION, 3);
    const judas = fixtureJudas({
      candidate: true,
      confirmed: true,
      sweepSide: 'HIGH' as SweepSide,
      sweepTime,
      displacementMult: 0.6,
    });
    const out = amdPhase({
      asia: fixtureAsia(),
      judas,
      smt: signalSmt('BEARISH'),
      asOf: sweepTime + 600,
    });
    expect(out.phase).toBe('manipulation');
    expect(out.reason).toBe(
      'Asia Range Təmizlənib. London Judas Swing Baş verib. SMT razılaşır.',
    );
  });
});

describe('amd: SMT suppression tag', () => {
  it('appends the exact SMT unavailable sentence when suppressed', () => {
    const sweepTime = nyHourEpoch(SESSION, 3);
    const judas = fixtureJudas({
      candidate: true,
      confirmed: true,
      sweepSide: 'HIGH' as SweepSide,
      sweepTime,
      displacementMult: 0.6,
    });
    const out = amdPhase({
      asia: fixtureAsia(),
      judas,
      smt: suppressedSmt(),
      asOf: sweepTime + 600,
    });
    expect(out.reason).toBe(
      'Asia Range Təmizlənib. London Judas Swing Baş verib. SMT Gözlənilir.',
    );
  });
});

describe('amd: SMT read-only', () => {
  it('leaves the passed SMT object deep-equal after the call', () => {
    const sweepTime = nyHourEpoch(SESSION, 3);
    const judas = fixtureJudas({
      candidate: true,
      confirmed: true,
      sweepSide: 'HIGH' as SweepSide,
      sweepTime,
      displacementMult: 0.6,
    });
    const smt = signalSmt('BEARISH');
    const before = JSON.parse(JSON.stringify(smt)) as SmtOutput;
    amdPhase({ asia: fixtureAsia(), judas, smt, asOf: sweepTime + 600 });
    expect(smt).toEqual(before);
  });
});

describe('amd: end-to-end asiaRange through judasSwing to amdPhase fusion', () => {
  it('classifies manipulation with the exact Baş-verib reason and echoed inputs', () => {
    // One deterministic evening: five closed 1H Asia rows at the 20:00 NY open
    // hour with known wick extremes, then twelve closed 15M killzone rows
    // carrying a HIGH-side pierce plus a six-tenths-height close back.
    const asiaRows: IntradayCandle[] = [];
    let t = nyHourEpoch(SESSION, 20);
    for (let i = 0; i < 5; i++) {
      asiaRows.push({
        time: t,
        open: 20050 - i * 5,
        high: 20100 - i * 4,
        low: 20000 + i * 3,
        close: 20050 - i * 5,
      });
      t += 3600;
    }
    const range = asiaRange(asiaRows, SESSION);
    expect(range).not.toBeNull();
    const asia = range as AsiaRange;
    expect(asia.high).toBe(20100);
    expect(asia.low).toBe(20000);

    const killzone: IntradayCandle[] = [];
    let k = nyHourEpoch(SESSION, 2);
    for (let i = 0; i < 12; i++) {
      killzone.push({ time: k, open: 20050, high: 20058, low: 20044, close: 20053 });
      k += 900;
    }
    // 02:30 sweep: wick pierces strictly above the Asia high.
    killzone[2] = {
      time: killzone[2].time,
      open: 20090,
      high: 20120,
      low: 20060,
      close: 20105,
    };
    // 02:45 reversal: closes back through the high with 60/100 displacement.
    killzone[3] = {
      time: killzone[3].time,
      open: 20030,
      high: 20048,
      low: 20032,
      close: 20040,
    };
    const judas = judasSwing(killzone, asia);
    expect(judas.candidate).toBe(true);
    expect(judas.confirmed).toBe(true);
    expect(judas.sweepSide).toBe('HIGH');

    const smt = signalSmt('BEARISH');
    const out = amdPhase({ asia, judas, smt, asOf: (judas.sweepTime as number) + 600 });
    expect(out.phase).toBe('manipulation');
    expect(out.reason).toBe(
      'Asia Range Təmizlənib. London Judas Swing Baş verib. SMT razılaşır.',
    );
    expect(out.inputs.asia?.high).toBe(20100);
    expect(out.inputs.asia?.low).toBe(20000);
    expect(out.inputs.judas?.sweepSide).toBe('HIGH');
    const smtDir = out.inputs.smt !== null && out.inputs.smt !== undefined && !out.inputs.smt.suppressed
      ? out.inputs.smt.direction
      : null;
    expect(smtDir).toBe('BEARISH');
  });
});
