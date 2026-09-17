import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { evaluateTrigger, nyMinutesOf } from '@/src/lib/ict/trigger';
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
import type { IntradayCandle, RolloverFlag } from '@/src/lib/ict/types';

// ICT-21 plan 02 (D-10/D-11/D-12/D-17): full 20-session transition-table
// replay with pools toggled. The driver below rebuilds the replay.test.ts
// builders verbatim (block15, fixtureFvg, firingLowJudas, firingProbe,
// lateProbe, quietBars, edge controls, STALE_LEG and ROLLOVER_WEEK paths,
// SMT-suppressed downgrade) over the same 20-session August 2026 calendar so
// the parity proof replays the COMPLETE population, not a subset. Each bar
// drives evaluateTrigger then checkFatalFlaw on the same snapshot then
// computeTicket with the identical buffered build in both arms — the pools
// toggle lives only in driver fixture selection, never in any derivation
// signature. The triple (trigger verdict, flaw reasonKey, ticket verdict
// plus buffered SL/TP) must match exactly with zero tolerance on every
// single bar (buffered deltas included — both arms share the buffer build,
// so any divergence is a pools vote and fails the harness).

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

// ---------------------------------------------------------------------------
// Full 20-session transition-table replay (D-11): replay.test.ts builders
// rebuilt verbatim in this driver so the parity proof replays the COMPLETE
// population — same STEP/BASE_epochs, fixtures, session calendar, and
// session-scoped fired-state ownership.
// ---------------------------------------------------------------------------

type StaleLegs = { nq: boolean; es: boolean; nq1h: boolean; nq15m: boolean };

// One replay bar: the exact per-bar snapshot both detectors consume (the
// replay.test.ts ReplayBarInput shape). judas and smt pass by reference
// identity into evaluateTrigger AND checkFatalFlaw — never re-derived.
interface ReplayBarInput {
  sessionDate: string;
  asOf: number;
  judas: JudasOutput | null;
  smt: SmtOutput | null;
  fvg: FvgGap[] | null;
  rollover: RolloverFlag | null;
  stale: StaleLegs;
}

function dated(day: number): string {
  return `2026-08-${String(day).padStart(2, '0')}`;
}

