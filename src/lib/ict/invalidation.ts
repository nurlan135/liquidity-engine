import type { TriggerOutput, TriggerReasonKey } from '@/src/lib/ict/trigger';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { RolloverFlag } from '@/src/lib/ict/types';

// ICT-16 (D-01/D-02/D-03/D-04/D-05/D-06/D-07/D-12/D-15): fatal-flaw
// invalidation AFTER the WHY NOW trigger on the exact same snapshot.
// First-match-wins disjunction: HARD rollover-week corruption kills from any
// state, HARD stale leg kills from any state, SOFT SMT suppression and SOFT
// confirmed opposite-direction sweep downgrade FIRING to ARMED only (SOFT
// never touches QUIET/ARMED/WAIT). INVALIDATED supersedes FIRING
// deterministically by function order — no timestamp racing, no second poll.
// Closed-candle confirmation (D-03) is inherited from the consumed confirmed
// and suppressed flags; a single closed candle suffices, no N-close depth.
// Pure: caller-supplied trigger plus smt plus judas plus rollover plus stale
// envelopes plus an injected asOf epoch only — no clock reads, no store
// imports, no candle arrays.

export type FlawClass = 'HARD' | 'SOFT';

export type FlawReasonKey =
  | 'ROLLOVER_WEEK'
  | 'STALE_LEG'
  | 'SMT_SUPPRESSED'
  | 'OPPOSITE_SWEEP'
  | 'NONE';

export interface FatalFlawInput {
  /** The exact trigger snapshot object this flaw judges — votes via verdict/direction/reasonKey. */
  trigger: TriggerOutput;
  /** SMT envelope — votes only when suppressed is strictly true (SOFT downgrade); null means no vote. */
  smt: SmtOutput | null;
  /** Judas envelope — votes only when a confirmed sweep disagrees with trigger direction (SOFT downgrade); null means no vote. */
  judas: JudasOutput | null;
  /** Rollover flag — votes only when rolloverSuspect is strictly true (HARD kill); null means no vote. */
  rollover: RolloverFlag | null;
  /** Per-leg freshness booleans from the poll layer — any true leg votes HARD kill; never age math here. */
  stale: { nq: boolean; es: boolean; nq1h: boolean; nq15m: boolean };
  /** Injected evaluation instant in UTC epoch seconds — never a clock read. */
  asOf: number;
}

export interface FatalFlawOutput {
  /** HARD kill — the setup is dead from any state. Mutually exclusive with downgraded. */
  invalidated: boolean;
  /** SOFT FIRING-to-ARMED downgrade — wait, not abandon. Mutually exclusive with invalidated. */
  downgraded: boolean;
  /** HARD or SOFT class of the applied flaw; null when clean. Phase 17 styles HARD vs SOFT distinctly. */
  flawClass: FlawClass | null;
  /** Specific flaw key; NONE when clean. The banned generic single-word label never appears. */
  reasonKey: FlawReasonKey;
  /** Verbatim Azerbaijani reason, test-pinned with toBe — never interpolated. */
  reason: string;
  /** Per-flaw re-arm condition (D-13); fixed template, empty when clean. */
  unblock: string;
  /** Falsifiable §6 sentence (D-08 tracer minimum: neutral fallback; full table in 16-02). */
  sentence: string;
  /** §6 challenge question (D-09 tracer minimum: standing caution; full bank in 16-02). */
  challenge: string;
  /** The trigger reasonKey the SOFT downgrade resumes from (D-15); null unless downgraded. */
  carriedArmedReason: TriggerReasonKey | null;
  /** Carried for Phase 18 replay reconstruction. */
  asOf: number;
}

// D-04 verbatim Azerbaijani reasons (tracer minimum): one base sentence per
// non-NONE key, each naming its class. No number or price interpolation, no
// banned vocabulary, never the bare generic label.
const REASON_ROLLOVER_WEEK =
  'FATAL FLAW (HARD): Rollover həftəsi korrupsiyası — boşluq müqavilə-roll artefaktı ola bilər, quraşdırma ləğv edildi.';
const REASON_STALE_LEG =
  'FATAL FLAW (HARD): Köhnə ayaq — məlumat təzə deyil, quraşdırma ləğv edildi.';
const REASON_SMT_SUPPRESSED =
  'FATAL FLAW (SOFT): SMT yatırılıb, korrelyasiya qırılıb — FIRING ARMED-ə endirildi.';
const REASON_OPPOSITE_SWEEP =
  'FATAL FLAW (SOFT): Əks istiqamətdə təsdiqlənmiş süpürmə — FIRING ARMED-ə endirildi.';

const REASON_BY_KEY: Record<Exclude<FlawReasonKey, 'NONE'>, string> = {
  ROLLOVER_WEEK: REASON_ROLLOVER_WEEK,
  STALE_LEG: REASON_STALE_LEG,
  SMT_SUPPRESSED: REASON_SMT_SUPPRESSED,
  OPPOSITE_SWEEP: REASON_OPPOSITE_SWEEP,
};

