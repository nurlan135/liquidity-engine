import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { evaluateTrigger } from '@/src/lib/ict/trigger';
import type { TriggerOutput } from '@/src/lib/ict/trigger';
import type { AmdOutput } from '@/src/lib/ict/amd';
import type { JudasOutput, SweepSide } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { FvgGap } from '@/src/lib/ict/fvg';

// Task 1 builders: copied verbatim from trigger.test.ts lines 18-66 precedent
// (STEP 900, BASE 20000 idiom via fromZonedTime with NY_TZ, never hand-rolled
// offsets). signalSmt carries the unsuppressed signal shape (suppressed false
// with direction plus sweeperLeg NQ plus bpsGap 30); suppressedSmt carries the
// decoupled shape (suppressed true with reason CORR_DECOUPLED plus corr 0.4).
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

function fixtureFvg(
  polarity: 'BULLISH' | 'BEARISH',
  originDay: number,
  overrides: Partial<FvgGap> = {},
): FvgGap {
  const day = `2026-06-${String(originDay).padStart(2, '0')}`;
  return {
    polarity,
    top: polarity === 'BULLISH' ? 20060 : 20160,
    bottom: polarity === 'BULLISH' ? 20040 : 20140,
    originDate: day,
    mitigated: false,
    ...overrides,
  };
}

function nyMinuteEpoch(nyDate: string, hhmm: string): number {
  return Math.floor(fromZonedTime(`${nyDate} ${hhmm}:00`, NY_TZ).getTime() / 1000);
}

// One shared triple shape: a confirmed sweep JudasOutput plus amd plus smt
// plus fvg fed into evaluateTrigger as the identical object references, so
// the inputs echo contract proves same-snapshot sharing, never re-derived
// copies. HIGH sweep drives SHORT direction (needs BEARISH FVG); LOW sweep
// drives LONG direction (needs BULLISH FVG).
interface ParityTriple {
  judas: JudasOutput;
  amd: AmdOutput | null;
  smt: SmtOutput;
  fvg: FvgGap[];
  asOf: number;
}

function firingTriple(
  sweepSide: SweepSide,
  smt: SmtOutput,
  nyDate = '2026-06-15',
): ParityTriple {
  const asOf = nyMinuteEpoch(nyDate, '03:00');
  const polarity = sweepSide === 'LOW' ? 'BULLISH' : 'BEARISH';
  const judas = fixtureTriggerJudas({
    candidate: true,
    confirmed: true,
    sweepSide,
    sweepTime: nyMinuteEpoch(nyDate, '03:00'),
    displacementMult: 0.6,
  });
  return { judas, amd: null, smt, fvg: [fixtureFvg(polarity, 15)], asOf };
}

// Contradiction predicates (D-04/D-05 strictest form): framed as
// contradiction (FIRE plus opposing SMT fails), never as requirement (FIRE
// requires agreement) — suppressed-SMT fires stay legal at trigger layer.
// Returns true when the snapshot is parity-clean, false on contradiction.
function parityClean(trigger: TriggerOutput, smt: SmtOutput): boolean {
  if (smt.suppressed === true) return true;
  if (trigger.verdict === 'FIRE_SHORT' && smt.direction === 'BULLISH') return false;
  if (trigger.verdict === 'FIRE_LONG' && smt.direction === 'BEARISH') return false;
  return true;
}

describe('parity: FIRE_SHORT versus BULLISH contradiction on one snapshot', () => {
  it('fails the predicate for FIRE_SHORT paired with unsuppressed BULLISH', () => {
    const triple = firingTriple('HIGH', signalSmt('BULLISH'));
    const out = evaluateTrigger({
      judas: triple.judas,
      amd: triple.amd,
      smt: triple.smt,
      fvg: triple.fvg,
      asOf: triple.asOf,
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_SHORT');
    expect(out.reasonKey).toBe('FIRE_SHORT');
    expect(parityClean(out, triple.smt)).toBe(false);
  });

  it('passes the predicate for FIRE_SHORT paired with unsuppressed BEARISH', () => {
    const triple = firingTriple('HIGH', signalSmt('BEARISH'));
    const out = evaluateTrigger({
      judas: triple.judas,
      amd: triple.amd,
      smt: triple.smt,
      fvg: triple.fvg,
      asOf: triple.asOf,
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_SHORT');
    expect(out.reasonKey).toBe('FIRE_SHORT');
    expect(parityClean(out, triple.smt)).toBe(true);
  });

  it('proves the identical triple feeds both sides via the inputs echo contract', () => {
    const triple = firingTriple('HIGH', signalSmt('BEARISH'));
    const out = evaluateTrigger({
      judas: triple.judas,
      amd: triple.amd,
      smt: triple.smt,
      fvg: triple.fvg,
      asOf: triple.asOf,
      alreadyFired: false,
    });
    expect(out.inputs.judas).toEqual(triple.judas);
    expect(out.inputs.smt).toEqual(triple.smt);
    expect(out.inputs.judas).toBe(triple.judas);
    expect(out.inputs.smt).toBe(triple.smt);
  });
});
