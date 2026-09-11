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
  /** Falsifiable §6 sentence (D-08): SENTENCE_BY_KEY 4-cell direction-cross-sweepSide table with neutral fallback. */
  sentence: string;
  /** §6 challenge question (D-09): 3-entry bank with dominant-trap code-order selection. */
  challenge: string;
  /** The trigger reasonKey the SOFT downgrade resumes from (D-15); null unless downgraded. */
  carriedArmedReason: TriggerReasonKey | null;
  /** Carried for Phase 18 replay reconstruction. */
  asOf: number;
}

// D-04 plus D-10 verbatim Azerbaijani reasons (locked, toBe-pinned): one
// base sentence per reasonKey, each naming its class. No number or price
// interpolation, no template-literal placeholders, no banned vocabulary,
// never the bare generic label. NONE documents the clean verdict standing.
const REASON_ROLLOVER_WEEK =
  'FATAL FLAW (HARD): Rollover həftəsi korrupsiyası — kotirovka strukturu etibarsızdır, quraşdırma ləğv edildi.';
const REASON_STALE_LEG =
  'FATAL FLAW (HARD): Ayaq bayatdır — qiymət axını köhnəlib, quraşdırma ləğv edildi.';
const REASON_SMT_SUPPRESSED =
  'FATAL FLAW (SOFT): SMT basdırılıb — korrelyasiya pozulub, atəş ARMED-ə endirildi.';
const REASON_OPPOSITE_SWEEP =
  'FATAL FLAW (SOFT): Əks istiqamətli süpürmə təsdiqləndi — atəş ARMED-ə endirildi.';
const REASON_NONE = 'Qüsur yoxdur: trigger hökmü qüvvədədir.';

export const REASON_BY_KEY: Record<FlawReasonKey, string> = {
  ROLLOVER_WEEK: REASON_ROLLOVER_WEEK,
  STALE_LEG: REASON_STALE_LEG,
  SMT_SUPPRESSED: REASON_SMT_SUPPRESSED,
  OPPOSITE_SWEEP: REASON_OPPOSITE_SWEEP,
  NONE: REASON_NONE,
};

// D-13 per-flaw re-arm conditions: fixed templates. The SMT unblock names the
// fixed "0.70" threshold string (CORR_MIN reuse) — never the live corr value.
// NONE carries the empty string: a clean verdict has nothing to unblock.
export const UNBLOCK_BY_KEY: Record<FlawReasonKey, string> = {
  ROLLOVER_WEEK: 'Blok açılır: növbəti müqavilə həftəsi təmiz kəsir gətirəndə.',
  STALE_LEG: 'Blok açılır: bütün ayaqlar təzə kotirovka göstərəndə.',
  SMT_SUPPRESSED: 'Blok açılır: korrelyasiya 0.70-dən yuxarı bərpa olanda.',
  OPPOSITE_SWEEP: 'Blok açılır: əks süpürmə təsdiqsiz qalıb istiqamət bərpa olunanda.',
  NONE: '',
};

// D-08 falsifiable sentence: 4-cell lookup on trigger.direction crossed with
// judas.sweepSide, resolved purely from the D-05 snapshot — no new row reads.
// LONG-LOW and SHORT-HIGH are the live cells; off-diagonal combinations share
// the neutral fallback, as does any null-side input.
const SENTENCE_LONG_LOW =
  'FALSİFİKASİYA LONG: BSL reydi baş verməyibsə və qiymət premiumda qalırsa, LONG oxunuşu yanlışdır — BSL süpürməsi bu ssenarini təsdiqləyir.';
const SENTENCE_SHORT_HIGH =
  'FALSİFİKASİYA SHORT: SSL reydi baş verməyibsə və qiymət discountda qalırsa, SHORT oxunuşu yanlışdır — SSL süpürməsi bu ssenarini təsdiqləyir.';
export const SENTENCE_FALLBACK =
  'FALSİFİKASİYA: təsdiqlənmiş süpürmə istiqaməti qərəzlə uzlaşmır — əks istiqamətli qapanış bu ssenarini puç edir.';