// D-13 per-flaw re-arm conditions: fixed templates. The SMT unblock names the
// fixed "0.70" threshold string (CORR_MIN reuse) — never the live corr value.
const UNBLOCK_BY_KEY: Record<Exclude<FlawReasonKey, 'NONE'>, string> = {
  ROLLOVER_WEEK: 'Yenidən aktivləşmə: rollover həftəsi bitdikdən sonra yeni quraşdırma gözlənilir.',
  STALE_LEG: 'Yenidən aktivləşmə: bütün ayaqlar təzələndikdən sonra yeni quraşdırma gözlənilir.',
  SMT_SUPPRESSED: 'Yenidən aktivləşmə: korrelyasiya 0.70-dən yuxarı bərpa olunarsa.',
  OPPOSITE_SWEEP: 'Yenidən aktivləşmə: istiqamətdə yeni təsdiqlənmiş süpürmə gözlənilir.',
};

// D-08/D-09 tracer minimum (full 4-cell sentence table plus challenge bank
// land in 16-02): one neutral fallback sentence plus one standing caution.
const SENTENCE_FALLBACK =
  'Yanlışlanma şərti: qiymət quraşdırma istiqamətində displacement ilə davam edərsə, bu hökm yanlışdır.';
const CHALLENGE_STANDING =
  'Çətin sual: bu quraşdırmanı indi əngəlləyən əsas tələ hansıdır?';

// trigger.ts assertValidJudas/assertValidFvg precedent: malformed envelopes
// fail at the boundary with got-string errors. Null degrades honestly
// downstream — never throws here.
function assertValidTrigger(trigger: FatalFlawInput['trigger']): void {
  if (trigger === null || trigger === undefined || typeof trigger !== 'object' || Array.isArray(trigger)) {
    throw new Error(`checkFatalFlaw requires a TriggerOutput object, got ${String(trigger)}`);
  }
  const t = trigger as TriggerOutput;
  if (
    t.verdict !== 'FIRE_LONG' &&
    t.verdict !== 'FIRE_SHORT' &&
    t.verdict !== 'ARMED' &&
    t.verdict !== 'WAIT_FOR_MANIPULATION'
  ) {
    throw new Error(`checkFatalFlaw requires a valid trigger verdict, got ${String(t.verdict)}`);
  }
  if (t.direction !== 'LONG' && t.direction !== 'SHORT' && t.direction !== null && t.direction !== undefined) {
    throw new Error(`checkFatalFlaw requires trigger direction LONG, SHORT, or null, got ${String(t.direction)}`);
  }
  if (typeof t.reasonKey !== 'string' || typeof t.reason !== 'string') {
    throw new Error(
      `checkFatalFlaw requires string trigger reasonKey/reason, got reasonKey=${String(t.reasonKey)} reason=${String(t.reason)}`,
    );
  }
}

function assertValidSmt(smt: FatalFlawInput['smt']): void {
  if (smt === null || smt === undefined) {
    return;
  }
  if (typeof smt !== 'object' || Array.isArray(smt)) {
    throw new Error(`checkFatalFlaw requires an SmtOutput object or null, got ${String(smt)}`);
  }
  if (typeof (smt as SmtOutput).suppressed !== 'boolean') {
    throw new Error(
      `checkFatalFlaw requires a boolean smt suppressed, got ${String((smt as SmtOutput).suppressed)}`,
    );
  }
}

function assertValidJudas(judas: FatalFlawInput['judas']): void {
  if (judas === null || judas === undefined) {
    return;
  }
  if (typeof judas !== 'object' || Array.isArray(judas)) {
    throw new Error(`checkFatalFlaw requires a JudasOutput object or null, got ${String(judas)}`);
  }
  const j = judas as JudasOutput;
  if (typeof j.confirmed !== 'boolean') {
    throw new Error(`checkFatalFlaw requires a boolean judas confirmed, got ${String(j.confirmed)}`);
  }
  if (j.sweepSide !== null && j.sweepSide !== undefined && j.sweepSide !== 'HIGH' && j.sweepSide !== 'LOW') {
    throw new Error(`checkFatalFlaw requires judas sweepSide HIGH, LOW, or null, got ${String(j.sweepSide)}`);
  }
}

function assertValidRollover(rollover: FatalFlawInput['rollover']): void {
  if (rollover === null || rollover === undefined) {
    return;
  }
  if (typeof rollover !== 'object' || Array.isArray(rollover)) {
    throw new Error(`checkFatalFlaw requires a RolloverFlag object or null, got ${String(rollover)}`);
  }
  if (typeof (rollover as RolloverFlag).rolloverSuspect !== 'boolean') {
    throw new Error(
      `checkFatalFlaw requires a boolean rollover rolloverSuspect, got ${String((rollover as RolloverFlag).rolloverSuspect)}`,
    );
  }
}

