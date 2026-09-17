import type { TriggerOutput } from '@/src/lib/ict/trigger';
import type { FatalFlawOutput } from '@/src/lib/ict/invalidation';
import type { LevelsOutput } from '@/src/lib/ict/levels';
import type { FvgGap } from '@/src/lib/ict/fvg';
import type { AsiaRange } from '@/src/lib/ict/asia';
import type { DealingRange, DOLTarget } from '@/src/lib/ict/types';
import { TOL_EPS } from '@/src/lib/ict/judas';

// ICT-17 (D-01/D-02/D-03/D-04): paper order-ticket brokerage math — entry,
// stop, TP ladder, R/R gate, verdict, size in NQ contracts. Brokerage math,
// never ICT methodology: lives beside confluence.ts, never inside src/lib/ict,
// so ict purity holds. Pure: injected asOf, no store imports, no Date.now —
// deterministic for Phase 18 replay. Fixed derivation order: direction from
// FIRE verdict → OTE×FVG entry → invalidation SL → structure-first TP ladder
// → R/R gate on TP1 only → EXECUTE or STAND ASIDE. Every gate fail returns
// STAND ASIDE with a verbatim reason, never null; malformed envelopes throw
// with got-string errors at the boundary (trigger.ts assertValid precedent).

/** R/R floor gating EXECUTE — TP1 must cover risk threefold (D-03). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-14, unobserved live. Authority: R/R Min 1:3 (institutional_rules.md Modul 4).
export const TICKET_RR_MIN = 3;
/** Paper equity funding the risk-% → contracts conversion (OQ-1 lock). */
// CALIBRATION-PROVISIONAL [ASSUMED]: fixed $25,000 paper account — shown on the panel so screenshots teach the math.
export const PAPER_EQUITY_USD = 25000;
/** NQ futures point value in USD per point (OQ-1 lock). */
// [ASSUMED]: standard NQ spec — exported so a wrong assumption is one constant away from correction.
export const NQ_POINT_VALUE = 20;
/** Operator risk-% acceptance band: setters clamp here, computeTicket throws outside (D-07). */
export const RISK_PCT_MIN = 0.1;
export const RISK_PCT_MAX = 5;
/** Stop distances at or below this are degenerate — refused, never sized. */
const STOP_EPS = 1e-6;

export type TicketVerdict = 'EXECUTE_LONG' | 'EXECUTE_SHORT' | 'STAND_ASIDE';

export type TicketDirection = 'LONG' | 'SHORT' | null;

export interface TicketDegraded {
  stale: boolean;
  thin: boolean;
  leg: string | null;
}

export interface TicketOutput {
  verdict: TicketVerdict;
  direction: TicketDirection;
  entry: number | null;
  sl: number | null;
  tp: { tp1: number | null; tp2: number | null; tp3: number | null };
  rMultiples: { tp1: number | null; tp2: number | null; tp3: number | null };
  /** The gated ratio (TP1 distance over stop distance), named in the R/R-fail reason. */
  rr: number | null;
  /** Verbatim Azerbaijani reason, test-pinned with toBe — never interpolated except the R/R ratio. */
  reason: string;
  /** Whole NQ contracts from risk ÷ stop-distance; null on any sizing refusal. */
  sizeContracts: number | null;
  degraded: TicketDegraded;
  /** Carried for Phase 18 replay reconstruction. */
  asOf: number;
}

export interface TicketInput {
  /** Consumed directly — never re-derived (direction, entryFvg handle). */
  trigger: TriggerOutput | null;
  /** Consumed directly — flaw supersedes ticket by function order (D-04). */
  flaw: FatalFlawOutput | null;
  levels: LevelsOutput | null;
  range: DealingRange | null;
  dol: DOLTarget | null;
  asia: AsiaRange | null;
  /** Operator risk % — validated and refused (never clamped-to-fake) downstream. */
  riskPct: number;
  /** Degraded provenance carried through so panels dim with the naming leg. */
  degraded?: TicketDegraded;
  /** Injected evaluation instant in UTC epoch seconds — never a clock read. */
  asOf: number;
}

