import { describe, expect, it } from 'vitest';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { evaluateTrigger } from '@/src/lib/ict/trigger';
import type { TriggerOutput } from '@/src/lib/ict/trigger';
import { checkFatalFlaw } from '@/src/lib/ict/invalidation';
import type { FatalFlawOutput } from '@/src/lib/ict/invalidation';
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

// Task 2 roster: full contradiction set in the D-05 strictest form. Every
// SMT rule is framed as contradiction (FIRE plus opposing direction fails),
// never as requirement (FIRE requires agreement), so suppressed-SMT fires
// stay legal at trigger layer. Fixtures are tuned to the locked semantics,
// never the predicates weakened to pass.
function makeAmd(phase: AmdOutput['phase']): AmdOutput {
  return {
    phase,
    reason: phase,
    inputs: { asia: null, judas: null, smt: null },
  };
}

// AMD accumulation means no judas candidate; trigger purge means confirmed
// true with a sweep side. Both true on the same snapshot contradicts.
function amdAccumulationContradicts(
  amd: AmdOutput | null,
  trigger: TriggerOutput,
): boolean {
  if (amd === null) return false;
  return amd.phase === 'accumulation' && trigger.gates.purge === true;
}

// NY-hours bars (minutes 570-960) skip AMD-phase agreement asserts but still
// run SMT-direction parity.
function isNyHours(asOf: number): boolean {
  const hour = Number(formatInTimeZone(asOf * 1000, NY_TZ, 'H'));
  const minute = Number(formatInTimeZone(asOf * 1000, NY_TZ, 'm'));
  const minutes = hour * 60 + minute;
  return minutes >= 570 && minutes < 960;
}

describe('parity: full contradiction roster with ARMED-key and AMD rules', () => {
  it('fails the mirror rule for FIRE_LONG paired with unsuppressed BEARISH', () => {
    const triple = firingTriple('LOW', signalSmt('BEARISH'));
    const out = evaluateTrigger({
      judas: triple.judas,
      amd: triple.amd,
      smt: triple.smt,
      fvg: triple.fvg,
      asOf: triple.asOf,
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_LONG');
    expect(out.reasonKey).toBe('FIRE_LONG');
    expect(parityClean(out, triple.smt)).toBe(false);
  });

  it('passes FIRE_LONG paired with unsuppressed BULLISH', () => {
    const triple = firingTriple('LOW', signalSmt('BULLISH'));
    const out = evaluateTrigger({
      judas: triple.judas,
      amd: triple.amd,
      smt: triple.smt,
      fvg: triple.fvg,
      asOf: triple.asOf,
      alreadyFired: false,
    });
    expect(out.verdict).toBe('FIRE_LONG');
    expect(parityClean(out, triple.smt)).toBe(true);
  });

  it('pins the ARMED-key total function: each key matches exactly its missing gate', () => {
    const nyDate = '2026-06-15';
    const firingJudas = (overrides: Partial<JudasOutput>): JudasOutput =>
      fixtureTriggerJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch(nyDate, '03:00'),
        displacementMult: 0.6,
        ...overrides,
      });
    const bullFvg = [fixtureFvg('BULLISH', 15)];

    // Missing timing: 01:00 (minutes 60) with purge plus displacement true.
    const noTiming = evaluateTrigger({
      judas: firingJudas({}),
      amd: null,
      smt: signalSmt('BULLISH'),
      fvg: bullFvg,
      asOf: nyMinuteEpoch(nyDate, '01:00'),
      alreadyFired: false,
    });
    expect(noTiming.verdict).toBe('ARMED');
    expect(noTiming.reasonKey).toBe('ARMED_MISSING_TIMING');
    expect(noTiming.gates).toEqual({ timing: false, purge: true, displacement: true });

    // Missing purge: candidate-only (confirmed false) at 03:00.
    const noPurge = evaluateTrigger({
      judas: firingJudas({ confirmed: false }),
      amd: null,
      smt: signalSmt('BULLISH'),
      fvg: bullFvg,
      asOf: nyMinuteEpoch(nyDate, '03:00'),
      alreadyFired: false,
    });
    expect(noPurge.verdict).toBe('ARMED');
    expect(noPurge.reasonKey).toBe('ARMED_MISSING_PURGE');
    expect(noPurge.gates).toEqual({ timing: true, purge: false, displacement: true });

    // Missing displacement: zero multiple at 03:00.
    const noDisp = evaluateTrigger({
      judas: firingJudas({ displacementMult: 0 }),
      amd: null,
      smt: signalSmt('BULLISH'),
      fvg: bullFvg,
      asOf: nyMinuteEpoch(nyDate, '03:00'),
      alreadyFired: false,
    });
    expect(noDisp.verdict).toBe('ARMED');
    expect(noDisp.reasonKey).toBe('ARMED_MISSING_DISPLACEMENT');
    expect(noDisp.gates).toEqual({ timing: true, purge: true, displacement: false });

    // Cross-check: ARMED_MISSING_PURGE with gates.purge true fails the roster.
    const forged = { ...noTiming, reasonKey: 'ARMED_MISSING_PURGE' } as TriggerOutput;
    expect(forged.reasonKey === 'ARMED_MISSING_PURGE' && forged.gates.purge === true).toBe(
      true,
    );
    expect(noPurge.reasonKey === 'ARMED_MISSING_PURGE' && noPurge.gates.purge === false).toBe(
      true,
    );
  });

  it('fails AMD accumulation on the same snapshot as a purged trigger', () => {
    const triple = firingTriple('LOW', signalSmt('BULLISH'));
    const out = evaluateTrigger({
      judas: triple.judas,
      amd: triple.amd,
      smt: triple.smt,
      fvg: triple.fvg,
      asOf: triple.asOf,
      alreadyFired: false,
    });
    expect(out.gates.purge).toBe(true);
    expect(amdAccumulationContradicts(makeAmd('accumulation'), out)).toBe(true);
    expect(amdAccumulationContradicts(makeAmd('manipulation'), out)).toBe(false);
  });

  it('exempts NY-hours bars from AMD agreement but keeps SMT parity', () => {
    const nyAsOf = nyMinuteEpoch('2026-06-15', '10:00');
    expect(isNyHours(nyAsOf)).toBe(true);
    expect(isNyHours(nyMinuteEpoch('2026-06-15', '03:00'))).toBe(false);
    const triple = firingTriple('HIGH', signalSmt('BULLISH'), '2026-06-15');
    const out = evaluateTrigger({
      judas: triple.judas,
      amd: makeAmd('accumulation'),
      smt: triple.smt,
      fvg: triple.fvg,
      asOf: nyAsOf,
      alreadyFired: false,
    });
    // Killzone timing gate reads false at 10:00, so no FIRE — but the SMT
    // parity predicate still runs on whatever verdict the bar carries.
    expect(out.gates.timing).toBe(false);
    expect(typeof parityClean(out, triple.smt)).toBe('boolean');
  });
});

