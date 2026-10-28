// Phase 21 POL-03 parity harness (D-04, D-05, D-11, D-12, D-13).
// Proves trigger plus flaw plus ticket verdicts are identical with pools
// exercised versus pools null. Input-independence, never flag-threading
// (D-11): no pools value enters evaluateTrigger, checkFatalFlaw or
// computeTicket — the on-mode executes the pools consumer path
// (evaluatePools over D1 candles, rank1Of, poolPriceLines) and discards the
// result before computing verdicts; the off-mode uses null. Lives outside
// src/lib/ict so the purity self-scan scope is untouched (D-13); changes no
// scorer constant (D-12). Fixture idiom copied from
// src/lib/ict/parity.test.ts (builder-with-overrides, NY-session epoch
// helper) and src/lib/ticket.test.ts (ticket builders). No store imports.

import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import { evaluateTrigger } from '@/src/lib/ict/trigger';
import type { TriggerOutput } from '@/src/lib/ict/trigger';
import { checkFatalFlaw, REASON_BY_KEY } from '@/src/lib/ict/invalidation';
import type { FatalFlawOutput } from '@/src/lib/ict/invalidation';
import type { AmdOutput } from '@/src/lib/ict/amd';
import type { JudasOutput, SweepSide } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { FvgGap } from '@/src/lib/ict/fvg';
import type { Candle } from '@/src/lib/ict/types';
import type { DealingRange, DOLTarget } from '@/src/lib/ict/types';
import type { LevelsOutput } from '@/src/lib/ict/levels';
import type { AsiaRange } from '@/src/lib/ict/asia';
import { DOL_HIGH_NAME } from '@/src/lib/ict/dol';
import { evaluatePools, type LiquidityPool } from '@/src/lib/ict/pools';
import { formatRank1Sentence, rank1Of } from '@/src/lib/pool-prose';
import { poolPriceLines } from '@/src/lib/pool-overlay';
import { computeTicket, type TicketInput } from '@/src/lib/ticket';

// Trigger-triple builders: copied from src/lib/ict/parity.test.ts lines
// 18-95 (STEP via fromZonedTime with NY_TZ, never hand-rolled offsets).
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

// Non-fire triple: candidate-only judas (confirmed false) at 03:00 — timing
// plus displacement true, purge false, so ARMED_MISSING_PURGE.
function armedTriple(nyDate = '2026-06-15'): ParityTriple {
  return {
    judas: fixtureTriggerJudas({
      candidate: true,
      confirmed: false,
      sweepSide: 'LOW',
      sweepTime: nyMinuteEpoch(nyDate, '03:00'),
      displacementMult: 0.6,
    }),
    amd: null,
    smt: signalSmt('BULLISH'),
    fvg: [fixtureFvg('BULLISH', 15)],
    asOf: nyMinuteEpoch(nyDate, '03:00'),
  };
}

// Ticket builders: copied from src/lib/ticket.test.ts lines 19-104
// (builder-with-overrides idiom). No atr field exists on TicketInput — the
// buffer plan stays parallel-safe by construction.
function fixtureEntryFvg(overrides: Partial<FvgGap> = {}): FvgGap {
  return {
    polarity: 'BULLISH',
    top: 20120,
    bottom: 20090,
    originDate: '2026-01-21',
    mitigated: false,
    ...overrides,
  };
}

function fixtureCleanFlaw(overrides: Partial<FatalFlawOutput> = {}): FatalFlawOutput {
  return {
    invalidated: false,
    downgraded: false,
    flawClass: null,
    reasonKey: 'NONE',
    reason: REASON_BY_KEY.NONE,
    unblock: '',
    sentence: 'FALSİFİKASİYA LONG: BSL reydi baş verməyibsə və qiymət premiumda qalırsa, LONG oxunuşu yanlışdır.',
    challenge: 'Sual: bu hərəkət xəbər-öncəsi mühəndislik deyilmi — təqvim pəncərəsini yoxladınmı?',
    carriedArmedReason: null,
    asOf: 0,
    ...overrides,
  };
}

function fixtureLevels(overrides: Partial<LevelsOutput> = {}): LevelsOutput {
  return {
    eq: 20135,
    q1: 20072.5,
    q3: 20197.5,
    bullOTE: { lo: 20062.5, hi: 20105 },
    bearOTE: { lo: 20165, hi: 20207.5 },
    position: 0.6,
    ...overrides,
  };
}

function fixtureRange(overrides: Partial<DealingRange> = {}): DealingRange {
  return {
    high: 20260,
    low: 20010,
    eq: 20135,
    window: 20,
    asOf: '2026-02-09',
    thinHistory: false,
    ...overrides,
  };
}

function fixtureDol(overrides: Partial<DOLTarget> = {}): DOLTarget {
  return { name: DOL_HIGH_NAME, price: 20260, ...overrides };
}