// Verbatim Azerbaijani gate-fail reasons: one const per gate, test-pinned
// with toBe, never interpolated (sole exception: the R/R-fail ratio).
const REASON_NULL_INPUT = 'STAND ASIDE: giriş məlumatı natamamdır — bilet qurulmadı.';
const REASON_NOT_FIRE = 'STAND ASIDE: WHY NOW atəşi yoxdur — giriş şərti ödənilməyib.';
const REASON_ENTRY = 'STAND ASIDE: giriş həll edilmədi — OTE cibı ilə giriş FVG kəsişmir.';
const REASON_SL = 'STAND ASIDE: stop həll edilmədi — struktur səviyyə çatışmır.';
const REASON_TP = 'STAND ASIDE: hədəf pilləsi həll edilmədi — qarşı likvidlik tapılmadı.';
const REASON_STOP = 'STAND ASIDE: stop məsafəsi sıfırdır — ölçü hesablanmadı.';
const REASON_SIZE = 'STAND ASIDE: ölçü həll edilmədi — risk və stop məsafəsi çatışmır.';
const REASON_EXECUTE_LONG = 'EXECUTE LONG: giriş, stop və TP pilləsi həll edildi — R/R şərti ödənilir.';
const REASON_EXECUTE_SHORT = 'EXECUTE SHORT: giriş, stop və TP pilləsi həll edildi — R/R şərti ödənilir.';

const CLEAN_DEGRADED: TicketDegraded = { stale: false, thin: false, leg: null };

function standAside(reason: string, asOf: number, degraded: TicketDegraded): TicketOutput {
  return {
    verdict: 'STAND_ASIDE',
    direction: null,
    entry: null,
    sl: null,
    tp: { tp1: null, tp2: null, tp3: null },
    rMultiples: { tp1: null, tp2: null, tp3: null },
    rr: null,
    reason,
    sizeContracts: null,
    degraded: { ...degraded },
    asOf,
  };
}

// trigger.ts assertValidJudas/assertValidFvg precedent: malformed envelopes
// fail at the boundary with got-string errors. Null degrades to honest
// STAND ASIDE downstream — never throws here.
function assertValidTrigger(trigger: TicketInput['trigger']): void {
  if (trigger === null || trigger === undefined) return;
  if (typeof trigger !== 'object' || Array.isArray(trigger)) {
    throw new Error(`computeTicket requires a TriggerOutput object or null, got ${String(trigger)}`);
  }
  const t = trigger as TriggerOutput;
  if (t.verdict !== 'FIRE_LONG' && t.verdict !== 'FIRE_SHORT' && t.verdict !== 'ARMED' && t.verdict !== 'WAIT_FOR_MANIPULATION') {
    throw new Error(`computeTicket requires a valid trigger verdict, got ${String(t.verdict)}`);
  }
  if (t.direction !== 'LONG' && t.direction !== 'SHORT' && t.direction !== null && t.direction !== undefined) {
    throw new Error(`computeTicket requires trigger direction LONG, SHORT, or null, got ${String(t.direction)}`);
  }
  if (typeof t.reasonKey !== 'string' || typeof t.reason !== 'string') {
    throw new Error(
      `computeTicket requires string trigger reasonKey/reason, got reasonKey=${String(t.reasonKey)} reason=${String(t.reason)}`,
    );
  }
  if (t.entryFvg !== null && t.entryFvg !== undefined) {
    assertValidFvgGap(t.entryFvg);
  }
}

function assertValidFvgGap(gap: FvgGap): void {
  if (typeof gap !== 'object' || Array.isArray(gap)) {
    throw new Error(`computeTicket requires FvgGap objects, got ${String(gap)}`);
  }
  const g = gap as FvgGap;
  if (!Number.isFinite(g.top) || !Number.isFinite(g.bottom)) {
    throw new Error(`computeTicket requires finite gap bounds, got top=${String(g.top)} bottom=${String(g.bottom)}`);
  }
  if (g.polarity !== 'BULLISH' && g.polarity !== 'BEARISH') {
    throw new Error(`computeTicket requires gap polarity BULLISH or BEARISH, got ${String(g.polarity)}`);
  }
}

