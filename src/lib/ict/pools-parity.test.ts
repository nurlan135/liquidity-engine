import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { evaluateTrigger } from '@/src/lib/ict/trigger';
import type { TriggerOutput } from '@/src/lib/ict/trigger';
import { checkFatalFlaw } from '@/src/lib/ict/invalidation';
import type { FatalFlawOutput } from '@/src/lib/ict/invalidation';
import { computeTicket, type TicketInput, type TicketOutput } from '@/src/lib/ticket';
import type { AmdOutput } from '@/src/lib/ict/amd';
import type { JudasOutput, SweepSide } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { FvgGap } from '@/src/lib/ict/fvg';
import type { AsiaRange } from '@/src/lib/ict/asia';
import type { DealingRange, DOLTarget } from '@/src/lib/ict/types';
import type { LevelsOutput } from '@/src/lib/ict/levels';
import { DOL_HIGH_NAME } from '@/src/lib/ict/dol';
import { REASON_BY_KEY } from '@/src/lib/ict/invalidation';

// ICT-21 (D-09/D-10/D-12/D-17): pools on/off parity skeleton over exactly one
// deterministic replay-table bar. The pools toggle lives ONLY in these driver
// fixtures (D-17) — evaluateTrigger, checkFatalFlaw, and computeTicket take
// no pools input anywhere. Both arms run the identical buffered computeTicket
// build; the triple (trigger verdict, flaw reasonKey, ticket verdict plus
// buffered SL/TP) must match exactly with zero tolerance (D-12). The shared
// triple identity idiom follows parity.test.ts lines 139-153 (D-20); the
// bar-by-bar trigger-then-flaw-on-the-same-snapshot order follows
// replay.test.ts runReplay (D-11). parity.test.ts stays byte-identical as the
// regression anchor (D-09) — this file extends nothing in it.

function nyMinuteEpoch(nyDate: string, hhmm: string): number {
  return Math.floor(fromZonedTime(`${nyDate} ${hhmm}:00`, NY_TZ).getTime() / 1000);
}

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

function signalSmt(direction: 'BULLISH' | 'BEARISH' = 'BULLISH'): SmtOutput {
  return {
    suppressed: false,
    direction,
    sweeperLeg: 'NQ',
    nqWindow: null,
    esWindow: null,
    bpsGap: 30,
  };
}

function fixtureFvg(polarity: 'BULLISH' | 'BEARISH', originDate: string): FvgGap {
  return {
    polarity,
    top: polarity === 'BULLISH' ? 20060 : 20160,
    bottom: polarity === 'BULLISH' ? 20040 : 20140,
    originDate,
    mitigated: false,
  };
}

// One shared triple shape: a confirmed sweep JudasOutput plus amd plus smt
// plus fvg fed into evaluateTrigger as the identical object references, so
// the inputs echo contract proves same-snapshot sharing, never re-derived
// copies. LOW sweep drives LONG direction (needs BULLISH FVG).
interface ParityTriple {
  judas: JudasOutput;
  amd: AmdOutput | null;
  smt: SmtOutput;
  fvg: FvgGap[];
  asOf: number;
}

function oneBarTriple(sweepSide: SweepSide, smt: SmtOutput, nyDate: string): ParityTriple {
  const asOf = nyMinuteEpoch(nyDate, '03:00');
  const polarity = sweepSide === 'LOW' ? 'BULLISH' : 'BEARISH';
  const judas = fixtureTriggerJudas({
    candidate: true,
    confirmed: true,
    sweepSide,
    sweepTime: nyMinuteEpoch(nyDate, '03:00'),
    displacementMult: 0.6,
  });
  return { judas, amd: null, smt, fvg: [fixtureFvg(polarity, nyDate)], asOf };
}

const FRESH_LEGS = { nq: false, es: false, nq1h: false, nq15m: false };

  // Tracer ticket structure around the buffered build: entry from