export const SENTENCE_BY_KEY: Record<string, string> = {
  'LONG-LOW': SENTENCE_LONG_LOW,
  'SHORT-HIGH': SENTENCE_SHORT_HIGH,
  'LONG-HIGH': SENTENCE_FALLBACK,
  'SHORT-LOW': SENTENCE_FALLBACK,
};

function sentenceFor(
  direction: TriggerOutput['direction'],
  sweepSide: JudasOutput['sweepSide'] | null | undefined,
): string {
  if (direction === 'LONG' && sweepSide === 'LOW') return SENTENCE_BY_KEY['LONG-LOW'];
  if (direction === 'SHORT' && sweepSide === 'HIGH') return SENTENCE_BY_KEY['SHORT-HIGH'];
  return SENTENCE_FALLBACK;
}

// D-09 challenge bank: exactly three fixed entries keyed by dominant trap.
// Selection priority is a code-ordering fact (challengeFor below): SMT SOFT
// flaw selects smt-divergence-ignored, else opposite-sweep SOFT flaw selects
// premium-chase, else HARD flaw or clean selects pre-news-engineering as the
// standing caution. No number or price interpolation.
export const CHALLENGE_BY_KEY: Record<string, string> = {
  'premium-chase': 'Sual: premium zonada qovmursanmı — giriş FVG-yə qayıdışı gözlədinmi?',
  'pre-news-engineering': 'Sual: bu hərəkət xəbər-öncəsi mühəndislik deyilmi — təqvim pəncərəsini yoxladınmı?',
  'smt-divergence-ignored':
    'Sual: SMT fərqliliyini görməzdən gəlmirsənmi — korrelyasiya 0.70-i bərpa etməyibsə, niyə indi?',
};

function challengeFor(reasonKey: FlawReasonKey): string {
  if (reasonKey === 'SMT_SUPPRESSED') return CHALLENGE_BY_KEY['smt-divergence-ignored'];
  if (reasonKey === 'OPPOSITE_SWEEP') return CHALLENGE_BY_KEY['premium-chase'];
  return CHALLENGE_BY_KEY['pre-news-engineering'];
}

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

function cleanOutput(trigger: FatalFlawInput['trigger'], judas: FatalFlawInput['judas'], asOf: number): FatalFlawOutput {
  return {
    invalidated: false,
    downgraded: false,
    flawClass: null,
    reasonKey: 'NONE',
    reason: REASON_BY_KEY.NONE,
    unblock: UNBLOCK_BY_KEY.NONE,
    sentence: sentenceFor(trigger.direction, judas?.sweepSide),
    challenge: challengeFor('NONE'),
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
  trigger: FatalFlawInput['trigger'],
  judas: FatalFlawInput['judas'],
  asOf: number,
): FatalFlawOutput {
  return {
    invalidated,
    downgraded,
    flawClass,
    reasonKey,
    reason: REASON_BY_KEY[reasonKey],
    unblock: UNBLOCK_BY_KEY[reasonKey],
    sentence: sentenceFor(trigger.direction, judas?.sweepSide),
    challenge: challengeFor(reasonKey),
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
    return flawOutput('ROLLOVER_WEEK', 'HARD', true, false, null, trigger, judas, epoch);
  }
  if (stale.nq === true || stale.es === true || stale.nq1h === true || stale.nq15m === true) {
    return flawOutput('STALE_LEG', 'HARD', true, false, null, trigger, judas, epoch);
  }
  // SOFT branches gate on FIRING only (D-12): on ARMED/WAIT the trigger
  // verdict stands and the flaw is noted but not applied.
  if (smt !== null && smt !== undefined && smt.suppressed === true) {
    if (!isFiring(trigger)) {
      return cleanOutput(trigger, judas, epoch);
    }
    return flawOutput('SMT_SUPPRESSED', 'SOFT', false, true, trigger.reasonKey, trigger, judas, epoch);
  }
  if (isOppositeSweep(trigger, judas)) {
    if (!isFiring(trigger)) {
      return cleanOutput(trigger, judas, epoch);
    }
    return flawOutput('OPPOSITE_SWEEP', 'SOFT', false, true, trigger.reasonKey, trigger, judas, epoch);
  }
  return cleanOutput(trigger, judas, epoch);
}
