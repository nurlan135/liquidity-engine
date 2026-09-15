import { describe, expect, it, vi } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { evaluateTrigger, nyMinutesOf } from '@/src/lib/ict/trigger';
import type { TriggerOutput, TriggerReasonKey } from '@/src/lib/ict/trigger';
import { checkFatalFlaw } from '@/src/lib/ict/invalidation';
import type { FatalFlawOutput } from '@/src/lib/ict/invalidation';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { FvgGap } from '@/src/lib/ict/fvg';
import type { IntradayCandle, RolloverFlag } from '@/src/lib/ict/types';

// ICT-18 (VERF-01, D-01/D-02/D-03/D-08/D-09): bar-by-bar replay harness over
// the Phases 15-17 execution layer. Each 15M close feeds evaluateTrigger
// then checkFatalFlaw on the IDENTICAL judas/smt object (shared-snapshot
// contract), with replay-owned session-scoped alreadyFired mirroring the
// appendFiringLog three-clause dedup (ARMED-or-better only, one FIRE per NY
// date, already-fired echoes never re-append). The pinned transition table
// below asserts the combined state per bar; the calibration summary helper
// is the single definition of firesPerWeek plus killRate against the 1-4/week
// band. Pure: injected asOf per bar, no Date.now, no store imports.

const STEP = 900;
const BASE = 20000;

// Builders copied verbatim from the judas.test.ts / trigger.test.ts
// precedent (STEP 900, BASE 20000, epochs via fromZonedTime with NY_TZ,
// never hand-rolled offsets).
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

function nyMinuteEpoch(nyDate: string, hhmm: string): number {
  return Math.floor(fromZonedTime(`${nyDate} ${hhmm}:00`, NY_TZ).getTime() / 1000);
}

// Twelve consecutive closed 15M rows starting at a NY wall-clock HH:MM —
// the full 02:00-05:00 killzone strip.
function block15(nyDate: string, startHhmm: string, price = BASE): IntradayCandle[] {
  const rows: IntradayCandle[] = [];
  let t = nyMinuteEpoch(nyDate, startHhmm);
  for (let i = 0; i < 12; i++) {
    rows.push(row(t, price));
    t += STEP;
  }
  return rows;
}