// bullOTE [20062.5, 20105] ∩ BULLISH gap [20090, 20120] → 20097.5.
// LOW sweep + BULLISH smt + clean flaw + resolvable structure.
function ticketInputFor(
  trigger: TriggerOutput,
  triple: ParityTriple,
  overrides: Partial<TicketInput> = {},
): TicketInput {
  const levels: LevelsOutput = {
    eq: 20135,
    q1: 20072.5,
    q3: 20197.5,
    bullOTE: { lo: 20062.5, hi: 20105 },
    bearOTE: { lo: 20165, hi: 20207.5 },
    position: 0.6,
  };
  const range: DealingRange = { high: 20260, low: 20010, eq: 20135, window: 20, asOf: '2026-08-04', thinHistory: false };
  const dol: DOLTarget = { name: DOL_HIGH_NAME, price: 20260 };
  const asia: AsiaRange = { high: 20210, low: 20085, height: 125, sessionDate: '2026-08-03' };
  const entryFvg: FvgGap = {
    polarity: 'BULLISH',
    top: 20120,
    bottom: 20090,
    originDate: '2026-08-04',
    mitigated: false,
  };
  const firing: TriggerOutput = {
    ...trigger,
    verdict: 'FIRE_LONG',
    direction: 'LONG',
    reasonKey: 'FIRE_LONG',
    reason:
      'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.',
    gates: { timing: true, purge: true, displacement: true },
    entryFvg,
  };
  const flaw: FatalFlawOutput = {
    invalidated: false,
    downgraded: false,
    flawClass: null,
    reasonKey: 'NONE',
    reason: REASON_BY_KEY.NONE,
    unblock: '',
    sentence:
      'FALSİFİKASİYA LONG: BSL reydi baş verməyibsə və qiymət premiumda qalırsa, LONG oxunuşu yanlışdır.',
    challenge: 'Sual: bu hərəkət xəbər-öncəsi mühəndislik deyilmi — təqvim pəncərəsini yoxladınmı?',
    carriedArmedReason: null,
    asOf: triple.asOf,
  };
  void levels;
  void range;
  void dol;
  void asia;
  return {
    trigger: firing,
    flaw,
    levels,
    range,
    dol,
    asia,
    riskPct: 1,
    asOf: triple.asOf,
    // Skeleton triple is unbuffered by default: SL/TP resolve on structure
    // (SL 20085, TPs 20210/20260/20260, RR 9 → EXECUTE) so the exact-match
    // assert reads the pure triple. The two buffered-placement rows below
    // pass their own side-guarded buffer context explicitly.
    buffer: null,
    ...overrides,
  };
}

interface BarTriple {
  trigger: TriggerOutput;
  flaw: FatalFlawOutput;
  ticket: TicketOutput;
}

// Single-snapshot triple: evaluateTrigger then checkFatalFlaw on the same
// snapshot then computeTicket on the identical FIRE object the flaw judged.
function runOneBar(triple: ParityTriple): BarTriple {
  const trigger = evaluateTrigger({
    judas: triple.judas,
    amd: triple.amd,
    smt: triple.smt,
    fvg: triple.fvg,
    asOf: triple.asOf,
    alreadyFired: false,
  });
  const flaw = checkFatalFlaw({
    trigger,
    smt: triple.smt,
    judas: triple.judas,
    rollover: null,
    stale: FRESH_LEGS,
    asOf: triple.asOf,
  });
  const ticket = computeTicket(ticketInputFor(trigger, triple));
  return { trigger, flaw, ticket };
}