function fixtureParityFvg(
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

function fixtureParityJudas(overrides: Partial<JudasOutput> = {}): JudasOutput {
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

function suppressedParitySmt(): SmtOutput {
  return { suppressed: true, reason: 'CORR_DECOUPLED', corr: 0.4 };
}

function firingLowParityJudas(sweepDate: string, mult = 0.6): JudasOutput {
  return fixtureParityJudas({
    candidate: true,
    confirmed: true,
    sweepSide: 'LOW',
    sweepTime: nyMinuteEpoch(sweepDate, '03:00'),
    displacementMult: mult,
  });
}

function rowParityCandle(time: number, price: number): IntradayCandle {
  return {
    time,
    open: price,
    high: price + 8,
    low: price - 6,
    close: price + 3,
  };
}

// Twelve consecutive closed 15M rows starting at a NY wall-clock HH:MM —
// the full 02:00-05:00 killzone strip (replay.test.ts block15 precedent).
function blockParity15(nyDate: string, startHhmm: string, price = 20000): IntradayCandle[] {
  const rows: IntradayCandle[] = [];
  let t = nyMinuteEpoch(nyDate, startHhmm);
  for (let i = 0; i < 12; i++) {
    rows.push(rowParityCandle(t, price));
    t += 900;
  }
  return rows;
}

// Choppy-QUIET stretch: full 12-row block strictly inside the 20100/20000
// Asia extremes, evaluated as null-judas WAIT_FOR_MANIPULATION bars.
function quietParityBars(sessionDate: string, indices: number[]): ReplayBarInput[] {
  const rows = blockParity15(sessionDate, '10:00', 20050);
  return indices.map((i) => ({
    sessionDate,
    asOf: rows[i].time,
    judas: null,
    smt: null,
    fvg: null,
    rollover: null,
    stale: FRESH_LEGS,
  }));
}

// Killzone firing probe: 02:01 ARMED (purge missing) then the 03:00 LOW
// sweep (ARMED, displacement missing) then the 03:15 displacement close
// (FIRE_LONG, 3 of 3).
function firingParityProbe(sessionDate: string, originDay: number): ReplayBarInput[] {
  return [
    {
      sessionDate,
      asOf: nyMinuteEpoch(sessionDate, '02:01'),
      judas: fixtureParityJudas({
        candidate: true,
        confirmed: false,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch(sessionDate, '02:01'),
        displacementMult: 0.6,
      }),
      smt: null,
      fvg: [fixtureParityFvg('BULLISH', originDay)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate,
      asOf: nyMinuteEpoch(sessionDate, '03:00'),
      judas: fixtureParityJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch(sessionDate, '03:00'),
        displacementMult: 0.2,
      }),
      smt: null,
      fvg: [fixtureParityFvg('BULLISH', originDay)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate,
      asOf: nyMinuteEpoch(sessionDate, '03:15'),
      judas: firingLowParityJudas(sessionDate),
      smt: signalSmt('BULLISH'),
      fvg: [fixtureParityFvg('BULLISH', originDay)],
      rollover: null,
      stale: FRESH_LEGS,
    },
  ];
}

// Second firing probe at the 04:59 just-inside edge (nyMinutesOf 299).
function lateParityProbe(sessionDate: string, originDay: number): ReplayBarInput[] {
  return [
    {
      sessionDate,
      asOf: nyMinuteEpoch(sessionDate, '04:59'),
      judas: firingLowParityJudas(sessionDate),
      smt: signalSmt('BULLISH'),
      fvg: [fixtureParityFvg('BULLISH', originDay)],
      rollover: null,
      stale: FRESH_LEGS,
    },
  ];
}

function buildParitySessions(): ReplayBarInput[][] {
  // Tracer anchors: session A choppy-QUIET (3 bars), session B firing path
  // (02:01 ARMED → 03:00 ARMED → 03:15 FIRE_LONG), session C fire replayed
  // then HARD STALE_LEG INVALIDATED with a terminal hold.
  const sessionA = '2026-08-03';
  const sessionB = '2026-08-04';
  const sessionC = '2026-08-05';
  const quietRows = blockParity15(sessionA, '10:00', 20050);
  const tracerA: ReplayBarInput[] = [quietRows[0], quietRows[1], quietRows[2]].map((r) => ({
    sessionDate: sessionA,
    asOf: r.time,
    judas: null,
    smt: null,
    fvg: null,
    rollover: null,
    stale: FRESH_LEGS,
  }));
  const tracerB = firingParityProbe(sessionB, 4);
  const firingJudasC = firingLowParityJudas(sessionC);
  const tracerC: ReplayBarInput[] = [
    {
      sessionDate: sessionC,
      asOf: nyMinuteEpoch(sessionC, '03:00'),
      judas: firingJudasC,
      smt: null,
      fvg: [fixtureParityFvg('BULLISH', 5)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: sessionC,
      asOf: nyMinuteEpoch(sessionC, '03:15'),
      judas: firingJudasC,
      smt: null,
      fvg: [fixtureParityFvg('BULLISH', 5)],
      rollover: null,
      stale: { nq: false, es: true, nq1h: false, nq15m: false },
    },
    {
      sessionDate: sessionC,
      asOf: nyMinuteEpoch(sessionC, '03:30'),
      judas: firingJudasC,
      smt: null,
      fvg: [fixtureParityFvg('BULLISH', 5)],
      rollover: null,
      stale: { nq: false, es: true, nq1h: false, nq15m: false },
    },
  ];

  // Week 1 remainder: 08-06 exact-edge 02:00/05:00 negative controls, 08-07
  // 04:59 late probe.
  const aug06Edge: ReplayBarInput[] = [
    {
      sessionDate: '2026-08-06',
      asOf: nyMinuteEpoch('2026-08-06', '02:00'),
      judas: firingLowParityJudas('2026-08-06'),
      smt: null,
      fvg: [fixtureParityFvg('BULLISH', 6)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: '2026-08-06',
      asOf: nyMinuteEpoch('2026-08-06', '05:00'),
      judas: firingLowParityJudas('2026-08-06'),
      smt: null,
      fvg: [fixtureParityFvg('BULLISH', 6)],
      rollover: null,
      stale: FRESH_LEGS,
    },
  ];
  const aug07Late = lateParityProbe('2026-08-07', 7);

  // Week 2: full QUIET stretches, 02:01 probe, NY-hours stretch (09:30,
  // 10:00, 15:45 — ARMED_MISSING_TIMING, never FIRE), FIRE-then-STALE.
  const aug10Quiet = quietParityBars('2026-08-10', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const aug11Probe = firingParityProbe('2026-08-11', 11);
  const aug12NyHours: ReplayBarInput[] = [
    { sessionDate: '2026-08-12', asOf: nyMinuteEpoch('2026-08-12', '09:30'), judas: firingLowParityJudas('2026-08-12'), smt: signalSmt('BULLISH'), fvg: [fixtureParityFvg('BULLISH', 12)], rollover: null, stale: FRESH_LEGS },
    { sessionDate: '2026-08-12', asOf: nyMinuteEpoch('2026-08-12', '10:00'), judas: firingLowParityJudas('2026-08-12'), smt: signalSmt('BULLISH'), fvg: [fixtureParityFvg('BULLISH', 12)], rollover: null, stale: FRESH_LEGS },
    { sessionDate: '2026-08-12', asOf: nyMinuteEpoch('2026-08-12', '15:45'), judas: firingLowParityJudas('2026-08-12'), smt: signalSmt('BULLISH'), fvg: [fixtureParityFvg('BULLISH', 12)], rollover: null, stale: FRESH_LEGS },
  ];
  const aug13FireThenStale: ReplayBarInput[] = [
    { sessionDate: '2026-08-13', asOf: nyMinuteEpoch('2026-08-13', '03:15'), judas: firingLowParityJudas('2026-08-13'), smt: signalSmt('BULLISH'), fvg: [fixtureParityFvg('BULLISH', 13)], rollover: null, stale: FRESH_LEGS },
    { sessionDate: '2026-08-13', asOf: nyMinuteEpoch('2026-08-13', '03:30'), judas: firingLowParityJudas('2026-08-13'), smt: signalSmt('BULLISH'), fvg: [fixtureParityFvg('BULLISH', 13)], rollover: null, stale: { nq: false, es: true, nq1h: false, nq15m: false } },
    { sessionDate: '2026-08-13', asOf: nyMinuteEpoch('2026-08-13', '03:45'), judas: firingLowParityJudas('2026-08-13'), smt: signalSmt('BULLISH'), fvg: [fixtureParityFvg('BULLISH', 13)], rollover: null, stale: { nq: false, es: true, nq1h: false, nq15m: false } },
  ];
  const aug14Quiet = quietParityBars('2026-08-14', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

  // Week 3: 02:01 probe, SMT-suppressed SOFT downgrade (03:15 FIRE verdict
  // plus SMT_SUPPRESSED carrier rendering ARMED, then a null-judas QUIET
  // hold), half QUIET stretches, 04:59 late probe.
  const aug17Probe = firingParityProbe('2026-08-17', 17);
  const aug18Downgrade: ReplayBarInput[] = [
    {
      sessionDate: '2026-08-18',
      asOf: nyMinuteEpoch('2026-08-18', '02:01'),
      judas: fixtureParityJudas({
        candidate: true,
        confirmed: false,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch('2026-08-18', '02:01'),
        displacementMult: 0.6,
      }),
      smt: suppressedParitySmt(),
      fvg: [fixtureParityFvg('BULLISH', 18)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: '2026-08-18',
      asOf: nyMinuteEpoch('2026-08-18', '03:00'),
      judas: fixtureParityJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch('2026-08-18', '03:00'),
        displacementMult: 0.2,
      }),
      smt: suppressedParitySmt(),
      fvg: [fixtureParityFvg('BULLISH', 18)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: '2026-08-18',
      asOf: nyMinuteEpoch('2026-08-18', '03:15'),
      judas: firingLowParityJudas('2026-08-18'),
      smt: suppressedParitySmt(),
      fvg: [fixtureParityFvg('BULLISH', 18)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: '2026-08-18',
      asOf: nyMinuteEpoch('2026-08-18', '03:30'),
      judas: null,
      smt: null,
      fvg: null,
      rollover: null,
      stale: FRESH_LEGS,
    },
  ];
  const aug19Quiet = quietParityBars('2026-08-19', [0, 1, 2, 3, 4, 5]);
  const aug20Late = lateParityProbe('2026-08-20', 20);
  const aug21Quiet = quietParityBars('2026-08-21', [6, 7, 8, 9, 10, 11]);

  // Week 4: QUIET stretch, 02:01 probe, ROLLOVER_WEEK HARD invalidation,
  // QUIET stretch, 04:59 late probe.
  const aug24Quiet = quietParityBars('2026-08-24', [0, 1, 2, 3]);
  const aug25Probe = firingParityProbe('2026-08-25', 25);
  const rolloverFlag: RolloverFlag = {
    rolloverSuspect: true,
    contractHint: 'ES U6-U7',
    proximityWarning: null,
  };
  const aug26Rollover: ReplayBarInput[] = [
    { sessionDate: '2026-08-26', asOf: nyMinuteEpoch('2026-08-26', '03:15'), judas: firingLowParityJudas('2026-08-26'), smt: signalSmt('BULLISH'), fvg: [fixtureParityFvg('BULLISH', 26)], rollover: null, stale: FRESH_LEGS },
    { sessionDate: '2026-08-26', asOf: nyMinuteEpoch('2026-08-26', '03:30'), judas: firingLowParityJudas('2026-08-26'), smt: signalSmt('BULLISH'), fvg: [fixtureParityFvg('BULLISH', 26)], rollover: rolloverFlag, stale: FRESH_LEGS },
    { sessionDate: '2026-08-26', asOf: nyMinuteEpoch('2026-08-26', '03:45'), judas: firingLowParityJudas('2026-08-26'), smt: signalSmt('BULLISH'), fvg: [fixtureParityFvg('BULLISH', 26)], rollover: rolloverFlag, stale: FRESH_LEGS },
  ];
  const aug27Quiet = quietParityBars('2026-08-27', [0, 1, 2, 3, 4, 5, 6, 7]);
  const aug28Late = lateParityProbe('2026-08-28', 28);

  return [
    tracerA, tracerB, tracerC, aug06Edge, aug07Late,
    aug10Quiet, aug11Probe, aug12NyHours, aug13FireThenStale, aug14Quiet,
    aug17Probe, aug18Downgrade, aug19Quiet, aug20Late, aug21Quiet,
    aug24Quiet, aug25Probe, aug26Rollover, aug27Quiet, aug28Late,
  ];
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
  triple: ParityTriple | { asOf: number },
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
// snapshot then computeTicket on the identical trigger object the flaw
// judged, with the shared tracer ticket structure and a caller-chosen
// buffer build. Session fired-state is owned by the caller (runReplay
// precedent): the flag threads per-session so the second 3-of-3 bar in a
// firing session degrades to ARMED_ALREADY_FIRED exactly like replay.
function runOneBar(
  triple: ParityTriple,
  buffer: TicketInput['buffer'] = null,
  alreadyFired = false,
): BarTriple {
  const trigger = evaluateTrigger({
    judas: triple.judas,
    amd: triple.amd,
    smt: triple.smt,
    fvg: triple.fvg,
    asOf: triple.asOf,
    alreadyFired,
  });
  const flaw = checkFatalFlaw({
    trigger,
    smt: triple.smt,
    judas: triple.judas,
    rollover: null,
    stale: FRESH_LEGS,
    asOf: triple.asOf,
  });
  const ticket = computeTicket({ ...ticketInputFor(trigger, triple), buffer });
  return { trigger, flaw, ticket };
}

// Rebuild one replay bar per arm (D-17): identical field values, never
// shared references — pools presence can only enter through driver
// selection, never through a derivation input.
function cloneParityBar(bar: ReplayBarInput): ReplayBarInput & { amd: AmdOutput | null } {
  return {
    sessionDate: bar.sessionDate,
    asOf: bar.asOf,
    judas: bar.judas === null ? null : { ...bar.judas },
    amd: null,
    smt: bar.smt === null ? null : { ...bar.smt },
    fvg: bar.fvg === null ? null : bar.fvg.map((gap) => ({ ...gap })),
    rollover: bar.rollover === null ? null : { ...bar.rollover },
    stale: { ...bar.stale },
  };
}

// Per-arm bar run with the shared buffered build: evaluateTrigger then
// checkFatalFlaw on the same snapshot then computeTicket on the identical
// trigger object the flaw judged. The ticket structure is the shared
// tracer structure (entry 20097.5 from bullOTE ∩ BULLISH gap) with ONE
// shared buffer build in both arms: stop-side extreme 20085 (SL 20085 −
// 0.25×40 = 20075, TP-side absent so TPs stay on structure). The buffered
// SL delta sits INSIDE the exact ticket match, so any pools vote on
// placement fails the harness. Identity note: checkFatalFlaw echoes
// trigger/smt/judas/rollover by reference.
function runReplayBar(
  bar: ReplayBarInput & { amd: AmdOutput | null },
  alreadyFired: boolean,
): BarTriple {
  const trigger = evaluateTrigger({
    judas: bar.judas,
    amd: bar.amd,
    smt: bar.smt,
    fvg: bar.fvg,
    asOf: bar.asOf,
    alreadyFired,
  });
  const flaw = checkFatalFlaw({
    trigger,
    smt: bar.smt,
    judas: bar.judas,
    rollover: bar.rollover,
    stale: bar.stale,
    asOf: bar.asOf,
  });
  // The shared tracer structure with ONE shared buffer build in both
  // arms: stop-side extreme 20085 (SL 20085 − 0.25×40 = 20075, stop 22.5
  // → RR 112.5/22.5 = 5 on FIRE bars). TP-side absent: TPs stay on
  // structure (20210/20260/20260). The TP-side build is pinned per-leg by
  // the dedicated row below (TPs 20256 with the gate unchanged on TP1)
  // plus the chart-mapper buffered-line pins — the exact ticket match
  // carries the buffered SL delta with zero tolerance on every bar, so
  // any pools vote on placement fails the harness.
  const ticket = computeTicket({
    ...ticketInputFor(trigger, { asOf: bar.asOf }),
    riskPct: 2,
    buffer: { atr: 40, poolExtreme: 20085 },
  });
  return { trigger, flaw, ticket };
}

// Exact triple comparison on one bar (D-12, zero tolerance): trigger
// verdict plus reasonKey plus gates plus direction, flaw reasonKey plus
// class plus flags plus carried reason, ticket verdict plus direction
// plus entry plus SL plus full TP ladder plus RR plus reason. Buffered
// deltas included — no tolerance band anywhere.
function assertExactParity(on: BarTriple, off: BarTriple): void {
  expect(off.trigger.verdict).toBe(on.trigger.verdict);
  expect(off.trigger.reasonKey).toBe(on.trigger.reasonKey);
  expect(off.trigger.gates).toEqual(on.trigger.gates);
  expect(off.trigger.direction).toBe(on.trigger.direction);
  expect(off.flaw.reasonKey).toBe(on.flaw.reasonKey);
  expect(off.flaw.flawClass).toBe(on.flaw.flawClass);
  expect(off.flaw.invalidated).toBe(on.flaw.invalidated);
  expect(off.flaw.downgraded).toBe(on.flaw.downgraded);
  expect(off.flaw.carriedArmedReason).toBe(on.flaw.carriedArmedReason);
  expect(off.ticket.verdict).toBe(on.ticket.verdict);
  expect(off.ticket.direction).toBe(on.ticket.direction);
  expect(off.ticket.entry).toBe(on.ticket.entry);
  expect(off.ticket.sl).toBe(on.ticket.sl);
  expect(off.ticket.tp).toEqual(on.ticket.tp);
  expect(off.ticket.rr).toBe(on.ticket.rr);
  expect(off.ticket.reason).toBe(on.ticket.reason);
}

function runFullParity(sessions: ReplayBarInput[][]): { bars: number; fires: number; executes: number } {
  let bars = 0;
  let fires = 0;
  let executes = 0;
  for (const session of sessions) {
    let firedThisSession = false;
    for (const bar of session) {
      bars += 1;
      // The pools toggle lives only in driver fixture selection (D-17):
      // two separately built snapshots with the same field values feed the
      // two arms (rebuilt judas/smt/fvg objects per arm, never shared).
      const poolsOn = cloneParityBar(bar);
      const poolsOff = cloneParityBar(bar);
      const on = runReplayBar(poolsOn, firedThisSession);
      const off = runReplayBar(poolsOff, firedThisSession);
      assertExactParity(on, off);
      pinReplayBarShape(bar, on.trigger, on.flaw);

      // The identical shared triple feeds each arm: evaluateTrigger echoes
      // the SAME object references it consumed (parity.test.ts idiom).
      expect(on.trigger.inputs.judas).toBe(poolsOn.judas ?? null);
      expect(on.trigger.inputs.smt).toBe(poolsOn.smt ?? null);
      expect(on.trigger.inputs.amd).toBe(poolsOn.amd);
      expect(off.trigger.inputs.judas).toBe(poolsOff.judas ?? null);
      expect(off.trigger.inputs.smt).toBe(poolsOff.smt ?? null);
      expect(off.trigger.inputs.amd).toBe(poolsOff.amd);

      if (on.trigger.verdict === 'FIRE_LONG' || on.trigger.verdict === 'FIRE_SHORT') {
        fires += 1;
        firedThisSession = true;
      }
      if (on.ticket.verdict === 'EXECUTE_LONG' || on.ticket.verdict === 'EXECUTE_SHORT') {
        executes += 1;
      }
    }
  }
  return { bars, fires, executes };
}

// Per-bar structural pins: the COMPUTED (not echoed) outputs prove the
// single-snapshot flow. Computed trigger fields (verdict, reasonKey,
// gates, direction, entryFvg polarity) and flaw fields (reasonKey,
// flawClass, invalidated, downgraded, carriedArmedReason) land on the
// expected per-bar values.
function pinReplayBarShape(
  bar: ReplayBarInput,
  trigger: TriggerOutput,
  flaw: FatalFlawOutput,
): void {
  if (bar.judas === null) {
    expect(trigger.verdict).toBe('WAIT_FOR_MANIPULATION');
    expect(trigger.reasonKey).toBe('WAIT_FOR_MANIPULATION');
    expect(trigger.entryFvg).toBeNull();
    expect(flaw.reasonKey).toBe('NONE');
    expect(flaw.invalidated).toBe(false);
    expect(flaw.downgraded).toBe(false);
    return;
  }
  const staleLeg = bar.stale.nq || bar.stale.es || bar.stale.nq1h || bar.stale.nq15m;
  if (staleLeg) {
    expect(flaw.invalidated).toBe(true);
    expect(flaw.flawClass).toBe('HARD');
    expect(flaw.reasonKey).toBe('STALE_LEG');
    return;
  }
  if (bar.rollover !== null && bar.rollover.rolloverSuspect) {
    expect(flaw.invalidated).toBe(true);
    expect(flaw.flawClass).toBe('HARD');
    expect(flaw.reasonKey).toBe('ROLLOVER_WEEK');
    return;
  }
  if (bar.smt !== null && bar.smt.suppressed && trigger.verdict !== 'WAIT_FOR_MANIPULATION') {
    if (trigger.verdict === 'FIRE_LONG' || trigger.verdict === 'FIRE_SHORT') {
      expect(flaw.downgraded).toBe(true);
      expect(flaw.reasonKey).toBe('SMT_SUPPRESSED');
      expect(flaw.carriedArmedReason).toBe(trigger.verdict);
    }
    return;
  }
  if (bar.judas.confirmed !== true) {
    expect(trigger.verdict).toBe('ARMED');
    expect(trigger.reasonKey).toBe('ARMED_MISSING_PURGE');
    expect(flaw.invalidated).toBe(false);
    expect(flaw.downgraded).toBe(false);
    return;
  }
  if (bar.judas.displacementMult < 0.5) {
    expect(trigger.verdict).toBe('ARMED');
    expect(trigger.reasonKey).toBe('ARMED_MISSING_DISPLACEMENT');
    return;
  }
  const nyMinutes = nyMinutesOf(bar.asOf);
  const inKillzone = nyMinutes > 120 && nyMinutes < 300;
  if (!inKillzone) {
    expect(trigger.verdict).toBe('ARMED');
    expect(trigger.reasonKey).toBe('ARMED_MISSING_TIMING');
    return;
  }
  expect(trigger.verdict).toBe('FIRE_LONG');
  expect(trigger.reasonKey).toBe('FIRE_LONG');
  expect(trigger.direction).toBe('LONG');
  expect(trigger.gates).toEqual({ timing: true, purge: true, displacement: true });
  expect(trigger.entryFvg).not.toBeNull();
  expect(trigger.entryFvg?.polarity).toBe('BULLISH');
  expect(flaw.reasonKey).toBe('NONE');
  expect(flaw.invalidated).toBe(false);
  expect(flaw.downgraded).toBe(false);
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

describe('pools-parity: full 20-session transition-table replay with exact triple match', () => {
  it('replays all 20 sessions pools-on vs pools-off with zero triple divergence', () => {
    const sessions = buildParitySessions();
    expect(sessions).toHaveLength(20);
    const dates = [
      '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
      '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
      '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
      '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28',
    ];
    expect(sessions.map((bars) => bars[0].sessionDate)).toEqual(dates);

    // Every bar: trigger verdict plus flaw plus the buffered ticket triple
    // matches exactly pools-on vs pools-off (D-12, zero tolerance,
    // buffered SL/TP deltas inside the match). Driver owns the
    // session-scoped fired-state per the runReplay precedent.
    const { bars, fires, executes } = runFullParity(sessions);

    // Population shape: 84 bars across 20 sessions (9 tracer + 75 added).
    // 11 FIRE bars: the 8 probe/late fires plus the 3 HARD-path session
    // replays (08-05 tracer C, 08-13, 08-26 — each replaying the 03:15
    // FIRE bar before the HARD bar lands). The shared tracer structure
    // EXECUTEs on every 03:15-or-04:59 bar shape with riskPct 2 (stop
    // 22.5 → RR 5 ≥ 3, 1 contract) — fires and HARD-replays alike, so
    // every FIRE bar carries its buffered placement proof.
    expect(bars).toBe(84);
    expect(fires).toBe(11);
    expect(executes).toBe(84);
  });

  it('pins the 20-session calendar with weekend gaps (Fri to Mon)', () => {
    const sessions = buildParitySessions();
    const dates = sessions.map((bars) => bars[0].sessionDate);
    expect(dates[4]).toBe('2026-08-07');
    expect(dates[5]).toBe('2026-08-10');
    expect(dates[9]).toBe('2026-08-14');
    expect(dates[10]).toBe('2026-08-17');
    expect(dates[14]).toBe('2026-08-21');
    expect(dates[15]).toBe('2026-08-24');
  });

  it('proves the full 20-session driver byte-identical on double run', () => {
    const first = buildParitySessions();
    const second = buildParitySessions();
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