function dated(day: number): string {
  return `2026-08-${String(day).padStart(2, '0')}`;
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

type StaleLegs = { nq: boolean; es: boolean; nq1h: boolean; nq15m: boolean };

const FRESH_LEGS: StaleLegs = { nq: false, es: false, nq1h: false, nq15m: false };

// One replay bar: the exact per-bar snapshot both detectors consume. judas
// and smt are passed by reference identity into evaluateTrigger AND
// checkFatalFlaw — never re-derived copies.
interface ReplayBarInput {
  sessionDate: string;
  asOf: number;
  judas: JudasOutput | null;
  smt: SmtOutput | null;
  fvg: FvgGap[] | null;
  rollover: RolloverFlag | null;
  stale: StaleLegs;
}

// Combined per-bar state (D-03): QUIET is WAIT plus clean, ARMED is ARMED
// plus clean, FIRING is FIRE plus clean, INVALIDATED is HARD invalidated,
// and the SOFT-transient (FIRE plus downgraded) renders ARMED.
type CombinedState = 'QUIET' | 'ARMED' | 'FIRING' | 'INVALIDATED';

function combinedOf(trigger: TriggerOutput, flaw: FatalFlawOutput): CombinedState {
  if (flaw.invalidated === true) return 'INVALIDATED';
  if (flaw.downgraded === true) return 'ARMED';
  if (trigger.verdict === 'WAIT_FOR_MANIPULATION') return 'QUIET';
  if (trigger.verdict === 'ARMED') return 'ARMED';
  return 'FIRING';
}

// Pinned transition table (D-03) with cause asserts (T-18-01): forward-only
// legal edges asserted per bar on the full (trigger, flaw) triple — never
// the verdict string alone. FIRING to ARMED is legal ONLY via SOFT downgrade
// carrying the armed reason; a clean-flaw FIRING to ARMED is flicker and
// throws. FIRING to QUIET always throws. FIRING to INVALIDATED requires the
// HARD invalidated flag. ARMED to QUIET additionally requires the next
// trigger gate count at 1 or fewer (reduced gates, never a vanished FIRE).
// INVALIDATED is terminal within one setup (only the same-state hold is
// legal). Same-state hold is always legal; a null previous state opens a
// new setup chain (session boundary).
function gatePasses(trigger: TriggerOutput): number {
  return (
    (trigger.gates.timing ? 1 : 0) + (trigger.gates.purge ? 1 : 0) + (trigger.gates.displacement ? 1 : 0)
  );
}

function assertLegalEdge(
  prev: CombinedState | null,
  trigger: TriggerOutput,
  flaw: FatalFlawOutput,
): CombinedState {
  const next = combinedOf(trigger, flaw);
  if (prev === null || prev === next) return next;
  if (prev === 'INVALIDATED') {
    throw new Error(
      `illegal replay edge INVALIDATED -> ${next}: INVALIDATED is terminal within one setup`,
    );
  }
  if (prev === 'FIRING' && next === 'QUIET') {
    throw new Error(
      'illegal replay edge FIRING -> QUIET: a fired session must go ARMED_ALREADY_FIRED or INVALIDATED, never silently QUIET',
    );
  }
  if (prev === 'FIRING' && next === 'ARMED') {
    const firing = trigger.verdict === 'FIRE_LONG' || trigger.verdict === 'FIRE_SHORT';
    if (
      !firing ||
      flaw.downgraded !== true ||
      flaw.carriedArmedReason === null ||
      flaw.carriedArmedReason === undefined
    ) {
      throw new Error(
        'illegal replay edge FIRING -> ARMED with clean flaw: SOFT downgrade with carriedArmedReason required (flicker)',
      );
    }
    return next;
  }
  if (prev === 'FIRING' && next === 'INVALIDATED') {
    if (flaw.invalidated !== true) {
      throw new Error(
        'illegal replay edge FIRING -> INVALIDATED without HARD invalidation',
      );
    }
    return next;
  }
  if (prev === 'ARMED' && next === 'QUIET') {
    if (gatePasses(trigger) > 1) {
      throw new Error(
        `illegal replay edge ARMED -> QUIET with ${gatePasses(trigger)} gates: gate count must drop to 1 or fewer (reduced gates, never a vanished FIRE)`,
      );
    }
  }
  return next;
}

interface ReplayBarResult extends ReplayBarInput {
  trigger: TriggerOutput;
  flaw: FatalFlawOutput;
  combined: CombinedState;
}

// Bar-by-bar driver (D-02): every 15M close in chronological order through
// trigger then flaw on the same snapshot, at 15M closes only, never forming
// bars. Owns session-scoped alreadyFired: set on any FIRE_LONG or FIRE_SHORT.
function runReplay(sessions: ReplayBarInput[][]): ReplayBarResult[] {
  const log: ReplayBarResult[] = [];
  for (const bars of sessions) {
    let firedThisSession = false;
    let prevCombined: CombinedState | null = null;
    for (const bar of bars) {
      const trigger = evaluateTrigger({
        judas: bar.judas,
        amd: null,
        smt: bar.smt,
        fvg: bar.fvg,
        asOf: bar.asOf,
        alreadyFired: firedThisSession,
      });
      const flaw = checkFatalFlaw({
        trigger,
        smt: bar.smt,
        judas: bar.judas,
        rollover: bar.rollover,
        stale: bar.stale,
        asOf: bar.asOf,
      });
      const combined = combinedOf(trigger, flaw);
      assertLegalEdge(prevCombined, trigger, flaw);
      if (trigger.verdict === 'FIRE_LONG' || trigger.verdict === 'FIRE_SHORT') {
        firedThisSession = true;
      }
      log.push({ ...bar, trigger, flaw, combined });
      prevCombined = combined;
    }
  }
  return log;
}

// Monday (yyyy-MM-dd) of the NY week holding the given NY session date.
// Integer UTC-calendar math — no clock reads, host-TZ independent.
function mondayOfNyDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const back = (day + 6) % 7;
  const monday = new Date(Date.UTC(y, m - 1, d - back));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
}

interface CalibrationSummary {
  fires: number;
  sessions: number;
  firesPerWeek: number;
  invalidated: number;
  killRate: number;
  band: string;
  verdict: 'IN-BAND' | 'OUT-OF-BAND';
}

// Single definition of firesPerWeek plus killRate (D-08): killRate is
// invalidated-setups divided by fired-setups; the band verdict is
// informational (OUT-OF-BAND logs, never throws).
function summarizeReplay(log: ReplayBarResult[], sessionDates: string[]): CalibrationSummary {
  const fireBars = log.filter(
    (b) => b.trigger.verdict === 'FIRE_LONG' || b.trigger.verdict === 'FIRE_SHORT',
  );
  const fires = fireBars.length;
  const firedSessions = new Set(fireBars.map((b) => b.sessionDate)).size;
  const invalidated = new Set(
    log.filter((b) => b.combined === 'INVALIDATED').map((b) => b.sessionDate),
  ).size;
  const sessions = sessionDates.length;
  const weeks = Math.max(1, new Set(sessionDates.map(mondayOfNyDate)).size);
  const firesPerWeek = fires / weeks;
  const killRate = firedSessions === 0 ? 0 : invalidated / firedSessions;
  const verdict = firesPerWeek >= 1 && firesPerWeek <= 4 ? 'IN-BAND' : 'OUT-OF-BAND';
  return { fires, sessions, firesPerWeek, invalidated, killRate, band: '1-4/week', verdict };
}