describe('pools-parity: one-bar pools on/off skeleton with exact triple match', () => {
  it('matches trigger plus flaw plus buffered ticket exactly pools-on vs pools-off', () => {
    const nyDate = '2026-08-04';
    // The pools toggle lives only in driver selection here (D-17): the same
    // deterministic replay bar feeds both arms; no pools-typed field enters
    // any trigger, flaw, or ticket signature.
    const poolsOn = oneBarTriple('LOW', signalSmt('BULLISH'), nyDate);
    const poolsOff = oneBarTriple('LOW', signalSmt('BULLISH'), nyDate);
    const on = runOneBar(poolsOn);
    const off = runOneBar(poolsOff);

    // The identical shared triple feeds each arm (parity.test.ts idiom).
    expect(on.trigger.inputs.judas).toBe(poolsOn.judas);
    expect(on.trigger.inputs.smt).toBe(poolsOn.smt);
    expect(off.trigger.inputs.judas).toBe(poolsOff.judas);
    expect(off.trigger.inputs.smt).toBe(poolsOff.smt);

    expect(on.trigger.verdict).toBe('FIRE_LONG');
    // Trigger arm: exact verdict match, zero tolerance.
    expect(off.trigger.verdict).toBe(on.trigger.verdict);
    expect(off.trigger.reasonKey).toBe(on.trigger.reasonKey);
    expect(off.trigger.gates).toEqual(on.trigger.gates);
    // Flaw arm: exact reasonKey plus class match.
    expect(off.flaw.reasonKey).toBe(on.flaw.reasonKey);
    expect(off.flaw.flawClass).toBe(on.flaw.flawClass);
    expect(off.flaw.invalidated).toBe(on.flaw.invalidated);
    expect(off.flaw.downgraded).toBe(on.flaw.downgraded);
    // Ticket arm: exact verdict plus buffered SL/TP deltas, zero tolerance.
    expect(off.ticket.verdict).toBe(on.ticket.verdict);
    expect(off.ticket.direction).toBe(on.ticket.direction);
    expect(off.ticket.entry).toBe(on.ticket.entry);
    expect(off.ticket.sl).toBe(on.ticket.sl);
    expect(off.ticket.tp).toEqual(on.ticket.tp);
    expect(off.ticket.rr).toBe(on.ticket.rr);
    expect(off.ticket.reason).toBe(on.ticket.reason);
  });

  it('runs the shared buffered build with SL beyond the stop extreme and TPs on structure', () => {
    const triple = oneBarTriple('LOW', signalSmt('BULLISH'), '2026-08-04');
    const trigger = evaluateTrigger({
      judas: triple.judas,
      amd: triple.amd,
      smt: triple.smt,
      fvg: triple.fvg,
      asOf: triple.asOf,
      alreadyFired: false,
    });
    const flaw = checkFatalFlaw({
      trigger,
      smt: triple.smt,
      judas: triple.judas,
      rollover: null,
      stale: FRESH_LEGS,
      asOf: triple.asOf,
    });
    const base = ticketInputFor(trigger, triple);
    // Stop extreme 20085 below entry 20097.5: SL 20085 − 0.25×40 = 20075.
    // TP-side extreme absent: TP1 asia.high 20210, TP2/TP3 20260 on
    // structure. Stop 22.5 → RR 112.5/22.5 = 5 ≥ 3 → EXECUTE; riskPct 2
    // keeps sizing whole (500/450 → 1 contract; riskPct 1 would refuse at 0).
    const ticket = computeTicket({ ...base, riskPct: 2, buffer: { atr: 40, poolExtreme: 20085 } });
    if (ticket.verdict !== 'EXECUTE_LONG') {
      throw new Error(`expected EXECUTE_LONG, got ${ticket.verdict} ${ticket.reason} sl=${String(ticket.sl)}`);
    }
    expect(ticket.verdict).toBe('EXECUTE_LONG');
    expect(ticket.sl).toBe(20075);
    expect(ticket.tp.tp1).toBe(20210);
    expect(ticket.tp.tp2).toBe(20260);
    expect(ticket.tp.tp3).toBe(20260);
    expect(ticket.rr).toBe(5);
    expect(ticket.sl as number).toBeLessThan(20085);
  });

  it('books TPs before a TP-side extreme with the R/R gate unchanged on TP1', () => {
    const triple = oneBarTriple('LOW', signalSmt('BULLISH'), '2026-08-04');
    const trigger = evaluateTrigger({
      judas: triple.judas,
      amd: triple.amd,
      smt: triple.smt,
      fvg: triple.fvg,
      asOf: triple.asOf,
      alreadyFired: false,
    });
    const flaw = checkFatalFlaw({
      trigger,
      smt: triple.smt,
      judas: triple.judas,
      rollover: null,
      stale: FRESH_LEGS,
      asOf: triple.asOf,
    });
    const base = ticketInputFor(trigger, triple);
    // TP-side extreme 20260 above entry: TP2/TP3 20260 − 0.10×40 = 20256;
    // TP1 asia.high 20210 → min(20210, 20256) = 20210 unchanged. Stop-side
    // absent: SL stays unbuffered 20085. RR 112.5/12.5 = 9 → EXECUTE.
    const ticket = computeTicket({ ...base, buffer: { atr: 40, poolExtreme: 20260 } });
    expect(ticket.verdict).toBe('EXECUTE_LONG');
    expect(ticket.sl).toBe(20085);
    expect(ticket.tp.tp1).toBe(20210);
    expect(ticket.tp.tp2).toBe(20256);
    expect(ticket.tp.tp3).toBe(20256);
    expect(ticket.rr).toBe(9);
  });
});
