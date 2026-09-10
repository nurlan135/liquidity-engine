import { formatInTimeZone } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import type { AmdOutput } from '@/src/lib/ict/amd';
import { TOL_EPS } from '@/src/lib/ict/judas';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { FvgGap } from '@/src/lib/ict/fvg';

// ICT-15 (D-01/D-02/D-03/D-04/D-05/D-06/D-07/D-10): three-gate WHY NOW
// trigger fusion over detector outputs. Timing is an NY wall-clock check on
// the injected asOf, purge is a confirmed judas sweep with a sweep side,
// displacement is the TRIGGER_DISP_MULT re-check plus a resolvable entry
// FVG of the direction polarity. 3 of 3 fires, exactly 2 arms, 0-1 waits;
// an already-fired session downgrades 3 of 3 to ARMED. Pure:
// caller-supplied detector outputs plus an injected asOf epoch plus an
// injected alreadyFired boolean only — no clock reads, no store imports, no
// candle arrays, no ES input.

/** Killzone open in NY wall-clock minutes since midnight, exclusive (D-01). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1-4 fires/week (TRIG-04).
export const TRIGGER_KZ_START_MIN = 120;
/** Killzone close in NY wall-clock minutes since midnight, exclusive (D-01). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1-4 fires/week (TRIG-04).
export const TRIGGER_KZ_END_MIN = 300;
/** Displacement re-check as a multiple of Asia height (D-03, mirrors DISP_MULT). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1-4 fires/week (TRIG-04).
export const TRIGGER_DISP_MULT = 0.5;
/** Firing-log cap: oldest entries drop beyond this bound (D-08). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1-4 fires/week (TRIG-04).
export const TRIGGER_LOG_CAP = 50;

export type TriggerVerdict = 'FIRE_LONG' | 'FIRE_SHORT' | 'ARMED' | 'WAIT_FOR_MANIPULATION';

export type TriggerDirection = 'LONG' | 'SHORT' | null;

export type TriggerReasonKey =
  | 'FIRE_LONG'
  | 'FIRE_SHORT'
  | 'ARMED_MISSING_TIMING'
  | 'ARMED_MISSING_PURGE'
  | 'ARMED_MISSING_DISPLACEMENT'
  | 'ARMED_ALREADY_FIRED'
  | 'WAIT_FOR_MANIPULATION';

export interface TriggerInput {
  judas: JudasOutput | null;
  /** Carried for parity and downstream context; does NOT vote (D-05). */
  amd: AmdOutput | null;
  /** Read-only agree-tag only; never a gate, never blocks FIRE. */
  smt: SmtOutput | null;
  /** Active unmitigated FVG inventory from the selector boundary. */
  fvg: FvgGap[] | null;
  /** Injected evaluation instant in UTC epoch seconds — never a clock read. */
  asOf: number;
  /** Cooldown state injected by the caller (D-06): a FIRE already logged this session. */
  alreadyFired: boolean;
}

export interface TriggerOutput {
  verdict: TriggerVerdict;
  direction: TriggerDirection;
  reasonKey: TriggerReasonKey;
  /** Verbatim Azerbaijani sentence, test-pinned with toBe — never interpolated. */
  reason: string;
  gates: { timing: boolean; purge: boolean; displacement: boolean };
  /** D-04 handle the Phase 17 ticket consumes; non-null only on FIRE verdicts. */
  entryFvg: FvgGap | null;
  inputs: { judas: JudasOutput | null; amd: AmdOutput | null; smt: SmtOutput | null };
}

/** Minimal firing-log entry (D-07): verdict plus gate booleans plus session key. */
export interface FiringLogEntry {
  asOf: number;
  verdict: TriggerVerdict;
  gates: { timing: boolean; purge: boolean; displacement: boolean };
  direction: TriggerDirection;
  reasonKey: TriggerReasonKey;
  /** NY calendar date key for D-06 per-session FIRE dedup plus Phase 18 replay. */
  sessionDate: string;
}

