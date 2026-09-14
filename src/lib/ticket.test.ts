import { describe, expect, it } from 'vitest';
import { DOL_HIGH_NAME } from '@/src/lib/ict/dol';
import type { FvgGap } from '@/src/lib/ict/fvg';
import type { TriggerOutput } from '@/src/lib/ict/trigger';
import type { FatalFlawOutput } from '@/src/lib/ict/invalidation';
import type { LevelsOutput } from '@/src/lib/ict/levels';
import type { AsiaRange } from '@/src/lib/ict/asia';
import type { DealingRange, DOLTarget } from '@/src/lib/ict/types';
import { REASON_BY_KEY } from '@/src/lib/ict/invalidation';
import { computeTicket, type TicketInput } from '@/src/lib/ticket';

const AS_OF = 1770500000;

// Tracer fixture: FIRE_LONG + clean flaw + resolvable structure.
// Range 20260/20010 (width 250) → bullOTE [20062.5, 20105]; BULLISH gap
// [20090, 20120] ∩ bullOTE = [20090, 20105] → entry 20097.5; SL =
// min(20090, asiaLow 20085) = 20085 → stop 12.5; TP1 = asiaHigh 20210 →
// RR 112.5/12.5 = 9 ≥ 3; TP2/TP3 = range high 20260; size = floor(250/250) = 1.
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

describe('ticket: tracer EXECUTE_LONG happy path', () => {
  it('FIRE_LONG plus clean flaw plus resolvable structure yields EXECUTE_LONG', () => {
    const out = computeTicket(fixtureInput());
    expect(out.verdict).toBe('EXECUTE_LONG');
    expect(out.direction).toBe('LONG');
    expect(out.entry).toBe(20097.5);
    expect(out.sl).toBe(20085);
    expect(out.tp.tp1).toBe(20210);
    expect(out.tp.tp2).toBe(20260);
    expect(out.tp.tp3).toBe(20260);
    expect(out.rr).toBe(9);
    expect(out.sizeContracts).toBe(1);
    expect(out.reason).toBe('EXECUTE LONG: giriş, stop və TP pilləsi həll edildi — R/R şərti ödənilir.');
    expect(out.asOf).toBe(AS_OF);
    for (const v of [out.entry, out.sl, out.tp.tp1, out.rr, out.sizeContracts]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(out.rr as number).toBeGreaterThanOrEqual(3);
  });

  it('malformed trigger envelope throws with a got message', () => {
    expect(() => computeTicket(fixtureInput({ trigger: 'FIRE_LONG' as unknown as TriggerOutput }))).toThrow(
      /computeTicket requires a TriggerOutput object or null, got FIRE_LONG/,
    );
  });

  it('null trigger yields STAND ASIDE, never null', () => {
    const out = computeTicket(fixtureInput({ trigger: null }));
    expect(out).not.toBeNull();
    expect(out.verdict).toBe('STAND_ASIDE');
    expect(typeof out.reason).toBe('string');
    expect(out.reason.length).toBeGreaterThan(0);
  });
});