function assertValidFlaw(flaw: TicketInput['flaw']): void {
  if (flaw === null || flaw === undefined) return;
  if (typeof flaw !== 'object' || Array.isArray(flaw)) {
    throw new Error(`computeTicket requires a FatalFlawOutput object or null, got ${String(flaw)}`);
  }
  const f = flaw as FatalFlawOutput;
  if (typeof f.invalidated !== 'boolean' || typeof f.downgraded !== 'boolean') {
    throw new Error(
      `computeTicket requires boolean flaw invalidated/downgraded, got invalidated=${String(f.invalidated)} downgraded=${String(f.downgraded)}`,
    );
  }
  if (typeof f.reason !== 'string') {
    throw new Error(`computeTicket requires a string flaw reason, got ${String(f.reason)}`);
  }
  if (f.carriedArmedReason !== null && f.carriedArmedReason !== undefined && typeof f.carriedArmedReason !== 'string') {
    throw new Error(
      `computeTicket requires flaw carriedArmedReason string or null, got ${String(f.carriedArmedReason)}`,
    );
  }
}

function assertValidLevels(levels: TicketInput['levels']): void {
  if (levels === null || levels === undefined) return;
  if (typeof levels !== 'object' || Array.isArray(levels)) {
    throw new Error(`computeTicket requires a LevelsOutput object or null, got ${String(levels)}`);
  }
  const l = levels as LevelsOutput;
  for (const key of ['bullOTE', 'bearOTE'] as const) {
    const pocket = l[key];
    if (pocket === null || pocket === undefined || typeof pocket !== 'object') {
      throw new Error(`computeTicket requires finite levels ${key}, got ${String(pocket)}`);
    }
    if (!Number.isFinite(pocket.lo) || !Number.isFinite(pocket.hi)) {
      throw new Error(
        `computeTicket requires finite levels ${key} bounds, got lo=${String(pocket.lo)} hi=${String(pocket.hi)}`,
      );
    }
  }
}

function assertValidRange(range: TicketInput['range']): void {
  if (range === null || range === undefined) return;
  if (typeof range !== 'object' || Array.isArray(range)) {
    throw new Error(`computeTicket requires a DealingRange object or null, got ${String(range)}`);
  }
  const r = range as DealingRange;
  if (!Number.isFinite(r.high) || !Number.isFinite(r.low)) {
    throw new Error(`computeTicket requires finite range high/low, got high=${String(r.high)} low=${String(r.low)}`);
  }
}

function assertValidDol(dol: TicketInput['dol']): void {
  if (dol === null || dol === undefined) return;
  if (typeof dol !== 'object' || Array.isArray(dol)) {
    throw new Error(`computeTicket requires a DOLTarget object or null, got ${String(dol)}`);
  }
  if (!Number.isFinite((dol as DOLTarget).price)) {
    throw new Error(`computeTicket requires a finite dol price, got ${String((dol as DOLTarget).price)}`);
  }
}

function assertValidAsia(asia: TicketInput['asia']): void {
  if (asia === null || asia === undefined) return;
  if (typeof asia !== 'object' || Array.isArray(asia)) {
    throw new Error(`computeTicket requires an AsiaRange object or null, got ${String(asia)}`);
  }
  const a = asia as AsiaRange;
  if (!Number.isFinite(a.high) || !Number.isFinite(a.low)) {
    throw new Error(`computeTicket requires finite asia high/low, got high=${String(a.high)} low=${String(a.low)}`);
  }
}

// trigger.ts directionOf precedent: direction is a total function of the
// FIRE verdict — FIRE_LONG implies LONG, FIRE_SHORT implies SHORT, anything
// else implies none (STAND ASIDE downstream, never a throw).
function directionOf(trigger: TriggerOutput): TicketDirection {
  if (trigger.verdict === 'FIRE_LONG') return 'LONG';
  if (trigger.verdict === 'FIRE_SHORT') return 'SHORT';
  return null;
}