function emitCalibrationSummary(summary: CalibrationSummary): void {
  console.log(JSON.stringify(summary));
}

// Tracer fixture: exactly 3 NY sessions on consecutive trading dates.
// Session A (2026-08-03) is choppy-QUIET; session B (2026-08-04) is the
// firing path; session C (2026-08-05) replays a firing bar then injects
// stale es on the next bar for the HARD STALE_LEG INVALIDATED path (D-09).
function buildTracerSessions(): ReplayBarInput[][] {
  const sessionA = '2026-08-03';
  const sessionB = '2026-08-04';
  const sessionC = '2026-08-05';

  // Choppy-QUIET strip: 12-row block15 at price 20050 (high 20058 / low
  // 20044, strictly inside the 20100/20000 Asia extremes); the first three
  // NY-hours rows drive the bars so timing stays false with all gates false.
  const quietRows = block15(sessionA, '10:00', 20050);
  for (const r of quietRows) {
    expect(r.high).toBeLessThan(20100);
    expect(r.low).toBeGreaterThan(20000);
  }
  const sessionABars: ReplayBarInput[] = [quietRows[0], quietRows[1], quietRows[2]].map((r) => ({
    sessionDate: sessionA,
    asOf: r.time, // nyMinutesOf 600 / 615 / 630 (NY-hours, timing false)
    judas: null,
    smt: null,
    fvg: null,
    rollover: null,
    stale: FRESH_LEGS,
  }));

  // Firing path: 02:01 just-inside killzone bar (ARMED, purge missing),
  // confirmed LOW sweep bar piercing strictly below the Asia low (ARMED,
  // displacement missing), displacement bar closing back through with the
  // 0.5 multiple satisfied plus resolvable BULLISH FVG (FIRE_LONG, 3 of 3).
  const sessionBBars: ReplayBarInput[] = [
    {
      sessionDate: sessionB,
      asOf: nyMinuteEpoch(sessionB, '02:01'), // nyMinutesOf 121 (just inside 120/300)
      judas: fixtureJudas({
        candidate: true,
        confirmed: false,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch(sessionB, '02:01'),
        displacementMult: 0.6,
      }),
      smt: null,
      fvg: [fixtureFvg('BULLISH', 4)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: sessionB,
      asOf: nyMinuteEpoch(sessionB, '03:00'), // nyMinutesOf 180
      judas: fixtureJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch(sessionB, '03:00'),
        displacementMult: 0.2,
      }),
      smt: null,
      fvg: [fixtureFvg('BULLISH', 4)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: sessionB,
      asOf: nyMinuteEpoch(sessionB, '03:15'), // nyMinutesOf 195
      judas: fixtureJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch(sessionB, '03:00'),
        displacementMult: 0.6,
      }),
      smt: null,
      fvg: [fixtureFvg('BULLISH', 4)],
      rollover: null,
      stale: FRESH_LEGS,
    },
  ];

  // Firing bar replayed, then stale es injected on the next bar: HARD
  // STALE_LEG INVALIDATED (first-match-wins, any single true leg kills).
  // The trailing bar holds INVALIDATED (terminal same-state hold).
  const firingJudas = fixtureJudas({
    candidate: true,
    confirmed: true,
    sweepSide: 'LOW',
    sweepTime: nyMinuteEpoch(sessionC, '03:00'),
    displacementMult: 0.6,
  });
  const sessionCBars: ReplayBarInput[] = [
    {
      sessionDate: sessionC,
      asOf: nyMinuteEpoch(sessionC, '03:00'), // nyMinutesOf 180
      judas: firingJudas,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 5)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: sessionC,
      asOf: nyMinuteEpoch(sessionC, '03:15'), // nyMinutesOf 195
      judas: firingJudas,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 5)],
      rollover: null,
      stale: { nq: false, es: true, nq1h: false, nq15m: false },
    },
    {
      sessionDate: sessionC,
      asOf: nyMinuteEpoch(sessionC, '03:30'), // nyMinutesOf 210
      judas: firingJudas,
      smt: null,
      fvg: [fixtureFvg('BULLISH', 5)],
      rollover: null,
      stale: { nq: false, es: true, nq1h: false, nq15m: false },
    },
  ];

  return [sessionABars, sessionBBars, sessionCBars];
}