// D-09 verbatim Azerbaijani reasons (locked with 15-03 wording): one base
// sentence per reasonKey plus at most one fixed SMT suffix. No number or
// price interpolation, no banned vocabulary.
const REASON_FIRE_LONG =
  'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.';
const REASON_FIRE_SHORT =
  'WHY NOW SHORT: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.';
const REASON_ARMED_MISSING_TIMING =
  'WHY NOW ARMED: Quruluş hazırdır — killzone pəncərəsi gözlənilir.';
const REASON_ARMED_MISSING_PURGE =
  'WHY NOW ARMED: Quruluş hazırdır — London Judas təsdiqi gözlənilir.';
const REASON_ARMED_MISSING_DISPLACEMENT =
  'WHY NOW ARMED: Quruluş hazırdır — displacement təsdiqi və giriş FVG gözlənilir.';
const REASON_ARMED_ALREADY_FIRED =
  'WHY NOW ARMED: Bu sessiyada siqnal artıq verilib — təkrar giriş yoxdur.';
const REASON_WAIT =
  'WAIT FOR MANIPULATION: Zaman, süpürmə və displacement razılaşmır — manipulyasiya gözlənilir.';

const REASON_BY_KEY: Record<TriggerReasonKey, string> = {
  FIRE_LONG: REASON_FIRE_LONG,
  FIRE_SHORT: REASON_FIRE_SHORT,
  ARMED_MISSING_TIMING: REASON_ARMED_MISSING_TIMING,
  ARMED_MISSING_PURGE: REASON_ARMED_MISSING_PURGE,
  ARMED_MISSING_DISPLACEMENT: REASON_ARMED_MISSING_DISPLACEMENT,
  ARMED_ALREADY_FIRED: REASON_ARMED_ALREADY_FIRED,
  WAIT_FOR_MANIPULATION: REASON_WAIT,
};

/** Fixed SMT agree suffix (amd.ts SMT_AGREE_TAG precedent): concordance only. */
const SMT_AGREE_SUFFIX = 'SMT razılaşır.';

// Per-call IANA wall-clock minutes since midnight (judas.ts nyMinutesOf
// idiom). formatInTimeZone renders the explicit instant in NY_TZ, so the
// result is the true NY wall clock on every machine and every instant.
export function nyMinutesOf(timeSec: number): number {
  const hour = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'H'));
  const minute = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'm'));
  return hour * 60 + minute;
}

// NY calendar date key for the D-06 per-session cooldown (aggregate.ts
// nyDateOf idiom).
export function nyDateOf(timeSec: number): string {
  return formatInTimeZone(timeSec * 1000, NY_TZ, 'yyyy-MM-dd');
}

// SMT read-only tag (D-10/amd.ts smtTag concordance): appended only when the
// envelope is unsuppressed and the direction agrees with the swept side
// (HIGH+BEARISH, LOW+BULLISH). Suppressed, null, or discordant SMT yields
// the empty string and never blocks FIRE.
function smtSuffix(
  judas: TriggerInput['judas'],
  smt: TriggerInput['smt'],
): string {
  if (smt === null || smt === undefined) {
    return '';
  }
  if (smt.suppressed) {
    return '';
  }
  if (
    judas !== null &&
    judas !== undefined &&
    judas.confirmed === true &&
    judas.sweepSide !== null &&
    judas.sweepSide !== undefined
  ) {
    if (judas.sweepSide === 'HIGH' && smt.direction === 'BEARISH') {
      return ` ${SMT_AGREE_SUFFIX}`;
    }
    if (judas.sweepSide === 'LOW' && smt.direction === 'BULLISH') {
      return ` ${SMT_AGREE_SUFFIX}`;
    }
  }
  return '';
}

