// True AVG sentiment helper: averages retail positioning after dropping
// unreliable broker feeds, following the Module 1 rule in institutional_rules.md.

export interface BrokerQuote {
  broker: string;
  longPct: number;
  shortPct: number;
}

export type CrowdedSide = 'LONG' | 'SHORT';

export interface TrueAvgOutput {
  buy: number;
  sell: number;
  crowded: CrowdedSide | null;
  excludedCount: number;
  rationale: string;
}

// Broker name fragments excluded from the average (case-insensitive).
export const EXCLUDED_SUBSTRINGS = ['insta', 'fibogroup'] as const;

// Retail is crowded when one side reaches this percentage.
export const CROWDED_THRESHOLD = 60;

function isExcluded(broker: string): boolean {
  const name = broker.toLowerCase();
  return EXCLUDED_SUBSTRINGS.some((fragment) => name.includes(fragment));
}

function isValidPct(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
}

export function trueAvg(rows: BrokerQuote[]): TrueAvgOutput {
  const kept = rows.filter((r) => !isExcluded(r.broker));
  const excludedCount = rows.length - kept.length;
  if (kept.length === 0) {
    throw new Error('trueAvg requires at least one included broker after exclusions');
  }
  for (const r of kept) {
    if (!isValidPct(r.longPct) || !isValidPct(r.shortPct)) {
      throw new Error(`trueAvg requires finite percentages within 0-100, got ${r.broker}`);
    }
  }
  let sum = 0;
  for (const r of kept) {
    sum += r.longPct;
  }
  const buy = sum / kept.length;
  const sell = 100 - buy;
  const crowded: CrowdedSide | null =
    buy >= CROWDED_THRESHOLD ? 'LONG' : sell >= CROWDED_THRESHOLD ? 'SHORT' : null;
  const rationale =
    crowded === null
      ? `Həqiqi Ortalama (Insta/FiboGroup xaric): BUY ${buy}% / SELL ${sell}% — balanslı, izdiham yoxdur.`
      : `Həqiqi Ortalama (Insta/FiboGroup xaric): BUY ${buy}% / SELL ${sell}% — İZDİHAMLI ${crowded} ${CROWDED_THRESHOLD}% həddini keçdi.`;
  return { buy, sell, crowded, excludedCount, rationale };
}
