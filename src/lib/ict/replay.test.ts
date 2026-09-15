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

// Pinned transition table (D-03): forward-only legal edges asserted per bar.
// FIRING to ARMED is legal ONLY via SOFT downgrade carrying the armed reason;
// a clean-flaw FIRING to ARMED is flicker and throws. FIRING to QUIET always
// throws. INVALIDATED is terminal within one setup (only the same-state hold
// is legal). Same-state hold is always legal; a null previous state opens a
// new setup chain (session boundary).
function assertLegalEdge(
  prev: CombinedState | null,
  next: CombinedState,
  flawCtx: { downgraded: boolean; carriedArmedReason: TriggerReasonKey | null },
): void {
  if (prev === null || prev === next) return;
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
    if (flawCtx.downgraded !== true || flawCtx.carriedArmedReason === null || flawCtx.carriedArmedReason === undefined) {
      throw new Error(
        'illegal replay edge FIRING -> ARMED with clean flaw: SOFT downgrade with carriedArmedReason required (flicker)',
      );
    }
  }
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
    let prev: CombinedState | null = null;
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
      assertLegalEdge(prev, combined, {
        downgraded: flaw.downgraded,
        carriedArmedReason: flaw.carriedArmedReason,
      });
      if (trigger.verdict === 'FIRE_LONG' || trigger.verdict === 'FIRE_SHORT') {
        firedThisSession = true;
      }
      log.push({ ...bar, trigger, flaw, combined });
      prev = combined;
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
    expect(() =>
      assertLegalEdge('FIRING', 'QUIET', { downgraded: false, carriedArmedReason: null }),
    ).toThrow('FIRING -> QUIET');
  });
});