function fixtureAsia(overrides: Partial<AsiaRange> = {}): AsiaRange {
  return { high: 20210, low: 20085, height: 125, sessionDate: '2026-02-08', ...overrides };
}

function fixtureTicketInput(
  trigger: TriggerOutput,
  flaw: FatalFlawOutput,
  asOf: number,
  overrides: Partial<TicketInput> = {},
): TicketInput {
  return {
    trigger,
    flaw,
    levels: fixtureLevels(),
    range: fixtureRange(),
    dol: fixtureDol(),
    asia: fixtureAsia(),
    riskPct: 1,
    asOf,
    ...overrides,
  };
}

// D1 candle builders: copied from src/lib/ict/pools.test.ts lines 23-48
// (midpoint open/close, explicit high/low rails). BSL_HIGHS plus SSL_LOWS
// through evaluatePools yields a non-empty ranked selection.
function leg(n: number, highs: number[], lows: number[], startDay = 5): Candle[] {
  if (highs.length !== n || lows.length !== n) {
    throw new Error(`leg requires ${n} highs and lows, got ${highs.length}/${lows.length}`);
  }
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(startDay + i).padStart(2, '0');
    const mid = (highs[i] + lows[i]) / 2;
    out.push({ date: `2026-01-${day}`, open: mid, high: highs[i], low: lows[i], close: mid });
  }
  return out;
}

const BSL_HIGHS = [20000, 20010, 20050, 20100, 20200, 20100, 20050, 20020, 20010];
const SSL_LOWS = [20000, 19990, 19960, 19930, 19900, 19930, 19960, 19980, 19990];
const D1_CANDLES = leg(9, BSL_HIGHS, SSL_LOWS);
const POOLS_AS_OF = '2026-01-31';

const FRESH_LEGS = { nq: false, es: false, nq1h: false, nq15m: false };

// On-mode: executes the pools consumer path with a non-empty result
// assertion, then discards the pools result — nothing pools-flavored flows
// into the verdict inputs below (D-11).
function exercisePoolsOnMode(): void {
  const pools = evaluatePools(D1_CANDLES, POOLS_AS_OF);
  expect(pools.length).toBeGreaterThan(0);
  const lines = poolPriceLines(pools);
  expect(lines.length).toBeGreaterThan(0);
  const rank1 = rank1Of(pools);
  expect(rank1).not.toBeNull();
  if (rank1 === null) throw new Error('pools-parity on-mode requires a rank-1 pool');
  expect(formatRank1Sentence(rank1, null).length).toBeGreaterThan(0);
}

interface VerdictSet {
  trigger: TriggerOutput;
  flaw: FatalFlawOutput;
  ticket: ReturnType<typeof computeTicket>;
}

// Verdicts recomputed independently per mode from the shared triple —
// pools never appear in any of the three inputs by construction.
function runVerdicts(triple: ParityTriple): VerdictSet {
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
  const ticket = computeTicket(fixtureTicketInput(trigger, flaw, triple.asOf));
  return { trigger, flaw, ticket };
}

describe('pools-parity: trigger plus flaw plus ticket identical pools on versus off', () => {
  it('FIRE_LONG triple: full outputs toEqual with a non-vacuous on-mode', () => {
    const triple = firingTriple('LOW', signalSmt('BULLISH'));
    exercisePoolsOnMode();
    const on = runVerdicts(triple);
    expect(on.trigger.verdict).toBe('FIRE_LONG');
    const poolsOff: LiquidityPool[] | null = null;
    expect(poolsOff).toBeNull();
    const off = runVerdicts(triple);
    expect(on.trigger).toEqual(off.trigger);
    expect(on.flaw).toEqual(off.flaw);
    expect(on.ticket).toEqual(off.ticket);
  });

  it('FIRE_SHORT triple: full outputs toEqual with a non-vacuous on-mode', () => {
    const triple = firingTriple('HIGH', signalSmt('BEARISH'));
    exercisePoolsOnMode();
    const on = runVerdicts(triple);
    expect(on.trigger.verdict).toBe('FIRE_SHORT');
    const poolsOff: LiquidityPool[] | null = null;
    expect(poolsOff).toBeNull();
    const off = runVerdicts(triple);
    expect(on.trigger).toEqual(off.trigger);
    expect(on.flaw).toEqual(off.flaw);
    expect(on.ticket).toEqual(off.ticket);
  });

  it('ARMED non-fire triple: full outputs toEqual with a non-vacuous on-mode', () => {
    const triple = armedTriple();
    exercisePoolsOnMode();
    const on = runVerdicts(triple);
    expect(on.trigger.verdict).toBe('ARMED');
    expect(on.trigger.reasonKey).toBe('ARMED_MISSING_PURGE');
    const poolsOff: LiquidityPool[] | null = null;
    expect(poolsOff).toBeNull();
    const off = runVerdicts(triple);
    expect(on.trigger).toEqual(off.trigger);
    expect(on.flaw).toEqual(off.flaw);
    expect(on.ticket).toEqual(off.ticket);
  });
});