// WR-05/amd.ts assertValidJudas precedent: a malformed judas envelope fails
// at the boundary with a got-string error instead of sliding through gate
// compares. Null degrades to honest WAIT downstream — never throws here.
function assertValidJudas(judas: TriggerInput['judas']): void {
  if (judas === null || judas === undefined) {
    return;
  }
  if (typeof judas !== 'object' || Array.isArray(judas)) {
    throw new Error(`evaluateTrigger requires a JudasOutput object or null, got ${String(judas)}`);
  }
  const j = judas as JudasOutput;
  if (typeof j.candidate !== 'boolean' || typeof j.confirmed !== 'boolean') {
    throw new Error(
      `evaluateTrigger requires boolean judas candidate/confirmed, got candidate=${String(j.candidate)} confirmed=${String(j.confirmed)}`,
    );
  }
  if (j.sweepTime !== null && j.sweepTime !== undefined && (!Number.isFinite(j.sweepTime) || (j.sweepTime as number) <= 0)) {
    throw new Error(
      `evaluateTrigger requires a finite positive judas sweepTime or null, got ${String(j.sweepTime)}`,
    );
  }
  if (j.sweepSide !== null && j.sweepSide !== undefined && j.sweepSide !== 'HIGH' && j.sweepSide !== 'LOW') {
    throw new Error(
      `evaluateTrigger requires judas sweepSide HIGH, LOW, or null, got ${String(j.sweepSide)}`,
    );
  }
  if (!Number.isFinite(j.displacementMult)) {
    throw new Error(
      `evaluateTrigger requires a finite judas displacementMult, got ${String(j.displacementMult)}`,
    );
  }
}

// T-15-01: FVG inventory crosses the trust boundary here. Non-finite bounds
// or illegal polarity throw with got-string errors (fvg.ts assertFiniteGap
// precedent); mitigated gaps are skipped by selection, never promoted.
function assertValidFvg(fvg: TriggerInput['fvg']): void {
  if (fvg === null || fvg === undefined) {
    return;
  }
  if (!Array.isArray(fvg)) {
    throw new Error(`evaluateTrigger requires an FvgGap array or null, got ${String(fvg)}`);
  }
  for (const gap of fvg) {
    if (gap === null || gap === undefined || typeof gap !== 'object' || Array.isArray(gap)) {
      throw new Error(`evaluateTrigger requires FvgGap objects, got ${String(gap)}`);
    }
    const g = gap as FvgGap;
    if (!Number.isFinite(g.top) || !Number.isFinite(g.bottom)) {
      throw new Error(
        `evaluateTrigger requires finite gap bounds, got top=${String(g.top)} bottom=${String(g.bottom)}`,
      );
    }
    if (g.polarity !== 'BULLISH' && g.polarity !== 'BEARISH') {
      throw new Error(
        `evaluateTrigger requires gap polarity BULLISH or BEARISH, got ${String(g.polarity)}`,
      );
    }
  }
}

// D-10: direction is a total function of sweepSide alone. Displacement is
// magnitude-only, so it is never consulted; a null side forces purge false
// upstream and yields no direction here.
function directionOf(sweepSide: JudasOutput['sweepSide'] | null | undefined): TriggerDirection {
  if (sweepSide === 'HIGH') return 'SHORT';
  if (sweepSide === 'LOW') return 'LONG';
  return null;
}

// D-03/D-04 displacement gate: judas displacementMult at or above
// TRIGGER_DISP_MULT (judas.ts TOL_EPS float-compare precedent) AND a
// resolvable entry FVG of the direction polarity (LONG needs BULLISH,
// SHORT needs BEARISH), selected as the most recent originDate. Null,
// empty, fully-mitigated, or wrong-polarity inventory fails honestly.
function displacementGate(
  judas: TriggerInput['judas'],
  fvg: TriggerInput['fvg'],
  direction: TriggerDirection,
): { pass: boolean; entryFvg: FvgGap | null } {
  const none = { pass: false, entryFvg: null };
  if (judas === null || judas === undefined) {
    return none;
  }
  if (!(judas.displacementMult + TOL_EPS >= TRIGGER_DISP_MULT)) {
    return none;
  }
  if (direction === null) {
    return none;
  }
  const needPolarity = direction === 'LONG' ? 'BULLISH' : 'BEARISH';
  const inventory = fvg ?? [];
  let pick: FvgGap | null = null;
  for (const gap of inventory) {
    if (gap.mitigated || gap.polarity !== needPolarity) {
      continue;
    }
    if (pick === null || gap.originDate > pick.originDate) {
      pick = gap;
    }
  }
  if (pick === null) {
    return none;
  }
  return { pass: true, entryFvg: { ...pick } };
}

