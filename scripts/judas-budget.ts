// 60-session Judas confirmed-ratio budget run (ICT-13, D-09): seeded,
// deterministic, offline. Synthesizes 60 consecutive NY sessions from base
// date 2026-06-01 — five 1H Asia candles at the 20:00 NY open hour plus
// twelve 15M killzone candles across 02:00-05:00 NY — drives asiaRange over
// each 1H window and judasSwing with the default displacement multiple over
// each 15M strip, prints exactly one BUDGET confirmed= line, and exits 1
// when the confirmed share exceeds 25 percent else 0. No network, no Yahoo
// pipes, no store, no clock reads: all epochs derive from the fixed base
// date plus deterministic offsets.
//
// Executed by plain `node scripts/judas-budget.ts`: the script registers
// `./resolve-alias.mjs` before dynamically importing the `@/` project
// sources, so no flags or runners are needed (Node 24 strips types).
import { register } from 'node:module';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { AsiaRange } from '@/src/lib/ict/asia';
import type { IntradayCandle } from '@/src/lib/ict/types';

register('./resolve-alias.mjs', import.meta.url);

const { asiaRange } = await import('@/src/lib/ict/asia');
const { judasSwing } = await import('@/src/lib/ict/judas');

const NY_TZ_LOCAL = 'America/New_York';
const BASE_YEAR = 2026;
const BASE_MONTH = 6;
const BASE_DAY = 1;
const SESSIONS = 60;
const BUDGET_CAP = 0.25;

// mulberry32 with the fixed seed 8: one deterministic stream for the whole
// run, so reruns print the identical line.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Epoch seconds of a fixed-offset synthesis instant. June NY sessions are
// EDT (UTC-4) and the run only needs self-consistent spacing plus a
// fromZonedTime anchor for the wall-clock helpers — Asia bucketing uses the
// 20:00 NY open date string, killzone membership resolves the true NY wall
// clock per candle at call time.
function epochOf(dayOffset: number, hour: number, minute: number): number {
  const anchor = fromZonedTime(
    `${BASE_YEAR}-${String(BASE_MONTH).padStart(2, '0')}-${String(BASE_DAY).padStart(2, '0')} 00:00:00`,
    NY_TZ_LOCAL,
  ).getTime() / 1000;
  return anchor + dayOffset * 86400 + hour * 3600 + minute * 60;
}

const BASE_PRICE = 20000;
const RANGE_HEIGHT = 200;
const ASIA_OPEN = BASE_PRICE;
const ASIA_HIGH = BASE_PRICE + 120;
const ASIA_LOW = BASE_PRICE - 80;

interface BudgetRow extends IntradayCandle {
  tag: string;
}

function asiaRows(day: number, rand: () => number): BudgetRow[] {
  const rows: BudgetRow[] = [];
  const jitter = () => (rand() - 0.5) * 2 * 0.05 * RANGE_HEIGHT;
  const interior = [ASIA_OPEN, ASIA_OPEN + 20, ASIA_OPEN + 40, ASIA_OPEN + 10, ASIA_OPEN + 30];
  for (let i = 0; i < 5; i++) {
    const t = epochOf(day, 20 + i, 0);
    const c = interior[i] + jitter();
    rows.push({
      time: t,
      open: c - 5,
      high: ASIA_HIGH - 12 - i * 2 + jitter() * 0.2,
      low: ASIA_LOW + 12 + i + jitter() * 0.2,
      close: c,
      tag: 'asia',
    });
  }
  return rows;
}

function killzoneRows(day: number, archetype: number, rand: () => number): BudgetRow[] {
  const rows: BudgetRow[] = [];
  const jitter = () => (rand() - 0.5) * 2 * 0.05 * RANGE_HEIGHT;
  const mid = (ASIA_HIGH + ASIA_LOW) / 2;
  for (let i = 0; i < 12; i++) {
    const minutes = 120 + i * 15;
    const t = epochOf(day, 0, 0) + (2 * 3600 + i * 900);
    const c = mid + jitter() * 0.2;
    rows.push({
      time: t,
      open: c,
      high: mid + 30 + jitter() * 0.2,
      low: mid - 30 + jitter() * 0.2,
      close: c,
      tag: `kz-${minutes}`,
    });
  }
  if (archetype === 8 || archetype === 9) {
    // Candidate-only: pierce an extreme then close back at the extreme with
    // no follow-through (gate 3 displacement never reaches).
    const sweep = rows[2];
    sweep.high = ASIA_HIGH + 6;
    sweep.low = mid;
    sweep.close = ASIA_HIGH;
  }
  if (archetype === 9) {
    // Confirmed: pierce, close back through the extreme, and continue at
    // least six-tenths of Asia height beyond it.
    const sweep = rows[2];
    sweep.high = ASIA_HIGH + 6;
    sweep.low = mid;
    sweep.close = ASIA_HIGH - 4;
    const follow = rows[3];
    follow.close = ASIA_HIGH - 0.6 * RANGE_HEIGHT - 8;
    follow.low = follow.close - 10;
    follow.high = mid + 20;
  }
  void rand;
  return rows;
}

function sessionDateOf(day: number): string {
  // The NY calendar date of the 20:00 open instant — correct across month
  // boundaries where naive day addition emits invalid dates like 06-31.
  return formatInTimeZone(epochOf(day, 20, 0) * 1000, NY_TZ_LOCAL, 'yyyy-MM-dd');
}

const rand = mulberry32(8);
let confirmed = 0;
for (let day = 0; day < SESSIONS; day++) {
  const sessionDate = sessionDateOf(day);
  const asia = asiaRows(day, rand);
  const range: AsiaRange | null = asiaRange(asia, sessionDate);
  if (range === null) {
    throw new Error(`budget synthesis produced an empty Asia window on ${sessionDate}`);
  }
  const archetype = day % 10;
  const strip = killzoneRows(day, archetype, rand);
  const out = judasSwing(strip, range);
  if (out.confirmed) confirmed++;
}

const pct = (confirmed / SESSIONS) * 100;
console.log(`BUDGET confirmed=${confirmed}/${SESSIONS} (${pct.toFixed(1)}%)`);
process.exit(confirmed / SESSIONS > BUDGET_CAP ? 1 : 0);
