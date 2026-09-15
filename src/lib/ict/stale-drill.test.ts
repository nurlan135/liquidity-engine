import { describe, expect, it } from 'vitest';
import { DOL_HIGH_NAME } from '@/src/lib/ict/dol';
import type { FvgGap } from '@/src/lib/ict/fvg';
import type { TriggerOutput } from '@/src/lib/ict/trigger';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { LevelsOutput } from '@/src/lib/ict/levels';
import type { AsiaRange } from '@/src/lib/ict/asia';
import type { DealingRange, DOLTarget } from '@/src/lib/ict/types';
import {
  REASON_BY_KEY,
  checkFatalFlaw,
  type FatalFlawInput,
  type FatalFlawOutput,
} from '@/src/lib/ict/invalidation';
import {
  computeTicket,
  type TicketDegraded,
  type TicketInput,
} from '@/src/lib/ticket';

const AS_OF = 1770500000;

// Task 1 builders: FIRE-capable tracer block copied from ticket.test.ts
// lines 12-104 (range 20260/20010 width 250 → bullOTE [20062.5, 20105];
// BULLISH gap [20090, 20120] ∩ bullOTE = [20090, 20105] → entry 20097.5;
// SL = min(20090, asiaLow 20085) = 20085 → stop 12.5; TP1 = asiaHigh 20210
// → RR 112.5/12.5 = 9 ≥ 3; EXECUTE_LONG) plus fixtureStale and cleanInput
// from invalidation.test.ts lines 64-84.
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

function fixtureTrigger(overrides: Partial<TriggerOutput> = {}): TriggerOutput {
  return {
    verdict: 'FIRE_LONG',
    direction: 'LONG',
    reasonKey: 'FIRE_LONG',
    reason:
      'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.',
    gates: { timing: true, purge: true, displacement: true },
    entryFvg: fixtureEntryFvg(),
    inputs: { judas: null, amd: null, smt: null },
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
    asOf: AS_OF,
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

function fixtureStale(
  overrides: Partial<FatalFlawInput['stale']> = {},
): FatalFlawInput['stale'] {
  return { nq: false, es: false, nq1h: false, nq15m: false, ...overrides };
}

function fixtureSmt(): SmtOutput {
  return {
    suppressed: false,
    direction: 'BULLISH',
    sweeperLeg: 'NQ',
    nqWindow: null,
    esWindow: null,
    bpsGap: 30,
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

function fixtureInput(overrides: Partial<TicketInput> = {}): TicketInput {
  return {
    trigger: fixtureTrigger(),
    flaw: fixtureCleanFlaw(),
    levels: fixtureLevels(),
    range: fixtureRange(),
    dol: fixtureDol(),
    asia: fixtureAsia(),
    riskPct: 1,
    asOf: AS_OF,
    ...overrides,
  };
}

// Flaw-first routing mirrors selectTicket order: every stale cell calls
// checkFatalFlaw first, then computeTicket with the returned flaw plus a
// caller-built degraded envelope naming the injected leg. Stale flags are
// never passed directly into computeTicket — pure computeTicket carries
// staleness only inside flaw and degraded.
function ticketForFlaw(flaw: FatalFlawOutput, degraded: TicketDegraded) {
  return computeTicket(fixtureInput({ flaw, degraded }));
}

describe('stale-drill: single stale leg flaw-first to STAND_ASIDE', () => {
  it('routes stale-es through HARD STALE_LEG to STAND_ASIDE with es provenance', () => {
    const trigger = fixtureTrigger();
    const flaw = checkFatalFlaw({
      trigger,
      smt: fixtureSmt(),
      judas: fixtureJudas(),
      rollover: null,
      stale: fixtureStale({ es: true }),
      asOf: AS_OF,
    });
    expect(flaw.invalidated).toBe(true);
    expect(flaw.downgraded).toBe(false);
    expect(flaw.flawClass).toBe('HARD');
    expect(flaw.reasonKey).toBe('STALE_LEG');
    expect(flaw.unblock.length).toBeGreaterThan(0);

    const ticket = ticketForFlaw(flaw, { stale: true, thin: false, leg: 'es' });
    expect(ticket.verdict).toBe('STAND_ASIDE');
    expect(ticket.reason).toBe(REASON_BY_KEY.STALE_LEG);
    expect(ticket.degraded).toEqual({ stale: true, thin: false, leg: 'es' });
  });
});