// Task 3 hardening: suppressed-SMT pair semantics plus SOFT-gating guard plus
// ARMED-or-better sweep. The read-only contract pitfall: suppressed SMT never
// blocks FIRE at trigger layer — the flaw layer carries the SOFT downgrade.
// For every suppressed FIRE bar the pair is asserted (trigger stays FIRE,
// flaw returns SOFT SMT_SUPPRESSED with carrier); for suppressed ARMED bars
// the flaw must stand clean (SOFT gates on FIRING only). Test-assertion-only
// surface: no UI indicator, no new exports, no store imports.
const FRESH_LEGS = { nq: false, es: false, nq1h: false, nq15m: false };

function flawOf(
  trigger: TriggerOutput,
  triple: ParityTriple,
): FatalFlawOutput {
  return checkFatalFlaw({
    trigger,
    smt: triple.smt,
    judas: triple.judas,
    rollover: null,
    stale: FRESH_LEGS,
    asOf: triple.asOf,
  });
}

describe('parity: suppressed-SMT pairs plus SOFT-gating guard plus sweep', () => {
  it('pairs every suppressed-SMT FIRE with a SOFT SMT_SUPPRESSED carrier', () => {
    for (const side of ['LOW', 'HIGH'] as const) {
      const triple = firingTriple(side, suppressedSmt());
      const out = evaluateTrigger({
        judas: triple.judas,
        amd: triple.amd,
        smt: triple.smt,
        fvg: triple.fvg,
        asOf: triple.asOf,
        alreadyFired: false,
      });
      expect(out.verdict === 'FIRE_LONG' || out.verdict === 'FIRE_SHORT').toBe(true);
      const flaw = flawOf(out, triple);
      expect(flaw.flawClass).toBe('SOFT');
      expect(flaw.reasonKey).toBe('SMT_SUPPRESSED');
      expect(flaw.downgraded).toBe(true);
      expect(flaw.carriedArmedReason).toBe(out.reasonKey);
    }
  });

  it('leaves suppressed-SMT ARMED bars clean with no downgrade applied', () => {
    const nyDate = '2026-06-15';
    const triple: ParityTriple = {
      judas: fixtureTriggerJudas({
        candidate: true,
        confirmed: false,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch(nyDate, '03:00'),
        displacementMult: 0.6,
      }),
      amd: null,
      smt: suppressedSmt(),
      fvg: [fixtureFvg('BULLISH', 15)],
      asOf: nyMinuteEpoch(nyDate, '03:00'),
    };
    const out = evaluateTrigger({
      judas: triple.judas,
      amd: triple.amd,
      smt: triple.smt,
      fvg: triple.fvg,
      asOf: triple.asOf,
      alreadyFired: false,
    });
    expect(out.verdict).toBe('ARMED');
    const flaw = flawOf(out, triple);
    expect(flaw.downgraded).toBe(false);
    expect(flaw.reasonKey).toBe('NONE');
    expect(flaw.flawClass).toBe(null);
  });

  it('sweeps the full roster over every ARMED-or-better bar with zero contradictions', () => {
    const bars: ParityTriple[] = [
      firingTriple('HIGH', signalSmt('BEARISH')),
      firingTriple('LOW', signalSmt('BULLISH')),
      firingTriple('HIGH', suppressedSmt()),
      firingTriple('LOW', suppressedSmt()),
    ];
    let swept = 0;
    for (const triple of bars) {
      const out = evaluateTrigger({
        judas: triple.judas,
        amd: triple.amd,
        smt: triple.smt,
        fvg: triple.fvg,
        asOf: triple.asOf,
        alreadyFired: false,
      });
      const armedOrBetter = out.verdict === 'ARMED' || out.verdict === 'FIRE_LONG' || out.verdict === 'FIRE_SHORT';
      expect(armedOrBetter).toBe(true);
      swept += 1;
      // The identical shared triple feeds the trigger and every predicate.
      expect(out.inputs.judas).toBe(triple.judas);
      expect(out.inputs.smt).toBe(triple.smt);
      expect(parityClean(out, triple.smt)).toBe(true);
      expect(amdAccumulationContradicts(makeAmd('manipulation'), out)).toBe(false);
      const flaw = flawOf(out, triple);
      if (triple.smt.suppressed === true) {
        expect(flaw.flawClass).toBe('SOFT');
        expect(flaw.reasonKey).toBe('SMT_SUPPRESSED');
      } else {
        expect(flaw.reasonKey).toBe('NONE');
      }
    }
    expect(swept).toBe(4);
  });
});