describe('replay: tracer mini-replay QUIET to FIRING to INVALIDATED', () => {
  it('runs 3 sessions green with legal edges and emits the calibration summary', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const sessions = buildTracerSessions();
      const log = runReplay(sessions);

      // Wall-clock discipline: every bar epoch pinned to its NY minutes.
      expect(log.map((b) => nyMinutesOf(b.asOf))).toEqual([
        600, 615, 630, 121, 180, 195, 180, 195, 210,
      ]);

      // Combined-state path across the three sessions.
      expect(log.map((b) => b.combined)).toEqual([
        'QUIET', 'QUIET', 'QUIET',
        'ARMED', 'ARMED', 'FIRING',
        'FIRING', 'INVALIDATED', 'INVALIDATED',
      ]);

      // Session A: choppy-QUIET asserts WAIT_FOR_MANIPULATION, all gates false.
      for (const bar of log.slice(0, 3)) {
        expect(bar.trigger.verdict).toBe('WAIT_FOR_MANIPULATION');
        expect(bar.trigger.reasonKey).toBe('WAIT_FOR_MANIPULATION');
        expect(bar.trigger.gates).toEqual({ timing: false, purge: false, displacement: false });
        expect(bar.flaw.reasonKey).toBe('NONE');
      }

      // Session B: ARMED_MISSING_PURGE to ARMED_MISSING_DISPLACEMENT to
      // FIRE_LONG with 3 of 3 gates.
      expect(log[3].trigger.reasonKey).toBe('ARMED_MISSING_PURGE');
      expect(log[4].trigger.reasonKey).toBe('ARMED_MISSING_DISPLACEMENT');
      expect(log[5].trigger.verdict).toBe('FIRE_LONG');
      expect(log[5].trigger.reasonKey).toBe('FIRE_LONG');
      expect(log[5].trigger.gates).toEqual({ timing: true, purge: true, displacement: true });

      // Session C: firing bar replays, then HARD STALE_LEG INVALIDATED.
      expect(log[6].trigger.verdict).toBe('FIRE_LONG');
      expect(log[7].flaw.invalidated).toBe(true);
      expect(log[7].flaw.flawClass).toBe('HARD');
      expect(log[7].flaw.reasonKey).toBe('STALE_LEG');

      // Population holds at least one FIRING and at least one INVALIDATED.
      expect(log.some((b) => b.combined === 'FIRING')).toBe(true);
      expect(log.some((b) => b.combined === 'INVALIDATED')).toBe(true);

      const summary = summarizeReplay(log, ['2026-08-03', '2026-08-04', '2026-08-05']);
      emitCalibrationSummary(summary);
      const line = logSpy.mock.calls
        .map((c) => String(c[0]))
        .find((l) => l.includes('"firesPerWeek"'));
      expect(line).toBeDefined();
      const parsed = JSON.parse(line as string) as CalibrationSummary;
      expect(parsed.fires).toBe(2);
      expect(parsed.sessions).toBe(3);
      expect(parsed.firesPerWeek).toBe(2);
      expect(parsed.invalidated).toBe(1);
      expect(parsed.killRate).toBe(0.5);
      expect(parsed.band).toBe('1-4/week');
      expect(parsed.verdict).toBe('IN-BAND');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('rejects the illegal FIRING to QUIET edge when injected', () => {
    const waitTrigger = {
      verdict: 'WAIT_FOR_MANIPULATION',
      gates: { timing: false, purge: false, displacement: false },
    } as TriggerOutput;
    const cleanFlaw = { invalidated: false, downgraded: false } as FatalFlawOutput;
    expect(() => assertLegalEdge('FIRING', waitTrigger, cleanFlaw)).toThrow(
      'FIRING -> QUIET',
    );
  });

  it('rejects a clean-flaw FIRING to ARMED edge as flicker', () => {
    const armedTrigger = {
      verdict: 'ARMED',
      gates: { timing: true, purge: true, displacement: false },
    } as TriggerOutput;
    const cleanFlaw = { invalidated: false, downgraded: false } as FatalFlawOutput;
    expect(() => assertLegalEdge('FIRING', armedTrigger, cleanFlaw)).toThrow('flicker');
  });
});

// Task 2 fixture: 20 consecutive NY trading sessions across 4 Mon-Fri weeks
// (2026-08-03 through 2026-08-28, weekends skipped) so firesPerWeek divides
// by 4 NY weeks. The tracer's 3 sessions stay as weeks 1-2 anchors; the
// added sessions exercise killzone entries at 02:01 and 04:59 just-inside
// probes for firing bars, 02:00 and 05:00 exact-edge negative controls
// asserting ARMED_MISSING_TIMING, LOW-side sweeps with wicks piercing
// strictly below the Asia low, displacement bars closing back through with
// the 0.5 multiple satisfied, choppy-QUIET full 12-row block15 stretches
// strictly inside range asserting WAIT_FOR_MANIPULATION, one NY-hours stretch
// (minutes 570 to 960) excluded from firing expectations, and SMT-suppressed
// downgrade plus STALE_LEG HARD paths for the INVALIDATED population.
const WEEK1 = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'];
const WEEK2 = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'];
const WEEK3 = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21'];
const WEEK4 = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28'];

function suppressedSmt(): SmtOutput {
  return { suppressed: true, reason: 'CORR_DECOUPLED', corr: 0.4 };
}

function signalSmt(direction: 'BULLISH' | 'BEARISH' | 'NO-SIGNAL' = 'BULLISH'): SmtOutput {
  return {
    suppressed: false,
    direction,
    sweeperLeg: 'NQ',
    nqWindow: null,
    esWindow: null,
    bpsGap: 30,
  };
}

function firingLowJudas(sweepDate: string, mult = 0.6): JudasOutput {
  return fixtureJudas({
    candidate: true,
    confirmed: true,
    sweepSide: 'LOW',
    sweepTime: nyMinuteEpoch(sweepDate, '03:00'),
    displacementMult: mult,
  });
}

// Choppy-QUIET stretch: full 12-row block15 strictly inside the 20100/20000
// Asia extremes, evaluated as null-judas WAIT_FOR_MANIPULATION bars.
function quietBars(sessionDate: string, indices: number[]): ReplayBarInput[] {
  const rows = block15(sessionDate, '10:00', 20050);
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
// (FIRE_LONG, 3 of 3). Every bar's nyMinutesOf pinned in comments.
function firingProbe(sessionDate: string, originDay: number): ReplayBarInput[] {
  return [
    {
      sessionDate,
      asOf: nyMinuteEpoch(sessionDate, '02:01'), // nyMinutesOf 121
      judas: fixtureJudas({
        candidate: true,
        confirmed: false,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch(sessionDate, '02:01'),
        displacementMult: 0.6,
      }),
      smt: null,
      fvg: [fixtureFvg('BULLISH', originDay)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate,
      asOf: nyMinuteEpoch(sessionDate, '03:00'), // nyMinutesOf 180
      judas: fixtureJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch(sessionDate, '03:00'),
        displacementMult: 0.2,
      }),
      smt: null,
      fvg: [fixtureFvg('BULLISH', originDay)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate,
      asOf: nyMinuteEpoch(sessionDate, '03:15'), // nyMinutesOf 195
      judas: firingLowJudas(sessionDate),
      smt: signalSmt('BULLISH'),
      fvg: [fixtureFvg('BULLISH', originDay)],
      rollover: null,
      stale: FRESH_LEGS,
    },
  ];
}

// Second firing probe at the 04:59 just-inside edge: 04:59 ARMED
// (purge missing, nyMinutesOf 299) then 05:30 displaced confirm sells
// through as FIRE (05:30 is outside timing, so the confirming bar is
// ARMED_MISSING_TIMING; the FIRE lands on the 04:59 bar itself).
function lateProbe(sessionDate: string, originDay: number): ReplayBarInput[] {
  return [
    {
      sessionDate,
      asOf: nyMinuteEpoch(sessionDate, '04:59'), // nyMinutesOf 299
      judas: firingLowJudas(sessionDate),
      smt: signalSmt('BULLISH'),
      fvg: [fixtureFvg('BULLISH', originDay)],
      rollover: null,
      stale: FRESH_LEGS,
    },
  ];
}

function buildPopulationSessions(): ReplayBarInput[][] {
  const tracer = buildTracerSessions();
  const [tracerA, tracerB, tracerC] = tracer;

  // Week 1: tracer A (QUIET, 08-03), tracer B (fire, 08-04), tracer C
  // (fire + STALE_LEG, 08-05), 08-06 exact-edge negative controls at 02:00
  // and 05:00 asserting ARMED_MISSING_TIMING, 08-07 late 04:59 probe firing.
  const edgeControls: ReplayBarInput[] = [
    {
      sessionDate: '2026-08-06',
      asOf: nyMinuteEpoch('2026-08-06', '02:00'), // nyMinutesOf 120 (exclusive edge)
      judas: firingLowJudas('2026-08-06'),
      smt: null,
      fvg: [fixtureFvg('BULLISH', 6)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: '2026-08-06',
      asOf: nyMinuteEpoch('2026-08-06', '05:00'), // nyMinutesOf 300 (exclusive edge)
      judas: firingLowJudas('2026-08-06'),
      smt: null,
      fvg: [fixtureFvg('BULLISH', 6)],
      rollover: null,
      stale: FRESH_LEGS,
    },
  ];
  const aug06Edge = edgeControls;
  const aug07Late = lateProbe('2026-08-07', 7);

  // Week 2: full 12-row QUIET stretches (08-10, 08-14), 02:01 probe firing
  // (08-11), NY-hours stretch minutes 570-960 with purge gates true but no
  // timing so no FIRE expected (08-12), STALE_LEG invalidation after a FIRE
  // replays (08-13).
  const aug10Quiet = quietBars('2026-08-10', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const aug11Probe = firingProbe('2026-08-11', 11);
  // NY-hours stretch: 09:30 (570), 10:00 (600), 15:45 (945) — confirmed
  // LOW sweep with resolvable FVG but timing false: ARMED_MISSING_TIMING,
  // never a FIRE.
  const aug12NyHours: ReplayBarInput[] = [
    { sessionDate: '2026-08-12', asOf: nyMinuteEpoch('2026-08-12', '09:30'), judas: firingLowJudas('2026-08-12'), smt: signalSmt('BULLISH'), fvg: [fixtureFvg('BULLISH', 12)], rollover: null, stale: FRESH_LEGS }, // nyMinutesOf 570
    { sessionDate: '2026-08-12', asOf: nyMinuteEpoch('2026-08-12', '10:00'), judas: firingLowJudas('2026-08-12'), smt: signalSmt('BULLISH'), fvg: [fixtureFvg('BULLISH', 12)], rollover: null, stale: FRESH_LEGS }, // nyMinutesOf 600
    { sessionDate: '2026-08-12', asOf: nyMinuteEpoch('2026-08-12', '15:45'), judas: firingLowJudas('2026-08-12'), smt: signalSmt('BULLISH'), fvg: [fixtureFvg('BULLISH', 12)], rollover: null, stale: FRESH_LEGS }, // nyMinutesOf 945
  ];
  const aug13FireThenStale: ReplayBarInput[] = [
    { sessionDate: '2026-08-13', asOf: nyMinuteEpoch('2026-08-13', '03:15'), judas: firingLowJudas('2026-08-13'), smt: signalSmt('BULLISH'), fvg: [fixtureFvg('BULLISH', 13)], rollover: null, stale: FRESH_LEGS }, // nyMinutesOf 195
    { sessionDate: '2026-08-13', asOf: nyMinuteEpoch('2026-08-13', '03:30'), judas: firingLowJudas('2026-08-13'), smt: signalSmt('BULLISH'), fvg: [fixtureFvg('BULLISH', 13)], rollover: null, stale: { nq: false, es: true, nq1h: false, nq15m: false } }, // nyMinutesOf 210
    { sessionDate: '2026-08-13', asOf: nyMinuteEpoch('2026-08-13', '03:45'), judas: firingLowJudas('2026-08-13'), smt: signalSmt('BULLISH'), fvg: [fixtureFvg('BULLISH', 13)], rollover: null, stale: { nq: false, es: true, nq1h: false, nq15m: false } }, // nyMinutesOf 225
  ];
  const aug14Quiet = quietBars('2026-08-14', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

  // Week 3: 02:01 probe (08-17), SMT-suppressed SOFT downgrade proving the
  // legal FIRING to ARMED edge with carriedArmedReason (08-18), QUIET
  // stretches (08-19, 08-21), 04:59 late probe (08-20).
  const aug17Probe = firingProbe('2026-08-17', 17);
  // SMT-suppressed downgrade session: 02:01 ARMED, 03:00 ARMED, then the
  // 03:15 3-of-3 bar with suppressed SMT — FIRE verdict plus SOFT
  // SMT_SUPPRESSED downgrade carrying FIRE_LONG, rendering ARMED. The
  // SOFT-transient FIRING-to-ARMED edge appears on this bar: the trigger
  // says FIRING while the combined state renders ARMED via the carrier.
  // (A literal FIRING-then-ARMED bar pair is unreachable by construction:
  // any FIRE verdict sets session alreadyFired, so the next 3-of-3 bar is
  // ARMED_ALREADY_FIRED — every post-FIRE clean bar is INVALIDATED-bound
  // or session-final in this fixture.)
  const aug18Downgrade: ReplayBarInput[] = [
    {
      sessionDate: '2026-08-18',
      asOf: nyMinuteEpoch('2026-08-18', '02:01'), // nyMinutesOf 121
      judas: fixtureJudas({
        candidate: true,
        confirmed: false,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch('2026-08-18', '02:01'),
        displacementMult: 0.6,
      }),
      smt: suppressedSmt(),
      fvg: [fixtureFvg('BULLISH', 18)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: '2026-08-18',
      asOf: nyMinuteEpoch('2026-08-18', '03:00'), // nyMinutesOf 180
      judas: fixtureJudas({
        candidate: true,
        confirmed: true,
        sweepSide: 'LOW',
        sweepTime: nyMinuteEpoch('2026-08-18', '03:00'),
        displacementMult: 0.2,
      }),
      smt: suppressedSmt(),
      fvg: [fixtureFvg('BULLISH', 18)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: '2026-08-18',
      asOf: nyMinuteEpoch('2026-08-18', '03:15'), // nyMinutesOf 195
      judas: firingLowJudas('2026-08-18'),
      smt: suppressedSmt(),
      fvg: [fixtureFvg('BULLISH', 18)],
      rollover: null,
      stale: FRESH_LEGS,
    },
    {
      sessionDate: '2026-08-18',
      asOf: nyMinuteEpoch('2026-08-18', '03:30'), // nyMinutesOf 210
      judas: null,
      smt: null,
      fvg: null,
      rollover: null,
      stale: FRESH_LEGS,
    },
  ];
  const aug19Quiet = quietBars('2026-08-19', [0, 1, 2, 3, 4, 5]);
  const aug20Late = lateProbe('2026-08-20', 20);
  const aug21Quiet = quietBars('2026-08-21', [6, 7, 8, 9, 10, 11]);

  // Week 4: QUIET stretch (08-24), 02:01 probe (08-25), ROLLOVER_WEEK HARD
  // invalidation (08-26), QUIET stretch (08-27), 04:59 late probe (08-28).
  const aug24Quiet = quietBars('2026-08-24', [0, 1, 2, 3]);
  const aug25Probe = firingProbe('2026-08-25', 25);
  const rolloverFlag: RolloverFlag = {
    rolloverSuspect: true,
    contractHint: 'ES U6-U7',
    proximityWarning: null,
  };
  const aug26Rollover: ReplayBarInput[] = [
    { sessionDate: '2026-08-26', asOf: nyMinuteEpoch('2026-08-26', '03:15'), judas: firingLowJudas('2026-08-26'), smt: signalSmt('BULLISH'), fvg: [fixtureFvg('BULLISH', 26)], rollover: null, stale: FRESH_LEGS }, // nyMinutesOf 195
    { sessionDate: '2026-08-26', asOf: nyMinuteEpoch('2026-08-26', '03:30'), judas: firingLowJudas('2026-08-26'), smt: signalSmt('BULLISH'), fvg: [fixtureFvg('BULLISH', 26)], rollover: rolloverFlag, stale: FRESH_LEGS }, // nyMinutesOf 210
    { sessionDate: '2026-08-26', asOf: nyMinuteEpoch('2026-08-26', '03:45'), judas: firingLowJudas('2026-08-26'), smt: signalSmt('BULLISH'), fvg: [fixtureFvg('BULLISH', 26)], rollover: rolloverFlag, stale: FRESH_LEGS }, // nyMinutesOf 225
  ];
  const aug27Quiet = quietBars('2026-08-27', [0, 1, 2, 3, 4, 5, 6, 7]);
  const aug28Late = lateProbe('2026-08-28', 28);

  return [
    tracerA, tracerB, tracerC, aug06Edge, aug07Late,
    aug10Quiet, aug11Probe, aug12NyHours, aug13FireThenStale, aug14Quiet,
    aug17Probe, aug18Downgrade, aug19Quiet, aug20Late, aug21Quiet,
    aug24Quiet, aug25Probe, aug26Rollover, aug27Quiet, aug28Late,
  ];
}

function populationDates(): string[] {
  return [...WEEK1, ...WEEK2, ...WEEK3, ...WEEK4];
}

describe('replay: 20-session population with killzone-edge probes', () => {
  it('replays 20 consecutive trading sessions green with edge probes', () => {
    const sessions = buildPopulationSessions();
    expect(sessions).toHaveLength(20);
    const dates = populationDates();
    expect(dates).toHaveLength(20);
    // Consecutive trading-date calendar with weekend gaps (Fri 08-07 to
    // Mon 08-10, Fri 08-14 to Mon 08-17, Fri 08-21 to Mon 08-24).
    expect(dates[4]).toBe('2026-08-07');
    expect(dates[5]).toBe('2026-08-10');
    expect(dates[9]).toBe('2026-08-14');
    expect(dates[10]).toBe('2026-08-17');
    expect(dates[14]).toBe('2026-08-21');
    expect(dates[15]).toBe('2026-08-24');

    const log = runReplay(sessions);

    // 02:01 just-inside probe fires.
    const probeBar = log.find(
      (b) => b.sessionDate === '2026-08-11' && nyMinutesOf(b.asOf) === 195,
    );
    expect(probeBar?.trigger.verdict).toBe('FIRE_LONG');

    // 02:00 and 05:00 exact-edge negative controls: ARMED_MISSING_TIMING.
    const edgeBars = log.filter((b) => b.sessionDate === '2026-08-06');
    expect(edgeBars).toHaveLength(2);
    for (const b of edgeBars) {
      expect(b.trigger.gates.timing).toBe(false);
      expect(b.trigger.reasonKey).toBe('ARMED_MISSING_TIMING');
      expect(b.trigger.verdict).toBe('ARMED');
    }

    // 04:59 just-inside late probe fires.
    const lateBar = log.find(
      (b) => b.sessionDate === '2026-08-07' && nyMinutesOf(b.asOf) === 299,
    );
    expect(lateBar?.trigger.verdict).toBe('FIRE_LONG');

    // NY-hours stretch (minutes 570-960) never fires.
    for (const b of log.filter((b) => b.sessionDate === '2026-08-12')) {
      expect(b.trigger.verdict).not.toBe('FIRE_LONG');
      expect(b.trigger.verdict).not.toBe('FIRE_SHORT');
      expect(b.trigger.reasonKey).toBe('ARMED_MISSING_TIMING');
    }

    // SMT-suppressed FIRING downgrade edge: downgraded true with
    // carriedArmedReason carrying the FIRE key.
    const downgrade = log.find(
      (b) => b.sessionDate === '2026-08-18' && b.combined === 'ARMED' && b.flaw.downgraded,
    );
    expect(downgrade).toBeDefined();
    expect(downgrade?.flaw.reasonKey).toBe('SMT_SUPPRESSED');
    expect(downgrade?.flaw.carriedArmedReason).toBe('FIRE_LONG');

    // No OPPOSITE_SWEEP INVALIDATED bar: every INVALIDATED bar carries a
    // winning reasonKey of ROLLOVER_WEEK or STALE_LEG or SMT_SUPPRESSED.
    const invalidated = log.filter((b) => b.combined === 'INVALIDATED');
    expect(invalidated.length).toBeGreaterThan(0);
    for (const b of invalidated) {
      expect(['ROLLOVER_WEEK', 'STALE_LEG', 'SMT_SUPPRESSED']).toContain(b.flaw.reasonKey);
      expect(b.flaw.reasonKey).not.toBe('OPPOSITE_SWEEP');
    }
    expect(invalidated.some((b) => b.flaw.reasonKey === 'STALE_LEG')).toBe(true);

    // ROLLOVER_WEEK path present.
    expect(log.some((b) => b.flaw.reasonKey === 'ROLLOVER_WEEK')).toBe(true);

    // Full 12-row QUIET stretches hold WAIT_FOR_MANIPULATION.
    const quietDates = ['2026-08-10', '2026-08-14'];
    for (const d of quietDates) {
      const bars = log.filter((b) => b.sessionDate === d);
      expect(bars).toHaveLength(12);
      for (const b of bars) {
        expect(b.trigger.verdict).toBe('WAIT_FOR_MANIPULATION');
        expect(b.combined).toBe('QUIET');
      }
    }

    // Fixture holds at least one FIRING and at least one INVALIDATED.
    expect(log.some((b) => b.combined === 'FIRING')).toBe(true);
    expect(log.some((b) => b.combined === 'INVALIDATED')).toBe(true);

    // 4-week denominator: firesPerWeek divides fires by exactly 4 NY weeks.
    const summary = summarizeReplay(log, dates);
    expect(new Set(dates.map(mondayOfNyDate)).size).toBe(4);
    expect(summary.sessions).toBe(20);
    expect(summary.firesPerWeek).toBe(summary.fires / 4);

    // Band verdict is correct against the 4-week denominator (D-08):
    // recompute IN-BAND vs OUT-OF-BAND from the emission itself.
    const expected =
      summary.firesPerWeek >= 1 && summary.firesPerWeek <= 4 ? 'IN-BAND' : 'OUT-OF-BAND';
    expect(summary.verdict).toBe(expected);
    expect(summary.band).toBe('1-4/week');
  });

  it('holds every ARMED to QUIET edge to reduced gate counts', () => {
    const log = runReplay(buildPopulationSessions());
    let edges = 0;
    for (let i = 1; i < log.length; i++) {
      if (
        log[i - 1].sessionDate === log[i].sessionDate &&
        log[i - 1].combined === 'ARMED' &&
        log[i].combined === 'QUIET'
      ) {
        edges += 1;
        expect(gatePasses(log[i].trigger)).toBeLessThanOrEqual(1);
      }
    }
    expect(edges).toBeGreaterThan(0);
  });

  it('proves the full 20-session driver byte-identical on double run', () => {
    const first = runReplay(buildPopulationSessions());
    const second = runReplay(buildPopulationSessions());
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('throws a got-string error on a malformed judas envelope string', () => {
    const asOf = nyMinuteEpoch('2026-08-04', '03:00');
    expect(() =>
      evaluateTrigger({
        judas: 'malformed' as unknown as JudasOutput,
        amd: null,
        smt: null,
        fvg: null,
        asOf,
        alreadyFired: false,
      }),
    ).toThrow('got');
  });

  it('degrades null smt plus null judas to honest WAIT instead of throwing', () => {
    const asOf = nyMinuteEpoch('2026-08-04', '03:00');
    const out = evaluateTrigger({
      judas: null,
      amd: null,
      smt: null,
      fvg: null,
      asOf,
      alreadyFired: false,
    });
    expect(out.verdict).toBe('WAIT_FOR_MANIPULATION');
    expect(out.reasonKey).toBe('WAIT_FOR_MANIPULATION');
  });
});