function assertValidStale(stale: FatalFlawInput['stale']): void {
  if (stale === null || stale === undefined || typeof stale !== 'object' || Array.isArray(stale)) {
    throw new Error(`checkFatalFlaw requires a stale leg object, got ${String(stale)}`);
  }
  const s = stale as FatalFlawInput['stale'];
  for (const leg of ['nq', 'es', 'nq1h', 'nq15m'] as const) {
    if (typeof s[leg] !== 'boolean') {
      throw new Error(`checkFatalFlaw requires boolean stale legs, got ${leg}=${String(s[leg])}`);
    }
  }
}

// trigger.ts directionOf precedent: direction is a total function of
// sweepSide alone — HIGH implies SHORT, LOW implies LONG, null implies none.
function impliedDirection(sweepSide: JudasOutput['sweepSide'] | null | undefined): 'LONG' | 'SHORT' | null {
  if (sweepSide === 'HIGH') return 'SHORT';
  if (sweepSide === 'LOW') return 'LONG';
  return null;
}

function isFiring(trigger: FatalFlawInput['trigger']): boolean {
  return trigger.verdict === 'FIRE_LONG' || trigger.verdict === 'FIRE_SHORT';
}

function isOppositeSweep(trigger: FatalFlawInput['trigger'], judas: FatalFlawInput['judas']): boolean {
  if (judas === null || judas === undefined) return false;
  if (judas.confirmed !== true) return false;
  const implied = impliedDirection(judas.sweepSide);
  if (implied === null) return false;
  if (trigger.direction === null || trigger.direction === undefined) return false;
  return trigger.direction !== implied;
}

function cleanOutput(trigger: FatalFlawInput['trigger'], asOf: number): FatalFlawOutput {
  return {
    invalidated: false,
    downgraded: false,
    flawClass: null,
    reasonKey: 'NONE',
    reason: trigger.reason,
    unblock: '',
    sentence: SENTENCE_FALLBACK,
    challenge: CHALLENGE_STANDING,
    carriedArmedReason: null,
    asOf,
  };
}

function flawOutput(
  reasonKey: Exclude<FlawReasonKey, 'NONE'>,
  flawClass: FlawClass,
  invalidated: boolean,
  downgraded: boolean,
  carriedArmedReason: TriggerReasonKey | null,
  asOf: number,
): FatalFlawOutput {
  return {
    invalidated,
    downgraded,
    flawClass,
    reasonKey,
    reason: REASON_BY_KEY[reasonKey],
    unblock: UNBLOCK_BY_KEY[reasonKey],
    sentence: SENTENCE_FALLBACK,
    challenge: CHALLENGE_STANDING,
    carriedArmedReason,
    asOf,
  };
}

export function checkFatalFlaw(input: FatalFlawInput): FatalFlawOutput {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`checkFatalFlaw requires an input object, got ${String(input)}`);
  }
  const { trigger, smt, judas, rollover, stale, asOf } = input;
  if (!Number.isFinite(asOf) || (asOf as number) <= 0) {
    throw new Error(`checkFatalFlaw requires a finite positive asOf epoch, got ${String(asOf)}`);
  }
  assertValidTrigger(trigger);
  assertValidSmt(smt);
  assertValidJudas(judas);
  assertValidRollover(rollover);
  assertValidStale(stale);
  const epoch = asOf as number;

  // First-match-wins disjunction (D-01/D-02): HARD rollover, HARD stale,
  // SOFT SMT, SOFT opposite-sweep, then clean. Order IS the precedence —
  // HARD always beats SOFT on identical inputs.
  if (rollover !== null && rollover !== undefined && rollover.rolloverSuspect === true) {
    return flawOutput('ROLLOVER_WEEK', 'HARD', true, false, null, epoch);
  }
  if (stale.nq === true || stale.es === true || stale.nq1h === true || stale.nq15m === true) {
    return flawOutput('STALE_LEG', 'HARD', true, false, null, epoch);
  }
  // SOFT branches gate on FIRING only (D-12): on ARMED/WAIT the trigger
  // verdict stands and the flaw is noted but not applied.
  if (smt !== null && smt !== undefined && smt.suppressed === true) {
    if (!isFiring(trigger)) {
      return cleanOutput(trigger, epoch);
    }
    return flawOutput('SMT_SUPPRESSED', 'SOFT', false, true, trigger.reasonKey, epoch);
  }
  if (isOppositeSweep(trigger, judas)) {
    if (!isFiring(trigger)) {
      return cleanOutput(trigger, epoch);
    }
    return flawOutput('OPPOSITE_SWEEP', 'SOFT', false, true, trigger.reasonKey, epoch);
  }
  return cleanOutput(trigger, epoch);
}
