import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { amdPhase } from '@/src/lib/ict/amd';
import type { AsiaRange } from '@/src/lib/ict/asia';
import type { JudasOutput, SweepSide } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';

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