// Entry is the OTE pocket ∩ entry-FVG overlap midpoint: LONG resolves the
// bullOTE pocket against a BULLISH gap, SHORT mirrors. No overlap, no handle,
// or wrong polarity refuses with reason — never a midpoint of nothing.
function resolveEntry(direction: 'LONG' | 'SHORT', levels: LevelsOutput, entryFvg: FvgGap | null): number | null {
  if (entryFvg === null || entryFvg === undefined) return null;
  const needPolarity = direction === 'LONG' ? 'BULLISH' : 'BEARISH';
  if (entryFvg.polarity !== needPolarity) return null;
  const pocket = direction === 'LONG' ? levels.bullOTE : levels.bearOTE;
  const lo = Math.max(pocket.lo, entryFvg.bottom);
  const hi = Math.min(pocket.hi, entryFvg.top);
  if (!(hi > lo)) return null;
  return (lo + hi) / 2;
}

function assertValidRiskPct(riskPct: TicketInput['riskPct']): void {
  if (typeof riskPct !== 'number' || !Number.isFinite(riskPct) || riskPct < RISK_PCT_MIN || riskPct > RISK_PCT_MAX) {
    throw new Error(`computeTicket requires a finite riskPct in 0.1 to 5, got ${String(riskPct)}`);
  }
}

// OQ-2 lock: LONG SL is the low that must hold (below entry-FVG bottom and
// Asia low), SHORT mirrors. A stop on the wrong side of entry is degenerate.
// A stop at or below the epsilon floor is degenerate too — sized NaN would
// be false precision, so the caller refuses before any division.
function resolveSL(direction: 'LONG' | 'SHORT', entry: number, entryFvg: FvgGap, asia: AsiaRange): number | null {
  const sl = direction === 'LONG' ? Math.min(entryFvg.bottom, asia.low) : Math.max(entryFvg.top, asia.high);
  if (direction === 'LONG' && !(sl < entry)) return null;
  if (direction === 'SHORT' && !(sl > entry)) return null;
  return sl;
}

// D-01/D-02 structure-first ladder: LONG TP1 is the opposing Asia edge
// (nearest liquidity), TP2 the opposing DOL pool, TP3 the range far edge;
// SHORT mirrors. A leg resolves only beyond entry in trade direction —
// unresolvable legs stay null, never fixed-R fillers.
function resolveTP(
  direction: 'LONG' | 'SHORT',
  entry: number,
  asia: AsiaRange,
  dol: DOLTarget,
  range: DealingRange,
): { tp1: number | null; tp2: number | null; tp3: number | null } {
  if (direction === 'LONG') {
    return {
      tp1: asia.high > entry ? asia.high : null,
      tp2: dol.price > entry ? dol.price : null,
      tp3: range.high > entry ? range.high : null,
    };
  }
  return {
    tp1: asia.low < entry ? asia.low : null,
    tp2: dol.price < entry ? dol.price : null,
    tp3: range.low < entry ? range.low : null,
  };
}

