import { describe, expect, it } from 'vitest';
import { DOL_HIGH_NAME } from '@/src/lib/ict/dol';
import type { FvgGap } from '@/src/lib/ict/fvg';
import type { TriggerOutput } from '@/src/lib/ict/trigger';
import type { FatalFlawOutput } from '@/src/lib/ict/invalidation';
import type { LevelsOutput } from '@/src/lib/ict/levels';
import type { AsiaRange } from '@/src/lib/ict/asia';
import type { DealingRange, DOLTarget } from '@/src/lib/ict/types';
import { REASON_BY_KEY } from '@/src/lib/ict/invalidation';
import { computeTicket, NQ_POINT_VALUE, PAPER_EQUITY_USD, TICKET_RR_MIN, type TicketInput } from '@/src/lib/ticket';

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

describe('ticket: R-R TP1 gate plus sizing plus refusal table', () => {
  it('TP1 R exactly 3.0 passes to EXECUTE when all else clean', () => {
    // Entry 20097.5, stop 12.5 → TP1 37.5 above entry hits R exactly 3.0.
    const out = computeTicket(fixtureInput({ asia: fixtureAsia({ high: 20135 }) }));
    expect(out.verdict).toBe('EXECUTE_LONG');
    expect(out.rr).toBe(3);
    expect(out.tp.tp1).toBe(20135);
  });

  it('TP1 R 2.99 yields STAND ASIDE with the computed ratio in R-R 1 to X form', () => {
    // TP1 37.375 above entry → R 2.99, one tick below the floor.
    const out = computeTicket(fixtureInput({ asia: fixtureAsia({ high: 20134.875 }) }));
    expect(out.verdict).toBe('STAND_ASIDE');
    expect(out.reason).toBe('R/R 1:3.0 — EXECUTE bloklandı.');
  });

  it('zero stop distance yields STAND ASIDE refusal with null sizeContracts, never NaN', () => {
    // Hairline entry-FVG (top exceeds bottom by 1e-9, inside the finite-gap
    // guards) with Asia low above the gap: SL clamps to the gap bottom and
    // the stop falls below the epsilon floor.
    const hairline = fixtureEntryFvg({ top: 20090.000000001, bottom: 20090 });
    const out = computeTicket(
      fixtureInput({
        trigger: fixtureTrigger({ entryFvg: hairline }),
        levels: fixtureLevels({ bullOTE: { lo: 20062.5, hi: 20105 } }),
        asia: fixtureAsia({ high: 20210, low: 20100 }),
      }),
    );
    expect(out.verdict).toBe('STAND_ASIDE');
    expect(out.reason).toBe('STAND ASIDE: stop məsafəsi sıfırdır — ölçü hesablanmadı.');
    expect(out.sizeContracts).toBeNull();
    expect(out.rr).toBeNull();
  });

  it('missing entry or SL null yields STAND ASIDE refusal with reason', () => {
    // BEARISH gap against a LONG trigger: wrong polarity, entry unresolvable.
    const out = computeTicket(
      fixtureInput({ trigger: fixtureTrigger({ entryFvg: fixtureEntryFvg({ polarity: 'BEARISH' }) }) }),
    );
    expect(out.verdict).toBe('STAND_ASIDE');
    expect(out.reason).toBe('STAND ASIDE: giriş həll edilmədi — OTE cibı ilə giriş FVG kəsişmir.');
    expect(out.sizeContracts).toBeNull();
  });

  it('non-finite riskPct yields a boundary throw with a got message', () => {
    expect(() => computeTicket(fixtureInput({ riskPct: NaN }))).toThrow(
      /computeTicket requires a finite riskPct in 0\.1 to 5, got NaN/,
    );
    expect(() => computeTicket(fixtureInput({ riskPct: 10 }))).toThrow(
      /computeTicket requires a finite riskPct in 0\.1 to 5, got 10/,
    );
  });

  it('unresolvable TP2 or TP3 omitted as null while TP1 still gates, never a synthesized filler', () => {
    // DOL pool and range edge below entry on a LONG: TP2/TP3 unresolvable.
    const out = computeTicket(
      fixtureInput({ dol: fixtureDol({ price: 20000 }), range: fixtureRange({ high: 20050 }) }),
    );
    expect(out.verdict).toBe('EXECUTE_LONG');
    expect(out.tp.tp1).toBe(20210);
    expect(out.tp.tp2).toBeNull();
    expect(out.tp.tp3).toBeNull();
    expect(out.rMultiples.tp1).toBe(9);
    expect(out.rMultiples.tp2).toBeNull();
    expect(out.rMultiples.tp3).toBeNull();
  });

  it('QUIET trigger and ARMED trigger each yield STAND ASIDE with that gate verbatim reason', () => {
    const quiet = computeTicket(
      fixtureInput({
        trigger: fixtureTrigger({ verdict: 'WAIT_FOR_MANIPULATION', direction: null, reasonKey: 'WAIT_FOR_MANIPULATION' }),
      }),
    );
    expect(quiet.verdict).toBe('STAND_ASIDE');
    expect(quiet.reason).toBe('STAND ASIDE: WHY NOW atəşi yoxdur — giriş şərti ödənilməyib.');

    const armed = computeTicket(
      fixtureInput({
        trigger: fixtureTrigger({ verdict: 'ARMED', direction: null, reasonKey: 'ARMED_MISSING_TIMING' }),
      }),
    );
    expect(armed.verdict).toBe('STAND_ASIDE');
    expect(armed.reason).toBe('STAND ASIDE: WHY NOW atəşi yoxdur — giriş şərti ödənilməyib.');
  });

  it('pins TICKET_RR_MIN plus PAPER_EQUITY_USD plus NQ_POINT_VALUE', () => {
    expect(TICKET_RR_MIN).toBe(3);
    expect(PAPER_EQUITY_USD).toBe(25000);
    expect(NQ_POINT_VALUE).toBe(20);
  });
});