export function evaluateTrigger(input: TriggerInput): TriggerOutput {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`evaluateTrigger requires an input object, got ${String(input)}`);
  }
  const { judas, amd, smt, fvg, asOf, alreadyFired } = input;
  if (!Number.isFinite(asOf) || (asOf as number) <= 0) {
    throw new Error(`evaluateTrigger requires a finite positive asOf epoch, got ${String(asOf)}`);
  }
  if (typeof alreadyFired !== 'boolean') {
    throw new Error(`evaluateTrigger requires a boolean alreadyFired, got ${String(alreadyFired)}`);
  }
  assertValidJudas(judas);
  assertValidFvg(fvg);
  const epoch = asOf as number;
  const fired = alreadyFired as boolean;

  // Gate 1 — timing (D-01): strict exclusive NY-minutes membership. Mirrors
  // the judas killzone edge discipline (minutes 120/300 read false).
  const minutes = nyMinutesOf(epoch);
  const timing = minutes > TRIGGER_KZ_START_MIN && minutes < TRIGGER_KZ_END_MIN;

  // Gate 2 — purge (D-01/D-02): confirmed sweep with a sweep side. London-only
  // falls out of confirmed alone — out-of-killzone sweeps are preRun by
  // construction — so no NY session branch lives here. Candidate-only
  // (confirmed false) fails.
  const purged =
    judas !== null &&
    judas !== undefined &&
    judas.confirmed === true &&
    judas.sweepSide !== null &&
    judas.sweepSide !== undefined;
  const direction = directionOf(
    judas === null || judas === undefined ? null : judas.sweepSide,
  );

  // Gate 3 — displacement (D-03/D-04) with the entry-FVG handle.
  const { pass: displacement, entryFvg } = displacementGate(judas, fvg, direction);

  // D-05 counting: 3 passes fire, exactly 2 arm with the missing-gate key,
  // 0-1 wait. A fired session downgrades 3 of 3 to ARMED (D-06).
  const passes = (timing ? 1 : 0) + (purged ? 1 : 0) + (displacement ? 1 : 0);
  let verdict: TriggerVerdict;
  let reasonKey: TriggerReasonKey;
  let entry: FvgGap | null;
  if (passes <= 1) {
    verdict = 'WAIT_FOR_MANIPULATION';
    reasonKey = 'WAIT_FOR_MANIPULATION';
    entry = null;
  } else if (passes === 2) {
    verdict = 'ARMED';
    reasonKey = !timing
      ? 'ARMED_MISSING_TIMING'
      : !purged
        ? 'ARMED_MISSING_PURGE'
        : 'ARMED_MISSING_DISPLACEMENT';
    entry = null;
  } else if (fired) {
    verdict = 'ARMED';
    reasonKey = 'ARMED_ALREADY_FIRED';
    entry = null;
  } else if (direction === 'LONG') {
    verdict = 'FIRE_LONG';
    reasonKey = 'FIRE_LONG';
    entry = entryFvg;
  } else if (direction === 'SHORT') {
    verdict = 'FIRE_SHORT';
    reasonKey = 'FIRE_SHORT';
    entry = entryFvg;
  } else {
    // Unreachable: 3 of 3 implies the purge gate, which implies a sweep
    // side, which implies a direction. Held as ARMED rather than firing
    // directionless.
    verdict = 'ARMED';
    reasonKey = 'ARMED_MISSING_PURGE';
    entry = null;
  }

  return {
    verdict,
    direction,
    reasonKey,
    reason: REASON_BY_KEY[reasonKey] + smtSuffix(judas, smt),
    gates: { timing, purge: purged, displacement },
    entryFvg: entry,
    inputs: { judas: judas ?? null, amd: amd ?? null, smt: smt ?? null },
  };
}