export function computeTicket(input: TicketInput): TicketOutput {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`computeTicket requires an input object, got ${String(input)}`);
  }
  const { trigger, flaw, levels, range, dol, asia, riskPct, asOf } = input;
  if (!Number.isFinite(asOf) || (asOf as number) <= 0) {
    throw new Error(`computeTicket requires a finite positive asOf epoch, got ${String(asOf)}`);
  }
  const epoch = asOf as number;
  const degraded: TicketDegraded = input.degraded ?? { ...CLEAN_DEGRADED };
  assertValidTrigger(trigger);
  assertValidFlaw(flaw);
  assertValidLevels(levels);
  assertValidRange(range);
  assertValidDol(dol);
  assertValidAsia(asia);
  assertValidRiskPct(riskPct);

  // Null envelopes degrade to STAND ASIDE — never a throw on null.
  if (trigger === null || flaw === null || levels === null || range === null || dol === null || asia === null) {
    return standAside(REASON_NULL_INPUT, epoch, degraded);
  }

  // D-04 flaw precedence: an invalidated setup is dead, a downgraded setup
  // waits — the flaw reason (plus the carried ARMED context on SOFT) is the
  // ticket reason, never an EXECUTE.
  if (flaw.invalidated === true) {
    return standAside(flaw.reason, epoch, degraded);
  }
  if (flaw.downgraded === true) {
    const reason =
      flaw.carriedArmedReason === null || flaw.carriedArmedReason === undefined
        ? flaw.reason
        : `${flaw.reason} ARMED-ə qayıdış: ${flaw.carriedArmedReason}.`;
    return standAside(reason, epoch, degraded);
  }

  // Step 1 — direction from the FIRE verdict, else STAND ASIDE.
  const direction = directionOf(trigger);
  if (direction === null) {
    return standAside(REASON_NOT_FIRE, epoch, degraded);
  }

  // Step 2 — entry as OTE pocket ∩ entry-FVG.
  const entry = resolveEntry(direction, levels, trigger.entryFvg);
  if (entry === null) {
    return standAside(REASON_ENTRY, epoch, degraded);
  }

  // Step 3 — SL from the locked OQ-2 rule table.
  const sl = resolveSL(direction, entry, trigger.entryFvg as FvgGap, asia);
  if (sl === null) {
    return standAside(REASON_SL, epoch, degraded);
  }

  // Step 4 — structure-first TP ladder (D-01/D-02): TP1 is the gate leg
  // and must resolve; TP2/TP3 omit as null when unresolvable, reported in
  // rMultiples as null — never synthesized fillers.
  const tp = resolveTP(direction, entry, asia, dol, range);
  if (tp.tp1 === null) {
    return standAside(REASON_TP, epoch, degraded);
  }

  // Step 5 — R/R gate on TP1 only (OQ-3 lock, D-03): the nearest exit must
  // justify risk, direction-aware distances throughout. The fail reason names
  // the computed ratio — the sole sanctioned interpolation.
  const stopDist = Math.abs(entry - sl);
  if (!(stopDist > STOP_EPS)) {
    const stopped = standAside(REASON_STOP, epoch, degraded);
    return stopped;
  }
  const rr = Math.abs((tp.tp1 as number) - entry) / stopDist;
  if (!(rr + TOL_EPS >= TICKET_RR_MIN)) {
    return standAside(`R/R 1:${rr.toFixed(1)} — EXECUTE bloklandı.`, epoch, degraded);
  }
  const rMultiples = {
    tp1: rr,
    tp2: tp.tp2 === null ? null : Math.abs(tp.tp2 - entry) / stopDist,
    tp3: tp.tp3 === null ? null : Math.abs(tp.tp3 - entry) / stopDist,
  };

  // Step 6 — verdict plus sizing: risk ÷ stop-distance in whole NQ contracts
  // from PAPER_EQUITY_USD with an explicit equity override. Entry/SL arrive
  // finite from steps 2–3; riskPct is band-validated at the boundary — the
  // floor refuses only a non-positive contract count, never NaN.
  const equity = PAPER_EQUITY_USD;
  const sizeContracts = Math.floor((equity * (riskPct as number)) / 100 / (stopDist * NQ_POINT_VALUE));
  if (!(Number.isFinite(sizeContracts) && sizeContracts > 0)) {
    return standAside(REASON_SIZE, epoch, degraded);
  }
  const verdict: TicketVerdict = direction === 'LONG' ? 'EXECUTE_LONG' : 'EXECUTE_SHORT';
  return {
    verdict,
    direction,
    entry,
    sl,
    tp: { tp1: tp.tp1, tp2: tp.tp2, tp3: tp.tp3 },
    rMultiples,
    rr,
    reason: direction === 'LONG' ? REASON_EXECUTE_LONG : REASON_EXECUTE_SHORT,
    sizeContracts,
    degraded: { ...degraded },
    asOf: epoch,
  };
}
